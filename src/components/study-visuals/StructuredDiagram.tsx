import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Braces,
  CheckCircle2,
  Compass,
  Copy,
  FolderTree,
  GitBranch,
  GitMerge,
  HelpCircle,
  Lightbulb,
  ListTree,
  Network,
  Scale,
  Sigma,
  Split,
  Workflow,
} from 'lucide-react';
import type {
  DiagramStructure,
  DiagramStructureEdge,
  DiagramStructureNode,
  DiagramVisualType,
} from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

export interface StructuredDiagramProps {
  title?: string;
  source?: string;
  structure: DiagramStructure;
  variant?: 'standalone' | 'embedded';
  mode?: 'visual' | 'structured' | 'source';
  onModeChange?: (mode: 'visual' | 'structured' | 'source') => void;
  hideHeader?: boolean;
  hideToolbar?: boolean;
  className?: string;
}

const kindLabel: Record<DiagramVisualType, string> = {
  sequence: 'Sequência de análise',
  decision_flow: 'Fluxo de decisão',
  branches: 'Alternativas em paralelo',
  comparison: 'Comparação por critérios',
  taxonomy: 'Hierarquia de conceitos',
  relations: 'Rede de relações',
};

const kindIcon: Record<DiagramVisualType, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  sequence: ListTree,
  decision_flow: Split,
  branches: GitBranch,
  comparison: Scale,
  taxonomy: ListTree,
  relations: Network,
};

const kindConfig: Record<
  DiagramStructureNode['kind'],
  {
    tone: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    iconTone: string;
    badgeBg: string;
    badgeLabel: string;
  }
> = {
  start: {
    tone: 'border-teal-400 bg-gradient-to-br from-teal-50/95 to-teal-100/40 shadow-xs ring-1 ring-teal-300/60',
    icon: Compass,
    iconTone: 'text-teal-900',
    badgeBg: 'bg-teal-800 text-white',
    badgeLabel: 'Início do fluxo',
  },
  decision: {
    tone: 'border-amber-400 bg-gradient-to-br from-amber-50/95 to-amber-100/40 shadow-xs ring-1 ring-amber-300/70',
    icon: HelpCircle,
    iconTone: 'text-amber-900',
    badgeBg: 'bg-amber-700 text-white',
    badgeLabel: 'Ponto de decisão',
  },
  formula: {
    tone: 'border-indigo-400 bg-gradient-to-br from-indigo-50/90 to-slate-50 shadow-xs ring-1 ring-indigo-300/60 font-mono-friendly',
    icon: Sigma,
    iconTone: 'text-indigo-900',
    badgeBg: 'bg-indigo-800 text-white',
    badgeLabel: 'Equação / Fórmula de cálculo',
  },
  result: {
    tone: 'border-emerald-400 bg-gradient-to-br from-emerald-50/95 to-teal-50/50 shadow-xs ring-1 ring-emerald-300/70',
    icon: CheckCircle2,
    iconTone: 'text-emerald-900',
    badgeBg: 'bg-emerald-800 text-white',
    badgeLabel: 'Resultado conclusivo',
  },
  rule: {
    tone: 'border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-white shadow-xs ring-1 ring-emerald-200/50',
    icon: Scale,
    iconTone: 'text-emerald-900',
    badgeBg: 'bg-emerald-700 text-white',
    badgeLabel: 'Regra gramatical',
  },
  process: {
    tone: 'border-sky-300 bg-gradient-to-br from-sky-50/80 to-white shadow-xs ring-1 ring-sky-200/50',
    icon: Workflow,
    iconTone: 'text-sky-900',
    badgeBg: 'bg-sky-800 text-white',
    badgeLabel: 'Etapa de processo',
  },
  example: {
    tone: 'border-slate-300 bg-white shadow-xs ring-1 ring-slate-200/60',
    icon: Lightbulb,
    iconTone: 'text-amber-700',
    badgeBg: 'bg-slate-800 text-white',
    badgeLabel: 'Exemplo prático',
  },
  category: {
    tone: 'border-violet-300 bg-gradient-to-br from-violet-50/80 to-white shadow-xs ring-1 ring-violet-200/50',
    icon: FolderTree,
    iconTone: 'text-violet-900',
    badgeBg: 'bg-violet-800 text-white',
    badgeLabel: 'Classificação taxonômica',
  },
};

const cleanNodeLabel = (
  groupLabel?: string,
  nodeLabel?: string,
): { displayGroup?: string; displayLabel: string } => {
  if (!nodeLabel) return { displayGroup: groupLabel, displayLabel: '' };
  if (!groupLabel) return { displayLabel: nodeLabel };

  const normGroup = groupLabel.trim().toLowerCase();
  const normNode = nodeLabel.trim().toLowerCase();

  // If group and node labels are identical
  if (normGroup === normNode) {
    return { displayGroup: groupLabel, displayLabel: nodeLabel };
  }

  // If node label starts directly with the group label
  if (normNode.startsWith(normGroup)) {
    const stripped = nodeLabel.slice(groupLabel.length).replace(/^[\s:—–.-]+/, '').trim();
    return {
      displayGroup: groupLabel,
      displayLabel: stripped || nodeLabel,
    };
  }

  return { displayGroup: groupLabel, displayLabel: nodeLabel };
};

const NodeCard: React.FC<{
  node: DiagramStructureNode;
  index?: number;
  edgeLabels?: string[];
  compact?: boolean;
  groupLabel?: string;
  isOfframp?: boolean;
}> = ({ node, index, edgeLabels = [], compact = false, groupLabel, isOfframp = false }) => {
  const config = kindConfig[node.kind] || kindConfig.process;
  const IconComponent = config.icon;
  const { displayGroup, displayLabel } = cleanNodeLabel(groupLabel, node.label);

  return (
    <article
      className={`h-full rounded-2xl border p-4 sm:p-5 transition-all duration-150 ${config.tone} ${
        isOfframp ? 'ring-2 ring-emerald-400/80' : ''
      }`}
    >
      {displayGroup && displayGroup !== displayLabel && (
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="rounded-md bg-teal-800/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-teal-800">
            {displayGroup}
          </span>
        </div>
      )}
      {edgeLabels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Condições de entrada">
          {edgeLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-900 shadow-2xs"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start gap-3.5">
        <span
          className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-xl font-black shadow-2xs ${config.badgeBg}`}
          aria-label={config.badgeLabel}
        >
          {typeof index === 'number' ? (
            <span className="text-xs">{index + 1}</span>
          ) : (
            <IconComponent className="h-4 w-4" aria-hidden={true} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-black leading-snug text-slate-950 sm:text-[15px]">
            <InlineRichText>{displayLabel}</InlineRichText>
          </p>
          {!compact && node.details && node.details.length > 0 && (
            <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
              {node.details.map((detail, detailIndex) => (
                <li key={`${node.id}-detail-${detailIndex}`} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <InlineRichText>{detail}</InlineRichText>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
};

const graphIndex = (structure: DiagramStructure) => {
  const nodes = new Map(structure.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, DiagramStructureEdge[]>();
  const outgoing = new Map<string, DiagramStructureEdge[]>();
  for (const edge of structure.edges) {
    incoming.set(edge.to, [...(incoming.get(edge.to) || []), edge]);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge]);
  }
  const roots = structure.nodes.filter((node) => !(incoming.get(node.id)?.length));
  return { nodes, incoming, outgoing, roots };
};

interface BranchComplexity {
  nodeCount: number;
  maxDepth: number;
  hasDecisions: boolean;
  hasBranches: boolean;
  isTerminalLeaf: boolean;
}

const getBranchComplexity = (
  startId: string,
  outgoing: Map<string, DiagramStructureEdge[]>,
  nodes: Map<string, DiagramStructureNode>,
  stopSet: Set<string>,
): BranchComplexity => {
  let count = 0;
  let maxDepth = 0;
  let hasDecisions = false;
  let hasBranches = false;

  const visited = new Set<string>();
  const stack: Array<{ id: string; depth: number }> = [{ id: startId, depth: 1 }];

  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    if (visited.has(id) || stopSet.has(id)) continue;
    visited.add(id);
    count++;
    if (depth > maxDepth) maxDepth = depth;

    const node = nodes.get(id);
    if (node?.kind === 'decision') hasDecisions = true;

    const outs = (outgoing.get(id) || []).filter((e) => !stopSet.has(e.to));
    if (outs.length > 1) hasBranches = true;

    for (const edge of outs) {
      stack.push({ id: edge.to, depth: depth + 1 });
    }
  }

  const isTerminalLeaf =
    count <= 1 && (outgoing.get(startId) || []).filter((e) => !stopSet.has(e.to)).length === 0;

  return {
    nodeCount: count,
    maxDepth,
    hasDecisions,
    hasBranches,
    isTerminalLeaf,
  };
};

const orderedSequence = (structure: DiagramStructure) => {
  const { nodes, outgoing, roots } = graphIndex(structure);
  const result: DiagramStructureNode[] = [];
  const visited = new Set<string>();
  let current = nodes.get(structure.rootId || '') || roots[0] || structure.nodes[0];
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    result.push(current);
    current = nodes.get((outgoing.get(current.id) || [])[0]?.to || '');
  }
  for (const node of structure.nodes) if (!visited.has(node.id)) result.push(node);
  return result;
};

const SequenceView: React.FC<{ structure: DiagramStructure }> = ({ structure }) => {
  const ordered = orderedSequence(structure);
  const groups = [...(structure.groups || [])].sort((left, right) => left.order - right.order);
  if (!groups.length) {
    return (
      <div role="list" className="mx-auto max-w-4xl space-y-0" aria-label={kindLabel.sequence}>
        {ordered.map((node, index, nodes) => (
          <React.Fragment key={node.id}>
            <div role="listitem">
              <NodeCard node={node} index={index} />
            </div>
            {index < nodes.length - 1 && (
              <div aria-hidden="true" className="flex h-8 items-center justify-center text-teal-700">
                <ArrowDown className="h-5 w-5" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const groupedIds = new Set(groups.map((group) => group.id));
  const sections = [
    ...groups.map((group) => ({
      id: group.id,
      label: group.label,
      nodes: ordered.filter((node) => node.groupId === group.id),
    })),
    {
      id: 'ungrouped',
      label: '',
      nodes: ordered.filter((node) => !node.groupId || !groupedIds.has(node.groupId)),
    },
  ].filter((section) => section.nodes.length > 0);

  let globalIndex = 0;
  return (
    <div role="list" className="@container/diagram w-full space-y-4" aria-label={kindLabel.sequence}>
      {sections.map((section, sectionIndex) => {
        const isSingleIdenticalNode =
          Boolean(section.label) &&
          section.nodes.length === 1 &&
          section.nodes[0].label.trim().toLowerCase() === section.label.trim().toLowerCase();

        return (
          <React.Fragment key={section.id}>
            <section
              className="rounded-2xl border border-teal-200 bg-teal-50/30 p-3 sm:p-4"
              aria-label={section.label || undefined}
            >
              {section.label && !isSingleIdenticalNode && (
                <h6 className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-teal-800">
                  {section.label}
                </h6>
              )}
              {section.nodes.map((node, nodeIndex) => {
                const index = globalIndex++;
                return (
                  <React.Fragment key={node.id}>
                    <div role="listitem">
                      <NodeCard node={node} index={index} />
                    </div>
                    {nodeIndex < section.nodes.length - 1 && (
                      <div aria-hidden="true" className="flex h-8 items-center justify-center text-teal-700">
                        <ArrowDown className="h-5 w-5" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </section>
            {sectionIndex < sections.length - 1 && (
              <div aria-hidden="true" className="flex h-8 items-center justify-center text-teal-700">
                <ArrowDown className="h-5 w-5" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const BranchingGraphView: React.FC<{ structure: DiagramStructure; label: string }> = ({
  structure,
  label,
}) => {
  const { nodes, outgoing, roots } = graphIndex(structure);
  const root = nodes.get(structure.rootId || '') || roots[0] || structure.nodes[0];
  const groupLabels = new Map((structure.groups || []).map((group) => [group.id, group.label]));

  const reachMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [id] of nodes) {
      const visited = new Set<string>();
      const stack = [id];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        for (const edge of outgoing.get(curr) || []) {
          stack.push(edge.to);
        }
      }
      map.set(id, visited);
    }
    return map;
  }, [nodes, outgoing]);

  const renderBranch = (
    node: DiagramStructureNode,
    ancestry: Set<string>,
    incomingLabel = '',
    parentGroupId?: string,
    stopSet: Set<string> = new Set(),
  ): React.ReactNode => {
    const nextAncestry = new Set(ancestry).add(node.id);
    const activeChildren = (outgoing.get(node.id) || [])
      .map((edge) => ({ edge, node: nodes.get(edge.to) }))
      .filter(
        (entry): entry is { edge: DiagramStructureEdge; node: DiagramStructureNode } =>
          Boolean(entry.node) && !ancestry.has(entry.node!.id) && !stopSet.has(entry.node!.id),
      );
    const changedGroup =
      node.groupId && node.groupId !== parentGroupId ? groupLabels.get(node.groupId) : undefined;

    if (activeChildren.length <= 1) {
      return (
        <div key={`${node.id}-${incomingLabel}`} role="listitem" className="min-w-0">
          <NodeCard
            node={node}
            edgeLabels={incomingLabel ? [incomingLabel] : []}
            groupLabel={changedGroup}
          />
          {activeChildren.length === 1 && (
            <>
              <div aria-hidden="true" className="flex h-9 items-center justify-center text-teal-700">
                <ArrowDown className="h-5 w-5" />
              </div>
              {renderBranch(
                activeChildren[0].node,
                nextAncestry,
                activeChildren[0].edge.label,
                node.groupId,
                stopSet,
              )}
            </>
          )}
        </div>
      );
    }

    // Multiple children (Fork)
    const branchReachable = activeChildren.map(
      (child) => reachMap.get(child.node.id) || new Set([child.node.id]),
    );
    let joinNode: DiagramStructureNode | undefined;
    const commonReachable = [...(branchReachable[0] || [])].filter(
      (candId) =>
        !ancestry.has(candId) &&
        !stopSet.has(candId) &&
        candId !== node.id &&
        branchReachable.every((rSet) => rSet.has(candId)),
    );

    if (commonReachable.length > 0) {
      commonReachable.sort((a, b) => (reachMap.get(b)?.size || 0) - (reachMap.get(a)?.size || 0));
      const firstJoinId = commonReachable[0];
      joinNode = nodes.get(firstJoinId);
    }

    const currentBranchStopSet = joinNode
      ? new Set([...stopSet, joinNode.id, ...(reachMap.get(joinNode.id) || [])])
      : stopSet;

    // Compute complexity for all active children
    const childComplexities = new Map(
      activeChildren.map(({ node: child }) => [
        child.id,
        getBranchComplexity(child.id, outgoing, nodes, currentBranchStopSet),
      ]),
    );

    // Check for specialized Decision Flow Spine + Lateral Offramp
    // (Applicable in decision_flow when a 2-exit decision has 1 terminal leaf and 1 continuation)
    if (
      structure.visualType === 'decision_flow' &&
      node.kind === 'decision' &&
      activeChildren.length === 2 &&
      !joinNode
    ) {
      const [childA, childB] = activeChildren;
      const compA = childComplexities.get(childA.node.id)!;
      const compB = childComplexities.get(childB.node.id)!;

      const isAOfframp = compA.isTerminalLeaf && !compB.isTerminalLeaf;
      const isBOfframp = compB.isTerminalLeaf && !compA.isTerminalLeaf;

      if (isAOfframp || isBOfframp) {
        const offrampChild = isAOfframp ? childA : childB;
        const mainChild = isAOfframp ? childB : childA;

        return (
          <div key={`${node.id}-${incomingLabel}`} role="listitem" className="min-w-0 space-y-4">
            <NodeCard
              node={node}
              edgeLabels={incomingLabel ? [incomingLabel] : []}
              groupLabel={changedGroup}
            />

            {/* Lateral exit / offramp card */}
            <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 sm:p-4 shadow-xs">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-900">
                  <ArrowRight className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                  <span>{offrampChild.edge.label}</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Saída terminal
                </span>
              </div>
              <NodeCard
                node={offrampChild.node}
                edgeLabels={[]}
                groupLabel={offrampChild.node.groupId ? groupLabels.get(offrampChild.node.groupId) : undefined}
                isOfframp
              />
            </div>

            {/* Main continuation downward spine */}
            <div className="relative pt-1">
              <div aria-hidden="true" className="flex h-8 items-center justify-center text-teal-700">
                <ArrowDown className="h-5 w-5" />
              </div>
              {renderBranch(
                mainChild.node,
                nextAncestry,
                mainChild.edge.label,
                node.groupId,
                stopSet,
              )}
            </div>
          </div>
        );
      }
    }

    // Determine if branches are complex (requiring stacked full-width lanes instead of narrow columns)
    const complexChildrenCount = activeChildren.filter(({ node: child }) => {
      const comp = childComplexities.get(child.id)!;
      return comp.nodeCount >= 2 || comp.hasBranches || comp.hasDecisions;
    }).length;

    const anyDeepBranch = activeChildren.some(({ node: child }) => {
      const comp = childComplexities.get(child.id)!;
      return comp.nodeCount >= 3 || comp.maxDepth >= 3 || comp.hasBranches;
    });

    const useStackedLanes = complexChildrenCount >= 2 || anyDeepBranch;

    return (
      <div key={`${node.id}-${incomingLabel}`} role="listitem" className="min-w-0">
        <NodeCard
          node={node}
          edgeLabels={incomingLabel ? [incomingLabel] : []}
          groupLabel={changedGroup}
        />

        {/* Fork connector */}
        <div className="relative mt-5 pt-5">
          <div
            aria-hidden="true"
            className="absolute left-1/2 -top-5 h-5 w-0.5 -translate-x-1/2 bg-teal-300"
          />
          <div
            aria-hidden="true"
            className="mx-auto mb-4 h-0.5 w-[calc(100%-2rem)] max-w-3xl rounded-full bg-teal-300"
          />

          {useStackedLanes ? (
            <div className="flex flex-col gap-5">
              {activeChildren.map(({ edge, node: child }) => (
                <div
                  key={`${node.id}-${edge.to}-${edge.label}`}
                  className="relative min-w-0 rounded-2xl border border-teal-200/80 bg-slate-50/70 p-3 sm:p-5 shadow-xs"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-900 shadow-2xs">
                      {edge.label}
                    </span>
                  </div>
                  {renderBranch(child, nextAncestry, '', node.groupId, currentBranchStopSet)}
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`grid items-start gap-4 ${
                activeChildren.length >= 4
                  ? '@sm/diagram:grid-cols-2 @2xl/diagram:grid-cols-4'
                  : activeChildren.length === 3
                  ? '@sm/diagram:grid-cols-2 @lg/diagram:grid-cols-3'
                  : '@sm/diagram:grid-cols-2'
              }`}
            >
              {activeChildren.map(({ edge, node: child }) => (
                <div
                  key={`${node.id}-${edge.to}-${edge.label}`}
                  className="relative min-w-[240px] rounded-2xl bg-slate-50/60 p-2 sm:p-3"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 -top-5 h-5 w-0.5 -translate-x-1/2 bg-teal-300"
                  />
                  {renderBranch(child, nextAncestry, edge.label, node.groupId, currentBranchStopSet)}
                </div>
              ))}
            </div>
          )}
        </div>

        {joinNode && (
          <>
            <div className="relative mt-5 border-t-2 border-teal-300 pt-3 text-center">
              <span
                aria-hidden="true"
                className="absolute left-1/2 -top-3 h-3 w-0.5 -translate-x-1/2 bg-teal-300"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-teal-900 shadow-2xs">
                <GitMerge className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                <span>Convergência</span>
              </span>
            </div>
            <div aria-hidden="true" className="flex h-8 items-center justify-center text-teal-700">
              <ArrowDown className="h-5 w-5" />
            </div>
            {renderBranch(joinNode, nextAncestry, '', node.groupId, stopSet)}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      role="list"
      className="@container/diagram w-full"
      aria-label={label}
    >
      {root ? renderBranch(root, new Set()) : null}
    </div>
  );
};

const DecisionFlowView: React.FC<{ structure: DiagramStructure }> = ({ structure }) => (
  <BranchingGraphView structure={structure} label={kindLabel.decision_flow} />
);

const RootAndGridView: React.FC<{
  structure: DiagramStructure;
  mode: 'branches' | 'relations';
}> = ({ structure, mode }) => {
  if (mode === 'branches') return <BranchingGraphView structure={structure} label={kindLabel.branches} />;
  const { nodes, incoming, roots } = graphIndex(structure);
  const root = nodes.get(structure.rootId || '') || roots[0];
  const visible = structure.nodes.filter((node) => node.id !== root?.id);
  return (
    <div className="@container/diagram w-full" aria-label={kindLabel[mode]}>
      {root && (
        <div className="mb-5 w-full">
          <NodeCard node={root} compact />
          {visible.length > 0 && (
            <div aria-hidden="true" className="flex h-8 items-center justify-center text-teal-700">
              <ArrowDown className="h-5 w-5" />
            </div>
          )}
        </div>
      )}
      <div
        role="list"
        className={`grid gap-4 ${
          visible.length >= 2 ? '@sm/diagram:grid-cols-2' : ''
        }`}
      >
        {visible.map((node) => (
          <div role="listitem" key={node.id} className="min-w-[240px]">
            <NodeCard
              node={node}
              edgeLabels={(incoming.get(node.id) || [])
                .map((edge) => edge.label)
                .filter((label): label is string => Boolean(label))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ComparisonView: React.FC<{ structure: DiagramStructure }> = ({ structure }) => {
  const { nodes, incoming, roots } = graphIndex(structure);
  const root = nodes.get(structure.rootId || '') || roots[0];
  const rows = structure.nodes.filter((node) => node.id !== root?.id);

  return (
    <div className="@container/diagram w-full" aria-label={kindLabel.comparison}>
      {root && (
        <div className="mb-4 w-full">
          <NodeCard node={root} compact />
        </div>
      )}

      <div
        role="table"
        aria-label={root?.label || kindLabel.comparison}
        className="hidden overflow-hidden rounded-2xl border border-teal-200 shadow-xs md:block"
      >
        <div
          role="row"
          className="grid grid-cols-[minmax(13rem,0.85fr)_minmax(0,1.65fr)] bg-teal-950 text-white"
        >
          <div
            role="columnheader"
            className="border-r border-teal-800 px-4 py-3 text-xs font-black uppercase tracking-wide"
          >
            Elemento comparado
          </div>
          <div role="columnheader" className="px-4 py-3 text-xs font-black uppercase tracking-wide">
            Critérios, propriedades e exemplos
          </div>
        </div>
        <div role="rowgroup" className="divide-y divide-slate-200">
          {rows.map((node) => {
            const edgeLabels = (incoming.get(node.id) || [])
              .map((edge) => edge.label)
              .filter((label): label is string => Boolean(label));
            return (
              <div
                role="row"
                key={node.id}
                className="grid grid-cols-[minmax(13rem,0.85fr)_minmax(0,1.65fr)] bg-white even:bg-slate-50/80"
              >
                <div
                  role="cell"
                  className="border-r border-slate-200 px-4 py-3 text-sm font-black leading-relaxed text-slate-900"
                >
                  <InlineRichText>{node.label}</InlineRichText>
                </div>
                <div role="cell" className="px-4 py-3 text-sm leading-relaxed text-slate-700">
                  {edgeLabels.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {edgeLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal-800"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {node.details && node.details.length > 0 ? (
                    <ul className="space-y-1.5">
                      {node.details.map((detail, index) => (
                        <li key={`${node.id}-matrix-${index}`}>
                          <InlineRichText>{detail}</InlineRichText>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-500">Categoria ou valor de contraste</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div role="list" className="grid gap-3 md:hidden">
        {rows.map((node) => (
          <div role="listitem" key={node.id} className="min-w-[240px]">
            <NodeCard
              node={node}
              edgeLabels={(incoming.get(node.id) || [])
                .map((edge) => edge.label)
                .filter((label): label is string => Boolean(label))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const TaxonomyView: React.FC<{ structure: DiagramStructure }> = ({ structure }) => {
  const { nodes, outgoing, roots } = graphIndex(structure);
  const rootNodes =
    structure.rootId && nodes.get(structure.rootId) ? [nodes.get(structure.rootId)!] : roots;
  const renderNode = (
    node: DiagramStructureNode,
    ancestry: Set<string>,
    edgeLabel?: string,
  ): React.ReactNode => {
    const children = (outgoing.get(node.id) || [])
      .map((edge) => ({ edge, node: nodes.get(edge.to) }))
      .filter(
        (entry): entry is { edge: DiagramStructureEdge; node: DiagramStructureNode } =>
          Boolean(entry.node) && !ancestry.has(entry.node!.id),
      );
    const nextAncestry = new Set(ancestry).add(node.id);
    return (
      <li key={node.id} className="relative">
        {edgeLabel && (
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-teal-700">
            {edgeLabel}
          </span>
        )}
        <NodeCard node={node} />
        {children.length > 0 && (
          <ul className="ml-4 mt-3 space-y-3 border-l-2 border-teal-200 pl-4 sm:ml-7 sm:pl-6">
            {children.map(({ edge, node: child }) =>
              renderNode(child, nextAncestry, edge.label),
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul
      className="@container/diagram w-full space-y-4"
      aria-label={kindLabel.taxonomy}
    >
      {rootNodes.map((node) => renderNode(node, new Set()))}
    </ul>
  );
};

const VisualPresentation: React.FC<{ structure: DiagramStructure }> = ({ structure }) => {
  switch (structure.visualType) {
    case 'sequence':
      return <SequenceView structure={structure} />;
    case 'decision_flow':
      return <DecisionFlowView structure={structure} />;
    case 'taxonomy':
      return <TaxonomyView structure={structure} />;
    case 'branches':
      return <RootAndGridView structure={structure} mode="branches" />;
    case 'comparison':
      return <ComparisonView structure={structure} />;
    case 'relations':
      return <RootAndGridView structure={structure} mode="relations" />;
  }
};

export const StructuredDiagram: React.FC<StructuredDiagramProps> = ({
  title,
  source,
  structure,
  variant = 'standalone',
  mode: externalMode,
  onModeChange,
  hideHeader = false,
  hideToolbar = false,
  className = '',
}) => {
  const [internalMode, setInternalMode] = useState<'visual' | 'structured' | 'source'>('visual');
  const [copied, setCopied] = useState(false);
  const Icon = useMemo(() => kindIcon[structure.visualType], [structure.visualType]);
  const structuredText = structure.structuredText?.trim();

  const currentMode = externalMode !== undefined ? externalMode : internalMode;
  const setMode = (newMode: 'visual' | 'structured' | 'source') => {
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  };

  const copyVisibleText = async () => {
    const copyValue = currentMode === 'source' ? source : structuredText || source;
    if (!copyValue || !navigator.clipboard) return;
    await navigator.clipboard.writeText(copyValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (variant === 'embedded') {
    return (
      <div className={`overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs ${className}`}>
        {!hideHeader && title && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-teal-800 text-white">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                <InlineRichText>{title}</InlineRichText>
              </span>
            </div>
            {!hideToolbar && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('visual')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    currentMode === 'visual'
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Visual
                </button>
                {structuredText && (
                  <button
                    type="button"
                    onClick={() => setMode('structured')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      currentMode === 'structured'
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Texto
                  </button>
                )}
                {source && (
                  <button
                    type="button"
                    onClick={() => setMode('source')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      currentMode === 'source'
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Fonte
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {currentMode === 'source' && source ? (
          <div className="bg-slate-950 p-4 sm:p-5">
            <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-100">
              <code>{source}</code>
            </pre>
          </div>
        ) : currentMode === 'structured' && structuredText ? (
          <div className="bg-slate-50 p-4 sm:p-5">
            <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-800">
              <code>{structuredText}</code>
            </pre>
          </div>
        ) : (
          <div className="p-3.5 sm:p-5">
            <VisualPresentation structure={structure} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section className={`my-5 overflow-hidden rounded-2xl border border-teal-300 bg-white shadow-sm ${className}`}>
      {!hideHeader && (
        <header className="flex flex-col gap-4 bg-gradient-to-r from-teal-950 to-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-700 bg-teal-800/70 text-teal-100">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h5 className="text-sm font-black leading-snug text-white">
                <InlineRichText>{title || 'Esquema estruturado'}</InlineRichText>
              </h5>
              <p className="mt-1 text-[11px] font-semibold text-teal-200">
                {kindLabel[structure.visualType]}
              </p>
            </div>
          </div>
          {!hideToolbar && (
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex flex-wrap items-center gap-2"
                role="tablist"
                aria-label="Visualização do esquema"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={currentMode === 'visual'}
                  onClick={() => setMode('visual')}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold ${
                    currentMode === 'visual'
                      ? 'border-teal-500 bg-teal-700 text-white'
                      : 'border-teal-800 bg-teal-950/40 text-teal-100 hover:bg-teal-900'
                  }`}
                >
                  <GitBranch className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Visual
                </button>
                {structuredText && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={currentMode === 'structured'}
                    onClick={() => setMode('structured')}
                    className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold ${
                      currentMode === 'structured'
                        ? 'border-teal-500 bg-teal-700 text-white'
                        : 'border-teal-800 bg-teal-950/40 text-teal-100 hover:bg-teal-900'
                    }`}
                  >
                    <ListTree className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Estrutura textual
                  </button>
                )}
                {source && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={currentMode === 'source'}
                    onClick={() => setMode('source')}
                    className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold ${
                      currentMode === 'source'
                        ? 'border-teal-500 bg-teal-700 text-white'
                        : 'border-teal-800 bg-teal-950/40 text-teal-100 hover:bg-teal-900'
                    }`}
                  >
                    <Braces className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Fonte original
                  </button>
                )}
              </div>
              {(source || structuredText) && (
                <button
                  type="button"
                  onClick={copyVisibleText}
                  className="min-h-10 rounded-lg border border-teal-800 bg-teal-950/40 px-3 py-2 text-xs font-bold text-teal-100 hover:bg-teal-900"
                  aria-label={copied ? 'Texto copiado' : 'Copiar representação textual'}
                >
                  {copied ? (
                    <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Copy className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                  )}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>
          )}
        </header>
      )}

      {currentMode === 'source' && source ? (
        <div role="tabpanel" className="bg-slate-950 p-4 sm:p-5">
          <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-100">
            <code>{source}</code>
          </pre>
        </div>
      ) : currentMode === 'structured' && structuredText ? (
        <div role="tabpanel" className="bg-slate-50 p-4 sm:p-5">
          <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-800">
            <code>{structuredText}</code>
          </pre>
        </div>
      ) : (
        <div role="tabpanel" className="p-4 sm:p-5">
          <VisualPresentation structure={structure} />
        </div>
      )}
    </section>
  );
};
