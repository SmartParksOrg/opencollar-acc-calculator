import type { AppConfig, Lis2dw12Fs, Lis2dw12Mode, Lis2dw12Noise } from "../../models/config";
import { ODR_CHOICES } from "../../models/config";
import { FieldCard } from "./FieldCard";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

export function LisSection({ config, onChange }: Props): JSX.Element {
  const patch = (cb: (c: AppConfig) => void): void => {
    const next = structuredClone(config);
    cb(next);
    onChange(next);
  };

  const usingCustomOdr = config.lis.odr_source === "custom" || !ODR_CHOICES.includes(config.lis.odr_hz);

  return (
    <section className="section card collapsible">
      <details open>
        <summary><span className="section-title">2. LIS2DW12 sampling & FIFO</span></summary>
        <div className="collapsible-content">
          <div className="grid-2">
        <FieldCard
          label="ODR (Hz)"
          help="Sampling rate. Higher ODR captures more detail but increases sensor current and FIFO servicing frequency."
          impacts={[
            "Higher ODR increases LIS current + wakeups",
            "Higher ODR shortens runtime",
            "No direct bytes/report change",
            "Higher ODR captures shorter motion events"
          ]}
        >
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <select
              value={usingCustomOdr ? "custom" : String(config.lis.odr_hz)}
              onChange={(e) => {
                const v = e.target.value;
                patch((c) => {
                  if (v === "custom") {
                    c.lis.odr_source = "custom";
                  } else {
                    c.lis.odr_source = "preset";
                    c.lis.odr_hz = Number(v);
                  }
                });
              }}
            >
              {ODR_CHOICES.map((odr) => (
                <option key={odr} value={String(odr)}>
                  {odr}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
            {usingCustomOdr ? (
              <input
                type="number"
                step="0.1"
                min={0.1}
                value={config.lis.odr_hz}
                onChange={(e) => patch((c) => {
                  c.lis.odr_source = "custom";
                  c.lis.odr_hz = Number(e.target.value);
                })}
              />
            ) : null}
          </div>
        </FieldCard>

        <FieldCard
          label="Mode"
          help="LIS2DW12 operating mode (LP1..LP4, HP). Current model anchors are for LP1 low-noise OFF."
          impacts={[
            "LP modes usually reduce current vs HP",
            "Lower mode current extends runtime",
            "No effect",
            "Mode changes noise/resolution tradeoff"
          ]}
        >
          <select
            value={config.lis.mode}
            onChange={(e) => patch((c) => { c.lis.mode = e.target.value as Lis2dw12Mode; })}
          >
            <option value="LP1">LP1</option>
            <option value="LP2">LP2</option>
            <option value="LP3">LP3</option>
            <option value="LP4">LP4</option>
            <option value="HP">HP</option>
          </select>
        </FieldCard>

        <FieldCard
          label="Low-noise"
          help="Improves noise floor with additional current. Often unnecessary for coarse activity summaries."
          impacts={[
            "ON can increase sensor current",
            "ON can shorten runtime",
            "No effect",
            "ON can improve noise-sensitive metrics"
          ]}
        >
          <select
            value={config.lis.noise}
            onChange={(e) => patch((c) => { c.lis.noise = e.target.value as Lis2dw12Noise; })}
          >
            <option value="low_noise_off">Off</option>
            <option value="low_noise_on">On</option>
          </select>
        </FieldCard>

        <FieldCard
          label="Full scale (g)"
          help="Sets measurable acceleration range. Higher range reduces resolution in mg/LSB."
          impacts={[
            "No direct current change in this model",
            "No runtime change in this model",
            "No direct storage change",
            "Higher FS avoids clipping but lowers sensitivity"
          ]}
        >
          <select
            value={String(config.lis.fs_g)}
            onChange={(e) => patch((c) => { c.lis.fs_g = Number(e.target.value) as Lis2dw12Fs; })}
          >
            <option value="2">+/-2 g</option>
            <option value="4">+/-4 g</option>
            <option value="8">+/-8 g</option>
            <option value="16">+/-16 g</option>
          </select>
        </FieldCard>

        <FieldCard
          label="FIFO watermark"
          help="Sample count that triggers host wake. Higher watermark lowers wakeups but adds latency and potential overflow risk."
          impacts={[
            "Higher watermark lowers nRF FIFO servicing current",
            "Higher watermark typically extends runtime",
            "No bytes/report change",
            "Higher watermark increases latency to process events"
          ]}
        >
          <input
            type="number"
            min={1}
            max={32}
            value={config.lis.fifo_watermark}
            onChange={(e) => patch((c) => { c.lis.fifo_watermark = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="FIFO mode"
          help="Buffer mode behavior; continuous keeps latest samples, fifo can stop when full, bypass disables buffering."
          impacts={[
            "Mode may alter practical wake behavior",
            "Indirect runtime effects through wake pattern",
            "No direct report byte change",
            "Changes buffering/latency behavior"
          ]}
        >
          <select
            value={config.lis.fifo_mode}
            onChange={(e) => patch((c) => { c.lis.fifo_mode = e.target.value as AppConfig["lis"]["fifo_mode"]; })}
          >
            <option value="continuous">continuous</option>
            <option value="fifo">fifo</option>
            <option value="bypass">bypass</option>
          </select>
        </FieldCard>

        <FieldCard
          label="Override LIS current (uA)"
          help="Optional direct sensor current input used instead of interpolation anchors."
          impacts={[
            "Directly sets LIS current term",
            "Directly shifts runtime estimate",
            "No effect",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="leave blank to use model"
            value={config.lis.override_current_uA ?? ""}
            onChange={(e) => patch((c) => {
              c.lis.override_current_uA = e.target.value === "" ? undefined : Number(e.target.value);
            })}
          />
        </FieldCard>
          </div>
        </div>
      </details>
    </section>
  );
}
