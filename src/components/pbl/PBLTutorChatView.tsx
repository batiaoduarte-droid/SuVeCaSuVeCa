import React, { useState, useEffect, useRef } from 'react';
import type {
  PBLSession,
  PBLTutorEpisode,
  PBLTutorTurn,
  PBLTutorIntent,
  PBLTutorContinuityRecommendation,
  PBLTutorNotebookDraft,
  PBLQuestionPresentation,
} from '../../types/pbl';
import type { CadernoErroItem } from '../../types/suveca';
import {
  Send,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { auth } from '../../lib/firebase';

interface PBLTutorChatViewProps {
  session: PBLSession;
  episode: PBLTutorEpisode;
  question: PBLQuestionPresentation | null;
  onRecordTurn: (turn: PBLTutorTurn) => void;
  onConclude: (action: 'try_same' | 'try_alternative' | 'proceed_transfer' | 'proceed_reflection') => void;
  onSaveToCaderno?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata?: Partial<CadernoErroItem>
  ) => void;
  isSavedToCaderno?: boolean;
}

const intentLabels: Record<PBLTutorIntent, string> = {
  investigate_confusion: 'Investigando raciocínio',
  explain_rule: 'Explicando critério decisivo',
  contrast_options: 'Contraste de alternativas',
  recommend_practice: 'Recomendação de treino',
  synthesize_notebook: 'Síntese para o Caderno de Erros',
  encourage_reattempt: 'Orientação para nova tentativa',
  direct_clarification: 'Esclarecimento pontual',
  wrap_up: 'Conclusão pedagógica',
};

export const PBLTutorChatView: React.FC<PBLTutorChatViewProps> = ({
  session,
  episode,
  question,
  onRecordTurn,
  onConclude,
  onSaveToCaderno,
  isSavedToCaderno = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showFullQuestion, setShowFullQuestion] = useState(false);
  const [activeNotebookDraft, setActiveNotebookDraft] = useState<PBLTutorNotebookDraft | null>(
    episode.notebookDraft || null
  );
  const [savedLocally, setSavedLocally] = useState(isSavedToCaderno);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [episode.turns, loading]);

  // Se o episódio acabou de ser criado e não possui turnos, enviar o turno de abertura automaticamente
  useEffect(() => {
    if (episode.turns.length === 0 && !loading) {
      void sendInitialTutorTurn();
    }
  }, [episode.episodeId]);

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
    setLoading(true);
    setErrorMessage('');
    const startTime = Date.now();

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/pbl/tutor/turn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.sessionId,
          competencyRef: episode.competencyRef,
          questionRef: episode.questionRef,
          userMessage: episode.initialUserAnswer
            ? `Respondi "${episode.initialUserAnswer}", mas o resultado foi incorreto.`
            : 'Gostaria de tirar uma dúvida sobre esta questão antes de responder.',
          studentAttemptContext: {
            userAnswer: episode.initialUserAnswer || '',
            isCorrect: false,
            confidence: episode.initialConfidence,
            attemptStage: episode.attemptStage,
          },
          history: [],
          assistanceRequested: episode.assistanceLevel !== 'none',
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
        executionMetadata: {
          ...data.executionMetadata,
          durationMs: Date.now() - startTime,
        },
      };

      if (data.notebookDraft) {
        setActiveNotebookDraft(data.notebookDraft);
      }

      onRecordTurn(tutorTurn);
    } catch (err: any) {
      console.error('[PBLTutorChatView] Erro no turno inicial do tutor:', err);
      // Fallback gracioso local se houver falha de rede total
      const fallbackTurn: PBLTutorTurn = {
        turnId: `turn_fallback_${Date.now()}`,
        role: 'tutor',
        content:
          'Olá! Estou aqui para te orientar no raciocínio desta questão. O que te levou a escolher essa alternativa, ou qual parte do enunciado te gerou dúvida?',
        timestamp: new Date().toISOString(),
        intent: 'investigate_confusion',
        continuityRecommendation: 'try_same',
        executionMetadata: {
          model: 'local-fallback',
          durationMs: Date.now() - startTime,
          fallback: true,
        },
      };
      onRecordTurn(fallbackTurn);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customMessage?: string, options?: { directExplanation?: boolean; synthesize?: boolean }) => {
    const textToSend = (customMessage ?? inputText).trim();
    if (!textToSend && !options?.directExplanation && !options?.synthesize) return;

    if (!customMessage) {
      setInputText('');
    }

    setLoading(true);
    setErrorMessage('');
    const startTime = Date.now();

    // 1. Registrar o turno do aluno
    const studentTurn: PBLTutorTurn = {
      turnId: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'student',
      content: textToSend || (options?.directExplanation ? 'Por favor, explique diretamente a regra e o gabarito.' : 'Sintetize esta questão para meu Caderno de Erros.'),
      timestamp: new Date().toISOString(),
      studentAssistanceRequested: Boolean(options?.directExplanation),
    };
    onRecordTurn(studentTurn);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Preparar histórico
      const conversationHistory = [...episode.turns, studentTurn].map((t) => ({
        role: t.role as 'student' | 'tutor',
        text: t.content,
        intent: t.intent,
      }));

      const res = await fetch('/api/pbl/tutor/turn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.sessionId,
          competencyRef: episode.competencyRef,
          questionRef: episode.questionRef,
          userMessage: studentTurn.content,
          studentAttemptContext: {
            userAnswer: episode.initialUserAnswer || '',
            isCorrect: false,
            confidence: episode.initialConfidence,
            attemptStage: episode.attemptStage,
          },
          history: conversationHistory,
          directExplanationRequested: options?.directExplanation,
          cadernoSynthesisRequested: options?.synthesize,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${res.status} ao processar turno.`);
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
        executionMetadata: {
          ...data.executionMetadata,
          durationMs: Date.now() - startTime,
        },
      };

      if (data.notebookDraft) {
        setActiveNotebookDraft(data.notebookDraft);
      }

      onRecordTurn(tutorTurn);
    } catch (err: any) {
      console.error('[PBLTutorChatView] Erro ao enviar mensagem ao tutor:', err);
      setErrorMessage(
        'Houve uma instabilidade temporária na conexão com o Professor SuVeCA. Sua mensagem foi mantida abaixo para que você possa tentar novamente.'
      );
      if (!customMessage) {
        setInputText(textToSend);
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleSaveCaderno = () => {
    if (!onSaveToCaderno) return;
    const draft = activeNotebookDraft;
    const conteudo = draft?.title || question?.prompt || 'Questão da sessão PBL';
    const erroCometido = episode.initialUserAnswer
      ? `Alternativa marcada: ${episode.initialUserAnswer}`
      : 'Dúvida na aplicação do critério';
    const regraDecisiva = draft?.decisionRule || 'Consulte a regra gramatical decisiva e suas condições.';

    onSaveToCaderno(conteudo, erroCometido, regraDecisiva, {
      novoExemplo: draft?.contrastExample || '',
      questionId: episode.questionRef,
      correctAnswer: question?.correctAnswer,
      selectedAnswer: episode.initialUserAnswer,
      origin: 'pbl',
    });
    setSavedLocally(true);
  };

  const latestTurn = episode.turns[episode.turns.length - 1];
  const currentRecommendation: PBLTutorContinuityRecommendation =
    latestTurn?.continuityRecommendation || 'try_same';

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
      {/* Header com contexto da questão */}
      <div className="border-b border-indigo-100 bg-indigo-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Professor SuVeCA</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                  Tutor Contextual
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Investigando critérios e apoiando sua próxima aplicação
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFullQuestion((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-100/60"
            aria-expanded={showFullQuestion}
          >
            {showFullQuestion ? (
              <>
                <span>Ocultar questão</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Ver questão</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Resumo ou questão completa */}
        {showFullQuestion ? (
          <div className="mt-3 p-3 rounded-xl border border-indigo-200/80 bg-white text-xs text-slate-800 space-y-2">
            <p className="font-medium leading-relaxed">{question?.prompt}</p>
            {question?.options && question.options.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {question.options.map((opt) => {
                  const isSelected = opt.label === episode.initialUserAnswer;
                  return (
                    <div
                      key={opt.label}
                      className={`p-2 rounded-lg flex items-start gap-2 ${
                        isSelected
                          ? 'bg-rose-50 border border-rose-200 text-rose-950 font-semibold'
                          : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-mono">{opt.label})</span>
                      <span>{opt.text}</span>
                      {isSelected && (
                        <span className="ml-auto text-[10px] uppercase font-bold text-rose-600">
                          Sua resposta
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-600 line-clamp-1 italic">
            Questão: {question?.prompt || episode.questionRef}
            {episode.initialUserAnswer && (
              <span className="ml-2 font-semibold text-slate-800">
                (Sua resposta: {episode.initialUserAnswer})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Histórico do chat */}
      <div
        className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[320px] max-h-[460px] bg-slate-50/40"
        aria-live="polite"
      >
        {episode.turns.map((turn) => {
          const isTutor = turn.role === 'tutor';
          return (
            <div
              key={turn.turnId}
              className={`flex gap-3 ${isTutor ? 'justify-start' : 'justify-end'}`}
            >
              {isTutor && (
                <div className="mt-1 h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                  isTutor
                    ? 'bg-white border border-slate-200 text-slate-900'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {isTutor && turn.intent && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      <Sparkles className="h-3 w-3" />
                      {intentLabels[turn.intent] || turn.intent}
                    </span>
                    {turn.sourceRefs && turn.sourceRefs.length > 0 && (
                      <span className="text-[10px] text-slate-600 font-medium">
                        Fonte: {turn.sourceRefs[0]}
                      </span>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-wrap">{turn.content}</div>

                {isTutor && turn.executionMetadata?.fallback && (
                  <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 rounded p-1.5 border border-amber-200">
                    Modo seguro offline: orientação baseada diretamente na regra canônica.
                  </div>
                )}
              </div>

              {!isTutor && (
                <div className="mt-1 h-8 w-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-white border border-indigo-100 p-3 shadow-sm flex items-center gap-2 text-xs text-indigo-700">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Professor SuVeCA está analisando os critérios...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Síntese do Caderno de Erros se gerada */}
      {activeNotebookDraft && (
        <div className="mx-4 mb-2 p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <BookOpen className="h-4 w-4 text-amber-700" />
                <span>Síntese para o Caderno de Erros: {activeNotebookDraft.title}</span>
              </div>
              <p className="text-amber-900">
                <span className="font-semibold">Gatilho / Condição:</span> {activeNotebookDraft.triggerCondition}
              </p>
              <p className="text-amber-900">
                <span className="font-semibold">Regra Decisiva:</span> {activeNotebookDraft.decisionRule}
              </p>
              {activeNotebookDraft.contrastExample && (
                <p className="text-amber-900">
                  <span className="font-semibold">Contraste:</span> {activeNotebookDraft.contrastExample}
                </p>
              )}
            </div>

            {onSaveToCaderno && (
              <button
                type="button"
                onClick={handleSaveCaderno}
                disabled={savedLocally}
                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  savedLocally
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
                }`}
              >
                {savedLocally ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Salvo no Caderno</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Salvar no Caderno</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feedback de erro / retry */}
      {errorMessage && (
        <div className="mx-4 mb-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => handleSendMessage()}
                className="font-bold underline hover:text-rose-950"
              >
                Tentar novamente
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => onConclude('try_alternative')}
                className="font-bold underline hover:text-rose-950"
              >
                Continuar sem o tutor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sugestões rápidas de ação pedagógica */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSendMessage(undefined, { directExplanation: true })}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-50"
        >
          <Lightbulb className="h-3 w-3 text-amber-500" />
          <span>Explique diretamente</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSendMessage(undefined, { synthesize: true })}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 disabled:opacity-50"
        >
          <BookOpen className="h-3 w-3 text-amber-600" />
          <span>Sintetizar no Caderno</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSendMessage('Qual é a diferença entre a alternativa correta e a que eu marquei?')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-50"
        >
          <HelpCircle className="h-3 w-3 text-indigo-500" />
          <span>Comparar com a certa</span>
        </button>
      </div>

      {/* Campo de input e envio */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Digite sua dúvida ou raciocínio para o Professor SuVeCA (Enter para enviar)..."
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            className="h-10 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            aria-label="Enviar mensagem"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>

        {/* Botões de continuidade do percurso */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-600">
            Pronto para aplicar? Escolha seu próximo passo:
          </span>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onConclude('try_same')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentRecommendation === 'try_same'
                  ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Tentar mesma questão</span>
            </button>

            <button
              type="button"
              onClick={() => onConclude('try_alternative')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentRecommendation === 'try_alternative'
                  ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Nova questão prática</span>
              <ArrowRight className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={() => onConclude('proceed_reflection')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <span>Concluir e revisar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
