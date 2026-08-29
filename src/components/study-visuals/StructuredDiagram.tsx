import React, { useState } from 'react';
import { ArrowDown, Braces, Copy, GitBranch, ListTree } from 'lucide-react';
import type { DiagramStructure } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface StructuredDiagramProps {
  title?: string;
  source?: string;
  structure: DiagramStructure;
}

const kindLabel: Record<DiagramStructure['kind'], string> = {
  sequence: 'Sequência de análise',
  branches: 'Relações e alternativas',
  relations: 'Relações do esquema',
  source_segments: 'Elementos do esquema',
};

export const StructuredDiagram: React.FC<StructuredDiagramProps> = ({
  title,
  source,
  structure,
}) => {
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [copied, setCopied] = useState(false);
  const isSequence = structure.kind === 'sequence';

  const copySource = async () => {
    if (!source || !navigator.clipboard) return;
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="my-5 overflow-hidden rounded-2xl border border-teal-300 bg-white shadow-sm">
      <header className="flex flex-col gap-4 bg-gradient-to-r from-teal-950 to-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-700 bg-teal-800/70 text-teal-100">
            {isSequence ? <ListTree className="h-4 w-4" aria-hidden="true" /> : <GitBranch className="h-4 w-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <h5 className="text-sm font-black leading-snug text-white">
              <InlineRichText>{title || structure.rootLabel || 'Esquema estruturado'}</InlineRichText>
            </h5>
            <p className="mt-1 text-[11px] font-semibold text-teal-200">{kindLabel[structure.kind]}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Visualização do esquema">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'visual'}
            onClick={() => setMode('visual')}
            className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold ${mode === 'visual' ? 'border-teal-500 bg-teal-700 text-white' : 'border-teal-800 bg-teal-950/40 text-teal-100 hover:bg-teal-900'}`}
          >
            <GitBranch className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
            Visual
          </button>
          {source && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'source'}
              onClick={() => setMode('source')}
              className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold ${mode === 'source' ? 'border-teal-500 bg-teal-700 text-white' : 'border-teal-800 bg-teal-950/40 text-teal-100 hover:bg-teal-900'}`}
            >
              <Braces className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
              Texto-fonte
            </button>
          )}
          </div>
          {source && (
            <button
              type="button"
              onClick={copySource}
              className="min-h-10 rounded-lg border border-teal-800 bg-teal-950/40 px-3 py-2 text-xs font-bold text-teal-100 hover:bg-teal-900"
              aria-label={copied ? 'Texto copiado' : 'Copiar texto-fonte'}
            >
              <Copy className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>
      </header>

      {mode === 'source' && source ? (
        <div role="tabpanel" className="bg-slate-950 p-4 sm:p-5">
          <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-100"><code>{source}</code></pre>
        </div>
      ) : (
        <div role="tabpanel" className="p-4 sm:p-5">
          {structure.rootLabel && structure.rootLabel !== title && (
            <div className="mx-auto mb-4 w-fit max-w-full rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-center text-sm font-black text-teal-950">
              <InlineRichText>{structure.rootLabel}</InlineRichText>
            </div>
          )}
          <div
            role="list"
            className={isSequence ? 'mx-auto max-w-4xl space-y-0' : 'grid gap-3 md:grid-cols-2'}
            aria-label={kindLabel[structure.kind]}
          >
            {structure.items.map((item, index) => (
              <React.Fragment key={item.id}>
                <div role="listitem" className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-teal-800 px-1.5 text-xs font-black text-white">
                      {isSequence ? index + 1 : '•'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-black leading-relaxed text-slate-900">
                        <InlineRichText>{item.label}</InlineRichText>
                      </p>
                      {item.details && item.details.length > 0 && (
                        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700">
                          {item.details.map((detail, detailIndex) => (
                            <li key={`${item.id}-detail-${detailIndex}`} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden="true" />
                              <span><InlineRichText>{detail}</InlineRichText></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                {isSequence && index < structure.items.length - 1 && (
                  <div aria-hidden="true" className="flex h-8 items-center justify-center text-teal-700">
                    <ArrowDown className="h-5 w-5" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
