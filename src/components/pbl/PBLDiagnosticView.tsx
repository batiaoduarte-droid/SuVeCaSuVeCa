import React from 'react';
import type { DiagnosticResult, NextActionDecision, PBLAttempt } from '../../types/pbl';
import { Brain, CheckCircle2, SearchCheck, ShieldAlert, XCircle } from 'lucide-react';

interface PBLDiagnosticViewProps {
  onSaveToCaderno?: () => void;
  isSavedToCaderno?: boolean;
  attempt: PBLAttempt;
  diagnostic?: DiagnosticResult;
  nextAction?: NextActionDecision;
  onContinue: () => void;
}

export const PBLDiagnosticView: React.FC<PBLDiagnosticViewProps> = ({
  attempt,
  diagnostic,
  nextAction,
  onContinue,
  onSaveToCaderno,
  isSavedToCaderno = false,
}) => {
  const isCorrect = attempt.isCorrect;
  const isStrong = attempt.evaluation === 'strong_correct';
  const isHighConfidenceError = attempt.evaluation === 'high_confidence_error';
  const actionLabel = nextAction?.type === 'request_transfer'
    ? 'Avançar para transferência'
    : nextAction?.type === 'request_probe'
      ? 'Responder sondagem curta'
      : nextAction?.type === 'advance_competency' || nextAction?.type === 'complete_session'
        ? 'Registrar reflexão e concluir'
        : 'Ver intervenção e procedimento';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex items-start gap-4 rounded-2xl border p-4 ${isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-rose-200 bg-rose-50 text-rose-950'}`}>
        {isCorrect ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />}
        <div>
          <h3 className="text-sm font-bold">
            {isCorrect
              ? isStrong ? 'Resposta correta com confiança consistente' : 'Resposta correta; procedimento ainda em consolidação'
              : isHighConfidenceError ? 'A resposta não corresponde ao gabarito e foi dada com alta confiança' : 'A resposta não corresponde ao gabarito'}
          </h3>
          <p className="mt-1 text-xs opacity-90">
            Sua resposta: <strong>{attempt.userAnswer}</strong> · Confiança: <strong>{attempt.confidence.toUpperCase()}</strong>
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {attempt.reasoning && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
            <strong className="text-slate-900">Seu critério:</strong> “{attempt.reasoning}”
          </div>
        )}
        {!isCorrect && diagnostic?.diagnosticSummary && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div><strong>Hipótese diagnóstica:</strong><p className="mt-1 leading-relaxed">{diagnostic.diagnosticSummary}</p></div>
          </div>
        )}
        {diagnostic?.needsProbe && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-950">
            <SearchCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <div><strong>Diagnóstico ainda incerto.</strong><p className="mt-1">Uma questão curta ajudará a distinguir a causa do erro antes da explicação.</p></div>
          </div>
        )}
        {!isCorrect && diagnostic?.trapRefs.length ? (
          <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3.5 text-xs text-orange-950">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
            <div><strong>Há indício de armadilha de prova.</strong><p className="mt-1">A intervenção mostrará o contraste decisivo sem expor identificadores técnicos.</p></div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {!isCorrect && onSaveToCaderno && (
          <button type="button" onClick={onSaveToCaderno} disabled={isSavedToCaderno} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:border-emerald-300 disabled:bg-emerald-50 disabled:text-emerald-800">
            {isSavedToCaderno ? '✓ Salvo no Caderno de Erros' : '+ Salvar no Caderno de Erros'}
          </button>
        )}
        <button type="button" onClick={onContinue} className="ml-auto rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700">
          {actionLabel} →
        </button>
      </div>
    </div>
  );
};
