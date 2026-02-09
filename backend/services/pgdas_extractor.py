"""
Serviço para extração e processamento de arquivos PGDAS (PDF)
Extrai histórico de faturamento mensal para cálculo do RBT12
"""

import re
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def extrair_dados_pgdas(texto_pdf: str) -> Dict:
    """
    Extrai dados relevantes do texto do PGDAS para o Simples Nacional.
    
    Args:
        texto_pdf: Texto extraído do PDF do PGDAS
        
    Returns:
        Dict com dados extraídos: faturamento_mensal, rbt12, rba, tributos, etc.
    """
    resultado = {
        "sucesso": False,
        "periodo_apuracao": None,
        "cnpj": None,
        "razao_social": None,
        "rbt12": 0.0,
        "rba": 0.0,  # Receita bruta ano corrente
        "rbaa": 0.0,  # Receita bruta ano anterior
        "receita_pa": 0.0,  # Receita do período de apuração
        "faturamento_mensal": {},  # {"01/2024": 14110.00, ...}
        "tributos": {},  # {"IRPJ": 204.13, ...}
        "valor_das": 0.0,
        "erros": []
    }
    
    try:
        # Extrair CNPJ
        cnpj_match = re.search(r'CNPJ[:\s]*(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})', texto_pdf)
        if cnpj_match:
            resultado["cnpj"] = re.sub(r'[^\d]', '', cnpj_match.group(1))
        
        # Extrair Período de Apuração (PA)
        pa_match = re.search(r'Per[íi]odo de Apura[çc][ãa]o[:\s]*(\d{2}/\d{4})', texto_pdf)
        if pa_match:
            resultado["periodo_apuracao"] = pa_match.group(1)
        
        # Extrair RBT12
        rbt12_match = re.search(r'RBT12[):\s]*[\s\S]*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', texto_pdf)
        if rbt12_match:
            resultado["rbt12"] = converter_valor_br(rbt12_match.group(1))
        
        # Extrair RBA (Receita bruta acumulada no ano-calendário corrente)
        rba_match = re.search(r'RBA[):\s]*[\s\S]*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', texto_pdf)
        if rba_match:
            resultado["rba"] = converter_valor_br(rba_match.group(1))
        
        # Extrair RBAA (Receita bruta acumulada no ano-calendário anterior)
        rbaa_match = re.search(r'RBAA[):\s]*[\s\S]*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', texto_pdf)
        if rbaa_match:
            resultado["rbaa"] = converter_valor_br(rbaa_match.group(1))
        
        # Extrair Receita do PA
        rpa_match = re.search(r'(?:RPA|Receita Bruta do PA)[:\s]*[\s\S]*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', texto_pdf)
        if rpa_match:
            resultado["receita_pa"] = converter_valor_br(rpa_match.group(1))
        
        # Extrair faturamento mensal (Mercado Interno)
        # Padrão: MM/YYYY seguido de valor
        faturamento_pattern = re.compile(r'(\d{2}/\d{4})\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})')
        matches = faturamento_pattern.findall(texto_pdf)
        
        for mes, valor in matches:
            valor_float = converter_valor_br(valor)
            # Só adiciona se não existir ou se o valor for maior (evita mercado externo com 0)
            if mes not in resultado["faturamento_mensal"] or valor_float > resultado["faturamento_mensal"].get(mes, 0):
                resultado["faturamento_mensal"][mes] = valor_float
        
        # Extrair tributos
        tributos_patterns = {
            "IRPJ": r'IRPJ[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})',
            "CSLL": r'CSLL[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})',
            "COFINS": r'COFINS[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})',
            "PIS": r'PIS(?:/Pasep)?[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})',
            "CPP": r'(?:INSS|CPP)[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})',
            "ICMS": r'ICMS[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})',
            "ISS": r'ISS[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})',
            "IPI": r'IPI[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})'
        }
        
        for tributo, pattern in tributos_patterns.items():
            match = re.search(pattern, texto_pdf, re.IGNORECASE)
            if match:
                resultado["tributos"][tributo] = converter_valor_br(match.group(1))
        
        # Extrair valor total do DAS
        das_match = re.search(r'(?:Valor Total|Total Geral|D[ée]bito Declarado)[:\s]*[R\$\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', texto_pdf)
        if das_match:
            resultado["valor_das"] = converter_valor_br(das_match.group(1))
        
        # Validar se extraiu dados suficientes
        if resultado["faturamento_mensal"] or resultado["rbt12"] > 0:
            resultado["sucesso"] = True
        else:
            resultado["erros"].append("Não foi possível extrair dados de faturamento do PDF")
        
    except Exception as e:
        logger.error(f"Erro ao extrair dados do PGDAS: {e}")
        resultado["erros"].append(f"Erro no processamento: {str(e)}")
    
    return resultado


def converter_valor_br(valor_str: str) -> float:
    """
    Converte valor no formato brasileiro (1.234,56) para float.
    """
    try:
        # Remove espaços
        valor_str = valor_str.strip()
        # Remove pontos de milhar e troca vírgula por ponto
        valor_str = valor_str.replace('.', '').replace(',', '.')
        return float(valor_str)
    except:
        return 0.0


def comparar_faturamento_pgdas_sistema(
    faturamento_pgdas: Dict[str, float],
    faturamento_sistema: Dict[str, float],
    tolerancia: float = 0.01  # 1 centavo de tolerância
) -> Dict:
    """
    Compara o faturamento do PGDAS com o calculado pelo sistema.
    
    Args:
        faturamento_pgdas: Dict com faturamento por mês do PGDAS
        faturamento_sistema: Dict com faturamento por mês calculado pelo sistema
        tolerancia: Tolerância em reais para considerar valores iguais
        
    Returns:
        Dict com resultado da comparação
    """
    resultado = {
        "total_meses": 0,
        "meses_conferem": 0,
        "meses_divergentes": 0,
        "divergencias": [],
        "percentual_conferencia": 0.0
    }
    
    todos_meses = set(faturamento_pgdas.keys()) | set(faturamento_sistema.keys())
    resultado["total_meses"] = len(todos_meses)
    
    for mes in sorted(todos_meses):
        valor_pgdas = faturamento_pgdas.get(mes, 0.0)
        valor_sistema = faturamento_sistema.get(mes, 0.0)
        diferenca = abs(valor_pgdas - valor_sistema)
        
        if diferenca <= tolerancia:
            resultado["meses_conferem"] += 1
        else:
            resultado["meses_divergentes"] += 1
            resultado["divergencias"].append({
                "competencia": mes,
                "valor_pgdas": valor_pgdas,
                "valor_sistema": valor_sistema,
                "diferenca": round(valor_pgdas - valor_sistema, 2),
                "percentual_diferenca": round((diferenca / max(valor_pgdas, valor_sistema, 1)) * 100, 2)
            })
    
    if resultado["total_meses"] > 0:
        resultado["percentual_conferencia"] = round(
            (resultado["meses_conferem"] / resultado["total_meses"]) * 100, 2
        )
    
    return resultado


def gerar_historico_para_salvar(
    dados_pgdas: Dict,
    historico_existente: Dict[str, Dict] = None
) -> Dict[str, Dict]:
    """
    Gera o histórico de faturamento para salvar na empresa,
    mesclando dados do PGDAS com histórico existente.
    
    Cada entrada tem:
    - valor: float
    - origem: "pgdas" | "sistema"
    - data_importacao: datetime (se origem pgdas)
    - bloqueado: bool (True se origem pgdas)
    
    Args:
        dados_pgdas: Dados extraídos do PGDAS
        historico_existente: Histórico já salvo na empresa
        
    Returns:
        Dict com histórico atualizado
    """
    historico = historico_existente or {}
    data_importacao = datetime.now().isoformat()
    
    for mes, valor in dados_pgdas.get("faturamento_mensal", {}).items():
        historico[mes] = {
            "valor": valor,
            "origem": "pgdas",
            "data_importacao": data_importacao,
            "bloqueado": True
        }
    
    return historico


def calcular_rbt12_do_historico(
    historico: Dict[str, Dict],
    competencia_ref: str
) -> float:
    """
    Calcula o RBT12 (soma dos 12 meses anteriores) a partir do histórico.
    
    Args:
        historico: Histórico de faturamento da empresa
        competencia_ref: Competência de referência (MM/YYYY)
        
    Returns:
        Soma dos 12 meses anteriores
    """
    try:
        mes_ref, ano_ref = map(int, competencia_ref.split('/'))
        
        competencias_12m = []
        for i in range(1, 13):  # 12 meses anteriores (não inclui o mês atual)
            m = mes_ref - i
            a = ano_ref
            while m <= 0:
                m += 12
                a -= 1
            competencias_12m.append(f"{m:02d}/{a}")
        
        rbt12 = sum(
            historico.get(comp, {}).get("valor", 0)
            for comp in competencias_12m
        )
        
        return rbt12
    except Exception as e:
        logger.error(f"Erro ao calcular RBT12: {e}")
        return 0.0
