import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CadernoErroItem, ModuleData } from '../types/suveca';
import { db, type User } from '../lib/firebase';
import { MarkdownContent } from './ui/MarkdownContent';
import {
  isRichNoteEmpty,
  RichNoteEditor,
  sanitizeRichNoteHtml,
} from './RichNoteEditor';
import { FlashcardPractice } from './FlashcardPractice';
import { useModalFocus } from '../hooks/useModalFocus';
import {
  BookOpen,
  CheckCircle,
  X,
  BookmarkPlus,
  ChevronRight,
  ChevronLeft,
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
} from 'lucide-react';

interface ModuleViewerProps {
  modules: ModuleData[];
  selectedModuleId: string;
  onSelectModule: (id: string) => void;
  onAskTutor: (contextText: string) => void;
  onRecordError?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string
  ) => void;
  user?: User | null;
  onNoteSaved?: () => void;
  onAnswerResult?: (isCorrect: boolean) => void;
  /** Called once when every practice question in the selected module is answered. */
  onCompleteModule?: (moduleId: string) => void;
  errors?: CadernoErroItem[];
  userId?: string;
  onUpdateErrorStatus?: (id: string, status: CadernoErroItem['status']) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

type ModuleNotes = Record<string, string>;

const notesStorageKey = (moduleId: string, userId?: string) =>
  userId
    ? `suveca_module_notes_${userId}_${moduleId}`
    : `suveca_module_notes_guest_${moduleId}`;

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
    const savedNotes = localStorage.getItem(notesStorageKey(moduleId, userId));
    if (savedNotes) return normalizeNotes(JSON.parse(savedNotes));

    // Legacy notes have no account identity, so they can only be recovered by
    // the guest profile. They are never copied into a newly signed-in account.
    if (userId) return {};
    const legacyNote = localStorage.getItem(`suveca_note_${moduleId}`);
    return legacyNote ? { 'section-0': sanitizeRichNoteHtml(legacyNote) } : {};
  } catch {
    return {};
  }
};

const saveLocalNotes = (moduleId: string, notes: ModuleNotes, userId?: string) => {
  localStorage.setItem(notesStorageKey(moduleId, userId), JSON.stringify(notes));
};

const editorialStatusLabel = (
  status: NonNullable<ModuleData['knowledge']>['editorialStatus']
) => {
    switch (status) {
      case 'approved_ai_reviewed':
        return 'Aprovado por revisão editorial de IA';
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
  onCompleteModule,
  errors,
  userId,
  onUpdateErrorStatus,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const moduleData =
    modules.find((m) => m.id === selectedModuleId) || modules[0];

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const [sectionNotes, setSectionNotes] = useState<ModuleNotes>({});
  const [notesSyncState, setNotesSyncState] = useState<
    'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'local'
  >('idle');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [loadedNotesOwnerId, setLoadedNotesOwnerId] = useState<string | null>(null);
  const activeModuleIdRef = useRef(moduleData.id);
  const saveTimersRef = useRef<Record<string, number>>({});
  const mobileDrawerCloseRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useModalFocus(
    isMobileDrawerOpen,
    () => setIsMobileDrawerOpen(false),
    mobileDrawerCloseRef
  );
  const currentNotesOwnerId = user?.uid || 'guest';

  // Load this module's notes. Logged-out study remains available locally and is
  // migrated to the authenticated user's Firestore document on their next save.
  useEffect(() => {
    let cancelled = false;
    const moduleId = moduleData.id;
    const userId = user?.uid;
    const localNotes = readLocalNotes(moduleId, userId);

    activeModuleIdRef.current = moduleId;
    setLoadedNotesOwnerId(null);
    setSectionNotes(localNotes);
    setSelectedAnswers({});
    setShowFeedback({});
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
        const noteRef = doc(db, 'users', user.uid, 'module_notes', moduleId);
        const snapshot = await getDoc(noteRef);
        if (cancelled) return;

        if (snapshot.exists()) {
          const cloudNotes = normalizeNotes(snapshot.data().notes);
          setSectionNotes(cloudNotes);
          saveLocalNotes(moduleId, cloudNotes, user.uid);
          setNotesSyncState('saved');
          setLoadedNotesOwnerId(user.uid);
          return;
        }

        // Preserve notes created before sign-in by seeding a module document.
        if (Object.keys(localNotes).length > 0) {
          await setDoc(noteRef, {
            moduleId,
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
        doc(db, 'users', userId, 'module_notes', moduleId),
        {
          moduleId,
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
      onAnswerResult?.(answer === question.correctAnswer);
      const questionCount = moduleData.questions?.length || 0;
      if (questionCount > 0 && Object.keys(selectedAnswers).length + 1 >= questionCount) {
        onCompleteModule?.(moduleData.id);
      }
    }
  };

  const currentIndex = modules.findIndex((m) => m.id === moduleData.id);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  return (
    <div
      className={`pb-16 items-start ${
        isFocusMode ? 'block' : 'grid grid-cols-1 gap-8 lg:grid-cols-12'
      }`}
    >
      {/* Mobile Module Selector Trigger Bar */}
      <div className={isFocusMode ? 'hidden' : 'lg:hidden col-span-1'}>
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="w-full min-h-[52px] bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs text-left"
          aria-label="Abrir menu de módulos"
          aria-expanded={isMobileDrawerOpen}
          aria-controls="module-mobile-drawer"
          aria-haspopup="dialog"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <span className="text-xs font-bold bg-teal-50 text-teal-800 px-2.5 py-1 rounded-md border border-teal-200 shrink-0">
              Módulo {moduleData.num}
            </span>
            <span className="text-sm font-bold text-slate-900 truncate">
              {moduleData.title}
            </span>
          </div>
          <List className="w-5 h-5 text-teal-700 shrink-0 ml-2" />
        </button>
      </div>

      {/* Mobile Sidebar Drawer */}
      {!isFocusMode && isMobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            ref={mobileDrawerRef}
            id="module-mobile-drawer"
            className="bg-white rounded-t-2xl max-h-[85vh] flex flex-col border-t border-slate-200 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-mobile-drawer-title"
            tabIndex={-1}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="module-mobile-drawer-title" className="font-bold text-slate-900 text-base">Sumário da Apostila</h3>
              <button
                ref={mobileDrawerCloseRef}
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
                aria-label="Fechar sumário"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {modules.map((m) => {
                const isSelected = m.id === moduleData.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectModule(m.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-50 text-teal-900 border-teal-200 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                        M{m.num}
                      </span>
                      <span className="truncate">{m.title}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-teal-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar (280px equivalent: 3 cols out of 12) */}
      <aside
        className={
          isFocusMode
            ? 'hidden'
            : 'hidden lg:block lg:col-span-3 sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto pr-1'
        }
      >
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-teal-700" />
              <h2 className="font-bold text-slate-900 text-sm">Sumário da Apostila</h2>
            </div>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {modules.length} Módulos
            </span>
          </div>

          <div className="space-y-1">
            {modules.map((m) => {
              const isSelected = m.id === moduleData.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectModule(m.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/90 text-teal-900 font-bold border-l-4 border-teal-700 shadow-2xs pl-3'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      M{m.num}
                    </span>
                    <span className="truncate">{m.title}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition ${
                      isSelected
                        ? 'text-teal-700 opacity-100'
                        : 'text-slate-300 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content Area (9 cols out of 12) */}
      <article
        key={moduleData.id}
        className={`col-span-1 min-w-0 space-y-8 module-content-enter ${
          isFocusMode ? 'mx-auto max-w-4xl lg:col-span-12' : 'lg:col-span-9'
        }`}
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
        {/* Module Header Card */}
        <header className={isFocusMode ? 'hidden' : 'bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4'}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
              Módulo {moduleData.num} de {modules.length - 1}
            </span>

            <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Tempo estimado: 25 min</span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {moduleData.title}
            </h1>
            <p className="text-sm font-semibold text-teal-800">
              {moduleData.subtitle}
            </p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl border-t border-slate-100 pt-3">
            {moduleData.description}
          </p>

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
                  As fontes sustentam a auditoria editorial; a interpretação SuVeCA permanece identificada como elaboração do método. A versão técnica do conteúdo é registrada internamente.
                </p>
                {moduleData.knowledge.reviewVersion && (
                  <p className="rounded-lg border border-violet-200 bg-white/80 px-2.5 py-2 leading-relaxed text-violet-900">
                    Parecer <strong>{moduleData.knowledge.reviewVersion}</strong>, emitido por {moduleData.knowledge.reviewerType === 'ai' ? 'IA' : 'revisor'} em {moduleData.knowledge.reviewedAt || 'data não informada'}
                    {typeof moduleData.knowledge.reviewConfidence === 'number' ? ` · confiança ${(moduleData.knowledge.reviewConfidence * 100).toFixed(0)}%` : ''}. Não equivale a aprovação humana.
                  </p>
                )}
                <ul className="space-y-1.5" aria-label="Principais fontes deste módulo">
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
              onClick={() => onAskTutor(`Dúvidas no Módulo ${moduleData.num}: ${moduleData.title}`)}
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

        {/* Sections Content with Markdown */}
        <div className="space-y-8">
          {moduleData.sections.map((section, idx) => (
            <section
              key={idx}
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-4 sm:p-8 border border-slate-200 shadow-xs space-y-5"
            >
              <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {section.title}
                </h2>
                <span className="shrink-0 pt-1 text-xs font-semibold text-slate-400">
                  {idx + 1}.{moduleData.sections.length}
                </span>
              </div>

              {/* Editorial Markdown Body */}
              <div className="text-slate-800 text-base leading-relaxed">
                <MarkdownContent content={section.contentMarkdown} />
              </div>

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
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-800">
                    <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                      <tr>
                        {section.keyTable.headers.map((h, i) => (
                          <th key={i} className="p-3.5">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {section.keyTable.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3.5 font-medium">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div
                className={
                  isFocusMode
                    ? 'hidden'
                    : 'rounded-2xl border border-teal-100 bg-teal-50/40 p-4 sm:p-5 space-y-3'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Minhas anotações desta seção
                    </h3>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      notesSyncState === 'error'
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : notesSyncState === 'local'
                        ? 'text-amber-800 bg-amber-50 border-amber-200'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {notesSyncState === 'loading'
                      ? 'Carregando...'
                      : notesSyncState === 'saving'
                      ? 'Salvando...'
                      : notesSyncState === 'saved'
                      ? 'Salvo na nuvem'
                      : notesSyncState === 'error'
                      ? 'Falha ao sincronizar'
                      : 'Salvo neste dispositivo'}
                  </span>
                </div>

                <RichNoteEditor
                  value={sectionNotes[`section-${idx}`] || ''}
                  onChange={(value) => handleNoteChange(`section-${idx}`, value)}
                  disabled={
                    notesSyncState === 'loading' ||
                    loadedNotesOwnerId !== currentNotesOwnerId
                  }
                  ariaLabel={`Anotações da seção ${section.title}`}
                  placeholder="Registre a regra, uma exceção ou seu próprio exemplo..."
                />

                {!user && (
                  <p className="text-xs text-slate-500">
                    Entre na sua conta para sincronizar esta anotação com o Firestore.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>

        {!isFocusMode && errors && onUpdateErrorStatus && (
          <FlashcardPractice
            errors={errors}
            onUpdateErrorStatus={onUpdateErrorStatus}
            userId={userId}
          />
        )}

        {/* Practice Questions for this Module */}
        {!isFocusMode && moduleData.questions && moduleData.questions.length > 0 && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-700" />
                  <span>Fixação Prática e Bateria de Questões</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Responda para testar a retenção das regras deste módulo.
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
                              : `✕ Incorreto. Gabarito oficial: ${q.correctAnswer}`}
                          </span>
                        </div>

                        <p className="leading-relaxed">{q.commentary}</p>

                        {!isCorrect && onRecordError && (
                          <div className="pt-2 border-t border-rose-200/60 flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                onRecordError(
                                  q.topic || moduleData.title,
                                  `Errei a questão: "${q.questionText.substring(0, 80)}..."`,
                                  q.commentary
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

        {/* Prev / Next Navigation */}
        {!isFocusMode && <nav
          className="flex items-center justify-between pt-4 border-t border-slate-200"
          aria-label="Navegação entre módulos"
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
