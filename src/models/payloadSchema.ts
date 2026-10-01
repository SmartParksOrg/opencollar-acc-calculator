// One definition per report statistic drives selection, sizing, layout and examples.
export const PAYLOAD_GROUPS = {
  motion: { title: "Motion statistics", description: "Motion fields summarize short-window std(|a|) values. VeDBA adds average dynamic acceleration after gravity removal." },
  activity: { title: "Activity and coverage", description: "Activity uses the single threshold in Feature windows. Coverage counts valid feature windows in the report." },
  temperature: { title: "Temperature", description: "Mean, minimum and maximum of temperature readings across the report interval." },
  context: { title: "Report timestamp", description: "Include a timestamp unless the message framework already supplies it." },
  extensions: { title: "Optional motion details", description: "Additional report statistics with distinct meanings. These extend the issue #671 candidate; each adds 2 bytes and needs firmware agreement." },
  diagnostics: { title: "Optional device diagnostics", description: "Battery and FIFO diagnostics are separate from motion statistics and are not included by default." }
} as const;

type Group = keyof typeof PAYLOAD_GROUPS;
type Encoding = "u8" | "u16" | "i16" | "u32";
const ENCODING_BYTES: Record<Encoding, number> = { u8: 1, u16: 2, i16: 2, u32: 4 };
function definition(statistic: string, label: string, group: Group, type: Encoding, scaling: string, notes: string, example: number, recommended = true) {
  return { statistic, label, group, type, bytes: ENCODING_BYTES[type], scaling, notes, example, recommended };
}

export const FIELD_DEFS = {
  timestamp_u32: definition("timestamp", "Timestamp", "context", "u32", "epoch seconds", "Report timestamp; omit if the framework already supplies it.", 1706800000),
  motion_mean_u16: definition("motion_mean", "Motion mean", "motion", "u16", "mg", "Mean of the short-window motion intensity values.", 80),
  motion_sd_u16: definition("motion_sd", "Motion SD", "motion", "u16", "mg", "Standard deviation across short-window motion intensity values: how variable motion was within the report.", 35),
  motion_p25_u16: definition("motion_p25", "Motion p25", "motion", "u16", "mg", "25th percentile of short-window motion intensity.", 40),
  motion_p50_u16: definition("motion_p50", "Motion median (p50)", "motion", "u16", "mg", "Median of short-window motion intensity; p50 and median are the same statistic.", 70),
  motion_p75_u16: definition("motion_p75", "Motion p75", "motion", "u16", "mg", "75th percentile of short-window motion intensity.", 110),
  motion_max_u16: definition("motion_max", "Motion max", "motion", "u16", "mg", "Highest short-window motion intensity (std of magnitude). This measures the most variable window, not the largest acceleration sample.", 180),
  vedba_mean_u16: definition("vedba_mean", "VeDBA mean", "motion", "u16", "mg", "Mean sqrt(dx² + dy² + dz²) across valid samples in the report, after gravity removal. Measures average dynamic acceleration.", 120),
  active_fraction_u8: definition("active_fraction", "Active fraction", "activity", "u8", "0–255 = 0–100%", "Fraction of valid feature windows above the configured motion intensity threshold.", 128),
  transition_count_u8: definition("transition_count", "Transition count", "activity", "u8", "count", "Active/inactive transitions within the report. Handling counts above 255 needs firmware agreement.", 12),
  valid_window_count_u16: definition("valid_window_count", "Valid window count", "activity", "u16", "windows", "Completed valid feature windows; exposes incomplete reports and sample loss.", 150),
  temperature_mean_cC_i16: definition("temperature_mean", "Temperature mean", "temperature", "i16", "0.01 °C", "Mean temperature during the report. Scaling is an assumption pending firmware agreement.", 1850),
  temperature_min_cC_i16: definition("temperature_min", "Temperature min", "temperature", "i16", "0.01 °C", "Lowest temperature during the report. Scaling is an assumption pending firmware agreement.", -250),
  temperature_max_cC_i16: definition("temperature_max", "Temperature max", "temperature", "i16", "0.01 °C", "Highest temperature during the report. Scaling is an assumption pending firmware agreement.", 2750),
  odba_mean_u16: definition("odba_mean", "ODBA mean", "extensions", "u16", "mg", "Mean |dx| + |dy| + |dz| across valid samples after gravity removal. Axis-based sum, unlike the vector magnitude used by VeDBA.", 160, false),
  odba_max_u16: definition("odba_max", "ODBA peak", "extensions", "u16", "mg", "Largest single-sample |dx| + |dy| + |dz| across valid windows in the report.", 500, false),
  vedba_max_u16: definition("vedba_max", "VeDBA peak", "extensions", "u16", "mg", "Largest single-sample dynamic vector magnitude across valid windows in the report, after gravity removal.", 350, false),
  peak_magnitude_u16: definition("peak_magnitude", "Peak acceleration magnitude", "extensions", "u16", "mg", "Largest single-sample sqrt(x² + y² + z²) across valid windows, including gravity. Distinct from Motion max and VeDBA peak.", 1500, false),
  batt_mV_u16: definition("battery_voltage", "Battery voltage", "diagnostics", "u16", "mV", "Latest battery voltage when the report is finalized; not an interval average.", 3600, false),
  overflow_count_u8: definition("fifo_overflow_count", "FIFO overflow count", "diagnostics", "u8", "count", "FIFO overflows during this report; candidate field with a maximum of 255.", 0, false)
} as const;

export type StatField = keyof typeof FIELD_DEFS;
export const FIELD_ORDER = Object.keys(FIELD_DEFS) as StatField[];
export const DEFAULT_FIELDS = FIELD_ORDER.filter((key) => FIELD_DEFS[key].recommended);
export const TEMPERATURE_FIELDS = DEFAULT_FIELDS.filter((key) => FIELD_DEFS[key].group === "temperature");
export const MOTION_FIELDS = DEFAULT_FIELDS.filter((key) => FIELD_DEFS[key].group !== "temperature");

const LEGACY_ALIASES: Record<string, StatField> = {
  vedba_mean_i16: "vedba_mean_u16",
  vedba_max_i16: "vedba_max_u16",
  odba_mean_i16: "odba_mean_u16",
  odba_max_i16: "odba_max_u16"
};
const RETIRED_FIELDS: Record<string, string> = {
  std_xyz_i16x3: "Axis standard deviations were removed; they are not equivalent to magnitude-based motion intensity.",
  mean_xyz_i16x3: "Axis means were removed from the Motion Statistics report.",
  peak_acc_i16: "The ambiguous legacy peak was removed. Select Peak acceleration magnitude for a defined vector-magnitude peak.",
  temp_cC_i16: "The single temperature reading was removed; it cannot be converted into an interval mean/min/max.",
  sample_count_u16: "Short-window sample count is shown under Feature windows. Report coverage uses Valid window count.",
  activity_flags_u8: "Legacy activity flags were removed. Activity fraction and transitions use the Feature windows threshold.",
  window_len_s_u16: "Short-window duration is already configured under Feature windows.",
  reserved_u8: "Reserved bytes were removed; budget them in protocol/header overhead if needed.",
  crc16_u16: "CRC bytes were removed from statistics; budget them in protocol/header overhead if needed.",
  odr_code_u8: "ODR metadata was removed from statistics; budget it in protocol/header overhead if needed.",
  fs_code_u8: "Full-scale metadata was removed from statistics; budget it in protocol/header overhead if needed.",
  mode_code_u8: "Sensor-mode metadata was removed from statistics; budget it in protocol/header overhead if needed."
};

/** Shared by import, sizing and previews: aliases cannot reintroduce duplicate measurements. */
export function normalizePayloadFields(value: unknown): { fields: StatField[]; notes: string[] } {
  if (!Array.isArray(value)) return { fields: [...DEFAULT_FIELDS], notes: ["Invalid field selection was reset to the recommended report."] };
  const fields = new Set<StatField>();
  const notes = new Set<string>();
  for (const key of value) {
    if (typeof key !== "string") { notes.add("An unrecognized payload field was removed."); continue; }
    const alias = Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, key) ? LEGACY_ALIASES[key] : undefined;
    const canonical = alias ?? (Object.prototype.hasOwnProperty.call(FIELD_DEFS, key) ? key as StatField : undefined);
    if (!canonical) { notes.add(Object.prototype.hasOwnProperty.call(RETIRED_FIELDS, key) ? RETIRED_FIELDS[key] : "An unrecognized payload field was removed."); continue; }
    if (alias) notes.add(`${FIELD_DEFS[canonical].label} now uses one unsigned encoding for its non-negative values.`);
    if (fields.has(canonical)) notes.add(`Duplicate ${FIELD_DEFS[canonical].label} selections were combined.`);
    fields.add(canonical);
  }
  return { fields: FIELD_ORDER.filter((key) => fields.has(key)), notes: [...notes] };
}
