import { describe, expect, it } from "vitest";
import { calculateFifoMetrics, calculatePowerBreakdown, calculateRuntimeHours, interpolateLisCurrentLP1 } from "../src/calcs/power";
import { defaultConfig } from "../src/models/config";

describe("power calculations", () => {
  it("calculates FIFO fill time and wakeups", () => {
    const fifo = calculateFifoMetrics(25, 32);
    expect(fifo.fill_time_s).toBeCloseTo(1.28, 6);
    expect(fifo.wakeups_per_minute).toBeCloseTo(46.875, 6);
    expect(fifo.wakeups_per_day).toBeCloseTo(67500, 3);
  });

  it("interpolates LIS current between anchor points", () => {
    const current = interpolateLisCurrentLP1(37.5);
    expect(current).toBeCloseTo(2.25, 6);
  });

  it("calculates battery runtime", () => {
    const runtime = calculateRuntimeHours(1200, 0.85, 10);
    expect(runtime.hours).toBeCloseTo(102000, 2);
    expect(runtime.days).toBeCloseTo(4250, 2);
  });

  it("scales flash current with retained report rate", () => {
    const base = structuredClone(defaultConfig);
    base.report.store_to_flash = true;
    base.flash.enabled = true;
    base.smartSampling.enabled = false;
    const allWindows = calculatePowerBreakdown(base);

    const filtered = structuredClone(base);
    filtered.smartSampling.enabled = true;
    filtered.smartSampling.threshold_mode = "auto_percentile";
    filtered.smartSampling.baseline_keep_enabled = false;
    filtered.smartSampling.assumptions.active_percent = 10;
    filtered.smartSampling.assumptions.peak_percent = 0;
    filtered.smartSampling.assumptions.debounce_factor = 1;
    const reducedWindows = calculatePowerBreakdown(filtered);

    expect(reducedWindows.flash_uA).toBeLessThan(allWindows.flash_uA);
    expect(reducedWindows.flash_write_uA).toBeCloseTo(allWindows.flash_write_uA * 0.1, 6);
    expect(reducedWindows.flash_erase_uA).toBeCloseTo(allWindows.flash_erase_uA * 0.1, 6);
  });
});

describe("separate processing budgets", () => {
  it("uses the correct event rates and sums separate current components", () => {
    const power = calculatePowerBreakdown(defaultConfig);
    const active = 4000 - 1.5;
    expect(power.fifo_service_uA).toBeCloseTo(active * 0.002 / 0.96);
    expect(power.sample_processing_uA).toBeCloseTo(active * 25 * 10 / 1e6);
    expect(power.feature_finalize_uA).toBeCloseTo(active * 0.0001 / 2);
    expect(power.finalize_uA).toBeCloseTo(active * 0.01 / 300);
    expect(power.percentile_uA).toBeCloseTo(active * 150 * 10 / 1e6 / 300);
    expect(power.total_uA).toBeCloseTo(power.lis_uA + power.sleep_uA + power.fifo_service_uA +
      power.sample_processing_uA + power.feature_finalize_uA + power.finalize_uA +
      power.percentile_uA + power.flash_uA + power.radio_uA);
  });
  it("report interval changes report/flash/radio cost but not acquisition or feature processing", () => {
    const config = structuredClone(defaultConfig);
    config.radio.enabled = true;
    config.radio.charge_per_report_mAs = 30;
    const five = calculatePowerBreakdown(config);
    config.report.interval_seconds = 900;
    const fifteen = calculatePowerBreakdown(config);
    expect(fifteen.fifo_service_uA).toBe(five.fifo_service_uA);
    expect(fifteen.sample_processing_uA).toBe(five.sample_processing_uA);
    expect(fifteen.feature_finalize_uA).toBe(five.feature_finalize_uA);
    expect(fifteen.finalize_uA).toBeCloseTo(five.finalize_uA / 3);
    expect(fifteen.flash_uA).toBeCloseTo(five.flash_uA / 3);
    expect(five.radio_uA).toBeCloseTo(100);
    expect(fifteen.radio_uA).toBeCloseTo(five.radio_uA / 3);
  });
  it("retention never reduces feature processing or report finalization", () => {
    const config = structuredClone(defaultConfig);
    const all = calculatePowerBreakdown(config);
    config.smartSampling.enabled = true;
    config.smartSampling.assumptions.active_percent = 0;
    config.smartSampling.peak_enabled = false;
    config.smartSampling.baseline_keep_enabled = false;
    const filtered = calculatePowerBreakdown(config);
    expect(filtered.flash_uA).toBe(0);
    expect(filtered.fifo_service_uA).toBe(all.fifo_service_uA);
    expect(filtered.sample_processing_uA).toBe(all.sample_processing_uA);
    expect(filtered.feature_finalize_uA).toBe(all.feature_finalize_uA);
    expect(filtered.finalize_uA).toBe(all.finalize_uA);
    expect(filtered.percentile_uA).toBe(all.percentile_uA);
  });
  it("disables percentile work when percentile fields are omitted", () => {
    const config = structuredClone(defaultConfig);
    config.payload.included_fields = ["timestamp_u32", "motion_mean_u16"];
    expect(calculatePowerBreakdown(config).percentile_uA).toBe(0);
  });
  it("disables flash and radio current when the outputs are off", () => {
    const config = structuredClone(defaultConfig);
    config.report.store_to_flash = false;
    config.radio.charge_per_report_mAs = 100;
    const power = calculatePowerBreakdown(config);
    expect(power.flash_uA).toBe(0);
    expect(power.radio_uA).toBe(0);
  });
});
