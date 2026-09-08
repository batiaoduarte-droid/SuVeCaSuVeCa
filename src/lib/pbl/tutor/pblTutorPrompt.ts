import { AttemptEvaluator } from '../engine/AttemptEvaluator';
import type {
  PBLTutorQuestionContext,
  PBLTutorTurnRequest,
} from '../../../types/pblTutor';

export const PBL_TUTOR_SYSTEM_INSTRUCTION = `Você é o Professor SuVeCA, tutor pedagógico contextual do percurso de Problem-Based Learning (PBL) em Língua Portuguesa para concursos públicos.

SEU PAPEL E POSTURA:
1. Diálogo Construtivo e Acolhedor: Conduza a intervenção com foco na investigação das dúvidas do aluno e na explicação dos critérios decisivos. Nunca use tom punitivo, irônico ou condescendente.
2. Não Presumir Falhas Pessoais: É TERMINANTEMENTE PROIBIDO emitir hipóteses depreciativas sobre o aluno (por exemplo: nunca diga que ele errou "por falta de atenção", "leitura descuidada", "pressa", "falha de interpretação básica" ou "vício"). Trate todo erro como uma hipótese pedagógica compreensível ou confusão entre critérios concorrentes.
3. Separação Tripartite:
   - Raciocínio do Aluno: hipótese que orientou a escolha.
   - Gabarito Oficial: critério normativo exigido pela banca.
   - Explicação Didática Derivada: material de apoio que complementa a regra (e que pode conter lapsos pontuais que devem ser tratados com rigor técnico).
4. Rigor Normativo Canônico (Benchmark Gramatical):
   - Caso clássico "porém / porem": ao tratar da perda de acento em "porém", destaque com clareza inegociável que "porem" é forma de infinitivo pessoal do verbo pôr (ex.: "para eles porem o livro na estante"). O futuro do subjuntivo do verbo pôr é "quando eles puserem" (ex.: "quando eles puserem tudo em ordem"). Jamais confunda ou classifique "porem" como futuro do subjuntivo.
5. Ancoragem no Contexto Fornecido:
   - Use com rigor as regras, condições de aplicação, exceções, tabelas comparativas e procedimentos decisórios fornecidos no contexto da questão.
   - Não invente regras gramaticais inexistentes.
   - Não mencione IDs técnicos crus no texto ao aluno (por exemplo, não diga "RULE-IP-A00-G01-03", e sim "a regra sobre o dífono X com som de /ks/").
6. Condução Pedagógica:
   - Se o aluno estiver confuso, faça uma pergunta socrática ou apresente o contraste decisivo entre a alternativa escolhida e a correta.
   - Se o aluno pedir explicação direta ("explique diretamente", "me ajuda", "diga a resposta"), explique objetivamente o método. Antes de uma tentativa registrada, preserve a resposta e a resolução do item; após a tentativa, relacione regra, evidência e conclusão.
   - Se o aluno pedir síntese para o Caderno de Erros, gere uma ficha clara no campo notebookDraft contendo gatilho, regra decisiva e exemplo de contraste.
   - Indique sempre uma recomendação de continuidade prática coerente no campo continuityRecommendation.
7. Calibração Metacognitiva e Andaime Dinâmico:
   - Alta confiança corresponde somente a high ("Muito seguro"). Se houver erro, investigue o critério escolhido e demonstre a distinção sustentada pelo contexto. medium não é erro de alta confiança. Confiança não comprova a causa do erro.
   - Se o aluno errou com Baixa Confiança ou Chute ("Chute" ou "Pouco seguro"): ofereça um procedimento acionável e ajuste a explicação à dúvida. Faça uma pergunta apenas quando ajudar a distinguir hipóteses; evite interrogatório repetitivo.
   - Se o aluno acertou com Baixa Confiança ou Chute ("Acerto Frágil"): convide-o a explicitar o critério e reaplicá-lo. Não atribua o acerto à sorte nem declare domínio duradouro a partir de um único item.
   - Forneça no campo "metacognitiveInsight" uma frase acolhedora sintetizando a relação entre confiança declarada e aplicação da regra.
8. Micro-interações e Validação Rápida:
   - Forneça no campo "reasoningChips" uma lista de 3 a 4 opções curtas de dúvidas ou hipóteses que o aluno pode clicar sem precisar digitar (ex.: "Qual foi a armadilha da banca?", "Explique a diferença entre minha opção e o gabarito", "Como aplicar este teste em outra frase?").
   - Quando pertinente para fixação, forneça no campo "quickCheck" um micro-desafio de 1 frase (com prompt, 2 opções concisas em options, label de correctOption e explanation de 1 linha) para checar compreensão imediata após a tentativa. Inclua sourceRefs com IDs de regras ou contrastes fornecidos, comando inequívoco, opções distintas e justificativa que aplique a condição decisiva. Polos A/B de contraste podem ser ambos válidos: nunca infira gabarito pela posição. Omita quickCheck quando não houver sustentação. Esta checagem não demonstra retenção nem bloqueia a continuidade do motor.
`;

export function formatTutorPrompt(
  request: PBLTutorTurnRequest,
  context: PBLTutorQuestionContext
): string {
  const parts: string[] = [];
  const hasAttempted = Boolean(request.studentAttemptContext?.userAnswer);
  const isDirectExplanation = Boolean(request.directExplanationRequested);
  const isUnavailable = Boolean(
    context.presentation.isUnavailable ||
    !context.presentation.prompt ||
    !context.presentation.officialAnswer
  );

  parts.push(`=== DADOS DA QUESTÃO E COMPETÊNCIA ===`);
  const compRef = context.primaryCompetencyRef || context.competencyRefs?.[0] || 'Competência PBL';
  const compTitle = context.competencyTitle || compRef;
  parts.push(`Competência: ${compTitle} (${compRef})`);
  if (context.pedagogy?.learningObjectives && context.pedagogy.learningObjectives.length > 0) {
    parts.push(`Objetivos de Aprendizagem: ${context.pedagogy.learningObjectives.join(', ')}`);
  }
  parts.push(`Enunciado da Questão:`);
  if (isUnavailable) {
    parts.push(`[QUESTÃO INDISPONÍVEL]: O conteúdo desta questão não possui todos os dados necessários (enunciado ou gabarito) para resolução assistida pelo tutor.`);
  } else {
    parts.push(context.presentation.prompt || '(Enunciado não fornecido)');
  }
  if (context.presentation.command && context.presentation.command !== context.presentation.prompt) {
    parts.push(`Comando: ${context.presentation.command}`);
  }

  if (context.presentation.options && context.presentation.options.length > 0) {
    parts.push(`Alternativas:`);
    for (const opt of context.presentation.options) {
      const optLetter = opt.label || (opt as any).letter || '';
      parts.push(`[${optLetter}] ${opt.text}`);
    }
  }

  if (hasAttempted) {
    parts.push(`Gabarito Oficial: ${context.presentation.officialAnswer || '(Não disponível)'}`);
    if (context.officialCommentary) {
      parts.push(`Comentário Oficial: ${context.officialCommentary}`);
    }
  } else {
    parts.push(`Gabarito Oficial: [RESERVADO ATÉ A SUBMISSÃO DA RESPOSTA]`);
  }

  const rules = context.criteria?.rules || context.pedagogy?.rules || [];
  const renderedBoundaryRefs = new Set<string>();

  if (rules.length > 0) {
    parts.push(`\n=== REGRAS E CONDIÇÕES NORMATIVAS ===`);
    for (const rule of rules) {
      parts.push(`• Regra: ${rule.title} [sourceRef: ${rule.ruleRef}]`);
      parts.push(`  Enunciado: ${rule.statement}`);
      if (rule.conditions && rule.conditions.length > 0) {
        parts.push(`  Condições: ${rule.conditions.join('; ')}`);
      }
      if (rule.exceptions && rule.exceptions.length > 0) {
        parts.push(`  Exceções: ${rule.exceptions.join('; ')}`);
      }
      if (rule.boundaries && rule.boundaries.length > 0) {
        for (const b of rule.boundaries) {
          renderedBoundaryRefs.add(b.boundaryRef || b.id || b.title);
          parts.push(`  Limite/Contorno da Regra (${b.title}):`);
          if (b.text) parts.push(`    Diretriz: ${b.text}`);
          if (b.conditions?.length) parts.push(`    Condições: ${b.conditions.join('; ')}`);
          if (b.exceptions?.length) parts.push(`    Exceções: ${b.exceptions.join('; ')}`);
          if (b.scope) parts.push(`    Escopo: ${b.scope}`);
          if (b.limits?.length) parts.push(`    Limites: ${b.limits.join('; ')}`);
          if (b.nonApplicabilityConditions?.length) parts.push(`    Não se aplica quando: ${b.nonApplicabilityConditions.join('; ')}`);
          if (b.traps?.length) parts.push(`    Armadilhas de banca: ${b.traps.join('; ')}`);
        }
      }
      if (rule.resolvedTable) {
        parts.push(`  Tabela de Apoio (${rule.resolvedTable.title}):`);
        parts.push(`  Colunas: ${rule.resolvedTable.columns.join(' | ')}`);
        for (const row of rule.resolvedTable.rows) {
          parts.push(`  Linha: ${row.join(' | ')}`);
        }
      }
    }
  }

  // Standalone boundaries not attached to an individual rule
  const standaloneBoundaries = (context.criteria?.boundaries || []).filter(
    (b) => !renderedBoundaryRefs.has(b.boundaryRef || b.id || b.title)
  );
  if (standaloneBoundaries.length > 0) {
    parts.push(`\n=== LIMITES E FRONTEIRAS NORMATIVAS (RULE BOUNDARIES) ===`);
    for (const b of standaloneBoundaries) {
      parts.push(`• Limite: ${b.title}`);
      if (b.text) parts.push(`  Diretriz: ${b.text}`);
      if (b.conditions?.length) parts.push(`  Condições: ${b.conditions.join('; ')}`);
      if (b.exceptions?.length) parts.push(`  Exceções: ${b.exceptions.join('; ')}`);
      if (b.scope) parts.push(`  Escopo: ${b.scope}`);
      if (b.limits?.length) parts.push(`  Limites: ${b.limits.join('; ')}`);
      if (b.nonApplicabilityConditions?.length) parts.push(`  Não se aplica quando: ${b.nonApplicabilityConditions.join('; ')}`);
      if (b.traps?.length) parts.push(`  Armadilhas de banca: ${b.traps.join('; ')}`);
    }
  }

  const contrasts = context.criteria?.contrasts || context.pedagogy?.contrasts || [];
  if (contrasts.length > 0) {
    parts.push(`\n=== CONTRASTES DECISIVOS ===`);
    for (const contrast of contrasts) {
      parts.push(`• Contraste: ${contrast.title} [sourceRef: ${contrast.contrastRef}]`);
      parts.push(`  Polo A: ${contrast.poleA} vs Polo B: ${contrast.poleB}`);
      parts.push(`  Critério Decisivo: ${contrast.decisionCriterion}`);
      if (contrast.sideACriteria && contrast.sideACriteria.length > 0) {
        parts.push(`    Critérios Polo A (${contrast.poleA}): ${contrast.sideACriteria.join('; ')}`);
      }
      if (contrast.sideBCriteria && contrast.sideBCriteria.length > 0) {
        parts.push(`    Critérios Polo B (${contrast.poleB}): ${contrast.sideBCriteria.join('; ')}`);
      }
    }
  }

  const procedures = context.criteria?.procedures || context.pedagogy?.procedures || [];
  if (procedures.length > 0) {
    parts.push(`\n=== PROCEDIMENTOS E ALGORITMOS DE DECISÃO ===`);
    for (const proc of procedures) {
      parts.push(`• Procedimento: ${proc.title}`);
      parts.push(proc.markdown);
    }
  }

  const standaloneTables = context.criteria?.tables || context.pedagogy?.tables || [];
  if (standaloneTables.length > 0) {
    parts.push(`\n=== TABELAS DE APOIO E MATRIZES NORMATIVAS ===`);
    for (const table of standaloneTables) {
      parts.push(`• Tabela: ${table.title}`);
      parts.push(`  Colunas: ${table.columns.join(' | ')}`);
      for (const row of table.rows) {
        parts.push(`  Linha: ${row.join(' | ')}`);
      }
    }
  }

  // Worked example / Solution strategy is exposed ONLY after the attempt has been submitted
  if (hasAttempted && context.solutionStrategy && context.solutionStrategy.length > 0) {
    parts.push(`\n=== ESTRATÉGIA DE RESOLUÇÃO GUIADA (WORKED EXAMPLE) ===`);
    for (const step of context.solutionStrategy) {
      parts.push(`Passo ${step.stepNumber}: ${step.action}`);
      if (step.rationale) {
        parts.push(`  Justificativa: ${step.rationale}`);
      }
    }
  }

  // Decisive point and distractor common mistakes are exposed ONLY after the attempt has been submitted
  const decisivePoint = context.pedagogy?.decisivePoint;
  const commonMistake = context.pedagogy?.commonMistake;
  if (hasAttempted && (decisivePoint || commonMistake)) {
    parts.push(`\n=== INTELIGÊNCIA PEDAGÓGICA DA BANCA ===`);
    if (decisivePoint) {
      parts.push(`• Ponto Decisivo: ${decisivePoint}`);
    }
    if (commonMistake) {
      parts.push(`• Hipótese Frequente de Distrator (Banca): ${commonMistake}`);
    }
  }

  // Objective option refutations are exposed ONLY after the attempt has been submitted
  if (hasAttempted && context.objectiveOptionAnalyses && context.objectiveOptionAnalyses.length > 0) {
    parts.push(`\n=== ANÁLISE OBJETIVA DAS ALTERNATIVAS ===`);
    for (const opt of context.objectiveOptionAnalyses) {
      const optLetter = opt.label || (opt as any).letter || '';
      parts.push(`[${optLetter}] ${opt.isCorrect ? '(CORRETA)' : '(INCORRETA)'} ${opt.optionText}`);
      parts.push(`Refutação Didática: ${opt.refutation}`);
    }
  }

  parts.push(`\n=== SITUAÇÃO ATUAL DO ALUNO NA SESSÃO ===`);
  if (request.studentAttemptContext) {
    const at = request.studentAttemptContext;
    parts.push(`Etapa da tentativa: ${at.attemptStage}`);
    if (at.userAnswer) parts.push(`Classificação do motor: ${AttemptEvaluator.evaluateConfidence(at.isCorrect, at.confidence || 'medium')}`);
    parts.push(`Resposta marcada pelo aluno: ${at.userAnswer || '(Ainda não respondeu)'}`);
    if (at.userAnswer) {
      parts.push(`Resultado da tentativa: ${at.isCorrect ? 'Correta' : 'Incorreta'}`);
    }
    if (at.confidence) {
      parts.push(`Nível de confiança declarado pelo aluno: ${at.confidence}`);
    }
  } else {
    parts.push(`O aluno solicitou apoio antes de submeter a tentativa.`);
  }

  if (!hasAttempted) {
    if (isDirectExplanation) {
      parts.push(`\n[MODO EXPLICAÇÃO DIRETA PRÉ-TENTATIVA]: O aluno solicitou explicação direta antes de responder à questão. Explique com profundidade as regras normativas, critérios e métodos procedimentais aplicáveis, mas NÃO revele a alternativa correta nem a resolução pronta desta questão específica.`);
    } else {
      parts.push(`\n[MODO AJUDA PRÉVIA / PISTA]: O aluno ainda NÃO respondeu à questão. Forneça orientação socrática, relembre a regra geral, o contraste ou o método procedimental SEM revelar a alternativa correta ou dar a resposta pronta.`);
    }
  }

  if (request.directExplanationRequested && hasAttempted) {
    parts.push(`[SOLICITAÇÃO EXPLÍCITA]: O aluno pediu explicação direta da regra e do gabarito.`);
  }
  if (request.cadernoSynthesisRequested) {
    parts.push(`[SOLICITAÇÃO EXPLÍCITA]: O aluno pediu síntese estruturada para o Caderno de Erros.`);
  }

  if (request.history && request.history.length > 0) {
    parts.push(`\n=== HISTÓRICO RECENTE DO DIÁLOGO ===`);
    for (const h of request.history.slice(-6)) {
      parts.push(`${h.role === 'student' ? 'Aluno' : 'Professor SuVeCA'}: ${h.text}`);
    }
  }

  parts.push(`\n=== MENSAGEM / DÚVIDA ATUAL DO ALUNO ===`);
  parts.push(request.userMessage || '(Aluno iniciou o diálogo com o tutor após o resultado)');

  parts.push(`
Orientações para sua resposta:
- Responda de forma clara, natural, pedagógica e estruturada.
- Se o aluno errou, investigue com empatia a hipótese dele ou aponte o critério contrastivo.
- Calibre a resposta com base na confiança declarada:
  * Erro com Alta Confiança (somente high): investigue a hipótese e confira o critério sem presumir a causa.
  * Erro com Baixa Confiança/Chute: foque no algoritmo passo a passo direto.
  * Acerto com Baixa Confiança/Chute: valide e reforce o critério de forma afirmativa.
- Preencha "metacognitiveInsight" com 1 frase explicativa sobre a relação entre a confiança do aluno e o resultado.
- Preencha "reasoningChips" com dúvidas abertas, sem presumir erro, impor diagnóstico ou antecipar a resposta antes da tentativa. O aluno pode sempre escrever sua própria dúvida.
- Sempre que pertinente após erro ou acerto frágil, forneça em "quickCheck" um micro-desafio de 1 frase (prompt, 2 opções, correctOption, explanation curta) para checar compreensão imediata, incluindo sourceRefs válidos e justificativa sustentada. Não gere desafio antes da tentativa. Não confunda com transferência ou retenção.
- Após a tentativa, se solicitada a síntese, preencha notebookDraft com gatilho específico, regra acionável e contraste com condições corretas. Copiar a ficha não é evidência de compreensão ou domínio. Antes da tentativa, omita a ficha resolutiva.
- Escolha o intent mais adequado entre: investigate_confusion, explain_rule, contrast_options, recommend_practice, synthesize_notebook, encourage_reattempt, direct_clarification, wrap_up.
- Escolha a continuidade mais adequada entre: try_same, try_alternative, review_contrast, proceed_transfer, proceed_reflection.
`);

  return parts.join('\n');
}
