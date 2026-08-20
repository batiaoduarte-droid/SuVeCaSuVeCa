import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PedagogicalUnitView } from '../../types/pedagogicalView';
import { PedagogicalUnitRenderer } from './PedagogicalUnitRenderer';

describe('renderização das unidades regulares publicadas', () => {
  it('renderiza as 102 View Models reais sem exceção de runtime', () => {
    const root = path.join(process.cwd(), 'public', 'knowledge', 'pedagogical', 'views');
    const files = fs.readdirSync(root).filter((name) => /^IP-A\d{2}-G\d{2}\.json$/.test(name)).sort();
    expect(files).toHaveLength(102);

    for (const file of files) {
      localStorage.clear();
      const view = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) as PedagogicalUnitView;
      const rendered = render(<PedagogicalUnitRenderer view={view} />);
      expect(rendered.container.querySelector('.pedagogical-unit-view'), file).not.toBeNull();
      expect(rendered.container.textContent, file).not.toContain('[object Object]');
      expect(rendered.container.textContent, file).not.toMatch(/\b(?:KB|PROC|WARN)-[A-Z0-9_-]+\b/);
      cleanup();
    }
  }, 15_000);
});
