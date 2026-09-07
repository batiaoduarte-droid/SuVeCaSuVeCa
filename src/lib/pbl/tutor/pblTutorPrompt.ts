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
   - Se o aluno pedir explicação direta ("explique diretamente", "me ajuda", "diga a resposta"), explique objetivamente o critério da questão, mostre a tabela/contraste relevante e encoraje-o a aplicar o aprendizado.
   - Se o aluno pedir síntese para o Caderno de Erros, gere uma ficha clara no campo notebookDraft contendo gatilho, regra decisiva e exemplo de contraste.
   - Indique sempre uma recomendação de continuidade prática coerente no campo continuityRecommendation.
`;

export function formatTutorPrompt(
  request: PBLTutorTurnRequest,
  context: PBLTutorQuestionContext
): string {
  const parts: string[] = [];

  parts.push(`=== DADOS DA QUESTÃO E COMPETÊNCIA ===`);
  const compRef = context.primaryCompetencyRef || context.competencyRefs?.[0] || 'Competência PBL';
  const compTitle = context.competencyTitle || compRef;
  parts.push(`Competência: ${compTitle} (${compRef})`);
  parts.push(`Enunciado da Questão:`);
  parts.push(context.presentation.prompt);
  if (context.presentation.command && context.presentation.command !== context.presentation.prompt) {
    parts.push(`Comando: ${context.presentation.command}`);
  }

  if (context.presentation.options && context.presentation.options.length > 0) {
    parts.push(`Alternativas:`);
    for (const opt of context.presentation.options) {
      parts.push(`[${opt.label}] ${opt.text}`);
    }
  }

  parts.push(`Gabarito Oficial: ${context.presentation.officialAnswer}`);
  if (context.officialCommentary) {
    parts.push(`Comentário Oficial: ${context.officialCommentary}`);
  }

  const rules = context.criteria?.rules || context.pedagogy?.rules || [];
  if (rules.length > 0) {
    parts.push(`\n=== REGRAS E CONDIÇÕES NORMATIVAS ===`);
    for (const rule of rules) {
      parts.push(`• Regra: ${rule.title}`);
      parts.push(`  Enunciado: ${rule.statement}`);
      if (rule.conditions && rule.conditions.length > 0) {
        parts.push(`  Condições: ${rule.conditions.join('; ')}`);
      }
      if (rule.exceptions && rule.exceptions.length > 0) {
        parts.push(`  Exceções: ${rule.exceptions.join('; ')}`);
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

  const contrasts = context.criteria?.contrasts || context.pedagogy?.contrasts || [];
  if (contrasts.length > 0) {
    parts.push(`\n=== CONTRASTES DECISIVOS ===`);
    for (const contrast of contrasts) {
      parts.push(`• Contraste: ${contrast.title}`);
      parts.push(`  Polo A: ${contrast.poleA} vs Polo B: ${contrast.poleB}`);
      parts.push(`  Critério Decisivo: ${contrast.decisionCriterion}`);
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

  if (context.objectiveOptionAnalyses && context.objectiveOptionAnalyses.length > 0) {
    parts.push(`\n=== ANÁLISE OBJETIVA DAS ALTERNATIVAS ===`);
    for (const opt of context.objectiveOptionAnalyses) {
      parts.push(`[${opt.label}] ${opt.isCorrect ? '(CORRETA)' : '(INCORRETA)'} ${opt.optionText}`);
      parts.push(`Refutação Didática: ${opt.refutation}`);
    }
  }

  parts.push(`\n=== SITUAÇÃO ATUAL DO ALUNO NA SESSÃO ===`);
  if (request.studentAttemptContext) {
    const at = request.studentAttemptContext;
    parts.push(`Etapa da tentativa: ${at.attemptStage}`);
    parts.push(`Resposta marcada pelo aluno: ${at.userAnswer}`);
    parts.push(`Resultado da tentativa: ${at.isCorrect ? 'Correta' : 'Incorreta'}`);
    if (at.confidence) {
      parts.push(`Nível de confiança declarado pelo aluno: ${at.confidence}`);
    }
  } else {
    parts.push(`O aluno solicitou apoio antes de submeter a tentativa.`);
  }

  if (request.directExplanationRequested) {
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
- Se solicitada a síntese para o Caderno de Erros, preencha o objeto notebookDraft com title, triggerCondition, decisionRule e contrastExample.
- Escolha o intent mais adequado entre: investigate_confusion, explain_rule, contrast_options, recommend_practice, synthesize_notebook, encourage_reattempt, direct_clarification, wrap_up.
- Escolha a continuidade mais adequada entre: try_same, try_alternative, review_contrast, proceed_transfer, proceed_reflection.
`);

  return parts.join('\n');
}
