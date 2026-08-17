import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODULES_DATA } from './modules.generated';
import { EDITORIAL_FLASHCARDS } from './editorialFlashcards.generated';
import {
  EDITORIAL_DUEL_QUESTIONS,
  EDITORIAL_DUEL_QUESTION_SET_VERSION,
} from './editorialDuelQuestions.generated';
import {
  PEDAGOGICAL_KNOWLEDGE_BUILD,
  PEDAGOGICAL_KNOWLEDGE_INDEX,
} from './pedagogicalKnowledge.generated';
import { formatKnowledgeContext, retrieveKnowledge } from '../lib/knowledgeRetrieval';

describe('currículo editorial das aulas 00–14', () => {
  const coreModules = MODULES_DATA.filter((module) => /^mod\d+$/.test(module.id));
  const sections = coreModules.flatMap((module) => module.sections);

  it('substitui o currículo ativo pelas quinze aulas editoriais', () => {
    expect(coreModules.map((module) => module.id)).toEqual(
      Array.from({ length: 15 }, (_, index) => `mod${index}`),
    );
    expect(sections).toHaveLength(115);
    expect(sections.filter((section) => section.lessonId === 'A14')).toHaveLength(13);
    expect(new Set(sections.map((section) => section.contentUrl)).size).toBe(115);
    expect(sections.every((section) => !/^[GR]\d{2}\s*[·—-]/.test(section.title))).toBe(true);
    expect(coreModules.find((module) => module.id === 'mod13')?.title).toBe(
      'Compreensão, Interpretação e Tipologia Textual',
    );
  });

  it('publica somente conteúdos de estudo independentes de mídia e IDs internos', () => {
    const forbiddenTechnical = /==[0-9a-fA-F]{6,}==|\b(?:CANON|MARK|ORAL|QUOTE|TERM|VIS|KB|PROC|EX|WARN|TIP|UNCERTAIN|REL|CARD)-[A-Z0-9_-]+\b/;
    const forbiddenMedia = /\b(?:vídeos?|videoaulas?|timestamps?|\.mp4|\.srt)\b/i;
    for (const section of sections) {
      const file = path.join(process.cwd(), 'public', section.contentUrl!.replace(/^\//, ''));
      expect(fs.existsSync(file), section.contentUrl).toBe(true);
      const markdown = fs.readFileSync(file, 'utf8');
      expect(markdown, section.contentUrl).not.toMatch(forbiddenTechnical);
      expect(markdown, section.contentUrl).not.toMatch(forbiddenMedia);
    }
  });

  it('cobre todas as unidades integradas nos flashcards e usa questões editoriais', () => {
    const coveredUnits = new Set(
      EDITORIAL_FLASHCARDS.flatMap((card) => card.sourceRefs)
        .filter((reference) => reference.startsWith('EDITORIAL:')),
    );
    expect(EDITORIAL_FLASHCARDS.length).toBeGreaterThanOrEqual(115);
    expect(coveredUnits.size).toBe(102);

    const simulado = MODULES_DATA.find((module) => module.id === 'simulado');
    expect(simulado?.questions).toHaveLength(20);
    expect(simulado?.questions?.every((question) => question.origin === 'official')).toBe(true);
    expect(EDITORIAL_DUEL_QUESTIONS).toHaveLength(12);
    expect(EDITORIAL_DUEL_QUESTION_SET_VERSION).toBe(
      `editorial-duel-${PEDAGOGICAL_KNOWLEDGE_BUILD.buildId}`,
    );
  });

  it('roteia o Professor para a base editorial nova', () => {
    expect(PEDAGOGICAL_KNOWLEDGE_INDEX).toHaveLength(115);
    const records = retrieveKnowledge('quando usar crase antes de nome feminino?', 3);
    expect(records.some((record) => record.lessonId === 'A10')).toBe(true);
    const context = formatKnowledgeContext(records);
    expect(context).toContain('BASE EDITORIAL SuVeCa');
    expect(context).toContain('corpus_apostila');
    expect(context).toContain('Integracao_Pedagogica');
    expect(context).not.toContain('PERFIL CANÔNICO V3');
  });
});
