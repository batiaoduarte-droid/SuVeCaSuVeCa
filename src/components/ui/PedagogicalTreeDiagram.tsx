import React, { useMemo, useState } from 'react';
import { Network, Copy, Check, Maximize2, LayoutGrid, ListTree, Code2, Table, GitBranch, ArrowDown, CheckCircle2, XCircle } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface TreeNodeItem {
  label: string;
  badge?: string;
  details?: string;
}

interface TreeCategory {
  title: string;
  items: TreeNodeItem[];
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

interface PedagogicalTreeDiagramProps {
  source: string;
}

type DiagramKind = 'table' | 'decision' | 'sequence' | 'hierarchy' | 'cards';
type ViewMode = 'recommended' | 'cards' | 'tree' | 'flow' | 'table' | 'raw';

const classifyDiagram = (raw: string, table: ParsedTable | null): DiagramKind => {
  if (table) return 'table';
  const normalized = raw.toLocaleUpperCase('pt-BR');
  const hasBinaryBranches = /(?:^|\s)(?:SIM|NÃO)\s*(?::|→|->|>)/m.test(normalized);
  const hasDecisionLanguage = /\b(?:TESTE|DECISÃO|DECISÓRIO|FLUXOGRAMA|ADMISSIBILIDADE|ELIMINAR)\b/.test(normalized);
  if (hasBinaryBranches || hasDecisionLanguage) return 'decision';
  if (/\b(?:ALGORITMO|PROTOCOLO|PASSO\s*\d+|INÍCIO)\b/.test(normalized)) return 'sequence';
  if ((raw.match(/[├└┌┬│]/g)?.length || 0) >= 3) return 'hierarchy';
  return 'cards';
};

const cleanDiagramText = (str: string): string => {
  return str
    .replace(/[│┌┐└┘─▼▲►◄═├└┬┴┼]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseMarkdownTable = (raw: string): ParsedTable | null => {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 2) return null;

  // Header line
  const headerCells = lines[0]
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());

  // Check if second line is separator
  const isSeparator = /^\|(?:\s*[-:]+\s*\|)+$/.test(lines[1]);
  const dataStart = isSeparator ? 2 : 1;

  const rows: string[][] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.some(Boolean)) {
      rows.push(cells);
    }
  }

  if (headerCells.length > 0 && rows.length > 0) {
    return { headers: headerCells, rows };
  }
  return null;
};

export const parseTreeDiagram = (raw: string): { title: string; categories: TreeCategory[]; table: ParsedTable | null; kind: DiagramKind } => {
  // Check if it is a markdown table first
  const parsedTable = parseMarkdownTable(raw);
  if (parsedTable) {
    return {
      title: 'Quadro Estruturado da Unidade',
      categories: [],
      table: parsedTable,
      kind: 'table',
    };
  }

  // Se contiver delimitadores de ramificação ou quebras
  const rawNormalized = raw.replace(/([┌└├]\s*──?|[│|]\s*|\s*──[┤├]\s*)/g, '\n$1');
  const rawLines = rawNormalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let title = 'Esquema Estruturado da Unidade';
  const categories: TreeCategory[] = [];
  let currentCat: TreeCategory | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cleaned = cleanDiagramText(line);
    if (!cleaned) continue;

    // Detecta se a primeira linha é um título limpo
    if (i === 0 && cleaned.length > 3 && cleaned.length <= 60 && !line.includes(':')) {
      title = cleaned;
      continue;
    }

    // Detecta categorias (ex: "CONSONANTAIS:", "1. Estrutura", "CASO 1: REDUÇÃO")
    const colonMatch = cleaned.match(/^([A-ZÀ-Ú0-9\s/–-]+):\s*(.*)$/);
    const isHeadingLike = cleaned === cleaned.toUpperCase() && cleaned.length < 50 && !line.includes('(');

    if (colonMatch) {
      const catTitle = colonMatch[1].trim();
      const rest = colonMatch[2].trim();

      if (currentCat && currentCat.items.length > 0) {
        categories.push(currentCat);
      }

      currentCat = {
        title: catTitle,
        items: []
      };

      if (rest) {
        const subItems = rest.split(/[,;/]\s+/).filter(Boolean);
        if (subItems.length > 0) {
          for (const itemStr of subItems) {
            const badgeMatch = itemStr.match(/\(([^)]+)\)$|\[([^\]]+)\]$/);
            let badge: string | undefined;
            let label = itemStr;
            if (badgeMatch) {
              badge = badgeMatch[1] || badgeMatch[2];
              label = itemStr.replace(/\s*(?:\([^)]+\)|\[[^\]]+\])$/, '').trim();
            }
            if (label) {
              currentCat.items.push({ label, badge });
            }
          }
        } else {
          currentCat.items.push({ label: rest });
        }
      }
      continue;
    }

    if (isHeadingLike) {
      if (currentCat && currentCat.items.length > 0) {
        categories.push(currentCat);
      }
      currentCat = {
        title: cleaned,
        items: []
      };
      continue;
    }

    // Item normal de ramificação
    if (!currentCat) {
      currentCat = { title: 'Tópicos Principais', items: [] };
    }

    const badgeMatch = cleaned.match(/\(([^)]+)\)$|\[([^\]]+)\]$/);
    let badge: string | undefined;
    let label = cleaned;

    if (badgeMatch) {
      badge = badgeMatch[1] || badgeMatch[2];
      label = cleaned.replace(/\s*(?:\([^)]+\)|\[[^\]]+\])$/, '').trim();
    }

    if (label) {
      currentCat.items.push({ label, badge });
    }
  }

  if (currentCat && currentCat.items.length > 0) {
    categories.push(currentCat);
  }

  if (categories.length === 0) {
    const cleanAll = cleanDiagramText(raw);
    const chunks = cleanAll.split(/(?<=[.!?])\s+|;\s*/).filter(Boolean);
    categories.push({
      title: 'Elementos do esquema',
      items: chunks.length > 0 ? chunks.map((c) => ({ label: c })) : [{ label: cleanAll }]
    });
  }

  if (title.length > 60) {
    title = 'Esquema Conceitual Estruturado';
  }

  return { title, categories, table: null, kind: classifyDiagram(raw, null) };
};

export const PedagogicalTreeDiagram: React.FC<PedagogicalTreeDiagramProps> = ({ source }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('recommended');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { title, categories, table, kind } = useMemo(() => parseTreeDiagram(source), [source]);

  const recommendedMode: Exclude<ViewMode, 'recommended'> = kind === 'table'
    ? 'table'
    : kind === 'decision' || kind === 'sequence'
      ? 'flow'
      : kind === 'hierarchy'
        ? 'tree'
        : 'cards';
  const activeMode = viewMode === 'recommended' ? recommendedMode : viewMode;
  const subtitle = kind === 'decision'
    ? 'Fluxo decisório com condições, caminhos e resultados preservados'
    : kind === 'sequence'
      ? 'Procedimento operacional organizado na ordem de execução'
      : kind === 'hierarchy'
        ? 'Hierarquia conceitual e relações entre os elementos'
        : kind === 'table'
          ? 'Quadro comparativo estruturado'
          : 'Síntese de elementos independentes';

  const handleCopy = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (activeMode === 'raw') {
      return (
        <pre className="m-0 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap">
          {source}
        </pre>
      );
    }

    if (activeMode === 'table') {
      if (table) {
        return (
          <div className="overflow-x-auto rounded-xl border border-teal-100 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-teal-200 bg-teal-50/80 text-teal-950 font-black">
                  {table.headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 font-black text-teal-950 text-xs sm:text-sm tracking-tight whitespace-nowrap">
                      <InlineRichText>{h}</InlineRichText>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`transition hover:bg-teal-50/30 ${
                      rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 font-medium text-slate-800 leading-relaxed">
                        <InlineRichText>{cell}</InlineRichText>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    if (activeMode === 'flow') {
      return (
        <ol className="m-0 list-none space-y-3 p-0" aria-label={kind === 'decision' ? 'Fluxo de decisão' : 'Sequência do procedimento'}>
          {categories.map((category, categoryIndex) => (
            <li key={`${category.title}-${categoryIndex}`} className="relative rounded-2xl border border-teal-200 bg-teal-50/50 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-xs font-black text-white">{categoryIndex + 1}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="m-0 text-sm font-black text-teal-950"><InlineRichText>{category.title}</InlineRichText></h4>
                  <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
                    {category.items.map((item, itemIndex) => {
                      const isYes = /^SIM\b/i.test(item.label);
                      const isNo = /^NÃO\b/i.test(item.label);
                      return (
                        <li key={`${item.label}-${itemIndex}`} className={`flex min-h-11 items-start gap-2 rounded-xl border p-3 text-xs font-semibold leading-relaxed ${
                          isYes ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : isNo ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-slate-200 bg-white text-slate-800'
                        }`}>
                          {isYes ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : isNo ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" /> : <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />}
                          <span><InlineRichText>{item.label}</InlineRichText></span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              {categoryIndex < categories.length - 1 && <ArrowDown className="absolute -bottom-4 left-5 z-10 h-5 w-5 rounded-full bg-white text-teal-700" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      );
    }

    if (activeMode === 'tree') {
      return (
        <div className="space-y-4">
          {categories.map((cat, i) => (
            <div key={i} className="border-l-3 border-teal-600 pl-4">
              <h4 className="m-0 text-sm font-black text-slate-900">{cat.title}</h4>
              <ul className="mt-2 space-y-2 pl-2 text-xs text-slate-800">
                {cat.items.map((item, idx) => (
                  <li key={idx} className="flex flex-wrap items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600 shrink-0" />
                    <span className="font-bold text-slate-900">
                      <InlineRichText>{item.label}</InlineRichText>
                    </span>
                    {item.badge && (
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-black text-teal-900 border border-teal-200">
                        <InlineRichText>{item.badge}</InlineRichText>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {categories.map((cat, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-teal-200/90 bg-white shadow-xs transition hover:border-teal-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-teal-50/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-800 text-xs font-black text-white shadow-2xs">
                  {i + 1}
                </span>
                <h4 className="m-0 text-xs sm:text-sm font-black text-slate-900">{cat.title}</h4>
              </div>
            </div>

            <div className={`grid gap-3 p-3 sm:p-4 sm:grid-cols-2 ${kind === 'cards' ? 'xl:grid-cols-3' : ''}`}>
              {cat.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 shadow-2xs hover:bg-white hover:border-teal-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      <InlineRichText>{item.label}</InlineRichText>
                    </div>
                    {item.badge && (
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-900 border border-teal-300 shrink-0">
                        <InlineRichText>{item.badge}</InlineRichText>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="my-6 overflow-hidden rounded-3xl border border-teal-200/90 bg-white shadow-sm transition">
        {/* Cabeçalho com contraste blindado contra CSS cascade */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-800 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-950 px-3 py-4 text-white sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800/90 text-amber-300 ring-1 ring-white/20 shadow-2xs">
              <Network className="h-5 w-5" />
            </span>
            <div>
              <h3 className="m-0 text-base font-black tracking-tight !text-white">{title}</h3>
              <p className="m-0 text-xs !text-teal-200 font-medium">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-teal-950/80 p-0.5 border border-teal-800/60" role="tablist" aria-label="Visualização do esquema">
              {table ? (
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  role="tab"
                  aria-selected={activeMode === 'table'}
                  className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    activeMode === 'table' ? 'bg-teal-700 text-white shadow-xs' : 'text-teal-200 hover:text-white'
                  }`}
                  title="Visualização em Tabela"
                >
                  <Table className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tabela</span>
                </button>
              ) : (
                <>
                  {(kind === 'decision' || kind === 'sequence') && (
                    <button
                      type="button"
                      onClick={() => setViewMode('flow')}
                      role="tab"
                      aria-selected={activeMode === 'flow'}
                      className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${activeMode === 'flow' ? 'bg-teal-700 text-white shadow-xs' : 'text-teal-200 hover:text-white'}`}
                      title="Visualização recomendada em fluxo"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Fluxo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    role="tab"
                    aria-selected={activeMode === 'cards'}
                    className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      activeMode === 'cards' ? 'bg-teal-700 text-white shadow-xs' : 'text-teal-200 hover:text-white'
                    }`}
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Resumo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('tree')}
                    role="tab"
                    aria-selected={activeMode === 'tree'}
                    className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      activeMode === 'tree' ? 'bg-teal-700 text-white shadow-xs' : 'text-teal-200 hover:text-white'
                    }`}
                    title="Visualização em Árvore"
                  >
                    <ListTree className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Estrutura</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                role="tab"
                aria-selected={activeMode === 'raw'}
                className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  activeMode === 'raw' ? 'bg-teal-700 text-white shadow-xs' : 'text-teal-200 hover:text-white'
                }`}
                title="Visualização em Texto"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Texto-fonte</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-800/60 px-3 py-1.5 text-xs font-bold text-teal-100 transition hover:bg-teal-700 hover:text-white cursor-pointer shadow-2xs"
              title="Copiar esquema"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border border-teal-500/30 bg-teal-800/60 p-2 text-xs font-bold text-teal-100 transition hover:bg-teal-700 hover:text-white cursor-pointer shadow-2xs"
              title="Expandir em tela cheia"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-6">{renderContent()}</div>
      </div>

      {isFullscreen && (
        <ModalShell
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          title={title}
          maxWidth="max-w-7xl"
        >
          <div className="p-3 sm:p-6">{renderContent()}</div>
        </ModalShell>
      )}
    </>
  );
};
