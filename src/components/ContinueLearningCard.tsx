import { BookOpen, ChevronRight, RotateCcw } from 'lucide-react';
import type { CadernoErroItem, ModuleData } from '../types/suveca';

interface ContinueLearningCardProps {
  module: ModuleData;
  pendingErrors: CadernoErroItem[];
  onContinueModule: () => void;
  onReview: () => void;
}

export function ContinueLearningCard({
  module,
  pendingErrors,
  onContinueModule,
  onReview,
}: ContinueLearningCardProps) {
  const dueCount = pendingErrors.filter((error) => {
    if (!error.nextReviewAt) return error.status === 'dia0';
    const dueAt = Date.parse(error.nextReviewAt);
    return Number.isNaN(dueAt) || dueAt <= Date.now();
  }).length;

  return (
    <section
      className="h-full flex flex-col justify-between rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-white p-5 shadow-xs sm:p-6"
      aria-labelledby="continue-title"
    >
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-teal-300/60 bg-teal-100/70 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-teal-900">
            Continue de onde parou
          </span>
          {dueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
              {dueCount} revisão pendente
            </span>
          )}
        </div>

        <div>
          <h2 id="continue-title" className="text-xl font-extrabold text-slate-950 sm:text-2xl leading-tight">
            {module.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600">
            {dueCount > 0
              ? `${dueCount} revisão${dueCount === 1 ? '' : 'ões'} do Caderno de Erros antes do próximo bloco.`
              : 'Retome sua aula de onde parou e avance no percurso curricular.'}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-teal-100/60 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onContinueModule}
          className="button-primary min-h-[42px] px-4 text-xs sm:text-sm font-bold justify-center"
        >
          <BookOpen className="h-4 w-4" /> Continuar aula <ChevronRight className="h-4 w-4" />
        </button>
        {dueCount > 0 && (
          <button
            type="button"
            onClick={onReview}
            className="button-secondary min-h-[42px] px-3 text-xs sm:text-sm font-bold justify-center"
          >
            <RotateCcw className="h-3.5 w-3.5 text-teal-700" /> Revisar ({dueCount})
          </button>
        )}
      </div>
    </section>
  );
}
