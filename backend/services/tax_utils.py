"""
Tax calculation utilities and helpers
"""
from typing import Dict, Optional, List

# NCMs COM ALÍQUOTA ZERO (Tabela 4.3.13 SPED - Cesta Básica, Monofásicos, etc.)
NCMS_ALIQUOTA_ZERO_PREFIXOS = [
    '0105', '0206', '0210', '0302', '0405', '0506', '0510', '0511', '0713',
    '1006', '1101', '1102', '1103', '1104', '1106', '1502', '1517', '1701',
    '1901', '1902', '1905', '2101', '2106', '2201', '2202', '2710', '2711',
    '3002', '3003', '3004', '3401', '3826', '4011', '4013', '4103', '4801',
    '4802', '4810', '4818', '8443', '8469', '8470', '8471', '8472', '8502',
    '8503', '8517', '8525', '8702', '8714', '8901', '9018', '9021'
]

NCMS_ALIQUOTA_ZERO_COMPLETOS = [
    '02061000', '02063000', '02068000', '02102000', '02109900',
    '03029000', '04051000', '05069000', '05100010', '05111000',
    '05119910', '05119920', '07133319', '07133329', '07133399',
    '11010010', '15171000', '17011400', '17019900', '19012000',
    '19021100', '19021900', '19022000', '19023000', '19059090',
    '21069010', '22011000', '22029000', '27101911', '27101921',
    '27111100', '27111910', '27112100', '30029099', '30039099',
    '30049099', '34011190', '38260000', '40115000', '40132000',
    '48010010', '48010090', '48026191', '48026199', '48101989',
    '48102290', '48181000', '84433222', '84690039', '84701000',
    '84713012', '84713019', '84713090', '84715010', '84716052',
    '84716053', '84716090', '84719014', '84721000', '85023100',
    '85030090', '85171231', '85176241', '85176255', '85176262',
    '85176272', '85176277', '85258019', '87021000', '87029090',
    '87100000', '87142000', '89019000', '89061000', '90189099',
    '90213980', '90214000', '90219019', '90219082', '90219089',
    '90219091', '90219092', '90219099'
]

# CFOPs que geram crédito de PIS/COFINS (Lucro Real)
CFOPS_COM_CREDITO_PIS_COFINS = [
    '1101', '1102', '1111', '1113', '1116', '1117', '1118', '1120', '1121', '1122',
    '1124', '1125', '1126', '1128', '1401', '1403', '1501', '1651', '1652', '1653',
    '2101', '2102', '2111', '2113', '2116', '2117', '2118', '2120', '2121', '2122',
    '2124', '2125', '2126', '2128', '2401', '2403', '2501', '2651', '2652', '2653',
    '3101', '3102', '3126', '3127'
]

# CFOPs de ENTRADA que NÃO têm incidência de PIS/COFINS (CST 98)
CFOPS_ENTRADA_SEM_INCIDENCIA = [
    # Devoluções de venda (não geram crédito pois são anulação de receita)
    '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', '1210',
    '2201', '2202', '2203', '2204', '2205', '2206', '2207', '2208', '2209', '2210',
    # Transferências (operação interna)
    '1151', '1152', '1153', '1154', '1408', '1409', '1410',
    '2151', '2152', '2153', '2154', '2408', '2409', '2410',
    # Remessas/Retornos (não são compras)
    '1901', '1902', '1903', '1904', '1905', '1906', '1907', '1908', '1909',
    '1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1918',
    '1919', '1920', '1921', '1922', '1923', '1924', '1925', '1926', '1949',
    '2901', '2902', '2903', '2904', '2905', '2906', '2907', '2908', '2909',
    '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2918',
    '2919', '2920', '2921', '2922', '2923', '2924', '2925', '2926', '2949',
    # Importações com tratamento especial
    '3201', '3202', '3205', '3206', '3207', '3211', '3949'
]

# CFOPs de SAÍDA que NÃO têm incidência de PIS/COFINS (CST 49)
CFOPS_SAIDA_SEM_INCIDENCIA = [
    # Devoluções (não geram receita)
    '5201', '5202', '5205', '5206', '5207', '5208', '5209', '5210',
    '6201', '6202', '6205', '6206', '6207', '6208', '6209', '6210',
    # Transferências (operação interna, não gera receita)
    '5151', '5152', '5153', '5155', '5156', '5408', '5409', '5410',
    '6151', '6152', '6153', '6155', '6156', '6408', '6409', '6410',
    # Remessas (não são vendas)
    '5901', '5902', '5903', '5904', '5905', '5906', '5907', '5908', '5909',
    '5910', '5911', '5912', '5913', '5914', '5915', '5916', '5917', '5918',
    '5919', '5920', '5921', '5922', '5923', '5924', '5925', '5926', '5927',
    '5928', '5929', '5931', '5932', '5933', '5934', '5949',
    '6901', '6902', '6903', '6904', '6905', '6906', '6907', '6908', '6909',
    '6910', '6911', '6912', '6913', '6914', '6915', '6916', '6917', '6918',
    '6919', '6920', '6921', '6922', '6923', '6924', '6925', '6929', '6931',
    '6932', '6933', '6934', '6949',
    # Exportações (alíquota zero por operação)
    '7101', '7102', '7105', '7106', '7127', '7501', '7551', '7553', '7556',
    '7651', '7654', '7667', '7930', '7949'
]

# CFOPs de Substituição Tributária (não dão direito a crédito de ICMS)
CFOPS_ST = ['1403', '1409', '2403', '2409', '5403', '5405', '5409', '6403', '6404', '6409']

# CFOPs de Despesa/Uso e Consumo (não dão direito a crédito de ICMS)
CFOPS_DESPESA = [
    '1407', '2407',  # Compra para uso/consumo com ST
    '1556', '2556',  # Compra para uso/consumo
    '1557', '2557',  # Transferência para uso/consumo
    '1128', '2128',  # Compra para ativo imobilizado
    '1551', '2551',  # Compra ativo imobilizado
    '1553', '2553',  # Devolução de venda ativo imobilizado
    '1554', '2554',  # Retorno de remessa ativo imobilizado
    '1406', '2406',  # Compra energia elétrica para uso/consumo
    '1408', '2408',  # Transferência energia elétrica
    '1501', '2501',  # Entrada de mercadoria recebida com fim específico de exportação
    '1503', '2503',  # Entrada decorrente de devolução de produto remetido com fim específico de exportação
]

# Combinar todos os CFOPs sem direito a crédito de ICMS
CFOPS_SEM_CREDITO_ICMS = set(CFOPS_ST + CFOPS_DESPESA)

# Alíquotas padrão por regime tributário
ALIQUOTAS_PIS_COFINS = {
    'lucro_real': {'pis': 1.65, 'cofins': 7.6},
    'lucro_presumido': {'pis': 0.65, 'cofins': 3.0},
    'simples_nacional': {'pis': 0.0, 'cofins': 0.0}
}

# Alíquotas de ICMS por UF
ALIQUOTAS_ICMS_INTERNA = {
    'AC': 17, 'AL': 18, 'AP': 18, 'AM': 18, 'BA': 18, 'CE': 18, 'DF': 18,
    'ES': 17, 'GO': 17, 'MA': 18, 'MT': 17, 'MS': 17, 'MG': 18, 'PA': 17,
    'PB': 18, 'PR': 18, 'PE': 18, 'PI': 18, 'RJ': 20, 'RN': 18, 'RS': 18,
    'RO': 17.5, 'RR': 17, 'SC': 17, 'SP': 18, 'SE': 18, 'TO': 18
}


def is_ncm_aliquota_zero(ncm: str) -> bool:
    """Verifica se um NCM tem alíquota zero de PIS/COFINS"""
    if not ncm:
        return False
    ncm_clean = ncm.replace('.', '').replace('-', '').replace(' ', '')
    if ncm_clean in NCMS_ALIQUOTA_ZERO_COMPLETOS:
        return True
    for prefix in NCMS_ALIQUOTA_ZERO_PREFIXOS:
        if ncm_clean.startswith(prefix):
            return True
    return False


def is_cfop_sem_credito_icms(cfop: str) -> bool:
    """Verifica se um CFOP não dá direito a crédito de ICMS"""
    return cfop in CFOPS_SEM_CREDITO_ICMS


def get_aliquotas_regime(regime: str) -> dict:
    """Retorna as alíquotas de PIS/COFINS para um regime tributário"""
    return ALIQUOTAS_PIS_COFINS.get(regime, ALIQUOTAS_PIS_COFINS['lucro_presumido'])


def calcular_cst_pis_cofins(
    ncm: str, 
    cfop: str, 
    tipo_operacao: str, 
    cst_xml: str = None, 
    regime: str = 'lucro_real'
) -> Dict:
    """
    Calcula o CST correto de PIS/COFINS baseado nas regras fiscais.
    
    Regras:
    - CFOP sem incidência: Entrada CST 98, Saída CST 49
    - NCM com alíquota zero: Entrada CST 73, Saída CST 06
    - CFOP sem direito a crédito: Entrada CST 70 (sem crédito)
    - Normal (Lucro Real): Entrada CST 50 (com crédito), Saída CST 01 (tributado)
    - Lucro Presumido: Entrada CST 70 (sem crédito), Saída CST 01 (cumulativo)
    """
    primeiro_digito = cfop[0] if cfop else ''
    is_entrada = primeiro_digito in ['1', '2', '3'] or tipo_operacao == 'entrada'
    is_saida = primeiro_digito in ['5', '6', '7'] or tipo_operacao == 'saida'
    
    aliq_zero = is_ncm_aliquota_zero(ncm)
    cfop_com_credito = cfop in CFOPS_COM_CREDITO_PIS_COFINS if cfop else True
    
    cfop_sem_incidencia_entrada = cfop in CFOPS_ENTRADA_SEM_INCIDENCIA
    cfop_sem_incidencia_saida = cfop in CFOPS_SAIDA_SEM_INCIDENCIA
    
    cst_calculado = None
    motivo = ""
    sem_incidencia = False
    
    if is_entrada:
        if cfop_sem_incidencia_entrada:
            cst_calculado = '98'
            motivo = 'CFOP sem incidência de PIS/COFINS (remessa/devolução/transferência)'
            sem_incidencia = True
        elif aliq_zero:
            cst_calculado = '73'
            motivo = 'NCM com alíquota zero (Tabela 4.3.13 SPED)'
        elif regime == 'lucro_real' and cfop_com_credito:
            cst_calculado = '50'
            motivo = 'Operação com direito a crédito (Lucro Real)'
        else:
            cst_calculado = '70'
            motivo = 'CFOP sem direito a crédito' if not cfop_com_credito else 'Lucro Presumido (cumulativo)'
    elif is_saida:
        if cfop_sem_incidencia_saida:
            cst_calculado = '49'
            motivo = 'CFOP sem incidência de PIS/COFINS (remessa/devolução/transferência)'
            sem_incidencia = True
        elif aliq_zero:
            cst_calculado = '06'
            motivo = 'NCM com alíquota zero (Tabela 4.3.13 SPED)'
        else:
            cst_calculado = '01'
            motivo = 'Operação tributável - alíquota básica'
    
    # Verificar divergência com XML (apenas para saídas)
    divergente = False
    if is_saida and cst_xml and cst_calculado:
        cst_xml_str = str(cst_xml).strip().zfill(2)
        divergente = cst_xml_str != cst_calculado
    
    return {
        'cst_calculado': cst_calculado,
        'cst_xml': cst_xml,
        'divergente': divergente,
        'motivo': motivo,
        'aliq_zero': aliq_zero,
        'sem_incidencia': sem_incidencia
    }
