"""
Constantes fiscais compartilhadas entre os módulos de validação
"""

# =============================================================================
# CFOPs DE TRANSFERÊNCIA (entre matriz e filiais)
# Esses CFOPs NÃO geram débito NEM crédito de PIS/COFINS, pois o imposto 
# federal é centralizado na matriz. Também não geram IRPJ/CSLL.
# =============================================================================
CFOPS_TRANSFERENCIA = [
    # ENTRADAS de transferência (série 1xxx = internas, 2xxx = interestaduais)
    '1151',  # Transferência p/ industrialização
    '1152',  # Transferência p/ comercialização
    '1153',  # Transferência de energia elétrica
    '1154',  # Transferência p/ utilização na prestação de serviço
    '1408',  # Transferência p/ industrialização em operação com mercadoria ST
    '1409',  # Transferência p/ comercialização em operação com mercadoria ST
    '2151',  # Transferência p/ industrialização (interestadual)
    '2152',  # Transferência p/ comercialização (interestadual)
    '2153',  # Transferência de energia elétrica (interestadual)
    '2154',  # Transferência p/ utilização na prestação de serviço (interestadual)
    '2408',  # Transferência p/ industrialização em operação com mercadoria ST (interestadual)
    '2409',  # Transferência p/ comercialização em operação com mercadoria ST (interestadual)
    # SAÍDAS de transferência (série 5xxx = internas, 6xxx = interestaduais)
    '5151',  # Transferência p/ industrialização
    '5152',  # Transferência p/ comercialização  
    '5153',  # Transferência de energia elétrica
    '5155',  # Transferência de produção do estabelecimento p/ industrialização
    '5156',  # Transferência de mercadoria adquirida ou recebida de terceiros
    '5408',  # Transferência p/ industrialização em operação com mercadoria ST
    '5409',  # Transferência p/ comercialização em operação com mercadoria ST
    '6151',  # Transferência p/ industrialização (interestadual)
    '6152',  # Transferência p/ comercialização (interestadual)
    '6153',  # Transferência de energia elétrica (interestadual)
    '6155',  # Transferência de produção do estabelecimento p/ industrialização (interestadual)
    '6156',  # Transferência de mercadoria adquirida ou recebida de terceiros (interestadual)
    '6408',  # Transferência p/ industrialização em operação com mercadoria ST (interestadual)
    '6409',  # Transferência p/ comercialização em operação com mercadoria ST (interestadual)
]

def is_cfop_transferencia(cfop: str) -> bool:
    """Verifica se um CFOP é de transferência (entre matriz e filiais)"""
    return str(cfop).strip() in CFOPS_TRANSFERENCIA


# Alíquotas interestaduais de ICMS por região
ALIQUOTAS_INTERESTADUAIS = {
    # Origem Sul/Sudeste (exceto ES) para Norte/Nordeste/Centro-Oeste/ES = 7%
    # Origem Sul/Sudeste (exceto ES) para Sul/Sudeste (exceto ES) = 12%
    # Origem Norte/Nordeste/Centro-Oeste/ES para qualquer estado = 12%
    'sul_sudeste': ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS'],
    'norte_nordeste_co_es': ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO']
}


def get_aliquota_interestadual(uf_origem: str, uf_destino: str) -> float:
    """Retorna a alíquota interestadual de ICMS"""
    if uf_origem == uf_destino:
        return None  # Operação interna
    
    origem_sul_sudeste = uf_origem in ALIQUOTAS_INTERESTADUAIS['sul_sudeste']
    destino_sul_sudeste = uf_destino in ALIQUOTAS_INTERESTADUAIS['sul_sudeste']
    
    if origem_sul_sudeste:
        if destino_sul_sudeste:
            return 12.0  # Sul/Sudeste para Sul/Sudeste
        else:
            return 7.0   # Sul/Sudeste para N/NE/CO/ES
    else:
        return 12.0  # N/NE/CO/ES para qualquer lugar


# CFOPs de exceção para PIS/COFINS - Entradas que não geram crédito
CFOPS_EXCECAO_ENTRADA = {
    '1201': {'descricao': 'Devolução de venda - industrialização', 'cst_esperado': '49'},
    '1202': {'descricao': 'Devolução de venda - comercialização', 'cst_esperado': '49'},
    '1203': {'descricao': 'Devolução de venda - energia elétrica', 'cst_esperado': '49'},
    '1204': {'descricao': 'Devolução de venda - prestador de serviço', 'cst_esperado': '49'},
    '1208': {'descricao': 'Devolução de venda - produção rural', 'cst_esperado': '49'},
    '1209': {'descricao': 'Devolução de venda - estabelecimento terceiro', 'cst_esperado': '49'},
    '1410': {'descricao': 'Devolução de venda - mercadoria ST', 'cst_esperado': '49'},
    '1411': {'descricao': 'Devolução de venda - mercadoria ST estab. terceiro', 'cst_esperado': '49'},
    '1503': {'descricao': 'Devolução de mercadoria - consignação', 'cst_esperado': '49'},
    '1553': {'descricao': 'Devolução de mercadoria - venda futura', 'cst_esperado': '49'},
    '1660': {'descricao': 'Devolução de remessa em garantia', 'cst_esperado': '49'},
    '1661': {'descricao': 'Devolução de remessa em depósito', 'cst_esperado': '49'},
    '1662': {'descricao': 'Devolução de consignação', 'cst_esperado': '49'},
    '1910': {'descricao': 'Entrada de bonificação/doação/brinde', 'cst_esperado': '70'},
    '1911': {'descricao': 'Entrada de amostra grátis', 'cst_esperado': '70'},
    '1912': {'descricao': 'Entrada de mercadoria/bem para demonstração', 'cst_esperado': '49'},
    '1913': {'descricao': 'Retorno de mercadoria/bem para demonstração', 'cst_esperado': '49'},
    '1914': {'descricao': 'Retorno de mercadoria/bem para exposição/feira', 'cst_esperado': '49'},
    '1915': {'descricao': 'Entrada de mercadoria/bem por devolução', 'cst_esperado': '49'},
    '1916': {'descricao': 'Retorno de mercadoria/bem - consignação', 'cst_esperado': '49'},
    '1917': {'descricao': 'Entrada de mercadoria/bem - consignação simbólica', 'cst_esperado': '49'},
    '1918': {'descricao': 'Devolução de consignação', 'cst_esperado': '49'},
    '1919': {'descricao': 'Devolução simbólica de consignação', 'cst_esperado': '49'},
    '1920': {'descricao': 'Entrada de vasilhame ou sacaria', 'cst_esperado': '49'},
    '1921': {'descricao': 'Retorno de vasilhame ou sacaria', 'cst_esperado': '49'},
    '1949': {'descricao': 'Outra entrada não especificada', 'cst_esperado': '98'},
    # Interestaduais
    '2201': {'descricao': 'Devolução de venda - industrialização (interestadual)', 'cst_esperado': '49'},
    '2202': {'descricao': 'Devolução de venda - comercialização (interestadual)', 'cst_esperado': '49'},
    '2203': {'descricao': 'Devolução de venda - energia elétrica (interestadual)', 'cst_esperado': '49'},
    '2204': {'descricao': 'Devolução de venda - prestador de serviço (interestadual)', 'cst_esperado': '49'},
    '2208': {'descricao': 'Devolução de venda - produção rural (interestadual)', 'cst_esperado': '49'},
    '2209': {'descricao': 'Devolução de venda - estabelecimento terceiro (interestadual)', 'cst_esperado': '49'},
    '2410': {'descricao': 'Devolução de venda - mercadoria ST (interestadual)', 'cst_esperado': '49'},
    '2411': {'descricao': 'Devolução de venda - mercadoria ST estab. terceiro (interestadual)', 'cst_esperado': '49'},
    '2503': {'descricao': 'Devolução de mercadoria - consignação (interestadual)', 'cst_esperado': '49'},
    '2553': {'descricao': 'Devolução de mercadoria - venda futura (interestadual)', 'cst_esperado': '49'},
    '2660': {'descricao': 'Devolução de remessa em garantia (interestadual)', 'cst_esperado': '49'},
    '2661': {'descricao': 'Devolução de remessa em depósito (interestadual)', 'cst_esperado': '49'},
    '2662': {'descricao': 'Devolução de consignação (interestadual)', 'cst_esperado': '49'},
    '2910': {'descricao': 'Entrada de bonificação/doação/brinde (interestadual)', 'cst_esperado': '70'},
    '2911': {'descricao': 'Entrada de amostra grátis (interestadual)', 'cst_esperado': '70'},
    '2912': {'descricao': 'Entrada de mercadoria/bem para demonstração (interestadual)', 'cst_esperado': '49'},
    '2913': {'descricao': 'Retorno de mercadoria/bem para demonstração (interestadual)', 'cst_esperado': '49'},
    '2914': {'descricao': 'Retorno de mercadoria/bem para exposição/feira (interestadual)', 'cst_esperado': '49'},
    '2915': {'descricao': 'Entrada de mercadoria/bem por devolução (interestadual)', 'cst_esperado': '49'},
    '2916': {'descricao': 'Retorno de mercadoria/bem - consignação (interestadual)', 'cst_esperado': '49'},
    '2917': {'descricao': 'Entrada de mercadoria/bem - consignação simbólica (interestadual)', 'cst_esperado': '49'},
    '2918': {'descricao': 'Devolução de consignação (interestadual)', 'cst_esperado': '49'},
    '2919': {'descricao': 'Devolução simbólica de consignação (interestadual)', 'cst_esperado': '49'},
    '2920': {'descricao': 'Entrada de vasilhame ou sacaria (interestadual)', 'cst_esperado': '49'},
    '2921': {'descricao': 'Retorno de vasilhame ou sacaria (interestadual)', 'cst_esperado': '49'},
    '2949': {'descricao': 'Outra entrada não especificada (interestadual)', 'cst_esperado': '98'},
}

# CFOPs de exceção para PIS/COFINS - Saídas que não geram débito
CFOPS_EXCECAO_SAIDA = {
    '5201': {'descricao': 'Devolução de compra - industrialização', 'cst_esperado': '49'},
    '5202': {'descricao': 'Devolução de compra - comercialização', 'cst_esperado': '49'},
    '5208': {'descricao': 'Devolução de compra - energia elétrica', 'cst_esperado': '49'},
    '5209': {'descricao': 'Devolução de compra - estabelecimento terceiro', 'cst_esperado': '49'},
    '5410': {'descricao': 'Devolução de compra - mercadoria ST', 'cst_esperado': '49'},
    '5411': {'descricao': 'Devolução de compra - mercadoria ST estab. terceiro', 'cst_esperado': '49'},
    '5910': {'descricao': 'Remessa em bonificação/doação/brinde', 'cst_esperado': '49'},
    '5911': {'descricao': 'Remessa de amostra grátis', 'cst_esperado': '49'},
    '5912': {'descricao': 'Remessa de mercadoria/bem para demonstração', 'cst_esperado': '49'},
    '5913': {'descricao': 'Retorno de mercadoria/bem para demonstração', 'cst_esperado': '49'},
    '5914': {'descricao': 'Remessa de mercadoria/bem para exposição/feira', 'cst_esperado': '49'},
    '5915': {'descricao': 'Remessa de mercadoria para consignação', 'cst_esperado': '49'},
    '5916': {'descricao': 'Retorno de consignação', 'cst_esperado': '49'},
    '5917': {'descricao': 'Remessa de consignação simbólica', 'cst_esperado': '49'},
    '5918': {'descricao': 'Devolução de consignação', 'cst_esperado': '49'},
    '5919': {'descricao': 'Devolução simbólica de consignação', 'cst_esperado': '49'},
    '5920': {'descricao': 'Remessa de vasilhame ou sacaria', 'cst_esperado': '49'},
    '5921': {'descricao': 'Devolução de vasilhame ou sacaria', 'cst_esperado': '49'},
    '5949': {'descricao': 'Outra saída não especificada', 'cst_esperado': '99'},
    # Interestaduais
    '6201': {'descricao': 'Devolução de compra - industrialização (interestadual)', 'cst_esperado': '49'},
    '6202': {'descricao': 'Devolução de compra - comercialização (interestadual)', 'cst_esperado': '49'},
    '6208': {'descricao': 'Devolução de compra - energia elétrica (interestadual)', 'cst_esperado': '49'},
    '6209': {'descricao': 'Devolução de compra - estabelecimento terceiro (interestadual)', 'cst_esperado': '49'},
    '6410': {'descricao': 'Devolução de compra - mercadoria ST (interestadual)', 'cst_esperado': '49'},
    '6411': {'descricao': 'Devolução de compra - mercadoria ST estab. terceiro (interestadual)', 'cst_esperado': '49'},
    '6910': {'descricao': 'Remessa em bonificação/doação/brinde (interestadual)', 'cst_esperado': '49'},
    '6911': {'descricao': 'Remessa de amostra grátis (interestadual)', 'cst_esperado': '49'},
    '6912': {'descricao': 'Remessa de mercadoria/bem para demonstração (interestadual)', 'cst_esperado': '49'},
    '6913': {'descricao': 'Retorno de mercadoria/bem para demonstração (interestadual)', 'cst_esperado': '49'},
    '6914': {'descricao': 'Remessa de mercadoria/bem para exposição/feira (interestadual)', 'cst_esperado': '49'},
    '6915': {'descricao': 'Remessa de mercadoria para consignação (interestadual)', 'cst_esperado': '49'},
    '6916': {'descricao': 'Retorno de consignação (interestadual)', 'cst_esperado': '49'},
    '6917': {'descricao': 'Remessa de consignação simbólica (interestadual)', 'cst_esperado': '49'},
    '6918': {'descricao': 'Devolução de consignação (interestadual)', 'cst_esperado': '49'},
    '6919': {'descricao': 'Devolução simbólica de consignação (interestadual)', 'cst_esperado': '49'},
    '6920': {'descricao': 'Remessa de vasilhame ou sacaria (interestadual)', 'cst_esperado': '49'},
    '6921': {'descricao': 'Devolução de vasilhame ou sacaria (interestadual)', 'cst_esperado': '49'},
    '6949': {'descricao': 'Outra saída não especificada (interestadual)', 'cst_esperado': '99'},
}

# Tipos de regra PIS/COFINS com suas configurações
TIPOS_REGRA_PIS_COFINS = {
    'monofasico': {
        'descricao': 'Monofásico - Tributação concentrada',
        'aliquota_pis': 0,
        'aliquota_cofins': 0,
        'cst_entrada': '70',
        'cst_saida': '04',
        'gera_credito': False,
        'gera_debito': False
    },
    'aliquota_zero': {
        'descricao': 'Alíquota Zero - Cesta básica e isentos',
        'aliquota_pis': 0,
        'aliquota_cofins': 0,
        'cst_entrada': '73',
        'cst_saida': '06',
        'gera_credito': False,
        'gera_debito': False
    },
    'tributado': {
        'descricao': 'Tributado - Alíquotas normais',
        'aliquota_pis': 1.65,
        'aliquota_cofins': 7.6,
        'cst_entrada': '50',
        'cst_saida': '01',
        'gera_credito': True,
        'gera_debito': True
    },
    'st': {
        'descricao': 'Substituição Tributária',
        'aliquota_pis': 0,
        'aliquota_cofins': 0,
        'cst_entrada': '70',
        'cst_saida': '05',
        'gera_credito': False,
        'gera_debito': False
    },
    'aliquota_diferenciada': {
        'descricao': 'Alíquota Diferenciada',
        'aliquota_pis': None,
        'aliquota_cofins': None,
        'cst_entrada': '50',
        'cst_saida': '01',
        'gera_credito': True,
        'gera_debito': True
    }
}

# Regras padrão de PIS/COFINS por NCM (base para sugestões)
REGRAS_PIS_COFINS_PADRAO = {
    # Alimentos - alíquota zero ou reduzida
    '0201': {'descricao': 'Carnes de bovino', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '0202': {'descricao': 'Carnes de bovino congeladas', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '0203': {'descricao': 'Carnes de suíno', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '0207': {'descricao': 'Carnes de aves', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '0302': {'descricao': 'Peixes frescos', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '0401': {'descricao': 'Leite e creme de leite', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '0402': {'descricao': 'Leite concentrado', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '0407': {'descricao': 'Ovos', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1001': {'descricao': 'Trigo', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1005': {'descricao': 'Milho', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1006': {'descricao': 'Arroz', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1101': {'descricao': 'Farinhas de trigo', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1507': {'descricao': 'Óleo de soja', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1701': {'descricao': 'Açúcar', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1901': {'descricao': 'Extratos de malte, preparações alimentícias de farinhas', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1902': {'descricao': 'Massas alimentícias', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    '1905': {'descricao': 'Pães, bolachas, biscoitos', 'aliquota_pis': 0, 'aliquota_cofins': 0, 'cst_saida': '06'},
    # Bebidas
    '2201': {'descricao': 'Águas minerais', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '2202': {'descricao': 'Águas, refrigerantes', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '2203': {'descricao': 'Cervejas de malte', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '2204': {'descricao': 'Vinhos', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '2205': {'descricao': 'Vermutes', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '2206': {'descricao': 'Outras bebidas fermentadas', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '2207': {'descricao': 'Álcool etílico', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '2208': {'descricao': 'Bebidas destiladas', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    # Produtos de limpeza e higiene - tributação normal
    '3401': {'descricao': 'Sabões', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '3402': {'descricao': 'Detergentes', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '3303': {'descricao': 'Perfumes e águas-de-colônia', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '3304': {'descricao': 'Produtos de beleza', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '3305': {'descricao': 'Preparações capilares', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    '3306': {'descricao': 'Produtos de higiene bucal', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
    # Papel higiênico
    '4818': {'descricao': 'Papel higiênico, fraldas, absorventes', 'aliquota_pis': 0.0165, 'aliquota_cofins': 0.076, 'cst_saida': '01'},
}
