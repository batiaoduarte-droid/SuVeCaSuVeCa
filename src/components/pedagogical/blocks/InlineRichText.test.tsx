import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineRichText, sanitizePedagogicalText } from './InlineRichText';

describe('InlineRichText', () => {
  describe('sanitizePedagogicalText', () => {
    it('preserva fórmulas com símbolos matemáticos e setas LaTeX', () => {
      const input = 'Dígrafo / H inicial $\\rightarrow$ -1';
      const output = sanitizePedagogicalText(input);
      expect(output).toContain('→');
      expect(output).toContain('-1');
    });

    it('trata comandos \\text{...} mantendo a expressão válida para KaTeX', () => {
      const input = '$\\text{Dígrafo / H inicial} \\rightarrow -1$';
      const output = sanitizePedagogicalText(input);
      expect(output).toContain('Dígrafo / H inicial');
      expect(output).toContain('\\rightarrow');
    });

    it('preserva dífono fonético /ks/ com ou sem delimitadores matemáticos', () => {
      const input = '$X = \\text{/ks/} \\rightarrow +1$';
      const output = sanitizePedagogicalText(input);
      expect(output).toContain('/ks/');
      expect(output).toContain('+1');
    });

    it('remove referências técnicas internas como [KB-123]', () => {
      const input = 'Regra fundamental [KB-123].';
      const output = sanitizePedagogicalText(input);
      expect(output).toBe('Regra fundamental.');
    });
  });

  describe('renderização do componente InlineRichText', () => {
    it('renderiza texto formatado com tags markdown e ênfase', () => {
      render(<InlineRichText>Oração **reduzida** de particípio.</InlineRichText>);
      const strongElement = screen.getByText('reduzida');
      expect(strongElement.tagName).toBe('STRONG');
    });

    it('renderiza corretamente a colinha de rascunho de fonemas sem crash', () => {
      const { container } = render(
        <InlineRichText>
          {'$\\text{Dígrafo / H inicial} \\rightarrow -1$ $X = \\text{/ks/} \\rightarrow +1$'}
        </InlineRichText>
      );
      expect(container.querySelector('.katex')).not.toBeNull();
      expect(container.textContent).toContain('Dígrafo / H inicial');
      expect(container.textContent).toContain('/ks/');
    });
  });
});
