import { describe, expect, it } from 'vitest';
import {
  isCumulativeReviewView,
  isSupportedPedagogicalViewVersion,
  parsePublishedPedagogicalView,
} from './pedagogicalViewContract';

const regularView = {
  viewSchemaVersion: '4.2.0-semantic-authoring',
  source: { unitId: 'IP-A02-G01' },
  unit: { unitId: 'IP-A02-G01', lessonId: 'A02', title: 'Classes de Palavras' },
  sections: { explanation: { groups: [] } },
};

describe('contrato das View Models publicadas', () => {
  it.each(['1.0.0', '4.2.0-semantic-authoring', '4.2.0-hardened'])(
    'aceita a versão publicada %s',
    (version) => expect(isSupportedPedagogicalViewVersion(version)).toBe(true),
  );

  it('aceita uma unidade regular v4.2 e preserva seu tipo', () => {
    const parsed = parsePublishedPedagogicalView(regularView, 'IP-A02-G01');
    expect(isCumulativeReviewView(parsed)).toBe(false);
  });

  it('rejeita versão, identidade e aula divergentes', () => {
    expect(() => parsePublishedPedagogicalView({ ...regularView, viewSchemaVersion: '5.0.0' }, 'IP-A02-G01')).toThrow(/versão/i);
    expect(() => parsePublishedPedagogicalView(regularView, 'IP-A02-G02')).toThrow(/divergente/i);
    expect(() => parsePublishedPedagogicalView({ ...regularView, unit: { ...regularView.unit, lessonId: 'A03' } }, 'IP-A02-G01')).toThrow(/aula divergente/i);
  });
});
