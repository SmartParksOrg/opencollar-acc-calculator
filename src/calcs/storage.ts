import type { SmartSamplingConfig, Storage } from "../models/config";
import { calculateSmartSamplingMetrics, type SmartSamplingMetrics } from "./smartSampling";

export type StorageMetrics = {
  smart_sampling_enabled: boolean;
  baseline_keep_enabled: boolean;
  episodes_enabled: boolean;
  windows_per_day: number;
  records_per_day: number;
  stored_windows_per_day: number;
  stored_fraction: number;
  bytes_per_day: number;
  days_to_fill: number;
  messages_until_full: number;
  smartSampling: SmartSamplingMetrics;
};

export function calculateStorageUsage(
  storage: Storage,
  payloadBytes: number,
  reportIntervalS: number,
  smartSampling: SmartSamplingConfig
): StorageMetrics {
  const safePayload = Math.max(1, payloadBytes);
  const smartSamplingMetrics = calculateSmartSamplingMetrics(smartSampling, reportIntervalS);
  const bytes_per_day = smartSamplingMetrics.stored_windows_per_day * safePayload;
  const messages_until_full = storage.flash_bytes_available / safePayload;
  const days_to_fill = bytes_per_day > 0 ? storage.flash_bytes_available / bytes_per_day : Number.POSITIVE_INFINITY;

  return {
    smart_sampling_enabled: smartSampling.enabled && smartSampling.threshold_mode !== "off",
    baseline_keep_enabled: smartSampling.baseline_keep_enabled,
    episodes_enabled: smartSampling.episodes_enabled,
    windows_per_day: smartSamplingMetrics.windows_per_day,
    records_per_day: smartSamplingMetrics.windows_per_day,
    stored_windows_per_day: smartSamplingMetrics.stored_windows_per_day,
    stored_fraction: smartSamplingMetrics.stored_fraction,
    bytes_per_day,
    days_to_fill,
    messages_until_full,
    smartSampling: smartSamplingMetrics
  };
}
