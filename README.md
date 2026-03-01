# OpenCollar ACC Calculator

Static React + TypeScript + Vite web app for simulating an nRF52 + LIS2DW12 motion summary pipeline:
- LIS2DW12 sampling and FIFO wake behavior
- nRF52 active/sleep duty-cycle model
- Optional flash write/erase amortized current model
- Payload field builder with byte layout preview
- Runtime and storage projection outputs

## Why this exists

This tool helps estimate tradeoffs between motion fidelity and power budget before firmware implementation.

## Assumptions and defaults

- Default battery preset: `1x Saft LS14250` (`1.2 Ah`, `3.6 V`)
- Flash storage options: `128 megabit (16 MiB)` or `256 megabit (32 MiB)`
- nRF52 defaults: sleep `1.5 uA`, active `4.0 mA`, FIFO service `2 ms`, finalize `10 ms`
- LIS2DW12 current model defaults to LP1 + low-noise-off anchor table with linear interpolation:
  - 1.6 Hz: 0.38 uA
  - 12.5 Hz: 1.0 uA
  - 25 Hz: 1.5 uA
  - 50 Hz: 3.0 uA
  - 100 Hz: 5.0 uA
- FIFO depth fixed at 32 samples
- Report interval default `300 s`

## Where formulas live

- Power and runtime formulas: `src/calcs/power.ts`
- Flash/storage formulas: `src/calcs/storage.ts`
- Payload field definitions, byte sizing, and preview encoding: `src/calcs/payload.ts`

## Development

```bash
npm ci
npm run dev
```

Run tests:

```bash
npm test
```

Build production bundle:

```bash
npm run build
npm run preview
```

## GitHub Pages

The repo is configured for GitHub Pages deployment using `.github/workflows/deploy.yml`.

- Build: `npm ci && npm run build`
- Publish: `dist/` via `actions/deploy-pages`
- Vite base path: `/opencollar-acc-calculator/`

## Shareable configs

- `Copy configuration` copies full JSON config.
- `Share link` writes a URL hash (`#cfg=<base64-json>`) for reproducible state.
