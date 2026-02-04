import { Building2, Users, MapPin, DollarSign, Briefcase, User, FileText, Calendar } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * Componente para exibir dados extraídos do contrato em campos estruturados
 * Inclui todos os campos obrigatórios: NIRE, data de registro, etc.
 */
const DadosExtraidos = ({ dados, editable = false, onChange }) => {
    if (!dados) return null;
    
    const empresa = dados.empresa || {};
    const socios = dados.socios || [];
    const atividades = dados.atividades || dados.atividades_cnae || [];
    const clausulas = dados.clausulas || [];
    const ultimaAlteracao = dados.ultima_alteracao || {};
    
    // Extrair endereço (pode ser string ou objeto)
    const getEndereco = () => {
        if (!empresa.endereco) return '-';
        if (typeof empresa.endereco === 'string') return empresa.endereco;
        const e = empresa.endereco;
        return `${e.logradouro || ''}${e.complemento ? ', ' + e.complemento : ''} - ${e.bairro || ''}, ${e.cidade || ''}/${e.estado || ''} - CEP: ${e.cep || ''}`.replace(/\s+/g, ' ').trim();
    };
    
    // Extrair capital social (pode ser string ou objeto)
    const getCapitalSocial = () => {
        if (!empresa.capital_social) return '-';
        if (typeof empresa.capital_social === 'string') return empresa.capital_social;
        const c = empresa.capital_social;
        return `${c.valor || ''} (${c.extenso || ''})${c.integralizacao ? ' - ' + c.integralizacao : ''}`;
    };
    
    // Extrair participação do sócio (pode ser string ou objeto)
    const getParticipacao = (socio) => {
        if (!socio.participacao) return '-';
        if (typeof socio.participacao === 'string') return socio.participacao;
        const p = socio.participacao;
        return `${p.quotas || ''} quotas (${p.valor || ''}) - ${p.percentual || ''}`;
    };
    
    const handleChange = (section, field, value) => {
        if (onChange) {
            onChange(section, field, value);
        }
    };

    return (
        <div className="space-y-6" data-testid="dados-extraidos">
            {/* Dados da Empresa */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                    <Building2 className="w-5 h-5 text-red-500" />
                    <h4 className="font-semibold text-white">Dados da Empresa</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Razão Social */}
                    <div className="col-span-2">
                        <Label className="text-zinc-500 text-xs uppercase">Razão Social</Label>
                        {editable ? (
                            <Input
                                value={empresa.razao_social || ''}
                                onChange={(e) => handleChange('empresa', 'razao_social', e.target.value)}
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                data-testid="campo-razao-social"
                            />
                        ) : (
                            <p className="text-white mt-1 font-medium" data-testid="valor-razao-social">
                                {empresa.razao_social || '-'}
                            </p>
                        )}
                    </div>
                    
                    {/* CNPJ */}
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase">CNPJ</Label>
                        <p className="text-white mt-1 font-mono" data-testid="valor-cnpj">
                            {empresa.cnpj || '-'}
                        </p>
                    </div>
                    
                    {/* NIRE - Campo importante */}
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <FileText className="w-3 h-3" /> NIRE
                        </Label>
                        <p className="text-white mt-1 font-mono" data-testid="valor-nire">
                            {empresa.nire || <span className="text-yellow-500 text-sm">Não encontrado</span>}
                        </p>
                    </div>
                    
                    {/* Junta Comercial e Data de Registro */}
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Data de Registro
                        </Label>
                        <p className="text-white mt-1 text-sm">
                            {empresa.data_registro || '-'}
                            {empresa.junta_comercial && (
                                <span className="text-zinc-400"> ({empresa.junta_comercial})</span>
                            )}
                        </p>
                    </div>
                    
                    {/* Última Alteração */}
                    {(ultimaAlteracao.numero || ultimaAlteracao.data) && (
                        <div>
                            <Label className="text-zinc-500 text-xs uppercase">Última Alteração</Label>
                            <p className="text-white mt-1 text-sm">
                                {ultimaAlteracao.numero && `${ultimaAlteracao.numero}ª alteração`}
                                {ultimaAlteracao.data && ` em ${ultimaAlteracao.data}`}
                            </p>
                        </div>
                    )}
                    
                    {/* Endereço */}
                    <div className="col-span-2">
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Endereço da Sede
                        </Label>
                        <p className="text-white mt-1" data-testid="valor-endereco">
                            {getEndereco()}
                        </p>
                    </div>
                    
                    {/* Capital Social */}
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Capital Social
                        </Label>
                        <p className="text-white mt-1" data-testid="valor-capital">
                            {getCapitalSocial()}
                        </p>
                    </div>
                    
                    {/* Prazo de Duração */}
                    {empresa.prazo_duracao && (
                        <div>
                            <Label className="text-zinc-500 text-xs uppercase">Prazo de Duração</Label>
                            <p className="text-white mt-1">{empresa.prazo_duracao}</p>
                        </div>
                    )}
                    
                    {/* Objeto Social */}
                    <div className="col-span-2">
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> Objeto Social
                        </Label>
                        <p className="text-zinc-300 mt-1 text-sm" data-testid="valor-objeto">
                            {empresa.objeto_social || '-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quadro Societário */}
            {socios.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                        <Users className="w-5 h-5 text-red-500" />
                        <h4 className="font-semibold text-white">Quadro Societário (QSA)</h4>
                    </div>
                    
                    <div className="space-y-4">
                        {socios.map((socio, index) => (
                            <div key={index} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-4 h-4 text-zinc-500" />
                                    <span className="text-white font-medium">{socio.nome || `Sócio ${index + 1}`}</span>
                                    {socio.administrador && (
                                        <span className="text-xs bg-red-600/20 text-red-500 px-2 py-0.5 rounded">
                                            Administrador
                                        </span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <span className="text-zinc-500 text-xs">CPF:</span>
                                        <p className="text-zinc-300 font-mono">{socio.cpf || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 text-xs">RG:</span>
                                        <p className="text-zinc-300 font-mono">
                                            {socio.rg || '-'}
                                            {socio.orgao_emissor && <span className="text-zinc-500"> ({socio.orgao_emissor})</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 text-xs">Nacionalidade:</span>
                                        <p className="text-zinc-300">{socio.nacionalidade || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 text-xs">Estado Civil:</span>
                                        <p className="text-zinc-300">
                                            {socio.estado_civil || '-'}
                                            {socio.regime_casamento && <span className="text-zinc-500 text-xs"> ({socio.regime_casamento})</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 text-xs">Profissão:</span>
                                        <p className="text-zinc-300">{socio.profissao || '-'}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-3">
                                        <span className="text-zinc-500 text-xs">Participação:</span>
                                        <p className="text-zinc-300">{getParticipacao(socio)}</p>
                                    </div>
                                    {socio.endereco && (
                                        <div className="col-span-2 md:col-span-4">
                                            <span className="text-zinc-500 text-xs">Endereço:</span>
                                            <p className="text-zinc-300 text-xs">{socio.endereco}</p>
                                        </div>
                                    )}
                                    {socio.poderes && (
                                        <div className="col-span-2 md:col-span-4">
                                            <span className="text-zinc-500 text-xs">Poderes:</span>
                                            <p className="text-zinc-300 text-xs">{socio.poderes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cláusulas Extraídas */}
            {clausulas.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                        <FileText className="w-5 h-5 text-red-500" />
                        <h4 className="font-semibold text-white">Cláusulas do Contrato ({clausulas.length})</h4>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {clausulas.map((clausula, index) => (
                            <div key={index} className="border-l-2 border-red-600 pl-3">
                                <p className="text-white font-medium text-sm">
                                    {clausula.numero && `Cláusula ${clausula.numero} - `}
                                    {clausula.titulo || `Cláusula ${index + 1}`}
                                </p>
                                {clausula.texto && (
                                    <p className="text-zinc-400 text-xs mt-1 line-clamp-2">
                                        {clausula.texto}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Atividades */}
            {atividades.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                        <Briefcase className="w-5 h-5 text-red-500" />
                        <h4 className="font-semibold text-white">Atividades / CNAEs</h4>
                    </div>
                    
                    <ul className="space-y-2">
                        {atividades.map((atividade, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                                <span className="text-red-500 mt-1">•</span>
                                <span className="text-zinc-300">{atividade}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Se houver apenas texto bruto */}
            {dados.raw_text && !empresa.razao_social && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                        <Building2 className="w-5 h-5 text-red-500" />
                        <h4 className="font-semibold text-white">Dados Extraídos</h4>
                    </div>
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
                        {dados.raw_text}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default DadosExtraidos;
