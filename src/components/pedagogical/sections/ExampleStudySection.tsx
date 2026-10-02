import React, { useState } from 'react';
import type { ExampleStudyItem, ExampleStudyProjection, SemanticBlock, WorkedExampleView } from '../../../types/pedagogicalView';
import type { CadernoErroItem } from '../../../types/suveca';
import { ConfidenceChoice } from '../../ui/ConfidenceChoice';
import { QuestionOptions } from '../../ui/QuestionOptions';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';
import { WorkedExampleCard } from '../../study-visuals/WorkedExampleCard';
import { InlineRichText } from '../blocks/InlineRichText';
import {
  confirmStudyAttempt,
  emptyStudyDraft,
  exportStudy,
  readStudyItem,
  restartStudyAttempt,
  saveStudyItem,
  type StudyItemState,
} from '../../../lib/exampleStudyStore';
import {
  AlertCircle,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Check,
  CircleHelp,
  Eye,
  EyeOff,
  Sparkles,
  BookmarkPlus,
  RotateCcw,
} from 'lucide-react';

export type SaveExampleNote = (note: Partial<CadernoErroItem> & { conteudo: string; erroCometido: string; regraDecisiva: string }) => boolean;

const buttonBase = 'flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50';

function Content({ item, originals }: { item: ExampleStudyItem; originals: WorkedExampleView[] }) {
  return (
    <div className="space-y-4">
      {item.contentRefs.map((ref, index) => {
        const original = originals.find(e => e.exampleId === ref.exampleId);
        if (!original) return <p key={index} className="text-sm text-slate-600">Conteúdo indisponível. Recarregue a página.</p>;
        const child = ref.itemId ? original.practiceItems?.find(c => c.id === ref.itemId) : undefined;
        if (child) {
          return (
            <div key={index} className="space-y-3">
              {child.solutionBlocks.map((b, i) => (
                <ContentBlockRenderer key={i} block={b} />
              ))}
            </div>
          );
        }
        if (ref.blockIndexes) {
          return (
            <div key={index} className="space-y-2">
              {ref.blockIndexes.map(i => (
                <ContentBlockRenderer key={i} block={original.blocks![i]} />
              ))}
            </div>
          );
        }
        if (ref.listItem !== undefined) {
          const block = original.blocks?.[0];
          const value = block && 'items' in block && Array.isArray(block.items) ? block.items[ref.listItem] : '';
          return (
            <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              <InlineRichText>{typeof value === 'string' ? value : ''}</InlineRichText>
            </p>
          );
        }
        return (
          <WorkedExampleCard
            key={index}
            hideHeader
            example={{ ...original, title: item.title, practiceItems: undefined }}
            renderBlock={b => <ContentBlockRenderer block={b} allowLegacyDiagramInference={false} />}
          />
        );
      })}
    </div>
  );
}

function StudyCard({
  item,
  originals,
  revision,
  unitId,
  userId,
  onAskTutor,
  onSaveStudyNote,
}: {
  item: ExampleStudyItem;
  originals: WorkedExampleView[];
  revision: string;
  unitId: string;
  userId?: string;
  onAskTutor?: (text: string) => void;
  onSaveStudyNote?: SaveExampleNote;
}) {
  const [message, setMessage] = useState('');
  const [state, setState] = useState<StudyItemState>(() => {
    try {
      return readStudyItem(userId, unitId, item, revision);
    } catch {
      return {
        unitId,
        revision,
        draft: emptyStudyDraft(),
        attempts: [],
        visible: false,
        exposed: false,
        exposureThisAttempt: false,
        exposureUnknown: true,
        confirmed: false,
      };
    }
  });
  const [preview, setPreview] = useState(false);
  const [note, setNote] = useState('');

  const interactive = item.kind === 'question' || item.kind === 'open_exercise';
  const hasOptions = Boolean(item.options && item.options.length > 0);
  const hasSelectedAnswer = Boolean(state.draft.answer && state.draft.answer.trim().length > 0);
  const canSubmit = hasSelectedAnswer && (!item.grading.available || Boolean(state.draft.confidence));

  const commit = (next: StudyItemState, draftOnly = false) => {
    try {
      saveStudyItem(userId, item.id, next);
      setState(next);
      setMessage(draftOnly ? '' : 'Estudo salvo neste dispositivo.');
      return true;
    } catch {
      if (draftOnly) setState(next);
      setMessage('Não foi possível salvar neste dispositivo. Seu texto foi preservado nesta tela. Libere espaço e tente novamente.');
      return false;
    }
  };

  const changeDraft = (changes: Partial<StudyItemState['draft']>) => commit({ ...state, draft: { ...state.draft, ...changes } }, true);

  const toggle = () =>
    commit({
      ...state,
      visible: !state.visible,
      exposed: state.exposed || !state.visible,
      exposureThisAttempt: state.exposureThisAttempt || (!state.visible && !state.confirmed),
    });

  const latest = state.attempts.at(-1);

  const context = () =>
    JSON.stringify({
      unitId,
      studyItemId: item.id,
      title: item.title,
      sources: item.sourceRefs,
      support: item.support,
      prompt: item.prompt,
      options: item.options,
      answer: state.draft.answer,
      reasoning: state.draft.reasoning,
      confidence: state.draft.confidence,
      stage: state.confirmed ? 'tentativa_confirmada' : state.visible ? 'consulta_resolucao' : 'respondendo',
      ...(state.visible ? { resolutionSources: item.contentRefs.map(ref => originals.find(e => e.exampleId === ref.exampleId)) } : {}),
    });

  const board = item.metadata?.board;
  const year = item.metadata?.year;

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-sm">
      {/* Header idêntico ao modelo de Questões Oficiais de Prova */}
      <header className="border-b border-slate-200 bg-slate-50/90 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 font-black">
              {interactive ? <CircleHelp className="h-4 w-4" /> : <BookOpenCheck className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <h4 className="m-0 text-sm sm:text-base font-bold text-slate-950 truncate" title={item.title}>{item.title}</h4>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                {board && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">
                    <Building2 className="h-3 w-3 text-slate-500" />
                    {board}
                  </span>
                )}
                {year && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">
                    <CalendarDays className="h-3 w-3 text-slate-500" />
                    {year}
                  </span>
                )}
                <span className="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-teal-900 shadow-2xs">
                  {interactive
                    ? item.grading.available
                      ? 'Questão de estudo'
                      : 'Exercício de fixação'
                    : item.kind === 'commented_incomplete'
                      ? 'Exemplo comentado'
                      : 'Exemplo demonstrativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Botão de consulta na barra superior (estilo QuestionBlock) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggle}
              className={`flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer ${
                state.visible
                  ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  : 'border border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100'
              }`}
            >
              {state.visible ? <EyeOff className="h-3.5 w-3.5 text-amber-700" /> : <Eye className="h-3.5 w-3.5 text-teal-700" />}
              <span>{state.visible ? 'Ocultar resolução' : 'Consultar resolução'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo / Enunciado e Alternativas */}
      <div className="space-y-4 px-4 py-5 sm:px-5">
        {/* Texto de apoio */}
        {!!item.support?.length && (
          <section aria-label="Texto de apoio" className="space-y-2 whitespace-pre-wrap break-words text-sm text-slate-700 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
            {item.support.map((s, i) => (
              <p key={i}>
                <InlineRichText>{s}</InlineRichText>
              </p>
            ))}
          </section>
        )}

        {/* Comando / Enunciado no mesmo design de Questões Oficiais */}
        <section aria-label="Enunciado" className="rounded-xl border border-teal-200/90 bg-teal-50/40 p-4 sm:p-5">
          <h5 className="mb-2 text-[11px] font-black uppercase tracking-wider text-teal-900">
            Comando / Enunciado
          </h5>
          <div className="space-y-2 text-sm font-medium leading-relaxed text-slate-800">
            {item.prompt?.map((s, i) => (
              <p key={i} className="whitespace-pre-wrap break-words">
                <InlineRichText>{s}</InlineRichText>
              </p>
            ))}
          </div>
        </section>

        {/* Alternativas */}
        {hasOptions && (
          <section aria-label="Alternativas">
            <QuestionOptions
              options={item.options!}
              selected={state.draft.answer || null}
              onSelect={answer => changeDraft({ answer })}
              disabled={state.confirmed}
              answer={state.confirmed && state.visible ? item.grading.answerId : undefined}
            />
          </section>
        )}

        {/* Campo de resposta aberta para exercícios discursivos sem alternativas */}
        {interactive && !hasOptions && !state.confirmed && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800">
              Sua resposta antes da consulta
              <textarea
                rows={3}
                maxLength={12000}
                value={state.draft.answer}
                onChange={e => changeDraft({ answer: e.target.value })}
                placeholder="Escreva sua resposta para comparar com o gabarito do professor..."
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal text-sm shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE: Confiança e Raciocínio aparecem APÓS selecionar a alternativa */}
        {interactive && !state.confirmed && hasSelectedAnswer && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 animate-in fade-in duration-200">
            <ConfidenceChoice value={state.draft.confidence} onChange={confidence => changeDraft({ confidence })} />

            <label className="block text-sm font-semibold text-slate-800">
              Seu raciocínio (opcional)
              <textarea
                rows={2}
                maxLength={12000}
                value={state.draft.reasoning}
                onChange={e => changeDraft({ reasoning: e.target.value })}
                placeholder="Qual regra ou critério você utilizou para justificar sua escolha?"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal text-sm shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </label>

            {state.exposed && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Você já consultou a resolução deste exemplo. Esta tentativa fica marcada como assistida por consulta prévia.
              </p>
            )}

            <div className="pt-2">
              <button
                type="button"
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-xs transition ${
                  canSubmit
                    ? 'bg-teal-800 hover:bg-teal-900 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                }`}
                disabled={!canSubmit}
                onClick={() => canSubmit && commit(confirmStudyAttempt(state, item))}
              >
                <Check className="h-4 w-4" />
                <span>Registrar tentativa</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback pós-tentativa confirmada */}
        {state.confirmed && (
          <div className="space-y-3 pt-1" aria-live="polite">
            {item.grading.available ? (
              latest?.result === 'correct' ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-sm text-emerald-950 font-bold shadow-2xs">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <span className="block font-black text-emerald-900">Resposta correta!</span>
                    <span className="text-xs font-medium text-emerald-800">
                      Você acertou a questão. Confira os comentários detalhados e a explicação gramatical do professor abaixo.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50/90 p-3.5 text-sm text-rose-950 font-bold shadow-2xs">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
                  <div>
                    <span className="block font-black text-rose-900">Resposta incorreta.</span>
                    <span className="text-xs font-medium text-rose-800">
                      Revise o critério decisivo na resolução comentada do professor abaixo para consolidar a regra.
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-sm text-blue-950 font-semibold shadow-2xs">
                <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <span>Resposta registrada para comparação com a resolução do professor, sem atribuição de nota.</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                className={buttonBase}
                onClick={() => commit(restartStudyAttempt(state))}
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>Nova tentativa</span>
              </button>
            </div>
          </div>
        )}

        {/* Resolução comentada do professor */}
        {state.visible && (
          <section aria-label="Resolução" className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                Resolução Comentada do Professor
              </h5>
            </div>
            <Content item={item} originals={originals} />
          </section>
        )}

        {/* Seção não interativa (leitura e consulta direta) */}
        {!interactive && (
          <div className="pt-2">
            <Content item={item} originals={originals} />
          </div>
        )}

        {/* FOOTER ORGANIZADO E ESPAÇADO: Ações auxiliares sem amontoamento */}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {onAskTutor && (
              <button
                type="button"
                className={buttonBase}
                onClick={() => onAskTutor(`Ajude-me com este exemplo. Considere o estágio de estudo e não trate consulta como tentativa autônoma.\n${context()}`)}
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Perguntar ao Professor</span>
              </button>
            )}

            {onSaveStudyNote && (state.visible || !interactive || state.confirmed) && (
              <button
                type="button"
                className={buttonBase}
                onClick={() => {
                  setPreview(true);
                  setNote(state.draft.reasoning);
                }}
              >
                <BookmarkPlus className="h-3.5 w-3.5 text-slate-500" />
                <span>Adicionar ao Caderno</span>
              </button>
            )}

            {!interactive && (
              <button
                type="button"
                className={buttonBase}
                onClick={() => commit({ ...state, exposed: true })}
              >
                <Check className="h-3.5 w-3.5 text-slate-500" />
                <span>Registrar consulta</span>
              </button>
            )}
          </div>

          {message && <p role="status" className="text-xs font-medium text-slate-600">{message}</p>}
        </footer>

        {/* Prévia do Caderno de Erros */}
        {preview && (
          <section aria-label="Prévia do Caderno" className="space-y-3 rounded-xl border border-teal-300 bg-teal-50/30 p-4 sm:p-5 mt-4">
            <h5 className="text-sm font-bold text-teal-950">{item.title}</h5>
            <label className="block text-sm font-semibold text-slate-800">
              O que deseja lembrar sobre este exemplo?
              <textarea
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal text-slate-800 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex: O prefixo co- aglutina sem hífen mesmo diante de vogal idêntica (coobrigação)..."
              />
            </label>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="flex min-h-10 items-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-900 disabled:opacity-50 cursor-pointer"
                disabled={!note.trim()}
                onClick={() => {
                  const saved = onSaveStudyNote?.({
                    origin: 'worked_example',
                    questionId: `${item.id}:${latest?.id || 'consulta'}`,
                    moduleRef: unitId,
                    conteudo: item.title,
                    erroCometido: state.draft.answer || 'Consulta ao exemplo',
                    regraDecisiva: note,
                    questionText: [...(item.support || []), ...(item.prompt || [])].join('\n\n'),
                    selectedAnswer: state.draft.answer,
                    sourceRefs: item.sourceRefs.map(s => s.exampleId),
                  });
                  setMessage(saved ? 'Ficha salva no Caderno neste dispositivo.' : 'Não foi possível salvar a ficha. Seu texto continua disponível.');
                  if (saved) setPreview(false);
                }}
              >
                <Check className="h-3.5 w-3.5" />
                <span>Confirmar inclusão no Caderno</span>
              </button>
              <button
                type="button"
                className={buttonBase}
                onClick={() => setPreview(false)}
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        {/* Histórico recolhido e expansível */}
        {state.attempts.length > 0 && (
          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700">
            <summary className="min-h-10 cursor-pointer font-semibold text-slate-800 py-1">
              Histórico · {state.attempts.length} tentativa(s)
            </summary>
            <ol className="mt-3 space-y-2.5">
              {state.attempts.map(a => (
                <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>{new Date(a.createdAt).toLocaleString('pt-BR')}</span>
                    <span className={a.result === 'correct' ? 'text-emerald-700' : a.result === 'incorrect' ? 'text-rose-700' : 'text-slate-600'}>
                      {a.result === 'correct' ? 'Correta' : a.result === 'incorrect' ? 'Incorreta' : 'Sem nota'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                    <strong>Sua resposta:</strong> {a.answer || 'Não registrada no histórico antigo'}
                  </p>
                  {a.reasoning && (
                    <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap break-words">
                      <strong>Raciocínio:</strong> {a.reasoning}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    Confiança: {({ guess: 'Chute', low: 'Pouco seguro', medium: 'Seguro', high: 'Muito seguro' })[a.confidence!] || 'Desconhecida'} ·{' '}
                    {a.assistance === 'full' ? 'Com consulta nesta tentativa' : a.assistance === 'none' ? 'Sem consulta' : 'Assistência desconhecida'}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </article>
  );
}

export function ExampleStudySection({
  study,
  items,
  unitId,
  userId,
  supplementaryBlocks = [],
  onAskTutor,
  onSaveStudyNote,
}: {
  study: ExampleStudyProjection;
  items: WorkedExampleView[];
  unitId: string;
  userId?: string;
  supplementaryBlocks?: SemanticBlock[];
  onAskTutor?: (text: string) => void;
  onSaveStudyNote?: SaveExampleNote;
}) {
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:px-4">
        <p className="text-xs sm:text-sm font-semibold text-slate-700">
          {study.items.length} itens de estudo nesta unidade
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Filtrar:
            <select
              className="ml-1.5 min-h-9 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-600 focus:outline-none"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">Todos os itens</option>
              <option value="practice">Exercícios e Questões</option>
              <option value="reading">Exemplos e Demonstrações</option>
              <option value="history">Com histórico de tentativa</option>
            </select>
          </label>
          <button
            type="button"
            className={buttonBase}
            onClick={() => {
              try {
                const url = URL.createObjectURL(new Blob([exportStudy(userId, unitId)], { type: 'application/json' }));
                const link = document.createElement('a');
                link.href = url;
                link.download = `estudo-${unitId}.json`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch {
                setMessage('Não foi possível exportar o histórico.');
              }
            }}
          >
            Exportar estudo
          </button>
        </div>
      </div>

      {message && <p role="status" className="text-xs font-medium text-slate-600">{message}</p>}

      <div className="space-y-5">
        {study.items
          .filter(item => {
            const practice = ['question', 'open_exercise'].includes(item.kind);
            if (filter === 'history') {
              try {
                return readStudyItem(userId, unitId, item, study.revision).attempts.length > 0;
              } catch {
                return false;
              }
            }
            return filter === 'all' || (filter === 'practice' ? practice : !practice);
          })
          .map(item => (
            <StudyCard
              key={`${userId || 'guest'}:${unitId}:${study.revision}:${item.id}`}
              {...{ item, originals: items, revision: study.revision, unitId, userId, onAskTutor, onSaveStudyNote }}
            />
          ))}
      </div>

      {supplementaryBlocks.map((block, i) => (
        <ContentBlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}
