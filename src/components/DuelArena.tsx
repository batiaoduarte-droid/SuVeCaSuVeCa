import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  HelpCircle,
  Layers,
  Medal,
  Play,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, type User } from '../lib/firebase';
import type { CadernoErroItem, QuizQuestion } from '../types/suveca';
import {
  diagnoseWeaknesses,
  generateChallengeRound,
  generateMemoryGameDeck,
  type ChallengeQuestion,
  type WeaknessDiagnosis,
} from '../lib/learnerIntelligence';
import {
  EDITORIAL_DUEL_QUESTIONS,
  EDITORIAL_DUEL_QUESTION_SET_VERSION,
} from '../data/editorialDuelQuestions.generated';
import { GoldenRuleCard, StudyBadge } from './study-visuals';

const CHALLENGE_QUESTION_DURATION = 45; // 45 segundos por questão
const ROUND_DURATION_SECONDS = 60;
const LEADERBOARD_LIMIT = 10;
const LOCAL_HISTORY_PREFIX = 'suveca_duel_history';

interface DuelOption {
  id: string;
  text: string;
}

interface DuelQuestion {
  id: string;
  prompt: string;
  options: DuelOption[];
  correctOptionId: string;
  explanation: string;
}

interface DuelRoundResult {
  id: string;
  playedAt: string;
  score: number;
  correctAnswers: number;
  answeredCount: number;
  totalResponseMs: number;
  fastestResponseMs?: number;
}

interface DuelLeaderboardEntry {
  id: string;
  alias: string;
  bestScore: number;
  bestCorrectAnswers: number;
  bestResponseMs?: number;
  isCurrentUser: boolean;
}

interface DuelArenaProps {
  user?: User | null;
  errors?: CadernoErroItem[];
  onAddError?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata?: Partial<CadernoErroItem>
  ) => void;
  onAnswerResult?: (isCorrect: boolean) => void;
  onRoundComplete?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

const DUEL_QUESTION_SET_VERSION = EDITORIAL_DUEL_QUESTION_SET_VERSION;
const DUEL_BUILD_ID = DUEL_QUESTION_SET_VERSION.replace(/^editorial-duel-/, '');

const DUEL_QUESTIONS: DuelQuestion[] = EDITORIAL_DUEL_QUESTIONS.map((question) => ({
  id: question.id,
  prompt: question.prompt,
  options: question.options.map((option) => ({ ...option })),
  correctOptionId: question.correctOptionId,
  explanation: question.explanation,
}));

const localHistoryKey = (userId?: string) =>
  `${LOCAL_HISTORY_PREFIX}_${DUEL_BUILD_ID}_${userId || 'guest'}`;

const getMonthKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year ?? date.getUTCFullYear()}-${month ?? String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const asNonNegativeInteger = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
};

const asPositiveInteger = (value: unknown) => {
  const normalized = asNonNegativeInteger(value);
  return normalized > 0 ? normalized : undefined;
};

const formatTime = (seconds: number) =>
  `00:${Math.max(0, seconds).toString().padStart(2, '0')}`;

const triggerConfetti = () => {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  } catch {
    // Gracefully ignore if canvas isn't ready
  }
};

export const DuelArena: React.FC<DuelArenaProps> = ({
  user,
  errors = [],
  onAddError,
  onAnswerResult,
  onRoundComplete,
  onNavigateToTab,
}) => {
  const userId = user?.uid;
  const [activeModeTab, setActiveModeTab] = useState<'challenge' | 'memory' | 'duel'>('challenge');

  // ---------------------------------------------------------------------------
  // 1. MODO DESAFIO RELÂMPAGO (3 QUESTÕES / 45s)
  // ---------------------------------------------------------------------------
  const [challengePhase, setChallengePhase] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [challengeQuestions, setChallengeQuestions] = useState<ChallengeQuestion[]>([]);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(CHALLENGE_QUESTION_DURATION);
  const [selectedChallengeAnswer, setSelectedChallengeAnswer] = useState<string | null>(null);
  const [isChallengeAnswerSubmitted, setIsChallengeAnswerSubmitted] = useState(false);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeAnswersLog, setChallengeAnswersLog] = useState<
    Array<{ questionId: string; isCorrect: boolean; selected: string; timeSpent: number }>
  >([]);
  const [addedChallengeErrors, setAddedChallengeErrors] = useState<Record<string, boolean>>({});

  const challengeTimerRef = useRef<number | null>(null);
  const challengeStartTimeRef = useRef(Date.now());

  // Diagnóstico das 3 fraquezas do Caderno
  const diagnosedWeaknesses = useMemo(() => diagnoseWeaknesses(errors), [errors]);

  const startChallengeRound = () => {
    const round = generateChallengeRound(errors);
    setChallengeQuestions(round);
    setChallengeIndex(0);
    setChallengeTimeLeft(CHALLENGE_QUESTION_DURATION);
    setSelectedChallengeAnswer(null);
    setIsChallengeAnswerSubmitted(false);
    setChallengeScore(0);
    setChallengeAnswersLog([]);
    setAddedChallengeErrors({});
    setChallengePhase('playing');
    challengeStartTimeRef.current = Date.now();
  };

  // Timer individual de 45 segundos por questão
  useEffect(() => {
    if (challengePhase !== 'playing' || isChallengeAnswerSubmitted) {
      if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
      return;
    }

    challengeTimerRef.current = window.setInterval(() => {
      setChallengeTimeLeft((prev) => {
        if (prev <= 1) {
          // Tempo esgotado!
          handleChallengeTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
    };
  }, [challengePhase, isChallengeAnswerSubmitted, challengeIndex]);

  const handleChallengeTimeout = () => {
    if (isChallengeAnswerSubmitted) return;
    setIsChallengeAnswerSubmitted(true);
    const q = challengeQuestions[challengeIndex];
    const timeSpent = Math.min(
      CHALLENGE_QUESTION_DURATION,
      Math.round((Date.now() - challengeStartTimeRef.current) / 1000)
    );

    setChallengeAnswersLog((prev) => [
      ...prev,
      { questionId: q.id, isCorrect: false, selected: 'TIMEOUT', timeSpent },
    ]);
    onAnswerResult?.(false);
  };

  const handleSelectChallengeAnswer = (letter: string) => {
    if (isChallengeAnswerSubmitted) return;
    setSelectedChallengeAnswer(letter);
    setIsChallengeAnswerSubmitted(true);

    const q = challengeQuestions[challengeIndex];
    const isCorrect = letter === q.correctAnswer;
    const timeSpent = Math.min(
      CHALLENGE_QUESTION_DURATION,
      Math.round((Date.now() - challengeStartTimeRef.current) / 1000)
    );

    if (isCorrect) {
      setChallengeScore((prev) => prev + 1);
    }
    setChallengeAnswersLog((prev) => [
      ...prev,
      { questionId: q.id, isCorrect, selected: letter, timeSpent },
    ]);
    onAnswerResult?.(isCorrect);
  };

  const handleAddChallengeErrorToNotebook = (q: ChallengeQuestion) => {
    if (!onAddError || addedChallengeErrors[q.id]) return;
    onAddError(
      q.ruleTitle,
      `Erro durante a rodada relâmpago do Modo Desafio: "${q.prompt}"`,
      q.decisiveRule,
      {
        origin: 'pbl',
        bank: q.bank,
        questionText: q.prompt,
        selectedAnswer: selectedChallengeAnswer || 'TIMEOUT',
        correctAnswer: q.correctAnswer,
      }
    );
    setAddedChallengeErrors((prev) => ({ ...prev, [q.id]: true }));
  };

  const handleNextChallengeQuestion = () => {
    if (challengeIndex + 1 < challengeQuestions.length) {
      setChallengeIndex((prev) => prev + 1);
      setChallengeTimeLeft(CHALLENGE_QUESTION_DURATION);
      setSelectedChallengeAnswer(null);
      setIsChallengeAnswerSubmitted(false);
      challengeStartTimeRef.current = Date.now();
    } else {
      // Finalizar Rodada
      setChallengePhase('finished');
      onRoundComplete?.();
      if (challengeScore + (selectedChallengeAnswer === challengeQuestions[challengeIndex]?.correctAnswer ? 1 : 0) === 3) {
        triggerConfetti();
      }
    }
  };

  const currentChallengeQ = challengeQuestions[challengeIndex];

  // ---------------------------------------------------------------------------
  // 2. MINI-GAME DE ASSOCIAÇÃO SINTÁTICA SuVeCA (4 PARES)
  // ---------------------------------------------------------------------------
  const [memoryDeck, setMemoryDeck] = useState(() => generateMemoryGameDeck(4));
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [wrongMatchAnimation, setWrongMatchAnimation] = useState(false);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryFinished, setMemoryFinished] = useState(false);

  const resetMemoryGame = () => {
    setMemoryDeck(generateMemoryGameDeck(4));
    setSelectedTermId(null);
    setSelectedDefId(null);
    setMatchedPairIds(new Set());
    setWrongMatchAnimation(false);
    setMemoryMoves(0);
    setMemoryFinished(false);
  };

  const handleSelectTerm = (term: { id: string; pairId: string }) => {
    if (matchedPairIds.has(term.pairId) || wrongMatchAnimation) return;
    setSelectedTermId(term.id);

    if (selectedDefId) {
      const def = memoryDeck.definitions.find((d) => d.id === selectedDefId);
      if (def) checkPairMatch(term.pairId, def.pairId);
    }
  };

  const handleSelectDef = (def: { id: string; pairId: string }) => {
    if (matchedPairIds.has(def.pairId) || wrongMatchAnimation) return;
    setSelectedDefId(def.id);

    if (selectedTermId) {
      const term = memoryDeck.terms.find((t) => t.id === selectedTermId);
      if (term) checkPairMatch(term.pairId, def.pairId);
    }
  };

  const checkPairMatch = (termPairId: string, defPairId: string) => {
    setMemoryMoves((prev) => prev + 1);

    if (termPairId === defPairId) {
      // Acertou o par!
      const nextMatched = new Set(matchedPairIds);
      nextMatched.add(termPairId);
      setMatchedPairIds(nextMatched);
      setSelectedTermId(null);
      setSelectedDefId(null);

      if (nextMatched.size === memoryDeck.terms.length) {
        setMemoryFinished(true);
        triggerConfetti();
        onRoundComplete?.();
      }
    } else {
      // Errou o par
      setWrongMatchAnimation(true);
      setTimeout(() => {
        setSelectedTermId(null);
        setSelectedDefId(null);
        setWrongMatchAnimation(false);
      }, 600);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. ARENA CLÁSSICA 60s & RANKING MENSAL
  // ---------------------------------------------------------------------------
  const monthKey = useMemo(() => getMonthKey(), []);
  const leaderboardKey = useMemo(() => `${monthKey}_${DUEL_BUILD_ID}`, [monthKey]);
  const [duelPhase, setDuelPhase] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [roundQuestions, setRoundQuestions] = useState<DuelQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<DuelLeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const currentDuelQ = roundQuestions[currentIndex];

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setIsLoadingLeaderboard(false);
      return;
    }

    setIsLoadingLeaderboard(true);
    const leaderboardQuery = query(
      collection(db, 'duel_leaderboards', leaderboardKey, 'entries'),
      orderBy('bestScore', 'desc'),
      limit(LEADERBOARD_LIMIT)
    );

    return onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            alias: typeof data.alias === 'string' ? data.alias.slice(0, 32) : 'Estudante SuVeCA',
            bestScore: asNonNegativeInteger(data.bestScore),
            bestCorrectAnswers: asNonNegativeInteger(data.bestCorrectAnswers),
            bestResponseMs: asPositiveInteger(data.bestResponseMs),
            isCurrentUser: d.id === userId,
          };
        });
        setEntries(nextEntries);
        setIsLoadingLeaderboard(false);
      },
      () => setIsLoadingLeaderboard(false)
    );
  }, [leaderboardKey, userId]);

  const startClassicDuel = () => {
    setRoundQuestions([...DUEL_QUESTIONS].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSecondsLeft(ROUND_DURATION_SECONDS);
    setScore(0);
    setCorrectAnswers(0);
    setSelectedOptionId(null);
    setLastAnswerCorrect(null);
    setDuelPhase('playing');
  };

  useEffect(() => {
    if (duelPhase !== 'playing') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setDuelPhase('finished');
          onRoundComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [duelPhase, onRoundComplete]);

  const handleSelectDuelOption = (optionId: string) => {
    if (selectedOptionId || duelPhase !== 'playing') return;
    setSelectedOptionId(optionId);
    const isCorrect = optionId === currentDuelQ.correctOptionId;
    setLastAnswerCorrect(isCorrect);
    if (isCorrect) {
      setScore((s) => s + 100);
      setCorrectAnswers((c) => c + 1);
    }
    setTimeout(() => {
      setSelectedOptionId(null);
      setLastAnswerCorrect(null);
      if (currentIndex + 1 < roundQuestions.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setDuelPhase('finished');
        onRoundComplete?.();
      }
    }, 450);
  };

  return (
    <div className="tool-content-shell space-y-6 pb-16">
      {/* Header com Abas de Modo */}
      <header className="tool-page-header bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              <Swords className="w-3.5 h-3.5 text-amber-600" />
              Treino Relâmpago de Alta Velocidade
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Modo Desafio SuVeCA
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Transforme fraquezas gramaticais em reflexo instantâneo com rodadas focadas de 45s ou treine a conexão de conceitos sintáticos.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="tool-segmented-tabs flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveModeTab('challenge')}
            className={`flex-1 min-h-[42px] px-3 rounded-lg flex items-center justify-center gap-2 transition ${
              activeModeTab === 'challenge'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Desafio Relâmpago (3 Questões / 45s)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModeTab('memory')}
            className={`flex-1 min-h-[42px] px-3 rounded-lg flex items-center justify-center gap-2 transition ${
              activeModeTab === 'memory'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Associação Sintática SuVeCA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModeTab('duel')}
            className={`flex-1 min-h-[42px] px-3 rounded-lg flex items-center justify-center gap-2 transition ${
              activeModeTab === 'duel'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Timer className="w-4 h-4 text-teal-700" />
            <span>Arena 60s & Ranking</span>
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* ABA 1: DESAFIO RELÂMPAGO (3 QUESTÕES / 45s)                           */}
      {/* ---------------------------------------------------------------------- */}
      {activeModeTab === 'challenge' && (
        <section className="space-y-6 animate-in fade-in duration-200">
          {challengePhase === 'idle' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              {/* Diagnóstico dos 3 Pontos Fracos */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-slate-50 border border-amber-200 p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <Flame className="w-4 h-4 text-orange-600 fill-amber-400" />
                  <span>Diagnóstico das 3 Fraquezas Prioritárias</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {errors.some((e) => e.status !== 'dominado')
                    ? 'O sistema mapeou seus erros recentes no Caderno e selecionou os 3 tópicos críticos para esta rodada:'
                    : 'Como seu Caderno ainda está zerado, selecionamos as 3 armadilhas mais fatais das bancas Cebraspe, FGV e FCC:'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {diagnosedWeaknesses.map((item, idx) => (
                    <div key={item.id} className="bg-white rounded-xl p-3.5 border border-amber-200/80 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-amber-900">Alvo #{idx + 1}</span>
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {item.bank || 'Bancas'}
                        </span>
                      </div>
                      <h2 className="text-xs font-bold text-slate-900 line-clamp-1">{item.topic}</h2>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{item.ruleDecisive}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão Iniciar */}
              <div className="text-center py-4 space-y-3">
                <button
                  type="button"
                  onClick={startChallengeRound}
                  className="button-primary min-h-[52px] px-8 py-3.5 text-sm sm:text-base font-extrabold shadow-md inline-flex items-center gap-2.5 cursor-pointer transform transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="w-5 h-5 fill-amber-300" />
                  <span>Iniciar Rodada Relâmpago (3 Questões · 45s cada)</span>
                </button>
                <p className="text-xs text-slate-500">
                  ⚡ Concluir a rodada computa sua sequência diária e concede XP de experiência de estudo.
                </p>
              </div>
            </div>
          )}

          {challengePhase === 'playing' && currentChallengeQ && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 select-text">
              {/* Barra de Progresso e Timer de 45s */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Questão {challengeIndex + 1} de 3
                  </span>
                  <span className="text-xs text-slate-500 font-semibold truncate max-w-[200px] sm:max-w-xs">
                    Alvo: {currentChallengeQ.targetWeakness}
                  </span>
                </div>

                {/* Cronômetro Visual de 45s */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-extrabold text-sm transition-colors ${
                    challengeTimeLeft <= 10
                      ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${challengeTimeLeft <= 10 ? 'text-rose-600' : 'text-slate-500'}`} />
                  <span>{formatTime(challengeTimeLeft)}</span>
                </div>
              </div>

              {/* Enunciado */}
              <div className="space-y-3">
                {currentChallengeQ.supportText && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs italic text-slate-700 leading-relaxed font-serif">
                    “{currentChallengeQ.supportText}”
                  </div>
                )}
                <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                  {currentChallengeQ.prompt}
                </div>
              </div>

              {/* Alternativas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 select-none">
                {currentChallengeQ.options.map((opt) => {
                  const isSelected = selectedChallengeAnswer === opt.letter;
                  const isCorrectOption = opt.letter === currentChallengeQ.correctAnswer;
                  let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';

                  if (isChallengeAnswerSubmitted) {
                    if (isCorrectOption) {
                      btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-2 ring-emerald-500';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-50 border-rose-300 text-rose-950 font-bold';
                    } else {
                      btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={opt.letter}
                      type="button"
                      disabled={isChallengeAnswerSubmitted}
                      onClick={() => handleSelectChallengeAnswer(opt.letter)}
                      className={`min-h-[52px] p-4 rounded-xl border text-left text-sm font-semibold flex items-center justify-between gap-3 transition cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {opt.letter}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {isChallengeAnswerSubmitted && isCorrectOption && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isChallengeAnswerSubmitted && isSelected && !isCorrectOption && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback e Regra Decisiva SuVeCA */}
              {isChallengeAnswerSubmitted && (
                <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                  <div
                    className={`rounded-xl p-3.5 border text-xs font-bold flex items-center justify-between gap-3 ${
                      selectedChallengeAnswer === currentChallengeQ.correctAnswer
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <span>
                      {selectedChallengeAnswer === currentChallengeQ.correctAnswer
                        ? '✓ Resposta Correta! Raciocínio sintático impecável.'
                        : selectedChallengeAnswer === null
                        ? '⏰ Tempo Esgotado! Veja a regra decisiva abaixo.'
                        : '✗ Resposta Incorreta. Revise a regra para blindar este ponto.'}
                    </span>

                    {selectedChallengeAnswer !== currentChallengeQ.correctAnswer && (
                      <button
                        type="button"
                        onClick={() => handleAddChallengeErrorToNotebook(currentChallengeQ)}
                        disabled={addedChallengeErrors[currentChallengeQ.id]}
                        className="button-secondary text-xs px-3 py-1.5 shrink-0 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-teal-700" />
                        <span>{addedChallengeErrors[currentChallengeQ.id] ? '✓ No Caderno' : 'Caderno de Erros'}</span>
                      </button>
                    )}
                  </div>

                  {/* Card Regra Decisiva */}
                  <GoldenRuleCard
                    rule={{
                      entityId: `chal-rule-${currentChallengeQ.id}`,
                      title: currentChallengeQ.ruleTitle || 'Regra Decisiva SuVeCA',
                      statement: currentChallengeQ.decisiveRule,
                      blocks: [],
                    }}
                  />

                  {currentChallengeQ.mentalTest && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 text-xs text-teal-950">
                      <strong className="block font-bold text-teal-900 uppercase tracking-wider text-[10px] mb-1">
                        Teste Mental Operatório:
                      </strong>
                      <p className="font-serif italic font-semibold">{currentChallengeQ.mentalTest}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNextChallengeQuestion}
                      className="button-primary px-6 py-3 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>{challengeIndex + 1 < challengeQuestions.length ? 'Próxima Questão' : 'Ver Resultado Final'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {challengePhase === 'finished' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center font-black">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Desafio Relâmpago Concluído!</h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Você acertou <strong className="text-amber-900">{challengeScore} de 3 questões</strong>. Sua sequência diária de estudos foi mantida!
                </p>
              </div>

              {/* Métricas da Rodada */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Acertos</div>
                  <div className="text-xl font-black text-slate-900">{challengeScore}/3</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-[10px] uppercase font-bold text-amber-800">XP Ganho</div>
                  <div className="text-xl font-black text-amber-950">+{challengeScore === 3 ? 50 : 30} XP</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Streak</div>
                  <div className="text-xl font-black text-emerald-950">Mantido 🔥</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={startChallengeRound}
                  className="button-primary px-6 py-3 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Jogar Novamente</span>
                </button>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('errors')}
                    className="button-secondary px-5 py-3 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-teal-700" />
                    <span>Ver Caderno de Erros</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ABA 2: JOGO DE ASSOCIAÇÃO SINTÁTICA SuVeCA (MINI-GAME)                 */}
      {/* ---------------------------------------------------------------------- */}
      {activeModeTab === 'memory' && (
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>Associação Sintática: Conecte o Termo ao Teste Mental</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique em 1 Termo na esquerda e em 1 Teste Mental na direita para formar o par correto.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                Pares: {matchedPairIds.size} / {memoryDeck.terms.length}
              </span>
              <button
                type="button"
                onClick={resetMemoryGame}
                className="button-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1 cursor-pointer"
                title="Embaralhar novos pares"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {!memoryFinished ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none">
              {/* Coluna 1: Termos Sintáticos */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">1. Termo Sintático</div>
                <div className="space-y-2.5">
                  {memoryDeck.terms.map((item) => {
                    const isMatched = matchedPairIds.has(item.pairId);
                    const isSelected = selectedTermId === item.id;
                    let style = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-purple-300 hover:bg-purple-50/40';

                    if (isMatched) {
                      style = 'bg-emerald-50 border-emerald-200 text-emerald-950 opacity-60 cursor-default line-through';
                    } else if (isSelected) {
                      style = wrongMatchAnimation
                        ? 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-400 animate-shake'
                        : 'bg-purple-50 border-purple-300 text-purple-950 font-bold ring-2 ring-purple-500 shadow-xs';
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => handleSelectTerm(item)}
                        className={`w-full min-h-[50px] p-3.5 rounded-xl border text-left text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition cursor-pointer ${style}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                            {item.shortLabel}
                          </span>
                          <span>{item.text}</span>
                        </div>
                        {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coluna 2: Testes Mentais / Definições */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">2. Teste Mental Operatório</div>
                <div className="space-y-2.5">
                  {memoryDeck.definitions.map((item) => {
                    const isMatched = matchedPairIds.has(item.pairId);
                    const isSelected = selectedDefId === item.id;
                    let style = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/40';

                    if (isMatched) {
                      style = 'bg-emerald-50 border-emerald-200 text-emerald-950 opacity-60 cursor-default';
                    } else if (isSelected) {
                      style = wrongMatchAnimation
                        ? 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-400 animate-shake'
                        : 'bg-purple-50 border-purple-300 text-purple-950 font-bold ring-2 ring-purple-500 shadow-xs';
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => handleSelectDef(item)}
                        className={`w-full min-h-[50px] p-3.5 rounded-xl border text-left text-xs font-medium leading-relaxed flex items-center justify-between gap-2 transition cursor-pointer ${style}`}
                      >
                        <span>{item.text}</span>
                        {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-800 mx-auto flex items-center justify-center font-black">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900">Pares Sintáticos Concluídos!</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Você conectou todos os 4 conceitos da metodologia SuVeCA em {memoryMoves} tentativas (+40 XP).
                </p>
              </div>
              <button
                type="button"
                onClick={resetMemoryGame}
                className="button-primary px-6 py-3 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jogar com Novos Conceitos</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ABA 3: ARENA CLÁSSICA 60s & RANKING                                   */}
      {/* ---------------------------------------------------------------------- */}
      {activeModeTab === 'duel' && (
        <section className="space-y-6 animate-in fade-in duration-200">
          {duelPhase === 'idle' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                    <Timer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Arena de Velocidade (60s)</h3>
                    <p className="text-xs text-slate-500">Responda ao máximo de questões em 60 segundos com precisão.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startClassicDuel}
                  className="button-primary px-6 py-3 text-xs sm:text-sm font-bold shrink-0 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Arena 60s</span>
                </button>
              </div>

              {/* Ranking Mensal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>Ranking Mensal da Arena</span>
                  </h3>
                  <span className="text-xs text-slate-500">{entries.length} competidores</span>
                </div>

                {isLoadingLeaderboard ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Carregando ranking...</p>
                ) : entries.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    Seja o primeiro a pontuar este mês! Inicie uma rodada de 60s acima.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                          entry.isCurrentUser
                            ? 'bg-amber-50/80 border-amber-200 font-bold'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 font-extrabold text-slate-500">#{idx + 1}</span>
                          <span className="font-semibold text-slate-900">{entry.alias}</span>
                        </div>
                        <span className="font-mono font-black text-amber-900">{entry.bestScore} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {duelPhase === 'playing' && currentDuelQ && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 select-text">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-mono text-sm">
                <span className="font-bold text-teal-800">Pontuação: {score} pts</span>
                <span className="font-extrabold text-rose-700">{formatTime(secondsLeft)}</span>
              </div>

              <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {currentDuelQ.prompt}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 select-none">
                {currentDuelQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectDuelOption(opt.id)}
                    className="min-h-[50px] p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 text-left text-sm font-semibold transition cursor-pointer"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {duelPhase === 'finished' && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center space-y-4">
              <Trophy className="w-12 h-12 text-amber-600 mx-auto" />
              <h3 className="text-2xl font-black text-slate-900">Arena Finalizada!</h3>
              <p className="text-sm text-slate-600">
                Você marcou <strong>{score} pontos</strong> com <strong>{correctAnswers} acertos</strong>.
              </p>
              <button
                type="button"
                onClick={startClassicDuel}
                className="button-primary px-6 py-3 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jogar Novamente</span>
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
