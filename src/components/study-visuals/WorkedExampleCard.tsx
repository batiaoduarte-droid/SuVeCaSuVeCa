import React, { useState } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { WorkedExampleView, ContentBlock } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';
import { saveExampleStudy } from '../../lib/exampleStudy';

interface WorkedExampleCardProps {
  unitId?: string;
  userId?: string;
  example: WorkedExampleView;
  renderBlock?: (block: ContentBlock) => React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export const WorkedExampleCard: React.FC<WorkedExampleCardProps> = ({
  unitId,
  userId,
  example,
  renderBlock,
  className = '',
  hideHeader = false,
}) => {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState('');
  const record = (kind: 'attempt' | 'reveal', itemId: string) => {
    if (!unitId || !example.exampleId) return;
    const saved = saveExampleStudy(userId, { unitId, exampleId: example.exampleId, itemId, kind, reflection: kind === 'attempt' ? reflections[itemId] : undefined });
    setSaveStatus(saved ? 'Interação registrada neste dispositivo, sem nota de acerto.' : 'Não foi possível salvar neste dispositivo. Seu texto continua disponível nesta tela.');
  };
  if (example.practiceItems?.length && renderBlock) {
    return <article className={`space-y-4 border-b border-slate-200 py-4 ${className}`}>
      <h4 className="text-base font-bold text-teal-950"><InlineRichText>{example.title}</InlineRichText></h4>
      {example.practiceItems.map(item => <section key={item.id} className="space-y-3 rounded-xl border border-slate-200 p-3">
        <p className="text-sm leading-relaxed text-slate-900"><InlineRichText>{item.prompt}</InlineRichText></p>
        <label className="block text-xs font-semibold text-slate-700">Sua resposta e raciocínio (opcional)
          <textarea maxLength={4000} value={reflections[item.id] || ''} onChange={e => setReflections(current => ({ ...current, [item.id]: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm" rows={2} />
        </label>
        <div className="flex flex-wrap gap-2">
          {unitId && example.exampleId && <button type="button" className="button-secondary min-h-11 text-xs" disabled={!reflections[item.id]?.trim() || revealed[item.id]} onClick={() => record('attempt', item.id)}>Registrar tentativa</button>}
          <button type="button" className="button-primary min-h-11 text-xs" aria-expanded={!!revealed[item.id]} onClick={() => {
            if (!revealed[item.id]) record('reveal', item.id);
            setRevealed(current => ({ ...current, [item.id]: !current[item.id] }));
          }}>{revealed[item.id] ? 'Ocultar resolução' : 'Ver resolução'}</button>
        </div>
        {revealed[item.id] && <div className="space-y-2 border-t border-teal-100 pt-3">{item.solutionBlocks.map((block, index) => <React.Fragment key={index}>{renderBlock(block)}</React.Fragment>)}</div>}
      </section>)}
      {saveStatus && <p role="status" className="text-xs text-slate-600">{saveStatus}</p>}
    </article>;
  }
  const resolvedPrompt = example.prompt || example.sentence;
  const resolvedResult = example.result || example.pedagogicalTakeaway;
  const showStructuredScaffold = !example.presentation?.hideGenericScaffold;
  if (example.spellingReview) {
    const review = example.spellingReview;
    return <article className={`border-b border-slate-200 py-5 ${className}`}>
      {!hideHeader && <h4 className="mb-3 text-sm font-bold text-slate-900"><InlineRichText>{example.title}</InlineRichText></h4>}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-lg p-3 ${review.judgment === 'correct' ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'}`}><dt className="text-xs font-semibold">Grafia apresentada · {review.judgmentLabel}</dt><dd className="mt-1 text-lg font-bold"><InlineRichText>{review.proposed}</InlineRichText></dd></div>
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-950"><dt className="text-xs font-semibold">Grafia correta</dt><dd className="mt-1 text-lg font-bold"><InlineRichText>{review.corrected}</InlineRichText></dd></div>
        <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-700">Por quê?</dt><dd className="mt-1 text-sm leading-relaxed text-slate-800"><InlineRichText>{review.explanation}</InlineRichText></dd></div>
      </dl>
    </article>;
  }
  type NormalizedExampleStep = { order: number; action: string; rationale?: string };

  const normalizedSteps: NormalizedExampleStep[] = (example.analysisSteps || [])
    .map((step, idx): NormalizedExampleStep | null => {
      if (typeof step === 'string') {
        const text = step.trim();
        if (!text) return null;
        return {
          order: idx + 1,
          action: text,
          rationale: undefined,
        };
      }
      const action = (step.action || '').trim();
      if (!action) return null;
      return {
        order: step.order || idx + 1,
        action,
        rationale: step.rationale?.trim() || undefined,
      };
    })
    .filter((s): s is NormalizedExampleStep => s !== null);

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-white p-4 sm:p-6 shadow-xs hover:border-emerald-300 transition-all space-y-4 select-text ${className}`}
    >
      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-800 text-white select-none shadow-2xs">
              <Lightbulb className="h-4 w-4" />
            </div>
            <h4 className="text-sm sm:text-base font-black tracking-tight text-emerald-950">
              <InlineRichText>{example.title}</InlineRichText>
            </h4>
          </div>

          <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-900 uppercase tracking-wider select-none">
            {example.studyKind === 'reference' ? 'Quadro de consulta' : 'Exemplo Comentado'}
          </span>
        </div>
      )}

      {/* Prompt / Frase em análise */}
      {showStructuredScaffold && resolvedPrompt && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1 select-none">
            Frase / Termo em Análise:
          </span>
          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed font-serif">
            “<InlineRichText>{resolvedPrompt}</InlineRichText>”
          </p>
        </div>
      )}

      {/* Structured Analysis Steps */}
      {showStructuredScaffold && normalizedSteps.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block select-none">
            Raciocínio Passo a Passo:
          </span>
          <div className="space-y-2">
            {normalizedSteps.map((step) => (
              <div
                key={step.order}
                className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-[11px] font-black text-white select-none">
                  {step.order}
                </span>
                <div className="space-y-0.5 flex-1">
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    <InlineRichText>{step.action}</InlineRichText>
                  </p>
                  {step.rationale && (
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      <InlineRichText>{step.rationale}</InlineRichText>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showStructuredScaffold && !example.analysisSteps?.length && example.analysis && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-600 select-none">
            Comentário e análise
          </span>
          <div className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800">
            <InlineRichText>{example.analysis}</InlineRichText>
          </div>
        </div>
      )}

      {/* Result / Conclusão */}
      {showStructuredScaffold && resolvedResult && (
        <div className="rounded-xl border border-teal-300 bg-teal-50/80 p-3.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-teal-900 font-black text-xs select-none">
            <CheckCircle2 className="h-4 w-4 text-teal-700" />
            <span className="uppercase tracking-wider text-[10px]">Resultado e Classificação</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-teal-950 leading-relaxed">
            <InlineRichText>{resolvedResult}</InlineRichText>
          </div>
        </div>
      )}

      {/* Decisive Point & Exam Tip */}
      {showStructuredScaffold && (example.decisivePoint || example.examTip || example.commonMistake) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {example.decisivePoint && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 text-xs text-sky-950 font-medium">
              <strong className="text-sky-900 block text-[10px] uppercase tracking-wider mb-0.5">
                Ponto Decisivo:
              </strong>
              <InlineRichText>{example.decisivePoint}</InlineRichText>
            </div>
          )}

          {example.examTip && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-950 font-medium">
              <strong className="text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">
                Dica da Banca:
              </strong>
              <InlineRichText>{example.examTip}</InlineRichText>
            </div>
          )}

          {example.commonMistake && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-xs font-medium text-rose-950">
              <strong className="mb-0.5 block text-[10px] uppercase tracking-wider text-rose-900">
                Erro comum
              </strong>
              <InlineRichText>{example.commonMistake}</InlineRichText>
            </div>
          )}
        </div>
      )}

      {/* Secondary Blocks */}
      {example.blocks && example.blocks.length > 0 && renderBlock && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {example.blocks.map((block, bIdx) => (
            <React.Fragment key={bIdx}>{renderBlock(block)}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
