const separator = /^\s*---\s*$/;
const heading = /^(#{1,6})\s+(.+?)\s*$/;

export const auditPedagogicalMarkdown = (value) => {
  const errors = [];
  const lines = String(value || '').split(/\r?\n/);
  let fenced = false;
  let lastHeadingLevel = 0;
  let h1Count = 0;
  let previousSignificantSeparatorLine = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      previousSignificantSeparatorLine = null;
      continue;
    }
    if (fenced) continue;

    if ((line.match(/(?<![\p{L}\p{N}])[A-E]\)\s*/gu) || []).length >= 2) {
      errors.push({ line: lineNumber, rule: 'glued-alternative', message: 'Alternativa A–E colada ao texto anterior.' });
    }
    if (/^\s*\d+\.\s+\d+\.\s+/.test(line)) {
      errors.push({ line: lineNumber, rule: 'duplicate-numbering', message: 'Numeração duplicada no início da linha.' });
    }

    const headingMatch = heading.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      if (level === 1) h1Count += 1;
      if (lastHeadingLevel && level > lastHeadingLevel + 1) {
        errors.push({ line: lineNumber, rule: 'heading-hierarchy', message: `Salto de H${lastHeadingLevel} para H${level}.` });
      }
      lastHeadingLevel = level;
    }

    if (separator.test(line)) {
      if (previousSignificantSeparatorLine !== null) {
        errors.push({ line: lineNumber, rule: 'repeated-separator', message: `Separador repetido após a linha ${previousSignificantSeparatorLine}.` });
      }
      previousSignificantSeparatorLine = lineNumber;
    } else if (line.trim()) {
      previousSignificantSeparatorLine = null;
    }
  }

  if (fenced) errors.push({ line: lines.length, rule: 'unclosed-fence', message: 'Bloco de código sem fechamento.' });
  if (h1Count !== 1) errors.push({ line: 1, rule: 'heading-hierarchy', message: `Documento deve conter exatamente um H1; encontrados ${h1Count}.` });
  return errors;
};
