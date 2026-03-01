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
    <section className="section card">
      <h2>3. nRF52 wake/read/compute parameters</h2>
      <div className="grid-2">
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
            "Scales fifo/finalize/flash active contributions",
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
          help="CPU awake time per FIFO wakeup for read + compute summary update."
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
          label="Finalize/pack time (ms)"
          help="Additional active time once per report interval for packaging and metadata handling."
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
          help="Time spent per record write; amortized over report interval in current model."
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
          help="How many records between erase events for amortization model."
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
    </section>
  );
}
