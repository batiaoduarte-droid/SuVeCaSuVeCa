import React from 'react';
import { AlertTriangle, ArrowRightLeft, HelpCircle, Lightbulb } from 'lucide-react';
import type {
  ContrastSideView,
  ContrastView,
  ContentBlock,
} from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';
import { semanticBlocksToPlainText } from '../../lib/semanticBlockText';

interface ContrastBoardProps {
  contrast: ContrastView;
  renderBlock?: (block: ContentBlock) => React.ReactNode;
  className?: string;
}

interface NormalizedContrastSide {
  label: string;
  details: string[];
}

const compactUnique = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const stripDisplayOrdinal = (value: string): string => value.replace(/^\s*\d+(?:\.\d+)*[.)]?\s+/, '').trim();

const normalizeSide = (
  side: string | ContrastSideView | undefined,
  concept: string | undefined,
  fallback: string,
  legacyValue?: string | null,
): NormalizedContrastSide => {
  if (typeof side === 'string') {
    return { label: stripDisplayOrdinal(concept || fallback), details: compactUnique([side, legacyValue]) };
  }

  return {
    label: stripDisplayOrdinal(concept || side?.label || fallback),
    details: compactUnique([side?.description, ...(side?.criteria || []), legacyValue]),
  };
};

export const contrastToPlainText = (contrast: ContrastView): string => {
  if (contrast.presentation?.hideGenericScaffold && contrast.blocks?.length) {
    return compactUnique([contrast.title, semanticBlocksToPlainText(contrast.blocks)]).join('\n');
  }
  const sideA = normalizeSide(contrast.sideA, contrast.conceptA, 'Conceito A', contrast.left);
  const sideB = normalizeSide(contrast.sideB, contrast.conceptB, 'Conceito B', contrast.right);
  const pair = contrast.minimalPair;
  return compactUnique([
    contrast.title || `${sideA.label} × ${sideB.label}`,
    contrast.statement,
    `A — ${sideA.label}`,
    ...sideA.details,
    pair?.left || pair?.sentenceA,
    `B — ${sideB.label}`,
    ...sideB.details,
    pair?.right || pair?.sentenceB,
    contrast.decisiveDifference,
    contrast.decisionCriterion,
    pair?.decisiveDifference || pair?.difference,
    contrast.practicalHeuristic,
    contrast.pitfall,
    contrast.commonConfusion,
  ]).join('\n');
};

export const ContrastBoard: React.FC<ContrastBoardProps> = ({
  contrast,
  renderBlock,
  className = '',
}) => {
  const sideA = normalizeSide(contrast.sideA, contrast.conceptA, 'Conceito A', contrast.left);
  const sideB = normalizeSide(contrast.sideB, contrast.conceptB, 'Conceito B', contrast.right);
  const pair = contrast.minimalPair;
  const pairA = pair?.left || pair?.sentenceA;
  const pairB = pair?.right || pair?.sentenceB;
  const pairDifference = pair?.decisiveDifference || pair?.difference;
  const title = stripDisplayOrdinal(contrast.title || `${sideA.label} × ${sideB.label}`);
  const decisiveCriteria = compactUnique([
    contrast.decisiveDifference,
    contrast.decisionCriterion,
    pairDifference,
  ]);
  const cautions = compactUnique([contrast.pitfall, contrast.commonConfusion]);
  const showStructuredScaffold = !contrast.presentation?.hideGenericScaffold;

  const renderSide = (
    side: NormalizedContrastSide,
    pairExample: string | undefined,
    marker: 'A' | 'B',
    palette: 'teal' | 'sky',
  ) => (
    <div className={`rounded-xl border p-4 space-y-2.5 ${palette === 'teal' ? 'border-teal-200 bg-teal-50/40' : 'border-sky-200 bg-sky-50/40'}`}>
      <div className={`flex items-center gap-2 border-b pb-2 ${palette === 'teal' ? 'border-teal-200' : 'border-sky-200'}`}>
        <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-black text-white select-none ${palette === 'teal' ? 'bg-teal-800' : 'bg-sky-800'}`}>
          {marker}
        </span>
        <h5 className={`text-xs sm:text-sm font-black ${palette === 'teal' ? 'text-teal-950' : 'text-sky-950'}`}>
          <InlineRichText>{side.label}</InlineRichText>
        </h5>
      </div>

      {side.details.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {side.details.map((detail, index) => (
            <li key={index} className="flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-800">
              <span className={palette === 'teal' ? 'font-bold text-teal-700' : 'font-bold text-sky-700'} aria-hidden="true">•</span>
              <InlineRichText>{detail}</InlineRichText>
            </li>
          ))}
        </ul>
      )}

      {pairExample && (
        <div className="rounded-lg border border-white/80 bg-white/80 p-2.5 text-xs font-semibold leading-relaxed text-slate-900">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Exemplo de contraste</span>
          <InlineRichText>{pairExample}</InlineRichText>
        </div>
      )}
    </div>
  );

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs space-y-4 select-text ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white select-none shadow-2xs">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <h4 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
            <InlineRichText>{title}</InlineRichText>
          </h4>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700 select-none">
          Contraste de prova
        </span>
      </div>

      {showStructuredScaffold && contrast.statement?.trim() && (
        <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-700">
          <InlineRichText>{contrast.statement}</InlineRichText>
        </p>
      )}

      {showStructuredScaffold && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderSide(sideA, pairA, 'A', 'teal')}
          {renderSide(sideB, pairB, 'B', 'sky')}
        </div>
      )}

      {showStructuredScaffold && decisiveCriteria.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 select-none">
            <HelpCircle className="h-4 w-4 text-amber-700" />
            <span className="text-[10px] uppercase tracking-wider">Critérios decisivos de desempate</span>
          </div>
          <ul className="space-y-1.5 pl-4 text-xs sm:text-sm font-bold leading-relaxed text-amber-950">
            {decisiveCriteria.map((criterion, index) => (
              <li key={index}><InlineRichText>{criterion}</InlineRichText></li>
            ))}
          </ul>
        </div>
      )}

      {showStructuredScaffold && contrast.practicalHeuristic && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-xs font-medium leading-relaxed text-teal-950">
          <strong className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-teal-900">
            <Lightbulb className="h-3.5 w-3.5" /> Atalho prático
          </strong>
          <InlineRichText>{contrast.practicalHeuristic}</InlineRichText>
        </div>
      )}

      {showStructuredScaffold && cautions.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs font-medium leading-relaxed text-rose-950">
          <strong className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-rose-900">
            <AlertTriangle className="h-3.5 w-3.5" /> Confusão a evitar
          </strong>
          <ul className="space-y-1 pl-4">
            {cautions.map((caution, index) => (
              <li key={index}><InlineRichText>{caution}</InlineRichText></li>
            ))}
          </ul>
        </div>
      )}

      {contrast.blocks && contrast.blocks.length > 0 && renderBlock && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          {contrast.blocks.map((block, index) => (
            <React.Fragment key={index}>{renderBlock(block)}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
