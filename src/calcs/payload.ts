import type { AppConfig, StatField } from "../models/config";

export type FieldDefinition = {
  field: StatField;
  label: string;
  type: string;
  bytes: number;
  scaling: string;
  notes: string;
};

const FIELD_DEFS: Record<StatField, FieldDefinition> = {
  timestamp_u32: {
    field: "timestamp_u32",
    label: "Timestamp",
    type: "u32",
    bytes: 4,
    scaling: "seconds since epoch",
    notes: "Window start or end timestamp"
  },
  odba_mean_i16: {
    field: "odba_mean_i16",
    label: "ODBA mean",
    type: "i16",
    bytes: 2,
    scaling: "mg",
    notes: "Average absolute dynamic acceleration"
  },
  odba_max_i16: {
    field: "odba_max_i16",
    label: "ODBA max",
    type: "i16",
    bytes: 2,
    scaling: "mg",
    notes: "Maximum ODBA in window"
  },
  vedba_mean_i16: {
    field: "vedba_mean_i16",
    label: "VeDBA mean",
    type: "i16",
    bytes: 2,
    scaling: "mg",
    notes: "Average vectorial dynamic body acceleration"
  },
  vedba_max_i16: {
    field: "vedba_max_i16",
    label: "VeDBA max",
    type: "i16",
    bytes: 2,
    scaling: "mg",
    notes: "Maximum VeDBA in window"
  },
  std_xyz_i16x3: {
    field: "std_xyz_i16x3",
    label: "StdDev X/Y/Z",
    type: "i16 x 3",
    bytes: 6,
    scaling: "mg",
    notes: "Axis standard deviations"
  },
  mean_xyz_i16x3: {
    field: "mean_xyz_i16x3",
    label: "Mean X/Y/Z",
    type: "i16 x 3",
    bytes: 6,
    scaling: "mg",
    notes: "Axis means"
  },
  peak_acc_i16: {
    field: "peak_acc_i16",
    label: "Peak acceleration",
    type: "i16",
    bytes: 2,
    scaling: "mg",
    notes: "Maximum absolute peak"
  },
  sample_count_u16: {
    field: "sample_count_u16",
    label: "Sample count",
    type: "u16",
    bytes: 2,
    scaling: "count",
    notes: "Number of samples in window"
  },
  activity_flags_u8: {
    field: "activity_flags_u8",
    label: "Activity flags",
    type: "u8",
    bytes: 1,
    scaling: "bitfield",
    notes: "Threshold-based motion state flags"
  },
  reserved_u8: {
    field: "reserved_u8",
    label: "Reserved",
    type: "u8",
    bytes: 1,
    scaling: "N/A",
    notes: "Padding / forward compatibility"
  },
  odr_code_u8: {
    field: "odr_code_u8",
    label: "ODR code",
    type: "u8",
    bytes: 1,
    scaling: "enum",
    notes: "ODR enum for parser context"
  },
  fs_code_u8: {
    field: "fs_code_u8",
    label: "FS code",
    type: "u8",
    bytes: 1,
    scaling: "enum",
    notes: "Full scale enum"
  },
  mode_code_u8: {
    field: "mode_code_u8",
    label: "Mode code",
    type: "u8",
    bytes: 1,
    scaling: "enum",
    notes: "Sensor mode enum"
  },
  overflow_count_u8: {
    field: "overflow_count_u8",
    label: "Overflow count",
    type: "u8",
    bytes: 1,
    scaling: "count",
    notes: "FIFO overflows in report window"
  },
  crc16_u16: {
    field: "crc16_u16",
    label: "CRC16",
    type: "u16",
    bytes: 2,
    scaling: "N/A",
    notes: "Payload integrity"
  },
  window_len_s_u16: {
    field: "window_len_s_u16",
    label: "Window length",
    type: "u16",
    bytes: 2,
    scaling: "seconds",
    notes: "Duration represented by stats"
  },
  temp_cC_i16: {
    field: "temp_cC_i16",
    label: "Temperature",
    type: "i16",
    bytes: 2,
    scaling: "centi-C",
    notes: "Optional temperature channel"
  },
  batt_mV_u16: {
    field: "batt_mV_u16",
    label: "Battery",
    type: "u16",
    bytes: 2,
    scaling: "mV",
    notes: "Optional battery reading"
  }
};

export type LayoutRow = {
  offset: number;
  field: FieldDefinition;
};

export function getFieldDef(field: StatField): FieldDefinition {
  return FIELD_DEFS[field];
}

export function calculatePayloadBytes(fields: StatField[]): number {
  return fields.reduce((sum, f) => sum + FIELD_DEFS[f].bytes, 0);
}

export function buildPayloadLayout(fields: StatField[]): LayoutRow[] {
  let offset = 0;
  return fields.map((field) => {
    const def = FIELD_DEFS[field];
    const row: LayoutRow = { offset, field: def };
    offset += def.bytes;
    return row;
  });
}

function toLEBytes(value: number, byteCount: number): number[] {
  const out: number[] = [];
  let v = value;
  for (let i = 0; i < byteCount; i += 1) {
    out.push(v & 0xff);
    v >>= 8;
  }
  return out;
}

function toLESigned16(value: number): number[] {
  const normalized = value < 0 ? 0x10000 + value : value;
  return toLEBytes(normalized, 2);
}

export function buildExamplePayload(fields: StatField[], config: AppConfig): { hex: string; bytes: number[]; json: Record<string, number> } {
  const json: Record<string, number> = {};
  const bytes: number[] = [];

  fields.forEach((field, idx) => {
    const base = 100 + idx * 7;

    switch (field) {
      case "timestamp_u32": {
        const value = 1_706_800_000;
        json[field] = value;
        bytes.push(...toLEBytes(value, 4));
        break;
      }
      case "sample_count_u16": {
        const value = Math.max(1, Math.round(config.report.interval_seconds * config.lis.odr_hz));
        json[field] = value;
        bytes.push(...toLEBytes(value, 2));
        break;
      }
      case "activity_flags_u8": {
        const value = 0b00000101;
        json[field] = value;
        bytes.push(value);
        break;
      }
      case "reserved_u8":
      case "odr_code_u8":
      case "fs_code_u8":
      case "mode_code_u8":
      case "overflow_count_u8": {
        const value = base & 0xff;
        json[field] = value;
        bytes.push(value);
        break;
      }
      case "crc16_u16":
      case "window_len_s_u16":
      case "batt_mV_u16": {
        const value = 1000 + idx * 3;
        json[field] = value;
        bytes.push(...toLEBytes(value, 2));
        break;
      }
      case "std_xyz_i16x3":
      case "mean_xyz_i16x3": {
        const values = [base + 1, base + 2, base + 3];
        json[field] = values[0];
        values.forEach((v) => bytes.push(...toLESigned16(v)));
        break;
      }
      default: {
        const value = 250 + idx * 5;
        json[field] = value;
        bytes.push(...toLESigned16(value));
      }
    }
  });

  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
  return { hex, bytes, json };
}
