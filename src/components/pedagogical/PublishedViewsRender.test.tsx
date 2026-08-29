import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PedagogicalUnitView } from '../../types/pedagogicalView';
import { PedagogicalUnitRenderer } from './PedagogicalUnitRenderer';
import { ContrastBoard, contrastToPlainText } from '../study-visuals/ContrastBoard';
import { ContentBlockRenderer } from './blocks/ContentBlockRenderer';
import { sanitizePedagogicalText } from './blocks/InlineRichText';

describe('renderização das unidades regulares publicadas', () => {
  it('renderiza as 102 View Models reais sem exceção de runtime', () => {
    const root = path.join(process.cwd(), 'public', 'knowledge', 'pedagogical', 'views');
    const files = fs.readdirSync(root).filter((name) => /^IP-A\d{2}-G\d{2}\.json$/.test(name)).sort();
    expect(files).toHaveLength(102);

    for (const file of files) {
      localStorage.clear();
      const view = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) as PedagogicalUnitView;
      const rendered = render(<PedagogicalUnitRenderer view={view} />);
      const match = rendered.container.textContent?.match(/\b(?:KB|PROC|WARN)-[A-Z0-9_-]+\b/);
      if (match) {
        throw new Error(`FILE ${file} CONTAINS INTERNAL ID: [${match[0]}] in context: "${rendered.container.textContent?.slice(Math.max(0, rendered.container.textContent.indexOf(match[0]) - 50), Math.min(rendered.container.textContent.length, rendered.container.textContent.indexOf(match[0]) + 100))}"`);
      }
      expect(rendered.container.querySelector('.pedagogical-unit-view'), file).not.toBeNull();
      expect(rendered.container.textContent, file).not.toContain('[object Object]');

      cleanup();
    }
  }, 75_000);

  it('preserva na UI todos os campos pedagógicos dos 181 contrastes publicados', () => {
    const root = path.join(process.cwd(), 'public', 'knowledge', 'pedagogical', 'views');
    const files = fs.readdirSync(root).filter((name) => /^IP-A\d{2}-G\d{2}\.json$/.test(name)).sort();
    let contrastCount = 0;

    for (const file of files) {
      const view = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) as PedagogicalUnitView;
      for (const contrast of view.sections?.contrasts?.items || []) {
        contrastCount += 1;
        const rendered = render(
          <ContrastBoard
            contrast={contrast}
            renderBlock={(block) => <ContentBlockRenderer block={block} />}
          />,
        );
        const content = rendered.container.textContent || '';
        if (contrast.presentation?.hideGenericScaffold) {
          expect(content, `${file}: scaffold genérico do contraste continua visível`).not.toMatch(/\bElemento A\b/);
          expect(content, `${file}: scaffold genérico do contraste continua visível`).not.toMatch(/\bElemento B\b/);
          expect(contrast.blocks?.length, `${file}: contraste source-backed sem blocos`).toBeGreaterThan(0);
          for (const block of contrast.blocks || []) {
            if (block.type !== 'table_ref' || !block.table) continue;
            for (const heading of [block.table.caption, ...block.table.headers].filter(Boolean)) {
              const visibleHeading = sanitizePedagogicalText(heading || '');
              if (visibleHeading) expect(content, `${file}: tabela canônica omitiu "${visibleHeading}"`).toContain(visibleHeading);
            }
            const desktopRows = rendered.container.querySelectorAll('table tbody tr');
            expect(desktopRows, `${file}: tabela canônica perdeu linhas`).toHaveLength(block.table.rows.length);
            for (const row of desktopRows) {
              expect(row.querySelectorAll('td'), `${file}: tabela canônica perdeu colunas`).toHaveLength(block.table.headers.length);
              expect(row.textContent?.trim(), `${file}: linha canônica vazia`).not.toBe('');
            }
          }
          expect(contrastToPlainText(contrast), `${file}: cópia do contraste source-backed vazia`).not.toBe('');
          cleanup();
          continue;
        }
        const sideA = typeof contrast.sideA === 'string'
          ? [contrast.sideA]
          : [contrast.sideA?.description, ...(contrast.sideA?.criteria || [])];
        const sideB = typeof contrast.sideB === 'string'
          ? [contrast.sideB]
          : [contrast.sideB?.description, ...(contrast.sideB?.criteria || [])];
        const learnerFacingFields = [
          contrast.conceptA?.replace(/^\s*\d+(?:\.\d+)*[.)]?\s+/, ''),
          contrast.conceptB?.replace(/^\s*\d+(?:\.\d+)*[.)]?\s+/, ''),
          contrast.left,
          contrast.right,
          ...sideA,
          ...sideB,
          contrast.decisionCriterion,
          contrast.decisiveDifference,
          contrast.minimalPair?.left,
          contrast.minimalPair?.right,
          contrast.minimalPair?.sentenceA,
          contrast.minimalPair?.sentenceB,
          contrast.minimalPair?.decisiveDifference,
          contrast.minimalPair?.difference,
          contrast.practicalHeuristic,
          contrast.pitfall,
          contrast.commonConfusion,
        ].filter((value): value is string => Boolean(value?.trim()));

        for (const field of learnerFacingFields) {
          const visibleField = field.replace(/[*_`]/g, '');
          expect(
            content.includes(field) || content.includes(visibleField),
            `${file}: contraste ${contrast.contrastId || contrast.title || 'sem id'} omitiu "${field}"`,
          ).toBe(true);
        }
        if (contrast.statement?.trim()) {
          expect(contrastToPlainText(contrast), `${file}: cópia do contraste omitiu o enunciado integral`).toContain(contrast.statement);
        }
        cleanup();
      }
    }

    expect(contrastCount).toBe(181);
  }, 45_000);
});
