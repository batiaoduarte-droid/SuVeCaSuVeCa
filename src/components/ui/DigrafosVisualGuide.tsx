import React from 'react';
import { Layers, CheckCircle2, Split } from 'lucide-react';

export const DigrafosVisualGuide: React.FC = () => {
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/60 text-emerald-300 ring-1 ring-white/20">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-bold tracking-tight text-white">
              Quadro Canônico de Dígrafos
            </h3>
            <p className="m-0 text-xs text-teal-100/80">
              Classificação estrita: 2 Letras = 1 Único Fonema (Impacto: -1 na contagem fonética)
            </p>
          </div>
        </div>
        <span className="rounded-full bg-teal-800/80 px-3 py-1 text-xs font-bold text-teal-200 ring-1 ring-teal-500/30">
          $2L \rightarrow 1F$
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
        {/* Coluna 1: Dígrafos Consonantais */}
        <div className="flex flex-col justify-between rounded-xl border border-teal-200/80 bg-teal-50/30 p-4">
          <div>
            <div className="flex items-center justify-between border-b border-teal-200/60 pb-2.5">
              <h4 className="m-0 text-sm font-black text-teal-950">
                1. Dígrafos Consonantais
              </h4>
              <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                Som de Consoante
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-700 leading-relaxed font-medium">
              Duas letras que se unem para emitir um único som consonantal.
            </p>

            <div className="mt-3 space-y-2.5">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Inseparáveis na Sílaba:</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-800">
                  <strong>CH</strong> (<em>chave</em> /ʃ/), <strong>LH</strong> (<em>filho</em> /ʎ/), <strong>NH</strong> (<em>ninho</em> /ɲ/), <strong>GU</strong> (<em>guerra</em> /g/), <strong>QU</strong> (<em>quilo</em> /k/)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <Split className="h-3.5 w-3.5 text-amber-600" />
                  <span>Separáveis na Divisão Silábica:</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-800">
                  <strong>RR</strong> (<em>car-ro</em>), <strong>SS</strong> (<em>pas-so</em>), <strong>SC</strong> (<em>nas-cer</em>), <strong>SÇ</strong> (<em>nas-ça</em>), <strong>XC</strong> (<em>ex-ce-to</em>), <strong>XS</strong> (<em>ex-su-dar</em>)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-teal-100/60 p-2 text-[11px] text-teal-950 font-medium">
            <strong>Atenção GU/QU:</strong> Só são dígrafos quando o <em>"U"</em> não é pronunciado (diante de E ou I). Em <em>"água"</em> ou <em>"cinquenta"</em>, o <em>"U"</em> soa e NÃO há dígrafo.
          </div>
        </div>

        {/* Coluna 2: Dígrafos Vocálicos */}
        <div className="flex flex-col justify-between rounded-xl border border-teal-200/80 bg-teal-50/30 p-4">
          <div>
            <div className="flex items-center justify-between border-b border-teal-200/60 pb-2.5">
              <h4 className="m-0 text-sm font-black text-teal-950">
                2. Dígrafos Vocálicos (Nasais)
              </h4>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Vogal Nasalizada
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-700 leading-relaxed font-medium">
              Vogal seguida de <strong>M</strong> ou <strong>N</strong> na mesma sílaba, em que a consoante atua apenas como indicador de nasalização (equivalente a um til ~).
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <span className="font-bold text-teal-900">AM / AN</span>
                <p className="mt-0.5 text-slate-600 text-[11px]">c<strong>am</strong>po, c<strong>an</strong>to [ã]</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <span className="font-bold text-teal-900">EM / EN</span>
                <p className="mt-0.5 text-slate-600 text-[11px]">t<strong>em</strong>po, v<strong>en</strong>to [ẽ]</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <span className="font-bold text-teal-900">IM / IN</span>
                <p className="mt-0.5 text-slate-600 text-[11px]">l<strong>im</strong>bo, l<strong>in</strong>do [ĩ]</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <span className="font-bold text-teal-900">OM / ON</span>
                <p className="mt-0.5 text-slate-600 text-[11px]"><strong>om</strong>bro, <strong>on</strong>da [õ]</p>
              </div>
              <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-2.5">
                <span className="font-bold text-teal-900">UM / UN</span>
                <p className="mt-0.5 text-slate-600 text-[11px]">t<strong>um</strong>ba, m<strong>un</strong>do [ũ]</p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-emerald-100/60 p-2 text-[11px] text-emerald-950 font-medium">
            <strong>Dígrafo vs Ditongo Nasal:</strong> No final da palavra, <em>-AM</em> e <em>-EM</em> (ex.: <em>falam</em>, <em>cantam</em>, <em>também</em>) produzem dois sons vocálicos ([ãw] / [ẽj]) e são <strong>ditongos nasais</strong>, não dígrafos.
          </div>
        </div>
      </div>
    </div>
  );
};
