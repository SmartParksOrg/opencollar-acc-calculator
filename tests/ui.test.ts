import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "../src/pages/HomePage";
import { defaultConfig, type AppConfig } from "../src/models/config";

function render(config: AppConfig): string {
  return renderToStaticMarkup(createElement(HomePage, {
    config, setConfig: () => {}, onCopyConfig: () => {}, onShareLink: () => {}
  }));
}

describe("Motion Statistics UI", () => {
  it("renders the three stages, rates, power components and report payload", () => {
    const html = render(defaultConfig);
    for (const label of ["Sampling / FIFO", "Short feature windows", "Report aggregation",
      "0.960", "43200", "90000", "Percentile value buffer", "Per-sample feature processing",
      "Radio communication", "Temperature mean", "Temperature min", "Temperature max",
      "completed-report retention", "28 bytes", "8064.0"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain('role="alert"');
  });
  it("flags the 15-minute transition count limitation and displays 900 bytes of RAM", () => {
    const config = structuredClone(defaultConfig);
    config.report.interval_seconds = 900;
    const html = render(config);
    expect(html).toContain("more than 255 transitions");
    expect(html).toContain("900 bytes");
    expect(html).toContain("450 feature windows per report");
  });
  it("withholds projections for unsupported acquisition settings", () => {
    const config = structuredClone(defaultConfig);
    config.lis.fifo_mode = "bypass";
    const html = render(config);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Correct the configuration");
    expect(html).not.toContain("Total average current");
  });
});
