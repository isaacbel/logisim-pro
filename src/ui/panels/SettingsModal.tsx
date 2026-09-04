import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Cpu,
  HardDrive,
  X,
  Check,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@state/store';
import { projectStorage } from '@core/storage/indexedDbStorage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useAppStore();
  const [autosaveInterval, setAutosaveInterval] = useState(30); // seconds
  const [presentationMode, setPresentationMode] = useState(false);
  const [largeSignals, setLargeSignals] = useState(true);
  const [traceLimit, setTraceLimit] = useState(250);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    projectStorage.getSetting('autosave_interval', 30).then(setAutosaveInterval);
    projectStorage.getSetting('presentation_mode', false).then(setPresentationMode);
    projectStorage.getSetting('trace_limit', 250).then(setTraceLimit);
  }, []);

  if (!isOpen) return null;

  const handleSave = async () => {
    await projectStorage.setSetting('autosave_interval', autosaveInterval);
    await projectStorage.setSetting('presentation_mode', presentationMode);
    await projectStorage.setSetting('trace_limit', traceLimit);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Application Settings</h2>
              <p className="text-xs text-slate-400">Configure simulator behavior, autosave intervals, and presentation settings.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[65vh]">
          {/* Theme & Display */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cyan-400" /> Appearance & Theme
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  theme === 'dark'
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold">Dark Slate</div>
                  <div className="text-[10px] text-slate-400">Default high-contrast theme</div>
                </div>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  theme === 'light'
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold">Light Classroom</div>
                  <div className="text-[10px] text-slate-400">Optimized for projector rooms</div>
                </div>
              </button>
            </div>
          </div>

          {/* Autosave & Backup */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" /> Project Persistence & Crash Recovery
            </h3>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Autosave Interval</div>
                  <div className="text-[10px] text-slate-400">Saves working project state in background</div>
                </div>
                <select
                  value={autosaveInterval}
                  onChange={(e) => setAutosaveInterval(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={10}>Every 10 seconds</option>
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every 1 minute</option>
                  <option value={300}>Every 5 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Teacher & Presentation Mode */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Teacher & Classroom Mode
            </h3>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Enlarged Logic Signals</div>
                  <div className="text-[10px] text-slate-400">Thicker wires and vibrant logic 1/0 colors for lecture visibility</div>
                </div>
                <input
                  type="checkbox"
                  checked={largeSignals}
                  onChange={(e) => setLargeSignals(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded"
                />
              </label>
            </div>
          </div>

          {/* 8086 Architecture Execution Limits */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" /> 8086 Execution Watchdog Limits
            </h3>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Trace Buffer Depth</div>
                  <div className="text-[10px] text-slate-400">Maximum recorded micro-operation execution steps</div>
                </div>
                <select
                  value={traceLimit}
                  onChange={(e) => setTraceLimit(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={100}>100 Steps</option>
                  <option value={250}>250 Steps</option>
                  <option value={500}>500 Steps</option>
                  <option value={1000}>1,000 Steps</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">Changes take effect immediately.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 rounded-lg text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/30 flex items-center gap-1.5 transition-all"
            >
              {savedSuccess ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Apply & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
