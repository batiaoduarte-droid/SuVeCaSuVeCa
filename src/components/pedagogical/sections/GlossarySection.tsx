import React, { useState } from 'react';
import { Tag, Search, AlertCircle } from 'lucide-react';
import type { SemanticBlock, GlossaryItemView } from '../../../types/pedagogicalView';
import { SemanticBlockRenderer } from '../blocks/SemanticBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface GlossarySectionProps {
  items?: GlossaryItemView[];
  blocks?: SemanticBlock[];
}

export const GlossarySection: React.FC<GlossarySectionProps> = ({ items = [], blocks = [] }) => {
  const [query, setQuery] = useState('');

  const hasItems = items && items.length > 0;
  const hasBlocks = blocks && blocks.length > 0;

  if (!hasItems && !hasBlocks) return null;

  // Extrai itens de lista dos blocos legados se items estruturados não vierem
  const extractedListItems: Array<{ term: string; def: string; misconception?: string; domain?: string }> = [];
  const otherBlocks: SemanticBlock[] = [];

  if (!hasItems) {
    for (const b of blocks) {
      if (b.type === 'list' && b.items) {
        for (const raw of b.items) {
          const clean = raw.replace(/^[—–-]\s*/, '').trim();
          const colonIdx = clean.indexOf(':');
          const term = colonIdx > -1 ? clean.slice(0, colonIdx).trim() : clean;
          const def = colonIdx > -1 ? clean.slice(colonIdx + 1).trim() : '';
          extractedListItems.push({ term, def });
        }
      } else {
        otherBlocks.push(b);
      }
    }
  }

  const allTerms = hasItems
    ? items.map((it) => ({
        term: it.term,
        def: it.fullDefinition || it.shortDefinition || '',
        misconception: it.commonMisconception,
        domain: it.domain,
      }))
    : extractedListItems;

  const filtered = allTerms.filter(
    (t) =>
      t.term.toLowerCase().includes(query.toLowerCase()) ||
      t.def.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5 select-text">
      <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white p-5 shadow-xs sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs select-none">
              <Tag className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
                  Glossário Operacional
                </h3>
                <span className="rounded-full bg-teal-100 text-teal-900 px-2 py-0.5 text-xs font-black select-none border border-teal-300">
                  {allTerms.length} {allTerms.length === 1 ? 'conceito' : 'conceitos'}
                </span>
              </div>
              <p className="m-0 text-xs text-slate-600 font-medium">
                Conceitos normativos e definições operacionais
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 select-none" />
            <input
              type="text"
              placeholder="Buscar conceito..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden transition shadow-2xs"
            />
          </div>
        </div>

        {/* Grade de Termos e Definições - Termo e Definição Sempre Visíveis */}
        {allTerms.length > 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {filtered.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-teal-300 transition space-y-2"
              >
                <div>
                  <div className="flex items-center gap-2 text-teal-950 font-black text-xs sm:text-sm mb-1.5">
                    <Tag className="h-3.5 w-3.5 text-teal-600 shrink-0 select-none" />
                    <span>
                      <InlineRichText>{item.term}</InlineRichText>
                    </span>
                  </div>

                  {item.def && (
                    <p className="m-0 text-xs text-slate-700 leading-relaxed font-medium">
                      <InlineRichText>{item.def}</InlineRichText>
                    </p>
                  )}
                </div>

                {item.misconception && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-950 font-medium flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5 select-none" />
                    <span>
                      <strong>Equívoco Comum:</strong> <InlineRichText>{item.misconception}</InlineRichText>
                    </span>
                  </div>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-2 py-8 text-center text-xs text-slate-500 font-medium">
                Nenhum conceito encontrado para "{query}".
              </div>
            )}
          </div>
        )}

        {/* Blocos Suplementares */}
        {otherBlocks.length > 0 && (
          <div className="pt-3 space-y-2 border-t border-slate-100">
            {otherBlocks.map((b, idx) => (
              <SemanticBlockRenderer key={idx} block={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
