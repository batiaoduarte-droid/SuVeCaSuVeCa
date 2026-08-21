import React from 'react';
import {
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { WorkedExampleView, ContentBlock } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface WorkedExampleCardProps {
  example: WorkedExampleView;
  renderBlock?: (block: ContentBlock) => React.ReactNode;
  className?: string;
}

export const WorkedExampleCard: React.FC<WorkedExampleCardProps> = ({
  example,
  renderBlock,
  className = '',
}) => {
  const resolvedPrompt = example.prompt || example.sentence;
  const resolvedResult = example.result || example.pedagogicalTakeaway;
  const showStructuredScaffold = !example.presentation?.hideGenericScaffold;

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-white p-4 sm:p-6 shadow-xs hover:border-emerald-300 transition-all space-y-4 select-text ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-800 text-white select-none shadow-2xs">
            <Lightbulb className="h-4 w-4" />
          </div>
          <h4 className="text-sm sm:text-base font-black tracking-tight text-emerald-950">
            <InlineRichText>{example.title}</InlineRichText>
          </h4>
        </div>

        <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-900 uppercase tracking-wider select-none">
          Exemplo Comentado
        </span>
      </div>

      {/* Prompt / Frase em análise */}
      {showStructuredScaffold && resolvedPrompt && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1 select-none">
            Frase / Termo em Análise:
          </span>
          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed font-serif">
            “<InlineRichText>{resolvedPrompt}</InlineRichText>”
          </p>
        </div>
      )}

      {/* Structured Analysis Steps */}
      {showStructuredScaffold && example.analysisSteps && example.analysisSteps.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block select-none">
            Raciocínio Passo a Passo:
          </span>
          <div className="space-y-2">
            {example.analysisSteps.map((step, idx) => (
              <div
                key={step.order || idx}
                className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-[11px] font-black text-white select-none">
                  {step.order || idx + 1}
                </span>
                <div className="space-y-0.5 flex-1">
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    <InlineRichText>{step.action}</InlineRichText>
                  </p>
                  {step.rationale && (
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      <InlineRichText>{step.rationale}</InlineRichText>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showStructuredScaffold && !example.analysisSteps?.length && example.analysis && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-600 select-none">
            Comentário e análise
          </span>
          <div className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800">
            <InlineRichText>{example.analysis}</InlineRichText>
          </div>
        </div>
      )}

      {/* Result / Conclusão */}
      {showStructuredScaffold && resolvedResult && (
        <div className="rounded-xl border border-teal-300 bg-teal-50/80 p-3.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-teal-900 font-black text-xs select-none">
            <CheckCircle2 className="h-4 w-4 text-teal-700" />
            <span className="uppercase tracking-wider text-[10px]">Resultado e Classificação</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-teal-950 leading-relaxed">
            <InlineRichText>{resolvedResult}</InlineRichText>
          </div>
        </div>
      )}

      {/* Decisive Point & Exam Tip */}
      {showStructuredScaffold && (example.decisivePoint || example.examTip || example.commonMistake) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {example.decisivePoint && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 text-xs text-sky-950 font-medium">
              <strong className="text-sky-900 block text-[10px] uppercase tracking-wider mb-0.5">
                Ponto Decisivo:
              </strong>
              <InlineRichText>{example.decisivePoint}</InlineRichText>
            </div>
          )}

          {example.examTip && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-950 font-medium">
              <strong className="text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">
                Dica da Banca:
              </strong>
              <InlineRichText>{example.examTip}</InlineRichText>
            </div>
          )}

          {example.commonMistake && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-xs font-medium text-rose-950">
              <strong className="mb-0.5 block text-[10px] uppercase tracking-wider text-rose-900">
                Erro comum
              </strong>
              <InlineRichText>{example.commonMistake}</InlineRichText>
            </div>
          )}
        </div>
      )}

      {/* Secondary Blocks */}
      {example.blocks && example.blocks.length > 0 && renderBlock && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {example.blocks.map((block, bIdx) => (
            <React.Fragment key={bIdx}>{renderBlock(block)}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
