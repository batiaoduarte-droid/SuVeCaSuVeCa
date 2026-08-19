import React, { useState } from 'react';
import { PenTool, HelpCircle, Copy, Check, Sparkles } from 'lucide-react';
import type { ProcedureView } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface ResolutionSectionProps {
  procedures?: ProcedureView[];
}

export const ResolutionSection: React.FC<ResolutionSectionProps> = ({ procedures = [] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!procedures || procedures.length === 0) return null;

  const handleCopy = (proc: ProcedureView, idx: number) => {
    const text = `${proc.title || `Roteiro ${idx + 1}`}\n${proc.objective || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 surface p-4 sm:p-6">
      {/* Cabeçalho Padronizado da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs">
            <PenTool className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
              Roteiros de resolução ({procedures.length})
            </h3>
            <p className="m-0 text-xs text-slate-600 font-medium">
              Algoritmos práticos e sequências passo a passo para resolver questões com precisão
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {procedures.map((proc, pIdx) => (
          <div
            key={proc.procedureId || pIdx}
            className="overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-slate-50/40 to-teal-50/20 p-5 shadow-xs transition hover:border-teal-400 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-xs font-black text-teal-100 shadow-2xs">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h4 className="m-0 text-sm sm:text-base font-black tracking-tight text-slate-900">
                  <InlineRichText>{proc.title || `Procedimento Decisório #${pIdx + 1}`}</InlineRichText>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-teal-100/80 px-2.5 py-0.5 text-xs font-bold text-teal-900 border border-teal-200">
                  Roteiro de Resolução
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(proc, pIdx)}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                  title="Copiar roteiro"
                >
                  {copiedIndex === pIdx ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-slate-400" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {proc.objective && (
              <div className="mt-3.5 rounded-xl border border-teal-200/80 bg-teal-50/60 p-3.5 text-xs sm:text-sm text-teal-950 font-medium leading-relaxed">
                <strong className="text-teal-900 block mb-0.5">Objetivo do Algoritmo:</strong>
                <InlineRichText>{proc.objective}</InlineRichText>
              </div>
            )}

            {proc.inputs && proc.inputs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 self-center">
                  Dados de Entrada:
                </span>
                {proc.inputs.map((inp, iIdx) => (
                  <span
                    key={iIdx}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 font-mono shadow-2xs"
                    title={inp.description}
                  >
                    {inp.name}
                  </span>
                ))}
              </div>
            )}

            {/* Blocos do Procedimento */}
            {proc.blocks && proc.blocks.length > 0 ? (
              <div className="mt-4 space-y-2 reading-content">
                {proc.blocks.map((block, bIdx) => (
                  <ContentBlockRenderer key={bIdx} block={block} />
                ))}
              </div>
            ) : (
              proc.steps && proc.steps.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  {proc.steps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-xs sm:text-sm shadow-2xs"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-800 font-bold text-white text-xs">
                        {step.order || sIdx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900">
                          <InlineRichText>{step.action}</InlineRichText>
                        </div>
                        {step.explanation && (
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                            <InlineRichText>{step.explanation}</InlineRichText>
                          </p>
                        )}
                        {step.test && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-900">
                            <HelpCircle className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                            <span>Teste: <InlineRichText>{step.test}</InlineRichText></span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
