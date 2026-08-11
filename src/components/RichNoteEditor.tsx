import React, { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline,
} from 'lucide-react';

const ALLOWED_TAGS = new Set([
  'B',
  'BLOCKQUOTE',
  'BR',
  'DIV',
  'EM',
  'I',
  'LI',
  'OL',
  'P',
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

    Array.from(element.attributes).forEach((attribute) =>
      element.removeAttribute(attribute.name)
    );
  });

  return documentNode.body.innerHTML;
};

export const isRichNoteEmpty = (value: string): boolean => {
  if (typeof DOMParser === 'undefined') return value.trim().length === 0;

  const documentNode = new DOMParser().parseFromString(value, 'text/html');
  return !documentNode.body.textContent?.replace(/\u00a0/g, ' ').trim();
};

interface RichNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
}

const toolbarActions = [
  { command: 'bold', value: undefined, label: 'Negrito', icon: Bold },
  { command: 'italic', value: undefined, label: 'Itálico', icon: Italic },
  { command: 'underline', value: undefined, label: 'Sublinhado', icon: Underline },
  { command: 'insertUnorderedList', value: undefined, label: 'Lista com marcadores', icon: List },
  { command: 'insertOrderedList', value: undefined, label: 'Lista numerada', icon: ListOrdered },
  { command: 'formatBlock', value: 'blockquote', label: 'Citação', icon: Quote },
] as const;

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Registre uma ideia importante...',
  ariaLabel,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;

    const safeValue = sanitizeRichNoteHtml(value);
    if (editor.innerHTML !== safeValue) {
      editor.innerHTML = safeValue;
    }
  }, [value]);

  const emitValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeRichNoteHtml(editor.innerHTML));
  };

  const applyFormat = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitValue();
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white focus-within:border-teal-600 focus-within:ring-3 focus-within:ring-teal-700/15">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        {toolbarActions.map(({ command, value: commandValue, label, icon: Icon }) => (
          <button
            key={command}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat(command, commandValue)}
            disabled={disabled}
            aria-label={label}
            title={label}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-teal-800 hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <span className="ml-auto text-[10px] font-medium text-slate-400 pr-1">
          Formatação rápida
        </span>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={emitValue}
        onPaste={() => window.setTimeout(emitValue, 0)}
        className="rich-note-editor min-h-32 p-4 text-sm sm:text-base text-slate-800 leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
      />
    </div>
  );
};
