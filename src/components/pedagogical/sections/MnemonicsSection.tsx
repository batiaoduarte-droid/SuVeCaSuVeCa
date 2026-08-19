import React, { useState } from 'react';
import { Brain, Copy, Check, Sparkles } from 'lucide-react';
import type { ContentBlock } from '../../../types/pedagogicalView';
import { InlineRichText } from '../blocks/InlineRichText';
import { FormulaBlock } from '../blocks/FormulaBlock';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface MnemonicsSectionProps {
  blocks?: ContentBlock[];
}

export const MnemonicsSection: React.FC<MnemonicsSectionProps> = ({ blocks = [] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!blocks || blocks.length === 0) return null;

  // Extrai itens para o grid de mnemônicos
  const items: Array<{ id: number; text: string; isFormula: boolean }> = [];
  const otherBlocks: ContentBlock[] = [];

  let count = 1;
  for (const block of blocks) {
    if (block.type === 'paragraph' && block.text) {
      items.push({ id: count++, text: block.text, isFormula: false });
    } else if (block.type === 'formula' && block.text) {
      items.push({ id: count++, text: block.text, isFormula: true });
    } else if (block.type === 'list' && block.items) {
      for (const li of block.items) {
        if (li.trim()) {
          items.push({ id: count++, text: li, isFormula: false });
        }
      }
    } else {
      otherBlocks.push(block);
    }
  }

  const handleCopyItem = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho da Seção */}
      <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-2xs">
            <Brain className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
              Memorização inteligente
            </h3>
            <p className="m-0 text-xs text-slate-600 font-medium">
              Gatilhos mnemônicos e fórmulas de fixação acelerada
            </p>
          </div>
        </div>

        {/* Grid de Cards Mnemônicos */}
        {items.length > 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-indigo-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Mnemônico #{item.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyItem(item.text, item.id)}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      title="Copiar mnemônico"
                    >
                      {copiedIndex === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-slate-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {item.isFormula ? (
                    <FormulaBlock text={item.text} className="my-1 py-2 text-xs" />
                  ) : (
                    <div className="text-xs sm:text-sm leading-relaxed text-slate-800 font-medium">
                      <InlineRichText>{item.text}</InlineRichText>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {otherBlocks.length > 0 && (
          <div className="mt-4 space-y-2">
            {otherBlocks.map((block, idx) => (
              <ContentBlockRenderer key={idx} block={block} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
