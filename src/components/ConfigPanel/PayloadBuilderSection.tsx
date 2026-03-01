import type { AppConfig, StatField } from "../../models/config";
import { getFieldDef } from "../../calcs/payload";
import { FieldCard } from "./FieldCard";

type Props = {
  config: AppConfig;
  payloadBytes: number;
  onChange: (next: AppConfig) => void;
};

const FIELD_ORDER: StatField[] = [
  "timestamp_u32",
  "odba_mean_i16",
  "odba_max_i16",
  "vedba_mean_i16",
  "vedba_max_i16",
  "std_xyz_i16x3",
  "mean_xyz_i16x3",
  "peak_acc_i16",
  "sample_count_u16",
  "activity_flags_u8",
  "reserved_u8",
  "odr_code_u8",
  "fs_code_u8",
  "mode_code_u8",
  "overflow_count_u8",
  "crc16_u16",
  "window_len_s_u16",
  "temp_cC_i16",
  "batt_mV_u16"
];

export function PayloadBuilderSection({ config, payloadBytes, onChange }: Props): JSX.Element {
  const patch = (cb: (c: AppConfig) => void): void => {
    const next = structuredClone(config);
    cb(next);
    onChange(next);
  };

  const toggleField = (field: StatField): void => {
    patch((c) => {
      const set = new Set(c.payload.included_fields);
      if (set.has(field)) {
        set.delete(field);
      } else {
        set.add(field);
      }
      c.payload.included_fields = FIELD_ORDER.filter((f) => set.has(f));
    });
  };

  const max = config.max_payload_bytes ?? 0;
  const remaining = max > 0 ? max - payloadBytes : undefined;

  return (
    <section className="section card collapsible">
      <details open>
        <summary><span className="section-title">4. Motion statistics payload builder</span></summary>
        <div className="collapsible-content">
          <p className="help">
        ODBA/VeDBA dynamic vs raw: dynamic removes gravity; raw mixes posture and motion.
          </p>

          <div className="grid-2" style={{ marginBottom: "0.75rem" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Payload size</label>
          <div><strong>{payloadBytes} bytes</strong></div>
          {max > 0 ? <div className="small">Remaining vs max: {remaining} bytes</div> : <div className="small">No max payload cap set</div>}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <FieldCard
            label="ODBA / VeDBA and gravity settings"
            help="ODBA/VeDBA dynamic vs raw: dynamic removes gravity; raw mixes posture and motion. IIR alpha controls dynamic baseline time constant; lower alpha tracks gravity more slowly."
            impacts={[
              "Negligible effect (algorithmic detail only in this model)",
              "Negligible direct effect",
              "No size effect unless fields are toggled",
              "Strongly affects motion/posture separation"
            ]}
          >
            <div className="grid-2">
              <select
                value={config.payload.odba_definition}
                onChange={(e) => patch((c) => { c.payload.odba_definition = e.target.value as AppConfig["payload"]["odba_definition"]; })}
              >
                <option value="abs_sum_dynamic">ODBA: abs_sum_dynamic</option>
                <option value="abs_sum_raw">ODBA: abs_sum_raw</option>
              </select>
              <select
                value={config.payload.vedba_definition}
                onChange={(e) => patch((c) => { c.payload.vedba_definition = e.target.value as AppConfig["payload"]["vedba_definition"]; })}
              >
                <option value="rss_dynamic">VeDBA: rss_dynamic</option>
                <option value="rss_raw">VeDBA: rss_raw</option>
                <option value="rss2_dynamic">VeDBA: rss2_dynamic</option>
              </select>
              <select
                value={config.payload.gravity_removal}
                onChange={(e) => patch((c) => { c.payload.gravity_removal = e.target.value as AppConfig["payload"]["gravity_removal"]; })}
              >
                <option value="iir_lp">Gravity removal: iir_lp</option>
                <option value="window_mean">Gravity removal: window_mean</option>
              </select>
              <input
                type="number"
                step="0.001"
                min={0.001}
                max={1}
                value={config.payload.iir_alpha}
                onChange={(e) => patch((c) => { c.payload.iir_alpha = Number(e.target.value); })}
              />
            </div>
          </FieldCard>
        </div>

        <FieldCard
          label="Mean/StdDev frame"
          help="Choose whether mean/std fields are derived from dynamic acceleration or raw acceleration."
          impacts={[
            "No direct effect in this model",
            "No direct effect",
            "No byte change",
            "Changes interpretation for posture vs activity"
          ]}
        >
          <select
            value={config.payload.mean_std_frame}
            onChange={(e) => patch((c) => { c.payload.mean_std_frame = e.target.value as AppConfig["payload"]["mean_std_frame"]; })}
          >
            <option value="dynamic">dynamic</option>
            <option value="raw">raw</option>
          </select>
        </FieldCard>

        <FieldCard
          label="Activity flag thresholds"
          help="Thresholds used if activity flags depend on ODBA mean and stillness STD criteria."
          impacts={[
            "No direct effect",
            "No direct effect",
            "No byte change",
            "Changes false-positive/false-negative flag behavior"
          ]}
        >
          <div className="grid-2">
            <div>
              <label>ODBA mean threshold (mg)</label>
              <input
                type="number"
                min={0}
                value={config.payload.activity_thresholds.odba_mean_mg}
                onChange={(e) => patch((c) => { c.payload.activity_thresholds.odba_mean_mg = Number(e.target.value); })}
              />
              <p className="small" style={{ marginBottom: 0 }}>Above this value, a window is considered active.</p>
            </div>
            <div>
              <label>Stillness STD threshold (mg)</label>
              <input
                type="number"
                min={0}
                value={config.payload.activity_thresholds.stillness_std_mg}
                onChange={(e) => patch((c) => { c.payload.activity_thresholds.stillness_std_mg = Number(e.target.value); })}
              />
              <p className="small" style={{ marginBottom: 0 }}>Below this value, a window is considered still.</p>
            </div>
          </div>
        </FieldCard>
      </div>

          <table className="table">
        <thead>
          <tr>
            <th>Include</th>
            <th>Field</th>
            <th>Type</th>
            <th>Bytes</th>
            <th>Scaling</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {FIELD_ORDER.map((field) => {
            const def = getFieldDef(field);
            const checked = config.payload.included_fields.includes(field);

            return (
              <tr key={field}>
                <td>
                  <input type="checkbox" checked={checked} onChange={() => toggleField(field)} />
                </td>
                <td>{def.label}</td>
                <td>{def.type}</td>
                <td>{def.bytes}</td>
                <td>{def.scaling}</td>
                <td>{def.notes}</td>
              </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
