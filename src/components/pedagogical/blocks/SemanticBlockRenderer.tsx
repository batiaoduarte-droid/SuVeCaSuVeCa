import React, { useState } from 'react';
import {
  Scale,
  Zap,
  ArrowLeftRight,
  Split,
  Table as TableIcon,
  Tag,
  CheckCircle2,
  AlertCircle,
  Layers,
  BookOpenCheck,
  Lightbulb,
  ShieldAlert,
  CheckSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  SemanticBlock,
  ConceptDefinitionBlock,
  ClassificationBlock,
  ComparisonMatrixBlock,
  RuleBoundaryBlock,
  FormulaBlock,
  ProcedureBlock,
  ContrastBlock,
  MinimalPairBlock,
  AnnotatedSentenceBlock,
  TableBlock,
  BulletListBlock,
  RuleBlock,
  WorkedExampleBlock,
  MnemonicBlock,
  ExamTrapBlock,
  RecallPromptBlock,
} from '../../../types/pedagogicalView';
import { InlineRichText, sanitizePedagogicalText } from './InlineRichText';
import { FormulaBlock as FormulaBlockView } from './FormulaBlock';
import { ResponsiveStudyTable } from '../../study-visuals/ResponsiveStudyTable';
import { StudyCallout } from '../../study-visuals/StudyCallout';
import { ConceptTree } from '../../study-visuals/ConceptTree';
import { ConnectionMap, looksLikeConnectionMap } from '../../ui/ConnectionMap';
import type { StudyTone } from '../../study-visuals/studyVisualTokens';

interface SemanticBlockRendererProps {
  block: SemanticBlock;
}

const mapCalloutKindToTone = (kind?: string): StudyTone => {
  switch (kind) {
    case 'objective':
      return 'procedure';
    case 'method_limit':
      return 'exception';
    case 'insight':
      return 'rule';
    case 'warning':
      return 'trap';
    default:
      return 'concept';
  }
};

/**
 * Renderizador de Matriz de Comparação Responsiva
 * Desktop: Tabela estruturada limpa
 * Mobile (< 640px): Cards empilhados por linha/critério
 */
const isTechnicalOrEmptyHeader = (header: string): boolean => {
  const h = (header || '').trim().toLowerCase();
  if (!h) return true;
  return (
    h.includes('id detalhado') ||
    h.includes('id de referência') ||
    h.includes('identificador') ||
    h.includes('referência técnica') ||
    h === 'referência' ||
    h === 'referencia' ||
    h === 'ref' ||
    h.includes('ref id') ||
    h.includes('kb id') ||
    h.includes('rule id') ||
    h.includes('guid') ||
    h === 'id' ||
    h === 'código' ||
    h === 'codigo'
  );
};

export const ResponsiveComparisonMatrix: React.FC<{ block: ComparisonMatrixBlock }> = ({ block }) => {
  const { title, columns = [], rows = [] } = block;

  if (!columns.length && !rows.length) {
    if (block.text) {
      return (
        <p className="my-2.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-800 select-text max-w-4xl">
          <InlineRichText>{block.text}</InlineRichText>
        </p>
      );
    }
    return null;
  }

  // Filtra colunas válidas (que possuem cabeçalho e conteúdo não vazio nas linhas após sanitização)
  const validColIndices = columns
    .map((col, idx) => ({ col, idx }))
    .filter(({ col, idx }) => {
      const colText = (col || '').trim();
      const isTech = isTechnicalOrEmptyHeader(colText);
      const hasContent = (rows || []).some((r) => {
        const val = Array.isArray(r) ? r[idx] : (r as Record<string, string>)[col];
        return Boolean(sanitizePedagogicalText(val || '').trim());
      });
      if (isTech) return hasContent;
      return Boolean(colText) || hasContent;
    })
    .map(({ idx }) => idx);

  const cleanColumns = validColIndices.length > 0
    ? validColIndices.map((i) => columns[i])
    : columns;

  const normalizedRows: Array<Record<string, string>> = rows.map((r) => {
    if (Array.isArray(r)) {
      const obj: Record<string, string> = {};
      cleanColumns.forEach((col, idx) => {
        const originalIdx = validColIndices[idx] ?? idx;
        obj[col] = r[originalIdx] || '';
      });
      return obj;
    }
    return r as Record<string, string>;
  });

  return (
    <div className="my-4 space-y-2 select-text">
      {title && (
        <div className="flex items-center gap-2 mb-1">
          <TableIcon className="h-4 w-4 text-teal-700 select-none" />
          <h5 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
            <InlineRichText>{title}</InlineRichText>
          </h5>
        </div>
      )}

      {/* Desktop View */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50">
            <tr>
              {cleanColumns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="px-3.5 py-2.5 font-black text-slate-800 uppercase tracking-wider text-[11px]"
                >
                  <InlineRichText>{col.trim() || `Coluna ${idx + 1}`}</InlineRichText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {normalizedRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {cleanColumns.map((col, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 leading-relaxed font-medium align-top">
                    {row[col] ? <InlineRichText>{row[col]}</InlineRichText> : <span className="text-slate-300 font-mono text-xs select-none">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked View */}
      <div className="block sm:hidden space-y-3">
        {normalizedRows.map((row, rIdx) => (
          <div
            key={rIdx}
            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2"
          >
            {cleanColumns.map((col, cIdx) => {
              const val = row[col] || '';
              if (!val) return null;
              return (
                <div key={cIdx} className="text-xs leading-relaxed">
                  <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                    <InlineRichText>{col.trim() || `Coluna ${cIdx + 1}`}</InlineRichText>:
                  </span>
                  <span className="text-slate-700 font-medium pl-1">
                    <InlineRichText>{val}</InlineRichText>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Renderizador de Tabela Canônica AST
 */
export const ResponsiveAstTable: React.FC<{ block: TableBlock }> = ({ block }) => {
  const { title, caption, columns = [], rows = [], text } = block;

  if ((!columns || columns.length === 0) && (!rows || rows.length === 0)) {
    if (text) {
      return (
        <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 select-text text-xs leading-relaxed">
          <pre className="font-mono text-slate-800 whitespace-pre-wrap"><code>{text}</code></pre>
        </div>
      );
    }
    return null;
  }

  // Filtra colunas válidas (que possuem cabeçalho e conteúdo não vazio nas linhas após sanitização)
  const validColIndices = columns
    .map((col, idx) => ({ col, idx }))
    .filter(({ col, idx }) => {
      const colText = (col || '').trim();
      const isTech = isTechnicalOrEmptyHeader(colText);
      const hasContent = (rows || []).some((r) => {
        const val = Array.isArray(r) ? r[idx] : (r as Record<string, string>)[col];
        return Boolean(sanitizePedagogicalText(val || '').trim());
      });
      if (isTech) return hasContent;
      return Boolean(colText) || hasContent;
    })
    .map(({ idx }) => idx);

  const cleanColumns = validColIndices.length > 0
    ? validColIndices.map((i) => columns[i])
    : columns;

  const normalizedRows: string[][] = (rows || []).map((r) => {
    if (Array.isArray(r)) {
      return (validColIndices.length > 0 ? validColIndices : columns.map((_, i) => i)).map((i) => r[i] || '');
    }
    return cleanColumns.map((col) => (r as Record<string, string>)[col] || '');
  });

  return (
    <div className="my-4 space-y-2 select-text">
      {title && (
        <div className="flex items-center gap-2 mb-1">
          <TableIcon className="h-4 w-4 text-teal-700 select-none" />
          <h5 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
            <InlineRichText>{title}</InlineRichText>
          </h5>
        </div>
      )}
      {caption && (
        <p className="text-xs text-slate-500 font-medium italic mb-1">
          <InlineRichText>{caption}</InlineRichText>
        </p>
      )}

      {/* Desktop / Tablet */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50">
            <tr>
              {cleanColumns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="px-3.5 py-2.5 font-black text-slate-800 uppercase tracking-wider text-[11px]"
                >
                  <InlineRichText>{col.trim() || `Coluna ${idx + 1}`}</InlineRichText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {normalizedRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 leading-relaxed font-medium align-top">
                    {cell ? <InlineRichText>{cell}</InlineRichText> : <span className="text-slate-300 font-mono text-xs select-none">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="block sm:hidden space-y-3">
        {normalizedRows.map((row, rIdx) => (
          <div
            key={rIdx}
            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2"
          >
            {cleanColumns.map((col, cIdx) => {
              const val = row[cIdx] || '';
              if (!val) return null;
              return (
                <div key={cIdx} className="text-xs leading-relaxed">
                  <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                    <InlineRichText>{col.trim() || `Coluna ${cIdx + 1}`}</InlineRichText>:
                  </span>
                  <span className="text-slate-700 font-medium pl-1">
                    <InlineRichText>{val}</InlineRichText>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Renderizador de Classificação Categorial AST
 */
export const ClassificationRenderer: React.FC<{ block: ClassificationBlock }> = ({ block }) => {
  const { title, categories = [] } = block;

  return (
    <div className="my-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3 select-text">
      {title && (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Layers className="h-4 w-4 text-teal-700 select-none" />
          <h5 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
            <InlineRichText>{title}</InlineRichText>
          </h5>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-1.5"
          >
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-teal-800 text-[10px] font-bold text-white select-none">
                {idx + 1}
              </span>
              <span className="text-xs font-black text-teal-950 tracking-tight">
                <InlineRichText>{cat.name || cat.category || `Categoria ${idx + 1}`}</InlineRichText>
              </span>
            </div>

            {cat.description && (
              <p className="text-xs text-slate-700 font-medium leading-relaxed m-0">
                <InlineRichText>{cat.description}</InlineRichText>
              </p>
            )}

            {(cat.examples || cat.items || []).length > 0 && (
              <div className="pt-1 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Exemplos / Casos:
                </span>
                <ul className="list-disc list-inside text-xs text-slate-700 pl-1 space-y-0.5">
                  {(cat.examples || cat.items || []).map((ex, eIdx) => (
                    <li key={eIdx} className="font-medium">
                      <InlineRichText>{ex}</InlineRichText>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Dispatcher Central de Blocos Semânticos v4.2 & Legados
 */
export const SemanticBlockRenderer: React.FC<SemanticBlockRendererProps> = ({ block }) => {
  if (!block) return null;

  switch (block.type) {
    case 'concept_definition': {
      const term = block.term;
      const def = block.definition || block.text || '';
      return (
        <div className="my-3 rounded-xl border border-teal-200/80 bg-teal-50/40 p-3.5 sm:p-4 select-text space-y-1">
          {term && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-teal-950 tracking-tight">
              <Tag className="h-3.5 w-3.5 text-teal-700 select-none shrink-0" />
              <span><InlineRichText>{term}</InlineRichText></span>
            </div>
          )}
          <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed m-0">
            <InlineRichText>{def}</InlineRichText>
          </p>
        </div>
      );
    }

    case 'concept_explanation': {
      if (!block.text) return null;
      return (
        <p className="my-2.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-800 select-text max-w-4xl">
          <InlineRichText>{block.text}</InlineRichText>
        </p>
      );
    }

    case 'classification':
      return <ClassificationRenderer block={block} />;

    case 'taxonomy':
      if (block.nodes && block.edges && block.nodes.length > 0) {
        return <ConceptTree nodes={block.nodes} edges={block.edges} />;
      }
      if (block.categories && block.categories.length > 0) {
        return <ClassificationRenderer block={{ ...block, type: 'classification', categories: block.categories }} />;
      }
      if (block.text) {
        return (
          <p className="my-2.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-800 select-text max-w-4xl">
            <InlineRichText>{block.text}</InlineRichText>
          </p>
        );
      }
      return null;

    case 'comparison_matrix':
      return <ResponsiveComparisonMatrix block={block} />;

    case 'table':
      return <ResponsiveAstTable block={block} />;

    case 'rule_boundary': {
      const { title, scope, conditions = [], exceptions = [], text } = block;
      return (
        <div className="my-4 rounded-xl border border-amber-300 bg-amber-50/50 p-4 select-text space-y-2.5">
          <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
            <Scale className="h-4 w-4 text-amber-800 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-amber-950 tracking-tight m-0">
              <InlineRichText>{title || 'Limite Normativo & Âmbito de Aplicação'}</InlineRichText>
            </h5>
            {scope && (
              <span className="ml-auto rounded-md bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                {scope}
              </span>
            )}
          </div>
          {text && (
            <p className="text-xs text-amber-950 font-medium leading-relaxed m-0">
              <InlineRichText>{text}</InlineRichText>
            </p>
          )}
          {conditions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                Condições de Aplicação:
              </span>
              <ul className="space-y-1 text-xs text-amber-950 pl-1">
                {conditions.map((cond, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><InlineRichText>{cond}</InlineRichText></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exceptions.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-amber-200/60">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                Exceções e Vedações:
              </span>
              <ul className="space-y-1 text-xs text-rose-950 pl-1">
                {exceptions.map((exc, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span><InlineRichText>{exc}</InlineRichText></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case 'rule': {
      const { title, statement, scope, modality, conditions = [], exceptions = [], text } = block;
      return (
        <div className="my-4 rounded-xl border border-teal-200 bg-white p-4 select-text space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-teal-100 pb-2">
            <Scale className="h-4 w-4 text-teal-800 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-teal-950 tracking-tight m-0">
              <InlineRichText>{title || 'Regra Decisiva'}</InlineRichText>
            </h5>
            {modality && (
              <span className="ml-auto rounded-md bg-teal-100 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-900">
                {modality}
              </span>
            )}
          </div>
          {(statement || text) && (
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed m-0">
              <InlineRichText>{statement || text || ''}</InlineRichText>
            </p>
          )}
          {conditions.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-teal-900 uppercase tracking-wider block">
                Condições:
              </span>
              <ul className="space-y-1 text-xs text-slate-700 pl-1">
                {conditions.map((cond, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><InlineRichText>{cond}</InlineRichText></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exceptions.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                Exceções:
              </span>
              <ul className="space-y-1 text-xs text-rose-950 pl-1">
                {exceptions.map((exc, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span><InlineRichText>{exc}</InlineRichText></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case 'formula': {
      if (block.expression) {
        return (
          <div className="my-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 select-text space-y-3">
            {block.title && (
              <h5 className="text-xs sm:text-sm font-black text-sky-950 tracking-tight m-0">
                <InlineRichText>{block.title}</InlineRichText>
              </h5>
            )}
            <FormulaBlockView text={block.expression} />
            {block.variables && block.variables.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-sky-100 text-xs">
                <span className="font-bold text-sky-900 block text-[11px] uppercase tracking-wider">
                  Variáveis da Expressão:
                </span>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {block.variables.map((v, vIdx) => (
                    <div key={vIdx} className="font-medium text-slate-700">
                      <code className="font-mono font-bold text-sky-900 mr-1">{v.name || (v as any).symbol}</code>: {v.description || (v as any).meaning}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {block.explanation && (
              <p className="text-xs text-slate-700 font-medium leading-relaxed m-0">
                <InlineRichText>{block.explanation}</InlineRichText>
              </p>
            )}
          </div>
        );
      }
      return <FormulaBlockView text={block.text || ''} />;
    }

    case 'procedure': {
      const { title, steps = [], objective, text } = block;
      return (
        <div className="my-4 rounded-xl border border-sky-200 bg-white p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
            <Zap className="h-4 w-4 text-sky-700 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight m-0">
              <InlineRichText>{title || 'Procedimento Operacional'}</InlineRichText>
            </h5>
          </div>
          {objective && (
            <p className="text-xs text-sky-900 font-semibold bg-sky-50 p-2 rounded-lg m-0">
              <strong>Objetivo:</strong> <InlineRichText>{objective}</InlineRichText>
            </p>
          )}
          {text && (
            <p className="text-xs text-slate-700 font-medium leading-relaxed m-0">
              <InlineRichText>{text}</InlineRichText>
            </p>
          )}
          {steps.length > 0 && (
            <ol className="space-y-2 text-xs text-slate-800 list-none pl-0 m-0">
              {steps.map((st, idx) => {
                const action = typeof st === 'string' ? st : st.action;
                const expl = typeof st === 'string' ? '' : st.explanation;
                return (
                  <li key={idx} className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-900 text-[10px] font-bold text-white select-none">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 leading-relaxed block">
                        <InlineRichText>{action}</InlineRichText>
                      </span>
                      {expl && (
                        <span className="text-slate-600 font-medium leading-relaxed block text-[11px]">
                          <InlineRichText>{expl}</InlineRichText>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      );
    }

    case 'contrast': {
      const { title, conceptA, conceptB, decisiveDifference, decisionCriterion, text } = block;
      return (
        <div className="my-4 rounded-xl border border-slate-200 bg-white p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <ArrowLeftRight className="h-4 w-4 text-slate-700 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight m-0">
              <InlineRichText>{title || `${conceptA || 'A'} vs ${conceptB || 'B'}`}</InlineRichText>
            </h5>
          </div>
          {(conceptA || conceptB) && (
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <span className="font-black text-slate-900 block mb-1 uppercase tracking-wider text-[10px]">
                  Lado A: <InlineRichText>{conceptA || ''}</InlineRichText>
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <span className="font-black text-slate-900 block mb-1 uppercase tracking-wider text-[10px]">
                  Lado B: <InlineRichText>{conceptB || ''}</InlineRichText>
                </span>
              </div>
            </div>
          )}
          {decisiveDifference && (
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-2.5 text-xs text-teal-950 font-medium">
              <strong>Diferença Decisiva:</strong> <InlineRichText>{decisiveDifference}</InlineRichText>
            </div>
          )}
          {decisionCriterion && (
            <div className="text-xs text-slate-600 font-medium pl-1">
              <strong>Critério de Desempate:</strong> <InlineRichText>{decisionCriterion}</InlineRichText>
            </div>
          )}
          {text && !decisiveDifference && !decisionCriterion && !conceptA && !conceptB && (
            <p className="text-xs text-slate-700 font-medium leading-relaxed m-0">
              <InlineRichText>{text}</InlineRichText>
            </p>
          )}
        </div>
      );
    }

    case 'minimal_pair': {
      const { title, left, right, sentenceA, sentenceB, decisiveDifference, explanation, text } = block;
      const side1 = left || sentenceA || '';
      const side2 = right || sentenceB || '';
      return (
        <div className="my-4 rounded-xl border border-teal-200 bg-white p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-teal-100 pb-2">
            <Split className="h-4 w-4 text-teal-700 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-teal-950 tracking-tight m-0">
              <InlineRichText>{title || 'Par Mínimo / Contraponto Direto'}</InlineRichText>
            </h5>
          </div>
          {(side1 || side2) && (
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-teal-800 tracking-wider block">
                  Estrutura A:
                </span>
                <p className="font-serif font-bold text-teal-950 leading-relaxed m-0">
                  <InlineRichText>{side1}</InlineRichText>
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block">
                  Estrutura B:
                </span>
                <p className="font-serif font-bold text-slate-900 leading-relaxed m-0">
                  <InlineRichText>{side2}</InlineRichText>
                </p>
              </div>
            </div>
          )}
          {decisiveDifference && (
            <div className="rounded-lg bg-teal-100/70 border border-teal-300 p-2.5 text-xs text-teal-950 font-semibold">
              <strong>Ponto Decisivo:</strong> <InlineRichText>{decisiveDifference}</InlineRichText>
            </div>
          )}
          {explanation && (
            <p className="text-xs text-slate-700 font-medium leading-relaxed m-0 pl-1">
              <InlineRichText>{explanation}</InlineRichText>
            </p>
          )}
          {text && !decisiveDifference && !explanation && (
            <p className="text-xs text-slate-700 font-medium leading-relaxed m-0 pl-1">
              <InlineRichText>{text}</InlineRichText>
            </p>
          )}
        </div>
      );
    }

    case 'worked_example': {
      const { title, prompt, analysisSteps = [], result, decisivePoint, commonMistake, examTip, text } = block;
      return (
        <div className="my-4 rounded-xl border border-emerald-200 bg-white p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
            <BookOpenCheck className="h-4 w-4 text-emerald-800 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-emerald-950 tracking-tight m-0">
              <InlineRichText>{title || 'Exemplo Comentado'}</InlineRichText>
            </h5>
          </div>
          {(prompt || text) && (
            <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3 text-xs sm:text-sm font-serif font-bold text-emerald-950 leading-relaxed">
              <InlineRichText>{prompt || text || ''}</InlineRichText>
            </div>
          )}
          {analysisSteps.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Raciocínio Passo a Passo:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-800 font-medium pl-1">
                {analysisSteps.map((st, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <InlineRichText>{st}</InlineRichText>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {result && (
            <div className="rounded-lg bg-emerald-100/70 border border-emerald-300 p-2.5 text-xs text-emerald-950 font-semibold">
              <strong>Resultado / Gabarito:</strong> <InlineRichText>{result}</InlineRichText>
            </div>
          )}
          {decisivePoint && (
            <div className="text-xs text-slate-700 font-medium pl-1">
              <strong>Ponto Decisivo:</strong> <InlineRichText>{decisivePoint}</InlineRichText>
            </div>
          )}
          {commonMistake && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-950 font-medium">
              <strong>Erro Típico de Candidato:</strong> <InlineRichText>{commonMistake}</InlineRichText>
            </div>
          )}
          {examTip && (
            <div className="text-xs text-emerald-900 font-medium pl-1">
              <strong>Dica de Prova:</strong> <InlineRichText>{examTip}</InlineRichText>
            </div>
          )}
        </div>
      );
    }

    case 'mnemonic': {
      const { title, content, appliesTo, limitations, text } = block;
      return (
        <div className="my-4 rounded-xl border border-amber-300 bg-amber-50/40 p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
            <Lightbulb className="h-4 w-4 text-amber-800 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-amber-950 tracking-tight m-0">
              <InlineRichText>{title || 'Memorização Inteligente'}</InlineRichText>
            </h5>
          </div>
          {(content || text) && (
            <div className="rounded-lg bg-white border border-amber-200 p-3 text-xs sm:text-sm font-bold text-amber-950 leading-relaxed text-center">
              <InlineRichText>{content || text || ''}</InlineRichText>
            </div>
          )}
          {(appliesTo || limitations) && (
            <div className="grid gap-2.5 md:grid-cols-2">
              {appliesTo && (
                <div className="rounded-lg border border-amber-200 bg-white p-2.5 text-xs font-medium text-slate-800">
                  <strong className="mb-0.5 block text-[10px] uppercase tracking-wider text-amber-900">Quando usar</strong>
                  <InlineRichText>{appliesTo}</InlineRichText>
                </div>
              )}
              {limitations && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-950 font-medium space-y-0.5">
                  <span className="font-bold text-rose-900 block text-[10px] uppercase tracking-wider">Limites</span>
                  <p className="m-0 leading-relaxed"><InlineRichText>{limitations}</InlineRichText></p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'exam_trap': {
      const { title, trigger, misleadingReasoning, expectedWrongConclusion, correctReasoning, decisiveTest, correctiveRule, text } = block;
      return (
        <div className="my-4 rounded-xl border border-rose-300 bg-rose-50/40 p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-rose-200 pb-2">
            <ShieldAlert className="h-4 w-4 text-rose-800 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-rose-950 tracking-tight m-0">
              <InlineRichText>{title || 'Armadilha de Banca'}</InlineRichText>
            </h5>
          </div>
          {trigger && (
            <div className="text-xs text-slate-800 font-semibold bg-white p-2.5 rounded-lg border border-rose-100">
              <strong>Gatilho da Pegadinha:</strong> <InlineRichText>{trigger}</InlineRichText>
            </div>
          )}
          {misleadingReasoning && (
            <div className="text-xs text-rose-950 font-medium bg-rose-100/50 p-2.5 rounded-lg border border-rose-200">
              <strong>Por que induz ao erro:</strong> <InlineRichText>{misleadingReasoning}</InlineRichText>
            </div>
          )}
          {correctReasoning && (
            <div className="text-xs text-emerald-950 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <strong>Raciocínio Correto:</strong> <InlineRichText>{correctReasoning}</InlineRichText>
            </div>
          )}
          {decisiveTest && (
            <div className="text-xs text-slate-700 font-medium pl-1">
              <strong>Teste Decisivo:</strong> <InlineRichText>{decisiveTest}</InlineRichText>
            </div>
          )}
          {correctiveRule && (
            <div className="text-xs text-slate-700 font-medium pl-1">
              <strong>Regra Corretiva:</strong> <InlineRichText>{correctiveRule}</InlineRichText>
            </div>
          )}
          {text && !trigger && !misleadingReasoning && (
            <p className="text-xs text-slate-800 font-medium leading-relaxed m-0">
              <InlineRichText>{text}</InlineRichText>
            </p>
          )}
        </div>
      );
    }

    case 'recall_prompt': {
      const { question, keyPoints = [], targetConcept, text } = block;
      return (
        <div className="my-4 rounded-xl border border-teal-200 bg-white p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              {targetConcept && (
                <span className="inline-block rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  {targetConcept}
                </span>
              )}
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed m-0">
                <InlineRichText>{question || text || ''}</InlineRichText>
              </p>
            </div>
          </div>
          {keyPoints.length > 0 && (
            <div className="rounded-lg bg-teal-50/70 border border-teal-200 p-2.5 text-xs text-slate-800 space-y-1">
              <span className="font-bold text-teal-900 block text-[10px] uppercase tracking-wider">
                Pontos-Chave:
              </span>
              <ul className="list-disc list-inside space-y-0.5 pl-1 font-medium">
                {keyPoints.map((kp, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <InlineRichText>{kp}</InlineRichText>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case 'annotated_sentence': {
      const { sentence, segments = [], analysis, text } = block;
      return (
        <div className="my-4 rounded-xl border border-indigo-200 bg-white p-4 select-text space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
            <Tag className="h-4 w-4 text-indigo-700 select-none" />
            <h5 className="text-xs sm:text-sm font-black text-indigo-950 tracking-tight m-0">
              Sentença Anotada
            </h5>
          </div>
          <div className="rounded-lg bg-indigo-50/50 border border-indigo-100 p-3 text-sm font-serif font-bold text-indigo-950 leading-relaxed">
            <InlineRichText>{sentence}</InlineRichText>
          </div>
          {segments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {segments.map((seg, sIdx) => (
                <div
                  key={sIdx}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs space-y-0.5"
                >
                  <span className="font-bold text-slate-900 block"><InlineRichText>{seg.text}</InlineRichText></span>
                  <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block">
                    {seg.role}
                  </span>
                  {seg.explanation && (
                    <span className="text-[10px] text-slate-500 block">{seg.explanation}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {(analysis || text) && (
            <p className="text-xs text-slate-700 font-medium leading-relaxed m-0 pl-1">
              <InlineRichText>{analysis || text || ''}</InlineRichText>
            </p>
          )}
        </div>
      );
    }

    case 'paragraph': {
      if (!block.text) return null;
      if (looksLikeConnectionMap(block.text)) {
        return <ConnectionMap source={block.text} />;
      }
      const sanitized = sanitizePedagogicalText(block.text);
      if (!sanitized) return null;
      return (
        <p className="my-2.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-800 select-text max-w-4xl">
          <InlineRichText>{block.text}</InlineRichText>
        </p>
      );
    }

    case 'heading': {
      const level = block.level || 2;
      const baseClasses = 'font-black tracking-tight text-teal-950 select-text';
      if (level === 1) return <h1 className={`my-4 text-xl sm:text-2xl ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h1>;
      if (level === 2) return <h2 className={`my-3.5 text-lg sm:text-xl ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h2>;
      if (level === 3) return <h3 className={`my-3 text-base sm:text-lg ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h3>;
      if (level === 4) return <h4 className={`my-2.5 text-sm sm:text-base ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h4>;
      return <h5 className={`my-2 text-xs sm:text-sm ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h5>;
    }

    case 'bullet_list':
    case 'list': {
      const items = block.items || [];
      const blockText = (block as any).text;
      if (items.length === 0) {
        if (blockText) {
          return (
            <p className="my-2.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-800 select-text max-w-4xl">
              <InlineRichText>{blockText}</InlineRichText>
            </p>
          );
        }
        return null;
      }
      const validItems = items
        .map((item) => item.trim())
        .filter((item) => {
          if (!item) return false;
          if (/^Depende de:\s*\.?$/i.test(item)) return false;
          if (/^Possui alerta:\s*(WARN-[A-Z0-9_-]+)?\.?$/i.test(item)) return false;
          if (/^Aplicado em:\s*(PROC-[A-Z0-9_-]+(,\s*)?|EX-[A-Z0-9_-]+(,\s*)?)*\.?$/i.test(item)) return false;
          if (/^Relacionado a:\s*(KB-[A-Z0-9_-]+(,\s*)?)*\.?$/i.test(item)) return false;
          return sanitizePedagogicalText(item).length > 0;
        });

      if (validItems.length === 0) return null;

      if (block.ordered && validItems.length === 1 && (validItems[0].endsWith(':') || validItems[0].length < 40)) {
        const titleText = validItems[0].replace(/:$/, '').trim();
        return (
          <div className="mt-4 mb-2 flex items-center gap-2 select-text">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-800 text-[11px] font-black text-white shadow-2xs select-none">
              ▸
            </span>
            <span className="text-xs sm:text-sm font-black text-teal-950 tracking-tight uppercase">
              <InlineRichText>{titleText}</InlineRichText>
            </span>
          </div>
        );
      }

      if (block.ordered) {
        return (
          <ol className="my-3 space-y-1.5 pl-5 text-xs sm:text-sm text-slate-800 list-decimal marker:font-bold marker:text-teal-700 select-text max-w-4xl">
            {validItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                <InlineRichText>{item}</InlineRichText>
              </li>
            ))}
          </ol>
        );
      }

      return (
        <ul className="my-3 space-y-1.5 pl-5 text-xs sm:text-sm text-slate-800 list-disc marker:text-teal-600 select-text max-w-4xl">
          {validItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              <InlineRichText>{item}</InlineRichText>
            </li>
          ))}
        </ul>
      );
    }

    case 'table_ref':
      if (block.table) {
        return <ResponsiveStudyTable table={block.table} />;
      }
      return null;

    case 'callout':
      return (
        <StudyCallout
          tone={mapCalloutKindToTone(block.kind)}
          text={block.text}
        />
      );

    case 'diagram':
      if (block.nodes && block.edges && block.nodes.length > 0) {
        return <ConceptTree nodes={block.nodes} edges={block.edges} />;
      }
      if (block.text) {
        return <ConnectionMap source={block.text} />;
      }
      return null;

    case 'code':
      return (
        <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed font-mono text-slate-900 select-text">
          <pre><code>{block.text}</code></pre>
        </div>
      );

    default: {
      const _exhaustiveCheck: never = block;
      return null;
    }
  }
};
