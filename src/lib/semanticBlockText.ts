import type { SemanticBlock } from '../types/pedagogicalView';

const strings = (values: unknown[]): string[] =>
  values.flatMap((value) => {
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    if (Array.isArray(value)) return strings(value);
    return [];
  });

export const semanticBlockToPlainText = (block: SemanticBlock): string => {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'concept_explanation':
    case 'callout':
    case 'code':
      return block.text;
    case 'list':
    case 'bullet_list':
      return strings(['title' in block ? block.title : undefined, block.items]).join('\n');
    case 'table_ref': {
      const table = block.table;
      if (!table) return '';
      return strings([table.caption, table.headers.join(' | '), table.rows.map((row) => row.join(' | '))]).join('\n');
    }
    case 'table':
      return strings([
        block.title,
        block.caption,
        block.columns.join(' | '),
        block.rows.map((row) => Array.isArray(row) ? row.join(' | ') : block.columns.map((column) => row[column] || '').join(' | ')),
        block.text,
      ]).join('\n');
    case 'comparison_matrix':
      return strings([
        block.title,
        block.columns.join(' | '),
        block.rows.map((row) => Array.isArray(row) ? row.join(' | ') : block.columns.map((column) => row[column] || '').join(' | ')),
        block.text,
      ]).join('\n');
    case 'concept_definition':
      return strings([block.term, block.definition, block.text]).join('\n');
    case 'classification':
      return strings([block.title, block.categories.map((category) => [category.name, category.category, category.description, category.examples, category.items]), block.text]).join('\n');
    case 'taxonomy':
      return strings([block.title, block.categories?.map((category) => [category.name, category.category, category.description, category.examples, category.items]), block.nodes?.map((node) => node.label), block.text]).join('\n');
    case 'rule_boundary':
      return strings([block.title, block.scope, block.conditions, block.exceptions, block.text]).join('\n');
    case 'formula':
      return strings([block.title, block.expression, block.variables?.map((variable) => `${variable.name}: ${variable.description}`), block.explanation, block.text]).join('\n');
    case 'procedure':
      return strings([block.title, block.objective, block.steps.map((step) => typeof step === 'string' ? step : [step.action, step.explanation, step.test]), block.text]).join('\n');
    case 'contrast':
      return strings([block.title, block.conceptA, block.sideA?.label, block.sideA?.criteria, block.conceptB, block.sideB?.label, block.sideB?.criteria, block.decisionCriterion, block.decisiveDifference, block.text]).join('\n');
    case 'minimal_pair':
      return strings([block.title, block.left, block.sentenceA, block.right, block.sentenceB, block.decisiveDifference, block.explanation, block.text]).join('\n');
    case 'annotated_sentence':
      return strings([block.title, block.sentence, block.segments.map((segment) => [segment.text, segment.role, segment.explanation]), block.analysis, block.text]).join('\n');
    case 'rule':
      return strings([block.title, block.statement, block.conditions, block.exceptions, block.text]).join('\n');
    case 'worked_example':
      return strings([block.title, block.prompt, block.analysisSteps, block.result, block.decisivePoint, block.commonMistake, block.examTip, block.text]).join('\n');
    case 'mnemonic':
      return strings([block.title, block.content, block.classification, block.appliesTo, block.limitations, block.text]).join('\n');
    case 'exam_trap':
      return strings([block.title, block.trigger, block.misleadingReasoning, block.expectedWrongConclusion, block.correctReasoning, block.decisiveTest, block.correctiveRule, block.text]).join('\n');
    case 'recall_prompt':
      return strings([block.question, block.keyPoints, block.targetConcept, block.text]).join('\n');
    case 'diagram':
      return strings([block.text, block.nodes?.map((node) => node.label), block.edges?.map((edge) => [edge.relation, edge.label])]).join('\n');
  }
};

export const semanticBlocksToPlainText = (blocks: SemanticBlock[] = []): string =>
  blocks.map(semanticBlockToPlainText).filter(Boolean).join('\n\n');
