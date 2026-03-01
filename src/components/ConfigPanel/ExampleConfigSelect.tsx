import type { AppConfig } from "../../models/config";

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

    if (preset === "ultra") {
      c.lis.odr_hz = 12.5;
      c.lis.fifo_watermark = 32;
      c.payload.included_fields = ["timestamp_u32", "odba_mean_i16", "sample_count_u16", "activity_flags_u8"];
      c.report.interval_seconds = 300;
    }

    if (preset === "balanced") {
      c.lis.odr_hz = 25;
      c.lis.fifo_watermark = 32;
      c.payload.included_fields = [
        "timestamp_u32",
        "odba_mean_i16",
        "odba_max_i16",
        "vedba_mean_i16",
        "std_xyz_i16x3",
        "sample_count_u16",
        "activity_flags_u8"
      ];
      c.report.interval_seconds = 300;
    }

    if (preset === "detail") {
      c.lis.odr_hz = 100;
      c.lis.fifo_watermark = 16;
      c.payload.included_fields = [
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
        "reserved_u8"
      ];
      c.report.interval_seconds = 120;
    }

    onApply(c);
  };

  return (
    <div className="field">
      <label>Example configs</label>
      <select defaultValue="" onChange={(e) => apply(e.target.value)}>
        <option value="" disabled>
          Select preset...
        </option>
        <option value="ultra">Ultra low power</option>
        <option value="balanced">Balanced</option>
        <option value="detail">High detail</option>
      </select>
      <p className="help">Quickly load a baseline setup for comparison.</p>
      <ul className="impact">
        <li>Power: varies by preset</li>
        <li>Runtime: long to short from ultra to detail</li>
        <li>Storage: fewer to more bytes/day</li>
        <li>Data quality: coarse to high-detail trend capture</li>
      </ul>
    </div>
  );
}
