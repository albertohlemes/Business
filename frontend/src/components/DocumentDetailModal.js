import React, { useState } from 'react';
import { 
  X, FileText, CheckCircle, XCircle, AlertTriangle, 
  ChevronDown, ChevronUp, Download, Package, DollarSign,
  Percent, Building2, MapPin, Hash, Calendar
} from 'lucide-react';

const DocumentDetailModal = ({ document, onClose }) => {
  const [showAllProducts, setShowAllProducts] = useState(false);
  
  if (!document) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatEndereco = (endereco, uf) => {
    if (!endereco) return uf || '';
    if (typeof endereco === 'string') return endereco;
    // Se for objeto, formatar
    const parts = [];
    if (endereco.logradouro) parts.push(endereco.logradouro);
    if (endereco.numero) parts.push(endereco.numero);
    if (endereco.bairro) parts.push(endereco.bairro);
    if (endereco.cidade) parts.push(endereco.cidade);
    if (endereco.uf || uf) parts.push(endereco.uf || uf);
    return parts.join(', ') || uf || '';
  };

  // Calcular totais dos produtos
  const calcularTotaisProdutos = () => {
    const produtos = document.produtos || [];
    return {
      valor_total: produtos.reduce((acc, p) => acc + (p.valor_total || p.valor_produto || 0), 0),
      v_bc_icms: produtos.reduce((acc, p) => acc + (p.v_bc_icms || 0), 0),
      v_icms: produtos.reduce((acc, p) => acc + (p.v_icms || 0), 0),
      v_bc_icms_st: produtos.reduce((acc, p) => acc + (p.v_bc_icms_st || 0), 0),
      v_icms_st: produtos.reduce((acc, p) => acc + (p.v_icms_st || 0), 0),
      v_ipi: produtos.reduce((acc, p) => acc + (p.v_ipi || 0), 0),
      v_bc_pis: produtos.reduce((acc, p) => acc + (p.v_bc_pis || 0), 0),
      v_pis: produtos.reduce((acc, p) => acc + (p.v_pis || 0), 0),
      v_bc_cofins: produtos.reduce((acc, p) => acc + (p.v_bc_cofins || 0), 0),
      v_cofins: produtos.reduce((acc, p) => acc + (p.v_cofins || 0), 0),
      v_frete: produtos.reduce((acc, p) => acc + (p.v_frete || 0), 0),
      v_seguro: produtos.reduce((acc, p) => acc + (p.v_seguro || 0), 0),
      v_outras_despesas: produtos.reduce((acc, p) => acc + (p.v_outras_despesas || 0), 0),
      v_desconto: produtos.reduce((acc, p) => acc + (p.v_desconto || 0), 0),
    };
  };

  // Verificar divergência entre capa e produtos
  const verificarDivergencia = (valorCapa, valorProdutos, tolerancia = 0.02) => {
    const diff = Math.abs(valorCapa - valorProdutos);
    if (diff < tolerancia) return 'ok';
    return valorCapa > valorProdutos ? 'maior' : 'menor';
  };

  const totaisProdutos = calcularTotaisProdutos();
  
  // Valores da capa da NF
  const valorCapaNF = {
    valor_total: document.valor_total || 0,
    icms_total: document.icms_total || 0,
    total_icms_st: document.total_icms_st || 0,
    total_ipi: document.total_ipi || 0,
    total_frete: document.total_frete || 0,
    total_seguro: document.total_seguro || 0,
    total_outras_despesas: document.total_outras_despesas || 0,
    total_desconto: document.total_desconto || 0,
  };

  // Classe CSS baseada na divergência
  const getDivergenceClass = (valorCapa, valorProdutos) => {
    const status = verificarDivergencia(valorCapa, valorProdutos);
    if (status === 'ok') return 'text-emerald-400';
    return 'text-red-400';
  };

  const getDivergenceIcon = (valorCapa, valorProdutos) => {
    const status = verificarDivergencia(valorCapa, valorProdutos);
    if (status === 'ok') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  // Contar divergências de CST/CFOP nos produtos
  const contarDivergenciasProdutos = () => {
    const produtos = document.produtos || [];
    let cstDivergentes = 0;
    let cfopDivergentes = 0;
    
    produtos.forEach(p => {
      if (p.cst_divergente) cstDivergentes++;
      if (p.cfop_original && p.cfop !== p.cfop_original) cfopDivergentes++;
    });
    
    return { cstDivergentes, cfopDivergentes, total: cstDivergentes + cfopDivergentes };
  };

  const divergenciasProd = contarDivergenciasProdutos();
  const produtos = document.produtos || [];
  const produtosVisiveis = showAllProducts ? produtos : produtos.slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#C8A951]/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#C8A951]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">NF-e {document.numero_nfe}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-[#2A2A2A] text-[#A1A1AA]">
                  Série {document.serie || '1'}
                </span>
                {divergenciasProd.total > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {divergenciasProd.total} divergência(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#666] font-mono mt-0.5">{document.chave_acesso || document.chave_nfe}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Emitente */}
            <div className="bg-[#0C0C0C] rounded-lg p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-[#C8A951]" />
                <h4 className="text-sm font-medium text-[#A1A1AA]">Emitente</h4>
              </div>
              <p className="text-white font-medium">{document.emitente_nome}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-[#A1A1AA] font-mono">{document.emitente_cnpj}</span>
                {document.emitente_ie && (
                  <span className="text-[#666]">IE: {document.emitente_ie}</span>
                )}
              </div>
              {document.emitente_uf && (
                <div className="flex items-center gap-1 mt-1 text-xs text-[#666]">
                  <MapPin className="w-3 h-3" />
                  {formatEndereco(document.emitente_endereco, document.emitente_uf)}
                </div>
              )}
            </div>

            {/* Destinatário */}
            <div className="bg-[#0C0C0C] rounded-lg p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-medium text-[#A1A1AA]">Destinatário</h4>
              </div>
              <p className="text-white font-medium">{document.destinatario_nome}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-[#A1A1AA] font-mono">{document.destinatario_cnpj}</span>
                {document.destinatario_ie && (
                  <span className="text-[#666]">IE: {document.destinatario_ie}</span>
                )}
              </div>
              {document.destinatario_uf && (
                <div className="flex items-center gap-1 mt-1 text-xs text-[#666]">
                  <MapPin className="w-3 h-3" />
                  {document.destinatario_endereco || document.destinatario_uf}
                </div>
              )}
            </div>
          </div>

          {/* Comparativo Capa vs Produtos */}
          <div className="bg-[#0C0C0C] rounded-lg p-4 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#C8A951]" />
                <h4 className="text-sm font-medium text-white">Comparativo: Capa NF × Produtos</h4>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-3 h-3" /> OK
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle className="w-3 h-3" /> Divergente
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Valor Total */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">Valor Total</span>
                  {getDivergenceIcon(valorCapaNF.valor_total, totaisProdutos.valor_total)}
                </div>
                <p className={`text-sm font-bold ${getDivergenceClass(valorCapaNF.valor_total, totaisProdutos.valor_total)}`}>
                  {formatCurrency(valorCapaNF.valor_total)}
                </p>
                <p className="text-xs text-[#666] mt-0.5">
                  Prod: {formatCurrency(totaisProdutos.valor_total)}
                </p>
              </div>

              {/* ICMS */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">ICMS</span>
                  {getDivergenceIcon(valorCapaNF.icms_total, totaisProdutos.v_icms)}
                </div>
                <p className={`text-sm font-bold ${getDivergenceClass(valorCapaNF.icms_total, totaisProdutos.v_icms)}`}>
                  {formatCurrency(valorCapaNF.icms_total)}
                </p>
                <p className="text-xs text-[#666] mt-0.5">
                  Prod: {formatCurrency(totaisProdutos.v_icms)}
                </p>
              </div>

              {/* ICMS-ST */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">ICMS-ST</span>
                  {getDivergenceIcon(valorCapaNF.total_icms_st, totaisProdutos.v_icms_st)}
                </div>
                <p className={`text-sm font-bold ${getDivergenceClass(valorCapaNF.total_icms_st, totaisProdutos.v_icms_st)}`}>
                  {formatCurrency(valorCapaNF.total_icms_st)}
                </p>
                <p className="text-xs text-[#666] mt-0.5">
                  Prod: {formatCurrency(totaisProdutos.v_icms_st)}
                </p>
              </div>

              {/* IPI */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">IPI</span>
                  {getDivergenceIcon(valorCapaNF.total_ipi, totaisProdutos.v_ipi)}
                </div>
                <p className={`text-sm font-bold ${getDivergenceClass(valorCapaNF.total_ipi, totaisProdutos.v_ipi)}`}>
                  {formatCurrency(valorCapaNF.total_ipi)}
                </p>
                <p className="text-xs text-[#666] mt-0.5">
                  Prod: {formatCurrency(totaisProdutos.v_ipi)}
                </p>
              </div>

              {/* PIS */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">PIS</span>
                  <span className="text-[#A1A1AA]">-</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {formatCurrency(totaisProdutos.v_pis)}
                </p>
                <p className="text-xs text-[#666] mt-0.5">
                  Base: {formatCurrency(totaisProdutos.v_bc_pis)}
                </p>
              </div>

              {/* COFINS */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">COFINS</span>
                  <span className="text-[#A1A1AA]">-</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {formatCurrency(totaisProdutos.v_cofins)}
                </p>
                <p className="text-xs text-[#666] mt-0.5">
                  Base: {formatCurrency(totaisProdutos.v_bc_cofins)}
                </p>
              </div>

              {/* Frete */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">Frete</span>
                  {getDivergenceIcon(valorCapaNF.total_frete, totaisProdutos.v_frete)}
                </div>
                <p className={`text-sm font-bold ${getDivergenceClass(valorCapaNF.total_frete, totaisProdutos.v_frete)}`}>
                  {formatCurrency(valorCapaNF.total_frete)}
                </p>
              </div>

              {/* Desconto */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#666]">Desconto</span>
                  {getDivergenceIcon(valorCapaNF.total_desconto, totaisProdutos.v_desconto)}
                </div>
                <p className={`text-sm font-bold ${getDivergenceClass(valorCapaNF.total_desconto, totaisProdutos.v_desconto)}`}>
                  {formatCurrency(valorCapaNF.total_desconto)}
                </p>
              </div>

              {/* Data Emissão */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-[#666]" />
                  <span className="text-xs text-[#666]">Data Emissão</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {formatDate(document.data_emissao)}
                </p>
              </div>

              {/* Qtd Produtos */}
              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Package className="w-3 h-3 text-[#666]" />
                  <span className="text-xs text-[#666]">Produtos</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {produtos.length}
                </p>
              </div>
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="bg-[#0C0C0C] rounded-lg border border-[#2A2A2A] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#C8A951]" />
                <h4 className="text-sm font-medium text-white">
                  Produtos ({produtos.length})
                </h4>
                {divergenciasProd.cstDivergentes > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                    {divergenciasProd.cstDivergentes} CST divergente(s)
                  </span>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1A1A1A] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-[#666] font-medium">#</th>
                    <th className="text-left px-3 py-2 text-[#666] font-medium min-w-[200px]">Descrição</th>
                    <th className="text-left px-3 py-2 text-[#666] font-medium">NCM</th>
                    <th className="text-left px-3 py-2 text-[#666] font-medium">CFOP</th>
                    <th className="text-left px-3 py-2 text-[#666] font-medium">CST</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">Qtd</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">Valor Unit.</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">Valor Total</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">BC ICMS</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">ICMS</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">%</th>
                    <th className="text-left px-3 py-2 text-[#666] font-medium">CST PIS</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">BC PIS</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">PIS</th>
                    <th className="text-right px-3 py-2 text-[#666] font-medium">COFINS</th>
                    <th className="text-center px-3 py-2 text-[#666] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {produtosVisiveis.map((prod, idx) => {
                    const hasDivergence = prod.cst_divergente || (prod.cfop_original && prod.cfop !== prod.cfop_original);
                    const rowClass = hasDivergence ? 'bg-red-500/5' : '';
                    
                    return (
                      <tr key={idx} className={`hover:bg-white/5 ${rowClass}`}>
                        <td className="px-3 py-2 text-[#666]">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="max-w-[250px]">
                            <p className="text-white truncate" title={prod.descricao}>
                              {prod.descricao}
                            </p>
                            {prod.categoria_classificada && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C8A951]/20 text-[#C8A951]">
                                {prod.categoria_classificada}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[#A1A1AA] font-mono">{prod.ncm}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className={`font-mono font-medium ${prod.cfop_original && prod.cfop !== prod.cfop_original ? 'text-emerald-400' : 'text-white'}`}>
                              {prod.cfop}
                            </span>
                            {prod.cfop_original && prod.cfop !== prod.cfop_original && (
                              <span className="text-[10px] text-red-400 line-through">{prod.cfop_original}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[#A1A1AA] font-mono">{prod.cst}</td>
                        <td className="px-3 py-2 text-right text-[#A1A1AA]">{prod.quantidade?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-[#A1A1AA]">{formatCurrency(prod.valor_unitario)}</td>
                        <td className="px-3 py-2 text-right text-[#C8A951] font-medium">{formatCurrency(prod.valor_total || prod.valor_produto)}</td>
                        <td className="px-3 py-2 text-right text-[#A1A1AA]">{formatCurrency(prod.v_bc_icms)}</td>
                        <td className="px-3 py-2 text-right text-white">{formatCurrency(prod.v_icms)}</td>
                        <td className="px-3 py-2 text-right text-[#666]">{formatPercent(prod.p_icms)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className={`font-mono ${prod.cst_divergente ? 'text-red-400' : 'text-[#A1A1AA]'}`}>
                              {prod.cst_pis || prod.cst_pis_xml || '-'}
                            </span>
                            {prod.cst_divergente && prod.cst_pis_calculado && (
                              <span className="text-[10px] text-emerald-400">→{prod.cst_pis_calculado}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-[#A1A1AA]">{formatCurrency(prod.v_bc_pis)}</td>
                        <td className="px-3 py-2 text-right text-white">{formatCurrency(prod.v_pis)}</td>
                        <td className="px-3 py-2 text-right text-white">{formatCurrency(prod.v_cofins)}</td>
                        <td className="px-3 py-2 text-center">
                          {hasDivergence ? (
                            <div className="flex flex-col items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-400" />
                              {prod.cst_motivo && (
                                <span className="text-[9px] text-red-400 max-w-[80px] truncate" title={prod.cst_motivo}>
                                  {prod.cst_motivo}
                                </span>
                              )}
                            </div>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Ver mais / Ver menos */}
            {produtos.length > 20 && (
              <div className="p-3 border-t border-[#2A2A2A] text-center">
                <button
                  onClick={() => setShowAllProducts(!showAllProducts)}
                  className="flex items-center gap-2 mx-auto text-sm text-[#C8A951] hover:text-[#D4B962] transition-colors"
                >
                  {showAllProducts ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Ver todos os {produtos.length} produtos
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailModal;
