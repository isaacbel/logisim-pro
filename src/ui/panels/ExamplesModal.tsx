import { useState } from 'react';
import {
  BookOpen,
  Cpu,
  Terminal,
  Grid,
  ArrowRight,
  X,
} from 'lucide-react';
import { BUNDLED_EXAMPLE_CATEGORIES, ExampleItem } from '@core/examples/exampleLibrary';
import { useAppStore } from '@state/store';

interface ExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExamplesModal({ isOpen, onClose }: ExamplesModalProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>('digital_logic');
  const [selectedExample, setSelectedExample] = useState<ExampleItem | null>(
    BUNDLED_EXAMPLE_CATEGORIES[0]?.examples[0] || null
  );
  const { setProject, setAppMode, setArchPage } = useAppStore();

  if (!isOpen) return null;

  const currentCategory = BUNDLED_EXAMPLE_CATEGORIES.find(c => c.id === selectedCatId) || BUNDLED_EXAMPLE_CATEGORIES[0];

  const handleOpenExample = (example: ExampleItem) => {
    const projectFile = example.projectGenerator();
    setProject(projectFile.project);

    if (example.category === '8086_assembly') {
      setAppMode('architecture');
      setArchPage('8086-assembly');
    } else if (example.category === 'boolean_algebra') {
      setAppMode('architecture');
      setArchPage('boolean-algebra');
    } else {
      setAppMode('simulator');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Curated Example Library</h2>
              <p className="text-xs text-slate-400">
                Explore reference circuits, K-Map models, and 8086 programs. Open, simulate, and modify.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Categories Left, Examples Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category List */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 space-y-2 shrink-0 overflow-y-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
              Categories
            </span>
            {BUNDLED_EXAMPLE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCatId(cat.id);
                  setSelectedExample(cat.examples[0] || null);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                  selectedCatId === cat.id
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {cat.id === 'digital_logic' && <Cpu className="w-4 h-4 text-cyan-400" />}
                {cat.id === 'boolean_algebra' && <Grid className="w-4 h-4 text-amber-400" />}
                {cat.id === '8086_assembly' && <Terminal className="w-4 h-4 text-emerald-400" />}
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Example Cards List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">{currentCategory.name}</h3>
              <p className="text-xs text-slate-400">{currentCategory.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentCategory.examples.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExample(ex)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    selectedExample?.id === ex.id
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-950/50'
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-200 text-sm">{ex.title}</h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ex.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        ex.difficulty === 'Intermediate' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ex.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{ex.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      {ex.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenExample(ex);
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all shrink-0"
                  >
                    Open Design <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Logisim Pro Educational Library</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
