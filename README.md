# Logisim Pro 🚀

[![CI Tests](https://img.shields.io/badge/Tests-616%20Passed-brightgreen.svg)](https://github.com/isaacbel/logisim-pro)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF.svg)](https://vitejs.dev/)
[![Electron](https://img.shields.io/badge/Electron-31.0-47848F.svg)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Logisim Pro** is a modern, high-performance digital logic simulator, computer architecture learning laboratory, and Boolean optimization suite. Built from the ground up with **React 18**, **TypeScript**, **HTML5 Canvas 2D**, and multi-threaded **Web Worker** simulation pipelines, it is designed for students, educators, and hardware engineers.

Available both as a responsive web application and as a native desktop application powered by **Electron**.

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [Feature Showcase](#-feature-showcase)
  - [1. Digital Logic Simulator](#1-digital-logic-simulator)
  - [2. Boolean Algebra & K-Map Optimizer](#2-boolean-algebra--k-map-optimizer)
  - [3. Finite State Machine (FSM) Designer](#3-finite-state-machine-fsm-designer)
  - [4. Intel 8086 Architecture Laboratory](#4-intel-8086-architecture-laboratory)
  - [5. Number Systems & Binary Arithmetic Lab](#5-number-systems--binary-arithmetic-lab)
- [System Architecture](#-system-architecture)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Server](#development-server)
  - [Running Unit & Regression Tests](#running-unit--regression-tests)
  - [Building for Production](#building-for-production)
  - [Packaging Desktop App (Electron)](#packaging-desktop-app-electron)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [License](#-license)

---

## ✨ Key Highlights

- ⚡ **Multi-Threaded Simulation**: The simulation engine runs in an isolated Web Worker via Comlink, keeping the 60 FPS UI smooth and responsive even with complex synchronous or asynchronous circuits.
- 📐 **Orthogonal Wire Routing**: Intelligent Manhattan grid A* pathfinding ensures clean, collision-free wire paths that adapt dynamically when components are dragged.
- 🗺️ **Comprehensive K-Map Engine**: Full Karnaugh Map solving for 2, 3, 4, 5, and 6 variables with prime implicant detection and don't-care ($X$) optimization.
- 🖥️ **Cycle-Accurate 8086 Emulation**: Interactive visualization of registers, flags, memory segmentation, BIU/EU datapath, and a built-in step debugger.
- 🔒 **Safe & Robust**: Over **616 automated unit and regression tests** verifying arithmetic accuracy, hazard detection, memory safety, and IPC path confinement.

---

## 🌟 Feature Showcase

### 1. Digital Logic Simulator
- **Component Library**:
  - **Gates**: AND, OR, NOT, NAND, NOR, XOR, XNOR, Tri-state Buffer.
  - **Sequential Logic**: Edge-triggered D Flip-Flop, JK Flip-Flop, T Flip-Flop, SR Latch, Register Banks, Binary Counters.
  - **Multiplexers & Decoders**: 2-to-1, 4-to-1, 8-to-1 MUX, Demultiplexers, Priority Encoders.
  - **I/O & Indicators**: Toggle switches, Push buttons, Hex keypads, LEDs, Multi-color probes, 7-Segment displays, Clocks.
- **Interactive Canvas Engine**:
  - Pan, zoom, multi-selection, drag-and-drop, grid snapping, and copy/paste.
  - Undo/Redo history stack managed via Zustand.
  - Oscilloscope and Digital Waveform Viewer for signal inspection over time.
  - Hierarchical subcircuit support and clean JSON project import/export with schema validation.

### 2. Boolean Algebra & K-Map Optimizer
- **Karnaugh Map (K-Map) Engine**:
  - Solves 2 to 6 variable functions.
  - Visual prime implicant grouping with color-coded loops.
  - Supports Sum of Products (SOP) and Product of Sums (POS).
  - Handles **Don't-Care** states ($X$) for optimal logic minimization.
- **Algorithmic Solvers**:
  - **Quine-McCluskey** tabular reduction and **Petrick's Method** for finding essential prime implicants.
  - AST Boolean parser with operator precedence (`AND`, `OR`, `NOT`, `XOR`, `NAND`, `NOR`).
  - Automatic truth table generator directly from canvas circuits.
- **Formal Verification & Hazard Detection**:
  - **Hazard Analyzer**: Detects Static-1, Static-0, and dynamic hazards due to gate propagation delays.
  - Circuit equivalence verifier ensuring simplified expressions match original schematics.

### 3. Finite State Machine (FSM) Designer
- **Visual Graph Modeling**:
  - Create and edit states, transitions, input conditions, and output signals.
  - Supports both **Mealy** (output depends on state + input) and **Moore** (output depends on state only) models.
- **State Minimization**:
  - Integrated Moore's partition refinement algorithm to eliminate equivalent/redundant states.
- **Synthesis & Hardware Generation**:
  - State encoding strategies: **Binary**, **Gray code**, and **One-Hot**.
  - Derives excitation tables and Boolean equations for D, JK, and T flip-flops.
  - One-click synthesis of logic schematics from FSM graphs.

### 4. Intel 8086 Architecture Laboratory
- **Processor Datapath Visualization**:
  - Visual separation of the **Bus Interface Unit (BIU)** and **Execution Unit (EU)**.
  - Real-time 6-byte prefetch instruction queue visualization.
  - 16-bit ALU operation visualizer with internal bus routing.
- **Register & Memory Systems**:
  - General purpose registers: `AX` (`AH`/`AL`), `BX`, `CX`, `DX`.
  - Pointer & Index registers: `SP`, `BP`, `SI`, `DI`, `IP`.
  - Segment registers: `CS`, `DS`, `SS`, `ES`.
  - **Segment:Offset** 20-bit real-mode physical address calculation (`Physical = Segment × 16 + Offset`).
  - Complete 16-bit Flags register (`CF`, `PF`, `AF`, `ZF`, `SF`, `TF`, `IF`, `DF`, `OF`).
- **Assembly IDE & Debugger**:
  - Integrated 8086 Assembler supporting standard mnemonics (`MOV`, `ADD`, `SUB`, `CMP`, `JMP`, conditional jumps, stack operations, string operations, interrupts).
  - Step-by-step execution, breakpoints, cycle counter, and call stack visualizer.
  - Interactive challenge labs and practice exercises.

### 5. Number Systems & Binary Arithmetic Lab
- **Base Conversions**: Convert dynamically between Binary, Octal, Decimal, Hexadecimal, BCD, Gray Code, and Excess-3.
- **Signed Number Formats**: Compare Sign-Magnitude, 1's Complement, and 2's Complement with overflow/underflow warnings.
- **IEEE-754 Floating-Point Visualizer**:
  - Inspect Single (32-bit) and Double (64-bit) precision formats.
  - Visual bit-breakdown of Sign ($s$), Exponent ($e$ with bias 127/1023), and Mantissa ($m$).
  - Special values support: Subnormal numbers, $+0$, $-0$, $+\infty$, $-\infty$, and NaN.
- **Fixed-Point Lab**: Configure $Q_{m.n}$ fractional representations, precision limits, and rounding modes.
- **ALU Algorithms**: Step-by-step interactive demonstrations of **Booth's Multiplication Algorithm**, **Restoring/Non-Restoring Division**, and Carry-Lookahead adders.

---

## 🏗️ System Architecture

```
                                  +---------------------------------------+
                                  |         React 18 User Interface       |
                                  | (Zustand Store / Framer Motion / UI)  |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
          +-----------------------------+                           +-----------------------------+
          |       Canvas 2D Engine      |                           |   Architecture Labs & FSM   |
          |  - Component Layout         |                           |  - 8086 CPU Emulation       |
          |  - Spatial Indexing (AABB)  |                           |  - K-Map & Boolean Engine   |
          |  - A* Orthogonal Router     |                           |  - FSM Synthesizer          |
          +--------------+--------------+                           +-----------------------------+
                         |
                         v (Actor / Message RPC)
          +-----------------------------+
          |   Comlink Web Worker Pool   |
          |  - Event-driven simulation  |
          |  - Non-blocking tick loop   |
          |  - Gate propagation delays  |
          +-----------------------------+
```

- **State Management**: Zustand single source of truth stores circuit topology, selection, viewport transform, and history. Canvas components subscribe reactively without unnecessary re-renders.
- **Simulation Concurrency**: Web Worker isolation ensures heavy simulations never drop frames on the main thread.
- **Desktop Wrapper**: Electron main process provides native window chrome, file dialogs, and OS-confined file system access.

---

## 📂 Project Directory Structure

```
logisim-pro/
├── assets/                 # Brand assets, icons, and graphics
├── electron/               # Electron main process & IPC handlers
├── public/                 # Static web assets
├── src/
│   ├── architecture/       # Computer Architecture Laboratory
│   │   ├── components/     # Specialized educational UI components
│   │   ├── engine/         # 8086 CPU, ALU, FSM minimization, IEEE-754 engines
│   │   ├── fsm/            # FSM designer, layout, auto-router, canvas
│   │   └── pages/          # Architecture labs (CPU, Datapath, ALU, Memory, etc.)
│   ├── core/               # ECS utilities, project serialization, migration
│   ├── engine/             # Digital logic simulation core
│   │   ├── analysis/       # Boolean laws, truth tables, K-Maps, hazards
│   │   ├── routing/        # Orthogonal A* wire router
│   │   └── spatial/        # Spatial indexing (AABB trees)
│   ├── renderer/           # Canvas 2D rendering pipeline
│   ├── state/              # Zustand stores, selectors, actions
│   ├── ui/                 # Toolbar, sidebar, modals, properties panel
│   └── workers/            # Simulation Web Worker implementation
├── tests/
│   ├── e2e/                # Playwright end-to-end test suites
│   ├── regression/         # Security and bugfix regression tests
│   └── unit/               # 49 test files / 616 Vitest unit tests
├── electron-builder.json5  # Packaging configuration for Windows / Portable
├── vite.config.ts          # Vite build configuration
└── package.json            # Project dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

```bash
git clone https://github.com/isaacbel/logisim-pro.git
cd logisim-pro
npm install
```

### Development Server

Start the local Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Unit & Regression Tests

Run the full suite of **616 Vitest unit tests**:

```bash
npm test -- --run
```

To run Playwright End-to-End (E2E) tests:

```bash
npm run test:e2e
```

### Building for Production

To build the static web application bundle:

```bash
npm run build:web
```
The optimized bundle will be generated in `dist/`.

### Packaging Desktop App (Electron)

Build native Windows installers or standalone portable executables:

```bash
# Build Windows NSIS installer
npm run dist:win

# Build standalone portable executable (no install required)
npm run dist:portable

# Build all packages
npm run dist:all
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl` + `Z` | Undo last action |
| `Ctrl` + `Y` / `Ctrl` + `Shift` + `Z` | Redo action |
| `Ctrl` + `C` | Copy selected components |
| `Ctrl` + `V` | Paste components at cursor |
| `Delete` / `Backspace` | Delete selected component or wire |
| `Space` | Toggle simulation Run / Pause |
| `F10` | Single step simulation clock |
| `Ctrl` + `S` | Save project JSON |
| `Ctrl` + `O` | Open project file |
| `Ctrl` + `Scroll` | Zoom in / Zoom out canvas |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Crafted with ❤️ by <a href="https://github.com/isaacbel">BELATRACHE ISHAK (isaacbel)</a>
</p>
