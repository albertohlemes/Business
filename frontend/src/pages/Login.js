import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, User, ChevronRight } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_4f7d5596-5b20-477c-ba75-d49f33573db4/artifacts/junuf5pl_logo%20business%20Grande%20Horizontal%20Branco.png";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: '', senha: '' });
  const [registerData, setRegisterData] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginData.email, loginData.senha);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerData.senha !== registerData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    setIsLoading(true);
    try {
      await register(registerData.nome, registerData.email, registerData.senha);
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#020617]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        
        {/* Red glow effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-16">
          {/* Logo */}
          <div className="mb-12">
            <img 
              src={LOGO_URL} 
              alt="Business Contabilidade" 
              className="h-12 w-auto"
            />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Portal do<br />
            <span className="text-red-500">Departamento Pessoal</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-md leading-relaxed mb-12">
            Automatize processos, elimine erros e ganhe tempo com inteligência artificial.
          </p>
          
          <div className="space-y-4">
            {[
              'Validação inteligente de folha de pagamento',
              'Cálculo automático de dissídio coletivo',
              'Gestão completa de colaboradores',
              'Relatórios e análises em tempo real'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <ChevronRight size={14} className="text-red-500" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom decoration */}
        <div className="absolute bottom-8 left-16 text-slate-600 text-sm">
          © 2026 Business Contabilidade. Todos os direitos reservados.
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img 
              src={LOGO_URL} 
              alt="Business Contabilidade" 
              className="h-10 w-auto"
            />
          </div>
          
          {/* Form card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {activeTab === 'login' ? 'Bem-vindo de volta' : 'Criar nova conta'}
              </h2>
              <p className="text-slate-500">
                {activeTab === 'login' ? 'Entre com suas credenciais' : 'Preencha os dados abaixo'}
              </p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'login'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="login-tab"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'register'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="register-tab"
              >
                Criar Conta
              </button>
            </div>

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-300 text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      id="login-email"
                      data-testid="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 pl-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-senha" className="text-slate-300 text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      id="login-senha"
                      data-testid="login-senha"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 pl-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
                      value={loginData.senha}
                      onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  data-testid="login-submit-btn"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(198,40,40,0.3)] hover:shadow-[0_0_30px_rgba(198,40,40,0.5)] transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-nome" className="text-slate-300 text-sm font-medium">
                    Nome completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      id="register-nome"
                      data-testid="register-nome"
                      type="text"
                      placeholder="Seu nome"
                      className="h-12 pl-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
                      value={registerData.nome}
                      onChange={(e) => setRegisterData({ ...registerData, nome: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-300 text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      id="register-email"
                      data-testid="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 pl-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-senha" className="text-slate-300 text-sm font-medium">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <Input
                        id="register-senha"
                        data-testid="register-senha"
                        type="password"
                        placeholder="••••••"
                        className="h-12 pl-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
                        value={registerData.senha}
                        onChange={(e) => setRegisterData({ ...registerData, senha: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-confirmar" className="text-slate-300 text-sm font-medium">
                      Confirmar
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <Input
                        id="register-confirmar"
                        data-testid="register-confirmar"
                        type="password"
                        placeholder="••••••"
                        className="h-12 pl-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
                        value={registerData.confirmarSenha}
                        onChange={(e) => setRegisterData({ ...registerData, confirmarSenha: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  data-testid="register-submit-btn"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(198,40,40,0.3)] hover:shadow-[0_0_30px_rgba(198,40,40,0.5)] transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </form>
            )}
          </div>
          
          {/* Footer */}
          <p className="text-center text-slate-600 text-sm mt-6 lg:hidden">
            © 2026 Business Contabilidade
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
