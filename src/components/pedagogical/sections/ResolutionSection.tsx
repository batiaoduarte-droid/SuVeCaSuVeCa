import React, { useState } from 'react';
import {
  Braces,
  Check,
  CheckCircle2,
  Copy,
  GitBranch,
  ListTree,
  PenTool,
  Zap,
} from 'lucide-react';
import type { DiagramBlock, ProcedureView, SemanticBlock } from '../../../types/pedagogicalView';
import { ProcedureStepper } from '../../study-visuals/ProcedureStepper';
import { StructuredDiagram } from '../../study-visuals/StructuredDiagram';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';
import { semanticBlocksToPlainText } from '../../../lib/semanticBlockText';

interface ResolutionSectionProps {
  procedures?: ProcedureView[];
}

export const normalizeProcedureStepAction = (action: string): string =>
  action
    .replace(/^\s*(?:(?:passo\s*)?\d+\s*[.):—-]|[•·▪◦])\s*/i, '')
    .replace(/\s*(?:-{1,2}>|=>|→)\s*/g, ' → ')
    .trim();

export const deriveSubDiagramHeader = (
  db: DiagramBlock,
  index: number,
  total: number,
  procedureTitle?: string,
): { badge: string; title: string } => {
  const rootNode =
    db.structure?.nodes?.find((n) => n.id === db.structure?.rootId) ||
    db.structure?.nodes?.[0];
  const rootLabel = rootNode?.label || '';
  const blockTitle = db.title || '';

  // Diagrama 0 é a Visão Geral / Sequência Macro
  if (index === 0) {
    const isDistinctTitle = Boolean(
      blockTitle &&
        blockTitle.trim() &&
        blockTitle.trim().toLowerCase() !== procedureTitle?.trim().toLowerCase(),
    );
    return {
      badge: 'Visão Geral',
      title: isDistinctTitle
        ? blockTitle
        : rootLabel.toLowerCase().includes('passo 1')
          ? 'Sequência de Execução'
          : rootLabel || 'Sequência de Execução',
    };
  }

  const stepMatch =
    rootLabel.match(/^(Passo\s*\d+|Mandamento\s*\d+|Fase\s*\d+|Etapa\s*\d+)\s*[:—–-]\s*(.*)$/i) ||
    blockTitle.match(/^(Passo\s*\d+|Mandamento\s*\d+|Fase\s*\d+|Etapa\s*\d+)\s*[:—–-]\s*(.*)$/i);

  if (stepMatch) {
    const cleanTitle = stepMatch[2].replace(/\s*\([^)]*Protocolo[^)]*\)\s*$/i, '').trim();
    return {
      badge: stepMatch[1].trim(),
      title: cleanTitle || rootLabel,
    };
  }

  if (rootLabel && rootLabel !== procedureTitle) {
    return {
      badge: `Etapa ${index + 1}`,
      title: rootLabel,
    };
  }

  return {
    badge: `Etapa ${index + 1}`,
    title: blockTitle || `Parte ${index + 1}`,
  };
};

export const ComposedProcedureBlocks: React.FC<{
  procedureTitle: string;
  blocks: SemanticBlock[];
  showTitle?: boolean;
}> = ({ procedureTitle, blocks, showTitle = true }) => {
  const [viewMode, setViewMode] = useState<'visual' | 'structured' | 'source'>('visual');
  const [copied, setCopied] = useState(false);

  const diagramBlocks = blocks.filter(
    (b): b is DiagramBlock => b.type === 'diagram' && Boolean(b.structure?.nodes?.length),
  );
  const nonDiagramBlocks = blocks.filter((b) => b.type !== 'diagram');

  const copyComposedText = async () => {
    let combinedText = '';
    if (viewMode === 'source') {
      combinedText = diagramBlocks
        .map((db, idx) => {
          const header = deriveSubDiagramHeader(db, idx, diagramBlocks.length, procedureTitle);
          return `### [${header.badge}] ${header.title}\n\n${db.text || ''}`;
        })
        .join('\n\n---\n\n');
    } else {
      combinedText = diagramBlocks
        .map((db, idx) => {
          const header = deriveSubDiagramHeader(db, idx, diagramBlocks.length, procedureTitle);
          return `### [${header.badge}] ${header.title}\n\n${db.structure?.structuredText || db.text || ''}`;
        })
        .join('\n\n---\n\n');
    }
    if (!combinedText || !navigator.clipboard) return;
    await navigator.clipboard.writeText(combinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-sky-200 bg-white p-4 sm:p-6 shadow-xs">
      {/* Header com título do procedimento e Toolbar Compartilhada */}
      <div className="flex flex-col gap-3 border-b border-sky-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {showTitle && (
            <h4 className="text-sm sm:text-base font-black text-sky-950">
              <InlineRichText>{procedureTitle}</InlineRichText>
            </h4>
          )}
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            Protocolo composto em {diagramBlocks.length} etapas estruturadas
          </p>
        </div>

        {/* Toolbar Compartilhada de Modo */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
            role="tablist"
            aria-label="Modo de exibição do protocolo"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'visual'}
              onClick={() => setViewMode('visual')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                viewMode === 'visual'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <GitBranch className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" /> Visual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'structured'}
              onClick={() => setViewMode('structured')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                viewMode === 'structured'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <ListTree className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" /> Estrutura textual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'source'}
              onClick={() => setViewMode('source')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                viewMode === 'source'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Braces className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" /> Fonte original
            </button>
          </div>

          <button
            type="button"
            onClick={copyComposedText}
            aria-label={copied ? 'Texto do protocolo copiado' : 'Copiar texto completo do protocolo'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Blocos introdutórios (ex.: heading, paragraph de pré-requisitos) */}
      {nonDiagramBlocks.length > 0 && viewMode === 'visual' && (
        <div className="space-y-2 border-b border-sky-50 pb-3">
          {nonDiagramBlocks.map((block, idx) => (
            <ContentBlockRenderer key={idx} block={block} allowLegacyDiagramInference={false} />
          ))}
        </div>
      )}

      {/* Visualização Composta dos Diagramas */}
      {viewMode === 'visual' ? (
        <div className="space-y-6 pt-1">
          {diagramBlocks.map((db, idx) => {
            const header = deriveSubDiagramHeader(db, idx, diagramBlocks.length, procedureTitle);
            const isOverview = idx === 0;

            return (
              <div
                key={`diagram-${idx}`}
                className={isOverview ? 'space-y-2.5' : 'space-y-2.5 pt-4 border-t border-slate-200'}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`rounded-lg px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                      isOverview
                        ? 'bg-teal-800 text-white shadow-2xs'
                        : 'bg-sky-100 text-sky-950 border border-sky-300'
                    }`}
                  >
                    {header.badge}
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    <InlineRichText>{header.title}</InlineRichText>
                  </span>
                </div>

                <StructuredDiagram
                  title={header.title}
                  source={db.text}
                  structure={db.structure!}
                  variant="embedded"
                  hideHeader={true}
                />
              </div>
            );
          })}
        </div>
      ) : viewMode === 'structured' ? (
        <div className="space-y-4 pt-1">
          {diagramBlocks.map((db, idx) => {
            const header = deriveSubDiagramHeader(db, idx, diagramBlocks.length, procedureTitle);
            return (
              <div key={`struct-${idx}`} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-teal-800 text-white px-2 py-0.5 text-[11px] font-black uppercase">
                    {header.badge}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{header.title}</span>
                </div>
                <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-800">
                  <code>{db.structure?.structuredText || db.text}</code>
                </pre>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {diagramBlocks.map((db, idx) => {
            const header = deriveSubDiagramHeader(db, idx, diagramBlocks.length, procedureTitle);
            return (
              <div key={`source-${idx}`} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-teal-600 text-white px-2 py-0.5 text-[11px] font-black uppercase">
                    {header.badge}
                  </span>
                  <span className="text-xs font-bold text-slate-200">{header.title}</span>
                </div>
                <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-100">
                  <code>{db.text}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ResolutionSection: React.FC<ResolutionSectionProps> = ({ procedures = [] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!procedures || procedures.length === 0) return null;

  const handleCopy = (proc: ProcedureView, idx: number) => {
    const strategy =
      proc.presentation?.renderStrategy ||
      (proc.presentation?.hideGenericScaffold ? 'source_only' : 'structured_first');
    if (strategy === 'source_only') {
      navigator.clipboard.writeText(
        [proc.title, semanticBlocksToPlainText(proc.blocks)].filter(Boolean).join('\n\n'),
      );
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
      return;
    }
    const steps = (proc.steps || []).map((step, stepIndex) => {
      if (typeof step === 'string') return `${stepIndex + 1}. ${normalizeProcedureStepAction(step)}`;
      return `${step.order || stepIndex + 1}. ${normalizeProcedureStepAction(step.action)}${step.explanation ? ` — ${step.explanation}` : ''}${step.test ? `\nTeste: ${step.test}` : ''}`;
    });
    const inputs = (proc.inputs || [])
      .map((input) =>
        typeof input === 'string'
          ? input
          : `${input.name}${input.description ? `: ${input.description}` : ''}`,
      )
      .join('\n');
    const outputs = (proc.outputs || [])
      .map((output) =>
        typeof output === 'string'
          ? output
          : `${output.name}${output.description ? `: ${output.description}` : ''}`,
      )
      .join('\n');
    const text = [
      proc.title || `Roteiro ${idx + 1}`,
      proc.objective || proc.goal,
      inputs && `Entradas:\n${inputs}`,
      ...(proc.formulas?.length ? [`Fórmulas:\n${proc.formulas.join('\n')}`] : []),
      steps.join('\n'),
      proc.stoppingCondition && `Quando concluir: ${proc.stoppingCondition}`,
      outputs && `Resultado:\n${outputs}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl border border-sky-200 bg-white p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-900 text-sky-200 shadow-2xs select-none">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Roteiros de Resolução
                </h3>
                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-sky-100 text-sky-900 px-2 py-0.5 text-xs font-black leading-5 select-none">
                  {procedures.length} {procedures.length === 1 ? 'roteiro' : 'roteiros'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Algoritmos práticos e sequências passo a passo para resolver questões com precisão
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Steppers de Procedimentos */}
        <div className="space-y-5">
          {procedures.map((proc, pIdx) => {
            const normalizedSteps = proc.steps?.map((s, sIdx) => {
              if (typeof s === 'string') {
                return { order: sIdx + 1, action: normalizeProcedureStepAction(s) };
              }
              return { ...s, action: normalizeProcedureStepAction(s.action) };
            });
            const strategy =
              proc.presentation?.renderStrategy ||
              (proc.presentation?.hideGenericScaffold ? 'source_only' : 'structured_first');
            const showStructured = strategy !== 'source_only';
            const groupSourceDetails = showStructured && Boolean(proc.blocks?.length);
            const diagramBlocks = (proc.blocks || []).filter(
              (b): b is DiagramBlock => b.type === 'diagram' && Boolean(b.structure?.nodes?.length),
            );
            const isComposed = diagramBlocks.length > 1;

            return (
              <div key={proc.procedureId || pIdx} className="space-y-3">
                {showStructured && (
                  <ProcedureStepper
                    procedure={proc}
                    title={proc.title}
                    objective={proc.objective || proc.goal}
                    steps={normalizedSteps}
                    inputs={proc.inputs}
                    outputs={proc.outputs}
                    formulas={proc.formulas}
                  />
                )}

                {/* Blocos secundários ou compostos */}
                {proc.blocks && proc.blocks.length > 0 && (
                  isComposed ? (
                    <ComposedProcedureBlocks
                      procedureTitle={proc.title || `Roteiro ${pIdx + 1}`}
                      blocks={proc.blocks}
                      showTitle={!showStructured}
                    />
                  ) : groupSourceDetails ? (
                    <details className="group overflow-hidden rounded-xl border border-sky-200 bg-white">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-sky-950 hover:bg-sky-50">
                        <span>Detalhamento e exemplos do protocolo</span>
                        <span className="text-sky-700 transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                      </summary>
                      <div className="space-y-2 border-t border-sky-100 p-4">
                        {proc.blocks.map((block, bIdx) => (
                          <ContentBlockRenderer key={bIdx} block={block} allowLegacyDiagramInference={false} />
                        ))}
                      </div>
                    </details>
                  ) : (
                    <div className="rounded-xl border border-sky-200 bg-white p-4 space-y-2">
                      {!showStructured && (
                        <h4 className="border-b border-sky-100 pb-3 text-sm sm:text-base font-black text-sky-950">
                          <InlineRichText>{proc.title}</InlineRichText>
                        </h4>
                      )}
                      {proc.blocks.map((block, bIdx) => (
                        <ContentBlockRenderer key={bIdx} block={block} allowLegacyDiagramInference={false} />
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
