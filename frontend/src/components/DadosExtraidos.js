import { Building2, Users, MapPin, DollarSign, Briefcase, User } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * Componente para exibir dados extraídos do contrato em campos estruturados
 */
const DadosExtraidos = ({ dados, editable = false, onChange }) => {
    if (!dados) return null;
    
    const empresa = dados.empresa || {};
    const socios = dados.socios || [];
    const atividades = dados.atividades || [];
    
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
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase">Razão Social</Label>
                        {editable ? (
                            <Input
                                value={empresa.razao_social || ''}
                                onChange={(e) => handleChange('empresa', 'razao_social', e.target.value)}
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                data-testid="campo-razao-social"
                            />
                        ) : (
                            <p className="text-white mt-1" data-testid="valor-razao-social">
                                {empresa.razao_social || '-'}
                            </p>
                        )}
                    </div>
                    
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase">CNPJ</Label>
                        {editable ? (
                            <Input
                                value={empresa.cnpj || ''}
                                onChange={(e) => handleChange('empresa', 'cnpj', e.target.value)}
                                className="bg-zinc-900 border-zinc-700 mt-1 font-mono"
                                data-testid="campo-cnpj"
                            />
                        ) : (
                            <p className="text-white mt-1 font-mono" data-testid="valor-cnpj">
                                {empresa.cnpj || '-'}
                            </p>
                        )}
                    </div>
                    
                    <div className="col-span-2">
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Endereço
                        </Label>
                        {editable ? (
                            <Input
                                value={empresa.endereco || ''}
                                onChange={(e) => handleChange('empresa', 'endereco', e.target.value)}
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                data-testid="campo-endereco"
                            />
                        ) : (
                            <p className="text-white mt-1" data-testid="valor-endereco">
                                {empresa.endereco || '-'}
                            </p>
                        )}
                    </div>
                    
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Capital Social
                        </Label>
                        {editable ? (
                            <Input
                                value={empresa.capital_social || ''}
                                onChange={(e) => handleChange('empresa', 'capital_social', e.target.value)}
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                data-testid="campo-capital"
                            />
                        ) : (
                            <p className="text-white mt-1" data-testid="valor-capital">
                                {empresa.capital_social || '-'}
                            </p>
                        )}
                    </div>
                    
                    <div>
                        <Label className="text-zinc-500 text-xs uppercase flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> Objeto Social
                        </Label>
                        {editable ? (
                            <Input
                                value={empresa.objeto_social || ''}
                                onChange={(e) => handleChange('empresa', 'objeto_social', e.target.value)}
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                data-testid="campo-objeto"
                            />
                        ) : (
                            <p className="text-white mt-1 text-sm" data-testid="valor-objeto">
                                {empresa.objeto_social || '-'}
                            </p>
                        )}
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
                            <div key={index} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-zinc-500" />
                                    <span className="text-white font-medium">{socio.nome || `Sócio ${index + 1}`}</span>
                                    {socio.administrador && (
                                        <span className="text-xs bg-red-600/20 text-red-500 px-2 py-0.5 rounded">
                                            Administrador
                                        </span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <span className="text-zinc-500 text-xs">CPF:</span>
                                        <p className="text-zinc-300 font-mono">{socio.cpf || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 text-xs">Participação:</span>
                                        <p className="text-zinc-300">{socio.participacao || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 text-xs">Estado Civil:</span>
                                        <p className="text-zinc-300">{socio.estado_civil || '-'}</p>
                                    </div>
                                    {socio.nacionalidade && (
                                        <div>
                                            <span className="text-zinc-500 text-xs">Nacionalidade:</span>
                                            <p className="text-zinc-300">{socio.nacionalidade}</p>
                                        </div>
                                    )}
                                    {socio.profissao && (
                                        <div>
                                            <span className="text-zinc-500 text-xs">Profissão:</span>
                                            <p className="text-zinc-300">{socio.profissao}</p>
                                        </div>
                                    )}
                                    {socio.rg && (
                                        <div>
                                            <span className="text-zinc-500 text-xs">RG:</span>
                                            <p className="text-zinc-300 font-mono">{socio.rg}</p>
                                        </div>
                                    )}
                                </div>
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
