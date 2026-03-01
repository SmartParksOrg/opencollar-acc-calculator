import type { RuntimeMetrics } from "../../calcs/power";
import type { PowerBreakdown } from "../../calcs/power";
import type { StorageMetrics } from "../../calcs/storage";

type Props = {
  power: PowerBreakdown;
  runtime: RuntimeMetrics;
  runtimeBest?: RuntimeMetrics;
  runtimeWorst?: RuntimeMetrics;
  storage: StorageMetrics;
  payloadBytes: number;
  reportIntervalS: number;
};

function fmt(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "N/A";
}

export function ResultsPanel({
  power,
  runtime,
  runtimeBest,
  runtimeWorst,
  storage,
  payloadBytes,
  reportIntervalS
}: Props): JSX.Element {
  return (
    <aside className="results-panel card">
      <h2 style={{ marginTop: 0 }}>Results</h2>

      <h3>Average current (uA)</h3>
      <div className="metric"><span>LIS2DW12 average current</span><strong>{fmt(power.lis_uA)}</strong></div>
      <div className="metric"><span>nRF52 baseline sleep current</span><strong>{fmt(power.sleep_uA)}</strong></div>
      <div className="metric"><span>nRF52 FIFO servicing average</span><strong>{fmt(power.fifo_service_uA)}</strong></div>
      <div className="metric"><span>nRF52 periodic finalize average</span><strong>{fmt(power.finalize_uA)}</strong></div>
      <div className="metric"><span>Flash write + erase average</span><strong>{fmt(power.flash_uA)}</strong></div>
      <div className="metric"><span>Total average current</span><strong>{fmt(power.total_uA)}</strong></div>
      <div className="small">Average power: {fmt(power.avg_power_uW)} uW</div>
      {!power.lis_modeled && power.lis_note ? <div className="notice">{power.lis_note}</div> : null}

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

      <h3>Flash usage</h3>
      <div className="metric"><span>Bytes per report</span><strong>{payloadBytes}</strong></div>
      <div className="metric"><span>Messages per day</span><strong>{fmt(86400 / reportIntervalS, 2)}</strong></div>
      <div className="metric"><span>Bytes per day</span><strong>{fmt(storage.bytes_per_day, 1)}</strong></div>
      <div className="metric"><span>Messages until full</span><strong>{fmt(storage.messages_until_full, 0)}</strong></div>
      <div className="metric"><span>Days until flash full</span><strong>{fmt(storage.days_to_fill, 1)}</strong></div>

      <h3>FIFO behavior</h3>
      <div className="metric"><span>FIFO depth (samples)</span><strong>32</strong></div>
      <div className="metric"><span>FIFO fill time (s)</span><strong>{fmt(power.fifo.fill_time_s, 3)}</strong></div>
      <div className="metric"><span>Wakeups per minute</span><strong>{fmt(power.fifo.wakeups_per_minute, 2)}</strong></div>
      <div className="metric"><span>Wakeups per hour</span><strong>{fmt(power.fifo.wakeups_per_hour, 1)}</strong></div>
      <div className="metric"><span>Wakeups per day</span><strong>{fmt(power.fifo.wakeups_per_day, 0)}</strong></div>
    </aside>
  );
}
