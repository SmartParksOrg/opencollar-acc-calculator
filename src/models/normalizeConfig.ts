import { defaultConfig, type AppConfig } from "./config";

export function normalizeConfig(partial: unknown): AppConfig {
  const merged = structuredClone(defaultConfig);

  if (!partial || typeof partial !== "object") {
    return merged;
  }

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
      ...merged.payload,
      ...((partial as AppConfig).payload ?? {}),
      scaling: { ...merged.payload.scaling, ...((partial as AppConfig).payload?.scaling ?? {}) },
      activity_thresholds: {
        ...merged.payload.activity_thresholds,
        ...((partial as AppConfig).payload?.activity_thresholds ?? {})
      }
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

