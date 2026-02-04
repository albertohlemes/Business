import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Upload, FileText, Check, AlertCircle, Sparkles, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const UploadXML = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia: ctxCompetencia } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Auto-preencher com empresa/competência do contexto global
  useEffect(() => {
    if (ctxCompany && !selectedCompany) {
      setSelectedCompany(ctxCompany.id);
    }
    if (ctxCompetencia && !competencia) {
      setCompetencia(ctxCompetencia);
    } else if (!competencia) {
      // Fallback para data atual se não houver contexto
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setCompetencia(month + '/' + year);
    }
  }, [ctxCompany, ctxCompetencia]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API + '/companies', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setResults(null);
  };

  const handleUpload = async () => {
    if (!selectedCompany || files.length === 0 || !competencia) {
      alert('Selecione empresa, competência e pelo menos um arquivo XML');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('company_id', selectedCompany);
    formData.append('competencia', competencia);
    formData.append('tipo', tipo);
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(API + '/xml/upload', formData, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'multipart/form-data'
        }
      });
      setResults(response.data);
      setFiles([]);
      document.getElementById('file-input').value = '';
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao enviar arquivos');
    } finally {
      setUploading(false);
    }
  };

  const FileItem = ({ file, index }) => (
    <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded">
      <FileText className="w-4 h-4 text-red-600" />
      <span className="text-gray-700 flex-1">{file.name}</span>
      <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="upload-xml-page" className="space-y-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Upload com Análise Inteligente</h1>
          </div>
          <p className="text-red-100">A CONVERSÃO DE CFOP ACONTECE AUTOMATICAMENTE ao fazer o upload! Veja o relatório detalhado após enviar.</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
                <select
                  data-testid="select-company-dropdown"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.razao_social} ({company.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Competência (Mês/Ano) *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    data-testid="competencia-input"
                    type="text"
                    value={competencia}
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="01/2024"
                    maxLength="7"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Formato: MM/AAAA (Ex: 01/2024)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Operação *</label>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    data-testid="tipo-entrada-radio"
                    type="radio"
                    value="entrada"
                    checked={tipo === 'entrada'}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-gray-700">Entrada (Compras)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    data-testid="tipo-saida-radio"
                    type="radio"
                    value="saida"
                    checked={tipo === 'saida'}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-gray-700">Saída (Vendas)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 O sistema detecta automaticamente se é NF-e, NFC-e (cupom) ou NFS-e (serviço)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arquivos XML *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  id="file-input"
                  data-testid="xml-file-input"
                  type="file"
                  multiple
                  accept=".xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <span className="text-red-600 hover:text-red-700 font-semibold">Clique para selecionar</span>
                  <span className="text-gray-600"> ou arraste os arquivos aqui</span>
                </label>
                <p className="text-sm text-gray-500 mt-2">Aceita múltiplos arquivos .xml</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Arquivos Selecionados ({files.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((file, index) => (
                    <FileItem key={index} file={file} index={index} />
                  ))}
                </div>
              </div>
            )}

            <button
              data-testid="upload-files-button"
              onClick={handleUpload}
              disabled={uploading || !selectedCompany || !competencia || files.length === 0}
              className="w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processando e Convertendo CFOPs...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Enviar e Analisar {files.length} arquivo(s)
                </>
              )}
            </button>
          </div>
        </div>

        {results && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resultado do Upload</h2>
            
            {results.success.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Arquivos Processados ({results.success.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.success.map((item, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900">{item.filename}</p>
                      <p className="text-xs text-green-700">Chave: {item.chave}</p>
                      {item.conversoes > 0 && (
                        <p className="text-xs text-green-700 font-bold">✓ {item.conversoes} CFOP(s) CONVERTIDO(S) AUTOMATICAMENTE</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.duplicadas && results.duplicadas.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">Notas Duplicadas - Já Importadas ({results.duplicadas.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.duplicadas.map((item, index) => (
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-900">{item.filename} - NF-e {item.numero_nfe}</p>
                      <p className="text-xs text-yellow-700">Esta nota já foi importada nesta competência</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.rejeitadas_cnpj && results.rejeitadas_cnpj.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Rejeitadas - CNPJ Não Corresponde ({results.rejeitadas_cnpj.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.rejeitadas_cnpj.map((item, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900">{item.filename} - NF-e {item.numero_nfe}</p>
                      <p className="text-xs text-red-700">{item.motivo}</p>
                      <p className="text-xs text-gray-600 mt-1">Emitente: {item.emitente} | Destinatário: {item.destinatario}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.rejeitadas_competencia && results.rejeitadas_competencia.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">Rejeitadas - Competência Diferente ({results.rejeitadas_competencia.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.rejeitadas_competencia.map((item, index) => (
                    <div key={index} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-orange-900">{item.filename} - NF-e {item.numero_nfe}</p>
                      <p className="text-xs text-orange-700">{item.motivo}</p>
                      <p className="text-xs text-gray-600 mt-1">Data de Emissão: {item.data_emissao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ALERTAS DE CFOP - Operações Distintas de Venda */}
            {results.alertas_cfop && results.alertas_cfop.length > 0 && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg p-4 mb-3">
                  <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
                    ⚠️ ALERTAS DE CFOP - Operações Distintas
                  </h3>
                  <p className="text-amber-100">
                    Foram detectadas {results.total_alertas_cfop} notas com CFOPs de operações diferentes de venda (bonificação, remessa, devolução, etc.)
                  </p>
                  <p className="text-amber-200 text-sm mt-1">
                    Acesse o menu "Alertas CFOP" para revisar e converter os CFOPs se necessário.
                  </p>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {results.alertas_cfop.map((arquivo, idx) => (
                    <div key={idx} className="bg-amber-50 p-4 rounded-lg border-2 border-amber-300">
                      <p className="font-bold text-amber-900 mb-2">📄 NF-e {arquivo.nfe} - {arquivo.emitente}</p>
                      <div className="space-y-2">
                        {arquivo.alertas.map((alerta, i) => (
                          <div key={i} className="bg-white p-2 rounded border border-amber-200 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{alerta.produto}</p>
                              <p className="text-xs text-gray-600">Código: {alerta.codigo}</p>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-mono text-sm font-bold">
                                CFOP {alerta.cfop}
                              </span>
                              <p className="text-xs text-amber-700 mt-1">{alerta.descricao_cfop}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.resumo && (
              <div className="mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Resumo da Importação</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{results.resumo.total_arquivos}</p>
                    <p className="text-xs text-gray-600">Total Enviados</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{results.resumo.importados}</p>
                    <p className="text-xs text-green-600">Importados</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-700">{results.resumo.duplicados}</p>
                    <p className="text-xs text-yellow-600">Duplicados</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">{results.resumo.rejeitados_cnpj}</p>
                    <p className="text-xs text-red-600">CNPJ Errado</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-orange-700">{results.resumo.rejeitados_competencia}</p>
                    <p className="text-xs text-orange-600">Comp. Errada</p>
                  </div>
                  <div className="bg-gray-200 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-700">{results.resumo.erros}</p>
                    <p className="text-xs text-gray-600">Erros</p>
                  </div>
                  {results.resumo.alertas_cfop > 0 && (
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-amber-700">{results.resumo.alertas_cfop}</p>
                      <p className="text-xs text-amber-600">Alertas CFOP</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {results.relatorio_conversoes && results.relatorio_conversoes.length > 0 && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-4 mb-3">
                  <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
                    <Sparkles className="w-6 h-6" />
                    RELATÓRIO DE CONVERSÕES AUTOMÁTICAS
                  </h3>
                  <p className="text-purple-100">Total: {results.total_conversoes} produtos analisados e convertidos pela IA</p>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.relatorio_conversoes.map((arquivo, idx) => (
                    <div key={idx} className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                      <p className="font-bold text-purple-900 mb-3">📄 NF-e {arquivo.nfe} - {arquivo.arquivo}</p>
                      <div className="space-y-3">
                        {arquivo.conversoes.map((conv, i) => (
                          <div key={i} className="bg-white p-3 rounded-lg border border-purple-200">
                            <p className="font-semibold text-gray-900 mb-2">{conv.produto}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Original:</span>
                                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded font-mono font-bold">
                                  {conv.cfop_original}
                                </span>
                              </div>
                              <span className="text-xl text-gray-400">→</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Convertido:</span>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-mono font-bold">
                                  {conv.cfop_convertido}
                                </span>
                              </div>
                              <span className={'px-3 py-1 rounded-full font-bold text-xs ' + 
                                (conv.categoria === 'revenda' ? 'bg-purple-600 text-white' :
                                 conv.categoria === 'insumo' ? 'bg-blue-600 text-white' :
                                 conv.categoria === 'despesa' ? 'bg-orange-600 text-white' :
                                 'bg-yellow-600 text-white')}>
                                {conv.categoria.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2 font-medium">Critério: {conv.motivo}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.errors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Erros ({results.errors.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.errors.map((item, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900">{item.filename}</p>
                      <p className="text-xs text-red-700">{item.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UploadXML;
