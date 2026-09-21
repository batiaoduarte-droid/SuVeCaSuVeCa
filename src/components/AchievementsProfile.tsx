import React, { useState, useMemo } from 'react';
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  FilePenLine,
  Flame,
  LockKeyhole,
  Sliders,
  Trophy,
  Crown,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import {
  type User,
  isTestUser,
  isPersonalLocalUser,
} from '../lib/firebase';
import type { CadernoErroItem } from '../types/suveca';
import { getLessonName } from '../data/lessonCatalog';
import {
  ACHIEVEMENTS,
  getActiveStudyStreak,
  type AchievementDefinition,
  type AchievementProgress,
} from '../lib/achievements';
import { calculateMasteryProgress } from '../lib/masteryLevel';
import { MasteryLevelCard } from './MasteryLevelCard';
import { MonthlyLeaderboard } from './MonthlyLeaderboard';
import { StudyPreferences } from './StudyPreferences';
import type { LeaderboardAttempt } from '../hooks/useMonthlyLeaderboard';
import { StudyBadge, StudySurface } from './study-visuals';

interface AchievementsProfileProps {
  user?: User | null;
  progress: AchievementProgress;
  isLoading?: boolean;
  onOpenModules?: () => void;
  onOpenLocalAuth?: () => void;
  attempts?: readonly LeaderboardAttempt[];
  pendingErrorCount?: number;
  masteredErrorCount?: number;
  readSectionsCount?: number;
  visitedModulesCount?: number;
  practiceCorrectCount?: number;
  notesCount?: number;
  onNavigateToTab?: (tab: string) => void;
  onOpenTour?: () => void;
  errors?: CadernoErroItem[];
}

type ProfileSubTab = 'achievements' | 'preferences';

const iconForAchievement = (achievement: AchievementDefinition) =>
  achievement.kind === 'note' ? FilePenLine : Flame;

const formatUnlockedDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Conquistada';
  return `Conquistada em ${parsed.toLocaleDateString('pt-BR')}`;
};

export const AchievementsProfile: React.FC<AchievementsProfileProps> = ({
  user,
  progress,
  isLoading = false,
  onOpenModules,
  onOpenLocalAuth,
  attempts = [],
  pendingErrorCount = 0,
  masteredErrorCount = 0,
  readSectionsCount = 0,
  visitedModulesCount = 0,
  practiceCorrectCount = 0,
  notesCount = 0,
  onNavigateToTab,
  onOpenTour,
  errors = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('achievements');

  // Top 3 Temas Críticos com mais erros
  const topErrorThemes = useMemo(() => {
    if (!errors || errors.length === 0) return [];
    const activeErrors = errors.filter((e) => e.status !== 'dominado');
    if (activeErrors.length === 0) return [];

    const counts: Record<string, { label: string; count: number; moduleRef?: string }> = {};
    for (const item of activeErrors) {
      const key = item.moduleRef || item.conteudo || 'Gramática Geral';
      const label = item.conteudo || (item.moduleRef ? getLessonName(item.moduleRef, 'full') : 'Gramática Geral');
      if (!counts[key]) {
        counts[key] = { label, count: 0, moduleRef: item.moduleRef };
      }
      counts[key].count += 1;
    }

    const totalActive = activeErrors.length;
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((theme) => ({
        ...theme,
        percent: Math.round((theme.count / totalActive) * 100),
      }));
  }, [errors]);

  const unlockedCount = ACHIEVEMENTS.filter(
    (achievement) => progress.unlocked[achievement.id]
  ).length;
  const activeStudyStreak = getActiveStudyStreak(progress);

  // Somatório de acertos de simulados
  const simuladoCorrectCount = attempts.reduce(
    (acc, a) => acc + (a.correctCount ?? a.correct ?? 0),
    0
  );

  // XP de atividade; não é projeção de mastery PBL.
  const mastery = calculateMasteryProgress({
    practiceCorrectCount,
    simuladoCorrectCount,
    flashcardCorrectCount: progress.flashcardCorrectCount,
    readSectionsCount,
    visitedModulesCount,
    notesCount: progress.unlocked.first_note ? Math.max(1, notesCount) : notesCount,
    masteredErrorsCount: masteredErrorCount,
    reviewingErrorsCount: pendingErrorCount,
    unlockedBadgesCount: unlockedCount,
    activeStudyStreak,
    bestStreak: progress.bestStreak,
  });

  return (
    <div className="tool-content-shell space-y-8 pb-16">
      {/* Header */}
      <header className="tool-page-header bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Perfil do usuário'}
              className="w-14 h-14 rounded-2xl object-cover border border-teal-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xl border border-teal-200">
              {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'S'}
            </div>
          )}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              Nível {mastery.currentLevel.level} · {mastery.currentLevel.badge}
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              {user?.displayName || 'Seu perfil de estudos'}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Acompanhe experiência de estudo e conquistas. Domínio e retenção são validados no PBL.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-2.5 text-center">
            <div className="text-xl font-black text-teal-900">
              {mastery.totalXp.toLocaleString('pt-BR')} XP
            </div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-teal-700">
              XP Total
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-center">
            <div className="text-xl font-black text-amber-900">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
              Badges
            </div>
          </div>
          {onOpenTour && (
            <button
              type="button"
              onClick={onOpenTour}
              className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-xs font-black text-teal-900 hover:bg-teal-100 transition cursor-pointer"
              title="Rever o tour guiado da plataforma"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Tour Guiado</span>
            </button>
          )}
        </div>
      </header>

      {/* Account Type Banner */}
      {isTestUser(user) && (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>Você está usando a Conta Teste (Padrão)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                  Offline
                </span>
              </div>
              <div className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                As métricas acima pertencem à conta teste. Para acompanhar seu progresso e erros individuais, acesse ou crie sua conta própria com login e senha.
              </div>
            </div>
          </div>
          {onOpenLocalAuth && (
            <button
              type="button"
              onClick={onOpenLocalAuth}
              className="button-primary min-h-[40px] text-xs font-bold shrink-0 self-end sm:self-auto cursor-pointer shadow-xs"
            >
              Entrar na Minha Conta
            </button>
          )}
        </div>
      )}

      {isPersonalLocalUser(user) && (
        <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-teal-900">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
            <div>
              <strong className="font-bold">Conta Pessoal Ativa: {user?.displayName}</strong>
              <div className="text-slate-600 text-[11px] mt-0.5">
                Seu Caderno de Erros, histórico Pomodoro e conquistas estão registrados individualmente para você.
              </div>
            </div>
          </div>
          {onOpenLocalAuth && (
            <button
              type="button"
              onClick={onOpenLocalAuth}
              className="button-secondary min-h-[34px] py-1 px-3 text-xs font-bold text-teal-800 border-teal-300 hover:bg-teal-100 cursor-pointer"
            >
              Trocar de Conta
            </button>
          )}
        </div>
      )}

      {/* Navigation Sub-Tabs inside Profile */}
      <nav aria-label="Navegação do Perfil" className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('achievements')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'achievements'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-600" />
          Experiência & Conquistas
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('preferences')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'preferences'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-teal-700" />
          Preferências de Estudo & FCM
        </button>
      </nav>

      {/* Sub-Tab 1: Achievements & Ranking */}
      {activeSubTab === 'achievements' && (
        <div className="space-y-8">
          {/* Card central de experiência e missões */}
          <MasteryLevelCard mastery={mastery} onNavigateToTab={onNavigateToTab} />

          {/* Sequências & Estatísticas Rápidas */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Progresso de conquistas">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-200">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">Sequência atual</div>
                <div className="text-xl font-black text-slate-900">
                  {progress.currentStreak} acerto{progress.currentStreak === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">Melhor sequência</div>
                <div className="text-xl font-black text-slate-900">
                  {progress.bestStreak} acerto{progress.bestStreak === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-200">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">Sequência diária</div>
                <div className="text-xl font-black text-slate-900">
                  {activeStudyStreak} dia{activeStudyStreak === 1 ? '' : 's'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Melhor: {progress.longestStudyStreak} dia{progress.longestStudyStreak === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </section>

          {/* Top 3 Temas com Mais Erros */}
          {topErrorThemes.length > 0 && (
            <section className="bg-white rounded-2xl p-6 border border-amber-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Top 3 Fragilidades Gramaticais (Caderno de Erros)
                    </h2>
                    <p className="text-xs text-slate-600">
                      Temas onde você mais cometeu falhas. Clique para revisar as questões correspondentes.
                    </p>
                  </div>
                </div>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('errors')}
                    className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Ver todo o Caderno</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3 pt-1">
                {topErrorThemes.map((theme, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onNavigateToTab?.('errors')}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition text-left space-y-2 group cursor-pointer"
                    title={`Revisar ${theme.count} erro(s) em ${theme.label}`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-extrabold text-slate-900 group-hover:text-amber-950 flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-black shrink-0">
                          {index + 1}
                        </span>
                        <span className="truncate">{theme.label}</span>
                      </span>
                      <span className="font-bold text-amber-900 shrink-0 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                        {theme.count} {theme.count === 1 ? 'erro' : 'erros'} ({theme.percent}%)
                      </span>
                    </div>

                    {/* Barra de Progresso / Incidência */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                        style={{ width: `${Math.max(8, Math.min(100, theme.percent))}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Quick Callout to Preferences */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-5 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 border border-teal-300">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Configure seus lembretes diários FCM</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Defina horários e dias de estudo para nunca perder o ritmo da sua aprovação.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('preferences')}
              className="button-primary text-xs px-4 py-2 shrink-0 cursor-pointer"
            >
              Abrir Preferências de Estudo
            </button>
          </div>

          {/* Meus Badges */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Meus badges</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isLoading ? 'Sincronizando suas conquistas...' : 'As conquistas são salvas no seu perfil.'}
                </p>
              </div>
              {onOpenModules && !progress.unlocked.first_note && (
                <button type="button" onClick={onOpenModules} className="button-secondary text-xs cursor-pointer">
                  <FilePenLine className="w-4 h-4 text-teal-700" />
                  Fazer uma anotação
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACHIEVEMENTS.map((achievement) => {
                const unlockedAt = progress.unlocked[achievement.id];
                const Icon = unlockedAt ? iconForAchievement(achievement) : LockKeyhole;

                return (
                  <article
                    key={achievement.id}
                    className={`rounded-2xl p-5 border flex items-start gap-4 ${
                      unlockedAt
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center border ${
                        unlockedAt
                          ? 'bg-white text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900">{achievement.title}</h3>
                        {unlockedAt && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{achievement.description}</p>
                      <p className={`text-xs font-semibold mt-3 ${unlockedAt ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {unlockedAt ? formatUnlockedDate(unlockedAt) : 'Ainda não desbloqueada'}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <MonthlyLeaderboard user={user} attempts={attempts} />
        </div>
      )}

      {/* Sub-Tab 2: Study Preferences Screen */}
      {activeSubTab === 'preferences' && (
        <StudyPreferences user={user} pendingErrorCount={pendingErrorCount} />
      )}
    </div>
  );
};
