import React, { useState } from 'react';
import { ShieldAlert, Copy, Check } from 'lucide-react';
import type { ExamTrapView, ContentBlock } from '../../../types/pedagogicalView';
import { BankTrapCard } from '../../study-visuals/BankTrapCard';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface TrapsSectionProps {
  items?: ExamTrapView[];
  supplementaryBlocks?: ContentBlock[];
}

export const TrapsSection: React.FC<TrapsSectionProps> = ({ items = [], supplementaryBlocks = [] }) => {
  const [copied, setCopied] = useState(false);

  if (items.length === 0 && supplementaryBlocks.length === 0) return null;

  const handleCopy = () => {
    const text = items
      .map(
        (t, i) =>
          `${i + 1}. ${t.title}\nGatilho: ${t.trigger || ''}\nVacina: ${t.correctReasoning || t.correctiveRule || ''}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-amber-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 text-white shadow-2xs select-none">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Pegadinhas de Banca & Vacinas Lógicas
                </h3>
                <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-black select-none border border-amber-300">
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
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
              renderBlock={(b) => <ContentBlockRenderer block={b} />}
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
