import React, { useState } from 'react';
import { BookOpenCheck, Target, AlertTriangle, Lightbulb, CheckCircle, Copy, Check, Sparkles } from 'lucide-react';
import type { WorkedExampleView } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface ExamplesSectionProps {
  items?: WorkedExampleView[];
}

export const ExamplesSection: React.FC<ExamplesSectionProps> = ({ items = [] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const handleCopyExample = (example: WorkedExampleView, idx: number) => {
    const text = `${example.title || `Exemplo ${idx + 1}`}\n${example.prompt || ''}\n${example.result || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 surface p-4 sm:p-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
              Exemplos comentados ({items.length})
            </h3>
            <p className="m-0 text-xs text-slate-600 font-medium">
              Modelos guiados de aplicação prática e desmonte de itens de prova
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Exemplos com Destaque Visual */}
      <div className="space-y-6">
        {items.map((example, eIdx) => (
          <div
            key={example.exampleId || eIdx}
            className="overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-slate-50/40 to-teal-50/20 p-5 shadow-xs transition hover:border-teal-400 sm:p-6"
          >
            {/* Header do Exemplo */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100/70 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white shadow-2xs">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h4 className="m-0 text-sm sm:text-base font-black text-slate-900">
                  <InlineRichText>{example.title || `Exemplo Prático #${eIdx + 1}`}</InlineRichText>
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-md bg-teal-100/80 px-2.5 py-0.5 text-xs font-bold text-teal-900 border border-teal-200">
                  Exemplo Comentado
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyExample(example, eIdx)}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                  title="Copiar exemplo"
                >
                  {copiedIndex === eIdx ? (
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

            {/* Enunciado do Exemplo */}
            {example.prompt && (
              <div className="mt-3.5 rounded-xl border border-teal-200/80 bg-teal-50/60 p-3.5 text-xs sm:text-sm font-medium text-teal-950">
                <strong className="text-teal-900 block mb-0.5">Enunciado / Vocábulo:</strong>
                <InlineRichText>{example.prompt}</InlineRichText>
              </div>
            )}

            {/* Conteúdo / Passos */}
            {example.blocks && example.blocks.length > 0 ? (
              <div className="mt-4 space-y-2 reading-content">
                {example.blocks.map((block, bIdx) => (
                  <ContentBlockRenderer key={bIdx} block={block} />
                ))}
              </div>
            ) : (
              example.analysisSteps && example.analysisSteps.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                    Roteiro de Análise Passo a Passo:
                  </span>
                  <div className="space-y-2">
                    {example.analysisSteps.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm shadow-2xs"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-800 font-bold text-white text-xs">
                          {step.order || sIdx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="text-slate-900 font-black">{step.action}:</strong>{' '}
                          {step.rationale && (
                            <span className="text-slate-700">
                              <InlineRichText>{step.rationale}</InlineRichText>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Conclusão */}
            {example.result && !example.blocks?.length && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs sm:text-sm text-emerald-950 font-bold">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Conclusão:</strong> <InlineRichText>{example.result}</InlineRichText>
                </span>
              </div>
            )}

            {/* Tríade de Destaques Pedagógicos */}
            {(example.decisivePoint || example.commonMistake || example.examTip) && (
              <div className="mt-4 grid gap-3 pt-3 border-t border-slate-100 sm:grid-cols-3">
                {example.decisivePoint && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-xs text-teal-950">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900 mb-1">
                      <Target className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                      <span>Ponto Decisivo</span>
                    </div>
                    <p className="m-0 text-[11px] leading-relaxed text-slate-700 font-medium">
                      <InlineRichText>{example.decisivePoint}</InlineRichText>
                    </p>
                  </div>
                )}

                {example.commonMistake && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs text-rose-950">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <span>Erro Comum</span>
                    </div>
                    <p className="m-0 text-[11px] leading-relaxed text-slate-700 font-medium">
                      <InlineRichText>{example.commonMistake}</InlineRichText>
                    </p>
                  </div>
                )}

                {example.examTip && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-950">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Dica de Prova</span>
                    </div>
                    <p className="m-0 text-[11px] leading-relaxed text-slate-700 font-medium">
                      <InlineRichText>{example.examTip}</InlineRichText>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
