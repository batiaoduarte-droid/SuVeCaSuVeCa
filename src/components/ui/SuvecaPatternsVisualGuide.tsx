import React, { useState } from 'react';
import { Layers, AlertTriangle, CheckCircle2, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';

interface PatternToken {
  text: string;
  role: string;
  badgeBg: string;
  containerStyle: string;
}

interface PatternItem {
  id: number;
  patternName: string;
  formula: string;
  activeBtnStyle: string;
  inactiveBtnStyle: string;
  activeTagStyle: string;
  inactiveTagStyle: string;
  exampleTokens: PatternToken[];
  bankFocus: string;
  mentalAntidote: string;
}

export const renderChromaticFormula = (formula: string) => {
  const parts = formula.split(/(\s*\+\s*|\s+ou\s+)/);
  return (
    <span className="inline-flex flex-wrap items-center gap-1 font-mono text-[10px] sm:text-[11px] leading-tight">
      {parts.map((part, idx) => {
        const trimmed = part.trim();
        if (trimmed === '+') {
          return <span key={idx} className="text-slate-400 font-black mx-0.5 select-none">+</span>;
        }
        if (trimmed === 'ou') {
          return <span key={idx} className="text-slate-500 italic text-[10px] font-sans font-bold mx-1 select-none">ou</span>;
        }
        if (!trimmed) return null;

        let badgeClass = 'bg-slate-700 text-white';

        if (trimmed.startsWith('Su') || trimmed.startsWith('(Su)')) {
          badgeClass = 'bg-blue-600 text-white';
        } else if (trimmed.startsWith('Ve')) {
          badgeClass = 'bg-emerald-600 text-white';
        } else if (trimmed.startsWith('C')) {
          badgeClass = 'bg-amber-500 text-white';
        } else if (trimmed.startsWith('A')) {
          badgeClass = 'bg-purple-600 text-white';
        } else if (trimmed.startsWith('Pred')) {
          badgeClass = 'bg-pink-600 text-white';
        } else if (trimmed.startsWith('Con')) {
          badgeClass = 'bg-teal-700 text-white';
        }

        return (
          <span
            key={idx}
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono font-black shadow-2xs ${badgeClass}`}
          >
            {trimmed}
          </span>
        );
      })}
    </span>
  );
};

const PATTERNS_DATA: PatternItem[] = [
  {
    id: 1,
    patternName: 'Padrão 1: Ordem Direta Canônica',
    formula: 'Su + Ve + C + A',
    activeBtnStyle: 'border-blue-700 bg-blue-900 text-white shadow-sm ring-2 ring-blue-400/50',
    inactiveBtnStyle: 'border-blue-200/80 bg-blue-50/50 text-blue-950 hover:border-blue-300 hover:bg-blue-100/70',
    activeTagStyle: 'text-blue-300',
    inactiveTagStyle: 'text-blue-900',
    exampleTokens: [
      { text: 'Os auditores fiscais', role: 'Su', badgeBg: 'bg-blue-600 text-white', containerStyle: 'border-blue-300 bg-blue-50 text-blue-950' },
      { text: 'entregaram', role: 'Ve', badgeBg: 'bg-emerald-600 text-white', containerStyle: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
      { text: 'o parecer técnico', role: 'C/OD', badgeBg: 'bg-amber-500 text-white', containerStyle: 'border-amber-300 bg-amber-50 text-amber-950' },
      { text: 'ontem à tarde.', role: 'Aadv', badgeBg: 'bg-purple-600 text-white', containerStyle: 'border-purple-300 bg-purple-50 text-purple-950' },
    ],
    bankFocus: 'Inserir orações intercaladas ou adjuntos longos entre o Sujeito e o Verbo para induzir erro de concordância ou vírgula indevida.',
    mentalAntidote: 'Isole os termos intercalados e ligue o núcleo do sujeito diretamente ao verbo.',
  },
  {
    id: 2,
    patternName: 'Padrão 2: Ordem Inversa',
    formula: 'A + Ve + Su  ou  C + Ve + Su',
    activeBtnStyle: 'border-purple-700 bg-purple-900 text-white shadow-sm ring-2 ring-purple-400/50',
    inactiveBtnStyle: 'border-purple-200/80 bg-purple-50/50 text-purple-950 hover:border-purple-300 hover:bg-purple-100/70',
    activeTagStyle: 'text-purple-300',
    inactiveTagStyle: 'text-purple-900',
    exampleTokens: [
      { text: 'Aos novos candidatos', role: 'C/OI', badgeBg: 'bg-amber-500 text-white', containerStyle: 'border-amber-300 bg-amber-50 text-amber-950' },
      { text: 'coube', role: 'Ve', badgeBg: 'bg-emerald-600 text-white', containerStyle: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
      { text: 'a responsabilidade pelo relatório.', role: 'Su', badgeBg: 'bg-blue-600 text-white', containerStyle: 'border-blue-300 bg-blue-50 text-blue-950' },
    ],
    bankFocus: 'Tentar induzir o candidato a achar que "Aos novos candidatos" é o sujeito. Como tem preposição "a", JAMAIS pode ser sujeito!',
    mentalAntidote: 'Sujeito preposicionado não existe. Pergunte ao verbo: "O que coube?" → "A responsabilidade coube aos candidatos".',
  },
  {
    id: 3,
    patternName: 'Padrão 3: Sujeito Oculto / Desinencial',
    formula: '(Su) + Ve + C',
    activeBtnStyle: 'border-sky-700 bg-sky-900 text-white shadow-sm ring-2 ring-sky-400/50',
    inactiveBtnStyle: 'border-sky-200/80 bg-sky-50/50 text-sky-950 hover:border-sky-300 hover:bg-sky-100/70',
    activeTagStyle: 'text-sky-300',
    inactiveTagStyle: 'text-sky-900',
    exampleTokens: [
      { text: '(Nós)', role: 'Su Oculto', badgeBg: 'bg-blue-600/90 text-white', containerStyle: 'border-blue-300 bg-blue-50/70 text-blue-950' },
      { text: 'Concluímos', role: 'Ve', badgeBg: 'bg-emerald-600 text-white', containerStyle: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
      { text: 'toda a auditoria tributária', role: 'C/OD', badgeBg: 'bg-amber-500 text-white', containerStyle: 'border-amber-300 bg-amber-50 text-amber-950' },
      { text: 'no prazo previsto.', role: 'Aadv', badgeBg: 'bg-purple-600 text-white', containerStyle: 'border-purple-300 bg-purple-50 text-purple-950' },
    ],
    bankFocus: 'Confundir sujeito oculto (determinado pela desinência número-pessoal) com sujeito indeterminado.',
    mentalAntidote: 'Se a desinência revela quem é (1ª ou 2ª pessoa, ou 3ª do singular com referente), o sujeito é DETERMINADO OCULTO.',
  },
  {
    id: 4,
    patternName: 'Padrão 4: Oração Sem Sujeito / Impessoal',
    formula: 'Ve(impessoal) + C + A',
    activeBtnStyle: 'border-emerald-700 bg-emerald-900 text-white shadow-sm ring-2 ring-emerald-400/50',
    inactiveBtnStyle: 'border-emerald-200/80 bg-emerald-50/50 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100/70',
    activeTagStyle: 'text-emerald-300',
    inactiveTagStyle: 'text-emerald-900',
    exampleTokens: [
      { text: 'Havia', role: 'Ve Impessoal (3ª sing)', badgeBg: 'bg-emerald-600 text-white', containerStyle: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
      { text: 'muitas irregularidades graves', role: 'C/OD (Não é Sujeito!)', badgeBg: 'bg-amber-500 text-white', containerStyle: 'border-amber-300 bg-amber-50 text-amber-950' },
      { text: 'no processo licitatório.', role: 'Aadv', badgeBg: 'bg-purple-600 text-white', containerStyle: 'border-purple-300 bg-purple-50 text-purple-950' },
    ],
    bankFocus: 'Tentar flexionar o verbo haver no plural ("Haviam muitas irregularidades"). O verbo haver no sentido de existir não tem sujeito!',
    mentalAntidote: 'O termo seguinte ao verbo haver impessoal é OBJETO DIRETO. Verbo fica obrigatoriamente no singular.',
  },
  {
    id: 5,
    patternName: 'Padrão 5: Estrutura com Predicativo',
    formula: 'Su + Ve + C + Pred',
    activeBtnStyle: 'border-pink-600 bg-pink-900 text-white shadow-sm ring-2 ring-pink-400/50',
    inactiveBtnStyle: 'border-pink-200/80 bg-pink-50/50 text-pink-950 hover:border-pink-300 hover:bg-pink-100/70',
    activeTagStyle: 'text-pink-300',
    inactiveTagStyle: 'text-pink-900',
    exampleTokens: [
      { text: 'Os fiscais', role: 'Su', badgeBg: 'bg-blue-600 text-white', containerStyle: 'border-blue-300 bg-blue-50 text-blue-950' },
      { text: 'julgaram', role: 'Ve', badgeBg: 'bg-emerald-600 text-white', containerStyle: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
      { text: 'o relatório conclusivo', role: 'C/OD', badgeBg: 'bg-amber-500 text-white', containerStyle: 'border-amber-300 bg-amber-50 text-amber-950' },
      { text: 'inconsistente.', role: 'Pred do Objeto', badgeBg: 'bg-pink-600 text-white', containerStyle: 'border-pink-300 bg-pink-50 text-pink-950' },
    ],
    bankFocus: 'Confundir predicativo do objeto (qualidade atribuída pelo ato de julgar) com mero adjunto adnominal.',
    mentalAntidote: 'Teste: o relatório era inconsistente antes ou passou a ser considerado inconsistente pelo ato do julgamento?',
  },
];

export const SuvecaPatternsVisualGuide: React.FC = () => {
  const [selectedPatternId, setSelectedPatternId] = useState<number>(1);
  const activePattern = PATTERNS_DATA.find((p) => p.id === selectedPatternId) || PATTERNS_DATA[0];

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-xs transition">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-linear-to-r from-teal-950 via-teal-900 to-emerald-950 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800/80 text-teal-200 ring-1 ring-white/20">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base sm:text-lg font-black tracking-tight text-white !text-white">
              Os 5 Padrões Estruturais Típicos em Concursos
            </h3>
            <p className="m-0 text-xs text-teal-200 font-medium !text-teal-200">
              Mais de 70% das pegadinhas de sintaxe exploram os padrões fora da ordem direta
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-100 ring-1 ring-white/20">
          Esqueletos Sintáticos
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PATTERNS_DATA.map((p) => {
            const isSelected = p.id === selectedPatternId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPatternId(p.id)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  isSelected ? p.activeBtnStyle : p.inactiveBtnStyle
                }`}
              >
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? p.activeTagStyle : p.inactiveTagStyle}`}>
                  Padrão {p.id}
                </span>
                <span className={`text-xs font-black truncate w-full ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {p.patternName.split(':')[1]?.trim() || p.patternName}
                </span>
                <div className="pt-0.5 w-full">
                  {renderChromaticFormula(p.formula)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Pattern Card */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="rounded-2xl border border-teal-100 bg-linear-to-br from-teal-50/50 via-white to-sky-50/30 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-teal-100 pb-3">
            <h4 className="text-lg font-black text-slate-950">
              {activePattern.patternName}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Fórmula:</span>
              {renderChromaticFormula(activePattern.formula)}
            </div>
          </div>

          {/* Example with tokens */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Exemplo Típico com Desmembramento Sintático:
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              {activePattern.exampleTokens.map((token, idx) => (
                <div key={idx} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs sm:text-sm font-bold ${token.containerStyle}`}>
                  <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono font-black shadow-2xs ${token.badgeBg}`}>
                    {token.role}
                  </span>
                  <span>{token.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bank focus & Mental antidote */}
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-rose-900">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span>Foco da Banca / Armadilha:</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-950 font-medium">
                {activePattern.bankFocus}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Antídoto Mental SuVeCA:</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-950 font-medium">
                {activePattern.mentalAntidote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
