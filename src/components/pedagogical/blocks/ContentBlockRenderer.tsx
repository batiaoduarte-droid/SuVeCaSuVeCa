import React from 'react';
import type { ContentBlock } from '../../../types/pedagogicalView';
import { InlineRichText, sanitizePedagogicalText } from './InlineRichText';
import { FormulaBlock } from './FormulaBlock';
import { CanonicalTable } from './CanonicalTable';
import { CalloutBlock } from './CalloutBlock';
import { ConnectionMap, looksLikeConnectionMap } from '../../ui/ConnectionMap';

interface ContentBlockRendererProps {
  block: ContentBlock;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ block }) => {
  if (!block) return null;

  switch (block.type) {
    case 'paragraph': {
      if (!block.text) return null;

      // Detecta diagramas ou esquemas ASCII embutidos no parágrafo
      if (
        looksLikeConnectionMap(block.text) ||
        block.text.includes('|——') ||
        block.text.includes('├──') ||
        block.text.includes('└──') ||
        block.text.includes('QUADRO DA POLIFONIA') ||
        (block.text.includes('▼') && block.text.includes('SOM DE')) ||
        (block.text.includes('ESTRUTURA DA PALAVRA') && block.text.includes('PLANO'))
      ) {
        return <ConnectionMap source={block.text} />;
      }

      const sanitized = sanitizePedagogicalText(block.text);
      if (!sanitized) return null;

      return (
        <p className="my-2.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-800">
          <InlineRichText>{block.text}</InlineRichText>
        </p>
      );
    }

    case 'heading': {
      const level = block.level || 2;
      const baseClasses = 'font-black tracking-tight text-teal-950';
      if (level === 1) return <h1 className={`my-4 text-xl sm:text-2xl ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h1>;
      if (level === 2) return <h2 className={`my-3.5 text-lg sm:text-xl ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h2>;
      if (level === 3) return <h3 className={`my-3 text-base sm:text-lg ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h3>;
      if (level === 4) return <h4 className={`my-2.5 text-sm sm:text-base ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h4>;
      return <h5 className={`my-2 text-xs sm:text-sm ${baseClasses}`}><InlineRichText>{block.text}</InlineRichText></h5>;
    }

    case 'list': {
      if (!block.items || block.items.length === 0) return null;

      // Filtra itens técnicos ou vazios
      const validItems = block.items
        .map((item) => item.trim())
        .filter((item) => {
          if (!item) return false;
          if (/^Depende de:\s*\.?$/i.test(item)) return false;
          if (/^Possui alerta:\s*(WARN-[A-Z0-9_-]+)?\.?$/i.test(item)) return false;
          if (/^Aplicado em:\s*(PROC-[A-Z0-9_-]+(,\s*)?|EX-[A-Z0-9_-]+(,\s*)?)*\.?$/i.test(item)) return false;
          if (/^Relacionado a:\s*(KB-[A-Z0-9_-]+(,\s*)?)*\.?$/i.test(item)) return false;
          // Se o texto sanitizado ficar vazio, descarta
          return sanitizePedagogicalText(item).length > 0;
        });

      if (validItems.length === 0) return null;

      // Tratamento para item único ordenado que atua como título/rótulo (ex: "CHAVE:", "GUERRA:")
      if (block.ordered && validItems.length === 1 && (validItems[0].endsWith(':') || validItems[0].length < 40)) {
        const titleText = validItems[0].replace(/:$/, '').trim();
        return (
          <div className="mt-4 mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-800 text-[11px] font-black text-white shadow-2xs">
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
          <ol className="my-3 space-y-1.5 pl-5 text-xs sm:text-sm text-slate-800 list-decimal marker:font-bold marker:text-teal-700">
            {validItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                <InlineRichText>{item}</InlineRichText>
              </li>
            ))}
          </ol>
        );
      }

      return (
        <ul className="my-3 space-y-1.5 pl-5 text-xs sm:text-sm text-slate-800 list-disc marker:text-teal-600">
          {validItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              <InlineRichText>{item}</InlineRichText>
            </li>
          ))}
        </ul>
      );
    }

    case 'formula':
      return <FormulaBlock text={block.text} />;

    case 'table_ref':
      if (block.table) {
        return <CanonicalTable table={block.table} />;
      }
      return null;

    case 'callout':
      return <CalloutBlock block={block} />;

    case 'diagram':
      if (block.text) {
        return <ConnectionMap source={block.text} />;
      }
      return null;

    case 'code':
      return (
        <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed font-mono text-slate-900">
          <pre><code>{block.text}</code></pre>
        </div>
      );

    default:
      return null;
  }
};
