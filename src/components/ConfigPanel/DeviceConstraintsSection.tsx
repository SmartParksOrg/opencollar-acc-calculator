import { BATTERY_PRESETS, FLASH_OPTIONS, type AppConfig } from "../../models/config";
import { FieldCard } from "./FieldCard";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

export function DeviceConstraintsSection({ config, onChange }: Props): JSX.Element {
  const patch = (path: (c: AppConfig) => void): void => {
    const next = structuredClone(config);
    path(next);
    onChange(next);
  };
  const selectedBatteryPreset =
    BATTERY_PRESETS.find(
      (preset) =>
        preset.capacity_mAh === config.battery.capacity_mAh &&
        preset.nominal_V === config.battery.nominal_V
    )?.id ?? "custom";
  const selectedFlashBytes = FLASH_OPTIONS.some((option) => option.bytes === config.storage.flash_bytes_available)
    ? config.storage.flash_bytes_available
    : FLASH_OPTIONS[0].bytes;

  return (
    <section className="section card collapsible">
      <details open>
        <summary><span className="section-title">1. Device constraints</span></summary>
        <div className="collapsible-content">
          <div className="grid-2">
        <FieldCard
          label="Battery preset"
          help="Default baseline is a single Saft LS14250 cell. Choose a preset or keep custom values."
          impacts={[
            "No direct current change",
            "Higher capacity extends runtime linearly",
            "No effect",
            "No effect"
          ]}
        >
          <select
            value={selectedBatteryPreset}
            onChange={(e) =>
              patch((c) => {
                const preset = BATTERY_PRESETS.find((item) => item.id === e.target.value);
                if (preset) {
                  c.battery.capacity_mAh = preset.capacity_mAh;
                  c.battery.nominal_V = preset.nominal_V;
                }
              })
            }
          >
            {BATTERY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom (manual)</option>
          </select>
        </FieldCard>

        <FieldCard
          label="Battery capacity (mAh)"
          help="Nominal per-cell battery capacity. Runtime uses capacity x number of cells x usable fraction."
          impacts={[
            "No direct current change",
            "Higher capacity extends runtime linearly",
            "No effect",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={1}
            value={config.battery.capacity_mAh}
            onChange={(e) => patch((c) => { c.battery.capacity_mAh = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Number of batteries"
          help="Assumes identical cells in parallel. Effective capacity scales linearly with this value; nominal voltage stays unchanged."
          impacts={[
            "No direct current change",
            "Higher count extends runtime linearly",
            "No effect",
            "No effect"
          ]}
        >
          <input
            type="number"
            min={1}
            step={1}
            value={config.battery.cell_count}
            onChange={(e) => patch((c) => { c.battery.cell_count = Math.max(1, Math.floor(Number(e.target.value) || 1)); })}
          />
          <p className="help" style={{ marginBottom: 0 }}>
            Effective capacity: {(config.battery.capacity_mAh * Math.max(1, config.battery.cell_count)).toLocaleString()} mAh
          </p>
        </FieldCard>

        <FieldCard
          label="Nominal battery voltage (V)"
          help="Used for the optional energy view (average power in uW)."
          impacts={[
            "No current impact",
            "No direct runtime impact",
            "No effect",
            "No effect"
          ]}
        >
          <input
            type="number"
            step="0.1"
            min={1}
            value={config.battery.nominal_V}
            onChange={(e) => patch((c) => { c.battery.nominal_V = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Usable battery fraction"
          help="Accounts for cutoff voltage, temperature, battery aging, and conservative reserve."
          impacts={[
            "No current impact",
            "Lower fraction shortens runtime estimate",
            "No effect",
            "No effect"
          ]}
        >
          <input
            type="number"
            step="0.01"
            min={0.1}
            max={1}
            value={config.battery.usable_fraction}
            onChange={(e) => patch((c) => { c.battery.usable_fraction = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Flash storage option"
          help="Available onboard flash choices are fixed to 128 megabit or 256 megabit."
          impacts={[
            "No current impact",
            "No direct runtime impact",
            "Higher value extends days until full",
            "No effect"
          ]}
        >
          <select
            value={String(selectedFlashBytes)}
            onChange={(e) => patch((c) => { c.storage.flash_bytes_available = Number(e.target.value); })}
          >
            {FLASH_OPTIONS.map((option) => (
              <option key={option.id} value={String(option.bytes)}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldCard>

        <FieldCard
          label="Report interval (s)"
          help="Time between summary records and finalize operations. Default 300 seconds (5 minutes)."
          impacts={[
            "Longer interval lowers finalize and flash average current",
            "Longer interval increases runtime",
            "Longer interval reduces records/day",
            "Longer interval reduces temporal granularity"
          ]}
        >
          <input
            type="number"
            min={1}
            value={config.report.interval_seconds}
            onChange={(e) => patch((c) => { c.report.interval_seconds = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Max payload bytes (optional)"
          help="Soft cap for payload design; use 0 to disable cap."
          impacts={[
            "No current impact",
            "No direct runtime impact",
            "Can enforce tighter storage usage",
            "May limit transmitted statistics"
          ]}
        >
          <input
            type="number"
            min={0}
            value={config.max_payload_bytes ?? 0}
            onChange={(e) => patch((c) => { c.max_payload_bytes = Number(e.target.value) || undefined; })}
          />
        </FieldCard>

        <FieldCard
          label="Store reports to flash"
          help="Controls whether flash write/erase model contributes to average current and storage fill calculations."
          impacts={[
            "Enabled adds flash write + erase current",
            "Enabled shortens runtime",
            "Enabled consumes flash per record",
            "No sensor quality change"
          ]}
        >
          <input
            type="checkbox"
            checked={config.report.store_to_flash}
            onChange={(e) => patch((c) => { c.report.store_to_flash = e.target.checked; c.flash.enabled = e.target.checked; })}
          />
        </FieldCard>

        <FieldCard
          label="Uncertainty mode"
          help="Shows runtime best/typical/worst using multiplicative current factors."
          impacts={[
            "No modeled current change",
            "Displays range instead of single estimate",
            "No effect",
            "No effect"
          ]}
        >
          <input
            type="checkbox"
            checked={config.uncertainty.enabled}
            onChange={(e) => patch((c) => { c.uncertainty.enabled = e.target.checked; })}
          />
        </FieldCard>
          </div>
          {config.uncertainty.enabled ? (
            <div className="grid-3" style={{ marginTop: "0.75rem" }}>
          <FieldCard
            label="Best-case factor"
            help="Current multiplier used for optimistic runtime."
            impacts={[
              "Lower factor lowers modeled current",
              "Lower factor increases best-case runtime",
              "No effect",
              "No effect"
            ]}
          >
            <input
              type="number"
              step="0.01"
              value={config.uncertainty.best_case_factor}
              onChange={(e) => patch((c) => { c.uncertainty.best_case_factor = Number(e.target.value); })}
            />
          </FieldCard>
          <FieldCard
            label="Typical factor"
            help="Multiplier used for typical runtime estimate."
            impacts={[
              "Scales current in runtime range",
              "Higher factor lowers typical runtime",
              "No effect",
              "No effect"
            ]}
          >
            <input
              type="number"
              step="0.01"
              value={config.uncertainty.typical_factor}
              onChange={(e) => patch((c) => { c.uncertainty.typical_factor = Number(e.target.value); })}
            />
          </FieldCard>
          <FieldCard
            label="Worst-case factor"
            help="Current multiplier used for conservative runtime bound."
            impacts={[
              "Higher factor increases modeled current",
              "Higher factor shortens worst-case runtime",
              "No effect",
              "No effect"
            ]}
          >
            <input
              type="number"
              step="0.01"
              value={config.uncertainty.worst_case_factor}
              onChange={(e) => patch((c) => { c.uncertainty.worst_case_factor = Number(e.target.value); })}
            />
          </FieldCard>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
