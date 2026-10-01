import type { AppConfig, StatField } from "../models/config";
import { FIELD_DEFS, normalizePayloadFields } from "../models/payloadSchema";

export function getFieldDef(field: StatField) {
  return { field, ...FIELD_DEFS[field] };
}
export type FieldDefinition = ReturnType<typeof getFieldDef>;
export type LayoutRow = { offset: number; field: FieldDefinition };

export function calculatePayloadBytes(fields: readonly string[]): number {
  return normalizePayloadFields(fields).fields.reduce((sum, key) => sum + FIELD_DEFS[key].bytes, 0);
}

export function buildPayloadLayout(fields: readonly string[]): LayoutRow[] {
  let offset = 0;
  return normalizePayloadFields(fields).fields.map((key) => {
    const field = getFieldDef(key);
    const row = { offset, field };
    offset += field.bytes;
    return row;
  });
}

export function buildExamplePayload(fields: readonly string[], config: AppConfig): { hex: string; bytes: number[]; json: Record<string, number> } {
  const json: Record<string, number> = {};
  const layout = buildPayloadLayout(fields);
  const buffer = new ArrayBuffer(calculatePayloadBytes(fields));
  const view = new DataView(buffer);
  for (const { offset, field } of layout) {
    const value = field.field === "valid_window_count_u16"
      ? Math.min(65535, Math.max(0, Math.floor(config.report.interval_seconds / config.feature.window_seconds)))
      : field.example;
    json[field.field] = value;
    switch (field.type) {
      case "u8": view.setUint8(offset, value); break;
      case "u16": view.setUint16(offset, value, true); break;
      case "i16": view.setInt16(offset, value, true); break;
      case "u32": view.setUint32(offset, value, true); break;
    }
  }
  const bytes = [...new Uint8Array(buffer)];
  return { hex: bytes.map((value) => value.toString(16).padStart(2, "0")).join(" "), bytes, json };
}
