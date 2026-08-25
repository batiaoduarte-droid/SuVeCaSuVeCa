import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface FormulaBlockProps {
  text: string;
  className?: string;
}

export const FormulaBlock: React.FC<FormulaBlockProps> = ({ text, className = '' }) => {
  if (!text) return null;

  let sanitized = text
    .replace(/\\text\{([^}]+)\}/g, (_tm, tContent) => {
      const cleanT = tContent
        .replace(/\^\{?a\}?/g, 'ª')
        .replace(/\^\{?o\}?/g, 'º')
        .replace(/\^\{?\\\\circ\}?/g, 'º')
        .replace(/\^\{\\circ\}/g, 'º')
        .replace(/\\"/g, '"')
        .replace(/"/g, '“');
      return `\\text{${cleanT}}`;
    })
    .replace(/§/g, '\\S ');

  const compactFormula = sanitized.replace(/\s+/g, '').toLocaleLowerCase('pt-BR');
  const isPhonemeCountingFormula = [
    '\\text{fonemas}',
    '\\text{letras}',
    '\\text{dígrafos}',
    '\\text{hInicial}'.toLocaleLowerCase('pt-BR'),
    '\\text{dífonos}',
  ].every((token) => compactFormula.includes(token));

  if (isPhonemeCountingFormula) {
    return (
      <div className={`my-4 overflow-hidden rounded-xl border border-teal-200/80 bg-teal-50/50 p-3 text-center text-teal-950 shadow-2xs sm:p-4 ${className}`}>
        <div
          role="math"
          aria-label="Fonemas igual a Letras menos a soma de Dígrafos e H inicial, mais Dífonos"
          data-responsive-formula="phoneme-count"
          className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 font-serif text-base font-semibold leading-tight sm:text-xl"
        >
          <span className="whitespace-nowrap">Fonemas</span>
          <span aria-hidden="true">=</span>
          <span className="whitespace-nowrap">Letras</span>
          <span className="h-0 basis-full sm:hidden" aria-hidden="true" />
          <span aria-hidden="true">−</span>
          <span className="whitespace-nowrap rounded-lg border border-teal-200 bg-white/70 px-2 py-1">
            (Dígrafos + H inicial)
          </span>
          <span aria-hidden="true">+</span>
          <span className="whitespace-nowrap">Dífonos</span>
        </div>
      </div>
    );
  }

  if (sanitized.includes('&') && !sanitized.includes('\\begin{')) {
    sanitized = `\\begin{aligned} ${sanitized} \\end{aligned}`;
  }

  const rawMath = sanitized.trim().startsWith('$$') ? sanitized : `$$\n${sanitized}\n$$`;

  return (
    <div className={`my-4 overflow-x-auto rounded-xl border border-teal-200/80 bg-teal-50/50 p-4 text-center text-teal-950 shadow-2xs ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
      >
        {rawMath}
      </ReactMarkdown>
    </div>
  );
};
