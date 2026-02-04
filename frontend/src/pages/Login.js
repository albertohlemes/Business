import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, Building2 } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
                toast.success('Login realizado com sucesso!');
            } else {
                await register(email, password, name);
                toast.success('Conta criada com sucesso!');
            }
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Erro ao processar solicitação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-10 h-10 text-red-600" strokeWidth={1.5} />
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            BUSINESS
                        </h1>
                    </div>
                    <p className="text-zinc-500 text-sm uppercase tracking-widest">
                        Portal Societário
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-2xl font-semibold text-white mb-8" data-testid="auth-title">
                        {isLogin ? 'Entrar na sua conta' : 'Criar nova conta'}
                    </h2>

                    {!isLogin && (
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-zinc-400 text-xs uppercase tracking-wider">
                                Nome completo
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" strokeWidth={1.5} />
                                <Input
                                    id="name"
                                    data-testid="register-name-input"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Seu nome"
                                    className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 h-12"
                                    required={!isLogin}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-wider">
                            E-mail
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" strokeWidth={1.5} />
                            <Input
                                id="email"
                                data-testid="login-email-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 h-12"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-wider">
                            Senha
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" strokeWidth={1.5} />
                            <Input
                                id="password"
                                data-testid="login-password-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 h-12"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        data-testid="login-submit-button"
                        disabled={loading}
                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold uppercase tracking-wider btn-business"
                    >
                        {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
                    </Button>

                    <p className="text-center text-zinc-500 text-sm">
                        {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
                        <button
                            type="button"
                            data-testid="toggle-auth-mode"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-red-500 hover:text-red-400 font-medium"
                        >
                            {isLogin ? 'Criar conta' : 'Fazer login'}
                        </button>
                    </p>
                </form>
            </div>

            <div className="login-hero">
                <img 
                    src="https://images.unsplash.com/photo-1564846824194-346b7871b855?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxsZWdhbCUyMGRvY3VtZW50cyUyMGNvbnRyYWN0JTIwc2lnbmluZyUyMGNsb3NlJTIwdXB8ZW58MHx8fHwxNzcwMjA3Mzk2fDA&ixlib=rb-4.1.0&q=85"
                    alt="Documentos legais"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
};

export default Login;
