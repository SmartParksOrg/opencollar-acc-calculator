const MI_B = 1024 * 1024;
const STORAGE_KEY = "oc_scenarios_v1";

const els = {
  fs: document.getElementById("fs"),
  fsRange: document.getElementById("fsRange"),
  L: document.getElementById("L"),
  LRange: document.getElementById("LRange"),
  I: document.getElementById("I"),
  IRange: document.getElementById("IRange"),
  axesButtons: Array.from(document.querySelectorAll(".segmented button")),
  b: document.getElementById("b"),
  H: document.getElementById("H"),
  F: document.getElementById("F"),
  O: document.getElementById("O"),
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
  fitBadge: document.getElementById("fitBadge"),
  daysToFill: document.getElementById("daysToFill"),
  mibPerDay: document.getElementById("mibPerDay"),
  scenarioTable: document.getElementById("scenarioTable"),
  saveScenario: document.getElementById("saveScenario"),
  exportScenarios: document.getElementById("exportScenarios"),
  importScenarios: document.getElementById("importScenarios"),
  sweepVar: document.getElementById("sweepVar"),
  sweepMin: document.getElementById("sweepMin"),
  sweepMax: document.getElementById("sweepMax"),
  sweepStep: document.getElementById("sweepStep"),
  sweepMetric: document.getElementById("sweepMetric"),
  sweepChart: document.getElementById("sweepChart")
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
  return {
    fs: num(els.fs.value, 0),
    L: num(els.L.value, 0),
    I: num(els.I.value, 0),
    A: getAxes(),
    b: num(els.b.value, 16),
    H: num(els.H.value, 0),
    F: num(els.F.value, 0),
    O: num(els.O.value, 0),
    C: num(els.C.value, 1),
    S: num(els.S.value, 1),
    U: num(els.U.value, 1),
    D: num(els.D.value, 30),
    Flash_MiB: getFlashMiB()
  };
}

function compute(cfg) {
  const N_axis = cfg.fs * cfg.L;
  const N_total = cfg.fs * cfg.L * cfg.A;
  const bytes_per_sample = cfg.b / 8;
  const B_payload = N_total * bytes_per_sample;
  const B_overhead = cfg.H + cfg.F + cfg.O;
  const B_msg_raw = B_payload + B_overhead;
  const B_msg = cfg.C > 0 ? B_msg_raw / cfg.C : 0;
  const M_day = cfg.I > 0 ? 86400 / cfg.I : 0;
  const M_day_eff = M_day * cfg.S;
  const B_day = B_msg * M_day_eff;
  const MiB_day = B_day / MI_B;
  const Flash_MiB_usable = cfg.Flash_MiB * cfg.U;
  const Days_full = MiB_day > 0 ? Flash_MiB_usable / MiB_day : Infinity;
  const MiB_used = MiB_day * cfg.D;
  const MiB_remaining = Flash_MiB_usable - MiB_used;

  return {
    N_axis,
    N_total,
    bytes_per_sample,
    B_payload,
    B_overhead,
    B_msg_raw,
    B_msg,
    M_day,
    M_day_eff,
    B_day,
    MiB_day,
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
  if (cfg.U < 0 || cfg.U > 1) errors.push("Usable flash fraction must be between 0 and 1.");
  if (cfg.U === 0) warnings.push("Usable flash fraction is 0. No storage available.");
  if (cfg.H < 0 || cfg.F < 0 || cfg.O < 0) errors.push("Overhead bytes cannot be negative.");
  if (cfg.D <= 0) errors.push("Budget horizon must be > 0.");
  if (cfg.Flash_MiB <= 0) errors.push("Flash size must be > 0 MiB.");

  if (cfg.I < cfg.L) {
    warnings.push("Bursts overlap (interval < burst length)." );
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
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: digits });
  return value.toFixed(digits);
}

function renderOutputs(results) {
  const perMessage = [
    ["N_axis", results.N_axis],
    ["N_total", results.N_total],
    ["bytes_per_sample", results.bytes_per_sample],
    ["B_payload", results.B_payload],
    ["B_overhead", results.B_overhead],
    ["B_msg_raw", results.B_msg_raw],
    ["B_msg", results.B_msg]
  ];
  const perDay = [
    ["M_day", results.M_day],
    ["M_day_eff", results.M_day_eff],
    ["B_day", results.B_day],
    ["MiB_day", results.MiB_day]
  ];
  const flashBudget = [
    ["Flash_MiB_usable", results.Flash_MiB_usable],
    ["Days_full", results.Days_full],
    ["MiB_used", results.MiB_used],
    ["MiB_remaining", results.MiB_remaining]
  ];

  renderGrid(els.perMessage, perMessage);
  renderGrid(els.perDay, perDay);
  renderGrid(els.flashBudget, flashBudget);

  const fits = results.MiB_remaining >= 0;
  els.fitBadge.textContent = fits ? "FITS" : "DOES NOT FIT";
  els.fitBadge.classList.toggle("bad", !fits);
  els.daysToFill.textContent = Number.isFinite(results.Days_full) ? fmt(results.Days_full, 1) : "∞";
  els.mibPerDay.textContent = fmt(results.MiB_day, 3);
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
  renderOutputs(results);
  renderWarnings(checks);
  renderScenarios();
  drawChart(cfg, results);
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
    { name: "Low duty", config: { fs: 10, L: 3, I: 300, A: 3, b: 16, H: 24, F: 4, O: 0, C: 1, S: 1, U: 1, D: 30, Flash_MiB: 16 } },
    { name: "Medium duty", config: { fs: 20, L: 3, I: 120, A: 3, b: 16, H: 24, F: 4, O: 0, C: 1, S: 1, U: 1, D: 30, Flash_MiB: 16 } },
    { name: "High duty", config: { fs: 50, L: 5, I: 60, A: 3, b: 16, H: 24, F: 4, O: 0, C: 1, S: 1, U: 1, D: 30, Flash_MiB: 16 } }
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
  els.H.value = cfg.H;
  els.F.value = cfg.F;
  els.O.value = cfg.O;
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
      <td>${item.config.H + item.config.F + item.config.O}</td>
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
  ctx.fillText(variable, padding.left, height - 12);
  ctx.fillText(metric, 12, padding.top);

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

  [els.b, els.H, els.F, els.O, els.C, els.D].forEach((el) => {
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

  [els.sweepVar, els.sweepMin, els.sweepMax, els.sweepStep, els.sweepMetric].forEach((el) => {
    el.addEventListener("input", render);
  });
}

ensureDefaultScenarios();
wireInputs();
render();
