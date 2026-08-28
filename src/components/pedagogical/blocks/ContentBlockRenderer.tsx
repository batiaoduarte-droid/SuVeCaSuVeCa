import React from 'react';
import type { SemanticBlock } from '../../../types/pedagogicalView';
import { SemanticBlockRenderer } from './SemanticBlockRenderer';

interface ContentBlockRendererProps {
  block: SemanticBlock;
  allowLegacyDiagramInference?: boolean;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  allowLegacyDiagramInference = true,
}) => {
  return <SemanticBlockRenderer block={block} allowLegacyDiagramInference={allowLegacyDiagramInference} />;
};
