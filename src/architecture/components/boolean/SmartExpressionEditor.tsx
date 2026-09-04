import { useMemo } from 'react';
import { CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { parseBooleanExpression } from '@engine/analysis/boolean/parser';
import { extractVariables } from '@engine/analysis/boolean/ast';

interface SmartExpressionEditorProps {
  value: string;
  onChange: (val: string) => void;
  copied: boolean;
  onCopy: () => void;
}

export function SmartExpressionEditor({
  value,
  onChange,
  copied,
  onCopy,
}: SmartExpressionEditorProps) {
  // Syntax validation
  const validation = useMemo(() => {
    if (!value.trim()) {
      return { isValid: false, error: "Veuillez saisir une expression booléenne.", ast: null, vars: [] };
    }

    // Check parentheses balance
    let depth = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '(') depth++;
      else if (value[i] === ')') depth--;
      if (depth < 0) {
        return { isValid: false, error: `Parenthèse fermante ')' inattendue à la position ${i + 1}.`, ast: null, vars: [] };
      }
    }
    if (depth > 0) {
      return { isValid: false, error: `Parenthèse non fermée (${depth} parenthèse(s) manquante(s)).`, ast: null, vars: [] };
    }

    try {
      const ast = parseBooleanExpression(value);
      const vars = extractVariables(ast);
      return { isValid: true, error: null, ast, vars };
    } catch (e) {
      return {
        isValid: false,
        error: e instanceof Error ? e.message : String(e),
        ast: null,
        vars: [],
      };
    }
  }, [value]);

  const insertSymbol = (sym: string) => {
    onChange(`${value}${sym}`);
  };

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Top Title & Detected Variables */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="smart-expr-input" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Fonction Booléenne F =
          </label>
          {validation.isValid && validation.vars.length > 0 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Variables ({validation.vars.length}) :</span>
              {validation.vars.map(v => (
                <span
                  key={v}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(59,130,246,0.15)',
                    color: 'var(--accent)',
                    fontFamily: 'monospace',
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {validation.isValid ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
              <CheckCircle2 size={13} />
              <span>Syntaxe valide</span>
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
              <AlertCircle size={13} />
              <span>Erreur de syntaxe</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Input Bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id="smart-expr-input"
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Ex: A.B + A'.C + B.C"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${validation.error ? '#ef4444' : 'var(--border)'}`,
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontSize: 16,
              fontFamily: 'monospace',
              fontWeight: 600,
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
          />
        </div>

        <button
          onClick={onCopy}
          title="Copier l'expression"
          style={{
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: copied ? '#10b981' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copié' : 'Copier'}</span>
        </button>
      </div>

      {/* Error Banner */}
      {validation.error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 6,
          background: 'rgba(239,68,68,0.12)',
          color: '#ef4444',
          fontSize: 12,
        }}>
          <AlertCircle size={14} />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Quick Operator Insertion Toolbar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Symboles :</span>
        {[
          { label: '· (ET)', val: '·', title: 'Opérateur ET logique (AND)' },
          { label: '+ (OU)', val: '+', title: 'Opérateur OU logique (OR)' },
          { label: "' (NON)", val: "'", title: 'Inverseur postfixe (NOT)' },
          { label: '!A (NON)', val: '!', title: 'Inverseur préfixe' },
          { label: '⊕ (XOR)', val: '⊕', title: 'OU exclusif (XOR)' },
          { label: 'NAND', val: ' NAND ', title: 'NON-ET universel' },
          { label: 'NOR', val: ' NOR ', title: 'NON-OU universel' },
          { label: 'XNOR', val: ' XNOR ', title: 'Équivalence (XNOR)' },
          { label: '( )', val: '()', title: 'Parenthèses de priorité' },
          { label: 'A', val: 'A', title: 'Variable A' },
          { label: 'B', val: 'B', title: 'Variable B' },
          { label: 'C', val: 'C', title: 'Variable C' },
          { label: 'D', val: 'D', title: 'Variable D' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => insertSymbol(s.val)}
            title={s.title}
            style={{
              padding: '4px 8px',
              borderRadius: 5,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}

        {/* Quick Presets */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Exemples :</span>
          {[
            { label: 'Consensus', expr: "A.B + A'.C + B.C" },
            { label: 'Parité XOR', expr: "A ⊕ B ⊕ C" },
            { label: 'De Morgan', expr: "(A + B).(A + C)" },
          ].map(ex => (
            <button
              key={ex.label}
              onClick={() => onChange(ex.expr)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid rgba(59,130,246,0.25)',
                background: 'rgba(59,130,246,0.08)',
                color: 'var(--accent)',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
