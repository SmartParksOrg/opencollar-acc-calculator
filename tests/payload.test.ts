import { describe, expect, it } from "vitest";
import { calculatePayloadBytes } from "../src/calcs/payload";

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

});

import { FIELD_DEFS, FIELD_ORDER, normalizePayloadFields } from "../src/models/payloadSchema";
import { normalizeConfig } from "../src/models/normalizeConfig";

describe("one canonical report schema", () => {
  it("defines a unique semantic statistic and visible label for every selectable field", () => {
    const defs = Object.values(FIELD_DEFS);
    expect(new Set(defs.map((def) => def.statistic)).size).toBe(defs.length);
    expect(new Set(defs.map((def) => def.label)).size).toBe(defs.length);
    expect(FIELD_ORDER).toHaveLength(20);
    expect(DEFAULT_FIELDS).toHaveLength(14);
  });
  it("merges legacy aliases and duplicates before sizing, layout and encoding", () => {
    const fields = ["vedba_mean_i16", "vedba_mean_u16", "vedba_mean_i16", "timestamp_u32", "timestamp_u32"];
    const selection = normalizePayloadFields(fields);
    expect(selection.fields).toEqual(["timestamp_u32", "vedba_mean_u16"]);
    expect(selection.notes.join(" ")).toContain("Duplicate VeDBA mean");
    expect(calculatePayloadBytes(fields)).toBe(6);
    expect(buildPayloadLayout(fields).map((row) => row.offset)).toEqual([0, 4]);
    expect(buildExamplePayload(fields, defaultConfig).bytes).toHaveLength(6);
    expect(Object.keys(buildExamplePayload(fields, defaultConfig).json)).toEqual(selection.fields);
  });
  it("encodes every supported field exactly once with the documented width and signedness", () => {
    const fields = [...FIELD_ORDER].reverse();
    const example = buildExamplePayload(fields, defaultConfig);
    const view = new DataView(Uint8Array.from(example.bytes).buffer);
    expect(example.bytes).toHaveLength(39);
    expect(calculatePayloadBytes(fields)).toBe(39);
    const layout = buildPayloadLayout(fields);
    for (const { offset, field } of layout) {
      const decoded = field.type === "u8" ? view.getUint8(offset)
        : field.type === "u32" ? view.getUint32(offset, true)
        : field.type === "i16" ? view.getInt16(offset, true) : view.getUint16(offset, true);
      expect(decoded).toBe(example.json[field.field]);
    }
    expect(layout.at(-1)!.offset + layout.at(-1)!.field.bytes).toBe(39);
  });
  it("does not relabel unrelated legacy quantities as report statistics", () => {
    const selection = normalizePayloadFields(["temp_cC_i16", "std_xyz_i16x3", "sample_count_u16", "activity_flags_u8", "peak_acc_i16"]);
    expect(selection.fields).toEqual([]);
    expect(selection.notes).toHaveLength(5);
    expect(selection.notes.join(" ")).toContain("cannot be converted");
    expect(selection.notes.join(" ")).toContain("not equivalent");
  });
  it("safely removes unknown fields and prototype property names", () => {
    const fields = ["constructor", "__proto__", "toString", "future_field", null, "motion_mean_u16"];
    expect(normalizePayloadFields(fields).fields).toEqual(["motion_mean_u16"]);
    expect(normalizePayloadFields([]).fields).toEqual([]);
    expect(normalizePayloadFields("broken").fields).toEqual(DEFAULT_FIELDS);
  });
  it("migrates old calculation variants explicitly and omits obsolete exported settings", () => {
    const config = normalizeConfig({ payload: {
      included_fields: ["odba_mean_i16", "vedba_mean_i16", "vedba_mean_u16"], header_bytes: 5,
      odba_definition: "abs_sum_raw", vedba_definition: "rss2_dynamic", activity_thresholds: { odba_mean_mg: 400 }
    } });
    expect(config.payload.included_fields).toEqual(["vedba_mean_u16", "odba_mean_u16"]);
    expect(config.payload.header_bytes).toBe(5);
    expect(config.payload.migration_notes?.join(" ")).toContain("Raw and squared variants");
    expect(config.payload).not.toHaveProperty("odba_definition");
    expect(config.payload).not.toHaveProperty("activity_thresholds");
    expect(normalizeConfig(config)).toEqual(config);
  });
});
