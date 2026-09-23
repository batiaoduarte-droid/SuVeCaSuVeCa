/**
 * Runtime projection of the compiled curriculum.
 *
 * `modules.generated.ts` still carries the legacy editorial summaries used by
 * search. Legacy Markdown URLs are omitted from the runtime projection.
 * Published v4.2 View Models are authoritative for the learner-facing unit
 * identity, so this facade overlays
 * title/objective metadata from the deterministic view index without changing
 * either source artifact.
 */
import type { ModuleData } from '../types/suveca';
import { MODULES_DATA as GENERATED_MODULES_DATA } from './modules.generated';
import { PEDAGOGICAL_VIEW_BY_ID } from './pedagogicalViewIndex.generated';
import { getLessonEntry } from './lessonCatalog';
import { SUVECA_INTRO_MODULE } from './suvecaIntroModule';

export const MODULES_DATA: ModuleData[] = [
  SUVECA_INTRO_MODULE,
  ...GENERATED_MODULES_DATA.map((module) => {
    const lesson = getLessonEntry(module.id);
    return {
      ...module,
      title: lesson?.shortTitle || module.title,
      subtitle: lesson ? `${lesson.fullTitle} · ${module.sections.length} unidades pedagógicas` : module.subtitle,
      sections: module.sections.map((section) => {
        const { contentUrl: _legacyUrl, ...runtimeSection } = section;
        const unitId = section.editorial?.integrationUnitId;
        const publishedView = unitId ? PEDAGOGICAL_VIEW_BY_ID[unitId] : undefined;
        if (!publishedView) return runtimeSection;

        const objective = publishedView.learningObjectives.join(' ').trim();
        return {
          ...runtimeSection,
          title: publishedView.title,
          summary: objective || section.summary,
          contentMarkdown: objective
            ? `**Objetivo:** ${objective}\n\nAbra o aprofundamento para construir o modelo mental, aplicar os critérios e recuperar o conteúdo sem consulta.`
            : section.contentMarkdown,
        };
      }),
      knowledge: module.knowledge ? {
        ...module.knowledge,
        sources: module.knowledge.sources.map((source) => ({
          ...source,
          title: PEDAGOGICAL_VIEW_BY_ID[source.id]?.title || source.title,
        })),
      } : module.knowledge,
    };
  }),
];
