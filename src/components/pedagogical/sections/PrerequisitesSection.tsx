import React, { useState } from 'react';
import {
  Brain,
  Copy,
  Check,
  BookOpen,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import type { ContentBlock, ConnectionMapView, PrerequisiteView } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { ConnectionMap } from '../../ui/ConnectionMap';
import { InlineRichText } from '../blocks/InlineRichText';
import { ConceptTree } from '../../study-visuals/ConceptTree';

interface PrerequisitesSectionProps {
  blocks?: ContentBlock[];
  maps?: ConnectionMapView[];
  items?: PrerequisiteView[];
}

export const PrerequisitesSection: React.FC<PrerequisitesSectionProps> = ({
  blocks = [],
  maps = [],
  items = [],
}) => {
  const [copied, setCopied] = useState(false);

  if (blocks.length === 0 && maps.length === 0 && items.length === 0) return null;

  // Extrai itens de lista dos blocos para renderizar como cards de fundamentos
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
    <div className="space-y-5 select-text">
      <div className="rounded-2xl border border-teal-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs select-none">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                Pré-requisitos e Modelo Mental
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Fundamentação conceitual, mapa relacional e conexões indispensáveis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
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

        {/* Grade de Fundamentos Necessários */}
        {items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-950 select-none">
              <BookOpen className="h-4 w-4 text-teal-700" />
              <span>Ative estes conhecimentos antes de avançar</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item, idx) => (
                <article key={item.prerequisiteId || idx} className={`rounded-xl border p-3.5 ${item.isCritical ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
                  <h4 className="m-0 text-sm font-black text-slate-900"><InlineRichText>{item.name}</InlineRichText></h4>
                  {item.reason && <p className="mt-1 text-xs leading-relaxed text-slate-700"><InlineRichText>{item.reason}</InlineRichText></p>}
                  {item.activationPrompt && (
                    <p className="mt-3 rounded-lg border border-teal-200 bg-white p-2.5 text-xs font-semibold text-teal-950">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-teal-700">Cheque sem consultar</span>
                      <InlineRichText>{item.activationPrompt}</InlineRichText>
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {listItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-950 select-none">
              <BookOpen className="h-4 w-4 text-teal-700" />
              <span>Fundamentos e Conceitos de Base</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {listItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-2xs hover:border-teal-300 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0 select-none" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h5 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                      <InlineRichText>{item.term}</InlineRichText>
                    </h5>
                    {item.desc && (
                      <p className="text-xs leading-relaxed text-slate-700 font-medium">
                        <InlineRichText>{item.desc}</InlineRichText>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outros blocos (parágrafos, tabelas, etc.) */}
        {otherBlocks.length > 0 && (
          <div className="mt-4 space-y-2 pt-2 border-t border-slate-100">
            {otherBlocks.map((block, idx) => (
              <ContentBlockRenderer key={idx} block={block} />
            ))}
          </div>
        )}
      </div>

      {/* Mapas de Conexões Visuais */}
      {maps.map((map, idx) => {
        if (map.nodes && map.nodes.length > 0) {
          return (
            <ConceptTree
              key={map.mapId || idx}
              title={map.title || 'Mapa Estrutural de Dependências'}
              nodes={map.nodes}
              edges={map.edges || []}
            />
          );
        }
        if (map.rawAscii) {
          return <ConnectionMap key={map.mapId || idx} source={map.rawAscii} />;
        }
        return null;
      })}
    </div>
  );
};
