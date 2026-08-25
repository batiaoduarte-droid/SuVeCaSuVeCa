import React, { useEffect, useRef, useState } from 'react';
import type { CadernoErroItem } from '../../types/suveca';
import type {
  PBLAttemptStage,
  PBLCase,
  PBLConfidenceLevel,
  PBLQuestionPresentation,
  PBLReflectionDecision,
  PBLSession,
} from '../../types/pbl';
import { pblEngine } from '../../lib/pbl/engine/PBLEngine';
import { PBLSessionRepository } from '../../lib/pbl/persistence/PBLSessionRepository';
import { pblSessionManager } from '../../lib/pbl/session/PBLSessionManager';
import { formatPBLAnswer } from '../../lib/pbl/answerAdapter';
import type { PBLRulePresentation } from '../../lib/pbl/data/PBLRepository';
import { PBLProblemCard } from './PBLProblemCard';
import { PBLConfidenceSelector } from './PBLConfidenceSelector';
import { PBLDiagnosticView } from './PBLDiagnosticView';
import { PBLInterventionView } from './PBLInterventionView';
import { PBLTransferView } from './PBLTransferView';
import { PBLSessionSummary } from './PBLSessionSummary';
import { ArrowLeft, BookOpenCheck, CheckCircle2, Lightbulb, PauseCircle, Timer, Trash2 } from 'lucide-react';

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
  const [session, setSession] = useState<PBLSession>({
    ...initialSession,
    competencyOutcomes: initialSession.competencyOutcomes || {},
    reflectionNotes: initialSession.reflectionNotes || {},
    reflectionEntries: initialSession.reflectionEntries || {},
    reflectionDrafts: initialSession.reflectionDrafts || {},
    savedErrorQuestionRefs: initialSession.savedErrorQuestionRefs || [],
  });
  const [currentCase, setCurrentCase] = useState<PBLCase | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PBLQuestionPresentation | null>(null);
  const [currentRule, setCurrentRule] = useState<PBLRulePresentation | null>(null);
  const [competencyTitles, setCompetencyTitles] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [confidence, setConfidence] = useState<PBLConfidenceLevel | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [reflection, setReflection] = useState('');
  const [reflectionDecision, setReflectionDecision] = useState<PBLReflectionDecision | ''>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const attemptStartedAt = useRef(Date.now());

  useEffect(() => {
    pblSessionManager.setSession(session);
  }, [session]);

  useEffect(() => {
    if (session.phase !== 'reflection') return;
    const draft = session.reflectionDrafts?.[session.currentCompetencyRef];
    setReflection(draft?.note || '');
    setReflectionDecision(draft?.decision || '');
  }, [session.phase, session.currentCompetencyRef]);

  useEffect(() => {
    if (session.phase !== 'reflection') return;
    const timer = window.setTimeout(() => {
      PBLSessionRepository.saveSessionLocally({
        ...session,
        reflectionDrafts: {
          ...(session.reflectionDrafts || {}),
          [session.currentCompetencyRef]: {
            decision: reflectionDecision || undefined,
            note: reflection,
            suggestedRule: session.reflectionDrafts?.[session.currentCompetencyRef]?.suggestedRule || '',
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [reflection, reflectionDecision, session.phase, session.currentCompetencyRef]);

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
  const reflectionIsValid = Boolean(
    reflectionDecision
    && (reflectionDecision !== 'own_rule' || reflectionWordCount >= 4)
  );

  const handleCompleteReflection = async () => {
    if (!reflectionDecision || !reflectionIsValid) return;
    const nextSession = {
      ...pblEngine.completeReflection(session, {
        decision: reflectionDecision,
        note: reflection,
        suggestedRule: suggestedReflectionRule,
      }),
    };
    setSession(nextSession);
    setReflection('');
    setReflectionDecision('');
    await persist(nextSession);
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
              updatedAt: new Date().toISOString(),
            },
          },
        }
      : session;
    await persist(nextSession);
    onExit();
  };

  const handleAbandonAndExit = async () => {
    await PBLSessionRepository.abandonSession(session);
    onExit();
  };

  const lastAttempt = session.attempts[session.attempts.length - 1];
  const currentCompetencyAttempts = session.attempts.filter(
    (attempt) => attempt.competencyRef === session.currentCompetencyRef
  );
  const transferAttempts = currentCompetencyAttempts.filter((attempt) => attempt.stage === 'transfer');
  const transferCorrect = transferAttempts.filter((attempt) => attempt.isCorrect).length;
  const elapsedMinutes = Math.max(1, Math.ceil(session.sessionStats.totalTimeMs / 60000));

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
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Transforme o resultado em uma decisão para a próxima questão</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">{session.pendingNextAction?.feedbackMessage}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">O que o ciclo mostrou</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {transferAttempts.length
                  ? `${transferCorrect} de ${transferAttempts.length} itens de transferência corretos`
                  : `${currentCompetencyAttempts.filter((attempt) => attempt.isCorrect).length} de ${currentCompetencyAttempts.length} respostas corretas`}
              </p>
              <p className="mt-1 text-xs text-slate-600">Use essa evidência para decidir se a regra já está clara ou precisa de revisão.</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700"><Lightbulb className="h-3.5 w-3.5" /> Critério para a próxima questão</p>
              <p className="mt-2 text-xs font-bold text-indigo-950">{suggestedReflectionRuleTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-950">{suggestedReflectionRule}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-indigo-800">Esta é a orientação que você poderá reaplicar ao encontrar uma questão semelhante.</p>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="text-xs font-bold text-slate-800">Como você quer fechar esta competência?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {([
                ['own_rule', 'Consigo explicar', 'Vou registrar o critério com minhas palavras.'],
                ['suggested_rule', 'Usar este critério', 'A orientação acima representa o que devo aplicar.'],
                ['needs_review', 'Ainda não sei', 'Quero encaminhar este ponto para revisão.'],
              ] as const).map(([value, title, description]) => (
                <label key={value} className={`cursor-pointer rounded-xl border p-3 ${reflectionDecision === value ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-white'}`}>
                  <input type="radio" name="pbl-reflection-decision" value={value} checked={reflectionDecision === value} onChange={() => setReflectionDecision(value)} className="sr-only" />
                  <span className="block text-xs font-bold text-slate-900">{title}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-600">{description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {reflectionDecision === 'own_rule' && (
            <div className="mt-5">
              <label htmlFor="pbl-reflection" className="block text-xs font-bold text-slate-800">Complete: “Na próxima questão, primeiro vou…”</label>
              <textarea id="pbl-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Ex.: identificar as letras que representam um único som e só então contar letras e fonemas." />
              <p className={`mt-1 text-[11px] ${reflection && reflectionWordCount < 4 ? 'text-amber-700' : 'text-slate-500'}`}>Registre ao menos quatro palavras que expressem uma ação ou teste verificável.</p>
            </div>
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
