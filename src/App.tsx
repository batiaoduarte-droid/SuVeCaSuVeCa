import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MODULES_DATA } from './data/modulesData';
import { CadernoErroItem, QuizQuestion } from './types/suveca';
import { Navbar, TabType } from './components/Navbar';
import { DailyTipCard } from './components/DailyTipCard';
import { DailyReviewReminder } from './components/DailyReviewReminder';
import { ContinueLearningCard } from './components/ContinueLearningCard';
import { fetchOfficialQuestionSample, officialDetailToQuizQuestion } from './lib/officialQuestions';
import { SuvecaMethodBanner } from './components/SuvecaMethodBanner';
import { WeeklyGoalCard } from './components/WeeklyGoalCard';
import { OnboardingTour, hasCompletedOnboarding } from './components/OnboardingTour';
import { useLearningMetrics } from './hooks/useLearningMetrics';
import { useAchievements } from './hooks/useAchievements';
import { getActiveStudyStreak, studyDayKey } from './lib/achievements';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  type User,
} from './lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

// Each study tool is a self-contained route-sized chunk. In particular, this
// keeps Recharts, Gemini panels and the duel engine out of the first mobile
// render while preserving the existing tab navigation.
const ModuleViewer = lazy(() =>
  import('./components/ModuleViewer').then((module) => ({ default: module.ModuleViewer }))
);
const SuvecaAnalyzer = lazy(() =>
  import('./components/SuvecaAnalyzer').then((module) => ({ default: module.SuvecaAnalyzer }))
);
const PBLDashboard = lazy(() =>
  import('./components/pbl/PBLDashboard').then((module) => ({ default: module.PBLDashboard }))
);
const SimuladoEngine = lazy(() =>
  import('./components/SimuladoEngine').then((module) => ({ default: module.SimuladoEngine }))
);
const CadernoDeErros = lazy(() =>
  import('./components/CadernoDeErros').then((module) => ({ default: module.CadernoDeErros }))
);
const FlashcardPractice = lazy(() =>
  import('./components/FlashcardPractice').then((module) => ({ default: module.FlashcardPractice }))
);
const DecisionTreeViewer = lazy(() =>
  import('./components/DecisionTreeViewer').then((module) => ({ default: module.DecisionTreeViewer }))
);
const StudyPlanner = lazy(() =>
  import('./components/StudyPlanner').then((module) => ({ default: module.StudyPlanner }))
);
const ProfessorSuvecaModal = lazy(() =>
  import('./components/ProfessorSuvecaModal').then((module) => ({ default: module.ProfessorSuvecaModal }))
);
const SearchModal = lazy(() =>
  import('./components/SearchModal').then((module) => ({ default: module.SearchModal }))
);
const DailyReviewDashboard = lazy(() =>
  import('./components/DailyReviewDashboard').then((module) => ({ default: module.DailyReviewDashboard }))
);
const DuelArena = lazy(() =>
  import('./components/DuelArena').then((module) => ({ default: module.DuelArena }))
);
const StatisticsDashboard = lazy(() =>
  import('./components/StatisticsDashboard').then((module) => ({ default: module.StatisticsDashboard }))
);
const AchievementsProfile = lazy(() =>
  import('./components/AchievementsProfile').then((module) => ({ default: module.AchievementsProfile }))
);
const OfficialQuestionsExplorer = lazy(() =>
  import('./components/OfficialQuestionsExplorer').then((module) => ({ default: module.OfficialQuestionsExplorer }))
);
const PomodoroTimer = lazy(() =>
  import('./components/PomodoroTimer').then((module) => ({ default: module.PomodoroTimer }))
);

const ToolLoading = () => (
  <div className="mx-auto flex min-h-48 max-w-5xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-700 shadow-xs" role="status">
    Carregando ferramenta de estudo…
  </div>
);

const LEGACY_CADERNO_STORAGE_KEY = 'suveca_caderno_erros';
const cadernoStorageKeyFor = (userId?: string | null) =>
  userId ? `suveca_caderno_erros_${userId}` : 'suveca_caderno_erros_guest';

const readStoredErrors = (userId?: string | null): CadernoErroItem[] | null => {
  try {
    // The old key is only ever read for the guest profile. It is intentionally
    // never used to seed a different signed-in account.
    const stored =
      localStorage.getItem(cadernoStorageKeyFor(userId)) ||
      (!userId ? localStorage.getItem(LEGACY_CADERNO_STORAGE_KEY) : null);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Erro ao recuperar o Caderno de Erros local:', error);
    return null;
  }
};

const lastModuleStorageKey = (userId?: string | null) =>
  `suveca_last_module_${userId || 'guest'}`;

const unitIdForSection = (section: (typeof MODULES_DATA)[number]['sections'][number]) => {
  const cumulativeMatch = section.contentUrl?.match(/A14-(S\d+)/);
  return section.editorial?.integrationUnitId || (cumulativeMatch ? `IP-A14-${cumulativeMatch[1]}` : null);
};

interface StudyLocation {
  moduleId: string | null;
  unitId: string | null;
  sectionId: string | null;
}

const moduleIdForUnit = (unitId: string | null) => {
  if (!unitId) return null;
  return MODULES_DATA.find((module) => module.sections.some(
    (section) => unitIdForSection(section) === unitId,
  ))?.id || null;
};

const readStudyLocation = (): StudyLocation => {
  const params = new URLSearchParams(window.location.search);
  const unitId = params.get('unit');
  const requestedModule = params.get('module');
  const moduleId = moduleIdForUnit(unitId)
    || (requestedModule && MODULES_DATA.some((module) => module.id === requestedModule) ? requestedModule : null);
  return {
    moduleId,
    unitId: moduleIdForUnit(unitId) ? unitId : null,
    sectionId: /^[a-z][a-z0-9-]*$/.test(params.get('section') || '') ? params.get('section') : null,
  };
};

const writeStudyLocation = (location: StudyLocation, mode: 'push' | 'replace') => {
  const url = new URL(window.location.href);
  const setOrDelete = (key: string, value: string | null) => value
    ? url.searchParams.set(key, value)
    : url.searchParams.delete(key);
  setOrDelete('module', location.moduleId);
  setOrDelete('unit', location.unitId);
  setOrDelete('section', location.sectionId);
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', `${url.pathname}${url.search}${url.hash}`);
};

export default function App() {
  const initialStudyLocation = useRef(readStudyLocation()).current;
  const [activeTab, setActiveTab] = useState<TabType>('modules');
  const lastNonPomodoroTab = useRef<TabType>('modules');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialStudyLocation.moduleId || 'mod-intro');
  const [openUnitId, setOpenUnitId] = useState<string | null>(initialStudyLocation.unitId);
  const [openUnitSectionId, setOpenUnitSectionId] = useState<string | null>(initialStudyLocation.sectionId);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [tutorContext, setTutorContext] = useState<string>('');
  const [isImmersiveFocus, setIsImmersiveFocus] = useState(false);
  const [officialSimuladoQuestions, setOfficialSimuladoQuestions] = useState<QuizQuestion[] | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => !hasCompletedOnboarding());

  useEffect(() => {
    if (activeTab !== 'pomodoro') lastNonPomodoroTab.current = activeTab;
  }, [activeTab]);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cadernoReadyFor, setCadernoReadyFor] = useState<string | null>('guest');
  const authHydrationId = useRef(0);
  const { metrics, markModuleVisited, addAttempt, markSectionRead, recordModulePractice } = useLearningMetrics(user);
  const {
    progress: achievementProgress,
    isLoading: isLoadingAchievements,
    recordNote,
    recordAnswer,
    recordStudyActivity,
  } = useAchievements(user);

  // Caderno de Erros state
  const [cadernoErrors, setCadernoErrors] = useState<CadernoErroItem[]>(
    () => readStoredErrors() || []
  );

  useEffect(() => {
    const handlePopState = () => {
      const location = readStudyLocation();
      setSelectedModuleId(location.moduleId || 'mod-intro');
      setOpenUnitId(location.unitId);
      setOpenUnitSectionId(location.sectionId);
      setActiveTab('modules');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Track auth changes and load Firestore data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const hydrationId = ++authHydrationId.current;
      const currentUserId = currentUser?.uid || null;

      // Prevent an effect from saving the previous account's in-memory Caderno
      // while this account's private document is still being fetched.
      setCadernoReadyFor(null);
      setUser(currentUser);
      const savedModule = localStorage.getItem(lastModuleStorageKey(currentUserId));
      if (!readStudyLocation().moduleId && savedModule && MODULES_DATA.some((module) => module.id === savedModule)) {
        setSelectedModuleId(savedModule);
      }

      if (!currentUser || !currentUserId) {
        setCadernoErrors(readStoredErrors() || []);
        setCadernoReadyFor('guest');
        setIsSyncing(false);
        return;
      }

      const localErrors = readStoredErrors(currentUserId) || [];
      setCadernoErrors(localErrors);
      setIsSyncing(true);

      try {
        const userDocRef = doc(db, 'users', currentUserId);
        await setDoc(
          userDocRef,
          {
            uid: currentUserId,
            displayName: currentUser.displayName || '',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || '',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        const userErrorsRef = doc(db, 'users', currentUserId, 'data', 'caderno_erros');
        const docSnap = await getDoc(userErrorsRef);
        if (hydrationId !== authHydrationId.current) return;

        let resolvedErrors = localErrors;
        if (docSnap.exists()) {
          const items = docSnap.data()?.items;
          if (Array.isArray(items)) resolvedErrors = items as CadernoErroItem[];
        } else {
          await setDoc(userErrorsRef, {
            items: localErrors,
            updatedAt: new Date().toISOString(),
          });
        }

        if (hydrationId === authHydrationId.current) {
          setCadernoErrors(resolvedErrors);
          localStorage.setItem(cadernoStorageKeyFor(currentUserId), JSON.stringify(resolvedErrors));
        }
      } catch (err) {
        console.error('Erro ao sincronizar com Firestore:', err);
      } finally {
        if (hydrationId === authHydrationId.current) {
          setCadernoReadyFor(currentUserId);
          setIsSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Save Caderno de Erros locally & to Firestore if logged in
  useEffect(() => {
    const storageUserId = user?.uid || null;
    const activeScope = storageUserId || 'guest';
    if (cadernoReadyFor !== activeScope) return;

    localStorage.setItem(cadernoStorageKeyFor(storageUserId), JSON.stringify(cadernoErrors));

    if (storageUserId) {
      const syncToCloud = async () => {
        setIsSyncing(true);
        try {
          const userErrorsRef = doc(db, 'users', storageUserId, 'data', 'caderno_erros');
          await setDoc(userErrorsRef, {
            items: cadernoErrors,
            updatedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Erro ao salvar no Firestore:', err);
        } finally {
          setIsSyncing(false);
        }
      };

      const timer = setTimeout(() => {
        syncToCloud();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [cadernoErrors, cadernoReadyFor, user?.uid]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Erro ao realizar login Google:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Erro ao realizar logout:', err);
    }
  };

  // Global Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isImmersiveFocus) {
        setIsImmersiveFocus(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersiveFocus]);

  const handleAddError = (newErr: CadernoErroItem) => {
    setCadernoErrors((prev) => [newErr, ...prev]);
  };

  const handleAddErrorDirect = (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata: Partial<CadernoErroItem> = {}
  ) => {
    const newItem: CadernoErroItem = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      date: new Date().toLocaleDateString('pt-BR'),
      conteudo,
      erroCometido,
      regraDecisiva,
      novoExemplo: 'Aplicar a regra decisiva em nova bateria de questões.',
      status: 'dia0',
      origin: 'manual',
      ...metadata,
    };
    setCadernoErrors((prev) => {
      const duplicateIndex = metadata.questionId
        ? prev.findIndex((item) => item.questionId === metadata.questionId && item.origin === newItem.origin)
        : -1;
      if (duplicateIndex < 0) return [newItem, ...prev];
      const existing = prev[duplicateIndex];
      return [{ ...existing, ...newItem, id: existing.id }, ...prev.filter((_, index) => index !== duplicateIndex)];
    });
  };

  const handleUpdateErrorStatus = (
    id: string,
    status: CadernoErroItem['status'],
    review?: Pick<CadernoErroItem, 'lastReviewedAt' | 'nextReviewAt'>
  ) => {
    setCadernoErrors((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, ...review } : item))
    );
  };

  const handleDeleteError = (id: string) => {
    setCadernoErrors((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenTutorWithContext = (ctx: string) => {
    setTutorContext(ctx);
    setIsTutorOpen(true);
  };

  const handlePracticeConcept = async (conceptIds: string[], moduleId: string) => {
    const module = MODULES_DATA.find((item) => item.id === moduleId);
    const authorialFallback = () => (module?.questions || []).map((question) => ({
      ...question,
      origin: 'authorial' as const,
      moduleId,
      conceptIds,
    }));
    let selectedQuestions: QuizQuestion[] = [];
    try {
      const sample = await fetchOfficialQuestionSample(
        { conceptId: conceptIds[0], moduleId },
        5
      );
      selectedQuestions = sample.questions.length
        ? sample.questions.map(officialDetailToQuizQuestion)
        : authorialFallback();
    } catch {
      selectedQuestions = authorialFallback();
    }
    if (!selectedQuestions.length) {
      setActiveTab('questions');
      return;
    }
    setOfficialSimuladoQuestions(selectedQuestions);
    setActiveTab('simulado');
  };

  const handleSelectModule = (id: string) => {
    setSelectedModuleId(id);
    setOpenUnitId(null);
    setOpenUnitSectionId(null);
    writeStudyLocation({ moduleId: id, unitId: null, sectionId: null }, 'push');
    localStorage.setItem(lastModuleStorageKey(user?.uid), id);
    markModuleVisited(id);
  };

  const handleOpenUnitChange = (unitId: string | null, sectionId: string | null = null) => {
    const moduleId = moduleIdForUnit(unitId) || selectedModuleId;
    const isNewUnit = unitId !== openUnitId;
    setSelectedModuleId(moduleId);
    setOpenUnitId(unitId);
    setOpenUnitSectionId(sectionId);
    writeStudyLocation({ moduleId, unitId, sectionId }, isNewUnit ? 'push' : 'replace');
  };

  // Find simulado questions
  const simuladoModule = MODULES_DATA.find((m) => m.id === 'simulado');
  const simuladoQuestions = simuladoModule?.questions || [];
  const coreModules = MODULES_DATA.filter((module) => /^mod\d+$/.test(module.id));
  const selectedCurriculumModule = coreModules.find((module) => module.id === selectedModuleId) || coreModules[0];
  const visitedCoreModules = metrics.visitedModuleIds.filter((id) =>
    coreModules.some((module) => module.id === id)
  ).length;
  const totalCoreSections = coreModules.reduce((total, module) => total + module.sections.length, 0);
  const corePractice = Object.entries(metrics.modulePractice).reduce(
    (summary, [moduleId, practice]) => coreModules.some((module) => module.id === moduleId)
      ? { answered: summary.answered + practice.answered, correct: summary.correct + practice.correct }
      : summary,
    { answered: 0, correct: 0 }
  );
  const activeStudyStreak = getActiveStudyStreak(achievementProgress);
  const hasStudiedToday = achievementProgress.lastStudyDate === studyDayKey();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)] font-sans flex flex-col relative overflow-x-hidden">
      {/* Editorial Navigation */}
      {!isImmersiveFocus && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'tutor') {
              setIsTutorOpen(true);
            } else {
              if (tab === 'simulado') setOfficialSimuladoQuestions(null);
              setActiveTab(tab);
            }
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          errorCount={cadernoErrors.filter((e) => e.status !== 'dominado').length}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isSyncing={isSyncing}
          studyStreak={activeStudyStreak}
          hasStudiedToday={hasStudiedToday}
          longestStudyStreak={achievementProgress.longestStudyStreak}
          onOpenChallenge={() => setActiveTab('duel')}
        />
      )}

      {/* Main Content Area */}
      <main className={`${
        isImmersiveFocus
          ? 'mx-auto w-full flex-1 px-4 py-4 sm:px-6 lg:px-10'
          : 'app-content-shell py-4 sm:py-6 pb-28 lg:pb-8 flex-1'
      }`}>
        <DailyReviewReminder
          errors={cadernoErrors}
          userId={user?.uid}
          hidden={activeTab !== 'errors' || isImmersiveFocus}
        />
        <div key={activeTab} className="tab-content-enter">
          <ErrorBoundary key={activeTab}>
            <Suspense fallback={<ToolLoading />}>
            {activeTab === 'modules' && (
              <div className="space-y-6">
                {!isImmersiveFocus && (
                  <>
                    {selectedCurriculumModule && (
                      <SuvecaMethodBanner
                        module={selectedCurriculumModule}
                        onOpenAnalyzer={() => setActiveTab('analyzer')}
                      />
                    )}
                    {/* Linha 1 do Dashboard: Continue de onde parou + Meta Semanal de Estudo */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                      <ContinueLearningCard
                        module={selectedCurriculumModule}
                        pendingErrors={cadernoErrors.filter((error) => error.status !== 'dominado')}
                        onContinueModule={() => markModuleVisited(selectedModuleId)}
                        onReview={() => setActiveTab('agenda')}
                      />
                      <WeeklyGoalCard
                        readSectionIdsCount={metrics.readSectionIds.length}
                        practiceAnsweredCount={
                          Object.keys(metrics.modulePractice || {}).length * 4 +
                          (metrics.readSectionIds.length > 0 ? 4 : 0)
                        }
                        userId={user?.uid}
                      />
                    </div>
                    {/* Linha 2 do Dashboard: Dica do Dia */}
                    <DailyTipCard
                      onOpenModule={(id) => {
                        handleSelectModule(id);
                        setActiveTab('modules');
                      }}
                    />
                  </>
                )}
                <ModuleViewer
                  modules={MODULES_DATA}
                  selectedModuleId={selectedModuleId}
                  onSelectModule={handleSelectModule}
                  onAskTutor={handleOpenTutorWithContext}
                  onRecordError={handleAddErrorDirect}
                  user={user}
                  onNoteSaved={recordNote}
                  onAnswerResult={recordAnswer}
                  onSectionRead={markSectionRead}
                  readSectionIds={metrics.readSectionIds}
                  onPracticeResult={recordModulePractice}
                  onPracticeConcept={handlePracticeConcept}
                  onCompleteModule={() => recordStudyActivity()}
                  errors={cadernoErrors}
                  userId={user?.uid}
                  onUpdateErrorStatus={handleUpdateErrorStatus}
                  isFocusMode={isImmersiveFocus}
                  onToggleFocusMode={() => setIsImmersiveFocus((current) => !current)}
                  openUnitId={openUnitId}
                  openUnitSectionId={openUnitSectionId}
                  onOpenUnitChange={handleOpenUnitChange}
                />
              </div>
            )}

            {activeTab === 'pbl' && (
              <PBLDashboard
                userId={user?.uid || 'guest'}
                onAddErrorToNotebook={handleAddErrorDirect}
                onRecordAttempt={recordAnswer}
                onCompleteSession={() => recordStudyActivity()}
                onOpenNotebook={() => setActiveTab('errors')}
                onOpenReview={() => setActiveTab('agenda')}
              />
            )}

            {activeTab === 'analyzer' && (
              <SuvecaAnalyzer
                isFocusMode={isImmersiveFocus}
                onToggleFocusMode={() => setIsImmersiveFocus((current) => !current)}
              />
            )}

            {activeTab === 'simulado' && (
              <div className="space-y-3">
                {officialSimuladoQuestions && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                    <span>
                      {officialSimuladoQuestions.some((q) => q.id.startsWith('recov_')) ? (
                        <>
                          <strong className="text-teal-950">🎯 Simulado de Recuperação do Caderno de Erros:</strong>{' '}
                          {officialSimuladoQuestions.length} questões direcionadas para reverter seus deslizes recentes.
                        </>
                      ) : (
                        <>
                          <strong>{officialSimuladoQuestions.every((question) => question.origin === 'official') ? 'Prática editorial' : 'Prática autoral de apoio'}:</strong>{' '}
                          {officialSimuladoQuestions.length} questões {officialSimuladoQuestions.every((question) => question.origin === 'official') ? 'selecionadas do percurso curricular publicado' : 'identificadas claramente como autorais'}.
                        </>
                      )}
                    </span>
                    <button type="button" className="button-secondary min-h-[44px]" onClick={() => setOfficialSimuladoQuestions(null)}>
                      Voltar ao simulado editorial
                    </button>
                  </div>
                )}
                <SimuladoEngine
                  questions={officialSimuladoQuestions || simuladoQuestions}
                  userId={user?.uid}
                  onAddErrorToNotebook={handleAddErrorDirect}
                  onAnswerResult={recordAnswer}
                  onCompleteAttempt={(attempt) => {
                    addAttempt(attempt);
                    recordStudyActivity();
                  }}
                />
              </div>
            )}

            {activeTab === 'errors' && (
              <CadernoDeErros
                errors={cadernoErrors}
                onAddError={handleAddError}
                onUpdateErrorStatus={handleUpdateErrorStatus}
                onDeleteError={handleDeleteError}
                userId={user?.uid}
                onStartRecoverySimulado={(questions) => {
                  setOfficialSimuladoQuestions(questions);
                  setActiveTab('simulado');
                }}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardPractice
                errors={cadernoErrors}
                onUpdateErrorStatus={handleUpdateErrorStatus}
                userId={user?.uid}
              />
            )}

            {activeTab === 'agenda' && (
              <DailyReviewDashboard
                errors={cadernoErrors}
                userId={user?.uid}
                onOpenErrors={() => setActiveTab('errors')}
              />
            )}

            {activeTab === 'decision' && <DecisionTreeViewer />}

            {activeTab === 'planner' && (
              <StudyPlanner
                errors={cadernoErrors}
                readSectionIds={metrics.readSectionIds}
                onOpenModule={(moduleId) => {
                  setSelectedModuleId(moduleId);
                  setActiveTab('modules');
                }}
              />
            )}

            {activeTab === 'duel' && (
              <DuelArena
                user={user}
                errors={cadernoErrors}
                onAddError={handleAddErrorDirect}
                onAnswerResult={recordAnswer}
                onRoundComplete={recordStudyActivity}
                onNavigateToTab={(tab) => setActiveTab(tab as TabType)}
              />
            )}

            {activeTab === 'questions' && (
              <OfficialQuestionsExplorer
                onStartSimulado={(questions) => {
                  setOfficialSimuladoQuestions(questions);
                  setActiveTab('simulado');
                }}
              />
            )}

            {activeTab === 'stats' && (
              <StatisticsDashboard
                attempts={metrics.attempts}
                errors={cadernoErrors}
                visitedModules={visitedCoreModules}
                totalModules={coreModules.length}
                readSections={metrics.readSectionIds.filter((id) => coreModules.some((module) => id.startsWith(`${module.id}:`))).length}
                totalSections={totalCoreSections}
                practiceAnswered={corePractice.answered}
                practiceCorrect={corePractice.correct}
                userName={user?.displayName}
                onOpenSimulado={() => setActiveTab('simulado')}
                onOpenModule={(modId) => {
                  setSelectedModuleId(modId);
                  setActiveTab('modules');
                }}
              />
            )}

            {activeTab === 'profile' && (
              <AchievementsProfile
                user={user}
                progress={achievementProgress}
                isLoading={isLoadingAchievements}
                onOpenModules={() => setActiveTab('modules')}
                attempts={metrics.attempts}
                pendingErrorCount={cadernoErrors.filter((error) => error.status !== 'dominado').length}
                masteredErrorCount={cadernoErrors.filter((error) => error.status === 'dominado').length}
                readSectionsCount={metrics.readSectionIds.length}
                visitedModulesCount={metrics.visitedModuleIds.length}
                practiceCorrectCount={corePractice.correct}
                onNavigateToTab={(tab) => setActiveTab(tab as TabType)}
                onOpenTour={() => setIsOnboardingOpen(true)}
              />
            )}
            </Suspense>
          </ErrorBoundary>
        </div>
        <Suspense fallback={activeTab === 'pomodoro' ? <ToolLoading /> : null}>
          <PomodoroTimer
            selectedModuleId={selectedModuleId}
            user={user}
            errors={cadernoErrors}
            onAddError={handleAddErrorDirect}
            onAskTutor={handleOpenTutorWithContext}
            onCompleteSession={() => recordStudyActivity()}
            isPageActive={activeTab === 'pomodoro'}
            onMinimize={() => setActiveTab(lastNonPomodoroTab.current)}
            onExpandTab={() => setActiveTab('pomodoro')}
          />
        </Suspense>
      </main>

      {/* Clean Editorial Footer */}
      {!isImmersiveFocus && <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6 px-4 sm:px-8 text-xs text-[var(--text-muted)] text-center sm:flex sm:items-center sm:justify-between gap-4 mt-12">
        <div className="font-medium text-[var(--text)]">
          Método SuVeCA — Português para Concursos
        </div>
        <div className="mt-2 sm:mt-0 text-[13px]">
          Plataforma de estudos com desmembração sintática, apostilas e repetição espaçada.
        </div>
      </footer>}

      {/* Onboarding Guided Tour Modal */}
      <OnboardingTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNavigateToTab={(tab) => {
          if (tab === 'tutor') {
            setIsTutorOpen(true);
          } else {
            setActiveTab(tab as TabType);
          }
        }}
      />

      {/* Modals & Drawers */}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectModule={(id) => {
              handleSelectModule(id);
              setActiveTab('modules');
            }}
            errors={cadernoErrors}
            userId={user?.uid}
            onOpenOfficialQuestions={() => setActiveTab('questions')}
          />
        </Suspense>
      )}

      {isTutorOpen && (
        <Suspense fallback={null}>
          <ProfessorSuvecaModal
            isOpen={isTutorOpen}
            onClose={() => setIsTutorOpen(false)}
            initialContext={tutorContext}
            onSaveRule={(rule, context) => handleAddErrorDirect(
              context || 'Regra explicada pelo Professor SuVeCA',
              'Dúvida identificada durante a tutoria contextual.',
              rule,
              { origin: 'manual', sourceRefs: [] }
            )}
            onOpenFlashcards={() => { setIsTutorOpen(false); setActiveTab('flashcards'); }}
            onOpenPractice={() => { setIsTutorOpen(false); setActiveTab('questions'); }}
          />
        </Suspense>
      )}
    </div>
  );
}
