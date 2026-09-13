# CacheMap — Cache Memory Simulator & Hardware Verifier

An interactive, executive-grade computer architecture simulation, hardware verification, and DevOps monitoring platform. **CacheMap** combines high-precision software cache state modeling with cycle-accurate Verilog hardware verification, automated memory trace generation, 32-bit address decomposition, real-time AMAT analytics, and a full observability stack (Docker, Nginx, Prometheus, Grafana).

---

## Proposed System Architecture

```mermaid
flowchart TD
    %% ==========================================================
    %% CLIENT-SIDE REQUIREMENTS (Dashed Cyan Border)
    %% ==========================================================
    subgraph ClientSide["Client-Side Requirements (Interactive Frontend Workstation)"]
        UI_Nav["Top Bar Telemetry & AMAT Monitor"]
        UI_Inspector["Interactive Step-by-Step Cache Inspector<br/>(Sets, Ways, LRU Status, Hit/Miss Highlight)"]
        UI_Decoder["32-Bit Address Decoder<br/>[ Tag Bits | Set Index | Block Offset ]"]
        UI_SeqGen["Synthetic Memory Trace Generator<br/>(Spatial, Temporal, Matrix, Thrash, Random)"]
        UI_Circuit["Interactive Hardware Logic Circuit<br/>(Tag Comparator ==, Valid Gate, AND, MUX)"]
        UI_Analytics["Performance Analytics & AMAT Calculator<br/>(Chart.js Hit Rate Timeline & Sliders)"]
        UI_Waveform["WaveDrom Timing Waveform Visualizer"]
    end

    %% ==========================================================
    %% SERVER-SIDE REQUIREMENTS (Dashed Emerald Border)
    %% ==========================================================
    subgraph ServerSide["Server-Side Requirements (Python & Hardware Engine)"]
        WSGI_App["Flask / WSGI Server<br/>(web_backend.py & wsgi.py)"]
        API_Auth["HMAC-SHA256 User Database<br/>(users.json, users.hmac, app_secret.bin)"]
        Cache_Sim["Cycle & Step Cache Simulator<br/>(Single-Level & L1/L2/DRAM Hierarchy)"]
        Seq_Engine["Trace Generator Engine<br/>(Stride, Matrix, Conflict Calculations)"]
        Verilog_Runner["Hardware Verification Engine<br/>(Icarus Verilog + Emulation Fallback)"]
        VCD_Gen["VCD Waveform File Generator<br/>(cache_waveform.vcd)"]
    end

    %% ==========================================================
    %% CLOUD & DEVOPS INFRASTRUCTURE (Dashed Purple Border)
    %% ==========================================================
    subgraph DevOpsInfra["DevOps & Cloud Infrastructure Requirements"]
        Reverse_Proxy["Nginx Reverse Proxy (:8080 -> :8000)"]
        Prometheus_Mon["Prometheus Metrics Scraping (:9090)"]
        Grafana_Dash["Grafana Telemetry Dashboard (:3000)"]
        Docker_Container["Docker Containerization & Render Blueprint"]
        CI_Pipeline["GitHub Actions CI/CD Pipeline"]
    end

    %% Connectors
    UI_Nav --> WSGI_App
    UI_SeqGen --> Seq_Engine
    Seq_Engine --> UI_Inspector
    UI_Inspector --> Cache_Sim
    Cache_Sim --> UI_Decoder
    Cache_Sim --> UI_Circuit
    Cache_Sim --> UI_Analytics
    WSGI_App --> API_Auth
    WSGI_App --> Cache_Sim
    WSGI_App --> Verilog_Runner
    Verilog_Runner --> VCD_Gen
    VCD_Gen --> UI_Waveform

    Reverse_Proxy --> WSGI_App
    WSGI_App --> Prometheus_Mon
    Prometheus_Mon --> Grafana_Dash
    Docker_Container --> Reverse_Proxy
    CI_Pipeline --> Docker_Container

    %% Subgraph Styles with Dashed Borders & Colorful Fills
    style ClientSide fill:#0b192c,stroke:#38bdf8,stroke-width:3px,stroke-dasharray: 6 6,color:#38bdf8
    style ServerSide fill:#062d22,stroke:#10b981,stroke-width:3px,stroke-dasharray: 6 6,color:#10b981
    style DevOpsInfra fill:#1c1033,stroke:#a855f7,stroke-width:3px,stroke-dasharray: 6 6,color:#c084fc

    %% Node Styles
    style UI_Nav fill:#0f2b48,stroke:#38bdf8,color:#f8fafc
    style UI_Inspector fill:#0f2b48,stroke:#38bdf8,color:#f8fafc
    style UI_Decoder fill:#0f2b48,stroke:#38bdf8,color:#f8fafc
    style UI_SeqGen fill:#0f2b48,stroke:#38bdf8,color:#f8fafc
    style UI_Circuit fill:#0f2b48,stroke:#38bdf8,color:#f8fafc
    style UI_Analytics fill:#0f2b48,stroke:#38bdf8,color:#f8fafc
    style UI_Waveform fill:#0f2b48,stroke:#38bdf8,color:#f8fafc

    style WSGI_App fill:#064e3b,stroke:#10b981,color:#f8fafc
    style API_Auth fill:#064e3b,stroke:#10b981,color:#f8fafc
    style Cache_Sim fill:#064e3b,stroke:#10b981,color:#f8fafc
    style Seq_Engine fill:#064e3b,stroke:#10b981,color:#f8fafc
    style Verilog_Runner fill:#064e3b,stroke:#10b981,color:#f8fafc
    style VCD_Gen fill:#064e3b,stroke:#10b981,color:#f8fafc

    style Reverse_Proxy fill:#3b0764,stroke:#a855f7,color:#f8fafc
    style Prometheus_Mon fill:#3b0764,stroke:#a855f7,color:#f8fafc
    style Grafana_Dash fill:#3b0764,stroke:#a855f7,color:#f8fafc
    style Docker_Container fill:#3b0764,stroke:#a855f7,color:#f8fafc
    style CI_Pipeline fill:#3b0764,stroke:#a855f7,color:#f8fafc
```

---

## Core Capabilities

- **Interactive Step-by-Step Cache Inspector**:
  - Time-travel debugging with Play, Pause, Step Next, Step Prev, and scrubber controls.
  - Visual matrix of Cache Sets and Associative Ways showing Valid, Dirty, Tag, and LRU eviction status with live Hit (emerald) and Miss (rose) highlights.
- **Automated Memory Sequence Generator & Benchmarks**:
  - Spatial Locality / Sequential Stride (contiguous array scans).
  - Temporal Locality Loop (tight loops over working sets).
  - Matrix Row-Major vs Column-Major Traversals (cache locality optimization demonstrations).
  - Cache Conflict & Set Thrashing (targeted collision generator).
  - Uniform Random Distribution.
  - Custom stride, address boundary, and read/write ratio configurations with 1-click load and export.
- **32-Bit Address Bit Decoder**:
  - Real-time bit slicing into `[ Tag Bits | Set Index Bits | Block Offset Bits ]`.
  - Binary and hexadecimal representations synchronized with active cache geometry.
- **Interactive Hardware Logic Circuit**:
  - Dynamic vector schematic showing Tag Comparator (`==`), Valid Bit Gate, Hit Decision AND Gate, and Output MUX with animated signal propagation.
- **Performance Telemetry & AMAT Calculator**:
  - Cumulative hit rate convergence curves and hit/miss distribution charts.
  - Interactive AMAT parameter sliders for Hit Time and DRAM Miss Penalty.
- **Multi-Level Hierarchy Simulation**:
  - Multi-tier pipeline model: L1 Cache (32KB, 4-Way) -> L2 Cache (256KB, 8-Way) -> DRAM with Write-Back accounting.
- **Hardware Verilog Verification & Waveforms**:
  - Server-side compilation of IEEE-1364 Verilog modules (`cache_sim_tb.v`, `cache_logic.v`) using Icarus Verilog with cycle-accurate software emulation fallback.
  - Embedded WaveDrom digital timing diagrams and raw `.vcd` waveform export.
- **Cryptographic Security**:
  - PBKDF2-HMAC-SHA256 user database integrity verification (`users.hmac`) with 32-byte secret key and session tokens.

---

## DevOps Stack & Observability

| Component | Role | Config file |
|---|---|---|
| **GitHub Actions** | CI: test + Docker build gate | `.github/workflows/deploy.yml` |
| **Docker** | Multi-stage production container with `iverilog` | `Dockerfile` |
| **Docker Compose** | Orchestrates Flask + Nginx + Prometheus + Grafana | `docker-compose.yml` |
| **Nginx** | Reverse proxy / public entrypoint (:8080) | `nginx/nginx.conf` |
| **Prometheus** | Metrics scraping from `/metrics` (:9090) | `prometheus/prometheus.yml` |
| **Grafana** | Real-time analytics dashboard (:3000) | `grafana/` |
| **Render Cloud** | PaaS 1-click blueprint deployment | `render.yaml` |

---

## Quick Start (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/Sarvagya-24-chaturvedi/Cache-Memory-Simulator.git
cd Cache-Memory-Simulator
```

### 2. Set Up Virtual Environment & Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r cms/requirements.txt
```

### 3. Run the Application
```bash
cd cms
python web_backend.py
```
Open your browser and navigate to `http://127.0.0.1:8000` (or `http://127.0.0.1:5050`).

- **Default Administrator**: `admin` / `admin`
- **Guest Access**: Click "Explore as Guest (Instant Access)" for 1-click frictionless access.

---

## Production Deployment

### Option 1: Docker (Recommended)
Build and run the containerized application with integrated Icarus Verilog:
```bash
cd cms
docker build -t cache-simulator .
docker run -p 8000:8000 cache-simulator
```

### Option 2: Docker Compose (Full Stack with Prometheus & Grafana)
```bash
cd cms
docker compose up -d
```
- Web Application: `http://localhost:8080`
- Prometheus Metrics: `http://localhost:9090`
- Grafana Dashboard: `http://localhost:3000`

### Option 3: Cloud PaaS (Render / Railway / Fly.io / Heroku)
The repository includes standard deployment manifests:
- `render.yaml`: 1-click Render blueprint deployment.
- `Procfile`: WSGI entrypoint for Railway, Heroku, or Fly.io (`gunicorn --chdir cms wsgi:app`).
- `cms/wsgi.py`: Production WSGI wrapper.

---

## Testing & Verification

Run the automated test suite:
```bash
cd cms
python -m unittest discover -s tests
```

---

## Project Structure

```text
Cache-Memory-Simulator/
├── Procfile                    # Cloud PaaS WSGI entrypoint
├── render.yaml                 # Render cloud deployment blueprint
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI test and Docker build workflow
├── cms/
│   ├── Dockerfile              # Multi-stage production container with iverilog
│   ├── docker-compose.yml      # Full monitoring stack (Nginx + Prometheus + Grafana)
│   ├── requirements.txt        # Pinned Python dependencies
│   ├── web_backend.py          # Flask backend, simulation engines, & API routes
│   ├── wsgi.py                 # WSGI application wrapper
│   ├── cache_logic.v           # Verilog hardware module
│   ├── cache_sim_tb.v          # Verilog testbench
│   ├── static/
│   │   ├── style.css           # Executive dark slate design system
│   │   └── app.js              # Interactive client, step controller, & charts
│   ├── templates/
│   │   └── index.html          # Modular workstation layout
│   └── tests/
│       └── test_app.py         # Automated test suite
└── README.md
```

---

## License
MIT License.
