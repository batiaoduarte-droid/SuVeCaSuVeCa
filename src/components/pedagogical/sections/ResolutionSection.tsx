import React, { useState } from 'react';
import { PenTool, Copy, Check, Zap } from 'lucide-react';
import type { ProcedureView } from '../../../types/pedagogicalView';
import { ProcedureStepper } from '../../study-visuals/ProcedureStepper';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface ResolutionSectionProps {
  procedures?: ProcedureView[];
}

export const ResolutionSection: React.FC<ResolutionSectionProps> = ({ procedures = [] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!procedures || procedures.length === 0) return null;

  const handleCopy = (proc: ProcedureView, idx: number) => {
    const text = `${proc.title || `Roteiro ${idx + 1}`}\n${proc.objective || ''}\n${(proc.steps || []).map((s) => `${s.order}. ${s.action} - ${s.explanation || ''}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-sky-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
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
                return { order: sIdx + 1, action: s };
              }
              return s;
            });
            return (
              <div key={proc.procedureId || pIdx} className="space-y-3">
                <ProcedureStepper
                  procedure={proc}
                  title={proc.title}
                  objective={proc.objective}
                  steps={normalizedSteps}
                  inputs={proc.inputs}
                  outputs={proc.outputs}
                  formulas={proc.formulas}
                />

              {/* Blocos secundários se houver */}
              {proc.blocks && proc.blocks.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
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
