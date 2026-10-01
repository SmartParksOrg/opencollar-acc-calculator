import { useMemo } from "react";
import { calculatePayloadBytes } from "../calcs/payload";
import { calculatePowerBreakdown, calculateRuntimeHours } from "../calcs/power";
import { calculateMotionMetrics, validateMotionConfig } from "../calcs/motion";
import { MotionSection } from "../components/ConfigPanel/MotionSection";
import { calculateStorageUsage } from "../calcs/storage";
import type { AppConfig } from "../models/config";
import { DeviceConstraintsSection } from "../components/ConfigPanel/DeviceConstraintsSection";
import { ExampleConfigSelect } from "../components/ConfigPanel/ExampleConfigSelect";
import { LisSection } from "../components/ConfigPanel/LisSection";
import { NrfSection } from "../components/ConfigPanel/NrfSection";
import { PayloadBuilderSection } from "../components/ConfigPanel/PayloadBuilderSection";
import { ResultsPanel } from "../components/ResultsPanel/ResultsPanel";
import { PayloadPreview } from "../components/PayloadPreview/PayloadPreview";
import { SmartSamplingSection } from "../components/ConfigPanel/SmartSamplingSection";

type Props = {
  config: AppConfig;
  setConfig: (cfg: AppConfig) => void;
  onCopyConfig: () => void;
  onShareLink: () => void;
};

export function HomePage({ config, setConfig, onCopyConfig, onShareLink }: Props): JSX.Element {
  const payloadBytes = useMemo(() => calculatePayloadBytes(config.payload.included_fields) + config.payload.header_bytes, [config.payload.included_fields, config.payload.header_bytes]);
  const effectiveBatteryCapacity_mAh = useMemo(
    () => config.battery.capacity_mAh * Math.max(1, config.battery.cell_count),
    [config.battery.capacity_mAh, config.battery.cell_count]
  );

  const power = useMemo(() => calculatePowerBreakdown(config), [config]);

  const runtime = useMemo(
    () => calculateRuntimeHours(effectiveBatteryCapacity_mAh, config.battery.usable_fraction, power.total_uA),
    [effectiveBatteryCapacity_mAh, config.battery.usable_fraction, power.total_uA]
  );

  const storage = useMemo(() => calculateStorageUsage(config), [config]);
  const motion = calculateMotionMetrics(config);
  const errors = validateMotionConfig(config);

  const runtimeBest = config.uncertainty.enabled
    ? calculateRuntimeHours(
        effectiveBatteryCapacity_mAh,
        config.battery.usable_fraction,
        power.total_uA * config.uncertainty.best_case_factor
      )
    : undefined;

  const runtimeWorst = config.uncertainty.enabled
    ? calculateRuntimeHours(
        effectiveBatteryCapacity_mAh,
        config.battery.usable_fraction,
        power.total_uA * config.uncertainty.worst_case_factor
      )
    : undefined;

  return (
    <div className="app-shell">
      <header className="header card">
        <div>
          <h1>OpenCollar Motion Statistics Calculator</h1>
          <p>
            Continuous ACC → FIFO servicing → short feature windows → report aggregation → retention, flash and radio.
          </p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={onCopyConfig}>Copy configuration</button>
          <button className="secondary" onClick={onShareLink}>Share link</button>
        </div>
      </header>

      <div className="layout">
        <main>
          <section className="assumptions collapsible">
            <details>
              <summary><span className="section-title">Assumptions</span></summary>
              <div className="collapsible-content">
                <ul>
                  <li>nRF sleep 1.5 uA, active 4 mA, FIFO service 2 ms, report finalize 10 ms. Per-sample 10 µs, feature finalize 0.1 ms, percentile budget 10 µs/value: unmeasured estimates.</li>
                  <li>Battery presets include Saft LS series and Li-ion 18650; runtime uses per-cell capacity x cell count x usable fraction.</li>
                  <li>Cell count assumes identical cells in parallel (capacity scales linearly, nominal voltage unchanged).</li>
                  <li>Flash options: 128 megabit (16 MiB) or 256 megabit (32 MiB).</li>
                  <li>Store to flash is enabled by default.</li>
                  <li>LIS2DW12 LP1 low-noise-off anchor table with linear interpolation between ODR points.</li>
                  <li>Default LIS settings: ODR 25 Hz, full-scale +/-4 g, FIFO watermark 24, FIFO mode continuous.</li>
                  <li>FIFO depth fixed at 32 samples.</li>
                  <li>Default feature window: 2 s, no overlap. Report interval: 300 s (5 minutes).</li>
                  <li>Smart Sampling retains complete reports; all feature windows contribute before filtering.</li>
                  <li>Smart Sampling is disabled by default; optional retention scenarios preserve manual/auto, baseline and episode settings. Radio is disabled until session charge is supplied.</li>
                </ul>
              </div>
            </details>
          </section>

          <section className="card collapsible">
            <details open>
              <summary><span className="section-title">Quick setup</span></summary>
              <div className="collapsible-content">
                <ExampleConfigSelect onApply={setConfig} current={config} />
                {config.lis.odr_hz >= 100 ? (
                  <div className="notice">High detail profile: 100 Hz can sharply increase FIFO wakeups and active duty cycle.</div>
                ) : null}
                {config.max_payload_bytes && payloadBytes > config.max_payload_bytes ? (
                  <div className="notice">Payload exceeds max payload bytes constraint.</div>
                ) : null}
              </div>
            </details>
          </section>

          <section className="card" aria-label="Acquisition architecture">
            <div className="grid-3">
              <div><strong>1 · Sampling / FIFO</strong><p>{config.lis.odr_hz} Hz · {config.lis.fifo_watermark} samples/read</p>
                <p className="small">Service every {power.fifo.fill_time_s.toFixed(3)} s</p></div>
              <div><strong>2 · Feature windows</strong><p>{config.feature.window_seconds} s · {motion.samples_per_feature_window} samples</p>
                <p className="small">Accumulate across FIFO reads</p></div>
              <div><strong>3 · Report aggregation</strong><p>{config.report.interval_seconds / 60} min · {motion.feature_windows_per_report} features</p>
                <p className="small">Distribution statistics + temperature</p></div>
            </div>
          </section>
          {errors.map((error) => <div className="notice" role="alert" key={error}>{error}</div>)}
          <DeviceConstraintsSection config={config} onChange={setConfig} />
          <LisSection config={config} onChange={setConfig} />
          <MotionSection config={config} onChange={setConfig} />
          <NrfSection config={config} onChange={setConfig} />
          <PayloadBuilderSection config={config} payloadBytes={payloadBytes} onChange={setConfig} />
          <SmartSamplingSection config={config} onChange={setConfig} />
          <PayloadPreview config={config} />
        </main>

        {errors.length === 0 ? <ResultsPanel
          config={config}
          motion={motion}
          power={power}
          runtime={runtime}
          runtimeBest={runtimeBest}
          runtimeWorst={runtimeWorst}
          storage={storage}
          payloadBytes={payloadBytes}
        /> : <aside className="card">Correct the configuration above to calculate valid estimates.</aside>}
      </div>
    </div>
  );
}
