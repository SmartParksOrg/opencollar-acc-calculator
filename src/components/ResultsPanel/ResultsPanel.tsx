import type { AppConfig } from "../../models/config";
import type { calculateMotionMetrics } from "../../calcs/motion";
import type { RuntimeMetrics } from "../../calcs/power";
import type { PowerBreakdown } from "../../calcs/power";
import type { StorageMetrics } from "../../calcs/storage";

type Props = {
  config: AppConfig;
  motion: ReturnType<typeof calculateMotionMetrics>;
  power: PowerBreakdown;
  runtime: RuntimeMetrics;
  runtimeBest?: RuntimeMetrics;
  runtimeWorst?: RuntimeMetrics;
  storage: StorageMetrics;
  payloadBytes: number;
};

function fmt(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "N/A";
}

export function ResultsPanel({
  config,
  motion,
  power,
  runtime,
  runtimeBest,
  runtimeWorst,
  storage,
  payloadBytes
}: Props): JSX.Element {
  const flashFillNotice = Number.isFinite(storage.days_to_fill)
    ? `Flash fills in ${fmt(storage.days_to_fill, 1)} days.`
    : "Flash does not fill because bytes/day is zero.";

  return (
    <aside className="results-panel card">
      <h2 style={{ marginTop: 0 }}>Results</h2>

      <h3>Continuous acquisition and reporting</h3>
      {([
        ["LIS2DW12 ODR (Hz)", config.lis.odr_hz],
        ["FIFO watermark (samples)", config.lis.fifo_watermark],
        ["Samples per feature window", motion.samples_per_feature_window],
        ["Feature windows per report", motion.feature_windows_per_report],
        ["Feature windows per day", motion.feature_windows_per_day],
        ["Reports generated per day", motion.reports_per_day],
        ["Percentile value buffer (bytes)", motion.percentile_buffer_bytes]
      ] as const).map(([label, value]) => <div className="metric" key={label}><span>{label}</span><strong>{fmt(value, 0)}</strong></div>)}
      <p className="small">One uint16 per short-window motion value. Other accumulators, FIFO buffers and any second
        report buffer needed during deferred sorting are additional RAM.</p>
      <h3>Average current (uA)</h3>
      <div className="metric"><span>LIS2DW12 average current</span><strong>{fmt(power.lis_uA)}</strong></div>
      <div className="metric"><span>nRF52 baseline sleep current</span><strong>{fmt(power.sleep_uA)}</strong></div>
      <div className="metric"><span>nRF52 FIFO servicing average</span><strong>{fmt(power.fifo_service_uA)}</strong></div>
      <div className="metric"><span>Per-sample feature processing</span><strong>{fmt(power.sample_processing_uA)}</strong></div>
      <div className="metric"><span>Feature-window finalization</span><strong>{fmt(power.feature_finalize_uA)}</strong></div>
      <div className="metric"><span>Percentile calculation</span><strong>{fmt(power.percentile_uA)}</strong></div>
      <div className="metric"><span>Radio communication</span><strong>{fmt(power.radio_uA)}</strong></div>
      <div className="metric"><span>Report finalize / packaging</span><strong>{fmt(power.finalize_uA)}</strong></div>
      <div className="metric"><span>Flash write + erase average</span><strong>{fmt(power.flash_uA)}</strong></div>
      <div className="metric"><span>Total average current</span><strong>{fmt(power.total_uA)}</strong></div>
      <div className="small">Average power: {fmt(power.avg_power_uW)} uW</div>
      {!power.lis_modeled && power.lis_note ? <div className="notice">{power.lis_note}</div> : null}

      {power.mcu_active_duty >= 1 ? <div className="notice">Processing exceeds 100% MCU duty. This configuration is infeasible; runtime estimates are not achievable.</div> : null}
      {config.radio.enabled && config.radio.charge_per_report_mAs === 0 ? <div className="notice">Radio is enabled with zero session charge. Enter a measured charge to include its power cost.</div> : null}
      <p className="small">Model covers the configured motion pipeline. GNSS, BLE, other background loads and battery self-discharge are excluded.</p>
      <h3>Battery runtime estimate</h3>
      <div className="metric"><span>Hours</span><strong>{fmt(runtime.hours, 1)}</strong></div>
      <div className="metric"><span>Days</span><strong>{fmt(runtime.days, 1)}</strong></div>
      <div className="metric"><span>Months</span><strong>{fmt(runtime.months, 2)}</strong></div>
      <div className="metric"><span>Years</span><strong>{fmt(runtime.years, 2)}</strong></div>

      {runtimeBest && runtimeWorst ? (
        <>
          <h3>Uncertainty (best/typical/worst)</h3>
          <div className="metric"><span>Best-case days</span><strong>{fmt(runtimeBest.days, 1)}</strong></div>
          <div className="metric"><span>Typical days</span><strong>{fmt(runtime.days, 1)}</strong></div>
          <div className="metric"><span>Worst-case days</span><strong>{fmt(runtimeWorst.days, 1)}</strong></div>
        </>
      ) : null}

      <h3>Completed-report retention</h3>
      <div className="metric"><span>Stored reports/day</span><strong>{fmt(storage.stored_reports_per_day, 2)}</strong></div>
      <div className="metric"><span>Retained fraction</span><strong>{fmt(storage.stored_fraction * 100, 2)}%</strong></div>
      {storage.episodes_enabled ? (
        <>
          <div className="metric">
            <span>Episode extra reports/day</span>
            <strong>{fmt(storage.smartSampling.episode_extra_reports_per_day, 2)}</strong>
          </div>
          <div className="metric">
            <span>Episode multiplier</span>
            <strong>{fmt(storage.smartSampling.episode_multiplier, 3)}x</strong>
          </div>
        </>
      ) : null}

      <h3>Payload and transmission</h3>
      <div className="metric"><span>Generated payload bytes/day</span><strong>{fmt(storage.payload_bytes_per_day, 1)}</strong></div>
      <div className="metric"><span>Retained reports/day</span><strong>{fmt(storage.retained_reports_per_day, 2)}</strong></div>
      <div className="metric"><span>Transmitted reports/day</span><strong>{fmt(storage.transmitted_reports_per_day, 2)}</strong></div>
      <div className="metric"><span>Transmitted bytes/day</span><strong>{fmt(storage.transmitted_bytes_per_day, 1)}</strong></div>
      <h3>Flash usage</h3>
      <div className="metric"><span>Payload bytes/report (incl. overhead)</span><strong>{payloadBytes}</strong></div>
      <div className="metric"><span>Generated reports/day</span><strong>{fmt(storage.reports_per_day, 2)}</strong></div>
      <div className="metric"><span>Stored reports/day</span><strong>{fmt(storage.stored_reports_per_day, 2)}</strong></div>
      <div className="metric"><span>Flash bytes per day</span><strong>{fmt(storage.bytes_per_day, 1)}</strong></div>
      <div className="metric"><span>Messages until full</span><strong>{fmt(storage.messages_until_full, 0)}</strong></div>
      <div className="metric"><span>Days until flash full</span><strong>{fmt(storage.days_to_fill, 1)}</strong></div>
      {storage.smart_sampling_enabled && storage.smartSampling.p_store_adjusted >= 0.95 ? (
        <div className="notice">Smart sampling provides little benefit at current assumptions (stored fraction near 100%).</div>
      ) : null}
      {storage.smart_sampling_enabled && !storage.baseline_keep_enabled ? (
        <div className="notice">Baseline trickle is off. This may bias time budget inference toward active reports.</div>
      ) : null}
      {storage.days_to_fill < 1 ? <div className="notice">{flashFillNotice}</div> : null}

      <h3>FIFO behavior</h3>
      <div className="metric"><span>FIFO depth (samples)</span><strong>32</strong></div>
      <div className="metric"><span>FIFO service interval (s)</span><strong>{fmt(power.fifo.fill_time_s, 3)}</strong></div>
      <div className="metric"><span>FIFO overflow headroom (s)</span><strong>{fmt(motion.fifo_headroom_s, 3)}</strong></div>
      <p className="small">Headroom is the time from watermark to full at the configured ODR; firmware must drain the FIFO
        promptly during radio, flash and other work. Feature finalization adds CPU time, not wakeups.</p>
      <div className="metric"><span>Wakeups per minute</span><strong>{fmt(power.fifo.wakeups_per_minute, 2)}</strong></div>
      <div className="metric"><span>Wakeups per hour</span><strong>{fmt(power.fifo.wakeups_per_hour, 1)}</strong></div>
      <div className="metric"><span>Wakeups per day</span><strong>{fmt(power.fifo.wakeups_per_day, 0)}</strong></div>
    </aside>
  );
}
