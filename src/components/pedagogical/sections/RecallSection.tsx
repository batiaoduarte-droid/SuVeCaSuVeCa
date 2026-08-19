import React, { useState } from 'react';
import { Award, CheckSquare, Square, Copy, Check } from 'lucide-react';
import type { ContentBlock } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface RecallSectionProps {
  blocks?: ContentBlock[];
}

export const RecallSection: React.FC<RecallSectionProps> = ({ blocks = [] }) => {
  const [checkedState, setCheckedState] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!blocks || blocks.length === 0) return null;

  const checklistItems: string[] = [];
  const otherBlocks: ContentBlock[] = [];

  for (const b of blocks) {
    if (b.type === 'list') {
      checklistItems.push(...b.items);
    } else {
      otherBlocks.push(b);
    }
  }

  const toggleItem = (idx: number) => {
    setCheckedState((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const completedCount = Object.values(checkedState).filter(Boolean).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCopy = () => {
    const text = checklistItems.map((item, i) => `[ ] ${i + 1}. ${item}`).join('\n');
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
            <CheckSquare className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
              Síntese para recuperação ativa
            </h3>
            <p className="m-0 text-xs text-slate-600 font-medium">
              Checklist de validação do domínio conceitual e consolidação mnemônica
            </p>
          </div>
        </div>

        {checklistItems.length > 0 && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
            title="Copiar checklist"
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

      {otherBlocks.length > 0 && (
        <div className="space-y-2 reading-content">
          {otherBlocks.map((b, idx) => (
            <ContentBlockRenderer key={idx} block={b} />
          ))}
        </div>
      )}

      {checklistItems.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/20 p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100/80 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                Recuperação Ativa & Autoavaliação
              </span>
              <h4 className="m-0 text-sm font-black text-slate-900">
                Checklist de Domínio da Unidade
              </h4>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-900 border border-teal-200 shadow-2xs">
              <Award className="h-4 w-4 text-teal-600" />
              <span>
                {completedCount} de {totalCount} dominados ({progressPercent}%)
              </span>
            </div>
          </div>

          <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-5 space-y-2.5">
            {checklistItems.map((item, idx) => {
              const isChecked = !!checkedState[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition cursor-pointer shadow-2xs ${
                    isChecked
                      ? 'border-emerald-300 bg-emerald-50/70 text-slate-900'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30 text-slate-800'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <span
                    className={`text-xs sm:text-sm font-medium leading-relaxed ${
                      isChecked ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    <InlineRichText>{item}</InlineRichText>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
