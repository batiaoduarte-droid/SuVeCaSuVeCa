import React from 'react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Info, XCircle, Zap } from 'lucide-react';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';
import type { FlashcardContentProjection, FlashcardSemanticBlock } from '../../lib/flashcardContent';
import { FLASHCARD_FAMILY_LABELS } from '../../types/flashcardContent';

interface FlashcardBackViewProps {
  projection: FlashcardContentProjection;
  isExplanationVisible: boolean;
  onToggleExplanation: () => void;
  className?: string;
}

const EXAMPLE_STYLES = {
  incorrect: { panel: 'border-rose-200 bg-rose-50/60 text-rose-950', heading: 'text-rose-800', icon: XCircle },
  valid_contrast: { panel: 'border-blue-200 bg-blue-50/60 text-slate-900', heading: 'text-blue-800', icon: ArrowRightLeft },
  boundary: { panel: 'border-violet-200 bg-violet-50/60 text-violet-950', heading: 'text-violet-800', icon: AlertTriangle },
  invalid_transform: { panel: 'border-slate-200 bg-slate-50/60 text-slate-900', heading: 'text-slate-800', icon: ArrowRightLeft },
  unreviewed: { panel: 'border-slate-200 bg-slate-50/60 text-slate-900', heading: 'text-slate-800', icon: Info },
} satisfies Record<NonNullable<FlashcardSemanticBlock['exampleRole']>, { panel: string; heading: string; icon: typeof Info }>;

export const FlashcardBackView: React.FC<FlashcardBackViewProps> = ({
  projection,
  isExplanationVisible,
  onToggleExplanation,
  className = '',
}) => {
  const { back, explanation, shouldShowExplanation, semanticBlocks } = projection;

  // Se houver blocos semânticos estruturados, organizamos de forma hierárquica e limpa
  if (semanticBlocks && semanticBlocks.length > 0) {
    const native = semanticBlocks.some(b => b.slot !== undefined);
    const select = (slot: FlashcardSemanticBlock['slot'], legacy: (block: FlashcardSemanticBlock) => boolean) =>
      semanticBlocks.find(b => b.slot === slot || (!native && legacy(b)));
    const directAnswerBlock = select('direct_answer', b => b.title === 'Resposta direta');
    const normativeRuleBlock = select('normative_rule', b => b.title === 'Regra');
    const conditionsBlock = select('conditions', b => b.title === 'Condições' || b.title === 'Limite de aplicação');

    // Exemplos e contraexemplos / limites / contrastes
    const canonicalExampleBlock = select('canonical_example',
      b => b.kind === 'example' && b.title !== 'Contexto'
    );
    const contraExampleBlock = select('contra_example',
      b => b.title === 'Errado' || b.title === 'Limite da Regra' || b.title === 'Caso Contrastante' || b.title === 'Contraexemplo ou limite'
    );
    const quickTestBlock = select('quick_test', b => b.title === 'Teste rápido');
    const exampleStyle = EXAMPLE_STYLES[contraExampleBlock?.exampleRole || 'unreviewed'];
    const ExampleIcon = exampleStyle.icon;

    // Família trap_diagnostic / erros comuns legados
    const errorBlock = select('error',
      b => (b.kind === 'trap' || b.title === 'Erro' || b.title === 'O Erro' || b.title === 'Atenção ao Erro Comum' || b.title === 'Pegadinha da Banca') && b !== contraExampleBlock
    );
    // Exclui 'Significado' do mechanismBlock para impedir que mnemônicos renderizem seu significado duas vezes literalmente
    const mechanismBlock = select('mechanism',
      b => (b.kind === 'mechanism' || b.title === 'Por que induz ao erro' || b.title === 'Por que ocorre') && b.title !== 'Significado'
    );
    const correctionBlock = select('correction',
      b => (b.kind === 'correction' || b.title === 'Como evitar' || b.title === 'Forma Correta' || b.title === 'Critério Decisivo') && b !== quickTestBlock && b.title !== 'Critério de distinção'
    );
    const contextBlock = native ? undefined : semanticBlocks.find(b => b.title === 'Contexto');

    // Família contrast
    const leftBlock = select('left', b => b.kind === 'left');
    const rightBlock = select('right', b => b.kind === 'right');
    const criterionBlock = select('criterion', b => b.title === 'Critério de distinção');

    // Família procedure
    const stepBlocks = semanticBlocks.filter(b => native ? b.slot === 'step' : b.kind === 'step');

    // Família mnemonic
    const cueBlock = select('cue', b => b.title === 'Lembrete');
    const meaningBlock = select('meaning', b => b.title === 'Significado');
    const limitsBlock = select('limits', b => b.title === 'Limites');

    // Rastrear blocos já renderizados especialmente para não omitir nenhum dado residual
    const handled = new Set<FlashcardSemanticBlock>();
    if (directAnswerBlock) handled.add(directAnswerBlock);
    if (normativeRuleBlock) handled.add(normativeRuleBlock);
    if (conditionsBlock) handled.add(conditionsBlock);
    if (canonicalExampleBlock) handled.add(canonicalExampleBlock);
    if (contraExampleBlock) handled.add(contraExampleBlock);
    if (quickTestBlock) handled.add(quickTestBlock);
    if (errorBlock) handled.add(errorBlock);
    if (mechanismBlock) handled.add(mechanismBlock);
    if (correctionBlock) handled.add(correctionBlock);
    if (contextBlock) handled.add(contextBlock);
    if (leftBlock) handled.add(leftBlock);
    if (rightBlock) handled.add(rightBlock);
    if (criterionBlock) handled.add(criterionBlock);
    stepBlocks.forEach(b => handled.add(b));
    if (cueBlock) handled.add(cueBlock);
    if (meaningBlock) handled.add(meaningBlock);
    if (limitsBlock) handled.add(limitsBlock);

    const remainingBlocks = semanticBlocks.filter(b => !handled.has(b));

    return (
      <div className={`space-y-4 ${className}`}>
        {/* Rótulo da Família Pedagógica */}
        {projection.family && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
              {FLASHCARD_FAMILY_LABELS[projection.family] || projection.family}
            </span>
          </div>
        )}

        {/* 1. Contexto inicial (quando presente, p. ex. em flashcards legados com prefixo) */}
        {contextBlock && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 text-xs sm:text-sm text-slate-700">
            <span className="font-bold text-slate-800 block mb-1">Contexto:</span>
            <InlineRichText>{contextBlock.text}</InlineRichText>
          </div>
        )}

        {/* 2. Cartão Principal de Resposta (Unificado, sem poluição visual ou caixas repetidas) */}
        {directAnswerBlock ? (
          <div className="rounded-2xl border border-teal-200/90 bg-teal-50/40 p-4 sm:p-5 shadow-xs transition">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 block mb-2 select-none">
              Resposta
            </span>
            <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
              <InlineRichText>{directAnswerBlock.text}</InlineRichText>
            </div>

            {/* Fundamentação / Regra normativa como extensão natural dentro da mesma superfície */}
            {normativeRuleBlock && normativeRuleBlock.text !== directAnswerBlock.text && (
              <div className="mt-3 pt-3 border-t border-teal-200/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Regra
                </span>
                <div className="text-xs sm:text-sm font-normal text-slate-700 leading-relaxed">
                  <InlineRichText>{normativeRuleBlock.text}</InlineRichText>
                </div>
              </div>
            )}

            {/* Condições ou limites essenciais */}
            {conditionsBlock && (
              <div className="mt-3 inline-flex items-start gap-1.5 rounded-lg bg-teal-100/60 px-3 py-1.5 text-xs text-teal-950 font-medium leading-relaxed">
                <span className="font-bold text-teal-900 shrink-0">Condições:</span>
                <span><InlineRichText>{conditionsBlock.text}</InlineRichText></span>
              </div>
            )}
          </div>
        ) : normativeRuleBlock ? (
          <div className="rounded-2xl border border-teal-200/90 bg-teal-50/40 p-4 sm:p-5 shadow-xs transition">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 block mb-2 select-none">
              Regra
            </span>
            <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
              <InlineRichText>{normativeRuleBlock.text}</InlineRichText>
            </div>
          </div>
        ) : null}

        {/* 3. Diagnóstico de Erro / Pegadinha (família trap_diagnostic ou padrão de 3 blocos) */}
        {(errorBlock || mechanismBlock || correctionBlock) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {errorBlock && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 sm:p-4 transition">
                <div className="flex items-center gap-1.5 mb-1.5 select-none">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                    {errorBlock.title}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-rose-950 leading-relaxed">
                  <InlineRichText>{errorBlock.text}</InlineRichText>
                </div>
              </div>
            )}

            {mechanismBlock && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 sm:p-4 transition">
                <div className="flex items-center gap-1.5 mb-1.5 select-none">
                  <Info className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                    {mechanismBlock.title}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-normal text-slate-800 leading-relaxed">
                  <InlineRichText>{mechanismBlock.text}</InlineRichText>
                </div>
              </div>
            )}

            {correctionBlock && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4 transition sm:col-span-2">
                <div className="flex items-center gap-1.5 mb-1.5 select-none">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                    {correctionBlock.title}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-normal text-emerald-950 leading-relaxed font-serif">
                  <InlineRichText>{correctionBlock.text}</InlineRichText>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Contraste Binário (família contrast) */}
        {(leftBlock || rightBlock || criterionBlock) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {leftBlock && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 sm:p-4">
                <span className="text-xs font-black uppercase tracking-wider text-blue-800 block mb-1">
                  {leftBlock.title}
                </span>
                <div className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                  <InlineRichText>{leftBlock.text}</InlineRichText>
                </div>
              </div>
            )}
            {rightBlock && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 sm:p-4">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-800 block mb-1">
                  {rightBlock.title}
                </span>
                <div className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                  <InlineRichText>{rightBlock.text}</InlineRichText>
                </div>
              </div>
            )}
            {criterionBlock && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 sm:p-3.5 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">
                  {criterionBlock.title}
                </span>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  <InlineRichText>{criterionBlock.text}</InlineRichText>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Procedimento Passo a Passo (família procedure) */}
        {stepBlocks.length > 0 && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-800 block mb-2.5">
              Procedimento passo a passo
            </span>
            <ol className="space-y-2">
              {stepBlocks.map((step, sIdx) => (
                <li key={sIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-bold text-white">
                    {sIdx + 1}
                  </span>
                  <span className="leading-relaxed"><InlineRichText>{step.text}</InlineRichText></span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 6. Mnemônico (família mnemonic — renderiza significado apenas aqui, sem repetição literal) */}
        {(cueBlock || meaningBlock || limitsBlock) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            {cueBlock && (
              <div className="text-base font-bold text-amber-950 mb-1">
                <InlineRichText>{cueBlock.text}</InlineRichText>
              </div>
            )}
            {meaningBlock && (
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-1">
                <span className="font-semibold text-amber-900 mr-1">Significado:</span>
                <InlineRichText>{meaningBlock.text}</InlineRichText>
              </div>
            )}
            {limitsBlock && (
              <div className="text-xs text-slate-600 leading-relaxed mt-2 pt-2 border-t border-amber-200/50">
                <span className="font-semibold text-amber-900 mr-1">Limites:</span>
                <InlineRichText>{limitsBlock.text}</InlineRichText>
              </div>
            )}
          </div>
        )}

        {/* 7. EXEMPLOS: CORRETO vs ERRADO | APLICAÇÃO vs LIMITE | EXEMPLO vs CONTRASTE */}
        {(canonicalExampleBlock || contraExampleBlock) && (
          <div className={`pt-1 ${contraExampleBlock ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}`}>
            {canonicalExampleBlock && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 sm:p-4 text-emerald-950">
                <div className="flex items-center gap-1.5 mb-1.5 select-none">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    {canonicalExampleBlock.title}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-medium text-emerald-950 leading-relaxed font-serif">
                  <InlineRichText>{canonicalExampleBlock.text}</InlineRichText>
                </div>
              </div>
            )}
            {contraExampleBlock && (
              <div
                data-example-role={contraExampleBlock.exampleRole || 'unreviewed'}
                className={`rounded-xl border p-3.5 sm:p-4 leading-relaxed font-serif text-xs sm:text-sm font-medium ${exampleStyle.panel}`}
              >
                <div className={`flex items-center gap-1.5 mb-1.5 select-none font-sans font-bold text-xs uppercase tracking-wider ${exampleStyle.heading}`}>
                  <ExampleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{contraExampleBlock.title}</span>
                </div>
                <div>
                  <InlineRichText>{contraExampleBlock.text}</InlineRichText>
                </div>
                {contraExampleBlock.operation && (
                  <div className="mt-3 border-l-2 border-rose-300 pl-3 font-sans text-rose-950">
                    <span className="block font-bold mb-1">Operação inválida</span>
                    <InlineRichText>{contraExampleBlock.operation}</InlineRichText>
                  </div>
                )}
                {contraExampleBlock.explanation && (
                  <div className="mt-2 text-slate-700 font-sans font-normal">
                    <InlineRichText>{contraExampleBlock.explanation}</InlineRichText>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 8. Teste Rápido (Faixa compacta, não intrusiva) */}
        {quickTestBlock && (
          <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800">
            <Zap className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-relaxed">
              <span className="font-bold text-indigo-900 mr-1.5">Teste rápido:</span>
              <InlineRichText>{quickTestBlock.text}</InlineRichText>
            </div>
          </div>
        )}

        {/* 9. Blocos residuais caso existam (garantia de zero perda de informação) */}
        {remainingBlocks.map((block, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-3 sm:p-4 text-sm ${block.kind === 'boundary' ? 'border-violet-200 bg-violet-50 text-violet-950' : block.kind === 'step' ? 'border-cyan-200 bg-cyan-50 text-cyan-950' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}
          >
            <div className="font-bold text-slate-800 mb-1 select-none">{block.title}:</div>
            <div className="font-normal leading-relaxed text-slate-800">
              <InlineRichText>{block.text}</InlineRichText>
            </div>
          </div>
        ))}

        {/* 10. Explicação Complementar Colapsável */}
        {shouldShowExplanation && explanation && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onToggleExplanation}
              aria-expanded={isExplanationVisible}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-teal-800"
            >
              <Info className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <span>{isExplanationVisible ? 'Ocultar explicação complementar' : 'Ver explicação complementar'}</span>
            </button>

            {isExplanationVisible && (
              <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 text-slate-800 text-xs sm:text-sm leading-relaxed animate-in fade-in">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 select-none">
                  Explicação complementar
                </span>
                <InlineRichText>{explanation}</InlineRichText>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback integral para quando não há blocos semânticos decompostos
  return (
    <div className={`space-y-4 ${className}`}>
      {projection.family && <p className="text-xs font-semibold text-slate-600">{FLASHCARD_FAMILY_LABELS[projection.family]}</p>}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 sm:p-6 transition">
        <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block mb-2 select-none">
          Resposta
        </span>
        <div className="text-sm sm:text-base font-normal text-slate-800 leading-relaxed whitespace-pre-line">
          <InlineRichText>{back}</InlineRichText>
        </div>
      </div>

      {shouldShowExplanation && explanation && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onToggleExplanation}
            aria-expanded={isExplanationVisible}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-teal-800"
          >
            <Info className="h-4 w-4 text-teal-600" aria-hidden="true" />
            <span>{isExplanationVisible ? 'Ocultar explicação complementar' : 'Ver explicação complementar'}</span>
          </button>

          {isExplanationVisible && (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 text-slate-800 text-xs sm:text-sm leading-relaxed animate-in fade-in">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 select-none">
                Explicação complementar
              </span>
              <InlineRichText>{explanation}</InlineRichText>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
