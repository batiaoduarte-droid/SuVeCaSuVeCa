import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CadernoErroItem, ErrorFlashcard, FlashcardRating } from '../types/suveca';
import { auth, db, onAuthStateChanged } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Lightbulb,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toLearnerFacingContent } from '../lib/learnerContent';
import { deriveErrorReviewStatus, scheduleFlashcard } from '../lib/spacedRepetition';
import { authenticatedFetch } from '../lib/authenticatedFetch';

const FLASHCARDS_STORAGE_PREFIX = 'suveca_flashcards';
const flashcardsStorageKey = (userId?: string) =>
  `${FLASHCARDS_STORAGE_PREFIX}_${userId || 'guest'}`;
const isCardDue = (card: ErrorFlashcard, now: number) =>
  !card.nextReviewAt || Number.isNaN(Date.parse(card.nextReviewAt)) || Date.parse(card.nextReviewAt) <= now;

const SUVECA_STRUCTURE_CARDS: ErrorFlashcard[] = [
  {
    id: 'suveca_structure_1',
    source: 'suveca',
    topic: 'Sujeito, verbo, complemento e adjunto',
    front: 'Na oração “Os candidatos entregaram os documentos ontem”, identifique Su, Ve, C e A.',
    back: 'Su: Os candidatos. Ve: entregaram. C (objeto direto): os documentos. Aadv: ontem.',
    hint: 'Encontre primeiro o verbo e pergunte quem praticou a ação.',
    createdAt: '2026-01-01T00:00:00.000Z',
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'suveca_structure_2',
    source: 'suveca',
    topic: 'Complementos verbais',
    front: 'Na oração “A professora explicou a regra aos alunos com exemplos claros”, identifique Su, Ve, C e A.',
    back: 'Su: A professora. Ve: explicou. C (OD): a regra. C (OI): aos alunos. Aadv: com exemplos claros.',
    hint: 'O verbo explicar pode ter algo explicado e alguém a quem se explica.',
    createdAt: '2026-01-01T00:00:00.000Z',
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'suveca_structure_3',
    source: 'suveca',
    topic: 'Verbo impessoal',
    front: 'Na oração “Havia muitas dúvidas na reunião”, identifique Su, Ve, C e A.',
    back: 'Su: inexistente (haver com sentido de existir é impessoal). Ve: havia. C (OD): muitas dúvidas. Aadv: na reunião.',
    hint: 'Com sentido de existir, “haver” fica no singular e não tem sujeito.',
    createdAt: '2026-01-01T00:00:00.000Z',
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'suveca_structure_4',
    source: 'suveca',
    topic: 'Ordem inversa',
    front: 'Na oração “Chegaram cedo os novos analistas”, identifique Su, Ve, C e A.',
    back: 'Su: os novos analistas (posposto). Ve: chegaram. C: não há. Aadv: cedo.',
    hint: 'A posição depois do verbo não impede que o termo seja sujeito.',
    createdAt: '2026-01-01T00:00:00.000Z',
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'suveca_structure_5',
    source: 'suveca',
    topic: 'Regência verbal',
    front: 'Na oração “Os servidores precisam de orientação imediata”, identifique Su, Ve, C e A.',
    back: 'Su: Os servidores. Ve: precisam. C (OI): de orientação imediata. A: “imediata” é adjunto adnominal de orientação.',
    hint: 'Quem precisa, precisa de algo.',
    createdAt: '2026-01-01T00:00:00.000Z',
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'suveca_structure_6',
    source: 'suveca',
    topic: 'Voz passiva',
    front: 'Na oração “No fim da tarde, o edital foi publicado pelo órgão”, identifique Su, Ve, C e A.',
    back: 'Aadv: No fim da tarde. Su paciente: o edital. Ve: foi publicado. C: não há. “pelo órgão” é agente da passiva.',
    hint: 'Na passiva analítica, localize a locução “ser + particípio”.',
    createdAt: '2026-01-01T00:00:00.000Z',
    correctCount: 0,
    incorrectCount: 0,
  },
];

interface FlashcardPracticeProps {
  errors: CadernoErroItem[];
  onUpdateErrorStatus: (
    id: string,
    status: CadernoErroItem['status'],
    review?: Pick<CadernoErroItem, 'lastReviewedAt' | 'nextReviewAt'>
  ) => void;
  userId?: string;
}

const isFlashcard = (value: unknown): value is ErrorFlashcard => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<ErrorFlashcard>;
  return (
    typeof card.id === 'string' &&
    (card.source === 'caderno' || card.source === 'suveca') &&
    typeof card.topic === 'string' &&
    typeof card.front === 'string' &&
    typeof card.back === 'string'
  );
};

const mergeStructureCards = (savedCards: ErrorFlashcard[]): ErrorFlashcard[] => {
  const savedById = new Map(savedCards.map((card) => [card.id, card]));
  const structureCards = SUVECA_STRUCTURE_CARDS.map((card) => ({
    ...card,
    ...savedById.get(card.id),
    source: 'suveca' as const,
  }));
  const cadernoCards = savedCards.filter((card) => card.source === 'caderno');
  return [...structureCards, ...cadernoCards];
};

export const FlashcardPractice: React.FC<FlashcardPracticeProps> = ({
  errors,
  onUpdateErrorStatus,
  userId,
}) => {
  const [authUserId, setAuthUserId] = useState<string | undefined>(() => auth.currentUser?.uid);
  const resolvedUserId = userId ?? authUserId;
  const storageKey = flashcardsStorageKey(resolvedUserId);
  const flashcardScopeRef = useRef(storageKey);
  const [flashcards, setFlashcards] = useState<ErrorFlashcard[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(isFlashcard)) return mergeStructureCards(parsed);
      }
    } catch (error) {
      console.error('Não foi possível ler os flashcards locais:', error);
    }
    return SUVECA_STRUCTURE_CARDS;
  });
  const [mode, setMode] = useState<'caderno' | 'suveca'>('caderno');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);
  const [reviewResult, setReviewResult] = useState<'correct' | 'incorrect' | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [reviewClock, setReviewClock] = useState(() => Date.now());
  const visibleFlashcards =
    flashcardScopeRef.current === storageKey ? flashcards : SUVECA_STRUCTURE_CARDS;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthUserId(currentUser?.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setReviewClock(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    flashcardScopeRef.current = storageKey;
    setFlashcards(SUVECA_STRUCTURE_CARDS);
    setActiveCardId(null);
    setIsAnswerVisible(false);
    setIsHintVisible(false);
    setIsExplanationVisible(false);
    setReviewResult(null);
    setReviewFeedback(null);

    const loadFlashcards = async () => {
      let localCards = SUVECA_STRUCTURE_CARDS;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.every(isFlashcard)) {
            localCards = mergeStructureCards(parsed);
          }
        }
      } catch (error) {
        console.error('Não foi possível carregar os flashcards locais:', error);
      }

      if (!resolvedUserId) {
        if (active) setFlashcards(localCards);
        return;
      }

      try {
        const ref = doc(db, 'users', resolvedUserId, 'data', 'flashcards_caderno');
        const snapshot = await getDoc(ref);
        const cloudCards = snapshot.data()?.items;
        if (snapshot.exists() && Array.isArray(cloudCards) && cloudCards.every(isFlashcard)) {
          if (active) setFlashcards(mergeStructureCards(cloudCards));
        } else {
          const initialCards = mergeStructureCards(localCards);
          await setDoc(ref, { items: initialCards, updatedAt: new Date().toISOString() });
          if (active) setFlashcards(initialCards);
        }
      } catch (error) {
        console.error('Não foi possível sincronizar os flashcards:', error);
        if (active) setFlashcards(localCards);
      }
    };

    void loadFlashcards();
    return () => {
      active = false;
    };
  }, [resolvedUserId, storageKey]);

  const persistFlashcards = async (nextCards: ErrorFlashcard[]) => {
    localStorage.setItem(storageKey, JSON.stringify(nextCards));
    if (!resolvedUserId) return;

    try {
      await setDoc(doc(db, 'users', resolvedUserId, 'data', 'flashcards_caderno'), {
        items: nextCards,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Não foi possível salvar os flashcards:', error);
    }
  };

  const cadernoCards = useMemo(
    () =>
      visibleFlashcards.filter(
        (card) => card.source === 'caderno' && !!card.errorId && errors.some((error) => error.id === card.errorId)
      ),
    [errors, visibleFlashcards]
  );
  const suvecaCards = useMemo(
    () => visibleFlashcards.filter((card) => card.source === 'suveca'),
    [visibleFlashcards]
  );
  const dueCadernoCards = useMemo(
    () => cadernoCards.filter((card) => isCardDue(card, reviewClock)),
    [cadernoCards, reviewClock]
  );
  const dueSuvecaCards = useMemo(
    () => suvecaCards.filter((card) => isCardDue(card, reviewClock)),
    [reviewClock, suvecaCards]
  );
  const activeCards = mode === 'caderno' ? dueCadernoCards : dueSuvecaCards;
  const reviewedCard = reviewResult
    ? visibleFlashcards.find((card) => card.id === activeCardId)
    : undefined;
  const activeCard = reviewedCard || activeCards.find((card) => card.id === activeCardId) || activeCards[0];
  const errorsWithoutCards = errors.filter(
    (error) => !cadernoCards.some((card) => card.errorId === error.id)
  );

  useEffect(() => {
    if (reviewResult) return;
    if (activeCardId && activeCards.some((card) => card.id === activeCardId)) return;
    const next = activeCards.length
      ? activeCards[Math.floor(Math.random() * activeCards.length)]
      : null;
    setActiveCardId(next?.id || null);
    setIsAnswerVisible(false);
    setIsHintVisible(false);
    setIsExplanationVisible(false);
    setReviewResult(null);
    setReviewFeedback(null);
  }, [activeCardId, activeCards, reviewResult]);

  const switchMode = (nextMode: 'caderno' | 'suveca') => {
    setMode(nextMode);
    setActiveCardId(null);
    setIsAnswerVisible(false);
    setIsHintVisible(false);
    setIsExplanationVisible(false);
    setReviewResult(null);
    setReviewFeedback(null);
  };

  const chooseNextCard = () => {
    if (!activeCards.length) return;
    const alternatives = activeCards.filter((card) => card.id !== activeCard?.id);
    const pool = alternatives.length ? alternatives : activeCards;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setActiveCardId(next.id);
    setIsAnswerVisible(false);
    setIsHintVisible(false);
    setIsExplanationVisible(false);
    setReviewResult(null);
    setReviewFeedback(null);
  };

  const generateFlashcardsForError = async (error: CadernoErroItem) => {
    setIsGeneratingFor(error.id);
    setGenerationMessage(null);
    try {
      const response = await authenticatedFetch('/api/gemini/generate-error-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error, count: 2 }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.flashcards)) {
        throw new Error(data.error || 'A IA não retornou flashcards válidos.');
      }

      const now = new Date().toISOString();
      const generatedCards: ErrorFlashcard[] = data.flashcards
        .filter((card: unknown) => {
          if (!card || typeof card !== 'object') return false;
          const candidate = card as { front?: unknown; back?: unknown; hint?: unknown; explanation?: unknown };
          return typeof candidate.front === 'string' && typeof candidate.back === 'string';
        })
        .map((card: { front: string; back: string; hint?: string; explanation?: string; sourceRefs?: unknown }, index: number) => ({
          id: `flash_${error.id}_${Date.now()}_${index}`,
          errorId: error.id,
          source: 'caderno',
          topic: error.conteudo,
          front: toLearnerFacingContent(card.front),
          back: toLearnerFacingContent(card.back),
          hint: toLearnerFacingContent(card.hint) || undefined,
          explanation: toLearnerFacingContent(card.explanation) || undefined,
          sourceRefs: Array.isArray(card.sourceRefs)
            ? card.sourceRefs.filter((reference): reference is string => typeof reference === 'string')
            : undefined,
          createdAt: now,
          correctCount: 0,
          incorrectCount: 0,
        }));

      if (!generatedCards.length) throw new Error('Nenhum card aproveitável foi gerado.');

      const nextCards = [...flashcards.filter((card) => card.errorId !== error.id), ...generatedCards];
      setFlashcards(nextCards);
      await persistFlashcards(nextCards);
      setMode('caderno');
      setActiveCardId(generatedCards[0].id);
      setIsAnswerVisible(false);
      setIsHintVisible(false);
      setIsExplanationVisible(false);
      setReviewResult(null);
      setGenerationMessage(`Criamos ${generatedCards.length} flashcards para “${error.conteudo}”.`);
    } catch (error) {
      console.error('Não foi possível gerar os flashcards:', error);
      setGenerationMessage(
        error instanceof Error ? error.message : 'Não foi possível gerar os flashcards agora.'
      );
    } finally {
      setIsGeneratingFor(null);
    }
  };

  const generateAllPendingCards = async () => {
    if (!errorsWithoutCards.length) return;
    setIsGeneratingFor('all');
    setGenerationMessage(null);

    let generated = 0;
    let nextCards = flashcards;
    for (const error of errorsWithoutCards) {
      try {
        const response = await authenticatedFetch('/api/gemini/generate-error-flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error, count: 2 }),
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.flashcards)) continue;

        const now = new Date().toISOString();
        const newCards: ErrorFlashcard[] = data.flashcards
          .filter((card: unknown) => {
            if (!card || typeof card !== 'object') return false;
            const candidate = card as { front?: unknown; back?: unknown };
            return typeof candidate.front === 'string' && typeof candidate.back === 'string';
          })
          .map((card: { front: string; back: string; hint?: string; explanation?: string; sourceRefs?: unknown }, index: number) => ({
            id: `flash_${error.id}_${Date.now()}_${index}`,
            errorId: error.id,
            source: 'caderno',
            topic: error.conteudo,
            front: toLearnerFacingContent(card.front),
            back: toLearnerFacingContent(card.back),
            hint: toLearnerFacingContent(card.hint) || undefined,
            explanation: toLearnerFacingContent(card.explanation) || undefined,
            sourceRefs: Array.isArray(card.sourceRefs)
              ? card.sourceRefs.filter((reference): reference is string => typeof reference === 'string')
              : undefined,
            createdAt: now,
            correctCount: 0,
            incorrectCount: 0,
        }));

        if (newCards.length) {
          nextCards = [...nextCards.filter((card) => card.errorId !== error.id), ...newCards];
          generated += newCards.length;
        }
      } catch (error) {
        console.error(`Não foi possível gerar cards para ${error.id}:`, error);
      }
    }

    if (generated) {
      setFlashcards(nextCards);
      await persistFlashcards(nextCards);
      setMode('caderno');
    }
    setIsGeneratingFor(null);
    setGenerationMessage(
      generated
        ? `${generated} flashcards foram gerados para sua revisão ativa.`
        : 'Não foi possível gerar cards para os erros pendentes agora.'
    );
  };

  const handleReview = (rating: FlashcardRating) => {
    if (!activeCard || reviewResult) return;
    const now = new Date();
    if (!isCardDue(activeCard, now.getTime())) return;

    const relatedError =
      activeCard.source === 'caderno' && activeCard.errorId
        ? errors.find((error) => error.id === activeCard.errorId)
        : undefined;
    const scheduledCard = scheduleFlashcard(activeCard, rating, isHintVisible, now);
    const nextCards = flashcards.map((card) => card.id === activeCard.id ? scheduledCard : card);
    setFlashcards(nextCards);
    void persistFlashcards(nextCards);
    setReviewResult(scheduledCard.lastRating === 'again' ? 'incorrect' : 'correct');
    setReviewClock(now.getTime());

    if (relatedError) {
      const relatedCards = nextCards.filter((card) => card.errorId === relatedError.id);
      const nextStatus = deriveErrorReviewStatus(relatedCards);
      const nextRuleReview = relatedCards
        .map((card) => card.nextReviewAt)
        .filter((date): date is string => Boolean(date))
        .sort()[0];
      onUpdateErrorStatus(relatedError.id, nextStatus, {
        lastReviewedAt: now.toISOString(),
        nextReviewAt: nextRuleReview,
      });
      setReviewFeedback(
        nextStatus === 'dominado'
          ? 'Todos os cartões desta regra demonstraram domínio sem ajuda. Regra dominada!'
          : scheduledCard.lastRating === 'again'
          ? 'Este cartão volta em cerca de 4 horas; os demais mantêm seus próprios intervalos.'
          : `Cartão agendado individualmente para ${Math.max(1, Math.round((scheduledCard.intervalDays || 0) * 24))} hora(s). A regra avança pelo cartão mais frágil.`
      );
    } else {
      setReviewFeedback(
        scheduledCard.lastRating !== 'again'
          ? 'Ótimo! Esta oração entrou no seu próximo ciclo de revisão.'
          : 'Sem problema: esta oração voltará em um intervalo curto para reforço.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Revisão ativa com Flashcards</h1>
              <p className="text-xs text-slate-600 mt-1">
                Gere cards com a Regra Decisiva do seu Caderno ou treine a identificação de Su + Ve + C + A em orações aleatórias.
              </p>
            </div>
          </div>
          {errorsWithoutCards.length > 0 && (
            <button
              type="button"
              onClick={generateAllPendingCards}
              disabled={isGeneratingFor !== null}
              className="button-primary min-h-[44px] text-xs px-4 py-2.5 shrink-0"
            >
              {isGeneratingFor === 'all' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gerando cards...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar cards pendentes ({errorsWithoutCards.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        {generationMessage && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" aria-live="polite">
            {generationMessage}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {errors.slice(0, 6).map((error) => {
            const hasCards = cadernoCards.some((card) => card.errorId === error.id);
            const generating = isGeneratingFor === error.id || isGeneratingFor === 'all';
            return (
              <div key={error.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{error.conteudo}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{hasCards ? 'Cards prontos para revisão' : 'Sem cards gerados'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void generateFlashcardsForError(error)}
                  disabled={isGeneratingFor !== null}
                  className="min-h-[44px] text-xs font-bold text-violet-800 bg-white border border-violet-200 hover:bg-violet-50 rounded-lg px-2.5 py-2 shrink-0 transition disabled:opacity-60"
                >
                  {generating ? 'Gerando...' : hasCards ? 'Gerar de novo' : 'Gerar IA'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold" role="group" aria-label="Tipo de flashcard">
        <button
          type="button"
          onClick={() => switchMode('caderno')}
          aria-pressed={mode === 'caderno'}
          className={`flex-1 min-h-[44px] rounded-xl px-3 py-2.5 transition ${
            mode === 'caderno' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Meu Caderno ({dueCadernoCards.length}/{cadernoCards.length})
        </button>
        <button
          type="button"
          onClick={() => switchMode('suveca')}
          aria-pressed={mode === 'suveca'}
          className={`flex-1 min-h-[44px] rounded-xl px-3 py-2.5 transition ${
            mode === 'suveca' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Orações Su+Ve+C+A ({dueSuvecaCards.length}/{suvecaCards.length})
        </button>
      </div>

      {!activeCard ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-xs">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            {mode === 'caderno' && cadernoCards.length
              ? 'Nenhum card do Caderno está devido agora'
              : mode === 'suveca' && suvecaCards.length
              ? 'Nenhuma oração está devida agora'
              : 'Ainda não há cards para esta revisão'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {mode === 'caderno' && cadernoCards.length
              ? 'O intervalo de repetição espaçada está ativo. Volte no horário programado ou pratique as orações Su+Ve+C+A.'
              : 'Gere cards com IA para algum erro acima ou pratique as orações na aba ao lado enquanto registra novos erros.'}
          </p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5 tab-content-enter">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-violet-800 bg-violet-50 border border-violet-200 rounded-full px-3 py-1">
              {activeCard.topic}
            </span>
            <span className="text-[11px] text-slate-500">
              {activeCard.correctCount} domínio(s) · {activeCard.incorrectCount} revisão(ões)
            </span>
          </div>

          <div className="min-h-40 flex flex-col justify-center rounded-2xl bg-slate-50 border border-slate-200 p-5 sm:p-7">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Pergunta</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">{toLearnerFacingContent(activeCard.front)}</p>
            {activeCard.hint && !isAnswerVisible && (
              <div className="mt-4">
                {!isHintVisible ? (
                  <button
                    type="button"
                    onClick={() => setIsHintVisible(true)}
                    aria-expanded="false"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-800 transition hover:bg-violet-50"
                  >
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                    Ver dica
                  </button>
                ) : (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-950" role="note">
                    <strong className="mb-1 flex items-center gap-2 text-violet-900">
                      <Lightbulb className="h-4 w-4" aria-hidden="true" /> Dica
                    </strong>
                    <p>{toLearnerFacingContent(activeCard.hint)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isAnswerVisible ? (
            <button type="button" onClick={() => setIsAnswerVisible(true)} className="button-primary min-h-[48px] w-full py-3 text-sm">
              Mostrar resposta
            </button>
          ) : (
            <>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 tab-content-enter">
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-800 block mb-2">Resposta</span>
                <p className="text-sm text-emerald-950 leading-relaxed font-medium">{toLearnerFacingContent(activeCard.back)}</p>
              </div>

              {activeCard.explanation && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsExplanationVisible((visible) => !visible)}
                    aria-expanded={isExplanationVisible}
                    aria-controls={`flashcard-explanation-${activeCard.id}`}
                    className="mx-auto flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-50"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {isExplanationVisible ? 'Ocultar explicação' : 'Ver explicação'}
                    {isExplanationVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isExplanationVisible && (
                    <div
                      id={`flashcard-explanation-${activeCard.id}`}
                      className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 text-sm leading-relaxed text-slate-800 tab-content-enter"
                    >
                      <strong className="mb-2 block text-teal-950">Por que isso acontece?</strong>
                      <p className="whitespace-pre-wrap">{toLearnerFacingContent(activeCard.explanation)}</p>
                    </div>
                  )}
                </div>
              )}

              {reviewResult ? (
                <div className={`rounded-xl p-3 border text-xs font-semibold flex items-center justify-between gap-3 ${
                  reviewResult === 'correct'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span>
                    {reviewFeedback ||
                      (reviewResult === 'correct'
                        ? 'Ótimo! O desempenho foi registrado.'
                        : 'Sem problema: este conteúdo voltará para revisão.')}
                  </span>
                  <button type="button" onClick={chooseNextCard} className="button-secondary min-h-[44px] text-xs px-3 py-2 whitespace-nowrap">
                    Próximo <ChevronRight className="w-3.5 h-3.5 text-teal-700" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" aria-label="Avalie a qualidade da recordação">
                  <button
                    type="button"
                    onClick={() => handleReview('again')}
                    className="min-h-[48px] bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl py-3 px-3 text-sm font-bold transition flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" /> Errei
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview('hard')}
                    className="min-h-[48px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl py-3 px-3 text-sm font-bold transition"
                  >
                    Difícil
                  </button>
                  <button type="button" onClick={() => handleReview('good')} className="min-h-[48px] bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl py-3 px-3 text-sm font-bold transition">
                    Bom
                  </button>
                  <button type="button" onClick={() => handleReview('easy')} className="min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-3 px-3 text-sm font-bold transition flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Fácil
                  </button>
                </div>
              )}
            </>
          )}

          {!reviewResult && (
            <button type="button" onClick={chooseNextCard} className="min-h-[44px] text-xs font-semibold text-slate-500 hover:text-teal-800 mx-auto flex items-center gap-1">
              Pular card <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </section>
      )}
    </div>
  );
};
