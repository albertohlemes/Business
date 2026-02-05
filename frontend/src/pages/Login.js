import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Building2, Lock, Mail, User } from 'lucide-react';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
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
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1763850407744-d2e14b99b1b9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBtaW5pbWFsaXN0JTIwb2ZmaWNlJTIwYXJjaGl0ZWN0dXJlJTIwY29uY3JldGUlMjBnbGFzc3xlbnwwfHx8fDE3NzAzMDcxNzB8MA&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Building2 className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-white">Portal DP</h1>
          </div>
          <p className="text-xl text-slate-300 max-w-md leading-relaxed">
            Automatize processos do departamento pessoal e aumente a qualidade das suas entregas.
          </p>
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Extração automática de dados por IA</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Validação inteligente de folha</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Gestão simplificada de dissídios</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <Card className="w-full max-w-md border-slate-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Building2 className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-slate-900">Portal DP</span>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Bem-vindo</CardTitle>
            <CardDescription className="text-slate-500">
              Acesse sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Entrar</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-700">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="login-email"
                        data-testid="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-senha" className="text-slate-700">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="login-senha"
                        data-testid="login-senha"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginData.senha}
                        onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    data-testid="login-submit-btn"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-nome" className="text-slate-700">Nome</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="register-nome"
                        data-testid="register-nome"
                        type="text"
                        placeholder="Seu nome"
                        className="pl-10"
                        value={registerData.nome}
                        onChange={(e) => setRegisterData({ ...registerData, nome: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-slate-700">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="register-email"
                        data-testid="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-senha" className="text-slate-700">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="register-senha"
                        data-testid="register-senha"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerData.senha}
                        onChange={(e) => setRegisterData({ ...registerData, senha: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirmar" className="text-slate-700">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="register-confirmar"
                        data-testid="register-confirmar"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerData.confirmarSenha}
                        onChange={(e) => setRegisterData({ ...registerData, confirmarSenha: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    data-testid="register-submit-btn"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
