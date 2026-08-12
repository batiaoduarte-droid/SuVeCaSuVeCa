import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChecklistItem } from '../types/suveca';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  Award,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 'chk_1', topic: 'Compreensão e interpretação de textos de diferentes gêneros', moduleNum: 1, status: 'nao_iniciado' },
  { id: 'chk_2', topic: 'Reconhecimento de tipos e gêneros textuais', moduleNum: 1, status: 'nao_iniciado' },
  { id: 'chk_3', topic: 'Dominío da coesão e coerência textual (Anáfora, Catáfora, Elipse)', moduleNum: 2, status: 'nao_iniciado' },
  { id: 'chk_4', topic: 'Relações de sentido, homônimos e parônimos (Ratificar x Retificar)', moduleNum: 2, status: 'nao_iniciado' },
  { id: 'chk_5', topic: 'Domínio da ortografia oficial e regras do Novo Acordo Ortográfico', moduleNum: 3, status: 'nao_iniciado' },
  { id: 'chk_6', topic: 'Acentuação gráfica (oxítonas, paroxítonas, proparoxítonas e hiatos)', moduleNum: 3, status: 'nao_iniciado' },
  { id: 'chk_7', topic: 'Emprego das classes de palavras e flexão nominal e verbal', moduleNum: 4, status: 'nao_iniciado' },
  { id: 'chk_8', topic: 'Emprego de pronomes pessoais e do pronome relativo CUJO/ONDE', moduleNum: 5, status: 'nao_iniciado' },
  { id: 'chk_9', topic: 'Emprego de tempos e modos verbais e correlação verbal', moduleNum: 6, status: 'nao_iniciado' },
  { id: 'chk_10', topic: 'Sintaxe da oração simples e identificação do Sujeito (Método SuVeCA)', moduleNum: 7, status: 'nao_iniciado' },
  { id: 'chk_11', topic: 'Distinção entre Complemento Nominal e Adjunto Adnominal', moduleNum: 8, status: 'nao_iniciado' },
  { id: 'chk_12', topic: 'Concordância verbal e nominal (Verbos impessoais, partitivos, porcentagem)', moduleNum: 9, status: 'nao_iniciado' },
  { id: 'chk_13', topic: 'Regência verbal e nominal (Assistir, aspirar, visar, preferir)', moduleNum: 10, status: 'nao_iniciado' },
  { id: 'chk_14', topic: 'Emprego do sinal indicativo de crase (Algoritmo da Crase)', moduleNum: 10, status: 'nao_iniciado' },
  { id: 'chk_15', topic: 'Sintaxe do período composto (Orações coordenadas e subordinadas)', moduleNum: 11, status: 'nao_iniciado' },
  { id: 'chk_16', topic: 'Domínio da pontuação e proibição de vírgula entre Sujeito e Verbo', moduleNum: 12, status: 'nao_iniciado' },
  { id: 'chk_17', topic: 'Colocação pronominal (Próclise, ênclise e mesóclise)', moduleNum: 13, status: 'nao_iniciado' },
  { id: 'chk_18', topic: 'Funções sintático-semânticas das palavras SE e QUE', moduleNum: 13, status: 'nao_iniciado' },
  { id: 'chk_19', topic: 'Reescrita e equivalência de frases e parágrafos', moduleNum: 14, status: 'nao_iniciado' },
  { id: 'chk_20', topic: 'Técnicas para prova discursiva e redação técnica com Método SuVeCA', moduleNum: 15, status: 'nao_iniciado' },
];

export const StudyPlanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'weeks' | 'essay'>('checklist');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const tabListRef = useRef<HTMLDivElement>(null);
  const [tabScroll, setTabScroll] = useState({ left: false, right: true });

  const updateTabScroll = useCallback(() => {
    const element = tabListRef.current;
    if (!element) return;
    setTabScroll({
      left: element.scrollLeft > 4,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
    });
  }, []);

  const scrollTabs = (direction: -1 | 1) => {
    tabListRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });
  };

  useEffect(() => {
    const saved = localStorage.getItem('suveca_checklist_data');
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    updateTabScroll();
    window.addEventListener('resize', updateTabScroll);
    return () => window.removeEventListener('resize', updateTabScroll);
  }, [updateTabScroll]);

  const handleUpdateChecklistStatus = (
    id: string,
    status: ChecklistItem['status']
  ) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setChecklist(updated);
    localStorage.setItem('suveca_checklist_data', JSON.stringify(updated));
  };

  const masteredCount = checklist.filter((c) => c.status === 'dominado').length;
  const progressPct = Math.round((masteredCount / checklist.length) * 100);

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header Banner */}
      <header className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center space-x-2 bg-teal-50 text-teal-800 border border-teal-200 text-xs px-3 py-1 rounded-full font-semibold">
            <CalendarCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>Gestão Estratégica do Edital</span>
          </div>
          <div className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {masteredCount} de {checklist.length} Tópicos Dominados ({progressPct}%)
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Trilha de 8 Semanas & Checklist do Edital
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
          Monitore o seu progresso em cada tópico cobrado pelos editais de concursos e siga o cronograma tático de preparação discursiva e objetiva.
        </p>

        {/* Progress Bar */}
        <ProgressBar value={progressPct} showPercent={false} size="md" ariaLabel={`${progressPct}% dos tópicos do edital dominados`} />
      </header>

      {/* Tabs */}
      <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1.5 text-xs font-medium">
        <button type="button" onClick={() => scrollTabs(-1)} disabled={!tabScroll.left} className="mr-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs disabled:opacity-30" aria-label="Ver abas anteriores"><ChevronLeft className="h-4 w-4" /></button>
        <div ref={tabListRef} onScroll={updateTabScroll} className="flex min-w-0 flex-1 items-center space-x-2 overflow-x-auto scroll-smooth" role="tablist" aria-label="Seções do planejamento">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'checklist'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Checklist do Edital
        </button>
        <button
          onClick={() => setActiveTab('weeks')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'weeks'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Trilha de 8 Semanas
        </button>
        <button
          onClick={() => setActiveTab('essay')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'essay'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Guia Discursiva / Redação
        </button>
        </div>
        <button type="button" onClick={() => scrollTabs(1)} disabled={!tabScroll.right} className="ml-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs disabled:opacity-30" aria-label="Ver próximas abas"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {activeTab === 'checklist' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-700" />
            <span>Matriz do Edital de Língua Portuguesa</span>
          </h2>

          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 shrink-0">
                    M{item.moduleNum}
                  </span>
                  <span className="font-semibold text-slate-800 leading-snug">{item.topic}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                  {[
                    { id: 'nao_iniciado', label: 'Não Iniciado', color: 'bg-slate-100 text-slate-600' },
                    { id: 'em_estudo', label: 'Em Estudo', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                    { id: 'revisar', label: 'Revisar', color: 'bg-purple-50 text-purple-800 border-purple-200' },
                    { id: 'dominado', label: 'Dominado!', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() =>
                        handleUpdateChecklistStatus(item.id, st.id as ChecklistItem['status'])
                      }
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg transition font-medium border cursor-pointer ${
                        item.status === st.id
                          ? 'bg-teal-800 text-white border-teal-800 font-bold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'weeks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { sem: 1, mods: 'Módulos 0, 1 e 2', f: 'Interpretação e Semântica', tasks: ['Diagnóstico inicial', '30 questões de interpretação', 'Treino de anáfora e catáfora'] },
            { sem: 2, mods: 'Módulos 3 e 4', f: 'Ortografia, Acentuação e Morfologia', tasks: ['Mapa do Novo Acordo', 'Regra do Hífen', 'Classes em contexto'] },
            { sem: 3, mods: 'Módulos 5 e 6', f: 'Pronomes e Verbos', tasks: ['Regra de CUJO e ONDE', 'Correlação verbal no Subjuntivo', '30 questões de verbos'] },
            { sem: 4, mods: 'Módulos 7 e 8', f: 'Sintaxe SuVeCA e CN x AA', tasks: ['Desmontagem de 30 orações SuVeCA', 'Duelo Complemento Nominal vs Adjunto'] },
            { sem: 5, mods: 'Módulo 9', f: 'Concordância Verbal e Nominal', tasks: ['Verbos impessoais (haver/fazer)', 'Concordância com SE', 'Porcentagens e partitivos'] },
            { sem: 6, mods: 'Módulo 10', f: 'Regência e Crase', tasks: ['Algoritmo da Crase em 3 passos', 'Regência dos verbos chave'] },
            { sem: 7, mods: 'Módulos 11, 12 e 13', f: 'Período, Pontuação e Colocação', tasks: ['Regras de Próclise/Ênclise', 'Proibição da vírgula entre Sujeito e Verbo'] },
            { sem: 8, mods: 'Módulos 14 e 15 + Simulado', f: 'Reescrita, Simulado e Discursiva', tasks: ['Simulado Final de 20 questões', 'Revisão do Caderno de Erros', 'Treino de Redação SuVeCA'] },
          ].map((w) => (
            <div
              key={w.sem}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Semana {w.sem}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">{w.mods}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">{w.f}</h3>

              <ul className="space-y-1.5 text-xs text-slate-600">
                {w.tasks.map((t, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'essay' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Guia da Prova Discursiva / Redação
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Como construir parágrafos com o Método SuVeCA
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Em provas discursivas de concursos, o avaliador desconta pontos por erros de concordância, pontuação (como vírgula separando sujeito) e imprecisão de conectores.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-teal-900 text-sm">
                Fórmula Tática de 4 Etapas do Parágrafo SuVeCA:
              </h3>
              <p className="text-slate-800 font-semibold text-xs bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                TÓPICO FRASAL (Ideia Central) → EXPLICAÇÃO FUNDAMENTADA → EVIDÊNCIA OU EXEMPLO → CONEXÃO CONCLUSIVA
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-emerald-900 text-sm">
                Checklist de Revisão Rápida Antes de Entregar a Folha:
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-slate-700 font-medium">
                <li>Verifique se nenhum sujeito está separado do verbo por vírgula simples.</li>
                <li>Confirme a concordância em orações com verbo haver ou fazer.</li>
                <li>Confirme a regência dos relativos ("a norma a que obedecemos").</li>
                <li>Verifique a crase antes de horas e palavras femininas.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
