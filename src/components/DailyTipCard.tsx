import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, Lightbulb, RefreshCw, Sparkles, Bookmark, BookmarkCheck, ChevronLeft } from 'lucide-react';
import { DAILY_TIPS, DailyTip, getDailyTip } from '../data/dailyTips';

interface DailyTipCardProps {
  onOpenModule?: (moduleId: string) => void;
  userId?: string;
}

const STORAGE_KEY = 'suveca_favorite_tips';

export const DailyTipCard: React.FC<DailyTipCardProps> = ({ onOpenModule, userId }) => {
  const tip = useMemo(() => getDailyTip(), []);
  const [shownTip, setShownTip] = useState<DailyTip>(tip);
  const [activeView, setActiveView] = useState<'daily' | 'saved'>('daily');

  const [savedTipIds, setSavedTipIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isCurrentFavorite = savedTipIds.includes(shownTip.id);

  const toggleFavorite = (tipId: string) => {
    setSavedTipIds((prev) => {
      const next = prev.includes(tipId)
        ? prev.filter((id) => id !== tipId)
        : [...prev, tipId];
      try {
        localStorage.setItem(
          userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // quota exceeded
      }
      return next;
    });
  };

  const handleShowAnother = () => {
    if (DAILY_TIPS.length < 2) return;
    const currentIndex = DAILY_TIPS.findIndex((item) => item.id === shownTip.id);
    const offset = 1 + Math.floor(Math.random() * (DAILY_TIPS.length - 1));
    setShownTip(DAILY_TIPS[(currentIndex + offset) % DAILY_TIPS.length]);
  };

  const savedTipsList = useMemo(
    () => DAILY_TIPS.filter((item) => savedTipIds.includes(item.id)),
    [savedTipIds]
  );

  return (
    <section className="relative overflow-hidden h-full flex flex-col justify-between rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-teal-50 p-5 sm:p-6 shadow-xs">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/35 blur-2xl" aria-hidden="true" />
      
      {activeView === 'daily' ? (
        <div className="relative flex flex-col gap-3 flex-1 justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900">
                    <Sparkles className="h-3.5 w-3.5" />
                    Dica do dia
                  </div>
                  {savedTipIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveView('saved')}
                      className="text-[11px] font-bold text-teal-800 hover:text-teal-950 underline underline-offset-2 cursor-pointer"
                    >
                      Dicas salvas ({savedTipIds.length})
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-800">{shownTip.category}</p>
                  <h2 className="mt-1 text-base sm:text-lg font-extrabold leading-snug text-slate-900">
                    {shownTip.rule}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleFavorite(shownTip.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition cursor-pointer ${
                    isCurrentFavorite
                      ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-400 hover:text-amber-700 hover:border-amber-300'
                  }`}
                  title={isCurrentFavorite ? 'Remover dos favoritos' : 'Salvar dica para consulta posterior'}
                  aria-label={isCurrentFavorite ? 'Remover dica dos favoritos' : 'Salvar dica como favorita'}
                >
                  {isCurrentFavorite ? (
                    <BookmarkCheck className="h-5 w-5" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 shadow-xs">
                  <Lightbulb className="h-5 w-5" />
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-700">{shownTip.explanation}</p>
            <blockquote className="rounded-xl border border-teal-100 bg-white/85 px-3.5 py-2.5 text-xs sm:text-sm font-medium italic text-teal-950">
              “{shownTip.example}”
            </blockquote>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-100/60">
            {shownTip.moduleId && onOpenModule && (
              <button
                type="button"
                onClick={() => onOpenModule(shownTip.moduleId!)}
                className="button-primary text-xs"
              >
                Ver na apostila <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleShowAnother}
              className="button-ghost text-xs cursor-pointer"
              title="Mostrar outra regra do banco curado"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Outra dica
            </button>
          </div>
        </div>
      ) : (
        /* Saved Tips View */
        <div className="relative flex flex-col gap-3 flex-1 justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <button
                type="button"
                onClick={() => setActiveView('daily')}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-950 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar à dica de hoje
              </button>
              <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                Dicas Favoritas ({savedTipsList.length})
              </span>
            </div>

            {savedTipsList.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                <Bookmark className="h-6 w-6 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-700">Nenhuma dica salva ainda.</p>
                <p>Clique no ícone de marcador na dica do dia para guardá-la aqui.</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                {savedTipsList.map((tipItem) => (
                  <div
                    key={tipItem.id}
                    className="p-3 bg-white/90 rounded-xl border border-amber-200/90 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                          {tipItem.category}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-900 mt-1">{tipItem.rule}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(tipItem.id)}
                        className="text-amber-700 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remover dos favoritos"
                        aria-label="Remover dos favoritos"
                      >
                        <BookmarkCheck className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{tipItem.explanation}</p>
                    <p className="text-[11px] italic text-teal-950 font-medium">“{tipItem.example}”</p>
                    {tipItem.moduleId && onOpenModule && (
                      <button
                        type="button"
                        onClick={() => onOpenModule(tipItem.moduleId!)}
                        className="text-[10px] font-bold text-teal-800 hover:underline inline-flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        Abrir módulo correspondente <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
