import { describe, expect, it } from 'vitest';
import { parseMacroCurriculumFlag } from './featureFlags';

describe('macro curriculum rollout flag', () => {
  it('permanece fail-closed salvo opt-in explícito', () => {
    expect(parseMacroCurriculumFlag(undefined)).toBe(false);
    expect(parseMacroCurriculumFlag('false')).toBe(false);
    expect(parseMacroCurriculumFlag('1')).toBe(false);
    expect(parseMacroCurriculumFlag(' true ')).toBe(true);
  });
});
