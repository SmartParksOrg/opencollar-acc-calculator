import type { AppConfig } from "../../models/config";
import { buildExamplePayload, buildPayloadLayout } from "../../calcs/payload";

type Props = {
  config: AppConfig;
};

export function PayloadPreview({ config }: Props): JSX.Element {
  const layout = buildPayloadLayout(config.payload.included_fields);
  const example = buildExamplePayload(config.payload.included_fields, config);

  return (
    <section className="card collapsible" style={{ marginTop: "1rem" }}>
      <details open>
        <summary><span className="section-title">Payload preview</span></summary>
        <div className="collapsible-content">
          <table className="table">
        <thead>
          <tr>
            <th>Offset</th>
            <th>Field</th>
            <th>Type</th>
            <th>Bytes</th>
            <th>Scaling</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {layout.map((row) => (
            <tr key={`${row.offset}-${row.field.field}`}>
              <td>{row.offset}</td>
              <td>{row.field.label}</td>
              <td>{row.field.type}</td>
              <td>{row.field.bytes}</td>
              <td>{row.field.scaling}</td>
              <td>{row.field.notes}</td>
            </tr>
          ))}
        </tbody>
          </table>

          <p className="small"><strong>Little-endian hex bytes:</strong> {example.hex || "(empty payload)"}</p>
          {config.smartSampling.enabled ? (
            <p className="small">
              This payload is computed every window, but stored only when Smart Sampling rules select it.
            </p>
          ) : null}
          {config.smartSampling.enabled && config.smartSampling.episodes_enabled ? (
            <p className="small">
              Episodes stores {config.smartSampling.episode_pre_windows} windows before and {config.smartSampling.episode_post_windows} after triggers.
            </p>
          ) : null}
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(example.json, null, 2)}</pre>
        </div>
      </details>
    </section>
  );
}
