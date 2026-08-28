import React, { useState } from 'react';
import { ShieldAlert, Copy, Check } from 'lucide-react';
import type { ExamTrapView, ContentBlock } from '../../../types/pedagogicalView';
import { BankTrapCard } from '../../study-visuals/BankTrapCard';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { semanticBlocksToPlainText } from '../../../lib/semanticBlockText';

interface TrapsSectionProps {
  items?: ExamTrapView[];
  supplementaryBlocks?: ContentBlock[];
}

export const TrapsSection: React.FC<TrapsSectionProps> = ({ items = [], supplementaryBlocks = [] }) => {
  const [copied, setCopied] = useState(false);

  if (items.length === 0 && supplementaryBlocks.length === 0) return null;

  const handleCopy = () => {
    const text = items
      .map((trap, index) => [
        `${index + 1}. ${trap.title}`,
        trap.presentation?.hideGenericScaffold ? semanticBlocksToPlainText(trap.blocks) : undefined,
        !trap.presentation?.hideGenericScaffold && trap.trigger ? `Gatilho: ${trap.trigger}` : undefined,
        !trap.presentation?.hideGenericScaffold && trap.errorPattern ? `Padrão do erro: ${trap.errorPattern}` : undefined,
        !trap.presentation?.hideGenericScaffold && (trap.misleadingReasoning || trap.whyItFails) ? `Por que engana: ${trap.misleadingReasoning || trap.whyItFails}` : undefined,
        !trap.presentation?.hideGenericScaffold && trap.expectedWrongConclusion ? `Erro induzido: ${trap.expectedWrongConclusion}` : undefined,
        !trap.presentation?.hideGenericScaffold && trap.decisiveTest ? `Teste decisivo: ${trap.decisiveTest}` : undefined,
        !trap.presentation?.hideGenericScaffold && (trap.correctReasoning || trap.correctApproach) ? `Correção: ${trap.correctReasoning || trap.correctApproach}` : undefined,
        !trap.presentation?.hideGenericScaffold && (trap.correctiveRule || trap.counterRule) ? `Regra: ${trap.correctiveRule || trap.counterRule}` : undefined,
        !trap.presentation?.hideGenericScaffold && (trap.bankTechnique || trap.examBoardBehavior) ? `Como a banca cobra: ${trap.bankTechnique || trap.examBoardBehavior}` : undefined,
        !trap.presentation?.hideGenericScaffold && trap.studentCaveat ? `Atenção: ${trap.studentCaveat}` : undefined,
        !trap.presentation?.hideGenericScaffold && trap.example ? `Exemplo: ${trap.example}` : undefined,
        !trap.presentation?.hideGenericScaffold && trap.counterexample ? `Contraprova: ${trap.counterexample}` : undefined,
      ].filter(Boolean).join('\n'))
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-amber-200 bg-white p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 text-white shadow-2xs select-none">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Pegadinhas de Banca & Vacinas Lógicas
                </h3>
                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-black leading-5 select-none border border-amber-300">
                  {items.length} {items.length === 1 ? 'armadilha' : 'armadilhas'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Vícios de indução das bancas examinadoras e raciocínios corretivos definitivos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
            title="Copiar pegadinhas"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Lista de BankTrapCards */}
        <div className="space-y-4">
          {items.map((trap, idx) => (
            <BankTrapCard
              key={trap.trapId || idx}
              trap={trap}
              renderBlock={(b) => <ContentBlockRenderer block={b} allowLegacyDiagramInference={false} />}
            />
          ))}
        </div>

        {/* Blocos Suplementares se houver */}
        {supplementaryBlocks.length > 0 && (
          <div className="pt-3 space-y-2 border-t border-amber-200/60">
            {supplementaryBlocks.map((b, idx) => (
              <ContentBlockRenderer key={idx} block={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
