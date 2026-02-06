import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, Calendar, Building2, ChevronRight, Scale, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AlertasConvencoes = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlertas();
  }, []);

  const fetchAlertas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/convencoes-vencimento`);
      setAlertas(response.data.alertas || []);
    } catch (error) {
      console.error('Erro ao buscar alertas de convenções:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'vencida':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          icon: AlertTriangle,
          label: 'VENCIDA'
        };
      case 'critico':
        return {
          color: 'bg-amber-500',
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          icon: AlertTriangle,
          label: 'CRÍTICO'
        };
      case 'atencao':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          icon: Calendar,
          label: 'ATENÇÃO'
        };
      default:
        return {
          color: 'bg-slate-500',
          textColor: 'text-slate-400',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
          icon: CheckCircle2,
          label: 'OK'
        };
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-pulse text-slate-500">Carregando alertas...</div>
        </CardContent>
      </Card>
    );
  }

  if (alertas.length === 0) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Scale size={18} className="text-emerald-500" />
            Convenções Coletivas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <CheckCircle2 className="text-emerald-500" size={24} />
            <div>
              <p className="text-emerald-400 font-medium">Tudo em dia!</p>
              <p className="text-xs text-slate-500">Nenhuma convenção com vencimento próximo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700 bg-slate-900">
      <CardHeader className="pb-2 border-b border-slate-800">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <AlertTriangle size={18} className="text-amber-500" />
          Alertas de Convenções
          <Badge variant="outline" className="ml-2 border-amber-500/50 text-amber-400 bg-amber-500/10">
            {alertas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
          {alertas.map((alerta, index) => {
            const config = getStatusConfig(alerta.status);
            const Icon = config.icon;
            
            return (
              <div 
                key={index} 
                className={`p-4 hover:bg-slate-800/50 transition-colors ${config.bgColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon size={16} className={config.textColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium text-sm truncate">{alerta.razao_social}</p>
                      <Badge variant="outline" className={`text-xs ${config.borderColor} ${config.textColor}`}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {alerta.sindicato || 'Sindicato não informado'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-slate-400">
                        <Calendar size={12} className="inline mr-1" />
                        Vence: {alerta.data_fim}
                      </span>
                      {alerta.status === 'vencida' ? (
                        <span className="text-red-400 font-medium">
                          Vencida há {alerta.dias} dias
                        </span>
                      ) : (
                        <span className={config.textColor}>
                          {alerta.dias} dias restantes
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertasConvencoes;
