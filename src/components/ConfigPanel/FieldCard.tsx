import type { ReactNode } from "react";

type FieldCardProps = {
  label: string;
  help: string;
  impacts: [string, string, string, string];
  children: ReactNode;
};

export function FieldCard({ label, help, impacts, children }: FieldCardProps): JSX.Element {
  return (
    <div className="field">
      <label title={help}>{label}</label>
      {children}
      <p className="help">{help}</p>
      <ul className="impact">
        <li>Power: {impacts[0]}</li>
        <li>Runtime: {impacts[1]}</li>
        <li>Storage: {impacts[2]}</li>
        <li>Data quality: {impacts[3]}</li>
      </ul>
    </div>
  );
}
