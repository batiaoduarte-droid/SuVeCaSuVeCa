import React, { useState } from 'react';
import { Scale, Copy, Check, ShieldCheck, Gavel } from 'lucide-react';
import type { CanonicalEntityView } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface RulesSectionProps {
  items: CanonicalEntityView[];
}

export const RulesSection: React.FC<RulesSectionProps> = ({ items }) => {
  const [copied, setCopied] = useState(false);

  if (!items || items.length === 0) return null;

  const handleCopy = () => {
    const textToCopy = items.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 surface p-4 sm:p-6">
      {/* Cabeçalho Padronizado da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs">
            <Scale className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
              Regras decisivas ({items.length})
            </h3>
            <p className="m-0 text-xs text-slate-600 font-medium">
              Critérios normativos e postulados canônicos de aplicação direta
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
          title="Copiar regras"
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

      {/* Grid de Regras Decisivas */}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((rule, idx) => {
          const hasTable = (rule.blocks || []).some((b) => b.type === 'table_ref');
          return (
            <div
              key={rule.entityId || idx}
              className={`flex flex-col justify-between rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-4 sm:p-5 shadow-xs transition hover:border-teal-400 hover:shadow-sm ${
                hasTable ? 'sm:col-span-2' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-teal-100/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white font-bold text-xs shadow-2xs">
                      <Gavel className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="m-0 text-xs sm:text-sm font-black text-slate-900 leading-snug">
                      <InlineRichText>{rule.title}</InlineRichText>
                    </h4>
                  </div>
                  <span className="shrink-0 rounded-md bg-teal-100/80 px-2 py-0.5 text-[10px] font-black uppercase text-teal-900 border border-teal-200">
                    Regra Canônica
                  </span>
                </div>

                <div className="mt-3.5 space-y-2 reading-content text-xs sm:text-sm">
                  {rule.blocks.map((block, bIdx) => (
                    <ContentBlockRenderer key={bIdx} block={block} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
