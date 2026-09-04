# LOGISIM PRO v2.0 — RECORDED BASELINE

**Purpose.** This file satisfies **ABSOLUTE RULE #1 — NO REGRESSIONS**: the exact state of the
repository *before* any v2.0 modification. Every number below is copied from real command output,
not estimated. Any future change that moves a number in the wrong direction is a regression.

| Field | Value |
|---|---|
| Recorded | 2026-08-25 → 2026-08-26 (local) |
| Repo | `C:\Users\pc\Desktop\logisim-pro-starter` |
| Git | **not a git repository** — no commit hash available to pin this baseline to |
| OS | Windows 11 Pro 10.0.26200 |
| Node | v24.13.1 |
| npm | 11.8.0 |
| App version | `package.json` → `1.0.0` |

**Source files changed to produce this baseline: none.** `src/`, `electron/` and `tests/` are
byte-identical to the state found at session start. The only files created are this document,
`docs/V2_ARCHITECTURE_AUDIT.md` and `docs/FULL_ARCHITECTURE_AUDIT.md`. Temporary probe tests were
used to obtain runtime evidence and were **deleted**; `tests/unit` is back to its original 46 files
(verified by count after deletion).

---

## 1. Summary scoreboard

| Gate (PHASE 42 release gate) | Baseline result |
|---|---|
| `npm install` | ❌ **FAIL** — exit 1, ERESOLVE |
| `npx tsc --noEmit` | ✅ **PASS** — 0 errors |
| `npx vitest run` | ✅ **PASS** — 46/46 suites, 545/545 tests |
| `npm run build:renderer` (production) | ✅ **PASS** — exit 0, with 2 warnings |
| Electron package (`electron-builder --dir`) | ✅ **PASS** — exit 0, real 180 MB exe produced |
| Electron NSIS installer (`dist:win`) | ⚠️ **NOT RUN** — status unknown, must not be claimed |
| Portable build (`dist:portable`) | ⚠️ **NOT RUN** — status unknown, must not be claimed |
| PWA / web build (`build:web`) | ⚠️ **NOT RUN** — status unknown, must not be claimed |
| `npm run lint` | ❌ **FAIL** — 15 errors under `--max-warnings 0` |
| Playwright e2e (`npm run test:e2e`) | ⚠️ **NOT RUN** |
| No P0 bugs remain | ❌ **FAIL** — see `V2_ARCHITECTURE_AUDIT.md` |

**The release gate does not currently pass.** Three of its criteria were never measured, so the
correct status for those is *unknown*, not *pass*.

---

## 2. `npm install` — FAIL (exit 1)

```
npm error Could not resolve dependency:
npm error peer eslint@"^9 || ^10" from eslint-plugin-react-refresh@0.5.3
npm error node_modules/eslint-plugin-react-refresh
npm error   dev eslint-plugin-react-refresh@"^0.5.3" from the root project
npm error
npm error Conflicting peer dependency: eslint@10.9.1
npm error node_modules/eslint
npm error   peer eslint@"^9 || ^10" from eslint-plugin-react-refresh@0.5.3
npm error   node_modules/eslint-plugin-react-refresh
npm error     dev eslint-plugin-react-refresh@"^0.5.3" from the root project
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
NPM_INSTALL_EXIT=1
```

Declared vs. resolvable:

| Package | `package.json` | Installed in `node_modules` | Peer requirement |
|---|---|---|---|
| `eslint` | `^8.57.0` | 8.57.1 | — |
| `eslint-plugin-react-refresh` | `^0.5.3` | 0.5.3 | `eslint@^9 \|\| ^10` ❌ |
| `eslint-plugin-react-hooks` | `^7.1.1` | 7.1.1 | wants eslint 9+ |
| `@typescript-eslint/*` | `^7.0.0` | 7.18.0 | eslint 8 era |

`npm ls eslint` confirms: `eslint@8.57.1 deduped invalid: "^9 || ^10" from
node_modules/eslint-plugin-react-refresh`.

**Consequence.** The existing `node_modules` (441 entries) only exists because a previous install
used `--force` or `--legacy-peer-deps`. A clean clone **cannot** run `npm install`, so it cannot
build, test, or be handed to another machine or to CI. Everything else in this baseline was measured
against that pre-existing, force-installed tree.

---

## 3. TypeScript — PASS (0 errors)

```
TSC_EXIT=0
```

`npx tsc --noEmit` under `strict` produced no diagnostics. Per PHASE 40, this is *not* evidence that
features work — several proven-broken components (SPLITTER, MERGER, TUNNEL) type-check perfectly.

---

## 4. Test suite — PASS (545/545). **This is the protected regression baseline.**

```
 Test Files  46 passed (46)
      Tests  545 passed (545)
   Start at  19:40:08
   Duration  9.00s (transform 3.80s, setup 13ms, collect 11.36s,
                    tests 1.07s, environment 51.96s, prepare 12.29s)
```

| Metric | Baseline |
|---|---|
| Test files | **46 passed / 46 total** |
| Tests | **545 passed / 545 total** |
| Failing | **0** |
| Skipped / todo | 0 |
| Runner | Vitest 1.6.1, jsdom environment |

Per **ABSOLUTE RULE #2**, these 545 assertions are a contract. No test may be deleted or weakened.
A test may only change if it is *objectively wrong*, and then only with: written justification, a new
regression test asserting the corrected behaviour, an intentional edit, and a documented behavioural
change. After every subsequent phase, this suite must report **≥ 545 passed, 0 failed**.

`tests/regression/` does **not exist** at baseline (required by PHASE 38 — to be created).

---

## 5. Production renderer build — PASS (exit 0)

`npm run build:renderer` = `tsc && vite build`.

```
vite v5.4.21 building for production...
✓ 1653 modules transformed.
dist/index.html                            1.78 kB │ gzip:   0.88 kB
dist/assets/simulation.worker-DPyDDGTJ.js 31.35 kB
dist/assets/index-qWnL08Yb.css            29.41 kB │ gzip:   6.40 kB
dist/assets/index-Owk06vKM.js            907.40 kB │ gzip: 224.60 kB │ map: 2,597.43 kB
✓ built in 22.49s
dist-electron/main.js     8.35 kB │ gzip: 2.51 kB   ✓ built in 15ms
dist-electron/preload.mjs 1.04 kB │ gzip: 0.40 kB   ✓ built in  8ms
BUILD_RENDERER_EXIT=0
```

### Build warning 1 — dynamic import defeated

```
(!) src/core/components/factory.ts is dynamically imported by src/state/store.ts
    but also statically imported by src/core/examples/exampleLibrary.ts,
    src/engine/analysis/boolean/expressionToCircuit.ts,
    src/renderer/canvas/renderer.ts, src/state/store.ts,
    dynamic import will not move module into another chunk.
```

The bundler confirms the `await import(...)` inside the store buys nothing — `factory.ts` has four
static importers, including the same file that imports it dynamically. The `async` code path is pure
overhead.

### Build warning 2 — no code splitting

```
(!) Some chunks are larger than 500 kB after minification.
```

One 907.40 kB JS chunk holds the entire app. This is also why the service worker cannot cache
incrementally (see §7).

**Baseline artifact sizes are recorded above and are themselves a regression metric:** a phase that
inflates `index-*.js` well past 907 kB without justification is a regression.

---

## 6. Electron packaging — PASS, verified by artifact

```
• electron-builder version=24.13.3 os=10.0.26200
• loaded configuration file=.../electron-builder.json5
• packaging platform=win32 arch=x64 electron=31.7.7 appOutDir=release\win-unpacked
PACK_EXIT=0
```

Exit code alone is not proof, so the output directory was inspected:

```
release/win-unpacked/
  Logisim Pro.exe          180,849,664 bytes
  resources/               (app payload)
  ffmpeg.dll, libEGL.dll, libGLESv2.dll, vk_swiftshader.dll, d3dcompiler_47.dll
  icudtl.dat, resources.pak, snapshot_blob.bin, v8_context_snapshot.bin
  locales/, LICENSES.chromium.html
```

**Verified:** the `--dir` pack produces a genuine, complete Electron distribution.
**Not verified:** that the exe *launches and runs correctly* — it was never executed. And the NSIS
installer and portable targets required by the release gate were never built. Those three remain
**unknown**.

---

## 7. Shipped-asset inspection of `dist/`

| Check | Result |
|---|---|
| `dist/sw.js` present | ✅ yes |
| `dist/manifest.json` present | ✅ yes |
| `dist/logo.svg` present | ✅ yes |
| `Content-Security-Policy` in `dist/index.html` | ❌ **0 occurrences** |
| `fonts.googleapis.com` in `dist/index.html` | ⚠️ **2 occurrences** |

The missing CSP and the remote font origins are not just a dev-server artifact — they survive into
the production HTML that Electron loads.

Service worker (`public/sw.js`, 96 lines) as shipped:

```js
const CACHE_NAME = 'logisim-pro-cache-v1.0.0';
const PRECACHE_ASSETS = ['/', '/index.html', '/logo.svg', '/manifest.json'];
```

The precache list **omits the hashed JS and CSS bundles** — i.e. it omits the application. The
`activate` handler deletes only caches whose name ≠ `CACHE_NAME`, and `CACHE_NAME` is a hardcoded
constant that no build step rewrites, so stale entries are never evicted and a redeploy can serve an
old shell that points at deleted asset hashes.

**Honest status of offline support: PARTIALLY IMPLEMENTED.** It must not be described as working
offline until the bundles are precached and the cache name is build-stamped.

---

## 8. Lint — FAIL (15 errors, `--max-warnings 0`)

```
✖ 15 problems (15 errors, 0 warnings)
  4 errors and 0 warnings potentially fixable with the `--fix` option.
```

Complete list, so that "fixed" can later be verified exactly:

| File | Line:Col | Rule |
|---|---|---|
| `src/architecture/engine/assembler8086.ts` | 283:7 | `prefer-const` (`codeSegment`) |
| `src/architecture/engine/assembler8086.ts` | 284:7 | `prefer-const` (`dataSegment`) |
| `src/core/project/projectMigration.ts` | 136:60 | `no-explicit-any` |
| `src/core/project/projectMigration.ts` | 146:67 | `no-explicit-any` |
| `src/core/project/projectMigration.ts` | 160:49 | `no-explicit-any` |
| `src/core/project/projectMigration.ts` | 177:39 | `no-explicit-any` |
| `src/engine/analysis/boolean/quineMcCluskey.ts` | 225:7 | `prefer-const` (`inverters`) |
| `src/services/ProjectStorage.ts` | 79:61 | `no-explicit-any` |
| `src/services/ProjectStorage.ts` | 120:61 | `no-explicit-any` |
| `src/state/store.ts` | 848:9 | `prefer-const` (`offsetX`) |
| `src/ui/panels/DownloadCenterModal.tsx` | 38:63 | `no-explicit-any` |
| `src/ui/panels/DownloadCenterModal.tsx` | 189:79 | `no-explicit-any` |
| `src/ui/panels/DownloadCenterModal.tsx` | 226:79 | `no-explicit-any` |
| `src/ui/panels/ImportExportModal.tsx` | 44:19 | `no-explicit-any` |
| `src/ui/shell/App.tsx` | 291:63 | `no-explicit-any` |

Note the four `any` casts in `projectMigration.ts` and two in `ProjectStorage.ts` sit exactly on the
untrusted-input path (imported project files), which is also a PHASE 35 security concern.

---

## 9. What this baseline deliberately does **not** claim

Per **ABSOLUTE RULE #3 — NO FAKE FEATURES**, the following were not measured and are therefore
recorded as unknown rather than passing:

- NSIS installer build
- Portable build
- PWA / `build:web` output
- Playwright end-to-end suite
- Runtime launch of the packaged exe
- Test coverage percentage (no coverage run was performed; the 545 tests are a count, not a coverage
  figure)
- Any performance number. No benchmark of FPS, component capacity, or simulation throughput was
  taken, so no such figure may be quoted anywhere.

---

## 10. Regression rule derived from this baseline

After **every** phase, the following must hold or the change is rejected:

1. `npx tsc --noEmit` → 0 errors.
2. `npx vitest run` → ≥ 545 tests passing, **0 failing**, 0 deleted, 0 weakened.
3. `npm run build:renderer` → exit 0.
4. A new `tests/regression/regression_<feature>_<bug>.test.ts` exists for every bug fixed.
5. Any number quoted to the user traces back to real captured output.

---

## 11. Change log since baseline

The numbers in §1–§9 are the frozen baseline and are never edited. Verified deltas are recorded
here instead.

### Δ1 — P0-1 fixed: the project installs cleanly

`package.json` devDependencies only:

| Package | Was | Now | Reason |
|---|---|---|---|
| `eslint-plugin-react-refresh` | `^0.5.3` | `^0.4.7` | 0.5.x peer-requires eslint 9/10 |
| `eslint-plugin-react-hooks` | `^7.1.1` | `^4.6.2` | 7.x targets eslint 9 flat config |

`npm audit fix` (in-range only, **no** `--force`) additionally lifted the transitive
`nanoid 3.3.16 → 3.3.18` under `postcss` — a build-time dependency, not shipped app code.

```
npm install → exit 0   (no --force, no --legacy-peer-deps)
```

Verified after the change: `tsc` 0 errors · **545/545 tests** · `build:renderer` exit 0 producing
**byte-identical** bundle hashes (`index-Owk06vKM.js`, `index-qWnL08Yb.css`), proving the dependency
change did not alter application output.

Deliberately **not** done: the remaining 14 audit advisories (2 critical, 10 high) all require
major-version jumps — `electron 31→44`, `vite 5→8`, `vitest 1→4`, `electron-builder 24→26` — which
would be breaking changes against a 545-test contract. They are recorded as a decision point in
`V2_ARCHITECTURE_AUDIT.md`, not silently applied. **The shipped Electron runtime is still 31.7.7 and
still carries a HIGH advisory.**

### Δ2 — P1-8 fixed: lint gate passes

```
npx eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0 → exit 0
15 errors → 0 errors
```

| Fix | Detail |
|---|---|
| 4 × `prefer-const` | `--fix`, mechanical (`assembler8086.ts:283,284`, `quineMcCluskey.ts:225`, `store.ts:848`) |
| 4 × `any` in `projectMigration.ts` | Replaced with explicit `RawProject`/`RawCircuit`/`RawComponent`/`RawWire` types. `sanitizeProject` signature changed from the *false* `(p: Project)` to the honest `(raw: unknown)`, so the untrusted-input contract is now visible in the type system. |
| 6 × `any` in the `electronAPI` window cast | Collapsed into **one** typed global (`src/types/electron.d.ts`) that type-imports the existing `ElectronAPI` interface from `electron/preload.ts` — single source of truth, no duplicated shape. Call sites are now plain `window.electronAPI`. |
| 1 × `any` in `ImportExportModal.tsx:44` | `catch (err: unknown)` with `err instanceof Error` narrowing. |

### Δ3 — PHASE 38 scaffold created

`tests/regression/` now exists. **`vitest.config.ts` had to be changed** — its `include` was
`['tests/unit/**', 'src/**']`, so regression tests would have silently never run:

```ts
include: ['tests/unit/**/*.test.ts', 'tests/regression/**/*.test.ts', 'src/**/*.test.ts'],
```

First regression file: `regression_project_migration_untrusted_input.test.ts`, 9 tests, all passing
on first run — which is itself the evidence that the Δ2 migration refactor changed no behaviour.

### Current verified totals

| Gate | Baseline | Now |
|---|---|---|
| `npm install` | ❌ exit 1 | ✅ **exit 0** |
| `npx tsc --noEmit` | ✅ 0 errors | ✅ 0 errors |
| `npx vitest run` | ✅ 46 suites / 545 tests | ✅ **47 suites / 554 tests**, 0 failing |
| `npm run build:renderer` | ✅ exit 0 | ✅ exit 0 (907.44 kB) |
| `npm run lint` | ❌ 15 errors | ✅ **0 errors** |
| NSIS / portable / PWA build | ⚠️ not run | ⚠️ still not run |
| No P0 bugs remain | ❌ | ❌ P0-2…P0-8 still open |

