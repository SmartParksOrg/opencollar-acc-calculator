import { describe, expect, it } from "vitest";
import { calculateStorageUsage } from "../src/calcs/storage";
import { calculateSmartSamplingMetrics } from "../src/calcs/smartSampling";
import { defaultConfig } from "../src/models/config";

describe("smart sampling storage calculations", () => {
  it("stores all windows when disabled", () => {
    const config = structuredClone(defaultConfig);
    config.smartSampling.enabled = false;

    const metrics = calculateSmartSamplingMetrics(config.smartSampling, 300);
    expect(metrics.windows_per_day).toBeCloseTo(288, 8);
    expect(metrics.stored_windows_per_day).toBeCloseTo(288, 8);
    expect(metrics.stored_fraction).toBeCloseTo(1, 8);
  });

  it("applies active + peak + baseline assumptions", () => {
    const config = structuredClone(defaultConfig);
    config.smartSampling.enabled = true;
    config.smartSampling.threshold_mode = "auto_percentile";
    config.smartSampling.baseline_keep_enabled = true;
    config.smartSampling.baseline_keep_1_in_n = 60;
    config.smartSampling.assumptions.active_percent = 5;
    config.smartSampling.assumptions.peak_percent = 1;
    config.smartSampling.assumptions.debounce_factor = 1;

    const storage = calculateStorageUsage(config.storage, 30, 300, config.smartSampling);

    expect(storage.windows_per_day).toBeCloseTo(288, 8);
    expect(storage.stored_windows_per_day).toBeCloseTo(21.6504, 4);
    expect(storage.stored_fraction).toBeCloseTo(21.6504 / 288, 6);
    expect(storage.bytes_per_day).toBeCloseTo(649.512, 3);
  });

  it("clamps episodes estimate to max windows/day", () => {
    const config = structuredClone(defaultConfig);
    config.report.interval_seconds = 300;
    config.smartSampling.enabled = true;
    config.smartSampling.threshold_mode = "auto_percentile";
    config.smartSampling.assumptions.active_percent = 95;
    config.smartSampling.assumptions.peak_percent = 90;
    config.smartSampling.assumptions.avg_bout_len_windows = 1;
    config.smartSampling.baseline_keep_enabled = true;
    config.smartSampling.baseline_keep_1_in_n = 1;
    config.smartSampling.episodes_enabled = true;
    config.smartSampling.episode_pre_windows = 10;
    config.smartSampling.episode_post_windows = 10;
    config.smartSampling.episode_cooldown_windows = 0;

    const metrics = calculateSmartSamplingMetrics(config.smartSampling, config.report.interval_seconds);
    expect(metrics.stored_windows_per_day).toBeCloseTo(metrics.windows_per_day, 8);
    expect(metrics.stored_fraction).toBeCloseTo(1, 8);
  });
});
