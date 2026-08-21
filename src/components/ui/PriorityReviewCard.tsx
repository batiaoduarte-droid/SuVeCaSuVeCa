import React from 'react';
import { AlertTriangle, BookOpen, ChevronRight, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import type { PriorityRecommendation } from '../../lib/priorityModuleRecommender';

interface PriorityReviewCardProps {
  recommendation: PriorityRecommendation | null;
  onOpenModule: (moduleId: string) => void;
}

export const PriorityReviewCard: React.FC<PriorityReviewCardProps> = ({
  recommendation,
  onOpenModule,
}) => {
  if (!recommendation) return null;

  const { module, errorCount, reason, topRules } = recommendation;

  return (
    <section
      aria-label="Revisão Prioritária Recomendada"
      className="relative overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50/60 to-white p-6 sm:p-7 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900 shadow-2xs">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
              Revisão Prioritária Recomendada
            </span>
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                <AlertTriangle className="h-3 w-3 text-rose-600" />
                {errorCount} {errorCount === 1 ? 'erro pendente' : 'erros pendentes'}
              </span>
            )}
          </div>

          <div>
            <h3 className="m-0 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              M{module.num}: {module.title}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed max-w-2xl">
              {reason} {module.description}
            </p>
          </div>

          {topRules.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Regras para Vacinação Imediata:
              </span>
              <ul className="space-y-1 text-xs font-medium text-slate-800">
                {topRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <span className="line-clamp-2">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
          <button
            type="button"
            onClick={() => onOpenModule(module.id)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-teal-800 px-6 py-3.5 text-sm font-black text-white hover:bg-teal-900 active:scale-95 transition cursor-pointer shadow-md"
          >
            <BookOpen className="h-4 w-4" />
            <span>Estudar tema agora</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
