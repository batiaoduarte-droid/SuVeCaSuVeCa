const INLINE_OPTION_MARKER = /(?:^|[\n\r\t ])(?:\(([A-E])\)|([A-E])[\).])\s*/gim;

const EMBEDDED_COMMAND_MARKER = /(?:^|\n+|[.!?]\s+)((?:a\s+corre[cç][aã]o\s+gramatical|mantendo-se|no\s+(?:\d+[.ºª°]*|primeiro|segundo|terceiro|quarto|quinto|[uú]ltimo|pen[uú]ltimo)\s+(?:per[ií]odo|par[aá]grafo)|no\s+texto\b|na\s+linha\b|seria\s+mantida|seria\s+gramaticalmente|estariam\s+mantidos|com\s+rela[cç][aã]o\s+aos?\b|considerando\s+os?\b|acerca\s+d[ao]s?\b|sem\s+altera[cç][aã]o\b|sem\s+preju[ií]zo\b|cada\s+uma\s+das\s+op[cç][oõ]es\b|assinale\s+a\s+op[cç][aã]o\b|assinale\s+a\s+alternativa\b|julgue\s+o\s+item\b|o\s+emprego\s+d[ao]\b)[\s\S]*)/gim;

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

/**
 * Recupera a separação editorial quando o corpus legado serializou texto de
 * apoio e comando dentro de `prompt`. A operação não reescreve conteúdo: ela
 * apenas encontra o último início inequívoco de comando e preserva os dois
 * recortes literais como apresentação derivada.
 */
export const separateEmbeddedSupportFromCommand = (prompt) => {
  const source = String(prompt || '').trim();
  if (!source) return { command: '', supportText: '', embeddedSupportSeparated: false };

  const matches = [...source.matchAll(EMBEDDED_COMMAND_MARKER)]
    .map((match) => {
      const full = String(match[0] || '');
      const command = String(match[1] || '').trim();
      const relativeStart = full.lastIndexOf(String(match[1] || ''));
      return {
        command,
        commandStart: Number(match.index) + Math.max(0, relativeStart),
      };
    })
    .filter(({ command, commandStart }) => commandStart >= 100 && command.length >= 20);

  const selected = matches.at(-1);
  if (!selected) return { command: source, supportText: '', embeddedSupportSeparated: false };

  const supportText = source.slice(0, selected.commandStart).trim();
  if (supportText.length < 100) {
    return { command: source, supportText: '', embeddedSupportSeparated: false };
  }
  return {
    command: selected.command,
    supportText,
    embeddedSupportSeparated: true,
  };
};
