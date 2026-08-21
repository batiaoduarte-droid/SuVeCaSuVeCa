import { describe, expect, it } from 'vitest';
import { normalizeProcedureStepAction } from './ResolutionSection';

describe('normalizeProcedureStepAction', () => {
  it.each([
    ['1. Identifique o verbo.', 'Identifique o verbo.'],
    ['Passo 2 — Aplique o teste.', 'Aplique o teste.'],
    ['• Verifique a exceção.', 'Verifique a exceção.'],
    ['SE SIM: use hífen -> encerre.', 'SE SIM: use hífen → encerre.'],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeProcedureStepAction(input)).toBe(expected);
  });
});
