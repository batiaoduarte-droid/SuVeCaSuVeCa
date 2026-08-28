import { BookOpenText, ChevronDown, FileImage, ScanText } from 'lucide-react';
import type { QuestionPresentation, QuestionSupportBlock } from '../types/questionPresentation';
import { InlineRichText } from './pedagogical/blocks/InlineRichText';

interface QuestionPresentationContentProps {
  presentation?: QuestionPresentation;
  supportText?: string;
  prompt: string;
}

const fallbackBlocks = (supportText?: string): QuestionSupportBlock[] =>
  String(supportText || '')
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ type: 'paragraph', text }));

const SupportBlock = ({ block }: { block: QuestionSupportBlock }) => {
  const text = block.richText || block.text;
  if (block.type === 'heading') {
    return <h4 className="font-serif text-base font-bold leading-snug text-slate-950 sm:text-lg"><InlineRichText>{text}</InlineRichText></h4>;
  }
  if (block.type === 'source' || block.type === 'caption') {
    return <footer className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600"><InlineRichText>{text}</InlineRichText></footer>;
  }
  if (block.type === 'verse') {
    return <p className="whitespace-pre-line border-l-2 border-teal-200 pl-4 font-serif text-sm leading-7 text-slate-800"><InlineRichText>{text}</InlineRichText></p>;
  }
  return <p className="font-serif text-[15px] leading-7 text-slate-800 sm:text-base sm:leading-8"><InlineRichText>{text}</InlineRichText></p>;
};

export function QuestionPresentationContent({ presentation, supportText, prompt }: QuestionPresentationContentProps) {
  const blocks = presentation ? presentation.supportBlocks : fallbackBlocks(supportText);
  const supportRichText = presentation?.supportRichText;
  const command = presentation?.command || prompt;
  const media = presentation?.media || [];
  const showMediaAsPrimary = presentation?.displayMode === 'image_primary' || presentation?.displayMode === 'text_and_image';
  const hasOriginalScan = presentation?.displayMode === 'text_primary' && media.length > 0;

  return (
    <div className="space-y-4">
      {presentation?.contextStatus === 'source_missing' && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <strong className="block font-black">Texto-base indisponível na fonte publicada</strong>
          A tentativa foi bloqueada porque o comando depende de um texto identificado que não pôde ser recuperado com segurança.
        </div>
      )}
      {presentation?.formattingStatus === 'source_missing' && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <strong className="block font-black">Destaque visual indisponível na fonte publicada</strong>
          A tentativa foi bloqueada porque o comando depende de uma marcação tipográfica que não pôde ser recuperada com segurança.
        </div>
      )}
      {(blocks.length > 0 || supportRichText) && (
        <details open className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-900 marker:hidden sm:px-5">
            <span className="flex items-center gap-2"><BookOpenText className="h-4 w-4 text-teal-700" /> Texto de apoio</span>
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              {supportRichText ? 'texto estruturado' : `${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'}`}
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mx-auto max-w-[94ch] space-y-5 px-4 py-5 sm:px-7 sm:py-6">
            {supportRichText
              ? <p className="whitespace-pre-line font-serif text-[15px] leading-7 text-slate-800 sm:text-base sm:leading-8"><InlineRichText>{supportRichText}</InlineRichText></p>
              : blocks.map((block, index) => <SupportBlock key={`${block.type}-${index}`} block={block} />)}
          </div>
        </details>
      )}

      {showMediaAsPrimary && media.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            <FileImage className="h-4 w-4 text-teal-700" /> Fonte visual
          </div>
          <div className={`grid gap-3 ${media.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {media.map((asset) => (
              <img key={asset.mediaRef} src={asset.url} alt={asset.altText} loading="lazy" className="mx-auto h-auto max-h-[70dvh] w-auto max-w-full rounded-xl border border-slate-200 bg-white object-contain" />
            ))}
          </div>
        </div>
      )}

      {hasOriginalScan && (
        <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 font-bold text-slate-700 marker:hidden">
            <ScanText className="h-4 w-4 text-teal-700" /> Consultar digitalização original
          </summary>
          <div className={`mt-3 grid gap-3 ${media.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {media.map((asset) => <img key={asset.mediaRef} src={asset.url} alt={asset.altText} loading="lazy" className="mx-auto h-auto max-h-[60dvh] max-w-full rounded-lg border border-slate-200" />)}
          </div>
        </details>
      )}

      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-teal-800">Comando</p>
        <p className="text-sm font-semibold leading-7 text-slate-950 sm:text-base"><InlineRichText>{presentation?.commandRichText || command}</InlineRichText></p>
      </div>
    </div>
  );
}
