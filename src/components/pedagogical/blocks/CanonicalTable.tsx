import React from 'react';
import type { CanonicalTableView } from '../../../types/pedagogicalView';
import { InlineRichText } from './InlineRichText';

interface CanonicalTableProps {
  table: CanonicalTableView;
}

const isTechnicalColumn = (header: string): boolean => {
  if (!header || typeof header !== 'string') return false;
  const h = header.trim().toLowerCase();
  return (
    h.includes('id detalhado') ||
    h.includes('id de referência') ||
    h.includes('identificador') ||
    h.includes('referência técnica') ||
    h.includes('ref id') ||
    h.includes('kb id') ||
    h.includes('rule id') ||
    h.includes('guid') ||
    h === 'id' ||
    h === 'código'
  );
};

export const CanonicalTable: React.FC<CanonicalTableProps> = ({ table }) => {
  if (!table || !table.headers || table.headers.length === 0) return null;

  // Filtra colunas técnicas (como "ID Detalhado de Referência", "Identificador", etc.)
  const visibleIndices = table.headers
    .map((header, idx) => ({ header, idx }))
    .filter(({ header }) => !isTechnicalColumn(header))
    .map(({ idx }) => idx);

  const cleanHeaders = visibleIndices.map((i) => table.headers[i]);
  const cleanRows = (table.rows || []).map((row) =>
    visibleIndices.map((i) => (i < row.length ? row[i] : ''))
  );

  if (cleanHeaders.length === 0) return null;

  return (
    <figure className="my-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {table.caption && (
        <figcaption className="border-b border-slate-100 bg-slate-50/90 px-4 py-2.5 text-xs font-bold text-slate-800">
          {table.caption}
        </figcaption>
      )}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-900">
              {cleanHeaders.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-700"
                >
                  <InlineRichText>{header.trim() || `Coluna ${idx + 1}`}</InlineRichText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cleanRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={rIdx % 2 === 0 ? 'bg-white hover:bg-teal-50/30' : 'bg-slate-50/50 hover:bg-teal-50/30'}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 leading-relaxed text-slate-800 font-medium">
                    <InlineRichText>{cell}</InlineRichText>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
};
