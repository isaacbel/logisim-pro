# LOGISIM PRO v2.0 — ARCHITECTURE AUDIT (P0 / P1 / P2 / P3)

**Deliverable for PHASE 1.** Companion to [`V2_BASELINE.md`](V2_BASELINE.md) (measured build/test
state) and [`FULL_ARCHITECTURE_AUDIT.md`](FULL_ARCHITECTURE_AUDIT.md) (the earlier, deeper
CRITICAL/HIGH/MEDIUM/LOW pass). This document re-categorises every finding into the requested
**P0 / P1 / P2 / P3** priority scheme and adds eight findings discovered after that first document
was written.

## Evidence legend

| Mark | Meaning |
|---|---|
| ⚙️ **PROVEN** | Reproduced by executing the real code and capturing output. Output is quoted. |
| 📄 **READ** | Established by reading the source; mechanism quoted. Not executed. |
| ❓ **UNVERIFIED** | Hypothesis only. Must be confirmed before any code is changed for it. |

Nothing in this document is inferred from a feature's name or from a UI label. Two hypotheses from
the earlier pass were **disproven** by probing and are recorded as such in §6 of
`FULL_ARCHITECTURE_AUDIT.md`; a third was disproven during this pass and is recorded in §7 below.

---

# P0 — CRITICAL (fix first; blocks correctness, security, or release)

### P0-1 · ~~`npm install` fails on a clean tree~~ — ✅ **FIXED** (verified)
📄 **READ** + ⚙️ **PROVEN** (exit 1 captured in `V2_BASELINE.md` §2) → resolved, see §11 Δ1 there

`eslint-plugin-react-refresh@0.5.3` peer-required `eslint@^9 || ^10`; the project pins
`eslint@^8.57.0` and `@typescript-eslint/*@^7`. The existing `node_modules` only existed because an
earlier install was forced.

*Fix applied:* downgraded `eslint-plugin-react-refresh` → `^0.4.7` and `eslint-plugin-react-hooks`
→ `^4.6.2`, keeping eslint 8 + `@typescript-eslint@7`. `npm install` now exits 0 with no flags, and
the production bundle hashes came out **byte-identical** to the baseline.

**Follow-on decision required — deliberately NOT taken unilaterally.** `npm audit` still reports 14
advisories (2 critical, 10 high) whose only fixes are major-version jumps:

| Advisory | Fix offered | Risk |
|---|---|---|
| `tar` **CRITICAL** + `app-builder-lib` / `builder-util` / `dmg-builder` / `electron-builder` HIGH | `electron-builder 24 → 26.15.3` | breaking; all packaging must be re-verified |
| `vitest` **CRITICAL** | `vitest 1 → 4.1.11` | breaking; would run the 554-test contract on a new runner |
| `vite` HIGH | `vite 5 → 8.2.2` | breaking build config |
| `electron` HIGH (`<= 40.10.2`) | `electron 31 → 44` | 13 major versions; affects the **shipped** runtime |

The `electron` advisory affects the shipped product, not just tooling, so it should not be left
indefinitely — but a 13-major-version jump is exactly what the anti-regression rule warns against.
Recommend scheduling it as its own isolated phase with full re-verification rather than as a side
effect of another fix.

---

### P0-2 · Electron IPC grants the renderer unrestricted read/write to the entire filesystem
📄 **READ** — direct violation of PHASE 35 *"Protect Electron IPC"*

`electron/main.ts`, under a comment that reads `// ── Secure Native IPC Bridges ──`:

```ts
ipcMain.handle('fs:read-file',  async (_e, filePath: string) => await fs.promises.readFile(filePath, 'utf-8'));
ipcMain.handle('fs:write-file', async (_e, filePath: string, content: string) => { await fs.promises.writeFile(filePath, content, 'utf-8'); return true; });
ipcMain.handle('fs:backup-file',async (_e, filePath: string) => { … fs.promises.copyFile(filePath, `${filePath}.bak`) … });
```

There is **no path validation, no allow-list, no directory confinement, and no size limit.**
`electron/preload.ts` exposes all three to page JavaScript via
`contextBridge.exposeInMainWorld('electronAPI', …)`. Compounding factors:

| Hardening | State |
|---|---|
| `contextIsolation` | ✅ true |
| `nodeIntegration` | ✅ false |
| `sandbox` | ❌ **false** |
| CSP | ❌ absent from `index.html` **and from `dist/index.html`** (0 occurrences) |
| Remote origins in HTML | ⚠️ `fonts.googleapis.com` ×2 |
| `will-navigate` handler | ❌ absent |
| `setWindowOpenHandler` | ❌ absent |

*Impact:* any script execution in the renderer — including one reached through a malicious `.lpro`
file or the remote font/CDN origin — can read `C:\Users\...\...` and overwrite arbitrary files.
`contextIsolation` does not mitigate this, because the capability is *intentionally exposed* through
the bridge.

*Fix direction:* confine every path to the user's project directory (resolve + verify prefix, reject
`..`, reject symlinks, reject non-`.lpro`/`.json` extensions), add a strict CSP, self-host the fonts,
add `will-navigate` + `setWindowOpenHandler` denials, and enable `sandbox: true`.

---

### P0-3 · SPLITTER, MERGER and TUNNEL are non-functional
⚙️ **PROVEN**

| Component | Probe input | Probe output | Correct output |
|---|---|---|---|
| SPLITTER (4-bit) | `IN = HIGH` | `O0=HIGH, O1=UNKNOWN, O2=UNKNOWN, O3=UNKNOWN` | all four bits driven |
| MERGER (4-bit) | `I0=H I1=L I2=H I3=H` | `OUT = HIGH` (bit 0 only) | `0b1101` |
| TUNNEL | two tunnels named `CLK` | **all UNKNOWN** — no net joining | value crosses by name |

These are core Logisim components. A student wiring a bus gets a silently wrong answer with no error
indicator. This is the highest-severity *correctness* defect found.

Probing TUNNEL additionally exposed the shared root cause below.

---

### P0-4 · `resolveAllNets` never writes back to `bidirectional` pins
⚙️ **PROVEN** (surfaced by the TUNNEL probe)

The net resolver writes resolved values back only to pins with `direction === 'input'`. Pins declared
`bidirectional` — tunnels, tri-state buses, RAM data pins — are therefore **never updated**, no
matter what drives the net. This single line is why TUNNEL is dead and is a latent defect for every
bidirectional bus in the app.

---

### P0-5 · False oscillation storm + unbounded diagnostic growth
⚙️ **PROVEN**

A minimal, perfectly legal `CLOCK → LED` circuit run for 200 ticks produced:

```
hazards = 199   oscillations = 199
first at tick 2: {"tick":2,…,"description":"Oscillation detected on pin … (2 transitions)","severity":"warning"}
```

A clock is *supposed* to transition every tick. The detector counts normal clocked activity as a
hazard, so:

1. **Diagnostics are wrong** — the UI floods with false warnings on a correct circuit, which trains
   students to ignore real warnings.
2. **Memory grows without bound** — both arrays accumulate one entry per tick forever, and the whole
   array is copied and shipped across the Comlink worker boundary **every tick**. A long simulation
   degrades and eventually exhausts memory.

*Fix direction:* exclude clock-driven pins, require transitions *within a single settle pass* (not
across ticks), and cap both arrays with a ring buffer.

---

### P0-6 · Invalid 8086 opcodes silently no-op instead of faulting
⚙️ **PROVEN**

Stepping the byte sequence `0f ff ff` yields `halted = false`, no `error` field, and no throw.
`cpu8086.ts:1215-1221`:

```ts
default: {
  disassembly  = `DB 0x${opcode.toString(16).toUpperCase()}`;
  explanation  = `Unknown opcode 0x${opcode.toString(16).toUpperCase()}. Advanced IP.`;
  ipAdvance = 1; cyclesUsed = 4; break;
}
```

The debugger then continues executing garbage and presents a plausible-looking register trace. Under
ABSOLUTE RULE #3 this is the worst category of defect: a confident wrong answer. Real 8086 raises
`INT 6` (#UD); at minimum the CPU must halt and expose an error.

---

### P0-7 · ARCHITECTURAL: multi-bit buses do not exist in the type system
📄 **READ** — root cause of P0-3, and a blocker for PHASE 6

`src/types/core.ts`:

```ts
export type BitVector = SignalValue[];   // declared … and never used by Pin or Wire
export interface Pin  { …; currentValue: SignalValue;  }   // ONE scalar
export interface Wire { …; currentValue: SignalValue;  }   // ONE scalar
```

`Pin.bitWidth`, `Wire.bitWidth` and `Wire.isBus` exist but are **decorative for simulation** — they
affect rendering and labels only. N-bit components cope by fanning out into N separate 1-bit pins
(`A0..An-1`), which is why SPLITTER/MERGER cannot work and why an 8-bit ADDER needs 26 pins.

⚠️ **This is the one place where the "prefer small change over large rewrite" rule collides with
correctness.** It must not be attacked casually. Recommended staged approach: keep `currentValue` as
the 1-bit fast path, add an *optional* `busValue?: BitVector` consulted only when `bitWidth > 1`, and
teach the resolver + SPLITTER/MERGER/TUNNEL to use it. That preserves all 545 tests and every
existing 1-bit circuit. **Do not** delete the scalar field.

---

### P0-8 · Wire model cannot express a wire-to-wire junction
📄 **READ**

```ts
export interface Wire { readonly fromPinId: string; readonly toPinId: string; … }
```

Wires are strictly point-to-point pin→pin. `Wire.junctions: Point2D[]` is drawn but carries no
electrical meaning. Nets are formed by union-find over wire endpoints *and* junction coordinates, so
a shared coordinate can join nets — but the user cannot author a T-tap on an existing wire, which is
fundamental in Logisim. Recorded as P0 because it constrains the wire-system phase (PHASE 5) that is
scheduled next; the fix is additive (allow an endpoint to reference a wire, or auto-insert an implicit
junction node), not a rewrite.

---

# P1 — HIGH (wrong behaviour or a major broken feature)

### P1-1 · Wires are silently destroyed when a component's bit width is reduced
⚙️ **PROVEN** — this is the reported *"wires disappear"* bug, and the cause is **not** `addComponent`

First, exoneration: `store.ts:343-349` `addComponent` does not touch `circuit.wires` at all, and
`updateWiresForComponents` (`store.ts:216-242`) **never drops a wire** — it re-routes segments and
returns `w` unchanged when a pin position can't be found. So *adding* a component cannot lose wires.

The real path is `updateComponentProperty` (`store.ts:406-440`). Changing a property regenerates pins
via `createPins(type, updatedProps)`, preserving IDs by **pin name**, then:

```ts
const allPinIds = new Set(updatedComponents.flatMap(c => c.pins.map(p => p.id)));
const filteredWires = circ.wires.filter(w => allPinIds.has(w.fromPinId) && allPinIds.has(w.toPinId));
```

Measured pin loss when shrinking bit width:

```
ADDER:       8bit=26 pins  4bit=14 pins  LOST = A4,A5,A6,A7,B4,B5,B6,B7,S4,S5,S6,S7
REGISTER:    8bit=18 pins  4bit=10 pins  LOST = D4,D5,D6,D7,Q4,Q5,Q6,Q7
SPLITTER:    8bit= 9 pins  4bit= 5 pins  LOST = O4,O5,O6,O7
MULTIPLEXER: 8bit= 4 pins  4bit= 4 pins  LOST = (none)
```

Every wire attached to a lost pin is deleted **with no warning, no undo hint, and no count**. Nudging
a bit-width spinner from 8 to 4 can wipe twelve connections at once.

The filter itself is defensible (the pin genuinely no longer exists) and the ID-preservation-by-name
logic is sound — I probed all 52 component types across three property sets and found **zero
duplicate pin names**, so name-keyed ID reuse cannot collide. The defect is the *silence*: the user
must be told what will be disconnected, ideally before it happens.

*Fix direction:* count the wires that would be dropped, surface a confirmation or an undoable toast
naming the affected pins, and add `tests/regression/regression_wire_disappears.test.ts` asserting
(a) `addComponent` preserves all wires, (b) move/rotate preserve all wires, (c) width *increase*
preserves all wires, (d) width *decrease* drops exactly the wires on removed pins and no others.

---

### P1-2 · Requested wire routing style is discarded for every wire in every real circuit
⚙️ **PROVEN** — mechanism confirmed at `wireRouter.ts:78-105`

```ts
// Obstacle avoidance routing
if (obstacles && obstacles.length > 0) {
  const obstaclePath = routeWithObstacleAvoidance({x:fx,y:fy}, {x:tx,y:ty}, obstacles, gridSize);
  if (obstaclePath.length > 0) return obstaclePath;   // ← returns BEFORE the switch(style)
}
switch (style) { case 'vertical-first': … case 'z-shape': … default: /* h-first */ }
```

The obstacle branch runs whenever the obstacle list is non-empty — **regardless of whether any
obstacle is anywhere near the route** — and `routeWithObstacleAvoidance` ends with
`return simplifySegments(hFirst)`, so it effectively always returns a non-empty horizontal-first
path. The `switch` is unreachable in practice.

Proof with a single obstacle placed at (500,500), far from a (0,0)→(200,100) route:

```
vertical-first  without obstacles: [{0,0→0,100},{0,100→200,100}]
vertical-first  with far obstacle: [{0,0→200,0},{200,0→200,100}]   IDENTICAL=false  ← style lost
z-shape         without obstacles: [{0,0→100,0},{100,0→100,100},{100,100→200,100}]
z-shape         with far obstacle: [{0,0→200,0},{200,0→200,100}]   IDENTICAL=false  ← style lost
direct          unaffected (early return at line 54)
horizontal-first unaffected (coincides with the fallback)
```

And `store.ts:217` passes **every component in the circuit** as obstacles:

```ts
const obstacles = components.map(c => getComponentWorldBounds(c));
```

So in any circuit containing at least one component — i.e. all of them — `vertical-first`,
`z-shape` and `orthogonal` are silently rewritten to horizontal-first.

Worse, the routine doesn't even avoid obstacles. An earlier probe showed a route with a blocking
component was **byte-identical** to the route without it:

```
[{from:{60,20},to:{400,20}},{from:{400,20},to:{400,220}}]   IDENTICAL = true
```

while the `y=20` segment passes straight through blocker `{x:200,y:0,w:50,h:46}`. Contributing cause:
pins sit exactly *on* component bounds, and the −2/+4 padding makes every wire's own endpoints fall
inside its own component's obstacle box, so the planner starts inside an obstacle and degenerates.

*Fix direction:* only engage obstacle avoidance when an obstacle actually intersects the candidate
path; exclude the two endpoint components from the obstacle set; fall through to the `switch` when
avoidance fails instead of returning a fake path.

---

### P1-3 · `propagationDelay` is decorative — the engine has no timing model
⚙️ **PROVEN**

A 3-deep NOT chain settled **identically** with `propagationDelay = 1` and `= 50`. The engine is a
fixed-point convergence loop (`MAX_SETTLE = 20`), not an event-driven scheduler; the `PriorityQueue`
that would implement delays is largely bypassed.

*Impact:* the setting lies to the user, and any future timing diagram, logic analyser, or hazard/glitch
lesson (PHASE 14) cannot be honest until real per-gate delay scheduling exists. Until then the delay
control must be labelled **NOT IMPLEMENTED**.

---

### P1-4 · Boolean simplifier reports the wrong law names, in French, in an English UI
⚙️ **PROVEN** — the results are correct; the *teaching* is wrong

| Input | Result (correct ✅) | Law shown | Correct law |
|---|---|---|---|
| `A + A'` | `1` | *"Involution (Double négation)"* | Complementarity |
| `A * (A + B)` | `A` | *"Minimisation canonique exacte (Quine-McCluskey)"* | Absorption |
| `(A + B)'` | `A'B'` | *"Minimisation canonique exacte (Quine-McCluskey)"* | De Morgan |

All law names and all parser error messages are hardcoded **French** strings in an otherwise English
UI. For an education product the step-by-step derivation *is* the deliverable, so mislabelling the
law defeats the feature even though the algebra is right. Low-risk, high-value fix: correct the law
selection and translate the strings. Do **not** touch the simplification algorithm — it is verified
correct (see §6).

---

### P1-5 · 8086 assembler accepts malformed operands without a diagnostic
⚙️ **PROVEN**

Assembling three lines where line 2 is `MOV , ` produced errors for lines 1 and 3 but **no error for
line 2**. Empty/malformed operand lists slip through validation, so a student's typo becomes silent
wrong machine code rather than a compile error.

---

### P1-6 · `run8086UntilHalt` cannot report watchdog truncation; the debugger's run loop blocks the UI
⚙️ **PROVEN** + 📄 **READ**

```ts
export function run8086UntilHalt(state: CPU8086State, maxSteps = 10000): number {
  let steps = 0;
  while (!state.halted && steps < maxSteps) { step8086(state); steps++; }
  return state.cycles;      // ← cycles, not steps, and no truncation flag
}
```

`maxSteps` *is* honoured (an earlier hypothesis that it was ignored is **disproven** — see §7), but
the return value is the cycle count, so a caller cannot distinguish "program halted normally" from
"watchdog cut it off at the limit." An infinite loop looks like a successful run.

`Assembly8086Debugger.tsx` compounds it with a synchronous 5000-iteration loop inside a click
handler, calling `setRunning(true)` and `setRunning(false)` in the same tick (so the running state
never renders) and never surfacing truncation. The UI freezes for the duration.

*Note:* `step8086` both mutates its argument in place **and** returns it, which invites aliasing bugs
in callers. The debugger's trace array is nevertheless safe — see L-2 in §7.

---

### P1-7 · Offline support is broken-by-construction, and the 907 kB single chunk is why
⚙️ **PROVEN** (build output) + 📄 **READ** (`public/sw.js`)

The precache list omits the hashed bundles, so the app itself is never cached; `CACHE_NAME` is a
hardcoded constant no build step rewrites, so stale caches are never evicted and a redeploy can serve
an old shell referencing deleted asset hashes. Combined with a single 907.40 kB chunk, every release
invalidates the entire application payload.

Current honest status: **PARTIALLY IMPLEMENTED**. It must be labelled that way in the UI until fixed.

---

### P1-8 · ~~Lint gate fails (15 errors)~~ — ✅ **FIXED** (verified)
⚙️ **PROVEN** — full original list in `V2_BASELINE.md` §8; fix detail in §11 Δ2

`npx eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0` now exits **0**
(15 → 0 errors), so the PHASE 42 lint criterion is met.

The security-relevant part was not merely silenced. The 6 `any` casts on the untrusted-import path
were replaced with real types:

- `projectMigration.ts` gained explicit `RawProject` / `RawCircuit` / `RawComponent` / `RawWire`
  interfaces (all fields optional, because an imported file may corrupt any of them), and
  `sanitizeProject`'s signature changed from the **false** `(p: Project)` to the honest
  `(raw: unknown)`. The function was always fed untrusted data; now the type system says so.
- The 6 duplicated `(window as unknown as { electronAPI?: any })` casts collapsed into **one** typed
  global in `src/types/electron.d.ts` that type-imports the pre-existing `ElectronAPI` interface from
  `electron/preload.ts` — one source of truth, no duplicated shape. Call sites are now plain
  `window.electronAPI`, which also means P0-2's hardening work has a single typed surface to change.
- `ImportExportModal.tsx` now uses `catch (err: unknown)` with `instanceof Error` narrowing.

Locked in by `tests/regression/regression_project_migration_untrusted_input.test.ts` (9 tests), which
passed on its **first** run — evidence the refactor changed no behaviour.

---

# P2 — MEDIUM

| # | Finding | Evidence |
|---|---|---|
| P2-1 | **Second source of truth for Boolean/K-map logic.** Legacy `analysis/booleanAlgebra.ts` (132 lines), `analysis/kmap.ts` (163), `analysis/truthTable.ts` (102) duplicate the modern `analysis/boolean/` (19 files, 3477 lines) and `analysis/karnaugh/` (9 files, 947 lines). `analysis/kmap.ts` is still live — `src/ui/panels/BottomPanel.tsx:6` imports `generateKMap` from it. The directive explicitly forbids a second source of truth. | 📄 READ |
| P2-2 | `quineMcCluskey(minterms, arg2, arg3?)` is an untyped overload with no validation. A malformed call (number where `string[]` is expected) makes `n = undefined`, `total = 1 << undefined = 1`, trips the `minterms.length + dontCares.length >= total` early exit, and **returns `bestExpression: '1'` — a mathematically wrong answer, with no throw.** | ⚙️ PROVEN |
| P2-3 | `src/utils/routing.ts` is imported by **zero** files — dead code shadowing the real `engine/routing/`. | 📄 READ |
| P2-4 | i18n is 0% adopted. `t()` (`src/utils/i18n.ts:170`) is called from **zero** files; the only importer of the module anywhere is `store.ts:8` for `setLanguage`. RTL support (`RTL_LANGUAGES=['ar']`, `document.documentElement.dir`) therefore cannot work. Language switching is effectively **NOT IMPLEMENTED**. | 📄 READ |
| P2-5 | Duplicate CPU stacks: `aluEngine.ts` (131) + `cpuEngine.ts` (157) + `assembler.ts` (374) coexist with the real 8086 stack `alu8086.ts` (725) + `cpu8086.ts` (1348) + `assembler8086.ts` (910) + `instructionDatabase8086.ts` (1002). Determine which is dead and remove it, or the two will drift. | 📄 READ |
| P2-6 | `EditorAction` (with its `inverse: EditorAction` field) is declared in `core.ts` and never used; undo/redo is instead whole-circuit snapshots capped at 100 (`historyPast`). Snapshot undo is memory-heavy for large circuits and cannot express partial undo. | 📄 READ |
| P2-7 | `store.ts:750` `applySimulationSnapshot` reconstructs **every wire object** on every simulation tick, defeating React/renderer memoisation. | 📄 READ |
| P2-8 | Dynamic `import()` of `factory.ts` in the store is pointless — the bundler explicitly warns that four static importers defeat it. Remove the `async` ceremony. | ⚙️ PROVEN (build warning) |
| P2-9 | `Io8086Lab.tsx` (162 lines) is a static reference page presented as a lab: `sampleCode` template strings are rendered as text (line 155), the only state is a `portMap` object, and there is **no** 8255 mode register, 8259 IMR/IRR/ISR, 8253 counter, or DMA engine, and no link to `cpu8086.ts`. Must be labelled **NOT IMPLEMENTED** or wired to the real CPU. | 📄 READ |
| P2-10 | `setCpu({ ...cpu })` is a shallow copy, so nested `registers` / `memory` identities never change and memoised children can miss updates. | 📄 READ |
| P2-11 | ~~No `tests/regression/` directory exists~~ — ✅ **FIXED.** Created, with the required `regression_<feature>_<bug>.test.ts` naming. Note: `vitest.config.ts`'s `include` list had to be extended — it covered only `tests/unit/**` and `src/**`, so regression tests would have silently never executed. Suite is now 47 files / 554 tests. | ⚙️ PROVEN |
| P2-12 | No CSP and remote font origins in `index.html` — listed under P0-2 as a security multiplier, repeated here because self-hosting the fonts is an independent, trivially safe fix. | ⚙️ PROVEN |

---

# P3 — LOW

| # | Finding |
|---|---|
| P3-1 | Source map is 2,597.43 kB and ships to production. Consider `sourcemap: 'hidden'` or excluding it from the web build. |
| P3-2 | `MULTIPLEXER` keeps 4 pins at both 4-bit and 8-bit width — consistent with P0-7 (its data path is single-bit only) but confusing next to `bitWidth` being editable. |
| P3-3 | `applicationVersion` is hardcoded `'1.0.0'` in the `.lpro` envelope rather than read from `package.json`; they will drift. |
| P3-4 | Parser and law-name strings are French while the UI is English (subset of P1-4, tracked separately for the non-simplifier strings). |
| P3-5 | `step8086` returning the same object it mutates is a footgun even though no current caller is bitten. |

---

# §6 — VERIFIED CORRECT: **DO NOT REWRITE**

PHASE 45: *"If you discover that an existing implementation already solves a problem correctly:
LEAVE IT ALONE."* Each item below was proven correct by execution. These are protected.

| Subsystem | Proof |
|---|---|
| **Quine–McCluskey minimisation** | `Σm(0,1,2,5,6,7,8,9,10,14)` → `A'BD + B'C' + CD'`, 6 prime implicants / 2 essential. Brute-force re-evaluation over all 16 rows: `got = 1110011111100010` **==** `want = 1110011111100010`. Don't-cares work: `Σm(0,2,5,7)+d(1,6)` → `A'C' + AC`. |
| **Boolean parser precedence** | `A + B * C` → `OR(VAR A, AND(VAR B, VAR C))` — correct AND-over-OR binding. |
| **Parser error handling** | Robust on `A +`, `((A`, `A ** B`, `""`, `+++`, `)(`, and an unterminated newline case. |
| **Truth-table generation** | `A*B + C` → `[0,1,0,1,0,1,1,1]` — correct on all 8 rows. |
| **Simplifier self-verification** | Every simplification is checked against a reference truth table; all six probes reported `verified = true`. Results are right even where the law *label* is wrong (P1-4). |
| **K-maps up to 6 variables are real** | Dimensions 2var 1×2×2, 3var 1×2×4, 4var 1×4×4, 5var **2**×4×4, 6var **4**×4×4. An all-ones 6-var map produced 729 groups including a single **64-cell** group — cross-plane adjacency genuinely works. |
| **8086 assembler emits byte-exact Intel machine code** | `b8 05 00`, `bb 03 00`, `01 d8`, `89 c1`, `81 e9 02 00`, `51`, `5a`, `f4`. Executing it gives `AX=8 BX=3 CX=6 DX=6 halted=true`. Diagnostics are real and line-numbered. |
| **Circuit equivalence checking** | Genuinely produces counterexamples via its `mismatches` array — not a stub. |
| **Project format & migration** | `validateProjectFile`, `validateCircuitProject`, `migrateProjectFile` are all real implementations over a versioned `.lpro` envelope (`formatVersion: 1`). Backward compatibility (RULE 5) has a real foundation. |
| **Radix display** | `bin` / `hex` / `signed` are implemented end-to-end: `factory.ts:492-495`, `renderer.ts:704-810`, `PropertiesPanel.tsx:66-79`. |
| **Wire preservation on move/rotate** | `updateWiresForComponents` re-routes segments but never drops a wire; wires reference pin **IDs** and pin world positions are recomputed, so PHASE 5's move/rotate requirements are already structurally satisfied. Lock this in with regression tests rather than changing it. |
| **`addComponent`** | Does not touch `circuit.wires`. Exonerated of the wire-loss report. |
| **Pin-ID preservation across property edits** | All 52 component types × 3 property sets produced **zero** duplicate pin names, so name-keyed ID reuse in `updateComponentProperty` cannot collide. |

---

# §7 — Disproven hypotheses (recorded so they are not "fixed" twice)

| Hypothesis | Verdict |
|---|---|
| `run8086UntilHalt` ignores `maxSteps` (passed 1000, got 15000) | **DISPROVEN.** 15000 is `state.cycles` (~15 T-states × 1000 steps), exactly as its JSDoc says. Narrowed to the real issue: no truncation signal (P1-6). |
| The 8086 debugger's trace array aliases live, mutating CPU state | **DISPROVEN.** `snapshot()` copies primitives; trace history is not corrupted. Narrowed to the shallow-copy memoisation issue (P2-10). |
| Duplicate pin names break ID preservation on property edits | **DISPROVEN.** Zero duplicates across 52 types × 3 property sets. |
| Quine–McCluskey returns wrong results | **DISPROVEN — my call was malformed, not the algorithm.** Narrowed to the unvalidated overloaded signature (P2-2). |

---

# §8 — NOT IMPLEMENTED inventory (0 matching files found)

Required by ABSOLUTE RULE #3: these roadmap features do not exist. No UI may imply otherwise.

Verilog generation · VHDL generation · Verilog import · FSM designer/engine · logic analyser ·
cache simulator · virtual memory + TLB · RISC-V core · MIPS core (the single "MIPS" hit is a label
string at `DatapathLab.tsx:127`) · 8259/8253/8255/DMA engines · auto-grading / teacher / curriculum ·
real-time collaboration · command palette · minimap & subcircuit hierarchy navigation.

`src/engine/` contains **only** `analysis/`, `routing/` and `simulation.ts`.

---

# §9 — Execution order (PHASE 43 STEP 2 onward, re-sequenced by measured priority)

Each step: smallest possible change → new `tests/regression/` test → `npx tsc --noEmit` → `npx vitest run` (must stay ≥ 545 passing, 0 failing) → `npm run build:renderer`. **If a test fails: STOP.**

1. ✅ **DONE — P0-1** fix `npm install` (unblocked everything; touched no `src/`).
2. ✅ **DONE — P1-8** clear the 15 lint errors, with real types rather than suppressions. `tests/regression/` scaffolded (P2-11) and wired into `vitest.config.ts`.
3. **P0-2** harden Electron IPC + CSP + navigation + sandbox. ← **next**
4. **P0-4** fix `bidirectional` write-back — one-line root cause shared with P0-3.
5. **P0-3 / P0-7** SPLITTER + MERGER + TUNNEL via the additive `busValue?: BitVector` path.
6. **P0-5** oscillation detector: exclude clocks, settle-pass scope, ring-buffer cap.
7. **P0-6** 8086 invalid opcode → halt + error field (+ #UD later).
8. **P1-1** wire-loss warning on width reduction + the four-case regression test.
9. **P1-2** routing: intersect-test before avoidance, exclude endpoint components, fall through on failure.
10. **P1-5** assembler operand validation. **P1-6** truncation flag + async/chunked run loop.
11. **P1-4** correct Boolean law names + translate to English.
12. **P1-7** service-worker precache from the build manifest + build-stamped cache name + code splitting.
13. **P1-3** decide: implement real delay scheduling, or label the control **NOT IMPLEMENTED**.
14. P2 cleanup — starting with P2-1 (single source of truth).
15. Isolated phase: the 14 remaining `npm audit` advisories requiring major-version jumps (see P0-1).

New feature work (FSM, HDL, cache, RISC-V, logic analyser) starts only after the P0 and P1 lists are
empty, per *"NEVER sacrifice correctness for feature count."*
