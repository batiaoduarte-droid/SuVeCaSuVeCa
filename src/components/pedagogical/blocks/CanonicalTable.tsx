import React from 'react';
import type { CanonicalTableView } from '../../../types/pedagogicalView';
import { InlineRichText } from './InlineRichText';

interface CanonicalTableProps {
  table: CanonicalTableView;
}

export const CanonicalTable: React.FC<CanonicalTableProps> = ({ table }) => {
  if (!table || !table.headers || table.headers.length === 0) return null;

  return (
    <figure className="my-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {table.caption && (
        <figcaption className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs font-bold text-slate-700">
          {table.caption}
        </figcaption>
      )}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-900">
              {table.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  <InlineRichText>{header}</InlineRichText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(table.rows || []).map((row, rIdx) => (
              <tr
                key={rIdx}
                className={rIdx % 2 === 0 ? 'bg-white hover:bg-teal-50/30' : 'bg-slate-50/40 hover:bg-teal-50/30'}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2.5 leading-relaxed text-slate-800">
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
