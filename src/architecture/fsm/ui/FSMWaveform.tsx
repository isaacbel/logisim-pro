/**
 * FSM Waveform Viewer — Canvas-based digital timing diagram.
 * Visualizes CLK, Input stimulus, State transitions, and Output signals over time.
 * Supports CSV export.
 */
import React, { useRef, useEffect } from 'react';
import { Download } from 'lucide-react';

export interface WaveformSample {
  cycle: number;
  state: string;
  input: string;
  output: string;
}

interface FSMWaveformProps {
  samples: WaveformSample[];
  onClear?: () => void;
}

export const FSMWaveform: React.FC<FSMWaveformProps> = ({ samples, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);

    if (samples.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No waveform data recorded yet. Run or step the FSM simulator.', W / 2, H / 2);
      return;
    }

    const marginX = 90;
    const stepX = Math.max(40, (W - marginX - 30) / Math.max(samples.length, 10));
    const trackH = 40;
    const trackLabels = ['CLK', 'INPUT', 'STATE', 'OUTPUT'];

    // Track Dividers & Row Names
    trackLabels.forEach((label, idx) => {
      const y = 30 + idx * trackH;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX, y + trackH / 2);
      ctx.lineTo(W, y + trackH / 2);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(label, marginX - 16, y + 20);
    });

    // Draw Cycles
    samples.forEach((sample, i) => {
      const x = marginX + i * stepX;
      const xNext = x + stepX;

      // 1. CLK Track
      const clkY = 30;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, clkY + 24);
      ctx.lineTo(x + stepX / 2, clkY + 24);
      ctx.lineTo(x + stepX / 2, clkY + 8);
      ctx.lineTo(xNext, clkY + 8);
      ctx.lineTo(xNext, clkY + 24);
      ctx.stroke();

      // Cycle number label at top
      ctx.fillStyle = '#64748b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${sample.cycle}`, x + stepX / 2, 20);

      // 2. INPUT Track
      const inpY = 30 + trackH;
      const isHighInp = sample.input === '1' || sample.input.endsWith('1');
      const valY = isHighInp ? inpY + 8 : inpY + 24;

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, valY);
      ctx.lineTo(xNext, valY);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sample.input, x + stepX / 2, valY - 3);

      // 3. STATE Track (Bus polygon)
      const stY = 30 + trackH * 2;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 3, stY + 16);
      ctx.lineTo(x + 7, stY + 6);
      ctx.lineTo(xNext - 7, stY + 6);
      ctx.lineTo(xNext - 3, stY + 16);
      ctx.lineTo(xNext - 7, stY + 26);
      ctx.lineTo(x + 7, stY + 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sample.state, x + stepX / 2, stY + 20);

      // 4. OUTPUT Track
      const outY = 30 + trackH * 3;
      const isHighOut = sample.output === '1' || sample.output.endsWith('1');
      const outValY = isHighOut ? outY + 8 : outY + 24;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, outValY);
      ctx.lineTo(xNext, outValY);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sample.output, x + stepX / 2, outValY - 3);
    });
  }, [samples]);

  const exportCSV = () => {
    if (samples.length === 0) return;
    const header = 'Cycle,State,Input,Output\n';
    const rows = samples.map(s => `${s.cycle},${s.state},${s.input},${s.output}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fsm_waveform_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#090d16' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
          Timing Diagram / Waveform ({samples.length} cycles captured)
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportCSV}
            disabled={samples.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#e2e8f0',
              fontSize: 11,
              cursor: samples.length === 0 ? 'not-allowed' : 'pointer',
              opacity: samples.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
};
