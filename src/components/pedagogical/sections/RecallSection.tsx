import React, { useState } from 'react';
import {
  CheckSquare,
  Sparkles,
  Eye,
  EyeOff,
  HelpCircle,
  Award,
} from 'lucide-react';
import type {
  SemanticBlock,
  RecallSectionView,
  RecallPromptView,
} from '../../../types/pedagogicalView';
import { InlineRichText } from '../blocks/InlineRichText';
import { SemanticBlockRenderer } from '../blocks/SemanticBlockRenderer';

interface RecallSectionProps extends RecallSectionView {
  unitId: string;
}

type ConfidenceLevel = 'none' | 'partial' | 'mastered';

export const RecallSection: React.FC<RecallSectionProps> = ({
  prompts = [],
  blocks = [],
  unitId,
}) => {
  const storageKey = `suveca_recall_v2_${unitId}`;
  const storedState = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  }, [storageKey]);
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>(() => storedState.revealedMap || {});
  const [attemptedMap, setAttemptedMap] = useState<Record<number, boolean>>(() => storedState.attemptedMap || {});
  const [confidenceState, setConfidenceState] = useState<Record<number, ConfidenceLevel>>(() => storedState.confidenceState || {});

  React.useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ revealedMap, attemptedMap, confidenceState }));
  }, [attemptedMap, confidenceState, revealedMap, storageKey]);

  const toggleReveal = (idx: number) => {
    setAttemptedMap((prev) => ({ ...prev, [idx]: true }));
    setRevealedMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const setConfidence = (idx: number, level: ConfidenceLevel) => {
    setConfidenceState((prev) => ({
      ...prev,
      [idx]: prev[idx] === level ? 'none' : level,
    }));
  };

  // Extrair itens de checklist a partir dos blocos legados caso prompts estruturados não estejam disponíveis
  const checklistItems = React.useMemo(() => {
    const list: string[] = [];
    blocks.forEach((b) => {
      if (b.type === 'list' || b.type === 'bullet_list') {
        b.items?.forEach((it) => {
          const clean = it?.trim();
          if (clean) list.push(clean);
        });
      } else if (b.type === 'recall_prompt') {
        if (b.question?.trim()) {
          list.push(b.question.trim());
        } else if (b.text?.trim()) {
          const lines = b.text
            .split(/\n+/)
            .map((line) => line.replace(/^[\s•·▪◦\d+.)-]+/, '').trim())
            .filter(Boolean);
          if (lines.length > 0) {
            lines.forEach((l) => list.push(l));
          } else {
            list.push(b.text.trim());
          }
        }
      }
    });
    return list;
  }, [blocks]);

  const totalPrompts = prompts.length > 0 ? prompts.length : checklistItems.length;
  const masteredCount = Object.values(confidenceState).filter((c) => c === 'mastered').length;
  const partialCount = Object.values(confidenceState).filter((c) => c === 'partial').length;
  const progressPercent = totalPrompts > 0 ? Math.round((masteredCount / totalPrompts) * 100) : 0;

  const otherBlocks = blocks.filter(
    (b) => b.type !== 'list' && b.type !== 'bullet_list' && b.type !== 'recall_prompt'
  );

  if (prompts.length === 0 && checklistItems.length === 0 && otherBlocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header & Progresso de Retenção */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white shadow-2xs">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-teal-950 m-0">
                  Síntese para Recuperação Ativa
                </h3>
                <span className="rounded-full bg-teal-100 text-teal-900 px-2 py-0.5 text-xs font-black select-none">
                  {totalPrompts} {totalPrompts === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium m-0">
                Teste sua retenção mental antes de consultar os pontos-chave
              </p>
            </div>
          </div>

          {/* Medidor de Domínio */}
          {totalPrompts > 0 && (
            <div className="flex items-center gap-3 bg-white border border-teal-200 px-3.5 py-2 rounded-xl shadow-2xs select-none">
              <Award className="h-4 w-4 text-teal-700 shrink-0" />
              <div className="text-right">
                <div className="text-xs font-black text-teal-950">
                  {masteredCount} de {totalPrompts} dominados {progressPercent > 0 ? `(${progressPercent}%)` : ''}
                </div>
                <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden" role="progressbar" aria-label="Domínio na recuperação ativa" aria-valuemin={0} aria-valuemax={totalPrompts} aria-valuenow={masteredCount}>
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prompts Estruturados v4.2 */}
      {prompts.length > 0 ? (
        <div className="space-y-4">
          {prompts.map((p, idx) => {
            const isRevealed = !!revealedMap[idx];
            const conf = confidenceState[idx] || 'none';
            const canEvaluate = !p.keyPoints?.length || isRevealed || !!attemptedMap[idx];

            return (
              <div
                key={p.promptId || idx}
                className={`rounded-2xl border bg-white p-4 sm:p-5 transition-all shadow-2xs space-y-3 select-text ${
                  conf === 'mastered'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : conf === 'partial'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 hover:border-teal-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-bold text-white select-none">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      {p.targetConcept && (
                        <span className="inline-block rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-900 uppercase tracking-wider select-none">
                          {p.targetConcept}
                        </span>
                      )}
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed m-0">
                        <InlineRichText>{p.question}</InlineRichText>
                      </p>
                    </div>
                  </div>

                  {p.keyPoints && p.keyPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(idx)}
                      className="flex min-h-11 items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition cursor-pointer select-none shrink-0"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Já respondi — conferir
                        </>
                      )}
                    </button>
                  )}
                </div>

                {isRevealed && p.keyPoints && p.keyPoints.length > 0 && (
                  <div className="rounded-lg bg-teal-50/70 border border-teal-200 p-3 space-y-1 text-xs">
                    <span className="font-bold text-teal-900 block text-[11px] uppercase tracking-wider select-none">
                      Pontos-Chave de Recuperação:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium pl-1">
                      {p.keyPoints.map((kp, kpIdx) => (
                        <li key={kpIdx} className="leading-relaxed">
                          <InlineRichText>{kp}</InlineRichText>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs select-none">
                  <span className="text-[11px] font-semibold text-slate-500">Autoavaliação:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!canEvaluate}
                      onClick={() => setConfidence(idx, 'partial')}
                      className={`min-h-11 px-3 py-2 rounded-md text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        conf === 'partial'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Revisar
                    </button>
                    <button
                      type="button"
                      disabled={!canEvaluate}
                      onClick={() => setConfidence(idx, 'mastered')}
                      className={`min-h-11 px-3 py-2 rounded-md text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        conf === 'mastered'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Dominado
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {checklistItems.map((item, idx) => {
            const currentLevel = confidenceState[idx] || 'none';
            const hasAttempted = !!attemptedMap[idx];
            return (
              <div
                key={idx}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                  currentLevel === 'mastered'
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : currentLevel === 'partial'
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-slate-200 bg-white hover:border-teal-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAttemptedMap((current) => ({ ...current, [idx]: true }))}
                  aria-pressed={hasAttempted}
                  className="flex min-h-11 items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black mt-0.5 select-none ${
                    currentLevel === 'mastered'
                      ? 'bg-emerald-600 text-white'
                      : currentLevel === 'partial'
                      ? 'bg-amber-500 text-white'
                      : 'bg-teal-100 text-teal-900'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed group-hover:text-teal-900 m-0">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-teal-800">Explique sem consultar</span>
                    <InlineRichText>{item}</InlineRichText>
                    {!hasAttempted && <span className="mt-1 block text-[11px] font-medium text-slate-500">Ative depois de formular sua resposta.</span>}
                  </p>
                </button>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 select-none">
                  <button
                    type="button"
                    disabled={!hasAttempted}
                    onClick={() => setConfidence(idx, 'none')}
                    className={`min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer border disabled:cursor-not-allowed disabled:opacity-45 ${
                      currentLevel === 'none'
                        ? 'bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Dúvida
                  </button>
                  <button
                    type="button"
                    disabled={!hasAttempted}
                    onClick={() => setConfidence(idx, 'partial')}
                    className={`min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer border disabled:cursor-not-allowed disabled:opacity-45 ${
                      currentLevel === 'partial'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    Quase
                  </button>
                  <button
                    type="button"
                    disabled={!hasAttempted}
                    onClick={() => setConfidence(idx, 'mastered')}
                    className={`min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer border disabled:cursor-not-allowed disabled:opacity-45 ${
                      currentLevel === 'mastered'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    Domino ✓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Outros blocos */}
      {otherBlocks.length > 0 && (
        <div className="pt-3 space-y-2 border-t border-slate-100">
          {otherBlocks.map((b, idx) => (
            <SemanticBlockRenderer key={idx} block={b} />
          ))}
        </div>
      )}
    </div>
  );
};
