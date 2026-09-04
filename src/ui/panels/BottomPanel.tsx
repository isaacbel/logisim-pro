import { useState, useRef, useMemo } from 'react';
import { useAppStore } from '@state/store';
import { ChevronDown, ChevronUp, BarChart2, Table, Grid, Terminal, Download, Play } from 'lucide-react';
import { WaveformViewer } from './WaveformViewer';
import { SimulationEngine, ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';
import { generateKMap } from '@engine/analysis/kmap';
import { SignalValue } from '@apptypes/core';

type Tab = 'waveform' | 'truthtable' | 'kmap' | 'console';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'waveform',   label: 'Waveform',    icon: BarChart2 },
  { id: 'truthtable', label: 'Truth Table', icon: Table },
  { id: 'kmap',       label: 'K-Map',       icon: Grid },
  { id: 'console',    label: 'Console',     icon: Terminal },
];

// ── Console Panel ─────────────────────────────────────────────────────────────
function ConsolePanel() {
  const { consoleMessages, clearConsole } = useAppStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {consoleMessages.length} messages
        </span>
        <button
          onClick={clearConsole}
          style={{ fontSize: 11, color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {consoleMessages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)' }}>No messages</div>
        )}
        {consoleMessages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
            <span style={{ color: 'var(--text-muted)', minWidth: 48 }}>T={msg.tick}</span>
            <span style={{
              color: msg.level === 'error' ? '#ef4444' : msg.level === 'warn' ? '#f59e0b' : 'var(--text-secondary)',
            }}>
              [{msg.level.toUpperCase()}] {msg.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const INPUT_TYPES = ['INPUT_PIN', 'SWITCH', 'PUSH_BUTTON', 'CONSTANT', 'CONSTANT_0', 'CONSTANT_1'];
const OUTPUT_TYPES = ['OUTPUT_PIN', 'LED', 'PROBE'];

// ── Helper to evaluate circuit combinations ────────────────────────────────────
function evaluateCircuitCombinations(
  components: ReturnType<typeof useAppStore.getState>['project'] extends null ? never : NonNullable<ReturnType<typeof useAppStore.getState>['project']>['circuits'][0]['components'],
  wires: ReturnType<typeof useAppStore.getState>['project'] extends null ? never : NonNullable<ReturnType<typeof useAppStore.getState>['project']>['circuits'][0]['wires'],
  inputComps: typeof components,
  outputComps: typeof components
) {
  const inputCount = Math.min(inputComps.length, 6);
  const rowCount = 1 << inputCount;
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  const rows: { inputs: number[]; outputs: number[] }[] = [];

  for (let row = 0; row < rowCount; row++) {
    const inputBits = Array.from({ length: inputCount }, (_, bit) => (row >> (inputCount - 1 - bit)) & 1);

    // Run a fresh simulation engine instance for combination evaluation
    const engine = new SimulationEngine(registry);
    engine.loadCircuit(components, wires);

    // Apply inputs to input component outputs
    for (let i = 0; i < inputCount; i++) {
      const inp = inputComps[i];
      const outPin = inp.pins.find(p => p.direction === 'output' || p.direction === 'bidirectional');
      if (outPin) {
        engine.forcePinValue(outPin.id, inputBits[i] === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
    }

    // Step a few ticks to let signals propagate through combinational gates
    for (let step = 0; step < 8; step++) {
      engine.processTick();
    }

    // Read outputs
    const outputBits = outputComps.map(outComp => {
      const inPin = outComp.pins.find(p => p.direction === 'input' || p.direction === 'bidirectional');
      if (!inPin) return 0;
      const val = engine.getPinValue(inPin.id);
      return val === SignalValue.HIGH ? 1 : 0;
    });

    rows.push({ inputs: inputBits, outputs: outputBits });
  }

  return { rows, inputCount };
}

// ── Truth Table Panel ─────────────────────────────────────────────────────────
function TruthTablePanel() {
  const { project, currentCircuitId } = useAppStore();
  const circuit = project?.circuits.find(c => c.id === currentCircuitId);
  const inputComps = circuit?.components.filter(c => INPUT_TYPES.includes(c.type)) ?? [];
  const outputComps = circuit?.components.filter(c => OUTPUT_TYPES.includes(c.type)) ?? [];

  const [generatedData, setGeneratedData] = useState<{
    rows: { inputs: number[]; outputs: number[] }[];
    inputComps: typeof inputComps;
    outputComps: typeof outputComps;
  } | null>(null);

  if (inputComps.length === 0 || outputComps.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Table size={28} style={{ margin: '0 auto 8px', opacity: 0.25 }} />
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Truth Table Generator</div>
          <div style={{ fontSize: 11 }}>Place Input Pins / Switches and Output Pins / LEDs on the canvas, then generate.</div>
        </div>
      </div>
    );
  }

  function handleGenerate() {
    if (!circuit) return;
    const { rows } = evaluateCircuitCombinations(circuit.components, circuit.wires, inputComps, outputComps);
    setGeneratedData({ rows, inputComps, outputComps });
  }

  function handleExportCSV() {
    if (!generatedData) return;
    const header = [
      ...generatedData.inputComps.map((s, i) => s.label || `${s.type}_${i}`),
      ...generatedData.outputComps.map((l, i) => l.label || `${l.type}_${i}`),
    ].join(',');
    const lines = generatedData.rows.map(r => [...r.inputs, ...r.outputs].join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'truth_table.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const activeRows = generatedData?.rows ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
        flexShrink: 0,
        background: 'var(--surface-2)',
      }}>
        <span>
          {inputComps.length} inputs · {outputComps.length} outputs · {1 << Math.min(inputComps.length, 6)} rows
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleGenerate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 5,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Play size={11} /> Generate
          </button>
          {generatedData && (
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 5,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <Download size={11} /> CSV
            </button>
          )}
        </div>
      </div>

      {/* Table content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeRows.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 11 }}>
            Click &quot;Generate&quot; to evaluate all truth table combinations.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                {inputComps.map((inp, i) => (
                  <th key={i} style={{ padding: '6px 12px', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    {inp.label || `${inp.type}_${i}`}
                  </th>
                ))}
                <th style={{ padding: '6px 8px', color: 'var(--border)', fontWeight: 400 }}>│</th>
                {outputComps.map((outC, i) => (
                  <th key={i} style={{ padding: '6px 12px', color: '#60a5fa', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    {outC.label || `${outC.type}_${i}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--border)', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  {row.inputs.map((val, ci) => (
                    <td key={ci} style={{ padding: '4px 12px', textAlign: 'center', color: val ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                      {val}
                    </td>
                  ))}
                  <td style={{ padding: '4px 8px', color: 'var(--border)', textAlign: 'center' }}>│</td>
                  {row.outputs.map((val, ci) => (
                    <td key={ci} style={{ padding: '4px 12px', textAlign: 'center', color: val ? '#10b981' : 'var(--text-muted)', fontWeight: 700 }}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── K-Map Panel ───────────────────────────────────────────────────────────────
function KMapPanel() {
  const { project, currentCircuitId } = useAppStore();
  const circuit = project?.circuits.find(c => c.id === currentCircuitId);
  const inputComps = circuit?.components.filter(c => INPUT_TYPES.includes(c.type)) ?? [];
  const outputComps = circuit?.components.filter(c => OUTPUT_TYPES.includes(c.type)) ?? [];
  const [selectedOutputIndex, setSelectedOutputIndex] = useState(0);

  const numVars = Math.min(inputComps.length, 4);

  const kmapData = useMemo(() => {
    if (!circuit || inputComps.length < 2 || outputComps.length === 0) return null;
    const { rows } = evaluateCircuitCombinations(circuit.components, circuit.wires, inputComps.slice(0, numVars), outputComps);
    const minterms: number[] = [];
    rows.forEach((r, idx) => {
      if (r.outputs[selectedOutputIndex] === 1) {
        minterms.push(idx);
      }
    });
    const varNames = inputComps.slice(0, numVars).map((s, i) => s.label || String.fromCharCode(65 + i));
    try {
      return generateKMap(varNames, minterms);
    } catch {
      return null;
    }
  }, [circuit, inputComps, outputComps, numVars, selectedOutputIndex]);

  if (inputComps.length < 2 || outputComps.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Grid size={28} style={{ margin: '0 auto 8px', opacity: 0.25 }} />
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Karnaugh Map Solver</div>
          <div style={{ fontSize: 11 }}>Add 2 to 4 inputs (Input Pins/Switches) and at least 1 output to generate a K-Map.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: 12 }}>
      {/* Target output selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target Output:</span>
        <select
          value={selectedOutputIndex}
          onChange={e => setSelectedOutputIndex(Number(e.target.value))}
          style={{
            fontSize: 11,
            borderRadius: 5,
            padding: '3px 8px',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        >
          {outputComps.map((outComp, i) => (
            <option key={outComp.id} value={i}>{outComp.label || `${outComp.type} ${i + 1}`}</option>
          ))}
        </select>
        {kmapData && (
          <div style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
            F = {kmapData.simplifiedExpression}
          </div>
        )}
      </div>

      {/* K-Map Table */}
      {kmapData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {kmapData.variables.slice(0, numVars === 4 ? 2 : 1).join('')} \ {kmapData.variables.slice(numVars === 4 ? 2 : 1).join('')}
                </th>
                {kmapData.colHeaders.map((ch, ci) => (
                  <th key={ci} style={{ padding: '6px 18px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    {ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kmapData.rowHeaders.map((rh, ri) => (
                <tr key={ri}>
                  <td style={{ padding: '6px 12px', color: 'var(--text-secondary)', borderRight: '1px solid var(--border)', textAlign: 'center', fontWeight: 600 }}>
                    {rh}
                  </td>
                  {kmapData.grid[ri]?.map((cell, ci) => {
                    const isOne = cell === 1;
                    return (
                      <td key={ci} style={{
                        padding: '10px 22px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: isOne ? '#10b981' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        background: isOne ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)',
                        fontSize: 14,
                      }}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Group terms legend */}
          {kmapData.groups.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {kmapData.groups.map((g, gi) => (
                <span
                  key={gi}
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--surface-2)',
                    color: g.color,
                    border: `1px solid ${g.color}40`,
                  }}
                >
                  Group {gi + 1}: {g.term}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 20 }}>
          Calculating K-Map...
        </div>
      )}
    </div>
  );
}

// ── Bottom Panel ──────────────────────────────────────────────────────────────
export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('waveform');
  const [collapsed, setCollapsed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(220);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  function onResizerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: panelHeight };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - ev.clientY;
      setPanelHeight(Math.max(120, Math.min(600, dragRef.current.startH + delta)));
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div className="app-bottom-panel" style={{ height: collapsed ? 33 : panelHeight }}>
      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={onResizerMouseDown}
          style={{
            height: 4,
            cursor: 'ns-resize',
            background: 'transparent',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        />
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: collapsed ? 'none' : '1px solid var(--border)',
        background: 'var(--toolbar-bg)',
        height: 32,
        flexShrink: 0,
        userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflowX: 'auto' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id && !collapsed;
            return (
              <button
                key={tab.id}
                id={`panel-tab-${tab.id}`}
                onClick={() => { setActiveTab(tab.id); setCollapsed(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '0 12px',
                  height: 32,
                  fontSize: 11,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  background: 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            padding: '0 10px',
            height: 32,
            display: 'flex',
            alignItems: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Panel content */}
      {!collapsed && (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {activeTab === 'waveform'   && <WaveformViewer />}
          {activeTab === 'truthtable' && <TruthTablePanel />}
          {activeTab === 'kmap'       && <KMapPanel />}
          {activeTab === 'console'    && <ConsolePanel />}
        </div>
      )}
    </div>
  );
}
