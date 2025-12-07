// Basic client for the Cache Simulator web backend

let authToken = null;
let currentRole = null;
let currentUser = null;
let hitMissChart = null;

function setMessage(el, text, isError = false) {
  el.textContent = text || "";
  el.classList.remove("error", "success");
  if (!text) return;
  el.classList.add(isError ? "error" : "success");
}

function switchView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function setTabs(role) {
  const adminTabBtn = document.querySelector('.tab-btn.admin-only');
  if (!adminTabBtn) return;
  if (role === "admin") {
    adminTabBtn.style.display = "inline-block";
  } else {
    adminTabBtn.style.display = "none";
    const adminPanel = document.getElementById("admin-tab");
    if (adminPanel) adminPanel.classList.remove("active");
  }
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
    throw data || { ok: false, error: "Request failed" };
  }
  return data;
}

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------

function setupLogin() {
  const loginBtn = document.getElementById("btn-login");
  const openRegBtn = document.getElementById("btn-open-register");
  const loginMsg = document.getElementById("login-message");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const u = document.getElementById("login-username").value.trim();
      const p = document.getElementById("login-password").value;
      setMessage(loginMsg, "");
      if (!u || !p) {
        setMessage(loginMsg, "Enter username and password.", true);
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
        const userInfo = document.getElementById("user-info");
        if(userInfo) userInfo.textContent = `${currentUser} (${currentRole})`;
        
        setTabs(currentRole);
        switchView("main-view");
        document.getElementById("login-password").value = "";
      } catch (e) {
        setMessage(loginMsg, e.error || "Login failed", true);
      }
    });
  }

  if (openRegBtn) {
    openRegBtn.addEventListener("click", () => {
      document.getElementById("register-dialog").classList.remove("hidden");
    });
  }

  const cancelReg = document.getElementById("btn-cancel-register");
  if (cancelReg) {
    cancelReg.addEventListener("click", () => {
      document.getElementById("register-dialog").classList.add("hidden");
    });
  }

  const doReg = document.getElementById("btn-register");
  if (doReg) {
    doReg.addEventListener("click", async () => {
      const u = document.getElementById("reg-username").value.trim();
      const p = document.getElementById("reg-password").value;
      const msg = document.getElementById("reg-message");
      setMessage(msg, "");
      if (!u || !p) {
        setMessage(msg, "Enter username and password.", true);
        return;
      }
      try {
        const data = await api("/api/create-account", {
          method: "POST",
          body: JSON.stringify({ username: u, password: p })
        });
        if (data.ok) {
          setMessage(msg, "Guest account created. You can login now.");
        } else {
          setMessage(msg, data.error || "Failed to create account", true);
        }
      } catch (e) {
        setMessage(msg, e.error || "Failed to create account", true);
      }
    });
  }
}

function setupLogout() {
  const btn = document.getElementById("btn-logout");
  if (btn) {
    btn.addEventListener("click", () => {
      authToken = null;
      currentRole = null;
      currentUser = null;
      switchView("login-view");
    });
  }
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(target);
      if (panel) panel.classList.add("active");
    });
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ----------------------------------------------------
// SOFTWARE SIMULATION
// ----------------------------------------------------

function setupSimulation() {
  const runBtn = document.getElementById("btn-run");
  const runMsg = document.getElementById("run-message");

  if (runBtn) {
    runBtn.addEventListener("click", async () => {
      setMessage(runMsg, "");
      const fileInput = document.getElementById("seq-file");
      const file = fileInput.files[0];
      
      // Allow running without file if text provided, but here we assume file upload usually
      let text = "";
      let seqName = "manual_input";

      if (file) {
        seqName = document.getElementById("seq-name")?.value.trim() || file.name;
        try {
          text = await readFileAsText(file);
        } catch (e) {
          setMessage(runMsg, "Failed to read file: " + e, true);
          return;
        }
      } else {
         setMessage(runMsg, "Please upload a sequence file.", true);
         return;
      }

      const cacheSize = document.getElementById("cache-size").value;
      const blockSize = document.getElementById("block-size").value;
      const assoc = document.getElementById("assoc").value;
      const policy = document.getElementById("policy") ? document.getElementById("policy").value : "LRU";

      try {
        const data = await api("/api/run_simulation", {
          method: "POST",
          body: JSON.stringify({
            cache_size: cacheSize,
            block_size: blockSize,
            assoc: assoc,
            policy: policy,
            sequence_name: seqName,
            sequence_text: text,
            hierarchy: false // Default to single level for this button
          })
        });
        if (!data.ok) {
          setMessage(runMsg, data.error || "Simulation failed", true);
          return;
        }
        setMessage(runMsg, "Simulation completed.", false);
        renderSimulationResult(data);
      } catch (e) {
        setMessage(runMsg, e.error || "Simulation request failed", true);
      }
    });
  }

  // Binary file view
  const binBtn = document.getElementById("btn-binary-file");
  if (binBtn) {
    binBtn.addEventListener("click", async () => {
      try {
        const data = await api("/api/binary-file");
        if (data.ok) {
          const win = window.open("", "_blank");
          win.document.write("<pre>" + data.content.replace(/</g, "&lt;") + "</pre>");
        }
      } catch (e) {
        alert(e.error || "Failed to load binary file");
      }
    });
  }
}

function renderSimulationResult(data) {
  const resultsArea = document.getElementById("results-area");
  const statsArea = document.getElementById("stats-area");
  const setsArea = document.getElementById("sets-area");

  if(resultsArea) {
      const lines = (data.results || []).map(
        r => `${r.instr.padEnd(6)} ${r.addr.padStart(10)} \u2192 ${r.result}`
      );
      resultsArea.textContent = lines.join("\n");
  }
  
  if(statsArea) statsArea.textContent = data.stats_text || "";
  if(setsArea) setsArea.textContent = data.sets_text || "";

  // Truth table
  const tbody = document.querySelector("#truth-table tbody");
  if (tbody) {
    tbody.innerHTML = "";
    const ttRows = (data.truth_table || []).slice(-100);
    ttRows.forEach(row => {
      const tr = document.createElement("tr");
      row.forEach((cell, idx) => {
        const td = document.createElement("td");
        td.textContent = cell;
        if (idx === 5) {
          td.style.color = String(cell).toUpperCase() === "HIT" ? "#9df59d" : "#f59d9d";
        }
        tr.appendChild(td);
      });
      // Attach data attributes for interactive logic diagram:
      // row = [addr_hex, tag, set, valid, tagMatch, output]
      tr.dataset.addr = row[0];
      tr.dataset.tag = row[1];
      tr.dataset.set = row[2];
      tr.dataset.valid = row[3];
      tr.dataset.tagmatch = row[4];
      tr.dataset.output = row[5];
      tr.addEventListener("click", () => {
        updateLogicDiagramFromRow(tr);
      });
      tbody.appendChild(tr);
    });

    // Auto-select last row to show latest state
    if (tbody.lastChild) {
      updateLogicDiagramFromRow(tbody.lastChild);
    }
  }

  // Update charts from stats_text
  updateChartsFromStats(data.stats_text || "");
}

// ----------------------------------------------------
// VERILOG HARDWARE SIMULATION (LOGS)
// ----------------------------------------------------

function setupVerilog() {
  const btn = document.getElementById("btn-run-verilog");
  const outputArea = document.getElementById("verilog-area");

  if (btn) {
    btn.addEventListener("click", async () => {
      // 1. Switch to Verilog tab
      const tabBtn = document.querySelector('.tab-btn[data-tab="tab-verilog"]');
      if (tabBtn) tabBtn.click();
      
      if (outputArea) {
        outputArea.textContent = "Compiling and Running Verilog Hardware Simulation...\n(Calling iverilog on server...)";
        outputArea.style.color = "#ffff00"; // Yellow status
      }
      
      try {
        const data = await api("/api/run_verilog", { method: "POST" });
        
        if (outputArea) {
          if (data.ok) {
            outputArea.textContent = data.output;
            outputArea.style.color = "#00ffff"; // Cyan success
          } else {
            outputArea.textContent = "ERROR:\n" + (data.details || data.error);
            outputArea.style.color = "#ff5555"; // Red error
          }
        }
      } catch (e) {
        if (outputArea) {
          outputArea.textContent = "Connection/Server Error:\n" + (e.error || e);
          outputArea.style.color = "#ff5555";
        }
      }
    });
  }
}

// ----------------------------------------------------
// WAVEFORM VISUALIZER (WaveDrom)
// ----------------------------------------------------

function setupWaveform() {
  const btn = document.querySelector('.tab-btn[data-tab="waveform-tab"]');
  if (btn) {
    btn.addEventListener("click", () => {
      setTimeout(() => {
        if (window.WaveDrom) {
          WaveDrom.ProcessAll();
        }
      }, 50);
    });
  }
}

// ----------------------------------------------------
// ADMIN & CHARTS
// ----------------------------------------------------

function setupAdmin() {
  const logsBtn = document.getElementById("btn-refresh-logs");
  const logsArea = document.getElementById("logs-area");
  const usersBtn = document.getElementById("btn-refresh-users");
  const usersTbody = document.querySelector("#users-table tbody");
  const createBtn = document.getElementById("btn-admin-create-user");

  if (logsBtn) {
    logsBtn.addEventListener("click", async () => {
      logsArea.textContent = "Loading...";
      try {
        const data = await api("/api/admin/activity_logs");
        if (data.ok) {
          logsArea.textContent = (data.logs || []).join("");
        }
      } catch (e) {
        logsArea.textContent = e.error || "Failed to load logs";
      }
    });
  }

  if (usersBtn) {
    usersBtn.addEventListener("click", async () => {
      if(usersTbody) usersTbody.innerHTML = "Loading...";
      try {
        const data = await api("/api/admin/users");
        if (data.ok && usersTbody) {
          usersTbody.innerHTML = "";
          (data.users || []).forEach(u => {
            const tr = document.createElement("tr");
            const tdUser = document.createElement("td");
            tdUser.textContent = u.username;
            const tdRole = document.createElement("td");
            tdRole.textContent = u.role;
            const tdAct = document.createElement("td");
            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.className = "btn danger small";
            delBtn.addEventListener("click", async () => {
              if (!confirm("Delete user " + u.username + "?")) return;
              try {
                await api("/api/admin/users/" + encodeURIComponent(u.username), {
                  method: "DELETE"
                });
                usersBtn.click();
              } catch (e) {
                alert(e.error || "Failed to delete user");
              }
            });
            tdAct.appendChild(delBtn);
            tr.appendChild(tdUser);
            tr.appendChild(tdRole);
            tr.appendChild(tdAct);
            usersTbody.appendChild(tr);
          });
        }
      } catch (e) {
        if(usersTbody) {
            usersTbody.innerHTML = "";
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 3;
            td.textContent = e.error || "Failed to load users";
            tr.appendChild(td);
            usersTbody.appendChild(tr);
        }
      }
    });
  }

  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      const u = document.getElementById("admin-new-username").value.trim();
      const p = document.getElementById("admin-new-password").value;
      const r = document.getElementById("admin-new-role").value;
      if (!u || !p) {
        alert("Provide username & password");
        return;
      }
      try {
        await api("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({ username: u, password: p, role: r })
        });
        document.getElementById("admin-new-username").value = "";
        document.getElementById("admin-new-password").value = "";
        if(usersBtn) usersBtn.click();
      } catch (e) {
        alert(e.error || "Failed to create user");
      }
    });
  }
}

function parseStats(statsText) {
  const lines = statsText.split(/\r?\n/);
  let accesses = 0, hits = 0, misses = 0;
  lines.forEach(line => {
    const [key, val] = line.split(":").map(s => s && s.trim());
    if (!key || !val) return;
    const num = parseFloat(val);
    if (key.toLowerCase() === "accesses") accesses = num;
    if (key.toLowerCase() === "hits") hits = num;
    if (key.toLowerCase() === "misses") misses = num;
  });
  return { accesses, hits, misses };
}

function updateChartsFromStats(statsText) {
  const { hits, misses } = parseStats(statsText);
  const ctx = document.getElementById("hit-miss-chart");
  if (!ctx) return;

  const data = {
    labels: ["Hits", "Misses"],
    datasets: [{
      label: "Count",
      data: [hits, misses],
      backgroundColor: ["#3bd779", "#f05959"],
      borderColor: ["#2aa75a", "#c64040"],
      borderWidth: 1
    }]
  };

  if (hitMissChart) {
    hitMissChart.data = data;
    hitMissChart.update();
  } else if (window.Chart) {
    hitMissChart = new Chart(ctx, {
      type: "bar",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: "#fbecec" } },
          y: { ticks: { color: "#fbecec" } }
        }
      }
    });
  }
}

// ----------------------------------------------------
// DIAGRAM & LOGIC (UPDATED FOR INTERACTIVE CIRCUIT)
// ----------------------------------------------------

async function loadDiagram() {
    // This fetches the ASCII diagram for the "Logic Diagram" tab.
    try {
        const data = await api("/api/logic_diagram");
    } catch(e) {
        console.log("Diagram load check skipped or failed");
    }
}

function updateLogicDiagramFromRow(tr) {
  // 1. Get Data from the clicked row
  const addr = tr.dataset.addr || "?";
  const tag = tr.dataset.tag || "?";
  const set = tr.dataset.set || "?";
  
  // Convert strings to integers (0 or 1)
  const validBit = parseInt(tr.dataset.valid || "0", 10);
  const tagMatchBit = parseInt(tr.dataset.tagmatch || "0", 10);
  
  // Logic Calculation: Hit = Valid AND TagMatch
  const isAndActive = (validBit === 1 && tagMatchBit === 1) ? 1 : 0;
  const isMuxActive = isAndActive;
  const resultText = isAndActive ? "HIT" : "MISS";

  // 2. Update Header Text
  const header = document.getElementById("logic-header");
  if (header) {
    header.innerHTML = `Address: <span style="color:#fff">${addr}</span> &rarr; Tag: ${tag} | Set: ${set}`;
  }

  // 3. Helper to update visual state
  function updateVisual(elementId, valueDisplay, isActive) {
    const el = document.getElementById(elementId);
    const textEl = document.getElementById(elementId.replace('box', 'val')); 
    
    if (el) {
      if (isActive) el.classList.add("active");
      else el.classList.remove("active");
    }
    if (textEl) {
      textEl.textContent = valueDisplay;
    }
  }

  // 4. Update Boxes
  updateVisual("box-tag", tagMatchBit, tagMatchBit === 1);
  updateVisual("box-valid", validBit, validBit === 1);
  updateVisual("box-and", isAndActive, isAndActive === 1);
  updateVisual("box-mux", isMuxActive, isMuxActive === 1);
  updateVisual("box-out", resultText, isAndActive === 1);

  // 5. Update Wires (SVG Paths)
  function setWire(pathId, isActive) {
    const path = document.getElementById(pathId);
    if (path) {
      if (isActive) path.classList.add("active");
      else path.classList.remove("active");
    }
  }

  setWire("path-tag", tagMatchBit === 1);
  setWire("path-valid", validBit === 1);
  setWire("path-and", isAndActive === 1);
  setWire("path-mux", isMuxActive === 1);
}

function setupLogicTab() {
  const resultsArea = document.getElementById("hierarchy-results");
  const runBtn = document.getElementById("btn-run-hierarchy");

  if (runBtn) {
    runBtn.addEventListener("click", async () => {
      if (!resultsArea) return;
      resultsArea.textContent = "Running hierarchy demo...";
      try {
        const data = await api("/api/hierarchy_demo");
        if (data.ok) {
          const l1 = data.l1_text || "";
          const l2 = data.l2_text || "";
          resultsArea.textContent = l1 + "\n\n" + l2;
        } else {
          resultsArea.textContent = data.error || "Hierarchy demo failed";
        }
      } catch (e) {
        resultsArea.textContent = e.error || "Hierarchy demo request failed";
      }
    });
  }

  // Load initial diagram info
  loadDiagram();
}

function animateNeon() {
  const words = [
    document.getElementById("word-cache"),
    document.getElementById("word-memory"),
    document.getElementById("word-sim")
  ].filter(w => w !== null);

  if (words.length === 0) return;
  let stage = 0;

  function step() {
    words.forEach(w => {
      w.classList.remove("neon-stage-1", "neon-stage-2");
    });
    const totalWords = words.length;
    const curIndex = stage % (totalWords * 2);
    const wordIndex = Math.floor(curIndex / 2);
    const sub = curIndex % 2;

    if(wordIndex < totalWords) {
        for (let i = 0; i < wordIndex; i++) {
        words[i].classList.add("neon-stage-1");
        }
        words[wordIndex].classList.add(sub === 0 ? "neon-stage-1" : "neon-stage-2");
    }

    stage++;
    if (stage > totalWords * 2 + 2) {
      stage = 0;
    }
    setTimeout(step, 340);
  }
  setTimeout(step, 300);
}

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  setupLogin();
  setupLogout();
  setupTabs();
  setupSimulation();
  setupVerilog(); 
  setupWaveform(); 
  setupAdmin();
  setupLogicTab();
  animateNeon();
});