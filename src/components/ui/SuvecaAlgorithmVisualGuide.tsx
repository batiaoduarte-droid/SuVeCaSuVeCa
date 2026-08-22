import React, { useState } from 'react';
import { GitPullRequest, CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Check, ChevronRight } from 'lucide-react';

interface AlgorithmStep {
  num: number;
  tag: string;
  tagBg: string;
  activeBtn: string;
  inactiveBtn: string;
  activeNumberBadge: string;
  inactiveNumberBadge: string;
  activeTag: string;
  inactiveTag: string;
  cardBorder: string;
  cardBg: string;
  title: string;
  subtitle: string;
  action: string;
  mentalCheck: string;
  criticalCaution: string;
}

const ALGORITHM_STEPS: AlgorithmStep[] = [
  {
    num: 1,
    tag: 'OR',
    tagBg: 'bg-teal-700 text-white',
    activeBtn: 'border-teal-700 bg-teal-800 text-white shadow-sm ring-2 ring-teal-400/50',
    inactiveBtn: 'border-teal-200/80 bg-teal-50/60 text-teal-950 hover:border-teal-400 hover:bg-teal-100/70',
    activeNumberBadge: 'bg-teal-300 text-teal-950 font-black',
    inactiveNumberBadge: 'bg-teal-200/80 text-teal-900 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-teal-950 font-extrabold',
    cardBorder: 'border-teal-200',
    cardBg: 'bg-linear-to-br from-teal-50/60 via-white to-sky-50/30',
    title: 'Delimitação Oracional',
    subtitle: 'Mapeamento de Fronteiras',
    action: 'Conte os verbos e locuções verbais. Cada verbo demarca uma oração independente. Localize conectores (que, se, embora, quando, e, mas).',
    mentalCheck: 'Quantas orações há no período? Quantos motores verbais existem?',
    criticalCaution: 'Nunca tente classificar sujeito de oração subordinada como complemento da oração principal!',
  },
  {
    num: 2,
    tag: 'VE',
    tagBg: 'bg-emerald-600 text-white',
    activeBtn: 'border-emerald-700 bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/50',
    inactiveBtn: 'border-emerald-200/80 bg-emerald-50/60 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100/70',
    activeNumberBadge: 'bg-emerald-300 text-emerald-950 font-black',
    inactiveNumberBadge: 'bg-emerald-200/80 text-emerald-900 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-emerald-950 font-extrabold',
    cardBorder: 'border-emerald-200',
    cardBg: 'bg-linear-to-br from-emerald-50/60 via-white to-teal-50/30',
    title: 'Âncora Verbal',
    subtitle: 'Predicação e Transitividade',
    action: 'Analise o verbo no contexto da frase: é intransitivo (VI), transitivo direto (VTD), indireto (VTI), direto e indireto (VTDI) ou de ligação (VL)? Identifique a voz verbal.',
    mentalCheck: 'O verbo exige complemento? Há pronome "se" apassivador ou indeterminador?',
    criticalCaution: 'Transitividade não é fixa do dicionário; depende inteiramente do contexto da frase!',
  },
  {
    num: 3,
    tag: 'SU',
    tagBg: 'bg-blue-600 text-white',
    activeBtn: 'border-blue-700 bg-blue-700 text-white shadow-sm ring-2 ring-blue-400/50',
    inactiveBtn: 'border-blue-200/80 bg-blue-50/60 text-blue-950 hover:border-blue-400 hover:bg-blue-100/70',
    activeNumberBadge: 'bg-blue-300 text-blue-950 font-black',
    inactiveNumberBadge: 'bg-blue-200/80 text-blue-900 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-blue-950 font-extrabold',
    cardBorder: 'border-blue-200',
    cardBg: 'bg-linear-to-br from-blue-50/60 via-white to-sky-50/30',
    title: 'Resolução do Sujeito',
    subtitle: 'O Mestre da Concordância',
    action: 'Pergunte ao verbo: "Quem executa/sofre a ação?" ou "Com quem o verbo concorda?". Localize o núcleo substantivo sem preposição.',
    mentalCheck: 'O sujeito é simples, composto, oculto/desinencial, indeterminado ou a oração é sem sujeito (verbo impessoal)?',
    criticalCaution: 'Sujeito preposicionado NÃO EXISTE na norma culta!',
  },
  {
    num: 4,
    tag: 'C',
    tagBg: 'bg-amber-500 text-white',
    activeBtn: 'border-amber-600 bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50',
    inactiveBtn: 'border-amber-200/80 bg-amber-50/60 text-amber-950 hover:border-amber-400 hover:bg-amber-100/70',
    activeNumberBadge: 'bg-amber-200 text-amber-950 font-black',
    inactiveNumberBadge: 'bg-amber-200/80 text-amber-900 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-amber-950 font-extrabold',
    cardBorder: 'border-amber-200',
    cardBg: 'bg-linear-to-br from-amber-50/60 via-white to-orange-50/30',
    title: 'Complementação de Valência',
    subtitle: 'Objetos e Complementos Nominais',
    action: 'Identifique os termos exigidos pela predicação verbal: Objeto Direto (sem preposição), Objeto Indireto (com preposição) ou Complemento Nominal.',
    mentalCheck: 'O verbo rege preposição obrigatória ("a", "de", "em", "por")?',
    criticalCaution: 'Proibido separar o verbo de seus complementos por vírgula simples!',
  },
  {
    num: 5,
    tag: 'A',
    tagBg: 'bg-purple-600 text-white',
    activeBtn: 'border-purple-700 bg-purple-700 text-white shadow-sm ring-2 ring-purple-400/50',
    inactiveBtn: 'border-purple-200/80 bg-purple-50/60 text-purple-950 hover:border-purple-400 hover:bg-purple-100/70',
    activeNumberBadge: 'bg-purple-300 text-purple-950 font-black',
    inactiveNumberBadge: 'bg-purple-200/80 text-purple-900 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-purple-950 font-extrabold',
    cardBorder: 'border-purple-200',
    cardBg: 'bg-linear-to-br from-purple-50/60 via-white to-indigo-50/30',
    title: 'Separação de Adjuntos',
    subtitle: 'Circunstâncias e Deslocamentos',
    action: 'Isole os termos circunstanciais acessórios (tempo, lugar, modo, causa, instrumento). Observe se estão na posição final (ordem direta) ou deslocados/intercalados.',
    mentalCheck: 'O adjunto adverbial está deslocado? É de grande extensão (vírgula obrigatória)?',
    criticalCaution: 'Adjunto intercalado entre Sujeito e Verbo exige DUAS vírgulas ou NENHUMA; nunca apenas uma!',
  },
  {
    num: 6,
    tag: 'PRED',
    tagBg: 'bg-pink-600 text-white',
    activeBtn: 'border-pink-600 bg-pink-600 text-white shadow-sm ring-2 ring-pink-400/50',
    inactiveBtn: 'border-pink-200/80 bg-pink-50/60 text-pink-950 hover:border-pink-400 hover:bg-pink-100/70',
    activeNumberBadge: 'bg-pink-200 text-pink-950 font-black',
    inactiveNumberBadge: 'bg-pink-200/80 text-pink-900 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-pink-950 font-extrabold',
    cardBorder: 'border-pink-200',
    cardBg: 'bg-linear-to-br from-pink-50/60 via-white to-rose-50/30',
    title: 'Teste de Predicativos',
    subtitle: 'Atributo Transitório via Verbo',
    action: 'Verifique se há adjetivos ou substantivos qualificando o sujeito ou o objeto por intermédio da ação verbal (predicativo do sujeito / predicativo do objeto).',
    mentalCheck: 'A característica é intrínseca/fixa (adjunto adnominal) ou um estado/atribuição do momento (predicativo)?',
    criticalCaution: 'Predicativo do objeto concorda com o objeto e pode vir separado por vírgula se deslocado.',
  },
  {
    num: 7,
    tag: 'MAPA',
    tagBg: 'bg-slate-800 text-white',
    activeBtn: 'border-slate-800 bg-slate-800 text-white shadow-sm ring-2 ring-slate-400/50',
    inactiveBtn: 'border-slate-300 bg-slate-100/80 text-slate-900 hover:border-slate-400 hover:bg-slate-200/70',
    activeNumberBadge: 'bg-slate-300 text-slate-950 font-black',
    inactiveNumberBadge: 'bg-slate-200 text-slate-800 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-slate-900 font-extrabold',
    cardBorder: 'border-slate-300',
    cardBg: 'bg-linear-to-br from-slate-50 via-white to-teal-50/30',
    title: 'Reconstrução do Padrão',
    subtitle: 'O Esqueleto Real da Frase',
    action: 'Registre a ordem real em que os blocos aparecem na frase da prova (ex: A + Ve + Su + C ou C + Ve + Su).',
    mentalCheck: 'A frase está na ordem direta ou houve inversão/intercalação armada pela banca?',
    criticalCaution: 'Não tente forçar a frase a virar ordem direta; preserve a disposição real do texto.',
  },
  {
    num: 8,
    tag: 'PROVA',
    tagBg: 'bg-rose-700 text-white',
    activeBtn: 'border-rose-700 bg-rose-700 text-white shadow-sm ring-2 ring-rose-400/50',
    inactiveBtn: 'border-rose-200/80 bg-rose-50/60 text-rose-950 hover:border-rose-400 hover:bg-rose-100/70',
    activeNumberBadge: 'bg-rose-300 text-rose-950 font-black',
    inactiveNumberBadge: 'bg-rose-200/80 text-rose-900 font-bold',
    activeTag: 'text-white font-black',
    inactiveTag: 'text-rose-950 font-extrabold',
    cardBorder: 'border-rose-200',
    cardBg: 'bg-linear-to-br from-rose-50/60 via-white to-amber-50/30',
    title: 'Aplicação da Regra Decisiva',
    subtitle: 'O Teste Específico da Banca',
    action: 'Só agora aplique a regra cobrada no item: Pontuação, Concordância Verbal/Nominal, Regência, Crase ou Colocação Pronominal.',
    mentalCheck: 'Qual é o teste mental decisivo que liquida a questão em 15 segundos?',
    criticalCaution: 'Nunca tente resolver o Passo 8 por "ouvido" ou "intuição" sem antes cumprir os Passos 1 a 3!',
  },
];

const GOLDEN_TESTS = [
  {
    topic: 'Pontuação',
    rule: 'Regra Suprema da Vírgula',
    mantra: 'Proibido separar Su-Ve ou Ve-C por vírgula simples!',
    tag: 'border-teal-300 bg-teal-50 text-teal-950',
  },
  {
    topic: 'Concordância',
    rule: 'Ancoragem no Núcleo do Sujeito',
    mantra: 'O verbo concorda em número e pessoa com o NÚCLEO do sujeito, ignore adjuntos adnominais intercalados!',
    tag: 'border-blue-300 bg-blue-50 text-blue-950',
  },
  {
    topic: 'Crase',
    rule: 'Fusão Regente + Regido',
    mantra: 'O termo regente exige preposição "a" E o termo regido aceita artigo definido "a" (ou pronome aquele/a/o)?',
    tag: 'border-amber-300 bg-amber-50 text-amber-950',
  },
  {
    topic: 'Colocação Pronominal',
    rule: 'Força Atrativa de Próclise',
    mantra: 'Há palavra atrativa (negação, advérbio, pronome relativo/indefinido, conjunção subordinativa)? Se sim, próclise obrigatória!',
    tag: 'border-purple-300 bg-purple-50 text-purple-950',
  },
];

export const SuvecaAlgorithmVisualGuide: React.FC = () => {
  const [activeStepNum, setActiveStepNum] = useState<number>(1);
  const activeStep = ALGORITHM_STEPS.find((s) => s.num === activeStepNum) || ALGORITHM_STEPS[0];

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-xs transition">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-linear-to-r from-teal-950 via-teal-900 to-emerald-950 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800/80 text-teal-200 ring-1 ring-white/20">
            <GitPullRequest className="h-5 w-5" />
          </span>
          <div>
            <h3 className="m-0 text-base sm:text-lg font-black tracking-tight text-white !text-white">
              O Algoritmo Decisório de 8 Passos SuVeCA
            </h3>
            <p className="m-0 text-xs text-teal-200 font-medium !text-teal-200">
              Protocolo determinístico e inegociável para resolver questões de prova sem hesitar
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-100 ring-1 ring-white/20">
          Protocolo de Resolução
        </span>
      </div>

      {/* Stepper Flow Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ALGORITHM_STEPS.map((step) => {
            const isSelected = step.num === activeStepNum;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStepNum(step.num)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition cursor-pointer ${
                  isSelected ? step.activeBtn : step.inactiveBtn
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    isSelected ? step.activeNumberBadge : step.inactiveNumberBadge
                  }`}
                >
                  {step.num}
                </span>
                <span
                  className={`text-[11px] font-mono ${
                    isSelected ? step.activeTag : step.inactiveTag
                  }`}
                >
                  {step.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Details */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className={`rounded-2xl border ${activeStep.cardBorder} ${activeStep.cardBg} p-5 sm:p-6 shadow-2xs space-y-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-teal-100 pb-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-xl px-3 py-1 text-sm font-mono font-black shadow-2xs ${activeStep.tagBg}`}>
                {activeStep.tag}
              </span>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800">
                  Passo {activeStep.num} de 8 · {activeStep.subtitle}
                </span>
                <h4 className="text-lg font-black text-slate-950">
                  {activeStep.title}
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              <span>Etapa Obrigatória</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <strong className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                Procedimento Operacional:
              </strong>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">
                {activeStep.action}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-sky-900">
                  Autointerrogação Mental do Concurseiro:
                </p>
                <p className="text-xs font-bold text-slate-900 italic">
                  “{activeStep.mentalCheck}”
                </p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-rose-900">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                  <span>Cuidado Crítico de Prova:</span>
                </div>
                <p className="text-xs font-medium text-rose-950">
                  {activeStep.criticalCaution}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Golden Tests of Step 8 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-700" />
            <h4 className="m-0 text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Os 4 Testes Decisivos do Passo 8 (PROVA)
            </h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {GOLDEN_TESTS.map((t) => (
              <div key={t.topic} className={`rounded-xl border p-3.5 ${t.tag} shadow-2xs space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wide">{t.topic}</span>
                  <span className="text-[10px] font-bold opacity-80">{t.rule}</span>
                </div>
                <p className="text-xs font-bold leading-relaxed">{t.mantra}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
