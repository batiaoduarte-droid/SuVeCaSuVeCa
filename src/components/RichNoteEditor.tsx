import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Code,
  List,
  ListOrdered,
  Quote,
  Copy,
  Check,
  Trash2,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  FileText,
} from 'lucide-react';

const ALLOWED_TAGS = new Set([
  'B',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'DIV',
  'EM',
  'I',
  'LI',
  'MARK',
  'OL',
  'P',
  'SPAN',
  'STRONG',
  'U',
  'UL',
]);

export const sanitizeRichNoteHtml = (value: string): string => {
  if (typeof DOMParser === 'undefined') return '';

  const documentNode = new DOMParser().parseFromString(value, 'text/html');
  const elements = Array.from(documentNode.body.querySelectorAll('*'));

  elements.forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    // Preserve styled class for tags and marks
    const className = element.getAttribute('class');
    Array.from(element.attributes).forEach((attribute) =>
      element.removeAttribute(attribute.name)
    );

    if (className && (element.tagName === 'SPAN' || element.tagName === 'MARK' || element.tagName === 'CODE')) {
      element.setAttribute('class', className);
    }
  });

  return documentNode.body.innerHTML;
};

export const isRichNoteEmpty = (value: string): boolean => {
  if (!value) return true;
  if (typeof DOMParser === 'undefined') return value.trim().length === 0;

  const documentNode = new DOMParser().parseFromString(value, 'text/html');
  return !documentNode.body.textContent?.replace(/\u00a0/g, ' ').trim();
};

export const getNoteStatistics = (htmlValue: string): { words: number; chars: number; plainText: string } => {
  if (typeof DOMParser === 'undefined') {
    const plain = htmlValue.replace(/<[^>]*>/g, '').trim();
    return {
      plainText: plain,
      chars: plain.length,
      words: plain ? plain.split(/\s+/).filter(Boolean).length : 0,
    };
  }
  const docNode = new DOMParser().parseFromString(htmlValue, 'text/html');
  const plainText = (docNode.body.textContent || '').replace(/\u00a0/g, ' ').trim();
  const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  return {
    plainText,
    chars: plainText.length,
    words,
  };
};

interface RichNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  autoFocus?: boolean;
}

const studyTags = [
  {
    tag: 'regra',
    label: '[REGRA DE OURO]',
    icon: Lightbulb,
    badgeClass: 'inline-flex items-center gap-1 font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-xs',
    colorClass: 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200',
  },
  {
    tag: 'pegadinha',
    label: '[PEGADINHA]',
    icon: AlertTriangle,
    badgeClass: 'inline-flex items-center gap-1 font-black text-rose-900 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded text-xs',
    colorClass: 'text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200',
  },
  {
    tag: 'duvida',
    label: '[DÚVIDA]',
    icon: HelpCircle,
    badgeClass: 'inline-flex items-center gap-1 font-black text-blue-900 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded text-xs',
    colorClass: 'text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    tag: 'exemplo',
    label: '[EXEMPLO]',
    icon: FileText,
    badgeClass: 'inline-flex items-center gap-1 font-black text-teal-900 bg-teal-100 border border-teal-300 px-1.5 py-0.5 rounded text-xs',
    colorClass: 'text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200',
  },
] as const;

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Registre uma ideia importante, regra de ouro ou exemplo...',
  ariaLabel,
  autoFocus = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const stats = getNoteStatistics(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;

    const safeValue = sanitizeRichNoteHtml(value);
    if (editor.innerHTML !== safeValue) {
      editor.innerHTML = safeValue;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && !disabled) editorRef.current?.focus();
  }, [autoFocus, disabled]);

  const emitValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeRichNoteHtml(editor.innerHTML));
  };

  const applyFormat = (command: string, arg: string | undefined = undefined) => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, arg);
    emitValue();
  };

  const applyCustomTag = (tagName: 'mark' | 'code') => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      // Inserir elemento com espaço
      const el = document.createElement(tagName);
      el.textContent = tagName === 'mark' ? 'destaque' : 'termo_sintatico';
      if (tagName === 'mark') {
        el.className = 'bg-amber-200 text-amber-950 px-1 rounded font-medium';
      } else {
        el.className = 'bg-slate-100 text-teal-900 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-200';
      }
      range.insertNode(el);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    } else {
      const fragment = range.extractContents();
      const el = document.createElement(tagName);
      if (tagName === 'mark') {
        el.className = 'bg-amber-200 text-amber-950 px-1 rounded font-medium';
      } else {
        el.className = 'bg-slate-100 text-teal-900 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-200';
      }
      el.appendChild(fragment);
      range.insertNode(el);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    }
    emitValue();
  };

  const insertStudyTag = (label: string, badgeClass: string) => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editor.contains(selection.anchorNode)) {
      // Append to the end
      const span = document.createElement('span');
      span.className = badgeClass;
      span.textContent = label;
      editor.appendChild(document.createTextNode(' '));
      editor.appendChild(span);
      editor.appendChild(document.createTextNode(' '));
    } else {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.className = badgeClass;
      span.textContent = label;
      range.insertNode(document.createTextNode(' '));
      range.insertNode(span);
      range.insertNode(document.createTextNode(' '));
      range.collapse(false);
    }
    emitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormat('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormat('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        applyFormat('underline');
      }
    }
  };

  const handleCopyText = () => {
    if (!stats.plainText) return;
    navigator.clipboard.writeText(stats.plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    onChange('');
    setConfirmClear(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.focus();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-700/15 transition">
      {/* Barra de Ferramentas de Formatação */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-slate-50/90 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bold')}
            disabled={disabled}
            aria-label="Negrito (Ctrl+B)"
            title="Negrito (Ctrl+B)"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-teal-900 hover:bg-teal-100/70 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('italic')}
            disabled={disabled}
            aria-label="Itálico (Ctrl+I)"
            title="Itálico (Ctrl+I)"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-teal-900 hover:bg-teal-100/70 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('underline')}
            disabled={disabled}
            aria-label="Sublinhado (Ctrl+U)"
            title="Sublinhado (Ctrl+U)"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-teal-900 hover:bg-teal-100/70 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <Underline className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyCustomTag('mark')}
            disabled={disabled}
            aria-label="Marca-texto / Destaque"
            title="Marca-texto / Destaque"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-100/80 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyCustomTag('code')}
            disabled={disabled}
            aria-label="Termo Sintático / Código"
            title="Termo Sintático / Código"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-teal-900 hover:bg-teal-100/70 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('insertUnorderedList')}
            disabled={disabled}
            aria-label="Lista com marcadores"
            title="Lista com marcadores"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-teal-900 hover:bg-teal-100/70 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('insertOrderedList')}
            disabled={disabled}
            aria-label="Lista numerada"
            title="Lista numerada"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-teal-900 hover:bg-teal-100/70 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('formatBlock', '<blockquote>')}
            disabled={disabled}
            aria-label="Citação"
            title="Citação"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-teal-900 hover:bg-teal-100/70 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Estatísticas & Ações de Limpeza/Cópia */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            {stats.words} {stats.words === 1 ? 'palavra' : 'palavras'} · {stats.chars} {stats.chars === 1 ? 'caractere' : 'caracteres'}
          </span>

          <button
            type="button"
            onClick={handleCopyText}
            disabled={!stats.plainText}
            aria-label="Copiar anotação"
            title="Copiar texto da anotação"
            className="h-7 px-2 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-900 disabled:opacity-40 transition cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!stats.plainText || disabled}
            aria-label="Limpar anotação"
            title="Limpar anotação"
            className={`h-7 px-2 inline-flex items-center gap-1 rounded-md border text-[11px] font-bold transition cursor-pointer shadow-2xs disabled:opacity-40 ${
              confirmClear
                ? 'border-rose-300 bg-rose-50 text-rose-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-rose-600'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>{confirmClear ? 'Confirmar?' : 'Limpar'}</span>
          </button>
        </div>
      </div>

      {/* Tags Rápidas de Estudo (One-Click) */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white border-b border-slate-100">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 mr-1">
          Marcadores:
        </span>
        {studyTags.map(({ tag, label, icon: Icon, badgeClass, colorClass }) => (
          <button
            key={tag}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertStudyTag(label, badgeClass)}
            disabled={disabled}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold transition cursor-pointer ${colorClass} disabled:opacity-40`}
            title={`Inserir marcador ${label}`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Área Editável em Texto Rico */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={emitValue}
        onKeyDown={handleKeyDown}
        onPaste={() => window.setTimeout(emitValue, 0)}
        className="rich-note-editor min-h-28 p-4 text-sm sm:text-base text-slate-800 leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
      />
    </div>
  );
};
