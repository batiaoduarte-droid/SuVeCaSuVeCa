import React, { useState } from 'react';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import type { CanonicalTableView } from '../../types/pedagogicalView';
import { InlineRichText, sanitizePedagogicalText } from '../pedagogical/blocks/InlineRichText';

interface ResponsiveStudyTableProps {
  table: CanonicalTableView;
  className?: string;
  defaultMode?: 'auto' | 'table' | 'cards';
}

const isTechnicalOrEmptyHeader = (header: string): boolean => {
  if (!header || typeof header !== 'string') return true;
  const h = header.toLowerCase().trim();
  if (!h) return true;
  return (
    h.includes('id detalhado') ||
    h.includes('id de referência') ||
    h.includes('referência técnica') ||
    h === 'referência' ||
    h === 'referencia' ||
    h === 'id' ||
    h === 'ref' ||
    h.includes('identificador') ||
    h.includes('ref id') ||
    h.includes('kb id') ||
    h.includes('rule id') ||
    h.includes('guid') ||
    h === 'código' ||
    h === 'codigo'
  );
};

export const ResponsiveStudyTable: React.FC<ResponsiveStudyTableProps> = ({
  table,
  className = '',
  defaultMode = 'auto',
}) => {
  const [mobileView, setMobileView] = useState<'table' | 'cards'>(
    defaultMode === 'table' ? 'table' : 'cards'
  );

  if (!table || !table.headers || table.headers.length === 0) {
    return null;
  }

  // Identifica colunas válidas (oculta colunas puramente técnicas e vazias após sanitização)
  const validColumnIndices = table.headers
    .map((header, idx) => ({ header, idx }))
    .filter(({ header, idx }) => {
      const isTech = isTechnicalOrEmptyHeader(header);
      const hasContent = (table.rows || []).some((r) => {
        const val = r[idx];
        return Boolean(sanitizePedagogicalText(val || '').trim());
      });
      if (isTech) return hasContent;
      return Boolean((header || '').trim()) || hasContent;
    })
    .map(({ idx }) => idx);

  if (validColumnIndices.length === 0) return null;

  const visibleHeaders = validColumnIndices.map((idx) => table.headers[idx]);
  const visibleRows = table.rows.map((row) =>
    validColumnIndices.map((idx) => row[idx] || '')
  );

  return (
    <div className={`my-4 space-y-2 select-text ${className}`}>
      {table.caption && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-teal-900">
            <InlineRichText>{table.caption}</InlineRichText>
          </span>

          {/* Toggle para mobile */}
          <div className="sm:hidden flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 select-none">
            <button
              type="button"
              onClick={() => setMobileView('cards')}
              aria-label="Visualizar dados em cards"
              aria-pressed={mobileView === 'cards'}
              className={`min-h-11 min-w-11 p-2 rounded-lg text-xs transition ${
                mobileView === 'cards'
                  ? 'bg-white text-teal-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualizar em cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileView('table')}
              aria-label="Visualizar dados em tabela"
              aria-pressed={mobileView === 'table'}
              className={`min-h-11 min-w-11 p-2 rounded-lg text-xs transition ${
                mobileView === 'table'
                  ? 'bg-white text-teal-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualizar em tabela"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Tablet Table View */}
      <div
        className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs ${
          mobileView === 'cards' && defaultMode === 'auto' ? 'hidden sm:block' : 'block'
        }`}
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-teal-200 bg-teal-50/80 text-teal-950">
              {visibleHeaders.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 font-black text-teal-950 text-xs sm:text-sm tracking-tight whitespace-nowrap"
                >
                  <InlineRichText>{header.trim() || `Coluna ${idx + 1}`}</InlineRichText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={`transition-colors hover:bg-teal-50/30 ${
                  rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                }`}
              >
                {row.map((cell, cIdx) => {
                  const cleanCell = sanitizePedagogicalText(cell);
                  return (
                    <td
                      key={cIdx}
                      className="px-4 py-3 font-medium text-slate-800 leading-relaxed"
                    >
                      {cleanCell ? <InlineRichText>{cleanCell}</InlineRichText> : <span className="text-slate-300 font-mono text-xs select-none">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View */}
      <div
        className={`sm:hidden space-y-3 ${
          mobileView === 'table' && defaultMode === 'auto' ? 'hidden' : 'block'
        }`}
      >
        {visibleRows.map((row, rIdx) => (
          <div
            key={rIdx}
            className="rounded-xl border border-teal-200 bg-white p-3.5 shadow-2xs space-y-2"
          >
            {row.map((cell, cIdx) => {
              const header = visibleHeaders[cIdx] || `Campo ${cIdx + 1}`;
              const isFirst = cIdx === 0;
              return (
                <div
                  key={cIdx}
                  className={`${
                    isFirst
                      ? 'border-b border-teal-100 pb-2 mb-1.5'
                      : 'flex flex-col gap-0.5'
                  }`}
                >
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      isFirst ? 'text-teal-900' : 'text-slate-500'
                    }`}
                  >
                    <InlineRichText>{header}</InlineRichText>
                  </span>
                  <div
                    className={`text-xs leading-relaxed ${
                      isFirst
                        ? 'font-black text-slate-900 text-sm'
                        : 'font-medium text-slate-800'
                    }`}
                  >
                    <InlineRichText>{cell}</InlineRichText>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
