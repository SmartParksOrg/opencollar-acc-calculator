const MI_B = 1024 * 1024;
const STORAGE_KEY = "oc_scenarios_v1";
const PREVIEW_MAX_BYTES = 512;
let previewEncoding = "base64";
const MAX_LORAWAN_PAYLOAD_BYTES = 222;
const DEFAULT_BLE_PAYLOAD_BYTES = 200;
const PORT_ACC_BURST = 25;
const MSG_ID_ACC_BURST = 1;
const DATA_HEADER_BYTES = 12; // timestamp(4) + fs(2) + samples_per_axis(2) + axes_mask(1) + bits(1) + part_index(1) + part_count(1)
const LENGTH_BYTES = 2;
const transferState = {
  ble: DEFAULT_BLE_PAYLOAD_BYTES,
  lorawan: MAX_LORAWAN_PAYLOAD_BYTES,
  lorawanPps: 1,
  bleKbps: 160
};

const els = {
  fs: document.getElementById("fs"),
  fsRange: document.getElementById("fsRange"),
  L: document.getElementById("L"),
  LRange: document.getElementById("LRange"),
  I: document.getElementById("I"),
  IRange: document.getElementById("IRange"),
  axesButtons: Array.from(document.querySelectorAll(".segmented button")),
  b: document.getElementById("b"),
  C: document.getElementById("C"),
  S: document.getElementById("S"),
  SRange: document.getElementById("SRange"),
  U: document.getElementById("U"),
  URange: document.getElementById("URange"),
  D: document.getElementById("D"),
  flashRadios: Array.from(document.querySelectorAll("input[name=flash]")),
  flashCustom: document.getElementById("flashCustom"),
  warnings: document.getElementById("warnings"),
  perMessage: document.getElementById("perMessage"),
  perDay: document.getElementById("perDay"),
  flashBudget: document.getElementById("flashBudget"),
  timeTable: document.getElementById("timeTable"),
  fitBadge: document.getElementById("fitBadge"),
  daysToFill: document.getElementById("daysToFill"),
  mibPerDay: document.getElementById("mibPerDay"),
  messageSize: document.getElementById("messageSize"),
  messagePreview: document.getElementById("messagePreview"),
  toggleEncoding: document.getElementById("toggleEncoding"),
  utilBar: document.getElementById("utilBar"),
  utilLabel: document.getElementById("utilLabel"),
  utilDetail: document.getElementById("utilDetail"),
  dailyBar: document.getElementById("dailyBar"),
  dailyLabel: document.getElementById("dailyLabel"),
  dailyDetail: document.getElementById("dailyDetail"),
  scenarioTable: document.getElementById("scenarioTable"),
  saveScenario: document.getElementById("saveScenario"),
  exportScenarios: document.getElementById("exportScenarios"),
  importScenarios: document.getElementById("importScenarios"),
  sweepVar: document.getElementById("sweepVar"),
  sweepMin: document.getElementById("sweepMin"),
  sweepMax: document.getElementById("sweepMax"),
  sweepStep: document.getElementById("sweepStep"),
  sweepMetric: document.getElementById("sweepMetric"),
  sweepChart: document.getElementById("sweepChart"),
  transferRadios: Array.from(document.querySelectorAll("input[name=transfer]")),
  transferDetails: document.getElementById("transferDetails"),
  compressionEnabled: document.getElementById("compressionEnabled"),
  compressionOptions: document.getElementById("compressionOptions"),
  compressionMethod: document.getElementById("compressionMethod"),
  compressionTooltip: document.getElementById("compressionTooltip"),
  compressionNote: document.getElementById("compressionNote"),
  compressionFactorValue: document.getElementById("compressionFactorValue"),
  sampleExample: document.getElementById("sampleExample")
};

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getAxes() {
  const active = els.axesButtons.find((b) => b.classList.contains("active"));
  return active ? Number(active.dataset.axes) : 3;
}

function getFlashMiB() {
  const selected = els.flashRadios.find((r) => r.checked);
  if (!selected) return 16;
  if (selected.value === "custom") {
    return num(els.flashCustom.value, 0);
  }
  return num(selected.value, 16);
}

function getConfig() {
  const enabled = !!els.compressionEnabled?.checked;
  let compressionRatio = 1;
  if (enabled) {
    compressionRatio = num(els.C.value, 1);
  }
  return {
    fs: num(els.fs.value, 0),
    L: num(els.L.value, 0),
    I: num(els.I.value, 0),
    A: getAxes(),
    b: num(els.b.value, 16),
    C: compressionRatio,
    S: num(els.S.value, 1),
    U: num(els.U.value, 100) / 100,
    D: num(els.D.value, 30),
    Flash_MiB: getFlashMiB()
  };
}

function compute(cfg) {
  const N_axis = cfg.fs * cfg.L;
  const N_total = cfg.fs * cfg.L * cfg.A;
  const bits_per_sample = cfg.b;
  const bytes_per_sample = bits_per_sample / 8;
  const B_samples = Math.ceil((N_total * bits_per_sample) / 8);
  const B_data_header = DATA_HEADER_BYTES;
  const B_data = B_data_header + B_samples;
  const B_payload_total = 2 + LENGTH_BYTES + B_data; // port + msg_id + length + data
  const B_msg_raw = B_payload_total;
  const B_msg = cfg.C > 0 ? B_msg_raw / cfg.C : 0;
  const M_day = cfg.I > 0 ? 86400 / cfg.I : 0;
  const bursts_day_eff = M_day * cfg.S;
  const M_day_eff = bursts_day_eff;
  const B_day = B_msg * bursts_day_eff;
  const MiB_day = B_day / MI_B;
  const M_hour_eff = M_day_eff / 24;
  const M_min_eff = M_hour_eff / 60;
  const M_week_eff = M_day_eff * 7;
  const M_month_eff = M_day_eff * 30;
  const M_year_eff = M_day_eff * 365;
  const MiB_hour = MiB_day / 24;
  const MiB_min = MiB_hour / 60;
  const MiB_week = MiB_day * 7;
  const MiB_month = MiB_day * 30;
  const MiB_year = MiB_day * 365;
  const Flash_MiB_usable = cfg.Flash_MiB * cfg.U;
  const Days_full = MiB_day > 0 ? Flash_MiB_usable / MiB_day : Infinity;
  const MiB_used = MiB_day * cfg.D;
  const MiB_remaining = Flash_MiB_usable - MiB_used;

  return {
    N_axis,
    N_total,
    bytes_per_sample,
    bits_per_sample,
    B_samples,
    B_data_header,
    B_data,
    B_payload_total,
    B_msg_raw,
    B_msg,
    M_day,
    M_day_eff,
    bursts_day_eff,
    B_day,
    MiB_day,
    M_min_eff,
    M_hour_eff,
    M_week_eff,
    M_month_eff,
    M_year_eff,
    MiB_min,
    MiB_hour,
    MiB_week,
    MiB_month,
    MiB_year,
    Flash_MiB_usable,
    Days_full,
    MiB_used,
    MiB_remaining
  };
}

function validate(cfg, results) {
  const warnings = [];
  const errors = [];

  if (cfg.fs <= 0) errors.push("Sampling frequency must be > 0.");
  if (cfg.L <= 0) errors.push("Burst length must be > 0.");
  if (cfg.I <= 0) errors.push("Burst interval must be > 0.");
  if (![1, 2, 3].includes(cfg.A)) errors.push("Axes must be 1, 2, or 3.");
  if (![12, 16].includes(cfg.b)) errors.push("Bits per sample must be 12 or 16.");
  if (cfg.C < 1) errors.push("Compression factor must be >= 1.");
  if (cfg.S < 0 || cfg.S > 1) errors.push("Smart sampling factor must be between 0 and 1.");
  if (cfg.U < 0 || cfg.U > 1) errors.push("Usable flash percentage must be between 0 and 100.");
  if (cfg.U === 0) warnings.push("Usable flash fraction is 0. No storage available.");
  if (cfg.D <= 0) errors.push("Budget horizon must be > 0.");
  if (cfg.Flash_MiB <= 0) errors.push("Flash size must be > 0 MB.");

  if (cfg.I < cfg.L) {
    warnings.push("Bursts overlap (interval < burst length)." );
  }

  if (results.B_data > 65535) {
    warnings.push("Data length exceeds 65535 bytes. Length field is 2 bytes; consider protocol extension.");
  }

  if (results.MiB_day > 0 && results.Flash_MiB_usable > 0) {
    if (results.MiB_day >= results.Flash_MiB_usable) {
      warnings.push("Flash fills in less than one day.");
    }
  }

  return { warnings, errors };
}

function fmt(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const options = { maximumFractionDigits: digits, minimumFractionDigits: 0 };
  return value.toLocaleString(undefined, options);
}

function renderOutputs(results, cfg) {
  const perMessage = [
    ["Samples per axis (fs × L)", results.N_axis],
    ["Total samples (axes × samples/axis)", results.N_total],
    ["Bits per sample", results.bits_per_sample],
    ["Sample bytes (packed, all axes)", results.B_samples],
    ["Metadata + timestamp bytes", results.B_data_header],
    ["Payload bytes (single burst)", results.B_payload_total],
    ["Stored bytes per burst (after compression)", results.B_msg]
  ];
  const perDay = [
    ["Bursts per day (planned)", results.M_day],
    [`Bursts per day (effective, × smart sampling ${fmt(cfg.S, 2)})`, results.bursts_day_eff],
    ["Bytes per day", results.B_day],
    ["MB per day", results.MiB_day]
  ];
  const flashBudget = [
    ["Usable flash (MB)", results.Flash_MiB_usable],
    ["Days to full", results.Days_full],
    ["MB used in horizon", results.MiB_used],
    ["MB remaining", results.MiB_remaining]
  ];

  renderGrid(els.perMessage, perMessage);
  renderGrid(els.perDay, perDay);
  renderGrid(els.flashBudget, flashBudget);
  renderTimeTable(results);
  renderTransfer(results);

  const fits = results.MiB_remaining >= 0;
  els.fitBadge.textContent = fits ? "FITS" : "DOES NOT FIT";
  els.fitBadge.classList.toggle("bad", !fits);
  els.daysToFill.textContent = Number.isFinite(results.Days_full) ? fmt(results.Days_full, 1) : "∞";
  els.mibPerDay.textContent = fmt(results.MiB_day, 3);
  renderMessagePreview(results, cfg);

  const usable = results.Flash_MiB_usable;
  const used = results.MiB_used;
  const utilization = usable > 0 ? Math.min(used / usable, 1.5) : 0;
  const utilizationPct = usable > 0 ? Math.min(used / usable, 1) * 100 : 0;
  els.utilBar.style.width = `${Math.min(utilization, 1) * 100}%`;
  els.utilBar.classList.toggle("bad", used > usable);
  els.utilLabel.textContent = usable > 0 ? `${fmt(utilizationPct, 1)}%` : "—";
  els.utilDetail.textContent = `${fmt(used, 2)} MB used of ${fmt(usable, 2)} MB (${fmt(cfg.D, 0)} days horizon)`;

  const dailyPct = usable > 0 ? Math.min(results.MiB_day / usable, 1) * 100 : 0;
  els.dailyBar.style.width = `${dailyPct}%`;
  els.dailyLabel.textContent = `${fmt(results.MiB_day, 3)} MB/day`;
  els.dailyDetail.textContent = usable > 0
    ? `At this rate, storage fills in ${Number.isFinite(results.Days_full) ? fmt(results.Days_full, 1) : "∞"} days.`
    : "Flash size needed to compute rate.";
}

function renderMessagePreview(results, cfg) {
  const availableForSamples = Math.max(0, PREVIEW_MAX_BYTES - (2 + LENGTH_BYTES) - DATA_HEADER_BYTES);
  const sampleChunk = Math.min(results.B_samples, availableForSamples);
  const metaLen = DATA_HEADER_BYTES - 4;
  const totalLen = results.B_payload_total;
  const previewLen = Math.min(PREVIEW_MAX_BYTES, (2 + LENGTH_BYTES) + DATA_HEADER_BYTES + sampleChunk);
  const truncated = totalLen > previewLen;

  const bytes = new Uint8Array(previewLen);
  const segmentForByte = new Array(previewLen);
  const segments = [
    { name: "port", len: 1 },
    { name: "msgid", len: 1 },
    { name: "length", len: LENGTH_BYTES },
    { name: "timestamp", len: 4 },
    { name: "meta", len: metaLen },
    { name: "samples", len: sampleChunk }
  ];

  let offset = 0;
  segments.forEach((seg) => {
    const end = Math.min(offset + seg.len, previewLen);
    for (let i = offset; i < end; i++) {
      bytes[i] = (i * 31 + 17) % 256;
      segmentForByte[i] = seg.name;
    }
    offset = end;
  });

  if (previewLen >= 1) bytes[0] = PORT_ACC_BURST;
  if (previewLen >= 2) bytes[1] = MSG_ID_ACC_BURST;
  if (previewLen >= 3) {
    const dataLen = DATA_HEADER_BYTES + Math.min(results.B_samples, 0xffff - DATA_HEADER_BYTES);
    bytes[2] = dataLen & 0xff;
    if (LENGTH_BYTES > 1 && previewLen >= 4) bytes[3] = (dataLen >> 8) & 0xff;
  }

  const label = `Message size (single burst): ${fmt(totalLen, 0)} bytes.`;
  els.messageSize.textContent = truncated
    ? `${label} Showing first ${PREVIEW_MAX_BYTES} bytes.`
    : label;

  if (previewEncoding === "hex") {
    els.messagePreview.innerHTML = toHexSpans(bytes, segmentForByte) || "—";
  } else {
    els.messagePreview.innerHTML = toBase64Spans(bytes, segmentForByte) || "—";
  }
  els.toggleEncoding.textContent = previewEncoding === "hex" ? "Show base64" : "Show hex";
}

function toBase64(u8) {
  if (!u8.length) return "";
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    const sub = u8.subarray(i, i + chunk);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function toHex(u8) {
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}

function renderTransfer(results) {
  const mode = els.transferRadios.find((r) => r.checked)?.value || "ble";
  const maxPayload = transferState[mode];
  const packets = maxPayload > 0 ? Math.ceil(results.B_payload_total / maxPayload) : "—";
  const exceeds = results.B_payload_total > maxPayload && maxPayload > 0;

  if (mode === "lorawan") {
    const pps = transferState.lorawanPps;
    const seconds = Number.isFinite(packets) && pps > 0 ? packets / pps : "—";
    els.transferDetails.innerHTML = `
      <div><strong>LoRaWAN</strong> (SF7BW250 max payload ${MAX_LORAWAN_PAYLOAD_BYTES} bytes)</div>
      <div class="helper">
        Payload format: Port(1B) + Msg ID(1B) + Length(2B) + Data.<br />
        Data = Timestamp(4B, uint32) + fs(2B) + samples_per_axis(2B) + axes_mask(1B) + bits(1B) + part_index(1B) + part_count(1B) + samples.
      </div>
      <div class="field">
        <label for="lorawanMax">Max payload bytes</label>
        <input id="lorawanMax" type="number" min="1" step="1" value="${maxPayload}" />
      </div>
      <div class="field">
        <label for="lorawanPps">Packets per second</label>
        <input id="lorawanPps" type="number" min="0.01" step="0.01" value="${pps}" />
      </div>
      <div class="helper">
        Stored burst size (raw): ${fmt(results.B_payload_total, 0)} bytes.
        Estimated packets: ${packets}.
        Estimated transfer time: ${Number.isFinite(seconds) ? fmt(seconds, 1) : "—"} seconds.
        ${exceeds ? "This burst will be split for transfer." : "Fits in a single packet."}
      </div>
    `;
  } else {
    const bleKbps = transferState.bleKbps;
    const seconds = bleKbps > 0 ? (results.B_payload_total * 8) / (bleKbps * 1000) : "—";
    els.transferDetails.innerHTML = `
      <div><strong>BLE</strong> (MTU-limited payload)</div>
      <div class="field">
        <label for="bleMax">Max payload bytes</label>
        <input id="bleMax" type="number" min="1" step="1" value="${maxPayload}" />
      </div>
      <div class="field">
        <label for="bleKbps">Connection speed (kbps)</label>
        <input id="bleKbps" type="number" min="1" step="1" value="${bleKbps}" />
      </div>
      <div class="helper">
        Stored burst size (raw): ${fmt(results.B_payload_total, 0)} bytes.
        Estimated packets: ${packets}.
        Estimated transfer time: ${Number.isFinite(seconds) ? fmt(seconds, 2) : "—"} seconds.
        ${exceeds ? "This burst will be split for transfer." : "Fits in a single packet."}
      </div>
    `;
  }

  const input = mode === "lorawan"
    ? document.getElementById("lorawanMax")
    : document.getElementById("bleMax");
  if (input) {
    input.addEventListener("input", () => {
      const value = num(input.value, maxPayload);
      transferState[mode] = value;
      render();
    });
  }

  if (mode === "lorawan") {
    const ppsInput = document.getElementById("lorawanPps");
    if (ppsInput) {
      ppsInput.addEventListener("input", () => {
        const value = num(ppsInput.value, transferState.lorawanPps);
        transferState.lorawanPps = value;
        render();
      });
    }
  }

  if (mode === "ble") {
    const kbpsInput = document.getElementById("bleKbps");
    if (kbpsInput) {
      kbpsInput.addEventListener("input", () => {
        const value = num(kbpsInput.value, transferState.bleKbps);
        transferState.bleKbps = value;
        render();
      });
    }
  }
}

function toHexSpans(u8, segmentForByte) {
  const parts = [];
  for (let i = 0; i < u8.length; i++) {
    const hex = u8[i].toString(16).padStart(2, "0");
    const seg = segmentForByte[i] || "samples";
    parts.push(`<span class=\"seg-${seg}-text\">${hex}</span>`);
  }
  return parts.join("");
}

function toBase64Spans(u8, segmentForByte) {
  if (!u8.length) return "";
  const base64 = toBase64(u8);
  const blocks = Math.ceil(u8.length / 3);
  const parts = [];
  for (let i = 0; i < blocks; i++) {
    const byteIndex = i * 3;
    const seg = segmentForByte[Math.min(byteIndex, segmentForByte.length - 1)] || "samples";
    const chunk = base64.slice(i * 4, i * 4 + 4);
    parts.push(`<span class=\"seg-${seg}-text\">${chunk}</span>`);
  }
  return parts.join("");
}

function renderTimeTable(results) {
  const usable = results.Flash_MiB_usable;
  const rows = [
    ["Minute", results.M_min_eff, results.MiB_min],
    ["Hour", results.M_hour_eff, results.MiB_hour],
    ["Day", results.M_day_eff, results.MiB_day],
    ["Week", results.M_week_eff, results.MiB_week],
    ["Month (30d)", results.M_month_eff, results.MiB_month],
    ["Year (365d)", results.M_year_eff, results.MiB_year]
  ];

  els.timeTable.innerHTML = "";
  rows.forEach(([label, messages, mib]) => {
    const tr = document.createElement("tr");
    const utilizationPct = usable > 0 ? (mib / usable) * 100 : 0;
    const utilizationText = usable > 0
      ? `${fmt(utilizationPct, 2)}% of usable flash`
      : "No usable flash set";
    tr.innerHTML = `
      <td>${label}</td>
      <td>${fmt(messages, 2)}</td>
      <td>${fmt(mib, 4)}</td>
      <td>${utilizationText}</td>
    `;
    els.timeTable.appendChild(tr);
  });
}

function renderGrid(container, entries) {
  container.innerHTML = "";
  entries.forEach(([label, value]) => {
    const name = document.createElement("div");
    name.textContent = label;
    const val = document.createElement("div");
    val.className = "value";
    val.textContent = Number.isFinite(value) ? fmt(value, 3) : "—";
    container.appendChild(name);
    container.appendChild(val);
  });
}

function renderWarnings(info) {
  const messages = [...info.errors.map((e) => `Error: ${e}`), ...info.warnings];
  els.warnings.innerHTML = "";
  if (!messages.length) return;
  messages.forEach((msg) => {
    const div = document.createElement("div");
    div.textContent = msg;
    els.warnings.appendChild(div);
  });
}

function render() {
  const cfg = getConfig();
  const results = compute(cfg);
  const checks = validate(cfg, results);
  renderCompressionNote();
  renderSampleExample(cfg);
  renderOutputs(results, cfg);
  renderWarnings(checks);
  renderScenarios();
  drawChart(cfg, results);
}

function renderSampleExample(cfg) {
  if (!els.sampleExample) return;
  const axes = cfg.A;
  const bits = cfg.b;
  const axisLabels = axes === 1 ? ["X"] : axes === 2 ? ["X", "Y"] : ["X", "Y", "Z"];
  const exampleValues = axisLabels.map((axis, idx) => `${axis}:${idx * 123 + 45}`);
  const bytesPerAxis = bits / 8;
  els.sampleExample.textContent = `Example sample (${bits}-bit, ${axes} axes): ${exampleValues.join(", ")} — ${bytesPerAxis} bytes/axis (${bytesPerAxis * axes} bytes per sample).`;
}

function renderCompressionNote() {
  if (els.compressionOptions && els.compressionEnabled) {
    els.compressionOptions.classList.toggle("disabled", !els.compressionEnabled.checked);
  }
  if (els.C && els.compressionEnabled) {
    els.C.disabled = !els.compressionEnabled.checked;
  }
  if (els.compressionMethod && els.compressionEnabled) {
    els.compressionMethod.disabled = !els.compressionEnabled.checked;
  }

  if (!els.compressionEnabled?.checked) {
    els.compressionNote.textContent = "Compression is disabled. Stored bytes = raw bytes.";
    if (els.compressionTooltip) {
      els.compressionTooltip.setAttribute("data-tooltip", "Compression disabled.");
    }
    if (els.compressionFactorValue) {
      els.compressionFactorValue.textContent = "1.0×";
    }
    return;
  }

  const method = els.compressionMethod?.value || "none";
  const methodRatios = {
    delta_bitpack: 1.5,
    sprintz: 2.0,
    rle: 1.3,
    huffman: 1.4,
    downsample: 2.5,
    quantization: 2.0
  };
  const ratio = methodRatios[method] || 1;
  if (els.C) {
    els.C.value = ratio;
  }
  if (els.compressionFactorValue) {
    els.compressionFactorValue.textContent = `${fmt(ratio, 2)}×`;
  }
  const methodNotes = {
    delta_bitpack: "Delta encoding reduces sample-to-sample variation, and bit packing stores only the needed bits.",
    sprintz: "Sprintz combines delta encoding, bit packing, run-length, and entropy coding for time-series data.",
    rle: "Run-length encoding is effective when many consecutive samples repeat or remain near-zero.",
    huffman: "Entropy coding reduces size based on symbol frequency; works best after delta/bit-pack.",
    downsample: "Downsampling reduces temporal resolution; can miss short, fast events.",
    quantization: "Quantization reduces amplitude precision; can distort subtle movements."
  };

  els.compressionNote.textContent = "Compression method selected. Factor is an estimate and varies with real data.";

  const methodNote = methodNotes[method] || "";
  if (methodNote) {
    els.compressionNote.textContent = `${els.compressionNote.textContent} ${methodNote}`;
  }
  if (els.compressionTooltip) {
    els.compressionTooltip.setAttribute("data-tooltip", methodNote || "Select a method to see a brief description.");
  }
}

function syncRange(numberEl, rangeEl) {
  numberEl.addEventListener("input", () => {
    rangeEl.value = numberEl.value;
    render();
  });
  rangeEl.addEventListener("input", () => {
    numberEl.value = rangeEl.value;
    render();
  });
}

function setupAxes() {
  els.axesButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.axesButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });
}

function setupFlash() {
  els.flashRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (r.value === "custom") {
        els.flashCustom.focus();
      }
      render();
    });
  });
  els.flashCustom.addEventListener("input", () => {
    const customRadio = els.flashRadios.find((r) => r.value === "custom");
    if (customRadio) customRadio.checked = true;
    render();
  });
}

function getScenarios() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch (err) {
    return null;
  }
}

function setScenarios(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function ensureDefaultScenarios() {
  const existing = getScenarios();
  if (existing && existing.length) return;
  const defaults = [
    { name: "Low duty", config: { fs: 10, L: 3, I: 300, A: 3, b: 16, C: 1, S: 1, U: 1, D: 30, Flash_MiB: 16 } },
    { name: "Medium duty", config: { fs: 20, L: 3, I: 120, A: 3, b: 16, C: 1, S: 1, U: 1, D: 30, Flash_MiB: 16 } },
    { name: "High duty", config: { fs: 50, L: 5, I: 60, A: 3, b: 16, C: 1, S: 1, U: 1, D: 30, Flash_MiB: 16 } }
  ];
  setScenarios(defaults);
}

function saveScenario() {
  const cfg = getConfig();
  const defaultName = `${cfg.fs}Hz_${cfg.L}s_${cfg.I}s_${cfg.A}A`;
  const name = window.prompt("Scenario name", defaultName);
  if (!name) return;
  const list = getScenarios() || [];
  list.push({ name, config: cfg });
  setScenarios(list);
  renderScenarios();
}

function loadScenario(index) {
  const list = getScenarios() || [];
  const item = list[index];
  if (!item) return;
  applyConfig(item.config);
}

function deleteScenario(index) {
  const list = getScenarios() || [];
  list.splice(index, 1);
  setScenarios(list);
  renderScenarios();
}

function applyConfig(cfg) {
  els.fs.value = cfg.fs;
  els.fsRange.value = cfg.fs;
  els.L.value = cfg.L;
  els.LRange.value = cfg.L;
  els.I.value = cfg.I;
  els.IRange.value = cfg.I;
  els.b.value = cfg.b;
  els.C.value = cfg.C;
  els.S.value = cfg.S;
  els.SRange.value = cfg.S;
  els.U.value = cfg.U;
  els.URange.value = cfg.U;
  els.D.value = cfg.D;

  els.axesButtons.forEach((b) => b.classList.toggle("active", Number(b.dataset.axes) === cfg.A));

  if (cfg.Flash_MiB === 16) {
    els.flashRadios.find((r) => r.value === "16").checked = true;
  } else if (cfg.Flash_MiB === 32) {
    els.flashRadios.find((r) => r.value === "32").checked = true;
  } else {
    els.flashRadios.find((r) => r.value === "custom").checked = true;
    els.flashCustom.value = cfg.Flash_MiB;
  }
  render();
}

function renderScenarios() {
  const list = getScenarios() || [];
  els.scenarioTable.innerHTML = "";
  list.forEach((item, index) => {
    const result = compute(item.config);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.config.fs}</td>
      <td>${item.config.L}</td>
      <td>${item.config.I}</td>
      <td>${item.config.A}</td>
      <td>${item.config.b}</td>
      <td>${fmt(result.B_payload_total, 0)}</td>
      <td>${item.config.C}</td>
      <td>${item.config.S}</td>
      <td>${fmt(result.MiB_day, 3)}</td>
      <td>${Number.isFinite(result.Days_full) ? fmt(result.Days_full, 1) : "∞"}</td>
      <td>
        <button data-action="load" data-index="${index}">Load</button>
        <button data-action="delete" data-index="${index}">Delete</button>
      </td>
    `;
    els.scenarioTable.appendChild(row);
  });
}

function exportScenarios() {
  const list = getScenarios() || [];
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "oc-acc-scenarios.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importScenarios(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("Invalid format");
      const cleaned = data.filter((item) => item && item.config && item.name);
      setScenarios(cleaned);
      renderScenarios();
    } catch (err) {
      window.alert("Invalid scenarios JSON.");
    }
  };
  reader.readAsText(file);
}

function drawChart(cfg, results) {
  const canvas = els.sweepChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { left: 52, right: 20, top: 18, bottom: 42 };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfbfc";
  ctx.fillRect(0, 0, width, height);

  const variable = els.sweepVar.value;
  const min = num(els.sweepMin.value, 0);
  const max = num(els.sweepMax.value, 0);
  const step = num(els.sweepStep.value, 0);
  const metric = els.sweepMetric.value;
  const variableLabel = {
    fs: "Sampling frequency (Hz)",
    I: "Burst interval (s)",
    L: "Burst length (s)",
    S: "Smart sampling factor"
  }[variable] || variable;
  const metricLabel = {
    MiB_day: "MB per day",
    Days_full: "Days to full"
  }[metric] || metric;

  if (step <= 0 || max <= min) {
    ctx.fillStyle = "#5e6670";
    ctx.fillText("Invalid sweep range.", padding.left, padding.top + 20);
    return;
  }

  const points = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    const sweepCfg = { ...cfg, [variable]: v };
    const res = compute(sweepCfg);
    const value = metric === "MiB_day" ? res.MiB_day : res.Days_full;
    if (Number.isFinite(value)) {
      points.push({ x: v, y: value });
    }
  }

  if (!points.length) {
    ctx.fillStyle = "#5e6670";
    ctx.fillText("No data to plot.", padding.left, padding.top + 20);
    return;
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = 0;
  const yMax = Math.max(...ys) * 1.1;

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const xScale = (x) => padding.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const yScale = (y) => padding.top + plotH - (y / yMax) * plotH;

  ctx.strokeStyle = "#cfd6dc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotH);
  ctx.lineTo(padding.left + plotW, padding.top + plotH);
  ctx.stroke();

  ctx.fillStyle = "#5e6670";
  ctx.font = "12px system-ui";
  ctx.fillText(variableLabel, padding.left, height - 12);
  ctx.fillText(metricLabel, 12, padding.top);

  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;
    const x = padding.left + t * plotW;
    const xValue = xMin + t * (xMax - xMin);
    ctx.strokeStyle = "#e6eaee";
    ctx.beginPath();
    ctx.moveTo(x, padding.top + plotH);
    ctx.lineTo(x, padding.top + plotH + 6);
    ctx.stroke();
    ctx.fillStyle = "#5e6670";
    ctx.fillText(fmt(xValue, 1), x - 10, padding.top + plotH + 20);
  }

  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;
    const y = padding.top + plotH - t * plotH;
    const yValue = yMin + t * (yMax - yMin);
    ctx.strokeStyle = "#e6eaee";
    ctx.beginPath();
    ctx.moveTo(padding.left - 6, y);
    ctx.lineTo(padding.left, y);
    ctx.stroke();
    ctx.fillStyle = "#5e6670";
    ctx.fillText(fmt(yValue, 1), 6, y + 4);
  }

  ctx.strokeStyle = "#2a6f8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, idx) => {
    const x = xScale(p.x);
    const y = yScale(p.y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function wireInputs() {
  syncRange(els.fs, els.fsRange);
  syncRange(els.L, els.LRange);
  syncRange(els.I, els.IRange);
  syncRange(els.S, els.SRange);
  syncRange(els.U, els.URange);

  [els.b, els.C, els.D].forEach((el) => {
    el.addEventListener("input", render);
  });

  els.S.addEventListener("input", () => {
    els.SRange.value = els.S.value;
    render();
  });
  els.U.addEventListener("input", () => {
    els.URange.value = els.U.value;
    render();
  });

  setupAxes();
  setupFlash();

  els.saveScenario.addEventListener("click", saveScenario);
  els.exportScenarios.addEventListener("click", exportScenarios);
  els.toggleEncoding.addEventListener("click", () => {
    previewEncoding = previewEncoding === "hex" ? "base64" : "hex";
    render();
  });
  els.importScenarios.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importScenarios(file);
    event.target.value = "";
  });

  els.scenarioTable.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (btn.dataset.action === "load") loadScenario(index);
    if (btn.dataset.action === "delete") deleteScenario(index);
  });

  const sweepDefaults = {
    fs: { min: 5, max: 100, step: 5 },
    I: { min: 30, max: 600, step: 30 },
    L: { min: 0.5, max: 10, step: 0.5 },
    S: { min: 0, max: 1, step: 0.05 }
  };

  els.sweepVar.addEventListener("change", () => {
    const key = els.sweepVar.value;
    const defaults = sweepDefaults[key];
    if (defaults) {
      els.sweepMin.value = defaults.min;
      els.sweepMax.value = defaults.max;
      els.sweepStep.value = defaults.step;
    }
    render();
  });

  [els.sweepMin, els.sweepMax, els.sweepStep, els.sweepMetric].forEach((el) => {
    el.addEventListener("input", render);
  });

  els.transferRadios.forEach((radio) => {
    radio.addEventListener("change", render);
  });

  if (els.compressionMethod) {
    els.compressionMethod.addEventListener("change", render);
  }

  if (els.compressionEnabled) {
    els.compressionEnabled.addEventListener("change", render);
  }
}

ensureDefaultScenarios();
wireInputs();
render();
