import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import Button from './ui/Button';
import Input from './ui/Input';
import { AtSign, Lock, User, Users, MailCheck, Eye, EyeOff } from 'lucide-react';
import BrandSignature from './ui/BrandSignature';
import Logo from './ui/Logo';

type AuthMode = 'login' | 'register' | 'forgotPassword';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const { login, register, resetPassword, loadingAuth } = useApp();
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [isJoiningFamily, setIsJoiningFamily] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const storedCredentials = localStorage.getItem('moneytrail-credentials');
    if (storedCredentials) {
      try {
        const { email: storedEmail, password: storedPassword } = JSON.parse(storedCredentials);
        if (storedEmail && storedPassword) {
          setEmail(storedEmail);
          setPassword(storedPassword);
          setRememberMe(true);
        }
      } catch (e) {
        console.error("Failed to parse stored credentials", e);
        localStorage.removeItem('moneytrail-credentials');
      }
    }
  }, []);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setResetEmailSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetEmailSent(false);
    
    try {
      if (mode === 'login') {
        await login(email, password);
        if (rememberMe) {
          localStorage.setItem('moneytrail-credentials', JSON.stringify({ email, password }));
        } else {
          localStorage.removeItem('moneytrail-credentials');
        }
      } else if (mode === 'register') {
        await register(name, email, password, isJoiningFamily ? familyId : undefined);
        localStorage.removeItem('moneytrail-credentials');
      } else if (mode === 'forgotPassword') {
        await resetPassword(email);
        setResetEmailSent(true);
      }
    } catch (err: any) {
        // Improved error handling
        switch (err.code) {
            case 'auth/invalid-email':
                setError('O formato do e-mail é inválido.');
                break;
            case 'auth/user-not-found':
                setError('Não há nenhuma conta registrada com este e-mail.');
                break;
            default:
                setError(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
                break;
        }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Logo />
        </div>
        <p className="text-center text-gray-400 mb-8">Sua vida financeira, simplificada.</p>

        <div className="bg-gray-800 rounded-lg p-8 shadow-2xl">
          {mode !== 'forgotPassword' ? (
            <div className="flex border-b border-gray-700 mb-6">
              <button
                onClick={() => handleModeSwitch('login')}
                className={`flex-1 py-2 text-center font-semibold transition-colors ${mode === 'login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}
              >
                Login
              </button>
              <button
                onClick={() => handleModeSwitch('register')}
                className={`flex-1 py-2 text-center font-semibold transition-colors ${mode === 'register' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}
              >
                Registrar
              </button>
            </div>
          ) : (
             <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">Redefinir Senha</h2>
            </div>
          )}

          {resetEmailSent ? (
            <div className="text-center py-4">
                <MailCheck className="mx-auto h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-lg font-semibold text-white">Link Enviado!</h3>
                <p className="text-gray-300 text-sm mt-2">
                    Verifique sua caixa de entrada (e a pasta de spam) para o link de redefinição de senha.
                </p>
                <Button onClick={() => handleModeSwitch('login')} className="mt-6 w-full" variant="secondary">
                    Voltar para o Login
                </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu Nome"
                    value={name}
                    onChange={(e) => setName((e.target as HTMLInputElement).value)}
                    required
                    className="pl-10"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                </div>
              )}

              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                  required
                  className="pl-10"
                />
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              </div>

              {mode !== 'forgotPassword' && (
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                    required
                    minLength={6}
                    className="pl-10 pr-10"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              )}
              
              {mode === 'login' && (
                  <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 text-gray-300 cursor-pointer text-sm">
                          <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                          />
                          <span>Lembrar</span>
                      </label>
                      <button 
                        type="button" 
                        onClick={() => handleModeSwitch('forgotPassword')}
                        className="text-sm text-cyan-400 hover:underline focus:outline-none"
                      >
                        Esqueci a senha
                      </button>
                  </div>
              )}

              {mode === 'register' && (
                <div className="space-y-4">
                  <label className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={isJoiningFamily}
                      onChange={(e) => setIsJoiningFamily(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span>Entrar em uma família existente</span>
                  </label>
                  {isJoiningFamily && (
                    <div className="relative">
                      <Input
                        id="familyId"
                        type="text"
                        placeholder="Código da Família"
                        value={familyId}
                        onChange={(e) => setFamilyId((e.target as HTMLInputElement).value)}
                        required
                        className="pl-10"
                      />
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <Button type="submit" className="w-full" isLoading={loadingAuth}>
                {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar Conta' : 'Enviar Link'}
              </Button>
               {mode === 'forgotPassword' && (
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={() => handleModeSwitch('login')}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Lembrou a senha? Voltar ao Login
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
        <BrandSignature />
      </div>
    </div>
  );
};

export default Auth;