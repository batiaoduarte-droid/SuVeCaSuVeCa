import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-react';
import type { ExamTrapView, ContentBlock } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface TrapsSectionProps {
  items?: ExamTrapView[];
  supplementaryBlocks?: ContentBlock[];
}

export const TrapsSection: React.FC<TrapsSectionProps> = ({ items = [], supplementaryBlocks = [] }) => {
  const [copied, setCopied] = useState(false);

  if (items.length === 0 && supplementaryBlocks.length === 0) return null;

  const handleCopy = () => {
    const text = items.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 surface p-4 sm:p-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-800 shadow-2xs">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
              Erros comuns e pegadinhas ({items.length})
            </h3>
            <p className="m-0 text-xs text-slate-600 font-medium">
              Vícios de indução das bancas e vacinas lógicas para neutralizar armadilhas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
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

      <div className="space-y-5">
        {items.map((trap, idx) => (
          <div
            key={trap.trapId || idx}
            className="overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-xs transition hover:border-rose-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-rose-50/60 px-4 py-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{trap.title || `Armadilha de Prova #${idx + 1}`}</span>
              </div>
              <span className="rounded-full bg-rose-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-900">
                Pegadinha de Banca
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {trap.blocks && trap.blocks.length > 0 ? (
                <div className="space-y-2 reading-content">
                  {trap.blocks.map((b, bIdx) => (
                    <ContentBlockRenderer key={bIdx} block={b} />
                  ))}
                </div>
              ) : (
                <div className="grid divide-y divide-rose-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 rounded-xl overflow-hidden border border-rose-100">
                  {trap.errorPattern && (
                    <div className="bg-rose-50/40 p-4">
                      <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> O Erro Induzido:
                      </span>
                      <p className="mt-2 text-xs sm:text-sm text-rose-950 font-medium leading-relaxed">
                        <InlineRichText>{trap.errorPattern}</InlineRichText>
                      </p>
                    </div>
                  )}
                  {trap.correctiveRule && (
                    <div className="bg-emerald-50/40 p-4">
                      <span className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> A Vacina Definitiva:
                      </span>
                      <p className="mt-2 text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
                        <InlineRichText>{trap.correctiveRule}</InlineRichText>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {supplementaryBlocks.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs reading-content">
            <div className="space-y-2">
              {supplementaryBlocks.map((b, bIdx) => (
                <ContentBlockRenderer key={bIdx} block={b} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
