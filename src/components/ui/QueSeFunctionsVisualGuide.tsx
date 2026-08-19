import React, { useState } from 'react';
import { Layers, CheckCircle2, Split, HelpCircle } from 'lucide-react';

export const QueSeFunctionsVisualGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'que' | 'se'>('que');

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/60 text-emerald-300 ring-1 ring-white/20">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-bold tracking-tight text-white">
              Quadro Decisório: Funções do "QUE" e do "SE"
            </h3>
            <p className="m-0 text-xs text-teal-100/80">
              Testes diagnósticos rápidos para identificação morfológica e sintática em provas
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200/80 bg-slate-50/60 px-5 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('que')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'que'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            1. Funções do "QUE" (Conjunção vs Pronome Relativo)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('se')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'se'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            2. Funções do "SE" (Partícula Apassivadora vs Índice de Indeterminação)
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === 'que' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Conjunção Integrante */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                <h4 className="m-0 text-sm font-black text-blue-950">Conjunção Integrante</h4>
                <span className="rounded bg-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                  Trocar por "ISSO"
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
                Inicia orações subordinadas substantivas (que exercem função de sujeito, objeto direto, etc.).
              </p>
              <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-xs">
                <div className="font-bold text-blue-950">Teste Diagnóstico:</div>
                <div className="mt-1 font-mono text-slate-800">
                  "Quero <strong>[que você estude]</strong>" → "Quero <strong>[ISSO]</strong>" (VTD + Oração Substantiva Objetiva Direta)
                </div>
              </div>
            </div>

            {/* Pronome Relativo */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <h4 className="m-0 text-sm font-black text-emerald-950">Pronome Relativo</h4>
                <span className="rounded bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  Trocar por "O QUAL / A QUAL"
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
                Retoma um substantivo ou pronome antecedente e inicia oração subordinada adjetiva.
              </p>
              <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-xs">
                <div className="font-bold text-emerald-950">Teste Diagnóstico:</div>
                <div className="mt-1 font-mono text-slate-800">
                  "O livro <strong>[que li]</strong>" → "O livro <strong>[O QUAL li]</strong>"
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'se' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Partícula Apassivadora */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
              <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
                <h4 className="m-0 text-sm font-black text-teal-950">Pronome Apassivador (PA)</h4>
                <span className="rounded bg-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-900">
                  VTD / VTDI + Sujeito Paciente
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
                Aceita conversão para a voz passiva analítica (ser + particípio). O verbo <strong>concorda obrigatoriamente</strong> com o sujeito paciente.
              </p>
              <div className="mt-3 rounded-lg border border-teal-200 bg-white p-3 text-xs font-mono">
                <div className="text-teal-950 font-bold">Exemplo Clássico:</div>
                <div className="mt-1">
                  <em>"Alugam-se <strong>casas</strong>"</em> = <em>"<strong>Casas</strong> são alugadas"</em>.
                </div>
              </div>
            </div>

            {/* Índice de Indeterminação do Sujeito */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <h4 className="m-0 text-sm font-black text-amber-950">Índice de Indeterminação (IIS)</h4>
                <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  VTI / VI / VL + Preposição
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
                NÃO aceita voz passiva. O verbo fica <strong>obrigatoriamente na 3ª pessoa do singular</strong>.
              </p>
              <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 text-xs font-mono">
                <div className="text-amber-950 font-bold">Exemplo Clássico:</div>
                <div className="mt-1">
                  <em>"Precisa-se de <strong>funcionários</strong>"</em> (Singular obrigatório; "de funcionários" é Objeto Indireto).
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
