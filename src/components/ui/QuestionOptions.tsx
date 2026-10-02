import React from 'react';

/** Shared question layout without grading, persistence or notebook side effects. */
export function QuestionOptions({ options, selected, answer, disabled, onSelect, renderText }: {
  options: Array<{ id: string; text: string }>; selected: string | null;
  answer?: string; disabled?: boolean; onSelect: (id: string) => void;
  renderText?: (text: string) => React.ReactNode;
}) {
  return <fieldset className="min-w-0">
    <legend className="sr-only">Alternativas</legend>
    <ol className="m-0 grid list-none gap-2.5 p-0">
      {options.map(option => <li key={option.id} className="list-none">
        <button type="button" disabled={disabled} aria-pressed={selected === option.id}
          onClick={() => onSelect(option.id)}
          className={`grid min-h-12 w-full grid-cols-[2rem_1fr] items-start gap-3 rounded-xl border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-teal-700 ${answer === option.id ? 'border-emerald-600 bg-emerald-50' : answer && selected === option.id ? 'border-rose-500 bg-rose-50' : selected === option.id ? 'border-teal-700 bg-teal-50' : 'border-slate-300 bg-white hover:border-teal-500'}`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-800">{option.id}</span>{' '}
          <span className="min-w-0 whitespace-pre-wrap break-words text-slate-800">{renderText ? renderText(option.text) : option.text}{answer === option.id && <strong className="block text-emerald-900">Resposta correta</strong>}{answer && selected === option.id && answer !== option.id && <strong className="block text-rose-900">Sua resposta</strong>}</span>
        </button>
      </li>)}
    </ol>
  </fieldset>;
}
