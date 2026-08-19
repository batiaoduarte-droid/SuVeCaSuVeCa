import React, { useState } from 'react';
import {
  Workflow,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import type { SuvecaConnectionView } from '../../../types/pedagogicalView';
import { InlineRichText } from '../blocks/InlineRichText';

interface SuvecaSectionProps {
  view: SuvecaConnectionView;
}

const SUVECA_BLOCKS = [
  {
    sigla: 'SU',
    nome: 'Sujeito',
    desc: 'Polo nominal determinante',
    colors: 'border-blue-200 bg-blue-50/70 text-blue-950 ring-blue-300/40',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    sigla: 'VE',
    nome: 'Verbo',
    desc: 'Motor oracional relacional',
    colors: 'border-emerald-200 bg-emerald-50/70 text-emerald-950 ring-emerald-300/40',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    sigla: 'C',
    nome: 'Complemento',
    desc: 'Objetos direto / indireto / CN',
    colors: 'border-cyan-200 bg-cyan-50/70 text-cyan-950 ring-cyan-300/40',
    badgeColor: 'bg-cyan-100 text-cyan-800',
  },
  {
    sigla: 'A',
    nome: 'Adjunto',
    desc: 'Adverbial ou adnominal circunstancial',
    colors: 'border-amber-200 bg-amber-50/70 text-amber-950 ring-amber-300/40',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  {
    sigla: 'PRED',
    nome: 'Predicativo',
    desc: 'Atributo do sujeito ou objeto',
    colors: 'border-purple-200 bg-purple-50/70 text-purple-950 ring-purple-300/40',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
];

export const SuvecaSection: React.FC<SuvecaSectionProps> = ({ view }) => {
  const [copied, setCopied] = useState(false);

  if (!view) return null;

  const handleCopy = () => {
    const textToCopy = `Método SuVeCA: [Sujeito + Verbo + Complemento + Adjunto + Predicativo]\n\n${view.summary || ''}\n\nPassos:\n${(view.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Quadro Principal Canônico de Conexão com o Método SuVeCA */}
      <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-xs transition">
        {/* Cabeçalho do Quadro */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100/80 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs">
              <Workflow className="h-5 w-5" />
            </span>
            <div>
              <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
                {view.label || 'Conexão com o método SuVeCA'}
              </h3>
              <p className="m-0 text-xs text-slate-600 font-medium">
                Mapa de ancoragem sintático-funcional para desarmar inversões de prova
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-2xs"
            title="Copiar síntese do método"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Caixa da Fórmula Sintática Fundamental */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-teal-950">
                Fórmula Sintática Fundamental
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Ordem Canônica vs. Inversões
              </span>
            </div>

            {/* Grid dos 5 Blocos SuVeCA */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {SUVECA_BLOCKS.map((block) => (
                <div
                  key={block.sigla}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-center transition shadow-2xs ${block.colors}`}
                >
                  <div>
                    <div className="text-base font-black tracking-tight">{block.sigla}</div>
                    <div className="text-xs font-bold mt-0.5">{block.nome}</div>
                  </div>
                  <p className="mt-2 text-[10px] sm:text-[11px] leading-tight text-slate-700 font-medium">
                    {block.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Texto Explicativo e Contexto do Tema */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm leading-relaxed text-slate-800 font-medium">
              A SuVeCA é um mapa de análise para reconstruir as relações sintáticas, e não um molde obrigatório. Em concursos, as frases frequentemente aparecem em ordem inversa, com termos omitidos ou sem sujeito.
            </p>

            {view.summary && (
              <div className="rounded-xl border border-teal-200/70 bg-teal-50/40 p-3.5 text-xs sm:text-sm text-teal-950 font-medium leading-relaxed">
                {view.primaryLinguisticLayer && (
                  <strong className="text-teal-900 block mb-1">
                    Camada própria ({view.primaryLinguisticLayer}):
                  </strong>
                )}
                <InlineRichText>{view.summary}</InlineRichText>
              </div>
            )}
          </div>

          {/* Como Aplicar neste Tema (Passo a Passo) */}
          {view.steps && view.steps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal-950">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>Como Aplicar neste Tema (Passo a Passo)</span>
              </div>

              <div className="space-y-2">
                {view.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs hover:border-teal-200 transition"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-black text-teal-800 ring-1 ring-teal-300">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1 text-xs sm:text-sm leading-relaxed text-slate-800 font-medium">
                      <InlineRichText>{step}</InlineRichText>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testes Diagnósticos Decisivos */}
          {view.decisiveTests && view.decisiveTests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal-950">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                <span>Testes Diagnósticos Decisivos</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {view.decisiveTests.map((test, idx) => {
                  const colonMatch = test.match(/^([^:]+):\s*(.*)$/);
                  const title = colonMatch ? colonMatch[1] : `Teste Diagnóstico #${idx + 1}`;
                  const body = colonMatch ? colonMatch[2] : test;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-xl border border-teal-200/80 bg-white p-4 shadow-2xs hover:border-teal-300 transition"
                    >
                      <div>
                        <span className="inline-block rounded-md bg-teal-100/70 px-2 py-0.5 text-xs font-bold text-teal-900 mb-2">
                          {title}
                        </span>
                        <p className="m-0 text-xs leading-relaxed text-slate-700 font-medium">
                          <InlineRichText>{body}</InlineRichText>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fronteira e Limite do Método */}
          {view.limits && view.limits.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-blue-200/80 bg-blue-50/40 p-4">
              <div className="flex items-center gap-2 text-blue-950 mb-2">
                <ShieldAlert className="h-4 w-4 text-blue-700 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Fronteira & Limite do Método SuVeCA
                </span>
              </div>
              <div className="space-y-1.5 text-xs leading-relaxed text-slate-700 font-medium">
                {view.limits.map((limit, idx) => (
                  <p key={idx} className="m-0">
                    <InlineRichText>{limit}</InlineRichText>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
