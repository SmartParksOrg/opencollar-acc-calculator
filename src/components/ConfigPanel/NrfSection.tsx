import type { AppConfig } from "../../models/config";
import { FieldCard } from "./FieldCard";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

export function NrfSection({ config, onChange }: Props): JSX.Element {
  const patch = (cb: (c: AppConfig) => void): void => {
    const next = structuredClone(config);
    cb(next);
    onChange(next);
  };

  return (
    <section className="section card collapsible">
      <details open>
        <summary><span className="section-title">5. Processing, flash and radio power</span></summary>
        <div className="collapsible-content">
          <p className="help">New processing defaults are editable estimates, not firmware measurements.
            Active costs are incremental above sleep. Flash and radio costs are additional subsystem costs.
            FIFO work stays short; report packing, sorting, flash and radio run outside the FIFO handler.</p>
          <div className="grid-2">
            {([
              ["sample_processing_time_us", "Per-sample feature processing (µs)", "Accumulate magnitude, VeDBA and optional features for every sample."],
              ["feature_finalize_time_ms", "Feature-window finalization (ms)", "CPU work per feature window within normal FIFO servicing; no extra wakeup."],
              ["percentile_time_per_value_us", "Percentile calculation per buffered value (µs)", "Empirical sorting budget; recalibrate for the chosen report size and algorithm. Zero when no percentile fields are selected."]
            ] as const).map(([key, label, help]) => <label className="field" key={key}>{label}
              <input type="number" min={0} step={0.1} value={config.nrf52[key]}
                onChange={(e) => patch((c) => { c.nrf52[key] = Number(e.target.value); })} />
              <p className="help">{help}</p>
            </label>)}
            <label className="field">Transmit retained reports
              <input type="checkbox" checked={config.radio.enabled}
                onChange={(e) => patch((c) => { c.radio.enabled = e.target.checked; })} />
              <p className="help">One radio session per retained report. Acquisition continues during transmission.</p>
            </label>
            <label className="field">Radio charge per report (mA·s)
              <input type="number" min={0} step={0.1} value={config.radio.charge_per_report_mAs}
                onChange={(e) => patch((c) => { c.radio.charge_per_report_mAs = Number(e.target.value); })} />
              <p className="help">Supply measured TX/RX/session charge for this payload and transport, including retries
                and MCU overhead as appropriate. No airtime or transport-specific charge is assumed.</p>
            </label>
        <FieldCard
          label="Sleep current (uA)"
          help="System ON baseline current when not actively servicing FIFO or finalizing report."
          impacts={[
            "Direct baseline current term",
            "Higher baseline reduces runtime",
            "No effect",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.01"
            value={config.nrf52.sleep_current_uA}
            onChange={(e) => patch((c) => { c.nrf52.sleep_current_uA = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Active current (mA)"
          help="Current while CPU is active for FIFO service and periodic finalize tasks."
          impacts={[
            "Scales MCU processing contributions",
            "Higher active current lowers runtime",
            "No direct effect",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.01"
            value={config.nrf52.active_current_mA}
            onChange={(e) => patch((c) => { c.nrf52.active_current_mA = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="FIFO service time (ms)"
          help="CPU overhead per FIFO service for wake/read only; per-sample processing and feature finalization are separate."
          impacts={[
            "Longer time increases FIFO servicing current",
            "Longer time lowers runtime",
            "No effect",
            "May allow more complex processing"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.1"
            value={config.nrf52.fifo_service_time_ms}
            onChange={(e) => patch((c) => { c.nrf52.fifo_service_time_ms = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Report finalize/pack time (ms)"
          help="Additional active time once per report interval for packaging and metadata handling, excluding percentile calculation."
          impacts={[
            "Longer time increases periodic finalize current",
            "Higher finalize current lowers runtime",
            "No effect",
            "Can support richer metadata/payload logic"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.1"
            value={config.nrf52.finalize_time_ms}
            onChange={(e) => patch((c) => { c.nrf52.finalize_time_ms = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Flash write current (mA)"
          help="Active current used during per-record flash write when logging enabled."
          impacts={[
            "Higher value increases flash average current",
            "Higher value lowers runtime",
            "No capacity change",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.1"
            value={config.flash.write_current_mA}
            onChange={(e) => patch((c) => { c.flash.write_current_mA = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Flash write time (ms)"
          help="Time spent per record write; amortized over stored reports rate in current model."
          impacts={[
            "Longer write increases flash average current",
            "Longer write lowers runtime",
            "No capacity change",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.1"
            value={config.flash.write_time_ms}
            onChange={(e) => patch((c) => { c.flash.write_time_ms = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Flash erase current (mA)"
          help="Current during erase operation amortized by erase interval records."
          impacts={[
            "Higher erase current increases flash term",
            "Higher erase current lowers runtime",
            "No capacity change",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.1"
            value={config.flash.erase_current_mA}
            onChange={(e) => patch((c) => { c.flash.erase_current_mA = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Flash erase time (ms)"
          help="Duration of erase operation used for amortized current estimate."
          impacts={[
            "Longer erase increases flash term",
            "Longer erase lowers runtime",
            "No direct bytes change",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.1"
            value={config.flash.erase_time_ms}
            onChange={(e) => patch((c) => { c.flash.erase_time_ms = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Erase interval records"
          help="How many stored records between erase events for amortization model."
          impacts={[
            "Higher interval lowers amortized erase current",
            "Higher interval extends runtime estimate",
            "No direct capacity change",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={1}
            value={config.flash.erase_interval_records}
            onChange={(e) => patch((c) => { c.flash.erase_interval_records = Number(e.target.value); })}
          />
        </FieldCard>
          </div>
        </div>
      </details>
    </section>
  );
}
