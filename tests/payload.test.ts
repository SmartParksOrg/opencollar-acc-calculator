import { describe, expect, it } from "vitest";
import { calculatePayloadBytes } from "../src/calcs/payload";

describe("payload calculations", () => {
  it("computes payload byte size for default 30-byte layout", () => {
    const bytes = calculatePayloadBytes([
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
    ]);

    expect(bytes).toBe(30);
  });
});
