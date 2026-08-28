/**
 * Published curriculum aliases over the atomic pedagogical units.
 *
 * A macro entry is navigation metadata only. It never replaces a unit,
 * competency, learning objective or mastery identity.
 */

export const PEDAGOGICAL_MACRO_SCHEMA_VERSION = '1.0.0' as const;

export const PEDAGOGICAL_MACRO_ENTRY_KINDS = [
  'fusion',
  'journey',
  'autonomous',
  'cumulative_review',
] as const;

export type PedagogicalMacroEntryKind = (typeof PEDAGOGICAL_MACRO_ENTRY_KINDS)[number];

export const PEDAGOGICAL_MACRO_TOPOLOGIES = [
  'single',
  'linear',
  'parallel',
  'branched',
  'contrastive',
  'capstone',
] as const;

export type PedagogicalMacroTopology = (typeof PEDAGOGICAL_MACRO_TOPOLOGIES)[number];

export const PEDAGOGICAL_MACRO_NODE_ROLES = [
  'foundation',
  'acquisition',
  'application',
  'integration',
  'capstone',
] as const;

export type PedagogicalMacroNodeRole = (typeof PEDAGOGICAL_MACRO_NODE_ROLES)[number];

export const PEDAGOGICAL_MACRO_EDGE_POLICIES = [
  'open',
  'checkpoint',
  'advisory_prerequisite',
  'diagnostic_remediation',
  'blocked_transition',
] as const;

export type PedagogicalMacroEdgePolicy = (typeof PEDAGOGICAL_MACRO_EDGE_POLICIES)[number];

export interface PedagogicalMacroSourceArtifact {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface PedagogicalMacroSourceBuild {
  buildId: string;
  atomicGroupManifest: PedagogicalMacroSourceArtifact;
  viewManifest: PedagogicalMacroSourceArtifact;
  pblManifest: PedagogicalMacroSourceArtifact;
}

export interface PedagogicalMacroCatalogSummary {
  regularEntries: number;
  fusions: number;
  journeys: number;
  autonomous: number;
  cumulativeReviewEntries: number;
  learnerFacingEntries: number;
  regularUnits: number;
  cumulativeReviewUnits: number;
  competencies: number;
}

export interface PedagogicalMacroNode {
  nodeId: string;
  unitRef: string;
  role: PedagogicalMacroNodeRole;
}

export interface PedagogicalMacroEdge {
  edgeId: string;
  from: string;
  to: string;
  policy: PedagogicalMacroEdgePolicy;
  /** Macro navigation can never transfer mastery between atomic identities. */
  masteryInheritance: false;
  blockerRef?: string;
}

export interface PedagogicalMacroCheckpoint {
  checkpointId: string;
  requiredNodeIds: string[];
  mode: 'all' | 'any';
  evidenceSource: 'competency_mastery';
  masteryInheritance: false;
}

export interface PedagogicalMacroBlocker {
  blockerId: string;
  edgeId: string;
  status: 'active' | 'resolved';
  reasonCode: string;
  description: string;
  directAccessAllowed: boolean;
  resolutionPolicy: 'external_editorial_adjudication_required';
  masteryInheritance: false;
}

interface PedagogicalMacroEntryBase {
  macroId: string;
  lessonId: string;
  order: number;
  title: string;
  topology: PedagogicalMacroTopology;
  unitRefs: string[];
  nodes: PedagogicalMacroNode[];
  edges: PedagogicalMacroEdge[];
  checkpoints: PedagogicalMacroCheckpoint[];
  blockers: PedagogicalMacroBlocker[];
  /** Derived from the published PBL map; never a synthetic macro competency. */
  competencyRefs: string[];
  /** Atomic objective IDs are preserved byte-for-byte. */
  learningObjectiveRefs: string[];
}

export interface PedagogicalRegularMacroEntry extends PedagogicalMacroEntryBase {
  lessonId: `A${number}`;
  entryKind: Exclude<PedagogicalMacroEntryKind, 'cumulative_review'>;
}

export interface PedagogicalCumulativeReviewMacroEntry extends PedagogicalMacroEntryBase {
  lessonId: 'A14';
  entryKind: 'cumulative_review';
  topology: 'single';
}

export type PedagogicalMacroEntry =
  | PedagogicalRegularMacroEntry
  | PedagogicalCumulativeReviewMacroEntry;

export interface PedagogicalMacroAdaptiveLink {
  adaptiveLinkId: string;
  fromUnitRef: string;
  toUnitRef: string;
  returnUnitRef?: string;
  scope: 'within_lesson' | 'cross_lesson';
  relationType: 'prerequisite' | 'remediation' | 'capstone_readiness' | 'integration_readiness';
  policy: Extract<
    PedagogicalMacroEdgePolicy,
    'advisory_prerequisite' | 'diagnostic_remediation'
  >;
  evidenceSource: 'competency_mastery';
  masteryInheritance: false;
}

export interface PedagogicalMacroIdentityDigest {
  count: number;
  sha256: string;
}

export interface PedagogicalMacroIdentityIntegrity {
  regularUnitIds: PedagogicalMacroIdentityDigest;
  cumulativeReviewUnitIds: PedagogicalMacroIdentityDigest;
  competencyIds: PedagogicalMacroIdentityDigest;
  learningObjectiveIds: PedagogicalMacroIdentityDigest;
  questionIds: PedagogicalMacroIdentityDigest;
}

export interface PedagogicalMacroCatalogManifestSource {
  role: string;
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface PedagogicalMacroCatalogManifest {
  schemaVersion: typeof PEDAGOGICAL_MACRO_SCHEMA_VERSION;
  manifestId: string;
  catalogId: string;
  catalogPath: string;
  catalogSha256: string;
  catalogSizeBytes: number;
  sourceFiles: PedagogicalMacroCatalogManifestSource[];
  summary: PedagogicalMacroCatalogSummary;
  validation: {
    status: 'valid';
    checks: string[];
  };
  publicationStatus: 'publishable';
}

export interface PedagogicalMacroCatalog {
  schemaVersion: typeof PEDAGOGICAL_MACRO_SCHEMA_VERSION;
  documentKind: 'compiled_macro_catalog';
  catalogId: string;
  sourceBuild: PedagogicalMacroSourceBuild;
  summary: PedagogicalMacroCatalogSummary;
  regularEntries: PedagogicalRegularMacroEntry[];
  cumulativeReviewEntries: PedagogicalCumulativeReviewMacroEntry[];
  cumulativeReviewProjection: 'one_entry_per_a14_view';
  adaptiveLinks: PedagogicalMacroAdaptiveLink[];
  identityIntegrity: PedagogicalMacroIdentityIntegrity;
}

/** Compact, deterministic projection consumed by product resolvers. */
export interface PedagogicalMacroIndexEntry {
  macroId: string;
  lessonId: string;
  order: number;
  title: string;
  entryKind: PedagogicalMacroEntryKind;
  topology: PedagogicalMacroTopology;
  unitRefs: readonly string[];
  competencyRefs: readonly string[];
  competencies: readonly PedagogicalMacroCompetencyProjection[];
  nodes: readonly PedagogicalMacroNode[];
  edges: readonly PedagogicalMacroEdge[];
  checkpoints: readonly PedagogicalMacroCheckpoint[];
  blockers: readonly PedagogicalMacroBlocker[];
}

export interface PedagogicalMacroCompetencyProjection {
  competencyId: string;
  unitId: string;
  title: string;
}

export interface PedagogicalMacroGeneratedIndex {
  schemaVersion: typeof PEDAGOGICAL_MACRO_SCHEMA_VERSION;
  catalogId: string;
  entries: readonly PedagogicalMacroIndexEntry[];
  adaptiveLinks: readonly PedagogicalMacroAdaptiveLink[];
}
