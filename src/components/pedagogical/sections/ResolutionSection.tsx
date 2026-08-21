import React, { useState } from 'react';
import { PenTool, Copy, Check, Zap } from 'lucide-react';
import type { ProcedureView } from '../../../types/pedagogicalView';
import { ProcedureStepper } from '../../study-visuals/ProcedureStepper';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';
import { semanticBlocksToPlainText } from '../../../lib/semanticBlockText';

interface ResolutionSectionProps {
  procedures?: ProcedureView[];
}

export const normalizeProcedureStepAction = (action: string): string =>
  action
    .replace(/^\s*(?:(?:passo\s*)?\d+\s*[.):—-]|[•·▪◦])\s*/i, '')
    .replace(/\s*(?:-{1,2}>|=>|→)\s*/g, ' → ')
    .trim();

export const ResolutionSection: React.FC<ResolutionSectionProps> = ({ procedures = [] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!procedures || procedures.length === 0) return null;

  const handleCopy = (proc: ProcedureView, idx: number) => {
    if (proc.presentation?.hideGenericScaffold) {
      navigator.clipboard.writeText([proc.title, semanticBlocksToPlainText(proc.blocks)].filter(Boolean).join('\n\n'));
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
      return;
    }
    const steps = (proc.steps || []).map((step, stepIndex) => {
      if (typeof step === 'string') return `${stepIndex + 1}. ${normalizeProcedureStepAction(step)}`;
      return `${step.order || stepIndex + 1}. ${normalizeProcedureStepAction(step.action)}${step.explanation ? ` — ${step.explanation}` : ''}${step.test ? `\nTeste: ${step.test}` : ''}`;
    });
    const inputs = (proc.inputs || [])
      .map((input) => (typeof input === 'string' ? input : `${input.name}${input.description ? `: ${input.description}` : ''}`))
      .join('\n');
    const outputs = (proc.outputs || [])
      .map((output) => (typeof output === 'string' ? output : `${output.name}${output.description ? `: ${output.description}` : ''}`))
      .join('\n');
    const text = [
      proc.title || `Roteiro ${idx + 1}`,
      proc.objective || proc.goal,
      inputs && `Entradas:\n${inputs}`,
      ...(proc.formulas?.length ? [`Fórmulas:\n${proc.formulas.join('\n')}`] : []),
      steps.join('\n'),
      proc.stoppingCondition && `Quando concluir: ${proc.stoppingCondition}`,
      outputs && `Resultado:\n${outputs}`,
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-sky-200 bg-white p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-900 text-sky-200 shadow-2xs select-none">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Roteiros de Resolução
                </h3>
                <span className="rounded-full bg-sky-100 text-sky-900 px-2 py-0.5 text-xs font-black select-none">
                  {procedures.length} {procedures.length === 1 ? 'roteiro' : 'roteiros'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Algoritmos práticos e sequências passo a passo para resolver questões com precisão
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Steppers de Procedimentos */}
        <div className="space-y-5">
          {procedures.map((proc, pIdx) => {
            const normalizedSteps = proc.steps?.map((s, sIdx) => {
              if (typeof s === 'string') {
                return { order: sIdx + 1, action: normalizeProcedureStepAction(s) };
              }
              return { ...s, action: normalizeProcedureStepAction(s.action) };
            });
            const sourceBackedOnly = proc.presentation?.hideGenericScaffold && proc.blocks?.length;
            return (
              <div key={proc.procedureId || pIdx} className="space-y-3">
                {!sourceBackedOnly && (
                  <ProcedureStepper
                    procedure={proc}
                    title={proc.title}
                    objective={proc.objective || proc.goal}
                    steps={normalizedSteps}
                    inputs={proc.inputs}
                    outputs={proc.outputs}
                    formulas={proc.formulas}
                  />
                )}

              {/* Blocos secundários se houver */}
              {proc.blocks && proc.blocks.length > 0 && (
                <div className="rounded-xl border border-sky-200 bg-white p-4 space-y-2">
                  {sourceBackedOnly && (
                    <h4 className="border-b border-sky-100 pb-3 text-sm sm:text-base font-black text-sky-950">
                      <InlineRichText>{proc.title}</InlineRichText>
                    </h4>
                  )}
                  {proc.blocks.map((block, bIdx) => (
                    <ContentBlockRenderer key={bIdx} block={block} />
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
