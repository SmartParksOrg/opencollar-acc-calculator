import { describe, expect, it } from "vitest";
import { calculateMotionMetrics, validateMotionConfig } from "../src/calcs/motion";
import { calculateFifoMetrics, calculatePowerBreakdown } from "../src/calcs/power";
import { defaultConfig } from "../src/models/config";
import { normalizeConfig } from "../src/models/normalizeConfig";

describe("continuous Motion Statistics architecture", () => {
  it("separates 24-sample FIFO reads, 50-sample features and 5-minute reports", () => {
    const config = structuredClone(defaultConfig);
    const fifo = calculateFifoMetrics(config.lis.odr_hz, config.lis.fifo_watermark);
    const motion = calculateMotionMetrics(config);
    expect(validateMotionConfig(config)).toEqual([]);
    expect(fifo.fill_time_s).toBeCloseTo(0.96, 8);
    expect(fifo.wakeups_per_day).toBe(90000);
    expect(motion.samples_per_feature_window).toBe(50);
    expect(motion.feature_windows_per_report).toBe(150);
    expect(motion.feature_windows_per_day).toBe(43200);
    expect(motion.reports_per_day).toBe(288);
    expect(motion.samples_per_day).toBe(2160000);
    expect(motion.fifo_reads_per_feature_window).toBeCloseTo(50 / 24);
    expect(motion.fifo_headroom_s).toBeCloseTo(0.32);
  });

  it.each([[600, 300, 600], [900, 450, 900]])("aggregates %i seconds into %i windows and %i buffer bytes", (interval, windows, bytes) => {
    const config = structuredClone(defaultConfig);
    config.report.interval_seconds = interval;
    const motion = calculateMotionMetrics(config);
    expect(motion.feature_windows_per_report).toBe(windows);
    expect(motion.percentile_buffer_bytes).toBe(bytes);
    expect(motion.feature_windows_per_day).toBe(43200);
    expect(calculatePowerBreakdown(config).fifo.wakeups_per_day).toBe(90000);
  });

  it("changing FIFO watermark does not change feature or report counts", () => {
    const config = structuredClone(defaultConfig);
    config.lis.fifo_watermark = 16;
    const motion = calculateMotionMetrics(config);
    expect(motion.samples_per_feature_window).toBe(50);
    expect(motion.feature_windows_per_report).toBe(150);
    expect(motion.reports_per_day).toBe(288);
    expect(calculatePowerBreakdown(config).fifo.wakeups_per_day).toBe(135000);
  });

  it("changing feature duration changes features and RAM without additional FIFO wakeups", () => {
    const config = structuredClone(defaultConfig);
    config.feature.window_seconds = 4;
    expect(calculateMotionMetrics(config)).toMatchObject({
      samples_per_feature_window: 100, feature_windows_per_report: 75,
      feature_windows_per_day: 21600, percentile_buffer_bytes: 150, reports_per_day: 288
    });
    expect(calculatePowerBreakdown(config).fifo.wakeups_per_day).toBe(90000);
  });

  it("rejects fractional sample counts and misaligned report intervals", () => {
    const config = structuredClone(defaultConfig);
    config.lis.odr_hz = 1.6;
    expect(validateMotionConfig(config).join(" ")).toContain("whole number of samples");
    config.feature.window_seconds = 2.5;
    expect(validateMotionConfig(config)).toEqual([]);
    config.report.interval_seconds = 301;
    expect(validateMotionConfig(config).join(" ")).toContain("whole number of non-overlapping feature windows");
  });

  it("rejects invalid rates, watermark, mode, counts and power assumptions", () => {
    const config = structuredClone(defaultConfig);
    config.lis.odr_hz = 0;
    config.lis.fifo_watermark = 24.5;
    config.lis.fifo_mode = "bypass";
    config.feature.window_seconds = 0;
    config.nrf52.sample_processing_time_us = -1;
    expect(validateMotionConfig(config).length).toBeGreaterThanOrEqual(5);
    config.feature.window_seconds = 2;
    config.report.interval_seconds = 200000;
    expect(validateMotionConfig(config).join(" ")).toContain("uint16");
  });

  it("loads legacy shared configurations with new defaults and preserves retention settings", () => {
    const config = normalizeConfig({ report: { interval_seconds: 900 }, nrf52: { finalize_time_ms: 20 },
      payload: { included_fields: ["timestamp_u32", "temp_cC_i16"] },
      smartSampling: { enabled: true, episode_pre_windows: 3 } });
    expect(config.feature).toEqual(defaultConfig.feature);
    expect(config.radio).toEqual(defaultConfig.radio);
    expect(config.payload.header_bytes).toBe(0);
    expect(config.payload.included_fields).toEqual(["timestamp_u32", "temp_cC_i16"]);
    expect(config.nrf52.finalize_time_ms).toBe(20);
    expect(config.nrf52.sample_processing_time_us).toBe(10);
    expect(config.smartSampling.episode_pre_windows).toBe(3);
    expect(config.smartSampling.enabled).toBe(true);
    expect(validateMotionConfig(config)).toEqual([]);
  });
});
