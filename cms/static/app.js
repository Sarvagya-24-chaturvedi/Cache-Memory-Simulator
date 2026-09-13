/**
 * Cache Memory Simulator - Frontend Interactive Engine
 * Zero emojis - Pure SVG icons, telemetry cards, and interactive visualizers.
 */

// ----------------------------------------------------
// Global State
// ----------------------------------------------------
let authToken = localStorage.getItem("cms_auth_token") || null;
let currentRole = localStorage.getItem("cms_role") || null;
let currentUser = localStorage.getItem("cms_user") || null;

let simulationData = null;
let currentStepIndex = 0;
let isPlaying = false;
let playInterval = null;

let hitMissChart = null;
let timelineChart = null;

// ----------------------------------------------------
// Utilities & Toasts
// ----------------------------------------------------
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(viewId);
  if (target) target.classList.add("active");
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers["Authorization"] = "Bearer " + authToken;
  }
  options.headers = headers;

  const res = await fetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    throw data || { ok: false, error: "Network or server request failed" };
  }
  return data;
}

// ----------------------------------------------------
// Authentication & Session
// ----------------------------------------------------
function updateAuthUI() {
  const userInfo = document.getElementById("user-info");
  const adminTab = document.querySelector('.tab-btn.admin-only');
  const adminPanel = document.getElementById("tab-admin");

  if (userInfo && currentUser) {
    userInfo.textContent = `${currentUser} (${currentRole})`;
  }

  if (adminTab) {
    if (currentRole === "admin") {
      adminTab.style.display = "inline-flex";
    } else {
      adminTab.style.display = "none";
      if (adminPanel) adminPanel.classList.remove("active");
    }
  }
}

function setupAuth() {
  const loginBtn = document.getElementById("btn-login");
  const guestBtn = document.getElementById("btn-guest-quick");
  const logoutBtn = document.getElementById("btn-logout");
  const loginMsg = document.getElementById("login-message");
  const openRegBtn = document.getElementById("btn-open-register");
  const cancelRegBtn = document.getElementById("btn-cancel-register");
  const closeRegBtn = document.getElementById("btn-close-reg");
  const doRegBtn = document.getElementById("btn-register");
  const regDialog = document.getElementById("register-dialog");

  // Check saved session
  if (authToken && currentUser) {
    updateAuthUI();
    switchView("main-view");
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const u = document.getElementById("login-username").value.trim();
      const p = document.getElementById("login-password").value;
      if (!u || !p) {
        showToast("Please enter username and password.", "error");
        return;
      }
      try {
        const data = await api("/api/login", {
          method: "POST",
          body: JSON.stringify({ username: u, password: p })
        });
        authToken = data.token;
        currentRole = data.role;
        currentUser = data.username;
        localStorage.setItem("cms_auth_token", authToken);
        localStorage.setItem("cms_role", currentRole);
        localStorage.setItem("cms_user", currentUser);

        updateAuthUI();
        switchView("main-view");
        showToast(`Signed in as ${currentUser}`, "success");
      } catch (err) {
        showToast(err.error || "Login failed", "error");
      }
    });
  }

  if (guestBtn) {
    guestBtn.addEventListener("click", async () => {
      try {
        const data = await api("/api/guest-login", { method: "POST" });
        authToken = data.token;
        currentRole = data.role;
        currentUser = data.username;
        localStorage.setItem("cms_auth_token", authToken);
        localStorage.setItem("cms_role", currentRole);
        localStorage.setItem("cms_user", currentUser);

        updateAuthUI();
        switchView("main-view");
        showToast("Started interactive guest session.", "success");
      } catch (e) {
        showToast("Guest login failed", "error");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      authToken = null;
      currentRole = null;
      currentUser = null;
      localStorage.removeItem("cms_auth_token");
      localStorage.removeItem("cms_role");
      localStorage.removeItem("cms_user");
      switchView("login-view");
      showToast("Signed out successfully", "info");
    });
  }

  if (openRegBtn && regDialog) {
    openRegBtn.addEventListener("click", () => regDialog.classList.remove("hidden"));
  }
  if (cancelRegBtn && regDialog) {
    cancelRegBtn.addEventListener("click", () => regDialog.classList.add("hidden"));
  }
  if (closeRegBtn && regDialog) {
    closeRegBtn.addEventListener("click", () => regDialog.classList.add("hidden"));
  }

  if (doRegBtn) {
    doRegBtn.addEventListener("click", async () => {
      const u = document.getElementById("reg-username").value.trim();
      const p = document.getElementById("reg-password").value;
      if (!u || !p) {
        showToast("Username and password required", "error");
        return;
      }
      try {
        const data = await api("/api/create-account", {
          method: "POST",
          body: JSON.stringify({ username: u, password: p })
        });
        if (data.ok) {
          showToast("Account created. Please log in.", "success");
          if (regDialog) regDialog.classList.add("hidden");
        }
      } catch (err) {
        showToast(err.error || "Registration failed", "error");
      }
    });
  }
}

// ----------------------------------------------------
// Navigation & Tabs
// ----------------------------------------------------
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add("active");

      // Trigger redraws for specific tabs
      if (targetId === "tab-waveform" && window.WaveDrom) {
        setTimeout(() => WaveDrom.ProcessAll(), 50);
      }
      if (targetId === "tab-analytics") {
        updateAnalyticsCharts();
      }
      if (targetId === "tab-decoder") {
        updateAddressDecoder();
      }
    });
  });
}

// ----------------------------------------------------
// Memory Sequence Generator & Trace Editor
// ----------------------------------------------------
const PRESET_TRACES = {
  spatial: [
    "# Spatial Locality Benchmark: Sequential Array Scan with 4-Byte Stride",
    "Read 4 0x1000", "Read 4 0x1004", "Read 4 0x1008", "Read 4 0x100C",
    "Read 4 0x1010", "Read 4 0x1014", "Read 4 0x1018", "Read 4 0x101C",
    "Read 4 0x1020", "Read 4 0x1024", "Read 4 0x1028", "Read 4 0x102C",
    "Write 4 0x1030", "Write 4 0x1034", "Read 4 0x1038", "Read 4 0x103C"
  ].join("\n"),

  temporal: [
    "# Temporal Locality Benchmark: Iterated Loop Over Small Working Set",
    "Read 4 0x2000", "Read 4 0x2004", "Read 4 0x2008", "Write 4 0x2000",
    "Read 4 0x2000", "Read 4 0x2004", "Read 4 0x2008", "Write 4 0x2004",
    "Read 4 0x2000", "Read 4 0x2004", "Read 4 0x2008", "Read 4 0x2000",
    "Read 4 0x2000", "Read 4 0x2004", "Read 4 0x2008", "Write 4 0x2008"
  ].join("\n"),

  matrix_row: [
    "# Matrix Row-Major Traversal (4x4 Integers) - Cache Friendly",
    "Read 4 0x3000", "Read 4 0x3004", "Read 4 0x3008", "Read 4 0x300C",
    "Read 4 0x3010", "Read 4 0x3014", "Read 4 0x3018", "Read 4 0x301C",
    "Read 4 0x3020", "Read 4 0x3024", "Read 4 0x3028", "Read 4 0x302C",
    "Read 4 0x3030", "Read 4 0x3034", "Read 4 0x3038", "Read 4 0x303C"
  ].join("\n"),

  matrix_col: [
    "# Matrix Column-Major Traversal (4x4 Integers, Row Stride 16B) - High Miss Rate",
    "Read 4 0x3000", "Read 4 0x3010", "Read 4 0x3020", "Read 4 0x3030",
    "Read 4 0x3004", "Read 4 0x3014", "Read 4 0x3024", "Read 4 0x3034",
    "Read 4 0x3008", "Read 4 0x3018", "Read 4 0x3028", "Read 4 0x3038",
    "Read 4 0x300C", "Read 4 0x301C", "Read 4 0x302C", "Read 4 0x303C"
  ].join("\n"),

  conflict: [
    "# Cache Conflict & Thrashing Benchmark (Same Set Index: 0)",
    "Read 4 0x0000", "Read 4 0x0400", "Read 4 0x0800", "Read 4 0x0C00", "Read 4 0x1000",
    "Read 4 0x0000", "Read 4 0x0400", "Read 4 0x0800", "Read 4 0x0C00", "Read 4 0x1000",
    "Read 4 0x0000", "Read 4 0x0400", "Read 4 0x0800", "Read 4 0x0C00", "Read 4 0x1000"
  ].join("\n"),

  random: [
    "# Uniform Random Address Distribution",
    "Read 4 0x1A20", "Write 4 0x4890", "Read 4 0x82C0", "Read 4 0x1040",
    "Read 4 0x3340", "Write 4 0x9100", "Read 4 0x5580", "Read 4 0x2210",
    "Read 4 0x1A20", "Read 4 0x7700", "Write 4 0x1040", "Read 4 0x6430"
  ].join("\n")
};

function setupSequenceEditor() {
  const seqText = document.getElementById("seq-text");
  const lineCountLabel = document.getElementById("seq-line-count");
  const presetSelect = document.getElementById("seq-preset-select");
  const fileInput = document.getElementById("seq-file");
  const exportBtn = document.getElementById("btn-export-seq");

  // Initial load
  if (seqText && !seqText.value.trim()) {
    seqText.value = PRESET_TRACES.spatial;
  }

  function updateLineCount() {
    if (!seqText || !lineCountLabel) return;
    const lines = seqText.value.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
    lineCountLabel.textContent = `${lines.length} active instructions`;
  }

  if (seqText) {
    seqText.addEventListener("input", updateLineCount);
    updateLineCount();
  }

  if (presetSelect) {
    presetSelect.addEventListener("change", () => {
      const val = presetSelect.value;
      if (val && PRESET_TRACES[val]) {
        seqText.value = PRESET_TRACES[val];
        updateLineCount();
        showToast(`Loaded ${presetSelect.options[presetSelect.selectedIndex].text}`, "info");
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        seqText.value = ev.target.result;
        updateLineCount();
        showToast(`Loaded trace file: ${file.name}`, "success");
      };
      reader.readAsText(file);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const text = seqText.value;
      if (!text.trim()) {
        showToast("Sequence is empty.", "error");
        return;
      }
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "memory_trace.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Memory sequence exported as memory_trace.txt", "success");
    });
  }
}

// ----------------------------------------------------
// Sequence Generator Modal
// ----------------------------------------------------
function setupGeneratorModal() {
  const modal = document.getElementById("gen-modal");
  const openBtn = document.getElementById("btn-open-gen-modal");
  const closeBtn = document.getElementById("btn-close-gen-modal");
  const cancelBtn = document.getElementById("btn-cancel-gen");
  const applyBtn = document.getElementById("btn-apply-gen");
  const presetCards = document.querySelectorAll(".preset-card");
  let selectedPattern = "sequential";

  if (openBtn && modal) {
    openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }
  if (cancelBtn && modal) {
    cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  presetCards.forEach(card => {
    card.addEventListener("click", () => {
      presetCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedPattern = card.getAttribute("data-pattern");
    });
  });

  if (applyBtn) {
    applyBtn.addEventListener("click", async () => {
      const count = parseInt(document.getElementById("gen-count").value, 10) || 40;
      const startAddrStr = document.getElementById("gen-start-addr").value.trim() || "0x1000";
      const startAddr = parseInt(startAddrStr, 0) || 0x1000;
      const stride = parseInt(document.getElementById("gen-stride").value, 10) || 4;
      const readRatio = parseFloat(document.getElementById("gen-read-ratio").value) || 0.8;

      const cacheSize = parseInt(document.getElementById("cache-size").value, 10);
      const blockSize = parseInt(document.getElementById("block-size").value, 10);
      const assoc = parseInt(document.getElementById("assoc").value, 10);

      try {
        const res = await api("/api/generate_sequence", {
          method: "POST",
          body: JSON.stringify({
            pattern: selectedPattern,
            params: {
              count,
              start_addr: startAddr,
              stride,
              read_ratio: readRatio,
              cache_size: cacheSize,
              block_size: blockSize,
              assoc: assoc
            }
          })
        });

        if (res.ok) {
          const seqText = document.getElementById("seq-text");
          if (seqText) {
            seqText.value = res.sequence_text;
            const lineCountLabel = document.getElementById("seq-line-count");
            if (lineCountLabel) lineCountLabel.textContent = `${res.line_count} active instructions`;
          }
          if (modal) modal.classList.add("hidden");
          showToast(`Generated: ${res.description}`, "success");
        }
      } catch (err) {
        showToast(err.error || "Failed to generate sequence", "error");
      }
    });
  }
}

// ----------------------------------------------------
// 32-Bit Address Decoder
// ----------------------------------------------------
function updateAddressDecoder(customAddr = null) {
  const cacheSize = parseInt(document.getElementById("cache-size").value, 10);
  const blockSize = parseInt(document.getElementById("block-size").value, 10);
  const assoc = parseInt(document.getElementById("assoc").value, 10);

  const numBlocks = Math.max(1, Math.floor(cacheSize / blockSize));
  const numSets = Math.max(1, Math.floor(numBlocks / assoc));

  const offsetBits = Math.max(0, Math.round(Math.log2(blockSize)));
  const indexBits = Math.max(0, Math.round(Math.log2(numSets)));
  const tagBits = Math.max(0, 32 - indexBits - offsetBits);

  // Update math summary cards
  const elBlocks = document.getElementById("math-total-blocks");
  const elSets = document.getElementById("math-total-sets");
  const elTagBits = document.getElementById("math-tag-bits");
  const elOffsetBits = document.getElementById("math-offset-bits");

  if (elBlocks) elBlocks.textContent = numBlocks;
  if (elSets) elSets.textContent = numSets;
  if (elTagBits) elTagBits.textContent = tagBits;
  if (elOffsetBits) elOffsetBits.textContent = offsetBits;

  // Resolve target address
  let targetAddr = 0x10A4;
  if (customAddr !== null) {
    targetAddr = typeof customAddr === "string" ? parseInt(customAddr, 0) : customAddr;
  } else {
    const inputField = document.getElementById("decoder-input-addr");
    if (inputField && inputField.value.trim()) {
      targetAddr = parseInt(inputField.value.trim(), 0) || 0;
    }
  }

  // Decompose address
  const offsetMask = (1 << offsetBits) - 1;
  const offsetVal = offsetBits > 0 ? (targetAddr & offsetMask) : 0;

  const indexMask = (1 << indexBits) - 1;
  const indexVal = indexBits > 0 ? ((targetAddr >> offsetBits) & indexMask) : 0;

  const tagVal = targetAddr >> (offsetBits + indexBits);

  // Update ranges
  const tagRange = document.getElementById("decoder-tag-range");
  const indexRange = document.getElementById("decoder-index-range");
  const offsetRange = document.getElementById("decoder-offset-range");

  if (tagRange) tagRange.textContent = `[31:${indexBits + offsetBits}] (${tagBits} bits)`;
  if (indexRange) indexRange.textContent = indexBits > 0 ? `[${indexBits + offsetBits - 1}:${offsetBits}] (${indexBits} bits)` : "Direct (0 bits)";
  if (offsetRange) offsetRange.textContent = offsetBits > 0 ? `[${offsetBits - 1}:0] (${offsetBits} bits)` : "Word (0 bits)";

  // Update values
  const tagValEl = document.getElementById("decoder-tag-val");
  const indexValEl = document.getElementById("decoder-index-val");
  const offsetValEl = document.getElementById("decoder-offset-val");

  if (tagValEl) tagValEl.textContent = `0x${tagVal.toString(16).toUpperCase()}`;
  if (indexValEl) indexValEl.textContent = `Set ${indexVal} (0x${indexVal.toString(16).toUpperCase()})`;
  if (offsetValEl) offsetValEl.textContent = `0x${offsetVal.toString(16).toUpperCase()} (Byte ${offsetVal})`;

  // Update binary strings
  const tagBinEl = document.getElementById("decoder-tag-bin");
  const indexBinEl = document.getElementById("decoder-index-bin");
  const offsetBinEl = document.getElementById("decoder-offset-bin");

  if (tagBinEl) tagBinEl.textContent = tagVal.toString(2).padStart(tagBits, "0").replace(/(.{4})/g, "$1 ").trim();
  if (indexBinEl) indexBinEl.textContent = indexVal.toString(2).padStart(indexBits, "0");
  if (offsetBinEl) offsetBinEl.textContent = offsetVal.toString(2).padStart(offsetBits, "0");
}

function setupAddressDecoderInput() {
  const input = document.getElementById("decoder-input-addr");
  if (input) {
    input.addEventListener("input", () => {
      updateAddressDecoder();
    });
  }

  // Update decoder on parameter changes
  ["cache-size", "block-size", "assoc"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => updateAddressDecoder());
  });
}

// ----------------------------------------------------
// Simulation Execution & Step-by-Step Controller
// ----------------------------------------------------
function setupSimulation() {
  const runBtn = document.getElementById("btn-run");
  const probeBtn = document.getElementById("btn-probe");

  if (runBtn) {
    runBtn.addEventListener("click", async () => {
      const seqText = document.getElementById("seq-text").value;
      if (!seqText.trim()) {
        showToast("Memory sequence trace is empty.", "error");
        return;
      }

      const cacheSize = parseInt(document.getElementById("cache-size").value, 10);
      const blockSize = parseInt(document.getElementById("block-size").value, 10);
      const assoc = parseInt(document.getElementById("assoc").value, 10);
      const policy = document.getElementById("policy").value;

      try {
        const data = await api("/api/run_simulation", {
          method: "POST",
          body: JSON.stringify({
            cache_size: cacheSize,
            block_size: blockSize,
            assoc: assoc,
            policy: policy,
            sequence_text: seqText,
            sequence_name: "interactive_run",
            hierarchy: false
          })
        });

        if (data.ok) {
          simulationData = data;
          initStepController(data);
          updateAnalyticsCharts();
          showToast(`Simulation finished: ${data.stats.hits} Hits, ${data.stats.misses} Misses (${data.stats.hit_rate_pct}% Hit Rate)`, "success");
        }
      } catch (err) {
        showToast(err.error || "Simulation failed", "error");
      }
    });
  }

  if (probeBtn) {
    probeBtn.addEventListener("click", async () => {
      const op = document.getElementById("probe-op").value;
      const addr = document.getElementById("probe-addr").value.trim();
      if (!addr) {
        showToast("Enter a probe address (e.g. 0x1000)", "error");
        return;
      }
      const singleTrace = `${op} 4 ${addr}`;
      const cacheSize = parseInt(document.getElementById("cache-size").value, 10);
      const blockSize = parseInt(document.getElementById("block-size").value, 10);
      const assoc = parseInt(document.getElementById("assoc").value, 10);
      const policy = document.getElementById("policy").value;

      try {
        const data = await api("/api/run_simulation", {
          method: "POST",
          body: JSON.stringify({
            cache_size: cacheSize,
            block_size: blockSize,
            assoc: assoc,
            policy: policy,
            sequence_text: singleTrace,
            sequence_name: "probe",
            hierarchy: false
          })
        });

        if (data.ok && data.step_trace.length > 0) {
          const step = data.step_trace[0];
          showToast(`Probe ${step.instr} ${step.addr_hex} -> ${step.result} (Set ${step.set_index}, Tag ${step.tag_hex})`, step.result === "HIT" ? "success" : "info");
          simulationData = data;
          initStepController(data);
        }
      } catch (err) {
        showToast(err.error || "Probe failed", "error");
      }
    });
  }
}

function initStepController(data) {
  const totalSteps = data.step_trace.length;
  currentStepIndex = totalSteps; // Jump to end initially

  const slider = document.getElementById("step-slider");
  const totalStepsNum = document.getElementById("total-steps-num");

  if (slider) {
    slider.min = 1;
    slider.max = totalSteps;
    slider.value = totalSteps;
  }
  if (totalStepsNum) totalStepsNum.textContent = totalSteps;

  // Build the Visual Cache Matrix Table Header
  buildCacheMatrixHeader(data.stats.assoc);

  // Render Full Access Log Table
  renderAccessLogTable(data.step_trace);

  // Render Truth Table for Circuit tab
  renderTruthTable(data.truth_table);

  // Update Top Bar & Telemetry Cards
  updateTopTelemetry(data.stats, data.amat);

  // Render active step
  goToStep(totalSteps);
}

function buildCacheMatrixHeader(assoc) {
  const headerRow = document.getElementById("cache-matrix-header");
  if (!headerRow) return;
  headerRow.innerHTML = `<th style="width: 80px;">Set Index</th>`;
  for (let w = 0; w < assoc; w++) {
    const th = document.createElement("th");
    th.textContent = `Way ${w}`;
    headerRow.appendChild(th);
  }
}

function renderAccessLogTable(trace) {
  const tbody = document.getElementById("access-log-body");
  const countBadge = document.getElementById("trace-summary-badge");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (countBadge) countBadge.textContent = `${trace.length} Events`;

  trace.forEach((st, idx) => {
    const tr = document.createElement("tr");
    tr.id = `trace-row-${idx + 1}`;
    tr.style.cursor = "pointer";

    const isHit = st.result === "HIT";
    const isWrite = st.instr === "WRITE";

    tr.innerHTML = `
      <td style="color:var(--text-muted);">${st.step}</td>
      <td><span class="badge ${isWrite ? 'write' : 'read'}">${st.instr}</span></td>
      <td class="addr-cell">${st.addr_hex}</td>
      <td class="tag-val">${st.tag_hex}</td>
      <td>Set ${st.set_index}</td>
      <td>Way ${st.way_index}</td>
      <td><span class="badge ${isHit ? 'hit' : 'miss'}">${st.result}</span></td>
      <td style="color:var(--text-muted);">${st.evicted_tag ? `Evicted ${st.evicted_tag}` : '-'}</td>
    `;

    tr.addEventListener("click", () => {
      goToStep(st.step);
    });

    tbody.appendChild(tr);
  });
}

function renderTruthTable(rows) {
  const tbody = document.getElementById("truth-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  (rows || []).slice(-50).forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    const isHit = r[5] === "HIT";

    tr.innerHTML = `
      <td class="addr-cell">${r[0]}</td>
      <td class="tag-val">0x${r[1].toString(16).toUpperCase()}</td>
      <td>Set ${r[2]}</td>
      <td>${r[3]}</td>
      <td>${r[4]}</td>
      <td><span class="badge ${isHit ? 'hit' : 'miss'}">${r[5]}</span></td>
    `;

    tr.addEventListener("click", () => {
      updateCircuitDiagram(r[0], r[1], r[2], r[3], r[4], r[5]);
      showToast(`Inspecting Truth Table row: ${r[0]} (${r[5]})`, "info");
    });

    tbody.appendChild(tr);
  });

  if (rows && rows.length > 0) {
    const last = rows[rows.length - 1];
    updateCircuitDiagram(last[0], last[1], last[2], last[3], last[4], last[5]);
  }
}

function updateTopTelemetry(stats, amat) {
  const hitRate = document.getElementById("top-hit-rate");
  const amatEl = document.getElementById("top-amat");
  const accesses = document.getElementById("top-accesses");

  if (hitRate) hitRate.textContent = `${stats.hit_rate_pct}%`;
  if (amatEl) amatEl.textContent = amat ? amat.toFixed(3) : "1.000";
  if (accesses) accesses.textContent = stats.accesses;

  // Analytics tab metrics
  const anHits = document.getElementById("analytics-hits");
  const anMisses = document.getElementById("analytics-misses");
  const anHitRate = document.getElementById("analytics-hit-rate");
  const anAmat = document.getElementById("analytics-amat");
  const anRW = document.getElementById("analytics-read-write-hits");
  const anRWMiss = document.getElementById("analytics-read-write-misses");

  if (anHits) anHits.textContent = stats.hits;
  if (anMisses) anMisses.textContent = stats.misses;
  if (anHitRate) anHitRate.textContent = `${stats.hit_rate_pct}%`;
  if (anAmat) anAmat.textContent = amat ? amat.toFixed(3) : "1.000";
  if (anRW) anRW.textContent = `Reads: ${stats.read_hits} | Writes: ${stats.write_hits}`;
  if (anRWMiss) anRWMiss.textContent = `Reads: ${stats.read_misses} | Writes: ${stats.write_misses}`;
}

function goToStep(stepNumber) {
  if (!simulationData || !simulationData.step_trace) return;
  const trace = simulationData.step_trace;
  const total = trace.length;
  if (total === 0) return;

  stepNumber = Math.max(1, Math.min(stepNumber, total));
  currentStepIndex = stepNumber;

  const currentStep = trace[stepNumber - 1];

  // Update scrubber controls
  const slider = document.getElementById("step-slider");
  const stepNumEl = document.getElementById("current-step-num");
  if (slider) slider.value = stepNumber;
  if (stepNumEl) stepNumEl.textContent = stepNumber;

  // Update active event card
  const opBadge = document.getElementById("active-op-badge");
  const addrDisplay = document.getElementById("active-addr-display");
  const setVal = document.getElementById("active-set-val");
  const tagVal = document.getElementById("active-tag-val");
  const resBadge = document.getElementById("active-result-badge");

  const isHit = currentStep.result === "HIT";
  const isWrite = currentStep.instr === "WRITE";

  if (opBadge) {
    opBadge.className = `badge ${isWrite ? 'write' : 'read'}`;
    opBadge.textContent = currentStep.instr;
  }
  if (addrDisplay) addrDisplay.textContent = `${currentStep.addr_hex} (${currentStep.addr_dec})`;
  if (setVal) setVal.textContent = `Set ${currentStep.set_index}`;
  if (tagVal) tagVal.textContent = currentStep.tag_hex;
  if (resBadge) {
    resBadge.className = `badge ${isHit ? 'hit' : 'miss'}`;
    resBadge.textContent = currentStep.result;
  }

  // Update Address Decoder with active address
  updateAddressDecoder(currentStep.addr_dec);

  // Update Logic Circuit diagram
  updateCircuitDiagram(
    currentStep.addr_hex,
    currentStep.tag,
    currentStep.set_index,
    currentStep.valid_bit,
    currentStep.tag_match_bit,
    currentStep.result
  );

  // Render Visual Cache Matrix up to this step
  renderCacheMatrixAtStep(stepNumber);

  // Highlight row in Access Log Table
  document.querySelectorAll("#access-log-table tr").forEach(r => r.style.background = "");
  const activeRow = document.getElementById(`trace-row-${stepNumber}`);
  if (activeRow) {
    activeRow.style.background = isHit ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)";
    activeRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function renderCacheMatrixAtStep(stepNumber) {
  const tbody = document.getElementById("cache-matrix-body");
  if (!tbody || !simulationData) return;
  tbody.innerHTML = "";

  const currentStep = simulationData.step_trace[stepNumber - 1];
  const numSets = simulationData.stats.num_sets;
  const assoc = simulationData.stats.assoc;

  // Replay state up to stepNumber
  const setsState = Array.from({ length: numSets }, () =>
    Array.from({ length: assoc }, () => ({ tag_hex: "-", valid: false, dirty: false }))
  );

  for (let s = 0; s < stepNumber; s++) {
    const st = simulationData.step_trace[s];
    if (st.set_snapshot) {
      setsState[st.set_index] = st.set_snapshot;
    }
  }

  // Render rows (limit visible sets to 32 for performance if huge)
  const displaySets = Math.min(numSets, 32);
  for (let s = 0; s < displaySets; s++) {
    const tr = document.createElement("tr");
    const isActiveSet = s === currentStep.set_index;
    if (isActiveSet) tr.classList.add("active-set");

    const tdSet = document.createElement("td");
    tdSet.innerHTML = `<span style="font-weight:700; color:var(--accent-purple);">Set ${s}</span>`;
    tr.appendChild(tdSet);

    const ways = setsState[s];
    for (let w = 0; w < assoc; w++) {
      const tdWay = document.createElement("td");
      const blk = ways[w] || { tag_hex: "-", valid: false, dirty: false };

      const isTargetWay = isActiveSet && w === currentStep.way_index;
      let highlightClass = "";
      if (isTargetWay) {
        highlightClass = currentStep.result === "HIT" ? "hit-highlight" : "miss-highlight";
      }

      tdWay.innerHTML = `
        <div class="cache-way-cell ${highlightClass}">
          <div class="way-status-row">
            <span>Way ${w}</span>
            <span style="color:${blk.valid ? 'var(--hit-green)' : 'var(--text-muted)'}">${blk.valid ? 'VAL' : 'INV'}</span>
          </div>
          <div style="font-size:13px; font-weight:700; color:${blk.valid ? 'var(--text-primary)' : 'var(--text-muted)'}">
            ${blk.valid ? blk.tag_hex : '---'}
          </div>
          <div class="way-status-row">
            <span>${blk.dirty ? '<span style="color:var(--warn-amber)">DIRTY</span>' : 'CLEAN'}</span>
            <span style="color:var(--text-muted); font-size:9px;">${isTargetWay ? currentStep.result : ''}</span>
          </div>
        </div>
      `;
      tr.appendChild(tdWay);
    }
    tbody.appendChild(tr);
  }

  if (numSets > 32) {
    const trMore = document.createElement("tr");
    trMore.innerHTML = `<td colspan="${assoc + 1}" style="text-align:center; color:var(--text-muted); font-size:11px;">... Showing first 32 sets of ${numSets} sets ...</td>`;
    tbody.appendChild(trMore);
  }
}

// ----------------------------------------------------
// Playback Controls
// ----------------------------------------------------
function setupPlaybackControls() {
  const btnStart = document.getElementById("btn-step-start");
  const btnPrev = document.getElementById("btn-step-prev");
  const btnPlay = document.getElementById("btn-step-play");
  const btnNext = document.getElementById("btn-step-next");
  const btnEnd = document.getElementById("btn-step-end");
  const slider = document.getElementById("step-slider");
  const speedSelect = document.getElementById("play-speed");

  if (btnStart) btnStart.addEventListener("click", () => goToStep(1));
  if (btnPrev) btnPrev.addEventListener("click", () => goToStep(currentStepIndex - 1));
  if (btnNext) btnNext.addEventListener("click", () => goToStep(currentStepIndex + 1));
  if (btnEnd) {
    btnEnd.addEventListener("click", () => {
      if (simulationData) goToStep(simulationData.step_trace.length);
    });
  }

  if (slider) {
    slider.addEventListener("input", e => {
      goToStep(parseInt(e.target.value, 10));
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      if (isPlaying) {
        stopPlayback();
      } else {
        startPlayback();
      }
    });
  }

  function startPlayback() {
    if (!simulationData || !simulationData.step_trace.length) return;
    if (currentStepIndex >= simulationData.step_trace.length) {
      currentStepIndex = 0;
    }
    isPlaying = true;
    updatePlayIcon();
    const speed = parseInt(speedSelect ? speedSelect.value : 500, 10) || 500;
    playInterval = setInterval(() => {
      if (currentStepIndex >= simulationData.step_trace.length) {
        stopPlayback();
        return;
      }
      goToStep(currentStepIndex + 1);
    }, speed);
  }

  function stopPlayback() {
    isPlaying = false;
    updatePlayIcon();
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
  }

  function updatePlayIcon() {
    const iconPlay = document.getElementById("icon-play");
    const iconPause = document.getElementById("icon-pause");
    if (iconPlay && iconPause) {
      iconPlay.style.display = isPlaying ? "none" : "inline-block";
      iconPause.style.display = isPlaying ? "inline-block" : "none";
    }
  }
}

// ----------------------------------------------------
// Hardware Logic Circuit Visualizer
// ----------------------------------------------------
function updateCircuitDiagram(addrHex, tag, setIdx, validBit, tagMatchBit, result) {
  const isHit = result === "HIT";
  const valid = parseInt(validBit, 10) === 1;
  const match = parseInt(tagMatchBit, 10) === 1;

  // Header and Badges
  const sub = document.getElementById("circuit-status-sub");
  const badge = document.getElementById("circuit-active-badge");
  if (sub) sub.textContent = `Addr: ${addrHex} -> Set ${setIdx} | Tag 0x${Number(tag).toString(16).toUpperCase()}`;
  if (badge) {
    badge.className = `badge ${isHit ? 'hit' : 'miss'}`;
    badge.textContent = `MATCH: ${match ? 1 : 0} & VALID: ${valid ? 1 : 0} => ${result}`;
  }

  // Wires
  function setWire(id, active) {
    const el = document.getElementById(id);
    if (el) {
      if (active) el.classList.add("active");
      else el.classList.remove("active");
    }
  }

  setWire("wire-addr-tag", true);
  setWire("wire-cache-tag", true);
  setWire("wire-comparator-out", match);
  setWire("wire-valid-bit", valid);
  setWire("wire-and-out", isHit);

  // Gate boxes
  function setGate(id, active) {
    const el = document.getElementById(id);
    if (el) {
      if (active) el.classList.add("active");
      else el.classList.remove("active");
    }
  }

  setGate("gate-comparator", match);
  setGate("gate-and", isHit);
  setGate("gate-output", isHit);

  // Text values
  const valMatch = document.getElementById("circuit-val-tagmatch");
  const valValid = document.getElementById("circuit-val-valid");
  const valOut = document.getElementById("circuit-val-output");

  if (valMatch) valMatch.textContent = `Match: ${match ? 1 : 0}`;
  if (valValid) valValid.textContent = `Val: ${valid ? 1 : 0}`;
  if (valOut) {
    valOut.textContent = result;
    valOut.style.fill = isHit ? "var(--hit-green)" : "var(--miss-red)";
  }
}

// ----------------------------------------------------
// Analytics & Chart.js Visualizations
// ----------------------------------------------------
function updateAnalyticsCharts() {
  if (!simulationData) return;
  const stats = simulationData.stats;
  const trace = simulationData.step_trace || [];

  // Chart 1: Donut / Bar Distribution
  const ctxHitMiss = document.getElementById("chart-hit-miss");
  if (ctxHitMiss && window.Chart) {
    const data = {
      labels: ["Hits", "Misses"],
      datasets: [{
        data: [stats.hits, stats.misses],
        backgroundColor: ["#10b981", "#f43f5e"],
        borderColor: ["#059669", "#e11d48"],
        borderWidth: 1,
      }]
    };

    if (hitMissChart) {
      hitMissChart.data = data;
      hitMissChart.update();
    } else {
      hitMissChart = new Chart(ctxHitMiss, {
        type: "doughnut",
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: "#94a3b8", font: { family: "Inter", size: 12 } }
            }
          }
        }
      });
    }
  }

  // Chart 2: Timeline Convergence
  const ctxTimeline = document.getElementById("chart-timeline");
  if (ctxTimeline && window.Chart && trace.length > 0) {
    let cumHits = 0;
    const labels = [];
    const rates = [];

    trace.forEach((st, i) => {
      if (st.result === "HIT") cumHits++;
      labels.push(`Step ${i + 1}`);
      rates.push(((cumHits / (i + 1)) * 100).toFixed(1));
    });

    const data = {
      labels,
      datasets: [{
        label: "Cumulative Hit Rate (%)",
        data: rates,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: trace.length > 50 ? 0 : 3
      }]
    };

    if (timelineChart) {
      timelineChart.data = data;
      timelineChart.update();
    } else {
      timelineChart = new Chart(ctxTimeline, {
        type: "line",
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: "#94a3b8", font: { family: "Inter", size: 12 } }
            }
          },
          scales: {
            x: { ticks: { color: "#64748b", maxTicksLimit: 10 } },
            y: { min: 0, max: 100, ticks: { color: "#64748b" } }
          }
        }
      });
    }
  }
}

function setupAMATSliders() {
  const hitTimeSlider = document.getElementById("slider-hit-time");
  const missPenaltySlider = document.getElementById("slider-miss-penalty");
  const hitTimeVal = document.getElementById("val-hit-time");
  const missPenaltyVal = document.getElementById("val-miss-penalty");

  function recalculateAMAT() {
    if (!simulationData) return;
    const hitTime = parseFloat(hitTimeSlider.value);
    const missPenalty = parseFloat(missPenaltySlider.value);
    if (hitTimeVal) hitTimeVal.textContent = `${hitTime} Cycle${hitTime > 1 ? 's' : ''}`;
    if (missPenaltyVal) missPenaltyVal.textContent = `${missPenalty} Cycles`;

    const stats = simulationData.stats;
    const missRate = (stats.misses / stats.accesses) || 0;
    const amat = hitTime + (missRate * missPenalty);

    const topAmat = document.getElementById("top-amat");
    const anAmat = document.getElementById("analytics-amat");
    if (topAmat) topAmat.textContent = amat.toFixed(3);
    if (anAmat) anAmat.textContent = amat.toFixed(3);
  }

  if (hitTimeSlider) hitTimeSlider.addEventListener("input", recalculateAMAT);
  if (missPenaltySlider) missPenaltySlider.addEventListener("input", recalculateAMAT);
}

// ----------------------------------------------------
// Hierarchical Cache Simulator (L1/L2/DRAM)
// ----------------------------------------------------
function setupHierarchySimulator() {
  const btn = document.getElementById("btn-run-hier-sim");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const seqText = document.getElementById("seq-text").value;
    if (!seqText.trim()) {
      showToast("Memory sequence trace is empty.", "error");
      return;
    }

    const cacheSize = parseInt(document.getElementById("cache-size").value, 10);
    const blockSize = parseInt(document.getElementById("block-size").value, 10);
    const assoc = parseInt(document.getElementById("assoc").value, 10);

    try {
      const data = await api("/api/run_simulation", {
        method: "POST",
        body: JSON.stringify({
          cache_size: cacheSize,
          block_size: blockSize,
          assoc: assoc,
          sequence_text: seqText,
          hierarchy: true
        })
      });

      if (data.ok) {
        // Update metrics
        const elL1 = document.getElementById("hier-l1-hr");
        const elL2 = document.getElementById("hier-l2-hr");
        const elL1Hits = document.getElementById("hier-l1-hits");
        const elL2Hits = document.getElementById("hier-l2-hits");
        const elWb = document.getElementById("hier-writebacks");
        const elAmat = document.getElementById("hier-amat");

        if (elL1) elL1.textContent = `${data.l1_stats.hit_rate_pct}%`;
        if (elL2) elL2.textContent = `${data.l2_stats.hit_rate_pct}%`;
        if (elL1Hits) elL1Hits.textContent = `Hits: ${data.l1_stats.hits} / ${data.l1_stats.total_accesses}`;
        if (elL2Hits) elL2Hits.textContent = `Hits: ${data.l2_stats.hits} / ${data.l2_stats.total_accesses}`;
        if (elWb) elWb.textContent = data.l2_stats.write_backs;
        if (elAmat) elAmat.textContent = data.amat.toFixed(3);

        // Render pipeline table
        const tbody = document.getElementById("hier-trace-body");
        if (tbody) {
          tbody.innerHTML = "";
          (data.hier_steps || []).slice(0, 50).forEach(st => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td style="color:var(--text-muted);">${st.step}</td>
              <td><span class="badge ${st.instr === 'WRITE' ? 'write' : 'read'}">${st.instr}</span></td>
              <td class="addr-cell">${st.addr_hex}</td>
              <td><span class="badge ${st.l1_result === 'HIT' ? 'hit' : 'miss'}">${st.l1_result}</span></td>
              <td><span class="badge ${st.l2_result === 'HIT' ? 'hit' : (st.l2_result === 'MISS' ? 'miss' : 'neutral')}">${st.l2_result}</span></td>
              <td style="font-weight:600; color:${st.serviced_by.includes('L1') ? 'var(--hit-green)' : (st.serviced_by.includes('L2') ? 'var(--accent-cyan)' : 'var(--warn-amber)')}">${st.serviced_by}</td>
            `;
            tbody.appendChild(tr);
          });
        }
        showToast("Hierarchy simulation completed.", "success");
      }
    } catch (err) {
      showToast(err.error || "Hierarchy simulation failed", "error");
    }
  });
}

// ----------------------------------------------------
// Hardware Verilog Execution & Binary Store
// ----------------------------------------------------
function setupHardwareRunner() {
  const btnRun = document.getElementById("btn-run-verilog");
  const btnReRun = document.getElementById("btn-re-run-verilog");
  const terminal = document.getElementById("verilog-terminal");
  const binBtn = document.getElementById("btn-binary-file");

  async function executeVerilog() {
    // Switch to Verilog tab
    const tabBtn = document.querySelector('.tab-btn[data-tab="tab-verilog"]');
    if (tabBtn) tabBtn.click();

    if (terminal) {
      terminal.textContent = "Compiling IEEE-1364 Verilog Hardware Modules (cache_sim_tb.v, cache_logic.v)...\nRunning hardware simulation engine...";
      terminal.style.color = "var(--warn-amber)";
    }

    try {
      const data = await api("/api/run_verilog", { method: "POST" });
      if (terminal) {
        terminal.textContent = data.output;
        terminal.style.color = "var(--accent-cyan)";
      }
      showToast("Verilog hardware simulation executed successfully", "success");
    } catch (err) {
      if (terminal) {
        terminal.textContent = "Hardware Execution Error:\n" + (err.error || err);
        terminal.style.color = "var(--miss-red)";
      }
      showToast("Verilog execution error", "error");
    }
  }

  if (btnRun) btnRun.addEventListener("click", executeVerilog);
  if (btnReRun) btnReRun.addEventListener("click", executeVerilog);

  if (binBtn) {
    binBtn.addEventListener("click", async () => {
      try {
        const data = await api("/api/binary-file");
        if (data.ok) {
          const win = window.open("", "_blank");
          win.document.write(`
            <html><head><title>Cache Binary Store</title>
            <style>body{background:#0b0f19; color:#38bdf8; font-family:monospace; padding:20px;}</style>
            </head><body><pre>${data.content.replace(/</g, "&lt;")}</pre></body></html>
          `);
        }
      } catch (err) {
        showToast("Failed to load binary store", "error");
      }
    });
  }
}

// ----------------------------------------------------
// Admin Management & HMAC Logs
// ----------------------------------------------------
function setupAdminPanel() {
  const refreshUsersBtn = document.getElementById("admin-users-table");
  const refreshLogsBtn = document.getElementById("btn-refresh-logs");
  const logsArea = document.getElementById("admin-logs-area");
  const createUserBtn = document.getElementById("btn-admin-create");

  async function loadUsers() {
    const tbody = document.querySelector("#admin-users-table tbody");
    if (!tbody) return;
    try {
      const data = await api("/api/admin/users");
      if (data.ok) {
        tbody.innerHTML = "";
        data.users.forEach(u => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td style="font-weight:600;">${u.username}</td>
            <td><span class="badge ${u.role === 'admin' ? 'hit' : 'neutral'}">${u.role}</span></td>
            <td>
              <button class="btn danger small del-user-btn" data-user="${u.username}">Delete</button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".del-user-btn").forEach(b => {
          b.addEventListener("click", async () => {
            const targetUser = b.getAttribute("data-user");
            if (!confirm(`Delete user account ${targetUser}?`)) return;
            try {
              await api(`/api/admin/users/${encodeURIComponent(targetUser)}`, { method: "DELETE" });
              loadUsers();
              showToast(`Deleted user ${targetUser}`, "info");
            } catch (err) {
              showToast(err.error || "Failed to delete user", "error");
            }
          });
        });
      }
    } catch (err) {
      showToast(err.error || "Failed to load users", "error");
    }
  }

  if (refreshLogsBtn && logsArea) {
    refreshLogsBtn.addEventListener("click", async () => {
      logsArea.textContent = "Loading obfuscated HMAC security logs...";
      try {
        const data = await api("/api/admin/activity_logs");
        if (data.ok) {
          logsArea.textContent = data.logs.join("") || "No activity logs recorded.";
        }
      } catch (err) {
        logsArea.textContent = err.error || "Failed to fetch logs";
      }
    });
  }

  if (createUserBtn) {
    createUserBtn.addEventListener("click", async () => {
      const u = document.getElementById("admin-new-user").value.trim();
      const p = document.getElementById("admin-new-pass").value;
      const r = document.getElementById("admin-new-role").value;
      if (!u || !p) {
        showToast("Enter username and password", "error");
        return;
      }
      try {
        await api("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({ username: u, password: p, role: r })
        });
        document.getElementById("admin-new-user").value = "";
        document.getElementById("admin-new-pass").value = "";
        loadUsers();
        showToast(`Created account ${u} (${r})`, "success");
      } catch (err) {
        showToast(err.error || "Failed to create user", "error");
      }
    });
  }

  // Hook admin tab click to refresh users
  const adminTab = document.querySelector('.tab-btn.admin-only');
  if (adminTab) {
    adminTab.addEventListener("click", () => {
      loadUsers();
      if (refreshLogsBtn) refreshLogsBtn.click();
    });
  }
}

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  setupAuth();
  setupTabs();
  setupSequenceEditor();
  setupGeneratorModal();
  setupAddressDecoderInput();
  setupSimulation();
  setupPlaybackControls();
  setupAMATSliders();
  setupHierarchySimulator();
  setupHardwareRunner();
  setupAdminPanel();
  updateAddressDecoder();
});