# Cache-Memory-Simulator
A secure Cache Memory Simulator (Web Edition)
# CacheMap Web Simulator 
**CacheMap** is a full-stack educational tool designed to visualize and simulate CPU Cache Memory behavior. It combines a flexible **Python software simulator** with real **Verilog hardware simulation**, providing a comprehensive environment for understanding computer architecture concepts like Hit/Miss logic, Replacement Policies (LRU, FIFO), and Hierarchical Caching (L1/L2).

## 📸 Interface Screenshots

### 1. Main Dashboard
*Configure cache parameters, upload trace files, and view real-time hit/miss statistics.*
![Main Dashboard](Assets/Simulation%20run.png)

### 2. Interactive Logic Diagram
*Visualizes the hardware logic for Hit/Miss detection. Wires light up (green/red) based on the selected Truth Table row.*
![Logic Diagram for Miss](Assets/Logic%20Circuit%201.jpg)
![Logic Diagram for Hit](Assets/Logic%20Circuit%202.jpg)

### 3. Hardware Verification (Verilog)
*Shows the raw output logs from the Icarus Verilog simulation running on the server.*
![Verilog Logs](Assets/Hardware%20Simulation%20logs%20(Verilog%20TestBench).jpg)

**For examining other screenshots visit the Assets folder**(https://github.com/Sarvagya-24-chaturvedi/Cache-Memory-Simulator/tree/main/Assets)

## 🚀 Key Features

* **Dual Simulation Engine:**
    * **Software Mode:** Instant simulation of cache behavior using Python. Supports variable cache sizes, block sizes, associativity, and replacement policies.
    * **Hardware Mode:** Compiles and runs actual **Verilog** testbenches on the server using **Icarus Verilog**, generating accurate timing diagrams.
* **Interactive Visualizations:**
    * **Logic Diagram:** A dynamic SVG circuit that lights up to show how Tag Matches, Valid bits, and AND/MUX gates determine a Hit or Miss.
    * **Waveform Viewer:** Integrated **WaveDrom** viewer for digital timing analysis directly in the browser.
* **Hierarchy Demo:** Simulates the interaction between L1 Cache, L2 Cache, and Main Memory.
* **Secure Admin Panel:** Manage users and view obfuscated activity logs.
* **Tamper-Proof Security:** Uses HMAC (Hash-based Message Authentication Code) to ensure user data integrity.

---

## 🛠️ Prerequisites

Before running the application, ensure you have the following installed:

### 1. Python (Backend)
Required to run the Flask server.
* [Download Python](https://www.python.org/downloads/)

### 2. Icarus Verilog (Hardware Simulation)
Required to compile the Verilog (`.v`) files.
* **Windows:** [Download Icarus Verilog](https://bleyer.org/icarus/) (Ensure you add it to your system PATH during installation).
* **Linux:** `sudo apt-get install iverilog`
* **macOS:** `brew install icarus-verilog`

### 3. GTKWave (Optional)
Recommended if you want to download and view the `.vcd` waveform files offline.

---

## 📦 Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/Sarvagya-24-chaturvedi/Cache-Memory-Simulator.git](https://github.com/Sarvagya-24-chaturvedi/Cache-Memory-Simulator.git)
    cd Cache-Memory-Simulator
    ```

2.  **Install Python Dependencies**
    ```bash
    pip install flask
    ```

3.  **Run the Application**
    ```bash
    python app.py
    ```

4.  **Access the Dashboard**
    Open your browser and navigate to:
    `http://127.0.0.1:5000`

    * **Default Admin Credentials:**
        * **Username:** `admin`
        * **Password:** `admin`
    * *(Note: Change these immediately after logging in for the first time)*

---

## 🔐 Security System & Auto-Generated Files

This application implements a file-based integrity system to secure user data. When you run the application for the first time, the following critical files will be **automatically created** in the root directory:

1.  **`app_secret.bin`**
    * **What it is:** A cryptographically strong random binary key (32 bytes).
    * **Usage:** This key is used to sign the session tokens and compute the HMAC for the user database.
    * **Important:** **DO NOT DELETE** this file. If deleted, all existing user sessions and the user database integrity check will fail.

2.  **`users.json`**
    * **What it is:** The database storing user credentials (usernames, hashed passwords, and roles).
    * **Usage:** It acts as the persistent storage for the login system.

3.  **`users.hmac`**
    * **What it is:** A text file containing a SHA-256 hash signature of the `users.json` file.
    * **Usage:** Every time the application loads, it calculates the hash of `users.json` using the `app_secret.bin`. It compares this new hash with the content of `users.hmac`.
    * **Why?** This prevents manual tampering. If someone manually edits `users.json` to change their role to "admin", the hashes won't match, and the secure system will reject the data to prevent unauthorized access.

---

## 📂 Project Structure

```text
CacheMap-Simulator/
├── app.py                 # Main Flask server & API logic
├── binary_store.py        # Helper module for binary file operations
├── cache_logic.v          # Verilog module: Cache Controller & Hit Logic
├── cache_sim_tb.v         # Verilog testbench: Generates signals & waveforms
├── app_secret.bin         # (Auto-generated) Security key
├── users.json             # (Auto-generated) User database
├── users.hmac             # (Auto-generated) Integrity signature
├── static/
│   ├── style.css          # The Neon/Cyberpunk theme styles
│   └── app.js             # Frontend logic (Charts, WaveDrom, API calls)
└── templates/
    └── index.html         # Main dashboard interface
```
## 🎮 How to Use
1. **Software Simulation**

 - Upload a .txt sequence file (e.g., read 4 0x10, write 4 0x20).
 - Set Cache Size, Block Size, and Associativity.
 - Click Run Simulation.
 - View results in the Results tab (Hit Rate, Misses) and interact with the Logic Diagram.

2. **Hardware (Verilog) Simulation**

 - Click Run Verilog TB in the left panel.
 - The server compiles cache_logic.v and cache_sim_tb.v.
 - Go to the Hardware (Logs) tab to see the terminal output.
 - Go to the Waveform Viewer tab to see the timing diagram visualized.
 - (Optional) Download the .vcd file to view in GTKWave.

## 📝 License
This project is open-source and available under the MIT License.
