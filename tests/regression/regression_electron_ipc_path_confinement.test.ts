/**
 * REGRESSION — Electron IPC accepted arbitrary filesystem paths from the renderer.
 *
 * Bug: `fs:read-file`, `fs:write-file`, `fs:backup-file` and `shell:show-in-folder` in
 * electron/main.ts passed the renderer's string straight to `fs` with no validation:
 *
 *     ipcMain.handle('fs:read-file', async (_event, filePath: string) =>
 *       await fs.promises.readFile(filePath, 'utf-8'));
 *
 * Any script running in the renderer — including one reachable through a malicious `.lpro`
 * project — could therefore read or overwrite any file the user account could reach
 * (`C:\Users\<user>\.ssh\id_rsa`, `%APPDATA%\...`, and so on). `app:open-url` accepted any
 * `http:`/`https:` string via a `startsWith` test.
 *
 * Fix: electron/security/pathGuard.ts, a pure module the main process consults before every
 * filesystem or shell call. These tests exercise that module directly, because the Electron
 * main process cannot be booted under Vitest.
 *
 * Both path flavours are tested explicitly (`path.win32` / `path.posix`) so the rules are
 * verified on any host, not only the one that happens to run CI.
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  checkPath,
  checkExternalUrl,
  isWithinRoot,
  normalizeForCompare,
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_EXTERNAL_HOSTS,
  MAX_PATH_LENGTH,
  MAX_FILE_BYTES,
} from '../../electron/security/pathGuard';

const win = path.win32;
const posix = path.posix;

/** Windows-flavoured options rooted at a user Documents directory. */
const winOpts = (extra: Record<string, unknown> = {}) => ({
  roots: ['C:\\Users\\pc\\Documents'],
  extensions: ALLOWED_FILE_EXTENSIONS,
  pathApi: win,
  ...extra,
});

const posixOpts = (extra: Record<string, unknown> = {}) => ({
  roots: ['/home/pc/Documents'],
  extensions: ALLOWED_FILE_EXTENSIONS,
  pathApi: posix,
  ...extra,
});

describe('regression: path confinement rejects escapes from the allowed roots', () => {
  it('accepts a normal project file inside an allowed root', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\adder.lpro', winOpts());
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.resolved).toBe('C:\\Users\\pc\\Documents\\adder.lpro');
  });

  it('accepts a project file in a nested subdirectory of an allowed root', () => {
    expect(checkPath('C:\\Users\\pc\\Documents\\labs\\week3\\mux.lpro', winOpts()).ok).toBe(true);
  });

  it('rejects `..` traversal out of the root', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\..\\.ssh\\id_rsa', winOpts());
    expect(verdict.ok).toBe(false);
  });

  it('rejects deep `..` traversal even when the tail extension is allowed', () => {
    const verdict = checkPath(
      'C:\\Users\\pc\\Documents\\..\\..\\..\\Windows\\System32\\drivers\\etc\\hosts.txt',
      winOpts()
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('outside-allowed-roots');
  });

  it('rejects a sibling directory whose name merely begins with the root name', () => {
    // The whole reason the guard uses path.relative instead of startsWith: a naive prefix
    // test would accept this, because the string does start with "C:\Users\pc".
    const verdict = checkPath('C:\\Users\\pcEVIL\\payload.lpro', {
      roots: ['C:\\Users\\pc'],
      extensions: ALLOWED_FILE_EXTENSIONS,
      pathApi: win,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('outside-allowed-roots');
  });

  it('rejects the same sibling-prefix escape on posix', () => {
    const verdict = checkPath('/home/pcEVIL/payload.lpro', {
      roots: ['/home/pc'],
      extensions: ALLOWED_FILE_EXTENSIONS,
      pathApi: posix,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('outside-allowed-roots');
  });

  it('rejects a path on a different Windows drive', () => {
    const verdict = checkPath('D:\\secrets\\keys.json', winOpts());
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('outside-allowed-roots');
  });

  it('rejects the allowed root directory itself (it is not a file within itself)', () => {
    expect(checkPath('C:\\Users\\pc\\Documents', winOpts()).ok).toBe(false);
  });

  it('rejects UNC and Windows device paths', () => {
    expect(checkPath('\\\\attacker\\share\\evil.lpro', winOpts()).ok).toBe(false);
    expect(checkPath('\\\\?\\C:\\Users\\pc\\Documents\\a.lpro', winOpts()).ok).toBe(false);
    expect(checkPath('\\\\.\\PhysicalDrive0', winOpts()).ok).toBe(false);
  });

  it('rejects an NTFS alternate data stream', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\notes:hidden.lpro', winOpts());
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('alternate-data-stream');
  });

  it('honours multiple roots independently', () => {
    const opts = {
      roots: ['C:\\Users\\pc\\Documents', 'C:\\Users\\pc\\Desktop'],
      extensions: ALLOWED_FILE_EXTENSIONS,
      pathApi: win,
    };
    expect(checkPath('C:\\Users\\pc\\Desktop\\a.lpro', opts).ok).toBe(true);
    expect(checkPath('C:\\Users\\pc\\Documents\\b.lpro', opts).ok).toBe(true);
    expect(checkPath('C:\\Users\\pc\\Downloads\\c.lpro', opts).ok).toBe(false);
  });

  it('refuses everything when no roots are configured', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\a.lpro', {
      roots: [],
      pathApi: win,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('no-roots-configured');
  });
});

describe('regression: path confinement rejects malformed input from the renderer', () => {
  it('rejects non-string values', () => {
    for (const bad of [undefined, null, 42, {}, [], true, Symbol('x')]) {
      const verdict = checkPath(bad, winOpts());
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.reason).toBe('not-a-string');
    }
  });

  it('rejects the empty string', () => {
    const verdict = checkPath('', winOpts());
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('empty');
  });

  it('rejects a NUL byte, which would truncate the path inside libuv', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\a.lpro\0.png', winOpts());
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('nul-byte');
  });

  it('rejects an absurdly long path', () => {
    const long = `C:\\Users\\pc\\Documents\\${'a'.repeat(MAX_PATH_LENGTH)}.lpro`;
    const verdict = checkPath(long, winOpts());
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('too-long');
  });

  it('rejects wildcard and other characters illegal in filenames', () => {
    for (const bad of [
      'C:\\Users\\pc\\Documents\\*.lpro',
      'C:\\Users\\pc\\Documents\\a?.lpro',
      'C:\\Users\\pc\\Documents\\a<b.lpro',
      'C:\\Users\\pc\\Documents\\a|b.lpro',
    ]) {
      const verdict = checkPath(bad, winOpts());
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.reason).toBe('invalid-characters');
    }
  });

  it('rejects relative paths, which would resolve against an unpredictable cwd', () => {
    const verdict = checkPath('adder.lpro', winOpts());
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('not-absolute');
  });
});

describe('regression: extension allow-list', () => {
  it('rejects an executable, script, or credential file inside an allowed root', () => {
    for (const bad of [
      'C:\\Users\\pc\\Documents\\evil.exe',
      'C:\\Users\\pc\\Documents\\evil.bat',
      'C:\\Users\\pc\\Documents\\evil.ps1',
      'C:\\Users\\pc\\Documents\\evil.dll',
      'C:\\Users\\pc\\Documents\\id_rsa',
      'C:\\Users\\pc\\Documents\\.env',
    ]) {
      const verdict = checkPath(bad, winOpts());
      expect(verdict.ok, bad).toBe(false);
      if (!verdict.ok) expect(verdict.reason, bad).toBe('extension-not-allowed');
    }
  });

  it('accepts every extension the application actually reads or writes', () => {
    for (const ext of ALLOWED_FILE_EXTENSIONS) {
      expect(checkPath(`C:\\Users\\pc\\Documents\\file${ext}`, winOpts()).ok, ext).toBe(true);
    }
  });

  it('matches extensions case-insensitively', () => {
    expect(checkPath('C:\\Users\\pc\\Documents\\ADDER.LPRO', winOpts()).ok).toBe(true);
  });

  it('covers the formats the V3 feature set exports', () => {
    // Guards against a future edit silently dropping one of these from the allow-list.
    for (const ext of ['.lpro', '.circ', '.v', '.vhd', '.csv', '.vcd', '.png', '.svg', '.asm']) {
      expect(ALLOWED_FILE_EXTENSIONS, ext).toContain(ext);
    }
  });

  it('skips the extension check when no list is supplied', () => {
    expect(
      checkPath('C:\\Users\\pc\\Documents\\anything.xyz', { roots: winOpts().roots, pathApi: win })
        .ok
    ).toBe(true);
  });
});

describe('regression: dialog-granted paths bypass the roots, but nothing else does', () => {
  it('accepts a user-chosen file outside every root', () => {
    const chosen = 'E:\\coursework\\final\\cpu.lpro';
    const verdict = checkPath(chosen, winOpts({ granted: [chosen] }));
    expect(verdict.ok).toBe(true);
  });

  it('accepts a granted path spelled with different case on Windows', () => {
    const verdict = checkPath('e:\\COURSEWORK\\cpu.lpro', {
      ...winOpts(),
      granted: ['E:\\coursework\\cpu.lpro'],
    });
    expect(verdict.ok).toBe(true);
  });

  it('does NOT accept a different file in the same granted directory', () => {
    const verdict = checkPath('E:\\coursework\\other.lpro', {
      ...winOpts(),
      granted: ['E:\\coursework\\cpu.lpro'],
    });
    expect(verdict.ok).toBe(false);
  });

  it('does not let a granted path smuggle a traversal to another file', () => {
    const verdict = checkPath('E:\\coursework\\cpu.lpro\\..\\..\\Windows\\win.ini', {
      ...winOpts(),
      granted: ['E:\\coursework\\cpu.lpro'],
    });
    expect(verdict.ok).toBe(false);
  });

  it('still rejects malformed granted candidates', () => {
    expect(checkPath('', winOpts({ granted: [''] })).ok).toBe(false);
    expect(checkPath('relative.lpro', winOpts({ granted: ['relative.lpro'] })).ok).toBe(false);
  });

  it('is case-sensitive for granted paths on posix', () => {
    expect(
      checkPath('/tmp/CPU.lpro', { ...posixOpts(), granted: ['/tmp/cpu.lpro'] }).ok
    ).toBe(false);
    expect(checkPath('/tmp/cpu.lpro', { ...posixOpts(), granted: ['/tmp/cpu.lpro'] }).ok).toBe(
      true
    );
  });
});

describe('regression: symlinks cannot launder a path into an allowed root', () => {
  it('applies the roots check to the resolved target, not the link', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\innocent.lpro', {
      ...winOpts(),
      // Stand-in for fs.realpathSync.native: the "project file" is a link out of Documents.
      realpath: () => 'C:\\Windows\\System32\\config\\SAM.lpro',
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('outside-allowed-roots');
  });

  it('applies the extension check to the resolved target too', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\innocent.lpro', {
      ...winOpts(),
      realpath: () => 'C:\\Users\\pc\\Documents\\actually-a-binary.exe',
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('extension-not-allowed');
  });

  it('returns the resolved target so the caller operates on the verified path', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\link.lpro', {
      ...winOpts(),
      realpath: () => 'C:\\Users\\pc\\Documents\\real\\target.lpro',
    });
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.resolved).toBe('C:\\Users\\pc\\Documents\\real\\target.lpro');
  });

  it('falls back to the parent directory when the file does not exist yet (save targets)', () => {
    // A brand-new "Save As" target has no realpath of its own; the parent must still be checked.
    const verdict = checkPath('C:\\Users\\pc\\Documents\\brand-new.lpro', {
      ...winOpts(),
      realpath: (p: string) => {
        if (p === 'C:\\Users\\pc\\Documents\\brand-new.lpro') throw new Error('ENOENT');
        return p;
      },
    });
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.resolved).toBe('C:\\Users\\pc\\Documents\\brand-new.lpro');
  });

  it('rejects a new file whose parent directory is a link out of the roots', () => {
    const verdict = checkPath('C:\\Users\\pc\\Documents\\escape\\new.lpro', {
      ...winOpts(),
      realpath: (p: string) => {
        if (p === 'C:\\Users\\pc\\Documents\\escape\\new.lpro') throw new Error('ENOENT');
        if (p === 'C:\\Users\\pc\\Documents\\escape') return 'C:\\Windows\\Temp';
        return p;
      },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('outside-allowed-roots');
  });
});

describe('regression: isWithinRoot primitive', () => {
  it('is true only for strict descendants', () => {
    expect(isWithinRoot('/home/pc/Documents/a.lpro', '/home/pc/Documents', posix)).toBe(true);
    expect(isWithinRoot('/home/pc/Documents/x/y/a.lpro', '/home/pc/Documents', posix)).toBe(true);
    expect(isWithinRoot('/home/pc/Documents', '/home/pc/Documents', posix)).toBe(false);
    expect(isWithinRoot('/home/pc', '/home/pc/Documents', posix)).toBe(false);
    expect(isWithinRoot('/home/pc/Documents2/a.lpro', '/home/pc/Documents', posix)).toBe(false);
  });

  it('allows a legitimate file whose own name starts with two dots', () => {
    // `..foo` is a valid filename; the guard must not confuse it with traversal.
    expect(isWithinRoot('/home/pc/Documents/..foo.lpro', '/home/pc/Documents', posix)).toBe(true);
  });

  it('normalizes before comparing, so an inner `..` that stays inside is fine', () => {
    expect(isWithinRoot('/home/pc/Documents/x/../y.lpro', '/home/pc/Documents', posix)).toBe(true);
  });
});

describe('regression: normalizeForCompare', () => {
  it('folds case on Windows and preserves it on posix', () => {
    expect(normalizeForCompare('C:\\Users\\PC\\A.LPRO', win)).toBe('c:\\users\\pc\\a.lpro');
    expect(normalizeForCompare('/home/PC/A.lpro', posix)).toBe('/home/PC/A.lpro');
  });
});

describe('regression: app:open-url accepted any http(s) string', () => {
  it('accepts the release page the application actually links to', () => {
    const verdict = checkExternalUrl('https://github.com/logisim-pro/logisim-pro/releases');
    expect(verdict.ok).toBe(true);
  });

  it('accepts a subdomain of an allowed host but not a look-alike suffix', () => {
    expect(checkExternalUrl('https://raw.github.com/x').ok).toBe(true);
    expect(checkExternalUrl('https://github.com.evil.tld/x').ok).toBe(false);
    expect(checkExternalUrl('https://notgithub.com/x').ok).toBe(false);
  });

  it('rejects non-https schemes, including the shell-execution vectors', () => {
    for (const bad of [
      'http://github.com/x',
      'file:///C:/Windows/System32/calc.exe',
      'file://attacker/share/evil.exe',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ms-msdt:/id PCWDiagnostic',
      'search-ms:query=x',
      'vbscript:msgbox(1)',
      'smb://attacker/share',
    ]) {
      const verdict = checkExternalUrl(bad);
      expect(verdict.ok, bad).toBe(false);
    }
  });

  it('rejects embedded credentials', () => {
    const verdict = checkExternalUrl('https://user:pass@github.com/x');
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('has-credentials');
  });

  it('rejects non-strings and unparseable values', () => {
    expect(checkExternalUrl(undefined).ok).toBe(false);
    expect(checkExternalUrl(null).ok).toBe(false);
    expect(checkExternalUrl(42).ok).toBe(false);
    expect(checkExternalUrl('not a url').ok).toBe(false);
    expect(checkExternalUrl('//github.com/x').ok).toBe(false);
  });

  it('rejects an absurdly long URL', () => {
    expect(checkExternalUrl(`https://github.com/${'a'.repeat(4000)}`).ok).toBe(false);
  });

  it('honours a caller-supplied host allow-list', () => {
    expect(checkExternalUrl('https://example.org/x', ['example.org']).ok).toBe(true);
    expect(checkExternalUrl('https://github.com/x', ['example.org']).ok).toBe(false);
  });

  it('keeps github.com in the default host list', () => {
    expect(ALLOWED_EXTERNAL_HOSTS).toContain('github.com');
  });
});

describe('regression: read size cap exists and is sane', () => {
  it('is large enough for real projects and small enough to prevent an OOM', () => {
    expect(MAX_FILE_BYTES).toBeGreaterThan(4 * 1024 * 1024);
    expect(MAX_FILE_BYTES).toBeLessThanOrEqual(64 * 1024 * 1024);
  });
});
