import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface InlineRichTextProps {
  children: string;
  className?: string;
}

export const sanitizePedagogicalText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text
    // Remove referências brutas a IDs técnicos e scaffolding
    .replace(/^\s*\d+\s*-\s*.+?\.md\s*(?:\([^)]*\))?\s*$/gmi, '')
    .replace(/Contrasta com:\s*KB-[A-Z0-9_-]+\s*\(([^)]+)\)/gi, 'Contrasta com: **$1**')
    .replace(/Expandido em:\s*KB-[A-Z0-9_-]+\s*a\s*KB-[A-Z0-9_-]+/gi, 'Detalhamento disponível nos tópicos do módulo')
    .replace(/\[\s*(?:KB|WARN|PROC|TIP|TERM|ORAL|EX|OQ)-[^\]]+\]/gi, '')
    .replace(/\(\s*(?:KB|WARN|PROC|TIP|TERM|ORAL|EX|OQ)-[^)]+\)/gi, '')
    .replace(/\s*\b(?:KB|WARN|PROC|TIP|TERM|ORAL|EX|OQ)-[A-Za-z0-9_.-]+\b\s*(?:\([^)]*\))?/gi, '')
    .replace(/\s*\brule\.pt\.[a-z0-9_.-]+\b/gi, '')
    .replace(/Possui alerta:\s*\.?/gmi, '')
    .replace(/Aplicado em:\s*\.?/gmi, '')
    .replace(/Depende de:\s*\.?/gmi, '')
    .replace(/Relacionado a:\s*\.?/gmi, '')
    .replace(/Possui (?:dica|procedimento):\s*\.?/gmi, '')
    .replace(/Termo associado:\s*\.?/gmi, '')
    .replace(/Origens Cruzadas:\s*\.?/gmi, '')
    // Correções de concatenação de palavras em tabelas e títulos
    .replace(/Preposiçãopor/g, 'Preposição "por"')
    .replace(/Preposiçãoque/g, 'Preposição + Conjunção "que"')
    .replace(/DesignaçãoEis/g, 'Designação "Eis"')
    .replace(/(Preposição|Conjunção|Substantivo|Pronome|Adjetivo|Advérbio)([A-ZÁÉÍÓÚÀÂÊÔÃÕ])/g, '$1 $2');

  // Normaliza setas simples e superescritos ordinais clássicos do português e LaTeX
  sanitized = sanitized
    .replace(/\$\s*\\(?:long)?rightarrow\s*\$/g, '→')
    .replace(/\$\s*\\to\s*\$/g, '→')
    .replace(/\$\s*\\(?:long)?leftarrow\s*\$/g, '←')
    .replace(/\$\s*\\Rightarrow\s*\$/g, '⇒')
    .replace(/\$\s*\\iff\s*\$/g, '⇔')
    .replace(/\$\s*\\implies\s*\$/g, '⇒')
    .replace(/\^\{?a\}?/g, 'ª')
    .replace(/\^\{?o\}?/g, 'º')
    .replace(/\^\{?\\\\circ\}?/g, 'º')
    .replace(/\^\{\\circ\}/g, 'º')
    .replace(/\\text\{([^}]+)\}\s*\[\\text\{([^}]+)\}\]/g, '\\text{$1 [$2]}')
    .replace(/\\text\{([^}]+)\}/g, (_m, content) => {
      const cleanContent = content
        .replace(/\\"/g, '"')
        .replace(/"/g, '“');
      return `\\text{${cleanContent}}`;
    });

  // Encapsula comandos LaTeX sem delimitadores ($) para que o rehype-katex renderize visualmente
  const lines = sanitized.split('\n');
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    // Se a linha já tem $, preserva
    if (line.includes('$')) return line;
    // Se contém comandos LaTeX característicos desprovidos de delimitadores
    if (/\\text\{|\\mathbf\{|\\begin\{|\\longrightarrow|\\rightarrow|\\to|\\iff|\\implies|\\frac\{|\\underline\{|\\textbf\{/.test(line)) {
      let mathExpr = trimmed;
      if (mathExpr.includes('&') && !mathExpr.includes('\\begin{')) {
        mathExpr = `\\begin{aligned} ${mathExpr} \\end{aligned}`;
      }
      return `$${mathExpr}$`;
    }
    return line;
  });
  sanitized = processedLines.join('\n');

  // Sanitiza fórmulas matemáticas para compilação segura no KaTeX
  sanitized = sanitized.replace(/\$([^$]+)\$/g, (_match, mathContent) => {
    let sanitizedMath = mathContent
      .replace(/\\text\{([^}]+)\}/g, (_tm, tContent) => {
        const cleanT = tContent
          .replace(/\^\{?a\}?/g, 'ª')
          .replace(/\^\{?o\}?/g, 'º')
          .replace(/\^\{?\\\\circ\}?/g, 'º')
          .replace(/\\"/g, '"')
          .replace(/"/g, '“');
        return `\\text{${cleanT}}`;
      })
      .replace(/§/g, '\\S ');

    if (sanitizedMath.includes('&') && !sanitizedMath.includes('\\begin{')) {
      sanitizedMath = `\\begin{aligned} ${sanitizedMath} \\end{aligned}`;
    }
    return `$${sanitizedMath}$`;
  });

  return sanitized.trim();
};

export const InlineRichText: React.FC<InlineRichTextProps> = ({ children, className = '' }) => {
  if (!children) return null;
  const processedText = sanitizePedagogicalText(children);
  if (!processedText) return null;

  return (
    <span className={`inline-rich-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          p: ({ children: pChildren }) => <>{pChildren}</>,
          strong: ({ children: sChildren }) => (
            <strong className="font-bold text-teal-950">{sChildren}</strong>
          ),
          em: ({ children: eChildren }) => (
            <em className="italic text-slate-800">{eChildren}</em>
          ),
          code: ({ children: cChildren }) => (
            <code className="rounded bg-teal-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
              {cChildren}
            </code>
          ),
          ul: ({ children: listChildren }) => <span className="inline"> {listChildren}</span>,
          ol: ({ children: listChildren }) => <span className="inline"> {listChildren}</span>,
          li: ({ children: itemChildren }) => <span className="inline"> • {itemChildren}</span>,
          hr: () => <span aria-hidden="true"> — </span>,
          blockquote: ({ children: quoteChildren }) => <span className="italic"> {quoteChildren}</span>,
          h1: ({ children: headingChildren }) => <strong>{headingChildren}</strong>,
          h2: ({ children: headingChildren }) => <strong>{headingChildren}</strong>,
          h3: ({ children: headingChildren }) => <strong>{headingChildren}</strong>,
          h4: ({ children: headingChildren }) => <strong>{headingChildren}</strong>,
        }}
      >
        {processedText}
      </ReactMarkdown>
    </span>
  );
};
