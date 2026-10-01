# OpenCollar Motion Statistics Calculator

Static React + TypeScript + Vite calculator for the continuous motion pipeline in
[firmware issue #671](https://github.com/SmartParksOrg/smartparks-opencollar-edge-fw/issues/671).
It estimates rates, payload size, RAM, flash usage and power; it does not process sensor recordings or infer behaviour.

## Architecture

```text
LIS2DW12 continuous sampling (default 25 Hz)
  → FIFO servicing (24-sample watermark, every 0.96 s)
  → non-overlapping feature windows (2 s, 50 samples across FIFO reads)
  → report aggregation (5 / 10 / 15 minutes)
  → optional completed-report retention → flash / radio
```

FIFO reads, feature windows and report intervals are independent. Feature finalization contributes CPU time while
servicing samples, without adding a wakeup. Sorting, report packing, flash and communication are deferred outside
the FIFO handler. The model assumes no sample loss; it cannot verify firmware concurrency or replace hardware stress tests.

| Report interval | Feature windows/report | Reports/day | Percentile value buffer |
| --- | ---: | ---: | ---: |
| 5 min | 150 | 288 | 300 bytes |
| 10 min | 300 | 144 | 600 bytes |
| 15 min | 450 | 96 | 900 bytes |

All three use 43,200 feature windows/day and 90,000 FIFO services/day at the default ODR and watermark.
The percentile buffer holds one uint16 motion value per feature window when any percentile field is selected.
This is **not total RAM**: accumulators, FIFO read buffers, sorting scratch space, retained episode context and any
second report buffer needed to continue acquisition during deferred sorting are additional.

ODR × feature duration and report interval ÷ feature duration must be whole numbers. Unsupported combinations
produce validation messages instead of plausible-looking projections. For example, 1.6 Hz needs a duration such
as 2.5 s for whole sample counts. FIFO stop/bypass modes are preserved in configuration but do not yield continuous-model estimates.

## Features and payload

Each short window models `std(|a|)` with `|a| = sqrt(x² + y² + z²)`, mean VeDBA, and active/inactive classification
using a configurable explicit threshold in mg. ODBA and peak magnitude remain optional legacy fields.
The report aggregates **the distribution of short-window std(|a|)**, not all samples into one long standard deviation.
Threshold provenance must accompany server configuration; the calculator's report threshold is independent of
Smart Sampling retention thresholds. No FFT, learned classification, or behaviour labels are introduced.

The default candidate layout follows issue #671. Offsets exclude configurable protocol/header overhead:

| Offset | Field | Type / assumed unit |
| ---: | --- | --- |
| 0 | timestamp | uint32, epoch seconds |
| 4 | motion_mean | uint16, mg |
| 6 | motion_sd | uint16, mg |
| 8 | motion_p25 | uint16, mg |
| 10 | motion_p50 | uint16, mg |
| 12 | motion_p75 | uint16, mg |
| 14 | motion_max | uint16, mg |
| 16 | vedba_mean | uint16, mg |
| 18 | active_fraction | uint8, 0–255 = 0–100% |
| 19 | transition_count | uint8, within-report active/inactive transitions |
| 20 | valid_window_count | uint16, completed valid feature windows |
| 22 | temperature_mean | int16, 0.01 °C (assumed) |
| 24 | temperature_min | int16, 0.01 °C (assumed) |
| 26 | temperature_max | int16, 0.01 °C (assumed) |

Motion alone is **22 bytes** including timestamp. Three candidate temperature fields add 6 bytes, giving **28 bytes**
and **8,064 generated payload bytes/day** at 5 minutes. Configurable overhead applies to each stored/transmitted report.
Remove the timestamp if an authoritative framework timestamp already exists. Extra record framing, flash allocation
rounding and transport overhead must be included in the byte budget as appropriate; none is silently assumed.
The preview shows illustrative little-endian field bytes and their encoded integer values, excluding unknown headers.
It is not a finalized firmware encoder. Legacy 30-byte layouts and optional fields remain available for comparison.

## Smart Sampling

The existing manual/auto settings, baseline trickle, debounce approximation, peak override and pre/post episodes are
preserved as **optional completed-report retention scenarios**. They never suppress acquisition, feature processing,
report generation, or the windows contributing to a report. Filtering applies to both flash and enabled radio output.
Default retention is off (keep all reports), preserving continuous coverage.

Assumed activity/peak fractions refer to reports, not 2 s feature windows. Threshold values, metric selection and
calibration settings describe a hypothetical retention policy; the calculator does not learn thresholds from data.
The numerical estimate uses activity/peak percentages, baseline ratio, debounce factor and episode assumptions.
Turning peak override off now removes the peak contribution. Counts are expected daily averages and can be fractional.
Existing JSON keys ending in `_windows` remain for shared-link compatibility, but in retention settings they mean reports;
this preserves their old effective duration (the old calculator used the report interval as its window).

## Power and storage assumptions

- Default battery: 1× Saft LS14250, 1,200 mAh, 3.6 V, 85% usable; multiple identical cells are assumed parallel.
- Flash options: 16 or 32 MiB. Disabling flash logging yields zero writes, zero storage consumption and no fill time.
- LIS2DW12 LP1 / low-noise-off anchor currents: 0.38 / 1 / 1.5 / 3 / 5 µA at 1.6 / 12.5 / 25 / 50 / 100 Hz,
  with interpolation and endpoint clamping. Other modes require measured overrides for accuracy.
- nRF52 baseline sleep: 1.5 µA; active: 4 mA; FIFO overhead: 2 ms/service; report packaging: 10 ms/report.
- New **unmeasured, editable estimates**: 10 µs/sample, 0.1 ms/feature finalization, 10 µs/buffered value for percentiles.
  Per-value sorting cost is an empirical approximation, not an algorithmic complexity guarantee; recalibrate at each report size.
- MCU current is baseline sleep plus `(active − sleep) × duty` for each processing stage. FIFO, sample, feature,
  report and percentile duties are independent. Infeasible ≥100% duty is flagged.
- Flash charge is a fixed per-record write plus amortized erase; adjust measured times and erase interval for the
  selected payload and flash layout. It does not automatically scale charge with byte count.
- Radio defaults off. Supply measured **additional** mA·s per retained report/session (TX/RX, retries, MCU overhead
  and transport framing as appropriate). Current is charge × transmitted reports/second. This is not a LoRa airtime model.
- Temperature acquisition/aggregation cost is not separately calibrated; include it in measured processing budgets.
- RAM assumes streaming accumulation (default IIR gravity removal). Alternative algorithms such as window-mean
  gravity removal may require raw buffering or multiple passes; their extra RAM/work is not automatically estimated.
- GNSS, BLE, unrelated background loads and battery self-discharge are outside this motion budget. Runtime is a projection.

## Firmware comparison and unresolved conventions

Checked issue #671 and current default-branch firmware on 2026-10-01:

- The old calculator used a 30-byte ODBA/axis-statistics payload and treated each report interval as a statistics window.
  It had no separate feature count, percentile buffer, per-sample cost or radio budget. Those are now explicit.
- Issue #671 deliberately leaves temperature scaling, header/version metadata, timestamp ownership and final encoding open.
  The calculator retains mg / little-endian examples and proposes int16 centi-degrees for temperature, clearly marked as assumptions.
- The firmware [temperature sensor code](https://github.com/SmartParksOrg/smartparks-opencollar-edge-fw/blob/HEAD/app/src/sensors/temperature_sensor/temperature_sensor.c)
  stores the MCU temperature as separate `int16` integer and fractional components (`val1`, `val2 / 100`).
  This is **not** the calculator's assumed one-int16 centi-degree statistic and does not settle the new wire encoding.
- The [generated message definitions](https://github.com/SmartParksOrg/smartparks-opencollar-edge-fw/blob/HEAD/app/src/settings/generated_settings/messages_def.c)
  contain a dedicated uint32 timestamp message but no Motion Statistics message. That alone does not establish whether
  the eventual report inherits an authoritative timestamp or header. No production message ID or version is invented here.
- The candidate uint8 transition count cannot hold all possible transitions in 10/15-minute reports (299/449).
  The UI flags this; firmware must choose saturation or a wider field before finalizing the decoder.
- Smart Sampling auto-calibration/episodes are existing calculator scenarios, not functionality promised by issue #671.
  Firmware support, retention policy and measured CPU/radio costs still need confirmation.

## Development

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Calculations: `src/calcs/motion.ts`, `power.ts`, `storage.ts`, `smartSampling.ts`, and `payload.ts`.
Tests cover timing independence, the 5/10/15-minute cases, payload offsets/counts, temperature encoding, retention,
flash/radio accounting, legacy configuration defaults, and rendered UI output.

GitHub Pages deployment uses `.github/workflows/deploy.yml`, publishes `dist/`, and retains the Vite base path
`/opencollar-acc-calculator/`. Copy configuration exports JSON; Share link uses `#cfg=<base64-json>`.
Older links receive defaults for new fields while preserving their existing settings and optional legacy payload fields.
