import React, { useEffect, useRef, useState } from 'react';
import type { CadernoErroItem } from '../../types/suveca';
import type {
  PBLAssistanceLevel,
  PBLAttemptStage,
  PBLAttemptTelemetryPayload,
  PBLCase,
  PBLConfidenceLevel,
  PBLQuestionPresentation,
  PBLReflectionDecision,
  PBLSession,
} from '../../types/pbl';
import { pblEngine } from '../../lib/pbl/engine/PBLEngine';
import { PBLSessionRepository } from '../../lib/pbl/persistence/PBLSessionRepository';
import { pblSessionManager } from '../../lib/pbl/session/PBLSessionManager';
import {
  accumulatePBLSessionTiming,
  createPBLTimingCursor,
  currentPBLWallTimeMs,
  hydratePBLSessionTiming,
} from '../../lib/pbl/session/PBLSessionTiming';
import { formatPBLAnswer } from '../../lib/pbl/answerAdapter';
import type { PBLRulePresentation } from '../../lib/pbl/data/PBLRepository';
import { PBLProblemCard } from './PBLProblemCard';
import { PBLConfidenceSelector } from './PBLConfidenceSelector';
import { PBLDiagnosticView } from './PBLDiagnosticView';
import { PBLInterventionView } from './PBLInterventionView';
import { PBLTransferView } from './PBLTransferView';
import { PBLSessionSummary } from './PBLSessionSummary';
import { ArrowLeft, BookOpenCheck, CheckCircle2, Eye, Lightbulb, PauseCircle, Timer, Trash2 } from 'lucide-react';

interface PBLSessionViewProps {
  onAddErrorToNotebook?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata?: Partial<CadernoErroItem>
  ) => void;
  onRecordAttempt?: (attempt: PBLAttemptTelemetryPayload) => void;
  onCompleteSession?: () => void;
  onOpenNotebook?: () => void;
  onOpenReview?: () => void;
  initialSession: PBLSession;
  onExit: () => void;
}

const phaseLabels: Record<PBLSession['phase'], string> = {
  problem: 'Caso inicial',
  hypothesis: 'Sondagem',
  diagnostic: 'Feedback',
  intervention: 'Microestudo',
  reattempt: 'Nova aplicação',
  transfer: 'Transferência',
  reflection: 'Reflexão',
  completed: 'Resumo',
};

const learnerFacingRule = (value: string | null | undefined) => {
  const text = String(value || '').trim();
  if (text.length < 12) return '';
  return /^(?:RULE|RULF|PROC|WARN|MISC|KB|OBJ|COMP)-[A-Z0-9-]+$/i.test(text) ? '' : text;
};

export const PBLSessionView: React.FC<PBLSessionViewProps> = ({
  initialSession,
  onExit,
  onAddErrorToNotebook,
  onRecordAttempt,
  onCompleteSession,
  onOpenNotebook,
  onOpenReview,
}) => {
  const [session, setSession] = useState<PBLSession>(() => hydratePBLSessionTiming({
    ...initialSession,
    competencyOutcomes: initialSession.competencyOutcomes || {},
    reflectionNotes: initialSession.reflectionNotes || {},
    reflectionEntries: initialSession.reflectionEntries || {},
    reflectionDrafts: initialSession.reflectionDrafts || {},
    savedErrorQuestionRefs: initialSession.savedErrorQuestionRefs || [],
    interventionAssistance: initialSession.interventionAssistance || {},
  }));
  const [currentCase, setCurrentCase] = useState<PBLCase | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PBLQuestionPresentation | null>(null);
  const [currentRule, setCurrentRule] = useState<PBLRulePresentation | null>(null);
  const [competencyTitles, setCompetencyTitles] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [confidence, setConfidence] = useState<PBLConfidenceLevel | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [reflection, setReflection] = useState('');
  const [reflectionDecision, setReflectionDecision] = useState<PBLReflectionDecision | ''>('');
  const [revealedSuggestedRule, setRevealedSuggestedRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const attemptStartedAt = useRef(Date.now());
  const sessionRef = useRef(session);
  const timingCursor = useRef(createPBLTimingCursor(session));

  useEffect(() => {
    sessionRef.current = session;
    pblSessionManager.setSession(session);
  }, [session]);

  useEffect(() => {
    if (!timingCursor.current.running) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [session.phase, session.status]);

  useEffect(() => {
    const pauseTiming = () => {
      if (!timingCursor.current.running) return;
      const measured = accumulatePBLSessionTiming(
        sessionRef.current,
        timingCursor.current,
        Date.now(),
        false
      );
      timingCursor.current = measured.cursor;
      sessionRef.current = measured.session;
      setSession(measured.session);
      PBLSessionRepository.saveSessionLocally(measured.session);
    };
    const handleVisibility = () => {
      if (document.hidden) {
        pauseTiming();
        return;
      }
      timingCursor.current = createPBLTimingCursor(sessionRef.current);
      setClockNow(Date.now());
    };
    const handlePageHide = () => pauseTiming();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  useEffect(() => {
    if (session.phase !== 'reflection') return;
    const draft = session.reflectionDrafts?.[session.currentCompetencyRef];
    setReflection(draft?.note || '');
    setReflectionDecision(draft?.decision || '');
    setRevealedSuggestedRule(Boolean(draft?.revealedSuggestedRule));
  }, [session.phase, session.currentCompetencyRef]);

  useEffect(() => {
    if (session.phase !== 'reflection') return;
    const timer = window.setTimeout(() => {
      const timingPreview = accumulatePBLSessionTiming(
        session,
        timingCursor.current,
        Date.now()
      ).session;
      PBLSessionRepository.saveSessionLocally({
        ...timingPreview,
        reflectionDrafts: {
          ...(session.reflectionDrafts || {}),
          [session.currentCompetencyRef]: {
            decision: reflectionDecision || undefined,
            note: reflection,
            suggestedRule: suggestedReflectionRule,
            assistanceUsed: reflectionDecision === 'suggested_rule',
            revealedSuggestedRule,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [reflection, reflectionDecision, revealedSuggestedRule, session.phase, session.currentCompetencyRef]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const pblCase = await pblEngine.caseSelector.selectAnchorCase(session.currentCompetencyRef);
      if (!active) return;
      setCurrentCase(pblCase);
      setCurrentRule(null);
      const ruleRef = pblCase?.primaryDecisiveRuleRef
        || pblCase?.solutionStrategy.formulasOrRulesApplied?.[0];
      if (!pblCase || !ruleRef) return;
      const presentation = await pblEngine.repo.getRulePresentation(pblCase.unitRef, ruleRef);
      if (active) setCurrentRule(presentation);
    })();
    return () => { active = false; };
  }, [session.currentCaseRef, session.currentCompetencyRef]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const entries = await Promise.all(
        session.targetCompetencyRefs.map(async (id) => [id, (await pblEngine.repo.getCompetency(id))?.title || 'Competência em estudo'] as const)
      );
      if (active) setCompetencyTitles(Object.fromEntries(entries));
    })();
    return () => { active = false; };
  }, [session.targetCompetencyRefs]);

  useEffect(() => {
    let active = true;
    const needsPublishedQuestion = ['problem', 'hypothesis', 'reattempt', 'transfer'].includes(session.phase);
    if (!needsPublishedQuestion) {
      setCurrentQuestion(null);
      return () => { active = false; };
    }
    setCurrentQuestion(null);
    void (async () => {
      const presentation = await pblEngine.repo.getQuestionPresentation(session.currentQuestionRef);
      if (!active) return;
      setCurrentQuestion(presentation);
      if (!presentation && session.phase !== 'problem') {
        setErrorMessage('Esta questão não possui apresentação publicada. A sessão foi preservada para retomada.');
      }
    })();
    return () => { active = false; };
  }, [session.phase, session.currentQuestionRef]);

  useEffect(() => {
    setSelectedAnswer('');
    setConfidence(null);
    setReasoning('');
    attemptStartedAt.current = Date.now();
  }, [session.phase, session.currentQuestionRef]);

  const persist = async (nextSession: PBLSession) => {
    try {
      await PBLSessionRepository.saveSession(nextSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar a sessão.');
    }
  };

  const commitSession = async (
    nextSession: PBLSession,
    continueTiming: boolean = nextSession.status === 'active' && nextSession.phase !== 'completed'
  ): Promise<PBLSession> => {
    const measured = accumulatePBLSessionTiming(
      nextSession,
      timingCursor.current,
      Date.now(),
      continueTiming
    );
    timingCursor.current = measured.cursor;
    sessionRef.current = measured.session;
    setSession(measured.session);
    setClockNow(Date.now());
    await persist(measured.session);
    return measured.session;
  };

  const submitAttempt = async (
    stage: PBLAttemptStage,
    questionRef: string,
    correctAnswer: string,
    answerMode: 'true_false' | 'multiple_choice'
  ) => {
    if (!selectedAnswer || !confidence) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const responseTimeMs = Date.now() - attemptStartedAt.current;
      const assistanceLevel: PBLAssistanceLevel = stage === 'reattempt'
        ? session.interventionAssistance?.[session.currentCompetencyRef] || 'diagnostic'
        : stage === 'probe'
          ? 'diagnostic'
          : 'none';
      const timingSnapshot = accumulatePBLSessionTiming(
        session,
        timingCursor.current,
        Date.now()
      );
      timingCursor.current = timingSnapshot.cursor;
      const result = await pblEngine.submitAttempt(timingSnapshot.session, {
        sessionId: session.sessionId,
        questionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: selectedAnswer,
        correctAnswer,
        confidence,
        stage,
        reasoning,
        transferType: stage === 'transfer' ? session.currentTransferItem?.transferType : undefined,
        answerMode,
        responseTimeMs,
        assistanceLevel,
      });
      const nextSession = await commitSession({ ...result.session });
      pblSessionManager.emit(
        stage === 'initial' ? 'pbl_initial_attempt' : stage === 'transfer' ? 'pbl_transfer_attempt' : 'pbl_reattempt',
        { attempt: result.attempt }
      );
      onRecordAttempt?.({
        attemptId: result.attempt.attemptId,
        createdAt: result.attempt.createdAt,
        questionId: questionRef,
        isCorrect: result.attempt.isCorrect,
        userAnswer: selectedAnswer,
        correctAnswer,
        moduleId: currentCase?.unitRef,
        competencyId: result.attempt.competencyRef,
        sessionId: nextSession.sessionId,
        stage,
        confidence,
        responseTimeMs,
        assistanceLevel,
      });
    } catch (error) {
      console.error('[PBLSessionView] Error submitting attempt:', error);
      setErrorMessage('Não foi possível avaliar a resposta. Sua sessão continua salva.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterDiagnostic = async () => {
    const nextSession = { ...pblEngine.continueAfterDiagnostic(session) };
    await commitSession(nextSession);
  };

  const handleAssistanceChange = (level: PBLAssistanceLevel) => {
    const nextSession = {
      ...session,
      interventionAssistance: {
        ...(session.interventionAssistance || {}),
        [session.currentCompetencyRef]: level,
      },
      updatedAt: new Date().toISOString(),
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
    PBLSessionRepository.saveSessionLocally(nextSession);
  };

  const handlePrepareReattempt = async (level: PBLAssistanceLevel) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const assistedSession = {
        ...session,
        interventionAssistance: {
          ...(session.interventionAssistance || {}),
          [session.currentCompetencyRef]: level,
        },
      };
      const nextSession = { ...await pblEngine.prepareReattempt(assistedSession) };
      await commitSession(nextSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível preparar a nova questão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCaderno = async () => {
    const lastAttempt = session.attempts[session.attempts.length - 1];
    if (!lastAttempt || session.savedErrorQuestionRefs?.includes(lastAttempt.questionRef)) return;
    const presentation = await pblEngine.repo.getQuestionPresentation(lastAttempt.questionRef);
    const isMultipleChoice = Boolean(presentation?.options.length || currentCase?.options.length);
    const mastery = session.masterySnapshot[lastAttempt.competencyRef];
    onAddErrorToNotebook?.(
      presentation?.prompt || currentCase?.questionStem || 'Questão PBL',
      `Escolhi ${formatPBLAnswer(lastAttempt.userAnswer, isMultipleChoice)}; a resposta oficial é ${formatPBLAnswer(lastAttempt.correctAnswer, isMultipleChoice)}.`,
      session.lastInterventionPayload?.ruleStatement || session.lastInterventionPayload?.microLessonText || session.lastDiagnosticResult?.intervention.microLesson || 'Reaplicar o critério decisivo antes de responder.',
      {
        questionId: lastAttempt.questionRef,
        moduleRef: currentCase?.unitRef,
        origin: 'pbl',
        questionText: presentation?.prompt || currentCase?.questionStem,
        selectedAnswer: formatPBLAnswer(lastAttempt.userAnswer, isMultipleChoice),
        correctAnswer: formatPBLAnswer(lastAttempt.correctAnswer, isMultipleChoice),
        bank: presentation?.examBoard || 'PBL SuVeCA',
        year: presentation?.year,
        conceptIds: currentCase?.targetConceptRefs,
        sourceRefs: [`QUESTION:${lastAttempt.questionRef}`, `PBL_SESSION:${session.sessionId}`],
        nextReviewAt: mastery?.nextReviewRecommendedAt,
        novoExemplo: 'Resolver uma questão isomórfica sem consultar o gabarito e explicitar o critério usado.',
      }
    );
    const nextSession = {
      ...session,
      savedErrorQuestionRefs: [...(session.savedErrorQuestionRefs || []), lastAttempt.questionRef],
    };
    await commitSession(nextSession);
  };

  const suggestedReflectionRule = [
    session.lastInterventionPayload?.ruleStatement,
    currentRule?.statement,
    session.lastDiagnosticResult?.intervention.microLesson,
    ...(currentCase?.solutionStrategy.formulasOrRulesApplied || []),
    currentCase?.cognitiveDiagnostic.correctiveGuidance,
    ...(currentCase?.solutionStrategy.stepByStepAlgorithm || []),
  ].map(learnerFacingRule).find(Boolean)
    || `Antes de responder, identifique o critério decisivo de ${competencyTitles[session.currentCompetencyRef] || 'esta competência'} e aplique-o ao enunciado.`;
  const suggestedReflectionRuleTitle = learnerFacingRule(session.lastInterventionPayload?.ruleTitle)
    || currentRule?.title
    || 'Orientação prática';
  const reflectionWordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const hasActiveRecall = reflectionWordCount >= 6;
  const reflectionIsValid = Boolean(
    reflectionDecision
    && revealedSuggestedRule
    && (reflectionDecision !== 'own_rule' || hasActiveRecall)
  );

  const handleCompleteReflection = async () => {
    if (!reflectionDecision || !reflectionIsValid) return;
    const nextSession = {
      ...pblEngine.completeReflection(session, {
        decision: reflectionDecision,
        note: reflection,
        suggestedRule: suggestedReflectionRule,
        assistanceUsed: reflectionDecision === 'suggested_rule',
        revealedSuggestedRule,
      }),
    };
    await commitSession(nextSession);
    setReflection('');
    setReflectionDecision('');
    setRevealedSuggestedRule(false);
  };

  const handlePauseAndExit = async () => {
    const nextSession = session.phase === 'reflection'
      ? {
          ...session,
          reflectionDrafts: {
            ...(session.reflectionDrafts || {}),
            [session.currentCompetencyRef]: {
              decision: reflectionDecision || undefined,
              note: reflection,
              suggestedRule: suggestedReflectionRule,
              assistanceUsed: reflectionDecision === 'suggested_rule',
              revealedSuggestedRule,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      : session;
    await commitSession(nextSession, false);
    onExit();
  };

  const handleAbandonAndExit = async () => {
    const measured = accumulatePBLSessionTiming(
      session,
      timingCursor.current,
      Date.now(),
      false
    );
    timingCursor.current = measured.cursor;
    sessionRef.current = measured.session;
    await PBLSessionRepository.abandonSession(measured.session);
    onExit();
  };

  const lastAttempt = session.attempts[session.attempts.length - 1];
  const currentCompetencyAttempts = session.attempts.filter(
    (attempt) => attempt.competencyRef === session.currentCompetencyRef
  );
  const transferAttempts = currentCompetencyAttempts.filter((attempt) => attempt.stage === 'transfer');
  const transferCorrect = transferAttempts.filter((attempt) => attempt.isCorrect).length;
  const elapsedMinutes = Math.max(
    1,
    Math.ceil(currentPBLWallTimeMs(session, timingCursor.current, clockNow) / 60_000)
  );
  const budgetMinutes = Math.round((session.sessionBudgetMs || 12 * 60_000) / 60_000);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <button type="button" onClick={() => setShowExitConfirmation(true)} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Sair da sessão
        </button>
        <div className="text-center text-xs font-bold text-slate-800">
          Competência {session.currentCompetencyIndex + 1} de {session.targetCompetencyRefs.length}
          <span className="ml-2 rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">{phaseLabels[session.phase]}</span>
        </div>
        <div className="inline-flex items-center gap-1 text-xs text-slate-600"><Timer className="h-4 w-4" /> {elapsedMinutes} min · limite adaptativo {budgetMinutes} min</div>
      </div>

      {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">{errorMessage}</div>}

      {showExitConfirmation && (
        <div role="dialog" aria-modal="true" aria-labelledby="pbl-exit-title" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 id="pbl-exit-title" className="text-sm font-bold text-amber-950">Deseja pausar ou encerrar esta sessão?</h2>
          <p className="mt-1 text-xs text-amber-900">Ao pausar, você poderá continuar exatamente desta etapa no Painel PBL.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={handlePauseAndExit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white"><PauseCircle className="h-4 w-4" /> Pausar e sair</button>
            <button type="button" onClick={handleAbandonAndExit} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-xs font-bold text-rose-800"><Trash2 className="h-4 w-4" /> Encerrar sessão</button>
            <button type="button" onClick={() => setShowExitConfirmation(false)} className="min-h-11 rounded-xl px-4 text-xs font-bold text-slate-700">Continuar estudando</button>
          </div>
        </div>
      )}

      {session.phase === 'problem' && currentCase && (
        <div>
          <PBLProblemCard
            pblCase={currentCase}
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={setSelectedAnswer}
            disabled={loading}
          />
          {selectedAnswer && (
            <PBLConfidenceSelector
              confidence={confidence}
              onSelectConfidence={setConfidence}
              reasoning={reasoning}
              onChangeReasoning={setReasoning}
              onSubmit={() => submitAttempt(
                'initial',
                currentQuestion?.questionRef || currentCase.anchorQuestionRef,
                currentQuestion?.correctAnswer || currentCase.officialAnswer,
                currentQuestion?.questionType || (currentCase.options.length ? 'multiple_choice' : 'true_false')
              )}
              disabled={loading}
            />
          )}
        </div>
      )}

      {session.phase === 'diagnostic' && lastAttempt && (
        <PBLDiagnosticView
          attempt={lastAttempt}
          diagnostic={session.lastDiagnosticResult}
          nextAction={session.pendingNextAction}
          onContinue={handleContinueAfterDiagnostic}
          onSaveToCaderno={!lastAttempt.isCorrect ? handleSaveToCaderno : undefined}
          isSavedToCaderno={Boolean(session.savedErrorQuestionRefs?.includes(lastAttempt.questionRef))}
        />
      )}

      {session.phase === 'intervention' && session.lastInterventionPayload && (
        <PBLInterventionView
          intervention={session.lastInterventionPayload}
          initialAssistanceLevel={session.interventionAssistance?.[session.currentCompetencyRef]}
          onAssistanceChange={handleAssistanceChange}
          onReattempt={handlePrepareReattempt}
        />
      )}

      {['hypothesis', 'reattempt', 'transfer'].includes(session.phase) && currentQuestion && (
        <div>
          <PBLTransferView
            transferItem={session.currentTransferItem}
            question={currentQuestion}
            kind={session.phase === 'hypothesis' ? 'probe' : session.phase === 'reattempt' ? 'reattempt' : 'transfer'}
            itemIndex={session.currentTransferItemIndex}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={setSelectedAnswer}
            disabled={loading}
            feedbackMessage={session.phase === 'transfer' ? session.lastFeedbackMessage : undefined}
          />
          {selectedAnswer && (
            <PBLConfidenceSelector
              confidence={confidence}
              onSelectConfidence={setConfidence}
              reasoning={reasoning}
              onChangeReasoning={setReasoning}
              onSubmit={() => submitAttempt(session.phase === 'hypothesis' ? 'probe' : session.phase === 'reattempt' ? 'reattempt' : 'transfer', currentQuestion.questionRef, currentQuestion.correctAnswer, currentQuestion.questionType)}
              submitLabel={session.phase === 'hypothesis' ? 'Confirmar sondagem' : session.phase === 'reattempt' ? 'Confirmar nova aplicação' : 'Validar transferência'}
              disabled={loading}
            />
          )}
        </div>
      )}

      {session.phase === 'reflection' && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Transforme o resultado em uma decisão para a próxima questão</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">{session.pendingNextAction?.feedbackMessage}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">O que o ciclo mostrou</p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {transferAttempts.length
                ? `${transferCorrect} de ${transferAttempts.length} itens de transferência corretos`
                : `${currentCompetencyAttempts.filter((attempt) => attempt.isCorrect).length} de ${currentCompetencyAttempts.length} respostas corretas`}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {session.pendingNextAction?.outcome === 'retention_confirmed'
                ? 'Esta revisão atrasada reuniu evidência de retenção sem apoio; registre agora como recuperou o critério.'
                : session.pendingNextAction?.outcome === 'transfer_confirmed' || session.pendingNextAction?.outcome === 'mastered'
                  ? 'Este é um resultado imediato; a retenção ainda será verificada em uma revisão futura.'
                  : 'A evidência ainda não é suficiente para confirmar transferência ou retenção; o ponto seguirá para revisão.'}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-indigo-200 bg-white p-4">
            <label htmlFor="pbl-reflection" className="block text-xs font-bold text-slate-900">
              Sem consultar a orientação, complete: “Na próxima questão, primeiro vou…”
            </label>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Recupere uma ação ou teste verificável com suas palavras. Depois, compare com o critério publicado.
            </p>
            <textarea
              id="pbl-reflection"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              disabled={revealedSuggestedRule}
              rows={3}
              className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-700"
              placeholder="Escreva o procedimento que você tentaria aplicar sem rever a explicação."
            />
            <p className={`mt-1 text-[11px] ${reflection && !hasActiveRecall ? 'text-amber-700' : 'text-slate-500'}`}>
              {reflectionWordCount} palavra{reflectionWordCount === 1 ? '' : 's'} · registre ao menos seis antes de comparar.
            </p>
            {!revealedSuggestedRule && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!hasActiveRecall}
                  onClick={() => { setRevealedSuggestedRule(true); setReflectionDecision('own_rule'); }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" /> Comparar com a orientação
                </button>
                <button
                  type="button"
                  onClick={() => { setRevealedSuggestedRule(true); setReflectionDecision('suggested_rule'); }}
                  className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-bold text-amber-900"
                >
                  Não consegui recuperar · mostrar orientação
                </button>
              </div>
            )}
          </div>

          {revealedSuggestedRule && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4" aria-live="polite">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700"><Lightbulb className="h-3.5 w-3.5" /> Orientação para comparação</p>
              <p className="mt-2 text-xs font-bold text-indigo-950">{suggestedReflectionRuleTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-950">{suggestedReflectionRule}</p>
            </div>
          )}

          {revealedSuggestedRule && (
            <fieldset className="mt-5">
              <legend className="text-xs font-bold text-slate-800">Como você quer fechar esta competência?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {([
                  ['own_rule', 'Manter minha regra', 'Minha recuperação expressa o procedimento que vou aplicar.'],
                  ['suggested_rule', 'Adotar a orientação', 'Vou usar o critério publicado; esta decisão será marcada como assistida.'],
                  ['needs_review', 'Ainda preciso revisar', 'Quero encaminhar este ponto para recuperação futura.'],
                ] as const).map(([value, title, description]) => {
                  const disabled = value === 'own_rule' && !hasActiveRecall;
                  return (
                    <label key={value} className={`rounded-xl border p-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${reflectionDecision === value ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="pbl-reflection-decision" value={value} checked={reflectionDecision === value} disabled={disabled} onChange={() => setReflectionDecision(value)} className="sr-only" />
                      <span className="block text-xs font-bold text-slate-900">{title}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-600">{description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {reflectionDecision === 'needs_review' && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Esta escolha é válida: a competência será marcada para revisão e aparecerá assim no resumo.</p>
            </div>
          )}

          <div className="mt-5 flex justify-end"><button type="button" onClick={handleCompleteReflection} disabled={!reflectionIsValid || loading} className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Salvar decisão e ver próximos passos</button></div>
        </div>
      )}

      {session.phase === 'completed' && (
        <PBLSessionSummary
          session={session}
          competencyTitles={competencyTitles}
          onOpenNotebook={onOpenNotebook}
          onOpenReview={onOpenReview}
          onFinishSession={() => { onCompleteSession?.(); onExit(); }}
        />
      )}
    </div>
  );
};
