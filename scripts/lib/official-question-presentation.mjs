const INLINE_OPTION_MARKER = /(?:^|[\n\r\t ])(?:\(([A-E])\)|([A-E])[\).])\s*/gim;

const normalize = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('pt-BR');

const optionLabel = (option) => String(option?.letter || option?.label || '').trim().toUpperCase();

/**
 * Separa alternativas serializadas no fim do prompt somente quando elas
 * reproduzem, na mesma ordem, o array estruturado de alternativas. A
 * validação de equivalência impede que enumerações legítimas do comando
 * sejam removidas por heurística.
 */
export const separateInlineOptionsFromCommand = (prompt, options) => {
  const source = String(prompt || '').trim();
  const structuredOptions = Array.isArray(options) ? options : [];
  if (!source || structuredOptions.length < 2) {
    return { command: source, duplicatedInlineOptions: false };
  }

  const matches = [...source.matchAll(INLINE_OPTION_MARKER)];
  if (matches.length < structuredOptions.length) {
    return { command: source, duplicatedInlineOptions: false };
  }

  const start = matches.length - structuredOptions.length;
  const run = matches.slice(start);
  const parsed = run.map((match, index) => ({
    label: String(match[1] || match[2] || '').toUpperCase(),
    text: source.slice(
      Number(match.index) + match[0].length,
      index + 1 < run.length ? Number(run[index + 1].index) : source.length,
    ).trim(),
  }));
  const equivalent = parsed.every((option, index) => (
    option.label === optionLabel(structuredOptions[index])
    && normalize(option.text) === normalize(structuredOptions[index]?.text)
  ));
  if (!equivalent) return { command: source, duplicatedInlineOptions: false };

  return {
    command: source.slice(0, Number(run[0].index)).trim(),
    duplicatedInlineOptions: true,
  };
};

export const hasDuplicatedInlineOptions = (prompt, options) => (
  separateInlineOptionsFromCommand(prompt, options).duplicatedInlineOptions
);
