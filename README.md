# OpenCollar ACC Storage Calculator

A static, client-side tool to estimate flash/storage impact for accelerometer burst configurations where **1 burst = 1 message**. Designed for GitHub Pages deployment from `/docs`.

## Variables

Inputs:

- `fs` Sampling frequency per axis (Hz)
- `L` Burst length (s)
- `I` Burst interval (s between burst starts)
- `A` Axes enabled (1, 2, 3)
- `b` Bits per sample (12 or 16)
- `H` Message header bytes
- `F` Footer bytes
- `O` Extra overhead bytes
- `C` Compression factor (>= 1)
- `S` Smart sampling factor (0..1)
- `Flash_MiB` Flash size (MiB)
- `U` Usable flash fraction (0..1)
- `D` Budget horizon in days

## Formulas (MiB = 1024 * 1024)

Per message:

- `N_axis = fs * L`
- `N_total = fs * L * A`
- `bytes_per_sample = b/8`
- `B_payload = fs * L * A * bytes_per_sample`
- `B_overhead = H + F + O`
- `B_msg_raw = B_payload + B_overhead`
- `B_msg = B_msg_raw / C`

Per day:

- `M_day = 86400 / I`
- `M_day_eff = M_day * S`
- `B_day = B_msg * M_day_eff`
- `MiB_day = B_day / (1024*1024)`

Flash:

- `Flash_MiB_usable = Flash_MiB * U`
- `Days_full = Flash_MiB_usable / MiB_day`
- `MiB_used = MiB_day * D`
- `MiB_remaining = Flash_MiB_usable - MiB_used`

Status:

- Show “FITS” if `MiB_remaining >= 0`, else “DOES NOT FIT”.

## Run locally

Open `docs/index.html` directly in a browser, or run a static server:

```bash
python3 -m http.server --directory docs 8000
```

Then visit `http://localhost:8000`.

## GitHub Pages setup

1. Settings → Pages
2. Source: “Deploy from a branch”
3. Branch: `main`
4. Folder: `/docs`
5. Save

## Notes

- Everything runs client-side with no dependencies.
- Scenarios are stored in `localStorage`.
