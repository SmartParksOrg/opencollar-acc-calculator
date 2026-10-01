import type { AppConfig } from "../../models/config";
import { calculateMotionMetrics } from "../../calcs/motion";

export function MotionSection({ config, onChange }: { config: AppConfig; onChange: (next: AppConfig) => void }): JSX.Element {
  const motion = calculateMotionMetrics(config);
  const patch = (cb: (c: AppConfig) => void): void => {
    const next = structuredClone(config);
    cb(next);
    onChange(next);
  };
  return <>
    <section className="section card collapsible">
      <details open>
        <summary><span className="section-title">3. Short feature windows</span></summary>
        <div className="collapsible-content">
          <p className="help">Continuous samples accumulate across FIFO reads into non-overlapping feature windows.
            Finalize a feature while servicing FIFO samples; there is no separate wakeup at each feature boundary.</p>
          <div className="grid-2">
            <label className="field">Feature window (s)
              <input type="number" min={0.01} step={0.1} value={config.feature.window_seconds}
                onChange={(e) => patch((c) => { c.feature.window_seconds = Number(e.target.value); })} />
            </label>
            <label className="field">Activity threshold: std(|a|) (mg)
              <input type="number" min={0} value={config.feature.activity_threshold_mg}
                onChange={(e) => patch((c) => { c.feature.activity_threshold_mg = Number(e.target.value); })} />
            </label>
          </div>
          <p><strong>{motion.samples_per_feature_window.toLocaleString()} samples per feature window</strong></p>
          <p className="help">Primary feature: standard deviation of |a| = sqrt(x² + y² + z²).
            Also accumulate mean VeDBA (dynamic vector magnitude); optional ODBA and peak magnitude remain available.
            Active means std(|a|) exceeds the explicit threshold. Share this threshold with the server as configuration provenance.</p>
          <p className="small">Streaming accumulators avoid retaining every XYZ sample. Algorithm choices describe the
            firmware model; this calculator does not infer features or activity from a recorded signal.</p>
        </div>
      </details>
    </section>
    <section className="section card collapsible">
      <details open>
        <summary><span className="section-title">4. Report aggregation</span></summary>
        <div className="collapsible-content">
          <div className="button-row">
            {[5, 10, 15].map((minutes) => <button className="secondary" key={minutes}
              onClick={() => patch((c) => { c.report.interval_seconds = minutes * 60; })}>{minutes} min</button>)}
          </div>
          <label className="field">Report interval (s)
            <input type="number" min={config.feature.window_seconds} step={config.feature.window_seconds}
              value={config.report.interval_seconds}
              onChange={(e) => patch((c) => { c.report.interval_seconds = Number(e.target.value); })} />
          </label>
          <p><strong>{motion.feature_windows_per_report.toLocaleString()} feature windows per report</strong>
            {" · "}{motion.reports_per_day.toLocaleString()} reports/day</p>
          <p className="help">Aggregate the distribution of short-window std(|a|): mean, SD, p25, p50, p75 and max.
            Include mean VeDBA, active fraction, transitions within the report, valid-window count,
            and temperature mean/min/max. All valid feature windows contribute before retention filtering.</p>
          <p className="small">Exact percentiles: {motion.percentile_buffer_bytes.toLocaleString()} bytes for one uint16
            per feature window when percentile fields are selected. Sorting and report packing are deferred outside the FIFO handler.</p>
          {motion.feature_windows_per_report > 256 && config.payload.included_fields.includes("transition_count_u8")
            ? <p className="notice">This report can contain more than 255 transitions. The candidate uint8 field needs
              a firmware saturation policy or wider encoding.</p> : null}
        </div>
      </details>
    </section>
  </>;
}
