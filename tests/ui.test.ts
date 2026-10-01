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

import { PayloadBuilderSection } from "../src/components/ConfigPanel/PayloadBuilderSection";
import { normalizeConfig } from "../src/models/normalizeConfig";

it("offers one choice per statistic and removes obsolete controls from the builder", () => {
  const html = renderToStaticMarkup(createElement(PayloadBuilderSection, { config: defaultConfig, payloadBytes: 28, onChange: () => {} }));
  expect(html.match(/type="checkbox"/g)).toHaveLength(20);
  expect(html.match(/\/?> VeDBA mean<\/label>/g)).toHaveLength(1);
  for (const retired of ["Legacy", "StdDev X/Y/Z", "Activity flags", "rss_raw", "rss2_dynamic", "iir_lp", "Mean/StdDev frame"]) {
    expect(html).not.toContain(retired);
  }
  for (const label of ["Motion statistics", "Activity and coverage", "Temperature", "Optional report extensions", "Peak acceleration magnitude"]) {
    expect(html).toContain(label);
  }
});

it("explains legacy migration visibly instead of silently substituting different measurements", () => {
  const config = normalizeConfig({ payload: { included_fields: ["vedba_mean_i16", "vedba_mean_u16", "temp_cC_i16"] } });
  const html = render(config);
  expect(html).toContain("Saved configuration updated");
  expect(html).toContain("Duplicate VeDBA mean selections were combined");
  expect(html).toContain("single temperature reading was removed");
});
