import { describe, expect, it } from "vitest";
import { calculateStorageUsage } from "../src/calcs/storage";
import { defaultConfig } from "../src/models/config";

describe("report storage and transmission", () => {
  it("budgets 28-byte reports independently of feature windows", () => {
    const storage = calculateStorageUsage(defaultConfig);
    expect(storage.payload_bytes_per_report).toBe(28);
    expect(storage.reports_per_day).toBe(288);
    expect(storage.bytes_per_day).toBe(8064);
    expect(storage.messages_until_full).toBe(Math.floor(16 * 1024 * 1024 / 28));
    expect(storage.days_to_fill).toBeCloseTo(16 * 1024 * 1024 / 8064);
  });
  it.each(["store_to_flash", "enabled"])("does not consume flash when %s is false", (flag) => {
    const config = structuredClone(defaultConfig);
    if (flag === "store_to_flash") config.report.store_to_flash = false;
    else config.flash.enabled = false;
    const storage = calculateStorageUsage(config);
    expect(storage.bytes_per_day).toBe(0);
    expect(storage.stored_reports_per_day).toBe(0);
    expect(storage.days_to_fill).toBe(Infinity);
    expect(storage.payload_bytes_per_day).toBe(8064);
  });
  it("applies header overhead and retention to flash and radio without reducing generated reports", () => {
    const config = structuredClone(defaultConfig);
    config.payload.header_bytes = 4;
    config.radio.enabled = true;
    config.smartSampling.enabled = true;
    config.smartSampling.baseline_keep_enabled = false;
    config.smartSampling.peak_enabled = false;
    config.smartSampling.assumptions.active_percent = 10;
    const storage = calculateStorageUsage(config);
    expect(storage.payload_bytes_per_report).toBe(32);
    expect(storage.payload_bytes_per_day).toBe(9216);
    expect(storage.stored_reports_per_day).toBeCloseTo(28.8);
    expect(storage.transmitted_reports_per_day).toBeCloseTo(28.8);
    expect(storage.bytes_per_day).toBeCloseTo(921.6);
    expect(storage.transmitted_bytes_per_day).toBeCloseTo(921.6);
  });
  it("does not invent a byte for empty payloads", () => {
    const config = structuredClone(defaultConfig);
    config.payload.included_fields = [];
    expect(calculateStorageUsage(config).bytes_per_day).toBe(0);
  });
});
