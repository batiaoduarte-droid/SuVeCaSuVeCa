import { describe, expect, it } from 'vitest';
import { resolveLegacyReadUnitIds } from './useLearningMetrics';

describe('migração de LearningMetrics v2', () => {
  it('resolve índices legados para IDs estáveis e ignora entradas inválidas', () => {
    expect(resolveLegacyReadUnitIds([
      'mod0:section-0',
      'mod0:section-0',
      'mod0:section-1',
      'mod-inexistente:section-2',
      'formato-inválido',
    ])).toEqual(['IP-A00-G01', 'IP-A00-G02']);
  });

  it('preserva a identidade própria das revisões A14', () => {
    expect(resolveLegacyReadUnitIds(['mod14:section-0'])).toEqual(['IP-A14-S01']);
  });
});
