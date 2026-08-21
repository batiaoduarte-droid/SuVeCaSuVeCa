import React, { useEffect, useState, useMemo } from 'react';
import {
  Brain,
  BookOpen,
  Scale,
  PenTool,
  ArrowLeftRight,
  FileText,
  Lightbulb,
  ShieldAlert,
  Tag,
  CheckSquare,
  Sparkles,
  ChevronDown,
  Workflow,
  ListTree,
  HelpCircle,
  Bot,
} from 'lucide-react';
import type { PedagogicalUnitView } from '../../types/pedagogicalView';
import { SuvecaSection } from './sections/SuvecaSection';
import { PrerequisitesSection } from './sections/PrerequisitesSection';
import { ExplanationSection } from './sections/ExplanationSection';
import { RulesSection } from './sections/RulesSection';
import { ResolutionSection } from './sections/ResolutionSection';
import { ContrastsSection } from './sections/ContrastsSection';
import { ExamplesSection } from './sections/ExamplesSection';
import { MnemonicsSection } from './sections/MnemonicsSection';
import { TrapsSection } from './sections/TrapsSection';
import { GlossarySection } from './sections/GlossarySection';
import { RecallSection } from './sections/RecallSection';
import { OfficialQuestionsSection } from './sections/OfficialQuestionsSection';
import { InlineRichText } from './blocks/InlineRichText';

interface PedagogicalUnitRendererProps {
  view: PedagogicalUnitView;
  onAskTutor?: (contextText: string) => void;
  onPracticeExercises?: (topic?: string) => void;
  activeSectionId?: string | null;
  onActiveSectionChange?: (sectionId: string | null) => void;
}

interface SectionDescriptor {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  render: () => React.ReactNode;
}

export const PedagogicalUnitRenderer: React.FC<PedagogicalUnitRendererProps> = ({
  view,
  onAskTutor,
  onPracticeExercises,
  activeSectionId,
  onActiveSectionChange,
}) => {
  if (!view || !view.unit) return null;

  const { unit, sections, officialQuestions } = view;

  const presentSections: SectionDescriptor[] = useMemo(() => {
    const list: SectionDescriptor[] = [];

    if (sections.suveca) {
      list.push({
        id: 'suveca',
        title: 'Conexão com o método SuVeCA',
        icon: Workflow,
        render: () => <SuvecaSection view={sections.suveca} />,
      });
    }

    if (
      sections.prerequisites &&
      (sections.prerequisites.items?.length ||
        sections.prerequisites.blocks?.length ||
        sections.prerequisites.maps?.length)
    ) {
      list.push({
        id: 'prerequisites',
        title: 'Pré-requisitos e modelo mental',
        icon: Brain,
        render: () => <PrerequisitesSection {...sections.prerequisites} />,
      });
    }

    if (
      sections.explanation &&
      (sections.explanation.groups?.length || sections.explanation.blocks?.length)
    ) {
      list.push({
        id: 'explanation',
        title: 'Explicação didática aprofundada',
        icon: BookOpen,
        render: () => <ExplanationSection {...sections.explanation} />,
      });
    }

    if (sections.rules && sections.rules.items?.length) {
      list.push({
        id: 'rules',
        title: 'Regras decisivas',
        icon: Scale,
        render: () => <RulesSection {...sections.rules} />,
      });
    }

    if (sections.resolution && sections.resolution.procedures?.length) {
      list.push({
        id: 'resolution',
        title: 'Roteiros de resolução',
        icon: PenTool,
        render: () => <ResolutionSection {...sections.resolution} />,
      });
    }

    if (sections.contrasts && sections.contrasts.items?.length) {
      list.push({
        id: 'contrasts',
        title: 'Contrastes que a prova explora',
        icon: ArrowLeftRight,
        render: () => <ContrastsSection {...sections.contrasts} />,
      });
    }

    if (sections.examples && sections.examples.items?.length) {
      list.push({
        id: 'examples',
        title: 'Exemplos comentados',
        icon: FileText,
        render: () => <ExamplesSection {...sections.examples} />,
      });
    }

    if (sections.mnemonics && sections.mnemonics.blocks?.length) {
      list.push({
        id: 'mnemonics',
        title: 'Memorização inteligente',
        icon: Lightbulb,
        render: () => <MnemonicsSection {...sections.mnemonics} />,
      });
    }

    if (
      sections.traps &&
      (sections.traps.items?.length || sections.traps.supplementaryBlocks?.length)
    ) {
      list.push({
        id: 'traps',
        title: 'Erros comuns e pegadinhas',
        icon: ShieldAlert,
        render: () => <TrapsSection {...sections.traps} />,
      });
    }

    if (
      sections.glossary &&
      (sections.glossary.items?.length || sections.glossary.blocks?.length)
    ) {
      list.push({
        id: 'glossary',
        title: 'Glossário operacional',
        icon: Tag,
        render: () => <GlossarySection {...sections.glossary} />,
      });
    }

    if (
      sections.recall &&
      (sections.recall.prompts?.length || sections.recall.blocks?.length)
    ) {
      list.push({
        id: 'recall',
        title: 'Síntese para recuperação ativa',
        icon: CheckSquare,
        render: () => <RecallSection {...sections.recall} unitId={unit.unitId} />,
      });
    }

    return list;
  }, [sections, unit.unitId]);

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([
      ...presentSections.slice(0, 2).map((s) => s.id),
      ...(activeSectionId ? [activeSectionId] : []),
    ])
  );

  useEffect(() => {
    if (!activeSectionId || !presentSections.some((section) => section.id === activeSectionId)) return;
    setOpenSections((current) => new Set(current).add(activeSectionId));
    window.requestAnimationFrame(() => {
      document.getElementById(`${unit.unitId}-${activeSectionId}`)?.scrollIntoView({ block: 'start' });
    });
  }, [activeSectionId, presentSections, unit.unitId]);

  const toggleSection = (id: string, isOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
    if (isOpen) onActiveSectionChange?.(id);
  };

  const expandAll = () => {
    setOpenSections(new Set(presentSections.map((s) => s.id)));
  };

  const collapseAll = () => {
    setOpenSections(new Set());
  };

  const openFromToc = (id: string) => {
    setOpenSections((prev) => new Set(prev).add(id));
    onActiveSectionChange?.(id);
    const el = document.getElementById(`${unit.unitId}-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const allOpen = presentSections.every((s) => openSections.has(s.id));

  const handleScrollToQuestions = (sectionTitle: string) => {
    if (onPracticeExercises) {
      onPracticeExercises(sectionTitle);
      return;
    }
    const el = document.getElementById(`${unit.unitId}-official-questions`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenInTutor = (sectionTitle: string) => {
    if (onAskTutor) {
      onAskTutor(`Olá, estou estudando o tópico "${unit.title}", na seção "${sectionTitle}". Pode me ajudar a aprofundar este conteúdo com exemplos adicionais?`);
    }
  };

  return (
    <div className="pedagogical-unit-view structured-content space-y-4 sm:space-y-6">
      {/* Cabeçalho da Unidade */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-800">
          <span className="rounded-md bg-teal-100 px-2 py-0.5 text-teal-900 font-extrabold">Conteúdo aprofundado</span>
          <span>•</span>
          <span className="text-slate-600">{unit.variant}</span>
        </div>
        <h1 className="m-0 text-2xl sm:text-3xl font-black tracking-tight text-teal-950">
          <InlineRichText>{unit.title}</InlineRichText>
        </h1>
      </div>

      {/* Objetivos de Aprendizagem */}
      {unit.learningObjectives && unit.learningObjectives.length > 0 && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-3 sm:p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-950 select-none">
            <Sparkles className="h-4 w-4 text-teal-700" />
            <span>Objetivos desta Unidade Pedagógica</span>
          </div>
          <ul className="space-y-1 text-xs sm:text-sm text-slate-800 list-disc list-inside font-medium pl-1">
            {unit.learningObjectives.map((lo, idx) => (
              <li key={idx} className="leading-relaxed">
                <InlineRichText>{lo}</InlineRichText>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sumário Dinâmico */}
      <nav className="rounded-2xl border border-teal-200 bg-teal-50/50 p-3 sm:p-5 shadow-2xs" aria-label={`Sumário da unidade ${unit.title}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 flex items-center gap-2 text-base font-bold text-teal-950">
            <ListTree className="h-5 w-5 text-teal-700" /> Nesta unidade ({presentSections.length} seções)
          </h2>
          <button
            type="button"
            onClick={() => setOpenSections(allOpen ? new Set() : new Set(presentSections.map((s) => s.id)))}
            className="min-h-11 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-900 hover:bg-teal-50 transition cursor-pointer shadow-2xs"
          >
            {allOpen ? 'Recolher todas' : 'Expandir todas'}
          </button>
        </div>

        <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {presentSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <li key={section.id} className="m-0">
                <button
                  type="button"
                  onClick={() => openFromToc(section.id)}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-transparent bg-white/70 px-3 py-2 text-left text-xs sm:text-sm leading-snug text-teal-950 hover:bg-white hover:border-teal-200 transition cursor-pointer shadow-2xs"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-bold text-teal-700">{index + 1}.</span>
                  <span className="font-semibold truncate"><InlineRichText>{section.title}</InlineRichText></span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Acordeão das 11 Seções Pedagógicas */}
      <div className="space-y-4">
        {presentSections.map((sec, idx) => {
          const Icon = sec.icon;
          const isOpen = openSections.has(sec.id);
          return (
            <details
              key={sec.id}
              id={`${unit.unitId}-${sec.id}`}
              open={isOpen}
              onToggle={(e) => toggleSection(sec.id, e.currentTarget.open)}
              className="group scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-slate-100 sm:px-5 transition select-none">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-xs font-black text-white shadow-2xs">
                    {idx + 1}
                  </span>
                  <Icon className="h-4 w-4 text-teal-700" />
                  <span><InlineRichText>{sec.title}</InlineRichText></span>
                </div>
                <ChevronDown className="h-5 w-5 shrink-0 text-teal-700 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-200 p-3 sm:p-5 reading-content">
                {sec.render()}

                {/* Botões de Ação Rápida no final de cada seção */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 select-none">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Seção {idx + 1} de {presentSections.length} · <InlineRichText>{sec.title}</InlineRichText>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleScrollToQuestions(sec.title)}
                      className="flex min-h-11 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-2 text-xs font-bold text-teal-900 transition hover:bg-teal-100 hover:border-teal-300 cursor-pointer shadow-2xs"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-teal-700" />
                      <span>Exercícios Relacionados</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenInTutor(sec.title)}
                      className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-2xs"
                    >
                      <Bot className="h-3.5 w-3.5 text-teal-700" />
                      <span>Abrir no Tutor IA</span>
                    </button>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {/* Questões Oficiais de Banca */}
      {officialQuestions && officialQuestions.length > 0 && (
        <div id={`${unit.unitId}-official-questions`} className="mt-8 pt-6 border-t border-slate-200">
          <OfficialQuestionsSection
            questions={officialQuestions}
            lessonId={unit.unitId ? unit.unitId.split('-')[1] : 'A00'}
            onPracticeMore={onPracticeExercises}
          />
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 sm:p-5" aria-label="Próximo passo da unidade">
        <h2 className="m-0 text-base font-black text-teal-950">Feche o ciclo com aplicação</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          Resolva questões sem consulta e use os erros para decidir o que revisar nesta unidade.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onPracticeExercises?.(unit.title)} className="min-h-11 rounded-xl bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900">
            Praticar esta unidade
          </button>
          <button type="button" onClick={() => document.getElementById(`module-unit-${unit.unitId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="min-h-11 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-900 hover:bg-teal-50">
            Voltar ao início
          </button>
        </div>
      </section>
    </div>
  );
};
