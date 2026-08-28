import React, { useEffect, useState } from 'react';
import { ChevronDown, ListTree, RotateCcw, CheckSquare, Square, Scale, BookOpen, Layers } from 'lucide-react';
import type { CumulativeReviewView } from '../../types/pedagogicalView';
import { SuvecaSection } from './sections/SuvecaSection';
import { ContentBlockRenderer } from './blocks/ContentBlockRenderer';
import { InlineRichText } from './blocks/InlineRichText';
import { PedagogicalCallout } from '../ui/PedagogicalCallout';
import { stripContextualPrefix } from '../../lib/learnerFacingLabels';

interface CumulativeReviewRendererProps {
  view: CumulativeReviewView;
  activeSectionId?: string | null;
  onActiveSectionChange?: (sectionId: string | null) => void;
  onPracticeExercises?: (topic?: string) => void;
}

const protocolStorageKey = (unitId: string) => `suveca_cumulative_protocol_v1_${unitId}`;

export const CumulativeReviewRenderer: React.FC<CumulativeReviewRendererProps> = ({
  view,
  activeSectionId,
  onActiveSectionChange,
  onPracticeExercises,
}) => {
  if (!view || !view.unit) return null;

  const { unit, sections } = view;
  const reviewTitle = stripContextualPrefix(unit.title, /^Revisão Cumulativa:\s*/i);

  const [checkedProtocol, setCheckedProtocol] = useState<Record<number, boolean>>(() => {
    try {
      const stored = localStorage.getItem(protocolStorageKey(view.unit.unitId));
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [showAllConcepts, setShowAllConcepts] = useState(false);
  const [showAllRules, setShowAllRules] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(['suveca', 'rules', 'synthesis'])
  );

  const toggleSection = (id: string, isOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
    if (isOpen) onActiveSectionChange?.(id);
  };

  useEffect(() => {
    localStorage.setItem(protocolStorageKey(view.unit.unitId), JSON.stringify(checkedProtocol));
  }, [checkedProtocol, view.unit.unitId]);

  useEffect(() => {
    if (!activeSectionId) return;
    setOpenSections((current) => new Set(current).add(activeSectionId));
    window.requestAnimationFrame(() => {
      document.getElementById(`${view.unit.unitId}-${activeSectionId}`)?.scrollIntoView({ block: 'start' });
    });
  }, [activeSectionId, view.unit.unitId]);

  const openFromToc = (id: string) => {
    setOpenSections((current) => new Set(current).add(id));
    onActiveSectionChange?.(id);
    window.requestAnimationFrame(() => {
      document.getElementById(`${view.unit.unitId}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleProtocolItem = (idx: number) => {
    setCheckedProtocol((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const protocolItems = sections.activeReviewProtocol?.items || [];
  const completedProtocol = Object.values(checkedProtocol).filter(Boolean).length;
  const protocolPercent = protocolItems.length > 0 ? Math.round((completedProtocol / protocolItems.length) * 100) : 0;

  return (
    <div className="cumulative-review-view structured-content space-y-4 sm:space-y-6">
      {/* Cabeçalho da Unidade de Revisão */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-800">
          <RotateCcw className="h-4 w-4 text-teal-600" />
          <span>Revisão geral cumulativa • {unit.sectionId}</span>
        </div>
        <h1 className="m-0 text-2xl sm:text-3xl font-black tracking-tight text-teal-950">
          {reviewTitle}
        </h1>
      </div>

      {/* Objetivo de Revisão */}
      {unit.objective && (
        <PedagogicalCallout type="objective">
          <p className="m-0 leading-relaxed font-medium">
            <InlineRichText>{unit.objective}</InlineRichText>
          </p>
        </PedagogicalCallout>
      )}

      {/* Sumário das 6 Seções */}
      <nav className="rounded-2xl border border-teal-200 bg-teal-50/50 p-3 sm:p-5" aria-label={`Sumário da revisão ${reviewTitle}`}>
        <h2 className="m-0 mb-3 flex items-center gap-2 text-base font-bold text-teal-950">
          <ListTree className="h-5 w-5 text-teal-700" /> Roteiro de Revisão (6 Dimensões)
        </h2>
        <ol className="pedagogical-toc-list m-0 grid list-none gap-2 p-0 text-xs font-semibold text-teal-950 sm:grid-cols-2 sm:text-sm">
          {[
            ['suveca', 'Conexão com o método SuVeCA'],
            ['concepts', 'Mapa de conceitos prioritários'],
            ['rules', 'Regras priorizadas de prova'],
            ['synthesis', 'Síntese estruturada'],
            ['recovery', 'Exemplos para recuperação'],
            ['protocol', 'Protocolo de revisão ativa'],
          ].map(([id, label], index) => (
            <li key={id} className="m-0">
              <button type="button" onClick={() => openFromToc(id)} className="min-h-11 w-full rounded-xl border border-transparent bg-white/70 px-3 py-2 text-left hover:border-teal-200 hover:bg-white">
                <span className="mr-2 font-black text-teal-700">{index + 1}.</span>{label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Seção 1: Conexão SuVeCA */}
      <details
        id={`${unit.unitId}-suveca`}
        open={openSections.has('suveca')}
        onToggle={(e) => toggleSection('suveca', e.currentTarget.open)}
        className="pedagogical-section group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-slate-100 sm:px-5 transition">
          <span><span className="mr-2 text-teal-700">1.</span>Conexão com o método SuVeCA</span>
          <ChevronDown className="h-5 w-5 shrink-0 text-teal-700 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pedagogical-section-body border-t border-slate-200 p-4 sm:p-6">
          <SuvecaSection view={sections.suveca} />
        </div>
      </details>

      {/* Seção 2: Mapa de Conceitos */}
      {sections.conceptMap?.items?.length > 0 && (
        <details
          id={`${unit.unitId}-concepts`}
          open={openSections.has('concepts')}
          onToggle={(e) => toggleSection('concepts', e.currentTarget.open)}
          className="pedagogical-section group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-slate-100 sm:px-5 transition">
            <span><span className="mr-2 text-teal-700">2.</span>Mapa de Conceitos ({sections.conceptMap.items.length} tópicos)</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-teal-700 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pedagogical-section-body border-t border-slate-200 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {(showAllConcepts ? sections.conceptMap.items : sections.conceptMap.items.slice(0, 24)).map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-xl border border-teal-200/90 bg-teal-50/70 px-3 py-1.5 text-xs font-bold text-teal-950 shadow-2xs"
                >
                  <InlineRichText>{item}</InlineRichText>
                </span>
              ))}
            </div>
            {sections.conceptMap.items.length > 24 && (
              <button type="button" onClick={() => setShowAllConcepts((current) => !current)} className="mt-4 min-h-11 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-900 hover:bg-teal-50">
                {showAllConcepts ? 'Mostrar apenas os prioritários' : `Mostrar todos os ${sections.conceptMap.items.length} conceitos`}
              </button>
            )}
          </div>
        </details>
      )}

      {/* Seção 3: Regras Priorizadas */}
      {sections.prioritizedRules?.items?.length > 0 && (
        <details
          id={`${unit.unitId}-rules`}
          open={openSections.has('rules')}
          onToggle={(e) => toggleSection('rules', e.currentTarget.open)}
          className="pedagogical-section group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-slate-100 sm:px-5 transition">
            <span><span className="mr-2 text-teal-700">3.</span>Regras Priorizadas de Prova ({sections.prioritizedRules.items.length})</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-teal-700 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pedagogical-section-body border-t border-slate-200 p-4 sm:p-6">
            <div className="space-y-2.5">
              {(showAllRules ? sections.prioritizedRules.items : sections.prioritizedRules.items.slice(0, 12)).map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 text-xs sm:text-sm text-slate-900"
                >
                  <Scale className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  <div className="leading-relaxed font-medium">
                    <InlineRichText>{rule}</InlineRichText>
                  </div>
                </div>
              ))}
            </div>
            {sections.prioritizedRules.items.length > 12 && (
              <button type="button" onClick={() => setShowAllRules((current) => !current)} className="mt-4 min-h-11 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-900 hover:bg-teal-50">
                {showAllRules ? 'Mostrar apenas as prioritárias' : `Mostrar todas as ${sections.prioritizedRules.items.length} regras`}
              </button>
            )}
          </div>
        </details>
      )}

      {/* Seção 4: Síntese Estruturada */}
      {sections.structuredSynthesis?.blocks?.length > 0 && (
        <details
          id={`${unit.unitId}-synthesis`}
          open={openSections.has('synthesis')}
          onToggle={(e) => toggleSection('synthesis', e.currentTarget.open)}
          className="pedagogical-section group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-slate-100 sm:px-5 transition">
            <span><span className="mr-2 text-teal-700">4.</span>Síntese Estruturada</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-teal-700 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pedagogical-section-body border-t border-slate-200 p-4 sm:p-6 space-y-3">
            {sections.structuredSynthesis.blocks.map((block, idx) => (
              <ContentBlockRenderer key={idx} block={block} allowLegacyDiagramInference={false} />
            ))}
          </div>
        </details>
      )}

      {/* Seção 5: Exemplos para Recuperação */}
      {sections.recoveryExamples?.blocks?.length > 0 && (
        <details
          id={`${unit.unitId}-recovery`}
          open={openSections.has('recovery')}
          onToggle={(e) => toggleSection('recovery', e.currentTarget.open)}
          className="pedagogical-section group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-slate-100 sm:px-5 transition">
            <span><span className="mr-2 text-teal-700">5.</span>Exemplos para Recuperação</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-teal-700 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pedagogical-section-body border-t border-slate-200 p-4 sm:p-6 space-y-3">
            {sections.recoveryExamples.blocks.map((block, idx) => (
              <ContentBlockRenderer key={idx} block={block} />
            ))}
          </div>
        </details>
      )}

      {/* Seção 6: Protocolo de Revisão Ativa */}
      {protocolItems.length > 0 && (
        <details
          id={`${unit.unitId}-protocol`}
          open={openSections.has('protocol')}
          onToggle={(e) => toggleSection('protocol', e.currentTarget.open)}
          className="pedagogical-section group overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-2xs"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-teal-50/80 px-4 py-3.5 text-sm sm:text-base font-bold text-teal-950 hover:bg-teal-100 sm:px-5 transition">
            <span><span className="mr-2 text-teal-700">6.</span>Protocolo de Revisão Ativa ({completedProtocol}/{protocolItems.length})</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-teal-700 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pedagogical-section-body border-t border-teal-200 p-4 sm:p-6 space-y-4">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Progresso do protocolo de revisão"
              aria-valuemin={0}
              aria-valuemax={protocolItems.length}
              aria-valuenow={completedProtocol}
            >
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${protocolPercent}%` }}
              />
            </div>
            <div className="space-y-2">
              {protocolItems.map((item, idx) => {
                const isChecked = !!checkedProtocol[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleProtocolItem(idx)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      isChecked
                        ? 'border-emerald-300 bg-emerald-50/50 text-slate-900'
                        : 'border-slate-200/80 bg-slate-50/50 hover:border-teal-300 hover:bg-white text-slate-800'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className={`text-xs sm:text-sm font-medium leading-relaxed ${isChecked ? 'line-through text-slate-500' : ''}`}>
                      <InlineRichText>{item.replace(/^\.\s*/, '')}</InlineRichText>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      )}

      <section className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 sm:p-5" aria-label="Próximo passo da revisão">
        <h2 className="m-0 text-base font-black text-teal-950">Transforme a revisão em desempenho</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          Depois de reconstruir as regras sem consulta, resolva questões misturadas e registre as lacunas encontradas.
        </p>
        <button type="button" onClick={() => onPracticeExercises?.(unit.title)} className="mt-4 min-h-11 rounded-xl bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900">
          Praticar esta revisão
        </button>
      </section>
    </div>
  );
};
