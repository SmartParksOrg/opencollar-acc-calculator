import type { AppConfig, SmartSamplingMetric } from "../../models/config";
import { FieldCard } from "./FieldCard";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

const METRIC_OPTIONS: Array<{ value: SmartSamplingMetric; label: string }> = [
  { value: "vedba_mean", label: "VeDBA mean" },
  { value: "vedba_max", label: "VeDBA max" },
  { value: "odba_mean", label: "ODBA mean" },
  { value: "odba_max", label: "ODBA max" },
  { value: "peak_acc", label: "Peak acceleration" },
  { value: "std_norm", label: "STD norm" }
];

export function SmartSamplingSection({ config, onChange }: Props): JSX.Element {
  const patch = (cb: (c: AppConfig) => void): void => {
    const next = structuredClone(config);
    cb(next);
    onChange(next);
  };

  const applyPreset = (preset: "store_all" | "high_only" | "high_plus_baseline" | "episodes"): void => {
    patch((c) => {
      c.smartSampling.enabled = true;
      c.smartSampling.metric = "vedba_mean";
      c.smartSampling.peak_enabled = true;
      c.smartSampling.peak_metric = "vedba_max";
      c.smartSampling.threshold_mode = "auto_percentile";
      c.smartSampling.calibration_duration_hours = 12;
      c.smartSampling.enter_percentile = 95;
      c.smartSampling.exit_percentile = 90;
      c.smartSampling.peak_percentile = 99;
      c.smartSampling.consecutive_enter_windows = 2;
      c.smartSampling.consecutive_exit_windows = 2;
      c.smartSampling.episodes_enabled = false;
      c.smartSampling.episode_pre_windows = 1;
      c.smartSampling.episode_post_windows = 2;
      c.smartSampling.episode_cooldown_windows = 1;

      if (preset === "store_all") {
        c.smartSampling.enabled = false;
        c.smartSampling.threshold_mode = "off";
        c.smartSampling.baseline_keep_enabled = false;
        return;
      }

      if (preset === "high_only") {
        c.smartSampling.baseline_keep_enabled = false;
        return;
      }

      c.smartSampling.baseline_keep_enabled = true;
      c.smartSampling.baseline_keep_1_in_n = 60;

      if (preset === "episodes") {
        c.smartSampling.episodes_enabled = true;
      }
    });
  };

  const showAuto = config.smartSampling.threshold_mode === "auto_percentile";
  const showManual = config.smartSampling.threshold_mode === "manual";

  return (
    <section className="section card collapsible">
      <details open>
        <summary><span className="section-title">5. Smart Sampling (Storage filtering)</span></summary>
        <div className="collapsible-content">
          <p className="help" style={{ marginTop: 0 }}>
        Smart sampling does not change accelerometer sampling or FIFO servicing. It only decides which computed windows are
        stored to flash.
          </p>

          <div className="button-row" style={{ marginBottom: "0.75rem" }}>
        <button type="button" className="secondary" onClick={() => applyPreset("store_all")}>Store All</button>
        <button type="button" className="secondary" onClick={() => applyPreset("high_only")}>High Activity Only</button>
        <button type="button" className="secondary" onClick={() => applyPreset("high_plus_baseline")}>
          High Activity + Baseline
        </button>
        <button type="button" className="secondary" onClick={() => applyPreset("episodes")}>Episodes</button>
          </div>

          <div className="grid-2">
        <FieldCard
          label="Enable smart sampling"
          help="What is this? Enables storage filtering so windows are stored when activity rules match."
          impacts={[
            "No sensor sampling power change",
            "Can increase runtime by reducing flash writes",
            "Lower stored fraction extends flash retention",
            "Retains active windows, may drop inactive context"
          ]}
        >
          <input
            type="checkbox"
            checked={config.smartSampling.enabled}
            onChange={(e) => patch((c) => { c.smartSampling.enabled = e.target.checked; })}
          />
        </FieldCard>

        <FieldCard
          label="Activity metric"
          help="What is this? Metric used for sustained activity detection and enter/exit state transitions."
          impacts={[
            "No direct current change",
            "No direct runtime change",
            "Can change stored fraction under same assumptions",
            "Different metrics capture different movement patterns"
          ]}
        >
          <select
            value={config.smartSampling.metric}
            onChange={(e) => patch((c) => { c.smartSampling.metric = e.target.value as SmartSamplingMetric; })}
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FieldCard>

        <FieldCard
          label="Peak override"
          help="What is this? Allows burst peaks to be stored even when sustained activity is low."
          impacts={[
            "No direct sampling current change",
            "May slightly reduce runtime via extra writes",
            "Captures short bursts that thresholds miss",
            "Improves rare-event retention"
          ]}
        >
          <input
            type="checkbox"
            checked={config.smartSampling.peak_enabled}
            onChange={(e) => patch((c) => { c.smartSampling.peak_enabled = e.target.checked; })}
          />
        </FieldCard>

        <FieldCard
          label="Peak metric"
          help="What is this? Metric used for burst override detection."
          impacts={[
            "No direct current change",
            "No direct runtime change",
            "Can increase stored windows if very sensitive",
            "Improves capture of abrupt transitions"
          ]}
        >
          <select
            value={config.smartSampling.peak_metric}
            onChange={(e) => patch((c) => { c.smartSampling.peak_metric = e.target.value as SmartSamplingMetric; })}
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FieldCard>
          </div>

          <div className="field" style={{ marginTop: "0.75rem" }}>
        <label>Threshold mode</label>
        <p className="help">What is this? Sets whether thresholds are disabled, fixed in mg, or auto percentile based.</p>
        <div className="button-row">
          <label><input
            type="radio"
            name="threshold-mode"
            checked={config.smartSampling.threshold_mode === "off"}
            onChange={() => patch((c) => { c.smartSampling.threshold_mode = "off"; })}
          /> Off</label>
          <label><input
            type="radio"
            name="threshold-mode"
            checked={config.smartSampling.threshold_mode === "auto_percentile"}
            onChange={() => patch((c) => { c.smartSampling.threshold_mode = "auto_percentile"; })}
          /> Auto (percentiles)</label>
          <label><input
            type="radio"
            name="threshold-mode"
            checked={config.smartSampling.threshold_mode === "manual"}
            onChange={() => patch((c) => { c.smartSampling.threshold_mode = "manual"; })}
          /> Manual (mg)</label>
        </div>
        <ul className="impact">
          <li>Power: Off can increase flash write current by storing all windows.</li>
          <li>Runtime: Better filtering usually improves runtime through lower flash duty.</li>
          <li>Storage: Auto and manual can reduce bytes/day relative to off.</li>
          <li>Data quality: Auto adapts across species using calibration percentiles.</li>
        </ul>
          </div>

          {showAuto ? (
            <div className="grid-2" style={{ marginTop: "0.75rem" }}>
          <FieldCard
            label="Calibration duration (hours)"
            help="What is this? Duration used on-device to learn percentile thresholds from observed motion."
            impacts={[
              "No direct current change in simulator",
              "No direct runtime change in simulator",
              "No direct bytes/day change in simulator",
              "Longer duration can stabilize percentile estimates"
            ]}
          >
            <input
              type="number"
              min={1}
              value={config.smartSampling.calibration_duration_hours}
              onChange={(e) => patch((c) => { c.smartSampling.calibration_duration_hours = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label="Enter percentile"
            help="What is this? Percentile threshold used to enter active state in auto mode."
            impacts={[
              "No direct current change",
              "No direct runtime change",
              "Higher percentile usually lowers stored fraction",
              "Too high can miss moderate activity bouts"
            ]}
          >
            <input
              type="number"
              min={0}
              max={100}
              value={config.smartSampling.enter_percentile}
              onChange={(e) => patch((c) => { c.smartSampling.enter_percentile = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label="Exit percentile"
            help="What is this? Lower percentile for exit hysteresis, reducing mode flapping."
            impacts={[
              "No direct current change",
              "No direct runtime change",
              "Lower exit threshold tends to retain more windows",
              "Hysteresis improves stable state transitions"
            ]}
          >
            <input
              type="number"
              min={0}
              max={100}
              value={config.smartSampling.exit_percentile}
              onChange={(e) => patch((c) => { c.smartSampling.exit_percentile = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label="Peak percentile"
            help="What is this? Auto percentile for burst override in peak mode."
            impacts={[
              "No direct current change",
              "No direct runtime change",
              "Lower value stores more burst windows",
              "Higher value focuses on only strongest bursts"
            ]}
          >
            <input
              type="number"
              min={0}
              max={100}
              value={config.smartSampling.peak_percentile}
              onChange={(e) => patch((c) => { c.smartSampling.peak_percentile = Number(e.target.value); })}
            />
          </FieldCard>
            </div>
          ) : null}

          {showManual ? (
            <div className="grid-2" style={{ marginTop: "0.75rem" }}>
          <FieldCard
            label="Enter threshold (mg)"
            help="What is this? Manual activity threshold to enter active state; may require species calibration."
            impacts={[
              "No direct current change",
              "No direct runtime change",
              "Lower threshold increases stored windows",
              "Threshold controls sensitivity to movement"
            ]}
          >
            <input
              type="number"
              min={0}
              value={config.smartSampling.enter_threshold_mg}
              onChange={(e) => patch((c) => { c.smartSampling.enter_threshold_mg = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label="Exit threshold (mg)"
            help="What is this? Manual threshold to exit active state for hysteresis."
            impacts={[
              "No direct current change",
              "No direct runtime change",
              "Higher exit threshold tends to keep more windows",
              "Exit hysteresis helps avoid rapid toggling"
            ]}
          >
            <input
              type="number"
              min={0}
              value={config.smartSampling.exit_threshold_mg}
              onChange={(e) => patch((c) => { c.smartSampling.exit_threshold_mg = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label="Peak threshold (mg)"
            help="What is this? Manual burst threshold used by peak override."
            impacts={[
              "No direct current change",
              "No direct runtime change",
              "Lower peak threshold stores more burst windows",
              "Higher threshold targets extreme bursts"
            ]}
          >
            <input
              type="number"
              min={0}
              value={config.smartSampling.peak_threshold_mg}
              onChange={(e) => patch((c) => { c.smartSampling.peak_threshold_mg = Number(e.target.value); })}
            />
          </FieldCard>
            </div>
          ) : null}

          <div className="grid-2" style={{ marginTop: "0.75rem" }}>
        <FieldCard
          label="Consecutive windows to enter"
          help="What is this? Debounce count required before entering active state."
          impacts={[
            "No direct current change",
            "No direct runtime change",
            "Higher value can reduce stored windows in noisy regions",
            "Reduces false-positive active periods"
          ]}
        >
          <input
            type="number"
            min={1}
            value={config.smartSampling.consecutive_enter_windows}
            onChange={(e) => patch((c) => { c.smartSampling.consecutive_enter_windows = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Consecutive windows to exit"
          help="What is this? Debounce count required before leaving active state."
          impacts={[
            "No direct current change",
            "No direct runtime change",
            "Higher value can keep active mode longer",
            "Prevents chattering around threshold"
          ]}
        >
          <input
            type="number"
            min={1}
            value={config.smartSampling.consecutive_exit_windows}
            onChange={(e) => patch((c) => { c.smartSampling.consecutive_exit_windows = Number(e.target.value); })}
          />
        </FieldCard>

        <FieldCard
          label="Baseline trickle"
          help="What is this? Keeps sparse inactive windows to reduce sampling bias in time budgets."
          impacts={[
            "Slightly increases flash duty",
            "May modestly reduce runtime",
            "Preserves background context in storage",
            "Improves representativeness of inactive periods"
          ]}
        >
          <input
            type="checkbox"
            checked={config.smartSampling.baseline_keep_enabled}
            onChange={(e) => patch((c) => { c.smartSampling.baseline_keep_enabled = e.target.checked; })}
          />
        </FieldCard>

        <FieldCard
          label="Store 1 in N inactive windows"
          help="What is this? Baseline trickle ratio when inactive windows are otherwise filtered out."
          impacts={[
            "Lower N slightly raises flash current",
            "Lower N slightly lowers runtime",
            "Lower N increases bytes/day",
            "Lower N improves inactive context quality"
          ]}
        >
          <input
            type="number"
            min={1}
            value={config.smartSampling.baseline_keep_1_in_n}
            onChange={(e) => patch((c) => { c.smartSampling.baseline_keep_1_in_n = Number(e.target.value); })}
          />
        </FieldCard>
          </div>

          <div className="field" style={{ marginTop: "0.75rem" }}>
        <label>
          <input
            type="checkbox"
            checked={config.smartSampling.episodes_enabled}
            onChange={(e) => patch((c) => { c.smartSampling.episodes_enabled = e.target.checked; })}
          /> {" "}
          Enable Episodes (store pre/post context windows)
        </label>
        <p className="help">
          What is this? Stores windows before and after triggers to capture transitions like rest to move to rest.
        </p>
        <ul className="impact">
          <li>Power: Slightly increases flash write and erase duty.</li>
          <li>Runtime: Slightly lower when many short bouts trigger episodes.</li>
          <li>Storage: Adds context windows around triggers.</li>
          <li>Data quality: Better transition context for behavior interpretation.</li>
        </ul>
          </div>

          {config.smartSampling.episodes_enabled ? (
            <div className="grid-3" style={{ marginTop: "0.75rem" }}>
          <FieldCard
            label="Pre windows"
            help="What is this? Number of windows stored before each trigger."
            impacts={[
              "No direct current change outside flash duty",
              "More pre windows can lower runtime slightly",
              "More pre windows increase bytes/day",
              "Captures lead-in motion before event"
            ]}
          >
            <input
              type="number"
              min={0}
              value={config.smartSampling.episode_pre_windows}
              onChange={(e) => patch((c) => { c.smartSampling.episode_pre_windows = Number(e.target.value); })}
            />
          </FieldCard>
          <FieldCard
            label="Post windows"
            help="What is this? Number of windows stored after each trigger."
            impacts={[
              "No direct current change outside flash duty",
              "More post windows can lower runtime slightly",
              "More post windows increase bytes/day",
              "Captures recovery phase after events"
            ]}
          >
            <input
              type="number"
              min={0}
              value={config.smartSampling.episode_post_windows}
              onChange={(e) => patch((c) => { c.smartSampling.episode_post_windows = Number(e.target.value); })}
            />
          </FieldCard>
          <FieldCard
            label="Cooldown windows"
            help="What is this? Cooldown suppresses repeated near-adjacent triggers and duplicate episode windows."
            impacts={[
              "No direct current change",
              "Higher cooldown can improve runtime slightly",
              "Higher cooldown can reduce episode overhead",
              "May miss closely spaced transitions"
            ]}
          >
            <input
              type="number"
              min={0}
              value={config.smartSampling.episode_cooldown_windows}
              onChange={(e) => patch((c) => { c.smartSampling.episode_cooldown_windows = Number(e.target.value); })}
            />
          </FieldCard>
            </div>
          ) : null}

          <div className="card" style={{ marginTop: "0.75rem", padding: "0.75rem" }}>
        <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Assumptions (simulator)</h3>
        <p className="help" style={{ marginTop: 0 }}>
          In firmware, percentiles are learned during calibration from observed VeDBA distribution; simulator uses assumed
          activity distribution.
        </p>
        <div className="grid-2">
          <FieldCard
            label={`% time active (${config.smartSampling.assumptions.active_percent.toFixed(1)}%)`}
            help="What is this? Assumed fraction of windows in sustained activity."
            impacts={[
              "No sampling current change",
              "Higher value lowers runtime through more flash writes",
              "Higher value increases stored fraction",
              "Reflects behavior mix assumptions"
            ]}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={config.smartSampling.assumptions.active_percent}
              onChange={(e) => patch((c) => { c.smartSampling.assumptions.active_percent = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label={`% windows with burst peaks (${config.smartSampling.assumptions.peak_percent.toFixed(1)}%)`}
            help="What is this? Assumed fraction of otherwise inactive windows that still trigger peak override."
            impacts={[
              "No sampling current change",
              "Higher value lowers runtime via flash writes",
              "Higher value increases stored windows",
              "Improves rare burst event retention"
            ]}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={config.smartSampling.assumptions.peak_percent}
              onChange={(e) => patch((c) => { c.smartSampling.assumptions.peak_percent = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label="Debounce factor"
            help="What is this? Coarse correction for threshold-region noise; simulator does not model Markov transitions."
            impacts={[
              "No direct sensor current change",
              "Lower factor can improve runtime estimates",
              "Lower factor reduces stored windows",
              "Advanced approximation only"
            ]}
          >
            <input
              type="number"
              min={0}
              max={2}
              step={0.01}
              value={config.smartSampling.assumptions.debounce_factor}
              onChange={(e) => patch((c) => { c.smartSampling.assumptions.debounce_factor = Number(e.target.value); })}
            />
          </FieldCard>

          <FieldCard
            label="Burst clustering (simple toggle)"
            help="What is this? Marks clustered bursts for future model refinement; current simulator keeps simple estimate."
            impacts={[
              "No current effect in current model",
              "No runtime effect in current model",
              "No storage effect in current model",
              "Reserved for later burst clustering refinement"
            ]}
          >
            <input
              type="checkbox"
              checked={config.smartSampling.assumptions.burst_clustering}
              onChange={(e) => patch((c) => { c.smartSampling.assumptions.burst_clustering = e.target.checked; })}
            />
          </FieldCard>

          {config.smartSampling.episodes_enabled ? (
            <FieldCard
              label="Average bout length (windows)"
              help="What is this? Average active bout duration used to estimate triggers/day for episode extras."
              impacts={[
                "No direct current change",
                "Shorter bouts can reduce runtime due to more triggers",
                "Shorter bouts increase episode extra windows",
                "Controls transition density in assumptions"
              ]}
            >
              <input
                type="number"
                min={1}
                value={config.smartSampling.assumptions.avg_bout_len_windows}
                onChange={(e) => patch((c) => { c.smartSampling.assumptions.avg_bout_len_windows = Number(e.target.value); })}
              />
            </FieldCard>
          ) : null}
        </div>
          </div>

          <div className="small" style={{ marginTop: "0.5rem" }}>
        Advanced note: debounce/hysteresis reduces stored windows in noisy threshold regions; this simulator uses an approximate
        factor, not a full state model.
          </div>
        </div>
      </details>
    </section>
  );
}
