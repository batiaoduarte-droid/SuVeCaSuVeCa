import { describe, expect, it } from 'vitest';
import { MODULES_DATA } from '../data/modulesData';
import {
  mergeModuleNotesPreservingConflicts,
  migrateModuleNotesToStableUnitIds,
  selectVisibleModuleSections,
} from './ModuleViewer';

describe('migração de anotações por unidade', () => {
  const moduleA00 = MODULES_DATA.find((module) => module.id === 'mod0')!;

  it('copia a nota legada para a chave estável sem apagar a origem', () => {
    const migrated = migrateModuleNotesToStableUnitIds(moduleA00, {
      'section-0': '<p>Minha regra.</p>',
    });

    expect(migrated['section-0']).toBe('<p>Minha regra.</p>');
    expect(migrated['unit:IP-A00-G01']).toBe('<p>Minha regra.</p>');
  });

  it('não sobrescreve uma nota estável diferente', () => {
    const migrated = migrateModuleNotesToStableUnitIds(moduleA00, {
      'section-0': '<p>Nota antiga.</p>',
      'unit:IP-A00-G01': '<p>Nota atual.</p>',
    });

    expect(migrated['section-0']).toBe('<p>Nota antiga.</p>');
    expect(migrated['unit:IP-A00-G01']).toBe('<p>Nota atual.</p>');
  });

  it('preserva a versão local quando a nuvem tem texto divergente', () => {
    const merged = mergeModuleNotesPreservingConflicts(
      { 'unit:IP-A00-G01': '<p>Nota local.</p>' },
      { 'unit:IP-A00-G01': '<p>Nota da nuvem.</p>' },
    );

    expect(merged['unit:IP-A00-G01']).toBe('<p>Nota da nuvem.</p>');
    expect(merged['conflict:local:unit:IP-A00-G01']).toBe('<p>Nota local.</p>');
  });

  it('monta somente a unidade atômica ativa no modo macro', () => {
    const selected = selectVisibleModuleSections(moduleA00, true, 'IP-A00-G02');
    expect(selected).toHaveLength(1);
    expect(selected[0].section.editorial?.integrationUnitId).toBe('IP-A00-G02');

    expect(selectVisibleModuleSections(moduleA00, true, null)).toEqual([]);
    expect(selectVisibleModuleSections(moduleA00, false, null)).toHaveLength(moduleA00.sections.length);
  });
});
