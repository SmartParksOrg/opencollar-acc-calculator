# OpenCollar ACC Storage Calculator

A static, client-side tool to estimate flash/storage impact for accelerometer burst configurations where **1 burst = 1 message**. Designed for GitHub Pages deployment from `/docs`.

## Variables

Inputs:

- `fs` Sampling frequency per axis (Hz)
- `L` Burst length (s)
- `I` Burst interval (s between burst starts)
- `A` Axes enabled (1, 2, 3)
- `b` Bits per sample (12 or 16)
- `C` Compression factor (>= 1)
- `S` Smart sampling factor (0..1)
- `Flash_MiB` Flash size (MB, calculated as MiB)
- `U` Usable flash percentage (0..100)
- `D` Budget horizon in days

Protocol (fixed, stored in flash):

- Payload = `Port(1B) + Msg ID(1B) + Length(2B) + Data`
- `Port = 25`, `Msg ID = 1` (ACC burst)
- `Length` is data length only (2 bytes)
- `Data = Timestamp(4B, uint32 seconds since Unix epoch) + Metadata + Samples`
- Metadata = `fs(2B) + samples_per_axis(2B) + axes_mask(1B) + bits(1B) + part_index(1B) + part_count(1B)`
- Bursts are stored as a single payload in flash (no splitting at storage time).

## Formulas (MB shown as MiB = 1024 * 1024)

Per message:

- `N_axis = fs * L`
- `N_total = fs * L * A`
- `bits_per_sample = b`
- `B_samples = ceil((fs * L * A * bits_per_sample) / 8)`
- `B_data_header = 16`
- `B_data = B_data_header + B_samples`
- `B_payload_total = 3 + B_data` (single burst, unsplit)
- `B_msg = B_payload_total / C`

Per day:

- `M_day = 86400 / I` (bursts/day planned)
- `bursts_day_eff = M_day * S`
- `B_day = B_msg * bursts_day_eff`

Transfer planning:

- LoRaWAN payload limit (SF7BW250): 222 bytes
- Estimated packets to transfer a stored burst: `ceil(B_payload_total / max_payload_bytes)`
- `MiB_day = B_day / (1024*1024)` (displayed as MB/day)

Flash:

- `Flash_MiB_usable = Flash_MiB * (U/100)`
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
