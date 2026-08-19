import React, { useState } from 'react';
import {
  Brain,
  Copy,
  Check,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import type { ContentBlock, ConnectionMapView } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { ConnectionMap } from '../../ui/ConnectionMap';
import { InlineRichText } from '../blocks/InlineRichText';

interface PrerequisitesSectionProps {
  blocks?: ContentBlock[];
  maps?: ConnectionMapView[];
}

export const PrerequisitesSection: React.FC<PrerequisitesSectionProps> = ({
  blocks = [],
  maps = [],
}) => {
  const [copied, setCopied] = useState(false);

  if (blocks.length === 0 && maps.length === 0) return null;

  // Extrai itens de lista dos blocos para renderizar como cards de fundamentos se aplicável
  const listItems: Array<{ term: string; desc: string }> = [];
  const otherBlocks: ContentBlock[] = [];

  for (const block of blocks) {
    if (block.type === 'list' && block.items && block.items.length > 0) {
      for (const item of block.items) {
        const colonMatch = item.match(/^([^:]+):\s*(.*)$/);
        if (colonMatch && colonMatch[1].length < 40) {
          listItems.push({
            term: colonMatch[1].trim(),
            desc: colonMatch[2].trim(),
          });
        }
      }
    } else {
      otherBlocks.push(block);
    }
  }

  const handleCopy = () => {
    const textToCopy = listItems.map((i) => `• ${i.term}: ${i.desc}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho Padronizado da Seção */}
      <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
                Pré-requisitos e modelo mental
              </h3>
              <p className="m-0 text-xs text-slate-600 font-medium">
                Fundamentação conceitual, mapa relacional e pré-requisitos essenciais
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
            title="Copiar fundamentos"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Grade de Fundamentos Necessários se existirem itens de lista */}
        {listItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-950">
              <BookOpen className="h-4 w-4 text-teal-700" />
              <span>Pré-requisitos e Fundamentos Necessários</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {listItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-teal-300 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h5 className="m-0 text-xs sm:text-sm font-black text-slate-900">
                      <InlineRichText>{item.term}</InlineRichText>
                    </h5>
                    {item.desc && (
                      <p className="mt-1 m-0 text-xs leading-relaxed text-slate-600 font-medium">
                        <InlineRichText>{item.desc}</InlineRichText>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outros blocos (parágrafos, chamadas, etc.) */}
        {otherBlocks.length > 0 && (
          <div className="mt-4 space-y-2">
            {otherBlocks.map((block, idx) => (
              <ContentBlockRenderer key={idx} block={block} />
            ))}
          </div>
        )}
      </div>

      {/* Mapas de Conexões e Esquemas Visuais */}
      {maps.map((map, idx) => (
        <div key={map.mapId || idx} className="my-2">
          {map.rawAscii ? (
            <ConnectionMap source={map.rawAscii} />
          ) : (
            <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-xs">
              <h5 className="m-0 mb-3 text-xs sm:text-sm font-bold text-teal-950">
                {map.title || 'Mapa de Conexões'}
              </h5>
              <div className="flex flex-wrap gap-2">
                {map.nodes.map((n) => (
                  <span
                    key={n.nodeId}
                    className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900 border border-teal-200 shadow-2xs"
                  >
                    {n.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
