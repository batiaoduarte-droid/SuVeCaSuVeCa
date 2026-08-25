import React, { isValidElement, type ReactNode } from 'react';

/**
 * Renderiza a sigla SuVeCA com as cores canônicas do Código Cromático Tático:
 * Su (Azul) | Ve (Verde) | C (Amarelo) | A (Roxo)
 */
export const SuvecaWordBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-mono font-black tracking-tight inline-flex items-baseline select-text ${className}`}>
    <span className="text-blue-600 font-black">Su</span>
    <span className="text-emerald-600 font-black">Ve</span>
    <span className="text-amber-500 font-black">C</span>
    <span className="text-purple-600 font-black">A</span>
  </span>
);

/**
 * Renderiza a sequência Su-Ve-C-A-Pred com as cores canônicas
 */
export const SuvecaChainBadge: React.FC<{ hasPred?: boolean; className?: string }> = ({
  hasPred = true,
  className = '',
}) => (
  <span className={`font-mono font-black tracking-tight inline-flex items-baseline select-text ${className}`}>
    <span className="text-blue-600 font-black">Su</span>
    <span className="text-slate-400 font-bold mx-0.5">–</span>
    <span className="text-emerald-600 font-black">Ve</span>
    <span className="text-slate-400 font-bold mx-0.5">–</span>
    <span className="text-amber-500 font-black">C</span>
    <span className="text-slate-400 font-bold mx-0.5">–</span>
    <span className="text-purple-600 font-black">A</span>
    {hasPred && (
      <>
        <span className="text-slate-400 font-bold mx-0.5">–</span>
        <span className="text-pink-600 font-black">Pred</span>
      </>
    )}
  </span>
);

/**
 * Renderiza a equação expandida Sujeito + Verbo + Complemento + Adjunto + Predicativo
 */
export const SuvecaExpandedEquation: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex flex-wrap items-center gap-1 font-bold select-text ${className}`}>
    <span className="text-blue-600 font-black">
      Su<span className="font-semibold text-blue-900/85">jeito</span>
    </span>
    <span className="text-slate-400 font-bold mx-0.5">+</span>
    <span className="text-emerald-600 font-black">
      Ve<span className="font-semibold text-emerald-900/85">rbo</span>
    </span>
    <span className="text-slate-400 font-bold mx-0.5">+</span>
    <span className="text-amber-600 font-black">
      C<span className="font-semibold text-amber-900/85">omplemento</span>
    </span>
    <span className="text-slate-400 font-bold mx-0.5">+</span>
    <span className="text-purple-600 font-black">
      A<span className="font-semibold text-purple-900/85">djunto</span>
    </span>
    <span className="text-slate-400 font-bold mx-0.5">+</span>
    <span className="text-pink-600 font-black">
      Pred<span className="font-semibold text-pink-900/85">icativo</span>
    </span>
  </span>
);

// Regex para capturar SuVeCA, cadeias de blocos e a expansão de significados
const SUVECA_PATTERN = /(Sujeito\s*\+\s*Verbo\s*\+\s*Complemento\s*\+\s*Adjunto\s*\+\s*Predicativo|Su[–-]Ve[–-]C[–-]A[–-]Pred|Su[–-]Ve[–-]C[–-]A|\bSuVeCA\b|\bSUVECA\b)/g;

/**
 * Transforma uma string substituindo menções a SuVeCA e equações por componentes cromáticos
 */
export const highlightSuvecaInString = (text: string): ReactNode[] => {
  if (!text || typeof text !== 'string') return [text];
  if (!SUVECA_PATTERN.test(text)) return [text];

  // Reset regex lastIndex
  SUVECA_PATTERN.lastIndex = 0;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = SUVECA_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matchedText = match[0];
    const key = `suveca-hl-${match.index}-${matchedText}`;

    if (/^Sujeito\s*\+\s*Verbo/i.test(matchedText)) {
      parts.push(<SuvecaExpandedEquation key={key} />);
    } else if (/Pred/i.test(matchedText) && /[–-]/.test(matchedText)) {
      parts.push(<SuvecaChainBadge key={key} hasPred={true} />);
    } else if (/[–-]/.test(matchedText)) {
      parts.push(<SuvecaChainBadge key={key} hasPred={false} />);
    } else {
      parts.push(<SuvecaWordBadge key={key} />);
    }

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

/**
 * Percorre recursivamente nós React (strings, arrays ou elementos) aplicando o destaque cromático
 */
export const highlightSuvecaInReactNodes = (node: ReactNode): ReactNode => {
  if (typeof node === 'string') {
    const highlighted = highlightSuvecaInString(node);
    return highlighted.length === 1 ? highlighted[0] : <>{highlighted}</>;
  }

  if (Array.isArray(node)) {
    return node.map((child, idx) => (
      <React.Fragment key={idx}>{highlightSuvecaInReactNodes(child)}</React.Fragment>
    ));
  }

  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
    // Não substitui se for tag especial como code, pre ou math
    if (['code', 'pre', 'script', 'style'].includes(String(node.type))) {
      return node;
    }
    return React.cloneElement(node, {
      children: highlightSuvecaInReactNodes(node.props.children),
    });
  }

  return node;
};

/**
 * Componente wrapper de alto nível para aplicar coloração cromática ao texto
 */
export const SuvecaWordHighlight: React.FC<{ text?: string; children?: ReactNode; className?: string }> = ({
  text,
  children,
  className = '',
}) => {
  const content = text !== undefined ? text : children;
  if (!content) return null;

  return <span className={`suveca-highlight-wrapper ${className}`}>{highlightSuvecaInReactNodes(content)}</span>;
};
