import { describe, expect, it, beforeEach, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PBLEngine } from '../engine/PBLEngine';
import { PBLRepository } from '../data/PBLRepository';
import { answerChoiceFor } from '../answerAdapter';
import { loadPublishedQuestionPresentations } from './publishedQuestionTestData';
import foneticaPkg from '../../../../public/knowledge/pbl/pbl_authored_packages.json';

describe('Authored Pilot Packages Runtime Integration', () => {
  const fonetica = (foneticaPkg as any[]).find((p) => p.competencyRef === 'COMP-A00-G01-01');
  const porques = (foneticaPkg as any[]).find((p) => p.competencyRef === 'COMP-A00-G07-01');
  const semanticaVerbal = (foneticaPkg as any[]).find((p) => p.competencyRef === 'COMP-A04-G02-01');
  const pronomesPessoais = (foneticaPkg as any[]).find((p) => p.competencyRef === 'COMP-A03-G01-01');

  let repo: PBLRepository;
  let engine: PBLEngine;

  beforeAll(() => {
    const pblDir = path.resolve('public/knowledge/pbl');
    const comps = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_competency_map.json'), 'utf8'));
    const cases = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_cases.json'), 'utf8'));
    const xfers = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_transfer_sets.json'), 'utf8'));
    const diags = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_diagnostic_paths.json'), 'utf8'));
    const runtimeManifest = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_runtime_manifest.json'), 'utf8'));
    
    const qcl: Record<string, any> = {};
    for (const shard of runtimeManifest.datasets.questionCompetencyLinks.shards) {
      Object.assign(qcl, JSON.parse(fs.readFileSync(path.join(pblDir, shard.file), 'utf8')));
    }
    const qp: Record<string, any> = {};
    for (const shard of runtimeManifest.datasets.questionPedagogy.shards) {
      Object.assign(qp, JSON.parse(fs.readFileSync(path.join(pblDir, shard.file), 'utf8')));
    }
    const publishedPresentations = loadPublishedQuestionPresentations();

    repo = new PBLRepository();
    repo.loadDirectly({
      competencies: comps,
      cases,
      transferSets: xfers,
      diagnosticPaths: diags,
      questionLinksMap: qcl,
      questionPedagogyMap: qp,
      questionPresentations: publishedPresentations,
      authoredPackages: [fonetica, porques, semanticaVerbal, pronomesPessoais].filter(Boolean),
    });
    engine = new PBLEngine(repo);
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('carrega e extrai blocos semânticos autorados do pacote de Fonética na intervenção', async () => {
    const pkg = engine.repo.getAuthoredPackage('COMP-A00-G01-01');
    expect(pkg).toBeDefined();
    expect(pkg.packageId).toBe('PBL-AUTH-PILOT-G01-01');
    expect(pkg.interventions.length).toBeGreaterThan(0);

    const session = await engine.startSession({
      userId: 'test_learner',
      targetCompetencyId: 'COMP-A00-G01-01',
      mode: 'guided',
    });

    expect(session.phase).toBe('problem');
    expect(session.currentCompetencyRef).toBe('COMP-A00-G01-01');

    // Submete erro na questão âncora
    const anchorQ = await engine.repo.getQuestionPresentation(session.currentQuestionRef);
    expect(anchorQ).toBeDefined();

    const isMc = anchorQ?.questionType === 'multiple_choice';
    const correct = answerChoiceFor(anchorQ!.correctAnswer, isMc);
    const wrongAnswer = isMc ? (correct === 'A' ? 'B' : 'A') : (correct === 'Certo' ? 'Errado' : 'Certo');

    let result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: session.currentQuestionRef,
      competencyRef: 'COMP-A00-G01-01',
      userAnswer: wrongAnswer,
      correctAnswer: anchorQ!.correctAnswer,
      confidence: 'medium',
      stage: 'initial',
      responseTimeMs: 3500,
    });

    expect(result.attempt.isCorrect).toBe(false);
    expect(result.session.phase).toBe('diagnostic');

    // Se o diagnóstico exigir sondagem/hipótese, submete probe para consolidar e ir para intervenção
    if (result.session.pendingNextAction?.type === 'request_probe') {
      result.session = engine.continueAfterDiagnostic(result.session);
      expect(result.session.phase).toBe('hypothesis');
      const probeQ = await engine.repo.getQuestionPresentation(result.session.currentQuestionRef);
      expect(probeQ).toBeDefined();
      const pIsMc = probeQ?.questionType === 'multiple_choice';
      const pCorrect = answerChoiceFor(probeQ!.correctAnswer, pIsMc);
      const pWrong = pIsMc ? (pCorrect === 'A' ? 'B' : 'A') : (pCorrect === 'Certo' ? 'Errado' : 'Certo');

      const probeResult = await engine.submitAttempt(result.session, {
        sessionId: result.session.sessionId,
        questionRef: probeQ!.questionRef,
        competencyRef: 'COMP-A00-G01-01',
        userAnswer: pWrong,
        correctAnswer: probeQ!.correctAnswer,
        confidence: 'medium',
        stage: 'probe',
        responseTimeMs: 2000,
      });
      result.session = probeResult.session;
    }

    // Avança para intervenção
    const interventionSession = engine.continueAfterDiagnostic(result.session);
    expect(interventionSession.phase).toBe('intervention');
    expect(interventionSession.lastInterventionPayload).toBeDefined();

    const payload = interventionSession.lastInterventionPayload!;
    expect(payload.competencyRef).toBe('COMP-A00-G01-01');
    // Verifica que os blocos semânticos autorados foram transportados
    expect(payload.semanticBlocks).toBeDefined();
    expect(payload.semanticBlocks?.hint?.length).toBeGreaterThan(0);
    expect(payload.semanticBlocks?.partial?.length).toBeGreaterThan(0);
    expect(payload.semanticBlocks?.full?.length).toBeGreaterThan(0);
  });

  it('integra o pacote de Porquês e preserva fluxo completo até reflexão', async () => {
    const pkg = engine.repo.getAuthoredPackage('COMP-A00-G07-01');
    expect(pkg).toBeDefined();
    expect(pkg.packageId).toBe('PBL-AUTH-PILOT-G07-01');

    const session = await engine.startSession({
      userId: 'test_learner_porques',
      targetCompetencyId: 'COMP-A00-G07-01',
      mode: 'guided',
    });

    expect(session.currentCompetencyRef).toBe('COMP-A00-G07-01');
    const anchorQ = await engine.repo.getQuestionPresentation(session.currentQuestionRef);
    expect(anchorQ).toBeDefined();

    const isMc = anchorQ?.questionType === 'multiple_choice';
    const correct = answerChoiceFor(anchorQ!.correctAnswer, isMc);

    // Acerto direto na âncora com alta confiança leva à transferência
    const result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: session.currentQuestionRef,
      competencyRef: 'COMP-A00-G07-01',
      userAnswer: correct,
      correctAnswer: anchorQ!.correctAnswer,
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 2500,
    });

    expect(result.attempt.isCorrect).toBe(true);
    expect(result.session.phase).toBe('diagnostic');

    const nextSession = engine.continueAfterDiagnostic(result.session);
    expect(['transfer', 'reflection']).toContain(nextSession.phase);
  });

  it('integra o pacote de Semântica Verbal (A04-G02-01) e extrai regras e procedimentos autorados', async () => {
    const pkg = engine.repo.getAuthoredPackage('COMP-A04-G02-01');
    expect(pkg).toBeDefined();
    expect(pkg.packageId).toBe('PKG-COMP-A04-G02-01');
    expect(pkg.interventions.length).toBe(2);

    const session = await engine.startSession({
      userId: 'test_learner_verbal',
      targetCompetencyId: 'COMP-A04-G02-01',
      mode: 'guided',
    });

    expect(session.currentCompetencyRef).toBe('COMP-A04-G02-01');
    const anchorQ = await engine.repo.getQuestionPresentation(session.currentQuestionRef);
    expect(anchorQ).toBeDefined();

    // Submete erro na âncora para forçar intervenção
    const isMc = anchorQ?.questionType === 'multiple_choice';
    const correct = answerChoiceFor(anchorQ!.correctAnswer, isMc);
    const wrong = isMc ? (correct === 'A' ? 'B' : 'A') : (correct === 'Certo' ? 'Errado' : 'Certo');

    let result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: session.currentQuestionRef,
      competencyRef: 'COMP-A04-G02-01',
      userAnswer: wrong,
      correctAnswer: anchorQ!.correctAnswer,
      confidence: 'medium',
      stage: 'initial',
      responseTimeMs: 3000,
    });

    expect(result.attempt.isCorrect).toBe(false);

    if (result.session.pendingNextAction?.type === 'request_probe') {
      result.session = engine.continueAfterDiagnostic(result.session);
      const probeQ = await engine.repo.getQuestionPresentation(result.session.currentQuestionRef);
      expect(probeQ).toBeDefined();
      const pIsMc = probeQ?.questionType === 'multiple_choice';
      const pCorrect = answerChoiceFor(probeQ!.correctAnswer, pIsMc);
      const pWrong = pIsMc ? (pCorrect === 'A' ? 'B' : 'A') : (pCorrect === 'Certo' ? 'Errado' : 'Certo');

      const probeResult = await engine.submitAttempt(result.session, {
        sessionId: result.session.sessionId,
        questionRef: probeQ!.questionRef,
        competencyRef: 'COMP-A04-G02-01',
        userAnswer: pWrong,
        correctAnswer: probeQ!.correctAnswer,
        confidence: 'medium',
        stage: 'probe',
        responseTimeMs: 2000,
      });
      result.session = probeResult.session;
    }

    const interventionSession = engine.continueAfterDiagnostic(result.session);
    expect(interventionSession.phase).toBe('intervention');
    const payload = interventionSession.lastInterventionPayload!;
    expect(payload.competencyRef).toBe('COMP-A04-G02-01');
    expect(payload.semanticBlocks).toBeDefined();
    expect(payload.semanticBlocks?.hint?.length).toBeGreaterThan(0);
    expect(payload.semanticBlocks?.partial?.length).toBeGreaterThan(0);
    expect(payload.semanticBlocks?.full?.length).toBeGreaterThan(0);
    expect(payload.ruleTitle).toContain('Pretérito');
  });

  it('integra o pacote de Pronomes Pessoais (A03-G01-01) e extrai regras e procedimentos de complementos', async () => {
    const pkg = engine.repo.getAuthoredPackage('COMP-A03-G01-01');
    expect(pkg).toBeDefined();
    expect(pkg.packageId).toBe('PKG-COMP-A03-G01-01');
    expect(pkg.interventions.length).toBe(2);

    const session = await engine.startSession({
      userId: 'test_learner_pronomes',
      targetCompetencyId: 'COMP-A03-G01-01',
      mode: 'guided',
    });

    expect(session.currentCompetencyRef).toBe('COMP-A03-G01-01');
    const anchorQ = await engine.repo.getQuestionPresentation(session.currentQuestionRef);
    expect(anchorQ).toBeDefined();

    // Acerto direto na questão âncora
    const isMc = anchorQ?.questionType === 'multiple_choice';
    const correct = answerChoiceFor(anchorQ!.correctAnswer, isMc);

    const result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: session.currentQuestionRef,
      competencyRef: 'COMP-A03-G01-01',
      userAnswer: correct,
      correctAnswer: anchorQ!.correctAnswer,
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 2200,
    });

    expect(result.attempt.isCorrect).toBe(true);
    expect(result.session.phase).toBe('diagnostic');

    const nextSession = engine.continueAfterDiagnostic(result.session);
    expect(['transfer', 'reflection']).toContain(nextSession.phase);
  });
});
