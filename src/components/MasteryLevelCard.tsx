import React, { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Compass,
  SearchCheck,
  Shield,
  Crosshair,
  Crown,
  ChevronRight,
  Zap,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Award,
  Flame,
  NotebookPen,
} from 'lucide-react';
import {
  MASTERY_LEVELS,
  type MasteryProgressResult,
  type MasteryLevelDefinition,
} from '../lib/masteryLevel';

interface MasteryLevelCardProps {
  mastery: MasteryProgressResult;
  onNavigateToTab?: (tab: string) => void;
}

const levelIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Compass,
  SearchCheck,
  Shield,
  Crosshair,
  Crown,
};

const DOMAIN_PRESENTATION = [
  { icon: SearchCheck, action: 'Resolver questões', tab: 'questions', tone: 'bg-teal-50 text-teal-800 border-teal-200' },
  { icon: Compass, action: 'Continuar aula', tab: 'modules', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { icon: NotebookPen, action: 'Criar anotação', tab: 'modules', tone: 'bg-sky-50 text-sky-800 border-sky-200' },
  { icon: Shield, action: 'Revisar erros', tab: 'errors', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  { icon: Award, action: 'Ver conquistas', tab: '', tone: 'bg-violet-50 text-violet-800 border-violet-200' },
] as const;

export const MasteryLevelCard: React.FC<MasteryLevelCardProps> = ({
  mastery,
  onNavigateToTab,
}) => {
  const {
    totalXp,
    currentLevel,
    nextLevel,
    progressPercentInLevel,
    xpNeededForNextLevel,
    breakdown,
    missions,
  } = mastery;

  const [showAllLevels, setShowAllLevels] = useState(false);
  const CurrentIcon = levelIconMap[currentLevel.iconName] || Trophy;
  const totalDomainXp = breakdown.reduce((total, item) => total + item.xp, 0);
  const maxDomainXp = Math.max(1, ...breakdown.map((item) => item.xp));
  const activeDomainCount = breakdown.filter((item) => item.xp > 0).length;
  const leadingDomainIndex = breakdown.reduce(
    (bestIndex, item, index, items) => item.xp > items[bestIndex].xp ? index : bestIndex,
    0
  );
  const nextDomainIndex = breakdown.reduce(
    (lowestIndex, item, index, items) => item.xp < items[lowestIndex].xp ? index : lowestIndex,
    0
  );
  const nextDomain = breakdown[nextDomainIndex];
  const nextDomainPresentation = DOMAIN_PRESENTATION[nextDomainIndex];

  return (
    <div className="space-y-6">
      {/* Card Principal de Destaque de Nível */}
      <section
        aria-label="Nível de Mestre Atual"
        className="relative overflow-hidden rounded-3xl border border-teal-200/90 bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 p-6 sm:p-8 text-white shadow-md"
      >
        {/* Glow & Pattern sutil */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-teal-950 font-black shadow-lg">
              <CurrentIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-800/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-200 border border-teal-700/80">
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                Nível {currentLevel.level} de 6 · {currentLevel.badge}
              </div>
              <h2 className="m-0 text-xl sm:text-3xl font-black tracking-tight text-white">
                {currentLevel.title}
              </h2>
              <p className="m-0 text-xs sm:text-sm text-teal-100/90 font-medium max-w-xl leading-relaxed">
                {currentLevel.description}
              </p>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md px-5 py-4 border border-white/10 shrink-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-200">
              XP Acumulado
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300">
              {totalXp.toLocaleString('pt-BR')} <span className="text-xs text-white/80">XP</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso para o Próximo Nível */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-teal-200">Progresso no Nível {currentLevel.level}</span>
              <span className="rounded-md bg-teal-800/80 px-2 py-0.5 font-bold text-amber-300">
                {progressPercentInLevel}%
              </span>
            </div>
            {nextLevel ? (
              <span className="text-teal-200/90 font-medium">
                Faltam <strong className="text-white font-bold">{xpNeededForNextLevel} XP</strong> para{' '}
                <strong className="text-amber-300 font-bold">Nível {nextLevel.level}: {nextLevel.badge}</strong>
              </span>
            ) : (
              <span className="text-amber-300 font-black">Nível Máximo Alcançado! 🎉</span>
            )}
          </div>

          <div className="h-3.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-300 transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercentInLevel}%` }}
            />
          </div>
        </div>
      </section>

      {/* Grid: Gráfico de Domínio Sintático + Missões de XP */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Distribuição de XP por pilar, legível também quando há valores zerados */}
        <section
          aria-label="Equilíbrio de Domínio Sintático"
          className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="m-0 text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Zap className="h-4.5 w-4.5 text-teal-700" />
                Equilíbrio de Domínio Sintático
              </h3>
              <p className="m-0 text-xs text-slate-500 font-medium mt-0.5">
                Compare seus pilares e descubra onde concentrar a próxima sessão.
              </p>
            </div>
            <div className="flex gap-2" aria-label="Resumo dos pilares">
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-right">
                <strong className="block text-sm font-black text-teal-950">{totalDomainXp.toLocaleString('pt-BR')} XP</strong>
                <span className="text-[9px] font-black uppercase tracking-wider text-teal-700">distribuídos</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <strong className="block text-sm font-black text-slate-900">{activeDomainCount}/5</strong>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">pilares ativos</span>
              </div>
            </div>
          </div>

          <div className="mt-4" aria-label="Distribuição proporcional do XP">
            {totalDomainXp > 0 ? (
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`XP distribuído em ${activeDomainCount} de 5 pilares`}>
                {breakdown.map((item) => item.xp > 0 && (
                  <span
                    key={item.category}
                    title={`${item.category}: ${item.xp} XP`}
                    style={{ width: `${(item.xp / totalDomainXp) * 100}%`, backgroundColor: item.fill }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-12 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-xs font-semibold text-slate-600">
                Seu mapa de domínio aparecerá assim que você concluir a primeira atividade.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2.5" role="list" aria-label="XP por pilar de aprendizagem">
            {breakdown.map((item, index) => {
              const presentation = DOMAIN_PRESENTATION[index];
              const Icon = presentation.icon;
              const relativePercent = item.xp > 0 ? Math.max(5, Math.round((item.xp / maxDomainXp) * 100)) : 0;
              const sharePercent = totalDomainXp > 0 ? Math.round((item.xp / totalDomainXp) * 100) : 0;

              return (
                <div key={item.category} role="listitem" className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${presentation.tone}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900">{item.category}</span>
                          <span className="ml-2 text-[10px] font-medium text-slate-500">
                            {item.count} {item.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {index === leadingDomainIndex && item.xp > 0 && (
                            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-black uppercase text-teal-800">
                              Principal
                            </span>
                          )}
                          <strong className="text-xs font-black text-slate-900">{item.xp} XP</strong>
                          <span className="w-8 text-right text-[10px] font-bold text-slate-500">{sharePercent}%</span>
                        </div>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`XP em ${item.category}`}
                        aria-valuemin={0}
                        aria-valuemax={maxDomainXp}
                        aria-valuenow={item.xp}
                        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${relativePercent}%`, backgroundColor: item.fill }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700">Próximo pilar recomendado</span>
              <p className="mt-0.5 text-xs font-bold text-teal-950">
                Fortaleça {nextDomain.category.toLowerCase()} · atualmente com {nextDomain.xp} XP
              </p>
            </div>
            {onNavigateToTab && nextDomainPresentation.tab && (
              <button
                type="button"
                onClick={() => onNavigateToTab(nextDomainPresentation.tab)}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2 text-xs font-black text-white transition hover:bg-teal-900"
              >
                {nextDomainPresentation.action} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        {/* Missões para Subir de Nível */}
        <section
          aria-label="Missões para Subir de Nível"
          className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="m-0 text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                Missões de XP Rápido
              </h3>
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                Acelere de Nível
              </span>
            </div>

            <div className="space-y-2.5">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition ${
                    mission.completed
                      ? 'border-emerald-200 bg-emerald-50/50 text-slate-900'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {mission.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <Flame className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`m-0 text-xs font-bold leading-tight ${
                          mission.completed ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {mission.title}
                      </p>
                      <span className="text-[10px] font-extrabold text-amber-700 mt-1 inline-block">
                        +{mission.rewardXp} XP
                      </span>
                    </div>
                  </div>

                  {!mission.completed && onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => {
                        if (mission.id.includes('questions')) onNavigateToTab('questions');
                        else if (mission.id.includes('read') || mission.id.includes('note')) onNavigateToTab('modules');
                        else if (mission.id.includes('errors')) onNavigateToTab('errors');
                      }}
                      className="shrink-0 rounded-lg bg-teal-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-900 transition cursor-pointer shadow-2xs"
                    >
                      {mission.actionText}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500 font-medium">
              Conclua missões diárias para atingir o <strong>Nível 6: Mestre Supremo</strong>.
            </span>
          </div>
        </section>
      </div>

      {/* Jornada Completa de Níveis */}
      <section
        aria-label="Escala de Mestria SuVeCA"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="m-0 text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-teal-700" />
              Escala de Mestria SuVeCA (6 Níveis)
            </h3>
            <p className="m-0 text-xs text-slate-500 font-medium mt-0.5">
              Sua trajetória de evolução do Aprendiz até o Mestre Supremo
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllLevels(!showAllLevels)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
          >
            {showAllLevels ? 'Recolher escala' : 'Ver todos os 6 níveis'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MASTERY_LEVELS.slice(0, showAllLevels ? 6 : 3).map((lvl) => {
            const isUnlocked = totalXp >= lvl.minXp;
            const isCurrent = currentLevel.level === lvl.level;
            const Icon = levelIconMap[lvl.iconName] || Trophy;

            return (
              <div
                key={lvl.level}
                className={`rounded-2xl p-4 border transition ${
                  isCurrent
                    ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-600/20'
                    : isUnlocked
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50/80 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-2xs ${
                        isCurrent
                          ? 'bg-teal-800 text-white'
                          : isUnlocked
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Nível {lvl.level}
                      </span>
                      <h4 className="m-0 text-sm font-black text-slate-900 leading-tight">
                        {lvl.badge}
                      </h4>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-2xs">
                      Atual
                    </span>
                  ) : isUnlocked ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800 border border-emerald-200">
                      Conquistado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      <Lock className="h-3 w-3" /> Bloqueado
                    </span>
                  )}
                </div>

                <p className="mt-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                  {lvl.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    {lvl.maxXp !== null ? `${lvl.minXp} – ${lvl.maxXp} XP` : `${lvl.minXp}+ XP`}
                  </span>
                  <span className="text-teal-800 font-semibold truncate max-w-[150px]" title={lvl.unlockedBenefit}>
                    {lvl.unlockedBenefit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
