import { describe, it, expect } from 'vitest';
import { pblTutorContextResolver } from '../PBLTutorContextResolver.server';

describe('PBLTutorContextResolver & Benchmark Homologation', () => {
  it('loads the tutor manifest with verified shards and audited corrections', async () => {
    const manifest = await pblTutorContextResolver.getManifest();
    expect(manifest).toBeDefined();
    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.totalQuestions).toBe(4945);
    expect(manifest.shards.length).toBeGreaterThanOrEqual(22);
    expect(manifest.auditedCorrections.length).toBeGreaterThanOrEqual(1);

    const poremCorrection = manifest.auditedCorrections.find(
      (c) => c.questionRef === 'OQ-A00-estrategia.4001030449'
    );
    expect(poremCorrection).toBeDefined();
    expect(poremCorrection?.rule).toBe('correcao_futuro_subjuntivo_porem');
    expect(poremCorrection?.correctedRefutation).toContain('infinitivo pessoal do verbo pôr');
    expect(poremCorrection?.correctedRefutation).toContain('quando eles puserem');
  });

  it('resolves question context for the benchmark case (OQ-A00-estrategia.4001030449) with corrected grammar refutation', async () => {
    const context = await pblTutorContextResolver.getTutorQuestionContext('OQ-A00-estrategia.4001030449');
    expect(context).not.toBeNull();
    if (!context) return;

    expect(context.questionRef).toBe('OQ-A00-estrategia.4001030449');
    expect(context.primaryCompetencyRef).toBe('COMP-A00-G04-01');
    expect(context.presentation.prompt).toContain('supressão do acento gráfico não originaria outra palavra');
    expect(context.presentation.officialAnswer).toBe('D');

    // Opção C (porém / porem):
    const optC = context.objectiveOptionAnalyses?.find((opt) => opt.label === 'C');
    expect(optC).toBeDefined();
    expect(optC?.isCorrect).toBe(false);
    expect(optC?.refutation).toContain("infinitivo pessoal do verbo pôr: 'para eles porem'");
    expect(optC?.refutation).toContain("o futuro do subjuntivo do verbo pôr é 'quando eles puserem'");

    // Garante que a explicação derivada não foi rotulada como autoridade normativa
    expect(optC?.authoritative).toBe(false);

    // Garante que o contexto possui regras pedagógicas estruturadas
    expect(context.pedagogy.rules.length).toBeGreaterThan(0);
  });

  it('redacts official answer when filtered for student exploration', async () => {
    const rawContext = await pblTutorContextResolver.getTutorQuestionContext('OQ-A00-estrategia.4001030449');
    expect(rawContext).not.toBeNull();
    if (!rawContext) return;

    const filtered = pblTutorContextResolver.filterTutorContextForStudent(rawContext, {
      hideAnswer: true,
    });

    expect(filtered.presentation.officialAnswer).toBe('REDACTED');
    expect(filtered.officialCommentary).toBeUndefined();
    expect(filtered.objectiveOptionAnalyses?.every((opt) => !opt.isCorrect)).toBe(true);
  });
});
