import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import { Search, ChevronDown, ChevronRight, Plus, Cpu, Trash2, Edit2, Layers } from 'lucide-react';

interface ComponentEntry {
  type: string;
  label: string;
  description: string;
  symbol: string;
}

const COMPONENT_PALETTE: { category: string; icon: string; items: ComponentEntry[] }[] = [
  {
    category: 'Gates',
    icon: '⊕',
    items: [
      { type: 'AND', label: 'AND Gate', description: 'Output HIGH only when all inputs HIGH (2-8 inputs)', symbol: '&' },
      { type: 'OR', label: 'OR Gate', description: 'Output HIGH when any input HIGH (2-8 inputs)', symbol: '≥1' },
      { type: 'NOT', label: 'NOT Gate', description: 'Inverts the input signal', symbol: '1' },
      { type: 'NAND', label: 'NAND Gate', description: 'NOT AND – universal gate (2-8 inputs)', symbol: '⊼' },
      { type: 'NOR', label: 'NOR Gate', description: 'NOT OR – universal gate (2-8 inputs)', symbol: '⊽' },
      { type: 'XOR', label: 'XOR Gate', description: 'Exclusive OR (2-8 inputs)', symbol: '=1' },
      { type: 'XNOR', label: 'XNOR Gate', description: 'Exclusive NOR (2-8 inputs)', symbol: '≡' },
      { type: 'BUFFER', label: 'Buffer', description: 'Signal buffer / driver', symbol: '▷' },
      { type: 'TRI_STATE_BUFFER', label: 'Tri-State Buffer', description: 'Enable-controlled tri-state driver', symbol: '▷Z' },
    ],
  },
  {
    category: 'Inputs',
    icon: '⬆',
    items: [
      { type: 'INPUT_PIN', label: 'Input Pin / Port', description: 'Interactive configurable input pin (1-64 bit)', symbol: 'IN' },
      { type: 'SWITCH', label: 'Toggle Switch', description: 'Toggle HIGH/LOW switch', symbol: '⊣' },
      { type: 'PUSH_BUTTON', label: 'Push Button', description: 'Momentary HIGH while pressed', symbol: '⊙' },
      { type: 'CLOCK', label: 'Clock Generator', description: 'Periodic clock signal oscillator', symbol: '⊡' },
      { type: 'CONSTANT_0', label: 'Constant 0', description: 'Fixed digital LOW (0) signal source', symbol: '0' },
      { type: 'CONSTANT_1', label: 'Constant 1', description: 'Fixed digital HIGH (1) signal source', symbol: '1' },
      { type: 'RESULT_CONSTANT', label: 'Multi-Bit Constant', description: 'N-bit configurable constant value', symbol: 'VAL' },
    ],
  },
  {
    category: 'Outputs & Displays',
    icon: '⬇',
    items: [
      { type: 'OUTPUT_PIN', label: 'Output Pin / Port', description: 'Circuit output pin port with radix formats', symbol: 'OUT' },
      { type: 'LED', label: 'LED Light', description: 'Illuminated LED indicator with color selection', symbol: '◉' },
      { type: 'RGB_LED', label: 'RGB LED', description: '3-channel Red/Green/Blue color LED', symbol: 'RGB' },
      { type: 'PROBE', label: 'Signal Probe', description: 'Live digital value and bus probe', symbol: 'PRB' },
      { type: 'HEX_DISPLAY', label: 'Hex Display', description: '4-bit hexadecimal LED digit display', symbol: 'HEX' },
      { type: 'SEVEN_SEGMENT', label: '7-Segment Display', description: '7-segment numeric display (a-g)', symbol: '8' },
      { type: 'LCD', label: 'LCD Panel', description: 'Backlit alphanumeric LCD display module', symbol: 'LCD' },
    ],
  },
  {
    category: 'Arithmetic',
    icon: '➕',
    items: [
      { type: 'HALF_ADDER', label: 'Half Adder', description: '1-bit half adder (Sum & Carry)', symbol: 'HA' },
      { type: 'FULL_ADDER', label: 'Full Adder', description: '1-bit full adder with Carry In/Out', symbol: 'FA' },
      { type: 'HALF_SUBTRACTOR', label: 'Half Subtractor', description: '1-bit half subtractor (Diff & Borrow)', symbol: 'HS' },
      { type: 'FULL_SUBTRACTOR', label: 'Full Subtractor', description: '1-bit full subtractor with Borrow In/Out', symbol: 'FS' },
      { type: 'ADDER', label: 'Adder', description: 'N-bit ripple-carry binary adder', symbol: 'ADD' },
      { type: 'CARRY_LOOKAHEAD_ADDER', label: 'Carry Lookahead Adder', description: 'Fast N-bit CLA adder with PG/GG', symbol: 'CLA' },
      { type: 'SUBTRACTOR', label: 'Subtractor', description: 'N-bit binary subtractor', symbol: 'SUB' },
      { type: 'ADDER_SUBTRACTOR', label: 'Adder/Subtractor', description: 'Combined N-bit adder/subtractor', symbol: '±' },
      { type: 'MULTIPLIER', label: 'Multiplier', description: 'N-bit digital multiplier unit', symbol: 'MUL' },
      { type: 'DIVIDER', label: 'Divider', description: 'N-bit digital divider unit (Q, R, Div0)', symbol: 'DIV' },
      { type: 'INCREMENTER', label: 'Incrementer', description: 'N-bit increment by 1 unit', symbol: '+1' },
      { type: 'DECREMENTER', label: 'Decrementer', description: 'N-bit decrement by 1 unit', symbol: '-1' },
      { type: 'NEGATOR', label: 'Negator', description: "N-bit two's complement negator", symbol: '-A' },
      { type: 'COMPARATOR', label: 'Comparator', description: 'N-bit magnitude comparator (>, =, <)', symbol: 'CMP' },
      { type: 'ALU', label: 'ALU', description: 'Arithmetic Logic Unit with opcodes', symbol: 'ALU' },
    ],
  },
  {
    category: 'Plexers & Converters',
    icon: '🔀',
    items: [
      { type: 'MULTIPLEXER', label: 'Multiplexer (MUX)', description: 'N-to-1 data selector', symbol: 'MUX' },
      { type: 'DEMULTIPLEXER', label: 'Demultiplexer (DEMUX)', description: '1-to-N data distributor', symbol: 'DMX' },
      { type: 'ENCODER', label: 'Encoder', description: 'Binary priority encoder', symbol: 'ENC' },
      { type: 'PRIORITY_ENCODER', label: 'Priority Encoder', description: 'Priority encoder with Valid flag', symbol: 'P-ENC' },
      { type: 'DECODER', label: 'Decoder', description: 'Binary decoder with active-high outputs', symbol: 'DEC' },
      { type: 'BCD_TO_7SEG', label: 'BCD to 7-Segment', description: 'BCD to 7-segment display decoder', symbol: '7SEG' },
      { type: 'GRAY_ENCODER', label: 'Binary → Gray', description: 'Binary to Gray code converter', symbol: 'B→G' },
      { type: 'GRAY_DECODER', label: 'Gray → Binary', description: 'Gray to Binary code converter', symbol: 'G→B' },
      { type: 'BCD_ENCODER', label: 'Binary → BCD', description: 'Binary to 8421 BCD converter', symbol: 'B→BCD' },
      { type: 'BCD_DECODER', label: 'BCD → Binary', description: 'BCD to Binary converter', symbol: 'BCD→B' },
    ],
  },
  {
    category: 'Memory & Sequential',
    icon: '🗃',
    items: [
      { type: 'SR_LATCH', label: 'SR Latch', description: 'Set-Reset level-triggered latch', symbol: 'SR' },
      { type: 'D_LATCH', label: 'D Latch', description: 'Transparent data latch', symbol: 'DL' },
      { type: 'SR_FLIPFLOP', label: 'SR Flip-Flop', description: 'Edge-triggered SR flip-flop', symbol: 'SR-FF' },
      { type: 'D_FLIPFLOP', label: 'D Flip-Flop', description: 'Edge-triggered data flip-flop', symbol: 'D' },
      { type: 'JK_FLIPFLOP', label: 'JK Flip-Flop', description: 'Edge-triggered JK flip-flop', symbol: 'JK' },
      { type: 'T_FLIPFLOP', label: 'T Flip-Flop', description: 'Toggle flip-flop', symbol: 'T' },
      { type: 'REGISTER', label: 'Register', description: 'N-bit parallel load register', symbol: 'REG' },
      { type: 'SHIFT_REGISTER', label: 'Shift Register', description: 'N-bit bidirectional shift register', symbol: 'SHFT' },
      { type: 'COUNTER', label: 'Up/Down Counter', description: 'N-bit synchronous up/down counter', symbol: 'CTR' },
      { type: 'DECADE_COUNTER', label: 'Decade Counter', description: '4-bit Modulo-10 counter with TC', symbol: 'MOD10' },
      { type: 'RING_COUNTER', label: 'Ring Counter', description: 'Circulating 1-hot shift counter', symbol: 'RING' },
      { type: 'JOHNSON_COUNTER', label: 'Johnson Counter', description: 'Inverted feedback shift counter', symbol: 'JHN' },
      { type: 'REGISTER_FILE', label: 'Register File', description: '4xN multi-port register bank', symbol: 'RF' },
      { type: 'RAM', label: 'RAM', description: 'Random-access memory matrix', symbol: 'RAM' },
      { type: 'ROM', label: 'ROM', description: 'Read-only memory matrix', symbol: 'ROM' },
      { type: 'FIFO', label: 'FIFO Queue', description: 'First-in first-out memory buffer', symbol: 'FIFO' },
      { type: 'STACK', label: 'Stack / LIFO', description: 'Hardware LIFO stack memory', symbol: 'STK' },
    ],
  },
  {
    category: 'Wiring & Buses',
    icon: '⚡',
    items: [
      { type: 'SPLITTER', label: 'Bus Splitter', description: 'Split multi-bit bus into single bits', symbol: 'SPL' },
      { type: 'MERGER', label: 'Bus Merger', description: 'Bundle single bits into multi-bit bus', symbol: 'MRG' },
      { type: 'BIT_SELECTOR', label: 'Bit Selector', description: 'Extract single bit index from bus', symbol: '[k]' },
      { type: 'BUS_TAP', label: 'Bus Tap', description: 'Tap individual signal line from bus', symbol: 'TAP' },
      { type: 'TUNNEL', label: 'Tunnel', description: 'Wireless named electrical net label', symbol: 'TUN' },
      { type: 'TEXT', label: 'Text Note', description: 'Circuit schematic text annotation', symbol: 'TXT' },
    ],
  },
];

export function Sidebar() {
  const {
    setTool, editor, project, currentCircuitId,
    setCurrentCircuit, addCircuit, removeCircuit, renameCircuit,
    createSubcircuitInstance,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'components' | 'circuits'>('components');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newCircuitName, setNewCircuitName] = useState('');
  const [isAddingCircuit, setIsAddingCircuit] = useState(false);
  const [editingCircuitId, setEditingCircuitId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return COMPONENT_PALETTE;
    const q = search.toLowerCase();
    return COMPONENT_PALETTE.map(cat => ({
      ...cat,
      items: cat.items.filter(
        item => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [search]);

  function toggleCategory(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function onDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData('component-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function onSubcircuitDragStart(e: React.DragEvent, circuitId: string) {
    e.dataTransfer.setData('subcircuit-id', circuitId);
    e.dataTransfer.setData('component-type', 'SUBCIRCUIT');
    e.dataTransfer.effectAllowed = 'copy';
  }

  function onClickComponent(type: string) {
    useAppStore.getState().setTool('component');
    useAppStore.setState(s => ({
      editor: { ...s.editor, currentComponentType: type, currentTool: 'component' },
    }));
    setTool('component');
  }

  function handleCreateCircuit() {
    if (!newCircuitName.trim()) return;
    addCircuit(newCircuitName.trim());
    setNewCircuitName('');
    setIsAddingCircuit(false);
  }

  function handleRename(id: string) {
    if (editName.trim()) {
      renameCircuit(id, editName.trim());
    }
    setEditingCircuitId(null);
  }

  return (
    <div
      data-testid="component-sidebar"
      className="app-sidebar-left"
    >
      {/* Top Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
      }}>
        <button
          onClick={() => setActiveTab('components')}
          style={{
            flex: 1,
            padding: '10px 8px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            border: 'none',
            background: activeTab === 'components' ? 'var(--surface-2)' : 'transparent',
            color: activeTab === 'components' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'components' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Components
        </button>
        <button
          onClick={() => setActiveTab('circuits')}
          style={{
            flex: 1,
            padding: '10px 8px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            border: 'none',
            background: activeTab === 'circuits' ? 'var(--surface-2)' : 'transparent',
            color: activeTab === 'circuits' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'circuits' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Circuits ({project?.circuits.length ?? 1})
        </button>
      </div>

      {activeTab === 'components' ? (
        <>
          {/* Header & Search */}
          <div style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={12}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="component-search"
                type="text"
                placeholder="Search components…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 28,
                  paddingRight: 10,
                  paddingTop: 6,
                  paddingBottom: 6,
                  fontSize: 12,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Component palette — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {filtered.map(cat => {
              const isOpen = !collapsed.has(cat.category);
              return (
                <div key={cat.category}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat.category)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-2)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {isOpen
                      ? <ChevronDown size={11} />
                      : <ChevronRight size={11} />
                    }
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{cat.icon}</span>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {cat.category}
                    </span>
                  </button>

                  {/* Items */}
                  {isOpen && (
                    <div style={{ paddingBottom: 4 }}>
                      {cat.items.map(item => {
                        const isActive = editor.currentComponentType === item.type && editor.currentTool === 'component';
                        return (
                          <div
                            key={item.type}
                            id={`comp-${item.type.toLowerCase()}`}
                            draggable
                            onDragStart={e => onDragStart(e, item.type)}
                            onClick={() => onClickComponent(item.type)}
                            title={item.description}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '6px 10px 6px 12px',
                              margin: '1px 4px',
                              borderRadius: 5,
                              cursor: 'pointer',
                              background: isActive ? 'var(--accent)' : 'transparent',
                              color: isActive ? '#fff' : 'var(--text-primary)',
                              fontSize: 12,
                              userSelect: 'none',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => {
                              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
                            }}
                            onMouseLeave={e => {
                              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                          >
                            {/* Symbol badge */}
                            <span style={{
                              fontSize: 9,
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              minWidth: 28,
                              textAlign: 'center',
                              padding: '2px 3px',
                              borderRadius: 3,
                              background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface-2)',
                              flexShrink: 0,
                              letterSpacing: '-0.02em',
                            }}>
                              {item.symbol}
                            </span>
                            <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Circuits / Sheets Manager */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{
            padding: '12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Project Circuits
            </div>
            <button
              onClick={() => setIsAddingCircuit(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 5,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          {isAddingCircuit && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <input
                type="text"
                autoFocus
                placeholder="Circuit name…"
                value={newCircuitName}
                onChange={e => setNewCircuitName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateCircuit();
                  if (e.key === 'Escape') setIsAddingCircuit(false);
                }}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: 12,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  color: 'var(--text-primary)',
                  marginBottom: 6,
                }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsAddingCircuit(false)}
                  style={{ padding: '3px 8px', fontSize: 11, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCircuit}
                  style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Circuit List */}
          <div style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }}>
            {project?.circuits.map(circ => {
              const isCurrent = circ.id === currentCircuitId;
              const inCount = circ.components.filter(c => c.type === 'INPUT_PIN').length;
              const outCount = circ.components.filter(c => c.type === 'OUTPUT_PIN').length;

              return (
                <div
                  key={circ.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 10px',
                    margin: '2px 0',
                    borderRadius: 6,
                    background: isCurrent ? 'rgba(56,189,248,0.12)' : 'transparent',
                    border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                  onClick={() => setCurrentCircuit(circ.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={14} style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-muted)' }} />
                      {editingCircuitId === circ.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onBlur={() => handleRename(circ.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(circ.id);
                            if (e.key === 'Escape') setEditingCircuitId(null);
                          }}
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: '2px 4px',
                            fontSize: 12,
                            background: 'var(--surface-1)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            color: 'var(--text-primary)',
                          }}
                        />
                      ) : (
                        <span style={{
                          fontSize: 12,
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}>
                          {circ.name} {circ.isMain && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(Main)</span>}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {!circ.isMain && (
                        <button
                          onClick={() => {
                            setEditingCircuitId(circ.id);
                            setEditName(circ.name);
                          }}
                          title="Rename Circuit"
                          style={{ padding: 3, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <Edit2 size={11} />
                        </button>
                      )}
                      {!circ.isMain && (
                        <button
                          onClick={() => removeCircuit(circ.id)}
                          title="Delete Circuit"
                          style={{ padding: 3, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>{circ.components.length} components • {circ.wires.length} wires</span>
                    <span>{inCount} in / {outCount} out</span>
                  </div>

                  {/* Subcircuit block placer */}
                  {!isCurrent && (
                    <button
                      draggable
                      onDragStart={e => onSubcircuitDragStart(e, circ.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        createSubcircuitInstance(circ.id, 100, 100);
                      }}
                      title="Instantiate this circuit as a Subcircuit block in the current circuit"
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px dashed var(--accent)',
                        background: 'rgba(56,189,248,0.06)',
                        color: 'var(--accent)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'grab',
                      }}
                    >
                      <Cpu size={12} />
                      Insert Subcircuit Block
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
        flexShrink: 0,
      }}>
        {activeTab === 'components' ? 'Click or drag to place' : 'Select circuit or drag block'}
      </div>
    </div>
  );
}
