import csv
from io import StringIO
from datetime import datetime
from typing import List, Dict, Any

def format_date(date_str: str) -> str:
    """Format date to YYYYMMDD"""
    try:
        if not date_str: return ""
        if 'T' in date_str:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
        return dt.strftime('%Y%m%d')
    except:
        return ""

def format_number(val, decimals=2):
    if val is None: val = 0.0
    return f"{float(val):.{decimals}f}"

def clean_cnpj(cnpj):
    """Remove formatação do CNPJ"""
    if not cnpj:
        return ""
    return str(cnpj).replace('.', '').replace('/', '').replace('-', '').strip()

def get_modelo_especie(doc):
    """Determina espécie do documento baseado no modelo"""
    modelo = str(doc.get('modelo', '')).lower()
    if modelo in ['55', 'nfe', 'nf-e']:
        return 'NF', '55'
    elif modelo in ['65', 'nfce', 'nfc-e']:
        return 'NFC', '65'
    elif modelo in ['nfse', 'nfs-e']:
        return 'NFS', '99'
    else:
        return 'NF', '55'

def generate_csv_saida(documents: List[Dict[str, Any]]) -> str:
    """
    Gera CSV de Saídas - Uma linha por PRODUTO
    Layout personalizado para importação em sistemas contábeis
    """
    lines = []
    item_count = 0
    
    for doc in documents:
        produtos = doc.get('produtos', [])
        if not produtos:
            continue
            
        especie, modelo = get_modelo_especie(doc)
        serie = doc.get('serie', '1') or '1'
        data_emissao = format_date(doc.get('data_emissao', ''))
        numero_nfe = str(doc.get('numero_nfe', ''))
        chave = doc.get('chave', doc.get('chave_nfe', ''))
        
        # Para saídas: emitente = nossa empresa, destinatário = cliente
        emitente_cnpj = clean_cnpj(doc.get('emitente_cnpj', ''))
        destinatario_cnpj = clean_cnpj(doc.get('destinatario_cnpj', ''))
        emitente_uf = doc.get('emitente_uf', 'SP') or 'SP'
        
        for prod in produtos:
            item_count += 1
            row = []
            
            # 01: Sequencial (6 dígitos)
            row.append(str(item_count).zfill(6))
            
            # 02: CNPJ Destinatário (para saídas)
            row.append(f'"{destinatario_cnpj}"')
            
            # 03: UF Emitente
            row.append(f'"{emitente_uf}"')
            
            # 04: Data Entrada/Saída
            row.append(f'"{data_emissao}"')
            
            # 05: Data Emissão
            row.append(f'"{data_emissao}"')
            
            # 06: Número NF
            row.append(numero_nfe)
            
            # 07: Espécie
            row.append(f'"{especie}"')
            
            # 08: Série
            row.append(f'"{serie}"')
            
            # 09: CFOP
            cfop = str(prod.get('cfop', ''))
            row.append(f'"{cfop}"')
            
            # 10: Código Produto
            codigo = str(prod.get('codigo', ''))
            row.append(f'"{codigo}"')
            
            # 11: Descrição Produto
            descricao = str(prod.get('descricao', ''))[:60]
            row.append(f'"{descricao}"')
            
            # 12: NCM
            ncm = str(prod.get('ncm', ''))
            row.append(f'"{ncm}"')
            
            # 13: Unidade
            unidade = str(prod.get('unidade', prod.get('uCom', 'UN')))
            row.append(f'"{unidade}"')
            
            # 14: Quantidade
            qtd = float(prod.get('quantidade', 0) or 0)
            row.append(format_number(qtd, 4))
            
            # 15: Valor Unitário
            valor_unit = float(prod.get('valor_unitario', 0) or 0)
            row.append(format_number(valor_unit, 4))
            
            # 16: Valor Total Produto
            valor_total = float(prod.get('valor_total', 0) or 0)
            row.append(format_number(valor_total))
            
            # 17: CST ICMS
            cst = str(prod.get('cst', '00'))
            row.append(f'"{cst}"')
            
            # 18: Base ICMS
            bc_icms = float(prod.get('v_bc_icms', 0) or prod.get('v_bc', 0) or 0)
            row.append(format_number(bc_icms))
            
            # 19: Alíquota ICMS
            aliq_icms = float(prod.get('p_icms', 0) or 0)
            row.append(format_number(aliq_icms, 2))
            
            # 20: Valor ICMS
            v_icms = float(prod.get('v_icms', 0) or 0)
            row.append(format_number(v_icms))
            
            # 21: CST PIS
            cst_pis = str(prod.get('cst_pis', '01'))
            row.append(f'"{cst_pis}"')
            
            # 22: Base PIS
            bc_pis = valor_total if cst_pis in ['01', '02', '50'] else 0
            row.append(format_number(bc_pis))
            
            # 23: Alíquota PIS
            aliq_pis = 1.65  # Lucro Real
            row.append(format_number(aliq_pis, 2))
            
            # 24: Valor PIS
            v_pis = float(prod.get('v_pis', 0) or 0)
            row.append(format_number(v_pis))
            
            # 25: CST COFINS
            cst_cofins = str(prod.get('cst_cofins', '01'))
            row.append(f'"{cst_cofins}"')
            
            # 26: Base COFINS
            bc_cofins = valor_total if cst_cofins in ['01', '02', '50'] else 0
            row.append(format_number(bc_cofins))
            
            # 27: Alíquota COFINS
            aliq_cofins = 7.6  # Lucro Real
            row.append(format_number(aliq_cofins, 2))
            
            # 28: Valor COFINS
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            row.append(format_number(v_cofins))
            
            # 29: Chave NFe
            row.append(f'"{chave}"')
            
            # 30: Categoria (REVENDA/INSUMO/DESPESA)
            categoria = str(prod.get('categoria_classificada', ''))
            row.append(f'"{categoria.upper()}"')
            
            lines.append(",".join(row))
    
    # Cabeçalho
    header = [
        "SEQ", "CNPJ_DEST", "UF_EMIT", "DT_ENTRADA", "DT_EMISSAO", "NUM_NF",
        "ESPECIE", "SERIE", "CFOP", "COD_PROD", "DESC_PROD", "NCM", "UNID",
        "QTD", "VL_UNIT", "VL_TOTAL", "CST_ICMS", "BC_ICMS", "ALIQ_ICMS", "VL_ICMS",
        "CST_PIS", "BC_PIS", "ALIQ_PIS", "VL_PIS",
        "CST_COFINS", "BC_COFINS", "ALIQ_COFINS", "VL_COFINS",
        "CHAVE_NFE", "CATEGORIA"
    ]
    
    return ",".join(header) + "\n" + "\n".join(lines)


def generate_csv_entrada(documents: List[Dict[str, Any]]) -> str:
    """
    Gera CSV de Entradas - Uma linha por PRODUTO
    Layout personalizado para importação em sistemas contábeis
    """
    lines = []
    item_count = 0
    
    for doc in documents:
        produtos = doc.get('produtos', [])
        if not produtos:
            continue
            
        especie, modelo = get_modelo_especie(doc)
        serie = doc.get('serie', '1') or '1'
        data_emissao = format_date(doc.get('data_emissao', ''))
        numero_nfe = str(doc.get('numero_nfe', ''))
        chave = doc.get('chave', doc.get('chave_nfe', ''))
        
        # Para entradas: emitente = fornecedor, destinatário = nossa empresa
        emitente_cnpj = clean_cnpj(doc.get('emitente_cnpj', ''))
        emitente_nome = str(doc.get('emitente_nome', ''))[:60]
        emitente_uf = doc.get('emitente_uf', 'SP') or 'SP'
        
        for prod in produtos:
            item_count += 1
            row = []
            
            # 01: Sequencial (6 dígitos)
            row.append(str(item_count).zfill(6))
            
            # 02: CNPJ Emitente (fornecedor)
            row.append(f'"{emitente_cnpj}"')
            
            # 03: Nome Emitente
            row.append(f'"{emitente_nome}"')
            
            # 04: UF Emitente
            row.append(f'"{emitente_uf}"')
            
            # 05: Data Entrada
            row.append(f'"{data_emissao}"')
            
            # 06: Data Emissão
            row.append(f'"{data_emissao}"')
            
            # 07: Número NF
            row.append(numero_nfe)
            
            # 08: Espécie
            row.append(f'"{especie}"')
            
            # 09: Série
            row.append(f'"{serie}"')
            
            # 10: CFOP
            cfop = str(prod.get('cfop', ''))
            row.append(f'"{cfop}"')
            
            # 11: Código Produto
            codigo = str(prod.get('codigo', ''))
            row.append(f'"{codigo}"')
            
            # 12: Descrição Produto
            descricao = str(prod.get('descricao', ''))[:60]
            row.append(f'"{descricao}"')
            
            # 13: NCM
            ncm = str(prod.get('ncm', ''))
            row.append(f'"{ncm}"')
            
            # 14: Unidade
            unidade = str(prod.get('unidade', prod.get('uCom', 'UN')))
            row.append(f'"{unidade}"')
            
            # 15: Quantidade
            qtd = float(prod.get('quantidade', 0) or 0)
            row.append(format_number(qtd, 4))
            
            # 16: Valor Unitário
            valor_unit = float(prod.get('valor_unitario', 0) or 0)
            row.append(format_number(valor_unit, 4))
            
            # 17: Valor Total Produto
            valor_total = float(prod.get('valor_total', 0) or 0)
            row.append(format_number(valor_total))
            
            # 18: CST ICMS
            cst = str(prod.get('cst', '00'))
            row.append(f'"{cst}"')
            
            # 19: Base ICMS
            bc_icms = float(prod.get('v_bc_icms', 0) or prod.get('v_bc', 0) or 0)
            row.append(format_number(bc_icms))
            
            # 20: Alíquota ICMS
            aliq_icms = float(prod.get('p_icms', 0) or 0)
            row.append(format_number(aliq_icms, 2))
            
            # 21: Valor ICMS
            v_icms = float(prod.get('v_icms', 0) or 0)
            row.append(format_number(v_icms))
            
            # 22: CST PIS
            cst_pis = str(prod.get('cst_pis', prod.get('cst_pis_calculado', '50')))
            row.append(f'"{cst_pis}"')
            
            # 23: Base PIS (para crédito)
            bc_pis = valor_total if cst_pis in ['50', '51', '52', '53', '54', '55', '56'] else 0
            row.append(format_number(bc_pis))
            
            # 24: Alíquota PIS
            aliq_pis = 1.65 if bc_pis > 0 else 0  # Lucro Real
            row.append(format_number(aliq_pis, 2))
            
            # 25: Valor PIS (Crédito)
            v_pis = round(bc_pis * 0.0165, 2) if bc_pis > 0 else 0
            row.append(format_number(v_pis))
            
            # 26: CST COFINS
            cst_cofins = str(prod.get('cst_cofins', prod.get('cst_cofins_calculado', '50')))
            row.append(f'"{cst_cofins}"')
            
            # 27: Base COFINS (para crédito)
            bc_cofins = valor_total if cst_cofins in ['50', '51', '52', '53', '54', '55', '56'] else 0
            row.append(format_number(bc_cofins))
            
            # 28: Alíquota COFINS
            aliq_cofins = 7.6 if bc_cofins > 0 else 0  # Lucro Real
            row.append(format_number(aliq_cofins, 2))
            
            # 29: Valor COFINS (Crédito)
            v_cofins = round(bc_cofins * 0.076, 2) if bc_cofins > 0 else 0
            row.append(format_number(v_cofins))
            
            # 30: Chave NFe
            row.append(f'"{chave}"')
            
            # 31: Categoria (REVENDA/INSUMO/DESPESA)
            categoria = str(prod.get('categoria_classificada', ''))
            row.append(f'"{categoria.upper()}"')
            
            lines.append(",".join(row))
    
    # Cabeçalho
    header = [
        "SEQ", "CNPJ_EMIT", "NOME_EMIT", "UF_EMIT", "DT_ENTRADA", "DT_EMISSAO", "NUM_NF",
        "ESPECIE", "SERIE", "CFOP", "COD_PROD", "DESC_PROD", "NCM", "UNID",
        "QTD", "VL_UNIT", "VL_TOTAL", "CST_ICMS", "BC_ICMS", "ALIQ_ICMS", "VL_ICMS",
        "CST_PIS", "BC_PIS", "ALIQ_PIS", "VL_PIS",
        "CST_COFINS", "BC_COFINS", "ALIQ_COFINS", "VL_COFINS",
        "CHAVE_NFE", "CATEGORIA"
    ]
    
    return ",".join(header) + "\n" + "\n".join(lines)
