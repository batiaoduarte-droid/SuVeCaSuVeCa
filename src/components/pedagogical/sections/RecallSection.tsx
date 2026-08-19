import React, { useState } from 'react';
import { Award, CheckSquare, Copy, Check, Sparkles, RefreshCw, ThumbsUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ContentBlock } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

type ConfidenceLevel = 'none' | 'partial' | 'mastered';

interface RecallSectionProps {
  blocks?: ContentBlock[];
}

export const RecallSection: React.FC<RecallSectionProps> = ({ blocks = [] }) => {
  const [confidenceState, setConfidenceState] = useState<Record<number, ConfidenceLevel>>({});
  const [copied, setCopied] = useState(false);

  if (!blocks || blocks.length === 0) return null;

  const checklistItems: string[] = [];
  const otherBlocks: ContentBlock[] = [];

  for (const b of blocks) {
    if (b.type === 'list') {
      checklistItems.push(...b.items);
    } else {
      otherBlocks.push(b);
    }
  }

  const setConfidence = (idx: number, level: ConfidenceLevel) => {
    setConfidenceState((prev) => ({
      ...prev,
      [idx]: prev[idx] === level ? 'none' : level,
    }));
  };

  const masteredCount = Object.values(confidenceState).filter((v) => v === 'mastered').length;
  const partialCount = Object.values(confidenceState).filter((v) => v === 'partial').length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round(((masteredCount + partialCount * 0.5) / totalCount) * 100) : 0;

  const handleCopy = () => {
    const text = checklistItems.map((item, i) => `[ ] ${i + 1}. ${item}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-teal-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-900 text-teal-200 shadow-2xs select-none">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                Síntese para Recuperação Ativa
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Checklist de autoavaliação e diagnóstico rápido de retenção conceitual
              </p>
            </div>
          </div>

          {checklistItems.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
              title="Copiar checklist"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Barra de Progresso de Domínio */}
        {checklistItems.length > 0 && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs select-none">
              <span className="font-black text-teal-950 uppercase tracking-wider text-[10px]">
                Nível de Domínio da Unidade
              </span>
              <span className="font-bold text-teal-800">
                {masteredCount} de {totalCount} dominados ({progressPercent}%)
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-teal-200/60 overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Checklist com Seletores de Confiança Didáticos */}
        {checklistItems.length > 0 && (
          <div className="space-y-2.5">
            {checklistItems.map((item, idx) => {
              const currentLevel = confidenceState[idx] || 'none';

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
                    onClick={() => setConfidence(idx, currentLevel === 'mastered' ? 'none' : 'mastered')}
                    className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
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
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed group-hover:text-teal-900">
                      <InlineRichText>{item}</InlineRichText>
                    </p>
                  </button>

                  {/* Seletor de Confiança: [Não Lembro] [Quase] [Domino] */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => setConfidence(idx, 'none')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                        currentLevel === 'none'
                          ? 'bg-slate-200 text-slate-800 border-slate-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Dúvida
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfidence(idx, 'partial')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                        currentLevel === 'partial'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      Quase
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfidence(idx, 'mastered')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
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
              <ContentBlockRenderer key={idx} block={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
