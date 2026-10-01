import { DEFAULT_FIELDS, type AppConfig, type StatField } from "../../models/config";
import { FIELD_DEFS, FIELD_ORDER, PAYLOAD_GROUPS } from "../../models/payloadSchema";

type Props = {
  config: AppConfig;
  payloadBytes: number;
  onChange: (next: AppConfig) => void;
};

export function PayloadBuilderSection({ config, payloadBytes, onChange }: Props): JSX.Element {
  const patch = (cb: (c: AppConfig) => void): void => {
    const next = structuredClone(config);
    cb(next);
    onChange(next);
  };
  const toggleField = (field: StatField): void => {
    patch((c) => {
      const selected = new Set(c.payload.included_fields);
      if (selected.has(field)) selected.delete(field);
      else selected.add(field);
      c.payload.included_fields = FIELD_ORDER.filter((key) => selected.has(key));
    });
  };
  const max = config.max_payload_bytes ?? 0;
  const optionalSelected = config.payload.included_fields.filter((key) => !FIELD_DEFS[key].recommended).length;
  const renderGroup = (group: keyof typeof PAYLOAD_GROUPS): JSX.Element => (
    <div key={group} className="payload-group">
      <h3>{PAYLOAD_GROUPS[group].title}</h3>
      <p className="help">{PAYLOAD_GROUPS[group].description}</p>
      <table className="table payload-fields">
        <thead><tr><th>Include statistic</th><th>Bytes</th><th>Meaning over the report interval</th></tr></thead>
        <tbody>{FIELD_ORDER.filter((key) => FIELD_DEFS[key].group === group).map((key) => {
          const field = FIELD_DEFS[key];
          return <tr key={key}>
            <td><label><input type="checkbox" checked={config.payload.included_fields.includes(key)}
              onChange={() => toggleField(key)} /> {field.label}</label></td>
            <td data-unit={field.bytes === 1 ? "byte" : "bytes"}>{field.bytes}</td><td>{field.notes}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );

  return <section className="section card collapsible">
    <details open>
      <summary><span className="section-title">6. Motion Statistics payload builder</span></summary>
      <div className="collapsible-content">
        <p className="help">Choose each report statistic once. The recommended set is 22 motion bytes including timestamp,
          plus 6 temperature bytes. Units, byte offsets and the single encoding for each statistic appear in Payload preview.
          Temperature scaling, byte order and protocol/version overhead remain candidate firmware choices.</p>
        {config.payload.migration_notes?.length ? <div className="notice" role="status">
          <strong>Saved configuration updated</strong>
          <ul>{config.payload.migration_notes.map((note) => <li key={note}>{note}</li>)}</ul>
          <p>Review the selection and overhead below before using these estimates.</p>
          <button className="secondary" onClick={() => patch((c) => { c.payload.migration_notes = []; })}>Dismiss import notes</button>
        </div> : null}
        {DEFAULT_FIELDS.filter((key) => key !== "timestamp_u32").some((key) => !config.payload.included_fields.includes(key))
          ? <p className="notice">Some recommended motion or temperature statistics are omitted from this custom report.</p> : null}
        <label className="field">Protocol/header overhead (bytes per report)
          <input aria-label="Protocol/header overhead" type="number" min={0} step={1} value={config.payload.header_bytes}
            onChange={(e) => patch((c) => { c.payload.header_bytes = Number(e.target.value); })} />
          <span className="help">Budget framing, version, CRC or configuration metadata here if required by the protocol.</span>
        </label>
        <button className="secondary" onClick={() => patch((c) => {
          c.payload.included_fields = [...DEFAULT_FIELDS];
          c.payload.migration_notes = [];
        })}>Restore recommended report</button>
        <div className="field">
          <strong>{payloadBytes} bytes</strong> per report, including overhead
          {max > 0 ? <div className="small">Remaining vs max: {max - payloadBytes} bytes</div> : null}
        </div>
        {renderGroup("context")}
        {renderGroup("motion")}
        {renderGroup("activity")}
        {renderGroup("temperature")}
        <details className="payload-options">
          <summary>Optional report extensions ({optionalSelected} selected)</summary>
          <p className="help">These add distinct information beyond the recommended report. Adding features may require
            increasing the per-sample processing budget; their CPU cost is not automatically calibrated.</p>
          {renderGroup("extensions")}
          {renderGroup("diagnostics")}
        </details>
      </div>
    </details>
  </section>;
}
