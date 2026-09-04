// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — Computer Architecture Lab Overview
// ─────────────────────────────────────────────────────────────────────────────
import { useAppStore, type ArchPage } from '@state/store';
import {
  Binary, Calculator, Hash, Grid2x2, Waves, Code2,
  ArrowRight, Cpu, Sparkles
} from 'lucide-react';
import { ValueInspector } from '../components/ValueInspector';
import { BinaryTable } from '../components/BinaryTable';

interface CardDef {
  page: ArchPage;
  title: string;
  category: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  badge: string;
}

const CARDS: CardDef[] = [
  {
    page: 'boolean-algebra',
    title: 'Boolean Algebra & Karnaugh',
    category: 'LOGIC DESIGN',
    description: 'Expression parsing, step-by-step algebraic simplification, Quine-McCluskey, toroidal Karnaugh maps, and real circuit synthesis.',
    icon: Sparkles,
    accent: '#3b82f6',
    badge: 'K-Map & Simplifier',
  },
  {
    page: 'number-systems',
    title: 'Number Systems',
    category: 'CONVERSIONS',
    description: 'Convert between Binary, Octal, Decimal, and Hexadecimal with interactive division & positional expansion steps.',
    icon: Binary,
    accent: '#3b82f6',
    badge: 'Base 2, 8, 10, 16',
  },
  {
    page: 'binary-arithmetic',
    title: 'Binary Arithmetic',
    category: 'OPERATIONS',
    description: 'Full-adder carry chains, partial products multiplication, restoring division, and configurable bit-width overflow detection.',
    icon: Calculator,
    accent: '#10b981',
    badge: 'Add / Mul / Div / Overflow',
  },
  {
    page: 'signed-numbers',
    title: 'Signed Numbers',
    category: 'REPRESENTATION',
    description: 'Sign-Magnitude, One\'s Complement, and Two\'s Complement encoding, decoding, and arithmetic with signed overflow flags.',
    icon: Hash,
    accent: '#8b5cf6',
    badge: 'Two\'s Complement & Range',
  },
  {
    page: 'fixed-point',
    title: 'Fixed-Point Numbers',
    category: 'FRACTIONAL',
    description: 'Q-format fractional binary representation with configurable integer and fractional bit widths, truncation & precision analysis.',
    icon: Grid2x2,
    accent: '#f59e0b',
    badge: 'Qm.n Format',
  },
  {
    page: 'ieee754',
    title: 'IEEE 754 Floating Point',
    category: 'STANDARDS',
    description: 'Single (32-bit) and Double (64-bit) precision floating-point format breakdown with sign, biased exponent, mantissa, and special values.',
    icon: Waves,
    accent: '#ec4899',
    badge: 'Float32 / Float64',
  },
  {
    page: 'special-codes',
    title: 'Special Codes',
    category: 'ENCODINGS',
    description: 'Binary-Coded Decimal (BCD) with correction addition (+6 rule) and Excess-3 (Self-Complementing) code transformations.',
    icon: Code2,
    accent: '#06b6d4',
    badge: 'BCD & Excess-3',
  },
];

export function Dashboard() {
  const { setArchPage, archInspectorValue } = useAppStore();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header Banner */}
      <div style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              background: 'var(--surface-1)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid var(--border)',
            }}>
              <Sparkles size={11} /> Educational Laboratory
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Computer Architecture & Number Systems
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
            Explore how modern computers store, manipulate, and represent data at the hardware level. Interactive calculators, step-by-step algorithms, and direct Logisim circuit synthesis.
          </p>
        </div>
        <Cpu size={64} style={{ opacity: 0.15, color: 'var(--accent)', flexShrink: 0 }} />
      </div>

      {/* Grid of 6 Modules */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {CARDS.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.page}
              onClick={() => setArchPage(card.page)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '20px',
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = card.accent;
                e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px ${card.accent}30`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: 14,
              }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: `${card.accent}15`,
                  border: `1px solid ${card.accent}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.accent,
                }}>
                  <Icon size={20} />
                </div>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--surface-2)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                }}>
                  {card.badge}
                </span>
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: card.accent, textTransform: 'uppercase', marginBottom: 2 }}>
                {card.category}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {card.title}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16, flex: 1 }}>
                {card.description}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: card.accent,
              }}>
                Open Module <ArrowRight size={13} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Tools / Inspector Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 4 }}>
        <ValueInspector
          binary={archInspectorValue || '11010110'}
          label={archInspectorValue ? "Active Circuit Value (From Simulator)" : "Universal Value Inspector (Example: 0xD6)"}
          showSendToCircuit={true}
        />
        <BinaryTable />
      </div>
    </div>
  );
}
