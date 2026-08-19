import React from 'react';
import {
  GitFork,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

export interface DecisionBranch {
  question: string;
  ifYes: {
    label?: string;
    result: string;
    rule?: string;
  };
  ifNo: {
    label?: string;
    result: string;
    rule?: string;
  };
}

interface DecisionFlowProps {
  title?: string;
  subtitle?: string;
  branches?: DecisionBranch[];
  className?: string;
}

export const DecisionFlow: React.FC<DecisionFlowProps> = ({
  title = 'Fluxograma de Decisão Rápida',
  subtitle,
  branches = [],
  className = '',
}) => {
  if (branches.length === 0) return null;

  return (
    <div
      className={`my-4 rounded-2xl border border-sky-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 select-text ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-sky-100 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-900 text-sky-200 select-none">
          <GitFork className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-black tracking-tight text-slate-900">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {branches.map((branch, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
          >
            {/* Question / Diagnostic */}
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-800 text-xs font-black text-white select-none">
                ?
              </span>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block">
                  Pergunta Diagnóstica
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  <InlineRichText>{branch.question}</InlineRichText>
                </p>
              </div>
            </div>

            {/* Binary Outcomes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* YES Outcome */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs select-none">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{branch.ifYes.label || 'SE SIM:'}</span>
                </div>
                <p className="text-xs font-bold text-emerald-950 leading-relaxed">
                  <InlineRichText>{branch.ifYes.result}</InlineRichText>
                </p>
                {branch.ifYes.rule && (
                  <p className="text-[11px] text-emerald-800 font-medium leading-relaxed border-t border-emerald-200/60 pt-1">
                    <InlineRichText>{branch.ifYes.rule}</InlineRichText>
                  </p>
                )}
              </div>

              {/* NO Outcome */}
              <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs select-none">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span>{branch.ifNo.label || 'SE NÃO:'}</span>
                </div>
                <p className="text-xs font-bold text-rose-950 leading-relaxed">
                  <InlineRichText>{branch.ifNo.result}</InlineRichText>
                </p>
                {branch.ifNo.rule && (
                  <p className="text-[11px] text-rose-800 font-medium leading-relaxed border-t border-rose-200/60 pt-1">
                    <InlineRichText>{branch.ifNo.rule}</InlineRichText>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
