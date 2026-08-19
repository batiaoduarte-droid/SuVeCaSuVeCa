import React, { useState, useEffect } from 'react';
import type { PBLSession, PBLConfidenceLevel, PBLCase } from '../../types/pbl';
import { pblEngine } from '../../lib/pbl/engine/PBLEngine';
import { PBLSessionRepository } from '../../lib/pbl/persistence/PBLSessionRepository';
import { pblSessionManager } from '../../lib/pbl/session/PBLSessionManager';
import { PBLProblemCard } from './PBLProblemCard';
import { PBLConfidenceSelector } from './PBLConfidenceSelector';
import { PBLDiagnosticView } from './PBLDiagnosticView';
import { PBLInterventionView } from './PBLInterventionView';
import { PBLTransferView } from './PBLTransferView';
import { PBLSessionSummary } from './PBLSessionSummary';
import { ArrowLeft, Brain, Timer } from 'lucide-react';

interface PBLSessionViewProps {
  onAddErrorToNotebook?: (conteudo: string, erroCometido: string, regraDecisiva: string, metadata?: any) => void;
  onRecordAttempt?: (attempt: any) => void;
  onCompleteSession?: () => void;
  initialSession: PBLSession;
  onExit: () => void;
}

export const PBLSessionView: React.FC<PBLSessionViewProps> = ({
  initialSession,
  onExit,
  onAddErrorToNotebook,
  onRecordAttempt,
  onCompleteSession,
}) => {
  const [session, setSession] = useState<PBLSession>(initialSession);
  const [currentCase, setCurrentCase] = useState<PBLCase | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [confidence, setConfidence] = useState<PBLConfidenceLevel>('medium');
  const [reasoning, setReasoning] = useState<string>('');
  const [startTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(false);
  const [isSavedToCaderno, setIsSavedToCaderno] = useState<boolean>(false);

  useEffect(() => {
    pblSessionManager.setSession(session);
    loadCurrentCase();
  }, [session.currentCaseRef, session.currentCompetencyRef]);

  const loadCurrentCase = async () => {
    const cs = await pblEngine.caseSelector.selectAnchorCase(session.currentCompetencyRef);
    setCurrentCase(cs);
  };

    const handleSaveToCaderno = () => {
    if (!currentCase || !session.attempts.length || isSavedToCaderno) return;
    const lastAttempt = session.attempts[session.attempts.length - 1];
    if (onAddErrorToNotebook) {
      onAddErrorToNotebook(
        currentCase.questionStem || currentCase.title,
        `Resposta selecionada: ${lastAttempt.userAnswer} (Gabarito: ${currentCase.officialAnswer})`,
        session.lastDiagnosticResult?.intervention?.refutationText || session.lastInterventionPayload?.microLessonText || 'Aplicação de regra canônica SuVeCa',
        {
          questaoId: currentCase.anchorQuestionRef,
          moduloId: currentCase.unitRef,
          origin: 'pbl',
        }
      );
      setIsSavedToCaderno(true);
    }
  };

  const handleSubmitInitialAttempt = async () => {
    if (!selectedAnswer || !currentCase) return;
    setLoading(true);

    try {
      const responseTimeMs = Date.now() - startTime;
      const result = await pblEngine.submitAttempt(session, {
        sessionId: session.sessionId,
        questionRef: currentCase.anchorQuestionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: selectedAnswer,
        correctAnswer: currentCase.officialAnswer,
        confidence,
        stage: 'initial',
        reasoning,
        responseTimeMs,
      });

      setSession({ ...result.session });
      await PBLSessionRepository.saveSession(result.session);
      pblSessionManager.emit('pbl_initial_attempt', { attempt: result.attempt });
      if (onRecordAttempt) {
        onRecordAttempt({
          questionId: currentCase.anchorQuestionRef,
          isCorrect: result.attempt.isCorrect,
          userAnswer: selectedAnswer,
          correctAnswer: currentCase.officialAnswer,
          moduleId: currentCase.unitRef,
        });
      }
    } catch (err) {
      console.error('[PBLSessionView] Error submitting attempt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToIntervention = () => {
    setSession((prev) => ({ ...prev, phase: 'intervention' }));
  };

  const handleReattempt = () => {
    setSelectedAnswer('');
    setIsSavedToCaderno(false);
    setSession((prev) => ({ ...prev, phase: 'reattempt' }));
  };

  const handleSubmitReattempt = async () => {
    if (!selectedAnswer || !currentCase) return;
    setLoading(true);

    try {
      const responseTimeMs = Date.now() - startTime;
      const result = await pblEngine.submitAttempt(session, {
        sessionId: session.sessionId,
        questionRef: currentCase.anchorQuestionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: selectedAnswer,
        correctAnswer: currentCase.officialAnswer,
        confidence,
        stage: 'reattempt',
        reasoning,
        responseTimeMs,
      });

      setSession({ ...result.session });
      await PBLSessionRepository.saveSession(result.session);
      pblSessionManager.emit('pbl_reattempt', { attempt: result.attempt });
      if (onRecordAttempt) {
        onRecordAttempt({
          questionId: currentCase.anchorQuestionRef,
          isCorrect: result.attempt.isCorrect,
          userAnswer: selectedAnswer,
          correctAnswer: currentCase.officialAnswer,
          moduleId: currentCase.unitRef,
        });
      }
    } catch (err) {
      console.error('[PBLSessionView] Error submitting reattempt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransfer = async () => {
    if (!selectedAnswer || !currentCase) return;
    setLoading(true);

    try {
      const responseTimeMs = Date.now() - startTime;
      const result = await pblEngine.submitAttempt(session, {
        sessionId: session.sessionId,
        questionRef: session.currentQuestionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: selectedAnswer,
        correctAnswer: 'Certo',
        confidence: 'high',
        stage: 'transfer',
        responseTimeMs,
      });

      setSelectedAnswer('');
      setSession({ ...result.session });
      await PBLSessionRepository.saveSession(result.session);
      pblSessionManager.emit('pbl_transfer_attempt', { attempt: result.attempt });
    } catch (err) {
      console.error('[PBLSessionView] Error submitting transfer:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Top Session Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Sair da Sessão
        </button>

        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">
            Competência {session.currentCompetencyIndex + 1} de {session.targetCompetencyRefs.length}
          </span>
        </div>

        <div className="text-xs font-mono text-slate-500">
          Modo: {session.mode.toUpperCase()}
        </div>
      </div>

      {/* Phase Routing */}
      {session.phase === 'problem' && currentCase && (
        <div>
          <PBLProblemCard
            pblCase={currentCase}
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
              onSubmit={handleSubmitInitialAttempt}
              disabled={loading}
            />
          )}
        </div>
      )}

      {session.phase === 'diagnostic' && session.attempts.length > 0 && (
        <PBLDiagnosticView
          attempt={session.attempts[session.attempts.length - 1]}
          diagnostic={session.lastDiagnosticResult}
          onProceedToIntervention={handleProceedToIntervention}
          onProceedToTransfer={() => setSession((prev) => ({ ...prev, phase: 'transfer' }))}
          onSaveToCaderno={handleSaveToCaderno}
          isSavedToCaderno={isSavedToCaderno}
        />
      )}

      {session.phase === 'intervention' && session.lastInterventionPayload && (
        <PBLInterventionView
          intervention={session.lastInterventionPayload}
          onReattempt={handleReattempt}
        />
      )}

      {session.phase === 'reattempt' && currentCase && (
        <div>
          <PBLProblemCard
            pblCase={currentCase}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={setSelectedAnswer}
            disabled={loading}
          />
          {selectedAnswer && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSubmitReattempt}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
              >
                Confirmar Reattempt
              </button>
            </div>
          )}
        </div>
      )}

      {session.phase === 'transfer' && (
        <PBLTransferView
          transferItem={{
            itemOrder: session.currentTransferItemIndex + 1,
            officialQuestionRef: session.currentQuestionRef,
            transferType: 'near_transfer',
            examBoard: 'CEBRASPE',
            difficulty: 'medio',
            cognitiveDelta: 'Aplicação da regra sob variação de banca e período invertido.',
            expectedObstacle: 'Reconhecimento da regra.',
          }}
          itemIndex={session.currentTransferItemIndex}
          totalItems={3}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={setSelectedAnswer}
          onSubmitTransfer={handleSubmitTransfer}
          disabled={loading}
        />
      )}

      {session.phase === 'completed' && (
        <PBLSessionSummary
          session={session}
          onFinishSession={() => {
            if (onCompleteSession) onCompleteSession();
            onExit();
          }}
        />
      )}
    </div>
  );
};
