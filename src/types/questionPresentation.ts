export type QuestionSupportBlockType = 'heading' | 'paragraph' | 'verse' | 'source' | 'caption';

export interface QuestionSupportBlock {
  type: QuestionSupportBlockType;
  text: string;
  richText?: string;
}

export interface QuestionMediaAsset {
  mediaRef: string;
  url: string;
  role: 'text_page' | 'visual_source' | 'mixed_source';
  altText: string;
}

export interface QuestionPresentation {
  schemaVersion: '1.0.0';
  supportBlocks: QuestionSupportBlock[];
  supportRichText?: string;
  command: string;
  commandRichText?: string;
  optionRichText?: Record<string, string>;
  contextStatus?: 'not_required' | 'source_backed' | 'source_missing';
  formattingStatus?: 'not_required' | 'source_backed' | 'source_missing';
  mediaKind: 'none' | 'text_scan' | 'visual_essential' | 'mixed';
  displayMode: 'text_only' | 'text_primary' | 'image_primary' | 'text_and_image';
  media: QuestionMediaAsset[];
}
