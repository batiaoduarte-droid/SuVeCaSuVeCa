import { describe, expect, it } from 'vitest';
import { parseStudyLocation, studyLocationUrl, type StudyLocationResolver } from './studyLocation';

const resolver: StudyLocationResolver = {
  isKnownModule: (moduleId) => ['mod0', 'mod1'].includes(moduleId),
  moduleIdForUnit: (unitId) => ({
    'IP-A00-G01': 'mod0',
    'IP-A00-G02': 'mod0',
    'IP-A01-G01': 'mod1',
  })[unitId] || null,
  macroIdForUnit: (unitId) => ({
    'IP-A00-G01': 'MACRO-A00-01',
    'IP-A00-G02': 'MACRO-A00-01',
    'IP-A01-G01': 'MACRO-A01-01',
  })[unitId] || null,
  unitsForMacro: (macroId) => ({
    'MACRO-A00-01': ['IP-A00-G01', 'IP-A00-G02'],
    'MACRO-A01-01': ['IP-A01-G01'],
  })[macroId] || null,
};

describe('studyLocation', () => {
  it('preserva deep links atômicos antigos e infere somente a macro exata', () => {
    expect(parseStudyLocation('?module=mod0&unit=IP-A00-G02&section=rules', resolver)).toEqual({
      moduleId: 'mod0',
      macroId: 'MACRO-A00-01',
      unitId: 'IP-A00-G02',
      sectionId: 'rules',
      routeIssue: null,
    });
  });

  it('abre uma rota macro no primeiro capítulo quando unit não foi informada', () => {
    expect(parseStudyLocation('?macro=MACRO-A01-01', resolver)).toMatchObject({
      moduleId: 'mod1',
      macroId: 'MACRO-A01-01',
      unitId: 'IP-A01-G01',
    });
  });

  it('ignora macro divergente quando a unidade atômica é válida', () => {
    expect(parseStudyLocation('?macro=MACRO-A01-01&unit=IP-A00-G01', resolver)).toMatchObject({
      moduleId: 'mod0',
      macroId: 'MACRO-A00-01',
      unitId: 'IP-A00-G01',
      routeIssue: null,
    });
  });

  it('descarta macro desconhecida e preserva a unidade atômica válida', () => {
    expect(parseStudyLocation('?macro=MACRO-A00-99&unit=IP-A00-G02&section=rules', resolver)).toEqual({
      moduleId: 'mod0',
      macroId: 'MACRO-A00-01',
      unitId: 'IP-A00-G02',
      sectionId: 'rules',
      routeIssue: null,
    });
  });

  it('sinaliza macro desconhecida quando não existe unidade válida de fallback', () => {
    expect(parseStudyLocation('?module=mod0&macro=MACRO-A00-99', resolver)).toEqual({
      moduleId: 'mod0',
      macroId: null,
      unitId: null,
      sectionId: null,
      routeIssue: 'invalid_macro',
    });
  });

  it('falha fechado para unidade desconhecida sem escolher conteúdo parecido', () => {
    expect(parseStudyLocation('?module=mod0&unit=IP-A00-G99&section=rules', resolver)).toEqual({
      moduleId: 'mod0',
      macroId: null,
      unitId: null,
      sectionId: null,
      routeIssue: 'invalid_unit',
    });
  });

  it('serializa module/macro/unit/section e preserva hash', () => {
    expect(studyLocationUrl('https://example.test/estudo?old=1#conteudo', {
      moduleId: 'mod0',
      macroId: 'MACRO-A00-01',
      unitId: 'IP-A00-G02',
      sectionId: 'rules',
      routeIssue: null,
    })).toBe('/estudo?old=1&module=mod0&macro=MACRO-A00-01&unit=IP-A00-G02&section=rules#conteudo');
  });
});
