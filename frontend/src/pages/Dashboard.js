import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
    FileText, Shield, AlertTriangle, CheckCircle2, 
    Clock, TrendingUp, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/dashboard/stats`);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
                <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 fade-in" data-testid="dashboard-page">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Olá, {user?.name?.split(' ')[0] || 'Colaborador'}
                </h1>
                <p className="text-zinc-500">
                    Bem-vindo ao Portal Societário Business Contabilidade
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="metric-card card-hover" data-testid="metric-certificados">
                    <div className="flex items-start justify-between mb-4">
                        <Shield className="w-6 h-6 text-red-500" strokeWidth={1.5} />
                        <span className="text-xs text-zinc-500 uppercase">Certificados</span>
                    </div>
                    <div className="metric-value text-white">
                        {stats?.certificados?.total || 0}
                    </div>
                    <div className="metric-label">Certificados Ativos</div>
                </div>

                <div className="metric-card card-hover" data-testid="metric-licencas-ativas">
                    <div className="flex items-start justify-between mb-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
                        <span className="text-xs text-zinc-500 uppercase">Licenças</span>
                    </div>
                    <div className="metric-value text-emerald-500">
                        {stats?.licencas?.ativas || 0}
                    </div>
                    <div className="metric-label">Licenças Ativas</div>
                </div>

                <div className="metric-card card-hover" data-testid="metric-licencas-alerta">
                    <div className="flex items-start justify-between mb-4">
                        <AlertTriangle className="w-6 h-6 text-amber-500 pulse-alert" strokeWidth={1.5} />
                        <span className="text-xs text-zinc-500 uppercase">Atenção</span>
                    </div>
                    <div className="metric-value text-amber-500">
                        {(stats?.licencas?.proximas_vencimento || 0) + (stats?.licencas?.vencidas || 0)}
                    </div>
                    <div className="metric-label">Requerem Ação</div>
                </div>

                <div className="metric-card card-hover" data-testid="metric-processos">
                    <div className="flex items-start justify-between mb-4">
                        <FileText className="w-6 h-6 text-red-500" strokeWidth={1.5} />
                        <span className="text-xs text-zinc-500 uppercase">Processos</span>
                    </div>
                    <div className="metric-value text-white">
                        {stats?.minutas?.total || 0}
                    </div>
                    <div className="metric-label">Total de Processos</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                        Processos Societários
                    </h2>
                    <p className="text-zinc-400 mb-6 text-sm">
                        Constituição, alteração e baixa de empresas com auxílio de IA.
                        Faça upload de documentos para preenchimento automático.
                    </p>
                    <div className="flex items-center gap-4">
                        <Button 
                            data-testid="novo-processo-btn"
                            onClick={() => navigate('/processos')}
                            className="bg-red-600 hover:bg-red-700 btn-business"
                        >
                            Novo Processo
                            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                        </Button>
                        <span className="text-zinc-500 text-sm">
                            {stats?.minutas?.pendentes || 0} pendente(s)
                        </span>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                        Licenças REDESIM
                    </h2>
                    <p className="text-zinc-400 mb-6 text-sm">
                        Gerencie certificados digitais e consulte licenças de funcionamento.
                        Renovação automática para licenças próximas do vencimento.
                    </p>
                    <div className="flex items-center gap-4">
                        <Button 
                            data-testid="ver-licencas-btn"
                            onClick={() => navigate('/licencas')}
                            className="bg-red-600 hover:bg-red-700 btn-business"
                        >
                            Ver Licenças
                            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                        </Button>
                        <span className="text-zinc-500 text-sm">
                            {stats?.licencas?.total || 0} cadastrada(s)
                        </span>
                    </div>
                </div>
            </div>

            {/* Status Summary */}
            {(stats?.licencas?.vencidas > 0 || stats?.licencas?.proximas_vencimento > 0) && (
                <div className="mt-6 bg-red-950/30 border border-red-900/50 rounded p-6">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" strokeWidth={1.5} />
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Atenção Necessária</h3>
                            <ul className="space-y-1 text-sm text-zinc-400">
                                {stats?.licencas?.vencidas > 0 && (
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        {stats.licencas.vencidas} licença(s) vencida(s)
                                    </li>
                                )}
                                {stats?.licencas?.proximas_vencimento > 0 && (
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        {stats.licencas.proximas_vencimento} licença(s) próxima(s) do vencimento
                                    </li>
                                )}
                            </ul>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate('/licencas')}
                                className="mt-4 border-red-800 text-red-400 hover:bg-red-950"
                            >
                                Gerenciar Licenças
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
