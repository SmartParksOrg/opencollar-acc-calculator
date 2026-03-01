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

  it("scales flash current with stored windows rate", () => {
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
