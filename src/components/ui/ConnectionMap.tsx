import React from 'react';
import { PorquesVisualGuide } from './PorquesVisualGuide';
import { SyllablePhoneticsVisualGuide } from './SyllablePhoneticsVisualGuide';
import { DigrafosVisualGuide } from './DigrafosVisualGuide';
import { WordStructureVisualGuide } from './WordStructureVisualGuide';
import { XPolyphonyVisualGuide } from './XPolyphonyVisualGuide';
import { AccentuationVisualGuide } from './AccentuationVisualGuide';
import { CraseVisualGuide } from './CraseVisualGuide';
import { PunctuationCommaVisualGuide } from './PunctuationCommaVisualGuide';
import { QueSeFunctionsVisualGuide } from './QueSeFunctionsVisualGuide';
import { PedagogicalFlowchart } from './PedagogicalFlowchart';
import { PedagogicalTreeDiagram } from './PedagogicalTreeDiagram';
import { MarkdownContent } from './MarkdownContent';

interface ConnectionMapProps {
  source: string;
}

export const looksLikeConnectionMap = (source: string): boolean => {
  if (!source || typeof source !== 'string') return false;

  // Se for estritamente uma tabela Markdown (linhas iniciando com | e tendo divisores |--), não é ConnectionMap
  if (/^\s*\|.*\|\s*$/m.test(source) && /\|(?:\s*[-:]+\s*\|)+/.test(source) && !source.includes('├──') && !source.includes('└──')) {
    return false;
  }

  if (source.includes('EMPREGO DOS PORQUÊS') || (source.includes('PORQUÊ') && source.includes('POR QUÊ'))) {
    return true;
  }
  if (source.includes('ESTUDO DA SÍLABA') || source.includes('ENCONTROS VOCÁLICOS') || source.includes('Mantra da Vogal')) {
    return true;
  }
  if (source.includes('DÍGRAFOS') || (source.includes('CONSONANTAIS:') && source.includes('VOCÁLICOS:'))) {
    return true;
  }
  if (source.includes('ESTRUTURA DA PALAVRA') || source.includes('PLANO GRÁFICO') || source.includes('RELAÇÃO MATEMÁTICA')) {
    return true;
  }
  if (source.includes('POLIFONIA DO X') || source.includes('QUADRO DA POLIFONIA') || (source.includes('SOM DE /ks/') && source.includes('SOM DE /s/'))) {
    return true;
  }
  if (source.includes('ACENTUAÇÃO GRÁFICA') || source.includes('PROPAROXÍTONAS') || (source.includes('PAROXÍTONAS') && source.includes('OXÍTONAS'))) {
    return true;
  }
  if (source.includes('CRASE') || source.includes('VOU A, VOLTO DA') || source.includes('REGRA GERAL DA CRASE')) {
    return true;
  }
  if (source.includes('VÍRGULA') || source.includes('PONTUAÇÃO') || source.includes('Su ↮ Ve')) {
    return true;
  }
  if (source.includes('FUNÇÕES DO QUE') || source.includes('FUNÇÕES DO SE') || source.includes('PARTÍCULA APASSIVADORA')) {
    return true;
  }
  if (source.includes('[INÍCIO') || source.includes('[Início') || (source.includes('PASSO 1:') && source.includes('PASSO 2:'))) {
    return true;
  }

  // Caracteres reais de ramificação de árvore ou fluxograma (sem pipe isolado de tabela)
  const treeBranchMatches = source.match(/[─-╿←-⇿▼▲◆┌┐└┘├┤┬┴┼═]|(?:\|──)|(?:├──)|(?:└──)/gu)?.length || 0;
  return treeBranchMatches >= 2;
};

export const ConnectionMap: React.FC<ConnectionMapProps> = ({ source }) => {
  if (!source) return null;

  // Se for detectado como tabela markdown pura, renderiza via MarkdownContent
  if (/^\s*\|.*\|\s*$/m.test(source) && /\|(?:\s*[-:]+\s*\|)+/.test(source) && !source.includes('├──') && !source.includes('└──')) {
    return (
      <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <MarkdownContent content={source} />
      </div>
    );
  }

  // 1. Specialized Guide: Os 4 Porquês
  if (source.includes('EMPREGO DOS PORQUÊS') || (source.includes('PORQUÊ') && source.includes('PORQUE') && source.includes('POR QUÊ'))) {
    return <PorquesVisualGuide />;
  }

  // 2. Specialized Guide: Dígrafos Consonantais e Vocálicos
  if (source.includes('DÍGRAFOS') && (source.includes('CONSONANTAIS') || source.includes('VOCÁLICOS') || source.includes('2L = 1 Som'))) {
    return <DigrafosVisualGuide />;
  }

  // 3. Specialized Guide: Estrutura da Palavra (Plano Gráfico vs Plano Fonético)
  if (source.includes('ESTRUTURA DA PALAVRA') || (source.includes('PLANO GRÁFICO') && source.includes('PLANO FONÉTICO'))) {
    return <WordStructureVisualGuide />;
  }

  // 4. Specialized Guide: Polifonia da Letra X
  if (source.includes('POLIFONIA DO X') || source.includes('QUADRO DA POLIFONIA') || (source.includes('SOM DE /ks/') && source.includes('SOM DE /z/'))) {
    return <XPolyphonyVisualGuide />;
  }

  // 5. Specialized Guide: Estudo da Sílaba e Fonética
  if (source.includes('ESTUDO DA SÍLABA') || source.includes('ENCONTROS VOCÁLICOS') || source.includes('Mantra da Vogal')) {
    return <SyllablePhoneticsVisualGuide />;
  }

  // 6. Specialized Guide: Acentuação Gráfica
  if (source.includes('ACENTUAÇÃO GRÁFICA') || (source.includes('PROPAROXÍTONAS') && source.includes('PAROXÍTONAS'))) {
    return <AccentuationVisualGuide />;
  }

  // 7. Specialized Guide: Crase no Método SuVeCA
  if (source.includes('CRASE') || source.includes('VOU A, VOLTO DA') || source.includes('CASOS PROIBIDOS DA CRASE')) {
    return <CraseVisualGuide />;
  }

  // 8. Specialized Guide: Pontuação e Regra Suprema da Vírgula
  if (source.includes('REGRA SUPREMA DA VÍRGULA') || (source.includes('VÍRGULA') && source.includes('Sujeito do Verbo'))) {
    return <PunctuationCommaVisualGuide />;
  }

  // 9. Specialized Guide: Funções do QUE e do SE
  if (source.includes('FUNÇÕES DO QUE') || source.includes('FUNÇÕES DO SE') || source.includes('PARTÍCULA APASSIVADORA') || source.includes('ÍNDICE DE INDETERMINAÇÃO')) {
    return <QueSeFunctionsVisualGuide />;
  }

  // 10. Algoritmos e Fluxogramas Decisórios
  if (source.includes('[INÍCIO') || source.includes('[Início') || (source.includes('PASSO 1:') && (source.includes('PASSO 2:') || source.includes('SIM:')))) {
    return <PedagogicalFlowchart source={source} />;
  }

  // 11. Árvores Sintáticas e Taxonomias Estruturadas
  return <PedagogicalTreeDiagram source={source} />;
};
