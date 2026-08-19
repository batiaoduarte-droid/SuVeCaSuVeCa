import React from 'react';
import { Ban, CheckCircle2, AlertTriangle, Workflow } from 'lucide-react';

export const PunctuationCommaVisualGuide: React.FC = () => {
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/60 text-emerald-300 ring-1 ring-white/20">
            <Workflow className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-bold tracking-tight text-white">
              A Regra Suprema da Vírgula no Método SuVeCA
            </h3>
            <p className="m-0 text-xs text-teal-100/80">
              Preservação estrita dos núcleos sintáticos e regras de adjuntos deslocados
            </p>
          </div>
        </div>
        <span className="rounded-full bg-teal-800/80 px-3 py-1 text-xs font-bold text-teal-200 ring-1 ring-teal-500/30">
          Su ↮ Ve ↮ C
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* As 2 Proibições Supremas */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-center gap-2 text-rose-950 font-black text-sm uppercase">
            <Ban className="h-4 w-4 text-rose-600" />
            <span>As Duas Proibições Supremas da Vírgula:</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-rose-200 bg-white p-3">
              <span className="text-xs font-black text-rose-900 block">1. NUNCA separar Sujeito do Verbo (Su ↮ Ve)</span>
              <p className="mt-1 text-xs text-slate-700">
                Mesmo que o sujeito seja longo ou venha com oração adjetiva.
              </p>
              <div className="mt-1 text-[11px] font-mono text-rose-800">
                ❌ <em>"O candidato que mais se esforçou, passou no concurso."</em> (ERRO)
              </div>
            </div>
            <div className="rounded-lg border border-rose-200 bg-white p-3">
              <span className="text-xs font-black text-rose-900 block">2. NUNCA separar Verbo do Complemento (Ve ↮ C)</span>
              <p className="mt-1 text-xs text-slate-700">
                Não se usa vírgula entre o verbo e seus objetos direto/indireto.
              </p>
              <div className="mt-1 text-[11px] font-mono text-rose-800">
                ❌ <em>"O auditor analisou com cuidado, os processos fiscais."</em> (ERRO)
              </div>
            </div>
          </div>
        </div>

        {/* Casos Obrigatórios de Vírgula */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
            <h4 className="m-0 text-xs sm:text-sm font-black uppercase text-teal-950 border-b border-teal-200/60 pb-2">
              Adjunto Adverbial Deslocado
            </h4>
            <ul className="mt-2.5 space-y-2 text-xs text-slate-800 font-medium pl-0">
              <li>
                <strong>Grande extensão (3+ palavras):</strong> Vírgula OBRIGATÓRIA.
                <div className="text-slate-600 font-mono text-[11px]">Ex.: <em>"Durante as primeiras horas do dia, todos trabalharam."</em></div>
              </li>
              <li>
                <strong>Pequena extensão (1 ou 2 palavras):</strong> Vírgula FACULTATIVA.
                <div className="text-slate-600 font-mono text-[11px]">Ex.: <em>"Hoje(,) não haverá expediente."</em></div>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
            <h4 className="m-0 text-xs sm:text-sm font-black uppercase text-teal-950 border-b border-teal-200/60 pb-2">
              Termos Isolados & Explicativos
            </h4>
            <ul className="mt-2.5 space-y-2 text-xs text-slate-800 font-medium pl-0">
              <li>
                <strong>Vocativo:</strong> SEMPRE isolado por vírgula(s).
                <div className="text-slate-600 font-mono text-[11px]">Ex.: <em>"Senhores candidatos, prestem atenção."</em></div>
              </li>
              <li>
                <strong>Aposto Explicativo:</strong> SEMPRE entre vírgulas.
                <div className="text-slate-600 font-mono text-[11px]">Ex.: <em>"Machado de Assis, autor de Dom Casmurro, foi gênio."</em></div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
