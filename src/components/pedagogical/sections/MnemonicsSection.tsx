import React, { useState } from 'react';
import { Brain, Copy, Check, Sparkles } from 'lucide-react';
import type { ContentBlock } from '../../../types/pedagogicalView';
import { MnemonicCard } from '../../study-visuals/MnemonicCard';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface MnemonicsSectionProps {
  blocks?: ContentBlock[];
}

export const MnemonicsSection: React.FC<MnemonicsSectionProps> = ({ blocks = [] }) => {
  const [copied, setCopied] = useState(false);

  if (!blocks || blocks.length === 0) return null;

  // Extrai itens para os MnemonicCards
  const mnemonics: Array<{ id: number; title: string; hook: string; explanation?: string; acronym?: string }> = [];
  const otherBlocks: ContentBlock[] = [];

  let count = 1;
  for (const block of blocks) {
    if (block.type === 'paragraph' && block.text) {
      const text = block.text;
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 30) {
        mnemonics.push({
          id: count++,
          title: text.slice(0, colonIdx).trim(),
          hook: text.slice(colonIdx + 1).trim(),
        });
      } else {
        mnemonics.push({
          id: count++,
          title: `Gatilho Mnemônico #${count}`,
          hook: text,
        });
      }
    } else if (block.type === 'list' && block.items) {
      for (const li of block.items) {
        if (li.trim()) {
          const colonIdx = li.indexOf(':');
          if (colonIdx > 0 && colonIdx < 35) {
            mnemonics.push({
              id: count++,
              title: li.slice(0, colonIdx).trim(),
              hook: li.slice(colonIdx + 1).trim(),
            });
          } else {
            mnemonics.push({
              id: count++,
              title: `Mnemônico #${count}`,
              hook: li,
            });
          }
        }
      }
    } else {
      otherBlocks.push(block);
    }
  }

  const handleCopyAll = () => {
    const text = mnemonics.map((m) => `💡 ${m.title}: ${m.hook}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-yellow-300 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-yellow-200/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-600 text-white shadow-2xs select-none">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Memorização Inteligente
                </h3>
                <span className="rounded-full bg-yellow-100 text-yellow-950 px-2 py-0.5 text-xs font-black select-none border border-yellow-300">
                  {mnemonics.length} {mnemonics.length === 1 ? 'mnemônico' : 'mnemônicos'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Gatilhos mnemônicos, ancoragem visual e fórmulas de fixação acelerada
              </p>
            </div>
          </div>

          {mnemonics.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
              title="Copiar todos os mnemônicos"
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
          )}
        </div>

        {/* Grid de MnemonicCards */}
        {mnemonics.length > 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {mnemonics.map((m) => (
              <MnemonicCard
                key={m.id}
                title={m.title}
                hook={m.hook}
                explanation={m.explanation}
                acronym={m.acronym}
              />
            ))}
          </div>
        )}

        {/* Outros blocos */}
        {otherBlocks.length > 0 && (
          <div className="pt-3 space-y-2 border-t border-yellow-200/60">
            {otherBlocks.map((b, idx) => (
              <ContentBlockRenderer key={idx} block={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
