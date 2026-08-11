import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MODULES_DATA } from './data/modulesData';
import { CadernoErroItem, QuizQuestion } from './types/suveca';
import { Navbar, TabType } from './components/Navbar';
import { DailyTipCard } from './components/DailyTipCard';
import { DailyMotivationCard } from './components/DailyMotivationCard';
import { DailyReviewReminder } from './components/DailyReviewReminder';
import { useLearningMetrics } from './hooks/useLearningMetrics';
import { useAchievements } from './hooks/useAchievements';
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

const ToolLoading = () => (
  <div className="mx-auto flex min-h-48 max-w-5xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-xs" role="status">
    Carregando ferramenta de estudo…
  </div>
);

const INITIAL_SAMPLE_ERRORS: CadernoErroItem[] = [
  {
    id: 'err_sample_1',
    date: '08/08/2026',
    conteudo: 'Concordância com o verbo haver',
    erroCometido: 'Fiz o verbo concordar no plural com o termo posterior ("Houveram muitas dúvidas").',
    regraDecisiva: 'Haver no sentido de existir é impessoal e fica estritamente no singular ("Houve muitas dúvidas").',
    novoExemplo: 'Deve haver mudanças significativas na publicação do próximo edital.',
    status: 'dia0',
  },
  {
    id: 'err_sample_2',
    date: '08/08/2026',
    conteudo: 'Regência do verbo aspirar',
    erroCometido: 'Usei sem preposição no sentido de almejar ("Aspirava o cargo de diretor").',
    regraDecisiva: 'No sentido de desejar/almejar, aspirar é transitivo indireto e exige a preposição "a" ("Aspirava ao cargo").',
    novoExemplo: 'O candidato aspirava a uma vaga de auditor fiscal.',
    status: 'dia1',
  },
];

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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('modules');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('mod0');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [tutorContext, setTutorContext] = useState<string>('');
  const [isImmersiveFocus, setIsImmersiveFocus] = useState(false);
  const [officialSimuladoQuestions, setOfficialSimuladoQuestions] = useState<QuizQuestion[] | null>(null);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cadernoReadyFor, setCadernoReadyFor] = useState<string | null>('guest');
  const authHydrationId = useRef(0);
  const { metrics, markModuleVisited, addAttempt } = useLearningMetrics(user);
  const {
    progress: achievementProgress,
    isLoading: isLoadingAchievements,
    recordNote,
    recordAnswer,
    recordStudyActivity,
  } = useAchievements(user);

  // Caderno de Erros state
  const [cadernoErrors, setCadernoErrors] = useState<CadernoErroItem[]>(
    () => readStoredErrors() || INITIAL_SAMPLE_ERRORS
  );

  // Track auth changes and load Firestore data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const hydrationId = ++authHydrationId.current;
      const currentUserId = currentUser?.uid || null;

      // Prevent an effect from saving the previous account's in-memory Caderno
      // while this account's private document is still being fetched.
      setCadernoReadyFor(null);
      setUser(currentUser);

      if (!currentUser || !currentUserId) {
        setCadernoErrors(readStoredErrors() || INITIAL_SAMPLE_ERRORS);
        setCadernoReadyFor('guest');
        setIsSyncing(false);
        return;
      }

      const localErrors = readStoredErrors(currentUserId) || INITIAL_SAMPLE_ERRORS;
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
    regraDecisiva: string
  ) => {
    const newItem: CadernoErroItem = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      date: new Date().toLocaleDateString('pt-BR'),
      conteudo,
      erroCometido,
      regraDecisiva,
      novoExemplo: 'Aplicar a regra decisiva em nova bateria de questões.',
      status: 'dia0',
    };
    setCadernoErrors((prev) => [newItem, ...prev]);
  };

  const handleUpdateErrorStatus = (
    id: string,
    status: CadernoErroItem['status']
  ) => {
    setCadernoErrors((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleDeleteError = (id: string) => {
    setCadernoErrors((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenTutorWithContext = (ctx: string) => {
    setTutorContext(ctx);
    setIsTutorOpen(true);
  };

  const handleSelectModule = (id: string) => {
    setSelectedModuleId(id);
    markModuleVisited(id);
  };

  // The default module also counts as an explored study unit.
  useEffect(() => {
    markModuleVisited(selectedModuleId);
  }, [markModuleVisited, selectedModuleId]);

  // Find simulado questions
  const simuladoModule = MODULES_DATA.find((m) => m.id === 'simulado');
  const simuladoQuestions = simuladoModule?.questions || [];
  const coreModules = MODULES_DATA.filter((module) => /^mod\d+$/.test(module.id));
  const visitedCoreModules = metrics.visitedModuleIds.filter((id) =>
    coreModules.some((module) => module.id === id)
  ).length;

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
        />
      )}

      {/* Main Content Area */}
      <main className={`${
        isImmersiveFocus
          ? 'mx-auto w-full flex-1 px-4 py-4 sm:px-6 lg:px-10'
          : 'max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8 flex-1 w-full'
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
                    <DailyTipCard
                      onOpenModule={(id) => {
                        handleSelectModule(id);
                        setActiveTab('modules');
                      }}
                    />
                    <DailyMotivationCard />
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
                  onCompleteModule={() => recordStudyActivity()}
                  errors={cadernoErrors}
                  userId={user?.uid}
                  onUpdateErrorStatus={handleUpdateErrorStatus}
                  isFocusMode={isImmersiveFocus}
                  onToggleFocusMode={() => setIsImmersiveFocus((current) => !current)}
                />
              </div>
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
                    <span><strong>Simulado oficial:</strong> {officialSimuladoQuestions.length} questões preservadas por question_id.</span>
                    <button type="button" className="button-secondary min-h-[44px]" onClick={() => setOfficialSimuladoQuestions(null)}>Voltar ao simulado autoral</button>
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

            {activeTab === 'planner' && <StudyPlanner />}

            {activeTab === 'duel' && (
              <DuelArena user={user} onRoundComplete={recordStudyActivity} />
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
                userName={user?.displayName}
                onOpenSimulado={() => setActiveTab('simulado')}
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
              />
            )}
            </Suspense>
          </ErrorBoundary>
        </div>
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
          />
        </Suspense>
      )}

      {isTutorOpen && (
        <Suspense fallback={null}>
          <ProfessorSuvecaModal
            isOpen={isTutorOpen}
            onClose={() => setIsTutorOpen(false)}
            initialContext={tutorContext}
          />
        </Suspense>
      )}
    </div>
  );
}
