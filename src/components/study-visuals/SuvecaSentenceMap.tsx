import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { SUVECA_BLOCK_COLORS } from './studyVisualTokens';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

export interface SentenceBlock {
  type: 'su' | 've' | 'c' | 'a' | 'pred';
  label?: string;
  text: string;
  explanation?: string;
}

interface SuvecaSentenceMapProps {
  sentence?: string;
  blocks?: SentenceBlock[];
  ruleSummary?: string;
  decisiveTest?: string;
  className?: string;
}

const DEFAULT_SAMPLE_BLOCKS: SentenceBlock[] = [
  {
    type: 'a',
    label: 'Adjunto Adverbial (Deslocado)',
    text: 'Ontem à tarde,',
    explanation: 'Termo circunstancial de tempo. Exige vírgula por ser de grande extensão ou opcional se curto.',
  },
  {
    type: 'su',
    label: 'Sujeito Determinado',
    text: 'os auditores fiscais',
    explanation: 'Núcleo: "auditores". Comanda a flexão do verbo na 3ª pessoa do plural.',
  },
  {
    type: 've',
    label: 'Verbo Transitivo Direto e Indireto (VTDI)',
    text: 'entregaram',
    explanation: 'Ação principal que rege dois complementos: um sem preposição e outro com preposição.',
  },
  {
    type: 'c',
    label: 'Objeto Direto (OD)',
    text: 'o relatório conclusivo',
    explanation: 'Complemento sem preposição que responde à pergunta "entregaram o quê?".',
  },
  {
    type: 'c',
    label: 'Objeto Indireto (OI)',
    text: 'à diretoria colegiada.',
    explanation: 'Complemento com crase obrigatória (preposição "a" + artigo "a"). Responde a "a quem?".',
  },
];

export const SuvecaSentenceMap: React.FC<SuvecaSentenceMapProps> = ({
  sentence,
  blocks = DEFAULT_SAMPLE_BLOCKS,
  ruleSummary,
  decisiveTest,
  className = '',
}) => {
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);

  const activeBlock = activeBlockIndex !== null ? blocks[activeBlockIndex] : null;

  return (
    <div
      className={`my-4 rounded-2xl border border-teal-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 select-text ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-amber-300 shadow-2xs select-none">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-black tracking-tight text-teal-950">
              Mapa de Análise da Oração (SuVeCA)
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Clique nos blocos sintáticos para inspecionar a função pedagógica.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-1.5 select-none">
          {Object.entries(SUVECA_BLOCK_COLORS).map(([key, config]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black border ${config.badge}`}
            >
              <span>{config.tag}</span>
              <span className="hidden md:inline font-semibold">{config.name}</span>
            </span>
          ))}
        </div>
      </div>

      {sentence && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Frase Analisada
          </span>
          <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed font-serif">
            “<InlineRichText>{sentence}</InlineRichText>”
          </p>
        </div>
      )}

      {/* Interactive Sentence Blocks */}
      <div className="flex flex-wrap items-stretch gap-2.5 pt-1">
        {blocks.map((block, idx) => {
          const color = SUVECA_BLOCK_COLORS[block.type] || SUVECA_BLOCK_COLORS.su;
          const isSelected = activeBlockIndex === idx;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveBlockIndex(isSelected ? null : idx)}
              className={`flex-1 min-w-[140px] flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? `ring-2 ring-teal-600 shadow-md ${color.bg} ${color.border}`
                  : `hover:border-slate-400 hover:shadow-2xs ${color.bg} ${color.border}/60`
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5 select-none">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black ${color.pill}`}
                >
                  {color.tag}
                </span>
                <span className="text-[10px] font-bold text-slate-500 truncate">
                  {block.label || color.name}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-black leading-snug ${color.text}`}>
                <InlineRichText>{block.text}</InlineRichText>
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Block Inspector Drawer */}
      {activeBlock && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                (SUVECA_BLOCK_COLORS[activeBlock.type] || SUVECA_BLOCK_COLORS.su).pill
              }`}
            >
              {SUVECA_BLOCK_COLORS[activeBlock.type]?.tag || 'BLOCO'}
            </span>
            <h5 className="text-xs font-black text-teal-950">
              {activeBlock.label || SUVECA_BLOCK_COLORS[activeBlock.type]?.name}
            </h5>
          </div>
          <p className="text-xs font-medium text-slate-800 leading-relaxed">
            <InlineRichText>
              {activeBlock.explanation ||
                `Termo sintático identificado com a função de ${SUVECA_BLOCK_COLORS[activeBlock.type]?.name}.`}
            </InlineRichText>
          </p>
        </div>
      )}

      {/* Decisive Rule / Supreme Rule of Commas */}
      {(ruleSummary || decisiveTest) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          {ruleSummary && (
            <div className="flex items-start gap-2.5 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
              <ShieldCheck className="h-4 w-4 text-teal-700 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                  Regra Decisiva da Estrutura
                </span>
                <p className="text-xs font-medium text-teal-950 leading-relaxed">
                  <InlineRichText>{ruleSummary}</InlineRichText>
                </p>
              </div>
            </div>
          )}

          {decisiveTest && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <HelpCircle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                  Teste de Diagnóstico Rápido
                </span>
                <p className="text-xs font-medium text-amber-950 leading-relaxed">
                  <InlineRichText>{decisiveTest}</InlineRichText>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
