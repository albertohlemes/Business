"""
Serviço de Cálculo do Simples Nacional
Implementa as regras da LC 123/2006 com as atualizações da LC 155/2016

Anexos:
- Anexo I: Comércio
- Anexo II: Indústria
- Anexo III: Serviços (receitas de locação de bens móveis, agências de viagens, escritórios contábeis, etc.)
- Anexo IV: Serviços (construção civil, vigilância, limpeza, etc.) - SEM CPP
- Anexo V: Serviços (engenharia, medicina, odontologia, etc.) - Com Fator R

Faixas de Faturamento (RBT12):
1ª Faixa: Até R$ 180.000,00
2ª Faixa: De R$ 180.000,01 a R$ 360.000,00
3ª Faixa: De R$ 360.000,01 a R$ 720.000,00
4ª Faixa: De R$ 720.000,01 a R$ 1.800.000,00
5ª Faixa: De R$ 1.800.000,01 a R$ 3.600.000,00
6ª Faixa: De R$ 3.600.000,01 a R$ 4.800.000,00

Sublimite: R$ 3.600.000,00 (acima disso, recolhe ICMS/ISS por fora)
Limite: R$ 4.800.000,00 (acima disso, é excluído do Simples)
"""

from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

# ===========================================
# TABELAS DO SIMPLES NACIONAL
# ===========================================

# Faixas de faturamento (RBT12)
FAIXAS_SIMPLES = [
    {"faixa": 1, "limite_inferior": 0, "limite_superior": 180000, "descricao": "1ª Faixa"},
    {"faixa": 2, "limite_inferior": 180000.01, "limite_superior": 360000, "descricao": "2ª Faixa"},
    {"faixa": 3, "limite_inferior": 360000.01, "limite_superior": 720000, "descricao": "3ª Faixa"},
    {"faixa": 4, "limite_inferior": 720000.01, "limite_superior": 1800000, "descricao": "4ª Faixa"},
    {"faixa": 5, "limite_inferior": 1800000.01, "limite_superior": 3600000, "descricao": "5ª Faixa"},
    {"faixa": 6, "limite_inferior": 3600000.01, "limite_superior": 4800000, "descricao": "6ª Faixa"},
]

SUBLIMITE_ICMS_ISS = 3600000  # Acima disso, recolhe ICMS/ISS por fora
LIMITE_SIMPLES = 4800000  # Acima disso, excluído do Simples

# Alíquotas por Anexo e Faixa (Alíquota Nominal e Parcela a Deduzir)
# Fórmula: Alíquota Efetiva = (RBT12 × Alíquota Nominal - Parcela a Deduzir) / RBT12

TABELA_ANEXO_I = {  # Comércio
    1: {"aliquota": 4.00, "deducao": 0},
    2: {"aliquota": 7.30, "deducao": 5940},
    3: {"aliquota": 9.50, "deducao": 13860},
    4: {"aliquota": 10.70, "deducao": 22500},
    5: {"aliquota": 14.30, "deducao": 87300},
    6: {"aliquota": 19.00, "deducao": 378000},
}

TABELA_ANEXO_II = {  # Indústria
    1: {"aliquota": 4.50, "deducao": 0},
    2: {"aliquota": 7.80, "deducao": 5940},
    3: {"aliquota": 10.00, "deducao": 13860},
    4: {"aliquota": 11.20, "deducao": 22500},
    5: {"aliquota": 14.70, "deducao": 85500},
    6: {"aliquota": 30.00, "deducao": 720000},
}

TABELA_ANEXO_III = {  # Serviços (com CPP)
    1: {"aliquota": 6.00, "deducao": 0},
    2: {"aliquota": 11.20, "deducao": 9360},
    3: {"aliquota": 13.50, "deducao": 17640},
    4: {"aliquota": 16.00, "deducao": 35640},
    5: {"aliquota": 21.00, "deducao": 125640},
    6: {"aliquota": 33.00, "deducao": 648000},
}

TABELA_ANEXO_IV = {  # Serviços SEM CPP (construção, vigilância, limpeza)
    1: {"aliquota": 4.50, "deducao": 0},
    2: {"aliquota": 9.00, "deducao": 8100},
    3: {"aliquota": 10.20, "deducao": 12420},
    4: {"aliquota": 14.00, "deducao": 39780},
    5: {"aliquota": 22.00, "deducao": 183780},
    6: {"aliquota": 33.00, "deducao": 828000},
}

TABELA_ANEXO_V = {  # Serviços (engenharia, medicina, etc.) - Com Fator R
    1: {"aliquota": 15.50, "deducao": 0},
    2: {"aliquota": 18.00, "deducao": 4500},
    3: {"aliquota": 19.50, "deducao": 9900},
    4: {"aliquota": 20.50, "deducao": 17100},
    5: {"aliquota": 23.00, "deducao": 62100},
    6: {"aliquota": 30.50, "deducao": 540000},
}

# Repartição dos tributos por Anexo (% sobre o total do DAS)
REPARTICAO_ANEXO_I = {
    1: {"irpj": 5.50, "csll": 3.50, "cofins": 12.74, "pis": 2.76, "cpp": 41.50, "icms": 34.00},
    2: {"irpj": 5.50, "csll": 3.50, "cofins": 12.74, "pis": 2.76, "cpp": 41.50, "icms": 34.00},
    3: {"irpj": 5.50, "csll": 3.50, "cofins": 12.74, "pis": 2.76, "cpp": 42.00, "icms": 33.50},
    4: {"irpj": 5.50, "csll": 3.50, "cofins": 12.74, "pis": 2.76, "cpp": 42.00, "icms": 33.50},
    5: {"irpj": 5.50, "csll": 3.50, "cofins": 12.74, "pis": 2.76, "cpp": 42.00, "icms": 33.50},
    6: {"irpj": 13.50, "csll": 10.00, "cofins": 28.27, "pis": 6.13, "cpp": 42.10, "icms": 0.00},
}

REPARTICAO_ANEXO_II = {
    1: {"irpj": 5.50, "csll": 3.50, "cofins": 11.51, "pis": 2.49, "cpp": 37.50, "icms": 32.00, "ipi": 7.50},
    2: {"irpj": 5.50, "csll": 3.50, "cofins": 11.51, "pis": 2.49, "cpp": 37.50, "icms": 32.00, "ipi": 7.50},
    3: {"irpj": 5.50, "csll": 3.50, "cofins": 11.51, "pis": 2.49, "cpp": 37.50, "icms": 32.00, "ipi": 7.50},
    4: {"irpj": 5.50, "csll": 3.50, "cofins": 11.51, "pis": 2.49, "cpp": 37.50, "icms": 32.00, "ipi": 7.50},
    5: {"irpj": 5.50, "csll": 3.50, "cofins": 11.51, "pis": 2.49, "cpp": 37.50, "icms": 32.00, "ipi": 7.50},
    6: {"irpj": 8.50, "csll": 7.50, "cofins": 20.96, "pis": 4.54, "cpp": 23.50, "icms": 0.00, "ipi": 35.00},
}

REPARTICAO_ANEXO_III = {
    1: {"irpj": 4.00, "csll": 3.50, "cofins": 12.82, "pis": 2.78, "cpp": 43.40, "iss": 33.50},
    2: {"irpj": 4.00, "csll": 3.50, "cofins": 14.05, "pis": 3.05, "cpp": 43.40, "iss": 32.00},
    3: {"irpj": 4.00, "csll": 3.50, "cofins": 13.64, "pis": 2.96, "cpp": 43.40, "iss": 32.50},
    4: {"irpj": 4.00, "csll": 3.50, "cofins": 13.64, "pis": 2.96, "cpp": 43.40, "iss": 32.50},
    5: {"irpj": 4.00, "csll": 3.50, "cofins": 12.82, "pis": 2.78, "cpp": 43.40, "iss": 33.50},
    6: {"irpj": 35.00, "csll": 15.00, "cofins": 16.03, "pis": 3.47, "cpp": 30.50, "iss": 0.00},
}

REPARTICAO_ANEXO_IV = {  # SEM CPP - empresa paga INSS patronal separado
    1: {"irpj": 18.80, "csll": 15.20, "cofins": 17.67, "pis": 3.83, "iss": 44.50},
    2: {"irpj": 19.80, "csll": 15.20, "cofins": 20.55, "pis": 4.45, "iss": 40.00},
    3: {"irpj": 20.80, "csll": 15.20, "cofins": 19.73, "pis": 4.27, "iss": 40.00},
    4: {"irpj": 17.80, "csll": 19.20, "cofins": 18.90, "pis": 4.10, "iss": 40.00},
    5: {"irpj": 18.80, "csll": 19.20, "cofins": 18.08, "pis": 3.92, "iss": 40.00},
    6: {"irpj": 53.50, "csll": 21.50, "cofins": 20.55, "pis": 4.45, "iss": 0.00},
}

REPARTICAO_ANEXO_V = {
    1: {"irpj": 25.00, "csll": 15.00, "cofins": 14.10, "pis": 3.05, "cpp": 28.85, "iss": 14.00},
    2: {"irpj": 23.00, "csll": 15.00, "cofins": 14.10, "pis": 3.05, "cpp": 27.85, "iss": 17.00},
    3: {"irpj": 24.00, "csll": 15.00, "cofins": 14.92, "pis": 3.23, "cpp": 23.85, "iss": 19.00},
    4: {"irpj": 21.00, "csll": 15.00, "cofins": 15.74, "pis": 3.41, "cpp": 23.85, "iss": 21.00},
    5: {"irpj": 23.00, "csll": 12.50, "cofins": 14.10, "pis": 3.05, "cpp": 23.85, "iss": 23.50},
    6: {"irpj": 35.00, "csll": 15.50, "cofins": 16.44, "pis": 3.56, "cpp": 29.50, "iss": 0.00},
}

# Mapeamento CNAE Principal → Anexo Sugerido
# Simplificado - na prática são milhares de CNAEs
CNAE_PARA_ANEXO = {
    # Comércio - Anexo I
    "47": "I",  # Comércio varejista
    "46": "I",  # Comércio atacadista
    "45": "I",  # Comércio de veículos
    
    # Indústria - Anexo II
    "10": "II", # Alimentos
    "11": "II", # Bebidas
    "13": "II", # Têxteis
    "14": "II", # Vestuário
    "15": "II", # Couro e calçados
    "16": "II", # Madeira
    "17": "II", # Celulose e papel
    "18": "II", # Impressão
    "19": "II", # Coque e derivados
    "20": "II", # Químicos
    "21": "II", # Farmacêuticos
    "22": "II", # Borracha e plástico
    "23": "II", # Minerais não metálicos
    "24": "II", # Metalurgia
    "25": "II", # Produtos de metal
    "26": "II", # Eletrônicos
    "27": "II", # Elétricos
    "28": "II", # Máquinas
    "29": "II", # Veículos
    "30": "II", # Outros transportes
    "31": "II", # Móveis
    "32": "II", # Diversos
    "33": "II", # Manutenção de máquinas
    
    # Serviços - Anexo III (locação, agências, contabilidade, etc.)
    "77": "III", # Locação de bens móveis
    "79": "III", # Agências de viagem
    "69": "III", # Atividades jurídicas e contábeis
    "70": "III", # Consultoria
    "73": "III", # Publicidade
    "74": "III", # Outras atividades profissionais
    "78": "III", # Seleção e agenciamento de mão de obra
    "82": "III", # Serviços administrativos
    "85": "III", # Educação
    "63": "III", # TI - Tecnologia da informação
    "62": "III", # TI - Desenvolvimento de software
    
    # Serviços - Anexo IV (construção, vigilância, limpeza) - SEM CPP
    "41": "IV", # Construção de edifícios
    "42": "IV", # Obras de infraestrutura
    "43": "IV", # Serviços especializados construção
    "80": "IV", # Vigilância e segurança
    "81": "IV", # Limpeza
    
    # Serviços - Anexo V (engenharia, medicina, odontologia, etc.)
    "71": "V",  # Arquitetura e engenharia
    "86": "V",  # Saúde humana
    "87": "V",  # Serviços sociais
    "75": "V",  # Atividades veterinárias
    "90": "V",  # Atividades artísticas
    "93": "V",  # Esporte e recreação
}

# Fator R mínimo para migrar do Anexo V para Anexo III
FATOR_R_MINIMO = 0.28  # 28%


# ===========================================
# FUNÇÕES DE CÁLCULO
# ===========================================

def obter_anexos_por_cnaes(cnaes: List[str]) -> List[str]:
    """
    Sugere anexos do Simples Nacional baseado nos CNAEs da empresa.
    """
    anexos = set()
    
    for cnae in cnaes:
        cnae_limpo = cnae.replace(".", "").replace("-", "").replace("/", "")
        
        # Tentar match pelo grupo (2 primeiros dígitos)
        grupo = cnae_limpo[:2]
        if grupo in CNAE_PARA_ANEXO:
            anexos.add(CNAE_PARA_ANEXO[grupo])
        else:
            # Default para comércio se não encontrar
            if cnae_limpo.startswith("4"):
                anexos.add("I")
            elif cnae_limpo.startswith("1") or cnae_limpo.startswith("2") or cnae_limpo.startswith("3"):
                anexos.add("II")
            else:
                anexos.add("III")
    
    return sorted(list(anexos))


def obter_faixa_por_rbt12(rbt12: float) -> dict:
    """
    Retorna a faixa do Simples Nacional com base no RBT12.
    """
    for faixa in FAIXAS_SIMPLES:
        if faixa["limite_inferior"] <= rbt12 <= faixa["limite_superior"]:
            return faixa
    
    # Se ultrapassou o limite
    return {"faixa": 7, "limite_inferior": 4800000.01, "limite_superior": float('inf'), "descricao": "Excedido"}


def calcular_aliquota_efetiva(rbt12: float, anexo: str) -> dict:
    """
    Calcula a alíquota efetiva do Simples Nacional.
    Fórmula: (RBT12 × Alíquota Nominal - Parcela a Deduzir) / RBT12
    """
    if rbt12 <= 0:
        return {
            "faixa": 1,
            "faixa_descricao": "1ª Faixa",
            "aliquota_nominal": 0,
            "parcela_deducao": 0,
            "aliquota_efetiva": 0,
            "anexo": anexo
        }
    
    faixa_info = obter_faixa_por_rbt12(rbt12)
    faixa = min(faixa_info["faixa"], 6)  # Limitar a faixa 6
    
    # Selecionar tabela do anexo
    tabelas = {
        "I": TABELA_ANEXO_I,
        "II": TABELA_ANEXO_II,
        "III": TABELA_ANEXO_III,
        "IV": TABELA_ANEXO_IV,
        "V": TABELA_ANEXO_V,
    }
    
    tabela = tabelas.get(anexo, TABELA_ANEXO_I)
    dados_faixa = tabela.get(faixa, tabela[1])
    
    aliquota_nominal = dados_faixa["aliquota"]
    parcela_deducao = dados_faixa["deducao"]
    
    # Cálculo da alíquota efetiva
    aliquota_efetiva = ((rbt12 * (aliquota_nominal / 100)) - parcela_deducao) / rbt12 * 100
    aliquota_efetiva = max(0, aliquota_efetiva)  # Não pode ser negativa
    
    return {
        "faixa": faixa,
        "faixa_descricao": faixa_info["descricao"],
        "aliquota_nominal": aliquota_nominal,
        "parcela_deducao": parcela_deducao,
        "aliquota_efetiva": round(aliquota_efetiva, 4),  # 4 casas decimais para maior precisão
        "anexo": anexo
    }


def calcular_fator_r(folha_12m: float, rbt12: float, faturamento_competencia: float = 0) -> dict:
    """
    Calcula o Fator R e verifica se a empresa pode migrar do Anexo V para Anexo III.
    Fator R = (Folha de Pagamento 12 meses) / RBT12
    Se Fator R >= 28%, a empresa pode usar o Anexo III ao invés do V.
    
    Parâmetros:
    - folha_12m: Total de folha de pagamento dos últimos 12 meses
    - rbt12: Receita Bruta Total dos últimos 12 meses
    - faturamento_competencia: Faturamento da competência atual (para projeção)
    """
    if rbt12 <= 0:
        return {
            "fator_r": 0,
            "fator_r_percentual": "0.00%",
            "pode_usar_anexo_iii": False,
            "folha_necessaria_anexo_iii": 0,
            "economia_potencial": 0
        }
    
    fator_r = folha_12m / rbt12
    pode_usar_anexo_iii = fator_r >= FATOR_R_MINIMO
    
    # Quanto de folha precisaria para atingir 28% do RBT12 atual
    folha_necessaria = rbt12 * FATOR_R_MINIMO
    folha_faltando = max(0, folha_necessaria - folha_12m)
    
    # NOVO: Sugestão de folha considerando o faturamento da competência atual
    # O RBT12 do próximo mês será: RBT12 atual - faturamento mais antigo + faturamento_competencia
    # Simplificando, assumimos que o faturamento mais antigo = média mensal
    # Então o novo RBT12 será aproximadamente: RBT12 + faturamento_competencia - (RBT12/12)
    rbt12_projetado = rbt12
    if faturamento_competencia > 0:
        media_mensal = rbt12 / 12
        rbt12_projetado = rbt12 - media_mensal + faturamento_competencia
    
    # Folha sugerida baseada no RBT12 projetado (para manter os 28% no próximo período)
    folha_sugerida_projetada = rbt12_projetado * FATOR_R_MINIMO
    folha_mensal_sugerida = folha_sugerida_projetada / 12  # Valor mensal para atingir o objetivo
    
    # Calcular economia potencial (diferença entre Anexo V e III)
    aliq_v = calcular_aliquota_efetiva(rbt12, "V")
    aliq_iii = calcular_aliquota_efetiva(rbt12, "III")
    
    # Economia mensal estimada (sobre faturamento médio mensal)
    fat_mensal_medio = rbt12 / 12
    economia_mensal = fat_mensal_medio * (aliq_v["aliquota_efetiva"] - aliq_iii["aliquota_efetiva"]) / 100
    economia_anual = economia_mensal * 12
    
    return {
        "fator_r": round(fator_r, 4),
        "fator_r_percentual": f"{fator_r * 100:.2f}%",
        "pode_usar_anexo_iii": pode_usar_anexo_iii,
        "anexo_atual": "III" if pode_usar_anexo_iii else "V",
        "folha_atual": folha_12m,
        "folha_necessaria_anexo_iii": round(folha_necessaria, 2),
        "folha_faltando": round(folha_faltando, 2),
        # NOVO: Sugestão de folha considerando a competência atual
        "rbt12_projetado": round(rbt12_projetado, 2),
        "faturamento_competencia": round(faturamento_competencia, 2),
        "folha_sugerida_projetada": round(folha_sugerida_projetada, 2),
        "folha_mensal_sugerida": round(folha_mensal_sugerida, 2),
        "economia_potencial_mensal": round(economia_mensal, 2) if not pode_usar_anexo_iii else 0,
        "economia_potencial_anual": round(economia_anual, 2) if not pode_usar_anexo_iii else 0,
        "aliquota_anexo_v": aliq_v["aliquota_efetiva"],
        "aliquota_anexo_iii": aliq_iii["aliquota_efetiva"]
    }


def calcular_reparticao_tributos(valor_das: float, anexo: str, faixa: int) -> dict:
    """
    Calcula a repartição dos tributos dentro do DAS.
    """
    reparticoes = {
        "I": REPARTICAO_ANEXO_I,
        "II": REPARTICAO_ANEXO_II,
        "III": REPARTICAO_ANEXO_III,
        "IV": REPARTICAO_ANEXO_IV,
        "V": REPARTICAO_ANEXO_V,
    }
    
    reparticao = reparticoes.get(anexo, REPARTICAO_ANEXO_I)
    percentuais = reparticao.get(faixa, reparticao[1])
    
    tributos = {}
    for tributo, percentual in percentuais.items():
        tributos[tributo] = round(valor_das * percentual / 100, 2)
    
    tributos["total"] = valor_das
    
    return tributos


def calcular_das_periodo(faturamento_periodo: float, rbt12: float, anexo: str,
                         produtos_st: float = 0, produtos_monofasicos: float = 0,
                         produtos_aliquota_zero: float = 0) -> dict:
    """
    Calcula o DAS de um período (mês).
    
    Args:
        faturamento_periodo: Faturamento do mês
        rbt12: Receita Bruta dos últimos 12 meses
        anexo: Anexo do Simples (I, II, III, IV, V)
        produtos_st: Valor de produtos com Substituição Tributária (desconta ICMS)
        produtos_monofasicos: Valor de produtos monofásicos (desconta PIS/COFINS)
        produtos_aliquota_zero: Valor de produtos com alíquota zero de PIS/COFINS
    
    O cálculo do DAS no Simples Nacional para produtos com ST/monofásicos funciona assim:
    1. A receita total é tributada normalmente pela alíquota efetiva
    2. O desconto é a parcela do tributo específico (ICMS ou PIS/COFINS) que seria 
       cobrada sobre os produtos isentos
    
    Fórmula do desconto:
    - Desconto ICMS = produtos_st × alíquota_efetiva × (% ICMS na repartição / 100)
    - Desconto PIS/COFINS = produtos_monofasicos × alíquota_efetiva × (% PIS + % COFINS na repartição / 100)
    """
    aliquota_info = calcular_aliquota_efetiva(rbt12, anexo)
    aliquota = aliquota_info["aliquota_efetiva"]
    faixa = aliquota_info["faixa"]
    
    # Valor bruto do DAS (sobre toda a receita)
    valor_das_bruto = faturamento_periodo * (aliquota / 100)
    
    # Obter percentuais de repartição da tabela do anexo/faixa
    reparticoes = {
        "I": REPARTICAO_ANEXO_I,
        "II": REPARTICAO_ANEXO_II,
        "III": REPARTICAO_ANEXO_III,
        "IV": REPARTICAO_ANEXO_IV,
        "V": REPARTICAO_ANEXO_V,
    }
    reparticao_percentuais = reparticoes.get(anexo, REPARTICAO_ANEXO_I).get(faixa, {})
    
    # Calcular repartição em valores absolutos (para exibição)
    reparticao = calcular_reparticao_tributos(valor_das_bruto, anexo, faixa)
    
    # Descontos
    desconto_icms = 0
    desconto_pis_cofins = 0
    
    # ICMS-ST: produtos com substituição não pagam ICMS no DAS
    # Desconto = valor dos produtos ST × (alíquota efetiva) × (% ICMS na repartição / 100)
    if produtos_st > 0:
        percentual_icms = reparticao_percentuais.get("icms", 0)  # % do ICMS na composição do DAS
        # A alíquota de ICMS sobre os produtos ST seria: alíquota_efetiva × (% ICMS / 100)
        aliquota_icms_efetiva = aliquota * (percentual_icms / 100)
        desconto_icms = produtos_st * (aliquota_icms_efetiva / 100)
    
    # Monofásicos e Alíquota Zero: não pagam PIS/COFINS no DAS
    # Desconto = valor dos produtos × (alíquota efetiva) × (% PIS + % COFINS na repartição / 100)
    total_isento_pis_cofins = produtos_monofasicos + produtos_aliquota_zero
    if total_isento_pis_cofins > 0:
        percentual_pis = reparticao_percentuais.get("pis", 0)
        percentual_cofins = reparticao_percentuais.get("cofins", 0)
        aliquota_pis_cofins_efetiva = aliquota * ((percentual_pis + percentual_cofins) / 100)
        desconto_pis_cofins = total_isento_pis_cofins * (aliquota_pis_cofins_efetiva / 100)
    
    # Garantir que os descontos não excedam o valor bruto do DAS
    total_descontos = desconto_icms + desconto_pis_cofins
    if total_descontos > valor_das_bruto:
        # Proporcionalizar os descontos se excederem
        fator = valor_das_bruto / total_descontos
        desconto_icms = desconto_icms * fator
        desconto_pis_cofins = desconto_pis_cofins * fator
    
    # Valor final do DAS
    valor_das_final = max(0, valor_das_bruto - desconto_icms - desconto_pis_cofins)
    
    return {
        "faturamento": faturamento_periodo,
        "rbt12": rbt12,
        "anexo": anexo,
        "faixa": faixa,
        "faixa_descricao": aliquota_info["faixa_descricao"],
        "aliquota_nominal": aliquota_info["aliquota_nominal"],
        "aliquota_efetiva": aliquota,
        "valor_das_bruto": round(valor_das_bruto, 2),
        "reparticao": reparticao,
        "descontos": {
            "icms_st": round(desconto_icms, 2),
            "pis_cofins_monofasico": round(desconto_pis_cofins, 2),
            "total": round(desconto_icms + desconto_pis_cofins, 2),
            "produtos_st": round(produtos_st, 2),
            "produtos_monofasicos": round(produtos_monofasicos, 2),
            "produtos_aliquota_zero": round(produtos_aliquota_zero, 2)
        },
        "valor_das_final": round(valor_das_final, 2)
    }


def calcular_projecao_anual(faturamento_acumulado: float, meses_decorridos: int) -> dict:
    """
    Projeta o faturamento anual e verifica limites.
    """
    if meses_decorridos <= 0:
        meses_decorridos = 1
    
    media_mensal = faturamento_acumulado / meses_decorridos
    projecao_anual = media_mensal * 12
    
    # Verificar limites
    excede_sublimite = projecao_anual > SUBLIMITE_ICMS_ISS
    excede_limite = projecao_anual > LIMITE_SIMPLES
    
    # Calcular quando vai estourar (se projeção exceder)
    meses_para_sublimite = None
    meses_para_limite = None
    
    if media_mensal > 0:
        meses_para_sublimite = SUBLIMITE_ICMS_ISS / media_mensal
        meses_para_limite = LIMITE_SIMPLES / media_mensal
    
    # Margem disponível
    margem_sublimite = max(0, SUBLIMITE_ICMS_ISS - projecao_anual)
    margem_limite = max(0, LIMITE_SIMPLES - projecao_anual)
    
    # Consumo percentual
    consumo_sublimite = min(100, (projecao_anual / SUBLIMITE_ICMS_ISS) * 100)
    consumo_limite = min(100, (projecao_anual / LIMITE_SIMPLES) * 100)
    
    return {
        "faturamento_acumulado": faturamento_acumulado,
        "meses_decorridos": meses_decorridos,
        "media_mensal": round(media_mensal, 2),
        "projecao_anual": round(projecao_anual, 2),
        "sublimite": SUBLIMITE_ICMS_ISS,
        "limite": LIMITE_SIMPLES,
        "margem_sublimite": round(margem_sublimite, 2),
        "margem_limite": round(margem_limite, 2),
        "consumo_sublimite_percentual": round(consumo_sublimite, 2),
        "consumo_limite_percentual": round(consumo_limite, 2),
        "excede_sublimite": excede_sublimite,
        "excede_limite": excede_limite,
        "meses_para_sublimite": round(meses_para_sublimite, 1) if meses_para_sublimite else None,
        "meses_para_limite": round(meses_para_limite, 1) if meses_para_limite else None,
        "status": "EXCEDIDO" if excede_limite else ("SUBLIMITE" if excede_sublimite else "OK"),
        "alerta": gerar_alerta_projecao(projecao_anual, meses_decorridos)
    }


def gerar_alerta_projecao(projecao_anual: float, meses_decorridos: int) -> str:
    """
    Gera mensagem de alerta baseada na projeção.
    """
    _ = meses_decorridos  # Pode ser usado futuramente para alertas mais detalhados
    
    if projecao_anual > LIMITE_SIMPLES:
        return f"⚠️ ATENÇÃO: Projeção anual de R$ {projecao_anual:,.2f} excede o limite do Simples (R$ 4,8M). Se continuar nesse ritmo, será excluído do regime."
    elif projecao_anual > SUBLIMITE_ICMS_ISS:
        return f"⚠️ ATENÇÃO: Projeção anual de R$ {projecao_anual:,.2f} excede o sublimite (R$ 3,6M). ICMS e ISS serão recolhidos por fora."
    elif projecao_anual > SUBLIMITE_ICMS_ISS * 0.9:
        return f"⚡ Projeção anual de R$ {projecao_anual:,.2f} está próxima do sublimite. Monitore os próximos meses."
    elif projecao_anual < SUBLIMITE_ICMS_ISS * 0.5:
        margem = SUBLIMITE_ICMS_ISS - projecao_anual
        return f"✅ Situação tranquila! Margem de R$ {margem:,.2f} até o sublimite. Há espaço para crescer."
    else:
        return f"👍 Projeção anual de R$ {projecao_anual:,.2f} está dentro dos limites. Continue monitorando."

