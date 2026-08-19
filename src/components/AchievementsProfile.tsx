import React, { useState } from 'react';
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
} from 'lucide-react';
import type { User } from '../lib/firebase';
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
  attempts?: readonly LeaderboardAttempt[];
  pendingErrorCount?: number;
  masteredErrorCount?: number;
  readSectionsCount?: number;
  visitedModulesCount?: number;
  practiceCorrectCount?: number;
  notesCount?: number;
  onNavigateToTab?: (tab: string) => void;
  onOpenTour?: () => void;
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
  attempts = [],
  pendingErrorCount = 0,
  masteredErrorCount = 0,
  readSectionsCount = 0,
  visitedModulesCount = 0,
  practiceCorrectCount = 0,
  notesCount = 0,
  onNavigateToTab,
  onOpenTour,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('achievements');

  const unlockedCount = ACHIEVEMENTS.filter(
    (achievement) => progress.unlocked[achievement.id]
  ).length;
  const activeStudyStreak = getActiveStudyStreak(progress);

  // Somatório de acertos de simulados
  const simuladoCorrectCount = attempts.reduce(
    (acc, a) => acc + (a.correctCount ?? a.correct ?? 0),
    0
  );

  // Cálculo de XP de Nível de Mestre
  const mastery = calculateMasteryProgress({
    practiceCorrectCount,
    simuladoCorrectCount,
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
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <header className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between">
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
              Acompanhe seu Nível de Mestre, conquistas e equilíbrio de domínio sintático.
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
          Nível de Mestre & Conquistas
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
          {/* Card Central de Nível de Mestre com Recharts e Missões */}
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
