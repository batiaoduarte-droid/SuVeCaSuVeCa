import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Workflow,
  BookOpen,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Award,
  Calendar,
  Cpu,
  FileSpreadsheet,
  HelpCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { SUVECA_BLOCK_COLORS } from './study-visuals/studyVisualTokens';
import { ModalShell } from './ui/ModalShell';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface DemoBlock {
  type: 'su' | 've' | 'c' | 'a';
  label: string;
  tag: string;
  term: string;
  role: string;
  explanation: string;
  goldenRule: string;
}

const DEMO_SENTENCE_BLOCKS: DemoBlock[] = [
  {
    type: 'a',
    label: 'Adjunto Adverbial de Tempo',
    tag: 'Adjunto Adv.',
    term: 'Ontem,',
    role: 'Circunstância temporal deslocada para o início da oração.',
    explanation: 'Como está no início e possui vírgula, demarca adjunto adverbial antecipado.',
    goldenRule: 'Adjuntos adverbiais deslocados de grande extensão exigem vírgula obrigatória!',
  },
  {
    type: 'su',
    label: 'Sujeito Determinado Simples',
    tag: 'Sujeito',
    term: 'os novos servidores',
    role: 'Núcleo: "servidores" (substantivo no plural).',
    explanation: 'Comanda a flexão obrigatória do verbo "entregaram" em 3ª pessoa do plural.',
    goldenRule: 'Nunca use vírgula entre o sujeito e o verbo!',
  },
  {
    type: 've',
    label: 'Verbo Transitivo Direto e Indireto (VTDI)',
    tag: 'Verbo VTDI',
    term: 'entregaram',
    role: 'Ação principal bi-transitiva.',
    explanation: 'Exige dois complementos simultâneos: um sem preposição (OD) e outro com preposição (OI).',
    goldenRule: 'Verbos VTDI não admitem dois complementos preposicionados de mesmo tipo.',
  },
  {
    type: 'a',
    label: 'Adjunto Adverbial de Modo',
    tag: 'Adjunto Adv.',
    term: 'cuidadosamente',
    role: 'Modificador da ação verbal.',
    explanation: 'Sufixo "-mente" indica modo de realização da entrega.',
    goldenRule: 'Adjunto adverbial intercalado curto pode ter vírgula facultativa.',
  },
  {
    type: 'c',
    label: 'Objeto Direto (OD)',
    tag: 'Objeto Direto',
    term: 'os relatórios',
    role: 'Complemento verbal direto (não preposicionado).',
    explanation: 'Responde à pergunta "entregaram o quê?". Núcleo: "relatórios".',
    goldenRule: 'O objeto direto não admite preposição regida pelo verbo.',
  },
  {
    type: 'c',
    label: 'Objeto Indireto (OI)',
    tag: 'Objeto Indireto',
    term: 'ao diretor.',
    role: 'Complemento verbal indireto (preposição "a" + artigo "o").',
    explanation: 'Responde à pergunta "a quem?". Termo regido pela preposição "a".',
    goldenRule: 'Se o termo feminino admitir "à diretora", ocorre crase obrigatória.',
  },
];

const ONBOARDING_STORAGE_KEY = 'suveca_onboarding_completed_v2';

export const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markOnboardingAsCompleted = (): void => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
};

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedDemoBlockIndex, setSelectedDemoBlockIndex] = useState<number>(1); // default: sujeito

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelectedDemoBlockIndex(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalSteps = 4;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      markOnboardingAsCompleted();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    markOnboardingAsCompleted();
    onClose();
  };

  const handleStartTab = (tab: string) => {
    markOnboardingAsCompleted();
    onClose();
    if (onNavigateToTab) {
      onNavigateToTab(tab);
    }
  };

  const activeDemoBlock = DEMO_SENTENCE_BLOCKS[selectedDemoBlockIndex] || DEMO_SENTENCE_BLOCKS[1];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleSkip}
      title=""
      maxWidth="max-w-3xl"
    >
      <div className="relative overflow-hidden p-5 sm:p-7 space-y-5 select-text">
        {/* Top Bar: Badge, Step Counter & Close button */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-teal-200 shadow-2xs">
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-100/90 text-teal-900 border border-teal-300 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                Tour Guiado
              </span>
              <span className="text-xs font-bold text-slate-500">
                Passo {currentStep + 1} de {totalSteps}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1: Bem-vindo ao Gemini-SuVeCA Concursos */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Bem-vindo ao Gemini-SuVeCA Concursos
              </h2>
            </div>

            {/* Dark Teal Hero Box */}
            <div className="rounded-2xl border border-teal-900 bg-gradient-to-br from-teal-950 via-teal-900 to-teal-950 p-5 sm:p-6 text-white shadow-md space-y-3">
              <span className="inline-block rounded-md bg-teal-800/80 border border-teal-700/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-200">
                O Mapa Gramatical Infalível
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
                SuVeCA = Sujeito + Verbo + Complemento + Adjunto + Predicativo
              </h3>
              <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
                Olá! O método SuVeCA foi projetado para transformar o estudo de Língua Portuguesa para concursos públicos em um processo algorítmico, lógico e visual. Em vez de decorar dezenas de regras soltas, você reconstrói as relações de dependência direta entre os termos da oração.
              </p>
            </div>

            {/* 2 Key Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-sky-950 font-black text-xs sm:text-sm">
                  <div className="p-1 rounded-md bg-sky-100 border border-sky-300 text-sky-800">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <span>1. Analisador Sintático</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Dissecação instantânea de qualquer frase de concurso em blocos sintáticos coloridos com explicação didática do papel de cada termo.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs sm:text-sm">
                  <div className="p-1 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <span>2. Caderno de Erros Ativo</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Registro estruturado dos seus erros com a <strong>Regra Decisiva (Vacina)</strong> e sistema de repetição espaçada para nunca mais errar.
                </p>
              </div>
            </div>

            {/* Trust Footer Callout */}
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700 font-medium leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                <strong>Inteligência Editorial Confiável:</strong> Todo o conteúdo foi parametrizado rigorosamente com base em questões reais de bancas como FGV, FCC, Cebraspe, Vunesp e Cesgranrio.
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Como usar o Analisador Sintático */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Como usar o Analisador Sintático
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-1">
                O <strong>Analisador Sintático</strong> decompõe qualquer oração da prova em elementos funcionais, eliminando dúvidas sobre concordância, regência, crase e pontuação proibida.
              </p>
            </div>

            {/* Interactive Demo Sandbox */}
            <div className="rounded-2xl border border-teal-200 bg-slate-50/50 p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2 border-b border-teal-100/80 pb-2 select-none">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Demonstração Interativa (Clique nos blocos)
                </span>
                <span className="flex items-center gap-1 text-[11px] font-extrabold text-teal-800 bg-teal-100/80 border border-teal-200 px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Interaja abaixo
                </span>
              </div>

              {/* Interactive Sentence Chips */}
              <div className="flex flex-wrap gap-2 pt-1 select-none">
                {DEMO_SENTENCE_BLOCKS.map((block, idx) => {
                  const isSelected = selectedDemoBlockIndex === idx;
                  const colorConfig = SUVECA_BLOCK_COLORS[block.type] || SUVECA_BLOCK_COLORS.su;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDemoBlockIndex(idx)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? `ring-2 ring-teal-700 shadow-md ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`
                          : `hover:border-slate-400 bg-white border-slate-300 text-slate-800`
                      }`}
                    >
                      <span className="font-serif font-black">{block.term}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${colorConfig.badge}`}>
                        [{block.tag}]
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Inspector Output Box for Selected Block */}
              <div className="rounded-xl border border-teal-300 bg-white p-3.5 sm:p-4 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-black ${
                      (SUVECA_BLOCK_COLORS[activeDemoBlock.type] || SUVECA_BLOCK_COLORS.su).pill
                    }`}
                  >
                    {activeDemoBlock.tag}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    {activeDemoBlock.label}: “{activeDemoBlock.term}”
                  </h4>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  <strong>Papel Sintático:</strong> {activeDemoBlock.role} {activeDemoBlock.explanation}
                </p>

                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-xs font-bold text-amber-950">
                  <span className="text-rose-700 uppercase tracking-wider text-[10px] block font-black">
                    Regra de Ouro:
                  </span>
                  {activeDemoBlock.goldenRule}
                </div>
              </div>
            </div>

            {/* 3 Step Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                <span className="text-[11px] font-black text-teal-900 block">
                  1. Digite ou Selecione
                </span>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Cole qualquer frase complexa ou use exemplos pré-definidos de bancas.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                <span className="text-[11px] font-black text-teal-900 block">
                  2. Analise a Estrutura
                </span>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Descubra a ordem canônica SuVeCA e identifique termos deslocados.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                <span className="text-[11px] font-black text-teal-900 block">
                  3. Aprofunde com IA
                </span>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Tire dúvidas sobre termos implícitos, voz passiva com "SE" e funções do "QUE".
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Como usar o Caderno de Erros */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Como usar o Caderno de Erros
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-1">
                O <strong>Caderno de Erros</strong> é o seu instrumento mais poderoso de retenção de longo prazo. Em vez de apenas ver o gabarito, você aplica o <strong>Método dos 4 Passos</strong>.
              </p>
            </div>

            {/* 4 Method Steps Cards */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white select-none">
                  1
                </span>
                <div className="space-y-0.5 flex-1">
                  <h4 className="text-xs font-black text-slate-900">
                    Enunciado & Contexto da Questão
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    A oração exata que provocou a dúvida no simulado ou exercício.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/40 p-3 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-black text-white select-none">
                  2
                </span>
                <div className="space-y-0.5 flex-1">
                  <h4 className="text-xs font-black text-rose-950">
                    O Erro Cometido (Diagnóstico da Armadilha)
                  </h4>
                  <p className="text-[11px] text-rose-900 font-medium">
                    Explicação de <em>por que</em> você errou (ex: "Confundi adjunto adnominal com complemento nominal").
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white select-none">
                  3
                </span>
                <div className="space-y-0.5 flex-1">
                  <h4 className="text-xs font-black text-emerald-950">
                    A Regra Decisiva de Ouro (A Vacina)
                  </h4>
                  <p className="text-[11px] text-emerald-900 font-medium">
                    O critério objetivo que resolve a pegadinha (ex: "Se o termo tem valor de posse ou agente, é Adjunto Adnominal").
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/40 p-3 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-black text-white select-none">
                  4
                </span>
                <div className="space-y-0.5 flex-1">
                  <h4 className="text-xs font-black text-sky-950">
                    Novo Exemplo de Fixação
                  </h4>
                  <p className="text-[11px] text-sky-900 font-medium">
                    Uma frase autoral aplicando a regra correta para solidificar a memória.
                  </p>
                </div>
              </div>
            </div>

            {/* Spaced Repetition Box */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-3.5 space-y-2 select-none">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wider">
                <Calendar className="h-4 w-4 text-amber-700" />
                <span>Ciclo de Revisão Espaçada Integrado:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800">
                  Dia 0 (Registro)
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900 shadow-2xs">
                  Dia 1
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="rounded-md border border-sky-300 bg-sky-100 px-2 py-0.5 text-[11px] font-black text-sky-900">
                  Dia 7
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="rounded-md border border-purple-300 bg-purple-100 px-2 py-0.5 text-[11px] font-black text-purple-900">
                  Dia 15
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="rounded-md border border-indigo-300 bg-indigo-100 px-2 py-0.5 text-[11px] font-black text-indigo-900">
                  Dia 30
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-900 shadow-2xs">
                  🏆 Dominado!
                </span>
              </div>

              <p className="text-[11px] text-amber-900 font-medium leading-relaxed pt-0.5">
                Ao errar questões nos simulados, envie-as diretamente para o Caderno com 1 clique para praticá-las no modo Flashcard.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Roteiro de Estudo e Próximos Passos */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Roteiro de Estudo e Próximos Passos
              </h2>
            </div>

            {/* Success Summary Card */}
            <div className="rounded-2xl border border-teal-300 bg-teal-50/40 p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white shadow-2xs select-none">
                  <Award className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-teal-950 tracking-tight">
                    Tudo pronto para gabaritar Português!
                  </h3>
                  <p className="text-xs text-teal-800 font-medium">
                    Sua jornada de estudo de alto rendimento começa agora.
                  </p>
                </div>
              </div>

              <div className="border-t border-teal-200/80 pt-3 space-y-2">
                <div className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-teal-700 mt-0.5 shrink-0 select-none" />
                  <span>
                    <strong>1. Estude na Apostila:</strong> Domine a teoria concisa e aplique os testes decisivos de cada tema.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-teal-700 mt-0.5 shrink-0 select-none" />
                  <span>
                    <strong>2. Dissecte no Analisador:</strong> Teste qualquer oração que gerar incerteza.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-teal-700 mt-0.5 shrink-0 select-none" />
                  <span>
                    <strong>3. Vacine no Caderno de Erros:</strong> Registre as dúvidas e faça a revisão do dia.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-teal-700 mt-0.5 shrink-0 select-none" />
                  <span>
                    <strong>4. Teste-se nos Simulados & Duelos:</strong> Pratique com banco de 1.200+ questões oficiais.
                  </span>
                </div>
              </div>
            </div>

            {/* Start Navigation Quick Launcher */}
            <div className="space-y-2 select-none">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                Escolha por onde deseja começar:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleStartTab('analisador')}
                  className="rounded-xl border border-sky-300 bg-white p-3.5 text-left transition-all hover:bg-sky-50/70 hover:border-sky-400 hover:shadow-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-sky-950 font-black text-xs sm:text-sm mb-1">
                    <Cpu className="h-4 w-4 text-sky-700 group-hover:scale-110 transition" />
                    <span>Analisador</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Experimentar a dissecação sintática
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartTab('errors')}
                  className="rounded-xl border border-emerald-300 bg-white p-3.5 text-left transition-all hover:bg-emerald-50/70 hover:border-emerald-400 hover:shadow-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs sm:text-sm mb-1">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-700 group-hover:scale-110 transition" />
                    <span>Caderno de Erros</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Visualizar a matriz de vacinas
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartTab('modules')}
                  className="rounded-xl border border-teal-300 bg-white p-3.5 text-left transition-all hover:bg-teal-50/70 hover:border-teal-400 hover:shadow-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-teal-950 font-black text-xs sm:text-sm mb-1">
                    <BookOpen className="h-4 w-4 text-teal-700 group-hover:scale-110 transition" />
                    <span>Apostila (Ortografia e fonologia)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Iniciar os módulos curriculares
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Dots & Navigation Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 select-none">
          {/* Progress Indicators (Pills) */}
          <div className="flex items-center gap-1.5" aria-label="Indicador de passos">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`transition-all duration-200 cursor-pointer rounded-full ${
                  idx === currentStep
                    ? 'w-6 h-2 bg-teal-700'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Ir para o passo ${idx + 1}`}
                aria-label={`Passo ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-5 py-2 text-xs font-black transition cursor-pointer shadow-xs"
            >
              <span>{isLastStep ? 'Concluir Tour' : 'Próximo'}</span>
              {!isLastStep && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
