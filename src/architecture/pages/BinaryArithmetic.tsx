// ─────────────────────────────────────────────────────────────────────────────
// BinaryArithmetic — Addition, Multiplication, Division & Overflow Analysis
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import {
  binaryAdd, binaryMultiply, binaryDivide, analyzeOverflow
} from '../engine/arithmetic';
import { StepViewer } from '../components/StepViewer';
import { BitDisplay } from '../components/BitDisplay';
import { ValueInspector } from '../components/ValueInspector';
import { Plus, X, Divide, AlertTriangle, Zap } from 'lucide-react';

type ArithmeticOp = 'add' | 'multiply' | 'divide' | 'overflow';

export function BinaryArithmetic() {
  const [op, setOp] = useState<ArithmeticOp>('add');
  const [bits, setBits] = useState<number>(8);
  const [operandA, setOperandA] = useState<string>('1011');
  const [operandB, setOperandB] = useState<string>('0110');
  const [testValue, setTestValue] = useState<string>('260');

  const { sendBitsToCircuit } = useAppStore();

  const addResult = useMemo(() => binaryAdd(operandA, operandB, bits), [operandA, operandB, bits]);
  const mulResult = useMemo(() => binaryMultiply(operandA, operandB, bits), [operandA, operandB, bits]);
  const divResult = useMemo(() => binaryDivide(operandA, operandB, bits), [operandA, operandB, bits]);
  const ovfResult = useMemo(() => analyzeOverflow(Number(testValue) || 0, bits), [testValue, bits]);

  const activeResult = useMemo(() => {
    switch (op) {
      case 'add': return addResult;
      case 'multiply': return mulResult;
      case 'divide': return divResult;
      case 'overflow': return ovfResult;
    }
  }, [op, addResult, mulResult, divResult, ovfResult]);

  const handleSendResultToCircuit = () => {
    let resultBits = '';
    if (op === 'add') resultBits = addResult.result.sum;
    else if (op === 'multiply') resultBits = mulResult.result.product;
    else if (op === 'divide') resultBits = divResult.result.quotient;
    else resultBits = (Number(testValue) || 0).toString(2);

    const clean = resultBits.replace(/[^01]/g, '') || '0';
    const bitsArr = clean.split('').map(Number) as (0 | 1)[];
    sendBitsToCircuit(bitsArr, `Arith_${op.toUpperCase()}`);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          Binary Arithmetic & ALU Operations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Inspect carry propagation in multi-bit adders, partial product generation in multipliers, and fixed-width overflow limits.
        </p>
      </div>

      {/* Operation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {[
          { id: 'add', label: 'Addition & Carry', icon: Plus },
          { id: 'multiply', label: 'Multiplication (Partial Products)', icon: X },
          { id: 'divide', label: 'Restoring Division', icon: Divide },
          { id: 'overflow', label: 'Overflow Detection', icon: AlertTriangle },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = op === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setOp(tab.id as ArithmeticOp)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                background: isActive ? 'rgba(59,130,246,0.12)' : 'var(--surface-1)',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Operands & Configuration Box */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {op !== 'overflow' ? (
            <>
              {/* Operand A */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Operand A (Binary)
                </label>
                <input
                  type="text"
                  value={operandA}
                  onChange={e => setOperandA(e.target.value.replace(/[^01]/g, ''))}
                  placeholder="e.g. 1011"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Operand B */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Operand B (Binary)
                </label>
                <input
                  type="text"
                  value={operandB}
                  onChange={e => setOperandB(e.target.value.replace(/[^01]/g, ''))}
                  placeholder="e.g. 0110"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Test Value (Decimal)
              </label>
              <input
                type="number"
                value={testValue}
                onChange={e => setTestValue(e.target.value)}
                placeholder="e.g. 260"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Bit Width Selector */}
          <div style={{ width: 130 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Bit Width
            </label>
            <select
              value={bits}
              onChange={e => setBits(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            >
              <option value={4}>4-Bit</option>
              <option value={8}>8-Bit</option>
              <option value={16}>16-Bit</option>
              <option value={32}>32-Bit</option>
              <option value={64}>64-Bit</option>
            </select>
          </div>

          <button
            onClick={handleSendResultToCircuit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 6,
              color: '#60a5fa',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              height: 38,
            }}
          >
            <Zap size={14} /> Send to Circuit
          </button>
        </div>

        {/* Live Mathematical Display Card */}
        {op === 'add' && (
          <div style={{
            background: 'var(--surface-1)',
            padding: '16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Carries: {addResult.result.carry.join(' ')}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              &nbsp;&nbsp;A:&nbsp;{operandA.padStart(bits, '0')} ({addResult.result.decimalA}₁₀)
            </div>
            <div style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
              + B:&nbsp;{operandB.padStart(bits, '0')} ({addResult.result.decimalB}₁₀)
            </div>
            <div style={{ color: addResult.result.overflow ? '#ef4444' : '#10b981', fontWeight: 700, paddingTop: 4 }}>
              = S:&nbsp;{addResult.result.sum} ({addResult.result.decimalResult}₁₀) {addResult.result.overflow && '⚠ OVERFLOW'}
            </div>
          </div>
        )}

        {op === 'multiply' && (
          <div style={{
            background: 'var(--surface-1)',
            padding: '16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              {mulResult.result.decimalA} × {mulResult.result.decimalB} = {mulResult.result.decimalResult} (2n={bits * 2} bits result)
            </div>
            <BitDisplay value={mulResult.result.product} width={bits * 2} label="Product Result" readOnly={true} />
          </div>
        )}
      </div>

      {/* Step-by-step calculations */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Algorithmic Step-by-Step Breakdown
        </h2>
        <StepViewer
          steps={activeResult.steps}
          warnings={activeResult.warnings}
          errors={activeResult.errors}
        />
      </div>

      {/* Value Inspector */}
      <ValueInspector
        binary={
          op === 'add' ? addResult.result.sum :
            op === 'multiply' ? mulResult.result.product :
              op === 'divide' ? divResult.result.quotient :
                (Number(testValue) || 0).toString(2)
        }
        bits={bits}
        showSendToCircuit={true}
      />
    </div>
  );
}
