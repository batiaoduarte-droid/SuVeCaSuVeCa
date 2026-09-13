import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, ExternalLink, X, RefreshCw } from 'lucide-react';

export interface AuthErrorInfo {
  code: string;
  message: string;
  domain?: string;
  projectId?: string;
}

interface AuthDomainModalProps {
  error: AuthErrorInfo | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const AuthDomainModal: React.FC<AuthDomainModalProps> = ({
  error,
  onClose,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const isUnauthorizedDomain =
    error.code === 'auth/unauthorized-domain' ||
    error.message?.includes('unauthorized-domain');

  const domain =
    error.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
  const projectId = error.projectId || 'gen-lang-client-0165685347';
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const handleCopy = async () => {
    if (!domain) return;
    try {
      await navigator.clipboard.writeText(domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback para navegadores sem permissão de clipboard
      const input = document.createElement('input');
      input.value = domain;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isUnauthorizedDomain ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-slate-900">
                {isUnauthorizedDomain
                  ? 'Domínio Não Autorizado no Firebase'
                  : 'Erro na Autenticação'}
              </h2>
              <span className="text-xs font-mono text-slate-500">{error.code}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {isUnauthorizedDomain ? (
          <div className="space-y-4 text-xs leading-relaxed text-slate-700">
            <p>
              O Google bloqueou a autenticação porque este domínio ainda não foi autorizado no console do seu projeto Firebase (<strong>{projectId}</strong>).
            </p>

            {/* Caixa com o domínio para copiar */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Domínio a ser adicionado:
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs font-bold text-indigo-900 break-all select-all">
                  {domain}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shrink-0 cursor-pointer shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Passo a passo */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2 text-amber-950">
              <div className="font-bold text-amber-900">Como resolver em 3 passos:</div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                <li>
                  Acesse o <strong>Console do Firebase</strong> em{' '}
                  <span className="font-semibold">Authentication &gt; Settings &gt; Authorized domains</span>.
                </li>
                <li>
                  Clique em <strong>Add domain</strong> (Adicionar domínio) e cole o domínio copiado acima.
                </li>
                <li>
                  Salve e clique no botão <strong>Tentar Novamente</strong> abaixo.
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            <p className="font-medium">{error.message}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {isUnauthorizedDomain ? (
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline py-2"
            >
              <span>Abrir Console do Firebase</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="button-secondary px-3 py-2 text-xs"
            >
              Fechar
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="button-primary px-3 py-2 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tentar Novamente</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
