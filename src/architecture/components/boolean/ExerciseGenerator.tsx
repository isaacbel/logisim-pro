import { useState } from 'react';
import { buildCanonicalSOP, simplifyStepByStep } from '@engine/analysis/boolean';
import { checkBooleanEquivalence } from '@engine/analysis/validation/booleanEquivalence';
import { Award, RefreshCw, CheckCircle2, XCircle, Eye } from 'lucide-react';

interface Exercise {
  id: string;
  variables: string[];
  minterms: number[];
  sopExpression: string;
  expectedSimplified: string;
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
}

function generateRandomExercise(numVars: 2 | 3 | 4, difficulty: 'Facile' | 'Moyen' | 'Difficile'): Exercise {
  const vars = ['A', 'B', 'C', 'D'].slice(0, numVars);
  const total = 1 << numVars;

  // Decide how many minterms based on difficulty
  const targetCount = difficulty === 'Facile'
    ? Math.max(2, Math.floor(total / 4))
    : difficulty === 'Moyen'
    ? Math.max(3, Math.floor(total / 2))
    : Math.max(4, Math.floor((total * 3) / 4));

  const minterms: number[] = [];
  const pool = Array.from({ length: total }, (_, i) => i);
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  minterms.push(...pool.slice(0, targetCount).sort((a, b) => a - b));

  const sop = buildCanonicalSOP(minterms, vars);
  const trace = simplifyStepByStep(sop.expandedSOP || '0');

  return {
    id: `ex-${Date.now()}`,
    variables: vars,
    minterms,
    sopExpression: sop.expandedSOP || '0',
    expectedSimplified: trace.simplifiedExpression,
    difficulty,
  };
}

export function ExerciseGenerator() {
  const [numVars, setNumVars] = useState<2 | 3 | 4>(3);
  const [difficulty] = useState<'Facile' | 'Moyen' | 'Difficile'>('Moyen');
  const [currentExercise, setCurrentExercise] = useState<Exercise>(() => generateRandomExercise(3, 'Moyen'));
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showSolution, setShowSolution] = useState<boolean>(false);

  const handleNewExercise = () => {
    const ex = generateRandomExercise(numVars, difficulty);
    setCurrentExercise(ex);
    setUserAnswer('');
    setFeedback(null);
    setShowSolution(false);
  };

  const handleCheckAnswer = () => {
    if (!userAnswer.trim()) return;
    try {
      const eq = checkBooleanEquivalence(userAnswer, currentExercise.sopExpression);
      if (eq.isEquivalent) {
        setFeedback({
          isCorrect: true,
          message: "Bravo ! Votre expression est mathématiquement exacte et équivalente à 100%.",
        });
      } else {
        setFeedback({
          isCorrect: false,
          message: `Expression non équivalente. Erreur sur la combinaison #${eq.failingRow?.index}.`,
        });
      }
    } catch (e) {
      setFeedback({
        isCorrect: false,
        message: `Erreur de syntaxe dans votre réponse : ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Générateur d'Exercices &amp; Auto-Évaluation
            </h3>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Entraînez-vous à simplifier des expressions et vérifiez automatiquement votre équivalence logique.
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => { setNumVars(n as 2 | 3 | 4); }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: `1px solid ${numVars === n ? 'var(--accent)' : 'var(--border)'}`,
                  background: numVars === n ? 'var(--accent)' : 'var(--surface-2)',
                  color: numVars === n ? '#fff' : 'var(--text-secondary)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {n} vars
              </button>
            ))}
          </div>

          <button
            onClick={handleNewExercise}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} /> Nouvel Exercice
          </button>
        </div>
      </div>

      {/* Problem Statement Card */}
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 8,
        padding: 16,
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
          Énoncé de l'exercice :
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
          Simplifiez au maximum la fonction suivante définie par ses mintermes :
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: 'var(--accent)', padding: '6px 0' }}>
          F({currentExercise.variables.join(',')}) = Σm({currentExercise.minterms.join(', ')})
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Forme canonique : <code style={{ color: 'var(--text-secondary)' }}>{currentExercise.sopExpression}</code>
        </div>
      </div>

      {/* User Input & Submission */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          Votre réponse simplifiée :
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Ex: A.B + C'"
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCheckAnswer(); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 600,
            }}
          />
          <button
            onClick={handleCheckAnswer}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#10b981',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Vérifier
          </button>
          <button
            onClick={() => setShowSolution(s => !s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <Eye size={13} /> {showSolution ? 'Masquer la solution' : 'Voir la solution'}
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 6,
            background: feedback.isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${feedback.isCorrect ? '#10b981' : '#ef4444'}`,
            color: feedback.isCorrect ? '#10b981' : '#ef4444',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {feedback.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Solution Reveal */}
        {showSolution && (
          <div style={{
            padding: 14,
            borderRadius: 8,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
              Solution minimale calculée :
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              F = {currentExercise.expectedSimplified}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
