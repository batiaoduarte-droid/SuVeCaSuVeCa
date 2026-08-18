import React from 'react';
import { ChevronDown, GitBranch, MoveHorizontal } from 'lucide-react';

interface ConnectionMapProps {
  source: string;
}

const connectorOnly = /^[\s─-╿←-⇿▼▲◆|+\\/_=[\]<>.-]+$/u;

const linearizeMap = (source: string) => source
  .split(/\r?\n/)
  .map((line) => line
    .replace(/[─-╿←-⇿▼▲◆|+\\/_[\]<>]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim())
  .filter((line) => line.length > 1 && !connectorOnly.test(line))
  .filter((line, index, lines) => index === 0 || line !== lines[index - 1]);

export const looksLikeConnectionMap = (source: string) => {
  const connectorMatches = source.match(/[─-╿←-⇿▼▲◆|]/gu)?.length || 0;
  const lines = source.split(/\r?\n/).length;
  return connectorMatches >= 4 && lines >= 3;
};

export const ConnectionMap: React.FC<ConnectionMapProps> = ({ source }) => {
  const nodes = linearizeMap(source);
  const summary = nodes.length
    ? `Mapa de conexões em ${nodes.length} etapas: ${nodes.join('; ')}.`
    : 'Mapa visual de conexões do conteúdo.';

  return (
    <figure className="connection-map my-5 min-w-0 max-w-full">
      <figcaption className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-950">
        <GitBranch className="h-4 w-4 text-teal-700" /> Mapa de conexões
      </figcaption>
      <p className="sr-only">{summary}</p>

      <ol className="space-y-2 sm:hidden" aria-label="Versão linear do mapa de conexões">
        {nodes.map((node, index) => (
          <li key={`${node}-${index}`} className="relative rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-3 pl-12 text-sm leading-relaxed text-slate-800">
            <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
              {index + 1}
            </span>
            {node}
          </li>
        ))}
      </ol>

      <details className="group mt-3 sm:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
          Ver diagrama original
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-2" role="region" aria-label="Diagrama original com rolagem horizontal" tabIndex={0}>
          <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-teal-700" aria-hidden="true">
            <MoveHorizontal className="h-4 w-4" /> Deslize horizontalmente
          </div>
          <pre className="ascii-map overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3"><code>{source}</code></pre>
        </div>
      </details>

      <div className="hidden sm:block" role="region" aria-label="Mapa de conexões com rolagem horizontal" tabIndex={0}>
        <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-teal-700" aria-hidden="true">
          <MoveHorizontal className="h-4 w-4" /> Role horizontalmente se necessário
        </div>
        <pre className="ascii-map overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4"><code>{source}</code></pre>
      </div>
    </figure>
  );
};
