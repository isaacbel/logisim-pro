import { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Grid,
  Terminal,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAppStore } from '@state/store';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const { setAppMode, setArchPage } = useAppStore();

  const steps = [
    {
      title: 'Welcome to Logisim Pro',
      subtitle: 'Professional Digital Logic & Computer Architecture Environment',
      icon: <Sparkles className="w-8 h-8 text-cyan-400" />,
      content:
        'Logisim Pro is an all-in-one educational platform combining interactive digital circuit simulation, Boolean expression simplification, up to 6-variable Karnaugh Maps, and a complete Intel 8086 microprocessor laboratory.',
    },
    {
      title: '1. Build & Simulate Circuits',
      subtitle: 'Interactive Canvas with Real-Time Oscilloscope Probes',
      icon: <Zap className="w-8 h-8 text-amber-400" />,
      content:
        'Drag logic gates, flip-flops, adders, and multiplexers from the left sidebar onto the canvas. Connect pins with smart orthogonal wires and analyze waveforms in real time.',
      action: () => setAppMode('simulator'),
    },
    {
      title: '2. Boolean Algebra & 6-Var K-Maps',
      subtitle: 'Instant Minimization & Circuit Synthesis',
      icon: <Grid className="w-8 h-8 text-indigo-400" />,
      content:
        'Enter complex Boolean equations or truth tables. Solve 2, 3, 4, 5, and 6-variable Karnaugh Maps with Gray-code visualizations and 1-click circuit synthesis directly to the canvas.',
      action: () => {
        setAppMode('architecture');
        setArchPage('boolean-algebra');
      },
    },
    {
      title: '3. Intel 8086 Microprocessor Lab',
      subtitle: 'Registers, ALU, Memory, BIU Queue & Assembler',
      icon: <Cpu className="w-8 h-8 text-emerald-400" />,
      content:
        'Step through real 16-bit 8086 instructions. Observe bidirectional AX/AH/AL registers, 9 status flags, segmented 1MB memory, hardware bus timing, and the 6-byte instruction FIFO queue.',
      action: () => {
        setAppMode('architecture');
        setArchPage('8086-overview');
      },
    },
    {
      title: '4. Write & Debug Assembly',
      subtitle: 'Two-Pass Assembler with Step-by-Step Debugger',
      icon: <Terminal className="w-8 h-8 text-blue-400" />,
      content:
        'Write authentic 8086 assembly in the code editor, assemble directly to machine bytes, set conditional breakpoints, and trace cycle-by-cycle micro-operations.',
      action: () => {
        setAppMode('architecture');
        setArchPage('8086-assembly');
      },
    },
  ];

  if (!isOpen) return null;

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('logisim_pro_onboarded', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('logisim_pro_onboarded', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
              {currentStep.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{currentStep.title}</h2>
              <p className="text-xs text-slate-400">{currentStep.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {currentStep.content}
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 pt-4">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === step ? 'w-8 bg-cyan-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            Skip Tutorial
          </button>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep.action) currentStep.action();
                handleNext();
              }}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-600/30 flex items-center gap-1.5 transition-all"
            >
              {step === steps.length - 1 ? 'Get Started' : 'Next Step'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
