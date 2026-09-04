# LOGISIM PRO v3.0 — ARCHITECTURE AUDIT

**Deliverable for V3.0 §0 / §1 / Phase 0.** Written *before* the feature phases, per the directive
*"Do not start large refactoring until the audit is complete."*

This document does **not** restate the whole of `docs/V2_ARCHITECTURE_AUDIT.md`. That audit's P0–P3
findings remain valid and are carried forward by reference in §5, with corrections where V3
investigation proved them **stale**. What is new here is §2 (repository drift), §3 (the nine audit
dimensions V2 never examined), and §7 (the honest scope inventory against V3 §2–§29).

### Evidence legend

| Marker | Meaning |
|---|---|
| ⚙️ **PROVEN** | Demonstrated by executing code and capturing output. A temporary probe test was used, then deleted. |
| 📄 **READ** | Established by reading the source. Mechanism is visible in the code, not executed. |
| ❓ **UNVERIFIED** | Suspicion only. Must not be quoted as fact or acted on destructively. |

---

## 1. V3 baseline — measured, not estimated

All four commands were re-run at the start of Phase 0.

| Gate | Result |
|---|---|
| `npm install` | ✅ exit 0 (no `--force`, no `--legacy-peer-deps`) |
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npx vitest run` | ✅ **47 suites / 554 tests**, 0 failing *(at Phase 0 start)* |
| `npm run build:renderer` | ✅ exit 0 |
| `npm run lint` | ✅ 0 errors |

Production bundle at Phase 0 start:

```
dist/index.html                             1.78 kB
dist/assets/simulation.worker-D44yab3e.js  36.78 kB
dist/assets/index-qWnL08Yb.css             29.41 kB │ gzip:   6.40 kB
dist/assets/index-BxVvI6KV.js             939.13 kB │ gzip: 232.67 kB
```

Two build warnings persist from the v2 baseline and are unchanged: the defeated dynamic import of
`factory.ts`, and the single >500 kB chunk (no code splitting).

**After the Phase 0 fix in §4, the suite is 48 suites / 569 tests, 0 failing.** The 554-test contract
is intact and extended by 15; nothing was deleted, skipped, weakened or mocked.

---

## 2. ⚠️ Repository drift — the recorded baseline no longer described the repository

This is the single most important finding of Phase 0, and it is a process finding rather than a code
defect.

`docs/V2_BASELINE.md` §11 recorded a production bundle of **907.44 kB**. The first V3 measurement
returned **939.13 kB** with a different content hash, and the worker chunk had grown 31.35 → 36.78 kB.
No change I had made could account for +31.7 kB. Rather than dismiss it, I checked modification times:

```
2026-08-25 23:01  30885  src/architecture/pages/FsmDesigner.tsx      ← did not exist at v2 audit
2026-08-25 23:00  11894  src/architecture/pages/ArchitecturePage.tsx
2026-08-25 22:58  40811  src/state/store.ts
2026-08-25 22:57  11292  src/architecture/engine/fsmEngine.ts        ← did not exist at v2 audit
2026-08-25 22:54  32104  src/core/components/factory.ts
2026-08-25 22:50  69116  src/engine/simulation.ts
2026-08-25 22:49  27975  src/ui/panels/Sidebar.tsx
--- my last v2 edit was 22:05 ---
```

⚙️ **PROVEN.** Seven files were modified *after* the v2 baseline was frozen, including two new files.
An FSM subsystem was added, and `store.ts`, `factory.ts`, `simulation.ts` and `Sidebar.tsx` were
touched.

Three consequences, all recorded rather than papered over:

1. `docs/V2_ARCHITECTURE_AUDIT.md` §8 states "FSM designer: NOT IMPLEMENTED (0 matching files)".
   That entry is now **stale**. See §5 for the full staleness list.
2. The new code arrived with the test count unchanged at 554 — so **the FSM subsystem shipped with
   zero tests**. §4 proves it was also functionally broken.
3. **The repository is not under version control** (`git` absent, confirmed at v2 baseline). There is
   therefore no way to attribute a change, diff it, or revert it. Every future baseline in this
   project is only as trustworthy as the mtimes on disk.

**Recommendation (a decision for the user, not taken unilaterally): run `git init` and commit.**
Without it, "no regressions" cannot be enforced mechanically — only re-measured, which is what
happened here by luck of a 31 kB discrepancy.

---

## 3. The nine dimensions V2 never audited

V3 §1 lists audit dimensions beyond the v2 scope. Each is examined below with its evidence.

### V3-P0-1 — FSM synthesis produced `0` for every equation ✅ **FIXED in Phase 0** (see §4)

⚙️ **PROVEN.** Covers V3 §1 "fake simulation logic", §1 "duplicate systems", §25 "fake results".

### V3-P0-2 — `REGISTER_FILE` and `SHIFT_REGISTER` render and place but cannot simulate

⚙️ **PROVEN.** Directly violates V3 §0: *"Do not create visual-only components that don't actually
simulate."*

Method: extracted the three independent component registries and diffed them.

| Registry | Source | Count |
|---|---|---|
| `createPins` cases | `src/core/components/factory.ts` | 67 |
| `registry.register(...)` logic | `src/engine/simulation.ts` | 66 |
| explicit `type === '…'` draw branches | `src/renderer/canvas/renderer.ts` | 56 |

Seven types have pins **and** a render branch but **no `LogicFunction`**. Calling `createPins` on each
gives ground truth on whether that is legitimate:

| Type | Inputs | Outputs | Verdict |
|---|---|---|---|
| `LED` | `A` | **none** | ✅ correct — pure sink |
| `RGB_LED` | `R,G,B` | **none** | ✅ correct — pure sink |
| `SEVEN_SEGMENT` | `a…g` | **none** | ✅ correct — pure sink |
| `HEX_DISPLAY` | `D0…D3` | **none** | ✅ correct — pure sink |
| `LCD` | `CLK,DATA` | **none** | ⚠️ sink, but see V3-P2-1 |
| **`REGISTER_FILE`** | `RA0,RA1,RB0,RB1,WA0,WA1,WE,CLK,WD0…WD3` | **`QA0…QA3,QB0…QB3`** | ❌ **BROKEN** |
| **`SHIFT_REGISTER`** | `SIN,LOAD,DIR,CLK,D0…D3` | **`Q0…Q3,SOUT`** | ❌ **BROKEN** |

A sink with zero outputs needs no logic function — the renderer reads `pin.currentValue` directly and
`LED` correctly distinguishes HIGH / LOW / FLOATING / ERROR and honours `activeLow`
(`renderer.ts:434-441`). **My initial hypothesis that all seven were broken was wrong, and the five
sinks must be left alone.**

But `REGISTER_FILE` (8 outputs) and `SHIFT_REGISTER` (5 outputs) have outputs that nothing ever
drives. The mechanism is `simulation.ts:568`:

```ts
if (!this.registry.has(comp.type)) continue;   // silently skipped, no diagnostic
```

📄 **READ.** So their outputs stay `UNKNOWN` forever and **the user is never told why**. `SHIFT_REGISTER`
even models a universal bidirectional shift register (`LOAD`, `DIR`, `SIN`, `SOUT`) — pins for a
feature with no engine behind it. Both are explicitly required by V3 §2 (registers/shift registers)
and §10 (register file).

Sub-finding **V3-P1-1**: that silent `continue` is itself a defect. An unsimulatable component placed
on the canvas should raise a diagnostic, not fail quietly.

### V3-P0-3 — leaked `window` keydown listener strands an entire renderer per teardown

📄 **READ**, mechanism fully visible. Covers V3 §1 "memory leaks".

`renderer.ts` attaches 10 listeners. Nine are on `canvas` and die with the element — **not leaks.**
The tenth is not:

```ts
// renderer.ts:1616
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && this.wireStartPinId) { … }
});
```

```ts
// renderer.ts:1626 — destroy()
destroy() {
  if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
  this.resizeObserver?.disconnect();
  this.canvas = null;
  this.ctx = null;
}
```

`destroy()` never removes it, and because the handler is an inline arrow it **cannot** be removed as
written — no reference is retained. The closure captures `this`, so each stranded handler pins a whole
`CircuitRenderer` (canvas ref, wire state, caches) in memory and keeps mutating a renderer whose
`canvas` is already `null`.

`App.tsx:130-134` does call `destroy()` on unmount, so the leak triggers on every remount — and under
React 18 StrictMode, development mounts effects twice, so **at least one renderer leaks immediately on
first load**. ❓ **UNVERIFIED**: the exact per-remount byte cost (no heap snapshot was taken, so no
figure is quoted).

### V3-P1-2 — 29 whole-store subscriptions cause app-wide re-render on every simulation tick

⚙️ **PROVEN** by count. Covers V3 §1 "unnecessary re-renders" and §23.

| Pattern | Count |
|---|---|
| `useAppStore()` — **no selector, subscribes to the entire store** | **29** across **25 files** |
| `useAppStore(s => …)` — selector-scoped | **5** |

In Zustand, a bare `useAppStore()` re-renders the component on *any* store mutation. The simulation
writes to the store every tick, so all 25 components — `Sidebar`, `PropertiesPanel`, `Toolbar`,
`BottomPanel`, `WaveformViewer`, `StatusBar`, and 10 architecture pages — re-render on every tick,
whether or not they display anything that changed.

❓ **UNVERIFIED**: the resulting frame-rate cost. **No performance number may be quoted** until a
benchmark is actually run (V3 §23 stress tests, Phase 13). The defect is the subscription breadth,
which is a fact; its magnitude is not yet measured.

### V3-P1-3 — accessibility is entirely absent

⚙️ **PROVEN** by exhaustive count over `src/**/*.tsx`. Covers V3 §1 "accessibility problems".

| Attribute | Occurrences |
|---|---|
| `aria-label` | **0** |
| `role=` | **0** |
| `aria-labelledby` | **0** |
| `aria-describedby` | **0** |
| `aria-expanded` | **0** |
| `aria-hidden` | **0** |
| `tabIndex` | **0** |
| `alt=` | **0** |

Against **215 `<button>` elements** in **61 `.tsx` files**. There is no focus trap in any modal and
no skip link, and no `role`/`aria-expanded` on the collapsible library sections, so their state is not
conveyed.

> **Correction (Phase 1).** An earlier revision of this entry claimed icon-only buttons "are announced
> as *button* with no name". That was wrong, and the correction matters because it changes how much
> work this item is. ⚙️ **PROVEN** by reading the real Chromium accessibility tree of the production
> build (`preview_snapshot` against `dist/` served over http): buttons expose usable accessible names
> — `button: "New Project (Ctrl+N)"`, `button: "Pan (Space)"`, `button: "Probe Signal (P)"` — because
> the codebase sets `title` on them, and `title` is a valid accessible-name fallback. So the naming
> situation is materially better than the zero `aria-label` count suggests. What is genuinely missing
> is the rest: `role`, `aria-expanded`, `aria-hidden` on decorative glyphs, `alt`, focus traps, and a
> skip link. Revised severity: still real, no longer a total blocker.

### V3-P1-4 — two fake exports shown as working features

📄 **READ**. Directly violates V3 §25: *"If a feature is shown in the UI, it must actually work."*

`src/ui/panels/ImportExportModal.tsx` presents an export centre. Two of its buttons ignore the user's
work entirely and download a hardcoded literal:

- **line 258 — "Truth Table Export (CSV)"** emits a fixed full-adder table
  (`"A,B,Cin,SUM,Cout\n0,0,0,0,0\n…"`) regardless of the circuit on the canvas.
- **line 284 — "8086 Assembly Source (.asm)"** emits a fixed 4-instruction program
  (`MOV AX, 0005H / MOV BX, 0003H / ADD AX, BX / HLT`) regardless of what the user wrote.

The surrounding copy claims otherwise ("Export truth table combinations", "Download current assembly
source code"). SVG/PNG/`.lpro`/share-link export on the same panel **are** real. These two are not.

### V3-P1-5 — three §22 keyboard shortcuts missing

📄 **READ** of the single handler in `App.tsx:31-68`.

Implemented and genuine: `Ctrl+Z`, `Ctrl+Y`/`Ctrl+Shift+Z`, `Ctrl+S`, `Ctrl+N`, `Ctrl+A`, `Ctrl+C`,
`Ctrl+X`, `Ctrl+V`, `Ctrl+D`, `Delete`/`Backspace`, `R` (rotate), `S`/`W`/`P`/`T`/`D` (tools),
`F5`/`F6`/`F7` (run/step/reset), `Escape`. Text-input guarding via `isInput` is present and correct.

Named in V3 §22 but **absent**: **`Space`** (pan), **`F`** (zoom-to-fit), **`G`** (grid toggle).

### V3-P2-1 — `LCD` is a sink with no character buffer

📄 **READ**. `LCD` has inputs `CLK,DATA` and no outputs, so it needs no `LogicFunction` — but a real
character LCD must latch data into an internal buffer on `CLK`. Nothing in the renderer can accumulate
state across ticks. Honest status: **PARTIALLY IMPLEMENTED** — it draws a panel, it cannot display a
serially-clocked message.

### V3-P2-2 — 18 simulating components have no dedicated render branch

📄 **READ**. Covers V3 §1 "components that simulate but are incorrectly rendered".

These have working logic but fall through to the generic box: `BCD_DECODER`, `BCD_ENCODER`,
`BCD_TO_7SEG`, `BUS_TAP`, `CARRY_LOOKAHEAD_ADDER`, `DECADE_COUNTER`, `D_LATCH`, `FIFO`,
`FULL_SUBTRACTOR`, `GRAY_DECODER`, `GRAY_ENCODER`, `HALF_SUBTRACTOR`, `JOHNSON_COUNTER`, `LIFO`,
`RING_COUNTER`, `SR_FLIPFLOP`, `STACK`, `TUNNEL`.

A labelled generic box is defensible for most of these and is **not** a bug. Two are not: `TUNNEL` and
`BUS_TAP` carry connectivity semantics a plain rectangle actively misrepresents (and `TUNNEL` is
already a known-broken V2 finding, P0-7).

**Not a finding:** `AND`, `OR`, `XOR`, `NAND`, `NOR`, `XNOR` appear to have "logic but no
`createPins` case". They are handled by the `default:` branch with `inputCount`. Working as designed —
**do not touch.**

### Dimensions examined and found clean (or already covered)

| Dimension (V3 §1) | Outcome |
|---|---|
| Broken event propagation | Two `window` keydown handlers coexist (`App.tsx`, `renderer.ts:1616`), but they handle **complementary** concerns — `Escape` cancels a wire draw in one and clears selection in the other. Not a double-handling defect. The real problem there is the leak (V3-P0-3). |
| Race conditions | ❓ **UNVERIFIED** — not reachable by static reading. Deferred to Phase 13 with the worker/async paths. Recorded as unknown, **not** as clean. |
| Inconsistent coordinate systems | ❓ **UNVERIFIED** — `drawComponent` uses a single consistent translate→rotate→translate-back convention (`renderer.ts:307-315`); no inconsistency surfaced, but hit-testing vs. drawing was not exhaustively cross-checked. |
| Memory leaks | Covered — V3-P0-3. Timers: 16 `set*`/`requestAnimationFrame` vs 10 clear/cancel; the gap is concentrated in the leaked handler and short-lived `setTimeout` UI resets, which do not leak. |
| Duplicate systems | Covered — V3-P0-1 (a second Boolean minimizer). |
| Serialization problems | Covered by V2 (`projectMigration` hardened, 9 regression tests). |
| Electron-specific bugs | Covered by V2 P0-2 — **still open**, see §5. |
| PWA / offline | Covered by V2 P1-7 — **still open**; service worker precaches 4 paths and omits the hashed bundles. |

---

## 4. Fixed during Phase 0 — V3-P0-1

The one finding severe enough to fix inside the audit phase, because it made a shipped UI display
wrong answers.

### Symptom

⚙️ **PROVEN** by probe. `minimizeSOP` in `src/architecture/engine/fsmEngine.ts` returned `'0'` for
**every non-trivial input**:

```
SOP([1],2vars)      = "0"      ← should be A'B
SOP([0,1],2vars)    = "0"      ← should be A'
SOP([1,2],2vars)XOR = "0"      ← should be A'B + AB'
SOP([0,7],3vars)    = "0"      ← should be A'B'C' + ABC
SOP([0,1,2,3],2v)   = "1"      ← only the degenerate paths worked
SOP([],2vars)       = "0"
```

Consequently a textbook 2-state toggle machine synthesized to:

```
SYNTH_D   numFF=1  {"D_A":"0","Z0":"0"}
SYNTH_JK  numFF=1  {"J_A":"0","K_A":"0","Z0":"0"}
SYNTH_T   numFF=1  {"T_A":"0","Z0":"0"}
```

`FsmDesigner.tsx` auto-synthesizes on every edit (line 212-216) and renders `synthesis.equations`
(line 666). So the designer displayed `D_A = 0` for a correct machine — a wrong answer presented as a
result, which V3 §25 forbids.

### Root cause

📄 **READ**, then confirmed by the fix. In the greedy cover loop, the essential-prime-implicant branch
assigned `best` but never assigned `bestScore` (left at `-1`). The very next line was:

```ts
if (!best || bestScore <= 0) break;
```

so the essential implicant was immediately discarded and the cover stayed empty. Because that branch
fires first for almost any real function, nothing was ever selected.

### Fix — delete the duplicate, delegate to the tested engine

The project already contains a complete, **test-covered** Quine-McCluskey + Petrick minimizer at
`src/engine/analysis/boolean/quineMcCluskey.ts`, exercised by `boolean_engine.test.ts`,
`kmap_5var.test.ts` and `kmap_6var.test.ts`. `minimizeSOP` was a second, unreviewed implementation of
the same algorithm — exactly what the directive's *"Before creating a new subsystem, inspect whether an
existing engine can be reused"* and *"never create a second source of truth"* prohibit.

Verified first that the existing engine returns the right answers for every failing case:

```
QMC([1],2v)  = "A'B"       QMC([1,2],2v) = "A'B + AB'"    QMC([0,1],2v) = "A'"
QMC([0,7],3v)= "A'B'C' + ABC"                              QMC([1],[3],2v) = "B"
QMC toggle D_A = "A'I0 + AI0'"   QMC toggle T_A = "I0"     QMC moore Z0 = "A"
```

Then replaced ~88 lines of broken duplicate logic with an 8-line delegation, keeping the exported
signature identical so both call sites were untouched. Net effect: one fewer minimizer, one fewer
source of truth.

**Deliberately left alone** (verified correct, per *"if an existing implementation already solves a
problem correctly: LEAVE IT ALONE"*): `bitsNeeded`, `encodeStates`, `buildStateTable`,
`dExcitation`/`jkExcitation`/`tExcitation`, `buildExcitationTable`, `createBlankMachine`. The state
table and the JK/T excitation rules were already right, and the regression test now pins them.

### Verification

`tests/regression/regression_fsm_minimize_sop_returned_zero.test.ts` — **15 tests**, asserted against
known-correct textbook answers rather than against current output. Includes an exhaustive sweep
proving no single-minterm function of 1–4 variables returns `'0'` (30 cases).

| Gate | Before | After |
|---|---|---|
| `npx tsc --noEmit` | 0 errors | ✅ 0 errors |
| `npx vitest run` | 47 suites / 554 | ✅ **48 suites / 569**, 0 failing |
| `npm run lint` | 0 errors | ✅ 0 errors |

**Still open on the FSM subsystem** (not fixed, not hidden):

- **V3-P1-6 — "Synthesize Circuit" does not exist.** V3 §7 requires synthesis to *"contain real gates,
  flip-flops, wires, inputs, outputs and be inserted into the actual simulator canvas."*
  `FsmDesigner.tsx` contains no `addComponent`, no `addWire` and no `useAppStore` import — ⚙️ **PROVEN**
  by grep. It produces equations and tables only. Honest status: **PARTIALLY IMPLEMENTED**.
- The rest of `fsmEngine.ts` still has no direct unit-test file of its own beyond the regression file.

---

## 5. Carried forward from `docs/V2_ARCHITECTURE_AUDIT.md`

Still open and still valid. Highest priority first; these map onto V3 Phase 1 and Phase 3.

| ID | Summary | V3 phase |
|---|---|---|
| **P0-2** | Electron IPC: `fs:read-file` / `fs:write-file` / `fs:backup-file` accept **any** path with no allow-list, confinement or size limit; `sandbox: false`; no CSP in shipped `index.html`; no `will-navigate` / `setWindowOpenHandler` | 1 (§0 step 7, PHASE 35) |
| **P0-3 / P0-7** | `SPLITTER` / `MERGER` / `TUNNEL` do not actually move multi-bit values | 3 |
| **P0-4** | `bidirectional` pins never write back | 1 |
| **P0-5** | No oscillation detector; `MAX_SETTLE = 20` silently gives up | 1 |
| **P0-6** | 8086 invalid opcode not surfaced | 9 |
| **P1-1** | Reducing a component's bit width **silently deletes every wire** on the removed pins (⚙️ PROVEN in v2: `ADDER` 8→4 bits drops 12 pins and their wires) | 3 |
| **P1-2** | `wireRouter` discards the requested routing style whenever obstacles are passed — and `updateWiresForComponents` always passes every component, so `switch (style)` is unreachable in practice (⚙️ PROVEN in v2) | 3 |
| **P1-3** | Per-component propagation delay not scheduled | 1 |
| **P1-4** | Boolean law names partly untranslated (French) | 7 |
| **P1-5** | Assembler accepts invalid operand combinations | 9 |
| **P1-6** | 8086 run loop blocks; truncation not flagged | 9 |
| **P1-7** | Service worker precaches 4 paths, **omits the hashed bundles**; `CACHE_NAME` never build-stamped | 12 |

### Corrections — V2 entries proven **stale** by §2

| V2 claim | Correct status |
|---|---|
| §8 "FSM designer — NOT IMPLEMENTED (0 files)" | ❌ stale. `fsmEngine.ts` + `FsmDesigner.tsx` exist; engine real, minimizer was broken (§4), canvas synthesis still missing |
| §8 component/logic counts | ❌ stale. Now 67 `createPins` cases, 66 logic registrations, 56 render branches |
| §1 "545 tests" | superseded: 554 at V3 Phase 0 start, **569** now |
| §5 bundle 907.44 kB | superseded: 939.13 kB (cause identified in §2) |

### Still-outstanding user decision, unchanged

14 npm advisories (2 critical, 10 high) all require major-version jumps — `electron 31→44` (affects
the **shipped runtime**), `vite 5→8`, `vitest 1→4`, `electron-builder 24→26`. Recommended as an
isolated phase with full re-verification. Not applied unilaterally against a 569-test contract.

---

## 6. Verified correct — DO NOT REWRITE

Per *"If you discover that an existing implementation already solves a problem correctly: LEAVE IT
ALONE."* Each of these was actively suspected and then cleared.

| Subsystem | Evidence |
|---|---|
| `LED`, `RGB_LED`, `SEVEN_SEGMENT`, `HEX_DISPLAY` | ⚙️ Zero output pins — correct sinks. `LED` handles HIGH/LOW/FLOATING/ERROR and `activeLow` |
| `quineMcCluskey` engine | ⚙️ Correct on all 13 probe cases incl. don't-cares; 3 test files depend on it |
| `buildStateTable`, JK/T excitation helpers | ⚙️ Match textbook rules exactly; now pinned by 15 regression tests |
| `updateWiresForComponents` | 📄 Never drops a wire — returns `w` unchanged when a pin position is not found |
| `addComponent` | 📄 Never touches `circuit.wires` |
| Name-keyed pin-ID reuse in `updateComponentProperty` | ⚙️ No duplicate pin names across all 52→67 types × 3 property sets, so ID reuse cannot collide |
| `projectMigration` | ⚙️ 9 regression tests: every wire survives, malformed input repaired, no prototype pollution |
| Generic gate `default:` fallthrough | 📄 `AND/OR/XOR/NAND/NOR/XNOR` intentionally handled with `inputCount` |
| Keyboard text-input guarding | 📄 `isInput` check correctly suppresses shortcuts while typing |
| `Io8086Lab` port map | 📄 `IN`/`OUT` genuinely read/write `portMap` state — minimal but real, not fake |

---

## 7. Scope inventory against V3 §2–§29 — measured, not assumed

Counted by searching `src/` for each subsystem. **Nothing below is claimed as working.**

| V3 § | Subsystem | Status |
|---|---|---|
| §6 | Logic analyzer / oscilloscope | `WaveformViewer.tsx` + 13 waveform files exist; no `LogicAnalyzer`, **no VCD export (0 files)**, no trigger/cursor engine → **PARTIAL** |
| §7 | FSM designer | engine + UI real; **canvas synthesis absent** → **PARTIAL** (V3-P1-6) |
| §8 | Boolean lab | substantial: 19 files incl. QMC, Petrick, hazard, XOR-opt, laws → **LARGELY PRESENT** |
| §9 | K-map 2–6 vars | 18 files incl. `kmap_5var` / `kmap_6var` tests → **LARGELY PRESENT** |
| §5 | Diagnostics / "why is my output wrong" tracer | **0 files → NOT IMPLEMENTED** |
| §11 | Cache & memory hierarchy lab | 4 loose matches, no cache engine → **NOT IMPLEMENTED** |
| §13 | 8086 bus timing (T1–T4, Tw) | 4 loose matches, no T-state engine → **NOT IMPLEMENTED** |
| §14 | 8255 PPI / 8253 PIT / 8259 PIC | descriptive cards + `sampleCode` strings in `Io8086Lab.tsx` only; no register-level state machines (no IRR/ISR/IMR, no counter modes, no Mode 0/1/2) → **NOT IMPLEMENTED** |
| §15 | Virtual I/O reacting to `OUT 60H, AL` | port map exists but is **button-driven, not wired to the CPU engine**; no device bound to a port → **NOT IMPLEMENTED** |
| §17 | Learning Center, 14 courses | 2 loose matches → **NOT IMPLEMENTED** |
| §18 | Automated testbench | **0 files → NOT IMPLEMENTED** |
| §19 | Verilog / VHDL export | **0 files each → NOT IMPLEMENTED** |
| §20 | Logisim `.circ` import | **0 files → NOT IMPLEMENTED** |
| §23 | Performance stress tests to 10 000 components | no benchmark exists; **no performance number may be quoted** |

---

## 8. Execution order for the V3 phases

Ordered by "wrong answers shown to users" first, then security, then correctness, then new features —
consistent with V3 §26 while respecting that a shipped wrong answer outranks a missing feature.

| # | Work | Findings |
|---|---|---|
| 0 | ✅ Audit + baseline + FSM minimizer | **done** — V3-P0-1 |
| 1 | ✅ Electron IPC confinement, CSP, navigation handlers | **done** — V2 P0-2 (see §9) |
| 2 | Remove the two fake exports (derive real CSV / real `.asm`) | V3-P1-4 |
| 3 | `REGISTER_FILE` + `SHIFT_REGISTER` logic; diagnostic for unsimulatable components | V3-P0-2, V3-P1-1 |
| 4 | Leaked `window` keydown listener | V3-P0-3 |
| 5 | Wire-loss warning on bit-width reduction; routing-style obstacle fix | V2 P1-1, P1-2 |
| 6 | Bus system: `SPLITTER`/`MERGER`/`TUNNEL` real multi-bit values | V2 P0-3, P0-7 |
| 7 | Oscillation detector; `bidirectional` write-back | V2 P0-5, P0-4 |
| 8 | FSM "Synthesize Circuit" onto the real canvas | V3-P1-6 |
| 9 | `Space` / `F` / `G` shortcuts; `role`/`aria-expanded`/focus-trap pass; skip link | V3-P1-5, V3-P1-3 |
| 10 | Selector-scope the 29 whole-store subscriptions | V3-P1-2 |
| 11 | Diagnostics panel + backward tracer | §5 |
| 12 | Logic analyzer triggers/cursors + VCD & CSV export | §6 |
| 13 | Verilog / VHDL export; Logisim `.circ` import | §19, §20 |
| 14 | Memory/cache lab; 8086 T-states; 8255/8253/8259; virtual I/O | §11–§15 |
| 15 | Testbench; Learning Center; performance benchmarks; final QA | §18, §17, §23, §28 |

After every step: `npx tsc --noEmit` → 0, `npx vitest run` → ≥ 616 passing / 0 failing,
`npm run build:renderer` → exit 0, plus a
`tests/regression/regression_<feature>_<bug>.test.ts` for each bug fixed. On any failure: stop, find
the regression, fix the implementation, re-run the failed test, re-run the whole suite, continue only
when green.

---

## 9. Fixed during Phase 1 — Electron IPC confinement, CSP, navigation

Mandated identically by all three directives: *"Protect Electron IPC"*, *"Never allow an imported
project to execute operating-system commands"*, *"Never execute arbitrary imported code."*

### 9.1 The hole

📄 **READ** of `electron/main.ts` in full. Four handlers took a string from the renderer and passed it
straight to `fs`/`shell` with no validation whatsoever:

```ts
ipcMain.handle('fs:read-file',   async (_e, filePath: string) => await fs.promises.readFile(filePath, 'utf-8'));
ipcMain.handle('fs:write-file',  async (_e, filePath: string, content: string) => { await fs.promises.writeFile(filePath, content, 'utf-8'); return true; });
ipcMain.handle('fs:backup-file', async (_e, filePath: string) => { /* copyFile to `${filePath}.bak` */ });
ipcMain.handle('shell:show-in-folder', (_e, filePath: string) => { /* showItemInFolder */ });
```

Any script executing in the renderer — including one reached through a malicious `.lpro` project —
could read or overwrite **any file the user account could reach**. `app:open-url` accepted any
`http:`/`https:` string on a bare `startsWith` test.

⚙️ **PROVEN** that confinement breaks no real flow, by enumerating every renderer call site first:

| Bridge | Renderer call sites |
|---|---|
| `writeFile` | **0** |
| `backupFile` | **0** |
| `showInFolder` | **0** |
| `readFile` | 2 — `App.tsx:342`, `App.tsx:355`, both with a path the **main process itself supplied** (`getInitialFile()` / `app:open-file-requested`) |
| `openUrl` | 2 — both the literal `https://github.com/logisim-pro/logisim-pro/releases` |

### 9.2 The fix

New pure module **`electron/security/pathGuard.ts`** — imports only `path`, never `electron`, so the
entire ruleset is unit-testable without an Electron runtime (V3 §0's "must have tests", and PHASE 40's
"a feature is NOT complete merely because `tsc` passes").

- Confinement decided by `path.relative`, **never** `startsWith`: a prefix test would accept
  `C:\Users\pcEVIL\payload.lpro` against a `C:\Users\pc` root. Both flavours (`path.win32`,
  `path.posix`) are injectable and both are tested.
- Checks applied to the **symlink-resolved** path, and the resolved path is what the caller then
  operates on — so a `.lpro` inside Documents that is a link to `System32\config\SAM` is refused.
  Non-existent save targets fall back to validating the parent directory.
- Extension allow-list; UNC/device-path rejection (`\\?\`, `\\.\`, remote shares); NTFS
  alternate-data-stream rejection; NUL-byte, wildcard, length and non-absolute rejection.
- Read/write roots separated: writes may not touch the installation directory.
- Dialog-chosen paths are recorded in a bounded `grantedPaths` set and bypass the *roots* check
  (user consent is the authority) but not the structural checks.
- 32 MB read cap on `fs:read-file` **and** on `dialog:open-file`, so a hostile or mistaken path
  cannot make the main process allocate unboundedly.
- `app:open-url` → `https:` only, host allow-list, credentials rejected. Refusals are logged rather
  than silently swallowed, but the handler still does not throw, preserving its previous contract.
- `will-navigate`, `setWindowOpenHandler` (always `deny`, external links handed to the OS browser
  only if they pass the URL check) and `will-attach-webview` (always prevented).
- Device permissions denied via a **deny-list**, not an allow-list — deliberately, so it cannot
  regress a permission the app legitimately needs. `fullscreen` (presentation mode) and clipboard
  *write* (six copy buttons) keep working; camera/mic/geolocation/USB/HID/serial/MIDI/notifications/
  `clipboard-read`/`openExternal` are refused.

### 9.3 Content-Security-Policy — ⚙️ verified in a real browser, not assumed

Injected into the **production** document only, by a `transformIndexHtml` plugin with
`apply: 'build'`, so `vite dev`'s inline react-refresh preamble is untouched. The service-worker
registration was moved out of `index.html` into `public/sw-register.js` precisely so that
`script-src` needs no `'unsafe-inline'`; it was also added to the SW precache list so the shell still
works on a first offline load.

Loosening was decided by reading the source, not by guessing: `src` contains **no** `eval`, **no**
`new Function`, **no** `<iframe>`, **no** `dangerouslySetInnerHTML`, **no** `fetch`/XHR/WebSocket and
**no** media elements — so `'unsafe-eval'` is absent, `object-src`/`frame-src`/`media-src` are `'none'`
and `connect-src` is same-origin only.

Verified against `dist/` served over http in a real Chromium:

| Check | Result |
|---|---|
| App boots, toolbar + component library render | ✅ |
| Built module worker `simulation.worker-D44yab3e.js` constructs | ✅ |
| `blob:` worker runs | ✅ `"alive"` |
| Simulation actually ticks | ✅ `T=393` → `T=394` |
| Element inline styles (React / framer-motion) apply | ✅ |
| Google Fonts stylesheet + `.woff2` load; `body` resolves to `Inter` | ✅ |
| Injected **inline script is blocked** — i.e. the policy is enforcing, not inert | ✅ *"Executing inline script violates … 'script-src 'self' file:'"* |
| Console errors, blocked requests | none |

### 9.4 Honest residuals — NOT fixed, and why

- **`sandbox: false` is unchanged.** The preload is built as ESM (`preload.mjs`) and Electron's
  sandboxed preloads do not support ESM. Flipping it blind could break the packaged application,
  which cannot be launched or verified in this environment. Deliberate, recorded deferral.
- **`style-src` still needs `'unsafe-inline'`** because React `style={{…}}` props and framer-motion
  write element style attributes. `script-src` — the directive that matters — has no `'unsafe-inline'`.
- **CSP under `file://` is not execution-verified.** Every fetch directive therefore carries `file:`
  alongside `'self'`, so the packaged app loads regardless of which `'self'` interpretation applies.
  ❓ **UNVERIFIED** by execution; verified only by reasoning + the http run.
- **Typography is still fetched from `fonts.googleapis.com` / `fonts.gstatic.com`**, so the CSP has to
  permit those two hosts and offline typography degrades. Self-hosting the two families would let both
  be dropped; it changes rendering, so it belongs in its own step with a visual check.
- **`electron/` was outside every tsconfig** (`tsconfig.json` included only `src`;
  `tsconfig.node.json` only `vite.config.ts`), so the entire main process was never type-checked.
  Now added to `tsconfig.json` — it type-checks with **0 errors**. `npm run lint` likewise only
  covered `src`; now `src electron`, also **0**.

### 9.5 New finding — V3-P1-7: the test suite is outside the type gate

⚙️ **PROVEN** with a temporary tsconfig over `src + electron + tests`: `electron/` yields 0 errors,
but `tests/` yields **35**. `tsconfig.json` includes only `src`, so no test file has ever been
type-checked. Most are unused-import noise (`TS6133`/`TS6196`), but three are real drift that the
runtime happens to tolerate:

| File | Error | Why it matters |
|---|---|---|
| `tests/unit/architecture_io_system.test.ts` | `TS2554: Expected 3 arguments, but got 2` ×20 | the test calls a signature that has since gained a required parameter; JS silently passes `undefined` |
| `tests/unit/constants_and_nets.test.ts:219` | `TS2540: Cannot assign to 'rotation'` — read-only | the test mutates a property the type forbids |
| `tests/unit/e2e_simulation_pipeline.test.ts:289` | `TS2345`: `Project` missing `libraries`, `settings` | the fixture is an out-of-date shape of `Project` |

Not fixed here: bringing `tests` into the gate means changing 35 call sites, which is its own step and
must not be mixed into a security change. Recorded so it is not mistaken for clean.

### 9.6 Gate after Phase 1

| Gate | Result |
|---|---|
| `npx tsc --noEmit` (now **including `electron/`**) | **0 errors** |
| `npx vitest run` | **49 suites / 616 tests passed, 0 failed** (554 baseline → 569 after Phase 0 → 616 now) |
| `npm run build:renderer` | **exit 0** — `dist-electron/main.js` = **14.33 kB** from "2 modules transformed", confirming `pathGuard.ts` is genuinely bundled into the shipped main process rather than only type-checked (the pre-change size was not captured, so no delta is claimed) |
| `npm run lint` (now **including `electron/`**) | **0 errors** |

No existing test was deleted, weakened, skipped, mocked or modified. New regression file:
`tests/regression/regression_electron_ipc_path_confinement.test.ts` — **47 tests**.
