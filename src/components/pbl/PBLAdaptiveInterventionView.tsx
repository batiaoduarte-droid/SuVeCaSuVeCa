import { assistanceRank, maximumAssistance, validateQuickCheck, quickCheckIdentity } from '../../lib/pbl/tutor/pblTutorPedagogy';
import { AttemptEvaluator } from '../../lib/pbl/engine/AttemptEvaluator';
import React, { useEffect, useRef, useState } from 'react';
import type {
  InterventionPayload,
  PBLAssistanceLevel,
  PBLAttempt,
  DiagnosticResult,
  PBLQuestionPresentation,
  PBLSession,
  PBLTutorEpisode,
  PBLTutorTurn,
  PBLTutorNotebookDraft,
} from '../../types/pbl';
import type { CadernoErroItem } from '../../types/suveca';
import { SemanticBlockRenderer } from '../pedagogical/blocks/SemanticBlockRenderer';
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Lightbulb,
  RefreshCw,
  Scale,
  Send,
  Sparkles,
  User,
  XCircle,
  BookOpen,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { formatPBLAnswer } from '../../lib/pbl/answerAdapter';

interface PBLAdaptiveInterventionViewProps {
  session: PBLSession;
  episode?: PBLTutorEpisode;
  question: PBLQuestionPresentation | null;
  intervention?: InterventionPayload;
  attempt?: PBLAttempt;
  diagnostic?: DiagnosticResult;
  onRecordTurn?: (turn: PBLTutorTurn) => void;
  onConclude: (action: 'try_same' | 'try_alternative' | 'proceed_transfer' | 'proceed_reflection') => void;
  onSaveToCaderno?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata?: Partial<CadernoErroItem>
  ) => void;
  isSavedToCaderno?: boolean;
  onAssistanceChange?: (level: PBLAssistanceLevel) => void;
  onQuickCheckAnswer?: (activityId: string, answer: string) => void;
  onBeforeTutorRequest?: () => Promise<void>;
}

export const PBLAdaptiveInterventionView: React.FC<PBLAdaptiveInterventionViewProps> = ({
  session,
  episode,
  question,
  intervention: suppliedIntervention,
  attempt: suppliedAttempt,
  onRecordTurn,
  onConclude,
  onSaveToCaderno,
  isSavedToCaderno = false,
  onAssistanceChange,
  onQuickCheckAnswer,
  onBeforeTutorRequest,
}) => {
  const attempt = suppliedAttempt && suppliedAttempt.questionRef === (episode?.questionRef || question?.questionRef)
    && suppliedAttempt.sessionId === session.sessionId && suppliedAttempt.userAnswer?.trim() ? suppliedAttempt : undefined;
  const hasAttempted = Boolean(attempt);
  const intervention = hasAttempted && (!episode || suppliedIntervention?.competencyRef === episode.competencyRef) ? suppliedIntervention : undefined;
  const [assistanceLevel, setAssistanceLevel] = useState<PBLAssistanceLevel>(maximumAssistance(episode?.assistanceLevel, 'diagnostic'));

  // Chat & Copilot state
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copilotExpanded, setCopilotExpanded] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedLocally, setSavedLocally] = useState(isSavedToCaderno);

  // QuickCheck state
  const [quickCheckResponse, setQuickCheckResponse] = useState(episode?.quickCheckResponse);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeEpisodeRef = useRef(episode?.episodeId);
  useEffect(() => {
    activeEpisodeRef.current = episode?.episodeId;
    setAssistanceLevel(maximumAssistance(episode?.assistanceLevel, 'diagnostic'));
    setQuickCheckResponse(episode?.quickCheckResponse);
    onAssistanceChange?.(hasAttempted ? 'partial' : 'hint');
    return () => { activeEpisodeRef.current = undefined; };
  }, [episode?.episodeId]);

  const inputRef = useRef<HTMLInputElement>(null);

  const isCorrect = attempt?.isCorrect;
  const evaluation = attempt ? AttemptEvaluator.evaluateConfidence(attempt.isCorrect, attempt.confidence) : undefined;
  const isHighConfidenceError = evaluation === 'high_confidence_error';
  const isFragileCorrect = evaluation === 'fragile_correct';
  const latestTurn = [...(episode?.turns || [])].reverse().find((turn) => turn.role === 'tutor');

  // Active notebook draft
  const activeNotebookDraft: PBLTutorNotebookDraft | null =
    latestTurn?.notebookDraft ||
    episode?.notebookDraft ||
    (intervention
      ? {
          title: intervention.ruleTitle || 'Critério Decisivo SuVeCA',
          triggerCondition: intervention.ruleConditions?.join('; ') || 'Verificar as condições de aplicação desta regra',
          decisionRule: intervention.ruleStatement || intervention.microLessonText,
          contrastExample: intervention.contrastingPoleA && intervention.contrastingPoleB
            ? `${intervention.contrastingPoleA} / ${intervention.contrastingPoleB}. ${intervention.contrastDecisionCriterion || ""}`
            : '',
        }
      : null);
  const quickCheck = hasAttempted ? [...(episode?.turns || [])].reverse()
    .filter((turn) => turn.role === 'tutor')
    .map((turn) => validateQuickCheck(turn.quickCheck)).find(Boolean) : undefined;
  const activityId = quickCheck ? `${episode?.episodeId}:${quickCheckIdentity(quickCheck)}` : undefined;
  const quickCheckAnswer = activityId === quickCheckResponse?.activityId ? quickCheckResponse?.answer : undefined;

  // Reasoning chips
  const reasoningChips: string[] =
    latestTurn?.reasoningChips || [
      'Quais critérios preciso distinguir?',
      'Como aplicar este critério passo a passo?',
      'Como verificar minha hipótese?',
      'Ver formulação canônica da regra',
    ];

  // Metacognitive insight text
  const metacognitiveInsight: string =
    (hasAttempted ? latestTurn?.metacognitiveInsight : undefined) ||
    (isHighConfidenceError
      ? 'Você declarou alta confiança e a resposta divergiu do gabarito. Que critério orientou sua escolha? Vamos conferir as condições da regra.'
      : isFragileCorrect
        ? 'Você acertou, mas declarou dúvida ou chute. É fundamental consolidar o critério para que a assertividade se torne intencional e sistemática.'
        : !hasAttempted ? 'Você ainda não enviou uma resposta. Vamos organizar a análise sem antecipar a solução.'
          : !isCorrect ? 'A resposta divergiu do gabarito. Vamos conferir o procedimento e investigar qual distinção precisa de apoio.'
          : 'Você acertou esta questão. Explicite o critério e confira sua aplicação em outro caso.');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [episode?.turns, loading]);

  // Se o episódio foi iniciado e ainda não possui turnos, enviar o turno de abertura automaticamente
  useEffect(() => {
    if (episode && episode.turns.length === 0 && !loading) {
      void sendInitialTutorTurn();
    }
  }, [episode?.episodeId]);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) return null;
      return await currentUser.getIdToken();
    } catch {
      return null;
    }
  };

  const sendInitialTutorTurn = async () => {
    if (!episode) return;
    setLoading(true);
    setErrorMessage('');
    const startTime = Date.now();
    const requestEpisodeId = episode.episodeId;

    try {
      await onBeforeTutorRequest?.();
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const userMessage = attempt?.userAnswer
        ? isFragileCorrect
          ? `Acertei a questão marcando "${attempt.userAnswer}", mas foi chute ou dúvida. Gostaria de consolidar o critério decisivo.`
          : isCorrect ? `Acertei com "${attempt.userAnswer}". Gostaria de conferir meu critério.` : `Respondi "${attempt.userAnswer}" e errei. Como conferir o critério que usei?`
        : 'Gostaria de entender o critério decisivo desta questão.';

      const res = await fetch('/api/pbl/tutor/turn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          episodeId: episode.episodeId,
          sessionId: session.sessionId,
          competencyRef: episode.competencyRef,
          questionRef: episode.questionRef,
          userMessage,
          studentAttemptContext: {
            userAnswer: attempt?.userAnswer || '',
            isCorrect,
            confidence: episode.initialConfidence || attempt?.confidence,
            attemptStage: episode.attemptStage,
          },
          history: [],
          assistanceRequested: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${res.status} ao conectar com o tutor.`);
      }

      const data = await res.json();
      const tutorTurn: PBLTutorTurn = {
        turnId: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'tutor',
        content: data.pedagogicalText,
        timestamp: new Date().toISOString(),
        intent: data.intent,
        continuityRecommendation: data.continuityRecommendation,
        sourceRefs: data.sourceRefs,
        notebookDraft: data.notebookDraft,
        quickCheck: data.quickCheck,
        reasoningChips: data.reasoningChips,
        metacognitiveInsight: data.metacognitiveInsight,
        executionMetadata: {
          ...data.executionMetadata,
          durationMs: Date.now() - startTime,
        },
      };

      if (activeEpisodeRef.current !== requestEpisodeId) return;
      onAssistanceChange?.(hasAttempted ? 'full' : 'partial');
      onRecordTurn?.(tutorTurn);
    } catch (err: any) {
      console.error('[PBLAdaptiveInterventionView] Erro no turno inicial do tutor:', err);
      const fallbackTurn: PBLTutorTurn = {
        turnId: `turn_fallback_${Date.now()}`,
        role: 'tutor',
        content: hasAttempted && intervention?.microLessonText
          ? `${intervention.microLessonText}\n\n**Critério Decisivo:** ${intervention.ruleStatement || 'Consulte a regra gramatical canônica.'}`
          : 'Identifique o que o comando pede e qual relação gramatical deve ser examinada. Formule sua hipótese antes de enviar a resposta.',
        timestamp: new Date().toISOString(),
        intent: 'explain_rule',
        continuityRecommendation: 'try_same',
        executionMetadata: {
          model: 'local-fallback',
          durationMs: Date.now() - startTime,
          fallback: true,
        },
      };
      if (activeEpisodeRef.current !== requestEpisodeId) return;
      onAssistanceChange?.(hasAttempted ? 'partial' : 'hint');
      onRecordTurn?.(fallbackTurn);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customMessage?: string, options?: { directExplanation?: boolean; synthesize?: boolean }) => {
    if (!episode || loading) return;
    const textToSend = (customMessage ?? inputText).trim();
    if (!textToSend && !options?.directExplanation && !options?.synthesize) return;

    if (!customMessage) {
      setInputText('');
    }

    setLoading(true);
    setErrorMessage('');
    const startTime = Date.now();
    const requestEpisodeId = episode.episodeId;

    const studentTurn: PBLTutorTurn = {
      turnId: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'student',
      content: textToSend || (options?.directExplanation ? hasAttempted ? 'Por favor, explique diretamente a regra e o gabarito.' : 'Explique o método sem resolver esta questão.' : 'Sintetize esta questão para meu Caderno de Erros.'),
      timestamp: new Date().toISOString(),
      studentAssistanceRequested: true,
    };
    onRecordTurn?.(studentTurn);

    try {
      await onBeforeTutorRequest?.();
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const conversationHistory = [...(episode.turns || []), studentTurn].map((t) => ({
        role: t.role as 'student' | 'tutor',
        text: t.content,
        intent: t.intent,
      }));

      const res = await fetch('/api/pbl/tutor/turn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          episodeId: episode.episodeId,
          sessionId: session.sessionId,
          competencyRef: episode.competencyRef,
          questionRef: episode.questionRef,
          userMessage: studentTurn.content,
          studentAttemptContext: {
            userAnswer: attempt?.userAnswer || '',
            isCorrect,
            confidence: episode.initialConfidence || attempt?.confidence,
            attemptStage: episode.attemptStage,
          },
          history: conversationHistory,
          directExplanationRequested: options?.directExplanation,
          cadernoSynthesisRequested: options?.synthesize,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${res.status} ao processar mensagem.`);
      }

      const data = await res.json();
      const tutorTurn: PBLTutorTurn = {
        turnId: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'tutor',
        content: data.pedagogicalText,
        timestamp: new Date().toISOString(),
        intent: data.intent,
        continuityRecommendation: data.continuityRecommendation,
        sourceRefs: data.sourceRefs,
        notebookDraft: data.notebookDraft,
        quickCheck: data.quickCheck,
        reasoningChips: data.reasoningChips,
        metacognitiveInsight: data.metacognitiveInsight,
        executionMetadata: {
          ...data.executionMetadata,
          durationMs: Date.now() - startTime,
        },
      };

      if (activeEpisodeRef.current !== requestEpisodeId) return;
      onAssistanceChange?.(hasAttempted ? 'full' : 'partial');
      onRecordTurn?.(tutorTurn);
    } catch (err: any) {
      console.error('[PBLAdaptiveInterventionView] Erro ao enviar mensagem:', err);
      setErrorMessage('Houve uma instabilidade temporária na conexão com a IA. Tente novamente ou use os atalhos abaixo.');
      if (!customMessage) {
        setInputText(textToSend);
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleSaveCaderno = () => {
    if (!onSaveToCaderno || !activeNotebookDraft) return;
    const conteudo = activeNotebookDraft.title || question?.prompt || 'Questão da sessão PBL';
    const erroCometido = attempt?.userAnswer
      ? `Alternativa marcada: ${attempt.userAnswer}`
      : 'Dúvida na aplicação do critério';
    const regraDecisiva = activeNotebookDraft.decisionRule || 'Consulte a regra gramatical decisiva e suas condições.';

    onSaveToCaderno(conteudo, erroCometido, regraDecisiva, {
      novoExemplo: activeNotebookDraft.contrastExample || '',
      questionId: episode?.questionRef || attempt?.questionRef,
      correctAnswer: question?.correctAnswer || attempt?.correctAnswer,
      selectedAnswer: attempt?.userAnswer,
      origin: 'pbl',
    });
    setSavedLocally(true);
  };

  const reveal = (level: PBLAssistanceLevel) => {
    setAssistanceLevel((current) => maximumAssistance(current, level));
    onAssistanceChange?.(level);
  };

  const hasPartialSupport = Boolean(
    intervention?.procedureSteps.length ||
    (intervention?.structuredSteps && intervention.structuredSteps.length > 0) ||
    intervention?.contrastingPoleA ||
    intervention?.contrastingPoleB ||
    (intervention?.semanticBlocks?.partial && intervention.semanticBlocks.partial.length > 0)
  );

  const hasFullSupport = Boolean(
    intervention?.workedExample ||
    (intervention?.semanticBlocks?.full && intervention.semanticBlocks.full.length > 0)
  );

  const showPartialSupport = assistanceRank[assistanceLevel] >= assistanceRank.partial;
  const showFullSupport = assistanceRank[assistanceLevel] >= assistanceRank.full;

  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto">
      {/* 1. CABEÇALHO DE RESULTADO E CALIBRAÇÃO METACOGNITIVA */}
      <div className={`rounded-2xl border p-5 shadow-sm transition-all ${
        !hasAttempted ? 'border-slate-200 bg-white' : isCorrect
          ? 'border-emerald-200 bg-linear-to-br from-emerald-50 via-white to-white'
          : 'border-rose-200 bg-linear-to-br from-rose-50 via-white to-white'
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-2xl shrink-0 ${!hasAttempted ? 'bg-slate-600 text-white' : isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              {!hasAttempted ? <HelpCircle className="h-6 w-6" /> : isCorrect ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                  !hasAttempted ? 'bg-slate-100 text-slate-800' : isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {!hasAttempted ? 'Ainda não respondida' : isCorrect ? 'Resposta Correta' : 'Resposta Incorreta'}
                </span>
                {attempt?.confidence && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    Confiança: <strong>{attempt.confidence === 'high' ? 'Muito seguro' : attempt.confidence === 'medium' ? 'Seguro' : attempt.confidence === 'low' ? 'Pouco seguro' : 'Chute'}</strong>
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-base font-bold text-slate-900">
                {!hasAttempted ? 'Vamos organizar sua primeira tentativa' : isCorrect
                  ? isFragileCorrect ? 'Acerto frágil — Vamos consolidar o critério' : 'Vamos explicitar o critério da resposta'
                  : isHighConfidenceError ? 'Vamos conferir o critério usado com alta confiança' : 'Vamos reconstruir o caminho da resposta'}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Sua resposta</div>
            <div className={`font-mono text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
              {hasAttempted ? formatPBLAnswer(attempt!.userAnswer) : 'Ainda não enviada'}
            </div>
            {hasAttempted && !isCorrect && question?.correctAnswer && (
              <div className="mt-1">
                <span className="text-[11px] text-slate-500">Gabarito: </span>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {formatPBLAnswer(question.correctAnswer)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Banner de Insight Metacognitivo */}
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/80 p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
          <Brain className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Reflexão sobre a tentativa:</strong> {metacognitiveInsight}
          </p>
        </div>
      </div>

      {/* 2. QUESTÃO ANCORADA COM DESTAQUES VISUAIS DAS ALTERNATIVAS */}
      {question && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Questão em análise
            </span>
            {question.examBoard && (
              <span className="text-[11px] text-slate-500 font-medium">
                Banca: {question.examBoard} {question.year ? `· ${question.year}` : ''}
              </span>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-800 font-medium">
            {question.prompt}
          </p>

          {question.options && question.options.length > 0 && (
            <div className="mt-4 space-y-2">
              {question.options.map((opt) => {
                const optLetter = opt.label || (opt as any).letter || '';
                const isSelected = optLetter.trim().toUpperCase() === String(attempt?.userAnswer || '').trim().toUpperCase();
                const isOfficial = hasAttempted && optLetter.trim().toUpperCase() === String(question.correctAnswer || '').trim().toUpperCase();

                let style = 'border-slate-200 bg-slate-50/70 text-slate-700';
                if (isSelected && isOfficial) {
                  style = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100 text-emerald-950 font-semibold';
                } else if (isSelected && !isOfficial) {
                  style = 'border-rose-400 bg-rose-50/70 ring-2 ring-rose-100 text-rose-950 font-semibold';
                } else if (isOfficial) {
                  style = 'border-emerald-300 bg-emerald-50/60 text-emerald-950 font-semibold';
                }

                return (
                  <div key={optLetter} className={`rounded-xl border p-3 text-xs transition-all flex items-start gap-2.5 ${style}`}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border font-mono text-[11px] font-bold shadow-2xs">
                      {optLetter}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt.text}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          isOfficial ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          Sua escolha
                        </span>
                      )}
                      {isOfficial && !isSelected && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Gabarito
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. COPILOT DO PROFESSOR SUVECA (DIÁLOGO E CHIPS RÁPIDOS) */}
      <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Professor SuVeCA</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  Tutor Contextual
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Apoio interativo sob demanda com micro-chips
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCopilotExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100/60 transition-colors"
            aria-expanded={copilotExpanded}
          >
            <span>{copilotExpanded ? 'Recolher diálogo' : 'Expandir diálogo'}</span>
            {copilotExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {copilotExpanded && (
          <div>
            {/* Histórico do diálogo */}
            <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto bg-slate-50/30">
              {episode?.turns.map((turn) => {
                const isTutor = turn.role === 'tutor';
                return (
                  <div key={turn.turnId} className={`flex gap-2.5 ${isTutor ? 'justify-start' : 'justify-end'}`}>
                    {isTutor && (
                      <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                      isTutor ? 'bg-white border border-slate-200 text-slate-900' : 'bg-indigo-600 text-white'
                    }`}>
                      {isTutor && turn.intent && (
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                          <Sparkles className="h-3 w-3" />
                          <span>Orientação do Professor</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{turn.content}</div>
                    </div>
                    {!isTutor && (
                      <div className="h-7 w-7 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5 justify-start items-center">
                  <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl bg-white border border-indigo-100 p-2.5 shadow-2xs flex items-center gap-2 text-xs text-indigo-700">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Professor SuVeCA está analisando os critérios...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Ações rápidas do tutor */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSendMessage(undefined, { directExplanation: true })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-50 transition-colors"
              >
                <Lightbulb className="h-3 w-3 text-amber-500" />
                <span>Explique diretamente</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSendMessage(undefined, { synthesize: true })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 disabled:opacity-50 transition-colors"
              >
                <BookOpen className="h-3 w-3 text-amber-600" />
                <span>Sintetizar no Caderno</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSendMessage(hasAttempted ? 'Qual é a diferença entre a alternativa correta e a que eu marquei?' : 'Como começar a análise sem antecipar a resposta?')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-50 transition-colors"
              >
                <HelpCircle className="h-3 w-3 text-indigo-500" />
                <span>{hasAttempted ? 'Comparar com a certa' : 'Como começar a análise?'}</span>
              </button>
            </div>

            {/* Chips de raciocínio rápido */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                <span>Hipóteses para explorar com 1 clique:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reasoningChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => void handleSendMessage(chip)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 disabled:opacity-50 transition-all shadow-2xs"
                  >
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input para dúvida personalizada */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  disabled={loading}
                  placeholder="Digite sua dúvida ou raciocínio para o Professor SuVeCA (Enter para enviar)..."
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={loading || !inputText.trim()}
                  className="h-9 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. SCAFFOLDING COGNITIVO CANÔNICO (PISTA -> CONTRASTE -> PROCEDIMENTO -> TABELA) */}
      {intervention && (
        <div className="space-y-4">
          {/* Nível 1: Pista Decisiva & Microaula */}
          <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/60 to-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Pista Decisiva
            </div>
            <h3 className="mt-2 text-sm font-bold text-slate-900">
              {intervention.ruleTitle || 'Critério decisivo SuVeCA'}
            </h3>
            {intervention.semanticBlocks?.hint?.length ? intervention.semanticBlocks.hint.map((block, idx) => (
              <SemanticBlockRenderer key={idx} block={block} />
            )) : <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{intervention.microLessonText}</p>}

            {!intervention.semanticBlocks?.hint?.length && intervention.ruleStatement && (
              <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3 text-xs leading-relaxed text-violet-950">
                <strong>Por que o critério decide:</strong> {intervention.ruleStatement}
              </div>
            )}

            {intervention.ruleConditions && intervention.ruleConditions.length > 0 && (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-white/80 p-3 text-xs text-indigo-950">
                <strong className="block mb-1 font-bold text-indigo-900">Condições de aplicação:</strong>
                <ul className="list-disc pl-4 space-y-1">
                  {intervention.ruleConditions.map((cond, i) => (
                    <li key={i}>{cond}</li>
                  ))}
                </ul>
              </div>
            )}

            {intervention.ruleExceptions && intervention.ruleExceptions.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
                <strong className="block mb-1 font-bold text-amber-900">Exceções e limites:</strong>
                <ul className="list-disc pl-4 space-y-1">
                  {intervention.ruleExceptions.map((exc, i) => (
                    <li key={i}>{exc}</li>
                  ))}
                </ul>
              </div>
            )}

            {intervention.resolvedTable && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-indigo-200/80 bg-white shadow-2xs">
                <div className="bg-indigo-50/60 px-4 py-2 text-xs font-bold text-indigo-950 border-b border-indigo-100">
                  {intervention.resolvedTable.title}
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      {intervention.resolvedTable.columns.map((col, cIdx) => (
                        <th key={cIdx} className="px-3 py-2">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intervention.resolvedTable.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-slate-800 leading-relaxed">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Nível 2: Revelar Contraste e Procedimento */}
          {!showPartialSupport && (hasPartialSupport || hasFullSupport) && (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 p-4 text-center">
              <p className="text-xs text-slate-700">
                Ainda tem dúvidas sobre a diferença prática? Revele a comparação de contraste e o procedimento passo a passo.
              </p>
              <button
                type="button"
                onClick={() => reveal('partial')}
                className="mt-2.5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <Eye className="h-4 w-4" /> Ver contraste e procedimento
              </button>
            </div>
          )}

          {showPartialSupport && (intervention.contrastingPoleA || intervention.contrastingPoleB) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Scale className="h-4 w-4 text-amber-600" />
                Compare os dois caminhos
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-slate-600" />
                    <span>Caso A</span>
                  </div>
                  <p className="mt-2 text-slate-800 leading-relaxed font-medium">{intervention.contrastingPoleA}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-slate-600" />
                    <span>Caso B</span>
                  </div>
                  <p className="mt-2 text-slate-800 leading-relaxed font-medium">{intervention.contrastingPoleB}</p>
                </div>
              </div>
            </div>
          )}

          {showPartialSupport && intervention.contrastDecisionCriterion && (
            <p className="text-xs text-slate-800"><strong>Critério de distinção:</strong> {intervention.contrastDecisionCriterion}</p>
          )}
          {showPartialSupport && !intervention.semanticBlocks?.partial?.length && intervention.structuredSteps && intervention.structuredSteps.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Lightbulb className="h-4 w-4 text-indigo-600" />
                Procedimento de resolução guiado
              </div>
              <div className="mt-3 space-y-2.5">
                {intervention.structuredSteps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-800 space-y-1">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {step.order || idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 leading-relaxed">{step.action}</span>
                    </div>
                    {step.explanation && (
                      <p className="pl-7 text-slate-600 leading-relaxed">{step.explanation}</p>
                    )}
                    {step.test && (
                      <div className="ml-7 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2 text-[11px] text-indigo-900">
                        <strong>Teste prático:</strong> {step.test}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPartialSupport && !intervention.semanticBlocks?.partial?.length && !intervention.structuredSteps?.length && Boolean(intervention.procedureSteps?.length) && (
            <ol className="list-decimal space-y-2 rounded-xl border bg-white p-5 pl-9 text-sm">
              {intervention.procedureSteps.map((step, idx) => <li key={idx}>{step}</li>)}
            </ol>
          )}
          {showPartialSupport && intervention.semanticBlocks?.partial?.map((block, idx) => (
            <SemanticBlockRenderer key={`partial-${idx}`} block={block} />
          ))}
          {showFullSupport && intervention.semanticBlocks?.full?.map((block, idx) => (
            <SemanticBlockRenderer key={`full-${idx}`} block={block} />
          ))}
          {/* Nível 3: Exemplo Resolvido */}
          {showPartialSupport && !showFullSupport && hasFullSupport && (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-center">
              <p className="text-xs text-amber-950">
                Deseja conferir a resolução detalhada completa antes de avançar?
              </p>
              <button
                type="button"
                onClick={() => reveal('full')}
                className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                <Eye className="h-4 w-4" /> Ver exemplo resolvido completo
              </button>
            </div>
          )}

          {showFullSupport && !intervention.semanticBlocks?.full?.length && intervention.workedExample && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Exemplo resolvido</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-800">{intervention.workedExample.stem}</p>
              <ol className="mt-3 list-decimal pl-5 text-xs space-y-2">
                {intervention.workedExample.stepByStep?.map((step, index) => <li key={index}>{step}</li>)}
              </ol>
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs leading-relaxed text-emerald-950">
                <strong>Resolução modelo:</strong> {intervention.workedExample.resolution}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. FICHA ONE-CLICK PARA O CADERNO DE ERROS */}
      {hasAttempted && activeNotebookDraft && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-xs">
                <BookOpen className="h-4 w-4 text-amber-700" />
                <span>Síntese para o Caderno de Erros: {activeNotebookDraft.title}</span>
              </div>
              <p className="text-xs text-amber-900">
                <span className="font-semibold">Gatilho da banca:</span> {activeNotebookDraft.triggerCondition}
              </p>
              <p className="text-xs text-amber-900">
                <span className="font-semibold">Regra Decisiva:</span> {activeNotebookDraft.decisionRule}
              </p>
              {activeNotebookDraft.contrastExample && (
                <p className="text-xs text-amber-900">
                  <span className="font-semibold">Contraste:</span> {activeNotebookDraft.contrastExample}
                </p>
              )}
            </div>

            {onSaveToCaderno && (
              <button
                type="button"
                onClick={handleSaveCaderno}
                disabled={savedLocally}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  savedLocally
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {savedLocally ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Salvo no Caderno</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    <span>Salvar no Meu Caderno</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checagem imediata: não é evidência de retenção ou domínio. */}
      {quickCheck && (
        <div className="rounded-2xl border border-indigo-200 bg-linear-to-br from-indigo-50/80 to-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
            <Zap className="h-4 w-4 text-amber-500" />
            Checagem de compreensão
          </div>
          <p className="mt-2 text-xs text-slate-600">Esta atividade verifica a compreensão após o apoio. A transferência será avaliada em outra questão, e a retenção em revisão posterior.</p>
          <p className="mt-2 text-xs font-bold text-slate-900 leading-relaxed">
            {quickCheck.prompt}
          </p>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {quickCheck.options.map((opt) => {
              const isSelected = quickCheckAnswer === opt.label;
              const isCorrectCheck = opt.label === quickCheck.correctOption;
              let style = 'border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50';

              if (quickCheckAnswer) {
                if (isCorrectCheck) {
                  style = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-100';
                } else if (isSelected) {
                  style = 'border-rose-400 bg-rose-50 text-rose-950 font-semibold';
                } else {
                  style = 'opacity-60 border-slate-200 bg-slate-100 text-slate-600';
                }
              }

              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    const response = { activityId: activityId!, answer: opt.label };
                    setQuickCheckResponse(response);
                    onQuickCheckAnswer?.(response.activityId, response.answer);
                    onAssistanceChange?.('full');
                  }}
                  disabled={Boolean(quickCheckAnswer)}
                  className={`px-4 py-2.5 rounded-xl border text-xs transition-all flex items-center gap-2 ${style}`}
                >
                  <span className="font-bold font-mono">{opt.label})</span>
                  <span>{opt.text}</span>
                  {quickCheckAnswer && isCorrectCheck && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-1" />}
                </button>
              );
            })}
          </div>

          {quickCheckAnswer && (
            <div className={`mt-3 rounded-xl p-3 text-xs leading-relaxed ${
              quickCheckAnswer === quickCheck.correctOption
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}>
              {quickCheckAnswer === quickCheck.correctOption ? '✓ Excelente! ' : 'Atenção: '}
              {quickCheck.explanation}
            </div>
          )}
        </div>
      )}

      {/* 7. NAVEGAÇÃO DE CONTINUIDADE (AÇÕES DECISIVAS) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-600 font-medium">
            Pronto para prosseguir? Escolha seu próximo passo no percurso:
          </span>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => onConclude('try_same')}
              className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Tentar mesma questão</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => onConclude('try_alternative')}
              className="inline-flex min-h-11 items-center gap-2 px-5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <span>Nova questão prática</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => onConclude('proceed_reflection')}
              className="inline-flex min-h-11 items-center gap-1 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <span>Concluir e revisar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
