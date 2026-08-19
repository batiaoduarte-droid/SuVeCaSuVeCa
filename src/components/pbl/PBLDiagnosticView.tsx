import React from 'react';
import type { DiagnosticResult, PBLAttempt } from '../../types/pbl';
import { AlertTriangle, CheckCircle2, XCircle, Brain, Target, ShieldAlert } from 'lucide-react';

interface PBLDiagnosticViewProps {
  onSaveToCaderno?: () => void;
  isSavedToCaderno?: boolean;
  attempt: PBLAttempt;
  diagnostic?: DiagnosticResult;
  onProceedToIntervention: () => void;
  onProceedToTransfer: () => void;
}

export const PBLDiagnosticView: React.FC<PBLDiagnosticViewProps> = ({
  attempt,
  diagnostic,
  onProceedToIntervention,
  onProceedToTransfer,
  onSaveToCaderno,
  isSavedToCaderno = false,
}) => {
  const isCorrect = attempt.isCorrect;
  const isStrong = attempt.evaluation === 'strong_correct';
  const isHighConfError = attempt.evaluation === 'high_confidence_error';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header Banner */}
      <div
        className={`flex items-start gap-4 rounded-2xl p-4 ${
          isCorrect
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-950'
            : 'border border-rose-200 bg-rose-50 text-rose-950'
        }`}
      >
        {isCorrect ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
        )}
        <div className="flex-1">
          <h3 className="text-sm font-bold">
            {isCorrect
              ? isStrong
                ? 'Hipótese Correta com Alta Confiança!'
                : 'Resposta Correta (Conhecimento em Consolidação)'
              : isHighConfError
              ? 'Erro por Ilusão de Competência (Misconception Detectada)'
              : 'Hipótese Incorreta — Oportunidade de Diagnóstico'}
          </h3>
          <p className="mt-1 text-xs opacity-90">
            Sua resposta: <strong>{attempt.userAnswer}</strong> | Gabarito:{' '}
            <strong>{attempt.correctAnswer}</strong> | Confiança informada:{' '}
            <strong>{attempt.confidence.toUpperCase()}</strong>
          </p>
        </div>
      </div>

      {/* Reasoning & Diagnostic Section */}
      <div className="mt-6 space-y-4">
        {/* User Reasoning Reflection */}
        {attempt.reasoning && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Seu raciocínio:</span>{' '}
            "{attempt.reasoning}"
          </div>
        )}

        {/* Diagnostic Explanation */}
        {diagnostic && (
          <div className="space-y-3">
            {/* Misconception Alert */}
            {diagnostic.misconceptionRefs.length > 0 && !isCorrect && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold">O que provavelmente aconteceu:</span>
                  <p className="mt-0.5 text-amber-800">
                    Houve indução por semelhança formal ou aplicação de regra inadequada ao contexto sintático.
                  </p>
                  <span className="mt-1 inline-block text-[10px] font-mono text-amber-700">
                    Ref: {diagnostic.misconceptionRefs.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* Trap Warning */}
            {diagnostic.trapRefs.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/70 p-3.5 text-xs text-orange-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <div>
                  <span className="font-bold">Armadilha de Banca Ativada:</span>
                  <p className="mt-0.5 text-orange-800">
                    A banca explorou um atrator sintático para induzir à escolha do distrator.
                  </p>
                  <span className="mt-1 inline-block text-[10px] font-mono text-orange-700">
                    Trap: {diagnostic.trapRefs.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* Refutation Text */}
            {diagnostic.intervention.refutationText && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800">
                <span className="font-bold text-slate-900">Fundamentação Gramatical:</span>
                <p className="mt-1 leading-relaxed text-slate-700">
                  {diagnostic.intervention.refutationText}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {!isCorrect && onSaveToCaderno && (
          <button
            type="button"
            onClick={onSaveToCaderno}
            disabled={isSavedToCaderno}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
              isSavedToCaderno
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isSavedToCaderno ? '✓ Salvo no Caderno de Erros' : '+ Salvar no Caderno de Erros'}
          </button>
        )}
        <div className="flex gap-3 ml-auto">
        {isCorrect && isStrong ? (
          <button
            type="button"
            onClick={onProceedToTransfer}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            Avançar para Transferência Cognitiva →
          </button>
        ) : (
          <button
            type="button"
            onClick={onProceedToIntervention}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            Ver Intervenção & Procedimento Decisivo →
          </button>
        )}
        </div>
      </div>
    </div>
  );
};
