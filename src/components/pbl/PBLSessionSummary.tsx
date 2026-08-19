import React from 'react';
import type { PBLSession } from '../../types/pbl';
import { Award, CheckCircle2, TrendingUp, RefreshCw, ArrowRight, Brain, Calendar } from 'lucide-react';

interface PBLSessionSummaryProps {
  session: PBLSession;
  onFinishSession: () => void;
}

export const PBLSessionSummary: React.FC<PBLSessionSummaryProps> = ({
  session,
  onFinishSession,
}) => {
  const stats = session.sessionStats;
  const masteries = Object.values(session.masterySnapshot);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-600 to-indigo-800 p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
            <Award className="h-7 w-7 text-amber-300" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">
              Sessão Concluída com Êxito
            </span>
            <h1 className="text-xl font-bold">Relatório de Aprendizagem por Problemas</h1>
          </div>
        </div>

        {/* Main Metric Cards */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-indigo-500/40 pt-6">
          <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
            <span className="text-[10px] font-semibold uppercase text-indigo-100">Acerto Inicial</span>
            <div className="text-2xl font-black">{stats.initialAccuracy}%</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
            <span className="text-[10px] font-semibold uppercase text-indigo-100">Pós-Intervenção</span>
            <div className="text-2xl font-black text-emerald-300">{stats.postInterventionAccuracy || 100}%</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
            <span className="text-[10px] font-semibold uppercase text-indigo-100">Transferência</span>
            <div className="text-2xl font-black text-amber-300">{stats.transferRate}%</div>
          </div>
        </div>
      </div>

      {/* Competency Mastery Progression */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Evolução de Domínio por Competência
        </h3>

        <div className="mt-4 space-y-4">
          {masteries.map((m) => {
            const pct = Math.round(m.score * 100);
            return (
              <div key={m.competencyId} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{m.competencyId}</span>
                  <span className="font-bold text-indigo-600">{pct}% ({m.level.toUpperCase()})</span>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
                  <span>Tentativas: {m.totalAttempts} (Corretas: {m.correctAttempts})</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Próxima revisão recomendada em breve
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onFinishSession}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
        >
          Voltar ao Painel PBL <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
