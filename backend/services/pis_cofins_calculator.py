"""
Serviço de Cálculo de PIS/COFINS
Implementa as regras dos Manuais Mestres de Parametrização para Comércio e Serviços
"""
from typing import Dict, List, Optional, Any
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

# =============================================================================
# TABELAS DE PARAMETRIZAÇÃO - COMÉRCIO
# =============================================================================

# NCMs com Alíquota Zero (Tabela 4.3.13 e produtos essenciais)
NCMS_ALIQUOTA_ZERO = {
    # Carnes e Miudezas (já existentes + novos)
    '0201': 'Carne Bovina Fresca',
    '0202': 'Carne Bovina Congelada',
    '0203': 'Carne Suína',
    '0204': 'Carne Ovina/Caprina',
    '0206': 'Miudezas Comestíveis',
    '02061000': 'Miudezas Bovinas Frescas',
    '02063000': 'Miudezas Suínas Frescas',
    '02068000': 'Miudezas Outras Carnes',
    '0207': 'Aves (Frango, Peru, Pato)',
    '02102000': 'Carnes Salgadas Bovinas',
    '02109900': 'Outras Carnes Salgadas',
    # Peixes e Frutos do Mar
    '0302': 'Peixes Frescos',
    '02029000': 'Peixes não especificados',
    '0303': 'Peixes Congelados',
    '0304': 'Filés de Peixe',
    # Laticínios
    '04051000': 'Manteiga',
    '04011010': 'Leite UHT Desnatado',
    '04012010': 'Leite UHT Integral',
    '04014010': 'Leite UHT Alto Teor Gordura',
    '04015010': 'Creme de Leite',
    '04021010': 'Leite em pó parcial desnatado',
    '04022110': 'Leite em pó integral',
    '04061010': 'Queijo Minas Frescal',
    '04061090': 'Queijo Ricota, Cottage, Requeijão',
    '04062000': 'Queijos ralados ou em pó',
    '04069010': 'Queijo Prato',
    '04069020': 'Queijo Mussarela',
    '04069030': 'Queijo Parmesão',
    '04072100': 'Ovos de galinha',
    # Produtos Animais
    '05069000': 'Ossos e Derivados',
    '05100010': 'Substâncias para Farmacêuticos',
    '05119910': 'Sêmen de Bovinos',
    '05119920': 'Embriões de Bovinos',
    # Leguminosas e Cereais
    '07133319': 'Feijões Pretos',
    '07133329': 'Feijões Brancos',
    '07133399': 'Outros Feijões',
    '0901': 'Café (Torrado, moído ou em grão)',
    '10059010': 'Milho em grão',
    '1006': 'Arroz',
    # Farinhas e Derivados
    '11010010': 'Farinha de Trigo',
    '11022000': 'Farinha de Milho (Fubá)',
    # Gorduras e Óleos
    '15079011': 'Óleo de Soja Refinado',
    '15121911': 'Óleo de Girassol Refinado',
    '15171000': 'Margarina',
    # Açúcares
    '17011400': 'Açúcar de cana',
    '17019900': 'Açúcar Cristal/Refinado',
    # Massas e Pães
    '19012000': 'Misturas para Padaria',
    '19021100': 'Macarrão com ovos',
    '19021900': 'Outras massas sem recheio',
    '19022000': 'Massas Alimentícias Recheadas',
    '19023000': 'Massas Secas',
    '19059090': 'Pão Francês/Sal',
    # Preparações Alimentícias
    '21069010': 'Preparações Compostas',
    '22019000': 'Água Comum',
    '22029000': 'Bebidas não Alcoólicas',
    # Combustíveis (GLP e Gás Natural)
    '27101911': 'Óleo Diesel Marítimo',
    '27101921': 'Óleo Diesel',
    '27111100': 'Gás Natural Liquefeito',
    '27111910': 'GLP',
    '27112100': 'Gás Natural',
    # Produtos Farmacêuticos
    '30029099': 'Produtos Farmacêuticos',
    '30039099': 'Medicamentos não Acondicionados',
    '30049099': 'Medicamentos Acondicionados',
    '34011190': 'Sabonetes',
    '38260000': 'Biodiesel',
    # Pneus Bicicletas e Câmaras
    '40115000': 'Pneus para Bicicletas',
    '40132000': 'Câmaras de Ar',
    # Papel e Derivados
    '48010010': 'Papel de Jornal em Bobinas',
    '48010090': 'Papel de Jornal em Folhas',
    '48026191': 'Papel Offset em Bobinas',
    '48026199': 'Papel Offset em Folhas',
    '48101989': 'Papel Couché',
    '48102290': 'Papel LWC',
    '48181000': 'Papel Higiênico',
    # Equipamentos de Informática (Lei 10.925/2004)
    '84433222': 'Impressoras Fiscais',
    '84690039': 'Máquinas de Calcular',
    '84701000': 'Calculadoras Eletrônicas',
    '84713012': 'Notebooks',
    '84713019': 'Outros Computadores Portáteis',
    '84713090': 'Computadores Pessoais',
    '84715010': 'Unidades Processamento Digital',
    '84716052': 'Teclados',
    '84716053': 'Mouse',
    '84716090': 'Outros Periféricos',
    '84719014': 'Leitores de Códigos',
    '84721000': 'Duplicadores',
    # Geradores e Partes
    '85023100': 'Grupos Geradores Eólicos',
    '85030090': 'Partes de Máquinas Elétricas',
    # Telefonia
    '85171231': 'Telefones Celulares',
    '85176241': 'Aparelhos de Recepção',
    '85176255': 'Modems',
    '85176262': 'Roteadores',
    '85176272': 'Multiplexadores',
    '85176277': 'Aparelhos para Rede',
    '85258019': 'Câmeras de Televisão',
    # Veículos
    '87021000': 'Veículos de Transporte Coletivo',
    '87029090': 'Outros Veículos de Transporte',
    '87100000': 'Veículos Militares',
    '87142000': 'Peças de Cadeiras de Rodas',
    '89019000': 'Embarcações',
    # Equipamentos Médicos
    '90189099': 'Instrumentos Médicos',
    '90213980': 'Próteses',
    '90214000': 'Aparelhos Auditivos',
    '90219019': 'Artigos para Deficientes',
    '90219082': 'Válvulas Cardíacas',
    '90219089': 'Partes de Próteses',
    '90219091': 'Artigos para Fraturas',
    '90219092': 'Artigos para Cirurgia',
    '90219099': 'Outros Artigos Médicos',
    # Insumos Agrícolas (já existentes)
    '1209': 'Sementes para semeadura',
    '31': 'Adubos e Fertilizantes',
    '3808': 'Defensivos Agrícolas',
    # Livros e Publicações
    '4901': 'Livros e didáticos',
    '4902': 'Jornais e revistas',
    # Sal
    '25010020': 'Sal de Cozinha',
}

# NCMs que são TRIBUTADOS NORMALMENTE (não são alíquota zero nem monofásicos)
# Estes produtos devem ter PIS/COFINS com alíquotas cheias
# CST Entrada: 50 (com crédito) ou 98 (se CFOP não gera crédito)
# CST Saída: 01 (tributado) ou 49 (se CFOP não gera débito)
NCMS_TRIBUTADOS_NORMALMENTE = {
    # Bolos
    '19059020': {'descricao': 'Bolos e similares'},
    '19052090': {'descricao': 'Bolos tipo panetone'},
    '19059090': {'descricao': 'Outros produtos de padaria e confeitaria'},
    # Panetones
    '19052010': {'descricao': 'Panetone'},
    '19052090': {'descricao': 'Panetone e similares'},
    # Xarope de groselha
    '21069010': {'descricao': 'Xarope de groselha e outros'},
    '21069090': {'descricao': 'Preparações alimentícias diversas'},
    # Outros produtos de confeitaria frequentemente classificados incorretamente
    '17049090': {'descricao': 'Produtos de confeitaria'},
    '19053100': {'descricao': 'Biscoitos e bolachas (doces)'},
    '19053200': {'descricao': 'Waffles e wafers'},
}

# NCMs Monofásicos - Tributação concentrada (Tabela 4.3.10)
# IMPORTANTE: Bebidas ALCOÓLICAS (2204-2208) NÃO são monofásicas - são tributadas normalmente!
# Somente bebidas NÃO alcoólicas (2201-2203) são monofásicas
NCMS_MONOFASICOS = {
    # Bebidas Frias NÃO ALCOÓLICAS (somente estas são monofásicas)
    '22011000': {'grupo': 'BEBIDAS', 'descricao': 'Águas Minerais e Gasosas'},
    '22021000': {'grupo': 'BEBIDAS', 'descricao': 'Refrigerantes'},
    '22029900': {'grupo': 'BEBIDAS', 'descricao': 'Energéticos, Isotônicos, Chás'},
    '22030000': {'grupo': 'BEBIDAS', 'descricao': 'Cervejas'},
    # REMOVIDOS: NCMs de bebidas ALCOÓLICAS (2204-2208) - são TRIBUTADAS normalmente:
    # - 2204: Vinhos
    # - 2205: Vermutes
    # - 2206: Sidra, saquê, fermentados
    # - 2207: Álcool etílico
    # - 2208: Destilados (whisky, vodka, gin, rum, licores, etc.)
    # Combustíveis
    '27101159': {'grupo': 'COMBUSTIVEIS', 'descricao': 'Gasolina'},
    '27101259': {'grupo': 'COMBUSTIVEIS', 'descricao': 'Querosene'},
    '27101911': {'grupo': 'COMBUSTIVEIS', 'descricao': 'Óleo Diesel Marítimo'},
    '27101921': {'grupo': 'COMBUSTIVEIS', 'descricao': 'Óleo Diesel'},
    '27111910': {'grupo': 'COMBUSTIVEIS', 'descricao': 'GLP'},
    # Autopeças
    '40111000': {'grupo': 'AUTOPECAS', 'descricao': 'Pneus Novos (Carro)'},
    '40112090': {'grupo': 'AUTOPECAS', 'descricao': 'Pneus Novos (Carga)'},
    '40115000': {'grupo': 'AUTOPECAS', 'descricao': 'Pneus Bicicletas'},
    '40132000': {'grupo': 'AUTOPECAS', 'descricao': 'Câmaras de Ar'},
    '4013': {'grupo': 'AUTOPECAS', 'descricao': 'Câmaras de Ar'},
    '8708': {'grupo': 'AUTOPECAS', 'descricao': 'Peças Automotivas'},
    '8409': {'grupo': 'AUTOPECAS', 'descricao': 'Partes de Motor'},
    '85071010': {'grupo': 'AUTOPECAS', 'descricao': 'Baterias Automotivas'},
    '8511': {'grupo': 'AUTOPECAS', 'descricao': 'Velas, Ignição, Arranque'},
    '8512': {'grupo': 'AUTOPECAS', 'descricao': 'Faróis, Lanternas, Piscas'},
    # Máquinas Agrícolas
    '84306990': {'grupo': 'MAQ_AGRICOLA', 'descricao': 'Máquinas e Aparelhos Terraplanagem'},
    '84324000': {'grupo': 'MAQ_AGRICOLA', 'descricao': 'Espalhadores de Estrume'},
    '84333000': {'grupo': 'MAQ_AGRICOLA', 'descricao': 'Máquinas Colher Feno'},
    '84334000': {'grupo': 'MAQ_AGRICOLA', 'descricao': 'Enfardadeiras de Palha'},
    '87162000': {'grupo': 'MAQ_AGRICOLA', 'descricao': 'Reboques Agrícolas'},
    # Perfumaria e Higiene Pessoal
    '33030010': {'grupo': 'PERFUMARIA', 'descricao': 'Perfumes'},
    '3304': {'grupo': 'PERFUMARIA', 'descricao': 'Maquiagem, Cremes'},
    '33051000': {'grupo': 'PERFUMARIA', 'descricao': 'Xampus'},
    '33059000': {'grupo': 'PERFUMARIA', 'descricao': 'Condicionadores'},
    '3306': {'grupo': 'PERFUMARIA', 'descricao': 'Pasta de Dente, Fio Dental'},
    '330720': {'grupo': 'PERFUMARIA', 'descricao': 'Desodorantes'},
    '34011190': {'grupo': 'PERFUMARIA', 'descricao': 'Sabonetes'},
    '34012010': {'grupo': 'PERFUMARIA', 'descricao': 'Sabão em Pó/Líquido'},
    # Farmácia
    '30029020': {'grupo': 'FARMACIA', 'descricao': 'Sangue Humano'},
    '30029092': {'grupo': 'FARMACIA', 'descricao': 'Vacinas'},
    '30029099': {'grupo': 'FARMACIA', 'descricao': 'Outros Produtos Farmacêuticos'},
    '30039056': {'grupo': 'FARMACIA', 'descricao': 'Medicamentos não Acondicionados'},
    '30049046': {'grupo': 'FARMACIA', 'descricao': 'Medicamentos Acondicionados'},
    '30051010': {'grupo': 'FARMACIA', 'descricao': 'Curativos Adesivos'},
    '30066000': {'grupo': 'FARMACIA', 'descricao': 'Preparações Contraceptivas'},
    '300490': {'grupo': 'FARMACIA', 'descricao': 'Medicamentos'},
    # Embalagens
    '76129012': {'grupo': 'EMBALAGENS', 'descricao': 'Latas de Alumínio para Bebidas'},
    '38249029': {'grupo': 'QUIMICOS', 'descricao': 'Produtos Químicos'},
    '38260000': {'grupo': 'COMBUSTIVEIS', 'descricao': 'Biodiesel'},
}

# Alíquotas por Grupo e Perfil (INDÚSTRIA, DISTRIBUIDOR, VAREJO)
ALIQUOTAS_COMERCIO = {
    'INDUSTRIA': {
        'BEBIDAS': {'pis': Decimal('2.32'), 'cofins': Decimal('10.77'), 'cst_saida': '02'},
        'AUTOPECAS': {'pis': Decimal('2.30'), 'cofins': Decimal('10.80'), 'cst_saida': '02'},
        'PNEUS': {'pis': Decimal('2.68'), 'cofins': Decimal('11.45'), 'cst_saida': '02'},
        'PERFUMARIA': {'pis': Decimal('2.20'), 'cofins': Decimal('10.30'), 'cst_saida': '02'},
        'FARMACIA': {'pis': Decimal('2.10'), 'cofins': Decimal('9.90'), 'cst_saida': '02'},
        'REGRA_GERAL': {'pis': Decimal('1.65'), 'cofins': Decimal('7.60'), 'cst_saida': '01'},
        'ALIQUOTA_ZERO': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '06'},
    },
    'DISTRIBUIDOR': {
        'BEBIDAS': {'pis': Decimal('1.86'), 'cofins': Decimal('8.54'), 'cst_saida': '02'},
        'AUTOPECAS': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'PNEUS': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'PERFUMARIA': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'FARMACIA': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'REGRA_GERAL': {'pis': Decimal('1.65'), 'cofins': Decimal('7.60'), 'cst_saida': '01'},
        'ALIQUOTA_ZERO': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '06'},
        'ETANOL': {'pis': Decimal('1.50'), 'cofins': Decimal('6.90'), 'cst_saida': '02'},
    },
    'VAREJO': {
        'BEBIDAS': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'AUTOPECAS': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'PNEUS': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'PERFUMARIA': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'FARMACIA': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '04'},
        'REGRA_GERAL': {'pis': Decimal('1.65'), 'cofins': Decimal('7.60'), 'cst_saida': '01'},
        'ALIQUOTA_ZERO': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst_saida': '06'},
    }
}

# CSTs de Entrada
CST_ENTRADA = {
    'CREDITO': '50',  # Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada
    'ALIQUOTA_ZERO': '73',  # Alíquota Zero - Sem Crédito
    'MONOFASICO_SEM_CREDITO': '70',  # Monofásico sem crédito (adquirente)
    'MONOFASICO_COM_CREDITO': '50',  # Monofásico com crédito (indústria)
    'ST_SEM_CREDITO': '70',  # Substituição Tributária sem crédito
    'SEM_CREDITO_CFOP': '98',  # Outras Operações de Entrada - Sem Direito a Crédito
    'ISENTO_NAO_TRIBUTADO': '08',  # Isento/Não Tributado
}

# CSTs de Saída
CST_SAIDA = {
    'TRIBUTADO': '01',  # Tributado com alíquota básica
    'ALIQUOTA_ZERO': '06',  # Alíquota Zero
    'MONOFASICO': '04',  # Monofásico (concentrado)
    'ST': '05',  # Substituição Tributária
    'SEM_DEBITO_CFOP': '49',  # Outras Operações de Saída - Sem Incidência de Contribuição
    'ISENTO': '07',  # Isento
    'NAO_TRIBUTADO': '08',  # Não Tributado
}

# CFOPs que NÃO geram crédito de PIS/COFINS (CST 98 na entrada)
CFOPS_SEM_CREDITO = [
    '1128', '2128',  # Compra para utilização na prestação de serviço
    '1407', '2407',  # Compra de mercadoria para uso ou consumo
    '1556', '2556',  # Compra de bem para o ativo imobilizado
    '1551', '2551',  # Compra de bem para o ativo imobilizado
    '1910', '2910',  # Entrada de bonificação, doação ou brinde
    '1911', '2911',  # Entrada de amostra grátis
    '1949', '2949',  # Outra entrada de mercadoria não especificada
    '1916', '2916',  # Retorno de mercadoria
    '1201', '2201',  # Devolução de venda (não gera crédito adicional)
    '1202', '2202',  # Devolução de venda
    '1203', '2203',  # Devolução de venda
    '1204', '2204',  # Devolução de venda
    '1411', '2411',  # Devolução de mercadoria de venda consignada
    '1503', '2503',  # Entrada de mercadoria de energia elétrica
    '1504', '2504',  # Entrada de mercadoria de energia elétrica
    '1653', '2653',  # Compra de combustível para consumo
    '1918', '2918',  # Devolução de mercadoria de produção do estabelecimento
    '1414', '2414',  # Retorno de mercadoria remetida em consignação
    '1415', '2415',  # Devolução de mercadoria de produção remetida em consignação
    '1451', '2451',  # Entrada de mercadoria de devolução de produção
    '1452', '2452',  # Devolução de mercadoria de produção remetida para demonstração
    '1660', '2660',  # Devolução de venda de mercadoria de produção própria
    '1661', '2661',  # Devolução de venda de mercadoria adquirida ou recebida de terceiros
    '1662', '2662',  # Devolução de venda de mercadoria de produção do estabelecimento
]

# CFOPs que NÃO geram débito de PIS/COFINS (CST 49 na saída)
CFOPS_SEM_DEBITO = [
    '5910', '6910',  # Remessa em bonificação, doação ou brinde
    '5911', '6911',  # Remessa de amostra grátis
    '5912', '6912',  # Remessa de mercadoria ou bem para demonstração
    '5913', '6913',  # Retorno de mercadoria ou bem recebido para demonstração
    '5914', '6914',  # Remessa de mercadoria ou bem para exposição ou feira
    '5915', '6915',  # Remessa de mercadoria ou bem para conserto ou reparo
    '5916', '6916',  # Retorno de mercadoria ou bem recebido para conserto ou reparo
    '5917', '6917',  # Remessa de mercadoria em consignação mercantil ou industrial
    '5918', '6918',  # Devolução de mercadoria recebida em consignação
    '5919', '6919',  # Devolução simbólica de mercadoria vendida
    '5920', '6920',  # Remessa de vasilhame ou sacaria
    '5921', '6921',  # Devolução de vasilhame ou sacaria
    '5922', '6922',  # Lançamento efetuado a título de simples faturamento
    '5923', '6923',  # Remessa de mercadoria por conta e ordem de terceiros
    '5924', '6924',  # Remessa para industrialização por conta e ordem do adquirente
    '5925', '6925',  # Retorno de mercadoria recebida para industrialização
    '5949', '6949',  # Outra saída de mercadoria ou prestação de serviço não especificado
    '5929', '6929',  # Lançamento efetuado em decorrência de emissão de documento fiscal
    '5931', '6931',  # Lançamento efetuado em decorrência da responsabilidade de retenção
    '5932', '6932',  # Prestação de serviço de transporte iniciada em UF diversa
    '5551', '6551',  # Venda de bem do ativo imobilizado
    '5552', '6552',  # Transferência de bem do ativo imobilizado
    '5553', '6553',  # Devolução de compra de bem para o ativo imobilizado
    '5554', '6554',  # Remessa de bem do ativo imobilizado para uso fora do estabelecimento
    '5555', '6555',  # Devolução de bem do ativo imobilizado de terceiros
    '5556', '6556',  # Devolução de compra de material de uso ou consumo
    '5557', '6557',  # Transferência de material de uso ou consumo
    '5601', '6601',  # Transferência de crédito de ICMS acumulado
    '5602', '6602',  # Transferência de saldo credor de ICMS
    '5603', '6603',  # Ressarcimento de ICMS retido por substituição tributária
    '5605', '6605',  # Transferência de saldo devedor de ICMS
    '5606', '6606',  # Utilização de saldo credor de ICMS
]

# =============================================================================
# TABELAS DE PARAMETRIZAÇÃO - SERVIÇOS
# =============================================================================

# CNAEs sujeitos ao regime cumulativo (Art. 10 - 3,65%)
CNAES_CUMULATIVO = {
    # Tecnologia - Fábrica de Software
    '6201-5': 'Desenvolvimento de software sob encomenda',
    '6202-3': 'Desenvolvimento e licenciamento de software customizável',
    '6203-1': 'Desenvolvimento e licenciamento de software não customizável',
    # Construção Civil
    '4120-4': 'Construção de edifícios',
    '4211-1': 'Construção de rodovias',
    '4212-0': 'Construção de obras de arte especiais',
    '4213-8': 'Obras de urbanização',
    '4221-9': 'Construção de redes de abastecimento',
    '4222-7': 'Construção de redes de eletricidade',
    '4223-5': 'Construção de redes de telecomunicações',
    '4291-0': 'Obras portuárias, marítimas e fluviais',
    '4292-8': 'Montagem de instalações industriais',
    '4299-5': 'Obras de engenharia civil',
    '4311-8': 'Demolição e preparação de canteiros',
    '4312-6': 'Perfurações e sondagens',
    '4313-4': 'Obras de terraplenagem',
    '4319-3': 'Serviços de preparação do terreno',
    '4321-5': 'Instalação elétrica',
    '4322-3': 'Instalações hidráulicas',
    '4329-1': 'Outras instalações',
    '4330-4': 'Obras de acabamento',
    '4391-6': 'Obras de fundações',
    '4399-1': 'Serviços especializados para construção',
    # Educação
    '8511-2': 'Educação infantil - creche',
    '8512-1': 'Educação infantil - pré-escola',
    '8513-9': 'Ensino fundamental',
    '8520-1': 'Ensino médio',
    '8531-7': 'Educação superior - graduação',
    '8532-5': 'Educação superior - graduação e pós-graduação',
    '8533-3': 'Educação superior - pós-graduação e extensão',
    # Saúde
    '8610-1': 'Atividades de atendimento hospitalar',
    '8621-6': 'Serviços móveis de atendimento a urgências',
    '8622-4': 'Serviços de remoção de pacientes',
    '8630-5': 'Atividades de atenção ambulatorial',
    '8640-2': 'Serviços de complementação diagnóstica',
    '8650-0': 'Atividades de profissionais da área de saúde',
    '8660-7': 'Atividades de apoio à gestão de saúde',
    # Turismo e Hotelaria
    '5510-8': 'Hotéis e similares',
    '5590-6': 'Outros tipos de alojamento',
    '7911-2': 'Agências de viagens',
    '7912-1': 'Operadores turísticos',
    '9321-2': 'Parques de diversão e parques temáticos',
    # Segurança
    '8011-1': 'Atividades de vigilância e segurança privada',
    '8012-9': 'Atividades de transporte de valores',
    # Telecom e Call Center
    '6110-8': 'Telecomunicações por fio',
    '6120-5': 'Telecomunicações sem fio',
    '6130-2': 'Telecomunicações por satélite',
    '6141-8': 'Operadoras de televisão por assinatura por cabo',
    '6142-6': 'Operadoras de televisão por assinatura por micro-ondas',
    '6143-4': 'Operadoras de televisão por assinatura por satélite',
    '8220-2': 'Atividades de teleatendimento',
    # Transporte Coletivo
    '4921-3': 'Transporte rodoviário coletivo de passageiros',
    '4922-1': 'Transporte rodoviário coletivo de passageiros interestadual',
    '4929-9': 'Transporte rodoviário coletivo de passageiros',
    '4930-2': 'Transporte rodoviário de táxi',
    '4950-7': 'Trens turísticos, teleféricos e similares',
    # Mídia
    '6010-1': 'Atividades de rádio',
    '6021-7': 'Atividades de televisão aberta',
    '6022-5': 'Programadoras e atividades relacionadas à televisão',
    '5812-3': 'Edição de jornais',
    '5813-1': 'Edição de revistas',
}

# CNAEs de atividades financeiras (4,65%)
CNAES_FINANCEIROS = {
    '6612-6': 'Corretoras de títulos e valores mobiliários',
    '6619-3': 'Outras atividades auxiliares dos serviços financeiros',
    '6622-3': 'Corretoras de seguros',
    '6629-1': 'Atividades auxiliares dos seguros',
    '6630-4': 'Atividades de administração de fundos',
}

# Alíquotas de Serviços
ALIQUOTAS_SERVICOS = {
    'REGRA_GERAL': {'pis': Decimal('1.65'), 'cofins': Decimal('7.60'), 'cst': '01', 'total': Decimal('9.25')},
    'CUMULATIVO': {'pis': Decimal('0.65'), 'cofins': Decimal('3.00'), 'cst': '01', 'total': Decimal('3.65')},
    'FINANCEIRO': {'pis': Decimal('0.65'), 'cofins': Decimal('4.00'), 'cst': '02', 'total': Decimal('4.65')},
    'ISENTO': {'pis': Decimal('0'), 'cofins': Decimal('0'), 'cst': '06', 'total': Decimal('0')},
}

# Alíquotas Lucro Presumido
ALIQUOTAS_PRESUMIDO = {
    'COMERCIO': {'pis': Decimal('0.65'), 'cofins': Decimal('3.00'), 'total': Decimal('3.65')},
    'SERVICOS': {'pis': Decimal('0.65'), 'cofins': Decimal('3.00'), 'total': Decimal('3.65')},
}


# =============================================================================
# NCMs de BEBIDAS ALCOÓLICAS - TRIBUTADAS normalmente (NÃO são monofásicas!)
# =============================================================================
NCMS_BEBIDAS_ALCOOLICAS = {
    # 2204 - Vinhos de uvas frescas
    '2204': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Vinhos de uvas frescas'},
    '220410': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Vinhos espumantes'},
    '220421': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Vinhos em garrafas até 2 litros'},
    '220429': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Outros vinhos'},
    # 2205 - Vermutes e outros vinhos aromatizados
    '2205': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Vermutes e vinhos aromatizados'},
    '220510': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Vermutes em recipientes até 2 litros'},
    '220590': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Outros vermutes'},
    # 2206 - Outras bebidas fermentadas (sidra, saquê, hidromel)
    '2206': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Sidra, saquê, hidromel e outros fermentados'},
    '220600': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Outras bebidas fermentadas'},
    # 2207 - Álcool etílico não desnaturado
    '2207': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Álcool etílico não desnaturado'},
    '220710': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Álcool etílico >= 80% vol'},
    '220720': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Álcool etílico desnaturado'},
    # 2208 - Destilados e licores
    '2208': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Destilados e licores'},
    '220820': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Conhaque, Brandy'},
    '220830': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Whisky'},
    '220840': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Rum e aguardentes de cana'},
    '220850': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Gin e Genebra'},
    '220860': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Vodka'},
    '220870': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Licores'},
    '220890': {'grupo': 'BEBIDA_ALCOOLICA', 'descricao': 'Outras bebidas espirituosas (tequila, coquetéis, etc.)'},
}


def is_ncm_bebida_alcoolica(ncm: str) -> bool:
    """
    Verifica se NCM é de bebida alcoólica (TRIBUTADA normalmente).
    Bebidas alcoólicas NÃO são monofásicas!
    
    Inclui: 
    - 2204: Vinhos
    - 2205: Vermutes
    - 2206: Sidra, saquê, fermentados
    - 2207: Álcool etílico
    - 2208: Destilados (whisky, vodka, gin, rum, licores, etc.)
    """
    if not ncm:
        return False
    ncm_limpo = str(ncm).replace('.', '').replace('-', '').strip()
    
    # Verificar prefixo de 4 dígitos
    if len(ncm_limpo) >= 4:
        prefixo = ncm_limpo[:4]
        # Bebidas alcoólicas: 2204, 2205, 2206, 2207, 2208
        if prefixo in ['2204', '2205', '2206', '2207', '2208']:
            return True
    return False


# =============================================================================
# FUNÇÕES DE CLASSIFICAÇÃO
# =============================================================================

def classificar_ncm_comercio(ncm: str, perfil_empresa: str = 'VAREJO') -> Dict[str, Any]:
    """
    Classifica um NCM de acordo com as regras de comércio.
    
    IMPORTANTE: Bebidas ALCOÓLICAS (2204-2208) são TRIBUTADAS normalmente,
    não são monofásicas! Apenas bebidas NÃO alcoólicas (2201-2203) são monofásicas.
    
    Args:
        ncm: Código NCM do produto (8 dígitos)
        perfil_empresa: INDUSTRIA, DISTRIBUIDOR ou VAREJO
    
    Returns:
        Dict com grupo, cst_entrada, cst_saida, aliquota_pis, aliquota_cofins
    """
    ncm_limpo = ncm.replace('.', '').replace('-', '').strip()
    
    # ===== 1) BEBIDAS ALCOÓLICAS - TRIBUTADAS NORMALMENTE (NÃO são monofásicas!) =====
    # DEVE vir ANTES da verificação de monofásicos!
    if is_ncm_bebida_alcoolica(ncm_limpo):
        aliquotas = ALIQUOTAS_COMERCIO.get(perfil_empresa, ALIQUOTAS_COMERCIO['VAREJO'])
        aliq = aliquotas['REGRA_GERAL']  # Sempre regra geral para bebidas alcoólicas
        
        # Buscar descrição específica
        descricao = 'Bebida alcoólica tributada'
        for prefix, info in NCMS_BEBIDAS_ALCOOLICAS.items():
            if ncm_limpo.startswith(prefix):
                descricao = info['descricao']
                break
        
        return {
            'grupo': 'BEBIDA_ALCOOLICA',
            'descricao': descricao,
            'cst_entrada': CST_ENTRADA['CREDITO'],  # 50 - gera crédito
            'cst_saida': '01',  # SEMPRE 01 (tributado) para bebidas alcoólicas!
            'aliquota_pis': aliq['pis'],  # 1.65% no Lucro Real
            'aliquota_cofins': aliq['cofins'],  # 7.60% no Lucro Real
            'gera_credito': True,
            'tipo': 'BEBIDA_ALCOOLICA'
        }
    
    # ===== 1.5) PRODUTOS TRIBUTADOS NORMALMENTE (bolos, panetones, xarope de groselha) =====
    # Estes produtos NÃO são alíquota zero nem monofásicos - devem ser tributados!
    for prefix, info in NCMS_TRIBUTADOS_NORMALMENTE.items():
        if ncm_limpo.startswith(prefix.replace('.', '')):
            aliquotas = ALIQUOTAS_COMERCIO.get(perfil_empresa, ALIQUOTAS_COMERCIO['VAREJO'])
            aliq = aliquotas['REGRA_GERAL']
            
            return {
                'grupo': 'REGRA_GERAL',
                'descricao': info['descricao'],
                'cst_entrada': CST_ENTRADA['CREDITO'],  # 50 - gera crédito
                'cst_saida': '01',  # 01 (tributado)
                'aliquota_pis': aliq['pis'],  # 1.65%
                'aliquota_cofins': aliq['cofins'],  # 7.60%
                'gera_credito': True,
                'tipo': 'TRIBUTADO_NORMAL'
            }
    
    # ===== 2) Verificar Alíquota Zero =====
    for prefix, descricao in NCMS_ALIQUOTA_ZERO.items():
        if ncm_limpo.startswith(prefix.replace('.', '')):
            return {
                'grupo': 'ALIQUOTA_ZERO',
                'descricao': descricao,
                'cst_entrada': CST_ENTRADA['ALIQUOTA_ZERO'],
                'cst_saida': '06',
                'aliquota_pis': Decimal('0'),
                'aliquota_cofins': Decimal('0'),
                'gera_credito': False,
                'tipo': 'ALIQUOTA_ZERO'
            }
    
    # ===== 3) Verificar Monofásicos (somente bebidas NÃO alcoólicas chegam aqui) =====
    for prefix, info in NCMS_MONOFASICOS.items():
        if ncm_limpo.startswith(prefix.replace('.', '')):
            grupo = info['grupo']
            aliquotas = ALIQUOTAS_COMERCIO.get(perfil_empresa, ALIQUOTAS_COMERCIO['VAREJO'])
            aliq = aliquotas.get(grupo, aliquotas['REGRA_GERAL'])
            
            # Entrada: Indústria tem crédito (50), demais sem crédito (70)
            if perfil_empresa == 'INDUSTRIA':
                cst_entrada = CST_ENTRADA['CREDITO']
                gera_credito = True
            else:
                cst_entrada = CST_ENTRADA['MONOFASICO_SEM_CREDITO']
                gera_credito = False
            
            return {
                'grupo': grupo,
                'descricao': info['descricao'],
                'cst_entrada': cst_entrada,
                'cst_saida': aliq['cst_saida'],
                'aliquota_pis': aliq['pis'],
                'aliquota_cofins': aliq['cofins'],
                'gera_credito': gera_credito,
                'tipo': 'MONOFASICO'
            }
    
    # ===== 4) Regra Geral =====
    aliquotas = ALIQUOTAS_COMERCIO.get(perfil_empresa, ALIQUOTAS_COMERCIO['VAREJO'])
    aliq = aliquotas['REGRA_GERAL']
    
    return {
        'grupo': 'REGRA_GERAL',
        'descricao': 'Produto tributado pela regra geral',
        'cst_entrada': CST_ENTRADA['CREDITO'],
        'cst_saida': aliq['cst_saida'],
        'aliquota_pis': aliq['pis'],
        'aliquota_cofins': aliq['cofins'],
        'gera_credito': True,
        'tipo': 'REGRA_GERAL'
    }


def verificar_cfop_gera_credito(cfop: str) -> bool:
    """
    Verifica se um CFOP gera direito a crédito de PIS/COFINS.
    """
    return cfop not in CFOPS_SEM_CREDITO


def verificar_cfop_gera_debito(cfop: str) -> bool:
    """
    Verifica se um CFOP gera débito de PIS/COFINS.
    """
    return cfop not in CFOPS_SEM_DEBITO


def classificar_cst_entrada(cfop: str, ncm: str, perfil_empresa: str = 'VAREJO') -> str:
    """
    Determina o CST de entrada correto baseado no CFOP e NCM.
    """
    # Se CFOP não gera crédito, sempre CST 98
    if not verificar_cfop_gera_credito(cfop):
        return CST_ENTRADA['SEM_CREDITO_CFOP']
    
    # Classificar pelo NCM
    classificacao = classificar_ncm_comercio(ncm, perfil_empresa)
    return classificacao['cst_entrada']


def classificar_cst_saida(cfop: str, ncm: str, perfil_empresa: str = 'VAREJO') -> str:
    """
    Determina o CST de saída correto baseado no CFOP e NCM.
    """
    # Se CFOP não gera débito, sempre CST 49
    if not verificar_cfop_gera_debito(cfop):
        return CST_SAIDA['SEM_DEBITO_CFOP']
    
    # Classificar pelo NCM
    classificacao = classificar_ncm_comercio(ncm, perfil_empresa)
    return classificacao['cst_saida']


def classificar_cnae_servico(cnae: str) -> Dict[str, Any]:
    """
    Classifica um CNAE de serviço de acordo com as regras fiscais.
    
    Args:
        cnae: Código CNAE da empresa
    
    Returns:
        Dict com regime, aliquotas e CST
    """
    cnae_limpo = cnae.replace('.', '').replace('-', '').replace('/', '').strip()
    
    # Verificar se é financeiro (4,65%)
    for code in CNAES_FINANCEIROS.keys():
        code_limpo = code.replace('.', '').replace('-', '').replace('/', '')
        if cnae_limpo.startswith(code_limpo[:4]):
            return {
                'regime': 'FINANCEIRO',
                'aliquota_pis': ALIQUOTAS_SERVICOS['FINANCEIRO']['pis'],
                'aliquota_cofins': ALIQUOTAS_SERVICOS['FINANCEIRO']['cofins'],
                'cst': ALIQUOTAS_SERVICOS['FINANCEIRO']['cst'],
                'total': ALIQUOTAS_SERVICOS['FINANCEIRO']['total'],
                'gera_credito': False,
                'descricao': CNAES_FINANCEIROS.get(code, 'Atividade financeira')
            }
    
    # Verificar se é cumulativo (3,65%)
    for code, descricao in CNAES_CUMULATIVO.items():
        code_limpo = code.replace('.', '').replace('-', '').replace('/', '')
        if cnae_limpo.startswith(code_limpo[:4]):
            return {
                'regime': 'CUMULATIVO',
                'aliquota_pis': ALIQUOTAS_SERVICOS['CUMULATIVO']['pis'],
                'aliquota_cofins': ALIQUOTAS_SERVICOS['CUMULATIVO']['cofins'],
                'cst': ALIQUOTAS_SERVICOS['CUMULATIVO']['cst'],
                'total': ALIQUOTAS_SERVICOS['CUMULATIVO']['total'],
                'gera_credito': False,
                'descricao': descricao
            }
    
    # Regra Geral (9,25%)
    return {
        'regime': 'REGRA_GERAL',
        'aliquota_pis': ALIQUOTAS_SERVICOS['REGRA_GERAL']['pis'],
        'aliquota_cofins': ALIQUOTAS_SERVICOS['REGRA_GERAL']['cofins'],
        'cst': ALIQUOTAS_SERVICOS['REGRA_GERAL']['cst'],
        'total': ALIQUOTAS_SERVICOS['REGRA_GERAL']['total'],
        'gera_credito': True,
        'descricao': 'Serviço tributado pela regra geral'
    }


# =============================================================================
# FUNÇÕES DE CÁLCULO
# =============================================================================

def calcular_pis_cofins_produto(
    valor_base: float,
    ncm: str,
    cfop: str,
    tipo_operacao: str,  # 'entrada' ou 'saida'
    perfil_empresa: str = 'VAREJO',
    regime_tributario: str = 'LUCRO_REAL'
) -> Dict[str, Any]:
    """
    Calcula PIS e COFINS para um produto específico.
    
    Returns:
        Dict com valores calculados, CSTs, e flags
    """
    valor = Decimal(str(valor_base))
    classificacao = classificar_ncm_comercio(ncm, perfil_empresa)
    
    resultado = {
        'valor_base': float(valor),
        'ncm': ncm,
        'cfop': cfop,
        'tipo_operacao': tipo_operacao,
        'classificacao': classificacao,
    }
    
    # LUCRO PRESUMIDO
    if regime_tributario == 'LUCRO_PRESUMIDO':
        if tipo_operacao == 'entrada':
            # Presumido não tem crédito, exceto monofásicos
            if classificacao['tipo'] == 'MONOFASICO':
                # Monofásico gera crédito mesmo no presumido
                resultado['cst'] = classificacao['cst_entrada']
                resultado['aliquota_pis'] = float(classificacao['aliquota_pis'])
                resultado['aliquota_cofins'] = float(classificacao['aliquota_cofins'])
                resultado['valor_pis'] = float((valor * classificacao['aliquota_pis'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                resultado['valor_cofins'] = float((valor * classificacao['aliquota_cofins'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                resultado['gera_credito'] = True
            else:
                # Sem crédito
                resultado['cst'] = CST_ENTRADA['SEM_CREDITO_CFOP']
                resultado['aliquota_pis'] = 0
                resultado['aliquota_cofins'] = 0
                resultado['valor_pis'] = 0
                resultado['valor_cofins'] = 0
                resultado['gera_credito'] = False
        else:  # saída
            # Débito no presumido: 3,65% na regra geral
            if classificacao['tipo'] in ['ALIQUOTA_ZERO', 'MONOFASICO'] and classificacao['aliquota_pis'] == Decimal('0'):
                resultado['cst'] = classificacao['cst_saida']
                resultado['aliquota_pis'] = 0
                resultado['aliquota_cofins'] = 0
                resultado['valor_pis'] = 0
                resultado['valor_cofins'] = 0
            else:
                resultado['cst'] = '01'
                resultado['aliquota_pis'] = float(ALIQUOTAS_PRESUMIDO['COMERCIO']['pis'])
                resultado['aliquota_cofins'] = float(ALIQUOTAS_PRESUMIDO['COMERCIO']['cofins'])
                resultado['valor_pis'] = float((valor * ALIQUOTAS_PRESUMIDO['COMERCIO']['pis'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                resultado['valor_cofins'] = float((valor * ALIQUOTAS_PRESUMIDO['COMERCIO']['cofins'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
            resultado['gera_credito'] = False
    
    # LUCRO REAL
    else:
        if tipo_operacao == 'entrada':
            # Verificar CFOP
            if not verificar_cfop_gera_credito(cfop):
                resultado['cst'] = CST_ENTRADA['SEM_CREDITO_CFOP']
                resultado['aliquota_pis'] = 0
                resultado['aliquota_cofins'] = 0
                resultado['valor_pis'] = 0
                resultado['valor_cofins'] = 0
                resultado['gera_credito'] = False
            else:
                resultado['cst'] = classificacao['cst_entrada']
                if classificacao['gera_credito']:
                    # Crédito pela alíquota básica (1,65% / 7,60%)
                    resultado['aliquota_pis'] = 1.65
                    resultado['aliquota_cofins'] = 7.60
                    resultado['valor_pis'] = float((valor * Decimal('1.65') / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                    resultado['valor_cofins'] = float((valor * Decimal('7.60') / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                    resultado['gera_credito'] = True
                else:
                    resultado['aliquota_pis'] = 0
                    resultado['aliquota_cofins'] = 0
                    resultado['valor_pis'] = 0
                    resultado['valor_cofins'] = 0
                    resultado['gera_credito'] = False
        else:  # saída
            # Verificar CFOP sem débito
            if not verificar_cfop_gera_debito(cfop):
                resultado['cst'] = CST_SAIDA['SEM_DEBITO_CFOP']
                resultado['aliquota_pis'] = 0
                resultado['aliquota_cofins'] = 0
                resultado['valor_pis'] = 0
                resultado['valor_cofins'] = 0
                resultado['gera_credito'] = False
            else:
                resultado['cst'] = classificacao['cst_saida']
                resultado['aliquota_pis'] = float(classificacao['aliquota_pis'])
                resultado['aliquota_cofins'] = float(classificacao['aliquota_cofins'])
                resultado['valor_pis'] = float((valor * classificacao['aliquota_pis'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                resultado['valor_cofins'] = float((valor * classificacao['aliquota_cofins'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                resultado['gera_credito'] = False
    
    return resultado


def calcular_pis_cofins_servico(
    valor_base: float,
    cnae_empresa: str,
    codigo_servico: str = None,
    tipo_operacao: str = 'saida',  # serviços prestados
    regime_tributario: str = 'LUCRO_REAL',
    is_exportacao: bool = False
) -> Dict[str, Any]:
    """
    Calcula PIS e COFINS para um serviço.
    """
    valor = Decimal(str(valor_base))
    
    # Exportação é isenta
    if is_exportacao:
        return {
            'valor_base': float(valor),
            'cnae': cnae_empresa,
            'regime': 'ISENTO',
            'cst': '06',
            'aliquota_pis': 0,
            'aliquota_cofins': 0,
            'valor_pis': 0,
            'valor_cofins': 0,
            'gera_credito': False,
            'descricao': 'Exportação de serviços'
        }
    
    classificacao = classificar_cnae_servico(cnae_empresa)
    
    resultado = {
        'valor_base': float(valor),
        'cnae': cnae_empresa,
        'regime': classificacao['regime'],
        'cst': classificacao['cst'],
        'aliquota_pis': float(classificacao['aliquota_pis']),
        'aliquota_cofins': float(classificacao['aliquota_cofins']),
        'gera_credito': classificacao['gera_credito'],
        'descricao': classificacao['descricao']
    }
    
    if tipo_operacao == 'saida':
        resultado['valor_pis'] = float((valor * classificacao['aliquota_pis'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
        resultado['valor_cofins'] = float((valor * classificacao['aliquota_cofins'] / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
    else:
        # Créditos de despesas para serviços (regra geral apenas)
        if classificacao['gera_credito']:
            resultado['valor_pis'] = float((valor * Decimal('1.65') / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
            resultado['valor_cofins'] = float((valor * Decimal('7.60') / 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
        else:
            resultado['valor_pis'] = 0
            resultado['valor_cofins'] = 0
    
    return resultado


def comparar_xml_vs_calculado(
    valor_base: float,
    ncm: str,
    cfop: str,
    tipo_operacao: str,
    perfil_empresa: str,
    # Valores do XML
    cst_xml: str,
    aliquota_pis_xml: float,
    aliquota_cofins_xml: float,
    valor_pis_xml: float,
    valor_cofins_xml: float
) -> Dict[str, Any]:
    """
    Compara os valores do XML com os valores calculados pelo sistema.
    
    Returns:
        Dict com divergências encontradas
    """
    # Calcular valores corretos
    calculado = calcular_pis_cofins_produto(
        valor_base, ncm, cfop, tipo_operacao, perfil_empresa, 'LUCRO_REAL'
    )
    
    divergencias = []
    
    # Comparar CST
    if cst_xml != calculado['cst']:
        divergencias.append({
            'campo': 'CST',
            'xml': cst_xml,
            'calculado': calculado['cst'],
            'tipo': 'CST_DIVERGENTE'
        })
    
    # Comparar alíquota PIS
    if abs(float(aliquota_pis_xml) - calculado['aliquota_pis']) > 0.01:
        divergencias.append({
            'campo': 'Alíquota PIS',
            'xml': aliquota_pis_xml,
            'calculado': calculado['aliquota_pis'],
            'tipo': 'ALIQUOTA_PIS_DIVERGENTE'
        })
    
    # Comparar alíquota COFINS
    if abs(float(aliquota_cofins_xml) - calculado['aliquota_cofins']) > 0.01:
        divergencias.append({
            'campo': 'Alíquota COFINS',
            'xml': aliquota_cofins_xml,
            'calculado': calculado['aliquota_cofins'],
            'tipo': 'ALIQUOTA_COFINS_DIVERGENTE'
        })
    
    # Comparar valor PIS
    diff_pis = float(valor_pis_xml) - calculado['valor_pis']
    if abs(diff_pis) > 0.01:
        divergencias.append({
            'campo': 'Valor PIS',
            'xml': valor_pis_xml,
            'calculado': calculado['valor_pis'],
            'diferenca': diff_pis,
            'tipo': 'VALOR_PIS_DIVERGENTE'
        })
    
    # Comparar valor COFINS
    diff_cofins = float(valor_cofins_xml) - calculado['valor_cofins']
    if abs(diff_cofins) > 0.01:
        divergencias.append({
            'campo': 'Valor COFINS',
            'xml': valor_cofins_xml,
            'calculado': calculado['valor_cofins'],
            'diferenca': diff_cofins,
            'tipo': 'VALOR_COFINS_DIVERGENTE'
        })
    
    # Calcular impacto financeiro
    impacto = {
        'diferenca_pis': diff_pis if abs(diff_pis) > 0.01 else 0,
        'diferenca_cofins': diff_cofins if abs(diff_cofins) > 0.01 else 0,
        'total_diferenca': (diff_pis if abs(diff_pis) > 0.01 else 0) + (diff_cofins if abs(diff_cofins) > 0.01 else 0),
        'recolhido_a_maior': (diff_pis + diff_cofins) > 0,
        'recolhido_a_menor': (diff_pis + diff_cofins) < 0,
    }
    
    return {
        'tem_divergencia': len(divergencias) > 0,
        'divergencias': divergencias,
        'calculado': calculado,
        'impacto': impacto
    }


def verificar_cnae_nf(cnae_empresa: List[str], codigo_servico_nf: str) -> Dict[str, Any]:
    """
    Verifica se o código de serviço da NF está compatível com os CNAEs da empresa.
    
    Returns:
        Dict com alerta se houver inconsistência
    """
    # Implementar mapeamento código serviço -> CNAE
    # Por enquanto, retorna sem alerta
    return {
        'alerta': False,
        'mensagem': None,
        'cnae_empresa': cnae_empresa,
        'codigo_servico_nf': codigo_servico_nf
    }
