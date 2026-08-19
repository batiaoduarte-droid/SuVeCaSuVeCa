import React from 'react';
import { Binary, MinusCircle, PlusCircle, ArrowDown } from 'lucide-react';

export const WordStructureVisualGuide: React.FC = () => {
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/60 text-emerald-300 ring-1 ring-white/20">
            <Binary className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-bold tracking-tight text-white">
              Estrutura da Palavra: Plano Gráfico vs Plano Fonético
            </h3>
            <p className="m-0 text-xs text-teal-100/80">
              Relação Matemática Fundamental entre Letras (Grafemas) e Fonemas (Sons)
            </p>
          </div>
        </div>
        <span className="rounded-full bg-teal-800/80 px-3 py-1 text-xs font-bold text-teal-200 ring-1 ring-teal-500/30">
          Equação: F = L - Redutores + Ampliadores
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Nível 1: Os 2 Planos */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
              Dimensão Visual Escrita
            </span>
            <h4 className="mt-1 text-sm font-black text-blue-950">Plano Gráfico ($L$)</h4>
            <p className="mt-1 text-xs text-slate-600 font-medium">
              Letras e Grafemas visíveis no papel ou na tela.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Dimensão Auditiva Sonora
            </span>
            <h4 className="mt-1 text-sm font-black text-emerald-950">Plano Fonético ($F$)</h4>
            <p className="mt-1 text-xs text-slate-600 font-medium">
              Fonemas emitidos e percebidos acusticamente na fala.
            </p>
          </div>
        </div>

        {/* Nível 2: Relação Padrão */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Relação Matemática Padrão
          </span>
          <div className="mt-1 text-base font-black text-teal-900">
            $L = F$ &nbsp;(1 Letra = 1 Som)
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Regra geral para a imensa maioria dos vocábulos na ausência de dígrafos, dífono do X ou H mudo.
          </p>
        </div>

        {/* Nível 3: As Duas Variações */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Caso 1: Redução */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
            <div className="flex items-center gap-2 border-b border-rose-200/60 pb-2 text-rose-900">
              <MinusCircle className="h-4 w-4 text-rose-600" />
              <h5 className="m-0 text-xs sm:text-sm font-black uppercase">
                Caso 1: Redução (-1 Fonema por Ocorrência)
              </h5>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-slate-800">
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 mt-1 rounded-full bg-rose-500 shrink-0" />
                <span><strong>Dígrafos Consonantais:</strong> <em>ch, lh, nh, rr, ss, sc, xc, gu, qu</em> (2L = 1F).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 mt-1 rounded-full bg-rose-500 shrink-0" />
                <span><strong>Dígrafos Vocálicos:</strong> <em>am, em, im, om, um / an, en, in, on, un</em>.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 mt-1 rounded-full bg-rose-500 shrink-0" />
                <span><strong>Letra H Inicial Mudo:</strong> <em>hoje</em> (4L, 3F), <em>hora</em> (4L, 3F), <em>hábito</em> (6L, 5F).</span>
              </li>
            </ul>
          </div>

          {/* Caso 2: Aumento */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="flex items-center gap-2 border-b border-emerald-200/60 pb-2 text-emerald-900">
              <PlusCircle className="h-4 w-4 text-emerald-600" />
              <h5 className="m-0 text-xs sm:text-sm font-black uppercase">
                Caso 2: Aumento (+1 Fonema por Ocorrência)
              </h5>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-slate-800">
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 mt-1 rounded-full bg-emerald-500 shrink-0" />
                <span><strong>Dífono da Letra X (som /ks/):</strong> Uma única letra condensando dois fonemas simultâneos (/k/ + /s/).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 mt-1 rounded-full bg-emerald-500 shrink-0" />
                <span><strong>Exemplos Clássicos:</strong> <em>táxi</em> (4L, 5F), <em>fixo</em> (4L, 5F), <em>tórax</em> (5L, 6F), <em>complexo</em> (8L, 9F).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 mt-1 rounded-full bg-emerald-500 shrink-0" />
                <span><strong>Fórmula do Dífono:</strong> $F = L + 1$.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
