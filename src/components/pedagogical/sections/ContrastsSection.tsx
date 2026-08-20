import React, { useState } from 'react';
import { ArrowLeftRight, Copy, Check, Split } from 'lucide-react';
import type { ContrastView } from '../../../types/pedagogicalView';
import { ContrastBoard } from '../../study-visuals/ContrastBoard';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface ContrastsSectionProps {
  items?: ContrastView[];
}

export const ContrastsSection: React.FC<ContrastsSectionProps> = ({ items = [] }) => {
  const [copied, setCopied] = useState(false);

  if (!items || items.length === 0) return null;

  const handleCopy = () => {
    const text = items
      .map(
        (c, i) =>
          `${i + 1}. ${c.title}\n${c.conceptA || ''} vs ${c.conceptB || ''}\nCritério: ${c.decisionCriterion || ''}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs select-none">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Contrastes de Prova
                </h3>
                <span className="rounded-full bg-slate-100 text-slate-800 px-2 py-0.5 text-xs font-black select-none border border-slate-200">
                  {items.length} {items.length === 1 ? 'contraste' : 'contrastes'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Pares de oposição conceitual e critérios definitivos de desempate
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
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

        {/* Lista de ContrastBoards */}
        <div className="space-y-4">
          {items.map((contrast, cIdx) => (
            <ContrastBoard
              key={contrast.contrastId || cIdx}
              contrast={contrast}
              renderBlock={(b) => <ContentBlockRenderer block={b} />}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
