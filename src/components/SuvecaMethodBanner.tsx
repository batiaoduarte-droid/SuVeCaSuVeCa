import React from 'react';
import { ArrowRight, ChevronDown, Wand2, Workflow } from 'lucide-react';
import type { ModuleData } from '../types/suveca';

interface SuvecaMethodBannerProps {
  module: ModuleData;
  onOpenAnalyzer?: () => void;
}

export const SuvecaMethodBanner: React.FC<SuvecaMethodBannerProps> = ({
  module,
  onOpenAnalyzer,
}) => {
  const suvecaMethod = module.suvecaMethod;
  if (!suvecaMethod || !['central', 'strong', 'review'].includes(suvecaMethod.level)) {
    return null;
  }

  const titleId = `suveca-lesson-${module.id}`;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-sky-50/50"
      aria-labelledby={titleId}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900 text-amber-300 shadow-sm">
            <Workflow className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-teal-200 bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-teal-800">
              {suvecaMethod.label}
            </span>
            <h2 id={titleId} className="mt-1.5 text-base font-extrabold text-teal-950 sm:text-lg">
              SuVeCA nesta aula
            </h2>
            <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-700">
              {suvecaMethod.summary}
            </p>
          </div>
        </div>

        {onOpenAnalyzer && (
          <button
            type="button"
            onClick={onOpenAnalyzer}
            className="button-primary min-h-[44px] shrink-0 px-4 text-sm font-extrabold"
          >
            <Wand2 className="h-4 w-4" />
            Aplicar no analisador
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <details
        key={module.id}
        open={module.id === 'mod-intro'}
        className="group border-t border-teal-100 bg-white/60"
      >
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-teal-900 marker:hidden sm:px-5">
          <span>Como funciona o mapa SuVeCA</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-3 border-t border-teal-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700 sm:gap-2">
            <span className="rounded-lg border border-slate-300 bg-slate-800 px-2.5 py-1.5 font-black text-white">SuVeCA</span>
            <span aria-hidden="true">=</span>
            <span className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-sky-900"><strong>Su</strong>jeito</span>
            <span aria-hidden="true">+</span>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-900"><strong>Ve</strong>rbo</span>
            <span aria-hidden="true">+</span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-amber-950"><strong>C</strong>omplemento</span>
            <span aria-hidden="true">+</span>
            <span className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-violet-950"><strong>A</strong>djunto</span>
            <span aria-hidden="true">+</span>
            <span className="rounded-lg border border-pink-200 bg-pink-50 px-2 py-1 text-pink-950"><strong>Pred</strong>icativo</span>
          </div>
          <p className="max-w-4xl text-sm leading-relaxed text-slate-700">
            {suvecaMethod.definition}
          </p>
          <p className="max-w-4xl rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2 text-xs leading-relaxed text-violet-950">
            <strong>Limite do método:</strong> {suvecaMethod.authorityNote}
          </p>
        </div>
      </details>
    </section>
  );
};
