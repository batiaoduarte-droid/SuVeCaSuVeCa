import { TTSPlayer } from '../lib/audio/ttsService';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CadernoErroItem, ErrorFlashcard, FlashcardRating } from '../types/suveca';
import { auth, onAuthStateChanged } from '../lib/firebase';
import { useFlashcardStore } from '../hooks/useFlashcardStore';
import { appendCardEvent, readStoredFlashcards, recordCardReview } from '../lib/flashcardStore';
import { FlashcardLibrary } from './FlashcardLibrary';
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
import { deriveErrorReviewStatus } from '../lib/spacedRepetition';
import { projectFlashcardContent } from '../lib/flashcardContent';
import { parseFlashcardContent, flashcardContentBack, type FlashcardContentV2 } from '../types/flashcardContent';
import { useReviewResource } from '../hooks/useReviewResource';
import { FLASHCARD_CORRECT_XP } from '../lib/masteryLevel';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import {
  FlashcardBackView,
  StudyBadge,
  StudyCallout,
  StudySurface,
} from './study-visuals';

import { PEDAGOGICAL_VIEW_INDEX } from '../data/pedagogicalViewIndex.generated';

const UNIT_TITLE_BY_ID = new Map(
  PEDAGOGICAL_VIEW_INDEX.map((u) => [u.unitId.toUpperCase(), u.title.replace(/\s*-\s*Questões$/i, '')])
);

export const getCardTopicLabel = (card?: ErrorFlashcard | null): string => {
  if (!card) return '';
  const match = card.id && card.id.match(/editorial-flash-(ip-[a-z0-9]+-[a-z0-9]+)/i);
  if (match) {
    const unitId = match[1].toUpperCase();
    if (UNIT_TITLE_BY_ID.has(unitId)) return UNIT_TITLE_BY_ID.get(unitId)!;
  }
  const str = card.topic || '';
  if (!str.startsWith('pt:')) return str;
  const slug = str.split(':').pop() || str;
  return slug
    .split('-')
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && ['de', 'do', 'da', 'dos', 'das', 'e', 'em'].includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

const isCardDue = (card: ErrorFlashcard, now: number) =>
  !card.nextReviewAt || Number.isNaN(Date.parse(card.nextReviewAt)) || Date.parse(card.nextReviewAt) <= now;

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
  editorialUnitId?: string;
  /** Registra no perfil uma recordação avaliada como correta. */
  onCorrectAnswer?: () => void;
}

export const FlashcardPractice: React.FC<FlashcardPracticeProps> = ({
  errors,
  onUpdateErrorStatus,
  userId,
  editorialModuleId,
  editorialUnitId,
  onCorrectAnswer,
}) => {
  const [wholeLesson, setWholeLesson] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | undefined>(() => auth.currentUser?.uid);
  const resolvedUserId = userId ?? authUserId;
  const store = useFlashcardStore(resolvedUserId);
  const flashcards = store.cards;
  const ownerRef = useRef(resolvedUserId); ownerRef.current = resolvedUserId;
  const generationBusy = useRef(false);
  const generationController = useRef<AbortController | null>(null);
  const revealRef = useRef<{ cardId: string; eventId: string } | null>(null);
  const [view, setView] = useState<'review' | 'library' | 'study'>('review');
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
  const visibleFlashcards = flashcards;

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
    setActiveCardId(null); setReviewResult(null); setIsAnswerVisible(false);
    setIsHintVisible(false); setGenerationMessage(null); setIsGeneratingFor(null);
    generationBusy.current = false;
    return () => { generationController.current?.abort(); };
  }, [resolvedUserId]);
  const mutate = (action: () => void) => {
    try { action(); store.refresh(); void store.retry(); return true; }
    catch (error) { store.reportError(error); return false; }
  };
  const revealAnswer = () => {
    if (!activeCard) return;
    if (mutate(() => {
      const event = appendCardEvent(resolvedUserId, { kind: view === 'study' || isHandsFree ? 'exposure' : 'reveal', cardId: activeCard.id });
      revealRef.current = { cardId: activeCard.id, eventId: event.id };
    })) setIsAnswerVisible(true);
  };

  const cadernoCards = useMemo(
    () =>
      visibleFlashcards.filter(
        (card) => card.source === 'caderno' && !card.archived
      ),
    [errors, visibleFlashcards]
  );
  const suvecaCards = useMemo(
    () => visibleFlashcards.filter(
      (card) => card.source === 'suveca' && !card.archived && (!editorialModuleId || card.moduleId === editorialModuleId)
        && (!editorialUnitId || wholeLesson || card.sourceRefs?.includes(`EDITORIAL:${editorialUnitId}`) || card.id.includes(`-${editorialUnitId.toLowerCase()}-`))
    ),
    [editorialModuleId, editorialUnitId, wholeLesson, visibleFlashcards]
  );
  const dueCadernoCards = useMemo(
    () => cadernoCards.filter((card) => isCardDue(card, reviewClock)),
    [cadernoCards, reviewClock]
  );
  const dueSuvecaCards = useMemo(
    () => suvecaCards.filter((card) => isCardDue(card, reviewClock)),
    [reviewClock, suvecaCards]
  );
  const activeCards = view === 'study' ? (mode === 'caderno' ? cadernoCards : suvecaCards) : mode === 'caderno' ? dueCadernoCards : dueSuvecaCards;
  const reviewedCard = reviewResult
    ? visibleFlashcards.find((card) => card.id === activeCardId)
    : undefined;
  const activeCard = reviewedCard || activeCards.find((card) => card.id === activeCardId) || activeCards[0];
  const genericEditorialHints = [
    'Nomeie primeiro o erro; depois reconstrua a regra corretiva.',
    'Recupere o critério decisivo antes de consultar a resposta.',
    'Formule a regra e produza um exemplo próprio antes de virar o cartão.',
  ];
  const usefulHint = activeCard?.hint && !(activeCard.source === 'suveca' && genericEditorialHints.includes(activeCard.hint));
  useEffect(() => { stopAudio(); setIsHandsFree(false); }, [resolvedUserId]);
  useEffect(() => { if (!isHandsFree) stopAudio(); }, [activeCard?.id]);
  const reviewResource = useReviewResource(activeCard?.source === 'suveca' && !activeCard.content ? activeCard.id : undefined);
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
  useEffect(() => {
    setWholeLesson(false);
    if (editorialUnitId) switchMode('suveca');
  }, [editorialUnitId, editorialModuleId]);

  const chooseNextCard = () => {
    if (!activeCards.length) {
      setActiveCardId(null);
      setReviewResult(null);
      setReviewFeedback(null);
      setIsAnswerVisible(false);
      setIsHintVisible(false);
      setIsExplanationVisible(false);
      setIsHandsFree(false);
      stopAudio();
      return;
    }
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
        revealAnswer();
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
        setView('study'); setReviewResult(null); setIsHandsFree(true);
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

  const requestCards = async (error: CadernoErroItem, signal: AbortSignal) => {
    const owner = resolvedUserId;
    const response = await authenticatedFetch('/api/gemini/generate-error-flashcards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ error, count: 2 }),
    });
    const data = await response.json();
    if (signal.aborted || ownerRef.current !== owner) throw new Error('A conta foi alterada.');
    if (!response.ok || !Array.isArray(data.flashcards)) throw new Error(data.error || 'Resposta de IA inválida.');
      const now = new Date().toISOString();
      const generatedCards: ErrorFlashcard[] = data.flashcards
        .filter((card: unknown) => {
          if (!card || typeof card !== 'object') return false;
          const candidate = card as { front?: unknown; back?: unknown; hint?: unknown; explanation?: unknown };
          return typeof candidate.front === 'string' && !!candidate.front.trim() && typeof candidate.back === 'string' && !!candidate.back.trim() && (candidate.hint === undefined || typeof candidate.hint === 'string') && (candidate.explanation === undefined || typeof candidate.explanation === 'string');
        })
        .map((card: { front: string; back: string; hint?: string; explanation?: string; sourceRefs?: unknown; content?: FlashcardContentV2 }, index: number) => {
          const content = card.content ? parseFlashcardContent(card.content) : undefined;
          const newCard: ErrorFlashcard = {
            id: `flash_${crypto.randomUUID()}`,
            errorId: error.id,
            source: 'caderno',
            moduleId: error.moduleRef,
            topic: error.conteudo,
            conceptId: error.conceptId,
            conceptIds: error.conceptIds,
            learningObjectiveId: error.learningObjectiveId || error.competencyId,
            content,
            front: content?.front || toLearnerFacingContent(card.front),
            back: content ? flashcardContentBack(content) : toLearnerFacingContent(card.back),
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
    const known = new Map<string, string[]>();
    for (const card of readStoredFlashcards(owner).filter(c => c.source === 'caderno' && c.errorId === error.id && !c.archived)) {
      const fingerprint = JSON.stringify([card.front.trim(), card.back.trim()]);
      known.set(fingerprint, [...(known.get(fingerprint) || []), card.id]);
    }
    const added: ErrorFlashcard[] = [];
    const retainedIds = new Set<string>();
    for (const card of generatedCards) {
      if (!card.front.trim() || !card.back.trim()) continue;
      const fingerprint = JSON.stringify([card.front.trim(), card.back.trim()]);
      const matchingIds = known.get(fingerprint);
      if (matchingIds) {
        for (const id of matchingIds) retainedIds.add(id);
        continue;
      }
      appendCardEvent(owner, { kind: 'snapshot', cardId: card.id, card });
      known.set(fingerprint, [card.id]); added.push(card);
    }
    store.refresh(); void store.retry();
    return { added, retainedIds };
  };
  const generateFlashcardsForError = async (error: CadernoErroItem, replace = false) => {
    if (generationBusy.current || store.status === 'loading') return;
    if (replace && !window.confirm('Substituir os cards desta regra? Os anteriores e seu histórico ficarão arquivados na biblioteca.')) return;
    generationBusy.current = true;
    const controller = new AbortController(); generationController.current = controller;
    const previous = readStoredFlashcards(resolvedUserId).filter(c => c.source === 'caderno' && c.errorId === error.id && !c.archived);
    setIsGeneratingFor(error.id); setGenerationMessage('A IA está gerando os cards.');
    try {
      const { added, retainedIds } = await requestCards(error, controller.signal);
      if (replace && (added.length || retainedIds.size)) {
        for (const card of previous) {
          if (!retainedIds.has(card.id)) appendCardEvent(resolvedUserId, { kind: 'archive', cardId: card.id, archived: true });
        }
      }
      store.refresh(); void store.retry();
      switchMode('caderno'); setView('review');
      if (added.length) setActiveCardId(added[0].id);
      setGenerationMessage(`${added.length} novo(s) card(s) salvo(s). Cards idênticos foram preservados sem duplicar.`);
    } catch (error) {
      if (!controller.signal.aborted) { store.reportError(error); setGenerationMessage((error as Error).message); }
    } finally {
      if (generationController.current === controller) { generationBusy.current = false; setIsGeneratingFor(null); }
    }
  };
  const generateAllPendingCards = async () => {
    if (generationBusy.current || store.status === 'loading') return;
    generationBusy.current = true;
    const controller = new AbortController(); generationController.current = controller;
    setIsGeneratingFor('all'); setGenerationMessage('A IA está gerando os cards.');
    let generated = 0, failed = 0;
    for (const error of errorsWithoutCards) {
      if (controller.signal.aborted) break;
      // Recheck after hydration and after every response; never replace an existing deck.
      if (readStoredFlashcards(resolvedUserId).some(c => c.errorId === error.id && !c.archived)) continue;
      try { generated += (await requestCards(error, controller.signal)).added.length; }
      catch { failed++; }
    }
    if (!controller.signal.aborted) {
      setGenerationMessage(`${generated} card(s) salvo(s). ${failed} regra(s) não puderam ser geradas; tente novamente nas pendentes.`);
      switchMode('caderno');
    }
    if (generationController.current === controller) { generationBusy.current = false; setIsGeneratingFor(null); }
  };

  const handleReview = (rating: FlashcardRating) => {
    if (!activeCard || reviewResult || view !== 'review' || isHandsFree) return;
    const now = new Date();
    if (!isCardDue(activeCard, now.getTime())) return;

    const relatedError =
      activeCard.source === 'caderno' && activeCard.errorId
        ? errors.find((error) => error.id === activeCard.errorId)
        : undefined;
    let nextCards: ReturnType<typeof readStoredFlashcards>;
    try {
      nextCards = recordCardReview(resolvedUserId, activeCard.id, rating, isHintVisible,
        revealRef.current?.cardId === activeCard.id ? revealRef.current.eventId : undefined);
    } catch (error) { store.reportError(error); store.refresh(); return; }
    store.refresh(); void store.retry();
    const scheduledCard = nextCards.find(card => card.id === activeCard.id)!;
    const isCorrect = scheduledCard.lastRating !== 'again';
    setReviewResult(isCorrect ? 'correct' : 'incorrect');
    setSessionReviewedCount((prev) => prev + 1);
    if (isCorrect) onCorrectAnswer?.();
    setReviewClock(now.getTime());

    if (relatedError) {
      const relatedCards = nextCards.filter((card) => card.errorId === relatedError.id && !card.archived);
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
      <div role="status" className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        {store.status === 'loading' ? 'Carregando e conferindo os cards salvos…' : store.status === 'synced' ? 'Cards salvos neste dispositivo e sincronizados.' : store.status === 'local' ? 'Cards salvos neste dispositivo.' : store.status === 'pending' ? 'Alterações locais aguardam sincronização.' : 'Não foi possível concluir o salvamento ou a sincronização. Confira novamente antes de gerar cards que pareçam ausentes.'}
        {store.message && <p>{store.message}</p>}
        <button type="button" className="ml-2 min-h-11 text-teal-800 underline" onClick={() => void store.retry()}>Conferir e sincronizar novamente</button>
      </div>
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
                  setView('study'); setReviewResult(null); setIsHandsFree(true);
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
                disabled={isGeneratingFor !== null || store.status === 'loading'}
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
          {errors.map((error) => {
            const hasCards = cadernoCards.some((card) => card.errorId === error.id);
            const generating = isGeneratingFor === error.id || isGeneratingFor === 'all';
            return (
              <div key={error.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{error.conteudo}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{hasCards ? 'Cards salvos na biblioteca' : store.status === 'loading' || store.status === 'error' ? 'Conferência dos cards pendente' : 'Sem cards ativos'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void generateFlashcardsForError(error)}
                  disabled={isGeneratingFor !== null || store.status === 'loading'}
                  className="min-h-[44px] text-xs font-bold text-violet-800 bg-white border border-violet-200 hover:bg-violet-50 rounded-lg px-2.5 py-2 shrink-0 transition disabled:opacity-60"
                >
                  {generating ? 'Gerando...' : hasCards ? 'Gerar mais' : 'Gerar IA'}
                </button>
                {hasCards && <button type="button" className="min-h-11 text-xs text-slate-700 underline" disabled={isGeneratingFor !== null} onClick={() => void generateFlashcardsForError(error, true)}>Substituir</button>}
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
          {editorialUnitId && !wholeLesson ? 'Base desta unidade' : editorialModuleId ? 'Base desta aula' : 'Base editorial'} ({dueSuvecaCards.length}/{suvecaCards.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Modo de estudo">
        {(['review', 'library', 'study'] as const).map(option => <button key={option} type="button" aria-pressed={view === option} className={view === option ? 'button-primary min-h-11 px-4' : 'button-secondary min-h-11 px-4'} onClick={() => {
          stopAudio(); setIsHandsFree(false); setView(option); setReviewResult(null); setIsAnswerVisible(false); setIsHintVisible(false); setActiveCardId(null);
        }}>{option === 'review' ? 'Revisar devidos' : option === 'library' ? 'Biblioteca e histórico' : 'Estudo livre'}</button>)}
      </div>
      <p className="text-xs text-slate-600">Os contadores mostram cards devidos / cards ativos. Cards agendados e arquivados continuam na biblioteca.</p>
      {editorialUnitId && <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={wholeLesson} onChange={(event) => { setWholeLesson(event.target.checked); switchMode('suveca'); }} /> Incluir todas as unidades desta aula</label>}
      {view === 'library' ? <FlashcardLibrary cards={visibleFlashcards.filter(c => mode === 'caderno' ? c.source === 'caderno' : c.source === 'suveca' && (!editorialModuleId || c.moduleId === editorialModuleId) && (!editorialUnitId || wholeLesson || c.sourceRefs?.includes(`EDITORIAL:${editorialUnitId}`) || c.id.includes(`-${editorialUnitId.toLowerCase()}-`)))} errors={errors} uid={resolvedUserId} onChange={() => { store.refresh(); void store.retry(); }} onError={store.reportError} onStudy={(id) => { setView('study'); setActiveCardId(id); setReviewResult(null); setIsAnswerVisible(false); }} /> : !activeCard ? (
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
            {sessionReviewedCount > 0
              ? `Revisão concluída: ${sessionReviewedCount} avaliação(ões) nesta sessão. Os cartões voltarão conforme o intervalo de revisão; isso não significa domínio de todo o conteúdo.`
              : (mode === 'caderno' ? cadernoCards.length : suvecaCards.length)
              ? 'Nenhum cartão está devido agora. Volte no horário programado ou escolha outra unidade.'
              : 'Gere cards com IA para algum erro acima ou pratique a base editorial na aba ao lado enquanto registra novos erros.'}
          </p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5 tab-content-enter select-text max-w-3xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <StudyBadge tone="concept">
                {getCardTopicLabel(activeCard)}
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
              {usefulHint && !isAnswerVisible && (
                <div className="mt-4">
                  {!isHintVisible ? (
                    <button
                      type="button"
                      onClick={() => { if (mutate(() => { appendCardEvent(resolvedUserId, { kind: 'exposure', cardId: activeCard.id }); })) setIsHintVisible(true); }}
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
                onClick={revealAnswer}
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

                {view === 'study' || isHandsFree ? <p className="text-sm text-slate-600">Estudo livre: sem XP e sem alterar o agendamento.</p> : reviewResult ? (
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
                      {activeCards.length ? 'Próximo' : 'Concluir revisão'} <ChevronRight className="w-3.5 h-3.5 text-teal-700" />
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
