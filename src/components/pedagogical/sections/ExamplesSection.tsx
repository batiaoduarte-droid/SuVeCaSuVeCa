import React, { useState } from 'react';
import { BookOpenCheck, Copy, Check } from 'lucide-react';
import type { SemanticBlock, WorkedExampleView } from '../../../types/pedagogicalView';
import { WorkedExampleCard } from '../../study-visuals/WorkedExampleCard';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { semanticBlocksToPlainText } from '../../../lib/semanticBlockText';

interface ExamplesSectionProps {
  items?: WorkedExampleView[];
  supplementaryBlocks?: SemanticBlock[];
}

export const ExamplesSection: React.FC<ExamplesSectionProps> = ({ items = [], supplementaryBlocks = [] }) => {
  const [copied, setCopied] = useState(false);

  if (!items || items.length === 0) return null;

  const handleCopy = () => {
    const text = items
      .map((e, i) => {
        if (e.presentation?.hideGenericScaffold) {
          return `${i + 1}. ${e.title}\n${semanticBlocksToPlainText(e.blocks)}`;
        }
        const analysis = e.analysisSteps?.map((step, sIdx) => {
          if (typeof step === 'string') return `${sIdx + 1}. ${step}`;
          return `${step.order ?? sIdx + 1}. ${step.action || ''}${step.rationale ? ` — ${step.rationale}` : ''}`;
        }).join('\n') || e.analysis || '';
        return `${i + 1}. ${e.title}\nFrase: ${e.prompt || e.sentence || ''}\nAnálise: ${analysis}\nConclusão: ${e.result || e.pedagogicalTakeaway || ''}`;
      })
      .concat(semanticBlocksToPlainText(supplementaryBlocks))
      .filter(Boolean)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-emerald-200 shadow-2xs select-none">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Exemplos Comentados
                </h3>
                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-xs font-black leading-5 select-none border border-emerald-200">
                  {items.length} {items.length === 1 ? 'exemplo' : 'exemplos'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Modelos guiados de aplicação prática e raciocínio passo a passo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
            title="Copiar exemplos"
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

        {/* Lista de WorkedExampleCards */}
        <div className="space-y-4">
          {items.map((example, eIdx) => (
            <WorkedExampleCard
              key={example.exampleId || eIdx}
              example={example}
              renderBlock={(b) => <ContentBlockRenderer block={b} />}
            />
          ))}
        </div>
        {supplementaryBlocks.length > 0 && (
          <div className="space-y-3 border-t border-emerald-100 pt-4">
            {supplementaryBlocks.map((block, index) => <ContentBlockRenderer key={index} block={block} />)}
          </div>
        )}
      </div>
    </div>
  );
};
