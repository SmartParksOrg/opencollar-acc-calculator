import type { AppConfig, Lis2dw12Config } from "../models/config";

export const FIFO_SAMPLES = 32;

const LP1_LN_OFF_ANCHORS: Array<{ odr: number; current_uA: number }> = [
  { odr: 1.6, current_uA: 0.38 },
  { odr: 12.5, current_uA: 1.0 },
  { odr: 25, current_uA: 1.5 },
  { odr: 50, current_uA: 3.0 },
  { odr: 100, current_uA: 5.0 }
];

export type InterpolationResult = {
  current_uA: number;
  modeled: boolean;
  note?: string;
};

export type FifoMetrics = {
  fill_time_s: number;
  wakeups_per_minute: number;
  wakeups_per_hour: number;
  wakeups_per_day: number;
  wakeups_per_second: number;
};

export type PowerBreakdown = {
  lis_uA: number;
  lis_modeled: boolean;
  lis_note?: string;
  sleep_uA: number;
  fifo_service_uA: number;
  finalize_uA: number;
  flash_uA: number;
  flash_write_uA: number;
  flash_erase_uA: number;
  total_uA: number;
  avg_power_uW: number;
  fifo: FifoMetrics;
};

export type RuntimeMetrics = {
  hours: number;
  days: number;
  months: number;
  years: number;
};

function linearInterpolate(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x1 === x0) {
    return y0;
  }
  const t = (x - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

export function interpolateLisCurrentLP1(odr_hz: number): number {
  if (odr_hz <= LP1_LN_OFF_ANCHORS[0].odr) {
    return LP1_LN_OFF_ANCHORS[0].current_uA;
  }

  const last = LP1_LN_OFF_ANCHORS[LP1_LN_OFF_ANCHORS.length - 1];
  if (odr_hz >= last.odr) {
    return last.current_uA;
  }

  for (let i = 0; i < LP1_LN_OFF_ANCHORS.length - 1; i += 1) {
    const a = LP1_LN_OFF_ANCHORS[i];
    const b = LP1_LN_OFF_ANCHORS[i + 1];
    if (odr_hz >= a.odr && odr_hz <= b.odr) {
      return linearInterpolate(odr_hz, a.odr, a.current_uA, b.odr, b.current_uA);
    }
  }

  return last.current_uA;
}

export function estimateLisCurrent(config: Lis2dw12Config): InterpolationResult {
  if (typeof config.override_current_uA === "number" && config.override_current_uA >= 0) {
    return {
      current_uA: config.override_current_uA,
      modeled: true,
      note: "User override"
    };
  }

  if (config.mode === "LP1" && config.noise === "low_noise_off") {
    return {
      current_uA: interpolateLisCurrentLP1(config.odr_hz),
      modeled: true
    };
  }

  return {
    current_uA: interpolateLisCurrentLP1(config.odr_hz),
    modeled: false,
    note: "Mode/noise not modeled; using LP1 low-noise-off estimate. Use override for accuracy."
  };
}

export function calculateFifoMetrics(odr_hz: number, watermark: number): FifoMetrics {
  const clampedWatermark = Math.max(1, Math.min(FIFO_SAMPLES, watermark));
  const safeOdr = Math.max(0.001, odr_hz);
  const fill_time_s = clampedWatermark / safeOdr;

  return {
    fill_time_s,
    wakeups_per_minute: 60 / fill_time_s,
    wakeups_per_hour: 3600 / fill_time_s,
    wakeups_per_day: 86400 / fill_time_s,
    wakeups_per_second: 1 / fill_time_s
  };
}

export function calculatePowerBreakdown(config: AppConfig): PowerBreakdown {
  const lis = estimateLisCurrent(config.lis);
  const fifo = calculateFifoMetrics(config.lis.odr_hz, config.lis.fifo_watermark);

  const duty_fifo = fifo.wakeups_per_second * (config.nrf52.fifo_service_time_ms / 1000);
  const fifo_service_uA = config.nrf52.active_current_mA * 1000 * duty_fifo;

  const duty_finalize = (config.nrf52.finalize_time_ms / 1000) / config.report.interval_seconds;
  const finalize_uA = config.nrf52.active_current_mA * 1000 * duty_finalize;

  const flashEnabled = config.flash.enabled && config.report.store_to_flash;
  const flash_write_uA = flashEnabled
    ? config.flash.write_current_mA * 1000 * (config.flash.write_time_ms / 1000) / config.report.interval_seconds
    : 0;

  const erasePeriodS = config.report.interval_seconds * Math.max(1, config.flash.erase_interval_records);
  const flash_erase_uA = flashEnabled
    ? config.flash.erase_current_mA * 1000 * (config.flash.erase_time_ms / 1000) / erasePeriodS
    : 0;

  const flash_uA = flash_write_uA + flash_erase_uA;

  const total_uA =
    lis.current_uA +
    config.nrf52.sleep_current_uA +
    fifo_service_uA +
    finalize_uA +
    flash_uA;

  const avg_power_uW = total_uA * config.battery.nominal_V;

  return {
    lis_uA: lis.current_uA,
    lis_modeled: lis.modeled,
    lis_note: lis.note,
    sleep_uA: config.nrf52.sleep_current_uA,
    fifo_service_uA,
    finalize_uA,
    flash_uA,
    flash_write_uA,
    flash_erase_uA,
    total_uA,
    avg_power_uW,
    fifo
  };
}

export function calculateRuntimeHours(capacity_mAh: number, usable_fraction: number, totalCurrent_uA: number): RuntimeMetrics {
  const usable_mAh = capacity_mAh * usable_fraction;
  const current_mA = Math.max(1e-9, totalCurrent_uA / 1000);
  const hours = usable_mAh / current_mA;

  return {
    hours,
    days: hours / 24,
    months: hours / (24 * 30.4375),
    years: hours / (24 * 365.25)
  };
}
