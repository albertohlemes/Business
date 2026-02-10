"""
Serviço de cálculo do DIFAL (Diferencial de Alíquota) para Simples Nacional
Aplicável apenas a entradas interestaduais (compras de outros estados)

Fundamentação Legal:
- LC 123/2006, Art. 13, §1º, XIII - Diferencial de alíquotas para Simples Nacional
- RICMS de cada estado - Alíquotas internas
- Convênio ICMS 93/2015 - Operações interestaduais
"""

from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Alíquotas internas padrão por UF (alíquota geral de ICMS)
# Fonte: RICMS de cada estado
ALIQUOTAS_INTERNAS_UF = {
    "AC": 19.0,  # RICMS/AC, Art. 20
    "AL": 19.0,  # RICMS/AL, Art. 17
    "AM": 20.0,  # RICMS/AM, Art. 12
    "AP": 18.0,  # RICMS/AP, Art. 23
    "BA": 20.5,  # RICMS/BA, Art. 15 (19% + 1,5% FUNCEP)
    "CE": 20.0,  # RICMS/CE, Art. 44 (18% + 2% FECOP)
    "DF": 20.0,  # RICMS/DF, Art. 18 (18% + 2% FCDF)
    "ES": 17.0,  # RICMS/ES, Art. 20
    "GO": 19.0,  # RICMS/GO, Art. 20 (17% + 2% PROTEGE)
    "MA": 22.0,  # RICMS/MA, Art. 23 (20% + 2% FUMACOP)
    "MG": 18.0,  # RICMS/MG, Art. 42
    "MS": 17.0,  # RICMS/MS, Art. 41
    "MT": 17.0,  # RICMS/MT, Art. 49
    "PA": 19.0,  # RICMS/PA, Art. 20 (17% + 2% FECOP)
    "PB": 20.0,  # RICMS/PB, Art. 13 (18% + 2% FUNCEP)
    "PE": 20.5,  # RICMS/PE, Art. 15 (18% + 2,5% FECEP)
    "PI": 21.0,  # RICMS/PI, Art. 20 (19% + 2% FECEP)
    "PR": 19.5,  # RICMS/PR, Art. 14 (19% + 0,5% FECOP)
    "RJ": 22.0,  # RICMS/RJ, Art. 14 (20% + 2% FECP)
    "RN": 20.0,  # RICMS/RN, Art. 27 (18% + 2% FECOP)
    "RO": 19.5,  # RICMS/RO, Art. 27 (17,5% + 2% FITHA)
    "RR": 20.0,  # RICMS/RR, Art. 46 (17% + 3% FECOEP)
    "RS": 17.0,  # RICMS/RS, Art. 27
    "SC": 17.0,  # RICMS/SC, Art. 19
    "SE": 19.0,  # RICMS/SE, Art. 40 (18% + 1% FECOP)
    "SP": 18.0,  # RICMS/SP, Art. 52
    "TO": 20.0,  # RICMS/TO, Art. 27 (18% + 2% FET)
}

# Alíquotas interestaduais (origem -> destino)
# Fonte: Resolução do Senado Federal nº 22/1989
ALIQUOTAS_INTERESTADUAIS = {
    # Alíquota de 7% - Sul/Sudeste para Norte/Nordeste/Centro-Oeste/ES
    "7": ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO"],
    # Alíquota de 12% - demais operações
    "12": ["MG", "PR", "RJ", "RS", "SC", "SP"],
}

# UFs do Sul/Sudeste (exceto ES)
UFS_SUL_SUDESTE = ["MG", "PR", "RJ", "RS", "SC", "SP"]

# CFOPs de entrada interestadual que podem ter DIFAL
CFOPS_ENTRADA_INTERESTADUAL = [
    "2101", "2102", "2111", "2113", "2116", "2117", "2118", "2120", "2121", "2122",
    "2124", "2125", "2126", "2128", "2151", "2152", "2153", "2154", "2201", "2202",
    "2203", "2204", "2205", "2206", "2207", "2208", "2209", "2251", "2252", "2253",
    "2254", "2255", "2256", "2257", "2301", "2302", "2303", "2304", "2305", "2306",
    "2351", "2352", "2353", "2354", "2355", "2356", "2401", "2403", "2406", "2407",
    "2408", "2409", "2410", "2411", "2414", "2415", "2501", "2503", "2504", "2505",
    "2506", "2551", "2552", "2553", "2554", "2555", "2556", "2557", "2603", "2651",
    "2652", "2653", "2658", "2659", "2660", "2661", "2662", "2663", "2664", "2901",
    "2902", "2903", "2904", "2905", "2906", "2907", "2908", "2909", "2910", "2911",
    "2912", "2913", "2914", "2915", "2916", "2917", "2918", "2919", "2920", "2921",
    "2922", "2923", "2924", "2925", "2931", "2932", "2933", "2949",
]

# CFOPs de ativo imobilizado
CFOPS_ATIVO_IMOBILIZADO = ["2551", "2552", "2553", "2554", "2555"]

# CFOPs de uso e consumo
CFOPS_USO_CONSUMO = ["2556", "2557"]

# CSTs que indicam ST (não tem DIFAL)
CSTS_SUBSTITUICAO_TRIBUTARIA = ["10", "30", "60", "70", "201", "202", "203", "500"]


def obter_aliquota_interestadual(uf_origem: str, uf_destino: str) -> float:
    """
    Retorna a alíquota interestadual entre dois estados.
    
    Regra:
    - 7% quando origem é Sul/Sudeste e destino é N/NE/CO/ES
    - 12% nas demais operações
    - 4% para produtos importados (não implementado aqui)
    
    Fundamentação: Resolução do Senado Federal nº 22/1989
    """
    uf_origem = uf_origem.upper()
    uf_destino = uf_destino.upper()
    
    # Mesma UF = operação interna, não é interestadual
    if uf_origem == uf_destino:
        return 0.0
    
    # Sul/Sudeste (exceto ES) para demais regiões = 7%
    if uf_origem in UFS_SUL_SUDESTE and uf_destino in ALIQUOTAS_INTERESTADUAIS["7"]:
        return 7.0
    
    # Demais operações = 12%
    return 12.0


def obter_aliquota_interna(uf: str, ncm: str = None) -> dict:
    """
    Retorna a alíquota interna do estado e o embasamento legal.
    
    Args:
        uf: UF do destino (empresa)
        ncm: NCM do produto (para alíquotas diferenciadas - futuro)
    
    Returns:
        Dict com aliquota e embasamento
    """
    uf = uf.upper()
    aliquota = ALIQUOTAS_INTERNAS_UF.get(uf, 18.0)
    
    # Embasamento legal por UF
    embasamentos = {
        "SP": "RICMS/SP, Art. 52, I",
        "RJ": "RICMS/RJ, Art. 14, I + Art. 14-A (FECP)",
        "MG": "RICMS/MG, Art. 42, I",
        "PR": "RICMS/PR, Art. 14, I",
        "RS": "RICMS/RS, Art. 27, I",
        "SC": "RICMS/SC, Art. 19, I",
        "BA": "RICMS/BA, Art. 15, I + Art. 16-A (FUNCEP)",
        "PE": "RICMS/PE, Art. 15, I + Art. 15-A (FECEP)",
        "CE": "RICMS/CE, Art. 44, I + Art. 44-A (FECOP)",
        "GO": "RICMS/GO, Art. 20, I + Lei 14.469/03 (PROTEGE)",
        "ES": "RICMS/ES, Art. 20, I",
        "MT": "RICMS/MT, Art. 49, I",
        "MS": "RICMS/MS, Art. 41, I",
        "DF": "RICMS/DF, Art. 18, I + Lei 4.220/08 (FCDF)",
        "PA": "RICMS/PA, Art. 20, I + Art. 20-A (FECOP)",
        "AM": "RICMS/AM, Art. 12, I",
        "MA": "RICMS/MA, Art. 23, I + Art. 23-A (FUMACOP)",
        "PI": "RICMS/PI, Art. 20, I + Art. 20-A (FECEP)",
        "RN": "RICMS/RN, Art. 27, I + Art. 27-A (FECOP)",
        "PB": "RICMS/PB, Art. 13, I + Art. 13-A (FUNCEP)",
        "SE": "RICMS/SE, Art. 40, I + Art. 40-A (FECOP)",
        "AL": "RICMS/AL, Art. 17, I",
        "AC": "RICMS/AC, Art. 20, I",
        "AP": "RICMS/AP, Art. 23, I",
        "RO": "RICMS/RO, Art. 27, I + Lei 1.613/06 (FITHA)",
        "RR": "RICMS/RR, Art. 46, I + Art. 46-A (FECOEP)",
        "TO": "RICMS/TO, Art. 27, I + Lei 1.303/02 (FET)",
    }
    
    return {
        "aliquota": aliquota,
        "embasamento": embasamentos.get(uf, f"RICMS/{uf}, Alíquota Geral"),
        "uf": uf
    }


def verificar_produto_tem_difal(cst: str, cfop: str) -> dict:
    """
    Verifica se um produto está sujeito ao DIFAL.
    
    Regras:
    - Produtos com ST (CST 10, 30, 60, 70, 201, 202, 203, 500) = SEM DIFAL
    - Demais produtos (revenda, uso/consumo, ativo) = COM DIFAL
    
    Fundamentação: LC 123/2006, Art. 13, §1º, XIII
    """
    cst_str = str(cst).zfill(2) if cst else ""
    cfop_str = str(cfop).replace(".", "") if cfop else ""
    
    # Verificar se é ST
    if cst_str in CSTS_SUBSTITUICAO_TRIBUTARIA:
        return {
            "tem_difal": False,
            "motivo": "Substituição Tributária - ICMS já recolhido na origem",
            "embasamento": "LC 123/2006, Art. 13, §1º, XIII, 'h' - Exclusão da ST"
        }
    
    # Verificar tipo de operação
    tipo_operacao = "Revenda"
    if cfop_str in CFOPS_ATIVO_IMOBILIZADO:
        tipo_operacao = "Ativo Imobilizado"
    elif cfop_str in CFOPS_USO_CONSUMO:
        tipo_operacao = "Uso/Consumo"
    
    return {
        "tem_difal": True,
        "motivo": f"Operação de {tipo_operacao} - Sujeita ao DIFAL",
        "embasamento": "LC 123/2006, Art. 13, §1º, XIII - Diferencial de alíquotas nas aquisições interestaduais",
        "tipo_operacao": tipo_operacao
    }


def calcular_difal_produto(
    valor_operacao: float,
    aliquota_interestadual: float,
    aliquota_interna: float,
    icms_st_nf: float = 0.0
) -> dict:
    """
    Calcula o DIFAL de um produto.
    
    Fórmula DIFAL Simples Nacional:
    DIFAL = (Valor da Operação × Alíquota Interna) - (Valor da Operação × Alíquota Interestadual)
    
    Simplificado:
    DIFAL = Valor da Operação × (Alíquota Interna - Alíquota Interestadual)
    
    Fundamentação: LC 123/2006, Art. 13, §1º, XIII
    """
    if aliquota_interna <= aliquota_interestadual:
        return {
            "valor_difal": 0.0,
            "base_calculo": valor_operacao,
            "diferenca_aliquota": 0.0,
            "icms_origem": round(valor_operacao * (aliquota_interestadual / 100), 2),
            "icms_destino": round(valor_operacao * (aliquota_interna / 100), 2),
            "observacao": "Alíquota interestadual >= Alíquota interna. Sem DIFAL a recolher."
        }
    
    diferenca = aliquota_interna - aliquota_interestadual
    icms_origem = round(valor_operacao * (aliquota_interestadual / 100), 2)
    icms_destino = round(valor_operacao * (aliquota_interna / 100), 2)
    valor_difal = round(valor_operacao * (diferenca / 100), 2)
    
    return {
        "valor_difal": valor_difal,
        "base_calculo": valor_operacao,
        "diferenca_aliquota": diferenca,
        "aliquota_interestadual": aliquota_interestadual,
        "aliquota_interna": aliquota_interna,
        "icms_origem": icms_origem,
        "icms_destino": icms_destino,
        "icms_st_nf": icms_st_nf
    }


def verificar_convenio_icms(uf_origem: str, uf_destino: str, ncm: str) -> dict:
    """
    Verifica se existe convênio ICMS entre os estados para o produto.
    
    Se não há convênio, a empresa precisa recolher GNRE/DARE antes da entrada.
    
    Returns:
        Dict com informações sobre convênio e alertas
    """
    # Lista simplificada de NCMs sujeitos a convênios de ST
    # Na prática, isso deveria consultar uma base de dados de convênios
    ncms_convenio_nacional = [
        "2710",  # Combustíveis
        "2711",  # GLP
        "2201",  # Água mineral
        "2202",  # Bebidas
        "2203",  # Cerveja
        "2204",  # Vinho
        "2206",  # Outras bebidas fermentadas
        "2208",  # Bebidas destiladas
        "3004",  # Medicamentos
        "8703",  # Veículos
        "4011",  # Pneus
    ]
    
    ncm_4d = ncm[:4] if ncm else ""
    
    # Verificar se NCM está em convênio nacional (todos estados)
    if ncm_4d in ncms_convenio_nacional:
        return {
            "tem_convenio": True,
            "tipo": "nacional",
            "observacao": f"NCM {ncm} possui convênio ICMS nacional. ICMS-ST deve vir destacado na NF.",
            "alerta": None
        }
    
    # Para NCMs sem convênio nacional, pode haver convênio bilateral
    # Aqui seria necessária uma base de dados de convênios por UF
    return {
        "tem_convenio": False,
        "tipo": None,
        "observacao": f"NCM {ncm} pode não ter convênio entre {uf_origem} e {uf_destino}.",
        "alerta": {
            "tipo": "warning",
            "mensagem": f"ATENÇÃO: Verificar se existe convênio ICMS entre {uf_origem} e {uf_destino} para NCM {ncm}. Se não houver convênio e o produto for ST no destino, a GNRE deve ser recolhida antes da entrada da mercadoria.",
            "embasamento": "Convênio ICMS 142/2018 - Regime de ST entre UFs"
        }
    }


def processar_documento_difal(
    documento: dict,
    uf_empresa: str
) -> dict:
    """
    Processa um documento fiscal e calcula DIFAL de todos os produtos.
    
    Args:
        documento: Dict com dados do documento fiscal
        uf_empresa: UF da empresa (destino)
    
    Returns:
        Dict com dados do documento e cálculos de DIFAL
    """
    # Suporta ambos os nomes de campo (compatibilidade)
    uf_origem = (documento.get("emitente_uf", "") or documento.get("uf_emitente", "") or "").upper()
    uf_destino = uf_empresa.upper()
    
    # Verificar se é operação interestadual
    if uf_origem == uf_destino or not uf_origem:
        return None
    
    produtos_com_difal = []
    produtos_sem_difal = []
    total_difal = 0.0
    total_base_calculo = 0.0
    alertas = []
    
    # Obter alíquotas
    aliq_interestadual = obter_aliquota_interestadual(uf_origem, uf_destino)
    info_aliq_interna = obter_aliquota_interna(uf_destino)
    aliq_interna = info_aliq_interna["aliquota"]
    
    produtos = documento.get("produtos", [])
    
    for idx, prod in enumerate(produtos):
        ncm = prod.get("ncm", "")
        cfop = prod.get("cfop", "")
        cst = prod.get("cst", "")
        valor_total = prod.get("valor_total", 0) or prod.get("valor_produto", 0) or 0
        icms_st = prod.get("icms_st", 0) or 0
        
        # Usar alíquota da NF se disponível
        aliq_icms_nf = prod.get("aliquota_icms", aliq_interestadual)
        
        # Verificar se tem DIFAL
        verificacao = verificar_produto_tem_difal(cst, cfop)
        
        # Calcular DIFAL se aplicável
        if verificacao["tem_difal"]:
            calculo = calcular_difal_produto(
                valor_operacao=valor_total,
                aliquota_interestadual=aliq_icms_nf,
                aliquota_interna=aliq_interna,
                icms_st_nf=icms_st
            )
            
            # Verificar convênio
            convenio = verificar_convenio_icms(uf_origem, uf_destino, ncm)
            if convenio.get("alerta"):
                alertas.append(convenio["alerta"])
            
            produtos_com_difal.append({
                "item": idx + 1,
                "ncm": ncm,
                "descricao": prod.get("descricao", ""),
                "cfop": cfop,
                "cst": cst,
                "valor_produto": valor_total,
                "aliquota_interestadual": aliq_icms_nf,
                "aliquota_interna": aliq_interna,
                "diferenca_aliquota": calculo["diferenca_aliquota"],
                "valor_difal": calculo["valor_difal"],
                "tipo_operacao": verificacao.get("tipo_operacao", "Revenda"),
                "embasamento": verificacao["embasamento"],
                "convenio": convenio
            })
            
            total_difal += calculo["valor_difal"]
            total_base_calculo += valor_total
        else:
            produtos_sem_difal.append({
                "item": idx + 1,
                "ncm": ncm,
                "descricao": prod.get("descricao", ""),
                "cfop": cfop,
                "cst": cst,
                "valor_produto": valor_total,
                "motivo_isencao": verificacao["motivo"],
                "embasamento": verificacao["embasamento"]
            })
    
    return {
        "numero_nf": documento.get("numero_nfe", "") or documento.get("numero", ""),
        "serie": documento.get("serie", ""),
        "chave": documento.get("chave_nfe", "") or documento.get("chave_acesso", ""),
        "data_emissao": documento.get("data_emissao", ""),
        "emitente": documento.get("emitente_nome", "") or documento.get("emitente", ""),
        "cnpj_emitente": documento.get("emitente_cnpj", "") or documento.get("cnpj_emitente", ""),
        "uf_origem": uf_origem,
        "uf_destino": uf_destino,
        "valor_total_nf": documento.get("valor_total", 0),
        "aliquota_interestadual_padrao": aliq_interestadual,
        "aliquota_interna": aliq_interna,
        "embasamento_aliquota_interna": info_aliq_interna["embasamento"],
        "total_base_calculo_difal": round(total_base_calculo, 2),
        "total_difal": round(total_difal, 2),
        "qtd_produtos_com_difal": len(produtos_com_difal),
        "qtd_produtos_sem_difal": len(produtos_sem_difal),
        "produtos_com_difal": produtos_com_difal,
        "produtos_sem_difal": produtos_sem_difal,
        "alertas": alertas
    }
