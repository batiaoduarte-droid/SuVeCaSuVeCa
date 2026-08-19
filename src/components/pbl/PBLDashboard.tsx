import React, { useState, useEffect } from 'react';
import type { PBLCompetency, PBLSession, PBLCumulativeSession } from '../../types/pbl';
import { pblRepository } from '../../lib/pbl/data/PBLRepository';
import { pblEngine } from '../../lib/pbl/engine/PBLEngine';
import { PBLSessionRepository } from '../../lib/pbl/persistence/PBLSessionRepository';
import { PBLSessionView } from './PBLSessionView';
import {
  Sparkles,
  Brain,
  Target,
  Layers,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Play,
  RotateCw,
} from 'lucide-react';

interface PBLDashboardProps {
  userId?: string;
  onAddErrorToNotebook?: (conteudo: string, erroCometido: string, regraDecisiva: string, metadata?: any) => void;
  onRecordAttempt?: (attempt: any) => void;
  onCompleteSession?: () => void;
}

export const PBLDashboard: React.FC<PBLDashboardProps> = ({
  userId = 'guest',
  onAddErrorToNotebook,
  onRecordAttempt,
  onCompleteSession,
}) => {
  const [competencies, setCompetencies] = useState<PBLCompetency[]>([]);
  const [cumulativeSessions, setCumulativeSessions] = useState<PBLCumulativeSession[]>([]);
  const [userMastery, setUserMastery] = useState<Record<string, any>>({});
  const [activeSession, setActiveSession] = useState<PBLSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLesson, setSelectedLesson] = useState<string>('ALL');

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (!pblRepository.isReady()) {
        await pblRepository.init();
      }

      const comps = await pblRepository.getAllCompetencies();
      const cumSess = await pblRepository.getCumulativeSessions();
      const mastery = await PBLSessionRepository.getUserMastery(userId);

      setCompetencies(comps);
      setCumulativeSessions(cumSess);
      setUserMastery(mastery);
    } catch (err) {
      console.error('[PBLDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (mode: 'guided' | 'diagnostic' | 'cumulative', targetLesson?: string, cumSessId?: string) => {
    setLoading(true);
    try {
      const session = await pblEngine.startSession({
        userId,
        mode,
        targetLessonId: targetLesson,
        cumulativeSessionId: cumSessId,
        currentMasteryMap: userMastery,
        maxCompetencies: 3,
      });

      await PBLSessionRepository.saveSession(session);
      setActiveSession(session);
    } catch (err) {
      console.error('[PBLDashboard] Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  if (activeSession) {
    return (
      <PBLSessionView
        initialSession={activeSession}
        onExit={() => {
          setActiveSession(null);
          loadDashboardData();
        }}
        onAddErrorToNotebook={onAddErrorToNotebook}
        onRecordAttempt={onRecordAttempt}
        onCompleteSession={onCompleteSession}
      />
    );
  }

  const filteredCompetencies =
    selectedLesson === 'ALL'
      ? competencies
      : competencies.filter((c) => c.lessonId === selectedLesson);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-linear-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-100 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Aprendizagem Baseada em Problemas (PBL)
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Aprenda Português Resolvendo Problemas Reais
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-indigo-100 sm:text-sm">
            Metodologia ativa SuVeCa: enfrente o caso-âncora, declare sua hipótese e confiança, descubra armadilhas cognitivas e consolide o domínio via transferência adaptativa.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleStartSession('guided')}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-xs font-extrabold text-indigo-950 shadow-md transition-all hover:bg-amber-300 hover:scale-105"
            >
              <Play className="h-4 w-4 fill-indigo-950" /> Iniciar Sessão Recomendada
            </button>
            <button
              type="button"
              onClick={() => handleStartSession('diagnostic')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
            >
              <Brain className="h-4 w-4" /> Diagnóstico Adaptativo Rápido
            </button>
          </div>
        </div>
      </div>

      {/* 2. Cumulative Spiral Review Sessions (A14) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Sessões Espirais Cumulativas (Camada A14)
            </h2>
            <p className="text-xs text-slate-600">
              Revisão progressiva integrada que consolida temas antecedentes em espiral contínuo.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            13 Sessões Espirais
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cumulativeSessions.slice(0, 6).map((sess) => (
            <div
              key={sess.sessionId}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/30"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span>{sess.unitId}</span>
                  <span className="text-[10px] text-slate-600">Nível {sess.spiralProgressionLevel}</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-800">{sess.title}</div>
                <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{sess.sessionGoal}</p>
              </div>

              <button
                type="button"
                onClick={() => handleStartSession('cumulative', undefined, sess.sessionId)}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                Praticar Espiral <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Competency Map Explorer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Mapa de Microcompetências Instrucionais
            </h2>
            <p className="text-xs text-slate-600">
              190 competências ativas articuladas a 2.588 questões oficiais e trilhas diagnósticas.
            </p>
          </div>

          {/* Lesson Filter */}
          <select
            value={selectedLesson}
            aria-label="Filtrar competências por aula"
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">Todas as Aulas (A00 a A13)</option>
            {Array.from(new Set(competencies.map((c) => c.lessonId))).sort().map((l) => (
              <option key={l} value={l}>Aula {l}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompetencies.map((comp) => {
            const mastery = userMastery[comp.competencyId];
            const scorePct = mastery ? Math.round(mastery.score * 100) : 0;
            return (
              <div
                key={comp.competencyId}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-400 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] font-bold text-slate-600">{comp.competencyId}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {comp.lessonId}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xs font-bold text-slate-900 line-clamp-2">{comp.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{comp.description}</p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Domínio Atual:</span>
                    <span className="font-bold text-indigo-600">{scorePct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
