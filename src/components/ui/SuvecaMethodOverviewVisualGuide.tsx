import React, { useState } from 'react';
import { CheckCircle2, Compass, ShieldAlert, Workflow } from 'lucide-react';
import { SUVECA_METHOD } from '../../lib/suvecaMethod';
import { SuvecaEquationBlocks } from '../study-visuals/SuvecaEquationBlocks';
import { SUVECA_BLOCK_COLORS } from '../study-visuals/studyVisualTokens';

const IS_POINTS = [
  'Um mapa de análise que reconstrói relações sintáticas.',
  'Um protocolo que preserva a ordem real dos termos.',
  'Uma camada metodológica para aplicar o conteúdo do curso.',
];

const IS_NOT_POINTS = [
  'Uma fila linear obrigatória de Sujeito, Verbo e Complementos.',
  'Uma exigência de que todos os cinco blocos estejam presentes.',
  'Uma substituição das regras normativas ou da autoridade do corpus.',
];

export const SuvecaMethodOverviewVisualGuide: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState(0);
  const component = SUVECA_METHOD.components[activeComponent];
  const componentType = ['su', 've', 'c', 'a', 'pred'][activeComponent] as keyof typeof SUVECA_BLOCK_COLORS;
  const color = SUVECA_BLOCK_COLORS[componentType];
  const selectWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const lastIndex = SUVECA_METHOD.components.length - 1;
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
      ? lastIndex
      : event.key === 'ArrowRight'
      ? (index + 1) % SUVECA_METHOD.components.length
      : (index - 1 + SUVECA_METHOD.components.length) % SUVECA_METHOD.components.length;
    setActiveComponent(nextIndex);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <section aria-label="Visão geral do Método SuVeCA" className="my-6 overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-xs">
      <header className="bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-amber-300">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">Fundamento do curso</p>
              <h3 className="mt-1 text-lg font-black text-white sm:text-xl">O que é o Método SuVeCA?</h3>
              <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-teal-100 sm:text-sm">
                {SUVECA_METHOD.definition}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold text-teal-50">
            Orientação cognitiva e tática
          </span>
        </div>
      </header>

      <div className="space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby="suveca-equation-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">Equação funcional</p>
              <h4 id="suveca-equation-title" className="mt-1 text-sm font-black text-slate-950">Cinco papéis que formam o mapa</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500">Selecione um bloco para inspecionar</span>
          </div>
          <SuvecaEquationBlocks className="mt-3" />

          <div role="tablist" aria-label="Componentes do método" className="mt-3 grid grid-cols-5 gap-1.5">
            {SUVECA_METHOD.components.map((item, index) => {
              const selected = index === activeComponent;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="suveca-component-detail"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveComponent(index)}
                  onKeyDown={(event) => selectWithKeyboard(event, index)}
                  className={`min-h-10 rounded-lg border px-2 py-1 text-[10px] font-black transition ${
                    selected ? 'border-teal-700 bg-teal-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400'
                  }`}
                >
                  {item.code}
                </button>
              );
            })}
          </div>

          <div id="suveca-component-detail" role="tabpanel" className={`mt-3 rounded-xl border p-4 ${color.border} ${color.bg}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-[10px] font-black ${color.pill}`}>{component.code}</span>
              <strong className={`text-sm ${color.text}`}>{component.name}</strong>
            </div>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-800">{component.question}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600"><strong>Atenção:</strong> {component.warning}</p>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4" aria-labelledby="suveca-is-title">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <h4 id="suveca-is-title" className="text-sm font-black">O que a SuVeCA é</h4>
            </div>
            <ul className="mt-3 space-y-2 text-xs font-medium leading-relaxed text-emerald-950">
              {IS_POINTS.map((point) => <li key={point} className="flex gap-2"><span aria-hidden="true">•</span><span>{point}</span></li>)}
            </ul>
          </section>
          <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4" aria-labelledby="suveca-is-not-title">
            <div className="flex items-center gap-2 text-rose-900">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <h4 id="suveca-is-not-title" className="text-sm font-black">O que a SuVeCA não é</h4>
            </div>
            <ul className="mt-3 space-y-2 text-xs font-medium leading-relaxed text-rose-950">
              {IS_NOT_POINTS.map((point) => <li key={point} className="flex gap-2"><span aria-hidden="true">•</span><span>{point}</span></li>)}
            </ul>
          </section>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
          <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <div>
            <strong className="text-xs font-black uppercase tracking-wider text-teal-900">Regra de ouro do mapa</strong>
            <p className="mt-1 text-xs font-medium leading-relaxed text-teal-950">
              {SUVECA_METHOD.workflow.find((step) => step.code === 'MAPA')?.instruction}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
