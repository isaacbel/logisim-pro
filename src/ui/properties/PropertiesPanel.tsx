import { useState } from 'react';
import { useAppStore } from '@state/store';
import { SignalValue } from '@apptypes/core';
import type { CircuitComponent } from '@apptypes/core';
import { X, Settings, RotateCw } from 'lucide-react';
import { simulationService } from '@/services/SimulationService';

const SIGNAL_COLORS: Record<SignalValue, string> = {
  [SignalValue.LOW]: '#3b82f6',
  [SignalValue.HIGH]: '#10b981',
  [SignalValue.UNKNOWN]: '#9ca3af',
  [SignalValue.FLOATING]: '#f59e0b',
  [SignalValue.ERROR]: '#ef4444',
};

const SIGNAL_LABELS: Record<SignalValue, string> = {
  [SignalValue.LOW]: 'LOW (0)',
  [SignalValue.HIGH]: 'HIGH (1)',
  [SignalValue.UNKNOWN]: 'X (Unknown)',
  [SignalValue.FLOATING]: 'Z (High-Z)',
  [SignalValue.ERROR]: 'ERR (Conflict)',
};

const LED_COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'red',    label: 'Red',    hex: '#ef4444' },
  { id: 'green',  label: 'Green',  hex: '#10b981' },
  { id: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { id: 'yellow', label: 'Amber',  hex: '#f59e0b' },
  { id: 'cyan',   label: 'Cyan',   hex: '#06b6d4' },
  { id: 'purple', label: 'Purple', hex: '#8b5cf6' },
  { id: 'white',  label: 'White',  hex: '#f8fafc' },
];

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function NoSelection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 8 }}>
      <Settings size={32} style={{ color: 'var(--text-muted)', opacity: 0.25 }} />
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>No selection</div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
        Click a component on the canvas to edit its properties
      </p>
    </div>
  );
}

function ComponentProperties({ component }: { component: CircuitComponent }) {
  const { updateComponentProperty, updateComponentLabel, rotateComponent, removeComponent, addProbe, clearSelection } = useAppStore();

  function update(key: string, value: unknown) {
    updateComponentProperty(component.id, key, value);
  }

  const rotation = component.transform.rotation ?? 0;
  const bitWidth = (component.properties['bitWidth'] as number) ?? 1;
  const radix = (component.properties['radix'] as string) ?? 'bin';

  // Helper to format/parse multi-radix numeric values
  const currentVal = typeof component.properties['value'] === 'number'
    ? component.properties['value']
    : (component.properties['value'] === true ? 1 : 0);

  const formatValueByRadix = (val: number, rad: string, bits: number): string => {
    const mask = bits >= 32 ? 0xFFFFFFFF : (1 << bits) - 1;
    const unsignedVal = (val & mask) >>> 0;
    if (rad === 'hex') return unsignedVal.toString(16).toUpperCase();
    if (rad === 'oct') return unsignedVal.toString(8);
    if (rad === 'dec') return unsignedVal.toString(10);
    if (rad === 'signed') {
      const isNegative = bits < 32 && (val & (1 << (bits - 1))) !== 0;
      return isNegative ? String(unsignedVal - (1 << bits)) : String(unsignedVal);
    }
    return unsignedVal.toString(2).padStart(bits, '0');
  };

  const [rawInputValue, setRawInputValue] = useState<string>(() => formatValueByRadix(currentVal, radix, bitWidth));

  const handleValueChange = (newStr: string) => {
    setRawInputValue(newStr);
    let parsed = 0;
    try {
      const t = newStr.trim();
      if (radix === 'hex') parsed = parseInt(t, 16);
      else if (radix === 'oct') parsed = parseInt(t, 8);
      else if (radix === 'signed' || radix === 'dec') parsed = parseInt(t, 10);
      else parsed = parseInt(t, 2);

      if (!isNaN(parsed)) {
        const mask = bitWidth >= 32 ? 0xFFFFFFFF : (1 << bitWidth) - 1;
        const clamped = parsed & mask;
        update('value', clamped);
        const outPin = component.pins.find(p => p.direction === 'output');
        if (outPin) {
          void simulationService.forcePinValue(outPin.id, clamped === 1 ? SignalValue.HIGH : (clamped === 0 ? SignalValue.LOW : clamped as unknown as SignalValue));
        }
      }
    } catch { /* ignore parse errors while typing */ }
  };

  return (
    <div>
      {/* Component header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{component.type}</div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 2 }}>
            {component.id.slice(0, 8)}…
          </div>
        </div>
        <button
          onClick={() => { removeComponent(component.id); clearSelection(); }}
          style={{
            padding: 4,
            borderRadius: 5,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Delete component"
        >
          <X size={14} />
        </button>
      </div>

      {/* Label */}
      <PropertyRow label="Label">
        <input
          type="text"
          value={(component.label ?? '') as string}
          onChange={e => updateComponentLabel(component.id, e.target.value)}
          placeholder="Component label…"
          className="prop-input"
        />
      </PropertyRow>

      {/* Rotation */}
      <PropertyRow label="Orientation">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={rotation}
            onChange={e => rotateComponent(component.id, parseInt(e.target.value) - rotation)}
            className="prop-input"
            style={{ flex: 1 }}
          >
            <option value={0}>East (0°)</option>
            <option value={90}>South (90°)</option>
            <option value={180}>West (180°)</option>
            <option value={270}>North (270°)</option>
          </select>
          <button
            onClick={() => rotateComponent(component.id, 90)}
            title="Rotate 90° (R)"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <RotateCw size={13} />
          </button>
        </div>
      </PropertyRow>

      {/* ── INPUT PIN PROPERTIES ────────────────────────────────────────── */}
      {component.type === 'INPUT_PIN' && (
        <>
          <PropertyRow label="Bit Width">
            <select
              value={bitWidth}
              onChange={e => {
                const nextW = parseInt(e.target.value);
                update('bitWidth', nextW);
                setRawInputValue(formatValueByRadix(currentVal, radix, nextW));
              }}
              className="prop-input"
            >
              {[1, 2, 3, 4, 8, 16, 32, 64].map(w => (
                <option key={w} value={w}>{w}-bit {w === 1 ? '(Single line)' : '(Bus)'}</option>
              ))}
            </select>
          </PropertyRow>

          <PropertyRow label="Radix Format">
            <select
              value={radix}
              onChange={e => {
                const nextR = e.target.value;
                update('radix', nextR);
                setRawInputValue(formatValueByRadix(currentVal, nextR, bitWidth));
              }}
              className="prop-input"
            >
              <option value="bin">Binary (Base 2)</option>
              <option value="hex">Hexadecimal (Base 16)</option>
              <option value="dec">Unsigned Decimal (Base 10)</option>
              <option value="signed">Signed 2's Complement</option>
              <option value="oct">Octal (Base 8)</option>
            </select>
          </PropertyRow>

          <PropertyRow label={`Value (${radix.toUpperCase()})`}>
            <input
              type="text"
              value={rawInputValue}
              onChange={e => handleValueChange(e.target.value)}
              placeholder={`Enter ${radix} value…`}
              className="prop-input"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </PropertyRow>

          {bitWidth === 1 && (
            <PropertyRow label="Direct Toggle">
              <button
                onClick={() => {
                  const nextV = currentVal === 1 ? 0 : 1;
                  update('value', nextV);
                  setRawInputValue(String(nextV));
                  const outPin = component.pins.find(p => p.direction === 'output');
                  if (outPin) {
                    void simulationService.forcePinValue(outPin.id, nextV === 1 ? SignalValue.HIGH : SignalValue.LOW);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: currentVal === 1 ? '#10b981' : 'var(--surface-2)',
                  color: currentVal === 1 ? '#fff' : 'var(--text-secondary)',
                  transition: 'background 0.2s',
                }}
              >
                {currentVal === 1 ? '● HIGH (1)' : '○ LOW (0)'}
              </button>
            </PropertyRow>
          )}

          <PropertyRow label="Input Mode">
            <select
              value={(component.properties['mode'] as string) ?? 'toggle'}
              onChange={e => update('mode', e.target.value)}
              className="prop-input"
            >
              <option value="toggle">Toggle (Latching)</option>
              <option value="momentary">Momentary (Push)</option>
            </select>
          </PropertyRow>
        </>
      )}

      {/* ── OUTPUT PIN PROPERTIES ───────────────────────────────────────── */}
      {component.type === 'OUTPUT_PIN' && (
        <>
          <PropertyRow label="Bit Width">
            <select
              value={bitWidth}
              onChange={e => update('bitWidth', parseInt(e.target.value))}
              className="prop-input"
            >
              {[1, 2, 3, 4, 8, 16, 32, 64].map(w => (
                <option key={w} value={w}>{w}-bit {w === 1 ? '(Single line)' : '(Bus)'}</option>
              ))}
            </select>
          </PropertyRow>

          <PropertyRow label="Display Radix">
            <select
              value={radix}
              onChange={e => update('radix', e.target.value)}
              className="prop-input"
            >
              <option value="bin">Binary (Base 2)</option>
              <option value="hex">Hexadecimal (0x..)</option>
              <option value="dec">Unsigned Decimal</option>
              <option value="signed">Signed Decimal</option>
              <option value="oct">Octal (Base 8)</option>
            </select>
          </PropertyRow>

          <PropertyRow label="Active-Low">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={(component.properties['activeLow'] as boolean) ?? false}
                onChange={e => update('activeLow', e.target.checked)}
              />
              Invert display (Active-Low / Inverted)
            </label>
          </PropertyRow>
        </>
      )}

      {/* ── LED PROPERTIES ─────────────────────────────────────────────── */}
      {component.type === 'LED' && (
        <>
          <PropertyRow label="LED Color">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LED_COLORS.map(c => {
                const isCur = ((component.properties['color'] as string) || 'red') === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => update('color', c.id)}
                    title={c.label}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: c.hex,
                      border: isCur ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: isCur ? `0 0 8px ${c.hex}` : 'none',
                      cursor: 'pointer',
                      transform: isCur ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  />
                );
              })}
            </div>
          </PropertyRow>

          <PropertyRow label="Active-Low">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={(component.properties['activeLow'] as boolean) ?? false}
                onChange={e => update('activeLow', e.target.checked)}
              />
              Active-Low (Illuminates when 0)
            </label>
          </PropertyRow>
        </>
      )}

      {/* ── PROBE PROPERTIES ────────────────────────────────────────────── */}
      {component.type === 'PROBE' && (
        <>
          <PropertyRow label="Bit Width">
            <select
              value={bitWidth}
              onChange={e => update('bitWidth', parseInt(e.target.value))}
              className="prop-input"
            >
              {[1, 2, 3, 4, 8, 16, 32].map(w => (
                <option key={w} value={w}>{w}-bit</option>
              ))}
            </select>
          </PropertyRow>

          <PropertyRow label="Display Radix">
            <select
              value={radix}
              onChange={e => update('radix', e.target.value)}
              className="prop-input"
            >
              <option value="bin">Binary (Base 2)</option>
              <option value="hex">Hexadecimal</option>
              <option value="dec">Unsigned Decimal</option>
              <option value="signed">Signed Decimal</option>
            </select>
          </PropertyRow>
        </>
      )}

      {/* ── GATE INPUT COUNT ────────────────────────────────────────────── */}
      {['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'].includes(component.type) && (
        <PropertyRow label="Number of Inputs">
          <select
            value={(component.properties['inputCount'] as number) ?? 2}
            onChange={e => update('inputCount', parseInt(e.target.value))}
            className="prop-input"
          >
            {[2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n} Inputs</option>
            ))}
          </select>
        </PropertyRow>
      )}

      {/* ── TEXT CONTENT ────────────────────────────────────────────────── */}
      {component.type === 'TEXT' && (
        <PropertyRow label="Text Content">
          <input
            type="text"
            value={(component.properties['text'] ?? '') as string}
            onChange={e => update('text', e.target.value)}
            placeholder="Text label…"
            className="prop-input"
          />
        </PropertyRow>
      )}

      {/* ── SWITCH STATE ────────────────────────────────────────────────── */}
      {component.type === 'SWITCH' && (
        <PropertyRow label="State">
          <button
            onClick={() => {
              const nextState = !component.properties['isOn'];
              update('isOn', nextState);
              const outPin = component.pins.find(p => p.direction === 'output');
              if (outPin) {
                void simulationService.forcePinValue(outPin.id, nextState ? SignalValue.HIGH : SignalValue.LOW);
              }
            }}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: component.properties['isOn'] ? '#10b981' : 'var(--surface-2)',
              color: component.properties['isOn'] ? '#fff' : 'var(--text-secondary)',
              transition: 'background 0.2s',
            }}
          >
            {component.properties['isOn'] ? '● ON — HIGH (1)' : '○ OFF — LOW (0)'}
          </button>
        </PropertyRow>
      )}

      {/* ── CLOCK FREQUENCY ─────────────────────────────────────────────── */}
      {component.type === 'CLOCK' && (
        <PropertyRow label="Frequency (Hz)">
          <select
            value={(component.properties['frequency'] as number) ?? 1}
            onChange={e => update('frequency', parseFloat(e.target.value))}
            className="prop-input"
          >
            {[0.5, 1, 2, 4, 8, 16, 32, 64].map(hz => (
              <option key={hz} value={hz}>{hz} Hz</option>
            ))}
          </select>
        </PropertyRow>
      )}

      {/* ── CONSTANTS ───────────────────────────────────────────────────── */}
      {component.type === 'CONSTANT' && (
        <PropertyRow label="Value">
          <select
            value={(component.properties['value'] === 1 || component.properties['value'] === '1' || component.properties['value'] === true) ? 1 : 0}
            onChange={e => update('value', parseInt(e.target.value))}
            className="prop-input"
          >
            <option value={0}>0 (LOW)</option>
            <option value={1}>1 (HIGH)</option>
          </select>
        </PropertyRow>
      )}

      {(component.type === 'CONSTANT_0' || component.type === 'CONSTANT_1') && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '6px 8px', borderRadius: 5, marginBottom: 10 }}>
          Fixed Output: <strong>{component.type === 'CONSTANT_1' ? '1 (HIGH)' : '0 (LOW)'}</strong>
        </div>
      )}

      {/* ── ARITHMETIC / REGISTERS / BUSES BIT WIDTH ────────────────────── */}
      {['ADDER', 'SUBTRACTOR', 'ADDER_SUBTRACTOR', 'COMPARATOR', 'ALU', 'MULTIPLIER', 'DIVIDER', 'INCREMENTER', 'DECREMENTER', 'NEGATOR', 'REGISTER', 'COUNTER', 'SHIFT_REGISTER', 'SPLITTER', 'MERGER'].includes(component.type) && (
        <PropertyRow label="Data Bit Width">
          <select
            value={(component.properties['bitWidth'] as number) ?? 4}
            onChange={e => update('bitWidth', parseInt(e.target.value))}
            className="prop-input"
          >
            {[1, 2, 3, 4, 8, 16, 32].map(n => <option key={n} value={n}>{n}-bit</option>)}
          </select>
        </PropertyRow>
      )}

      {/* ── RAM/ROM settings ────────────────────────────────────────────── */}
      {['RAM', 'ROM'].includes(component.type) && (
        <>
          <PropertyRow label="Address Width">
            <select
              value={(component.properties['addrWidth'] as number) ?? 4}
              onChange={e => update('addrWidth', parseInt(e.target.value))}
              className="prop-input"
            >
              {[2, 3, 4, 6, 8, 10, 12, 16].map(n => <option key={n} value={n}>{n}-bit ({1 << n} words)</option>)}
            </select>
          </PropertyRow>
          <PropertyRow label="Data Width">
            <select
              value={(component.properties['dataWidth'] as number) ?? 8}
              onChange={e => update('dataWidth', parseInt(e.target.value))}
              className="prop-input"
            >
              {[1, 2, 4, 8, 16, 32].map(n => <option key={n} value={n}>{n}-bit</option>)}
            </select>
          </PropertyRow>
        </>
      )}

      {/* ── MUX select lines ────────────────────────────────────────────── */}
      {(component.type === 'MULTIPLEXER' || component.type === 'DEMULTIPLEXER') && (
        <PropertyRow label="Select Lines">
          <select
            value={(component.properties['selBits'] as number) ?? 1}
            onChange={e => update('selBits', parseInt(e.target.value))}
            className="prop-input"
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} select ({1 << n} ports)</option>)}
          </select>
        </PropertyRow>
      )}

      {/* ── Subcircuit Info ─────────────────────────────────────────────── */}
      {component.type === 'SUBCIRCUIT' && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 5, marginBottom: 10 }}>
          <div>Target Circuit: <strong>{(component.properties['name'] as string) || 'Subcircuit'}</strong></div>
          <div style={{ marginTop: 4 }}>Input Pins: {component.pins.filter(p => p.direction === 'input').length}</div>
          <div>Output Pins: {component.pins.filter(p => p.direction === 'output').length}</div>
        </div>
      )}

      {/* ── Pin states inspection ───────────────────────────────────────── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
          Pin States ({component.pins.length} pins)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 180, overflowY: 'auto' }}>
          {component.pins.map(pin => (
            <div
              key={pin.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: 5,
                background: 'var(--surface-2)',
                fontSize: 11,
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                {pin.direction === 'input' ? '→' : '←'} {pin.name} {pin.bitWidth > 1 ? `[${pin.bitWidth}b]` : ''}
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 10, color: SIGNAL_COLORS[pin.currentValue] }}>
                {SIGNAL_LABELS[pin.currentValue]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add probe button */}
      <button
        onClick={() => addProbe(component.pins[0]?.id ?? '', component.label ?? component.type)}
        style={{
          marginTop: 14,
          width: '100%',
          padding: '7px 12px',
          borderRadius: 6,
          border: 'none',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          background: 'var(--accent)',
          color: '#fff',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        + Add Waveform Probe
      </button>
    </div>
  );
}

export function PropertiesPanel() {
  const { selection, project, currentCircuitId } = useAppStore();
  const { selectedEntityIds } = selection;

  const selectedId = selectedEntityIds.size === 1 ? [...selectedEntityIds][0] : null;
  const circuit = project?.circuits.find(c => c.id === currentCircuitId);
  const selectedComponent = selectedId ? circuit?.components.find(c => c.id === selectedId) : null;

  return (
    <div className="app-sidebar-right">
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}>
          Properties
        </div>
        {selectedEntityIds.size > 1 && (
          <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-secondary)' }}>
            {selectedEntityIds.size} components selected
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 }}>
        {selectedComponent
          ? <ComponentProperties component={selectedComponent} />
          : <NoSelection />
        }
      </div>
    </div>
  );
}
