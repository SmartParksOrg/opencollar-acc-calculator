import { normalizePayloadFields } from "./payloadSchema";
import { defaultConfig, type AppConfig } from "./config";

export function normalizeConfig(partial: unknown): AppConfig {
  const merged = structuredClone(defaultConfig);

  if (!partial || typeof partial !== "object") {
    return merged;
  }

  const incomingPayload = (partial as { payload?: Record<string, unknown> }).payload;
  const selection = normalizePayloadFields(incomingPayload?.included_fields ?? merged.payload.included_fields);
  const notes = selection.notes;
  if ((incomingPayload?.odba_definition && incomingPayload.odba_definition !== "abs_sum_dynamic") ||
      (incomingPayload?.vedba_definition && incomingPayload.vedba_definition !== "rss_dynamic")) {
    notes.push("ODBA and VeDBA now consistently describe dynamic acceleration after gravity removal. Raw and squared variants are no longer selectable.");
  }
  const previousNotes = Array.isArray(incomingPayload?.migration_notes)
    ? incomingPayload.migration_notes.filter((note): note is string => typeof note === "string") : [];

  return {
    ...merged,
    ...partial,
    battery: { ...merged.battery, ...((partial as AppConfig).battery ?? {}) },
    storage: { ...merged.storage, ...((partial as AppConfig).storage ?? {}) },
    lis: { ...merged.lis, ...((partial as AppConfig).lis ?? {}) },
    nrf52: { ...merged.nrf52, ...((partial as AppConfig).nrf52 ?? {}) },
    feature: { ...merged.feature, ...((partial as AppConfig).feature ?? {}) },
    radio: { ...merged.radio, ...((partial as AppConfig).radio ?? {}) },
    flash: { ...merged.flash, ...((partial as AppConfig).flash ?? {}) },
    report: { ...merged.report, ...((partial as AppConfig).report ?? {}) },
    payload: {
      included_fields: selection.fields,
      header_bytes: (incomingPayload?.header_bytes as number | undefined) ?? merged.payload.header_bytes,
      gravity_removal: incomingPayload?.gravity_removal === "window_mean" ? "window_mean" : "iir_lp",
      iir_alpha: (incomingPayload?.iir_alpha as number | undefined) ?? merged.payload.iir_alpha,
      migration_notes: [...new Set([...previousNotes, ...notes])]
    },
    smartSampling: {
      ...merged.smartSampling,
      ...((partial as AppConfig).smartSampling ?? {}),
      assumptions: {
        ...merged.smartSampling.assumptions,
        ...((partial as AppConfig).smartSampling?.assumptions ?? {})
      }
    },
    uncertainty: { ...merged.uncertainty, ...((partial as AppConfig).uncertainty ?? {}) }
  };
}

