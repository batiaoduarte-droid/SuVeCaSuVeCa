import React from 'react';
import type { PBLSession } from '../../types/pbl';
import { ArrowRight, BookOpenCheck, Calendar, NotebookPen } from 'lucide-react';

interface PBLSessionSummaryProps {
  session: PBLSession;
  competencyTitles?: Record<string, string>;
  onFinishSession: () => void;
  onOpenNotebook?: () => void;
  onOpenReview?: () => void;
}

const formatReviewDate = (value?: string) => {
  if (!value) return 'a definir';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'a definir'
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
};

export const PBLSessionSummary: React.FC<PBLSessionSummaryProps> = ({
  session,
  competencyTitles = {},
  onFinishSession,
  onOpenNotebook,
  onOpenReview,
}) => {
  const stats = session.sessionStats;
  const masteries = session.targetCompetencyRefs
    .map((id) => session.masterySnapshot[id])
    .filter(Boolean);
  const outcomes = session.competencyOutcomes || {};
  const transferConfirmedCount = Object.values(outcomes).filter(
    (outcome) => outcome === 'transfer_confirmed' || outcome === 'mastered'
  ).length;
  const retentionConfirmedCount = Object.values(outcomes).filter(
    (outcome) => outcome === 'retention_confirmed'
  ).length;
  const needsReviewCount = Object.values(outcomes).filter((outcome) => outcome === 'needs_review').length;
  const reattemptCount = session.attempts.filter((attempt) => attempt.stage === 'reattempt').length;
  const transferCount = session.attempts.filter((attempt) => attempt.stage === 'transfer').length;
  const allRetained = retentionConfirmedCount === session.targetCompetencyRefs.length && needsReviewCount === 0;
  const allTransferred = transferConfirmedCount === session.targetCompetencyRefs.length && needsReviewCount === 0;
  const allEvidenceConfirmed = transferConfirmedCount + retentionConfirmedCount === session.targetCompetencyRefs.length
    && needsReviewCount === 0;
  const elapsedMinutes = Math.max(1, Math.ceil((session.wallTimeMs || stats.totalTimeMs) / 60_000));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-700 to-indigo-900 p-8 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-100">Sessão finalizada</p>
        <h1 className="mt-1 text-xl font-bold">{allRetained ? 'Retenção confirmada' : allTransferred ? 'Transferência imediata confirmada' : allEvidenceConfirmed ? 'Evidências de aprendizagem registradas' : 'Prática concluída com próximos passos definidos'}</h1>
        <p className="mt-2 text-xs text-indigo-100">{transferConfirmedCount} com transferência imediata · {retentionConfirmedCount} com retenção confirmada · {needsReviewCount} para revisão · {elapsedMinutes} min ativos</p>

        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-indigo-500/40 pt-6 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-3 text-center"><span className="text-[10px] font-semibold uppercase text-indigo-100">Acerto inicial</span><div className="text-2xl font-black">{stats.initialAccuracy}%</div></div>
          <div className="rounded-xl bg-white/10 p-3 text-center"><span className="text-[10px] font-semibold uppercase text-indigo-100">Pós-intervenção</span><div className="text-2xl font-black text-emerald-300">{reattemptCount ? `${stats.postInterventionAccuracy}%` : '—'}</div></div>
          <div className="rounded-xl bg-white/10 p-3 text-center"><span className="text-[10px] font-semibold uppercase text-indigo-100">Transferência</span><div className="text-2xl font-black text-amber-300">{transferCount ? `${stats.transferRate}%` : '—'}</div></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Resultado por competência</h2>
        <div className="mt-4 space-y-4">
          {masteries.map((mastery) => {
            const outcome = outcomes[mastery.competencyId] || 'needs_review';
            const retained = outcome === 'retention_confirmed';
            const transferred = outcome === 'transfer_confirmed' || outcome === 'mastered';
            const reflection = session.reflectionNotes?.[mastery.competencyId];
            const reflectionEntry = session.reflectionEntries?.[mastery.competencyId];
            return (
              <div key={mastery.competencyId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <strong className="text-slate-900">{competencyTitles[mastery.competencyId] || 'Competência praticada'}</strong>
                  <span className={`rounded-full px-2.5 py-1 font-bold ${retained ? 'bg-emerald-100 text-emerald-800' : transferred ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-900'}`}>{retained ? 'Retenção confirmada' : transferred ? 'Transferência imediata' : 'Revisão recomendada'}</span>
                </div>
                {reflection && (
                  <p className="mt-3 text-xs text-slate-700">
                    <strong>{reflectionEntry?.decision === 'needs_review'
                      ? 'Decisão registrada:'
                      : reflectionEntry?.assistanceUsed
                        ? 'Orientação adotada (assistida):'
                        : 'Regra recuperada:'}</strong> {reflection}
                  </p>
                )}
                <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-600"><Calendar className="h-3.5 w-3.5" /> Próxima revisão: {formatReviewDate(mastery.nextReviewRecommendedAt)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {onOpenNotebook && <button type="button" onClick={onOpenNotebook} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-xs font-bold text-slate-800"><NotebookPen className="h-4 w-4" /> Abrir Caderno de Erros</button>}
        {onOpenReview && <button type="button" onClick={onOpenReview} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-5 text-xs font-bold text-indigo-800"><BookOpenCheck className="h-4 w-4" /> Voltar à fila de revisão</button>}
        <button type="button" onClick={onFinishSession} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-xs font-bold text-white shadow-md hover:bg-indigo-700">Voltar ao Painel PBL <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
};
