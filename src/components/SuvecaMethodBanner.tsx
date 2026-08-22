import React from 'react';
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import type { ModuleData } from '../types/suveca';

interface SuvecaMethodBannerProps {
  module: ModuleData;
  onOpenAnalyzer: () => void;
}

export const SuvecaMethodBanner: React.FC<SuvecaMethodBannerProps> = ({
  module,
  onOpenAnalyzer,
}) => {
  const suvecaMethod = module.suvecaMethod;
  if (!suvecaMethod || !['central', 'strong', 'review'].includes(suvecaMethod.level)) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 p-5 text-white shadow-sm sm:p-6"
      aria-labelledby="suveca-home-title"
    >
      {/* Subtle glowing ambient light */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-teal-400/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/40 bg-teal-400/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-teal-200">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              Mapa de Análise do Aplicativo
            </span>
            <span className="text-[11px] font-semibold text-teal-300/80">
              Método Relacional de Resolução
            </span>
          </div>

          {/* Equação Cromática Tática de Alto Contraste */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1">
            <div className="inline-flex items-center rounded-xl bg-white/10 px-3 py-1.5 font-mono text-sm sm:text-base font-black tracking-wide text-white border border-white/20 shadow-xs">
              SuVeCA
            </div>
            <span className="text-base sm:text-lg font-bold text-teal-200">=</span>

            <div className="inline-flex items-center gap-1 rounded-xl bg-sky-950/85 border border-sky-400/50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-sky-100 shadow-2xs">
              <span className="rounded-md bg-sky-400/25 px-1.5 py-0.5 font-mono font-black text-sky-300">Su</span>
              <span>jeito</span>
            </div>

            <span className="text-xs sm:text-sm font-bold text-teal-300/70">+</span>

            <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-950/85 border border-emerald-400/50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-emerald-100 shadow-2xs">
              <span className="rounded-md bg-emerald-400/25 px-1.5 py-0.5 font-mono font-black text-emerald-300">Ve</span>
              <span>rbo</span>
            </div>

            <span className="text-xs sm:text-sm font-bold text-teal-300/70">+</span>

            <div className="inline-flex items-center gap-1 rounded-xl bg-amber-950/85 border border-amber-400/50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-amber-100 shadow-2xs">
              <span className="rounded-md bg-amber-400/25 px-1.5 py-0.5 font-mono font-black text-amber-300">C</span>
              <span>omplemento</span>
            </div>

            <span className="text-xs sm:text-sm font-bold text-teal-300/70">+</span>

            <div className="inline-flex items-center gap-1 rounded-xl bg-purple-950/85 border border-purple-400/50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-purple-100 shadow-2xs">
              <span className="rounded-md bg-purple-400/25 px-1.5 py-0.5 font-mono font-black text-purple-300">A</span>
              <span>djunto</span>
            </div>

            <span className="text-xs sm:text-sm font-bold text-teal-300/70">+</span>

            <div className="inline-flex items-center gap-1 rounded-xl bg-pink-950/85 border border-pink-400/50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-pink-100 shadow-2xs">
              <span className="rounded-md bg-pink-400/25 px-1.5 py-0.5 font-mono font-black text-pink-300">Pred</span>
              <span>icativo</span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-teal-100/90 font-medium">
            {suvecaMethod.definition}
          </p>

          <div className="rounded-xl border border-teal-700/60 bg-teal-900/40 px-3.5 py-2.5 text-xs text-teal-100 leading-relaxed">
            <strong className="text-teal-200 font-bold">{suvecaMethod.label} neste tema:</strong>{' '}
            {suvecaMethod.summary}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAnalyzer}
          className="min-h-[44px] shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-teal-50 px-5 py-3 text-sm font-extrabold text-teal-950 shadow-md transition-all hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
        >
          <Wand2 className="h-4 w-4 text-teal-800" />
          <span>Aplicar no analisador</span>
          <ArrowRight className="h-4 w-4 text-teal-800" />
        </button>
      </div>
    </section>
  );
};
