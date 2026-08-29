import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ChevronRight,
  GitMerge,
  ListChecks,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
} from 'lucide-react';
import { MarkdownContent } from './ui/MarkdownContent';
import { StructuredDiagram } from './study-visuals/StructuredDiagram';
import { StudyBadge, StudySurface } from './study-visuals';
import { getLessonName, getLessonSearchLabel } from '../data/lessonCatalog';
import type { DiagramStructure } from '../types/pedagogicalView';

interface DecisionProcedure {
  id: string;
  unitId: string;
  lessonId: string;
  groupId: string;
  moduleId: string;
  topic: string;
  canonicalTopicId: string;
  title: string;
  markdown: string;
  sourceText?: string;
  structure?: DiagramStructure;
  sourceRefs: string[];
}

interface DecisionProcedurePayload {
  schemaVersion: string;
  buildId: string;
  count: number;
  procedures: DecisionProcedure[];
}

const DECISION_PROCEDURES_URL = '/knowledge/pedagogical/decision-procedures.json';

const normalizeForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const isDiagramStructure = (value: unknown): value is DiagramStructure => {
  if (!value || typeof value !== 'object') return false;
  const structure = value as Record<string, unknown>;
  const nodes = Array.isArray(structure.nodes) ? structure.nodes : [];
  const edges = Array.isArray(structure.edges) ? structure.edges : [];
  const visualTypes = new Set(['sequence', 'decision_flow', 'branches', 'comparison', 'taxonomy', 'relations']);
  const schemaVersions = new Set(['2.0.0', '2.1.0']);
  const nodeIds = new Set(
    nodes
      .filter((node): node is Record<string, unknown> => Boolean(node) && typeof node === 'object')
      .map((node) => node.id)
      .filter((id): id is string => typeof id === 'string' && Boolean(id.trim())),
  );

  const groups = Array.isArray(structure.groups) ? structure.groups : [];
  const groupIds = new Set(groups
    .filter((group): group is Record<string, unknown> => Boolean(group) && typeof group === 'object')
    .map((group) => group.id)
    .filter((id): id is string => typeof id === 'string' && Boolean(id.trim())));
  const nodesHaveValidGroups = nodes.every((node) => {
    if (!node || typeof node !== 'object') return false;
    const groupId = (node as Record<string, unknown>).groupId;
    return groupId === undefined || (typeof groupId === 'string' && groupIds.has(groupId));
  });

  return typeof structure.schemaVersion === 'string'
    && schemaVersions.has(structure.schemaVersion)
    && typeof structure.visualType === 'string'
    && visualTypes.has(structure.visualType)
    && typeof structure.rootId === 'string'
    && nodeIds.has(structure.rootId)
    && nodes.length > 1
    && nodesHaveValidGroups
    && (structure.schemaVersion !== '2.1.0' || (typeof structure.structuredText === 'string' && Boolean(structure.structuredText.trim())))
    && edges.length > 0
    && edges.every((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      const candidate = edge as Record<string, unknown>;
      return typeof candidate.from === 'string'
        && typeof candidate.to === 'string'
        && candidate.from !== candidate.to
        && nodeIds.has(candidate.from)
        && nodeIds.has(candidate.to);
    });
};

const parsePayload = (value: unknown): DecisionProcedurePayload => {
  if (!value || typeof value !== 'object') {
    throw new Error('Formato inválido do payload de roteiros editoriais.');
  }

  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.procedures)) {
    throw new Error('A lista de roteiros editoriais não foi encontrada.');
  }

  const procedures: DecisionProcedure[] = payload.procedures
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const id = typeof item.id === 'string' ? item.id : '';
      const unitId = typeof item.unitId === 'string' ? item.unitId : '';
      const lessonId = typeof item.lessonId === 'string' ? item.lessonId : '';
      const groupId = typeof item.groupId === 'string' ? item.groupId : '';
      const moduleId = typeof item.moduleId === 'string' ? item.moduleId : '';
      const topic = typeof item.topic === 'string' ? item.topic : '';
      const canonicalTopicId =
        typeof item.canonicalTopicId === 'string' ? item.canonicalTopicId : '';
      const title = typeof item.title === 'string' ? item.title : '';
      const markdown = typeof item.markdown === 'string' ? item.markdown : '';
      const sourceText = typeof item.sourceText === 'string' ? item.sourceText : undefined;
      const structure = isDiagramStructure(item.structure) ? item.structure : undefined;
      const sourceRefs = Array.isArray(item.sourceRefs)
        ? item.sourceRefs.filter((ref): ref is string => typeof ref === 'string')
        : [];

      return {
        id,
        unitId,
        lessonId,
        groupId,
        moduleId,
        topic,
        canonicalTopicId,
        title,
        markdown,
        sourceText,
        structure,
        sourceRefs,
      };
    })
    .filter((item) => item.id && item.title && item.markdown);

  return {
    schemaVersion: typeof payload.schemaVersion === 'string' ? payload.schemaVersion : '1.0.0',
    buildId: typeof payload.buildId === 'string' ? payload.buildId : 'unknown',
    count: typeof payload.count === 'number' ? payload.count : procedures.length,
    procedures,
  };
};

export const DecisionTreeViewer: React.FC = () => {
  const [procedures, setProcedures] = useState<DecisionProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocusMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFocusMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocusMode]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(DECISION_PROCEDURES_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Não foi possível carregar os roteiros (${response.status}).`);
        }
        return response.json() as Promise<unknown>;
      })
      .then(parsePayload)
      .then((payload) => {
        setProcedures(payload.procedures);
        setSelectedProcedureId((current) => current || payload.procedures[0]?.id || null);
      })
      .catch((caughtError: unknown) => {
        if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível carregar os roteiros de resolução.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [loadAttempt]);

  const lessons = useMemo(
    () =>
      [...new Set(procedures.map((procedure) => procedure.lessonId))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { numeric: true }),
      ),
    [procedures],
  );

  const topics = useMemo(() => {
    const lessonProcedures =
      selectedLesson === 'all'
        ? procedures
        : procedures.filter((procedure) => procedure.lessonId === selectedLesson);
    return [...new Set(lessonProcedures.map((procedure) => procedure.topic))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );
  }, [procedures, selectedLesson]);

  const filteredProcedures = useMemo(() => {
    const query = normalizeForSearch(searchQuery.trim());
    return procedures.filter((procedure) => {
      if (selectedLesson !== 'all' && procedure.lessonId !== selectedLesson) return false;
      if (selectedTopic !== 'all' && procedure.topic !== selectedTopic) return false;
      if (!query) return true;

      return normalizeForSearch(
        `${procedure.title} ${procedure.topic} ${getLessonSearchLabel(procedure.lessonId)} ${procedure.markdown}`,
      ).includes(query);
    });
  }, [procedures, searchQuery, selectedLesson, selectedTopic]);

  useEffect(() => {
    if (filteredProcedures.length === 0) {
      setSelectedProcedureId(null);
      return;
    }
    if (!filteredProcedures.some((procedure) => procedure.id === selectedProcedureId)) {
      setSelectedProcedureId(filteredProcedures[0].id);
    }
  }, [filteredProcedures, selectedProcedureId]);

  const selectedProcedure = useMemo(
    () => procedures.find((procedure) => procedure.id === selectedProcedureId) || null,
    [procedures, selectedProcedureId],
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLesson('all');
    setSelectedTopic('all');
  };

  return (
    <div className="w-full space-y-6 pb-16">
      <header className="tool-page-header space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          <GitMerge className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
          <span>Roteiros editoriais de decisão</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Roteiros de resolução
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Encontre um procedimento, siga a sequência de análise e transforme regras de
          português em decisões objetivas durante a prova.
        </p>
      </header>

      {isLoading && (
        <div
          className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 shadow-xs"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-teal-700" aria-hidden="true" />
          <span className="text-sm font-semibold">Carregando roteiros de resolução…</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-xs"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-rose-950">Falha ao carregar roteiros</h2>
              <p className="text-xs leading-relaxed text-rose-800">{error}</p>
              <button
                type="button"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-900 hover:bg-rose-100/50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tentar novamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <section
            aria-labelledby="decision-filters-heading"
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="decision-filters-heading" className="text-sm font-bold text-slate-900">
                  Filtros de consulta
                </h2>
                <p className="text-xs text-slate-500">
                  Refine por termos do enunciado, etapa de estudo ou tópico gramatical.
                </p>
              </div>
              {(searchQuery || selectedLesson !== 'all' || selectedTopic !== 'all') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="self-start text-xs font-bold text-teal-700 hover:text-teal-900 sm:self-auto"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="decision-search" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Buscar nos roteiros
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="decision-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Ex.: crase, porquê, pronome SE…"
                    className="input-field min-h-11 w-full pl-9 pr-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="decision-lesson" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Tema curricular
                </label>
                <select
                  id="decision-lesson"
                  value={selectedLesson}
                  onChange={(event) => {
                    setSelectedLesson(event.target.value);
                    setSelectedTopic('all');
                  }}
                  className="input-field min-h-11 w-full px-3 py-2 text-sm"
                >
                  <option value="all">Todos os temas</option>
                  {lessons.map((lessonId) => (
                    <option key={lessonId} value={lessonId}>
                      {getLessonName(lessonId)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="decision-topic" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Tema
                </label>
                <select
                  id="decision-topic"
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                  className="input-field min-h-11 w-full px-3 py-2 text-sm"
                >
                  <option value="all">Todos os temas</option>
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {isFocusMode ? (
            /* Modo Foco: faixa horizontal de resultados no topo e procedimento em largura total */
            <div className="space-y-5">
              <aside
                data-testid="focus-results-strip"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ListChecks className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    <span>Resultados</span>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {filteredProcedures.length} roteiro{filteredProcedures.length === 1 ? '' : 's'}
                  </span>
                </div>

                <p className="sr-only" role="status" aria-live="polite">
                  {filteredProcedures.length} roteiros encontrados.
                </p>

                {filteredProcedures.length > 0 ? (
                  <nav
                    aria-label="Roteiros de resolução encontrados"
                    className="scrollbar-thin flex items-center gap-2 overflow-x-auto p-2.5"
                  >
                    {filteredProcedures.map((procedure) => {
                      const isSelected = procedure.id === selectedProcedureId;
                      return (
                        <button
                          key={procedure.id}
                          type="button"
                          onClick={() => setSelectedProcedureId(procedure.id)}
                          aria-current={isSelected ? 'true' : undefined}
                          className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                            isSelected
                              ? 'border-teal-300 bg-teal-50 text-teal-950 ring-1 ring-teal-300/60'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-teal-700 truncate">
                              {getLessonName(procedure.lessonId)} · {procedure.topic}
                            </span>
                            <span className="block text-xs font-semibold leading-snug truncate">
                              {procedure.title}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs font-semibold text-slate-600">Nenhum roteiro encontrado.</p>
                  </div>
                )}
              </aside>

              <main
                id="decision-procedure-content"
                aria-live="polite"
                className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                {selectedProcedure ? (
                  <article aria-labelledby="selected-procedure-title">
                    <header className="border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                        <StudyBadge tone="concept">
                          {getLessonName(selectedProcedure.lessonId)}
                        </StudyBadge>
                        <StudyBadge tone="rule">
                          {selectedProcedure.topic}
                        </StudyBadge>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <BookOpen className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                              Procedimento prático
                            </p>
                            <h2
                              id="selected-procedure-title"
                              className="mt-1 text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl"
                            >
                              {selectedProcedure.title}
                            </h2>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsFocusMode(false)}
                          aria-label="Restaurar visualização com barra lateral"
                          title="Restaurar layout normal"
                          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-950 shadow-2xs transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                        >
                          <Minimize2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
                          <span>Restaurar</span>
                        </button>
                      </div>
                    </header>
                    <div className="p-4 sm:p-6 lg:p-8">
                      {selectedProcedure.structure?.nodes?.length ? (
                        <StructuredDiagram
                          title={selectedProcedure.title}
                          source={selectedProcedure.sourceText}
                          structure={selectedProcedure.structure}
                        />
                      ) : (
                        <MarkdownContent content={selectedProcedure.markdown} className="w-full" />
                      )}
                    </div>
                  </article>
                ) : (
                  <div className="flex min-h-64 items-center justify-center p-8 text-center">
                    <div>
                      <BookOpen className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        Selecione um roteiro para começar.
                      </p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          ) : (
            /* Modo Normal: duas colunas com Resultados na lateral esquerda e Procedimento à direita */
            <div className="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <aside
                data-testid="sidebar-results"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <ListChecks className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    <span>Resultados</span>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-600">
                    {filteredProcedures.length}
                  </span>
                </div>

                <p className="sr-only" role="status" aria-live="polite">
                  {filteredProcedures.length} roteiros encontrados.
                </p>

                {filteredProcedures.length > 0 ? (
                  <nav
                    aria-label="Roteiros de resolução encontrados"
                    className="scrollbar-thin max-h-[42rem] overflow-y-auto p-2"
                  >
                    <ul className="space-y-1">
                      {filteredProcedures.map((procedure) => {
                        const isSelected = procedure.id === selectedProcedureId;
                        return (
                          <li key={procedure.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedProcedureId(procedure.id)}
                              aria-current={isSelected ? 'true' : undefined}
                              className={`group flex min-h-11 w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1 ${
                                isSelected
                                  ? 'border-teal-200 bg-teal-50 text-teal-950'
                                  : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-teal-700">
                                  {getLessonName(procedure.lessonId)} · {procedure.topic}
                                </span>
                                <span className="block text-xs font-semibold leading-5">
                                  {procedure.title}
                                </span>
                              </span>
                              <ChevronRight
                                className={`mt-4 h-4 w-4 shrink-0 transition ${
                                  isSelected
                                    ? 'translate-x-0 text-teal-700'
                                    : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-teal-700'
                                }`}
                                aria-hidden="true"
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                ) : (
                  <div className="p-6 text-center">
                    <Search className="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">Nenhum roteiro encontrado</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Tente outro termo ou remova um dos filtros.
                    </p>
                  </div>
                )}
              </aside>

              <main
                id="decision-procedure-content"
                aria-live="polite"
                className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                {selectedProcedure ? (
                  <article aria-labelledby="selected-procedure-title">
                    <header className="border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                        <StudyBadge tone="concept">
                          {getLessonName(selectedProcedure.lessonId)}
                        </StudyBadge>
                        <StudyBadge tone="rule">
                          {selectedProcedure.topic}
                        </StudyBadge>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <BookOpen className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                              Procedimento prático
                            </p>
                            <h2
                              id="selected-procedure-title"
                              className="mt-1 text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl"
                            >
                              {selectedProcedure.title}
                            </h2>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsFocusMode(true)}
                          aria-label="Expandir para largura total (Modo Foco)"
                          title="Modo Foco (Largura total)"
                          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                        >
                          <Maximize2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
                          <span>Modo Foco</span>
                        </button>
                      </div>
                    </header>
                      <div className="p-4 sm:p-6 lg:p-8">
                        {selectedProcedure.structure?.nodes?.length ? (
                          <StructuredDiagram
                            title={selectedProcedure.title}
                            source={selectedProcedure.sourceText}
                            structure={selectedProcedure.structure}
                          />
                        ) : (
                          <MarkdownContent content={selectedProcedure.markdown} className="w-full" />
                        )}
                      </div>
                  </article>
                ) : (
                  <div className="flex min-h-64 items-center justify-center p-8 text-center">
                    <div>
                      <BookOpen className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        Selecione um roteiro para começar.
                      </p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          )}
        </>
      )}
    </div>
  );
};
