import React, { useState } from 'react';
import { ArrowLeftRight, Copy, Check, Split } from 'lucide-react';
import type { ContrastView } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface ContrastsSectionProps {
  items?: ContrastView[];
}

export const ContrastsSection: React.FC<ContrastsSectionProps> = ({ items = [] }) => {
  const [copied, setCopied] = useState(false);

  if (!items || items.length === 0) return null;

  const handleCopy = () => {
    const text = items.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 surface p-4 sm:p-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs">
            <ArrowLeftRight className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
              Contrastes que a prova explora ({items.length})
            </h3>
            <p className="m-0 text-xs text-slate-600 font-medium">
              Pares de oposição conceitual e critérios definitivos para não confundir na prova
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
          title="Copiar contrastes"
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

      <div className="space-y-5">
        {items.map((contrast, cIdx) => (
          <div
            key={contrast.contrastId || cIdx}
            className="overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-slate-50/40 to-teal-50/20 p-5 shadow-xs transition hover:border-teal-400 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white shadow-2xs">
                  <Split className="h-3.5 w-3.5" />
                </span>
                <h4 className="m-0 text-sm sm:text-base font-black text-slate-900">
                  <InlineRichText>{contrast.title}</InlineRichText>
                </h4>
              </div>
              {contrast.conceptA && contrast.conceptB && (
                <span className="hidden sm:inline-flex rounded-full bg-teal-100/80 px-2.5 py-0.5 text-xs font-bold text-teal-900 border border-teal-200">
                  {contrast.conceptA.length > 25 ? 'Distinção Canônica' : `${contrast.conceptA} vs ${contrast.conceptB}`}
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2 reading-content">
              {contrast.blocks.map((block, bIdx) => (
                <ContentBlockRenderer key={bIdx} block={block} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
