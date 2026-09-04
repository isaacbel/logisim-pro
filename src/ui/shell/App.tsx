import { useEffect, useRef, useState, useCallback } from 'react';
import { CircuitRenderer } from '@renderer/canvas/renderer';
import { useAppStore } from '@state/store';
import { Toolbar } from '@ui/toolbar/Toolbar';
import { Sidebar } from '@ui/panels/Sidebar';
import { PropertiesPanel } from '@ui/properties/PropertiesPanel';
import { StatusBar } from '@ui/panels/StatusBar';
import { SimulationControls } from '@ui/panels/SimulationControls';
import { BottomPanel } from '@ui/panels/BottomPanel';
import { ContextMenu } from '@ui/shell/ContextMenu';
import { WelcomePage } from '@ui/pages/WelcomePage';
import { ArchitecturePage } from '@/architecture/pages/ArchitecturePage';
import { simulationService } from '@/services/SimulationService';
import { downloadProject, parseProject, serializeProject, promptOpenProject, loadProjectFromUrl } from '@/services/ProjectStorage';
import { DownloadCenterModal } from '@ui/panels/DownloadCenterModal';
import { ExamplesModal } from '@ui/panels/ExamplesModal';
import { ImportExportModal } from '@ui/panels/ImportExportModal';
import { SettingsModal } from '@ui/panels/SettingsModal';
import { OnboardingModal } from '@ui/panels/OnboardingModal';
import { Home } from 'lucide-react';

// ── Keyboard shortcut map ─────────────────────────────────────────────────────
function useKeyboardShortcuts(active: boolean) {
  const store = useAppStore;

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      const s = store.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const isInput = e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement;

      if (ctrl && e.key === 'z') { e.preventDefault(); s.undo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); s.redo(); }
      if (ctrl && e.key === 's') { e.preventDefault(); if (s.project) downloadProject(s.project, s.probes, s.viewport); }
      if (ctrl && e.key === 'n') { e.preventDefault(); s.newProject(); }
      if (ctrl && e.key === 'a') {
        if (isInput) return;
        e.preventDefault();
        const circuit = s.project?.circuits.find(c => c.id === s.currentCircuitId);
        circuit?.components.forEach(component => s.selectComponent(component.id, true));
      }
      if (ctrl && e.key === 'c') { if (!isInput) { e.preventDefault(); s.copySelected(); } }
      if (ctrl && e.key === 'x') { if (!isInput) { e.preventDefault(); s.cutSelected(); } }
      if (ctrl && e.key === 'v') { if (!isInput) { e.preventDefault(); s.paste(); } }
      if (ctrl && e.key === 'd') { if (!isInput) { e.preventDefault(); s.duplicateSelected(); } }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isInput) return;
        e.preventDefault();
        s.deleteSelected();
      }

      if (!ctrl && !e.altKey && !isInput) {
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); s.rotateSelectedComponents(90); }
        if (e.key === 's' || e.key === 'S') s.setTool('select');
        if (e.key === 'w' || e.key === 'W') s.setTool('wire');
        if (e.key === 'p' || e.key === 'P') s.setTool('probe');
        if (e.key === 't' || e.key === 'T') s.setTool('text');
        if (e.key === 'd' || e.key === 'D') s.setTool('delete');

        if (e.key === 'F5') { e.preventDefault(); void (s.simulation.isRunning ? simulationService.pause() : simulationService.run()); }
        if (e.key === 'F6') { e.preventDefault(); void simulationService.step(); }
        if (e.key === 'F7') { e.preventDefault(); void simulationService.reset(); }
        if (e.key === 'Escape') { s.setTool('select'); s.clearSelection(); }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}

// ── Theme sync ────────────────────────────────────────────────────────────────
function useThemeSync() {
  const theme = useAppStore(s => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
}

// ── Circuit Canvas ────────────────────────────────────────────────────────────
function CircuitCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CircuitRenderer | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const currentTool = useAppStore(s => s.editor.currentTool);
  const setViewport = useAppStore(s => s.setViewport);
  const setRenderStats = useAppStore(s => s.setRenderStats);
  const hasComponents = useAppStore(s => {
    const circuit = s.project?.circuits.find(c => c.id === s.currentCircuitId);
    return (circuit?.components.length ?? 0) > 0;
  });

  useEffect(() => {
    if (hasComponents) setShowHint(false);
  }, [hasComponents]);

  const initRenderer = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    if (rendererRef.current) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const renderer = new CircuitRenderer();
    renderer.init(canvas).then(() => {
      renderer.on('stats', (stats) => setRenderStats(stats));
      renderer.on('contextMenu', (pos: { x: number; y: number }) => setContextMenuPos(pos));
    });
    rendererRef.current = renderer;
    setViewport({ width: rect.width, height: rect.height });
  }, [setViewport, setRenderStats]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      if (!rendererRef.current) initRenderer();
      setViewport({ width, height });
    });
    ro.observe(container);
    initRenderer();
    return () => {
      ro.disconnect();
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [initRenderer, setViewport]);

  const cursorMap: Record<string, string> = {
    select: 'default', pan: 'grab', wire: 'crosshair',
    probe: 'cell', component: 'copy', text: 'text', delete: 'not-allowed',
  };

  return (
    <div ref={containerRef} className="app-canvas-container" data-testid="canvas-container">
      <canvas
        ref={canvasRef}
        id="circuit-canvas"
        data-testid="canvas"
        style={{ display: 'block', width: '100%', height: '100%', cursor: cursorMap[currentTool] ?? 'default' }}
      />
      <SimulationControls />
      {contextMenuPos && (
        <ContextMenu x={contextMenuPos.x} y={contextMenuPos.y} onClose={() => setContextMenuPos(null)} />
      )}
      {showHint && !hasComponents && (
        <div className="welcome-overlay">
          <div className="welcome-card animate-fade-in">
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Start Your Circuit
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Drag a component from the left panel onto the canvas,
              or click a component then click the canvas to place it.
            </p>
            <button
              onClick={() => setShowHint(false)}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Home Breadcrumb Nav ───────────────────────────────────────────────────────
function HomeBreadcrumb({ label }: { label: string }) {
  const setAppMode = useAppStore(s => s.setAppMode);
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      height: 40,
      background: 'var(--toolbar-bg)',
      borderBottom: '1px solid var(--border)',
      borderRight: '1px solid var(--border)',
      paddingRight: 12,
    }}>
      <button
        onClick={() => setAppMode('welcome')}
        title="Back to Home"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'color 0.15s',
          fontFamily: 'var(--font-sans)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <Home size={13} />
        Home
      </button>
      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
      <span style={{ padding: '0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        {label}
      </span>
    </div>
  );
}

// ── Simulator Workspace ───────────────────────────────────────────────────────
function SimulatorWorkspace() {
  return (
    <div className="app-shell">
      <Toolbar />
      <div className="app-main-area">
        <Sidebar />
        <div className="app-workspace">
          <CircuitCanvas />
          <BottomPanel />
        </div>
        <PropertiesPanel />
      </div>
      <StatusBar />
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const appMode = useAppStore(s => s.appMode);
  useKeyboardShortcuts(appMode === 'simulator');
  useThemeSync();

  // Modal Dialog States
  const [showDownloadCenter, setShowDownloadCenter] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const store = useAppStore;

    // 1. Check if opened with a shared URL project payload
    const urlProject = loadProjectFromUrl();
    if (urlProject) {
      store.getState().loadProjectFile(urlProject.project, urlProject.probes, urlProject.viewport);
      store.getState().setAppMode('simulator');
      window.location.hash = '';
    } else {
      // 2. Try loading from autosave cache
      try {
        const saved = localStorage.getItem('logisim-pro-autosave');
        if (saved) {
          const recovered = parseProject(saved);
          store.getState().loadProjectFile(recovered.project, recovered.probes, recovered.viewport);
        } else if (!store.getState().project) {
          store.getState().newProject();
        }
      } catch {
        if (!store.getState().project) store.getState().newProject();
      }
    }

    // 3. Register autosave subscriber
    const unsubscribe = store.subscribe(state => {
      if (state.project) {
        localStorage.setItem('logisim-pro-autosave', serializeProject(state.project, state.probes, state.viewport));
      }
    });

    // 4. Register Electron Menu IPC Listeners
    const electronApi = window.electronAPI;
    const cleanups: (() => void)[] = [];

    if (electronApi) {
      // File menu actions
      cleanups.push(electronApi.onMenuAction('menu:new-project', () => {
        store.getState().newProject();
        store.getState().setAppMode('simulator');
      }));

      cleanups.push(electronApi.onMenuAction('menu:open-project', async () => {
        const opened = await promptOpenProject();
        if (opened) {
          store.getState().loadProjectFile(opened.project, opened.probes, opened.viewport);
          store.getState().setAppMode('simulator');
        }
      }));

      cleanups.push(electronApi.onMenuAction('menu:save-project', () => {
        const s = store.getState();
        if (s.project) downloadProject(s.project, s.probes, s.viewport);
      }));

      cleanups.push(electronApi.onMenuAction('menu:save-project-as', () => {
        const s = store.getState();
        if (s.project) downloadProject(s.project, s.probes, s.viewport);
      }));

      cleanups.push(electronApi.onMenuAction('menu:import-export', () => setShowImportExport(true)));
      cleanups.push(electronApi.onMenuAction('menu:open-examples', () => setShowExamples(true)));
      cleanups.push(electronApi.onMenuAction('menu:download-center', () => setShowDownloadCenter(true)));
      cleanups.push(electronApi.onMenuAction('menu:onboarding', () => setShowOnboarding(true)));
      cleanups.push(electronApi.onMenuAction('menu:about', () => setShowDownloadCenter(true)));
      cleanups.push(electronApi.onMenuAction('menu:documentation', () => setShowOnboarding(true)));

      // Edit menu actions
      cleanups.push(electronApi.onMenuAction('menu:undo', () => store.getState().undo()));
      cleanups.push(electronApi.onMenuAction('menu:redo', () => store.getState().redo()));

      // View menu actions
      cleanups.push(electronApi.onMenuAction('menu:toggle-presentation', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }));

      // OS File Association Handler (.lpro opened from Windows Explorer)
      cleanups.push(electronApi.onOpenFileRequested(async (filePath: string) => {
        try {
          const raw = await electronApi.readFile(filePath);
          const parsed = parseProject(raw);
          store.getState().loadProjectFile(parsed.project, parsed.probes, parsed.viewport);
          store.getState().setAppMode('simulator');
        } catch (err) {
          console.error('Failed to load project from OS file association:', err);
        }
      }));

      // Check if an initial file was passed on app start
      electronApi.getInitialFile?.().then(async (filePath: string | null) => {
        if (filePath) {
          try {
            const raw = await electronApi.readFile(filePath);
            const parsed = parseProject(raw);
            store.getState().loadProjectFile(parsed.project, parsed.probes, parsed.viewport);
            store.getState().setAppMode('simulator');
          } catch (err) {
            console.error('Failed to load initial file:', err);
          }
        }
      });
    }

    return () => {
      unsubscribe();
      cleanups.forEach(c => c());
      simulationService.dispose();
    };
  }, []);

  return (
    <>
      {appMode === 'welcome' && <WelcomePage />}

      {appMode === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--canvas-bg)', fontFamily: 'var(--font-sans)' }}>
          <HomeBreadcrumb label="Computer Architecture Lab" />
          <ArchitecturePage />
        </div>
      )}

      {appMode === 'simulator' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <SimulatorWorkspace />
        </div>
      )}

      {/* Global Application Modals */}
      <DownloadCenterModal isOpen={showDownloadCenter} onClose={() => setShowDownloadCenter(false)} />
      <ExamplesModal isOpen={showExamples} onClose={() => setShowExamples(false)} />
      <ImportExportModal isOpen={showImportExport} onClose={() => setShowImportExport(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  );
}

