import React, { useEffect, useState } from 'react';
import type { InterventionPayload, PBLAssistanceLevel } from '../../types/pbl';
import { SemanticBlockRenderer } from '../pedagogical/blocks/SemanticBlockRenderer';
import { ArrowRight, CheckSquare, Eye, Scale, Sparkles } from 'lucide-react';

interface PBLInterventionViewProps {
  intervention: InterventionPayload;
  initialAssistanceLevel?: PBLAssistanceLevel;
  onAssistanceChange?: (level: PBLAssistanceLevel) => void;
  onReattempt: (level: PBLAssistanceLevel) => void;
}

const assistanceRank: Record<PBLAssistanceLevel, number> = {
  none: 0,
  hint: 1,
  diagnostic: 1,
  partial: 2,
  full: 3,
};

export const PBLInterventionView: React.FC<PBLInterventionViewProps> = ({
  intervention,
  initialAssistanceLevel = 'diagnostic',
  onAssistanceChange,
  onReattempt,
}) => {
  const [assistanceLevel, setAssistanceLevel] = useState<PBLAssistanceLevel>(
    assistanceRank[initialAssistanceLevel] >= assistanceRank.diagnostic
      ? initialAssistanceLevel
      : 'diagnostic'
  );

  useEffect(() => {
    setAssistanceLevel(
      assistanceRank[initialAssistanceLevel] >= assistanceRank.diagnostic
        ? initialAssistanceLevel
        : 'diagnostic'
    );
  }, [initialAssistanceLevel, intervention.interventionId]);

  const hasPartialSupport = Boolean(
    intervention.procedureSteps.length
    || (intervention.structuredSteps && intervention.structuredSteps.length > 0)
    || intervention.contrastingPoleA
    || intervention.contrastingPoleB
    || (intervention.semanticBlocks?.partial && intervention.semanticBlocks.partial.length > 0)
  );
  const hasFullSupport = Boolean(
    intervention.workedExample
    || (intervention.semanticBlocks?.full && intervention.semanticBlocks.full.length > 0)
  );
  const showPartialSupport = assistanceRank[assistanceLevel] >= assistanceRank.partial;
  const showFullSupport = assistanceRank[assistanceLevel] >= assistanceRank.full;

  const reveal = (level: PBLAssistanceLevel) => {
    setAssistanceLevel(level);
    onAssistanceChange?.(level);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Pista decisiva
        </div>
        <h2 className="mt-2 text-base font-bold text-slate-900">
          {intervention.ruleTitle || 'Critério decisivo SuVeCA'}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-700">
          {intervention.microLessonText}
        </p>
        {intervention.ruleStatement && (
          <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-relaxed text-violet-950">
            <strong>Por que o critério decide:</strong> {intervention.ruleStatement}
          </p>
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
          <div className="mt-4 overflow-x-auto rounded-xl border border-indigo-200/80 bg-white shadow-xs">
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
        {intervention.semanticBlocks?.hint && intervention.semanticBlocks.hint.length > 0 && (
          <div className="mt-4 space-y-3">
            {intervention.semanticBlocks.hint.map((block, idx) => (
              <SemanticBlockRenderer key={idx} block={block} />
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-indigo-800">
          Tente seguir apenas com esta pista. Abra os apoios seguintes somente se ainda não conseguir formular o procedimento.
        </p>
      </div>

      {!showPartialSupport && hasPartialSupport && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
          <p className="text-xs leading-relaxed text-slate-700">
            Ainda não está claro como aplicar o critério? Revele o procedimento e o contraste antes de ver uma solução completa.
          </p>
          <button
            type="button"
            onClick={() => reveal('partial')}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
          >
            <Eye className="h-4 w-4" /> Ver procedimento e contraste
          </button>
        </div>
      )}

      {showPartialSupport && intervention.structuredSteps && intervention.structuredSteps.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <CheckSquare className="h-4 w-4 text-indigo-600" />
            Procedimento de resolução
          </div>
          <div className="mt-4 space-y-3">
            {intervention.structuredSteps.map((step, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-800 space-y-1.5">
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
      ) : showPartialSupport && intervention.procedureSteps.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <CheckSquare className="h-4 w-4 text-indigo-600" />
            Procedimento de resolução
          </div>
          <div className="mt-4 space-y-3">
            {intervention.procedureSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                <span className="mt-0.5 leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showPartialSupport && (intervention.contrastingPoleA || intervention.contrastingPoleB) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Scale className="h-4 w-4 text-amber-600" />
            Compare os dois caminhos
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
              <div className="font-bold text-emerald-900">✓ Aplicação correta</div>
              <p className="mt-2 text-emerald-800">{intervention.contrastingPoleA}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs">
              <div className="font-bold text-rose-900">✗ Atrator ou erro típico</div>
              <p className="mt-2 text-rose-800">{intervention.contrastingPoleB}</p>
            </div>
          </div>
        </div>
      )}

      {showPartialSupport && intervention.semanticBlocks?.partial && intervention.semanticBlocks.partial.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Apoio pedagógico canônico
          </div>
          {intervention.semanticBlocks.partial.map((block, idx) => (
            <SemanticBlockRenderer key={idx} block={block} />
          ))}
        </div>
      )}

      {showPartialSupport && !showFullSupport && hasFullSupport && (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
          <p className="text-xs leading-relaxed text-amber-950">
            Use o exemplo resolvido como último apoio. A nova questão virá sem a solução visível.
          </p>
          <button
            type="button"
            onClick={() => reveal('full')}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-amber-900 hover:bg-amber-100"
          >
            <Eye className="h-4 w-4" /> Ver exemplo resolvido
          </button>
        </div>
      )}

      {showFullSupport && intervention.workedExample && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Exemplo resolvido</h3>
          <p className="mt-3 text-xs leading-relaxed text-slate-800">{intervention.workedExample.stem}</p>
          {intervention.workedExample.stepByStep.length > 0 && (
            <ol className="mt-3 space-y-2 text-xs text-slate-700">
              {intervention.workedExample.stepByStep.map((step, index) => (
                <li key={index}>{index + 1}. {step}</li>
              ))}
            </ol>
          )}
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-950">
            <strong>Resolução:</strong> {intervention.workedExample.resolution}
          </div>
        </div>
      )}

      {showFullSupport && intervention.semanticBlocks?.full && intervention.semanticBlocks.full.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Aprofundamento canônico completo
          </div>
          {intervention.semanticBlocks.full.map((block, idx) => (
            <SemanticBlockRenderer key={idx} block={block} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <span className="text-[11px] text-slate-600" aria-live="polite">
          Apoio usado: {assistanceLevel === 'full' ? 'exemplo completo' : assistanceLevel === 'partial' ? 'procedimento e contraste' : 'pista decisiva'}.
        </span>
        <button
          type="button"
          onClick={() => onReattempt(assistanceLevel)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700"
        >
          Aplicar sem apoio visível <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
