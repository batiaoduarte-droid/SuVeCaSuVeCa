import React, { useState } from 'react';
import { Map, CheckCircle2, ArrowRight, BookOpen, Layers, Sparkles, Compass } from 'lucide-react';

interface CurriculumLayer {
  layerNum: string;
  name: string;
  modules: string;
  roleBadge: string;
  roleBadgeColor: string;
  activeBtnStyle: string;
  inactiveBtnStyle: string;
  activeTagStyle: string;
  inactiveTagStyle: string;
  activeDot: string;
  inactiveDot: string;
  cardTone: string;
  summary: string;
  suvecaIntegration: string;
}

const CURRICULUM_LAYERS: CurriculumLayer[] = [
  {
    layerNum: 'Camada 1',
    name: 'Forma e Ortografia',
    modules: 'Aula 00 (Ortografia e Fonética)',
    roleBadge: 'Camada Própria',
    roleBadgeColor: 'border-slate-300 bg-slate-100 text-slate-900 font-bold',
    activeBtnStyle: 'border-slate-700 bg-slate-800 text-white shadow-sm ring-2 ring-slate-400/50',
    inactiveBtnStyle: 'border-slate-200 bg-slate-50/60 text-slate-900 hover:border-slate-300 hover:bg-slate-100/70',
    activeTagStyle: 'text-slate-300',
    inactiveTagStyle: 'text-slate-700',
    activeDot: 'bg-slate-300',
    inactiveDot: 'bg-slate-400',
    cardTone: 'border-slate-200 bg-slate-50/60',
    summary: 'Posição silábica, encontros vocálicos, dígrafos, acentuação gráfica e emprego do hífen.',
    suvecaIntegration: 'Princípio de Não-Intrusão: Regras fonológicas determinantes. A SuVeCA entra pontualmente no suporte contextual (porquês, pronomes enclíticos).',
  },
  {
    layerNum: 'Camada 2',
    name: 'Classes e Morfologia',
    modules: 'Aulas 01 a 03 (Substantivos, Adjetivos, Artigos, Pronomes)',
    roleBadge: 'Ponte Morfossintática',
    roleBadgeColor: 'border-sky-300 bg-sky-100 text-sky-950 font-bold',
    activeBtnStyle: 'border-sky-700 bg-sky-800 text-white shadow-sm ring-2 ring-sky-400/50',
    inactiveBtnStyle: 'border-sky-200 bg-sky-50/60 text-sky-950 hover:border-sky-300 hover:bg-sky-100/70',
    activeTagStyle: 'text-sky-300',
    inactiveTagStyle: 'text-sky-800',
    activeDot: 'bg-sky-300',
    inactiveDot: 'bg-sky-400',
    cardTone: 'border-sky-200 bg-sky-50/50',
    summary: 'Estrutura dos sintagmas, valores discursivos dos pronomes e flexão nominal.',
    suvecaIntegration: 'Conexão Forte: Mostra como as 10 classes morfológicas assumem os papéis sintáticos de Sujeito, Complementos e Modificadores.',
  },
  {
    layerNum: 'Camada 3',
    name: 'Verbos e Sintaxe da Oração',
    modules: 'Aulas 04 a 06 (Verbos, Vozes, Termos da Oração)',
    roleBadge: 'Método Central Absoluto',
    roleBadgeColor: 'border-emerald-300 bg-emerald-100 text-emerald-950 font-black',
    activeBtnStyle: 'border-emerald-700 bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-400/50',
    inactiveBtnStyle: 'border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100/70',
    activeTagStyle: 'text-emerald-300',
    inactiveTagStyle: 'text-emerald-800',
    activeDot: 'bg-emerald-300',
    inactiveDot: 'bg-emerald-500',
    cardTone: 'border-emerald-200 bg-emerald-50/50',
    summary: 'O motor relacional da oração, transitividade contextual, vozes verbais e os termos canônicos.',
    suvecaIntegration: 'Núcleo Central: O mapa Su–Ve–C–A–Pred em sua plenitude para desmembrar qualquer oração de prova.',
  },
  {
    layerNum: 'Camada 4',
    name: 'Relações Entre Orações',
    modules: 'Aula 07 (Período Composto: Coordenação e Subordinação)',
    roleBadge: 'Uma SuVeCA por Oração',
    roleBadgeColor: 'border-indigo-300 bg-indigo-100 text-indigo-950 font-bold',
    activeBtnStyle: 'border-indigo-700 bg-indigo-800 text-white shadow-sm ring-2 ring-indigo-400/50',
    inactiveBtnStyle: 'border-indigo-200 bg-indigo-50/60 text-indigo-950 hover:border-indigo-300 hover:bg-indigo-100/70',
    activeTagStyle: 'text-indigo-300',
    inactiveTagStyle: 'text-indigo-800',
    activeDot: 'bg-indigo-300',
    inactiveDot: 'bg-indigo-400',
    cardTone: 'border-indigo-200 bg-indigo-50/50',
    summary: 'Coordenação, orações substantivas, adjetivas e adverbiais com seus respectivos conectores.',
    suvecaIntegration: 'Conexão Interoracional: Cada oração possui sua própria locomotiva verbal. Conectivos atuam como engates entre trens.',
  },
  {
    layerNum: 'Camada 5',
    name: 'Pontuação, Concordância e Regência',
    modules: 'Aulas 08 a 10 (Pontuação, Concordância, Regência e Crase)',
    roleBadge: 'Aplicação Decisiva de Prova',
    roleBadgeColor: 'border-teal-300 bg-teal-100 text-teal-950 font-black',
    activeBtnStyle: 'border-teal-700 bg-teal-800 text-white shadow-sm ring-2 ring-teal-400/50',
    inactiveBtnStyle: 'border-teal-200 bg-teal-50/60 text-teal-950 hover:border-teal-300 hover:bg-teal-100/70',
    activeTagStyle: 'text-teal-300',
    inactiveTagStyle: 'text-teal-800',
    activeDot: 'bg-teal-300',
    inactiveDot: 'bg-teal-400',
    cardTone: 'border-teal-200 bg-teal-50/60',
    summary: 'Regra suprema da vírgula, concordância verbal/nominal, regência e casos decisivos de crase.',
    suvecaIntegration: 'Impacto Máximo: A aplicação do algoritmo dos 8 passos que resolve mais de 80% das questões normativas de concurso.',
  },
  {
    layerNum: 'Camada 6',
    name: 'Coesão e Semântica',
    modules: 'Aulas 11 e 12 (Coesão Textual, Relações Semânticas, Figuras)',
    roleBadge: 'Relações Interdiscursivas',
    roleBadgeColor: 'border-purple-300 bg-purple-100 text-purple-950 font-bold',
    activeBtnStyle: 'border-purple-700 bg-purple-800 text-white shadow-sm ring-2 ring-purple-400/50',
    inactiveBtnStyle: 'border-purple-200 bg-purple-50/60 text-purple-950 hover:border-purple-300 hover:bg-purple-100/70',
    activeTagStyle: 'text-purple-300',
    inactiveTagStyle: 'text-purple-800',
    activeDot: 'bg-purple-300',
    inactiveDot: 'bg-purple-400',
    cardTone: 'border-purple-200 bg-purple-50/50',
    summary: 'Mecanismos de referenciação anafórica/catafórica, conectores discursivos e efeitos semânticos.',
    suvecaIntegration: 'Apoio Estrutural: Eleva os vínculos da oração isolada para as amarrações do texto e coerência global.',
  },
  {
    layerNum: 'Camada 7',
    name: 'Texto e Discurso',
    modules: 'Aula 13 (Compreensão, Interpretação e Tipologias)',
    roleBadge: 'Domínio Discursivo',
    roleBadgeColor: 'border-rose-300 bg-rose-100 text-rose-950 font-bold',
    activeBtnStyle: 'border-rose-700 bg-rose-800 text-white shadow-sm ring-2 ring-rose-400/50',
    inactiveBtnStyle: 'border-rose-200 bg-rose-50/60 text-rose-950 hover:border-rose-300 hover:bg-rose-100/70',
    activeTagStyle: 'text-rose-300',
    inactiveTagStyle: 'text-rose-800',
    activeDot: 'bg-rose-300',
    inactiveDot: 'bg-rose-400',
    cardTone: 'border-rose-200 bg-rose-50/50',
    summary: 'Tipos textuais, gêneros, pressupostos, subentendidos e argumentação.',
    suvecaIntegration: 'Horizonte Final: Da estrutura do período ao domínio completo da interpretação de texto em bancas exigentes.',
  },
  {
    layerNum: 'Transversal',
    name: 'Revisão Geral Espiral',
    modules: 'Aula 14 (Revisão Geral Cumulativa & Diagnóstico)',
    roleBadge: 'Diagnóstico Transversal',
    roleBadgeColor: 'border-amber-300 bg-amber-100 text-amber-950 font-bold',
    activeBtnStyle: 'border-amber-700 bg-amber-800 text-white shadow-sm ring-2 ring-amber-400/50',
    inactiveBtnStyle: 'border-amber-200 bg-amber-50/60 text-amber-950 hover:border-amber-300 hover:bg-amber-100/70',
    activeTagStyle: 'text-amber-300',
    inactiveTagStyle: 'text-amber-800',
    activeDot: 'bg-amber-300',
    inactiveDot: 'bg-amber-400',
    cardTone: 'border-amber-200 bg-amber-50/50',
    summary: 'Consolidação de todo o currículo com recuperação ativa, flashcards e resolução de simulados.',
    suvecaIntegration: 'Bússola Tática: O SuVeCA como instrumento transversal de diagnóstico rápido e correção de gaps.',
  },
];

export const SuvecaCurriculumMapVisualGuide: React.FC = () => {
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(2);
  const activeLayer = CURRICULUM_LAYERS[selectedLayerIndex] || CURRICULUM_LAYERS[2];

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-xs transition">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-linear-to-r from-teal-950 via-teal-900 to-emerald-950 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800/80 text-teal-200 ring-1 ring-white/20">
            <Map className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base sm:text-lg font-black tracking-tight text-white !text-white">
              As 7 Camadas da Língua e o Mapa das 15 Aulas
            </h3>
            <p className="m-0 text-xs text-teal-200 font-medium !text-teal-200">
              Taxonomia curricular e papel didático do SuVeCA em cada módulo do curso
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-100 ring-1 ring-white/20">
          Mapa Curricular
        </span>
      </div>

      {/* Grid of Layers */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 sm:p-6">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {CURRICULUM_LAYERS.map((layer, idx) => {
            const isSelected = idx === selectedLayerIndex;
            return (
              <button
                key={layer.layerNum}
                type="button"
                onClick={() => setSelectedLayerIndex(idx)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition cursor-pointer ${
                  isSelected ? layer.activeBtnStyle : layer.inactiveBtnStyle
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? layer.activeTagStyle : layer.inactiveTagStyle}`}>
                    {layer.layerNum}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${isSelected ? layer.activeDot : layer.inactiveDot}`} />
                </div>
                <span className={`text-xs font-black truncate w-full ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {layer.name}
                </span>
                <span className={`text-[10px] truncate w-full ${isSelected ? 'text-white/80 font-medium' : 'text-slate-500'}`}>
                  {layer.modules}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Layer Details */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="rounded-2xl border border-teal-100 bg-linear-to-br from-teal-50/50 via-white to-sky-50/30 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-teal-100 pb-3">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800">
                {activeLayer.layerNum} · {activeLayer.modules}
              </span>
              <h4 className="text-lg font-black text-slate-950">
                {activeLayer.name}
              </h4>
            </div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs shadow-2xs ${activeLayer.roleBadgeColor}`}>
              {activeLayer.roleBadge}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">
                Conteúdo e Foco Gramatical:
              </p>
              <p className="text-xs leading-relaxed text-slate-800 font-medium">
                {activeLayer.summary}
              </p>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-teal-900">
                Papel Didático e Integração SuVeCA:
              </p>
              <p className="text-xs leading-relaxed text-teal-950 font-medium">
                {activeLayer.suvecaIntegration}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
