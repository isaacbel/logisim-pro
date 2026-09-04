import { useState } from 'react';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';

interface VisualExpressionBuilderProps {
  onApplyExpression: (expr: string) => void;
}

interface BlockToken {
  id: string;
  type: 'var' | 'op' | 'paren';
  value: string;
  display: string;
}

export function VisualExpressionBuilder({
  onApplyExpression,
}: VisualExpressionBuilderProps) {
  const [tokens, setTokens] = useState<BlockToken[]>([]);

  const addToken = (type: BlockToken['type'], value: string, display: string) => {
    setTokens(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, type, value, display }]);
  };

  const removeToken = (id: string) => {
    setTokens(prev => prev.filter(t => t.id !== id));
  };

  const clearTokens = () => {
    setTokens([]);
  };

  const builtString = tokens.map(t => t.value).join('');

  const handleApply = () => {
    if (builtString) {
      onApplyExpression(builtString);
    }
  };

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Constructeur Visuel d'Expression
          </h3>
        </div>
        <button
          onClick={clearTokens}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text-muted)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={11} /> Effacer
        </button>
      </div>

      {/* Toolbox: Palette of blocks to add */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Variables :</span>
          {['A', 'B', 'C', 'D', 'Cin', 'Bin', 'S', 'P'].map(v => (
            <button
              key={v}
              onClick={() => addToken('var', v, v)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(59,130,246,0.3)',
                background: 'rgba(59,130,246,0.12)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              +{v}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Opérateurs :</span>
          {[
            { display: '· (ET)', val: '·' },
            { display: '+ (OU)', val: '+' },
            { display: "' (NON)", val: "'" },
            { display: '⊕ (XOR)', val: '⊕' },
            { display: 'NAND', val: ' NAND ' },
            { display: 'NOR', val: ' NOR ' },
            { display: '(', val: '(' },
            { display: ')', val: ')' },
          ].map(op => (
            <button
              key={op.display}
              onClick={() => addToken(op.val === '(' || op.val === ')' ? 'paren' : 'op', op.val, op.display)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text-primary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {op.display}
            </button>
          ))}
        </div>
      </div>

      {/* Assembly Canvas: Current Block Sequence */}
      <div style={{
        minHeight: 56,
        background: 'var(--canvas-bg)',
        border: '1px dashed var(--border)',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}>
        {tokens.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Cliquez sur les blocs ci-dessus pour assembler visuellement une expression booléenne.
          </span>
        ) : (
          tokens.map(t => (
            <div
              key={t.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 6,
                background: t.type === 'var' ? 'rgba(59,130,246,0.18)' : t.type === 'op' ? 'var(--surface-2)' : 'rgba(245,158,11,0.15)',
                border: `1px solid ${t.type === 'var' ? 'var(--accent)' : 'var(--border)'}`,
                color: t.type === 'var' ? 'var(--accent)' : 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>{t.display}</span>
              <button
                onClick={() => removeToken(t.id)}
                title="Supprimer"
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Live Preview & Apply Button */}
      {tokens.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: 6,
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Résultat :</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
              {builtString}
            </span>
          </div>
          <button
            onClick={handleApply}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Appliquer au laboratoire</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
