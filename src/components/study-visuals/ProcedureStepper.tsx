import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  Sparkles,
  ArrowDown,
  Layers,
  Zap,
} from 'lucide-react';
import type { ProcedureView } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

export interface ProcedureStepItem {
  order: number;
  action: string;
  explanation?: string;
  test?: string;
}

interface ProcedureStepperProps {
  procedure?: ProcedureView;
  title?: string;
  objective?: string;
  steps?: ProcedureStepItem[];
  inputs?: { name: string; description: string }[];
  outputs?: { name: string; description: string }[];
  formulas?: string[];
  className?: string;
}

export const ProcedureStepper: React.FC<ProcedureStepperProps> = ({
  procedure,
  title,
  objective,
  steps,
  inputs,
  outputs,
  formulas,
  className = '',
}) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const resolvedTitle = title || procedure?.title || 'Roteiro de Resolução Passo a Passo';
  const resolvedObjective = objective || procedure?.objective;
  const resolvedSteps = steps || procedure?.steps || [];
  const resolvedInputs = inputs || procedure?.inputs || [];
  const resolvedOutputs = outputs || procedure?.outputs || [];
  const resolvedFormulas = formulas || procedure?.formulas || [];

  const toggleStep = (order: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [order]: !prev[order],
    }));
  };

  return (
    <div
      className={`my-4 rounded-2xl border border-sky-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 select-text ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-900 text-sky-200 select-none shadow-2xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">
              Roteiro de Decisão
            </span>
            <h4 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
              <InlineRichText>{resolvedTitle}</InlineRichText>
            </h4>
          </div>
        </div>
      </div>

      {resolvedObjective && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-xs text-sky-950 font-medium leading-relaxed">
          <strong>Objetivo:</strong> <InlineRichText>{resolvedObjective}</InlineRichText>
        </div>
      )}

      {/* Inputs / Entradas se houver */}
      {resolvedInputs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-600">Entradas requeridas:</span>
          {resolvedInputs.map((inp, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-medium text-slate-800"
            >
              <InlineRichText>{inp.name}</InlineRichText>
            </span>
          ))}
        </div>
      )}

      {/* Stepper Timeline */}
      <div className="space-y-3 pt-2">
        {resolvedSteps.map((step, idx) => {
          const isLast = idx === resolvedSteps.length - 1;
          const isDone = completedSteps[step.order];

          return (
            <div key={step.order || idx} className="relative flex items-start gap-3">
              {/* Connector Line */}
              {!isLast && (
                <span
                  className="absolute left-4 top-8 -bottom-3 w-0.5 bg-sky-200"
                  aria-hidden="true"
                />
              )}

              {/* Number/Check Button */}
              <button
                type="button"
                onClick={() => toggleStep(step.order)}
                className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-xs transition-all cursor-pointer select-none ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-sky-100 text-sky-900 border border-sky-300 hover:bg-sky-200'
                }`}
                title={isDone ? 'Passo concluído' : 'Marcar como concluído'}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span>{step.order || idx + 1}</span>
                )}
              </button>

              {/* Step Content */}
              <div
                className={`flex-1 rounded-xl border p-3.5 space-y-2 transition-all ${
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/40 opacity-90'
                    : 'border-slate-200 bg-white hover:border-sky-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                    <InlineRichText>{step.action}</InlineRichText>
                  </h5>
                </div>

                {step.explanation && (
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    <InlineRichText>{step.explanation}</InlineRichText>
                  </p>
                )}

                {step.test && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-950 font-medium">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-amber-900 block text-[11px] uppercase tracking-wider">
                        Teste de Verificação:
                      </strong>
                      <InlineRichText>{step.test}</InlineRichText>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Outputs / Conclusão */}
      {resolvedOutputs.length > 0 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
            Resultado Esperado
          </span>
          {resolvedOutputs.map((out, idx) => (
            <p key={idx} className="text-xs font-bold text-teal-950 leading-relaxed">
              <InlineRichText>{out.description || out.name}</InlineRichText>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
