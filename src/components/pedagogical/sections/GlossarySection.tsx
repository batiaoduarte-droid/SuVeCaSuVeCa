import React, { useState } from 'react';
import { Tag, Search } from 'lucide-react';
import type { ContentBlock } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface GlossarySectionProps {
  blocks?: ContentBlock[];
}

export const GlossarySection: React.FC<GlossarySectionProps> = ({ blocks = [] }) => {
  const [query, setQuery] = useState('');

  if (!blocks || blocks.length === 0) return null;

  // Extrai itens de lista do glossário para busca rápida
  const listItems: string[] = [];
  const otherBlocks: ContentBlock[] = [];

  for (const b of blocks) {
    if (b.type === 'list' && b.items) {
      listItems.push(...b.items);
    } else {
      otherBlocks.push(b);
    }
  }

  const filteredItems = listItems.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Cabeçalho Padronizado do Glossário */}
      <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs">
              <Tag className="h-5 w-5" />
            </span>
            <div>
              <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
                Glossário operacional
              </h3>
              <p className="m-0 text-xs text-slate-600 font-medium">
                Conceitos normativos e definições operacionais
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar termo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden transition shadow-2xs"
            />
          </div>
        </div>

        {/* Grade de Conceitos com Tags */}
        {listItems.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredItems.map((item, idx) => {
              const cleanItem = item.replace(/^[—–-]\s*/, '').trim();
              const colonIdx = cleanItem.indexOf(':');
              const term = colonIdx > -1 ? cleanItem.slice(0, colonIdx) : '';
              const def = colonIdx > -1 ? cleanItem.slice(colonIdx + 1) : cleanItem;

              return (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-teal-300 transition"
                >
                  <div>
                    {term && (
                      <div className="flex items-center gap-2 text-teal-950 font-black text-xs sm:text-sm mb-1.5">
                        <Tag className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span>
                          <InlineRichText>{term}</InlineRichText>
                        </span>
                      </div>
                    )}
                    <p className="m-0 text-xs text-slate-700 leading-relaxed font-medium">
                      <InlineRichText>{def}</InlineRichText>
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="col-span-2 py-8 text-center text-xs text-slate-500 font-medium">
                Nenhum conceito encontrado para "{query}".
              </div>
            )}
          </div>
        )}

        {otherBlocks.length > 0 && (
          <div className="mt-4 space-y-2">
            {otherBlocks.map((b, idx) => (
              <ContentBlockRenderer key={idx} block={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
