import React, { useState } from 'react';
import { Palette, CheckCircle2, ArrowRight, Sparkles, HelpCircle, Eye } from 'lucide-react';

interface BlockDefinition {
  tag: string;
  name: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  accentBg: string;
  description: string;
  keyQuestion: string;
  sampleToken: string;
}

const BLOCKS_DATA: BlockDefinition[] = [
  {
    tag: 'Su',
    name: 'Sujeito',
    badgeBg: 'bg-blue-600 text-white',
    textColor: 'text-blue-950',
    borderColor: 'border-blue-300',
    accentBg: 'bg-blue-50/70',
    description: 'Termo sobre o qual se declara algo e com o qual o verbo concorda em número e pessoa.',
    keyQuestion: 'Com quem o verbo concorda?',
    sampleToken: 'os auditores da Receita',
  },
  {
    tag: 'Ve',
    name: 'Verbo / Predicação',
    badgeBg: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-950',
    borderColor: 'border-emerald-300',
    accentBg: 'bg-emerald-50/70',
    description: 'Núcleo da predicação e motor relacional da oração. Rege complementos e comanda o sujeito.',
    keyQuestion: 'Qual é o motor da ação/estado?',
    sampleToken: 'entregaram',
  },
  {
    tag: 'C',
    name: 'Complementos (OD / OI / CN)',
    badgeBg: 'bg-amber-500 text-white',
    textColor: 'text-amber-950',
    borderColor: 'border-amber-300',
    accentBg: 'bg-amber-50/70',
    description: 'Termos que completam o sentido do verbo (Objeto Direto / Indireto) ou do substantivo/adjetivo/advérbio (Complemento Nominal).',
    keyQuestion: 'Completa o verbo com ou sem preposição?',
    sampleToken: 'o relatório preliminar / ao superintendente',
  },
  {
    tag: 'A',
    name: 'Adjuntos (Adverbiais e Adnominais)',
    badgeBg: 'bg-purple-600 text-white',
    textColor: 'text-purple-950',
    borderColor: 'border-purple-300',
    accentBg: 'bg-purple-50/70',
    description: 'Circunstâncias acessórias (tempo, lugar, modo, causa) ou modificadores nominais secundários.',
    keyQuestion: 'Que circunstância acessória modifica o termo?',
    sampleToken: 'Ontem à noite (Aadv deslocado)',
  },
  {
    tag: 'Pred',
    name: 'Predicativo (do Sujeito / Objeto)',
    badgeBg: 'bg-pink-600 text-white',
    textColor: 'text-pink-950',
    borderColor: 'border-pink-300',
    accentBg: 'bg-pink-50/70',
    description: 'Atribuição de estado, qualidade transitória ou característica ao sujeito ou ao objeto por intermédio do verbo.',
    keyQuestion: 'Há característica atribuída pelo verbo?',
    sampleToken: 'muito satisfeitos',
  },
  {
    tag: 'Con',
    name: 'Conectores / Nexos',
    badgeBg: 'bg-teal-700 text-white',
    textColor: 'text-teal-950',
    borderColor: 'border-teal-300',
    accentBg: 'bg-teal-50/70',
    description: 'Conjunções e pronomes relativos que articulam orações coordenadas ou subordinadas.',
    keyQuestion: 'Qual relação lógica une as orações?',
    sampleToken: 'quando, que, embora, mas, portanto',
  },
  {
    tag: 'Ap/Voc',
    name: 'Aposto e Vocativo',
    badgeBg: 'bg-cyan-700 text-white',
    textColor: 'text-cyan-950',
    borderColor: 'border-cyan-300',
    accentBg: 'bg-cyan-50/70',
    description: 'Aposto: explicação/especificação de termo antecedente. Vocativo: chamamento direto independente.',
    keyQuestion: 'Explica termo anterior ou invoca interlocutor?',
    sampleToken: 'presidente do conselho (Aposto) / Senhores (Vocativo)',
  },
];

interface SentenceToken {
  text: string;
  tag: string;
  role: string;
  badgeBg: string;
  borderColor: string;
  bgLight: string;
  explanation: string;
}

const SAMPLE_SENTENCE_TOKENS: SentenceToken[] = [
  {
    text: 'Ontem à noite,',
    tag: 'Aadv',
    role: 'Adjunto Adverbial de Tempo Deslocado',
    badgeBg: 'bg-purple-600 text-white',
    borderColor: 'border-purple-300',
    bgLight: 'bg-purple-50 text-purple-950',
    explanation: 'Adjunto adverbial temporal de longa extensão deslocado para o início da oração → Exige atenção para pontuação (vírgula recomendada/obrigatória)!',
  },
  {
    text: 'os auditores da Receita',
    tag: 'Su',
    role: 'Sujeito Determinado Simples',
    badgeBg: 'bg-blue-600 text-white',
    borderColor: 'border-blue-300',
    bgLight: 'bg-blue-50 text-blue-950',
    explanation: 'Núcleo do sujeito: "auditores" (plural) → Comanda obrigatoriamente a flexão do verbo "entregaram" na 3ª pessoa do plural.',
  },
  {
    text: 'entregaram',
    tag: 'Ve',
    role: 'Verbo Transitivo Direto e Indireto (VTDI)',
    badgeBg: 'bg-emerald-600 text-white',
    borderColor: 'border-emerald-300',
    bgLight: 'bg-emerald-50 text-emerald-950',
    explanation: 'Núcleo verbal da predicação: rege dois complementos obrigatórios — um direto (sem preposição) e outro indireto (com preposição).',
  },
  {
    text: 'o relatório preliminar',
    tag: 'C/OD',
    role: 'Objeto Direto',
    badgeBg: 'bg-amber-500 text-white',
    borderColor: 'border-amber-300',
    bgLight: 'bg-amber-50 text-amber-950',
    explanation: 'Complemento verbal sem preposição regido por "entregaram" (entregaram o quê?). Proibido separar do verbo por vírgula!',
  },
  {
    text: 'ao superintendente',
    tag: 'C/OI',
    role: 'Objeto Indireto',
    badgeBg: 'bg-amber-500 text-white',
    borderColor: 'border-amber-300',
    bgLight: 'bg-amber-50 text-amber-950',
    explanation: 'Complemento verbal preposicionado regido pela preposição "a" exigida pelo verbo (entregaram a quem?).',
  },
  {
    text: 'muito satisfeitos.',
    tag: 'Pred',
    role: 'Predicativo do Sujeito',
    badgeBg: 'bg-pink-600 text-white',
    borderColor: 'border-pink-300',
    bgLight: 'bg-pink-50 text-pink-950',
    explanation: 'Estado/qualidade atribuído aos "auditores" no momento da entrega da ação verbal → Concorda em gênero e número com o sujeito (plural).',
  },
];

export const SuvecaColorCodeVisualGuide: React.FC = () => {
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(0);

  const activeToken = selectedTokenIndex !== null ? SAMPLE_SENTENCE_TOKENS[selectedTokenIndex] : null;

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-xs transition">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-linear-to-r from-teal-950 via-teal-900 to-emerald-950 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800/80 text-teal-200 ring-1 ring-white/20">
            <Palette className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base sm:text-lg font-black tracking-tight text-white !text-white">
              O Código Cromático Tático SuVeCA
            </h3>
            <p className="m-0 text-xs text-teal-200 font-medium !text-teal-200">
              Taxonomia visual padronizada para identificar a função de cada termo na oração
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-100 ring-1 ring-white/20">
          Código Visual
        </span>
      </div>

      {/* Grid of Blocks */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BLOCKS_DATA.map((block) => (
            <div
              key={block.tag}
              className={`flex flex-col justify-between rounded-xl border ${block.borderColor} ${block.accentBg} p-3.5 shadow-2xs`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{block.name}</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-black font-mono shadow-2xs ${block.badgeBg}`}>
                    {block.tag}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {block.description}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500">Pergunta-chave:</span>
                <span className="font-bold text-slate-800 italic">{block.keyQuestion}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Sentence Breakdown */}
        <div className="rounded-2xl border border-teal-200 bg-linear-to-br from-teal-50/50 via-white to-sky-50/30 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-teal-700" />
              <h4 className="m-0 text-sm font-black text-teal-950 uppercase tracking-wide">
                Exemplo de Desmembramento Visual Interativo
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Clique em qualquer termo para inspecionar
            </span>
          </div>

          {/* Interactive Tokens Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs">
            {SAMPLE_SENTENCE_TOKENS.map((token, idx) => {
              const isSelected = idx === selectedTokenIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedTokenIndex(idx)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    isSelected
                      ? 'border-teal-700 bg-teal-900 text-white shadow-xs ring-2 ring-teal-500/40'
                      : `${token.borderColor} ${token.bgLight} hover:opacity-90`
                  }`}
                >
                  <span className={`inline-flex rounded px-1.5 py-0.2 text-[10px] font-mono font-black ${token.badgeBg}`}>
                    {token.tag}
                  </span>
                  <span>{token.text.trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Active Token Explanation */}
          {activeToken && (
            <div className="rounded-xl border border-teal-200 bg-white p-4 shadow-2xs space-y-2 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-mono font-black ${activeToken.badgeBg}`}>
                    {activeToken.tag}
                  </span>
                  <strong className="text-sm font-black text-slate-900">{activeToken.role}</strong>
                </div>
                <span className="text-xs font-mono font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                  “{activeToken.text.trim()}”
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                {activeToken.explanation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
