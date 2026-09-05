import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  GitBranch,
  LockKeyhole,
  RotateCw,
  Route,
  ShieldAlert,
  Target,
} from 'lucide-react';
import type { CompetencyMastery } from '../../../types/pbl';
import type {
  PedagogicalMacroIndexEntry,
  PedagogicalMacroNode,
} from '../../../types/pedagogicalMacro';
import { PBLSessionRepository } from '../../../lib/pbl/persistence/PBLSessionRepository';
import { presentCompetencyTitle } from '../../../lib/learnerFacingLabels';
import {
  computeMacroMasteryVector,
  macroEvidenceStateFor,
  type MacroMasteryEvidenceState,
} from '../../../lib/macroMastery';

const ENTRY_KIND_LABELS: Record<PedagogicalMacroIndexEntry['entryKind'], string> = {
  fusion: 'Estudo integrado',
  journey: 'Jornada guiada',
  autonomous: 'Unidade autônoma',
  cumulative_review: 'Revisão cumulativa',
};

const TOPOLOGY_LABELS: Record<PedagogicalMacroIndexEntry['topology'], string> = {
  single: 'um capítulo',
  linear: 'sequência orientada',
  parallel: 'caminhos independentes',
  branched: 'caminhos ramificados',
  contrastive: 'contraste orientado',
  capstone: 'aplicação integradora',
};

const PRACTICE_STATUS_LABELS: Record<MacroMasteryEvidenceState, readonly [string, string]> = {
  no_evidence: ['ainda não praticada', 'ainda não praticadas'],
  acquiring: ['em andamento', 'em andamento'],
  needs_review: ['para revisar', 'para revisar'],
  immediate_transfer_confirmed: ['aplicada em novo exercício', 'aplicadas em novo exercício'],
  retention_confirmed: ['consolidada', 'consolidadas'],
};

const nodeForUnit = (entry: PedagogicalMacroIndexEntry, unitId: string) =>
  entry.nodes.find((node) => node.unitRef === unitId);

const masteryIsCurrentEvidence = (
  mastery: CompetencyMastery | undefined,
  nowMs: number,
) => {
  const state = macroEvidenceStateFor(mastery);
  if (state !== 'immediate_transfer_confirmed' && state !== 'retention_confirmed') return false;
  const dueAt = Date.parse(mastery?.nextReviewRecommendedAt || '');
  return !Number.isFinite(dueAt) || dueAt > nowMs;
};

export interface MacroTransitionDecision {
  autoAdvanceAllowed: boolean;
  directAccessAllowed: boolean;
  readinessConfirmed: boolean | null;
  tone: 'open' | 'advisory' | 'blocked';
  message: string;
}

export interface MacroAdaptiveRequirement {
  requirementId: string;
  kind: 'prerequisite' | 'remediation' | 'capstone_readiness' | 'integration_readiness';
  evidenceCompetencyIds: readonly string[];
  actionMacroId: string;
  actionUnitId: string;
  actionTitle: string;
}

export const selectActionableAdaptiveRequirements = (
  requirements: readonly MacroAdaptiveRequirement[],
  masteryByCompetency: Readonly<Record<string, CompetencyMastery>>,
  nowMs = Date.now(),
) => requirements.filter((requirement) => {
  const states = requirement.evidenceCompetencyIds.map((competencyId) => (
    macroEvidenceStateFor(masteryByCompetency[competencyId])
  ));
  const ready = requirement.evidenceCompetencyIds.length > 0
    && requirement.evidenceCompetencyIds.every((competencyId) => (
      masteryIsCurrentEvidence(masteryByCompetency[competencyId], nowMs)
    ));
  const diagnosedDeficit = states.some((state) => state === 'needs_review');
  return requirement.kind === 'remediation' ? diagnosedDeficit : !ready;
});

/**
 * Decides only navigation. It never writes mastery and never treats reading as
 * learning evidence. A semantic blocker can stop the automatic Next action,
 * while direct access follows the explicit blocker contract.
 */
export const evaluateMacroTransition = (
  entry: PedagogicalMacroIndexEntry,
  fromUnitId: string,
  toUnitId: string,
  masteryByCompetency: Readonly<Record<string, CompetencyMastery>>,
  nowMs = Date.now(),
): MacroTransitionDecision => {
  const fromNode = nodeForUnit(entry, fromUnitId);
  const toNode = nodeForUnit(entry, toUnitId);
  const edge = fromNode && toNode
    ? entry.edges.find((candidate) => candidate.from === fromNode.nodeId && candidate.to === toNode.nodeId)
    : undefined;

  if (edge?.policy === 'blocked_transition') {
    const blocker = entry.blockers.find((candidate) => (
      candidate.blockerId === edge.blockerRef && candidate.status === 'active'
    ));
    if (blocker) {
      return {
        autoAdvanceAllowed: false,
        directAccessAllowed: blocker.directAccessAllowed,
        readinessConfirmed: null,
        tone: 'blocked',
        message: 'O avanço automático está suspenso por uma pendência editorial. O capítulo seguinte continua disponível pelo mapa.',
      };
    }
  }

  const relevantCheckpoints = entry.checkpoints.filter((checkpoint) => (
    !fromNode || checkpoint.requiredNodeIds.includes(fromNode.nodeId)
  ));
  const readiness = relevantCheckpoints.map((checkpoint) => {
    const requiredUnits = checkpoint.requiredNodeIds
      .map((nodeId) => entry.nodes.find((node) => node.nodeId === nodeId)?.unitRef)
      .filter((unitId): unitId is string => Boolean(unitId));
    const requiredCompetencies = entry.competencies.filter((competency) => (
      requiredUnits.includes(competency.unitId)
    ));
    const evidence = requiredCompetencies.map((competency) => (
      masteryIsCurrentEvidence(masteryByCompetency[competency.competencyId], nowMs)
    ));
    if (!evidence.length) return false;
    return checkpoint.mode === 'all' ? evidence.every(Boolean) : evidence.some(Boolean);
  });
  const readinessConfirmed = readiness.length ? readiness.every(Boolean) : null;
  const advisory = edge?.policy === 'checkpoint'
    || edge?.policy === 'advisory_prerequisite'
    || edge?.policy === 'diagnostic_remediation'
    || readinessConfirmed === false;

  return {
    autoAdvanceAllowed: true,
    directAccessAllowed: true,
    readinessConfirmed,
    tone: advisory ? 'advisory' : 'open',
    message: readinessConfirmed === false
      ? 'Ainda falta evidência PBL nas competências deste checkpoint. Você pode avançar, mas a prática seletiva é o próximo passo recomendado.'
      : readinessConfirmed === true
        ? 'O checkpoint tem evidência PBL atual. Avançar não transfere domínio para o próximo capítulo.'
        : 'A transição está aberta. Leitura e visita contam apenas como progresso de estudo.',
  };
};

interface MacroCurriculumNavigatorProps {
  entries: readonly PedagogicalMacroIndexEntry[];
  selectedMacroId: string | null;
  readUnitIds: readonly string[];
  onSelectMacro: (entry: PedagogicalMacroIndexEntry) => void;
}

export const MacroCurriculumNavigator: React.FC<MacroCurriculumNavigatorProps> = ({
  entries,
  selectedMacroId,
  readUnitIds,
  onSelectMacro,
}) => (
  <nav
    className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 sm:p-5"
    aria-label="Percursos pedagógicos desta aula"
  >
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="m-0 text-base font-black text-teal-950">Escolha um percurso de estudo</h2>
        <p className="mt-1 text-xs text-teal-900">
          Cada percurso preserva seus capítulos e suas competências independentes.
        </p>
      </div>
      <span className="text-xs font-semibold text-teal-800">
        {entries.length} {entries.length === 1 ? 'percurso' : 'percursos'}
      </span>
    </div>
    <ol className="m-0 grid list-none gap-2 p-0 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry, index) => {
        const studied = entry.unitRefs.filter((unitId) => readUnitIds.includes(unitId)).length;
        const selected = entry.macroId === selectedMacroId;
        return (
          <li key={entry.macroId} className="m-0">
            <button
              type="button"
              onClick={() => onSelectMacro(entry)}
              aria-current={selected ? 'location' : undefined}
              className={`flex min-h-24 w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? 'border-teal-600 bg-white text-teal-950 ring-2 ring-teal-200'
                  : 'border-teal-200 bg-white/80 text-slate-800 hover:border-teal-400 hover:bg-white'
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-black text-white">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-snug">{entry.title}</span>
                <span className="mt-1 block text-[11px] font-semibold text-slate-600">
                  {ENTRY_KIND_LABELS[entry.entryKind]} · {entry.unitRefs.length} {entry.unitRefs.length === 1 ? 'capítulo' : 'capítulos'}
                </span>
                <span className="mt-2 block text-[11px] text-teal-800">
                  Progresso de leitura: {studied}/{entry.unitRefs.length}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

interface MacroMasterySummaryProps {
  entry: PedagogicalMacroIndexEntry;
  masteryByCompetency: Readonly<Record<string, CompetencyMastery>>;
  loading: boolean;
  onPracticeCompetency?: (competencyId: string) => void;
}

export const MacroMasterySummary: React.FC<MacroMasterySummaryProps> = ({
  entry,
  masteryByCompetency,
  loading,
  onPracticeCompetency,
}) => {
  const vector = useMemo(
    () => computeMacroMasteryVector(entry.competencyRefs, masteryByCompetency),
    [entry.competencyRefs, masteryByCompetency],
  );
  const recommended = entry.competencies.find((competency) => (
    competency.competencyId === vector.recommendedCompetencyId
  ));
  const recommendedState = recommended
    ? macroEvidenceStateFor(masteryByCompetency[recommended.competencyId])
    : null;
  const visibleStates = (Object.keys(PRACTICE_STATUS_LABELS) as MacroMasteryEvidenceState[])
    .filter((state) => vector.counts[state] > 0);
  const recommendationPrefix = recommendedState === 'needs_review'
    ? 'Vale revisar agora'
    : recommendedState === 'no_evidence'
      ? 'Comece por'
      : 'Continue por';
  const practiceButtonLabel = recommendedState === 'needs_review'
    ? 'Revisar agora'
    : recommendedState === 'no_evidence'
      ? 'Começar prática'
      : 'Continuar prática';

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby="macro-practice-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="macro-practice-title" className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
            <Target className="h-4 w-4 text-teal-700" /> Prática deste percurso
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Acompanhe cada habilidade separadamente.
          </p>
        </div>
        {vector.reviewDueCount > 0 && (
          <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-950">
            {vector.reviewDueCount} revisão{vector.reviewDueCount === 1 ? '' : 'ões'} pendente{vector.reviewDueCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-slate-600" role="status">Carregando seu progresso…</p>
      ) : vector.totalCompetencies === 0 ? (
        <p className="mt-3 text-xs text-slate-600">Este percurso ainda não possui práticas vinculadas.</p>
      ) : (
        <>
          <dl className="mt-3 flex flex-wrap gap-2">
            {visibleStates.map((state) => (
              <div key={state} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
                <dt className="text-slate-700">
                  {PRACTICE_STATUS_LABELS[state][vector.counts[state] === 1 ? 0 : 1]}
                </dt>
                <dd className="order-first m-0 font-black text-slate-950">{vector.counts[state]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <p className="m-0 text-xs font-semibold text-slate-800">
              {vector.allRetentionConfirmed
                ? 'Todas as habilidades deste percurso estão consolidadas.'
                : recommended
                  ? `${recommendationPrefix}: ${presentCompetencyTitle(recommended.title).title}`
                  : 'Há uma prática pendente neste percurso.'}
            </p>
            {recommended && onPracticeCompetency && (
              <button
                type="button"
                className="button-primary min-h-10 px-3 text-xs"
                onClick={() => onPracticeCompetency(recommended.competencyId)}
              >
                <RotateCw className="h-3.5 w-3.5" /> {practiceButtonLabel}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
};

interface MacroTransitionGuardProps {
  decision: MacroTransitionDecision;
}

export const MacroTransitionGuard: React.FC<MacroTransitionGuardProps> = ({ decision }) => {
  const Icon = decision.tone === 'blocked'
    ? LockKeyhole
    : decision.readinessConfirmed === true
      ? CheckCircle2
      : decision.tone === 'advisory'
        ? ShieldAlert
        : CircleDashed;
  const tone = decision.tone === 'blocked'
    ? 'border-violet-300 bg-violet-50 text-violet-950'
    : decision.tone === 'advisory'
      ? 'border-amber-300 bg-amber-50 text-amber-950'
      : 'border-slate-200 bg-slate-50 text-slate-800';
  return (
    <aside className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${tone}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{decision.message}</span>
    </aside>
  );
};

interface MacroChapterNavigatorProps {
  entry: PedagogicalMacroIndexEntry;
  activeUnitId: string;
  unitTitles: Readonly<Record<string, string>>;
  masteryByCompetency: Readonly<Record<string, CompetencyMastery>>;
  onSelectUnit: (unitId: string) => void;
}

const chapterRoleLabel = (node: PedagogicalMacroNode) => ({
  foundation: 'Fundamento',
  acquisition: 'Aquisição',
  application: 'Aplicação',
  integration: 'Integração',
  capstone: 'Oficina integradora',
}[node.role]);

export const MacroChapterNavigator: React.FC<MacroChapterNavigatorProps> = ({
  entry,
  activeUnitId,
  unitTitles,
  masteryByCompetency,
  onSelectUnit,
}) => {
  const activeIndex = Math.max(0, entry.unitRefs.indexOf(activeUnitId));
  const previousUnit = activeIndex > 0 ? entry.unitRefs[activeIndex - 1] : null;
  const nextUnit = activeIndex < entry.unitRefs.length - 1 ? entry.unitRefs[activeIndex + 1] : null;
  const decision = nextUnit
    ? evaluateMacroTransition(entry, activeUnitId, nextUnit, masteryByCompetency)
    : null;

  return (
    <div className="space-y-3">
      <nav aria-label={`Unidades pedagógicas de ${entry.title}`}>
        <ol className="m-0 grid list-none gap-2 p-0 md:grid-cols-2 xl:grid-cols-3">
          {entry.nodes.map((node, index) => {
            const selected = node.unitRef === activeUnitId;
            const directBlocked = entry.edges.some((edge) => (
              edge.to === node.nodeId
              && edge.policy === 'blocked_transition'
              && entry.blockers.some((blocker) => (
                blocker.blockerId === edge.blockerRef
                && blocker.status === 'active'
                && blocker.directAccessAllowed === false
              ))
            ));
            return (
              <li key={node.nodeId}>
                <button
                  type="button"
                  disabled={directBlocked}
                  onClick={() => {
                    onSelectUnit(node.unitRef);
                    window.requestAnimationFrame(() => {
                      document.getElementById(`module-unit-${node.unitRef}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                  }}
                  aria-current={selected ? 'step' : undefined}
                  className={`flex min-h-16 w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? 'border-teal-600 bg-teal-50 text-teal-950 ring-2 ring-teal-100'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-teal-400'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-bold leading-snug">{unitTitles[node.unitRef] || `Capítulo ${index + 1}`}</span>
                    <span className="mt-1 block text-[11px] font-semibold text-slate-600">{chapterRoleLabel(node)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      {decision && <MacroTransitionGuard decision={decision} />}
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          disabled={!previousUnit}
          onClick={() => {
            if (!previousUnit) return;
            onSelectUnit(previousUnit);
            window.requestAnimationFrame(() => {
              document.getElementById(`module-unit-${previousUnit}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }}
          className="button-secondary min-h-10 px-3 text-xs disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Capítulo anterior
        </button>
        <button
          type="button"
          disabled={!nextUnit || !decision?.autoAdvanceAllowed}
          onClick={() => {
            if (!nextUnit || !decision?.autoAdvanceAllowed) return;
            onSelectUnit(nextUnit);
            window.requestAnimationFrame(() => {
              document.getElementById(`module-unit-${nextUnit}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }}
          className="button-primary min-h-10 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próximo capítulo <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

interface MacroEntryPanelProps {
  entry: PedagogicalMacroIndexEntry;
  activeUnitId: string;
  unitTitles: Readonly<Record<string, string>>;
  readUnitIds: readonly string[];
  userId: string;
  onSelectUnit: (unitId: string) => void;
  onPracticeCompetency?: (competencyId: string) => void;
  adaptiveRequirements?: readonly MacroAdaptiveRequirement[];
  onOpenAdaptiveUnit?: (macroId: string, unitId: string) => void;
}

export const MacroEntryPanel: React.FC<MacroEntryPanelProps> = ({
  entry,
  activeUnitId,
  unitTitles,
  readUnitIds,
  userId,
  onSelectUnit,
  onPracticeCompetency,
  adaptiveRequirements = [],
  onOpenAdaptiveUnit,
}) => {
  const [mastery, setMastery] = useState<Record<string, CompetencyMastery>>({});
  const [masteryLoading, setMasteryLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setMasteryLoading(true);
    void PBLSessionRepository.getUserMastery(userId).then((value) => {
      if (active) {
        setMastery(value);
        setMasteryLoading(false);
      }
    });
    return () => { active = false; };
  }, [entry.macroId, userId]);

  const studied = entry.unitRefs.filter((unitId) => readUnitIds.includes(unitId)).length;
  const actionableAdaptiveRequirements = selectActionableAdaptiveRequirements(
    adaptiveRequirements,
    mastery,
  );
  return (
    <section id="active-macro-panel" className="scroll-mt-24 sm:scroll-mt-28 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="active-macro-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-teal-800">
            {entry.topology === 'branched' || entry.topology === 'parallel'
              ? <GitBranch className="h-4 w-4" />
              : entry.topology === 'single' || entry.topology === 'capstone'
                ? <BookOpenCheck className="h-4 w-4" />
                : <Route className="h-4 w-4" />}
            {ENTRY_KIND_LABELS[entry.entryKind]} · {TOPOLOGY_LABELS[entry.topology]}
          </div>
          <h2 id="active-macro-title" tabIndex={-1} className="m-0 text-lg font-black text-slate-950 sm:text-xl outline-none">{entry.title}</h2>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-right text-xs text-teal-950">
          <strong className="block">Progresso de estudo</strong>
          <span>{studied}/{entry.unitRefs.length} capítulos lidos</span>
        </div>
      </header>
      {entry.blockers.some((blocker) => blocker.status === 'active') && (
        <aside className="flex items-start gap-2 rounded-xl border border-violet-300 bg-violet-50 p-3 text-xs text-violet-950">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Existe uma pendência normativa entre dois capítulos. O sistema não conciliou regras por conta própria: o acesso direto permanece disponível, mas o avanço automático afetado está suspenso.
          </span>
        </aside>
      )}
      <MacroChapterNavigator
        entry={entry}
        activeUnitId={activeUnitId}
        unitTitles={unitTitles}
        masteryByCompetency={mastery}
        onSelectUnit={onSelectUnit}
      />
      {adaptiveRequirements.length > 0 && (
        <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4" aria-labelledby="adaptive-readiness-title">
          <h3 id="adaptive-readiness-title" className="m-0 text-sm font-black text-sky-950">
            Pré-requisitos e remediação seletiva
          </h3>
          {masteryLoading ? (
            <p className="mt-2 text-xs text-sky-900" role="status">Verificando evidências PBL…</p>
          ) : actionableAdaptiveRequirements.length === 0 ? (
            <p className="mt-2 text-xs text-sky-900">
              Nenhum retorno seletivo é indicado pelas evidências atuais. Isso não transfere domínio entre capítulos.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 p-0">
              {actionableAdaptiveRequirements.map((requirement) => (
                <li key={requirement.requirementId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white p-3 text-xs text-slate-800">
                  <span>
                    {requirement.kind === 'remediation'
                      ? `O diagnóstico indica uma remediação pontual em ${presentCompetencyTitle(requirement.actionTitle).title}.`
                      : `Antes de consolidar este ponto, recupere seletivamente: ${presentCompetencyTitle(requirement.actionTitle).title}.`}
                  </span>
                  {onOpenAdaptiveUnit && (
                    <button
                      type="button"
                      className="button-secondary min-h-10 px-3 text-xs"
                      onClick={() => onOpenAdaptiveUnit(requirement.actionMacroId, requirement.actionUnitId)}
                    >
                      Abrir estudo seletivo <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <MacroMasterySummary
        entry={entry}
        masteryByCompetency={mastery}
        loading={masteryLoading}
        onPracticeCompetency={onPracticeCompetency}
      />
    </section>
  );
};
