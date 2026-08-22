import React, { useMemo, useState } from 'react';
import { Quote, RefreshCw } from 'lucide-react';
import {
  DAILY_MOTIVATIONS,
  type DailyMotivation,
  getDailyMotivation,
} from '../data/dailyMotivation';

export const DailyMotivationCard: React.FC = () => {
  const initialMotivation = useMemo(() => getDailyMotivation(), []);
  const [motivation, setMotivation] = useState<DailyMotivation>(initialMotivation);

  const showAnother = () => {
    if (DAILY_MOTIVATIONS.length < 2) return;
    const currentIndex = DAILY_MOTIVATIONS.findIndex(
      (item) => item.id === motivation.id
    );
    const offset = 1 + Math.floor(Math.random() * (DAILY_MOTIVATIONS.length - 1));
    setMotivation(DAILY_MOTIVATIONS[(currentIndex + offset) % DAILY_MOTIVATIONS.length]);
  };

  return (
    <section className="h-full flex flex-col justify-between rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50/80 via-white to-sky-50/60 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col justify-between h-full gap-4 flex-1">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-800 shadow-2xs">
            <Quote className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-800">
              Inspiração · {motivation.theme}
            </span>
            <blockquote className="text-base sm:text-lg font-bold leading-relaxed text-slate-900">
              “{motivation.quote}”
            </blockquote>
            <p className="text-xs font-semibold text-slate-600">— {motivation.author}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-violet-100 flex items-center justify-end">
          <button type="button" onClick={showAnother} className="button-ghost text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Outra frase
          </button>
        </div>
      </div>
    </section>
  );
};
