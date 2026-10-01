import type { SmartSamplingConfig } from "../models/config";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type SmartSamplingMetrics = {
  reports_per_day: number;
  stored_reports_per_day_base: number;
  stored_reports_per_day: number;
  stored_fraction: number;
  p_active: number;
  p_peak: number;
  p_store_base: number;
  p_baseline: number;
  p_store_adjusted: number;
  triggers_per_day: number;
  episode_extra_reports_per_day: number;
  episode_multiplier: number;
};

// Retention decisions apply to completed reports, never to acquisition or feature aggregation.
// Config keys ending in _windows are retained for compatibility with existing shared links.
export function calculateSmartSamplingMetrics(
  smartSampling: SmartSamplingConfig,
  reportIntervalS: number
): SmartSamplingMetrics {
  const safeInterval = Number.isFinite(reportIntervalS) && reportIntervalS > 0 ? reportIntervalS : 1;
  const reports_per_day = 86400 / safeInterval;

  if (!smartSampling.enabled || smartSampling.threshold_mode === "off") {
    return {
      reports_per_day,
      stored_reports_per_day_base: reports_per_day,
      stored_reports_per_day: reports_per_day,
      stored_fraction: 1,
      p_active: 1,
      p_peak: 0,
      p_store_base: 1,
      p_baseline: 0,
      p_store_adjusted: 1,
      triggers_per_day: 0,
      episode_extra_reports_per_day: 0,
      episode_multiplier: 1
    };
  }

  const p_active = clamp(smartSampling.assumptions.active_percent / 100, 0, 1);
  const p_peak = smartSampling.peak_enabled ? clamp(smartSampling.assumptions.peak_percent / 100, 0, 1) : 0;
  const p_store_base = p_active + (1 - p_active) * p_peak;

  const baselineN = Math.max(1, Math.round(smartSampling.baseline_keep_1_in_n));
  const p_baseline = smartSampling.baseline_keep_enabled ? (1 - p_store_base) * (1 / baselineN) : 0;
  const p_store = clamp(p_store_base + p_baseline, 0, 1);

  const debounce_factor = clamp(smartSampling.assumptions.debounce_factor, 0, 2);
  const p_store_adjusted = clamp(p_store * debounce_factor, 0, 1);
  const stored_reports_per_day_base = reports_per_day * p_store_adjusted;

  let triggers_per_day = 0;
  let episode_extra_reports_per_day = 0;

  if (smartSampling.episodes_enabled) {
    const avg_bout_len_windows = Math.max(1, smartSampling.assumptions.avg_bout_len_windows);
    const pre_windows = Math.max(0, Math.round(smartSampling.episode_pre_windows));
    const post_windows = Math.max(0, Math.round(smartSampling.episode_post_windows));
    const cooldown_windows = Math.max(0, smartSampling.episode_cooldown_windows);

    triggers_per_day = (p_active * reports_per_day) / avg_bout_len_windows;
    episode_extra_reports_per_day = triggers_per_day * (pre_windows + post_windows);
    episode_extra_reports_per_day *= 1 / (1 + cooldown_windows / avg_bout_len_windows);
  }

  const stored_reports_per_day = clamp(
    stored_reports_per_day_base + episode_extra_reports_per_day,
    0,
    reports_per_day
  );

  return {
    reports_per_day,
    stored_reports_per_day_base,
    stored_reports_per_day,
    stored_fraction: clamp(stored_reports_per_day / reports_per_day, 0, 1),
    p_active,
    p_peak,
    p_store_base,
    p_baseline,
    p_store_adjusted,
    triggers_per_day,
    episode_extra_reports_per_day,
    episode_multiplier: stored_reports_per_day_base > 0 ? stored_reports_per_day / stored_reports_per_day_base : 1
  };
}
