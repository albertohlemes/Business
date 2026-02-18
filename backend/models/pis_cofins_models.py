"""
Modelos e constantes para o Validador PIS/COFINS
Extraído do server.py para melhor organização
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


# =============================================================================
# MODELOS PYDANTIC PARA PIS/COFINS
# =============================================================================

class RegraPisCofins(BaseModel):
    """Modelo para regra de PIS/COFINS configurável pelo usuário"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    tipo: str = "ncm"  # ncm, cfop ou produto
    chave: str  # NCM, CFOP ou código do produto
    descricao: str
    # Tipo de regra (tributado, aliquota_zero, monofasico, etc.)
    tipo_regra: Optional[str] = "tributado"
    # Alíquotas
    aliquota_pis: float = 1.65  # Alíquota de PIS esperada
    aliquota_cofins: float = 7.6  # Alíquota de COFINS esperada
    # Comportamento
    gera_credito: bool = True  # Se gera crédito (entradas)
    gera_debito: bool = True  # Se gera débito (saídas)
    cst_esperado_entrada: Optional[str] = None  # CST esperado em entradas (ex: 50, 60)
    cst_esperado_saida: Optional[str] = None  # CST esperado em saídas (ex: 01, 02)
    # Exceções
    excecoes: Optional[List[dict]] = []  # Exceções específicas
    # Metadados
    base_legal: Optional[str] = None
    observacao: Optional[str] = None
    ativo: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RegraPisCofinsCreate(BaseModel):
    tipo: str = "ncm"
    chave: str
    descricao: str
    tipo_regra: Optional[str] = "tributado"
    aliquota_pis: float = 1.65
    aliquota_cofins: float = 7.6
    gera_credito: bool = True
    gera_debito: bool = True
    cst_esperado_entrada: Optional[str] = None
    cst_esperado_saida: Optional[str] = None
    excecoes: Optional[List[dict]] = []
    base_legal: Optional[str] = None
    observacao: Optional[str] = None


class RegraPisCofinsUpdate(BaseModel):
    descricao: Optional[str] = None
    tipo_regra: Optional[str] = None
    aliquota_pis: Optional[float] = None
    aliquota_cofins: Optional[float] = None
    gera_credito: Optional[bool] = None
    gera_debito: Optional[bool] = None
    cst_esperado_entrada: Optional[str] = None
    cst_esperado_saida: Optional[str] = None
    excecoes: Optional[List[dict]] = None
    base_legal: Optional[str] = None
    observacao: Optional[str] = None
    ativo: Optional[bool] = None


# =============================================================================
# CFOPs PADRÃO QUE GERAM CRÉDITO (ENTRADAS)
# =============================================================================

CFOPS_CREDITO_PADRAO = {
    '1101': {'descricao': 'Compra para industrialização', 'gera_credito': True},
    '1102': {'descricao': 'Compra para comercialização', 'gera_credito': True},
    '1111': {'descricao': 'Compra para industrialização de mercadoria de zona franca', 'gera_credito': True},
    '1116': {'descricao': 'Compra para industrialização originada de encomenda', 'gera_credito': True},
    '1117': {'descricao': 'Compra para comercialização originada de encomenda', 'gera_credito': True},
    '1120': {'descricao': 'Compra para industrialização entregue pelo vendedor', 'gera_credito': True},
    '1121': {'descricao': 'Compra para comercialização entregue pelo vendedor', 'gera_credito': True},
    '1122': {'descricao': 'Compra para industrialização destinada zona franca', 'gera_credito': True},
    '1124': {'descricao': 'Industrialização efetuada por outra empresa', 'gera_credito': True},
    '1125': {'descricao': 'Industrialização efetuada por outra empresa com mercadoria fornecida', 'gera_credito': True},
    '1126': {'descricao': 'Compra para utilização na prestação de serviço', 'gera_credito': True},
    '1401': {'descricao': 'Compra para industrialização em operação com mercadoria sujeita a ST', 'gera_credito': True},
    '1403': {'descricao': 'Compra para comercialização em operação com mercadoria sujeita a ST', 'gera_credito': True},
    '1407': {'descricao': 'Compra de ativo imobilizado sujeito a ST', 'gera_credito': True},
    '1551': {'descricao': 'Compra de ativo imobilizado', 'gera_credito': True},
    '1652': {'descricao': 'Compra de combustível para consumo', 'gera_credito': True},
    '1653': {'descricao': 'Compra de lubrificante para consumo', 'gera_credito': True},
    '2101': {'descricao': 'Compra para industrialização (interestadual)', 'gera_credito': True},
    '2102': {'descricao': 'Compra para comercialização (interestadual)', 'gera_credito': True},
    '2111': {'descricao': 'Compra para industrialização de mercadoria de zona franca (interestadual)', 'gera_credito': True},
    '2116': {'descricao': 'Compra para industrialização originada de encomenda (interestadual)', 'gera_credito': True},
    '2117': {'descricao': 'Compra para comercialização originada de encomenda (interestadual)', 'gera_credito': True},
    '2120': {'descricao': 'Compra para industrialização entregue pelo vendedor (interestadual)', 'gera_credito': True},
    '2121': {'descricao': 'Compra para comercialização entregue pelo vendedor (interestadual)', 'gera_credito': True},
    '2122': {'descricao': 'Compra para industrialização destinada zona franca (interestadual)', 'gera_credito': True},
    '2124': {'descricao': 'Industrialização efetuada por outra empresa (interestadual)', 'gera_credito': True},
    '2125': {'descricao': 'Industrialização efetuada por outra empresa com mercadoria fornecida (interestadual)', 'gera_credito': True},
    '2126': {'descricao': 'Compra para utilização na prestação de serviço (interestadual)', 'gera_credito': True},
    '2401': {'descricao': 'Compra para industrialização em operação com mercadoria sujeita a ST (interestadual)', 'gera_credito': True},
    '2403': {'descricao': 'Compra para comercialização em operação com mercadoria sujeita a ST (interestadual)', 'gera_credito': True},
    '2407': {'descricao': 'Compra de ativo imobilizado sujeito a ST (interestadual)', 'gera_credito': True},
    '2551': {'descricao': 'Compra de ativo imobilizado (interestadual)', 'gera_credito': True},
    '2652': {'descricao': 'Compra de combustível para consumo (interestadual)', 'gera_credito': True},
    '2653': {'descricao': 'Compra de lubrificante para consumo (interestadual)', 'gera_credito': True},
}


# =============================================================================
# CFOPs QUE NÃO GERAM CRÉDITO (DEVOLUÇÕES, BONIFICAÇÕES, ETC.)
# =============================================================================

CFOPS_SEM_CREDITO = {
    # Devoluções de venda - não são compras, são retornos
    '1201', '1202', '1203', '1204', '1208', '1209',
    '1410', '1411', '1503', '1553', '1660', '1661', '1662',
    '2201', '2202', '2203', '2204', '2208', '2209',
    '2410', '2411', '2503', '2553', '2660', '2661', '2662',
    # Bonificação, doação, amostra grátis - não tem custo/contraprestação
    '1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1918', '1919',
    '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2918', '2919',
    # Vasilhames e sacarias
    '1920', '1921', '2920', '2921',
    # Outras entradas não especificadas
    '1949', '2949',
}


# =============================================================================
# CFOPs QUE NÃO GERAM DÉBITO (SAÍDAS)
# =============================================================================

CFOPS_SEM_DEBITO = {
    # Devoluções de compra - não são vendas
    '5201', '5202', '5208', '5209',
    '5410', '5411',
    '6201', '6202', '6208', '6209',
    '6410', '6411',
    # Bonificação, doação, amostra grátis
    '5910', '5911', '5912', '5913', '5914', '5915', '5916', '5917', '5918', '5919',
    '6910', '6911', '6912', '6913', '6914', '6915', '6916', '6917', '6918', '6919',
    # Vasilhames e sacarias
    '5920', '5921', '6920', '6921',
    # Outras saídas não especificadas
    '5949', '6949',
}
