import React from 'react';
import type { InterventionPayload } from '../../types/pbl';
import { BookOpen, CheckSquare, Layers, ArrowRight, Sparkles, Scale } from 'lucide-react';

interface PBLInterventionViewProps {
  intervention: InterventionPayload;
  onReattempt: () => void;
}

export const PBLInterventionView: React.FC<PBLInterventionViewProps> = ({
  intervention,
  onReattempt,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Micro-Lesson Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Microaula de Intervenção Pedagógica
        </div>
        <h2 className="mt-2 text-base font-bold text-slate-900">
          {intervention.ruleTitle || 'Regra Decisiva SuVeCa'}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-700">
          {intervention.microLessonText}
        </p>
      </div>

      {/* 2. Decisive Procedure Steps */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <CheckSquare className="h-4 w-4 text-indigo-600" />
          Procedimento Determinístico de Resolução
        </div>
        <div className="mt-4 space-y-3">
          {intervention.procedureSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-800">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {idx + 1}
              </span>
              <span className="mt-0.5 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Contrast Board (Pole A vs Pole B) */}
      {(intervention.contrastingPoleA || intervention.contrastingPoleB) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Scale className="h-4 w-4 text-amber-600" />
            Contraste Cognitivo: O Certo vs O Atrator
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
              <div className="font-bold text-emerald-900">✓ Forma Padrão / Aplicação Correta</div>
              <p className="mt-2 text-emerald-800">{intervention.contrastingPoleA}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs">
              <div className="font-bold text-rose-900">✗ Atrator / Erro Típico de Prova</div>
              <p className="mt-2 text-rose-800">{intervention.contrastingPoleB}</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onReattempt}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700"
        >
          Aplicar o Procedimento e Tentar Novamente <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
