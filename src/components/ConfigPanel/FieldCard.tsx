import { useState, type ReactNode } from "react";

type FieldCardProps = {
  label: string;
  help: string;
  impacts: [string, string, string, string];
  children: ReactNode;
};

export function FieldCard({ label, help, impacts, children }: FieldCardProps): JSX.Element {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="field">
      <div className="field-header">
        <span className="field-title">{label}</span>
        <button
          type="button"
          className="info-toggle"
          aria-label={`Show info for ${label}`}
          aria-expanded={showInfo}
          onClick={() => setShowInfo((value) => !value)}
        >
          i
        </button>
      </div>
      {children}
      {showInfo ? (
        <div className="field-meta">
          <p className="help">{help}</p>
          <ul className="impact">
            <li>Power: {impacts[0]}</li>
            <li>Runtime: {impacts[1]}</li>
            <li>Storage: {impacts[2]}</li>
            <li>Data quality: {impacts[3]}</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
