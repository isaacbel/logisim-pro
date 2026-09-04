import { useEffect, useRef } from 'react';
import { useAppStore } from '@state/store';

// ── Animated circuit background ───────────────────────────────────────────────
function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;

    // Sparse circuit-trace nodes
    interface Node { x: number; y: number; vx: number; vy: number }
    const COLS = 12, ROWS = 8;
    const nodes: Node[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        nodes.push({
          x: (c / (COLS - 1)) * w,
          y: (r / (ROWS - 1)) * h,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
        });
      }
    }

    let t = 0;
    function draw() {
      w = canvas!.width = canvas!.offsetWidth;
      h = canvas!.height = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);
      t += 0.005;

      // Drift nodes gently
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });

      // Draw orthogonal traces between nearby nodes
      ctx!.strokeStyle = 'rgba(59,130,246,0.06)';
      ctx!.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist > 220) continue;
          const alpha = (1 - dist / 220) * 0.07;
          ctx!.strokeStyle = `rgba(59,130,246,${alpha})`;
          ctx!.beginPath();
          // Orthogonal trace: go horizontal then vertical
          ctx!.moveTo(nodes[i].x, nodes[i].y);
          ctx!.lineTo(nodes[j].x, nodes[i].y);
          ctx!.lineTo(nodes[j].x, nodes[j].y);
          ctx!.stroke();
        }
      }

      // Draw node dots
      nodes.forEach((n, idx) => {
        const pulse = 0.4 + 0.3 * Math.sin(t * 2 + idx * 0.7);
        ctx!.fillStyle = `rgba(59,130,246,${pulse * 0.18})`;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
        ctx!.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

// ── Workspace Card ────────────────────────────────────────────────────────────
interface CardProps {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  buttonLabel: string;
  accentColor: string;
  onClick: () => void;
  testId: string;
}

function WorkspaceCard({ icon, title, subtitle, description, buttonLabel, accentColor, onClick, testId }: CardProps) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 36px 32px',
        background: 'var(--glass-bg)',
        border: `1px solid var(--border)`,
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        width: 280,
        gap: 0,
        textAlign: 'center',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-6px)';
        el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}40`;
        el.style.borderColor = `${accentColor}60`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
        el.style.borderColor = 'var(--border)';
      }}
    >
      {/* Accent glow top */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 120, height: 2,
        background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        borderRadius: 2,
      }} />

      {/* Icon */}
      <div style={{
        fontSize: 40, marginBottom: 20,
        filter: `drop-shadow(0 0 12px ${accentColor}80)`,
        lineHeight: 1,
      }}>
        {icon}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: accentColor,
        marginBottom: 4,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 16,
        lineHeight: 1.3,
      }}>
        {subtitle}
      </div>

      {/* Description */}
      <p style={{
        fontSize: 13,
        color: 'var(--text-muted)',
        lineHeight: 1.65,
        marginBottom: 28,
        flexGrow: 1,
      }}>
        {description}
      </p>

      {/* Button */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 24px',
        background: accentColor,
        color: '#fff',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.03em',
        boxShadow: `0 4px 16px ${accentColor}50`,
        transition: 'opacity 0.15s',
      }}>
        {buttonLabel}
      </div>
    </button>
  );
}

// ── Welcome Page ──────────────────────────────────────────────────────────────
export function WelcomePage() {
  const { setAppMode } = useAppStore();

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: 'var(--canvas-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>
      <CircuitBackground />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {/* Logo */}
        <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 0 20px #3b82f680)' }}>⚡</div>

        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}>
          LOGISIM PRO
        </h1>

        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Digital Logic &amp; Computer Architecture
        </p>

        <p style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginBottom: 52,
        }}>
          Build circuits. Understand computers.
        </p>

        {/* Cards */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          <WorkspaceCard
            testId="open-simulator-btn"
            icon="⚡"
            title="Workspace 1"
            subtitle="Digital Logic Simulator"
            description="Build and simulate digital circuits with gates, wires, memory, arithmetic components and more."
            buttonLabel="Open Logisim"
            accentColor="#3b82f6"
            onClick={() => setAppMode('simulator')}
          />
          <WorkspaceCard
            testId="open-architecture-btn"
            icon="◈"
            title="Workspace 2"
            subtitle="Computer Architecture Lab"
            description="Explore number systems, binary arithmetic, signed numbers, fixed-point, IEEE 754 and BCD codes."
            buttonLabel="Open Architecture Lab"
            accentColor="#8b5cf6"
            onClick={() => setAppMode('architecture')}
          />
        </div>

        {/* Footer hint */}
        <p style={{ marginTop: 48, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          LOGISIM PRO v2.0 · Digital Logic + Computer Architecture
        </p>
      </div>
    </div>
  );
}
