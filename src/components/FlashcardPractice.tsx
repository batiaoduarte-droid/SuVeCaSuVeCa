import { TTSPlayer } from '../lib/audio/ttsService';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CadernoErroItem, ErrorFlashcard, FlashcardRating } from '../types/suveca';
import { auth, db, onAuthStateChanged, safeSetDoc } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Headphones,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toLearnerFacingContent } from '../lib/learnerContent';
import { deriveErrorReviewStatus, scheduleFlashcard } from '../lib/spacedRepetition';
import { projectFlashcardContent } from '../lib/flashcardContent';
import { useReviewResource } from '../hooks/useReviewResource';
import { FLASHCARD_CORRECT_XP } from '../lib/masteryLevel';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { EDITORIAL_FLASHCARDS } from '../data/editorialFlashcards.generated';
import { PEDAGOGICAL_KNOWLEDGE_BUILD } from '../data/pedagogicalKnowledge.generated';
import {
  FlashcardBackView,
  StudyBadge,
  StudyCallout,
  StudySurface,
} from './study-visuals';

const FLASHCARDS_STORAGE_PREFIX = 'suveca_flashcards';
const CURRICULUM_BUILD_ID = PEDAGOGICAL_KNOWLEDGE_BUILD.buildId;
const flashcardsStorageKey = (userId?: string) =>
  `${FLASHCARDS_STORAGE_PREFIX}_${CURRICULUM_BUILD_ID}_${userId || 'guest'}`;
const legacyFlashcardsStorageKey = (userId?: string) =>
  `${FLASHCARDS_STORAGE_PREFIX}_${userId || 'guest'}`;
const flashcardsDocumentId = `flashcards_caderno_${CURRICULUM_BUILD_ID}`;
const isCardDue = (card: ErrorFlashcard, now: number) =>
  !card.nextReviewAt || Number.isNaN(Date.parse(card.nextReviewAt)) || Date.parse(card.nextReviewAt) <= now;

const EDITORIAL_CARDS: ErrorFlashcard[] = EDITORIAL_FLASHCARDS.map((card) => ({
  id: card.id,
  moduleId: card.moduleId,
  source: 'suveca',
  topic: card.topic,
  front: card.front,
  back: card.back,
  hint: card.hint,
  explanation: card.explanation,
  sourceRefs: [...card.sourceRefs],
  createdAt: card.createdAt,
  correctCount: card.correctCount,
  incorrectCount: card.incorrectCount,
}));

interface FlashcardPracticeProps {
  errors: CadernoErroItem[];
  onUpdateErrorStatus: (
    id: string,
    status: CadernoErroItem['status'],
    review?: Pick<CadernoErroItem, 'lastReviewedAt' | 'nextReviewAt'>
  ) => void;
  userId?: string;
  /** Quando informado pelo ModuleViewer, limita a base editorial à aula atual. */
  editorialModuleId?: string;
  /** Registra no perfil uma recordação avaliada como correta. */
  onCorrectAnswer?: () => void;
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

const mergeEditorialCards = (savedCards: ErrorFlashcard[]): ErrorFlashcard[] => {
  const savedById = new Map(savedCards.map((card) => [card.id, card]));
  const editorialCards = EDITORIAL_CARDS.map((card) => {
    const saved = savedById.get(card.id);
    if (!saved) return card;
    const merged: ErrorFlashcard = {
      ...card,
      correctCount: typeof saved.correctCount === 'number' ? saved.correctCount : card.correctCount,
      incorrectCount: typeof saved.incorrectCount === 'number' ? saved.incorrectCount : card.incorrectCount,
    };
    if (saved.hintUsedCount !== undefined) merged.hintUsedCount = saved.hintUsedCount;
    if (saved.lastReviewUsedHint !== undefined) merged.lastReviewUsedHint = saved.lastReviewUsedHint;
    if (saved.lastReviewedAt !== undefined) merged.lastReviewedAt = saved.lastReviewedAt;
    if (saved.nextReviewAt !== undefined) merged.nextReviewAt = saved.nextReviewAt;
    if (saved.repetitions !== undefined) merged.repetitions = saved.repetitions;
    if (saved.intervalDays !== undefined) merged.intervalDays = saved.intervalDays;
    if (saved.easeFactor !== undefined) merged.easeFactor = saved.easeFactor;
    if (saved.lapseCount !== undefined) merged.lapseCount = saved.lapseCount;
    if (saved.lastRating !== undefined) merged.lastRating = saved.lastRating;
    if (saved.masteryScore !== undefined) merged.masteryScore = saved.masteryScore;
    return merged;
  });
  const cadernoCards = Array.from(
    new Map(
      savedCards
        .filter((card) => card.source === 'caderno')
        .map((card) => [card.id, card] as const)
    ).values()
  );
  return [...editorialCards, ...cadernoCards];
};

const parseCurrentCards = (value: string | null): ErrorFlashcard[] | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { curriculumBuildId?: unknown; items?: unknown };
    if (
      parsed?.curriculumBuildId === CURRICULUM_BUILD_ID &&
      Array.isArray(parsed.items) &&
      parsed.items.every(isFlashcard)
    ) {
      return mergeEditorialCards(parsed.items);
    }
  } catch {
    // O chamador aplica o fallback seguro.
  }
  return null;
};

const parseLegacyCadernoCards = (value: string | null): ErrorFlashcard[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : [];
    return items.filter(isFlashcard).filter((card) => card.source === 'caderno');
  } catch {
    return [];
  }
};

export const FlashcardPractice: React.FC<FlashcardPracticeProps> = ({
  errors,
  onUpdateErrorStatus,
  userId,
  editorialModuleId,
  onCorrectAnswer,
}) => {
  const [authUserId, setAuthUserId] = useState<string | undefined>(() => auth.currentUser?.uid);
  const resolvedUserId = userId ?? authUserId;
  const storageKey = flashcardsStorageKey(resolvedUserId);
  const flashcardScopeRef = useRef(storageKey);
  const [flashcards, setFlashcards] = useState<ErrorFlashcard[]>(() => {
    const current = parseCurrentCards(localStorage.getItem(storageKey));
    if (current) return current;
    return mergeEditorialCards(
      parseLegacyCadernoCards(localStorage.getItem(legacyFlashcardsStorageKey(resolvedUserId)))
    );
  });
  const [mode, setMode] = useState<'caderno' | 'suveca'>(errors.length ? 'caderno' : 'suveca');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);
  const [reviewResult, setReviewResult] = useState<'correct' | 'incorrect' | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [reviewClock, setReviewClock] = useState(() => Date.now());
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [handsFreeStep, setHandsFreeStep] = useState<'idle' | 'question' | 'thinking' | 'answer' | 'advancing'>('idle');
  const [handsFreeCycle, setHandsFreeCycle] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const ttsRef = useRef<TTSPlayer | null>(null);
  if (!ttsRef.current) ttsRef.current = new TTSPlayer();
  const handsFreeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHandsFreeRef = useRef(isHandsFree);
  isHandsFreeRef.current = isHandsFree;

  const stopAudio = () => {
    ttsRef.current?.stop();
    if (handsFreeTimerRef.current) clearTimeout(handsFreeTimerRef.current);
    handsFreeTimerRef.current = null;
    setIsSpeaking(false); setAudioLoading(false); setHandsFreeStep('idle');
  };
  const speakText = (text: string, onEnd?: () => void) => {
    setIsSpeaking(true); setAudioLoading(true);
    return ttsRef.current!.speak(text, {
      onReady: () => setAudioLoading(false),
      onEnd: () => { setIsSpeaking(false); setAudioLoading(false); onEnd?.(); },
    });
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);
  const visibleFlashcards =
    flashcardScopeRef.current === storageKey ? flashcards : EDITORIAL_CARDS;

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
    setFlashcards(EDITORIAL_CARDS);
    setActiveCardId(null);
    setIsAnswerVisible(false);
    setIsHintVisible(false);
    setIsExplanationVisible(false);
    setReviewResult(null);
    setReviewFeedback(null);

    const loadFlashcards = async () => {
      let localCards = EDITORIAL_CARDS;
      try {
        localCards =
          parseCurrentCards(localStorage.getItem(storageKey)) ??
          mergeEditorialCards(
            parseLegacyCadernoCards(localStorage.getItem(legacyFlashcardsStorageKey(resolvedUserId)))
          );
      } catch (error) {
        console.error('Não foi possível carregar os flashcards locais:', error);
      }

      if (!resolvedUserId) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ curriculumBuildId: CURRICULUM_BUILD_ID, items: localCards })
        );
        localStorage.setItem(
          legacyFlashcardsStorageKey(),
          JSON.stringify({
            schemaVersion: 2,
            contentKind: 'personal_caderno_cards',
            items: localCards.filter((card) => card.source === 'caderno'),
          })
        );
        if (active) setFlashcards(localCards);
        return;
      }

      try {
        const ref = doc(db, 'users', resolvedUserId, 'data', flashcardsDocumentId);
        const snapshot = await getDoc(ref);
        const cloudData = snapshot.data();
        const cloudCards = cloudData?.items;
        if (
          snapshot.exists() &&
          cloudData?.curriculumBuildId === CURRICULUM_BUILD_ID &&
          Array.isArray(cloudCards) &&
          cloudCards.every(isFlashcard)
        ) {
          if (active) setFlashcards(mergeEditorialCards(cloudCards));
        } else {
          const legacySnapshot = await getDoc(
            doc(db, 'users', resolvedUserId, 'data', 'flashcards_caderno')
          );
          const legacyItems = legacySnapshot.data()?.items;
          const legacyCards = Array.isArray(legacyItems)
            ? legacyItems.filter(isFlashcard).filter((card) => card.source === 'caderno')
            : [];
          const initialCards = mergeEditorialCards([...localCards, ...legacyCards]);
          await safeSetDoc(ref, {
            curriculumBuildId: CURRICULUM_BUILD_ID,
            items: initialCards,
            updatedAt: new Date().toISOString(),
          });
          await safeSetDoc(doc(db, 'users', resolvedUserId, 'data', 'flashcards_caderno'), {
            schemaVersion: 2,
            contentKind: 'personal_caderno_cards',
            items: initialCards.filter((card) => card.source === 'caderno'),
            updatedAt: new Date().toISOString(),
          });
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
    localStorage.setItem(
      storageKey,
      JSON.stringify({ curriculumBuildId: CURRICULUM_BUILD_ID, items: nextCards })
    );
    localStorage.setItem(
      legacyFlashcardsStorageKey(resolvedUserId),
      JSON.stringify({
        schemaVersion: 2,
        contentKind: 'personal_caderno_cards',
        items: nextCards.filter((card) => card.source === 'caderno'),
      })
    );
    if (!resolvedUserId) return;

    try {
      const updatedAt = new Date().toISOString();
      await Promise.all([
        safeSetDoc(doc(db, 'users', resolvedUserId, 'data', flashcardsDocumentId), {
          curriculumBuildId: CURRICULUM_BUILD_ID,
          items: nextCards,
          updatedAt,
        }),
        safeSetDoc(doc(db, 'users', resolvedUserId, 'data', 'flashcards_caderno'), {
          schemaVersion: 2,
          contentKind: 'personal_caderno_cards',
          items: nextCards.filter((card) => card.source === 'caderno'),
          updatedAt,
        }),
      ]);
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
    () => visibleFlashcards.filter(
      (card) => card.source === 'suveca' && (!editorialModuleId || card.moduleId === editorialModuleId)
    ),
    [editorialModuleId, visibleFlashcards]
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
  useEffect(() => { stopAudio(); setIsHandsFree(false); }, [resolvedUserId]);
  useEffect(() => { if (!isHandsFree) stopAudio(); }, [activeCard?.id]);
  const reviewResource = useReviewResource(activeCard?.source === 'suveca' ? activeCard.id : undefined);
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
    setSessionReviewedCount(0);
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

  // Hands-free automated audio cycle
  const chooseNextCardRef = useRef(chooseNextCard);
  chooseNextCardRef.current = chooseNextCard;

  useEffect(() => {
    if (!isHandsFree || !activeCard) {
      setHandsFreeStep('idle');
      return;
    }

    let isMounted = true;
    setHandsFreeStep('question');
    setIsAnswerVisible(false);

    // 1. Narrar a pergunta
    void speakText(activeCard.front, () => {
      if (!isMounted || !isHandsFreeRef.current) return;

      // 2. Pausa reflexiva para o aluno pensar
      setHandsFreeStep('thinking');
      handsFreeTimerRef.current = setTimeout(() => {
        if (!isMounted || !isHandsFreeRef.current) return;

        // 3. Mostrar e narrar a resposta
        setIsAnswerVisible(true);
        setHandsFreeStep('answer');
        void speakText(activeCard.back, () => {
          if (!isMounted || !isHandsFreeRef.current) return;

          // 4. Pausa de assimilação antes de auto-avançar
          setHandsFreeStep('advancing');
          handsFreeTimerRef.current = setTimeout(() => {
            if (!isMounted || !isHandsFreeRef.current) return;
            chooseNextCardRef.current();
            setHandsFreeCycle((prev) => prev + 1);
          }, 3500);
        });
      }, 4000);
    });

    return () => {
      isMounted = false;
      if (handsFreeTimerRef.current) {
        clearTimeout(handsFreeTimerRef.current);
        handsFreeTimerRef.current = null;
      }
      ttsRef.current?.stop();
      setIsSpeaking(false);
      setAudioLoading(false);
    };
  }, [isHandsFree, activeCard?.id, handsFreeCycle]);

  // Media Session API para fones de ouvido e controles de mídia
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !activeCard) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: toLearnerFacingContent(activeCard.front).slice(0, 120),
        artist: 'SuVeCa Mãos Livres',
        album: activeCard.topic || 'Flashcards de Português',
      });

      navigator.mediaSession.setActionHandler('play', () => {
        setIsHandsFree(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsHandsFree(false);
        stopAudio();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        chooseNextCardRef.current();
        setHandsFreeCycle((prev) => prev + 1);
      });
    } catch (err) {
      console.warn('[MediaSession] Controles de mídia não puderam ser vinculados:', err);
    }

    return () => {
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
        } catch {}
      }
    };
  }, [activeCard?.id, activeCard?.front, activeCard?.topic]);

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
        .map((card: { front: string; back: string; hint?: string; explanation?: string; sourceRefs?: unknown }, index: number) => {
          const newCard: ErrorFlashcard = {
            id: `flash_${error.id}_${Date.now()}_${index}`,
            errorId: error.id,
            source: 'caderno',
            moduleId: error.moduleRef,
            topic: error.conteudo,
            conceptId: error.conceptId,
            conceptIds: error.conceptIds,
            learningObjectiveId: error.learningObjectiveId || error.competencyId,
            front: toLearnerFacingContent(card.front),
            back: toLearnerFacingContent(card.back),
            createdAt: now,
            correctCount: 0,
            incorrectCount: 0,
          };
          const hint = toLearnerFacingContent(card.hint);
          if (hint) newCard.hint = hint;
          const explanation = toLearnerFacingContent(card.explanation);
          if (explanation) newCard.explanation = explanation;
          if (Array.isArray(card.sourceRefs)) {
            const refs = card.sourceRefs.filter((reference): reference is string => typeof reference === 'string');
            if (refs.length) newCard.sourceRefs = refs;
          }
          return newCard;
        });

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
          .map((card: { front: string; back: string; hint?: string; explanation?: string; sourceRefs?: unknown }, index: number) => {
            const newCard: ErrorFlashcard = {
              id: `flash_${error.id}_${Date.now()}_${index}`,
              errorId: error.id,
              source: 'caderno',
              moduleId: error.moduleRef,
              topic: error.conteudo,
              conceptId: error.conceptId,
              conceptIds: error.conceptIds,
              learningObjectiveId: error.learningObjectiveId || error.competencyId,
              front: toLearnerFacingContent(card.front),
              back: toLearnerFacingContent(card.back),
              createdAt: now,
              correctCount: 0,
              incorrectCount: 0,
            };
            const hint = toLearnerFacingContent(card.hint);
            if (hint) newCard.hint = hint;
            const explanation = toLearnerFacingContent(card.explanation);
            if (explanation) newCard.explanation = explanation;
            if (Array.isArray(card.sourceRefs)) {
              const refs = card.sourceRefs.filter((reference): reference is string => typeof reference === 'string');
              if (refs.length) newCard.sourceRefs = refs;
            }
            return newCard;
          });

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
    const isCorrect = scheduledCard.lastRating !== 'again';
    const nextCards = flashcards.map((card) => card.id === activeCard.id ? scheduledCard : card);
    setFlashcards(nextCards);
    void persistFlashcards(nextCards);
    setReviewResult(isCorrect ? 'correct' : 'incorrect');
    setSessionReviewedCount((prev) => prev + 1);
    if (isCorrect) onCorrectAnswer?.();
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
          ? 'Todos os cartões desta regra completaram o critério espaçado sem ajuda. Regra consolidada no Caderno; valide transferência e retenção no PBL.'
          : scheduledCard.lastRating === 'again'
          ? 'Este cartão volta em cerca de 4 horas; os demais mantêm seus próprios intervalos.'
          : `Cartão agendado individualmente para ${Math.max(1, Math.round((scheduledCard.intervalDays || 0) * 24))} hora(s). A regra avança pelo cartão mais frágil.`
      );
    } else {
      setReviewFeedback(
        scheduledCard.lastRating !== 'again'
          ? 'Ótimo! Este conteúdo entrou no seu próximo ciclo de revisão.'
          : 'Sem problema: este conteúdo voltará em um intervalo curto para reforço.'
      );
    }
  };

  return (
    <div className="tool-content-shell space-y-6">
      <section className="tool-page-header bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Revisão ativa com Flashcards</h1>
              <p className="text-xs text-slate-600 mt-1">
                {editorialModuleId
                  ? 'Gere cards com a Regra Decisiva do seu Caderno ou revise os conteúdos editoriais desta aula.'
                  : 'Gere cards com a Regra Decisiva do seu Caderno ou revise os conteúdos do percurso curricular.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isHandsFree) {
                  setIsHandsFree(false);
                  stopAudio();
                } else {
                  setIsHandsFree(true);
                }
              }}
              className={`min-h-[44px] text-xs font-bold px-3.5 py-2 rounded-xl border flex items-center gap-2 transition ${
                isHandsFree
                  ? 'bg-violet-700 text-white border-violet-800 shadow-sm ring-2 ring-violet-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              aria-pressed={isHandsFree}
              aria-label="Ativar modo mãos livres com narração em áudio"
            >
              <Volume2 className={`w-4 h-4 ${isHandsFree ? 'text-amber-300 animate-pulse' : 'text-slate-500'}`} />
              <span>{isHandsFree ? 'Mãos Livres (Ativo)' : 'Modo Mãos Livres'}</span>
            </button>

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
          {editorialModuleId ? 'Base desta aula' : 'Base editorial'} ({dueSuvecaCards.length}/{suvecaCards.length})
        </button>
      </div>

      {!activeCard ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-xs">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-sm font-bold text-slate-800">
            {mode === 'caderno' && cadernoCards.length
              ? 'Nenhum card do Caderno está devido agora'
              : mode === 'suveca' && suvecaCards.length
              ? 'Nenhum conteúdo editorial está devido agora'
              : mode === 'suveca' && editorialModuleId
              ? 'Esta aula ainda não possui cards editoriais'
              : 'Ainda não há cards para esta revisão'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {mode === 'caderno' && cadernoCards.length
              ? 'O intervalo de repetição espaçada está ativo. Volte no horário programado ou revise a base editorial.'
              : 'Gere cards com IA para algum erro acima ou pratique a base editorial na aba ao lado enquanto registra novos erros.'}
          </p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5 tab-content-enter select-text max-w-3xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <StudyBadge tone="concept">
                {activeCard.topic}
              </StudyBadge>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                {sessionReviewedCount} concluído(s) nesta sessão · {activeCards.length} pendente(s)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {activeCard.correctCount} acerto(s) · {activeCard.correctCount + activeCard.incorrectCount} revisão(ões)
              {onCorrectAnswer && <> · {FLASHCARD_CORRECT_XP} XP por acerto</>}
            </span>
          </div>

          {isHandsFree && (
            <div className="bg-gradient-to-r from-violet-900 to-indigo-950 text-white rounded-2xl p-4 border border-violet-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-800/80 border border-violet-600/40 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-violet-100">Player Mãos Livres Ativo</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-800 text-amber-300 border border-violet-700">
                      Auto-avanço
                    </span>
                  </div>
                  <p className="text-[11px] text-violet-200 mt-0.5 font-medium">
                    {handsFreeStep === 'question' && 'Narrando pergunta...'}
                    {handsFreeStep === 'thinking' && 'Pausa reflexiva (4s)... Pense na resposta!'}
                    {handsFreeStep === 'answer' && 'Narrando resposta e regra gramatical...'}
                    {handsFreeStep === 'advancing' && 'Avançando automaticamente para o próximo cartão...'}
                    {handsFreeStep === 'idle' && 'Aguardando próximo ciclo...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    chooseNextCard();
                    setHandsFreeCycle((c) => c + 1);
                  }}
                  className="min-h-[38px] text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition font-medium flex items-center gap-1.5"
                >
                  <span>Pular</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHandsFree(false);
                    stopAudio();
                  }}
                  className="min-h-[38px] text-xs px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Parar</span>
                </button>
              </div>
            </div>
          )}

          {/* Contêiner com largura de leitura controlada (Reading Column) */}
          <div className="max-w-3xl mx-auto w-full space-y-5">
            {/* Bloco da Pergunta: compactado quando a resposta for revelada */}
            <div
              className={`flex flex-col justify-center rounded-2xl bg-slate-50 border border-slate-200 transition-all ${
                isAnswerVisible ? 'p-4 sm:p-5' : 'min-h-40 p-5 sm:p-7'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {isAnswerVisible ? 'Pergunta' : 'Pergunta / Desafio Sintático'}
                </span>
                <button
                  type="button"
                  onClick={() => void speakText(activeCard.front)}
                  disabled={isSpeaking || audioLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-800 bg-white border border-slate-200 hover:border-teal-300 rounded-lg px-2.5 py-1 transition"
                  aria-label="Ouvir pergunta"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-teal-600 animate-pulse' : 'text-slate-500'}`} />
                  <span>{audioLoading ? 'Carregando...' : isSpeaking ? 'Ouvindo...' : 'Ouvir'}</span>
                </button>
              </div>
              <p
                className={`font-bold text-slate-900 leading-relaxed ${
                  isAnswerVisible ? 'text-sm sm:text-base text-slate-800' : 'text-base sm:text-lg'
                }`}
              >
                {toLearnerFacingContent(activeCard.front)}
              </p>
              {activeCard.hint && !isAnswerVisible && (
                <div className="mt-4">
                  {!isHintVisible ? (
                    <button
                      type="button"
                      onClick={() => setIsHintVisible(true)}
                      aria-expanded="false"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-50"
                    >
                      <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
                      Ver dica
                    </button>
                  ) : (
                    <StudyCallout tone="example">
                      <strong className="block mb-1 font-bold">Dica da Regra:</strong>
                      {toLearnerFacingContent(activeCard.hint)}
                    </StudyCallout>
                  )}
                </div>
              )}
            </div>

            {!isAnswerVisible ? (
              <button
                type="button"
                onClick={() => setIsAnswerVisible(true)}
                className="button-primary min-h-[48px] w-full py-3 text-sm shadow-sm"
              >
                Mostrar resposta
              </button>
            ) : (
              <>
                {/* Projeção Semântica e Componente Editorial do Verso */}
                {(() => {
                  const resource = reviewResource.resource;
                  const compatible = resource?.front === activeCard.front && resource?.back === activeCard.back;
                  const projection = projectFlashcardContent(activeCard, compatible ? resource : null);
                  return (
                    <div className="space-y-4">
                      <FlashcardBackView
                        projection={projection}
                        isExplanationVisible={isExplanationVisible}
                        onToggleExplanation={() => setIsExplanationVisible((v) => !v)}
                      />
                      {(reviewResource.error || (resource && !compatible)) && <button type="button" className="min-h-11 text-sm text-teal-800 underline" onClick={reviewResource.retry}>Tentar carregar a apresentação detalhada novamente</button>}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void speakText(activeCard.back)}
                          disabled={isSpeaking || audioLoading}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-800 bg-white border border-slate-200 hover:border-teal-300 rounded-lg px-2.5 py-1 transition"
                          aria-label="Ouvir resposta"
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-teal-600 animate-pulse' : 'text-slate-500'}`} />
                          <span>{audioLoading ? 'Carregando áudio...' : isSpeaking ? 'Ouvindo...' : 'Ouvir resposta'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {reviewResult ? (
                  <div
                    className={`rounded-xl p-3 border text-xs font-semibold flex items-center justify-between gap-3 ${
                      reviewResult === 'correct'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <span>
                      {reviewFeedback ||
                        (reviewResult === 'correct'
                          ? 'Ótimo! O desempenho foi registrado.'
                          : 'Sem problema: este conteúdo voltará para revisão.')}
                      {reviewResult === 'correct' && onCorrectAnswer && (
                        <strong className="ml-1 whitespace-nowrap">+{FLASHCARD_CORRECT_XP} XP</strong>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={chooseNextCard}
                      className="button-secondary min-h-[44px] text-xs px-3 py-2 whitespace-nowrap"
                    >
                      Próximo <ChevronRight className="w-3.5 h-3.5 text-teal-700" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2" aria-label="Avalie a qualidade da recordação">
                    <button
                      type="button"
                      onClick={() => handleReview('again')}
                      className="min-h-[48px] bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 hover:border-rose-300 rounded-xl py-3 px-3 text-sm font-bold transition flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-700" /> Errei
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('hard')}
                      className="min-h-[48px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 hover:border-amber-300 rounded-xl py-3 px-3 text-sm font-bold transition"
                    >
                      Difícil
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('good')}
                      className="min-h-[48px] bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 hover:border-teal-300 rounded-xl py-3 px-3 text-sm font-bold transition"
                    >
                      Bom
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('easy')}
                      className="min-h-[48px] bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 hover:border-emerald-400 rounded-xl py-3 px-3 text-sm font-bold transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Fácil
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

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
