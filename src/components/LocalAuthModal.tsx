import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Zap,
  LogIn,
  UserPlus,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  loginLocalAccount,
  createLocalAccount,
  loginAsTestUser,
  getActiveLocalUser,
  isTestUser,
  isPersonalLocalUser,
  type User,
} from '../lib/firebase';

interface LocalAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSignInGoogle?: () => void;
  onSuccess?: (user: User) => void;
}

export const LocalAuthModal: React.FC<LocalAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignInGoogle,
  onSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initialInputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setTimeout(() => initialInputRef.current?.focus(), 80);
    }
  }, [isOpen, tab]);

  // Handle ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await loginLocalAccount(loginUsername, loginPassword);
      if (!result.success || !result.user) {
        setError(result.error || 'Não foi possível entrar. Verifique seus dados.');
        return;
      }
      onSuccess?.(result.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regConfirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createLocalAccount(regUsername, regName, regPassword);
      if (!result.success || !result.user) {
        setError(result.error || 'Não foi possível criar a conta. Tente novamente.');
        return;
      }
      onSuccess?.(result.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao criar a conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTestAccount = () => {
    const testUser = loginAsTestUser();
    onSuccess?.(testUser);
    onClose();
  };

  const isCurrentlyTestUser = isTestUser(currentUser);
  const isCurrentlyPersonalUser = isPersonalLocalUser(currentUser);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
          aria-label="Fechar janela"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-8 w-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-2xs">
              SV
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Método SuVeCA
            </span>
          </div>
          <h2 id="local-auth-modal-title" className="text-xl font-extrabold text-slate-900">
            Acesso à Plataforma
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Acesse sua conta pessoal para salvar seus erros, histórico e estatísticas individuais,
            ou use a conta de teste padrão.
          </p>
        </div>

        {/* Current Status Badge */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isCurrentlyPersonalUser ? (
              <ShieldCheck className="w-4 h-4 text-teal-600" />
            ) : (
              <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
            )}
            <div>
              <span className="text-slate-500">Sessão ativa: </span>
              <strong className="text-slate-800">
                {currentUser?.displayName || (isCurrentlyTestUser ? 'Conta Teste (Padrão)' : 'Visitante')}
              </strong>
            </div>
          </div>
          {isCurrentlyPersonalUser && (
            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
              Própria
            </span>
          )}
          {isCurrentlyTestUser && (
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              Padrão
            </span>
          )}
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Conta</span>
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Tab 1: Login */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Usuário ou Login
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={initialInputRef}
                  id="login-username"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Ex: seu.usuario"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-10 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full button-primary py-2.5 text-xs font-bold rounded-xl justify-center shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Entrando...' : 'Entrar na Minha Conta'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Register */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Seu Nome de Exibição
              </label>
              <input
                ref={initialInputRef}
                id="reg-name"
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ex: Batião Duarte"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition"
              />
            </div>

            <div>
              <label
                htmlFor="reg-username"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Usuário / Login (letras e números)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Ex: batiao"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Confirmar Senha
                </label>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Ocultar senhas' : 'Ver senhas digitadas'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full button-primary py-2.5 text-xs font-bold rounded-xl justify-center shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isLoading ? 'Criando Conta...' : 'Criar Conta e Entrar'}</span>
            </button>
          </form>
        )}

        {/* Quick action: Default Test Account */}
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSelectTestAccount}
            className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/90 text-amber-950 flex items-center justify-between transition group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>Usar Conta Teste (Padrão)</span>
                  <span className="text-[9px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                    Sem senha
                  </span>
                </div>
                <div className="text-[10px] text-amber-800">
                  Acesso rápido para testes e exploração das matérias
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>
        </div>

        {/* Optional Google Login */}
        {onSignInGoogle && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignInGoogle();
              }}
              className="w-full button-secondary py-2 text-xs font-medium rounded-xl justify-center cursor-pointer text-slate-600 hover:text-slate-900"
            >
              <span>Ou conectar com conta Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
