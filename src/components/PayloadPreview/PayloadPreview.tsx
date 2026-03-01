import type { AppConfig } from "../../models/config";
import { buildExamplePayload, buildPayloadLayout } from "../../calcs/payload";

type Props = {
  config: AppConfig;
};

export function PayloadPreview({ config }: Props): JSX.Element {
  const layout = buildPayloadLayout(config.payload.included_fields);
  const example = buildExamplePayload(config.payload.included_fields, config);

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>Payload preview</h2>
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
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(example.json, null, 2)}</pre>
    </div>
  );
}
