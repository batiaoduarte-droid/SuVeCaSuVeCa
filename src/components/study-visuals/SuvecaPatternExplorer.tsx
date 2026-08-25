import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import { SUVECA_METHOD } from '../../lib/suvecaMethod';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';
import { SUVECA_BLOCK_COLORS } from './studyVisualTokens';

type SuvecaPartType = keyof typeof SUVECA_BLOCK_COLORS;

interface PatternPart {
  type: SuvecaPartType;
  label: string;
  text: string;
  implicit?: boolean;
}

interface SuvecaPatternExplorerProps {
  onUseExample?: (sentence: string) => void;
  className?: string;
}

const PATTERN_PARTS: PatternPart[][] = [
  [
    { type: 'su', label: 'Sujeito', text: 'Os servidores' },
    { type: 've', label: 'Verbo', text: 'entregaram' },
    { type: 'c', label: 'Objeto direto', text: 'o relatório' },
    { type: 'a', label: 'Adjunto', text: 'ontem.' },
  ],
  [
    { type: 'a', label: 'Adjunto deslocado', text: 'Ontem' },
    { type: 've', label: 'Verbo', text: 'chegaram' },
    { type: 'su', label: 'Sujeito posposto', text: 'os fiscais.' },
  ],
  [
    { type: 'su', label: 'Sujeito oculto', text: '(eu)', implicit: true },
    { type: 've', label: 'Verbo', text: 'Comprei' },
    { type: 'c', label: 'Objeto direto', text: 'um livro.' },
  ],
  [
    { type: 've', label: 'Verbo impessoal', text: 'Há' },
    { type: 'c', label: 'Objeto direto', text: 'vagas' },
    { type: 'a', label: 'Adjunto', text: 'aqui.' },
  ],
  [
    { type: 'su', label: 'Sujeito', text: 'Maria' },
    { type: 've', label: 'Verbo de ligação', text: 'parece' },
    { type: 'pred', label: 'Predicativo', text: 'cansada.' },
  ],
];

const PATTERN_GUIDANCE = [
  { trapPrinciple: 0, workflowCode: 'MAPA' },
  { componentCode: 'Su', workflowCode: 'MAPA' },
  { componentCode: 'Su', workflowCode: 'SU' },
  { componentCode: 'Su', workflowCode: 'SU' },
  { componentCode: 'Pred', workflowCode: 'PRED' },
] as const;

const PATTERN_TONES = [
  'border-blue-200 bg-blue-50/70',
  'border-violet-200 bg-violet-50/70',
  'border-sky-200 bg-sky-50/70',
  'border-emerald-200 bg-emerald-50/70',
  'border-rose-200 bg-rose-50/70',
] as const;

const formulaTokens = (surface: string) =>
  surface
    .split(/(\(Su\)|Pred|Su|Ve|C|A|\+)/g)
    .map((token) => token.trim())
    .filter(Boolean);

const Formula: React.FC<{ surface: string; compact?: boolean; inverse?: boolean }> = ({
  surface,
  compact = false,
  inverse = false,
}) => (
  <span role="img" className="flex flex-wrap items-center gap-1" aria-label={`Fórmula: ${surface}`}>
    {formulaTokens(surface).map((token, index) => {
      if (token === '+') {
        return (
          <span key={`${token}-${index}`} aria-hidden="true" className={inverse ? 'text-white/60' : 'text-slate-400'}>
            +
          </span>
        );
      }

      const normalized = token === '(Su)' ? 'su' : token.toLowerCase();
      const type = (normalized === 'pred' ? 'pred' : normalized) as SuvecaPartType;
      const color = SUVECA_BLOCK_COLORS[type] || SUVECA_BLOCK_COLORS.c;
      return (
        <span
          key={`${token}-${index}`}
          aria-hidden="true"
          className={`inline-flex items-center rounded-md font-black ${color.pill} ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}
        >
          {token}
        </span>
      );
    })}
  </span>
);

export const SuvecaPatternExplorer: React.FC<SuvecaPatternExplorerProps> = ({
  onUseExample,
  className = '',
}) => {
  const [activePattern, setActivePattern] = useState(0);
  const pattern = SUVECA_METHOD.patterns[activePattern];
  const parts = PATTERN_PARTS[activePattern] || [];
  const guidance = PATTERN_GUIDANCE[activePattern];
  const component = 'componentCode' in guidance
    ? SUVECA_METHOD.components.find((item) => item.code === guidance.componentCode)
    : undefined;
  const workflow = SUVECA_METHOD.workflow.find((item) => item.code === guidance.workflowCode);
  const trap = 'trapPrinciple' in guidance
    ? SUVECA_METHOD.principles[guidance.trapPrinciple]
    : component?.warning;

  const selectWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const lastIndex = SUVECA_METHOD.patterns.length - 1;
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
      ? lastIndex
      : event.key === 'ArrowRight'
      ? (index + 1) % SUVECA_METHOD.patterns.length
      : (index - 1 + SUVECA_METHOD.patterns.length) % SUVECA_METHOD.patterns.length;
    setActivePattern(nextIndex);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  };

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-teal-300 bg-white shadow-xs ${className}`}
      aria-labelledby="suveca-patterns-title"
    >
      <header className="bg-gradient-to-r from-teal-950 via-teal-900 to-teal-800 px-4 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-amber-300">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">Mapa estrutural de prova</p>
              <h2 id="suveca-patterns-title" className="mt-1 text-lg font-black tracking-tight sm:text-xl">
                Os 5 padrões estruturais da SuVeCA
              </h2>
              <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-teal-100 sm:text-sm">
                {SUVECA_METHOD.principles[0]}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold text-teal-50">
            Mapa, não molde
          </span>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Padrões estruturais SuVeCA"
        className="grid auto-cols-[minmax(220px,78vw)] grid-flow-col gap-2 overflow-x-auto border-b border-teal-100 bg-slate-50/80 p-3 [scrollbar-width:thin] sm:auto-cols-[minmax(230px,45vw)] lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible"
      >
        {SUVECA_METHOD.patterns.map((item, index) => {
          const selected = index === activePattern;
          return (
            <button
              key={item.name}
              id={`suveca-pattern-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="suveca-pattern-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActivePattern(index)}
              onKeyDown={(event) => selectWithKeyboard(event, index)}
              className={`min-h-[112px] snap-start rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                selected
                  ? 'border-teal-800 bg-teal-950 text-white shadow-md ring-2 ring-teal-500 ring-offset-1'
                  : `${PATTERN_TONES[index]} text-slate-900 hover:border-teal-500 hover:shadow-sm`
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-wider ${selected ? 'text-teal-200' : 'text-teal-800'}`}>
                Padrão {index + 1}
              </span>
              <span className="mt-1.5 block text-xs font-black leading-snug sm:text-sm">{item.name}</span>
              <span className="mt-3 block">
                <Formula surface={item.surface} compact inverse={selected} />
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="suveca-pattern-panel"
        role="tabpanel"
        aria-labelledby={`suveca-pattern-tab-${activePattern}`}
        className="p-3 sm:p-6"
      >
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50/40 p-4 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-teal-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">Padrão ativo</p>
              <h3 className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                {activePattern + 1}. {pattern.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fórmula</span>
              <Formula surface={pattern.surface} />
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
            <div className="min-w-0 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                Exemplo com desmembramento sintático
              </p>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                {parts.map((part, index) => {
                  const color = SUVECA_BLOCK_COLORS[part.type];
                  return (
                    <span
                      key={`${part.label}-${index}`}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-2.5 py-2 ${color.bg} ${color.border} ${part.implicit ? 'border-dashed' : ''}`}
                    >
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${color.pill}`}>
                        {part.type === 'pred' ? 'Pred' : part.type === 'su' ? 'Su' : part.type === 've' ? 'Ve' : part.type.toUpperCase()}
                      </span>
                      <span className={`text-xs font-black sm:text-sm ${color.text}`}>
                        <InlineRichText>{part.text}</InlineRichText>
                      </span>
                      <span className="sr-only">: {part.label}</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-xs font-medium leading-relaxed text-slate-600">
                Exemplo canônico: <span className="font-serif font-bold text-slate-900">“{pattern.example}”</span>
              </p>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-xl border border-teal-200 bg-teal-950 p-4 text-white">
              <div>
                <div className="flex items-center gap-2 text-teal-200">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Leve para o analisador</span>
                </div>
                <p className="mt-2 text-sm font-bold leading-relaxed text-white">
                  Teste o exemplo e veja a IA reconstruir os vínculos na ordem em que os termos aparecem.
                </p>
              </div>
              {onUseExample && (
                <button
                  type="button"
                  onClick={() => onUseExample(pattern.example)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-teal-950 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Usar este exemplo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center gap-2 text-rose-800">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-[10px] font-black uppercase tracking-wider">Armadilha que o padrão desarma</span>
              </div>
              <p className="mt-2 text-xs font-medium leading-relaxed text-rose-950">
                {trap}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-[10px] font-black uppercase tracking-wider">Como decidir com a SuVeCA</span>
              </div>
              <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-950">
                {workflow?.instruction}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
