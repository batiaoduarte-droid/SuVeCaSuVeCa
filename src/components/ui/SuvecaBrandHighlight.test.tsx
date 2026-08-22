import { describe, expect, it } from 'vitest';
import { highlightSuvecaInString, highlightSuvecaInReactNodes } from './SuvecaBrandHighlight';
import React from 'react';

describe('SuvecaBrandHighlight', () => {
  it('destaca a palavra SuVeCA no meio de frases normais', () => {
    const parts = highlightSuvecaInString('Fundamentos do Método SuVeCA');
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe('Fundamentos do Método ');
    expect(React.isValidElement(parts[1])).toBe(true);
  });

  it('destaca a cadeia Su-Ve-C-A-Pred', () => {
    const parts = highlightSuvecaInString('A ordem Su–Ve–C–A–Pred é a base.');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('A ordem ');
    expect(React.isValidElement(parts[1])).toBe(true);
    expect(parts[2]).toBe(' é a base.');
  });

  it('destaca a equação de significados Sujeito + Verbo + Complemento + Adjunto + Predicativo', () => {
    const parts = highlightSuvecaInString('Mapa: Sujeito + Verbo + Complemento + Adjunto + Predicativo');
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe('Mapa: ');
    expect(React.isValidElement(parts[1])).toBe(true);
  });

  it('preserva strings que não possuem termos SuVeCA', () => {
    const parts = highlightSuvecaInString('Texto sem nenhum termo especial.');
    expect(parts.length).toBe(1);
    expect(parts[0]).toBe('Texto sem nenhum termo especial.');
  });
});
