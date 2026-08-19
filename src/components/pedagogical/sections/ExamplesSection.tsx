import React, { useState } from 'react';
import { BookOpenCheck, Copy, Check } from 'lucide-react';
import type { WorkedExampleView } from '../../../types/pedagogicalView';
import { WorkedExampleCard } from '../../study-visuals/WorkedExampleCard';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface ExamplesSectionProps {
  items?: WorkedExampleView[];
}

export const ExamplesSection: React.FC<ExamplesSectionProps> = ({ items = [] }) => {
  const [copied, setCopied] = useState(false);

  if (!items || items.length === 0) return null;

  const handleCopy = () => {
    const text = items
      .map(
        (e, i) =>
          `${i + 1}. ${e.title}\nFrase: ${e.prompt || ''}\nResultado: ${e.result || ''}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-emerald-200 shadow-2xs select-none">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Exemplos Comentados
                </h3>
                <span className="rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-xs font-black select-none border border-emerald-200">
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
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
      </div>
    </div>
  );
};
