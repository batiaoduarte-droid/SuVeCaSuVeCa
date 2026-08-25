import { describe, expect, it } from 'vitest';
import type {
  PBLCompetency,
  PBLQuestionPresentation,
  QuestionCompetencyAssignment,
  QuestionCompetencyLink,
} from '../../../types/pbl';
import { PBLRepository } from '../data/PBLRepository';
import { buildQuestionFingerprint, QuestionPoolSelector } from '../engine/QuestionPoolSelector';

const targetCompetency: PBLCompetency = {
  schemaVersion: '1.0.0',
  competencyId: 'COMP-TARGET',
  lessonId: 'A01',
  unitId: 'IP-A01-G02',
  title: 'Competência alvo',
  description: 'Competência alvo para vínculo atômico.',
  pedagogicalDomain: 'gramatica',
  bloomLevel: 'aplicacao',
  learningObjectiveRefs: [],
  conceptRefs: [],
  ruleRefs: [],
  procedureRefs: [],
  contrastRefs: [],
  examTrapRefs: [],
  misconceptionRefs: [],
  prerequisiteCompetencyRefs: [],
  eligibleQuestionRefs: ['Q1', 'Q2', 'Q3'],
  anchorCandidateRefs: ['Q1', 'Q2', 'Q3'],
  diagnosticCandidateRefs: ['Q1', 'Q2', 'Q3'],
  transferCandidateRefs: ['Q1', 'Q2', 'Q3'],
  validationCandidateRefs: ['Q1', 'Q2', 'Q3'],
  questionCount: 3,
};

const roleScores = { anchor: 0.9, diagnostic: 0.9, transfer: 0.9, validation: 0.9 };
const assignment = (questionRef: string): QuestionCompetencyAssignment => ({
  assignmentId: `${questionRef}::${targetCompetency.competencyId}`,
  competencyId: targetCompetency.competencyId,
  unitId: targetCompetency.unitId,
  lessonId: targetCompetency.lessonId,
  relation: 'secondary',
  semanticStatus: 'approved',
  allowedRoles: ['anchor', 'diagnostic', 'transfer', 'validation'],
  roleScores,
  evidenceRefs: ['CANONICAL_TOPIC:test'],
  reviewMethod: 'canonical_topic',
  reviewedAt: '2026-08-25T00:00:00-03:00',
  reason: 'Tópico canônico idêntico.',
});
const link = (
  questionRef: string,
  competencyAssignments?: QuestionCompetencyAssignment[],
  semanticReview?: QuestionCompetencyLink['semanticReview']
): QuestionCompetencyLink => ({
  schemaVersion: '3.0.0',
  linkId: `LINK-${questionRef}`,
  officialQuestionRef: questionRef,
  competencyId: 'COMP-SOURCE',
  unitId: targetCompetency.unitId,
  lessonId: targetCompetency.lessonId,
  prerequisiteRefs: [],
  pblSuitabilityScores: { ...roleScores, primaryRole: 'anchor' },
  assignedPBLRole: 'anchor',
  diagnosticPotential: 0.8,
  semanticReview,
  competencyAssignments,
});
const presentation = (questionRef: string, supportText: string): PBLQuestionPresentation => ({
  questionRef,
  questionType: 'true_false',
  supportText,
  prompt: 'Julgue o item conforme o texto.',
  options: [],
  correctAnswer: 'Certo',
});

describe('QuestionPoolSelector atomic semantic contract', () => {
  it('accepts an explicitly approved secondary assignment and forms a three-question session', async () => {
    const repo = new PBLRepository();
    repo.loadDirectly({
      competencies: [targetCompetency],
      questionLinksMap: {
        Q1: link('Q1', [assignment('Q1')]),
        Q2: link('Q2', [assignment('Q2')]),
        Q3: link('Q3', [assignment('Q3')]),
      },
      questionPresentations: {
        Q1: presentation('Q1', 'Contexto um.'),
        Q2: presentation('Q2', 'Contexto dois.'),
        Q3: presentation('Q3', 'Contexto três.'),
      },
    });
    const selector = new QuestionPoolSelector(repo);

    expect(await selector.isQuestionEligibleForCompetency(targetCompetency.competencyId, 'Q1')).toBe(true);
    expect((await selector.evaluatePracticeReadiness(targetCompetency.competencyId)).ready).toBe(true);
  });

  it('rejects same-unit ownership when the exact competency has no approved assignment', async () => {
    const repo = new PBLRepository();
    repo.loadDirectly({
      competencies: [targetCompetency],
      questionLinksMap: { Q1: link('Q1', []) },
      questionPresentations: { Q1: presentation('Q1', 'Contexto.') },
    });
    const selector = new QuestionPoolSelector(repo);

    expect(await selector.isQuestionEligibleForCompetency(targetCompetency.competencyId, 'Q1')).toBe(false);
  });

  it('fails closed when both atomic assignments and semantic review are absent', async () => {
    const repo = new PBLRepository();
    repo.loadDirectly({
      competencies: [targetCompetency],
      questionLinksMap: { Q1: link('Q1') },
      questionPresentations: { Q1: presentation('Q1', 'Contexto.') },
    });
    const selector = new QuestionPoolSelector(repo);

    expect(await selector.isQuestionEligibleForCompetency(targetCompetency.competencyId, 'Q1')).toBe(false);
  });

  it('includes support text and alternatives in the duplicate fingerprint', () => {
    const first = presentation('Q1', 'Contexto um.');
    const second = presentation('Q2', 'Contexto dois.');
    expect(buildQuestionFingerprint(first)).not.toBe(buildQuestionFingerprint(second));

    const withOptions = { ...first, options: [{ label: 'A', text: 'Alternativa exclusiva.' }] };
    expect(buildQuestionFingerprint(first)).not.toBe(buildQuestionFingerprint(withOptions));
  });
});
