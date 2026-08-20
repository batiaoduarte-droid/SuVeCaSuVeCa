import React, { useState } from 'react';
import {
  Workflow,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { SuvecaConnectionView } from '../../../types/pedagogicalView';
import { InlineRichText } from '../blocks/InlineRichText';
import { SuvecaSentenceMap } from '../../study-visuals/SuvecaSentenceMap';
import { StudyCallout } from '../../study-visuals/StudyCallout';
import { SUVECA_BLOCK_COLORS } from '../../study-visuals/studyVisualTokens';

interface SuvecaSectionProps {
  view: SuvecaConnectionView;
}

export const SuvecaSection: React.FC<SuvecaSectionProps> = ({ view }) => {
  const [copied, setCopied] = useState(false);

  if (!view) return null;
  const summary = view.summary || view.macroContext || '';
  const steps = view.steps || [];
  const limits = view.limits || [];

  const handleCopy = () => {
    const textToCopy = `Método SuVeCA: [Sujeito + Verbo + Complemento + Adjunto + Predicativo]\n\n${summary}\n\nPassos:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 select-text">
      {/* Quadro Principal de Conexão com o Método SuVeCA */}
      <div className="rounded-2xl border border-teal-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-900 text-teal-200 select-none shadow-2xs">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                {view.label || 'Conexão com o Método SuVeCA'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Mapa de ancoragem sintático-funcional para desarmar inversões de prova
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs select-none"
            title="Copiar síntese do método"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Mapa Interativo de Análise */}
        <SuvecaSentenceMap
          ruleSummary={summary}
          decisiveTest={view.decisiveTests && view.decisiveTests.length > 0 ? view.decisiveTests[0] : undefined}
        />

        {(view.macroContext || view.cognitiveAnchor || view.strategicSignificance || view.coreTension || view.visualBlueprint) && (
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Contexto do tema', view.macroContext],
              ['Âncora cognitiva', view.cognitiveAnchor],
              ['Por que isso decide a prova', view.strategicSignificance],
              ['Tensão que exige atenção', view.coreTension],
              ['Mapa visual', view.visualBlueprint],
            ].filter((entry): entry is [string, string] => Boolean(entry[1])).map(([title, text]) => (
              <article key={title} className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
                <h4 className="m-0 text-[11px] font-black uppercase tracking-wider text-teal-900">{title}</h4>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-800"><InlineRichText>{text}</InlineRichText></p>
              </article>
            ))}
          </div>
        )}

        {/* Como Aplicar neste Tema (Passo a Passo) */}
        {steps.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-950 select-none">
              <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>Como Aplicar neste Tema (Passo a Passo)</span>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-3.5 shadow-2xs hover:border-teal-300 transition"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-black text-white select-none">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-xs sm:text-sm leading-relaxed text-slate-800 font-medium">
                    <InlineRichText>{step}</InlineRichText>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testes Diagnósticos Decisivos Adicionais */}
        {view.decisiveTests && view.decisiveTests.length > 1 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-950 select-none">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />
              <span>Outros Testes Diagnósticos de Prova</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {view.decisiveTests.slice(1).map((test, idx) => {
                const colonMatch = test.match(/^([^:]+):\s*(.*)$/);
                const title = colonMatch ? colonMatch[1] : `Teste Diagnóstico #${idx + 2}`;
                const body = colonMatch ? colonMatch[2] : test;

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-teal-200 bg-teal-50/30 p-3.5 space-y-1"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-900 block select-none">
                      {title}
                    </span>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      <InlineRichText>{body}</InlineRichText>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Limites do Método SuVeCA */}
        {limits.length > 0 && (
          <StudyCallout
            tone="exception"
            title="Fronteira & Limite do Método SuVeCA"
          >
            <div className="space-y-1.5 text-xs leading-relaxed text-purple-950 font-medium">
              {limits.map((limit, idx) => (
                <p key={idx}>
                  <InlineRichText>{limit}</InlineRichText>
                </p>
              ))}
            </div>
          </StudyCallout>
        )}
      </div>
    </div>
  );
};
