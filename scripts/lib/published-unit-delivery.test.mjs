// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditPublishedUnits } from './published-unit-delivery.mjs';

describe('entrega curricular por Views', () => {
  let root;
  const regular = { lessonId: 'A00', groupId: 'G01', editorial: { integrationUnitId: 'IP-A00-G01' } };
  const cumulative = { lessonId: 'A14', groupId: 'R01', editorial: { integrationUnitId: 'IP-A14-S01' } };
  const file = (id) => path.join(root, 'public/knowledge/pedagogical/views', `${id}.json`);
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'suveca-view-delivery-'));
    fs.mkdirSync(path.dirname(file('IP-A00-G01')), { recursive: true });
    for (const section of [regular, cumulative]) {
      const id = section.editorial.integrationUnitId;
      fs.writeFileSync(file(id), JSON.stringify({
        viewSchemaVersion: section === cumulative ? '1.0.0' : '4.2.2-source-backed-coverage',
        unitType: section === cumulative ? 'cumulative_review' : 'regular',
        unit: { unitId: id, lessonId: section.lessonId, title: 'Unidade' },
        sections: { explanation: { groups: [] } },
      }));
    }
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('aceita regular e A14 sem arquivos ou URLs Markdown', () => {
    expect(auditPublishedUnits(root, [regular, cumulative])).toEqual([]);
  });
  it('reprova View ausente e JSON truncado', () => {
    fs.unlinkSync(file('IP-A00-G01'));
    fs.writeFileSync(file('IP-A14-S01'), '{');
    expect(auditPublishedUnits(root, [regular, cumulative])).toHaveLength(2);
  });
  it('reprova identidade ausente, duplicada ou com tentativa de sair do diretório', () => {
    const errors = auditPublishedUnits(root, [regular, regular, { ...cumulative, editorial: {} }, {
      ...regular, editorial: { integrationUnitId: '../../escape' },
    }]);
    expect(errors).toHaveLength(3);
  });
  it('reprova outra unidade, aula ou versão e preserva o contrato próprio de A14', () => {
    const id = 'IP-A14-S01';
    const data = JSON.parse(fs.readFileSync(file(id), 'utf8'));
    data.unit.unitId = 'IP-A00-G01';
    data.unit.lessonId = 'A00';
    data.viewSchemaVersion = '4.2.0';
    data.sections = [];
    fs.writeFileSync(file(id), JSON.stringify(data));
    expect(auditPublishedUnits(root, [cumulative])).toHaveLength(4);
  });
});
