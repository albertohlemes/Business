"""
Constantes e modelos para o Validador ICMS
Extraído do server.py para melhor organização
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


# =============================================================================
# MODELOS PYDANTIC PARA ICMS
# =============================================================================

class ExcecaoRegra(BaseModel):
    """Exceção dentro de uma regra (ex: cachaça vs outras bebidas)"""
    chave: str
    descricao: str
    aliquota: float
    condicao: Optional[str] = None


class RegraICMS(BaseModel):
    """Modelo para regra de ICMS configurável pelo usuário"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    tipo: str = "ncm"  # ncm ou produto
    chave: str  # NCM ou código/descrição do produto
    descricao: str
    # Alíquotas por tipo de operação
    aliquota_interna: float  # Operação dentro do estado
    aliquota_interestadual_sul_sudeste: Optional[float] = 12.0  # Para Sul/Sudeste
    aliquota_interestadual_outros: Optional[float] = 7.0  # Para N/NE/CO/ES
    aliquota_st: Optional[float] = 0.0  # Se for ST, espera 0% na saída
    # Exceções (ex: bebidas destiladas 25%, mas cachaça 18%)
    excecoes: Optional[List[ExcecaoRegra]] = []
    # Metadados
    uf: str  # Estado da regra
    base_legal: Optional[str] = None  # Lei/artigo/RICMS
    aplica_st: bool = False  # Se a regra é para produtos ST
    ativo: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExcecaoRegraCreate(BaseModel):
    chave: str
    descricao: str
    aliquota: float
    condicao: Optional[str] = None


class RegraICMSCreate(BaseModel):
    tipo: str = "ncm"
    chave: str
    descricao: str
    aliquota_interna: float
    aliquota_interestadual_sul_sudeste: Optional[float] = 12.0
    aliquota_interestadual_outros: Optional[float] = 7.0
    aliquota_st: Optional[float] = 0.0
    excecoes: Optional[List[ExcecaoRegraCreate]] = []
    base_legal: Optional[str] = None
    aplica_st: bool = False


class RegraICMSUpdate(BaseModel):
    descricao: Optional[str] = None
    aliquota_interna: Optional[float] = None
    aliquota_interestadual_sul_sudeste: Optional[float] = None
    aliquota_interestadual_outros: Optional[float] = None
    aliquota_st: Optional[float] = None
    excecoes: Optional[List[dict]] = None
    base_legal: Optional[str] = None
    aplica_st: Optional[bool] = None
    ativo: Optional[bool] = None


# =============================================================================
# CONSTANTES DE ALÍQUOTAS ICMS POR ESTADO
# =============================================================================

ALIQUOTAS_ICMS_PADRAO = {
    'SP': {
        'interna': 18.0,
        'interestadual_sul_sudeste': 12.0,
        'interestadual_norte_nordeste': 7.0,
        'reducao_cesta_basica': 7.0
    },
    'RJ': {'interna': 20.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'MG': {'interna': 18.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'RS': {'interna': 17.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'PR': {'interna': 19.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'SC': {'interna': 17.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'GO': {'interna': 17.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'BA': {'interna': 18.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'PE': {'interna': 18.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
    'CE': {'interna': 18.0, 'interestadual_sul_sudeste': 12.0, 'interestadual_norte_nordeste': 7.0},
}


# =============================================================================
# REGRAS PADRÃO DE ICMS POR NCM - REGULAMENTO ICMS (Base RICMS SP)
# =============================================================================

REGRAS_ICMS_PADRAO_NCM = {
    # Alimentos - Cesta Básica (RICMS SP Art. 39, Anexo II)
    '0201': {'descricao': 'Carnes de bovino frescas', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0202': {'descricao': 'Carnes de bovino congeladas', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0203': {'descricao': 'Carnes de suíno', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0204': {'descricao': 'Carnes ovinas ou caprinas', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0207': {'descricao': 'Carnes de aves', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0401': {'descricao': 'Leite e creme de leite', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0402': {'descricao': 'Leite em pó', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0403': {'descricao': 'Iogurte, leite fermentado', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0405': {'descricao': 'Manteiga', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0406': {'descricao': 'Queijos', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0407': {'descricao': 'Ovos de galinha', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '0901': {'descricao': 'Café', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1001': {'descricao': 'Trigo', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1006': {'descricao': 'Arroz', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1101': {'descricao': 'Farinha de trigo', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1507': {'descricao': 'Óleo de soja', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1517': {'descricao': 'Margarina', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1701': {'descricao': 'Açúcar', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1902': {'descricao': 'Massas alimentícias', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '1905': {'descricao': 'Pão francês e produtos de padaria', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    '2501': {'descricao': 'Sal', 'aliquota_interna': 7.0, 'base_legal': 'RICMS SP Art. 39'},
    # Bebidas NÃO ALCOÓLICAS - Alíquota padrão 18%
    '2201': {'descricao': 'Águas minerais', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    '2202': {'descricao': 'Refrigerantes, sucos', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    # Bebidas ALCOÓLICAS - Alíquota 25% (RICMS SP Art. 55)
    '2203': {'descricao': 'Cerveja de malte', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '2204': {'descricao': 'Vinhos de uvas', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '2205': {'descricao': 'Vermutes e vinhos aromatizados', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '2206': {'descricao': 'Sidra, saquê e fermentados', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '2207': {'descricao': 'Álcool etílico', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '2208': {'descricao': 'Destilados (whisky, vodka, cachaça)', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55', 
             'excecoes': [{'chave': 'cachaca', 'descricao': 'Cachaça/Aguardente de cana', 'aliquota': 18.0, 'condicao': 'Produto brasileiro'}]},
    # Combustíveis - Alíquota específica
    '2710': {'descricao': 'Óleo diesel, gasolina', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 54', 'aplica_st': True},
    '2711': {'descricao': 'GLP, gás natural', 'aliquota_interna': 12.0, 'base_legal': 'RICMS SP Art. 54'},
    # Produtos industrializados - Alíquota padrão
    '3303': {'descricao': 'Perfumes', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '3304': {'descricao': 'Cosméticos e maquiagem', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '3305': {'descricao': 'Produtos para cabelo', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    '3306': {'descricao': 'Produtos higiene bucal', 'aliquota_interna': 25.0, 'base_legal': 'RICMS SP Art. 55'},
    # Eletrônicos e eletrodomésticos
    '8418': {'descricao': 'Refrigeradores e freezers', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    '8450': {'descricao': 'Máquinas de lavar', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    '8471': {'descricao': 'Computadores', 'aliquota_interna': 12.0, 'base_legal': 'RICMS SP Art. 54'},
    '8517': {'descricao': 'Aparelhos telefônicos', 'aliquota_interna': 12.0, 'base_legal': 'RICMS SP Art. 54'},
    '8528': {'descricao': 'Monitores e TVs', 'aliquota_interna': 12.0, 'base_legal': 'RICMS SP Art. 54'},
    # Vestuário e calçados
    '6101': {'descricao': 'Casacos masculinos', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    '6102': {'descricao': 'Casacos femininos', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    '6109': {'descricao': 'Camisetas', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    '6403': {'descricao': 'Calçados', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    # Medicamentos
    '3003': {'descricao': 'Medicamentos não acondicionados', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
    '3004': {'descricao': 'Medicamentos acondicionados', 'aliquota_interna': 18.0, 'base_legal': 'RICMS SP Art. 52'},
}
