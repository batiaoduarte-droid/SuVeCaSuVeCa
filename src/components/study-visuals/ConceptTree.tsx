import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FolderTree,
  GitBranch,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { ConnectionMapNode, ConnectionMapEdge } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

export interface ConceptTreeNode {
  id: string;
  label: string;
  type?: 'root' | 'category' | 'concept' | 'rule' | 'leaf';
  description?: string;
  badge?: string;
  children?: ConceptTreeNode[];
}

interface ConceptTreeProps {
  title?: string;
  subtitle?: string;
  nodes?: ConnectionMapNode[];
  edges?: ConnectionMapEdge[];
  treeData?: ConceptTreeNode[];
  className?: string;
}

// Constrói árvore hierárquica a partir de nodes e edges se treeData não for passado
const buildTreeFromGraph = (
  nodes: ConnectionMapNode[],
  edges: ConnectionMapEdge[]
): ConceptTreeNode[] => {
  if (!nodes || nodes.length === 0) return [];

  const nodeMap = new Map<string, ConceptTreeNode>();
  nodes.forEach((n) => {
    nodeMap.set(n.nodeId, {
      id: n.nodeId,
      label: n.label,
      type: n.nodeType === 'topic' ? 'root' : n.nodeType === 'concept' ? 'category' : 'leaf',
      badge: n.nodeType,
      children: [],
    });
  });

  const childrenSet = new Set<string>();
  edges.forEach((edge) => {
    const parent = nodeMap.get(edge.from);
    const child = nodeMap.get(edge.to);
    if (parent && child) {
      if (!parent.children) parent.children = [];
      parent.children.push(child);
      childrenSet.add(edge.to);
    }
  });

  // Raízes são nós que não são destino de nenhuma aresta
  const roots: ConceptTreeNode[] = [];
  nodes.forEach((n) => {
    if (!childrenSet.has(n.nodeId)) {
      const rootNode = nodeMap.get(n.nodeId);
      if (rootNode) roots.push(rootNode);
    }
  });

  return roots.length > 0 ? roots : Array.from(nodeMap.values());
};

const TreeNodeItem: React.FC<{
  node: ConceptTreeNode;
  depth?: number;
}> = ({ node, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const isRoot = depth === 0;

  return (
    <div className={`space-y-2 ${depth > 0 ? 'ml-4 sm:ml-6 pl-3 border-l-2 border-teal-200' : ''}`}>
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800 hover:bg-teal-200 transition cursor-pointer select-none"
            aria-label={isExpanded ? 'Recolher galho' : 'Expandir galho'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="h-2 w-2 rounded-full bg-teal-600 shrink-0 ml-1.5" />
        )}

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
            isRoot
              ? 'bg-teal-900 text-white border-teal-950 font-black shadow-xs'
              : hasChildren
              ? 'bg-teal-50/80 text-teal-950 border-teal-200 font-bold'
              : 'bg-white text-slate-800 border-slate-200 font-medium'
          }`}
        >
          <span className="text-xs sm:text-sm">
            <InlineRichText>{node.label}</InlineRichText>
          </span>
          {node.badge && (
            <span
              className={`text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md ${
                isRoot
                  ? 'bg-teal-800 text-teal-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {node.badge}
            </span>
          )}
        </div>
      </div>

      {node.description && (
        <p className="text-xs text-slate-600 font-medium ml-7 leading-relaxed">
          <InlineRichText>{node.description}</InlineRichText>
        </p>
      )}

      {hasChildren && isExpanded && (
        <div className="space-y-2 pt-1">
          {node.children!.map((child, index) => (
            <TreeNodeItem key={`${child.id}-${index}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ConceptTree: React.FC<ConceptTreeProps> = ({
  title = 'Taxonomia e Relações Estruturadas',
  subtitle,
  nodes,
  edges,
  treeData,
  className = '',
}) => {
  const tree = treeData || (nodes && edges ? buildTreeFromGraph(nodes, edges) : []);

  if (tree.length === 0) return null;

  return (
    <div
      className={`my-4 rounded-2xl border border-teal-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 select-text ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-teal-100 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-teal-200 select-none">
          <FolderTree className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-black tracking-tight text-teal-950">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {tree.map((node, index) => (
          <TreeNodeItem key={`${node.id}-${index}`} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
};
