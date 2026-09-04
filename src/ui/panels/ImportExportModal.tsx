import { useMemo, useState } from 'react';
import {
  Download,
  Upload,
  FileCode,
  Image,
  Table,
  Cpu,
  Package,
  X,
  Copy,
  FileSpreadsheet,
  Share2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@state/store';
import { useCpu8086Store } from '@state/cpu8086Store';
import { downloadProject, promptOpenProject, serializeProject, shareProjectAsUrl } from '@/services/ProjectStorage';
import {
  CANVAS_CONSTANT_TYPES,
  CANVAS_OUTPUT_TYPES,
  CANVAS_STIMULUS_TYPES,
  MAX_TRUTH_TABLE_INPUTS,
  deriveCanvasTruthTable,
  summarizeCanvasTruthTable,
} from '@engine/analysis/canvasTruthTable';
import { exportTruthTableCSV } from '@engine/analysis/truthTable';
import { buildAsmExport } from '@/architecture/engine/asmExport';

/** Shared by the two text exports below; mirrors the blob/anchor pattern used for SVG above. */
function downloadTextFile(fileName: string, mimeType: string, contents: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function fileStem(name: string | undefined, fallback: string): string {
  return (name || fallback).replace(/\s+/g, '_');
}

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportExportModal({ isOpen, onClose }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'project' | 'image' | 'boolean' | '8086' | 'share'>('project');
  const [copied, setCopied] = useState<string | null>(null);
  const [note, setNote] = useState<{ tab: 'boolean' | '8086'; tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const { project, probes, viewport, currentCircuitId, setProject } = useAppStore();
  const sourceCode = useCpu8086Store(s => s.sourceCode);

  const circuit = useMemo(
    () => project?.circuits.find(c => c.id === currentCircuitId),
    [project, currentCircuitId],
  );

  /**
   * Pre-flight counts only: cheap type filtering, no simulation. The table itself is derived on
   * click, because that instantiates the engine once per input combination.
   */
  const preflight = useMemo(() => {
    const comps = circuit?.components ?? [];
    const stimulus = comps.filter(c => CANVAS_STIMULUS_TYPES.includes(c.type)).length;
    const outputs = comps.filter(c => CANVAS_OUTPUT_TYPES.includes(c.type)).length;
    const constants = comps.filter(c => CANVAS_CONSTANT_TYPES.includes(c.type)).length;
    const swept = Math.min(stimulus, MAX_TRUTH_TABLE_INPUTS);
    return { stimulus, outputs, constants, swept, rows: stimulus > 0 ? 1 << swept : 0 };
  }, [circuit]);

  if (!isOpen) return null;

  const handleExportProject = () => {
    if (project) {
      downloadProject(project, probes, viewport);
    }
  };

  const handleImportProject = async () => {
    try {
      const parsed = await promptOpenProject();
      if (parsed?.project) {
        setProject(parsed.project);
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : 'Invalid project file.';
      alert(`Import Failed: ${message}`);
    }
  };

  const handleExportSvg = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Circuit canvas not found.');
      return;
    }
    // Generate SVG wrapper around the canvas drawing or elements
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <rect width="100%" height="100%" fill="#0f172a"/>
      <text x="20" y="30" fill="#38bdf8" font-family="sans-serif" font-size="16" font-weight="bold">${project?.name || 'Circuit Schematic'} — Logisim Pro</text>
      <image href="${canvas.toDataURL('image/png')}" width="${canvas.width}" height="${canvas.height}" />
    </svg>`;

    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project?.name || 'circuit').replace(/\s+/g, '_')}_schematic.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPng = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Circuit canvas not found.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${(project?.name || 'circuit').replace(/\s+/g, '_')}_schematic.png`;
    a.click();
  };

  /**
   * Derives the truth table from the circuit actually on the canvas by running the real
   * SimulationEngine over every input combination, then serializes it with the engine's own CSV
   * writer. Nothing about the table is hardcoded, so a different circuit yields a different file.
   */
  const handleExportTruthTableCsv = () => {
    const outcome = deriveCanvasTruthTable(circuit?.components, circuit?.wires);
    if (!outcome.ok) {
      setNote({ tab: 'boolean', tone: 'error', text: `Nothing exported — ${outcome.message}` });
      return;
    }

    const { derivation } = outcome;
    downloadTextFile(
      `${fileStem(project?.name, 'circuit')}_truth_table.csv`,
      'text/csv;charset=utf-8',
      exportTruthTableCSV(derivation.table),
    );

    const incomplete = derivation.unsweptInputNames.length > 0 || derivation.unusableComponentNames.length > 0;
    setNote({
      tab: 'boolean',
      tone: incomplete ? 'warn' : 'ok',
      text: `Exported from the live circuit — ${summarizeCanvasTruthTable(derivation)}.`,
    });
  };

  /**
   * Exports the source currently in the 8086 editor, verbatim. The header is generated by
   * running the real assembler over that same text, so its figures describe the exported file.
   */
  const handleExportAsm = () => {
    const outcome = buildAsmExport(sourceCode, project?.name);
    if (!outcome.ok) {
      setNote({ tab: '8086', tone: 'error', text: `Nothing exported — ${outcome.message}` });
      return;
    }

    downloadTextFile(
      `${fileStem(project?.name, '8086_program')}.asm`,
      'text/plain;charset=utf-8',
      outcome.contents,
    );

    const { facts } = outcome;
    if (facts.errors.length > 0) {
      const first = facts.errors[0];
      setNote({
        tab: '8086',
        tone: 'warn',
        text: `Exported the editor source, but it does not assemble cleanly — ${facts.errors.length} error${facts.errors.length === 1 ? '' : 's'} (first: Line ${first.line}: ${first.message}). All errors are listed in the file header.`,
      });
      return;
    }

    setNote({
      tab: '8086',
      tone: facts.assembles ? 'ok' : 'warn',
      text: facts.assembles
        ? `Exported the editor source — ${facts.instructionCount} encoded instruction${facts.instructionCount === 1 ? '' : 's'}, ${facts.byteCount} byte${facts.byteCount === 1 ? '' : 's'} of machine code.`
        : 'Exported the editor source, but the assembler did not report success. See the file header.',
    });
  };

  const handleCopyJson = () => {
    if (!project) return;
    const json = serializeProject(project, probes, viewport);
    navigator.clipboard.writeText(json);
    setCopied('json');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Import & Export Center</h2>
              <p className="text-xs text-slate-400">Export circuit diagrams, project files, truth tables, and 8086 code.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'project'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Project (.lpro)
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'image'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-4 h-4" />
            Schematic Images
          </button>
          <button
            onClick={() => setActiveTab('boolean')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'boolean'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            Boolean & Tables
          </button>
          <button
            onClick={() => setActiveTab('8086')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === '8086'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            8086 Programs
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'share'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Student Share Link
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'project' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">Save Logisim Pro Project (.lpro)</h3>
                  <p className="text-xs text-slate-400">Exports all circuits, subcircuits, wires, probe waveforms, and metadata in one portable file.</p>
                </div>
                <button
                  onClick={handleExportProject}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all shrink-0"
                >
                  <Download className="w-4 h-4" /> Save .lpro
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">Open Project File (.lpro / .json)</h3>
                  <p className="text-xs text-slate-400">Load and automatically validate or migrate existing project files.</p>
                </div>
                <button
                  onClick={handleImportProject}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-all shrink-0"
                >
                  <Upload className="w-4 h-4" /> Open File...
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">Copy Project JSON to Clipboard</h3>
                  <p className="text-xs text-slate-400">Quickly share raw project data with teammates via chat or email.</p>
                </div>
                <button
                  onClick={handleCopyJson}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-all shrink-0"
                >
                  <Copy className="w-4 h-4" /> {copied === 'json' ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">Vector Graphics (SVG)</h3>
                  <p className="text-xs text-slate-400">Lossless resolution for textbook assignments, lab reports, and posters.</p>
                </div>
                <button
                  onClick={handleExportSvg}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all shrink-0"
                >
                  <Download className="w-4 h-4" /> Export SVG
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">High-Resolution Image (PNG)</h3>
                  <p className="text-xs text-slate-400">Raster snapshot ideal for quick slides, Discord, and student presentations.</p>
                </div>
                <button
                  onClick={handleExportPng}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all shrink-0"
                >
                  <Download className="w-4 h-4" /> Export PNG
                </button>
              </div>
            </div>
          )}

          {activeTab === 'boolean' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">Truth Table Export (CSV)</h3>
                  <p className="text-xs text-slate-400">
                    Runs the circuit on the canvas through the real simulation engine for every input
                    combination and exports the result as CSV.
                  </p>
                  <p className="text-xs text-slate-500">
                    {preflight.stimulus === 0
                      ? 'No Input Pin, Switch or Push Button on the canvas yet.'
                      : preflight.outputs === 0
                        ? `${preflight.stimulus} input${preflight.stimulus === 1 ? '' : 's'} found, but no Output Pin, LED or Probe to observe.`
                        : `${preflight.swept} of ${preflight.stimulus} input${preflight.stimulus === 1 ? '' : 's'} swept · ${preflight.outputs} output${preflight.outputs === 1 ? '' : 's'} · ${preflight.rows} rows`}
                    {preflight.constants > 0 && ` · ${preflight.constants} constant source${preflight.constants === 1 ? '' : 's'} held fixed`}
                  </p>
                </div>
                <button
                  onClick={handleExportTruthTableCsv}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>
          )}

          {activeTab === '8086' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">8086 Assembly Source (.asm)</h3>
                  <p className="text-xs text-slate-400">
                    Downloads the exact source currently in the 8086 editor, with an assembler summary
                    header describing what it encodes to.
                  </p>
                  <p className="text-xs text-slate-500">
                    {sourceCode.trim().length === 0
                      ? 'The 8086 editor is empty.'
                      : `${sourceCode.split('\n').length} line${sourceCode.split('\n').length === 1 ? '' : 's'} in the editor`}
                  </p>
                </div>
                <button
                  onClick={handleExportAsm}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all shrink-0"
                >
                  <Download className="w-4 h-4" /> Export .asm
                </button>
              </div>
            </div>
          )}

          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/60 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" /> Share Project via Universal Web URL
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generates a self-contained web link with your full circuit design encoded directly in the URL hash.
                    Classmates or professors can open this link on any device to immediately simulate and view your design.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      if (!project) return;
                      const link = shareProjectAsUrl(project, probes, viewport);
                      navigator.clipboard.writeText(link);
                      setCopied('link');
                      setTimeout(() => setCopied(null), 2500);
                    }}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/30 transition-all"
                  >
                    {copied === 'link' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-white" /> Share Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Shareable URL
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {note && note.tab === activeTab && (
            <div
              role="status"
              className={`flex items-start gap-2 p-3 rounded-lg border text-xs leading-relaxed ${
                note.tone === 'ok'
                  ? 'border-emerald-600/50 bg-emerald-950/40 text-emerald-200'
                  : note.tone === 'warn'
                    ? 'border-amber-600/50 bg-amber-950/40 text-amber-200'
                    : 'border-rose-600/50 bg-rose-950/40 text-rose-200'
              }`}
            >
              {note.tone === 'ok' ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{note.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Logisim Pro Educational Exporter</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
