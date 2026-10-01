import type { AppConfig } from "../models/config";

export const SECONDS_PER_DAY = 86400;
export const hasPercentiles = (config: AppConfig): boolean =>
  config.payload.included_fields.some((field) => /^motion_p(25|50|75)_u16$/.test(field));

/** No overlap and no sample loss; feature accumulators persist across FIFO reads. */
export function calculateMotionMetrics(config: AppConfig) {
  const samples_per_feature_window = config.lis.odr_hz * config.feature.window_seconds;
  const feature_windows_per_report = config.report.interval_seconds / config.feature.window_seconds;
  return {
    samples_per_feature_window,
    feature_windows_per_report,
    feature_windows_per_day: SECONDS_PER_DAY / config.feature.window_seconds,
    samples_per_day: SECONDS_PER_DAY * config.lis.odr_hz,
    reports_per_day: SECONDS_PER_DAY / config.report.interval_seconds,
    percentile_buffer_bytes: hasPercentiles(config) ? Math.ceil(feature_windows_per_report) * 2 : 0,
    fifo_reads_per_feature_window: samples_per_feature_window / config.lis.fifo_watermark,
    fifo_headroom_s: (32 - config.lis.fifo_watermark) / config.lis.odr_hz
  };
}

export function validateMotionConfig(config: AppConfig): string[] {
  const errors: string[] = [];
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  const whole = (n: number) => positive(n) && Math.round(n) >= 1 && Math.abs(n - Math.round(n)) < 1e-8;
  if (!positive(config.lis.odr_hz)) errors.push("ODR must be positive.");
  if (!whole(config.lis.fifo_watermark) || config.lis.fifo_watermark > 32)
    errors.push("FIFO watermark must be an integer from 1 to 32.");
  if (config.lis.fifo_mode !== "continuous")
    errors.push("Motion Statistics requires continuous FIFO mode; estimates are unavailable for FIFO stop or bypass mode.");
  if (!positive(config.feature.window_seconds)) errors.push("Feature window duration must be positive.");
  if (!positive(config.report.interval_seconds)) errors.push("Report interval must be positive.");
  if (!whole(config.lis.odr_hz * config.feature.window_seconds))
    errors.push("ODR × feature duration must give a whole number of samples. Adjust the feature duration for this ODR.");
  if (!whole(config.report.interval_seconds / config.feature.window_seconds))
    errors.push("Report interval must contain a whole number of non-overlapping feature windows.");
  if (config.report.interval_seconds / config.feature.window_seconds > 65535)
    errors.push("Feature windows per report exceeds the uint16 valid_window_count limit (65,535).");
  if (!Number.isFinite(config.feature.activity_threshold_mg) || config.feature.activity_threshold_mg < 0)
    errors.push("Activity threshold must be a non-negative value in mg.");
  if (!Number.isInteger(config.payload.header_bytes) || config.payload.header_bytes < 0)
    errors.push("Header overhead must be a non-negative whole number of bytes.");
  if ([...Object.values(config.nrf52), config.radio.charge_per_report_mAs,
    config.flash.write_current_mA, config.flash.write_time_ms, config.flash.erase_current_mA,
    config.flash.erase_time_ms].some((value) => !Number.isFinite(value) || value < 0))
    errors.push("Power currents, processing times and radio charge must be finite and non-negative.");
  return errors;
}
