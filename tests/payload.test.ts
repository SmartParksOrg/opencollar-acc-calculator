import { describe, expect, it } from "vitest";
import { calculatePayloadBytes } from "../src/calcs/payload";

describe("payload calculations", () => {
  it("computes payload byte size for legacy 30-byte layout", () => {
    const bytes = calculatePayloadBytes([
      "timestamp_u32",
      "odba_mean_i16",
      "odba_max_i16",
      "vedba_mean_i16",
      "vedba_max_i16",
      "std_xyz_i16x3",
      "mean_xyz_i16x3",
      "peak_acc_i16",
      "sample_count_u16",
      "activity_flags_u8",
      "reserved_u8"
    ]);

    expect(bytes).toBe(30);
  });
});

import { buildExamplePayload, buildPayloadLayout } from "../src/calcs/payload";
import { DEFAULT_FIELDS, MOTION_FIELDS, TEMPERATURE_FIELDS, defaultConfig } from "../src/models/config";

describe("issue #671 candidate payload", () => {
  it("uses 22 motion bytes and 6 assumed temperature bytes", () => {
    expect(calculatePayloadBytes(MOTION_FIELDS)).toBe(22);
    expect(calculatePayloadBytes(TEMPERATURE_FIELDS)).toBe(6);
    expect(calculatePayloadBytes(DEFAULT_FIELDS)).toBe(28);
  });
  it.each([300, 600, 900])("keeps the same schema for %i-second reports and encodes valid feature counts", (interval) => {
    const config = structuredClone(defaultConfig);
    config.report.interval_seconds = interval;
    const example = buildExamplePayload(DEFAULT_FIELDS, config);
    const bytes = new DataView(Uint8Array.from(example.bytes).buffer);
    expect(example.bytes).toHaveLength(28);
    expect(bytes.getUint16(20, true)).toBe(interval / 2);
    expect(bytes.getInt16(24, true)).toBe(-250);
    expect(bytes.getUint8(18)).toBe(128);
    expect(bytes.getUint8(19)).toBe(12);
    const layout = buildPayloadLayout(DEFAULT_FIELDS);
    expect(layout.at(-1)?.offset).toBe(26);
  });
  it("uses feature samples for the optional legacy sample count", () => {
    const example = buildExamplePayload(["sample_count_u16"], defaultConfig);
    expect(example.bytes).toEqual([50, 0]);
  });
});
