import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, User, BookOpen } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';

interface ProfessorSuvecaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export const ProfessorSuvecaModal: React.FC<ProfessorSuvecaModalProps> = ({
  isOpen,
  onClose,
  initialContext = '',
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: `Olá! Sou o Professor SuVeCA, seu tutor de Português para Concursos. ${
        initialContext ? `Vejo que você está no tópico: "${initialContext}".` : ''
      } Qual dúvida gramatical você quer tirar agora?`,
    },
  ]);
  const [inputQuery, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalFocus(isOpen, onClose, inputRef);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;

    const userText = inputQuery.trim();
    setInputText('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userText,
          context: initialContext || 'Geral de Português para Concursos',
        }),
      });

      const data = await response.json();
      if (data.answer) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: 'Desculpe, tive um problema ao consultar a resposta. Tente novamente em instantes.',
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Ocorreu um erro de conexão com o servidor do Professor SuVeCA.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl max-w-2xl w-full h-[100dvh] sm:h-[620px] flex flex-col overflow-hidden animate-in fade-in duration-150 pt-[env(safe-area-inset-top,0px)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="professor-modal-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 border border-teal-200 flex items-center justify-center shadow-2xs font-bold">
              <Bot className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 id="professor-modal-title" className="font-extrabold text-sm text-slate-900">Professor SuVeCA IA</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tutor de Português para Concursos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-200/60 transition"
            aria-label="Fechar chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List - Independent Scrolling */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/50" aria-live="polite" aria-relevant="additions">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${
                msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 font-bold ${
                  msg.sender === 'user'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white text-teal-800 border border-slate-200 shadow-2xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm max-w-[85%] sm:max-w-[80%] leading-relaxed whitespace-pre-line shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-teal-700 text-white font-medium'
                    : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-xs text-teal-800 font-semibold bg-teal-50 border border-teal-200 p-3 rounded-xl w-fit">
              <Sparkles className="w-4 h-4 animate-spin text-teal-700" />
              <span>O Professor SuVeCA está formulando a explicação...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer - Safe area bottom padding */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center space-x-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua dúvida de Português..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white font-medium"
            style={{ fontSize: '16px' }}
            aria-label="Digite sua dúvida de Português"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="button-primary min-w-[48px] min-h-[48px] rounded-xl px-3 flex items-center justify-center shrink-0"
            aria-label="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
