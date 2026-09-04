/**
 * Path & URL confinement guard for the Electron main process.
 *
 * PURE MODULE — it imports only `path`. It must never import `electron`, so the whole
 * ruleset stays unit-testable under Vitest without an Electron runtime. The main process
 * supplies the environment-specific parts (allowed roots, the realpath resolver, the set of
 * paths the user consented to through a native dialog) as arguments.
 *
 * Why this exists: `fs:read-file`, `fs:write-file`, `fs:backup-file` and `shell:show-in-folder`
 * previously accepted any string from the renderer and passed it straight to `fs`. A malicious
 * `.lpro` project — or any injected script in the renderer — could therefore read or overwrite
 * arbitrary files on the user's disk. Required by the security phase of every project directive:
 * "Protect Electron IPC. Never allow an imported project to execute operating-system commands."
 *
 * Design notes:
 *  - Confinement is decided with `path.relative`, never `startsWith`. A prefix test would let
 *    `C:\Users\pcEVIL\payload.lpro` pass a `C:\Users\pc` root check.
 *  - The verdict carries the *real* (symlink-resolved) path, and callers must use that returned
 *    path for the actual filesystem operation rather than the string they were handed.
 *  - `PathApi` is injectable so both win32 and posix semantics can be tested on any host.
 *
 * Guarded by tests/regression/regression_electron_ipc_path_confinement.test.ts
 */
import nodePath from 'path';

// ─── Injectable path flavour ──────────────────────────────────────────────────

/** The subset of Node's `path` module this guard uses. Satisfied by `path`, `path.win32`, `path.posix`. */
export type PathApi = Pick<
  typeof nodePath,
  'resolve' | 'relative' | 'isAbsolute' | 'extname' | 'dirname' | 'basename' | 'join' | 'sep'
>;

function isWindowsLike(pathApi: PathApi): boolean {
  return pathApi.sep === '\\';
}

/**
 * Resolve `value` and fold case on Windows-like platforms so two spellings of the same file
 * compare equal. Used for granted-path membership tests.
 */
export function normalizeForCompare(value: string, pathApi: PathApi = nodePath): string {
  const resolved = pathApi.resolve(value);
  return isWindowsLike(pathApi) ? resolved.toLowerCase() : resolved;
}

// ─── Policy constants ─────────────────────────────────────────────────────────

/** Longest path string accepted from the renderer, before any filesystem call. */
export const MAX_PATH_LENGTH = 4096;

/**
 * Largest file the main process will read into a string for the renderer.
 * A project file is kilobytes; this only exists so a hostile or mistaken path cannot
 * make the main process allocate gigabytes and take the app down.
 */
export const MAX_FILE_BYTES = 32 * 1024 * 1024;

/** File kinds Logisim Pro actually reads or writes. Anything else is refused. */
export const ALLOWED_FILE_EXTENSIONS: readonly string[] = [
  '.lpro',
  '.json', // projects & shared circuits
  '.circ', // Logisim / Logisim Evolution import
  '.asm',
  '.8086asm', // assembly sources
  '.v',
  '.sv',
  '.vhd',
  '.vhdl', // HDL export
  '.csv',
  '.vcd', // logic-analyzer traces
  '.png',
  '.svg', // schematic images
  '.txt',
  '.md', // notes and reports
];

/** Hosts `shell.openExternal` may hand to the OS browser. */
export const ALLOWED_EXTERNAL_HOSTS: readonly string[] = ['github.com'];

/** Characters that are never valid in a Windows filename, and are traversal noise elsewhere. */
const INVALID_PATH_CHARS = /[<>"|?*]/;

// ─── Verdicts ─────────────────────────────────────────────────────────────────

export type PathRejectionReason =
  | 'not-a-string'
  | 'empty'
  | 'too-long'
  | 'nul-byte'
  | 'invalid-characters'
  | 'not-absolute'
  | 'unc-or-device-path'
  | 'alternate-data-stream'
  | 'extension-not-allowed'
  | 'no-roots-configured'
  | 'outside-allowed-roots';

export type PathVerdict =
  /** `resolved` is the symlink-resolved absolute path the caller must operate on. */
  | { ok: true; resolved: string }
  | { ok: false; reason: PathRejectionReason; detail?: string };

export interface PathGuardOptions {
  /** Absolute directories the path may live under. A path outside all of them is refused. */
  roots: readonly string[];
  /** Permitted extensions, lower-case and dot-prefixed. Omit to skip the extension check. */
  extensions?: readonly string[];
  /**
   * Absolute paths the user explicitly chose in a native dialog. These bypass the root and
   * extension checks — the user's consent is the authority — but must still be well-formed.
   */
  granted?: Iterable<string>;
  /** Symlink resolver, normally `fs.realpathSync.native`. Omit in tests for a purely lexical check. */
  realpath?: (p: string) => string;
  pathApi?: PathApi;
  maxLength?: number;
}

// ─── Confinement primitive ────────────────────────────────────────────────────

/**
 * True when `candidate` is a path strictly *inside* `root`.
 *
 * Uses `path.relative` rather than a string prefix test, so a sibling directory whose name
 * merely begins with the root's name cannot pass, and a different drive letter on Windows
 * yields an absolute relative-path and is refused.
 */
export function isWithinRoot(candidate: string, root: string, pathApi: PathApi = nodePath): boolean {
  const resolvedRoot = pathApi.resolve(root);
  const resolvedCandidate = pathApi.resolve(candidate);

  const rel = pathApi.relative(resolvedRoot, resolvedCandidate);
  if (rel === '') return false; // the root directory itself is not a file within it
  if (rel === '..') return false;
  if (rel.startsWith(`..${pathApi.sep}`)) return false;
  if (pathApi.isAbsolute(rel)) return false; // different drive / share
  return true;
}

// ─── Main check ───────────────────────────────────────────────────────────────

function resolveReal(lexical: string, pathApi: PathApi, realpath?: (p: string) => string): string {
  if (!realpath) return lexical;
  try {
    return realpath(lexical);
  } catch {
    // The file may not exist yet — a save target. Verify the parent instead, so a symlinked
    // directory still cannot be used to escape the allowed roots.
  }
  try {
    return pathApi.join(realpath(pathApi.dirname(lexical)), pathApi.basename(lexical));
  } catch {
    return lexical;
  }
}

/**
 * Decide whether the renderer may touch `candidate`.
 *
 * On success the caller MUST use `verdict.resolved` for the filesystem call: it is the
 * symlink-resolved path that was actually validated.
 */
export function checkPath(candidate: unknown, options: PathGuardOptions): PathVerdict {
  const pathApi = options.pathApi ?? nodePath;
  const maxLength = options.maxLength ?? MAX_PATH_LENGTH;

  // ── Structural checks on the raw string ──
  if (typeof candidate !== 'string') return { ok: false, reason: 'not-a-string' };
  if (candidate.length === 0) return { ok: false, reason: 'empty' };
  if (candidate.length > maxLength) return { ok: false, reason: 'too-long' };
  if (candidate.includes('\0')) return { ok: false, reason: 'nul-byte' };
  if (INVALID_PATH_CHARS.test(candidate)) return { ok: false, reason: 'invalid-characters' };
  if (!pathApi.isAbsolute(candidate)) return { ok: false, reason: 'not-absolute' };

  const lexical = pathApi.resolve(candidate);

  // ── User-consented paths short-circuit the policy checks ──
  if (options.granted) {
    const key = normalizeForCompare(lexical, pathApi);
    for (const grantedPath of options.granted) {
      if (normalizeForCompare(grantedPath, pathApi) === key) {
        return { ok: true, resolved: lexical };
      }
    }
  }

  // ── Everything below applies to the *real* path, so a symlink cannot launder the check ──
  const resolved = resolveReal(lexical, pathApi, options.realpath);

  if (isWindowsLike(pathApi)) {
    // `\\?\C:\...`, `\\.\PhysicalDrive0`, and remote shares all bypass normal normalization.
    if (resolved.startsWith('\\\\')) return { ok: false, reason: 'unc-or-device-path' };
    // `file.lpro:hidden` addresses an NTFS alternate data stream.
    if (pathApi.basename(resolved).includes(':')) {
      return { ok: false, reason: 'alternate-data-stream' };
    }
  }

  if (options.extensions) {
    const ext = pathApi.extname(resolved).toLowerCase();
    if (!options.extensions.includes(ext)) {
      return { ok: false, reason: 'extension-not-allowed', detail: ext || '(none)' };
    }
  }

  const roots = options.roots.filter(r => typeof r === 'string' && r.length > 0);
  if (roots.length === 0) return { ok: false, reason: 'no-roots-configured' };

  for (const root of roots) {
    if (isWithinRoot(resolved, root, pathApi)) return { ok: true, resolved };
  }
  return { ok: false, reason: 'outside-allowed-roots' };
}

// ─── External URL check ───────────────────────────────────────────────────────

export type UrlRejectionReason =
  | 'not-a-string'
  | 'too-long'
  | 'unparseable'
  | 'protocol-not-allowed'
  | 'has-credentials'
  | 'host-not-allowed';

export type UrlVerdict =
  | { ok: true; url: string }
  | { ok: false; reason: UrlRejectionReason; detail?: string };

/**
 * Decide whether a URL may be handed to `shell.openExternal` or navigated to.
 *
 * `https:` only. Non-http schemes passed to `openExternal` are a documented Electron
 * remote-code-execution vector on Windows (`file://` UNC paths, `ms-msdt:`, `search-ms:`),
 * and plain `http:` is a needless downgrade. The host allow-list is defence in depth: the
 * application only ever opens its own release page.
 */
export function checkExternalUrl(
  candidate: unknown,
  allowedHosts: readonly string[] = ALLOWED_EXTERNAL_HOSTS
): UrlVerdict {
  if (typeof candidate !== 'string') return { ok: false, reason: 'not-a-string' };
  if (candidate.length > 2048) return { ok: false, reason: 'too-long' };

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: 'unparseable' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'protocol-not-allowed', detail: parsed.protocol };
  }
  if (parsed.username !== '' || parsed.password !== '') {
    return { ok: false, reason: 'has-credentials' };
  }

  const host = parsed.hostname.toLowerCase();
  const permitted = allowedHosts.some(
    allowed => host === allowed.toLowerCase() || host.endsWith(`.${allowed.toLowerCase()}`)
  );
  if (!permitted) return { ok: false, reason: 'host-not-allowed', detail: host };

  return { ok: true, url: parsed.toString() };
}
