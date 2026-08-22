import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Target,
  TrendingUp,
  Brain,
  ShieldAlert,
  Compass,
  AlertTriangle,
  Flame,
  Zap,
  Sparkles,
} from 'lucide-react';
import type { CadernoErroItem } from '../types/suveca';
import { ProgressBar } from './ui/ProgressBar';
import { MODULES_DATA } from '../data/modulesData';
import { getPriorityModuleRecommendation } from '../lib/priorityModuleRecommender';
import { PriorityReviewCard } from './ui/PriorityReviewCard';
import {
  computeMetacognitiveMatrix,
  computeExamBoardStats,
} from '../lib/learnerIntelligence';

export interface LearningAttempt {
  id: string;
  completedAt?: string;
  createdAt?: string;
  correct?: number;
  total?: number;
  /** Campos usados pelo SimuladoEngine atual. */
  correctCount?: number;
  totalQuestions?: number;
  percentage?: number;
  byTopic?: unknown;
  answerMap?: Record<string, string>;
  questionSetVersion?: string;
}

interface StatisticsDashboardProps {
  attempts: LearningAttempt[];
  errors: CadernoErroItem[];
  visitedModules: number;
  totalModules: number;
  readSections?: number;
  totalSections?: number;
  practiceAnswered?: number;
  practiceCorrect?: number;
  userName?: string | null;
  onOpenSimulado?: () => void;
  onOpenModule?: (moduleId: string) => void;
}

type TopicSummary = {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
};

const TOPIC_COLORS = ['#0f766e', '#0e7490', '#7c3aed', '#b45309', '#be185d', '#15803d', '#2563eb', '#64748b'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown): number => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeTopics = (byTopic: unknown): Array<{ topic: string; correct: number; total: number }> => {
  if (Array.isArray(byTopic)) {
    return byTopic.flatMap((item) => {
      if (!isRecord(item)) return [];
      const topic = typeof item.topic === 'string' ? item.topic : 'Sem tópico';
      const total = toNumber(item.total);
      const correct = toNumber(item.correct);
      return total > 0 ? [{ topic, total, correct }] : [];
    });
  }

  if (!isRecord(byTopic)) return [];

  return Object.entries(byTopic).flatMap(([topic, value]) => {
    if (isRecord(value)) {
      const total = toNumber(value.total);
      const correct = toNumber(value.correct);
      return total > 0 ? [{ topic, total, correct }] : [];
    }

    // Aceita também um mapa simples tópico -> percentual, para dados legados.
    const accuracy = toNumber(value);
    return accuracy > 0 ? [{ topic, total: 1, correct: accuracy / 100 }] : [];
  });
};

const percent = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

const getAttemptTotal = (attempt: LearningAttempt) =>
  toNumber(attempt.total ?? attempt.totalQuestions);

const getAttemptCorrect = (attempt: LearningAttempt) =>
  toNumber(attempt.correct ?? attempt.correctCount);

const displayDate = (date?: string) => {
  if (!date) return 'Simulado';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Simulado'
    : parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  attempts,
  errors,
  visitedModules,
  totalModules,
  readSections = 0,
  totalSections = 0,
  practiceAnswered = 0,
  practiceCorrect = 0,
  userName,
  onOpenSimulado,
  onOpenModule,
}) => {
  const topicData = useMemo<TopicSummary[]>(() => {
    const totals = new Map<string, { correct: number; total: number }>();

    attempts.forEach((attempt) => {
      normalizeTopics(attempt.byTopic).forEach((result) => {
        const current = totals.get(result.topic) ?? { correct: 0, total: 0 };
        totals.set(result.topic, {
          correct: current.correct + result.correct,
          total: current.total + result.total,
        });
      });
    });

    return [...totals.entries()]
      .map(([topic, result]) => ({
        topic,
        correct: result.correct,
        total: result.total,
        accuracy: percent(result.correct, result.total),
      }))
      .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);
  }, [attempts]);

  const attemptHistory = useMemo(
    () =>
      [...attempts]
        .sort(
          (first, second) =>
            new Date(first.completedAt || first.createdAt || 0).getTime() -
            new Date(second.completedAt || second.createdAt || 0).getTime()
        )
        .slice(-8)
        .map((attempt, index) => {
        const total = getAttemptTotal(attempt);
        const accuracy = attempt.percentage ?? percent(getAttemptCorrect(attempt), total);
        return {
          label: displayDate(attempt.completedAt || attempt.createdAt) || `#${index + 1}`,
          accuracy,
        };
        }),
    [attempts]
  );

  const allAnswered = attempts.reduce((sum, attempt) => sum + getAttemptTotal(attempt), 0);
  const allCorrect = attempts.reduce((sum, attempt) => sum + getAttemptCorrect(attempt), 0);
  const overallAccuracy = percent(allCorrect, allAnswered);
  const masteredErrors = errors.filter((error) => error.status === 'dominado').length;
  const reviewedErrors = errors.filter((error) => Boolean(error.lastReviewedAt)).length;

  const methodData = useMemo(
    () => [
      {
        stage: 'Compreender',
        progress: percent(readSections, Math.max(totalSections, 1)),
        detail: `${readSections}/${totalSections} seções estudadas · ${visitedModules}/${totalModules} aulas abertas`,
      },
      {
        stage: 'Aplicar',
        progress: Math.min(100, percent(allAnswered + practiceAnswered, 40)),
        detail: `${allAnswered + practiceAnswered} questões · ${practiceCorrect} acertos nas aulas`,
      },
      {
        stage: 'Registrar',
        progress: Math.min(100, errors.length * 20),
        detail: errors.length ? `${errors.length}/5 regras registradas para formar um ciclo` : 'Registre seu primeiro erro real',
      },
      {
        stage: 'Revisar',
        progress: percent(reviewedErrors, Math.max(errors.length, 1)),
        detail: errors.length ? `${reviewedErrors}/${errors.length} regras revisadas` : 'Sem revisões ainda',
      },
      {
        stage: 'Dominar',
        progress: percent(masteredErrors, Math.max(errors.length, 1)),
        detail: errors.length ? `${masteredErrors}/${errors.length} regras dominadas` : 'Sem regras dominadas',
      },
    ],
    [allAnswered, errors.length, masteredErrors, practiceAnswered, practiceCorrect, readSections, reviewedErrors, totalModules, totalSections, visitedModules]
  );

  const needsPractice = attempts.length === 0;
  const greetingName = userName?.split(' ')[0] || 'você';

  const priorityRecommendation = useMemo(
    () => getPriorityModuleRecommendation(errors, MODULES_DATA),
    [errors]
  );

  const metacognitiveSummary = useMemo(
    () => computeMetacognitiveMatrix(allAnswered + practiceAnswered, allCorrect + practiceCorrect, errors),
    [allAnswered, allCorrect, errors, practiceAnswered, practiceCorrect]
  );

  const examBoardStats = useMemo(
    () => computeExamBoardStats(errors, allAnswered + practiceAnswered, allCorrect + practiceCorrect),
    [allAnswered, allCorrect, errors, practiceAnswered, practiceCorrect]
  );

  return (
    <div className="space-y-6 pb-16 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              <BarChart3 className="h-3.5 w-3.5" /> Painel de evolução
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Estatísticas de {greetingName}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              Acompanhe o ciclo SuVeCA e identifique os tópicos que merecem a próxima revisão ativa.
            </p>
          </div>
          {onOpenSimulado && (
            <button type="button" onClick={onOpenSimulado} className="button-primary shrink-0 text-sm">
              <ClipboardCheck className="h-4 w-4" /> Resolver simulado
            </button>
          )}
        </div>
      </header>

      {onOpenModule && priorityRecommendation && (
        <PriorityReviewCard
          recommendation={priorityRecommendation}
          onOpenModule={onOpenModule}
        />
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Taxa geral de acertos"
          value={allAnswered ? `${overallAccuracy}%` : '—'}
          hint={allAnswered ? `${allCorrect} de ${allAnswered} questões` : 'Faça um simulado para medir'}
          icon={Target}
          color="teal"
        />
        <MetricCard
          label="Simulados concluídos"
          value={String(attempts.length)}
          hint={attempts.length ? 'Histórico salvo automaticamente' : 'Seu primeiro resultado aparecerá aqui'}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          label="Regras revisadas"
          value={`${reviewedErrors}/${errors.length}`}
          hint={errors.length ? 'Ciclo Dia 1, 7, 30 ou dominado' : 'Adicione regras ao Caderno'}
          icon={BookOpenCheck}
          color="amber"
        />
        <MetricCard
          label="Regras dominadas"
          value={String(masteredErrors)}
          hint={errors.length ? `${percent(masteredErrors, errors.length)}% do Caderno` : 'Seu domínio aparece aqui'}
          icon={CheckCircle2}
          color="emerald"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-2 sm:p-6">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">Ciclo de aprendizagem SuVeCA</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Indicadores calculados a partir das aulas exploradas, simulados e revisões do Caderno.
            </p>
          </div>
          <div className="space-y-4">
            {methodData.map((item) => (
              <div key={item.stage}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-800">{item.stage}</span>
                  <span className="font-semibold text-teal-800">{item.progress}%</span>
                </div>
                <ProgressBar value={item.progress} showPercent={false} size="sm" ariaLabel={`${item.stage}: ${item.progress}%`} />
                <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-3 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-900">Evolução nos simulados</h2>
              <p className="mt-1 text-xs text-slate-500">Taxa de acertos por tentativa concluída.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              Meta: 80%
            </span>
          </div>
          {needsPractice ? (
            <EmptyChart onAction={onOpenSimulado} />
          ) : (
            <div className="h-[250px]" role="img" aria-label="Gráfico de evolução dos simulados; os valores também estão disponíveis na tabela logo após o gráfico">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attemptHistory} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    formatter={(value) => [`${toNumber(value)}%`, 'Acertos']}
                    contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1', fontSize: 12 }}
                  />
                  <ReferenceLine y={80} stroke="#b7791f" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="accuracy" stroke="#0f766e" strokeWidth={3} dot={{ r: 4, fill: '#0f766e' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {!needsPractice && <table className="sr-only"><caption>Evolução dos simulados</caption><thead><tr><th>Tentativa</th><th>Taxa de acertos</th></tr></thead><tbody>{attemptHistory.map((attempt) => <tr key={`${attempt.label}-${attempt.accuracy}`}><td>{attempt.label}</td><td>{attempt.accuracy}%</td></tr>)}</tbody></table>}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-bold text-slate-900">Acertos por tópico</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              A taxa consolida as respostas dos seus simulados e destaca onde revisar primeiro.
            </p>
          </div>
          {!needsPractice && (
            <span className="text-xs font-semibold text-slate-500">{allAnswered} questões registradas</span>
          )}
        </div>
        <div className="h-[330px]" role="img" aria-label="Gráfico de taxa de acertos por tópico; os valores também estão disponíveis na tabela logo após o gráfico">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicData} layout="vertical" margin={{ top: 4, right: 28, left: 26, bottom: 4 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="topic" width={135} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                formatter={(value, _name, item) => {
                  const details = item.payload as TopicSummary;
                  return [`${toNumber(value)}% (${details.correct}/${details.total || 0})`, 'Taxa de acertos'];
                }}
                contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1', fontSize: 12 }}
              />
              <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {topicData.map((topic, index) => (
                  <Cell key={topic.topic} fill={topic.total ? TOPIC_COLORS[index % TOPIC_COLORS.length] : '#cbd5e1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only"><caption>Taxa de acertos por tópico</caption><thead><tr><th>Tópico</th><th>Acertos</th><th>Total</th><th>Taxa</th></tr></thead><tbody>{topicData.map((topic) => <tr key={topic.topic}><td>{topic.topic}</td><td>{topic.correct}</td><td>{topic.total}</td><td>{topic.accuracy}%</td></tr>)}</tbody></table>
        {needsPractice && (
          <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Ainda não há respostas registradas. As barras serão preenchidas após o primeiro simulado concluído.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* SEÇÃO 1: MATRIZ 2×2 METACOGNITIVA (Confiança × Acurácia)               */}
      {/* ---------------------------------------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md">
              <Brain className="w-3.5 h-3.5 text-teal-700" />
              <span>Diagnóstico Metacognitivo Single-User</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Matriz 2×2: Calibração de Confiança vs Acurácia
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Mede a precisão da sua autoavaliação. Identificar onde você erra achando que acertou (Ilusão de Competência) é a chave para não perder pontos no modelo Cebraspe.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Calibração</span>
              <span className="text-base font-black text-emerald-950">{metacognitiveSummary.calibrationScore}%</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">Taxa de Ilusão</span>
              <span className="text-base font-black text-rose-950">{metacognitiveSummary.illusionRate}%</span>
            </div>
          </div>
        </div>

        {/* Grade 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Q1: Domínio Confiante */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Q1 · Domínio Confiante
              </span>
              <span className="text-xs font-extrabold text-emerald-900">
                {metacognitiveSummary.quadrants.q1_mastery.percentage}% ({metacognitiveSummary.quadrants.q1_mastery.count} itens)
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Alta Certeza + Acerto Real</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {metacognitiveSummary.quadrants.q1_mastery.pedagogicalAdvice}
            </p>
          </div>

          {/* Q2: Acerto Frágil */}
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                Q2 · Acerto Frágil / Chute
              </span>
              <span className="text-xs font-extrabold text-amber-900">
                {metacognitiveSummary.quadrants.q2_fragile.percentage}% ({metacognitiveSummary.quadrants.q2_fragile.count} itens)
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Baixa Certeza + Acerto Real</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {metacognitiveSummary.quadrants.q2_fragile.pedagogicalAdvice}
            </p>
          </div>

          {/* Q3: Dúvida Consciente */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md">
                Q3 · Dúvida Consciente
              </span>
              <span className="text-xs font-extrabold text-blue-900">
                {metacognitiveSummary.quadrants.q3_conscious_doubt.percentage}% ({metacognitiveSummary.quadrants.q3_conscious_doubt.count} itens)
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Baixa Certeza + Erro</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {metacognitiveSummary.quadrants.q3_conscious_doubt.pedagogicalAdvice}
            </p>
          </div>

          {/* Q4: Ilusão de Competência */}
          <div className="rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-50/80 to-white p-4 sm:p-5 space-y-2 ring-1 ring-rose-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-900 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-700" />
                Q4 · Ilusão de Competência
              </span>
              <span className="text-xs font-extrabold text-rose-900">
                {metacognitiveSummary.quadrants.q4_illusion.percentage}% ({metacognitiveSummary.quadrants.q4_illusion.count} itens)
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Alta Certeza + Erro (Armadilha)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {metacognitiveSummary.quadrants.q4_illusion.pedagogicalAdvice}
            </p>
          </div>
        </div>

        {/* Diagnóstico Geral */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-xs text-teal-950 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-teal-900 mb-0.5">Recomendação Estratégica:</strong>
            <p className="leading-relaxed">{metacognitiveSummary.diagnosticMessage}</p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* SEÇÃO 2: RADAR DE BANCAS & ARMADILHAS FREQUENTES                       */}
      {/* ---------------------------------------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-6">
        <div className="space-y-1 border-b border-slate-100 pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Radar de Vulnerabilidade por Banca</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Desempenho por Banca & Top Armadilhas
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Descubra em qual banca examinadora seu rendimento é mais vulnerável e quais armadilhas gramaticais costumam induzir ao erro.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Desempenho por Banca */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Taxa de Acurácia por Banca Examinadora
            </h3>
            <div className="space-y-3">
              {examBoardStats.boards.map((b) => (
                <div key={b.board} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{b.board}</span>
                      {b.errorCount > 0 && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                          {b.errorCount} {b.errorCount === 1 ? 'erro' : 'erros'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-teal-800">{b.accuracy}%</span>
                  </div>
                  <ProgressBar value={b.accuracy} showPercent={false} size="sm" color={b.accuracy >= 75 ? 'emerald' : b.accuracy >= 50 ? 'amber' : 'teal'} />
                </div>
              ))}
            </div>
          </div>

          {/* Top Armadilhas de Prova */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Top 3 Armadilhas Mapeadas no Seu Histórico
            </h3>
            <div className="space-y-3">
              {examBoardStats.topOverallTraps.map((trap, idx) => (
                <div key={trap.rule} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-600 fill-amber-400" />
                      #{idx + 1} {trap.rule}
                    </span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      {trap.bank}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    <strong>Vacina SuVeCA:</strong> {trap.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  color: 'teal' | 'blue' | 'amber' | 'emerald';
}> = ({ label, value, hint, icon: Icon, color }) => {
  const colors = {
    teal: 'border-teal-100 bg-teal-50 text-teal-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${colors[color]}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{hint}</p>
    </article>
  );
};

const EmptyChart: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
  <div className="flex h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center">
    <TrendingUp className="h-8 w-8 text-slate-400" />
    <p className="mt-3 text-sm font-bold text-slate-700">Seu primeiro resultado começa aqui</p>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
      Conclua um simulado para acompanhar a sua evolução em cada tentativa.
    </p>
    {onAction && (
      <button type="button" onClick={onAction} className="button-secondary mt-4 text-xs">
        Ir para o simulado
      </button>
    )}
  </div>
);
