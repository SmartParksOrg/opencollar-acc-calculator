import { DEFAULT_FIELDS, type AppConfig } from "../../models/config";
import { FieldCard } from "./FieldCard";

type Props = {
  onApply: (config: AppConfig) => void;
  current: AppConfig;
};

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function ExampleConfigSelect({ onApply, current }: Props): JSX.Element {
  const apply = (preset: string): void => {
    const c = cloneConfig(current);

    c.feature.window_seconds = 2;
    c.lis.fifo_mode = "continuous";
    c.lis.odr_source = "preset";
    c.payload.included_fields = [...DEFAULT_FIELDS];
    c.payload.migration_notes = [];
    c.smartSampling.enabled = false;
    if (preset === "ultra") {
      c.lis.odr_hz = 12.5;
      c.lis.fifo_watermark = 24;
      c.report.interval_seconds = 900;
    }
    if (preset === "balanced") {
      c.lis.odr_hz = 25;
      c.lis.fifo_watermark = 24;
      c.report.interval_seconds = 300;
    }
    if (preset === "detail") {
      c.lis.odr_hz = 100;
      c.lis.fifo_watermark = 16;
      c.report.interval_seconds = 300;
    }

    onApply(c);
  };

  return (
    <FieldCard
      label="Example configs"
      help="Quickly load a baseline setup for comparison."
      impacts={[
        "Varies by preset",
        "Long to short from ultra to detail",
        "Report interval controls bytes/day",
        "Coarse to high-detail trend capture"
      ]}
    >
      <select defaultValue="" onChange={(e) => apply(e.target.value)}>
        <option value="" disabled>
          Select preset...
        </option>
        <option value="ultra">Ultra low power</option>
        <option value="balanced">Balanced</option>
        <option value="detail">High detail</option>
      </select>
    </FieldCard>
  );
}
