// ─────────────────────────────────────────────────────────────────────────────
// NumberSystems — Interactive Base Converter & Positional Expansion
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import {
  decimalToBinary, binaryToDecimal, binaryToOctal, binaryToHex,
  octalToBinary, hexToBinary, decimalToOctal, decimalToHex,
  convertToAllBases,
} from '../engine/conversions';
import { BitDisplay } from '../components/BitDisplay';
import { StepViewer } from '../components/StepViewer';
import { ValueInspector } from '../components/ValueInspector';
import { BinaryTable } from '../components/BinaryTable';
import { ArrowRightLeft, Zap, Copy, Check } from 'lucide-react';

export function NumberSystems() {
  const [inputValue, setInputValue] = useState('42');
  const [inputBase, setInputBase] = useState<2 | 8 | 10 | 16>(10);
  const [targetBase, setTargetBase] = useState<2 | 8 | 10 | 16>(2);
  const [bitWidth, setBitWidth] = useState<number>(8);
  const [copied, setCopied] = useState(false);

  const { sendBitsToCircuit } = useAppStore();

  // All base summary
  const allBases = useMemo(() => {
    return convertToAllBases(inputValue, inputBase);
  }, [inputValue, inputBase]);

  // Step-by-step conversion result depending on input/target
  const stepResult = useMemo(() => {
    if (allBases.errors.length > 0) {
      return { result: '', steps: [], warnings: [], errors: allBases.errors };
    }

    if (inputBase === 10 && targetBase === 2) return decimalToBinary(inputValue);
    if (inputBase === 2 && targetBase === 10) {
      const res = binaryToDecimal(inputValue);
      return { ...res, result: res.result.toString() };
    }
    if (inputBase === 2 && targetBase === 8) return binaryToOctal(inputValue);
    if (inputBase === 2 && targetBase === 16) return binaryToHex(inputValue);
    if (inputBase === 8 && targetBase === 2) return octalToBinary(inputValue);
    if (inputBase === 16 && targetBase === 2) return hexToBinary(inputValue);
    if (inputBase === 10 && targetBase === 8) return decimalToOctal(inputValue);
    if (inputBase === 10 && targetBase === 16) return decimalToHex(inputValue);

    // Fallback: Decimal -> Target
    if (targetBase === 2) return decimalToBinary(allBases.decimal);
    if (targetBase === 8) return decimalToOctal(allBases.decimal);
    if (targetBase === 16) return decimalToHex(allBases.decimal);
    const res = binaryToDecimal(allBases.binary);
    return { ...res, result: res.result.toString() };
  }, [inputValue, inputBase, targetBase, allBases]);

  const handleBitToggle = (idx: number, newBit: 0 | 1) => {
    const raw = (allBases.binary || '0').padStart(bitWidth, '0').slice(-bitWidth);
    const bitArr = raw.split('');
    bitArr[idx] = newBit.toString();
    const newBin = bitArr.join('');
    if (inputBase === 2) {
      setInputValue(newBin);
    } else if (inputBase === 10) {
      setInputValue(parseInt(newBin, 2).toString(10));
    } else if (inputBase === 8) {
      setInputValue(parseInt(newBin, 2).toString(8));
    } else if (inputBase === 16) {
      setInputValue(parseInt(newBin, 2).toString(16).toUpperCase());
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendToCircuit = () => {
    const binStr = (allBases.binary || '0').padStart(bitWidth, '0').slice(-bitWidth);
    const bits = binStr.split('').map(Number) as (0 | 1)[];
    sendBitsToCircuit(bits, `Val_${allBases.decimal}`);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          Universal Number Base Converter
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Convert between Binary, Octal, Decimal, and Hexadecimal representations with step-by-step algorithmic breakdowns.
        </p>
      </div>

      {/* Converter Control Card */}
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
          {/* Input Value */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Input Value
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={`Enter Base-${inputBase} number...`}
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

          {/* From Base */}
          <div style={{ width: 140 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              From Base
            </label>
            <select
              value={inputBase}
              onChange={e => setInputBase(Number(e.target.value) as 2 | 8 | 10 | 16)}
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
              <option value={2}>Base 2 (Binary)</option>
              <option value={8}>Base 8 (Octal)</option>
              <option value={10}>Base 10 (Decimal)</option>
              <option value={16}>Base 16 (Hex)</option>
            </select>
          </div>

          <button
            onClick={() => {
              const oldInput = inputBase;
              setInputBase(targetBase);
              setTargetBase(oldInput);
              if (stepResult.result) setInputValue(stepResult.result);
            }}
            title="Swap Bases"
            style={{
              padding: '8px 12px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 38,
            }}
          >
            <ArrowRightLeft size={16} />
          </button>

          {/* To Base */}
          <div style={{ width: 140 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              To Base
            </label>
            <select
              value={targetBase}
              onChange={e => setTargetBase(Number(e.target.value) as 2 | 8 | 10 | 16)}
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
              <option value={2}>Base 2 (Binary)</option>
              <option value={8}>Base 8 (Octal)</option>
              <option value={10}>Base 10 (Decimal)</option>
              <option value={16}>Base 16 (Hex)</option>
            </select>
          </div>

          {/* Bit Width Selector */}
          <div style={{ width: 110 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Bit Width
            </label>
            <select
              value={bitWidth}
              onChange={e => setBitWidth(Number(e.target.value))}
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
              <option value={1}>1-Bit</option>
              <option value={2}>2-Bit</option>
              <option value={4}>4-Bit</option>
              <option value={8}>8-Bit</option>
              <option value={16}>16-Bit</option>
              <option value={32}>32-Bit</option>
              <option value={64}>64-Bit</option>
            </select>
          </div>
        </div>

        {/* Interactive Bit Visualizer */}
        <div style={{
          background: 'var(--surface-1)',
          padding: '14px 16px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Interactive Bit Editor ({bitWidth}-Bit) — Click Bits to Toggle
            </span>
            <button
              onClick={handleSendToCircuit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Zap size={12} /> Send to Circuit
            </button>
          </div>
          <BitDisplay
            value={(allBases.binary || '0').padStart(bitWidth, '0').slice(-bitWidth)}
            width={bitWidth}
            onBitToggle={handleBitToggle}
            groupSize={4}
          />
        </div>

        {/* Result Output Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              RESULT IN BASE {targetBase} ({targetBase === 2 ? 'Binary' : targetBase === 8 ? 'Octal' : targetBase === 10 ? 'Decimal' : 'Hexadecimal'})
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
              {stepResult.result || '0'}
            </div>
          </div>
          <button
            onClick={() => handleCopy(stepResult.result)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
            }}
          >
            {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Multi-base quick chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {[
            { label: 'Decimal (Base 10)', val: allBases.decimal, color: '#3b82f6' },
            { label: 'Binary (Base 2)', val: allBases.binary, color: '#10b981' },
            { label: 'Hex (Base 16)', val: allBases.hex ? `0x${allBases.hex}` : '0x0', color: '#8b5cf6' },
            { label: 'Octal (Base 8)', val: allBases.octal ? `0o${allBases.octal}` : '0o0', color: '#f59e0b' },
          ].map(b => (
            <div
              key={b.label}
              style={{
                background: 'var(--surface-1)',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{b.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: b.color, wordBreak: 'break-all' }}>
                {b.val || '0'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step by Step Breakdown */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Step-by-Step Educational Explanation ({inputBase} → {targetBase})
        </h2>
        <StepViewer
          steps={stepResult.steps}
          warnings={stepResult.warnings}
          errors={stepResult.errors}
          autoPlay={false}
        />
      </div>

      {/* Reference & Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <ValueInspector binary={allBases.binary || '0'} bits={bitWidth} showSendToCircuit={true} />
        <BinaryTable />
      </div>
    </div>
  );
}
