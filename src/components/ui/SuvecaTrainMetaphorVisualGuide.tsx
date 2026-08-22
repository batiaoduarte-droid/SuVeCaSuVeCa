import React, { useState } from 'react';
import { Train, Layers, ArrowDown, Sparkles, CheckCircle2, ChevronRight, Compass } from 'lucide-react';

interface TrainScale {
  id: number;
  scaleNumber: string;
  name: string;
  metaphor: string;
  domain: string;
  badge: string;
  badgeTone: string;
  activeBtnStyle: string;
  inactiveBtnStyle: string;
  activeTagStyle: string;
  inactiveTagStyle: string;
  activeDot: string;
  inactiveDot: string;
  color: string;
  description: string;
  keyQuestion: string;
  example: string;
  suvecaRole: string;
}

const TRAIN_SCALES: TrainScale[] = [
  {
    id: 1,
    scaleNumber: 'Escala 1',
    name: 'Palavras',
    metaphor: 'Peças dos Vagões',
    domain: 'Morfologia Isolada',
    badge: 'Morfologia',
    badgeTone: 'border-slate-300 bg-slate-100 text-slate-800',
    activeBtnStyle: 'border-slate-700 bg-slate-800 text-white shadow-sm ring-2 ring-slate-400/50',
    inactiveBtnStyle: 'border-slate-200 bg-slate-50/60 text-slate-900 hover:border-slate-300 hover:bg-slate-100/70',
    activeTagStyle: 'text-slate-300',
    inactiveTagStyle: 'text-slate-700',
    activeDot: 'bg-slate-300',
    inactiveDot: 'bg-slate-400',
    color: 'from-slate-700 to-slate-900',
    description: 'Cada palavra possui uma classe morfológica (substantivo, adjetivo, pronome, verbo, preposição, advérbio).',
    keyQuestion: 'O que a palavra é isoladamente no dicionário?',
    example: '"auditores" (substantivo), "novos" (adjetivo), "entregaram" (verbo), "ontem" (advérbio).',
    suvecaRole: 'Define a natureza da peça, mas ainda não determina seu papel na frase.',
  },
  {
    id: 2,
    scaleNumber: 'Escala 2',
    name: 'Sintagmas',
    metaphor: 'Vagões Estruturados',
    domain: 'Sintaxe de Grupo',
    badge: 'Sintagma',
    badgeTone: 'border-sky-300 bg-sky-100 text-sky-900',
    activeBtnStyle: 'border-sky-700 bg-sky-800 text-white shadow-sm ring-2 ring-sky-400/50',
    inactiveBtnStyle: 'border-sky-200 bg-sky-50/60 text-sky-950 hover:border-sky-300 hover:bg-sky-100/70',
    activeTagStyle: 'text-sky-300',
    inactiveTagStyle: 'text-sky-800',
    activeDot: 'bg-sky-300',
    inactiveDot: 'bg-sky-400',
    color: 'from-sky-700 to-sky-900',
    description: 'As palavras se organizam em blocos articulados em torno de um núcleo (Sintagma Nominal, Preposicional ou Verbal).',
    keyQuestion: 'Quem é o núcleo do grupo e quais termos o modificam?',
    example: '[Os novos auditores concursados] = Núcleo "auditores" + determinantes/adjetivos.',
    suvecaRole: 'Forma os blocos individuais que serão acoplados ao motor verbal.',
  },
  {
    id: 3,
    scaleNumber: 'Escala 3',
    name: 'Oração',
    metaphor: 'O Trem com Motor Verbal',
    domain: 'O Mapa SuVeCA Canônico',
    badge: 'Método Central',
    badgeTone: 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold',
    activeBtnStyle: 'border-emerald-700 bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-400/50',
    inactiveBtnStyle: 'border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100/70',
    activeTagStyle: 'text-emerald-300',
    inactiveTagStyle: 'text-emerald-800',
    activeDot: 'bg-emerald-300',
    inactiveDot: 'bg-emerald-500',
    color: 'from-teal-800 to-emerald-950',
    description: 'O VERBO É A LOCOMOTIVA: ele traciona a oração, comanda a concordância com o Sujeito e rege seus Complementos, Adjuntos e Predicativos.',
    keyQuestion: 'Qual verbo comanda a predicação e quais termos se vinculam a ele?',
    example: 'Ontem (A), os auditores (Su) entregaram (Ve) o relatório (C/OD) à diretoria (C/OI).',
    suvecaRole: 'A escala fundamental do Método SuVeCA: Sujeito + Verbo + Complemento + Adjunto + Predicativo.',
  },
  {
    id: 4,
    scaleNumber: 'Escala 4',
    name: 'Período Composto',
    metaphor: 'Trens Acoplados por Engates',
    domain: 'Sintaxe do Período',
    badge: 'Interoracional',
    badgeTone: 'border-indigo-300 bg-indigo-100 text-indigo-900',
    activeBtnStyle: 'border-indigo-700 bg-indigo-800 text-white shadow-sm ring-2 ring-indigo-400/50',
    inactiveBtnStyle: 'border-indigo-200 bg-indigo-50/60 text-indigo-950 hover:border-indigo-300 hover:bg-indigo-100/70',
    activeTagStyle: 'text-indigo-300',
    inactiveTagStyle: 'text-indigo-800',
    activeDot: 'bg-indigo-300',
    inactiveDot: 'bg-indigo-400',
    color: 'from-indigo-800 to-indigo-950',
    description: 'Cada oração possui sua própria locomotiva (verbo) e seu próprio mapa SuVeCA. Conjunções e pronomes relativos atuam como engates entre os trens.',
    keyQuestion: 'Quantas orações há no período e qual conector as une?',
    example: '[Os fiscais entregaram o parecer (Oração 1)] quando [a sessão foi aberta (Oração 2)].',
    suvecaRole: 'Uma SuVeCA independente para cada oração do período.',
  },
  {
    id: 5,
    scaleNumber: 'Escala 5',
    name: 'Texto e Discurso',
    metaphor: 'A Malha Ferroviária Completa',
    domain: 'Coesão, Semântica e Sentido',
    badge: 'Discursivo',
    badgeTone: 'border-purple-300 bg-purple-100 text-purple-900',
    activeBtnStyle: 'border-purple-700 bg-purple-800 text-white shadow-sm ring-2 ring-purple-400/50',
    inactiveBtnStyle: 'border-purple-200 bg-purple-50/60 text-purple-950 hover:border-purple-300 hover:bg-purple-100/70',
    activeTagStyle: 'text-purple-300',
    inactiveTagStyle: 'text-purple-800',
    activeDot: 'bg-purple-300',
    inactiveDot: 'bg-purple-400',
    color: 'from-purple-800 to-purple-950',
    description: 'Os períodos circulam por uma malha integrada: pronomes anafóricos, paralelismo, progressão temática, coerência e estratégias argumentativas conectam todo o texto.',
    keyQuestion: 'Como as ideias progridem e se amarram do início ao fim do texto?',
    example: 'Conectivos interparágrafos, elipses coesivas e operadores argumentativos que estruturam a redação.',
    suvecaRole: 'Eleva a análise pontual da oração ao domínio global do texto e das questões de interpretação.',
  },
];

export const SuvecaTrainMetaphorVisualGuide: React.FC = () => {
  const [selectedScaleId, setSelectedScaleId] = useState<number>(3);
  const activeScale = TRAIN_SCALES.find((s) => s.id === selectedScaleId) || TRAIN_SCALES[2];

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-xs transition">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-linear-to-r from-teal-950 via-teal-900 to-emerald-950 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800/80 text-teal-200 ring-1 ring-white/20">
            <Train className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base sm:text-lg font-black tracking-tight text-white !text-white">
              A Metáfora do Trem: As 5 Escalas da Língua
            </h3>
            <p className="m-0 text-xs text-teal-200 font-medium !text-teal-200">
              Da peça morfológica isolada à malha discursiva completa
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-100 ring-1 ring-white/20">
          Analogia Estrutural SuVeCA
        </span>
      </div>

      {/* Railway Navigation Track */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TRAIN_SCALES.map((scale) => {
            const isSelected = scale.id === selectedScaleId;
            return (
              <button
                key={scale.id}
                type="button"
                onClick={() => setSelectedScaleId(scale.id)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  isSelected ? scale.activeBtnStyle : scale.inactiveBtnStyle
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      isSelected ? scale.activeTagStyle : scale.inactiveTagStyle
                    }`}
                  >
                    {scale.scaleNumber}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isSelected ? scale.activeDot : scale.inactiveDot
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-black truncate w-full ${
                    isSelected ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {scale.name}
                </span>
                <span
                  className={`text-[11px] truncate w-full ${
                    isSelected ? 'text-white/80 font-medium' : 'text-slate-500'
                  }`}
                >
                  {scale.metaphor}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Scale Spotlight Card */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="rounded-2xl border border-teal-100 bg-linear-to-br from-teal-50/60 via-white to-sky-50/40 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${activeScale.badgeTone}`}>
                  {activeScale.badge} · {activeScale.scaleNumber}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {activeScale.domain}
                </span>
              </div>
              <h4 className="text-xl font-black text-slate-950">
                {activeScale.name} — <span className="text-teal-800">{activeScale.metaphor}</span>
              </h4>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-900 shadow-2xs">
              <Compass className="h-4 w-4 text-teal-700" />
              <span>Pergunta-Chave</span>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-800">
            {activeScale.description}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-sky-900">
                Pergunta de Análise Mental:
              </p>
              <p className="text-xs font-bold text-slate-900 italic">
                “{activeScale.keyQuestion}”
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                Papel no Método SuVeCA:
              </p>
              <p className="text-xs font-medium text-slate-800">
                {activeScale.suvecaRole}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-900">
              Exemplo Concreto:
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-950 font-mono">
              {activeScale.example}
            </p>
          </div>
        </div>

        {/* Golden rule callout */}
        <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 text-xs text-slate-700">
          <Sparkles className="h-5 w-5 shrink-0 text-teal-700 mt-0.5" />
          <div>
            <strong className="font-bold text-teal-950">Mantra da Metáfora:</strong> Morfologia responde: <em>"O que a palavra é isoladamente?"</em>. Sintaxe responde: <em>"O que o grupo de palavras faz na oração tracionada pelo verbo?"</em>. Nunca confunda classe morfológica com função sintática!
          </div>
        </div>
      </div>
    </div>
  );
};
