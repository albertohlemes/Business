"""
Módulo Reforma Tributária - IVA Dual (CBS + IBS)
================================================
Implementação conforme Manual de Engenharia Tributária - AURION
Cenário: 2027 (Transição para Não-Cumulatividade Plena)
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
import re

# ============================================================
# TABELAS DE DOMÍNIO
# ============================================================

# CST IBS/CBS - Entradas (Créditos)
CST_ENTRADA = {
    '50': {'descricao': 'Com Direito a Crédito (Integral)', 'percentual': Decimal('1.00')},
    '51': {'descricao': 'Com Direito a Crédito (Reduzida)', 'percentual': Decimal('1.00')},  # Já reduzido na origem
    '52': {'descricao': 'Com Direito a Crédito (Monofásico)', 'percentual': Decimal('1.00')},
    '70': {'descricao': 'Sem Direito a Crédito', 'percentual': Decimal('0.00')},
}

# CST IBS/CBS - Saídas (Débitos)
CST_SAIDA = {
    '00': {'descricao': 'Tributada Integralmente', 'percentual': Decimal('1.00')},
    '01': {'descricao': 'Tributada com Redução de 60%', 'percentual': Decimal('0.40')},
    '02': {'descricao': 'Tributada com Redução de 30%', 'percentual': Decimal('0.70')},
    '03': {'descricao': 'Alíquota Zero', 'percentual': Decimal('0.00')},
    '04': {'descricao': 'Imunidade / Não Incidência', 'percentual': Decimal('0.00')},
    '05': {'descricao': 'Suspensão / Diferimento', 'percentual': Decimal('0.00')},
}

# CFOP que geram CRÉDITO (Entradas)
CFOPS_CREDITO = {
    # Compras para Industrialização/Comercialização
    '1101': '50', '1102': '50', '1111': '50', '1113': '50', '1116': '50', '1117': '50',
    '1118': '50', '1120': '50', '1121': '50', '1122': '50', '1124': '50', '1125': '50',
    '1126': '50', '1128': '50', '1151': '50', '1152': '50', '1153': '50', '1154': '50',
    '1201': '50', '1202': '50', '1203': '50', '1204': '50', '1205': '50', '1206': '50',
    '1207': '50', '1208': '50', '1209': '50', '1210': '50',
    '2101': '50', '2102': '50', '2111': '50', '2113': '50', '2116': '50', '2117': '50',
    '2118': '50', '2120': '50', '2121': '50', '2122': '50', '2124': '50', '2125': '50',
    '2126': '50', '2128': '50', '2151': '50', '2152': '50', '2153': '50', '2154': '50',
    '2201': '50', '2202': '50', '2203': '50', '2204': '50', '2205': '50', '2206': '50',
    '2207': '50', '2208': '50', '2209': '50', '2210': '50',
    # Material de Uso e Consumo - Crédito Integral
    '1556': '50', '2556': '50',
    # Ativo Imobilizado - Crédito Imediato (Fim do CIAP)
    '1551': '50', '2551': '50',
    # Aquisição de Serviços Tributados
    '1933': '50', '2933': '50', '1932': '50', '2932': '50',
    # Energia Elétrica - Crédito Integral
    '1252': '50', '2252': '50', '1253': '50', '2253': '50',
    # Comunicação - Crédito Integral
    '1301': '50', '2301': '50', '1302': '50', '2302': '50',
    # Transporte - Crédito Integral
    '1351': '50', '2351': '50', '1352': '50', '2352': '50', '1353': '50', '2353': '50',
}

# CFOP que geram DÉBITO (Saídas)
CFOPS_DEBITO = {
    # Vendas de Produção ou Revenda
    '5101': '00', '5102': '00', '5103': '00', '5104': '00', '5105': '00', '5106': '00',
    '5109': '00', '5110': '00', '5111': '00', '5112': '00', '5113': '00', '5114': '00',
    '5115': '00', '5116': '00', '5117': '00', '5118': '00', '5119': '00', '5120': '00',
    '5122': '00', '5123': '00', '5124': '00', '5125': '00',
    '6101': '00', '6102': '00', '6103': '00', '6104': '00', '6105': '00', '6106': '00',
    '6109': '00', '6110': '00', '6111': '00', '6112': '00', '6113': '00', '6114': '00',
    '6115': '00', '6116': '00', '6117': '00', '6118': '00', '6119': '00', '6120': '00',
    '6122': '00', '6123': '00', '6124': '00', '6125': '00',
    # Outras Saídas (Brindes, Doações) - Débito pelo valor de mercado
    '5949': '00', '6949': '00', '5910': '00', '6910': '00',
    # Remessa para Conserto/Reparo - Suspensão
    '5915': '05', '6915': '05', '5916': '05', '6916': '05',
    # Exportação - Imunidade
    '7101': '04', '7102': '04', '7105': '04', '7106': '04', '7127': '04',
    '7501': '04', '7504': '04', '7551': '04', '7553': '04',
}

# NCM Cesta Básica Nacional - Alíquota Zero (CST 03)
NCM_CESTA_BASICA = [
    '0201', '0202', '0203', '0204', '0207',  # Carnes
    '0302', '0303', '0304',  # Peixes
    '1006',  # Arroz
    '0713',  # Feijões
    '0401', '0402', '0405',  # Leite, Fórmulas, Manteiga
    '0714', '1106', '1101',  # Mandioca, Farinhas, Trigo
    '0901',  # Café
    '1507', '1508', '1509', '1510', '1511', '1512', '1513', '1514', '1515', '1516', '1517',  # Óleos
    '1701',  # Açúcar
    '9619',  # Absorventes
]

# NCM Imposto Seletivo - Sobretaxa
NCM_IMPOSTO_SELETIVO = {
    '2402': {'descricao': 'Cigarros/Tabaco', 'aliquota_is': Decimal('0.30')},
    '2403': {'descricao': 'Outros Tabacos', 'aliquota_is': Decimal('0.30')},
    '2203': {'descricao': 'Cerveja de Malte', 'aliquota_is': Decimal('0.25')},
    '2204': {'descricao': 'Vinhos', 'aliquota_is': Decimal('0.20')},
    '2205': {'descricao': 'Vermutes', 'aliquota_is': Decimal('0.20')},
    '2206': {'descricao': 'Outras Bebidas Fermentadas', 'aliquota_is': Decimal('0.20')},
    '2207': {'descricao': 'Álcool Etílico', 'aliquota_is': Decimal('0.20')},
    '2208': {'descricao': 'Bebidas Destiladas', 'aliquota_is': Decimal('0.25')},
    '2202': {'descricao': 'Bebidas Açucaradas (Refrigerantes)', 'aliquota_is': Decimal('0.20')},
    '8703': {'descricao': 'Veículos Automotores', 'aliquota_is': Decimal('0.15')},
    '8802': {'descricao': 'Aeronaves', 'aliquota_is': Decimal('0.15')},
    '8903': {'descricao': 'Iates e Embarcações', 'aliquota_is': Decimal('0.15')},
}

# NCM com Redução de 60% (CST 01)
NCM_REDUCAO_60 = [
    '3001', '3002', '3003', '3004', '3005', '3006',  # Medicamentos
    '3808',  # Inseticidas, Fungicidas, Herbicidas
    '3101', '3102', '3103', '3104', '3105',  # Fertilizantes
    '9018', '9019', '9020', '9021', '9022',  # Equipamentos Médicos
    '8713',  # Cadeiras de Rodas
    '3401',  # Sabonetes
    '3306',  # Creme Dental
]

# NCM com Redução de 30% (CST 02)
NCM_REDUCAO_30 = [
    '8471',  # Computadores
    '8473',  # Partes de Computadores
    '8528',  # Monitores
]


@dataclass
class ConfiguracaoReformaTributaria:
    """Configuração das alíquotas da Reforma Tributária"""
    aliquota_cbs: Decimal = Decimal('8.80')
    aliquota_ibs: Decimal = Decimal('17.70')
    
    @property
    def aliquota_total(self) -> Decimal:
        return self.aliquota_cbs + self.aliquota_ibs


@dataclass 
class ResultadoClassificacao:
    """Resultado da classificação de um documento para a Reforma Tributária"""
    cst_cbs_ibs: str
    descricao_cst: str
    base_calculo: Decimal
    aliquota_cbs: Decimal
    aliquota_ibs: Decimal
    valor_cbs: Decimal
    valor_ibs: Decimal
    valor_total: Decimal
    tipo_operacao: str  # 'credito' ou 'debito'
    tem_imposto_seletivo: bool = False
    aliquota_is: Decimal = Decimal('0')
    valor_is: Decimal = Decimal('0')
    motivo_reducao: str = ''
    ncm: str = ''
    cfop: str = ''


def normalizar_ncm(ncm: str) -> str:
    """Remove formatação do NCM e retorna apenas números"""
    if not ncm:
        return ''
    return re.sub(r'[^\d]', '', str(ncm))


def obter_prefixo_ncm(ncm: str, tamanho: int = 4) -> str:
    """Obtém o prefixo do NCM para comparação"""
    ncm_limpo = normalizar_ncm(ncm)
    return ncm_limpo[:tamanho] if len(ncm_limpo) >= tamanho else ncm_limpo


def verificar_cesta_basica(ncm: str) -> bool:
    """Verifica se o NCM pertence à Cesta Básica Nacional"""
    ncm_limpo = normalizar_ncm(ncm)
    for ncm_cesta in NCM_CESTA_BASICA:
        if ncm_limpo.startswith(ncm_cesta):
            return True
    return False


def verificar_imposto_seletivo(ncm: str) -> Tuple[bool, Decimal, str]:
    """Verifica se o NCM está sujeito ao Imposto Seletivo"""
    ncm_limpo = normalizar_ncm(ncm)
    for ncm_is, info in NCM_IMPOSTO_SELETIVO.items():
        if ncm_limpo.startswith(ncm_is):
            return True, info['aliquota_is'], info['descricao']
    return False, Decimal('0'), ''


def verificar_reducao_aliquota(ncm: str) -> Tuple[str, str]:
    """Verifica se o NCM tem redução de alíquota. Retorna (CST, motivo)"""
    ncm_limpo = normalizar_ncm(ncm)
    
    # Redução de 60%
    for ncm_red in NCM_REDUCAO_60:
        if ncm_limpo.startswith(ncm_red):
            return '01', 'Redução de 60% - Medicamentos/Equipamentos Médicos/Insumos Agro'
    
    # Redução de 30%
    for ncm_red in NCM_REDUCAO_30:
        if ncm_limpo.startswith(ncm_red):
            return '02', 'Redução de 30% - Equipamentos de Informática'
    
    return '', ''


def classificar_entrada(
    cfop: str,
    ncm: str,
    valor_total: Decimal,
    config: ConfiguracaoReformaTributaria
) -> ResultadoClassificacao:
    """
    Classifica uma operação de ENTRADA e calcula os créditos de CBS/IBS
    """
    cfop_limpo = str(cfop).replace('.', '')
    ncm_limpo = normalizar_ncm(ncm)
    
    # Determinar CST baseado no CFOP
    cst = CFOPS_CREDITO.get(cfop_limpo, '50')  # Padrão: Crédito Integral
    
    # Verificar se tem direito a crédito
    info_cst = CST_ENTRADA.get(cst, CST_ENTRADA['50'])
    percentual_credito = info_cst['percentual']
    
    # Calcular créditos (cálculo "por fora" - BC não inclui os tributos)
    base_calculo = valor_total
    
    # Alíquotas em decimal
    aliq_cbs = config.aliquota_cbs / Decimal('100')
    aliq_ibs = config.aliquota_ibs / Decimal('100')
    
    # Valores de crédito
    valor_cbs = (base_calculo * aliq_cbs * percentual_credito).quantize(Decimal('0.01'), ROUND_HALF_UP)
    valor_ibs = (base_calculo * aliq_ibs * percentual_credito).quantize(Decimal('0.01'), ROUND_HALF_UP)
    valor_total_tributo = valor_cbs + valor_ibs
    
    return ResultadoClassificacao(
        cst_cbs_ibs=cst,
        descricao_cst=info_cst['descricao'],
        base_calculo=base_calculo,
        aliquota_cbs=config.aliquota_cbs,
        aliquota_ibs=config.aliquota_ibs,
        valor_cbs=valor_cbs,
        valor_ibs=valor_ibs,
        valor_total=valor_total_tributo,
        tipo_operacao='credito',
        ncm=ncm_limpo,
        cfop=cfop_limpo
    )


def classificar_saida(
    cfop: str,
    ncm: str,
    valor_total: Decimal,
    config: ConfiguracaoReformaTributaria
) -> ResultadoClassificacao:
    """
    Classifica uma operação de SAÍDA e calcula os débitos de CBS/IBS
    """
    cfop_limpo = str(cfop).replace('.', '')
    ncm_limpo = normalizar_ncm(ncm)
    
    # 1. Verificar se é Cesta Básica (Alíquota Zero)
    if verificar_cesta_basica(ncm_limpo):
        return ResultadoClassificacao(
            cst_cbs_ibs='03',
            descricao_cst='Alíquota Zero - Cesta Básica Nacional',
            base_calculo=valor_total,
            aliquota_cbs=Decimal('0'),
            aliquota_ibs=Decimal('0'),
            valor_cbs=Decimal('0'),
            valor_ibs=Decimal('0'),
            valor_total=Decimal('0'),
            tipo_operacao='debito',
            motivo_reducao='Cesta Básica Nacional - Alíquota Zero',
            ncm=ncm_limpo,
            cfop=cfop_limpo
        )
    
    # 2. Verificar se é Exportação (Imunidade)
    if cfop_limpo.startswith('7'):
        return ResultadoClassificacao(
            cst_cbs_ibs='04',
            descricao_cst='Imunidade / Não Incidência - Exportação',
            base_calculo=valor_total,
            aliquota_cbs=Decimal('0'),
            aliquota_ibs=Decimal('0'),
            valor_cbs=Decimal('0'),
            valor_ibs=Decimal('0'),
            valor_total=Decimal('0'),
            tipo_operacao='debito',
            motivo_reducao='Exportação - Imunidade Constitucional',
            ncm=ncm_limpo,
            cfop=cfop_limpo
        )
    
    # 3. Verificar CFOP de Suspensão
    cst_cfop = CFOPS_DEBITO.get(cfop_limpo, '00')
    if cst_cfop == '05':
        return ResultadoClassificacao(
            cst_cbs_ibs='05',
            descricao_cst='Suspensão / Diferimento',
            base_calculo=valor_total,
            aliquota_cbs=Decimal('0'),
            aliquota_ibs=Decimal('0'),
            valor_cbs=Decimal('0'),
            valor_ibs=Decimal('0'),
            valor_total=Decimal('0'),
            tipo_operacao='debito',
            motivo_reducao='Suspensão de Tributação (Remessa/Retorno)',
            ncm=ncm_limpo,
            cfop=cfop_limpo
        )
    
    # 4. Verificar redução de alíquota por NCM
    cst_reducao, motivo_reducao = verificar_reducao_aliquota(ncm_limpo)
    
    # 5. Determinar CST final
    if cst_reducao:
        cst = cst_reducao
    else:
        cst = cst_cfop
    
    info_cst = CST_SAIDA.get(cst, CST_SAIDA['00'])
    percentual_debito = info_cst['percentual']
    
    # 6. Calcular débitos
    base_calculo = valor_total
    aliq_cbs = config.aliquota_cbs / Decimal('100')
    aliq_ibs = config.aliquota_ibs / Decimal('100')
    
    valor_cbs = (base_calculo * aliq_cbs * percentual_debito).quantize(Decimal('0.01'), ROUND_HALF_UP)
    valor_ibs = (base_calculo * aliq_ibs * percentual_debito).quantize(Decimal('0.01'), ROUND_HALF_UP)
    valor_total_tributo = valor_cbs + valor_ibs
    
    # 7. Verificar Imposto Seletivo
    tem_is, aliq_is, desc_is = verificar_imposto_seletivo(ncm_limpo)
    valor_is = Decimal('0')
    if tem_is:
        valor_is = (base_calculo * aliq_is).quantize(Decimal('0.01'), ROUND_HALF_UP)
        valor_total_tributo += valor_is
        if not motivo_reducao:
            motivo_reducao = f'Imposto Seletivo: {desc_is}'
    
    return ResultadoClassificacao(
        cst_cbs_ibs=cst,
        descricao_cst=info_cst['descricao'],
        base_calculo=base_calculo,
        aliquota_cbs=config.aliquota_cbs * percentual_debito,
        aliquota_ibs=config.aliquota_ibs * percentual_debito,
        valor_cbs=valor_cbs,
        valor_ibs=valor_ibs,
        valor_total=valor_total_tributo,
        tipo_operacao='debito',
        tem_imposto_seletivo=tem_is,
        aliquota_is=aliq_is * Decimal('100') if tem_is else Decimal('0'),
        valor_is=valor_is,
        motivo_reducao=motivo_reducao,
        ncm=ncm_limpo,
        cfop=cfop_limpo
    )


def calcular_apuracao(
    creditos: List[ResultadoClassificacao],
    debitos: List[ResultadoClassificacao]
) -> Dict:
    """
    Calcula a apuração mensal do IVA Dual (CBS + IBS)
    Fórmula: Saldo = Débitos - Créditos
    """
    total_creditos_cbs = sum(c.valor_cbs for c in creditos)
    total_creditos_ibs = sum(c.valor_ibs for c in creditos)
    total_creditos = total_creditos_cbs + total_creditos_ibs
    
    total_debitos_cbs = sum(d.valor_cbs for d in debitos)
    total_debitos_ibs = sum(d.valor_ibs for d in debitos)
    total_debitos = total_debitos_cbs + total_debitos_ibs
    
    total_is = sum(d.valor_is for d in debitos if d.tem_imposto_seletivo)
    
    saldo_cbs = total_debitos_cbs - total_creditos_cbs
    saldo_ibs = total_debitos_ibs - total_creditos_ibs
    saldo_total = saldo_cbs + saldo_ibs + total_is
    
    return {
        'creditos': {
            'cbs': float(total_creditos_cbs),
            'ibs': float(total_creditos_ibs),
            'total': float(total_creditos),
            'quantidade': len(creditos)
        },
        'debitos': {
            'cbs': float(total_debitos_cbs),
            'ibs': float(total_debitos_ibs),
            'total': float(total_debitos),
            'quantidade': len(debitos)
        },
        'imposto_seletivo': {
            'total': float(total_is),
            'quantidade': len([d for d in debitos if d.tem_imposto_seletivo])
        },
        'saldo': {
            'cbs': float(saldo_cbs),
            'ibs': float(saldo_ibs),
            'is': float(total_is),
            'total': float(saldo_total),
            'situacao': 'a_pagar' if saldo_total > 0 else 'credito_acumulado'
        }
    }
