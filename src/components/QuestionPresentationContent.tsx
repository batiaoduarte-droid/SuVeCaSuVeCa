import { BookOpenText, ChevronDown, FileImage, ScanText } from 'lucide-react';
import type { QuestionPresentation, QuestionSupportBlock } from '../types/questionPresentation';

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
  if (block.type === 'heading') {
    return <h4 className="font-serif text-base font-bold leading-snug text-slate-950 sm:text-lg">{block.text}</h4>;
  }
  if (block.type === 'source' || block.type === 'caption') {
    return <footer className="border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600">{block.text}</footer>;
  }
  if (block.type === 'verse') {
    return <p className="whitespace-pre-line border-l-2 border-teal-200 pl-4 font-serif text-sm leading-7 text-slate-800">{block.text}</p>;
  }
  return <p className="font-serif text-sm leading-7 text-slate-800 sm:text-[15px]">{block.text}</p>;
};

export function QuestionPresentationContent({ presentation, supportText, prompt }: QuestionPresentationContentProps) {
  const blocks = presentation?.supportBlocks?.length ? presentation.supportBlocks : fallbackBlocks(supportText);
  const command = presentation?.command || prompt;
  const media = presentation?.media || [];
  const showMediaAsPrimary = presentation?.displayMode === 'image_primary' || presentation?.displayMode === 'text_and_image';
  const hasOriginalScan = presentation?.displayMode === 'text_primary' && media.length > 0;

  return (
    <div className="space-y-4">
      {blocks.length > 0 && (
        <details open className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 marker:hidden">
            <span className="flex items-center gap-2"><BookOpenText className="h-4 w-4 text-teal-700" /> Texto de apoio</span>
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mx-auto max-w-[76ch] space-y-4 px-4 py-5 sm:px-6">
            {blocks.map((block, index) => <SupportBlock key={`${block.type}-${index}`} block={block} />)}
          </div>
        </details>
      )}

      {showMediaAsPrimary && media.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4" aria-label="Mídia do texto de apoio">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            <FileImage className="h-4 w-4 text-teal-700" /> Fonte visual
          </div>
          <div className={`grid gap-3 ${media.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {media.map((asset) => (
              <img key={asset.mediaRef} src={asset.url} alt={asset.altText} loading="lazy" className="mx-auto h-auto max-h-[70dvh] w-auto max-w-full rounded-xl border border-slate-200 bg-white object-contain" />
            ))}
          </div>
        </section>
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

      <section className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5" aria-label="Comando da questão">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-teal-800">Comando</p>
        <p className="text-sm font-semibold leading-7 text-slate-950 sm:text-base">{command}</p>
      </section>
    </div>
  );
}
