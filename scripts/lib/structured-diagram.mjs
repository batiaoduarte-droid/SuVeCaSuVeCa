const GLYPH_PATTERN = /[┌┐└┘├┤┬┴┼│▼▲─═]/gu;

const item = (id, label, details = []) => ({
  id,
  label: String(label || '').trim(),
  ...(details.filter(Boolean).length ? { details: details.map((detail) => String(detail).trim()) } : {}),
});

export const extractStructuredSource = (markdown) => {
  const source = String(markdown || '');
  const fenced = [...source.matchAll(/```(?:text)?\s*\n([\s\S]*?)\n```/gi)]
    .map((match) => match[1].trim())
    .filter((candidate) => (candidate.match(GLYPH_PATTERN) || []).length >= 2);
  if (fenced.length) return fenced.sort((a, b) => b.length - a.length)[0];
  return (source.match(GLYPH_PATTERN) || []).length >= 3 ? source.trim() : '';
};

const fragments = (source) => {
  let prepared = source
    .replace(/[─═]{2,}\s*(?:>|►)/gu, ' → ')
    .replace(/(?:┌|├|└)[─═]*\s*(?:>|►)?/gu, '\n')
    .replace(/(?:┐|┤|┘|┬|┴|┼)[─═]*/gu, '\n')
    .replace(/[│▼▲]+/gu, '\n')
    .replace(/\s*•\s*/gu, '\n• ')
    .replace(/\s+(?=[①②③④⑤⑥⑦⑧⑨⑩])/gu, '\n');
  return prepared
    .split(/\r?\n/)
    .map((part) => part.replace(/^[\s─═>►◄←→+]+|[\s─═>►◄←→+]+$/gu, '').trim())
    .filter((part) => part && !/^[\W_]+$/u.test(part));
};

export const projectStructuredDiagram = (source, declaredKind = 'relationship') => {
  const compact = String(source || '').replace(/\s+/gu, ' ').trim();
  if (!compact) return undefined;

  if (compact.includes('ALGORITMO DE ANÁLISE FONÉTICA')) {
    return {
      kind: 'sequence',
      rootLabel: 'Algoritmo de análise fonética',
      items: [
        item('step-1', 'Divisão silábica fonética', [
          'Falar pausadamente e observar a abertura de boca.',
          'Quando uma consoante fica sem vogal, ela recua na divisão: af-ta.',
          'Distinguir dígrafos separáveis e inseparáveis.',
        ]),
        item('step-2', 'Varredura de dígrafos', [
          'Localizar dígrafos consonantais: CH, RR, SS, SC etc.',
          'Verificar, nos grupos QU e GU, se o U é mudo.',
          'Localizar dígrafos vocálicos: vogal + M/N na mesma sílaba.',
        ]),
        item('step-3', 'Encontros vocálicos e consonantais', [
          'Letras mudas são consumidas no dígrafo.',
          'V + SV = ditongo decrescente; SV + V = ditongo crescente.',
          'V | V = hiato; consoantes audíveis = encontro consonantal.',
        ]),
        item('step-4', 'Cálculo de grafemas e fonemas', [
          'Fonemas = letras − (dígrafos + H inicial) + X dífono.',
        ]),
      ],
    };
  }

  // Fora dos casos adjudicados acima, a projeção respeita os próprios limites
  // gráficos da fonte. Não tenta reconstruir colunas ou agrupar passos que se
  // perderam na linearização editorial.
  const parts = fragments(source);
  let rootLabel;
  if (parts.length > 1 && parts[0].length <= 100) {
    const letters = [...parts[0]].filter((char) => /[A-Za-zÀ-ÿ]/u.test(char));
    const uppercase = letters.filter((char) => char === char.toLocaleUpperCase('pt-BR')).length;
    if (letters.length && uppercase / letters.length >= 0.65) rootLabel = parts.shift();
  }
  const items = (parts.length ? parts : [compact]).map((part, index) =>
    item(`segment-${String(index + 1).padStart(2, '0')}`, part.replace(/^•\s*/u, '')),
  );
  const kind = items.length === 1
    ? 'source_segments'
    : /[├┼┬┴]/u.test(source) ? 'branches' : declaredKind === 'flow' ? 'sequence' : 'relations';
  return { kind, ...(rootLabel ? { rootLabel } : {}), items };
};

export const projectStructuredDiagramFromMarkdown = (markdown) => {
  const sourceText = extractStructuredSource(markdown);
  if (!sourceText) return undefined;
  return {
    sourceText,
    structure: projectStructuredDiagram(sourceText, /\b(?:PASSO|INÍCIO|ETAPA)\b/iu.test(sourceText) ? 'flow' : 'relationship'),
  };
};
