import React, { useState } from 'react';
import { Scale, Copy, Check } from 'lucide-react';
import type { CanonicalEntityView } from '../../../types/pedagogicalView';
import { GoldenRuleCard } from '../../study-visuals/GoldenRuleCard';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface RulesSectionProps {
  items: CanonicalEntityView[];
}

export const RulesSection: React.FC<RulesSectionProps> = ({ items }) => {
  const [copied, setCopied] = useState(false);

  if (!items || items.length === 0) return null;

  const handleCopy = () => {
    const textToCopy = items.map((r, i) => `${i + 1}. ${r.title}\n${r.statement || ''}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Layout responsivo baseado na quantidade de regras
  const gridClass =
    items.length === 1
      ? 'grid-cols-1'
      : items.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-teal-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-900 text-teal-200 shadow-2xs select-none">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Regras Decisivas
                </h3>
                <span className="rounded-full bg-teal-100 text-teal-900 px-2 py-0.5 text-xs font-black select-none">
                  {items.length} {items.length === 1 ? 'regra' : 'regras'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Critérios normativos, enunciados e limites canônicos de aplicação direta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
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

        {/* Grid de Regras com GoldenRuleCard */}
        <div className={`grid gap-4 ${gridClass}`}>
          {items.map((rule, idx) => (
            <GoldenRuleCard
              key={rule.entityId || idx}
              rule={rule}
              renderBlock={(b) => <ContentBlockRenderer block={b} />}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
