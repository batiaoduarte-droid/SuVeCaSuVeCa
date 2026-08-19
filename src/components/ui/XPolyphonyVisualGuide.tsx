import React from 'react';
import { Mic, CheckCircle2, AlertCircle } from 'lucide-react';

export const XPolyphonyVisualGuide: React.FC = () => {
  const sounds = [
    {
      sound: '/s/',
      formula: '1L = 1F',
      relation: 'Relação 1:1',
      description: 'Som sibilante surdo (como em sapo / sintaxe).',
      examples: ['experiência', 'exceder', 'excelente', 'sintaxe', 'texto', 'extensão'],
      impact: 'Neutro (L = F)',
      isDifono: false,
    },
    {
      sound: '/z/',
      formula: '1L = 1F',
      relation: 'Relação 1:1',
      description: 'Ocorre em posição intervocálica (entre duas vogais).',
      examples: ['exílio', 'exemplo', 'exame', 'inexorável', 'exato', 'executar'],
      impact: 'Neutro (L = F)',
      isDifono: false,
    },
    {
      sound: '/ʃ/ (som de CH)',
      formula: '1L = 1F',
      relation: 'Relação 1:1',
      description: 'Som palatal fricativo (como em chave / chuva).',
      examples: ['caixa', 'mexer', 'mexicano', 'enxada', 'lixo', 'faixa'],
      impact: 'Neutro (L = F)',
      isDifono: false,
    },
    {
      sound: '/ks/ (Dífono)',
      formula: '1L = 2F',
      relation: 'DÍFONO (F = L + 1)',
      description: 'A letra X condensa dois fonemas consonantais (/k/ + /s/).',
      examples: ['táxi', 'fixo', 'tórax', 'complexo', 'látex', 'nexo', 'crucifixo', 'anexo'],
      impact: '+1 Fonema (Aumento)',
      isDifono: true,
    },
  ];

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/60 text-emerald-300 ring-1 ring-white/20">
            <Mic className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base font-bold tracking-tight text-white">
              Quadro Canônico da Polifonia da Letra X
            </h3>
            <p className="m-0 text-xs text-teal-100/80">
              As 4 realizações fonéticas do X e seu impacto na contagem de fonemas
            </p>
          </div>
        </div>
        <span className="rounded-full bg-teal-800/80 px-3 py-1 text-xs font-bold text-teal-200 ring-1 ring-teal-500/30">
          4 Sons Distintos
        </span>
      </div>

      <div className="grid gap-3.5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {sounds.map((item, idx) => (
          <div
            key={idx}
            className={`flex flex-col justify-between rounded-xl border p-4 transition ${
              item.isDifono
                ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/60 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-black text-teal-950">
                  Som de <strong className="text-sm font-mono text-teal-700">{item.sound}</strong>
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    item.isDifono
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.formula}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-600 leading-relaxed font-medium">
                {item.description}
              </p>

              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Vocábulos Frequentes:
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.examples.map((ex) => (
                    <span
                      key={ex}
                      className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-200"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`mt-4 rounded-lg p-2 text-center text-xs font-bold ${
                item.isDifono
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-200/80 text-slate-800'
              }`}
            >
              {item.impact}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
