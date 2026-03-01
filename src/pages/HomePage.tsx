import { useMemo } from "react";
import { calculatePayloadBytes } from "../calcs/payload";
import { calculatePowerBreakdown, calculateRuntimeHours } from "../calcs/power";
import { calculateStorageUsage } from "../calcs/storage";
import type { AppConfig } from "../models/config";
import { DeviceConstraintsSection } from "../components/ConfigPanel/DeviceConstraintsSection";
import { ExampleConfigSelect } from "../components/ConfigPanel/ExampleConfigSelect";
import { LisSection } from "../components/ConfigPanel/LisSection";
import { NrfSection } from "../components/ConfigPanel/NrfSection";
import { PayloadBuilderSection } from "../components/ConfigPanel/PayloadBuilderSection";
import { ResultsPanel } from "../components/ResultsPanel/ResultsPanel";
import { PayloadPreview } from "../components/PayloadPreview/PayloadPreview";

type Props = {
  config: AppConfig;
  setConfig: (cfg: AppConfig) => void;
  onCopyConfig: () => void;
  onShareLink: () => void;
};

export function HomePage({ config, setConfig, onCopyConfig, onShareLink }: Props): JSX.Element {
  const payloadBytes = useMemo(() => calculatePayloadBytes(config.payload.included_fields), [config.payload.included_fields]);

  const power = useMemo(() => calculatePowerBreakdown(config), [config]);

  const runtime = useMemo(
    () => calculateRuntimeHours(config.battery.capacity_mAh, config.battery.usable_fraction, power.total_uA),
    [config.battery.capacity_mAh, config.battery.usable_fraction, power.total_uA]
  );

  const storage = useMemo(
    () => calculateStorageUsage(config.storage, payloadBytes, config.report.interval_seconds),
    [config.storage, payloadBytes, config.report.interval_seconds]
  );

  const runtimeBest = config.uncertainty.enabled
    ? calculateRuntimeHours(
        config.battery.capacity_mAh,
        config.battery.usable_fraction,
        power.total_uA * config.uncertainty.best_case_factor
      )
    : undefined;

  const runtimeWorst = config.uncertainty.enabled
    ? calculateRuntimeHours(
        config.battery.capacity_mAh,
        config.battery.usable_fraction,
        power.total_uA * config.uncertainty.worst_case_factor
      )
    : undefined;

  return (
    <div className="app-shell">
      <header className="header card">
        <div>
          <h1>OpenCollar ACC Simulation Tool</h1>
          <p>
            nRF52 + LIS2DW12 sampling, FIFO wakeups, motion summary payload composition, and battery/storage projections.
          </p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={onCopyConfig}>Copy configuration</button>
          <button className="secondary" onClick={onShareLink}>Share link</button>
        </div>
      </header>

      <div className="layout">
        <main>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <ExampleConfigSelect onApply={setConfig} current={config} />
            {config.lis.odr_hz >= 100 ? (
              <div className="notice">High detail profile: 100 Hz can sharply increase FIFO wakeups and active duty cycle.</div>
            ) : null}
            {config.max_payload_bytes && payloadBytes > config.max_payload_bytes ? (
              <div className="notice">Payload exceeds max payload bytes constraint.</div>
            ) : null}
          </div>

          <DeviceConstraintsSection config={config} onChange={setConfig} />
          <LisSection config={config} onChange={setConfig} />
          <NrfSection config={config} onChange={setConfig} />
          <PayloadBuilderSection config={config} payloadBytes={payloadBytes} onChange={setConfig} />
          <PayloadPreview config={config} />

          <section className="assumptions">
            <h2 style={{ marginTop: 0 }}>Assumptions</h2>
            <ul>
              <li>nRF sleep 1.5 uA, active 4 mA, FIFO service 2 ms, finalize 10 ms.</li>
              <li>Default battery preset: 1x Saft LS14250 (1.2Ah, 3.6V).</li>
              <li>Flash options: 128 megabit (16 MiB) or 256 megabit (32 MiB).</li>
              <li>LIS2DW12 LP1 low-noise-off anchor table with linear interpolation between ODR points.</li>
              <li>FIFO depth fixed at 32 samples.</li>
              <li>Default report interval: 300 s (5 minutes).</li>
            </ul>
          </section>
        </main>

        <ResultsPanel
          power={power}
          runtime={runtime}
          runtimeBest={runtimeBest}
          runtimeWorst={runtimeWorst}
          storage={storage}
          payloadBytes={payloadBytes}
          reportIntervalS={config.report.interval_seconds}
        />
      </div>
    </div>
  );
}
