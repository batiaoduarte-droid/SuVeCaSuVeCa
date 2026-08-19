import React from 'react';
import type { SemanticBlock } from '../../../types/pedagogicalView';
import { SemanticBlockRenderer } from './SemanticBlockRenderer';

interface ContentBlockRendererProps {
  block: SemanticBlock;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ block }) => {
  return <SemanticBlockRenderer block={block} />;
};
