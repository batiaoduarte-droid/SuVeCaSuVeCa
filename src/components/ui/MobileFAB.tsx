import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Workflow,
  Bot,
  AlertTriangle,
  X,
  ChevronUp,
} from 'lucide-react';

interface MobileFABProps {
  onOpenAnalisador: () => void;
  onOpenTutor: () => void;
  onOpenCadernoErros: () => void;
  errorCount?: number;
}

export const MobileFAB: React.FC<MobileFABProps> = ({
  onOpenAnalisador,
  onOpenTutor,
  onOpenCadernoErros,
  errorCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 right-4 z-40 lg:hidden flex flex-col items-end pointer-events-auto"
      aria-label="Ações Rápidas de Estudo"
    >
      {/* Expanded Quick Action Items */}
      {isOpen && (
        <div className="mb-3 flex flex-col items-end space-y-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Item 1: Analisador Sintático */}
          <button
            type="button"
            onClick={() => {
              onOpenAnalisador();
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-full bg-white pl-3.5 pr-2 py-1.5 shadow-lg border border-teal-200/90 text-slate-800 hover:bg-teal-50 active:scale-95 transition cursor-pointer"
            aria-label="Abrir Analisador Sintático"
          >
            <span className="text-xs font-black tracking-tight text-teal-950">
              Analisador Sintático
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-800 text-white shadow-2xs">
              <Workflow className="h-4 w-4" />
            </span>
          </button>

          {/* Item 2: Tutor IA */}
          <button
            type="button"
            onClick={() => {
              onOpenTutor();
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-full bg-white pl-3.5 pr-2 py-1.5 shadow-lg border border-teal-200/90 text-slate-800 hover:bg-teal-50 active:scale-95 transition cursor-pointer"
            aria-label="Abrir Tutor IA"
          >
            <span className="text-xs font-black tracking-tight text-teal-950">
              Professor SuVeCA IA
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-2xs">
              <Bot className="h-4 w-4" />
            </span>
          </button>

          {/* Item 3: Caderno de Erros */}
          <button
            type="button"
            onClick={() => {
              onOpenCadernoErros();
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-full bg-white pl-3.5 pr-2 py-1.5 shadow-lg border border-amber-200 text-slate-800 hover:bg-amber-50 active:scale-95 transition cursor-pointer"
            aria-label="Abrir Caderno de Erros"
          >
            <span className="text-xs font-black tracking-tight text-slate-900">
              Caderno de Erros
            </span>
            <div className="relative">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-white shadow-2xs">
                <AlertTriangle className="h-4 w-4" />
              </span>
              {errorCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white shadow-2xs">
                  {errorCount > 99 ? '99+' : errorCount}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Fechar menu de ações rápidas' : 'Abrir menu de ações rápidas'}
        className={`flex h-13 w-13 items-center justify-center rounded-full shadow-xl transition-all duration-300 active:scale-90 cursor-pointer ${
          isOpen
            ? 'bg-slate-900 text-white ring-4 ring-slate-900/20 rotate-90'
            : 'bg-gradient-to-br from-teal-800 to-teal-950 text-amber-300 ring-4 ring-teal-700/25 hover:shadow-2xl'
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Sparkles className="h-6 w-6 text-amber-300 animate-pulse" />
        )}
      </button>
    </div>
  );
};
