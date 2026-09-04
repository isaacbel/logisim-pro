// ─────────────────────────────────────────────────────────────────────────────
// ArchitecturePage — Shell with sidebar navigation and content router
// ─────────────────────────────────────────────────────────────────────────────
import { useAppStore } from '@state/store';
import type { ArchPage } from '@state/store';
import { Dashboard } from './Dashboard';
import { NumberSystems } from './NumberSystems';
import { BinaryArithmetic } from './BinaryArithmetic';
import { SignedNumbers } from './SignedNumbers';
import { FixedPoint } from './FixedPoint';
import { IEEE754Page } from './IEEE754';
import { SpecialCodes } from './SpecialCodes';
import { BooleanAlgebra } from './BooleanAlgebra';

// ── 8086 Architecture Laboratory Pages ──────────────────────────────────────
import { Arch8086Overview } from './Arch8086Overview';
import { Register8086Lab } from './Register8086Lab';
import { Flags8086Lab } from './Flags8086Lab';
import { Alu8086Lab } from './Alu8086Lab';
import { Memory8086Lab } from './Memory8086Lab';
import { ControlUnit8086Lab } from './ControlUnit8086Lab';
import { Datapath8086Lab } from './Datapath8086Lab';
import { Biu8086Lab } from './Biu8086Lab';
import { Stack8086Lab } from './Stack8086Lab';
import { AddressingModes8086Lab } from './AddressingModes8086Lab';
import { Io8086Lab } from './Io8086Lab';
import { Timing8086Lab } from './Timing8086Lab';
import { InstructionExplorer8086 } from './InstructionExplorer8086';
import { Assembly8086Debugger } from './Assembly8086Debugger';
import { Exercises8086Lab } from './Exercises8086Lab';

// ── Legacy Generic Architecture Labs ────────────────────────────────────────
import { AluLab } from './AluLab';
import { RegisterFileLab } from './RegisterFileLab';
import { DatapathLab } from './DatapathLab';
import { ControlUnitLab } from './ControlUnitLab';
import { AssemblyLab } from './AssemblyLab';
import { CpuLab } from './CpuLab';
import { FsmDesigner } from './FsmDesigner';

import {
  LayoutGrid, Binary, Calculator, Hash, Grid2x2,
  Waves, Code2, ChevronRight, Sparkles, Cpu,
  Database, GitFork, Sliders, Terminal, Layers, Flag,
  HardDrive, BookOpen, Target, Trophy, Workflow
} from 'lucide-react';

// ── Sidebar nav structure ─────────────────────────────────────────────────────

interface NavItem {
  page: ArchPage;
  label: string;
  icon: React.ElementType;
  category?: string;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { page: 'boolean-algebra', label: 'Boolean & Karnaugh', icon: Sparkles, category: 'LOGIC DESIGN' },
  { page: 'fsm-designer', label: 'FSM Visual Designer', icon: Workflow, category: 'LOGIC DESIGN' },

  // ── Intel 8086 Architecture Laboratory ────────────────────────────────────
  { page: '8086-overview', label: '8086 Architecture', icon: Cpu, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-registers', label: 'Register File (16-bit)', icon: Database, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-flags', label: 'FLAGS Register (9 Flags)', icon: Flag, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-alu', label: '8086 ALU Laboratory', icon: Cpu, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-memory', label: '1MB Memory & Segments', icon: HardDrive, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-segmentation', label: 'Segmentation Engine', icon: HardDrive, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-biu-eu', label: 'BIU, Queue & Pinout', icon: Layers, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-datapath', label: '8086 Datapath Lab', icon: GitFork, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-control-unit', label: 'Control Unit & Micro-ops', icon: Sliders, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-stack', label: 'Stack & Procedure Frame', icon: Layers, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-addressing-modes', label: 'Addressing Modes (EA)', icon: Target, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-io', label: 'I/O & Peripheral Lab', icon: Terminal, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-timing', label: 'Bus Timing & Waveforms', icon: Waves, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-instruction-explorer', label: 'Instruction Reference', icon: BookOpen, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-assembly', label: '8086 Assembly Debugger', icon: Terminal, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-debugger', label: 'Execution Stepper', icon: Terminal, category: 'INTEL 8086 PROCESSOR' },
  { page: '8086-exercises', label: '8086 Challenges & Grader', icon: Trophy, category: 'INTEL 8086 PROCESSOR' },

  // Number Systems
  { page: 'number-systems', label: 'Base Converter', icon: Binary, category: 'NUMBER SYSTEMS' },
  { page: 'binary-arithmetic', label: 'Arithmetic', icon: Calculator, category: 'BINARY ARITHMETIC' },
  { page: 'signed-numbers', label: 'Signed Numbers', icon: Hash, category: 'SIGNED NUMBERS' },
  { page: 'fixed-point', label: 'Fixed Point', icon: Grid2x2, category: 'FIXED POINT' },
  { page: 'ieee754', label: 'IEEE 754', icon: Waves, category: 'FLOATING POINT' },
  { page: 'special-codes', label: 'BCD & Excess-3', icon: Code2, category: 'SPECIAL CODES' },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar() {
  const { archPage, setArchPage } = useAppStore(s => ({ archPage: s.archPage, setArchPage: s.setArchPage }));

  return (
    <div style={{
      width: 240,
      flexShrink: 0,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      overflowY: 'auto',
      paddingTop: 40, // offset for breadcrumb
      paddingBottom: 16,
    }}>
      {/* Sidebar title */}
      <div style={{ padding: '16px 16px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: 4 }}>
        Computer Architecture Lab
      </div>

      {NAV_ITEMS.map((item, i) => {
        const isActive = archPage === item.page;
        const Icon = item.icon;
        const showCategory = item.category && (i === 0 || NAV_ITEMS[i - 1].category !== item.category);

        return (
          <div key={item.page}>
            {showCategory && item.category && (
              <div style={{ padding: '14px 16px 4px', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {item.category}
              </div>
            )}
            <button
              id={`arch-nav-${item.page}`}
              onClick={() => setArchPage(item.page)}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 16px',
                border: 'none',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                textAlign: 'left',
                transition: 'all 0.15s',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              {isActive && <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.6 }} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Content Router ────────────────────────────────────────────────────────────

function ArchContent() {
  const archPage = useAppStore(s => s.archPage);

  switch (archPage) {
    case 'dashboard': return <Dashboard />;
    case 'boolean-algebra': return <BooleanAlgebra />;
    case 'fsm-designer': return <FsmDesigner />;

    // ── 8086 Pages ────────────────────────────────────────────────────────────
    case '8086-overview': return <Arch8086Overview />;
    case '8086-registers': return <Register8086Lab />;
    case '8086-flags': return <Flags8086Lab />;
    case '8086-alu': return <Alu8086Lab />;
    case '8086-memory':
    case '8086-segmentation': return <Memory8086Lab />;
    case '8086-biu-eu': return <Biu8086Lab />;
    case '8086-datapath': return <Datapath8086Lab />;
    case '8086-control-unit': return <ControlUnit8086Lab />;
    case '8086-stack': return <Stack8086Lab />;
    case '8086-addressing-modes': return <AddressingModes8086Lab />;
    case '8086-io': return <Io8086Lab />;
    case '8086-timing': return <Timing8086Lab />;
    case '8086-instruction-explorer': return <InstructionExplorer8086 />;
    case '8086-assembly':
    case '8086-debugger': return <Assembly8086Debugger />;
    case '8086-exercises': return <Exercises8086Lab />;

    // ── Legacy Pages ──────────────────────────────────────────────────────────
    case 'alu': return <AluLab />;
    case 'register-file': return <RegisterFileLab />;
    case 'control-unit': return <ControlUnitLab />;
    case 'datapath': return <DatapathLab />;
    case 'cpu': return <CpuLab />;
    case 'assembly': return <AssemblyLab />;

    // ── Number Systems ────────────────────────────────────────────────────────
    case 'number-systems': return <NumberSystems />;
    case 'binary-arithmetic': return <BinaryArithmetic />;
    case 'signed-numbers': return <SignedNumbers />;
    case 'fixed-point': return <FixedPoint />;
    case 'ieee754': return <IEEE754Page />;
    case 'special-codes': return <SpecialCodes />;
    default: return <Dashboard />;
  }
}

// ── Architecture Page Shell ───────────────────────────────────────────────────

export function ArchitecturePage() {
  return (
    <div style={{
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
      height: '100%',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '56px 32px 32px 32px', // top offset for breadcrumb
        background: 'var(--canvas-bg)',
      }}>
        <ArchContent />
      </main>
    </div>
  );
}

