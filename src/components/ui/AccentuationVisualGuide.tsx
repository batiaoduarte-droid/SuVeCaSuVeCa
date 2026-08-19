import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

export const AccentuationVisualGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'geral' | 'hiatos' | 'acordo'>('geral');

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/60 text-emerald-300 ring-1 ring-white/20">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base sm:text-lg font-black tracking-tight text-white !text-white">
              Quadro Canônico de Acentuação Gráfica
            </h3>
            <p className="m-0 text-xs text-teal-100 font-medium !text-teal-100">
              Regras canônicas por posição da sílaba tônica e regras especiais
            </p>
          </div>
        </div>
        <span className="rounded-full bg-teal-800/80 px-3 py-1 text-xs font-bold text-teal-200 ring-1 ring-teal-500/30">
          Posição Silábica & Hiatos
        </span>
      </div>

      <div className="border-b border-slate-200/80 bg-slate-50/60 px-5 py-2">
        <div className="flex gap-2">
          {[
            { id: 'geral', label: '1. Regras Gerais (Proparoxítonas, Paroxítonas, Oxítonas)' },
            { id: 'hiatos', label: '2. Regra dos Hiatos e Ditongos Abertos' },
            { id: 'acordo', label: '3. Mudanças do Acordo Ortográfico' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === 'geral' && (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Proparoxítonas */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
                  <h4 className="m-0 text-sm font-black text-teal-950">1. Proparoxítonas</h4>
                  <span className="rounded bg-teal-200/80 px-1.5 py-0.5 text-[10px] font-bold text-teal-900">
                    100% Acentuadas
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-700 font-medium">
                  Antepenúltima sílaba tônica. Todas as proparoxítonas da língua portuguesa recebem acento gráfico.
                </p>
                <div className="mt-3 rounded-lg border border-teal-200 bg-white p-2 text-xs text-teal-950 font-mono">
                  médico, lâmpada, árvore, matemática, déficit
                </div>
              </div>
            </div>

            {/* Paroxítonas */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <h4 className="m-0 text-sm font-black text-blue-950">2. Paroxítonas</h4>
                  <span className="rounded bg-blue-200/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                    R-U-X-I-N-H-O-L
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-700 font-medium">
                  Penúltima sílaba tônica. Acentuam-se as terminadas em: <strong>R, X, N, L, I(s), US, UM, UNS, PS, Ditongos orais</strong>.
                </p>
                <div className="mt-3 rounded-lg border border-blue-200 bg-white p-2 text-xs text-blue-950 font-mono">
                  fóssil, caráter, tórax, júri, vírus, órgão, série, história
                </div>
              </div>
            </div>

            {/* Oxítonas & Monossílabos */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <h4 className="m-0 text-sm font-black text-emerald-950">3. Oxítonas & Monossílabos</h4>
                  <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                    A, E, O (EM/ENS)
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-700 font-medium">
                  Última sílaba tônica. Acentuam-se as terminadas em: <strong>A(s), E(s), O(s), EM, ENS</strong>.
                </p>
                <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-2 text-xs text-emerald-950 font-mono">
                  sofá, café, cipó, alguém, parabéns / pá, pé, pó
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hiatos' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-4">
              <h4 className="m-0 text-sm font-black text-teal-950 border-b border-teal-200/60 pb-2">
                Regra Canônica dos Hiatos (I e U)
              </h4>
              <p className="mt-2.5 text-xs text-slate-700 leading-relaxed font-medium">
                Acentuam-se a segunda vogal dos hiatos quando for <strong>I</strong> ou <strong>U</strong> tônico, sozinho na sílaba (ou com "S"), desde que não seja seguido de "NH".
              </p>
              <div className="mt-3 space-y-2 text-xs font-mono">
                <div className="rounded bg-white p-2 border border-slate-200 text-teal-950">
                  ✅ <strong>Com acento:</strong> sa-ú-de, pa-ís, ba-ú, sa-í-da, e-go-ís-mo
                </div>
                <div className="rounded bg-white p-2 border border-slate-200 text-rose-950">
                  🚫 <strong>Sem acento:</strong> ra-i-nha (seguido de NH), ju-iz (com Z), ru-im (com M)
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
              <h4 className="m-0 text-sm font-black text-amber-950 border-b border-amber-200/60 pb-2">
                Ditongos Abertos (ÉI, ÉU, ÓI)
              </h4>
              <p className="mt-2.5 text-xs text-slate-700 leading-relaxed font-medium">
                Acentuam-se os ditongos abertos <strong>ÉI, ÉU, ÓI</strong> apenas quando estiverem em palavras <strong>oxítonas</strong> ou monossílabos tônicos.
              </p>
              <div className="mt-3 space-y-2 text-xs font-mono">
                <div className="rounded bg-white p-2 border border-slate-200 text-amber-950">
                  ✅ <strong>Oxítonas (Mantêm):</strong> tro-féu, he-rói, a-néis, pas-sóis, céu
                </div>
                <div className="rounded bg-white p-2 border border-slate-200 text-slate-800">
                  ⚠️ <strong>Paroxítonas (Perderam):</strong> i-dei-a, pla-tei-a, he-roi-co, ji-boi-a
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'acordo' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="m-0 text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
                O que NÃO se acentua mais após o Acordo Ortográfico (Pegadinhas Frequentes de Prova):
              </h4>
              <ul className="grid gap-2 sm:grid-cols-3 pl-0 text-xs text-slate-800 font-medium">
                <li className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <strong>Ditongo aberto em paroxítonas:</strong> <em>ideia, assembleia, heroico, coreia</em>.
                </li>
                <li className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <strong>Vogais dobradas EE / OO:</strong> <em>leem, veem, creem, deem, voo, enjoo</em>.
                </li>
                <li className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <strong>Acento diferencial comum:</strong> <em>para (verbo), pelo (subst.), pera, polo</em>.
                  <div className="mt-1 text-slate-500 font-normal">Exceções mantidas: <em>pôde (pretérito) / pode (presente)</em> e <em>pôr (verbo) / por (prep.)</em>.</div>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
