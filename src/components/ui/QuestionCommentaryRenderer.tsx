import React, { useId, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { ResponsiveTable } from './ResponsiveTable';
import { highlightSuvecaInReactNodes } from './SuvecaBrandHighlight';

export interface QuestionCommentaryRendererProps {
  commentary: string;
  className?: string;
  defaultExpandLayer2?: boolean;
  correctAnswerLabel?: string;
}

interface ParsedCommentary {
  gabaritoHeader?: string;
  layer1: string;
  layer2?: string;
  isLayered: boolean;
}

const parseCommentaryLayers = (rawText: string): ParsedCommentary => {
  if (!rawText || typeof rawText !== 'string') {
    return { layer1: '', isLayered: false };
  }

  // 1. Strip any ## Controle editorial blocks
  let text = rawText.replace(/##\s+Controle\s+editorial[\s\S]*$/i, '').trim();

  // Strip code fences if the whole text is wrapped
  if (text.startsWith('```markdown') && text.endsWith('```')) {
    text = text.slice(11, -3).trim();
  } else if (text.startsWith('```md') && text.endsWith('```')) {
    text = text.slice(5, -3).trim();
  } else if (text.startsWith('```') && text.endsWith('```')) {
    text = text.slice(3, -3).trim();
  }

  // Strip top level heading if ## Comentário regenerado
  text = text.replace(/^#+\s+Coment[áa]rio\s+regenerado\s*/i, '').trim();

  // Check for ### Camada 1 and ### Camada 2
  const layer1Match = text.match(/###\s+Camada\s+1\s*[—–-]\s*Resolu[çc][ãa]o\s+da\s+quest[ãa]o/i);
  const layer2Match = text.match(/###\s+Camada\s+2\s*[—–-]\s*Expans[ãa]o\s+pedag[óo]gica/i);

  if (!layer1Match && !layer2Match) {
    return {
      layer1: text,
      isLayered: false,
    };
  }

  let gabaritoHeader: string | undefined;
  let layer1 = '';
  let layer2: string | undefined;

  const layer1Start = layer1Match ? layer1Match.index! : 0;
  const layer1HeaderLen = layer1Match ? layer1Match[0].length : 0;

  // Header before Camada 1 (e.g. **Gabarito:** Letra A)
  if (layer1Start > 0) {
    const preContent = text.slice(0, layer1Start).trim();
    if (preContent) {
      gabaritoHeader = preContent;
    }
  }

  if (layer2Match) {
    const layer2Start = layer2Match.index!;
    const layer2HeaderLen = layer2Match[0].length;
    layer1 = text.slice(layer1Start + layer1HeaderLen, layer2Start).trim();
    layer2 = text.slice(layer2Start + layer2HeaderLen).trim();
  } else {
    layer1 = text.slice(layer1Start + layer1HeaderLen).trim();
  }

  return {
    gabaritoHeader,
    layer1,
    layer2: layer2 && layer2.length > 0 ? layer2 : undefined,
    isLayered: true,
  };
};

export const QuestionCommentaryRenderer: React.FC<QuestionCommentaryRendererProps> = ({
  commentary,
  className = '',
  defaultExpandLayer2 = false,
  correctAnswerLabel,
}) => {
  const [isLayer2Expanded, setIsLayer2Expanded] = useState<boolean>(defaultExpandLayer2);
  const layer2Id = useId();

  const parsed = useMemo(() => parseCommentaryLayers(commentary), [commentary]);

  let tableIndex = 0;

  const markdownComponents = useMemo(() => ({
    table: ({ children }: { children?: React.ReactNode }) => {
      tableIndex += 1;
      return (
        <ResponsiveTable caption={`Tabela ${tableIndex} — resolução pedagógica`}>
          {children}
        </ResponsiveTable>
      );
    },
    pre: ({ children }: { children?: React.ReactNode }) => (
      <div
        className="code-scroll my-3 min-w-0 max-w-full"
        role="region"
        aria-label="Bloco de código com rolagem horizontal"
        tabIndex={0}
      >
        <pre className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed font-mono text-slate-900">
          <code>{children}</code>
        </pre>
      </div>
    ),
    code: ({ children, className: codeClassName }: { children?: React.ReactNode; className?: string }) => (
      <code className={`rounded-md bg-teal-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-teal-900 border border-teal-100 ${codeClassName || ''}`}>
        {children}
      </code>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="mt-3 mb-1.5 text-base font-bold text-slate-950">
        {highlightSuvecaInReactNodes(children)}
      </h4>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="mt-3 mb-1.5 text-base font-bold text-slate-950">
        {highlightSuvecaInReactNodes(children)}
      </h4>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h5 className="mt-2.5 mb-1 text-sm font-bold text-teal-950">
        {highlightSuvecaInReactNodes(children)}
      </h5>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h6 className="mt-2 mb-1 text-xs font-bold text-slate-900 uppercase tracking-wider">
        {highlightSuvecaInReactNodes(children)}
      </h6>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="my-1.5 text-xs sm:text-sm leading-relaxed text-slate-800 break-words font-normal">
        {highlightSuvecaInReactNodes(children)}
      </p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="my-2 space-y-1.5 pl-4 text-xs sm:text-sm list-disc text-slate-800">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="my-2 space-y-1.5 pl-4 text-xs sm:text-sm list-decimal text-slate-800">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed break-words font-medium">
        {highlightSuvecaInReactNodes(children)}
      </li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-extrabold text-slate-950">
        {highlightSuvecaInReactNodes(children)}
      </strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-teal-950 font-medium">
        {children}
      </em>
    ),
    hr: () => <hr className="my-4 border-slate-200" />,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="my-2.5 rounded-r-xl border-l-4 border-teal-600 bg-teal-50/70 p-3 italic text-slate-800 text-xs sm:text-sm">
        {children}
      </blockquote>
    ),
  }), []);

  if (!commentary || !commentary.trim()) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 italic ${className}`}>
        Comentário explicativo não disponível na fonte editorial.
      </div>
    );
  }

  // Non-layered legacy fallback
  if (!parsed.isLayered) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="rounded-2xl border border-teal-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3 border-b border-teal-100/70 pb-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-teal-950">
              Comentário Pedagógico {correctAnswerLabel ? `· Gabarito: ${correctAnswerLabel}` : ''}
            </span>
          </div>
          <div className="reading-content min-w-0 max-w-full text-slate-800 text-xs sm:text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
              components={markdownComponents}
            >
              {parsed.layer1}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 min-w-0 max-w-full ${className}`}>
      {/* Camada 1: Resolução Autossuficiente */}
      <section
        className="rounded-2xl border border-teal-200/90 bg-white p-4 sm:p-5 shadow-2xs transition"
        aria-label="Resolução da questão"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white font-black shadow-2xs">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <h4 className="m-0 text-xs sm:text-sm font-extrabold text-slate-950">
                Resolução da Questão
              </h4>
              <span className="text-[11px] font-semibold text-teal-800">
                Camada 1 · Resolução autossuficiente
              </span>
            </div>
          </div>

          {parsed.gabaritoHeader && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-950 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              <span>{parsed.gabaritoHeader.replace(/\*\*/g, '')}</span>
            </div>
          )}
        </header>

        <div className="reading-content min-w-0 max-w-full">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
            components={markdownComponents}
          >
            {parsed.layer1}
          </ReactMarkdown>
        </div>
      </section>

      {/* Camada 2: Expansão Pedagógica (se existir) */}
      {parsed.layer2 && (
        <section
          className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 shadow-2xs transition"
          aria-label="Expansão pedagógica e aprofundamento"
        >
          <header>
            <button
              type="button"
              onClick={() => setIsLayer2Expanded((prev) => !prev)}
              aria-expanded={isLayer2Expanded}
              aria-controls={layer2Id}
              className="flex w-full min-h-[48px] cursor-pointer items-center justify-between gap-3 bg-indigo-50/80 px-4 py-3 text-left transition hover:bg-indigo-100/70 sm:px-5"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-700 text-white font-black shadow-2xs">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="m-0 text-xs sm:text-sm font-bold text-indigo-950">
                    Aprofundamento & Expansão Pedagógica
                  </h4>
                  <p className="m-0 text-[11px] font-semibold text-indigo-700">
                    Camada 2 · Regras gerais, exceções e mapas de estudo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-900 shadow-2xs">
                  <Layers className="h-3 w-3 text-indigo-600" />
                  {isLayer2Expanded ? 'Recolher expansão' : 'Ver aprofundamento'}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-indigo-700 transition-transform duration-200 ${
                    isLayer2Expanded ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            </button>
          </header>

          {isLayer2Expanded && (
            <div
              id={layer2Id}
              className="border-t border-indigo-100/80 p-4 sm:p-5 bg-white/90"
            >
              <div className="reading-content min-w-0 max-w-full">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                  components={markdownComponents}
                >
                  {parsed.layer2}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
