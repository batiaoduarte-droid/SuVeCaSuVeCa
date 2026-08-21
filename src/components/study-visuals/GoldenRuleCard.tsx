import React from 'react';
import { Scale, CheckCircle2, ShieldCheck, BookmarkCheck } from 'lucide-react';
import type { CanonicalEntityView, ContentBlock } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';
import { ExceptionCard } from './ExceptionCard';

const modalityLabels: Record<string, string> = {
  prescriptive: 'Prescritiva',
  mandatory: 'Obrigatória',
  proscriptive: 'Restritiva',
  permissive: 'Permitida',
  prohibited: 'Proibida',
  MANDATORY: 'Obrigatória',
};

const scopeLabels: Record<string, string> = {
  phonetics_phonology: 'Fonética e fonologia',
  morphology: 'Morfologia',
  verbs_conjugation: 'Verbos e conjugação',
  syntax: 'Sintaxe',
  punctuation: 'Pontuação',
  agreement: 'Concordância',
  regency_crasis: 'Regência e crase',
  textual_cohesion: 'Coesão textual',
  semantics: 'Semântica',
  text_interpretation: 'Interpretação de textos',
};

interface GoldenRuleCardProps {
  rule: CanonicalEntityView;
  renderBlock?: (block: ContentBlock) => React.ReactNode;
  className?: string;
}

export const GoldenRuleCard: React.FC<GoldenRuleCardProps> = ({
  rule,
  renderBlock,
  className = '',
}) => {
  const showStructuredScaffold = !rule.presentation?.hideGenericScaffold;

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-teal-200 bg-white p-4 sm:p-6 shadow-xs hover:border-teal-300 transition-all select-text ${className}`}
    >
      <div className="space-y-3.5">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-teal-200 select-none shadow-2xs">
              <Scale className="h-4 w-4" />
            </div>
            <h4 className="text-sm sm:text-base font-black tracking-tight text-teal-950">
              <InlineRichText>{rule.title}</InlineRichText>
            </h4>
          </div>

          <div className="flex items-center gap-1.5 select-none">
            {rule.modality && (
              <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-800 uppercase tracking-wider">
                {modalityLabels[rule.modality] || rule.modality}
              </span>
            )}
            {rule.scope && (
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {scopeLabels[rule.scope] || rule.scope}
              </span>
            )}
          </div>
        </div>

        {/* Statement / Regra Decisiva Principal */}
        {showStructuredScaffold && rule.statement && (
          <div className="rounded-xl border border-teal-300 bg-teal-50/70 p-3.5 sm:p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block mb-1 select-none">
              Enunciado da Regra
            </span>
            <p className="text-xs sm:text-sm font-bold text-teal-950 leading-relaxed font-serif">
              <InlineRichText>{rule.statement}</InlineRichText>
            </p>
          </div>
        )}

        {showStructuredScaffold && rule.formalCondition && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-violet-800 select-none">
              Forma operacional
            </span>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed text-violet-950">
              <InlineRichText>{rule.formalCondition}</InlineRichText>
            </p>
          </div>
        )}

        {/* Conditions Checklist */}
        {showStructuredScaffold && rule.conditions && rule.conditions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block select-none">
              Condições Obrigatórias:
            </span>
            <ul className="space-y-1.5">
              {rule.conditions.map((cond, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-relaxed"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0 select-none" />
                  <span>
                    <InlineRichText>{cond}</InlineRichText>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Exceptions */}
        {showStructuredScaffold && rule.exceptions && rule.exceptions.length > 0 && (
          <ExceptionCard exceptions={rule.exceptions} />
        )}

        {showStructuredScaffold && rule.boundaries && rule.boundaries.length > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-violet-800">Limites de aplicação</span>
            <ul className="space-y-1 pl-4 text-xs font-medium leading-relaxed text-violet-950">
              {rule.boundaries.map((boundary, index) => <li key={index}><InlineRichText>{boundary}</InlineRichText></li>)}
            </ul>
          </div>
        )}

        {showStructuredScaffold && rule.examples && rule.examples.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-emerald-800">Exemplos de aplicação</span>
            <ul className="space-y-1 pl-4 text-xs font-medium leading-relaxed text-emerald-950">
              {rule.examples.map((example, index) => <li key={index}><InlineRichText>{example}</InlineRichText></li>)}
            </ul>
          </div>
        )}

        {/* Secondary Content Blocks */}
        {rule.blocks && rule.blocks.length > 0 && renderBlock && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {rule.blocks.map((block, bIdx) => (
              <React.Fragment key={bIdx}>{renderBlock(block)}</React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
