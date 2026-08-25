import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CadernoErroItem, ChecklistItem } from '../types/suveca';
import {
  CalendarCheck,
  CheckCircle2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Brain,
  Workflow,
  RefreshCcw,
  NotebookPen,
  Globe,
  Flame,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';
import { MODULES_DATA } from '../data/modulesData';
import { PEDAGOGICAL_KNOWLEDGE_BUILD } from '../data/pedagogicalKnowledge.generated';
import { getLessonName } from '../data/lessonCatalog';
import { computeModuleDomain360 } from '../lib/learnerIntelligence';

interface StudyPlannerProps {
  errors?: CadernoErroItem[];
  readSectionIds?: string[];
  modulePractice?: Record<string, { answered: number; correct: number }>;
  onOpenModule?: (moduleId: string) => void;
}

const CHECKLIST_STORAGE_KEY = `suveca_checklist_editorial_${PEDAGOGICAL_KNOWLEDGE_BUILD.buildId}`;
const INITIAL_CHECKLIST: ChecklistItem[] = MODULES_DATA
  .filter((module) => /^mod\d+$/.test(module.id))
  .map((module) => ({
    id: `editorial-${module.id}`,
    topic: module.title,
    moduleNum: Number(module.num),
    status: 'nao_iniciado' as const,
  }));

const REVIEW_CYCLE = [
  { title: 'Compreender', action: 'Explique a regra decisiva com suas palavras.', Icon: Brain, tone: 'border-teal-200 bg-teal-50 text-teal-900' },
  { title: 'Aplicar', action: 'Execute o procedimento em uma questão real.', Icon: Workflow, tone: 'border-sky-200 bg-sky-50 text-sky-950' },
  { title: 'Recuperar', action: 'Responda novamente sem consultar o material.', Icon: RefreshCcw, tone: 'border-violet-200 bg-violet-50 text-violet-950' },
  { title: 'Corrigir e revisar', action: 'Registre a causa do erro e programe a retomada.', Icon: NotebookPen, tone: 'border-amber-200 bg-amber-50 text-amber-950' },
] as const;

const SESSION_CHECKLIST = [
  'Expliquei a regra com minhas palavras.',
  'Resolvi uma questão sem consultar o gabarito.',
  'Registrei a causa do erro, não apenas a resposta.',
  'Programei uma recuperação por flashcard ou roteiro.',
] as const;

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  errors = [],
  readSectionIds = [],
  modulePractice = {},
  onOpenModule,
}) => {
  const [activeTab, setActiveTab] = useState<'domain360' | 'checklist' | 'weeks' | 'cycle'>('domain360');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const tabListRef = useRef<HTMLDivElement>(null);
  const [tabScroll, setTabScroll] = useState({ left: false, right: true });

  const domain360Data = useMemo(
    () => computeModuleDomain360(MODULES_DATA, errors, readSectionIds, modulePractice),
    [errors, readSectionIds, modulePractice]
  );

  const updateTabScroll = useCallback(() => {
    const element = tabListRef.current;
    if (!element) return;
    setTabScroll({
      left: element.scrollLeft > 4,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
    });
  }, []);

  const scrollTabs = (direction: -1 | 1) => {
    tabListRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });
  };

  useEffect(() => {
    const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    updateTabScroll();
    window.addEventListener('resize', updateTabScroll);
    return () => window.removeEventListener('resize', updateTabScroll);
  }, [updateTabScroll]);

  const handleUpdateChecklistStatus = (
    id: string,
    status: ChecklistItem['status']
  ) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setChecklist(updated);
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(updated));
  };

  const masteredCount = checklist.filter((c) => c.status === 'dominado').length;
  const progressPct = Math.round((masteredCount / checklist.length) * 100);

  return (
    <div className="tool-content-shell space-y-8 pb-16">
      {/* Header Banner */}
      <header className="tool-page-header bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center space-x-2 bg-teal-50 text-teal-800 border border-teal-200 text-xs px-3 py-1 rounded-full font-semibold">
            <CalendarCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>Gestão Estratégica do Edital</span>
          </div>
          <div className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {masteredCount} de {checklist.length} Tópicos Dominados ({progressPct}%)
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Planejamento & Domínio 360° do Edital
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
          Monitore seu domínio real em cada módulo (Teoria + Prática + Blindagem de Erros) e acompanhe a trilha estratégica de aprovação.
        </p>

        {/* Progress Bar */}
        <ProgressBar value={progressPct} showPercent={false} size="md" ariaLabel={`${progressPct}% dos tópicos do edital dominados`} />
      </header>

      {/* Tabs */}
      <div className="tool-scroll-tabs relative flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1.5 text-xs font-medium">
        <button type="button" onClick={() => scrollTabs(-1)} disabled={!tabScroll.left} className="mr-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs disabled:opacity-30" aria-label="Ver abas anteriores"><ChevronLeft className="h-4 w-4" /></button>
        <div ref={tabListRef} onScroll={updateTabScroll} className="flex min-w-0 flex-1 items-center space-x-2 overflow-x-auto scroll-smooth" role="tablist" aria-label="Seções do planejamento">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'domain360'}
          onClick={() => setActiveTab('domain360')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'domain360'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-teal-700" />
          <span>Domínio 360° do Edital</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'checklist'}
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'checklist'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Checklist do Edital
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'weeks'}
          onClick={() => setActiveTab('weeks')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'weeks'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Trilha de 8 Semanas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cycle'}
          onClick={() => setActiveTab('cycle')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'cycle'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Ciclo de revisão
        </button>
        </div>
        <button type="button" onClick={() => scrollTabs(1)} disabled={!tabScroll.right} className="ml-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs disabled:opacity-30" aria-label="Ver próximas abas"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {activeTab === 'domain360' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-700" />
                <span>Matriz de Domínio 360° por Módulo Curricular</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Score composto ponderado: 40% Leitura Teórica + 40% Resolução de Questões + 20% Blindagem contra Erros do Caderno.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {domain360Data.map((item) => {
              let statusBadge = (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  Não Iniciado
                </span>
              );

              if (item.status === 'alerta_erros') {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-600" />
                    {item.pendingErrorsCount} {item.pendingErrorsCount === 1 ? 'erro pendente' : 'erros pendentes'}
                  </span>
                );
              } else if (item.status === 'dominado') {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Dominado
                  </span>
                );
              } else if (item.status === 'em_desenvolvimento') {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    Em Progresso
                  </span>
                );
              } else if (item.status === 'inicial') {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    Iniciado
                  </span>
                );
              }

              return (
                <div
                  key={item.moduleId}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 flex flex-col justify-between hover:border-teal-300 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {getLessonName(item.moduleNum, 'short')}
                      </span>
                      {statusBadge}
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Barra de Score Geral 360 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Índice de Domínio 360°</span>
                        <span className="font-mono font-black text-slate-900">{item.overallScore}%</span>
                      </div>
                      <ProgressBar
                        value={item.overallScore}
                        showPercent={false}
                        size="sm"
                        color={item.overallScore >= 80 ? 'emerald' : item.overallScore >= 45 ? 'amber' : 'teal'}
                      />
                    </div>

                    {/* Micro-métricas */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[10px]">
                      <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                        <div className="text-slate-400 font-bold">Teoria</div>
                        <div className="font-bold text-slate-800">{item.theoryReadCount}/{item.theoryTotalCount}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                        <div className="text-slate-400 font-bold">Prática</div>
                        <div className="font-bold text-slate-800">{item.practiceCorrectCount}/{item.practiceTotalCount}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                        <div className="text-slate-400 font-bold">Erros</div>
                        <div className="font-bold text-slate-800">{item.pendingErrorsCount > 0 ? `${item.pendingErrorsCount} pend.` : 'Zerado'}</div>
                      </div>
                    </div>
                  </div>

                  {onOpenModule && (
                    <button
                      type="button"
                      onClick={() => onOpenModule(item.moduleId)}
                      className="button-secondary w-full py-2 text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer mt-2"
                    >
                      <span>Abrir Aula na Apostila</span>
                      <ArrowRight className="w-3 h-3 text-teal-700" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-700" />
            <span>Matriz do Edital de Língua Portuguesa</span>
          </h2>

          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                  <span className="font-semibold text-slate-900 leading-snug">{item.topic}</span>
                  <span className="hidden text-[11px] leading-relaxed text-slate-500 lg:inline">{getLessonName(item.moduleNum, 'full')}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                  {[
                    { id: 'nao_iniciado', label: 'Não Iniciado', color: 'bg-slate-100 text-slate-600' },
                    { id: 'em_estudo', label: 'Em Estudo', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                    { id: 'revisar', label: 'Revisar', color: 'bg-purple-50 text-purple-800 border-purple-200' },
                    { id: 'dominado', label: 'Dominado!', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() =>
                        handleUpdateChecklistStatus(item.id, st.id as ChecklistItem['status'])
                      }
                      className={`min-h-11 text-[11px] px-2.5 py-1.5 rounded-lg transition font-medium border cursor-pointer ${
                        item.status === st.id
                          ? 'bg-teal-800 text-white border-teal-800 font-bold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'weeks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { sem: 1, mods: `${getLessonName('A00')} + ${getLessonName('A01')}`, f: 'Ortografia e Classes de Palavras I', tasks: ['Diagnóstico de ortografia', 'Acentuação, hífen e porquês', 'Classes variáveis em contexto'] },
            { sem: 2, mods: `${getLessonName('A02')} + ${getLessonName('A03')}`, f: 'Conectores e Pronomes', tasks: ['Relações das preposições e conjunções', 'Referenciação pronominal', 'Colocação pronominal em contexto'] },
            { sem: 3, mods: `${getLessonName('A04')} + ${getLessonName('A05')}`, f: 'Sistema Verbal', tasks: ['Tempos, modos e formas nominais', 'Correlação e vozes verbais', 'Transitividade e funções da partícula se'] },
            { sem: 4, mods: `${getLessonName('A06')} + ${getLessonName('A07')}`, f: 'Sintaxe da Oração e do Período', tasks: ['Reconstrução da ordem direta', 'Termos da oração', 'Coordenação e subordinação'] },
            { sem: 5, mods: `${getLessonName('A08')} + ${getLessonName('A09')}`, f: 'Pontuação e Concordância', tasks: ['Pontuação guiada pela estrutura sintática', 'Concordância verbal', 'Concordância nominal e casos especiais'] },
            { sem: 6, mods: getLessonName('A10'), f: 'Regência e Crase', tasks: ['Regência por acepção e estrutura', 'Procedimento decisório da crase', 'Questões cumulativas do tema'] },
            { sem: 7, mods: 'Coesão, semântica e interpretação', f: 'Texto, Sentido e Interpretação', tasks: ['Coesão, coerência e reescrita', 'Relações semânticas e figuras', 'Recorrência, inferência e tipologia'] },
            { sem: 8, mods: `${getLessonName('A14')} + Simulado`, f: 'Revisão Cumulativa', tasks: ['Revisão ativa pelos temas prioritários', 'Simulado editorial de 20 questões', 'Revisão do Caderno de Erros'] },
          ].map((w) => (
            <div
              key={w.sem}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Semana {w.sem}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">{w.mods}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">{w.f}</h3>

              <ul className="space-y-1.5 text-xs text-slate-600">
                {w.tasks.map((t, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'cycle' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Percurso completo de Língua Portuguesa
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Como transformar estudo em domínio recuperável
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Use a apostila como percurso principal e combine cada tema com suas expansões didáticas, roteiros de decisão, questões editoriais, flashcards e registros do Caderno de Erros.
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <section aria-labelledby="learning-cycle-title">
              <h3 id="learning-cycle-title" className="mb-3 font-bold text-teal-950 text-sm">Ciclo de aprendizagem e revisão</h3>
              <ol className="relative grid list-none gap-3 p-0 md:grid-cols-4">
                {REVIEW_CYCLE.map(({ title, action, Icon, tone }, index) => (
                  <li key={title} className={`relative rounded-2xl border p-4 ${tone}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-xs font-black shadow-2xs">{index + 1}</span>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <h4 className="font-extrabold">{title}</h4>
                    </div>
                    <p className="mt-3 text-xs font-medium leading-relaxed">{action}</p>
                    {index < REVIEW_CYCLE.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white text-slate-500 md:block" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-labelledby="session-checklist-title">
              <h3 id="session-checklist-title" className="font-bold text-emerald-950 text-sm">Checklist para encerrar uma sessão</h3>
              <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
                {SESSION_CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 font-medium text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
