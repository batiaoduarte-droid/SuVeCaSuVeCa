import React, { useMemo, useState } from 'react';
import { Target, Trophy } from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';
import {
  computeWeeklyGoalProgress,
  DEFAULT_WEEKLY_GOAL,
  type WeeklyStudyGoal,
} from '../lib/learnerIntelligence';

interface WeeklyGoalCardProps {
  readSectionIdsCount: number;
  practiceAnsweredCount: number;
  userId?: string;
}

export const WeeklyGoalCard: React.FC<WeeklyGoalCardProps> = ({
  readSectionIdsCount,
  practiceAnsweredCount,
  userId,
}) => {
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyStudyGoal>(() => {
    try {
      const raw = localStorage.getItem(`suveca_weekly_goal_${userId || 'guest'}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_WEEKLY_GOAL;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const handleSetGoalPreset = (preset: WeeklyStudyGoal) => {
    setWeeklyGoal(preset);
    try {
      localStorage.setItem(`suveca_weekly_goal_${userId || 'guest'}`, JSON.stringify(preset));
    } catch {}
    setIsEditingGoal(false);
  };

  const weeklyProgress = useMemo(
    () =>
      computeWeeklyGoalProgress(
        readSectionIdsCount,
        practiceAnsweredCount,
        weeklyGoal
      ),
    [readSectionIdsCount, practiceAnsweredCount, weeklyGoal]
  );

  return (
    <section
      className="h-full flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
      aria-labelledby="weekly-goal-title"
    >
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-800 shadow-2xs">
              <Target className="h-5 w-5 text-teal-700" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-teal-800">
                Progresso Semanal
              </span>
              <h2 id="weekly-goal-title" className="text-sm font-extrabold leading-tight text-slate-900 sm:text-base">
                Meta Semanal de Estudo
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-900">
              {weeklyProgress.isGoalMet && <Trophy className="h-3.5 w-3.5 text-amber-600" />}
              {weeklyProgress.overallPercentage}%
            </span>
            <button
              type="button"
              onClick={() => setIsEditingGoal((prev) => !prev)}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer min-h-[36px] px-2 rounded-lg hover:bg-slate-50 transition"
            >
              {isEditingGoal ? 'Concluir' : 'Ajustar'}
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        {isEditingGoal && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-xs animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => handleSetGoalPreset({ targetSections: 4, targetQuestions: 10 })}
              className={`py-1.5 px-2 rounded-lg border text-center font-bold transition cursor-pointer ${
                weeklyGoal.targetSections === 4
                  ? 'bg-teal-50 border-teal-300 text-teal-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Leve (4s / 10q)
            </button>
            <button
              type="button"
              onClick={() => handleSetGoalPreset({ targetSections: 8, targetQuestions: 15 })}
              className={`py-1.5 px-2 rounded-lg border text-center font-bold transition cursor-pointer ${
                weeklyGoal.targetSections === 8
                  ? 'bg-teal-50 border-teal-300 text-teal-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Padrão (8s / 15q)
            </button>
            <button
              type="button"
              onClick={() => handleSetGoalPreset({ targetSections: 14, targetQuestions: 30 })}
              className={`py-1.5 px-2 rounded-lg border text-center font-bold transition cursor-pointer ${
                weeklyGoal.targetSections === 14
                  ? 'bg-teal-50 border-teal-300 text-teal-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Intenso (14s / 30q)
            </button>
          </div>
        )}

        {/* Progress Bars */}
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>📖 Seções Lidas</span>
              <span className="font-bold text-slate-900">
                {weeklyProgress.sectionsCompleted}/{weeklyProgress.targetSections} ({weeklyProgress.sectionsPercentage}%)
              </span>
            </div>
            <ProgressBar value={weeklyProgress.sectionsPercentage} showPercent={false} size="sm" color="teal" />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>✍️ Questões Praticadas</span>
              <span className="font-bold text-slate-900">
                {weeklyProgress.questionsCompleted}/{weeklyProgress.targetQuestions} ({weeklyProgress.questionsPercentage}%)
              </span>
            </div>
            <ProgressBar value={weeklyProgress.questionsPercentage} showPercent={false} size="sm" color="amber" />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>{weeklyProgress.daysLeftInWeek} dias restantes nesta semana</span>
        {weeklyProgress.isGoalMet ? (
          <span className="font-bold text-emerald-700">🎉 Meta semanal alcançada!</span>
        ) : (
          <span>Mantenha o ritmo diário</span>
        )}
      </div>
    </section>
  );
};
