import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CadernoErroItem, ModuleData, ModuleSection, SuvecaMethodConnection } from '../types/suveca';
import { db, type User } from '../lib/firebase';
import { MarkdownContent } from './ui/MarkdownContent';
import { PedagogicalUnitRenderer } from './pedagogical/PedagogicalUnitRenderer';
import { CumulativeReviewRenderer } from './pedagogical/CumulativeReviewRenderer';
import type { CumulativeReviewView, PedagogicalUnitView } from '../types/pedagogicalView';
import {
  isCumulativeReviewView,
  parsePublishedPedagogicalView,
  type PublishedPedagogicalView,
} from '../lib/pedagogicalViewContract';
import {
  isRichNoteEmpty,
  RichNoteEditor,
  sanitizeRichNoteHtml,
} from './RichNoteEditor';
import { FlashcardPractice } from './FlashcardPractice';
import { DailyMotivationCard } from './DailyMotivationCard';
import { useModalFocus } from '../hooks/useModalFocus';
import { PEDAGOGICAL_KNOWLEDGE_BUILD } from '../data/pedagogicalKnowledge.generated';
import { getLessonName } from '../data/lessonCatalog';
import {
  BookOpen,
  CheckCircle,
  X,
  BookmarkPlus,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Bot,
  List,
  FileText,
  Clock,
  AlertTriangle,
  Lightbulb,
  Maximize2,
  Minimize2,
  Database,
  ExternalLink,
  ShieldCheck,
  LoaderCircle,
  Workflow,
  Target,
  Sparkles,
  Flame,
  Trophy,
} from 'lucide-react';
import { SuvecaWordHighlight } from './ui/SuvecaBrandHighlight';
import { SuvecaEquationBlocks } from './study-visuals';
import { MACRO_CURRICULUM_ENABLED } from '../lib/featureFlags';
import {
  getPedagogicalMacrosForLesson,
  resolveAdaptiveMacroLinksFromUnit,
  resolveAdaptiveMacroLinksToUnit,
  resolvePedagogicalMacroForUnit,
} from '../data/pedagogicalMacroCatalog';
import {
  MacroCurriculumNavigator,
  MacroEntryPanel,
  type MacroAdaptiveRequirement,
} from './pedagogical/macro/MacroCurriculum';

interface ModuleViewerProps {
  modules: ModuleData[];
  selectedModuleId: string;
  onSelectModule: (id: string) => void;
  onAskTutor: (contextText: string) => void;
  onRecordError?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata?: Partial<CadernoErroItem>
  ) => void;
  user?: User | null;
  onNoteSaved?: () => void;
  onAnswerResult?: (isCorrect: boolean) => void;
  onSectionRead?: (moduleId: string, sectionIndex: number, unitId?: string | null) => void;
  readSectionIds?: string[];
  readUnitIds?: string[];
  onPracticeResult?: (moduleId: string, correct: boolean, completed: boolean) => void;
  onPracticeConcept?: (conceptIds: string[], moduleId: string) => void;
  /** Called once when every practice question in the selected module is answered. */
  onCompleteModule?: (moduleId: string) => void;
  errors?: CadernoErroItem[];
  userId?: string;
  onUpdateErrorStatus?: (
    id: string,
    status: CadernoErroItem['status'],
    review?: Pick<CadernoErroItem, 'lastReviewedAt' | 'nextReviewAt'>
  ) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  openUnitId?: string | null;
  openUnitSectionId?: string | null;
  onOpenUnitChange?: (unitId: string | null, sectionId?: string | null) => void;
  selectedMacroId?: string | null;
  onOpenMacroChange?: (macroId: string, unitId: string) => void;
  onPracticeCompetency?: (competencyId: string) => void;
  routeIssue?: 'invalid_unit' | 'invalid_macro' | null;
}

type ModuleNotes = Record<string, string>;
const CURRICULUM_BUILD_ID = PEDAGOGICAL_KNOWLEDGE_BUILD.buildId;

const SUVECA_LEVEL_STYLES: Record<SuvecaMethodConnection['level'], string> = {
  central: 'border-teal-200 bg-teal-50 text-teal-800',
  strong: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  support: 'border-violet-200 bg-violet-50 text-violet-800',
  indirect: 'border-slate-200 bg-slate-50 text-slate-700',
  outside_core: 'border-amber-200 bg-amber-50 text-amber-900',
  review: 'border-indigo-200 bg-indigo-50 text-indigo-800',
};

const sectionConceptIds = (sections: ModuleData['sections']) =>
  [...new Set(sections.flatMap((section) => section.sourceConceptIds || []))];

const notesStorageKey = (moduleId: string, userId?: string) =>
  userId
    ? `suveca_module_notes_${CURRICULUM_BUILD_ID}_${userId}_${moduleId}`
    : `suveca_module_notes_${CURRICULUM_BUILD_ID}_guest_${moduleId}`;

const normalizeNotes = (value: unknown): ModuleNotes => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value).reduce<ModuleNotes>((notes, [key, note]) => {
    if (typeof note === 'string') {
      notes[key] = sanitizeRichNoteHtml(note);
    }
    return notes;
  }, {});
};

const readLocalNotes = (moduleId: string, userId?: string): ModuleNotes => {
  try {
    const raw = localStorage.getItem(notesStorageKey(moduleId, userId));
    return raw ? normalizeNotes(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
};

const saveLocalNotes = (moduleId: string, notes: ModuleNotes, userId?: string) => {
  localStorage.setItem(notesStorageKey(moduleId, userId), JSON.stringify(notes));
};

const deepDiveMarkdownCache = new Map<string, string>();
const deepDiveViewCache = new Map<string, PublishedPedagogicalView>();

const integrationUnitIdForSection = (section: ModuleSection) => {
  const a14Match = section.contentUrl?.match(/A14-(S\d+)/);
  return section.editorial?.integrationUnitId || (a14Match ? `IP-A14-${a14Match[1]}` : null);
};

export const selectVisibleModuleSections = (
  module: ModuleData,
  macroMode: boolean,
  activeUnitId: string | null,
) => {
  const indexed = module.sections.map((section, index) => ({ section, index }));
  if (!macroMode) return indexed;
  if (!activeUnitId) return [];
  return indexed.filter(({ section }) => integrationUnitIdForSection(section) === activeUnitId);
};

export const migrateModuleNotesToStableUnitIds = (
  module: ModuleData,
  notes: ModuleNotes,
): ModuleNotes => {
  const migrated = { ...notes };
  module.sections.forEach((section, index) => {
    const unitId = integrationUnitIdForSection(section);
    const legacyKey = `section-${index}`;
    const stableKey = unitId ? `unit:${unitId}` : legacyKey;
    if (stableKey !== legacyKey && migrated[legacyKey] && !migrated[stableKey]) {
      migrated[stableKey] = migrated[legacyKey];
    }
  });
  return migrated;
};

export const mergeModuleNotesPreservingConflicts = (
  localNotes: ModuleNotes,
  cloudNotes: ModuleNotes,
): ModuleNotes => {
  const merged = { ...localNotes };
  for (const [key, cloudValue] of Object.entries(cloudNotes)) {
    const localValue = merged[key];
    if (!localValue || localValue === cloudValue) {
      merged[key] = cloudValue;
      continue;
    }
    // A versão sincronizada permanece principal, mas o texto local divergente
    // recebe chave recuperável e visível. Nunca há last-write-wins silencioso.
    const conflictBase = `conflict:local:${key}`;
    let conflictKey = conflictBase;
    let suffix = 2;
    while (merged[conflictKey] && merged[conflictKey] !== localValue) {
      conflictKey = `${conflictBase}:${suffix}`;
      suffix += 1;
    }
    merged[conflictKey] = localValue;
    merged[key] = cloudValue;
  }
  return merged;
};

export const PedagogicalDeepDive: React.FC<{
  section: ModuleSection;
  onAskTutor?: (contextText: string) => void;
  onPracticeExercises?: (topic?: string) => void;
  userId?: string;
  isOpen?: boolean;
  activeSectionId?: string | null;
  onOpenChange?: (open: boolean) => void;
  onActiveSectionChange?: (sectionId: string | null) => void;
  collapsible?: boolean;
}> = ({ section, onAskTutor, onPracticeExercises, userId, isOpen: controlledOpen, activeSectionId, onOpenChange, onActiveSectionChange, collapsible = true }) => {
  const panelId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const integrationUnitId = integrationUnitIdForSection(section);
  const viewUrl = integrationUnitId ? `/knowledge/pedagogical/views/${integrationUnitId}.json` : null;

  const [viewModel, setViewModel] = useState<PublishedPedagogicalView | null>(() =>
    viewUrl ? deepDiveViewCache.get(viewUrl) || null : null
  );
  const [content, setContent] = useState<string | null>(() =>
    !viewUrl && section.contentUrl ? deepDiveMarkdownCache.get(section.contentUrl) || null : null
  );
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'error'>(
    viewModel || content ? 'loaded' : 'idle'
  );

  useEffect(() => {
    if (!isOpen || (!viewUrl && !section.contentUrl) || viewModel || content) return;
    const controller = new AbortController();
    let active = true;
    setState('loading');

    const loadContent = async () => {
      // Prioridade 1: Tentar carregar View Model JSON Canônico V1
      if (viewUrl) {
        try {
          const res = await fetch(viewUrl, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = parsePublishedPedagogicalView(await res.json(), integrationUnitId);
          if (active) {
            deepDiveViewCache.set(viewUrl, data);
            setViewModel(data);
            setState('loaded');
            return;
          }
        } catch {
          if (active) setState('error');
          return;
        }
      }

      // Prioridade 2 (Fallback): Carregar Markdown legado / A14
      if (section.contentUrl) {
        try {
          const res = await fetch(section.contentUrl, {
            signal: controller.signal,
            headers: { Accept: 'text/markdown' },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const md = await res.text();
          if (active) {
            deepDiveMarkdownCache.set(section.contentUrl, md);
            setContent(md);
            setState('loaded');
          }
        } catch (err: unknown) {
          if (!active || (err instanceof DOMException && err.name === 'AbortError')) return;
          setState('error');
        }
      }
    };

    loadContent();

    return () => {
      active = false;
      controller.abort();
    };
  }, [content, isOpen, section.contentUrl, viewModel, viewUrl]);

  if (!viewUrl && !section.contentUrl) return null;

  return (
    <div className="pedagogical-deep-dive overflow-hidden rounded-2xl border border-teal-200 bg-teal-50/40">
      {collapsible ? (
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          if (controlledOpen === undefined) setInternalOpen(next);
          onOpenChange?.(next);
        }}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-teal-950 transition hover:bg-teal-50 cursor-pointer"
      >
        <span className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-teal-700" />
          <span>{isOpen ? 'Fechar aprofundamento' : 'Abrir unidade pedagógica completa'}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-teal-800">
          {section.estimatedMinutes ? `${section.estimatedMinutes} min` : null}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>
      ) : (
        <div className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-teal-950">
          <span className="flex min-w-0 items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-teal-700" />
            <span>Unidade pedagógica completa</span>
          </span>
          {section.estimatedMinutes ? (
            <span className="shrink-0 text-xs font-semibold text-teal-800">{section.estimatedMinutes} min</span>
          ) : null}
        </div>
      )}
      {isOpen && (
        <div id={panelId} className="pedagogical-deep-dive-panel border-t border-teal-200 bg-white p-2 sm:p-4 lg:p-6">
          {state === 'loading' && (
            <div className="flex min-h-28 items-center justify-center gap-2 text-sm font-semibold text-teal-800" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Carregando aprofundamento…
            </div>
          )}
          {state === 'error' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
              Não foi possível carregar esta unidade. Verifique a conexão e tente abri-la novamente.
            </div>
          )}
          {viewModel && (isCumulativeReviewView(viewModel) ? (
            <CumulativeReviewRenderer
              view={viewModel as CumulativeReviewView}
              activeSectionId={activeSectionId}
              onActiveSectionChange={onActiveSectionChange}
              onPracticeExercises={onPracticeExercises}
            />
          ) : (
            <PedagogicalUnitRenderer
              view={viewModel as PedagogicalUnitView}
              onAskTutor={onAskTutor}
              onPracticeExercises={onPracticeExercises}
              userId={userId}
              activeSectionId={activeSectionId}
              onActiveSectionChange={onActiveSectionChange}
            />
          ))}
          {!viewModel && content && <MarkdownContent content={content} pedagogical />}
        </div>
      )}
    </div>
  );
};

const editorialStatusLabel = (
  status: NonNullable<ModuleData['knowledge']>['editorialStatus']
) => {
    switch (status) {
      case 'approved_ai_reviewed':
        return 'Integrado após revisão pedagógica de IA';
      case 'needs_revision':
        return 'Revisão editorial necessária';
      case 'insufficient_evidence':
        return 'Evidência insuficiente';
      case 'conflicting_evidence':
        return 'Evidências em conflito';
      case 'approved':
      return 'Aprovado editorialmente';
    case 'reviewed':
      return 'Revisado';
    case 'deprecated':
      return 'Conteúdo descontinuado';
    default:
      return 'Aguardando revisão editorial';
  }
};

export const ModuleViewer: React.FC<ModuleViewerProps> = ({
  modules,
  selectedModuleId,
  onSelectModule,
  onAskTutor,
  onRecordError,
  user,
  onNoteSaved,
  onAnswerResult,
  onSectionRead,
  readSectionIds = [],
  readUnitIds = [],
  onPracticeResult,
  onPracticeConcept,
  onCompleteModule,
  errors,
  userId,
  onUpdateErrorStatus,
  isFocusMode = false,
  onToggleFocusMode,
  openUnitId = null,
  openUnitSectionId = null,
  onOpenUnitChange,
  selectedMacroId = null,
  onOpenMacroChange,
  onPracticeCompetency,
  routeIssue = null,
}) => {
  const moduleData =
    modules.find((m) => m.id === selectedModuleId) || modules[0];
  const lessonId = moduleData.sections.find((section) => section.lessonId)?.lessonId || null;
  const macroEntries = useMemo(
    () => lessonId ? getPedagogicalMacrosForLesson(lessonId) : [],
    [lessonId],
  );
  const macroMode = MACRO_CURRICULUM_ENABLED && macroEntries.length > 0;
  const selectedMacro = macroMode
    ? macroEntries.find((entry) => entry.macroId === selectedMacroId)
      || macroEntries.find((entry) => openUnitId ? entry.unitRefs.includes(openUnitId) : false)
      || null
    : null;
  const activeMacroUnitId = selectedMacro
    ? (openUnitId && selectedMacro.unitRefs.includes(openUnitId) ? openUnitId : selectedMacro.unitRefs[0])
    : null;
  const visibleSections = useMemo(
    () => selectVisibleModuleSections(moduleData, macroMode, activeMacroUnitId),
    [activeMacroUnitId, macroMode, moduleData],
  );
  const unitTitles = useMemo(() => Object.fromEntries(
    moduleData.sections
      .map((section) => [integrationUnitIdForSection(section), section.title] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0])),
  ), [moduleData.sections]);
  const adaptiveRequirements = useMemo<MacroAdaptiveRequirement[]>(() => {
    if (!macroMode || !activeMacroUnitId) return [];
    const inbound = resolveAdaptiveMacroLinksToUnit(activeMacroUnitId)
      .filter((link) => link.relationType !== 'remediation')
      .map((link) => ({ link, evidenceUnitId: link.fromUnitRef, actionUnitId: link.fromUnitRef }));
    const remediation = resolveAdaptiveMacroLinksFromUnit(activeMacroUnitId)
      .filter((link) => link.relationType === 'remediation')
      .map((link) => ({ link, evidenceUnitId: activeMacroUnitId, actionUnitId: link.toUnitRef }));

    return [...inbound, ...remediation].flatMap(({ link, evidenceUnitId, actionUnitId }) => {
      const evidenceMacro = resolvePedagogicalMacroForUnit(evidenceUnitId);
      const actionMacro = resolvePedagogicalMacroForUnit(actionUnitId);
      if (!evidenceMacro || !actionMacro) return [];
      const evidenceCompetencyIds = evidenceMacro.competencies
        .filter((competency) => competency.unitId === evidenceUnitId)
        .map((competency) => competency.competencyId);
      const actionCompetency = actionMacro.competencies.find((competency) => (
        competency.unitId === actionUnitId
      ));
      return [{
        requirementId: link.adaptiveLinkId,
        kind: link.relationType,
        evidenceCompetencyIds,
        actionMacroId: actionMacro.macroId,
        actionUnitId,
        actionTitle: actionCompetency?.title || actionMacro.title,
      }];
    });
  }, [activeMacroUnitId, macroMode]);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const [sectionNotes, setSectionNotes] = useState<ModuleNotes>({});
  const [openNoteEditors, setOpenNoteEditors] = useState<Record<number, boolean>>({});
  const [notesSyncState, setNotesSyncState] = useState<
    'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'local'
  >('idle');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState<boolean>(false);
  const moduleMenuRef = useRef<HTMLDivElement>(null);
  const [loadedNotesOwnerId, setLoadedNotesOwnerId] = useState<string | null>(null);
  const activeUnitHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isModuleMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(e.target as Node)) {
        setIsModuleMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModuleMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModuleMenuOpen]);

  const activeModuleIdRef = useRef(moduleData.id);
  const saveTimersRef = useRef<Record<string, number>>({});
  const mobileDrawerCloseRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useModalFocus(
    isMobileDrawerOpen,
    () => setIsMobileDrawerOpen(false),
    mobileDrawerCloseRef
  );
  const currentNotesOwnerId = user?.uid || 'guest';

  useEffect(() => {
    if (!openUnitId) return;
    const target = document.getElementById(`module-unit-${openUnitId}`);
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' });
      if (macroMode) activeUnitHeadingRef.current?.focus({ preventScroll: true });
    });
  }, [macroMode, moduleData.id, openUnitId]);

  // Notes are namespaced by the editorial build so content from a previous
  // curriculum cannot appear under reused module/section identifiers.
  useEffect(() => {
    let cancelled = false;
    const moduleId = moduleData.id;
    const userId = user?.uid;
    const localNotes = migrateModuleNotesToStableUnitIds(
      moduleData,
      readLocalNotes(moduleId, userId),
    );
    saveLocalNotes(moduleId, localNotes, userId);

    activeModuleIdRef.current = moduleId;
    setLoadedNotesOwnerId(null);
    setSectionNotes(localNotes);
    setSelectedAnswers({});
    setShowFeedback({});
    setOpenNoteEditors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!user) {
      setNotesSyncState('local');
      setLoadedNotesOwnerId('guest');
      return () => {
        cancelled = true;
      };
    }

    setNotesSyncState('loading');

    const loadCloudNotes = async () => {
      try {
        const noteRef = doc(db, 'users', user.uid, 'module_notes', `${CURRICULUM_BUILD_ID}_${moduleId}`);
        const snapshot = await getDoc(noteRef);
        if (cancelled) return;

        if (snapshot.exists() && snapshot.data().curriculumBuildId === CURRICULUM_BUILD_ID) {
          const cloudNotes = migrateModuleNotesToStableUnitIds(
            moduleData,
            normalizeNotes(snapshot.data().notes),
          );
          const mergedNotes = migrateModuleNotesToStableUnitIds(
            moduleData,
            mergeModuleNotesPreservingConflicts(localNotes, cloudNotes),
          );
          setSectionNotes(mergedNotes);
          saveLocalNotes(moduleId, mergedNotes, user.uid);
          if (JSON.stringify(mergedNotes) !== JSON.stringify(snapshot.data().notes || {})) {
            await setDoc(noteRef, {
              moduleId,
              curriculumBuildId: CURRICULUM_BUILD_ID,
              notes: mergedNotes,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
          setNotesSyncState('saved');
          setLoadedNotesOwnerId(user.uid);
          return;
        }

        // Preserve notes created before sign-in by seeding a module document.
        if (Object.keys(localNotes).length > 0) {
          await setDoc(noteRef, {
            moduleId,
            curriculumBuildId: CURRICULUM_BUILD_ID,
            notes: localNotes,
            updatedAt: new Date().toISOString(),
          });
        }

        if (!cancelled) {
          setNotesSyncState('saved');
          setLoadedNotesOwnerId(user.uid);
        }
      } catch (error) {
        console.error('Erro ao carregar anotações do módulo:', error);
        if (!cancelled) {
          setNotesSyncState('error');
          setLoadedNotesOwnerId(user.uid);
        }
      }
    };

    void loadCloudNotes();

    return () => {
      cancelled = true;
    };
  }, [moduleData.id, user?.uid]);

  const persistNotes = async (
    moduleId: string,
    userId: string,
    notes: ModuleNotes
  ) => {
    if (activeModuleIdRef.current === moduleId) setNotesSyncState('saving');

    try {
      await setDoc(
        doc(db, 'users', userId, 'module_notes', `${CURRICULUM_BUILD_ID}_${moduleId}`),
        {
          moduleId,
          curriculumBuildId: CURRICULUM_BUILD_ID,
          notes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      if (activeModuleIdRef.current === moduleId) setNotesSyncState('saved');
    } catch (error) {
      console.error('Erro ao salvar anotações do módulo:', error);
      if (activeModuleIdRef.current === moduleId) setNotesSyncState('error');
    }
  };

  const handleNoteChange = (noteKey: string, value: string) => {
    if (loadedNotesOwnerId !== currentNotesOwnerId) return;

    const moduleId = moduleData.id;
    const notes = { ...sectionNotes, [noteKey]: sanitizeRichNoteHtml(value) };
    setSectionNotes(notes);
    saveLocalNotes(moduleId, notes, user?.uid);

    if (!isRichNoteEmpty(value)) onNoteSaved?.();

    if (!user) {
      setNotesSyncState('local');
      return;
    }

    const timerKey = `${user.uid}:${moduleId}`;
    const existingTimer = saveTimersRef.current[timerKey];
    if (existingTimer) window.clearTimeout(existingTimer);

    saveTimersRef.current[timerKey] = window.setTimeout(() => {
      delete saveTimersRef.current[timerKey];
      void persistNotes(moduleId, user.uid, notes);
    }, 650);
  };

  const handleSelectAnswer = (qId: string, answer: string) => {
    const isFirstAnswer = !Object.prototype.hasOwnProperty.call(selectedAnswers, qId);
    const question = moduleData.questions?.find((item) => item.id === qId);
    setSelectedAnswers((prev) => ({ ...prev, [qId]: answer }));
    setShowFeedback((prev) => ({ ...prev, [qId]: true }));
    if (isFirstAnswer && question) {
      const isCorrect = answer === question.correctAnswer;
      onAnswerResult?.(isCorrect);
      const questionCount = moduleData.questions?.length || 0;
      const nextAnswers = { ...selectedAnswers, [qId]: answer };
      const allAnswered = questionCount > 0 && Object.keys(nextAnswers).length >= questionCount;
      const allCorrect = allAnswered && (moduleData.questions || []).every(
        (item) => nextAnswers[item.id] === item.correctAnswer
      );
      onPracticeResult?.(moduleData.id, isCorrect, allCorrect);
      if (allCorrect) {
        onCompleteModule?.(moduleData.id);
      }
    }
  };

  const askTutorAboutSection = (section: ModuleData['sections'][number]) => {
    const selectedExcerpt = window.getSelection()?.toString().trim().slice(0, 600);
    onAskTutor(
      `${getLessonName(moduleData.id, 'full')}. Seção: ${section.title}. ` +
      (section.summary ? `Objetivo de estudo: ${section.summary.slice(0, 360)}.` : '') +
      (selectedExcerpt ? ` Trecho selecionado pelo aluno: “${selectedExcerpt}”.` : '')
    );
  };

  const currentIndex = modules.findIndex((m) => m.id === moduleData.id);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;
  const coreModuleCount = modules.filter((module) => /^mod\d+$/.test(module.id)).length;
  const hasSimulado = modules.some((module) => module.id === 'simulado');
  const isExpandedStudy = isFocusMode || Boolean(openUnitId);
  const isIntroModule = moduleData.id === 'mod-intro';

  return (
    <div className={`module-viewer w-full space-y-6 pb-16 ${isExpandedStudy ? 'module-viewer--reading' : ''}`}>
      {/* Barra Superior de Navegação do Módulo (Full Width, Dropdown & Next/Prev) */}
      {!isFocusMode && (
        <nav
          className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2.5 relative"
          aria-label="Navegação da Apostila"
        >
          {/* Botão Módulo Anterior */}
          {prevModule ? (
            <button
              type="button"
              onClick={() => onSelectModule(prevModule.id)}
              className="button-ghost min-h-[42px] px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-teal-900 shrink-0 gap-1.5"
              title={`Módulo Anterior: ${prevModule.title}`}
            >
              <ChevronLeft className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="hidden sm:inline">Anterior:</span>
              <span className="hidden min-[420px]:inline font-extrabold text-teal-900 truncate max-w-[110px] md:max-w-[170px]">
                {prevModule.id === 'mod-intro' ? 'Intro' : `M${prevModule.num}`}
              </span>
            </button>
          ) : (
            <div className="w-8 sm:w-20" aria-hidden="true" />
          )}

          {/* Seletor Central com Dropdown de Todos os Módulos */}
          <div className="relative flex-1 max-w-xl mx-auto" ref={moduleMenuRef}>
            <button
              type="button"
              onClick={() => setIsModuleMenuOpen((prev) => !prev)}
              className="w-full min-h-[42px] bg-slate-50/90 hover:bg-teal-50/70 border border-slate-200/90 hover:border-teal-300 rounded-xl px-3 sm:px-4 py-2 flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs group"
              aria-expanded={isModuleMenuOpen}
              aria-haspopup="dialog"
              aria-label="Selecionar módulo do sumário"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-teal-700 shrink-0 group-hover:scale-110 transition-transform" />
                {moduleData.id === 'mod-intro' && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-900 shrink-0">
                    <Sparkles className="h-3 w-3 text-amber-600" />
                    Intro
                  </span>
                )}
                {moduleData.id === 'simulado' && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-100 px-1.5 py-0.5 text-[10px] font-black text-purple-900 shrink-0">
                    Simulado
                  </span>
                )}
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {moduleData.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-slate-500 group-hover:text-teal-700">
                <span className="hidden md:inline text-[11px] font-semibold text-slate-600 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
                  {coreModuleCount} grupos{hasSimulado ? ' + simulado' : ''}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isModuleMenuOpen ? 'rotate-180 text-teal-700' : ''}`} />
              </div>
            </button>

            {/* Dropdown Popover de Todos os Módulos */}
            {isModuleMenuOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-2 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 max-h-[70vh] overflow-y-auto space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
                role="dialog"
                aria-label="Sumário completo de módulos"
              >
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Sumário da Apostila ({modules.length} temas)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Escolha uma aula para navegar
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {modules.map((m) => {
                    const isSelected = m.id === moduleData.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectModule(m.id);
                          setIsModuleMenuOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 text-teal-950 font-black border border-teal-300 shadow-2xs'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          {m.id === 'mod-intro' ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-900 shrink-0">
                              <Sparkles className="h-3 w-3 text-amber-600" />
                              Intro
                            </span>
                          ) : m.id === 'simulado' ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-100 px-1.5 py-0.5 text-[10px] font-black text-purple-900 shrink-0">
                              Simulado
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded shrink-0">
                              M{m.num}
                            </span>
                          )}
                          <span className="truncate">{m.title}</span>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-teal-700 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Botão Próximo Módulo */}
          {nextModule ? (
            <button
              type="button"
              onClick={() => onSelectModule(nextModule.id)}
              className="button-primary min-h-[42px] px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold shrink-0 gap-1.5"
              title={`Próximo Módulo: ${nextModule.title}`}
            >
              <span className="hidden sm:inline">Próximo:</span>
              <span className="hidden min-[420px]:inline truncate max-w-[110px] md:max-w-[170px]">
                {nextModule.id === 'simulado' ? 'Simulado' : `M${nextModule.num}`}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <div className="w-8 sm:w-20" aria-hidden="true" />
          )}
        </nav>
      )}

      {/* Main Content Area (Full Width, No Left Gap) */}
      <article
        key={moduleData.id}
        className="w-full min-w-0 space-y-8 module-content-enter"
      >
        {isFocusMode && (
          <div className="sticky top-3 z-30 flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-teal-900">
              <Maximize2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Foco Total — {moduleData.title}</span>
            </div>
            <button type="button" onClick={onToggleFocusMode} className="button-secondary shrink-0 text-xs">
              <Minimize2 className="h-4 w-4 text-teal-700" /> Sair do foco
            </button>
          </div>
        )}
        {/* O módulo introdutório concentra sua apresentação no primeiro guia
            interativo. Os demais módulos preservam o cabeçalho curricular completo. */}
        {!isIntroModule && (
        <header className={isFocusMode ? 'hidden' : 'module-page-header bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4'}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
              Percurso {currentIndex + 1} de {coreModuleCount}
            </span>

            <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Tempo estimado: {moduleData.estimatedMinutes || 25} min</span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              <SuvecaWordHighlight text={moduleData.title} />
            </h1>
            <p className="text-sm font-semibold text-teal-800">
              {moduleData.subtitle}
            </p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl border-t border-slate-100 pt-3">
            {moduleData.description}
          </p>

          {moduleData.suvecaMethod && ['central', 'strong', 'review'].includes(moduleData.suvecaMethod.level) && (
            <section className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-sky-50/50" aria-labelledby={`suveca-method-${moduleData.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-teal-100 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900 text-amber-300 shadow-sm">
                    <Workflow className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full border border-teal-200 bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-teal-800">
                      {moduleData.suvecaMethod.label}
                    </span>
                    <h2 id={`suveca-method-${moduleData.id}`} className="mt-1.5 break-words text-base font-extrabold text-teal-950 sm:text-lg">
                      <SuvecaWordHighlight text="Conexão SuVeCA com esta aula" />
                    </h2>
                  </div>
                </div>
                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-teal-800">
                  Mapa funcional
                </span>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <SuvecaEquationBlocks compact />
                <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                  Os blocos representam funções e relações; podem aparecer em outra ordem, implícitos ou ausentes.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-teal-200 bg-white p-3.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700">Como ler o mapa</span>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-teal-950 sm:text-sm">
                      {moduleData.suvecaMethod.definition}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Aplicação nesta aula</span>
                    <p className="mt-1 text-xs leading-relaxed text-slate-700 sm:text-sm">
                      {moduleData.suvecaMethod.summary}
                    </p>
                  </div>
                </div>
              </div>
              <details className="group mt-4 border-t border-teal-200/80 pt-3 text-sm text-slate-700">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 font-bold text-teal-900 marker:hidden sm:px-5">
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  Como aplicar o mapa neste tema
                </summary>
                <ol className="mt-2 space-y-2 px-5 pb-1 pl-10 leading-relaxed marker:font-bold marker:text-teal-800">
                  {moduleData.suvecaMethod.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                {moduleData.suvecaMethod.limits.map((limit) => (
                  <p key={limit} className="mx-5 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                    <strong>Limite:</strong> {limit}
                  </p>
                ))}
                <p className="mx-5 mb-4 mt-3 text-xs leading-relaxed text-slate-500">
                  {moduleData.suvecaMethod.authorityNote}
                </p>
              </details>
            </section>
          )}

          {moduleData.knowledge && (
            <details className="group rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 text-xs text-slate-700">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 font-semibold marker:hidden">
                <span className="flex min-w-0 items-center gap-2">
                  <Database className="h-4 w-4 shrink-0 text-violet-700" />
                  <span className="min-w-0 break-words">
                    Base SuVeCA {moduleData.knowledge.kbVersion} · {moduleData.knowledge.sourceCount} fontes relacionadas
                  </span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-bold text-violet-800 sm:flex">
                  <ShieldCheck className="h-3 w-3" />
                  {editorialStatusLabel(moduleData.knowledge.editorialStatus)}
                </span>
              </summary>
              <div className="mt-3 space-y-2 border-t border-violet-200/70 pt-3">
                <p className="sm:hidden font-semibold text-violet-800">
                  {editorialStatusLabel(moduleData.knowledge.editorialStatus)}
                </p>
                <p className="leading-relaxed text-slate-600">
                  A apostila canônica sustenta as regras; a integração pedagógica organiza explicações, procedimentos, exemplos, contrastes e revisão ativa para uso na SuVeCa. A proveniência técnica permanece separada do texto de estudo.
                </p>
                {moduleData.knowledge.reviewVersion && (
                  <p className="rounded-lg border border-violet-200 bg-white/80 px-2.5 py-2 leading-relaxed text-violet-900">
                    Compilação <strong>{moduleData.knowledge.reviewVersion}</strong>, realizada por {moduleData.knowledge.reviewerType === 'ai' ? 'IA' : 'revisor'} em {moduleData.knowledge.reviewedAt || 'data não informada'}
                    {typeof moduleData.knowledge.reviewConfidence === 'number' ? ` · confiança ${(moduleData.knowledge.reviewConfidence * 100).toFixed(0)}%` : ''}. A autoria didática da IA não substitui a autoridade normativa do corpus.
                  </p>
                )}
                <ul className="space-y-1.5" aria-label="Principais fontes desta aula">
                  {moduleData.knowledge.sources.map((source) => (
                    <li key={source.id} className="flex items-start gap-2 rounded-lg bg-white/80 px-2.5 py-2">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 break-words font-medium text-slate-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900"
                        >
                          {source.title} <ExternalLink className="inline h-3 w-3" />
                        </a>
                      ) : (
                        <span className="min-w-0 break-words font-medium text-slate-700">{source.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onAskTutor(`Dúvidas em ${getLessonName(moduleData.id, 'full')}`)}
              className="button-secondary text-xs"
            >
              <Bot className="w-4 h-4 text-teal-700" />
              <span>Tirar Dúvida com Professor IA</span>
            </button>
            <button type="button" onClick={onToggleFocusMode} className="button-secondary text-xs">
              <Maximize2 className="w-4 h-4 text-teal-700" /> Modo Foco Total
            </button>
          </div>
        </header>
        )}

        {routeIssue && (
          <aside role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <strong className="block font-black">Não foi possível abrir o destino solicitado.</strong>
            <span>
              {routeIssue === 'invalid_unit'
                ? 'A unidade informada não existe neste currículo. Nenhum conteúdo semelhante foi escolhido automaticamente.'
                : 'O percurso informado não existe. A navegação atômica continua disponível.'}
            </span>
          </aside>
        )}

        {macroMode ? (
          <div className="space-y-4">
            <MacroCurriculumNavigator
              entries={macroEntries}
              selectedMacroId={selectedMacro?.macroId || null}
              readUnitIds={readUnitIds}
              onSelectMacro={(entry) => onOpenMacroChange?.(entry.macroId, entry.unitRefs[0])}
            />
            {selectedMacro && activeMacroUnitId && (
              <MacroEntryPanel
                entry={selectedMacro}
                activeUnitId={activeMacroUnitId}
                unitTitles={unitTitles}
                readUnitIds={readUnitIds}
                userId={userId || user?.uid || 'guest'}
                onSelectUnit={(unitId) => onOpenMacroChange?.(selectedMacro.macroId, unitId)}
                onPracticeCompetency={onPracticeCompetency}
                adaptiveRequirements={adaptiveRequirements}
                onOpenAdaptiveUnit={onOpenMacroChange}
              />
            )}
          </div>
        ) : (
        <nav
          className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 sm:p-5"
          aria-label={`Unidades pedagógicas de ${moduleData.title}`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {isIntroModule ? (
              <p className="m-0 text-base font-black text-teal-950">Percurso introdutório</p>
            ) : (
              <h2 className="m-0 text-base font-black text-teal-950">Escolha uma unidade para aprofundar</h2>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs font-semibold text-teal-800">{moduleData.sections.length} unidades</span>
              {isIntroModule && !isFocusMode && (
                <button type="button" onClick={onToggleFocusMode} className="button-secondary min-h-10 px-3 text-xs">
                  <Maximize2 className="h-3.5 w-3.5 text-teal-700" /> Modo foco
                </button>
              )}
            </div>
          </div>
          <ol className="m-0 grid list-none gap-2 p-0 md:grid-cols-2 xl:grid-cols-3">
            {moduleData.sections.map((section, index) => {
              const unitId = integrationUnitIdForSection(section);
              const isCurrent = Boolean(unitId && unitId === openUnitId);
              return (
                <li key={unitId || `${moduleData.id}-${index}`} className="m-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (unitId) onOpenUnitChange?.(unitId, null);
                      window.requestAnimationFrame(() => {
                        const targetId = unitId ? `module-unit-${unitId}` : `intro-section-${index}`;
                        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      });
                    }}
                    aria-current={isCurrent ? 'location' : undefined}
                    className={`flex min-h-12 w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                      isCurrent
                        ? 'border-teal-600 bg-white text-teal-950 ring-2 ring-teal-200'
                        : 'border-teal-200 bg-white/80 text-slate-800 hover:border-teal-400 hover:bg-white'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span className="font-bold leading-snug">{section.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        )}

        {/* Sections Content with Markdown */}
        <div className="space-y-8">
          {visibleSections.map(({ section, index: idx }) => {
            const stableUnitId = integrationUnitIdForSection(section);
            const legacyReadId = `${moduleData.id}:section-${idx}`;
            const sectionIsRead = Boolean(
              (stableUnitId && readUnitIds.includes(stableUnitId))
              || readSectionIds.includes(legacyReadId)
            );
            const legacyNoteKey = `section-${idx}`;
            const noteKey = stableUnitId ? `unit:${stableUnitId}` : legacyNoteKey;
            const hasLegacyNoteConflict = Boolean(
              stableUnitId
              && sectionNotes[noteKey]
              && sectionNotes[legacyNoteKey]
              && sectionNotes[noteKey] !== sectionNotes[legacyNoteKey]
            );
            const preservedConflictNotes = Object.entries(sectionNotes)
              .filter(([key, value]) => key.startsWith(`conflict:local:${noteKey}`)
                && value !== sectionNotes[noteKey])
              .map(([, value]) => value);
            if (
              hasLegacyNoteConflict
              && !preservedConflictNotes.includes(sectionNotes[legacyNoteKey])
            ) {
              preservedConflictNotes.push(sectionNotes[legacyNoteKey]);
            }
            const noteIsEmpty = isRichNoteEmpty(sectionNotes[noteKey]);
            const noteEditorIsOpen = Boolean(openNoteEditors[idx]);
            const notePanelId = `section-note-editor-${moduleData.id}-${idx}`;
            const isIntroOverview = isIntroModule && idx === 0;

            return (
            <section
              id={integrationUnitIdForSection(section) ? `module-unit-${integrationUnitIdForSection(section)}` : `intro-section-${idx}`}
              key={`${section.lessonId || moduleData.id}:${section.groupId || idx}:${section.contentUrl || section.title}`}
              className={`module-unit-shell min-w-0 overflow-hidden space-y-5 ${
                isIntroOverview ? 'p-0' : 'surface p-2.5 sm:p-6'
              } ${integrationUnitIdForSection(section) === openUnitId ? 'module-unit-shell--open' : ''}`}
            >
              {!isIntroOverview && (
              <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      ref={stableUnitId === activeMacroUnitId ? activeUnitHeadingRef : undefined}
                      tabIndex={stableUnitId === activeMacroUnitId ? -1 : undefined}
                      className="break-words text-lg sm:text-xl font-bold text-slate-900 tracking-tight outline-none"
                    >
                      {section.title}
                    </h2>
                    {!noteIsEmpty && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 border border-teal-300 px-2.5 py-0.5 text-[11px] font-extrabold text-teal-900 shadow-2xs">
                        <FileText className="w-3 h-3 text-teal-700" />
                        Anotação registrada
                      </span>
                    )}
                  </div>
                  {section.suvecaMethod && ['central', 'strong', 'review'].includes(section.suvecaMethod.level) && (
                    <span
                      className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[11px] font-bold leading-tight ${SUVECA_LEVEL_STYLES[section.suvecaMethod.level]}`}
                      title={section.suvecaMethod.summary}
                    >
                      SuVeCA · {section.suvecaMethod.label}
                    </span>
                  )}
                </div>
                <span className="shrink-0 pt-1 text-xs font-semibold text-slate-700" aria-label={`Unidade ${idx + 1} de ${moduleData.sections.length}`}>
                  <span className="hidden sm:inline">Unidade </span>{idx + 1}/{moduleData.sections.length}
                </span>
              </div>
              )}

              {/* Editorial Markdown Body */}
              <div className={`text-slate-800 text-base leading-relaxed ${isIntroOverview ? '' : 'reading-content'}`}>
                <MarkdownContent content={section.contentMarkdown} />
              </div>

              <PedagogicalDeepDive
                key={stableUnitId || `${moduleData.id}-${idx}`}
                section={section}
                userId={userId}
                onAskTutor={onAskTutor}
                isOpen={macroMode ? true : integrationUnitIdForSection(section) === openUnitId}
                activeSectionId={integrationUnitIdForSection(section) === openUnitId ? openUnitSectionId : null}
                collapsible={!macroMode}
                onOpenChange={macroMode ? undefined : (open) => onOpenUnitChange?.(
                    open ? integrationUnitIdForSection(section) : null,
                    null,
                  )}
                onActiveSectionChange={(sectionId) => onOpenUnitChange?.(
                  integrationUnitIdForSection(section),
                  sectionId,
                )}
                onPracticeExercises={() => onPracticeConcept?.(
                  section.sourceConceptIds?.length
                    ? section.sourceConceptIds
                    : section.canonicalTopicId
                      ? [section.canonicalTopicId]
                      : [],
                  moduleData.id,
                )}
              />

              {(section.limitsAndExceptions?.length || section.contrasts?.length || section.examTraps?.length) ? (
                <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                  {[
                    { title: 'Limites e exceções', items: section.limitsAndExceptions, tone: 'border-amber-200 bg-amber-50/70 text-amber-950' },
                    { title: 'Contrastes decisivos', items: section.contrasts, tone: 'border-sky-200 bg-sky-50/70 text-sky-950' },
                    { title: 'Pegadinhas de prova', items: section.examTraps, tone: 'border-rose-200 bg-rose-50/70 text-rose-950' },
                  ].filter((group) => group.items?.length).map((group) => (
                    <aside key={group.title} className={`min-w-0 rounded-xl border p-4 ${group.tone}`}>
                      <h3 className="text-sm font-extrabold">{group.title}</h3>
                      <ul className="mt-2 space-y-2 pl-4 text-sm leading-relaxed marker:text-current">
                        {group.items?.map((item) => <li key={item} className="break-words">{item}</li>)}
                      </ul>
                    </aside>
                  ))}
                </div>
              ) : null}

              {section.editorial?.evidenceRefs.length ? (
                <details className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs text-slate-600">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 font-semibold text-slate-700 marker:hidden">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-violet-700" />
                    Evidências exatas desta ampliação editorial
                  </summary>
                  <ul className="space-y-2 border-t border-slate-200 pt-3">
                    {section.editorial.evidenceRefs.map((source, sourceIndex) => (
                      <li key={`${source.sourceId}-${source.characterRange.join('-')}-${sourceIndex}`} className="break-words leading-relaxed">
                        <span className="font-semibold text-slate-800">{source.sourceTitle}</span>
                        <span className="block font-mono text-[10px] text-slate-500">
                          source:{source.sourceId}#{source.characterRange.join('-')} · SHA-256 {source.fulltextSha256.slice(0, 12)}…
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {/* Highlight / Warning Box if exists */}
              {section.highlightBox && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
                    section.highlightBox.type === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                      : section.highlightBox.type === 'rule'
                      ? 'bg-teal-50/80 border-teal-200 text-teal-950'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {section.highlightBox.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    ) : (
                      <Lightbulb className="w-4 h-4 text-teal-700 shrink-0" />
                    )}
                    <span>{section.highlightBox.title}</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed">
                    {section.highlightBox.text}
                  </p>
                </div>
              )}

              {/* Key Table if exists */}
              {section.keyTable && (
                <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-2xs">
                  <div className="border-b border-teal-100 bg-linear-to-r from-teal-950 via-teal-900 to-emerald-950 px-4 py-3 text-white">
                    <span className="text-xs font-black uppercase tracking-wider text-teal-200">
                      Quadro Comparativo de Síntese
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-800">
                      <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200">
                        <tr>
                          {section.keyTable.headers.map((h, i) => (
                            <th key={i} className="p-3.5">
                              {h.trim() || `Coluna ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {section.keyTable.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/40' : ''}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-3.5 font-medium leading-relaxed">
                                {cIdx === 0 ? (
                                  <strong className="text-teal-950 font-bold">{cell}</strong>
                                ) : cIdx === 1 ? (
                                  <span className="text-emerald-950">{cell}</span>
                                ) : (
                                  <span className="text-slate-600">{cell}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className={isFocusMode ? 'hidden' : 'rounded-2xl border border-teal-100 bg-teal-50/40 p-3 sm:p-4 space-y-3'}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Minhas anotações</h3>
                      <p className="text-[11px] text-slate-600">Registre regras, dúvidas e exemplos sem ocupar a leitura principal.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-expanded={noteEditorIsOpen}
                    aria-controls={notePanelId}
                    onClick={() => setOpenNoteEditors((current) => ({ ...current, [idx]: !noteEditorIsOpen }))}
                    className="button-secondary min-h-11 text-xs"
                  >
                    <FileText className="h-4 w-4" />
                    {noteEditorIsOpen ? 'Fechar anotações' : noteIsEmpty ? 'Adicionar anotação' : 'Editar anotação'}
                  </button>
                </div>

                {noteEditorIsOpen && (
                  <div id={notePanelId} className="space-y-3 border-t border-teal-100 pt-3">
                    <div className="flex justify-end">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          notesSyncState === 'error'
                            ? 'text-rose-700 bg-rose-50 border-rose-200'
                            : notesSyncState === 'local'
                            ? 'text-amber-800 bg-amber-50 border-amber-200'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        }`}
                        role="status"
                      >
                        {notesSyncState === 'loading'
                          ? 'Carregando do Firestore...'
                          : notesSyncState === 'saving'
                          ? 'Salvando no Firestore...'
                          : notesSyncState === 'saved'
                          ? '✓ Sincronizado no Firestore'
                          : notesSyncState === 'error'
                          ? 'Falha ao sincronizar'
                          : 'Salvo localmente'}
                      </span>
                    </div>
                    <RichNoteEditor
                      value={sectionNotes[noteKey] || ''}
                      onChange={(value) => handleNoteChange(noteKey, value)}
                      disabled={notesSyncState === 'loading' || loadedNotesOwnerId !== currentNotesOwnerId}
                      ariaLabel={`Anotações da seção ${section.title}`}
                      autoFocus
                      placeholder="Registre a regra, uma exceção ou seu próprio exemplo..."
                    />
                    {preservedConflictNotes.length > 0 && (
                      <aside className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                        <strong className="block font-black">Anotação divergente preservada</strong>
                        <p className="my-1">Uma versão anterior ou local é diferente da nota sincronizada. Nenhum texto foi sobrescrito.</p>
                        {preservedConflictNotes.map((note, conflictIndex) => (
                          <div
                            key={conflictIndex}
                            className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-slate-800"
                            dangerouslySetInnerHTML={{ __html: note }}
                          />
                        ))}
                      </aside>
                    )}
                    {!user && <p className="text-xs text-slate-500">Entre na sua conta para sincronizar esta anotação com o Firestore.</p>}
                  </div>
                )}
              </div>

              {!isFocusMode && onSectionRead && (
                <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSectionRead(moduleData.id, idx, stableUnitId)}
                  disabled={sectionIsRead}
                  className="button-secondary min-h-[44px] text-xs disabled:cursor-default disabled:bg-emerald-50 disabled:text-emerald-800 disabled:opacity-100"
                >
                  <CheckCircle className="h-4 w-4" />
                  {sectionIsRead ? 'Seção concluída' : 'Marcar seção como estudada'}
                </button>
                <button type="button" onClick={() => askTutorAboutSection(section)} className="button-secondary min-h-[44px] text-xs">
                  <Bot className="h-4 w-4 text-teal-700" /> Perguntar sobre esta seção
                </button>
                {section.sourceConceptIds?.length && onPracticeConcept ? (
                  <button type="button" onClick={() => onPracticeConcept(section.sourceConceptIds || [], moduleData.id)} className="button-primary min-h-[44px] text-xs">
                    <CheckCircle className="h-4 w-4" /> Pratique este conceito
                  </button>
                ) : null}
                </div>
              )}
            </section>
            );
          })}
        </div>

        {!isFocusMode && errors && onUpdateErrorStatus && (
          <FlashcardPractice
            errors={errors}
            onUpdateErrorStatus={onUpdateErrorStatus}
            userId={userId}
            editorialModuleId={moduleData.id}
          />
        )}

        {/* Practice Questions for this Module */}
        {!macroMode && !isFocusMode && moduleData.questions && moduleData.questions.length > 0 && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-700" />
                  <span>Fixação Prática e Bateria de Questões</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Responda para testar a retenção das regras desta aula.
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {moduleData.questions.length} Questões
              </span>
            </div>

            <div className="space-y-6">
              {moduleData.questions.map((q, qIdx) => {
                const selected = selectedAnswers[q.id];
                const feedbackShown = showFeedback[q.id];
                const isCorrect = selected === q.correctAnswer;

                return (
                  <div
                    key={q.id}
                    className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                        Questão {qIdx + 1} ({q.type === 'CERTO_ERRADO' ? 'Certo ou Errado' : 'Múltipla Escolha'})
                      </span>
                    </div>

                    {q.supportText && (
                      <div className="bg-white p-3.5 rounded-xl text-xs sm:text-sm italic text-slate-700 border-l-3 border-teal-700 shadow-2xs">
                        "{q.supportText}"
                      </div>
                    )}

                    <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                      {q.questionText}
                    </p>

                    {/* Options / Certo x Errado Buttons */}
                    {q.type === 'CERTO_ERRADO' ? (
                      <div className="flex space-x-3 pt-2">
                        {['C', 'E'].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleSelectAnswer(q.id, val)}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition border min-h-[44px] cursor-pointer ${
                              selected === val
                                ? val === q.correctAnswer
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                                  : 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-teal-600 hover:bg-slate-50'
                            }`}
                          >
                            {val === 'C' ? 'CERTO' : 'ERRADO'}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        {q.options?.map((opt) => (
                          <button
                            key={opt.letter}
                            onClick={() => handleSelectAnswer(q.id, opt.letter)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-medium transition border flex items-start space-x-3 min-h-[44px] cursor-pointer ${
                              selected === opt.letter
                                ? opt.letter === q.correctAnswer
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                                  : 'bg-rose-50 text-rose-900 border-rose-300 font-bold'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-teal-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-bold shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                              {opt.letter}
                            </span>
                            <span className="pt-0.5 leading-relaxed">{opt.text}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Explanation Feedback Box */}
                    {feedbackShown && (
                      <div
                        className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm space-y-3 ${
                          isCorrect
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : 'bg-rose-50/80 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>
                            {isCorrect
                              ? '✓ Resposta Correta!'
                              : `✕ Incorreto. Gabarito: ${q.correctAnswer}`}
                          </span>
                        </div>

                        <div className="space-y-3 leading-relaxed">
                          <div>
                            <strong className="block text-xs uppercase tracking-wide">Regra decisiva e por que o gabarito está correto</strong>
                            <p className="mt-1">{q.resolution?.whyCorrect || q.resolution?.decisiveRule || q.commentary}</p>
                          </div>
                          <div className="rounded-xl border border-current/15 bg-white/60 p-3">
                            <strong className="block text-xs uppercase tracking-wide">Teste mental para repetir na prova</strong>
                            <p className="mt-1">{q.resolution?.mentalTest || (q.type === 'CERTO_ERRADO'
                              ? 'Isole a afirmação do item, localize o trecho decisivo e teste se ela preserva integralmente a regra e o sentido do texto, sem absolutizações.'
                              : 'Aplique a regra decisiva a cada alternativa, elimine as que falham no mesmo critério e só então marque a opção restante.')}</p>
                          </div>
                          {q.options?.length ? (
                            <div>
                              <strong className="block text-xs uppercase tracking-wide">Contraste entre alternativas</strong>
                              <ul className="mt-1 space-y-1.5">
                                {q.options.map((option) => {
                                  const authored = q.resolution?.distractors?.find((item) => item.option === option.letter)?.explanation;
                                  return <li key={option.letter}><b>{option.letter}.</b> {option.letter === q.correctAnswer ? 'É o gabarito; confira a justificativa acima.' : authored || 'Não satisfaz o critério decisivo; confronte-a diretamente com a regra acima.'}</li>;
                                })}
                              </ul>
                            </div>
                          ) : null}
                          {q.resolution?.contrastOrException && <p><strong>Contraste ou exceção:</strong> {q.resolution.contrastOrException}</p>}
                          <p className="rounded-xl border border-current/15 bg-white/60 p-3">
                            <strong>Próximo conceito recomendado:</strong>{' '}
                            {isCorrect
                              ? nextModule
                                ? `avance para “${nextModule.title}” e compare a nova regra com a que acabou de aplicar.`
                                : `refaça uma questão de “${q.topic || moduleData.title}” sem consultar a explicação.`
                              : `revise “${q.topic || moduleData.title}” e aplique novamente o teste mental acima antes de avançar.`}
                          </p>
                        </div>

                        {!isCorrect && onRecordError && (
                          <div className="pt-2 border-t border-rose-200/60 flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                onRecordError(
                                  q.topic || moduleData.title,
                                  `Errei a questão: "${q.questionText.substring(0, 80)}..."`,
                                  q.commentary,
                                  {
                                    origin: q.origin === 'official' ? 'official_question' : 'module_question',
                                    questionId: q.officialQuestionId || q.id,
                                    questionText: q.questionText,
                                    selectedAnswer: selected,
                                    correctAnswer: q.correctAnswer,
                                    bank: q.bank,
                                    topic: q.topic,
                                    moduleRef: moduleData.id,
                                    conceptIds: q.conceptIds || sectionConceptIds(moduleData.sections),
                                    sourceRefs: q.sourceRefs,
                                  }
                                )
                              }
                              className="bg-white hover:bg-rose-100 text-rose-800 font-bold px-3 py-1.5 rounded-lg border border-rose-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              <span>+ Registrar no Caderno de Erros</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Frase Inspiracional ao Final da Aula */}
        {!isFocusMode && (
          <DailyMotivationCard />
        )}

        {/* Prev / Next Navigation */}
        {!isFocusMode && <nav
          className="flex items-center justify-between pt-4 border-t border-slate-200"
          aria-label="Navegação entre aulas"
        >
          {prevModule ? (
            <button
              onClick={() => onSelectModule(prevModule.id)}
              className="button-secondary text-xs sm:text-sm"
            >
              <ChevronLeft className="w-4 h-4 text-teal-700" />
              <span>Anterior: M{prevModule.num}</span>
            </button>
          ) : (
            <div />
          )}

          {nextModule && (
            <button
              onClick={() => onSelectModule(nextModule.id)}
              className="button-primary text-xs sm:text-sm"
            >
              <span>Próximo: M{nextModule.num}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </nav>}
      </article>
    </div>
  );
};
