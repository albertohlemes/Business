"""
Pydantic models for the Business Contabilidade application
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class UserRole:
    SUPER_ADMIN = "super_admin"  # Dono do escritório - acesso total
    MASTER = "master"            # Vê todas as empresas, pode filtrar por usuário responsável
    OPERACIONAL = "operacional"  # Vê apenas empresas das quais é responsável
    # Legacy roles (para compatibilidade)
    ADMIN = "admin"
    CLIENT = "client"


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str = UserRole.OPERACIONAL
    company_ids: List[str] = []  # Empresas que o usuário é responsável
    is_active: bool = True
    created_by: Optional[str] = None  # ID do usuário que criou
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    preferences: Dict[str, Any] = Field(default_factory=lambda: {"menu_mode": "vertical"})


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = UserRole.OPERACIONAL
    company_ids: List[str] = []


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    company_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    preferences: Optional[Dict[str, Any]] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserPreferencesUpdate(BaseModel):
    menu_mode: Optional[str] = None  # "vertical" ou "horizontal"


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class UserListResponse(BaseModel):
    users: List[User]
    total: int


class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cnpj: str
    razao_social: str
    codigo_empresa: Optional[str] = None
    nome_fantasia: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    cnae_principal: Optional[str] = None
    cnae_principal_descricao: Optional[str] = None
    atividade_principal: Optional[str] = None
    produtos_comercializados: List[str] = []
    insumos_producao: List[str] = []
    produtos_despesa: List[str] = []
    ativo_imobilizado: List[str] = []
    combustivel: List[str] = []
    regime_tributario: str = "lucro_presumido"
    anexos_simples: List[str] = []
    tipo_atividade: str = "comercio"
    tipos_servico: List[str] = []
    percentual_presuncao_irpj: float = 8.0
    percentual_presuncao_csll: float = 12.0
    estoque_inicial: float = 0.0
    estoque_final: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CompanyCreate(BaseModel):
    cnpj: str
    razao_social: str
    codigo_empresa: Optional[str] = None
    nome_fantasia: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    cnae_principal: Optional[str] = None
    cnae_principal_descricao: Optional[str] = None
    atividade_principal: Optional[str] = None
    produtos_comercializados: List[str] = []
    insumos_producao: List[str] = []
    produtos_despesa: List[str] = []
    ativo_imobilizado: List[str] = []
    combustivel: List[str] = []
    regime_tributario: str = "lucro_presumido"
    anexos_simples: List[str] = []
    tipo_atividade: str = "comercio"
    tipos_servico: List[str] = []
    percentual_presuncao_irpj: float = 8.0
    percentual_presuncao_csll: float = 12.0
    estoque_inicial: float = 0.0
    estoque_final: float = 0.0


class CompanyUpdate(BaseModel):
    codigo_empresa: Optional[str] = None
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    cnae_principal: Optional[str] = None
    cnae_principal_descricao: Optional[str] = None
    atividade_principal: Optional[str] = None
    produtos_comercializados: Optional[List[str]] = None
    insumos_producao: Optional[List[str]] = None
    produtos_despesa: Optional[List[str]] = None
    ativo_imobilizado: Optional[List[str]] = None
    combustivel: Optional[List[str]] = None
    regime_tributario: Optional[str] = None
    anexos_simples: Optional[List[str]] = None
    tipo_atividade: Optional[str] = None
    tipos_servico: Optional[List[str]] = None
    percentual_presuncao_irpj: Optional[float] = None
    percentual_presuncao_csll: Optional[float] = None
    estoque_inicial: Optional[float] = None
    estoque_final: Optional[float] = None


class XMLDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    competencia: str
    tipo: str
    modelo: str = "nfe"
    chave_nfe: str
    numero_nfe: str
    serie: str = ""
    data_emissao: str
    emitente_cnpj: str
    emitente_nome: str
    emitente_ie: str = ""
    emitente_uf: str = ""
    emitente_endereco: Dict[str, Any] = {}
    destinatario_cnpj: str
    destinatario_nome: str
    destinatario_ie: str = ""
    destinatario_uf: str = ""
    destinatario_endereco: Dict[str, Any] = {}
    valor_total: float
    valor_servicos: float = 0.0
    total_ipi: float = 0.0
    total_icms_st: float = 0.0
    total_frete: float = 0.0
    total_seguro: float = 0.0
    total_outras_despesas: float = 0.0
    total_desconto: float = 0.0
    xml_content: str
    produtos: List[Dict[str, Any]] = []
    servicos: List[Dict[str, Any]] = []
    status_validacao: str = "pendente"
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    uploaded_by: str = ""


class CFOPRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cfop: str
    descricao: str
    tipo_operacao: str
    categoria: str
    exige_validacao: bool = True
    regras: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ValidationException(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    xml_document_id: str
    product_code: Optional[str] = None
    cfop_original: str
    cfop_corrigido: str
    cfop_sugerido: Optional[str] = None
    categoria_classificada: Optional[str] = None
    motivo: str
    aplicado_em_lote: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExceptionCreate(BaseModel):
    xml_document_id: str
    product_code: Optional[str] = None
    cfop_original: str
    cfop_corrigido: str
    motivo: str
    aplicado_em_lote: bool = False


class LearnedRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    produto_descricao: str
    produto_codigo: Optional[str] = None
    ncm: Optional[str] = None
    categoria_correta: str
    cfop_correto: str
    motivo: str
    aprendido_de: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LearnedRuleCreate(BaseModel):
    company_id: str
    produto_descricao: str
    produto_codigo: Optional[str] = None
    ncm: Optional[str] = None
    categoria_correta: str
    cfop_correto: str
    motivo: str


class ReclassificationRequest(BaseModel):
    company_id: str
    competencia: str
    product_ids: List[str] = []
    instrucao_usuario: str
    aplicar_em_lote: bool = True


class ManualReclassificationRequest(BaseModel):
    document_id: str
    product_index: int
    nova_categoria: str
    motivo: Optional[str] = None


class TaxValidationRequest(BaseModel):
    company_id: str
    competencia: str
    document_ids: List[str] = []
    validar_pis: bool = True
    validar_cofins: bool = True
    validar_icms: bool = True


class TaxValidationResult(BaseModel):
    produto_codigo: str
    produto_descricao: str
    ncm: str
    inconsistencias: List[Dict[str, Any]] = []
    base_legal: List[str] = []
    sugestao_correcao: Optional[str] = None
