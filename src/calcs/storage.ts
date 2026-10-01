import type { AppConfig } from "../models/config";
import { calculatePayloadBytes } from "./payload";
import { calculateSmartSamplingMetrics } from "./smartSampling";

export function calculateStorageUsage(config: AppConfig) {
  const payload_bytes_per_report = calculatePayloadBytes(config.payload.included_fields) + config.payload.header_bytes;
  const smartSampling = calculateSmartSamplingMetrics(config.smartSampling, config.report.interval_seconds);
  const reports_per_day = smartSampling.reports_per_day;
  const retained_reports_per_day = smartSampling.stored_reports_per_day;
  const stored_reports_per_day = config.report.store_to_flash && config.flash.enabled ? retained_reports_per_day : 0;
  const transmitted_reports_per_day = config.radio.enabled ? retained_reports_per_day : 0;
  const bytes_per_day = stored_reports_per_day * payload_bytes_per_report;
  return {
    smart_sampling_enabled: config.smartSampling.enabled && config.smartSampling.threshold_mode !== "off",
    baseline_keep_enabled: config.smartSampling.baseline_keep_enabled,
    episodes_enabled: config.smartSampling.episodes_enabled,
    reports_per_day,
    retained_reports_per_day,
    stored_reports_per_day,
    transmitted_reports_per_day,
    stored_fraction: smartSampling.stored_fraction,
    payload_bytes_per_report,
    payload_bytes_per_day: reports_per_day * payload_bytes_per_report,
    transmitted_bytes_per_day: transmitted_reports_per_day * payload_bytes_per_report,
    bytes_per_day,
    days_to_fill: bytes_per_day > 0 ? config.storage.flash_bytes_available / bytes_per_day : Infinity,
    messages_until_full: payload_bytes_per_report > 0 ? Math.floor(config.storage.flash_bytes_available / payload_bytes_per_report) : Infinity,
    smartSampling
  };
}

export type StorageMetrics = ReturnType<typeof calculateStorageUsage>;
