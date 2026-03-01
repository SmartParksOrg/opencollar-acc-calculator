import { describe, expect, it } from "vitest";
import { calculateFifoMetrics, calculateRuntimeHours, interpolateLisCurrentLP1 } from "../src/calcs/power";

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
});
