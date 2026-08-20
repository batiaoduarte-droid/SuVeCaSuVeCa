import React, { useEffect, useRef, useState } from 'react';
import type { CadernoErroItem } from '../../types/suveca';
import type {
  PBLAttemptStage,
  PBLCase,
  PBLConfidenceLevel,
  PBLQuestionPresentation,
  PBLSession,
} from '../../types/pbl';
import { pblEngine } from '../../lib/pbl/engine/PBLEngine';
import { PBLSessionRepository } from '../../lib/pbl/persistence/PBLSessionRepository';
import { pblSessionManager } from '../../lib/pbl/session/PBLSessionManager';
import { formatPBLAnswer } from '../../lib/pbl/answerAdapter';
import { PBLProblemCard } from './PBLProblemCard';
import { PBLConfidenceSelector } from './PBLConfidenceSelector';
import { PBLDiagnosticView } from './PBLDiagnosticView';
import { PBLInterventionView } from './PBLInterventionView';
import { PBLTransferView } from './PBLTransferView';
import { PBLSessionSummary } from './PBLSessionSummary';
import { ArrowLeft, PauseCircle, Timer, Trash2 } from 'lucide-react';

interface PBLSessionViewProps {
  onAddErrorToNotebook?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata?: Partial<CadernoErroItem>
  ) => void;
  onRecordAttempt?: (attempt: unknown) => void;
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

export const PBLSessionView: React.FC<PBLSessionViewProps> = ({
  initialSession,
  onExit,
  onAddErrorToNotebook,
  onRecordAttempt,
  onCompleteSession,
  onOpenNotebook,
  onOpenReview,
}) => {
  const [session, setSession] = useState<PBLSession>({
    ...initialSession,
    competencyOutcomes: initialSession.competencyOutcomes || {},
    reflectionNotes: initialSession.reflectionNotes || {},
    savedErrorQuestionRefs: initialSession.savedErrorQuestionRefs || [],
  });
  const [currentCase, setCurrentCase] = useState<PBLCase | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PBLQuestionPresentation | null>(null);
  const [competencyTitles, setCompetencyTitles] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [confidence, setConfidence] = useState<PBLConfidenceLevel | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const attemptStartedAt = useRef(Date.now());

  useEffect(() => {
    pblSessionManager.setSession(session);
  }, [session]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const pblCase = await pblEngine.caseSelector.selectAnchorCase(session.currentCompetencyRef);
      if (active) setCurrentCase(pblCase);
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
    const needsPublishedQuestion = ['hypothesis', 'reattempt', 'transfer'].includes(session.phase);
    if (!needsPublishedQuestion) {
      setCurrentQuestion(null);
      return () => { active = false; };
    }
    setCurrentQuestion(null);
    void (async () => {
      const presentation = await pblEngine.repo.getQuestionPresentation(session.currentQuestionRef);
      if (!active) return;
      setCurrentQuestion(presentation);
      if (!presentation) setErrorMessage('Esta questão não possui apresentação publicada. A sessão foi preservada para retomada.');
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
      const result = await pblEngine.submitAttempt(session, {
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
        responseTimeMs: Date.now() - attemptStartedAt.current,
      });
      const nextSession = { ...result.session };
      setSession(nextSession);
      await persist(nextSession);
      pblSessionManager.emit(
        stage === 'initial' ? 'pbl_initial_attempt' : stage === 'transfer' ? 'pbl_transfer_attempt' : 'pbl_reattempt',
        { attempt: result.attempt }
      );
      onRecordAttempt?.({
        questionId: questionRef,
        isCorrect: result.attempt.isCorrect,
        userAnswer: selectedAnswer,
        correctAnswer,
        moduleId: currentCase?.unitRef,
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
    setSession(nextSession);
    await persist(nextSession);
  };

  const handlePrepareReattempt = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const nextSession = { ...await pblEngine.prepareReattempt(session) };
      setSession(nextSession);
      await persist(nextSession);
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
    setSession(nextSession);
    await persist(nextSession);
  };

  const handleCompleteReflection = async () => {
    if (reflection.trim().length < 8) return;
    const nextSession = { ...pblEngine.completeReflection(session, reflection) };
    setSession(nextSession);
    setReflection('');
    await persist(nextSession);
  };

  const handlePauseAndExit = async () => {
    await persist(session);
    onExit();
  };

  const handleAbandonAndExit = async () => {
    await PBLSessionRepository.abandonSession(session);
    onExit();
  };

  const lastAttempt = session.attempts[session.attempts.length - 1];
  const elapsedMinutes = Math.max(1, Math.ceil(session.sessionStats.totalTimeMs / 60000));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <button type="button" onClick={() => setShowExitConfirmation(true)} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Sair da sessão
        </button>
        <div className="text-center text-xs font-bold text-slate-800">
          Competência {session.currentCompetencyIndex + 1} de {session.targetCompetencyRefs.length}
          <span className="ml-2 rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">{phaseLabels[session.phase]}</span>
        </div>
        <div className="inline-flex items-center gap-1 text-xs text-slate-600"><Timer className="h-4 w-4" /> {elapsedMinutes} min</div>
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
          <PBLProblemCard pblCase={currentCase} selectedAnswer={selectedAnswer} onSelectAnswer={setSelectedAnswer} disabled={loading} />
          {selectedAnswer && (
            <PBLConfidenceSelector confidence={confidence} onSelectConfidence={setConfidence} reasoning={reasoning} onChangeReasoning={setReasoning} onSubmit={() => submitAttempt('initial', currentCase.anchorQuestionRef, currentCase.officialAnswer, currentCase.options.length ? 'multiple_choice' : 'true_false')} disabled={loading} />
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
        <PBLInterventionView intervention={session.lastInterventionPayload} onReattempt={handlePrepareReattempt} />
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
          <h2 className="text-base font-bold text-slate-900">Feche o ciclo com uma regra de decisão</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">{session.pendingNextAction?.feedbackMessage}</p>
          <label htmlFor="pbl-reflection" className="mt-5 block text-xs font-bold text-slate-800">Que critério você aplicará primeiro na próxima questão semelhante?</label>
          <textarea id="pbl-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Escreva com suas palavras o teste ou contraste decisivo." />
          <div className="mt-4 flex justify-end"><button type="button" onClick={handleCompleteReflection} disabled={reflection.trim().length < 8 || loading} className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Registrar reflexão e continuar</button></div>
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
