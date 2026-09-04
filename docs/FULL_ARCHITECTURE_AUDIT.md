# FULL ARCHITECTURE AUDIT — Logisim Pro

**Audit date:** 2026-08-25
**Auditor:** Phase 0 of the Ultimate Evolution & Professionalization Master Plan
**Scope:** entire repository — `src/`, `electron/`, `tests/`, `public/`, `docs/`, `index.html`, build config
**Method:** static reading of every core module **plus** throwaway executable probe tests that ran the real engines and recorded their real output. Every claim marked ⚙️ **PROVEN** below is backed by captured runtime output, not by inspection alone. Probe files were deleted after use; the test suite is unchanged.

> **This document deliberately reports what works as well as what is broken.** Per the plan's directive *"DO NOT blindly rewrite working systems"*, several subsystems audited here are correct, well-tested, and must be preserved. They are listed in §2.

---

## 0. Verified baseline

| Check | Command | Result |
|---|---|---|
| Type safety | `npx tsc --noEmit` | **PASS** — exit 0, zero errors, `strict: true` |
| Unit/integration tests | `npx vitest run` | **PASS** — 46 files, 545 tests |
| E2E tests | `npx playwright test` | **CANNOT RUN** — browser binaries not installed (see L-1) |
| Source size | — | 42,800 lines across `src/`, `tests/`, `electron/` |

The baseline claim in the master plan (46 suites / 545 tests / TS strict) is **accurate and independently confirmed**.

### Largest modules (complexity hotspots)

| Lines | File |
|---|---|
| 1632 | `src/renderer/canvas/renderer.ts` |
| 1394 | `src/engine/simulation.ts` |
| 1348 | `src/architecture/engine/cpu8086.ts` |
| 1210 | `src/architecture/pages/BooleanAlgebra.tsx` |
| 1002 | `src/architecture/engine/instructionDatabase8086.ts` |
| 910 | `src/architecture/engine/assembler8086.ts` |
| 900 | `src/state/store.ts` |

---

## 1. Executive summary

The project has **two genuinely strong, mathematically verified engines** (Boolean/Karnaugh analysis, Intel 8086 CPU + assembler) sitting next to a **digital-logic simulation core with fundamental architectural limits** and a **critical Electron security hole**.

The single most consequential finding is architectural, not a bug:

> `Pin.currentValue` and `Wire.currentValue` are each **one scalar `SignalValue`**, and `Wire` is strictly `fromPinId → toPinId`. Therefore multi-bit buses cannot be represented, and wire-to-wire junctions/splits/merges cannot exist. `SPLITTER`, `MERGER`, and `TUNNEL` are shipped as non-functional stubs. This blocks Phases 3, 4, and parts of 5 until the data model changes.

The second most consequential is security:

> `electron/main.ts` exposes **unrestricted arbitrary-path file read, write, and copy** to renderer JavaScript, with **no Content-Security-Policy** on the page. This directly violates Phase 43.

Counts: **4 CRITICAL, 11 HIGH, 17 MEDIUM, 9 LOW**, plus **14 features claimed by the roadmap that do not exist in the codebase at all** (§4).

---

## 2. What is genuinely correct — DO NOT REWRITE

These were verified by running them, and are the project's real assets.

### ⚙️ PROVEN — Boolean analysis engine (`src/engine/analysis/boolean/`, 3,477 lines)

- **Parser precedence is correct.** `A + B * C` →
  `OR(A, AND(B, C))` — AND binds tighter than OR, as required.
- **Quine–McCluskey is mathematically correct.** For the textbook function
  `f(A,B,C,D) = Σm(0,1,2,5,6,7,8,9,10,14)` it returned `A'BD + B'C' + CD'`
  with 6 prime implicants / 2 essential. Re-evaluating the returned expression
  by brute force over all 16 rows reproduced the input minterm set **exactly**:
  ```
  got  = 1110011111100010
  want = 1110011111100010   → MATCH
  ```
- **Don't-cares are used correctly.** `Σm(0,2,5,7) + d(1,6)` → `A'C' + AC` (verified minimal).
- **Truth-table generation is correct.** `A*B + C` → `[0,1,0,1,0,1,1,1]`, matching hand evaluation on all 8 rows.
- **Simplification is self-verifying.** `simplifyStepByStep()` builds a reference truth table and sets `isVerified`. All six probes returned `verified=true` with correct results: `AB+AB'→A`, `A+AB→A`, `A(A+B)→A`, `A+A'→1`, `(A+B)'→A'B'`, `AB+AB'+A'B→B+A`.
- **Parser error handling is robust** (Phase 30): every malformed input threw a descriptive, position-annotated error rather than crashing — `A +`, `((A`, `A ** B`, `""`, `A + $`, `+++`, `)(`.

### ⚙️ PROVEN — Karnaugh engine (`src/engine/analysis/karnaugh/`, 947 lines)

Real 2–6 variable support with genuine multi-plane geometry, not a 4-var map with extra labels:

| Vars | Planes | Rows | Cols | Cells |
|---|---|---|---|---|
| 2 | 1 | 2 | 2 | 4 |
| 3 | 1 | 2 | 4 | 8 |
| 4 | 1 | 4 | 4 | 16 |
| 5 | **2** | 4 | 4 | 32 |
| 6 | **4** | 4 | 4 | 64 |

Inter-plane adjacency works: on an all-ones 6-variable map, `findAllValidGroups` found 729 valid groups including a **single group of all 64 cells** — only possible if grouping spans planes correctly.

### ⚙️ PROVEN — Intel 8086 assembler + CPU (`assembler8086.ts`, `cpu8086.ts`, `alu8086.ts`)

An 8-instruction program assembled to **byte-exact, genuine Intel 8086 machine code**:

```
MOV AX,0005H → b8 05 00      MOV CX,AX    → 89 c1
MOV BX,0003H → bb 03 00      SUB CX,0002H → 81 e9 02 00
ADD AX,BX    → 01 d8         PUSH CX      → 51
                             POP DX       → 5a
                             HLT          → f4
```

Executing it produced `AX=8 BX=3 CX=6 DX=6 halted=true` — correct, including real stack push/pop through SS:SP. Assembler diagnostics are real and line-numbered: `Unknown instruction or invalid syntax: "FOOBAR"` (line 1), `Undefined label: "NOWHERE"` (line 3). The ALU test suite checks CF/OF/AF/PF/ZF/SF on genuine edge cases (`0xFFFF+1`, `0x7FFF+1`).

### Project format (`src/core/project/`)

Versioned `.lpro` envelope with `formatVersion`, `applicationVersion`, `generator`, plus real `validateProjectFile`, `validateCircuitProject`, and `migrateProjectFile` including legacy-unversioned handling. Genuine scaffolding — Phase 35 is partially satisfied already.

---

## 3. Findings

### 🔴 CRITICAL

---

**C-1 — Electron exposes unrestricted arbitrary file read/write/copy to renderer JS**
`electron/main.ts:312-328`, `electron/preload.ts:63-65`

Under a comment that reads `// ── Secure Native IPC Bridges ──`:

```ts
ipcMain.handle('fs:read-file',   async (_e, filePath: string) => fs.promises.readFile(filePath, 'utf-8'));
ipcMain.handle('fs:write-file',  async (_e, filePath: string, content: string) => { await fs.promises.writeFile(filePath, content, 'utf-8'); return true; });
ipcMain.handle('fs:backup-file', async (_e, filePath: string) => { /* copyFile to any path */ });
```

There is **no path validation, no allow-list, no sandbox root**. `preload.ts` re-exports all three to page JavaScript via `contextBridge.exposeInMainWorld('electronAPI', …)`. Any XSS, any malicious imported project that reaches a code path calling these, or any injected third-party script can read `C:\Users\<user>\.ssh\id_rsa` or overwrite system files with full user privileges.

Compounding factors: `sandbox: false` in `webPreferences` (`main.ts:105`); no `will-navigate` handler; no `setWindowOpenHandler`; `app:open-url` accepts `http://` as well as `https://` (`main.ts:259`).

*Violates Phase 43 — "Protect Electron IPC", "Prevent malicious project files from executing arbitrary system commands."*

---

**C-2 — No Content-Security-Policy, and the app loads remote code/fonts**
`index.html` (no CSP meta tag; lines 14-15)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter…" rel="stylesheet">
```

No `Content-Security-Policy` meta tag exists anywhere. Combined with C-1, a single injected script has full filesystem access. The remote font dependency also means the "offline desktop app" and PWA silently degrade without network — an unstated limitation (Phase 47).

---

**C-3 — Multi-bit buses are unrepresentable; SPLITTER / MERGER / TUNNEL are non-functional stubs**
`src/types/core.ts:85,144`; `src/engine/simulation.ts:1390-1393`

```ts
export interface Pin  { …; currentValue: SignalValue;  /* ONE scalar */ }
export interface Wire { …; currentValue: SignalValue;  /* ONE scalar */ }
```

`BitVector = SignalValue[]` is declared (`core.ts:18`) but never used by `Pin` or `Wire`. `Pin.bitWidth` / `Wire.bitWidth` / `Wire.isBus` exist but are decorative for simulation. The registry ships identity stubs:

```ts
registry.register('SPLITTER',   (inputs) => inputs);
registry.register('MERGER',     (inputs) => inputs);
registry.register('TUNNEL',     (inputs) => [inputs[0] ?? SignalValue.UNKNOWN]);
registry.register('SUBCIRCUIT', (inputs) => inputs);
```

⚙️ **PROVEN by probe:**
- 4-bit `SPLITTER` with `IN = HIGH` → `O0=HIGH, O1=UNKNOWN, O2=UNKNOWN, O3=UNKNOWN`
- 4-bit `MERGER` with `I0=HIGH I1=LOW I2=HIGH I3=HIGH` → `OUT = HIGH` (bit 0 only; `0b1101 = 13` is unrepresentable in one `SignalValue`)
- Two `TUNNEL`s sharing net name `CLK` → `T1.NET=UNKNOWN, T2.NET=UNKNOWN, LED.A=UNKNOWN`

Consequence: every N-bit component in `factory.ts` fans out into N separate 1-bit pins (`A0..An-1`), so a 32-bit ALU becomes ~100 pins. **Phase 4 cannot be implemented without changing this type.** `SUBCIRCUIT` is likewise a stub, blocking Phase 2 hierarchy.

---

**C-4 — Undo can destroy a different circuit's contents**
`src/state/store.ts` (`undo`/`redo`)

History is `historyPast: Circuit[]` / `historyFuture: Circuit[]`, and `undo()` does:

```ts
s.project.circuits.map(circuit => circuit.id === current.id ? previous : circuit)
```

`previous` is a snapshot of whatever circuit was edited when it was pushed — **it is not checked against the current circuit's `id`**, and history is **not cleared** by `setCurrentCircuit`, `addCircuit`, or `removeCircuit`. Sequence: edit circuit A → switch to circuit B → Ctrl+Z ⇒ **B is replaced by A's contents and B's work is lost.** Silent, unrecoverable data loss.

---

### 🟠 HIGH

---

**H-1 — Wire model forbids junctions, splits, and merges (blocks Phase 3)**
`src/types/core.ts:137-148`; `store.ts` (`addWire`)

`Wire` requires exactly two **pin** endpoints (`fromPinId`, `toPinId`). A T-junction, a wire split, or a wire merge has no representation — a wire cannot terminate on another wire. `addWire` additionally requires `from.direction ∈ {output, bidirectional}` and `to.direction ∈ {input, bidirectional}`, so drawing input→output (the natural gesture) is rejected. Phase 3's "junctions, T-junctions, split/merge, net names" is unimplementable on this model.

---

**H-2 — Obstacle avoidance routes straight through obstacles; requested routing style is silently discarded**
`src/engine/routing/wireRouter.ts` (`routeWire`, `routeWithObstacleAvoidance:~end`)

`routeWire` tests `if (obstacles && obstacles.length > 0)` **before** `switch (style)`, so whenever obstacles exist (i.e. always, in a real circuit) the user's chosen style is discarded. Worse, `routeWithObstacleAvoidance` ends with `return simplifySegments(hFirst);` — the plain horizontal-first path.

⚙️ **PROVEN by probe** — route computed *with* a blocker squarely in the path was **byte-identical** to the route with no obstacles:
```
[{from:{60,20},to:{400,20}}, {from:{400,20},to:{400,220}}]   IDENTICAL = true
```
The `y=20` segment passes directly through the blocker `{x:200,y:0,w:50,h:46}`.
Style override, proven: `vertical-first` with no obstacles → `[{0,0→0,100},{0,100→200,100}]`; **with** an obstacle → `[{0,0→200,0},{200,0→200,100}]` (h-first). `z-shape` collapsed from 3 segments to h-first the same way.

Root cause of the padding failure: pins sit **exactly on** component bounds (AND gate bounds 50×46, pin `A` at local `{0,12}`, pin `Y` at local `{50,23}`), so obstacle padding of −2/+4 makes every wire's own endpoints intersect its own components.

---

**H-3 — `propagationDelay` has no effect; the engine is not event-driven**
`src/engine/simulation.ts` (`processTick`, `MAX_SETTLE = 20`)

`processTick()` drains the event queue and then runs a **fixed-point settle loop** that calls `updateComponentInputs()` + `evaluateComponentsImmediate()` + `resolveAllNets()` up to 20 times, committing outputs immediately. `state.propagationDelay` and `scheduleEvent()` therefore have no observable effect.

⚙️ **PROVEN by probe:** a 3-deep NOT chain settled **identically** at `delay=1` and `delay=50` (`final NOT out = LOW` in both cases). A real delay model would need ≥150 ticks to settle at `delay=50`.

*Blocks Phase 1's "single-event stepping" and any honest timing/hazard analysis.*

---

**H-4 — False-positive oscillation storm with unbounded memory growth**
`src/engine/simulation.ts` (`detectHazard`, `hazardReports`, `oscillationReports`)

`detectHazard()` reports "oscillation" whenever ≥2 transitions appear in the last 8 history entries — which is true of **every normal toggling signal**, including a plain clock.

⚙️ **PROVEN by probe:** 200 ticks of a bare `CLOCK → LED` produced `hazards=199, oscillations=199`, first at tick 2:
```json
{"tick":2,"componentId":"…","description":"Oscillation detected on pin … (2 transitions)","severity":"warning"}
```
Both arrays are **unbounded**; `getHazards()`/`getOscillations()` copy them wholesale, and `SimulationService.tick()` ships them across Comlink **every tick**. A long-running simulation grows memory without limit and floods the UI with false warnings.

---

**H-5 — `bidirectional` pins are never written back by net resolution**
`src/engine/simulation.ts` (`resolveAllNets`)

```ts
for (const pId of net.pinIds) {
  const p = this.findPin(pId);
  if (p && p.direction === 'input') { this.pinValues.set(pId, resolved); }
}
```

Only `'input'` pins receive the resolved net value. Every `bidirectional` pin — `TUNNEL.NET`, bus transceivers, tri-state I/O — is permanently stranded at its previous value. This is the mechanism behind the TUNNEL failure in C-3.

---

**H-6 — Whole project object rebuilt on every simulation tick**
`src/state/store.ts` (`applySimulationSnapshot`)

```ts
components: circuit.components.map(component => ({ ...component,
  pins: component.pins.map(pin => ({ ...pin, currentValue: pins.get(pin.id) ?? pin.currentValue })) })),
wires: circuit.wires.map(wire => ({ ...wire, currentValue: wires.get(wire.id) ?? wire.currentValue })),
```

Every component and **every pin object** is recreated each tick, producing a new `project` reference. All React subscribers re-render at simulation frequency regardless of whether anything they display changed. *Violates Phase 29.*

---

**H-7 — Renderer redraws the full scene at 60 fps unconditionally**
`src/renderer/canvas/renderer.ts` (`startLoop`, `renderFrame`)

`requestAnimationFrame` loops forever with no dirty flag or dirty region; `renderFrame()` additionally performs `project?.circuits.find(...)` and `rawComponents.map(c => this.withVisualPos(c))` — allocating a fresh array every frame even when idle. ~16 sites call `useAppStore.getState()` imperatively, so there is no subscription or memoization boundary. Constant CPU/GPU burn on an idle canvas. *Violates Phase 29.*

---

**H-8 — Unindexed linear pin lookups inside the hottest loops**
`src/engine/simulation.ts` (`findPin`, `findComponentIdForPin`)

Both scan **all components × all pins** on every call, and both are called from inside `resolveNet` / `resolveAllNets`, which run once per net per settle iteration (up to 20 per tick). Effective cost is O(nets × pins × components) per tick. On large circuits this dominates the tick.

---

**H-9 — O(wires × components × pins) reroute on every drag frame**
`src/state/store.ts` (`updateWiresForComponents`)

Re-scans all components to find both endpoints of every wire, with no index and no early exit. Called from `moveComponent`, `moveSelectedComponents`, `commitDrag`, `rotateComponent`, `rotateSelectedComponents`, `updateComponentProperty`, and `rerouteWires`. If a pin is not found it returns the wire unchanged, leaving **stale "ghost" segments** rendered at the old position — a visible correctness bug, not just a perf issue. *Relates to the plan's requirement "WIRES MUST REMAIN CONNECTED".*

---

**H-10 — Invalid 8086 opcodes execute silently as no-ops**
`src/architecture/engine/cpu8086.ts:1215-1221`

```ts
default: {
  disassembly = `DB 0x${opcode.toString(16).toUpperCase()}`;
  explanation = `Unknown opcode 0x${…}. Advanced IP.`;
  ipAdvance = 1; cyclesUsed = 4; break;
}
```

⚙️ **PROVEN by probe:** stepping into bytes `0f ff ff` returned `halted=false`, **no error field, no exception**. The CPU walks through arbitrary garbage reporting success. Phase 30 explicitly requires handling "unsupported instruction"; Phase 47 forbids hiding limitations. An educational debugger must say *"invalid opcode 0x0F at CS:IP"*, not silently continue.

---

**H-11 — Step-by-step simplification names the wrong Boolean law**
`src/engine/analysis/boolean/simplifier.ts`

⚙️ **PROVEN by probe** (results correct, pedagogy wrong):

| Input | Result | Law reported | Correct law |
|---|---|---|---|
| `A + A'` | `1` ✓ | *Involution (Double négation)* | **Complementarity** |
| `A*(A+B)` | `A` ✓ | *Minimisation canonique exacte (Quine-McCluskey)* | **Absorption** |
| `(A+B)'` | `A'B'` ✓ | *Minimisation canonique exacte (Quine-McCluskey)* | **De Morgan** |

For a teaching tool the named law *is* the deliverable. The trace falls back to "canonical minimization" instead of identifying the actual law, and one case is affirmatively mislabelled. Also note all law names and parser error messages are **in French** inside an English UI (H-11b, see M-8).

---

### 🟡 MEDIUM

---

**M-1 — Dead duplicate logic in the simulation engine.** `evaluateComponent()` contains authoritative hardcoded implementations for `SR_LATCH, D_LATCH, D_FLIPFLOP, JK_FLIPFLOP, T_FLIPFLOP, REGISTER, COUNTER, SHIFT_REGISTER, REGISTER_FILE, RAM, ROM` and **returns before** reaching `this.registry.evaluate(...)`. Yet `registerBuiltInLogics()` also registers stub versions of those same types (reading `props['stored']`, `props['count']`, …) that **can never execute**. Two competing implementations per sequential component; the unreachable one will rot.

**M-2 — `RAM` writes on level, not on clock edge.** `if (we === SignalValue.HIGH)` performs the write; `previousClock` is stored in `componentRuntime` but never consulted for the write decision. Not edge-triggered — incorrect memory semantics.

**M-3 — `reset()` does not re-initialize sources.** Unlike `loadCircuit()`, `reset()` clears all pins to `UNKNOWN` and wipes `componentRuntime` but never re-seeds `CONSTANT`/`SWITCH`/`CLOCK`/`INPUT_PIN` and never runs a settle pass. After reset the circuit is in a state it can never reach naturally. *Blocks Phase 1's reset requirement.*

**M-4 — Two full `JSON.stringify` of the entire circuit per user interaction.** `SimulationService.ensureCircuitSynced()` computes `JSON.stringify([circuit.components, circuit.wires])` as a change signature, then `syncCircuit()` serializes it **again** to send it. Happens on `step`, `forcePinValue`, and `run`.

**M-5 — Edits during a running simulation are ignored.** `startLoop()` calls `tick(false)`, which never re-syncs the circuit, so components added or moved while the simulation runs are invisible to the worker until it is stopped.

**M-6 — T-junctions can never be detected geometrically.** `wireRouter.checkHVIntersection` uses strict inequalities (`vX > hMinX && vX < hMaxX && hY > vMinY && hY < vMaxY`), so an intersection exactly at a segment endpoint — which is what a real T-junction is — is always missed.

**M-7 — i18n infrastructure exists but adoption is 0%.** `src/utils/i18n.ts` has complete EN/FR/AR/ES/DE/JA dictionaries, `RTL_LANGUAGES`, `document.documentElement.dir` handling, and an exported `t()`. ⚙️ **PROVEN:** `t()` is called from **zero** files; the only importer of `@utils/i18n` in the entire codebase is `src/state/store.ts` (for `setLanguage`). All **60 `.tsx` files hard-code English**. Switching to Arabic flips the document direction and changes nothing else. *Phase 32 requires "no hard-coded educational text".*

**M-8 — User-visible engine strings are in French inside an English UI.** ⚙️ **PROVEN:** `Expression invalide à la position 4: attendu variable, constante ou '('`, `Parenthèse fermante ')' manquante`, `L'expression booléenne ne peut pas être vide`, `Variable non définie dans l'environnement`, `Adjacence logique (Fusion de mintermes)`, `Involution (Double négation)`.

**M-9 — Undo/redo coverage is inconsistent.** `moveComponent`, `moveSelectedComponents`, `addWireJunction`, and `rerouteWires` do **not** push history — only `commitDrag` does. Some user-visible edits are not undoable.

**M-10 — Paste costs N+M undo steps.** `paste()` calls `addComponent` per component and `addWire` per wire, each pushing its own history entry. Pasting 10 components and 12 wires requires 22 Ctrl+Z presses to undo one paste.

**M-11 — `duplicateSelected()` destroys the user's clipboard.** It calls `copySelected()` internally, silently overwriting whatever the user had copied.

**M-12 — Rectangle selection never selects wires.** `selectInBox` pushes only component ids, despite `selectedWireIds` existing in `SelectionState`. Rubber-band selecting a region and pressing Delete leaves all the wires behind.

**M-13 — `sendBitsToCircuit` does async dynamic import inside a store action.** `import('@core/components/factory').then(...)` mutates state after an await boundary — race-prone, and records no undo entry.

**M-14 — No dirty/unsaved flag anywhere in the store.** Phase 33 requires an unsaved-changes indicator; there is no `isDirty` state to drive one, and no guard against closing with unsaved work.

**M-15 — Quine–McCluskey silently returns a wrong answer on a malformed call.** The overloaded signature `quineMcCluskey(minterms, arg2, arg3?)` does `variables = arg3 || ['A','B']` with no validation. ⚙️ **PROVEN:** passing a number where `string[]` is expected yields `n = undefined`, `total = 1 << undefined = 1`, the `minterms.length >= total` early-exit fires, and the function returns `bestExpression: "1"` — a confidently wrong result with no throw and no warning.

**M-16 — Assembler accepts malformed operands silently.** ⚙️ **PROVEN:** `assemble8086('FOOBAR AX, BX\nMOV , \nJMP nowhere')` reported errors for lines 1 and 3 but **no error for `MOV , ` on line 2**.

**M-17 — 8086 debugger runs up to 5000 steps synchronously in a click handler and hides the truncation.** `Assembly8086Debugger.runAll()` executes `while (!state.halted && i < maxSteps)` inline: the UI thread is fully blocked (violating Phase 29's "never freeze UI"), `setRunning(true)` and `setRunning(false)` land in the same tick so the running indicator never paints, and hitting the 5000-step ceiling is **never reported to the user** (violating Phase 47's "never hide limitations"). Similarly `run8086UntilHalt` returns `state.cycles`, giving the caller no way to distinguish normal halt from watchdog cutoff.

---

### 🔵 LOW

**L-1 — E2E suite cannot run.** All four Playwright specs fail with `browserType.launch: Executable doesn't exist at …chrome-headless-shell.exe`. These are **not** application defects — the browsers were never installed. Fix: `npx playwright install`. Until then the four stale failure reports in `test-results/` are misleading and should be regenerated or cleared.

**L-2 — `step8086` mutates in place *and* returns the state.** Callers work around it with `setCpu({ ...cpu })` — a **shallow** spread over deeply mutated nested objects (`registers`, `memory`, `queue`). Top-level re-render works, but any `useMemo`/`React.memo` keyed on `cpu.registers` or `cpu.memory` will never invalidate. (Trace snapshots copy primitives, so trace history is *not* corrupted.)

**L-3 — `PriorityQueue.enqueue` is O(n) and cancels legitimate events.** It filters out every pending event targeting the same pin, then re-heapifies from scratch (`for (let i = Math.floor(len/2)-1; i>=0; i--) heapifyDown(i)`) instead of sifting up. Currently masked because the settle loop bypasses the queue (H-3).

**L-4 — Dead types in `src/types/core.ts`.** `EditorAction` (with its `inverse` field), `EditorState.undoStack`, and `EditorState.redoStack` are declared but unused — the store implements a different mechanism (`historyPast`/`historyFuture: Circuit[]`). Misleading to a new contributor.

**L-5 — `BitVector` declared and never used** (`core.ts:18`) — a vestige of an intended multi-bit model.

**L-6 — Superseded legacy analysis modules retained.** `src/engine/analysis/booleanAlgebra.ts` (132), `kmap.ts` (163), `truthTable.ts` (102) duplicate the far more capable `boolean/` and `karnaugh/` packages. `analysis/booleanAlgebra.ts` is imported **only by a test**; `analysis/kmap.ts` is still imported by `src/ui/panels/BottomPanel.tsx:6` (`generateKMap`) — meaning the UI's K-map panel uses the **weaker legacy 4-var-oriented implementation** rather than the verified 2–6 var engine.

**L-7 — `src/utils/routing.ts` is imported by nothing.** Dead file.

**L-8 — `app:open-url` allows plain `http://`** (`main.ts:259`) — should be `https://`-only for an offline educational app.

**L-9 — Duplicate CPU/ALU/assembler stacks coexist.** `aluEngine.ts` + `cpuEngine.ts` + `assembler.ts` (a small MIPS-flavoured teaching CPU, used by `AluLab`/`CpuLab`/`DatapathLab`) live beside the real `alu8086.ts` + `cpu8086.ts` + `assembler8086.ts`. Both are used and tested, so this is intentional, but the naming gives no hint which is which.

---

## 4. Roadmap features that DO NOT EXIST in the codebase

Verified by exhaustive keyword sweep across all of `src/`. **Zero matching files** for each of the following. Per Phase 47 these must be labelled **NOT IMPLEMENTED**, never presented as present.

| Roadmap phase | Feature | Status | Evidence |
|---|---|---|---|
| 10 | Verilog export | **NOT IMPLEMENTED** | 0 files match `verilog`/`Verilog` |
| 10 | VHDL export | **NOT IMPLEMENTED** | 0 files match `vhdl`/`VHDL` |
| 11 | Verilog import | **NOT IMPLEMENTED** | — |
| 12 | FSM designer | **NOT IMPLEMENTED** | 0 files match `fsm`/`FSM`/`stateMachine` |
| 13 | Logic analyzer | **NOT IMPLEMENTED** | 0 files match `logicAnalyzer` (a basic `WaveformViewer.tsx` exists) |
| 14 | Cache lab | **NOT IMPLEMENTED** | only unrelated hits (IndexedDB "cache", autosave) |
| 15 | Virtual memory / TLB lab | **NOT IMPLEMENTED** | 0 files match `tlb`/`TLB`/`virtualMemory` |
| 16 | RISC-V RV32I | **NOT IMPLEMENTED** | 0 files match `riscv`/`RV32` |
| 17 | MIPS32 | **NOT IMPLEMENTED** | single hit is a *label string* in `DatapathLab.tsx:127` |
| 18 | 8259 PIC / 8253 PIT / 8255 PPI / DMA | **NOT IMPLEMENTED (static reference page only)** | see below |
| 24-28 | Auto-grading, teacher mode, curriculum | **NOT IMPLEMENTED** | 0 files match `grading`/`autoGrade`/`curriculum` (`exercises8086.ts` exists, 644 lines) |
| 12 (collab) | Collaboration | **NOT IMPLEMENTED** | 0 files match `collaborat` |
| 33 | Command Palette (Ctrl+K) | **NOT IMPLEMENTED** | 0 files match `commandPalette` |
| 2 | Minimap, subcircuit hierarchy | **NOT IMPLEMENTED** | `minimap` appears only as an i18n *key*; `SUBCIRCUIT` is a stub (C-3) |

### ⚠️ Special case: `Io8086Lab.tsx` — 8255/8259/8253 are a static reference page

`src/architecture/pages/Io8086Lab.tsx` is **162 lines total**. The three peripherals are entries in a hard-coded array whose `sampleCode` field is a template string that is **rendered as text, never executed** (`{chip.sampleCode}` at line 155). The only interactive state is:

```ts
const [portMap, setPortMap] = useState<Record<number, number>>({ … });
```

`handleIn`/`handleOut` read and write that local React map and append a line to `ioLog`. There is **no 8255 mode register, no 8259 IMR/IRR/ISR, no 8253 counter, no DMA controller** — no peripheral engine of any kind, and no connection to `cpu8086.ts`. This is exactly the pattern Phase 47 prohibits: a panel with no engine behind it. It must be relabelled **PARTIALLY IMPLEMENTED — reference documentation + generic port read/write only** until real chip models exist.

---

## 5. Recommended execution order

Mapped onto the plan's own P0→P13 priority ladder. **Nothing has been modified yet** — this is the Phase 0 deliverable only.

### P0 — Correctness & security (do first, small and verifiable)
1. **C-1 + C-2** — path-restrict `fs:*` IPC to an allow-listed data root, drop `fs:read-file`/`fs:write-file` from the preload surface in favour of dialog-scoped handles, add a strict CSP, self-host fonts, add `will-navigate` + `setWindowOpenHandler`, set `sandbox: true`. *Security first; smallest blast radius.*
2. **C-4** — make undo circuit-id-aware and clear history on circuit switch. Prevents silent data loss.
3. **H-10, M-15, M-16** — surface invalid opcodes, validate the QM signature, reject malformed operands. Honest errors instead of confidently wrong output.
4. **H-5, M-2, M-3** — bidirectional write-back, edge-triggered RAM, correct `reset()`.

### P1 — Stability
5. **H-4** — fix oscillation detection (require a genuine non-converging settle loop, not "≥2 transitions"), and bound both report arrays.
6. **H-9** — build a pin→component index; fix ghost segments.
7. **M-9, M-10, M-11, M-12** — history coverage, batched paste, clipboard preservation, wire selection.

### P2 — Simulation quality
8. **H-3** — real event-driven propagation so `propagationDelay` means something; then Phase 1 snapshots / replay / single-event stepping.
9. **H-8, L-3** — indexed lookups, correct heap.
10. **H-6, H-7** — stop rebuilding the project each tick; dirty-region rendering.

### P3 — Editor & wire quality
11. **C-3 + H-1** — the data-model migration: `Pin.currentValue`/`Wire.currentValue` → `BitVector`, and a **net-based** wire model that permits wire↔wire junctions. This unlocks Phases 3, 4, 5 and real `SPLITTER`/`MERGER`/`TUNNEL`/`SUBCIRCUIT`. Largest single change in the plan — must be staged behind the P0/P1 fixes and covered by new tests before any UI work.
12. **H-2, M-6** — real obstacle avoidance and endpoint-inclusive junction detection.

### P4 — Boolean / Karnaugh (already strong — extend, don't rewrite)
13. **H-11** — correct law identification in the step-by-step trace.
14. **L-6** — point `BottomPanel.tsx` at the verified 2–6 var `karnaugh/` engine and retire the legacy modules.

### P5+ — then the genuinely new engines
15. **M-7, M-8** — adopt `t()` across the UI and move engine strings into the dictionaries **before** authoring thousands of new educational strings, or the i18n debt compounds.
16. Then, in plan order, the NOT-IMPLEMENTED list of §4, each as its own increment with a real engine + tests: 8255/8259/8253 → FSM → cache → virtual memory → HDL export/import → RISC-V → MIPS → grading/curriculum.

### Housekeeping (any time)
- `npx playwright install` to unblock E2E (L-1); clear the four stale `test-results/` reports.
- Delete `src/utils/routing.ts` (L-7); remove dead types (L-4, L-5); resolve the unreachable registry stubs (M-1).

---

## 6. Audit integrity notes

- **No source file was modified during this audit.** The only files written were temporary probe tests under `tests/unit/`, all of which have been deleted. The suite is back to its original **46 files / 545 tests**.
- Findings marked ⚙️ **PROVEN** are supported by captured output from executing the real modules. Findings without that marker are from direct code reading and cite file/line.
- One hypothesis was **disproven** during the audit and is recorded here for honesty: I initially suspected `run8086UntilHalt(state, 1000)` ignored its `maxSteps` guard because it returned `15000`. It does not — the guard works; the function returns `state.cycles` (≈15 T-states × 1000 steps), as its JSDoc states. The real, narrower issue is that the caller cannot distinguish a normal halt from a watchdog cutoff (M-17). Likewise, I suspected the 8086 debugger's trace array aliased mutated CPU state; it does not — `snapshot()` copies primitives (L-2).
