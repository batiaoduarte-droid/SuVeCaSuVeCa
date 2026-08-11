import React, { useEffect, useRef, useState } from 'react';
import { DECISION_TREES, DecisionTreeSet } from '../data/decisionTrees';
import {
  GitMerge,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const DecisionTreeViewer: React.FC = () => {
  const [selectedTreeKey, setSelectedTreeKey] = useState<string>('crase');
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const treeSet: DecisionTreeSet = DECISION_TREES[selectedTreeKey];

  const treeEntries = Object.entries(DECISION_TREES);

  const updateScrollIndicators = () => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const maxScroll = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
    setCanScrollLeft(tabs.scrollLeft > 2);
    setCanScrollRight(tabs.scrollLeft < maxScroll - 2);
  };

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    updateScrollIndicators();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateScrollIndicators);
    observer?.observe(tabs);
    window.addEventListener('resize', updateScrollIndicators);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, []);

  useEffect(() => {
    tabRefs.current[selectedTreeKey]?.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
    window.setTimeout(updateScrollIndicators, 0);
  }, [selectedTreeKey]);

  const [currentNodeId, setCurrentNodeId] = useState<string>(treeSet.startNodeId);
  const [history, setHistory] = useState<
    Array<{ question: string; chosenOption: string }>
  >([]);
  const [finalResult, setFinalResult] = useState<{
    result: string;
    explanation: string;
    examples?: string[];
  } | null>(null);

  const handleSelectTree = (key: string) => {
    setSelectedTreeKey(key);
    const newTree = DECISION_TREES[key];
    setCurrentNodeId(newTree.startNodeId);
    setHistory([]);
    setFinalResult(null);
  };

  const scrollTabs = (direction: -1 | 1) => {
    tabsRef.current?.scrollBy({
      left: direction * Math.max(220, tabsRef.current.clientWidth * 0.7),
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % treeEntries.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + treeEntries.length) % treeEntries.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = treeEntries.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const [nextKey] = treeEntries[nextIndex];
    handleSelectTree(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  const currentNode = treeSet.nodes[currentNodeId];

  const handleChooseOption = (opt: any) => {
    setHistory((prev) => [
      ...prev,
      { question: currentNode.question, chosenOption: opt.label },
    ]);

    if (opt.result) {
      setFinalResult({
        result: opt.result,
        explanation: opt.ruleExplanation || '',
        examples: opt.examples,
      });
    } else if (opt.targetNodeId) {
      setCurrentNodeId(opt.targetNodeId);
    }
  };

  const handleReset = () => {
    setCurrentNodeId(treeSet.startNodeId);
    setHistory([]);
    setFinalResult(null);
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <header className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-2">
        <div className="inline-flex items-center space-x-2 bg-teal-50 text-teal-800 border border-teal-200 text-xs px-3 py-1 rounded-full font-semibold">
          <GitMerge className="w-3.5 h-3.5 text-teal-700" />
          <span>Matrizes de Decisão Sintática</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Algoritmos e Fluxogramas Decisórios
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
          Navegue pelas árvores de decisão interativas para resolver questões complexas de Crase, funções do QUE, apassivação com SE e Complemento Nominal vs Adjunto Adnominal.
        </p>
      </header>

      {/* Selector Tabs */}
      <div className="relative flex min-w-0 items-center rounded-2xl border border-slate-200 bg-slate-100 p-1.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          disabled={!canScrollLeft}
          aria-label="Ver matrizes anteriores"
          className="z-10 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:border-teal-500 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        {canScrollLeft && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 left-[50px] top-1.5 z-[1] w-8 bg-gradient-to-r from-slate-100 to-transparent"
          />
        )}
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Matrizes de decisão sintática"
          onScroll={updateScrollIndicators}
          className="scrollbar-thin flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-2"
        >
          {treeEntries.map(([key, tree], index) => (
            <button
              key={key}
              ref={(element) => {
                tabRefs.current[key] = element;
              }}
              type="button"
              role="tab"
              id={`decision-tab-${key}`}
              aria-controls="decision-tree-panel"
              aria-selected={selectedTreeKey === key}
              tabIndex={selectedTreeKey === key ? 0 : -1}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              onClick={() => handleSelectTree(key)}
              className={`min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 font-bold transition ${
                selectedTreeKey === key
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              {tree.title}
            </button>
          ))}
        </div>
        {canScrollRight && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 right-[50px] top-1.5 z-[1] w-8 bg-gradient-to-l from-slate-100 to-transparent"
          />
        )}
        <button
          type="button"
          onClick={() => scrollTabs(1)}
          disabled={!canScrollRight}
          aria-label="Ver próximas matrizes"
          className="z-10 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:border-teal-500 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Decision Wizard Card */}
      <div
        id="decision-tree-panel"
        role="tabpanel"
        aria-labelledby={`decision-tab-${selectedTreeKey}`}
        className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{treeSet.title}</h2>
            <p className="text-xs text-slate-500">{treeSet.description}</p>
          </div>
          <button
            onClick={handleReset}
            className="button-secondary text-xs px-3 py-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
            <span>Reiniciar</span>
          </button>
        </div>

        {/* History Trail */}
        {history.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
              Caminho Percorrido:
            </span>
            <div className="space-y-1">
              {history.map((step, idx) => (
                <div
                  key={idx}
                  className="text-xs flex items-center space-x-2 text-slate-700"
                >
                  <span className="text-teal-700 font-bold">Passo {idx + 1}:</span>
                  <span className="text-slate-500">{step.question}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-900">{step.chosenOption}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Node Question or Final Result */}
        {!finalResult && currentNode ? (
          <div className="space-y-6 pt-2">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                {currentNode.title}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {currentNode.question}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentNode.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChooseOption(opt)}
                  className="w-full text-left p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-600 text-xs sm:text-sm text-slate-800 font-semibold transition flex items-center justify-between group cursor-pointer min-h-[48px]"
                >
                  <span className="pr-4">{opt.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          finalResult && (
            <div className="bg-teal-50/60 rounded-2xl p-6 sm:p-8 border border-teal-200 space-y-4">
              <div className="flex items-center space-x-3 border-b border-teal-200/60 pb-3">
                <CheckCircle2 className="w-6 h-6 text-teal-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                    Conclusão Sintática
                  </span>
                  <h3 className="text-xl font-black text-slate-900">
                    {finalResult.result}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-teal-900 block font-bold">Regra Decisiva de Prova:</strong>
                <p>{finalResult.explanation}</p>
              </div>

              {finalResult.examples && finalResult.examples.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-teal-200 space-y-2 text-xs sm:text-sm">
                  <span className="text-teal-800 font-bold block flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-teal-700" />
                    <span>Exemplos Práticos:</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 italic">
                    {finalResult.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="button-primary px-5 py-2.5 text-xs sm:text-sm"
                >
                  Testar Outra Frase
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

