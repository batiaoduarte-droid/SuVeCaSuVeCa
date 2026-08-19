import React from 'react';
import { Ban, CheckCircle2, AlertCircle, Compass } from 'lucide-react';

export const CraseVisualGuide: React.FC = () => {
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/60 text-emerald-300 ring-1 ring-white/20">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-bold tracking-tight text-white">
              Guia Decisório da Crase no Método SuVeCA
            </h3>
            <p className="m-0 text-xs text-teal-100/80">
              Mapeamento de Regência do Verbo ($Ve$) para o Complemento ($C$) com fusão $A + A$
            </p>
          </div>
        </div>
        <span className="rounded-full bg-teal-800/80 px-3 py-1 text-xs font-bold text-teal-200 ring-1 ring-teal-500/30">
          Prep. A + Artigo A → À
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Mantra Fundamental */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-center">
          <span className="text-xs font-black uppercase tracking-wider text-teal-900">
            Mantra Toponímico (Cidades / Lugares):
          </span>
          <div className="mt-1.5 text-sm sm:text-base font-black text-teal-950">
            "Vou a, volto da: Crase há! — Vou a, volto de: Crase pra quê?"
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Ex.: <em>Vou à Bahia (volto da Bahia)</em> vs. <em>Vou a Roma (volto de Roma)</em>.
          </p>
        </div>

        {/* 3 Blocos Decisórios */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Proibidos */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 border-b border-rose-200/60 pb-2 text-rose-900">
                <Ban className="h-4 w-4 text-rose-600" />
                <h4 className="m-0 text-xs sm:text-sm font-black uppercase">1. Casos Proibidos (🚫)</h4>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-800 font-medium pl-0">
                <li>• Antes de palavras masculinas (<em>a pé, a prazo</em>)</li>
                <li>• Antes de verbos no infinitivo (<em>a partir, a sorrir</em>)</li>
                <li>• Antes de pronomes indefinidos/pessoais (<em>a ela, a todos</em>)</li>
                <li>• Palavras repetidas (<em>face a face, gota a gota</em>)</li>
                <li>• "A" singular antes de palavra no plural (<em>a pessoas</em>)</li>
              </ul>
            </div>
          </div>

          {/* Obrigatórios */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 border-b border-emerald-200/60 pb-2 text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h4 className="m-0 text-xs sm:text-sm font-black uppercase">2. Casos Obrigatórios (✅)</h4>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-800 font-medium pl-0">
                <li>• Verbo exige preposição $A$ + substantivo feminino com artigo $A$</li>
                <li>• Locuções adverbiais/prepositivas femininas (<em>à noite, às pressas, à medida que</em>)</li>
                <li>• Indicação de horas exatas (<em>às 14h, às duas horas</em>)</li>
                <li>• Elipse de "à moda de" (<em>bife à milanesa, gol à Pelé</em>)</li>
              </ul>
            </div>
          </div>

          {/* Facultativos */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 border-b border-amber-200/60 pb-2 text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h4 className="m-0 text-xs sm:text-sm font-black uppercase">3. Casos Facultativos (⚡)</h4>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-800 font-medium pl-0">
                <li>• Antes de nomes próprios femininos (<em>Entreguei a / à Maria</em>)</li>
                <li>• Antes de pronome possessivo feminino singular (<em>Falei a / à minha mãe</em>)</li>
                <li>• Após a preposição "até" (<em>Fui até a / à praia</em>)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
