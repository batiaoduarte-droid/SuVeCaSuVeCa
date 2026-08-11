import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
}) => {
  return (
    <div className={`reading-content min-w-0 max-w-full sm:max-w-[76ch] text-slate-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm">{children}</table>
            </div>
          ),
          pre: ({ children }) => (
            <pre className="my-4 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words">
              {children}
            </pre>
          ),
          code: ({ children, className: codeClassName }) => {
            const isBlockCode = Boolean(codeClassName?.includes('language-'));
            return (
              <code
                className={`font-mono text-xs text-teal-800 ${
                  isBlockCode
                    ? 'block whitespace-pre-wrap break-words bg-transparent p-0'
                    : 'rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 break-words'
                } ${codeClassName || ''}`}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-teal-600 bg-teal-50/60 p-3 rounded-r-lg my-3 text-slate-800 italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
