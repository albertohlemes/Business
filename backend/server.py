from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status, BackgroundTasks
from fastapi.responses import StreamingResponse
import asyncio
from export_service import generate_csv_saida, generate_csv_entrada
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import xmltodict
import re
import requests
from io import BytesIO
from collections import defaultdict
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

# SIEG Integration
from sieg_service import count_xmls_sieg, download_xmls_sieg, sync_from_sieg

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

tasks_store = {}
class UserRole:
    ADMIN = "admin"
    CLIENT = "client"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str
    company_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = UserRole.CLIENT
    company_ids: List[str] = []

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cnpj: str
    razao_social: str
    codigo_empresa: Optional[str] = None  # ID customizado da empresa
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
    ativo_imobilizado: List[str] = []  # Palavras-chave para Ativo Imobilizado
    combustivel: List[str] = []  # Palavras-chave para Combustível
    # Regime Tributário
    regime_tributario: str = "lucro_presumido"  # simples_nacional, lucro_presumido, lucro_real
    anexos_simples: List[str] = []  # I, II, III, IV, V
    tipo_atividade: str = "comercio"  # comercio, industria, servicos, mista
    tipos_servico: List[str] = []  # transporte, ti, consultoria, etc
    # Presunção (Lucro Presumido)
    percentual_presuncao_irpj: float = 8.0
    percentual_presuncao_csll: float = 12.0
    # Estoque (para ponto de equilíbrio - Lucro Real)
    estoque_inicial: float = 0.0
    estoque_final: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    cnpj: str
    razao_social: str
    codigo_empresa: Optional[str] = None  # ID customizado da empresa
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
    # Regime Tributário
    regime_tributario: str = "lucro_presumido"
    anexos_simples: List[str] = []
    tipo_atividade: str = "comercio"
    tipos_servico: List[str] = []
    percentual_presuncao_irpj: float = 8.0
    percentual_presuncao_csll: float = 12.0
    estoque_inicial: float = 0.0
    estoque_final: float = 0.0

class CompanyUpdate(BaseModel):
    """Modelo para atualização de empresa"""
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
    tipo: str  # entrada, saida
    modelo: str = "nfe"  # nfe, nfce, nfse
    chave_nfe: str
    numero_nfe: str
    serie: str = ""
    data_emissao: str
    # Dados do emitente
    emitente_cnpj: str
    emitente_nome: str
    emitente_ie: str = ""
    emitente_uf: str = ""
    emitente_endereco: Dict[str, Any] = {}
    # Dados do destinatário
    destinatario_cnpj: str
    destinatario_nome: str
    destinatario_ie: str = ""
    destinatario_uf: str = ""
    destinatario_endereco: Dict[str, Any] = {}
    # Valores
    valor_total: float
    valor_servicos: float = 0.0
    # Totais extras (IPI, ST, frete, etc)
    total_ipi: float = 0.0
    total_icms_st: float = 0.0
    total_frete: float = 0.0
    total_seguro: float = 0.0
    total_outras_despesas: float = 0.0
    total_desconto: float = 0.0
    # Conteúdo e itens
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
    """Regras aprendidas pela IA baseadas em correções do usuário"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    produto_descricao: str
    produto_codigo: Optional[str] = None
    ncm: Optional[str] = None
    categoria_correta: str  # revenda, insumo, despesa, combustivel
    cfop_correto: str
    motivo: str
    aprendido_de: str  # user_correction ou ai_suggestion
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReclassificationRequest(BaseModel):
    """Request para reclassificar produtos com IA"""
    company_id: str
    competencia: str
    product_ids: List[str] = []  # Se vazio, reclassifica todos
    instrucao_usuario: str  # Comando do usuário para a IA
    aplicar_em_lote: bool = True

class ManualReclassificationRequest(BaseModel):
    """Request para reclassificar um produto manualmente"""
    document_id: str
    product_index: int  # Índice do produto na lista
    nova_categoria: str  # revenda, insumo, despesa
    motivo: Optional[str] = None  # Justificativa opcional

class TaxValidationRequest(BaseModel):
    """Request para validar impostos com IA"""
    company_id: str
    competencia: str
    document_ids: List[str] = []
    validar_pis: bool = True
    validar_cofins: bool = True
    validar_icms: bool = True

class TaxValidationResult(BaseModel):
    """Resultado da validação de impostos"""
    produto_codigo: str
    produto_descricao: str
    ncm: str
    inconsistencias: List[Dict[str, Any]] = []
    base_legal: List[str] = []
    sugestao_correcao: Optional[str] = None

# =============================================================================
# NCMs COM ALÍQUOTA ZERO (Tabela 4.3.13 SPED - Cesta Básica, Monofásicos, etc.)
# =============================================================================
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

def is_ncm_aliquota_zero(ncm: str) -> bool:
    """Verifica se NCM tem alíquota zero de PIS/COFINS (Tabela 4.3.13 SPED)"""
    if not ncm:
        return False
    ncm_str = str(ncm).replace('.', '').strip()
    
    # Verificar NCM completo (8 dígitos)
    if len(ncm_str) >= 8 and ncm_str[:8] in NCMS_ALIQUOTA_ZERO_COMPLETOS:
        return True
    
    # Verificar prefixo (4 dígitos)
    if len(ncm_str) >= 4 and ncm_str[:4] in NCMS_ALIQUOTA_ZERO_PREFIXOS:
        return True
        
    return False

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

def calcular_cst_pis_cofins(ncm: str, cfop: str, tipo_operacao: str, cst_xml: str = None, regime: str = 'lucro_real') -> dict:
    """
    Calcula o CST correto de PIS/COFINS baseado nas regras fiscais.
    
    Regras:
    - CFOP sem incidência: Entrada CST 98, Saída CST 49
    - NCM com alíquota zero: Entrada CST 73, Saída CST 06
    - CFOP sem direito a crédito: Entrada CST 70 (sem crédito)
    - Normal (Lucro Real): Entrada CST 50 (com crédito), Saída CST 01 (tributado)
    - Lucro Presumido: Entrada CST 70 (sem crédito), Saída CST 01 (cumulativo)
    
    Returns:
        dict com 'cst_calculado', 'cst_xml', 'divergente', 'motivo', 'sem_incidencia'
    """
    primeiro_digito = cfop[0] if cfop else ''
    is_entrada = primeiro_digito in ['1', '2', '3'] or tipo_operacao == 'entrada'
    is_saida = primeiro_digito in ['5', '6', '7'] or tipo_operacao == 'saida'
    
    aliq_zero = is_ncm_aliquota_zero(ncm)
    cfop_com_credito = cfop in CFOPS_COM_CREDITO_PIS_COFINS if cfop else True
    
    # Verificar se é CFOP sem incidência de PIS/COFINS
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

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return User(**user)

def parse_xml_nfe(xml_content: str) -> Dict[str, Any]:
    try:
        data = xmltodict.parse(xml_content)
        nfe = data.get('nfeProc', {}).get('NFe', {}).get('infNFe', {})
        if not nfe:
            nfe = data.get('NFe', {}).get('infNFe', {})
        if not nfe:
            raise ValueError("Estrutura de XML NFe inválida")
        
        ide = nfe.get('ide', {})
        emit = nfe.get('emit', {})
        dest = nfe.get('dest', {})
        total = nfe.get('total', {}).get('ICMSTot', {})
        det = nfe.get('det', [])
        
        # Extrair dados completos do emitente (endereço)
        enderEmit = emit.get('enderEmit', {})
        emitente_uf = enderEmit.get('UF', '')
        emitente_endereco = {
            'logradouro': enderEmit.get('xLgr', ''),
            'numero': enderEmit.get('nro', ''),
            'complemento': enderEmit.get('xCpl', ''),
            'bairro': enderEmit.get('xBairro', ''),
            'cidade': enderEmit.get('xMun', ''),
            'cod_municipio': enderEmit.get('cMun', ''),
            'uf': emitente_uf,
            'cep': enderEmit.get('CEP', ''),
            'pais': enderEmit.get('xPais', 'BRASIL'),
            'cod_pais': enderEmit.get('cPais', '1058'),
            'telefone': enderEmit.get('fone', '')
        }
        
        # Extrair dados completos do destinatário (endereço)
        enderDest = dest.get('enderDest', {})
        destinatario_uf = enderDest.get('UF', '')
        destinatario_endereco = {
            'logradouro': enderDest.get('xLgr', ''),
            'numero': enderDest.get('nro', ''),
            'complemento': enderDest.get('xCpl', ''),
            'bairro': enderDest.get('xBairro', ''),
            'cidade': enderDest.get('xMun', ''),
            'cod_municipio': enderDest.get('cMun', ''),
            'uf': destinatario_uf,
            'cep': enderDest.get('CEP', ''),
            'pais': enderDest.get('xPais', 'BRASIL'),
            'cod_pais': enderDest.get('cPais', '1058'),
            'telefone': enderDest.get('fone', '')
        }
        
        # Totais do documento (frete, seguro, outras despesas, desconto, IPI, ICMS-ST)
        vFrete_total = float(total.get('vFrete', 0) or 0)
        vSeg_total = float(total.get('vSeg', 0) or 0)
        vOutro_total = float(total.get('vOutro', 0) or 0)
        vDesc_total = float(total.get('vDesc', 0) or 0)
        vIPI_total = float(total.get('vIPI', 0) or 0)
        vST_total = float(total.get('vST', 0) or 0)
        vICMSST_total = float(total.get('vICMSST', 0) or 0) or vST_total
        
        if isinstance(det, dict):
            det = [det]
        
        produtos = []
        for item in det:
            prod = item.get('prod', {})
            imposto = item.get('imposto', {})
            icms = imposto.get('ICMS', {})
            pis = imposto.get('PIS', {})
            cofins = imposto.get('COFINS', {})
            ipi = imposto.get('IPI', {})
            
            cfop = prod.get('CFOP', '')  # CFOP está no prod, não no ICMS
            cst_icms = ""
            cst_pis = ""
            cst_cofins = ""
            
            for key in icms:
                if isinstance(icms[key], dict):
                    if not cfop and 'CFOP' in icms[key]:  # Fallback para ICMS se não encontrar em prod
                        cfop = icms[key]['CFOP']
                    if 'CST' in icms[key]:
                        cst_icms = icms[key]['CST']
                    elif 'CSOSN' in icms[key]:
                        cst_icms = icms[key]['CSOSN']
            
            v_icms = 0
            v_bc = 0
            v_icms_st = 0
            v_bc_st = 0
            v_pis = 0
            v_cofins = 0
            v_ipi = 0
            p_icms = 0  # Alíquota de ICMS
            p_pis = 0   # Alíquota de PIS
            p_cofins = 0  # Alíquota de COFINS
            v_bc_pis = 0  # Base de cálculo do PIS
            v_bc_cofins = 0  # Base de cálculo da COFINS
            
            # Extrair ICMS próprio e ST
            for key in icms:
                if isinstance(icms[key], dict):
                    v_icms = float(icms[key].get('vICMS', 0) or 0)
                    v_bc = float(icms[key].get('vBC', 0) or 0)
                    p_icms = float(icms[key].get('pICMS', 0) or 0)  # Alíquota de ICMS
                    # ICMS-ST
                    v_icms_st = float(icms[key].get('vICMSST', 0) or 0)
                    v_bc_st = float(icms[key].get('vBCST', 0) or 0)
                    break
            
            # Extrair IPI
            for key in ipi:
                if isinstance(ipi[key], dict):
                    v_ipi = float(ipi[key].get('vIPI', 0) or 0)
                    break
            
            for key in pis:
                if isinstance(pis[key], dict):
                    v_pis = float(pis[key].get('vPIS', 0) or 0)
                    v_bc_pis = float(pis[key].get('vBC', 0) or 0)  # Base de cálculo do PIS
                    p_pis = float(pis[key].get('pPIS', 0) or 0)  # Alíquota de PIS
                    # Extrair CST de PIS
                    cst_pis = pis[key].get('CST', '')
                    break
            
            for key in cofins:
                if isinstance(cofins[key], dict):
                    v_cofins = float(cofins[key].get('vCOFINS', 0) or 0)
                    v_bc_cofins = float(cofins[key].get('vBC', 0) or 0)  # Base de cálculo da COFINS
                    p_cofins = float(cofins[key].get('pCOFINS', 0) or 0)  # Alíquota de COFINS
                    # Extrair CST de COFINS
                    cst_cofins = cofins[key].get('CST', '')
                    break
            
            # NCM para verificar alíquota zero
            ncm = prod.get('NCM', '')
            
            # Valores do item (frete, seguro, outras despesas, desconto)
            v_frete_item = float(prod.get('vFrete', 0) or 0)
            v_seg_item = float(prod.get('vSeg', 0) or 0)
            v_outro_item = float(prod.get('vOutro', 0) or 0)
            v_desc_item = float(prod.get('vDesc', 0) or 0)
            
            # Valor do produto (vProd)
            v_prod = float(prod.get('vProd', 0) or 0)
            
            # Valor total da mercadoria (soma todos os componentes que afetam custo)
            # vProd + vIPI + vICMSST + vFrete + vSeg + vOutro - vDesc
            valor_total_custo = v_prod + v_ipi + v_icms_st + v_frete_item + v_seg_item + v_outro_item - v_desc_item
            
            produtos.append({
                'codigo': prod.get('cProd', ''),
                'descricao': prod.get('xProd', ''),
                'ncm': ncm,
                'cfop': cfop,
                'cst': cst_icms,
                'cst_pis_xml': cst_pis,  # CST original do XML
                'cst_cofins_xml': cst_cofins,  # CST original do XML
                'cst_pis': cst_pis,  # Será atualizado após determinar tipo de operação
                'cst_cofins': cst_cofins,  # Será atualizado após determinar tipo de operação
                'ncm_aliq_zero': is_ncm_aliquota_zero(ncm),  # Flag de alíquota zero pelo NCM
                'quantidade': float(prod.get('qCom', 0) or 0),
                'valor_unitario': float(prod.get('vUnCom', 0) or 0),
                'valor_total': valor_total_custo,  # Valor total considerando todos os componentes
                'valor_produto': v_prod,  # Valor do produto puro (vProd)
                'unidade': prod.get('uCom', ''),
                'v_bc_icms': v_bc,
                'v_icms': v_icms,
                'p_icms': p_icms,  # Alíquota de ICMS
                'v_bc_icms_st': v_bc_st,
                'v_icms_st': v_icms_st,
                'v_ipi': v_ipi,
                'v_frete': v_frete_item,
                'v_seguro': v_seg_item,
                'v_outras_despesas': v_outro_item,
                'v_desconto': v_desc_item,
                'v_pis': v_pis,
                'v_bc_pis': v_bc_pis,  # Base de cálculo do PIS
                'p_pis': p_pis,  # Alíquota de PIS
                'v_cofins': v_cofins,
                'v_bc_cofins': v_bc_cofins,  # Base de cálculo da COFINS
                'p_cofins': p_cofins  # Alíquota de COFINS
            })
        
        return {
            'chave_nfe': nfe.get('@Id', '').replace('NFe', ''),
            'numero_nfe': ide.get('nNF', ''),
            'serie': ide.get('serie', ''),
            'data_emissao': ide.get('dhEmi', ''),
            # Dados do emitente
            'emitente_cnpj': emit.get('CNPJ', ''),
            'emitente_nome': emit.get('xNome', ''),
            'emitente_ie': emit.get('IE', ''),
            'emitente_uf': emitente_uf,
            'emitente_endereco': emitente_endereco,
            # Dados do destinatário
            'destinatario_cnpj': dest.get('CNPJ', ''),
            'destinatario_nome': dest.get('xNome', ''),
            'destinatario_ie': dest.get('IE', ''),
            'destinatario_uf': destinatario_uf,
            'destinatario_endereco': destinatario_endereco,
            'valor_total': float(total.get('vNF', 0)),
            # Totais do documento
            'total_frete': vFrete_total,
            'total_seguro': vSeg_total,
            'total_outras_despesas': vOutro_total,
            'total_desconto': vDesc_total,
            'total_ipi': vIPI_total,
            'total_icms_st': vICMSST_total,
            'produtos': produtos
        }
    except Exception as e:
        raise ValueError(f"Erro ao processar XML: {str(e)}")

def parse_xml_nfce(xml_content: str) -> Dict[str, Any]:
    """Parser para NFC-e (Nota Fiscal de Consumidor Eletrônica / Cupom Fiscal)"""
    try:
        data = xmltodict.parse(xml_content)
        
        # Tentar diferentes estruturas de NFC-e
        nfce = data.get('nfeProc', {}).get('NFe', {}).get('infNFe', {})
        if not nfce:
            nfce = data.get('NFe', {}).get('infNFe', {})
        if not nfce:
            raise ValueError("Estrutura de XML NFC-e inválida")
        
        ide = nfce.get('ide', {})
        emit = nfce.get('emit', {})
        dest = nfce.get('dest', {}) or {}
        total = nfce.get('total', {}).get('ICMSTot', {})
        det = nfce.get('det', [])
        
        # Extrair dados completos do emitente
        enderEmit = emit.get('enderEmit', {})
        emitente_uf = enderEmit.get('UF', '')
        emitente_endereco = {
            'logradouro': enderEmit.get('xLgr', ''),
            'numero': enderEmit.get('nro', ''),
            'complemento': enderEmit.get('xCpl', ''),
            'bairro': enderEmit.get('xBairro', ''),
            'cidade': enderEmit.get('xMun', ''),
            'cod_municipio': enderEmit.get('cMun', ''),
            'uf': emitente_uf,
            'cep': enderEmit.get('CEP', ''),
            'pais': enderEmit.get('xPais', 'BRASIL'),
            'cod_pais': enderEmit.get('cPais', '1058'),
            'telefone': enderEmit.get('fone', '')
        }
        
        # Extrair dados completos do destinatário (NFC-e geralmente é consumidor final)
        enderDest = dest.get('enderDest', {}) if dest else {}
        destinatario_uf = enderDest.get('UF', '') if enderDest else ''
        destinatario_endereco = {
            'logradouro': enderDest.get('xLgr', ''),
            'numero': enderDest.get('nro', ''),
            'complemento': enderDest.get('xCpl', ''),
            'bairro': enderDest.get('xBairro', ''),
            'cidade': enderDest.get('xMun', ''),
            'cod_municipio': enderDest.get('cMun', ''),
            'uf': destinatario_uf,
            'cep': enderDest.get('CEP', ''),
            'pais': enderDest.get('xPais', 'BRASIL'),
            'cod_pais': enderDest.get('cPais', '1058'),
            'telefone': enderDest.get('fone', '')
        }
        
        if isinstance(det, dict):
            det = [det]
        
        produtos = []
        for item in det:
            prod = item.get('prod', {})
            imposto = item.get('imposto', {})
            icms = imposto.get('ICMS', {})
            pis = imposto.get('PIS', {})
            cofins = imposto.get('COFINS', {})
            
            cfop = prod.get('CFOP', '')
            cst_icms = ""
            cst_pis = ""
            cst_cofins = ""
            v_icms = 0
            v_bc = 0
            v_pis = 0
            v_cofins = 0
            
            for key in icms:
                if isinstance(icms[key], dict):
                    if not cfop and 'CFOP' in icms[key]:
                        cfop = icms[key]['CFOP']
                    if 'CST' in icms[key]:
                        cst_icms = icms[key]['CST']
                    elif 'CSOSN' in icms[key]:
                        cst_icms = icms[key]['CSOSN']
                    v_icms = float(icms[key].get('vICMS', 0) or 0)
                    v_bc = float(icms[key].get('vBC', 0) or 0)
            
            for key in pis:
                if isinstance(pis[key], dict):
                    v_pis = float(pis[key].get('vPIS', 0) or 0)
                    cst_pis = pis[key].get('CST', '')
                    break
            
            for key in cofins:
                if isinstance(cofins[key], dict):
                    v_cofins = float(cofins[key].get('vCOFINS', 0) or 0)
                    cst_cofins = cofins[key].get('CST', '')
                    break
            
            # NCM para verificar alíquota zero
            ncm = prod.get('NCM', '')
            
            produtos.append({
                'codigo': prod.get('cProd', ''),
                'descricao': prod.get('xProd', ''),
                'ncm': ncm,
                'cfop': cfop,
                'cst': cst_icms,
                'cst_pis_xml': cst_pis,
                'cst_cofins_xml': cst_cofins,
                'cst_pis': cst_pis,
                'cst_cofins': cst_cofins,
                'ncm_aliq_zero': is_ncm_aliquota_zero(ncm),
                'quantidade': float(prod.get('qCom', 0) or 0),
                'valor_unitario': float(prod.get('vUnCom', 0) or 0),
                'valor_total': float(prod.get('vProd', 0) or 0),
                'unidade': prod.get('uCom', ''),
                'v_bc_icms': v_bc,
                'v_icms': v_icms,
                'v_pis': v_pis,
                'v_cofins': v_cofins
            })
        
        return {
            'modelo': 'nfce',
            'chave_nfe': nfce.get('@Id', '').replace('NFe', ''),
            'numero_nfe': ide.get('nNF', ''),
            'serie': ide.get('serie', ''),
            'data_emissao': ide.get('dhEmi', ''),
            # Dados do emitente
            'emitente_cnpj': emit.get('CNPJ', ''),
            'emitente_nome': emit.get('xNome', ''),
            'emitente_ie': emit.get('IE', ''),
            'emitente_uf': emitente_uf,
            'emitente_endereco': emitente_endereco,
            # Dados do destinatário
            'destinatario_cnpj': dest.get('CNPJ', '') or dest.get('CPF', '') or '',
            'destinatario_nome': dest.get('xNome', '') or 'CONSUMIDOR',
            'destinatario_ie': dest.get('IE', '') if dest else '',
            'destinatario_uf': destinatario_uf,
            'destinatario_endereco': destinatario_endereco,
            'valor_total': float(total.get('vNF', 0)),
            'produtos': produtos
        }
    except Exception as e:
        raise ValueError(f"Erro ao processar XML NFC-e: {str(e)}")

def parse_xml_nfse(xml_content: str) -> Dict[str, Any]:
    """Parser para NFS-e (Nota Fiscal de Serviço Eletrônica)"""
    try:
        data = xmltodict.parse(xml_content)
        
        # Tentar diferentes estruturas de NFS-e (varia por município)
        # Padrão ABRASF
        nfse = None
        compnfse = data.get('CompNfse', {})
        if compnfse:
            nfse = compnfse.get('Nfse', {}).get('InfNfse', {})
        
        if not nfse:
            nfse = data.get('Nfse', {}).get('InfNfse', {})
        if not nfse:
            nfse = data.get('ConsultarNfseResposta', {}).get('ListaNfse', {}).get('CompNfse', {}).get('Nfse', {}).get('InfNfse', {})
        if not nfse:
            # Tentar formato simplificado
            nfse = data.get('nfse', {}) or data
        
        if not nfse:
            raise ValueError("Estrutura de XML NFS-e inválida")
        
        # Dados do prestador (quem emitiu)
        prestador = nfse.get('PrestadorServico', {}) or nfse.get('Prestador', {})
        id_prestador = prestador.get('IdentificacaoPrestador', {})
        cnpj_prestador = id_prestador.get('Cnpj', '') or prestador.get('Cnpj', '')
        nome_prestador = prestador.get('RazaoSocial', '') or prestador.get('NomeFantasia', '')
        
        # Endereço do prestador
        endereco_prestador_data = prestador.get('Endereco', {})
        prestador_endereco = {
            'logradouro': endereco_prestador_data.get('Endereco', '') or endereco_prestador_data.get('Logradouro', ''),
            'numero': endereco_prestador_data.get('Numero', ''),
            'complemento': endereco_prestador_data.get('Complemento', ''),
            'bairro': endereco_prestador_data.get('Bairro', ''),
            'cidade': endereco_prestador_data.get('Cidade', '') or endereco_prestador_data.get('xMun', ''),
            'cod_municipio': endereco_prestador_data.get('CodigoMunicipio', ''),
            'uf': endereco_prestador_data.get('Uf', ''),
            'cep': endereco_prestador_data.get('Cep', ''),
            'pais': 'BRASIL',
            'cod_pais': '1058',
            'telefone': prestador.get('Contato', {}).get('Telefone', '') or ''
        }
        
        # Dados do tomador (cliente)
        tomador = nfse.get('TomadorServico', {}) or nfse.get('Tomador', {})
        id_tomador = tomador.get('IdentificacaoTomador', {})
        cpf_cnpj_tomador = id_tomador.get('CpfCnpj', {})
        cnpj_tomador = cpf_cnpj_tomador.get('Cnpj', '') or cpf_cnpj_tomador.get('Cpf', '') or tomador.get('Cnpj', '') or tomador.get('Cpf', '')
        nome_tomador = tomador.get('RazaoSocial', '') or tomador.get('NomeFantasia', '') or 'TOMADOR'
        
        # Endereço do tomador
        endereco_tomador_data = tomador.get('Endereco', {})
        tomador_endereco = {
            'logradouro': endereco_tomador_data.get('Endereco', '') or endereco_tomador_data.get('Logradouro', ''),
            'numero': endereco_tomador_data.get('Numero', ''),
            'complemento': endereco_tomador_data.get('Complemento', ''),
            'bairro': endereco_tomador_data.get('Bairro', ''),
            'cidade': endereco_tomador_data.get('Cidade', '') or endereco_tomador_data.get('xMun', ''),
            'cod_municipio': endereco_tomador_data.get('CodigoMunicipio', ''),
            'uf': endereco_tomador_data.get('Uf', ''),
            'cep': endereco_tomador_data.get('Cep', ''),
            'pais': 'BRASIL',
            'cod_pais': '1058',
            'telefone': tomador.get('Contato', {}).get('Telefone', '') or ''
        }
        
        # Dados do serviço
        servico = nfse.get('Servico', {}) or nfse.get('DeclaracaoPrestacaoServico', {}).get('Servico', {})
        valores = servico.get('Valores', {})
        
        valor_servicos = float(valores.get('ValorServicos', 0) or servico.get('ValorServicos', 0) or 0)
        valor_iss = float(valores.get('ValorIss', 0) or 0)
        aliq_iss = float(valores.get('Aliquota', 0) or 0)
        
        # Número e data
        numero = nfse.get('Numero', '') or nfse.get('IdentificacaoNfse', {}).get('Numero', '')
        data_emissao = nfse.get('DataEmissao', '') or nfse.get('DataEmissaoNfse', '')
        codigo_verificacao = nfse.get('CodigoVerificacao', '')
        
        # Discriminação do serviço
        discriminacao = servico.get('Discriminacao', '') or ''
        codigo_servico = servico.get('ItemListaServico', '') or servico.get('CodigoTributacaoMunicipio', '')
        
        servicos = [{
            'codigo': codigo_servico,
            'descricao': discriminacao[:200] if discriminacao else 'Serviço',
            'valor_total': valor_servicos,
            'aliq_iss': aliq_iss,
            'valor_iss': valor_iss,
            'v_pis': float(valores.get('ValorPis', 0) or 0),
            'v_cofins': float(valores.get('ValorCofins', 0) or 0),
            'v_inss': float(valores.get('ValorInss', 0) or 0),
            'v_ir': float(valores.get('ValorIr', 0) or 0),
            'v_csll': float(valores.get('ValorCsll', 0) or 0)
        }]
        
        return {
            'modelo': 'nfse',
            'chave_nfe': codigo_verificacao or str(uuid.uuid4())[:20],
            'numero_nfe': str(numero),
            'serie': '1',
            'data_emissao': data_emissao,
            # Dados do prestador (emitente)
            'emitente_cnpj': cnpj_prestador,
            'emitente_nome': nome_prestador,
            'emitente_ie': id_prestador.get('InscricaoMunicipal', ''),
            'emitente_uf': prestador_endereco.get('uf', ''),
            'emitente_endereco': prestador_endereco,
            # Dados do tomador (destinatário)
            'destinatario_cnpj': cnpj_tomador,
            'destinatario_nome': nome_tomador,
            'destinatario_ie': id_tomador.get('InscricaoMunicipal', ''),
            'destinatario_uf': tomador_endereco.get('uf', ''),
            'destinatario_endereco': tomador_endereco,
            'valor_total': valor_servicos,
            'valor_servicos': valor_servicos,
            'produtos': [],
            'servicos': servicos
        }
    except Exception as e:
        raise ValueError(f"Erro ao processar XML NFS-e: {str(e)}")

def detect_xml_type(xml_content: str) -> str:
    """Detecta o tipo de XML: nfe, nfce, nfse"""
    xml_lower = xml_content.lower()
    
    # NFS-e tem tags específicas
    if '<compnfse' in xml_lower or '<nfse' in xml_lower or '<infnfse' in xml_lower or '<prestadorservico' in xml_lower:
        return 'nfse'
    
    # NFC-e modelo 65
    if 'mod>65<' in xml_lower or '<mod>65</mod>' in xml_lower:
        return 'nfce'
    
    # NF-e modelo 55 (padrão)
    return 'nfe'

def classify_product_category(descricao: str, ncm: str, company_products: List[str], company_insumos: List[str], company_despesas: List[str], company_ativos: List[str] = [], company_combustiveis: List[str] = []) -> tuple:
    """Classifica produto e retorna (categoria, justificativa) usando correspondência inteligente"""
    descricao_lower = descricao.lower().strip()
    descricao_words = set(descricao_lower.split())
    
    def match_keywords(keywords: List[str], descricao_lower: str, descricao_words: set) -> tuple:
        """Verifica correspondência entre palavras-chave e descrição com diferentes níveis de confiança"""
        for keyword in keywords:
            keyword_lower = keyword.lower().strip()
            if not keyword_lower:
                continue
                
            # Match exato
            if keyword_lower == descricao_lower:
                return (True, keyword, "exato")
            
            # Keyword está contida na descrição
            if keyword_lower in descricao_lower:
                return (True, keyword, "contido")
            
            # Descrição contém a keyword
            if descricao_lower in keyword_lower:
                return (True, keyword, "parcial")
            
            # Match por palavras individuais (para keywords multi-palavras)
            keyword_words = set(keyword_lower.split())
            if len(keyword_words) > 1:
                # Se todas as palavras da keyword estão na descrição
                if keyword_words.issubset(descricao_words):
                    return (True, keyword, "palavras")
                # Se a maioria das palavras está presente (fuzzy)
                matching_words = keyword_words.intersection(descricao_words)
                if len(matching_words) >= len(keyword_words) * 0.7:
                    return (True, keyword, "fuzzy")
            else:
                # Para keywords de uma palavra, verificar se está nas palavras da descrição
                if keyword_lower in descricao_words:
                    return (True, keyword, "palavra")
        
        return (False, None, None)
    
    # PRIORIDADE 1: Combustíveis customizados da empresa (alta prioridade)
    if company_combustiveis:
        matched, keyword, match_type = match_keywords(company_combustiveis, descricao_lower, descricao_words)
        if matched:
            return ('combustivel', f'🔥 Combustível cadastrado na empresa [{keyword}] (match: {match_type})')
    
    # PRIORIDADE 2: Ativo imobilizado customizado da empresa (alta prioridade)
    if company_ativos:
        matched, keyword, match_type = match_keywords(company_ativos, descricao_lower, descricao_words)
        if matched:
            return ('ativo_imobilizado', f'🏭 Ativo imobilizado cadastrado na empresa [{keyword}] (match: {match_type})')
    
    # PRIORIDADE 3: Despesas customizadas da empresa (alta prioridade)
    if company_despesas:
        matched, keyword, match_type = match_keywords(company_despesas, descricao_lower, descricao_words)
        if matched:
            return ('despesa', f'📋 Despesa cadastrada na empresa [{keyword}] (match: {match_type})')
    
    # PRIORIDADE 4: Insumos customizados da empresa (alta prioridade)
    if company_insumos:
        matched, keyword, match_type = match_keywords(company_insumos, descricao_lower, descricao_words)
        if matched:
            return ('insumo', f'⚙️ Insumo cadastrado na empresa [{keyword}] (match: {match_type})')
    
    # PRIORIDADE 5: Produtos de revenda customizados da empresa (alta prioridade)
    if company_products:
        matched, keyword, match_type = match_keywords(company_products, descricao_lower, descricao_words)
        if matched:
            return ('revenda', f'🛒 Produto comercializado cadastrado na empresa [{keyword}] (match: {match_type})')
    
    # PRIORIDADE 6: Combustíveis padrão (média prioridade)
    combustiveis_padrao = ['gasolina', 'diesel', 'etanol', 'alcool combustivel', 'gnv', 'gas natural', 'oleo diesel', 'biodiesel', 'querosene']
    matched, keyword, match_type = match_keywords(combustiveis_padrao, descricao_lower, descricao_words)
    if matched:
        return ('combustivel', f'Combustível identificado ({keyword})')
    
    # PRIORIDADE 7: Ativo imobilizado padrão (média prioridade)
    ativos_padrao = ['maquina', 'equipamento', 'veiculo', 'computador', 'servidor', 'ar condicionado', 'movel', 'estante', 'balcao', 'gondola', 'prateleira', 'freezer', 'geladeira', 'empilhadeira', 'caminhao', 'carro', 'moto', 'notebook', 'impressora industrial']
    matched, keyword, match_type = match_keywords(ativos_padrao, descricao_lower, descricao_words)
    if matched:
        return ('ativo_imobilizado', f'Ativo imobilizado identificado ({keyword})')
    
    # PRIORIDADE 8: Materiais de escritório (baixa prioridade - apenas se não houver match anterior)
    materiais_escritorio = ['papel sulfite', 'papel a4', 'caneta', 'lapis', 'pasta arquivo', 'grampeador', 'clips', 'borracha', 'toner', 'cartucho tinta']
    matched, keyword, match_type = match_keywords(materiais_escritorio, descricao_lower, descricao_words)
    if matched:
        return ('despesa', f'Material de escritório ({keyword})')
    
    # PRIORIDADE 9: Materiais de limpeza (baixa prioridade)
    materiais_limpeza = ['sabao', 'detergente', 'desinfetante', 'alcool gel', 'alcool 70', 'papel higienico', 'toalha papel', 'vassoura', 'pano limpeza', 'luva limpeza', 'saco lixo', 'agua sanitaria', 'desengordurante']
    matched, keyword, match_type = match_keywords(materiais_limpeza, descricao_lower, descricao_words)
    if matched:
        return ('despesa', f'Material de limpeza ({keyword})')
    
    # PRIORIDADE 10: Materiais de construção/manutenção (baixa prioridade)
    materiais_construcao = ['cimento', 'areia', 'tijolo', 'telha', 'tinta parede', 'massa corrida', 'prego', 'parafuso', 'madeira', 'ferro construcao', 'porta', 'janela']
    matched, keyword, match_type = match_keywords(materiais_construcao, descricao_lower, descricao_words)
    if matched:
        return ('despesa', f'Material de construção/manutenção ({keyword})')
    
    # Padrão: revenda (produto do escopo da empresa) - mas sinalizando que precisa validação
    return ('revenda', 'Produto presumido para revenda (validar classificação)')

async def suggest_cfop_intelligent(product: Dict[str, Any], company_id: str, tipo_doc: str, cfop_original: str, emitente_uf: str = '') -> Dict[str, Any]:
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        return {"cfop_sugerido": None, "categoria": None, "justificativa": None}
    
    produtos_comercializados = company.get('produtos_comercializados', [])
    insumos_producao = company.get('insumos_producao', [])
    produtos_despesa = company.get('produtos_despesa', [])
    ativo_imobilizado = company.get('ativo_imobilizado', [])
    combustivel = company.get('combustivel', [])
    company_uf = company.get('uf', 'SP')
    
    categoria, justificativa = classify_product_category(
        product.get('descricao', ''),
        product.get('ncm', ''),
        produtos_comercializados,
        insumos_producao,
        produtos_despesa,
        ativo_imobilizado,
        combustivel
    )
    
    cst = product.get('cst', '')
    is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
    
    is_transferencia = cfop_original.startswith('5152') or cfop_original.startswith('6152') or \
                       cfop_original.startswith('5552') or cfop_original.startswith('6552')
    
    # Prefixo Inteligente: 1 (Estadual) ou 2 (Interestadual)
    if emitente_uf and emitente_uf != company_uf:
        cfop_prefix = '2'
    else:
        cfop_prefix = '1'
    
    cfop_sugerido = None
    
    if tipo_doc == 'entrada':
        if is_transferencia:
            cfop_sugerido = cfop_prefix + '152'
            justificativa = 'Transferência entre estabelecimentos'
        elif categoria == 'combustivel':
            cfop_sugerido = cfop_prefix + '653'
        elif categoria == 'ativo_imobilizado':
            if is_st:
                cfop_sugerido = cfop_prefix + '406'
                justificativa += ' (com Substituição Tributária)'
            else:
                cfop_sugerido = cfop_prefix + '551'
        elif categoria == 'revenda':
            if is_st:
                cfop_sugerido = cfop_prefix + '403'
                justificativa += ' (com Substituição Tributária)'
            else:
                cfop_sugerido = cfop_prefix + '102'
        elif categoria == 'insumo':
            if is_st:
                cfop_sugerido = cfop_prefix + '401'
                justificativa += ' (com Substituição Tributária)'
            else:
                cfop_sugerido = cfop_prefix + '101'
        elif categoria == 'despesa':
            if is_st:
                cfop_sugerido = cfop_prefix + '407'
                justificativa += ' (com Substituição Tributária)'
            else:
                cfop_sugerido = cfop_prefix + '556'
    
    return {
        "cfop_sugerido": cfop_sugerido,
        "categoria": categoria,
        "justificativa": justificativa,
        "is_st": is_st,
        "is_transferencia": is_transferencia
    }

def generate_sped_fiscal(company: Company, documents: List[XMLDocument], periodo: str, excluir_creditos_despesa_st: bool = False) -> str:
    """
    Gera arquivo SPED Fiscal no layout versão 019 (válido para 2025)
    Baseado na Nota Técnica 2024.001 v1.0 - Ato Cotepe nº 131/2024
    
    Parâmetros:
    - excluir_creditos_despesa_st: Se True, exclui créditos de ICMS de CFOPs de despesa e ST na apuração (E110)
    """
    lines = []
    
    # Parsear período (MM/AAAA) para obter datas corretas
    try:
        mes, ano = periodo.split('/')
        mes = int(mes)
        ano = int(ano)
        # SPED usa formato DDMMAAAA
        dt_inicio = f"01{mes:02d}{ano:04d}"
        # Último dia do mês
        from calendar import monthrange
        ultimo_dia = monthrange(ano, mes)[1]
        dt_fim = f"{ultimo_dia:02d}{mes:02d}{ano:04d}"
    except:
        dt_inicio = "01012025"
        dt_fim = "31012025"
    
    # Limpar CNPJ
    cnpj_limpo = company.cnpj.replace('.','').replace('/','').replace('-','') if company.cnpj else ''
    
    # Código do município IBGE (usar código padrão se não disponível)
    cod_mun = getattr(company, 'cod_municipio', '') or '3550308'  # São Paulo como padrão
    
    # Indicador de atividade: 0=Industrial/equiparado, 1=Outros
    ind_atividade = '1' if company.tipo_atividade == 'comercio' else '0'
    
    # Registro 0000 - Abertura do arquivo digital (Layout V019)
    # |REG|COD_VER|COD_FIN|DT_INI|DT_FIM|NOME|CNPJ|CPF|UF|IE|COD_MUN|IM|SUFRAMA|IND_PERFIL|IND_ATIV|
    lines.append("|0000|019|0|{}|{}|{}|{}||{}|{}|{}|||A|{}|".format(
        dt_inicio,                                          # DT_INI
        dt_fim,                                             # DT_FIM
        (company.razao_social or '')[:100],                 # NOME
        cnpj_limpo,                                         # CNPJ
        company.uf or 'SP',                                 # UF
        (company.inscricao_estadual or '').replace('.','').replace('-',''),  # IE
        cod_mun,                                            # COD_MUN
        ind_atividade                                       # IND_ATIV
    ))
    
    # Registro 0001 - Abertura do Bloco 0
    lines.append("|0001|0|")
    
    # Registro 0005 - Dados complementares da entidade
    # |REG|FANTASIA|CEP|END|NUM|COMPL|BAIRRO|FONE|FAX|EMAIL|
    lines.append("|0005|{}|{}|{}|{}|{}|{}|{}||{}|".format(
        (company.nome_fantasia or company.razao_social or '')[:60],  # FANTASIA
        (company.cep or '').replace('-',''),                         # CEP
        (company.endereco or '')[:60],                               # END
        (getattr(company, 'numero', '') or 'S/N')[:10],             # NUM
        (getattr(company, 'complemento', '') or '')[:60],           # COMPL
        (getattr(company, 'bairro', '') or '')[:60],                # BAIRRO
        (getattr(company, 'telefone', '') or '').replace('(','').replace(')','').replace('-','').replace(' ',''),  # FONE
        getattr(company, 'email', '') or ''                          # EMAIL
    ))
    
    # Registro 0100 - Contador
    # |REG|NOME|CPF|CRC|CNPJ|CEP|END|NUM|COMPL|BAIRRO|FONE|FAX|EMAIL|COD_MUN|
    lines.append("|0100|BUSINESS CONTABILIDADE||CRC-SP|12345678000199|01310100|AV PAULISTA|1000|||BELA VISTA|1140787878||business@businessconta.com.br|3550308|")
    
    # Registro 0150 - Participantes (fornecedores/clientes) com dados completos
    participantes = {}
    for doc in documents:
        emit_cnpj = doc.emitente_cnpj.replace('.','').replace('/','').replace('-','') if doc.emitente_cnpj else ''
        dest_cnpj = doc.destinatario_cnpj.replace('.','').replace('/','').replace('-','') if doc.destinatario_cnpj else ''
        
        # Coletar dados do emitente
        if emit_cnpj and emit_cnpj not in participantes:
            emit_end = getattr(doc, 'emitente_endereco', {}) or {}
            participantes[emit_cnpj] = {
                'nome': (doc.emitente_nome or 'FORNECEDOR')[:60],
                'ie': (getattr(doc, 'emitente_ie', '') or '').replace('.','').replace('-',''),
                'cod_mun': emit_end.get('cod_municipio', '') or '',
                'uf': emit_end.get('uf', '') or getattr(doc, 'emitente_uf', '') or '',
                'endereco': (emit_end.get('logradouro', '') or '')[:60],
                'numero': (emit_end.get('numero', '') or '')[:10],
                'complemento': (emit_end.get('complemento', '') or '')[:60],
                'bairro': (emit_end.get('bairro', '') or '')[:60],
                'cep': (emit_end.get('cep', '') or '').replace('-',''),
                'cod_pais': emit_end.get('cod_pais', '1058'),
            }
        
        # Coletar dados do destinatário
        if dest_cnpj and dest_cnpj not in participantes:
            dest_end = getattr(doc, 'destinatario_endereco', {}) or {}
            participantes[dest_cnpj] = {
                'nome': (doc.destinatario_nome or 'CLIENTE')[:60],
                'ie': (getattr(doc, 'destinatario_ie', '') or '').replace('.','').replace('-',''),
                'cod_mun': dest_end.get('cod_municipio', '') or '',
                'uf': dest_end.get('uf', '') or getattr(doc, 'destinatario_uf', '') or '',
                'endereco': (dest_end.get('logradouro', '') or '')[:60],
                'numero': (dest_end.get('numero', '') or '')[:10],
                'complemento': (dest_end.get('complemento', '') or '')[:60],
                'bairro': (dest_end.get('bairro', '') or '')[:60],
                'cep': (dest_end.get('cep', '') or '').replace('-',''),
                'cod_pais': dest_end.get('cod_pais', '1058'),
            }
    
    # |REG|COD_PART|NOME|COD_PAIS|CNPJ|CPF|IE|COD_MUN|SUFRAMA|END|NUM|COMPL|BAIRRO|
    for cnpj, info in participantes.items():
        lines.append("|0150|{}|{}|{}|{}||{}|{}||{}|{}|{}|{}|".format(
            cnpj,                       # COD_PART
            info['nome'],               # NOME
            info['cod_pais'] or '1058', # COD_PAIS
            cnpj,                       # CNPJ
            info['ie'],                 # IE
            info['cod_mun'],            # COD_MUN
            info['endereco'],           # END
            info['numero'],             # NUM
            info['complemento'],        # COMPL
            info['bairro']              # BAIRRO
        ))
    
    # Registro 0190 - Unidades de medida
    unidades_usadas = set()
    for doc in documents:
        for prod in doc.produtos:
            un = prod.get('unidade', 'UN') or 'UN'
            unidades_usadas.add(un.upper()[:6])
    
    for un in unidades_usadas:
        descricao_un = {
            'UN': 'UNIDADE', 'KG': 'QUILOGRAMA', 'G': 'GRAMA', 'L': 'LITRO',
            'ML': 'MILILITRO', 'M': 'METRO', 'M2': 'METRO QUADRADO', 'M3': 'METRO CUBICO',
            'PC': 'PECA', 'CX': 'CAIXA', 'PCT': 'PACOTE', 'FD': 'FARDO',
            'DZ': 'DUZIA', 'PAR': 'PAR', 'SC': 'SACO', 'LT': 'LATA'
        }.get(un, un)
        lines.append("|0190|{}|{}|".format(un, descricao_un))
    
    # Registro 0200 - Produtos
    all_products = {}
    for doc in documents:
        for prod in doc.produtos:
            prod_code = prod.get('codigo', '')
            if prod_code and prod_code not in all_products:
                all_products[prod_code] = prod
    
    # |REG|COD_ITEM|DESCR_ITEM|COD_BARRA|COD_ANT_ITEM|UNID_INV|TIPO_ITEM|COD_NCM|EX_IPI|COD_GEN|COD_LST|ALIQ_ICMS|CEST|
    for code, prod in all_products.items():
        ncm = prod.get('ncm', '') or ''
        tipo_item = '00'  # 00=Mercadoria para Revenda
        if prod.get('categoria_classificada', '').lower() == 'insumo':
            tipo_item = '01'  # Matéria-prima
        elif prod.get('categoria_classificada', '').lower() == 'despesa':
            tipo_item = '06'  # Material de uso e consumo
        elif prod.get('categoria_classificada', '').lower() == 'ativo_imobilizado':
            tipo_item = '08'  # Ativo Imobilizado
            
        lines.append("|0200|{}|{}||{}|{}|{}|{}|||||{}|".format(
            code[:60],                                  # COD_ITEM
            (prod.get('descricao', '') or '')[:60],    # DESCR_ITEM
            code[:60],                                  # COD_ANT_ITEM
            (prod.get('unidade', 'UN') or 'UN')[:6],   # UNID_INV
            tipo_item,                                  # TIPO_ITEM
            ncm[:8],                                    # COD_NCM
            prod.get('cest', '') or ''                 # CEST
        ))
    
    # Registro 0990 - Encerramento do Bloco 0
    qtd_linhas_bloco_0 = len([l for l in lines if l.startswith('|0')]) + 1
    lines.append("|0990|{}|".format(qtd_linhas_bloco_0))
    
    # BLOCO C - Documentos Fiscais I (Mercadorias - ICMS/IPI)
    lines.append("|C001|0|")  # 0 = com movimento
    
    for doc in documents:
        # Indicador de operação: 0=Entrada, 1=Saída
        ind_oper = '1' if doc.tipo == 'saida' else '0'
        
        # Indicador do emitente: 0=Emissão própria, 1=Terceiros
        ind_emit = '0' if doc.tipo == 'saida' else '1'
        
        # Formatar data (DDMMAAAA)
        data_emissao = ''
        if doc.data_emissao:
            try:
                if '-' in doc.data_emissao:
                    partes = doc.data_emissao[:10].split('-')
                    data_emissao = f"{partes[2]}{partes[1]}{partes[0]}"
                else:
                    data_emissao = doc.data_emissao.replace('/','')
            except:
                data_emissao = dt_inicio
        
        emit_cnpj = doc.emitente_cnpj.replace('.','').replace('/','').replace('-','') if doc.emitente_cnpj else ''
        
        # Código situação: 00=Regular
        cod_sit = '00'
        
        # Modelo documento: 55=NF-e, 65=NFC-e
        modelo = doc.modelo if hasattr(doc, 'modelo') and doc.modelo else '55'
        if modelo == 'nfce':
            modelo = '65'
        elif modelo == 'nfe':
            modelo = '55'
        
        # Registro C100 - Nota Fiscal (código 01, 1B, 04, 55 e 65)
        # Layout oficial: REG|IND_OPER|IND_EMIT|COD_PART|COD_MOD|COD_SIT|SER|NUM_DOC|CHV_NFE|DT_DOC|DT_E_S|VL_DOC|IND_PGTO|VL_DESC|VL_ABAT_NT|VL_MERC|IND_FRT|VL_FRT|VL_SEG|VL_OUT_DA|VL_BC_ICMS|VL_ICMS|VL_BC_ICMS_ST|VL_ICMS_ST|VL_IPI|VL_PIS|VL_COFINS|VL_PIS_ST|VL_COFINS_ST
        
        # Obter série da chave NFe (posição 22-24) ou usar '1' como padrão
        serie = '1'
        if doc.chave_nfe and len(doc.chave_nfe) >= 25:
            serie = doc.chave_nfe[22:25].lstrip('0') or '1'
        
        # Calcular totais da nota a partir dos produtos
        total_bc_icms = sum(float(p.get('v_bc_icms', 0) or p.get('bc_icms', 0) or p.get('v_bc', 0) or 0) for p in doc.produtos)
        total_v_icms = sum(float(p.get('v_icms', 0) or 0) for p in doc.produtos)
        total_v_pis = sum(float(p.get('v_pis', 0) or 0) for p in doc.produtos)
        total_v_cofins = sum(float(p.get('v_cofins', 0) or 0) for p in doc.produtos)
        total_v_ipi = sum(float(p.get('v_ipi', 0) or 0) for p in doc.produtos)
        total_v_desc = sum(float(p.get('v_desc', 0) or 0) for p in doc.produtos)
        
        # VL_MERC = soma dos valores dos itens
        total_merc = sum(float(p.get('valor_total', 0) or 0) for p in doc.produtos)
        
        # VL_ABAT_NT = 0 (abatimento não tributado e não comercial - só preencher se existir)
        vl_abat_nt = 0
        
        # Formatar C100 com TODOS os 29 campos
        linha_c100 = "|C100|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|9|||||{}|{}||||{}|{}|||".format(
            ind_oper,                                               # 02 IND_OPER
            ind_emit,                                               # 03 IND_EMIT
            emit_cnpj,                                              # 04 COD_PART
            modelo,                                                 # 05 COD_MOD
            cod_sit,                                                # 06 COD_SIT
            serie,                                                  # 07 SER
            doc.numero_nfe or '',                                   # 08 NUM_DOC
            doc.chave_nfe or '',                                    # 09 CHV_NFE
            data_emissao,                                           # 10 DT_DOC
            data_emissao,                                           # 11 DT_E_S
            f"{doc.valor_total:.2f}".replace('.',','),             # 12 VL_DOC
            '0',                                                    # 13 IND_PGTO (0=à vista)
            f"{total_v_desc:.2f}".replace('.',',') if total_v_desc > 0 else '',  # 14 VL_DESC
            f"{vl_abat_nt:.2f}".replace('.',',') if vl_abat_nt > 0 else '',      # 15 VL_ABAT_NT
            f"{total_merc:.2f}".replace('.',','),                  # 16 VL_MERC
            # 17 IND_FRT = 9 (sem frete)
            # 18-20 VL_FRT, VL_SEG, VL_OUT_DA vazios
            f"{total_bc_icms:.2f}".replace('.',','),               # 21 VL_BC_ICMS
            f"{total_v_icms:.2f}".replace('.',','),                # 22 VL_ICMS
            # 23-24 VL_BC_ICMS_ST, VL_ICMS_ST vazios
            # 25 VL_IPI vazio
            f"{total_v_pis:.2f}".replace('.',','),                 # 26 VL_PIS
            f"{total_v_cofins:.2f}".replace('.',',')               # 27 VL_COFINS
            # 28-29 VL_PIS_ST, VL_COFINS_ST vazios
        )
        lines.append(linha_c100)
        
        # Obter regime tributário e UF da empresa para determinar alíquotas corretas
        regime = getattr(company, 'regime_tributario', 'lucro_presumido') or 'lucro_presumido'
        uf_empresa = (company.uf or 'SP').upper()
        
        # Alíquotas padrão de PIS/COFINS por regime
        ALIQ_PIS_COFINS = {
            'lucro_real': {'pis': 1.65, 'cofins': 7.60},
            'lucro_presumido': {'pis': 0.65, 'cofins': 3.00},
            'simples_nacional': {'pis': 0.00, 'cofins': 0.00}
        }
        aliq_pis_regime = ALIQ_PIS_COFINS.get(regime, ALIQ_PIS_COFINS['lucro_presumido'])
        
        # Alíquotas de ICMS por UF (interna)
        ALIQ_ICMS_UF = {
            'AC': 17, 'AL': 18, 'AP': 18, 'AM': 18, 'BA': 18, 'CE': 18, 'DF': 18,
            'ES': 17, 'GO': 17, 'MA': 18, 'MT': 17, 'MS': 17, 'MG': 18, 'PA': 17,
            'PB': 18, 'PR': 18, 'PE': 18, 'PI': 18, 'RJ': 20, 'RN': 18, 'RS': 18,
            'RO': 17.5, 'RR': 17, 'SC': 17, 'SP': 18, 'SE': 18, 'TO': 18
        }
        
        # Alíquotas interestaduais de ICMS
        ALIQ_ICMS_INTERESTADUAL = {
            # Sul e Sudeste (exceto ES) para outras regiões: 7%
            # Demais: 12%
            'Sul_Sudeste': 7,
            'Demais': 12
        }
        
        # UFs do Sul e Sudeste
        UF_SUL_SUDESTE = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS']
        
        # Registro C170 - Itens do documento
        # Layout: REG|NUM_ITEM|COD_ITEM|DESCR_COMPL|QTD|UNID|VL_ITEM|VL_DESC|IND_MOV|CST_ICMS|CFOP|COD_NAT|VL_BC_ICMS|ALIQ_ICMS|VL_ICMS|VL_BC_ICMS_ST|ALIQ_ST|VL_ICMS_ST|IND_APUR|CST_IPI|COD_ENQ|VL_BC_IPI|ALIQ_IPI|VL_IPI|CST_PIS|VL_BC_PIS|ALIQ_PIS|QUANT_BC_PIS|ALIQ_PIS_R$|VL_PIS|CST_COFINS|VL_BC_COFINS|ALIQ_COFINS|QUANT_BC_COFINS|ALIQ_COFINS_R$|VL_COFINS|COD_CTA|VL_ABAT_NT
        for idx, prod in enumerate(doc.produtos):
            # Quantidade e valor do item
            qtd = float(prod.get('quantidade', 0) or 0)
            vl_item = float(prod.get('valor_total', 0) or 0)
            unid = (prod.get('unidade', 'UN') or 'UN')[:6].upper()
            
            # CST ICMS (3 dígitos, ex: 000, 020, 060, 090)
            cst_icms = str(prod.get('cst', '') or prod.get('cst_icms', '') or '000').zfill(3)
            cfop = str(prod.get('cfop', '') or '')
            ncm = str(prod.get('ncm', '') or '')
            
            # Determinar UF de origem (do emitente) para cálculo de ICMS interestadual
            uf_origem = (getattr(doc, 'emitente_uf', '') or '').upper() or uf_empresa
            
            # ==== CÁLCULO CORRETO DE ICMS ====
            # Determinar a alíquota correta de ICMS baseado na operação
            primeiro_digito_cfop = cfop[0] if cfop else ''
            is_interestadual = primeiro_digito_cfop in ['2', '6']  # CFOP 2xxx ou 6xxx
            is_importacao = primeiro_digito_cfop == '3'  # CFOP 3xxx
            
            # CST de ICMS indica se há tributação
            # 00, 10, 20, 70, 90 = tributado; 40, 41, 50, 60 = isento/suspenso/ST
            cst_icms_num = cst_icms[-2:] if len(cst_icms) >= 2 else cst_icms
            tem_icms = cst_icms_num in ['00', '10', '20', '70', '90']
            
            if tem_icms:
                if is_interestadual:
                    # Operação interestadual: 7% (Sul/Sudeste → outros) ou 12% (demais)
                    if uf_origem in UF_SUL_SUDESTE and uf_empresa not in UF_SUL_SUDESTE:
                        aliq_icms = 7.0
                    else:
                        aliq_icms = 12.0
                elif is_importacao:
                    # Importação: usa alíquota interna do estado
                    aliq_icms = ALIQ_ICMS_UF.get(uf_empresa, 18)
                else:
                    # Operação interna: usa alíquota do estado
                    aliq_icms = ALIQ_ICMS_UF.get(uf_empresa, 18)
            else:
                # Sem ICMS (isento, ST, suspenso)
                aliq_icms = 0.0
            
            # Base de cálculo de ICMS = valor do item (simplificado)
            bc_icms = vl_item if tem_icms else 0.0
            v_icms = round(bc_icms * aliq_icms / 100, 2) if tem_icms else 0.0
            
            # ==== CÁLCULO CORRETO DE PIS/COFINS ====
            # Determinar CST correto de PIS/COFINS baseado na operação
            is_entrada = primeiro_digito_cfop in ['1', '2', '3']
            is_saida = primeiro_digito_cfop in ['5', '6', '7']
            
            # Verificar se NCM tem alíquota zero (cesta básica, medicamentos, etc.)
            ncm_aliq_zero = is_ncm_aliquota_zero(ncm)
            
            # CFOPs sem incidência de PIS/COFINS (devoluções, transferências, remessas)
            CFOPS_SEM_INCIDENCIA = [
                '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', '1210',
                '2201', '2202', '2203', '2204', '2205', '2206', '2207', '2208', '2209', '2210',
                '5201', '5202', '5205', '5206', '5207', '5208', '5209', '5210',
                '6201', '6202', '6205', '6206', '6207', '6208', '6209', '6210',
                '1901', '1902', '1903', '1904', '1905', '1906', '1907', '1908', '1909',
                '2901', '2902', '2903', '2904', '2905', '2906', '2907', '2908', '2909',
                '5901', '5902', '5903', '5904', '5905', '5906', '5907', '5908', '5909',
                '6901', '6902', '6903', '6904', '6905', '6906', '6907', '6908', '6909',
            ]
            
            # CFOPs que dão direito a crédito de PIS/COFINS (Lucro Real)
            CFOPS_COM_CREDITO = [
                '1101', '1102', '1111', '1113', '1116', '1117', '1118', '1120', '1121', '1122',
                '1124', '1125', '1126', '1401', '1403', '1501', '1651', '1652', '1653',
                '2101', '2102', '2111', '2113', '2116', '2117', '2118', '2120', '2121', '2122',
                '2124', '2125', '2126', '2401', '2403', '2501', '2651', '2652', '2653',
                '3101', '3102', '3126', '3127'
            ]
            
            cfop_sem_incidencia = cfop in CFOPS_SEM_INCIDENCIA
            cfop_com_credito = cfop in CFOPS_COM_CREDITO
            
            # Determinar CST e alíquotas corretas de PIS/COFINS
            if cfop_sem_incidencia:
                # Sem incidência - CST 98 (entrada) ou 49 (saída)
                cst_pis = '98' if is_entrada else '49'
                cst_cofins = '98' if is_entrada else '49'
                aliq_pis = 0.0
                aliq_cofins = 0.0
                bc_pis = 0.0
                bc_cofins = 0.0
            elif ncm_aliq_zero:
                # Alíquota zero pelo NCM - CST 73 (entrada) ou 06 (saída)
                cst_pis = '73' if is_entrada else '06'
                cst_cofins = '73' if is_entrada else '06'
                aliq_pis = 0.0
                aliq_cofins = 0.0
                bc_pis = vl_item
                bc_cofins = vl_item
            elif regime == 'simples_nacional':
                # Simples Nacional - não tem PIS/COFINS destacado
                cst_pis = '99'
                cst_cofins = '99'
                aliq_pis = 0.0
                aliq_cofins = 0.0
                bc_pis = 0.0
                bc_cofins = 0.0
            elif is_entrada:
                # Entrada
                if regime == 'lucro_real' and cfop_com_credito:
                    # Lucro Real com direito a crédito - CST 50
                    cst_pis = '50'
                    cst_cofins = '50'
                    aliq_pis = 1.65
                    aliq_cofins = 7.60
                else:
                    # Sem crédito (Presumido ou CFOP sem crédito) - CST 70
                    cst_pis = '70'
                    cst_cofins = '70'
                    aliq_pis = aliq_pis_regime['pis']
                    aliq_cofins = aliq_pis_regime['cofins']
                bc_pis = vl_item
                bc_cofins = vl_item
            else:
                # Saída - sempre tributado (CST 01)
                cst_pis = '01'
                cst_cofins = '01'
                aliq_pis = aliq_pis_regime['pis']
                aliq_cofins = aliq_pis_regime['cofins']
                bc_pis = vl_item
                bc_cofins = vl_item
            
            # Calcular valores de PIS/COFINS
            v_pis = round(bc_pis * aliq_pis / 100, 2)
            v_cofins = round(bc_cofins * aliq_cofins / 100, 2)
            
            # Descrição complementar e outros campos
            descr_compl = ''
            ind_mov = '0'
            vl_desc = float(prod.get('v_desc', 0) or prod.get('v_desconto', 0) or 0)
            vl_abat_nt = 0  # Só preencher se houver abatimento específico
            
            # Formatar linha C170 com TODOS os 38 campos
            # Layout: |C170|02|03|04|05|06|07|08|09|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|
            #         |C170|NUM|COD|DESC|QTD|UN|VITEM|VDESC|MOV|CST|CFOP|NAT|BC|ALQ|ICM|BCST|ALQST|ICMST|APU|CSTI|ENQ|BCI|ALQI|IPI|CSTP|BCP|ALQP|QBP|ALQPR|PIS|CSTC|BCC|ALQC|QBC|ALQCR|COF|CTA|ABAT|
            
            linha_c170 = "|C170|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|".format(
                idx + 1,                                                    # 02 NUM_ITEM
                str(prod.get('codigo', ''))[:60],                          # 03 COD_ITEM
                descr_compl[:60] if descr_compl else '',                   # 04 DESCR_COMPL
                f"{qtd:.5f}".replace('.',','),                             # 05 QTD
                unid,                                                       # 06 UNID
                f"{vl_item:.2f}".replace('.',','),                         # 07 VL_ITEM
                f"{vl_desc:.2f}".replace('.',',') if vl_desc > 0 else '',  # 08 VL_DESC
                ind_mov,                                                    # 09 IND_MOV
                cst_icms,                                                   # 10 CST_ICMS
                cfop,                                                       # 11 CFOP
                '',                                                         # 12 COD_NAT (vazio)
                f"{bc_icms:.2f}".replace('.',','),                         # 13 VL_BC_ICMS
                f"{aliq_icms:.2f}".replace('.',','),                       # 14 ALIQ_ICMS
                f"{v_icms:.2f}".replace('.',','),                          # 15 VL_ICMS
                '',                                                         # 16 VL_BC_ICMS_ST (vazio)
                '',                                                         # 17 ALIQ_ST (vazio)
                '',                                                         # 18 VL_ICMS_ST (vazio)
                '',                                                         # 19 IND_APUR (vazio)
                '',                                                         # 20 CST_IPI (vazio)
                '',                                                         # 21 COD_ENQ (vazio)
                '',                                                         # 22 VL_BC_IPI (vazio)
                '',                                                         # 23 ALIQ_IPI (vazio)
                '',                                                         # 24 VL_IPI (vazio)
                cst_pis,                                                    # 25 CST_PIS
                f"{bc_pis:.2f}".replace('.',','),                          # 26 VL_BC_PIS
                f"{aliq_pis:.4f}".replace('.',','),                        # 27 ALIQ_PIS (4 decimais)
                '',                                                         # 28 QUANT_BC_PIS (vazio)
                '',                                                         # 29 ALIQ_PIS em R$ (vazio)
                f"{v_pis:.2f}".replace('.',','),                           # 30 VL_PIS
                cst_cofins,                                                 # 31 CST_COFINS
                f"{bc_cofins:.2f}".replace('.',','),                       # 32 VL_BC_COFINS
                f"{aliq_cofins:.4f}".replace('.',','),                     # 33 ALIQ_COFINS (4 decimais)
                '',                                                         # 34 QUANT_BC_COFINS (vazio)
                '',                                                         # 35 ALIQ_COFINS em R$ (vazio)
                f"{v_cofins:.2f}".replace('.',','),                        # 36 VL_COFINS
                '',                                                         # 37 COD_CTA (vazio)
                f"{vl_abat_nt:.2f}".replace('.',',') if vl_abat_nt > 0 else ''  # 38 VL_ABAT_NT
            )
            lines.append(linha_c170)
        
        # Registro C190 - Registro analítico do documento
        # Agrupar por CFOP + CST
        cfop_cst_grupos = {}
        for prod in doc.produtos:
            cfop = prod.get('cfop', '') or ''
            cst = prod.get('cst', '000') or '000'
            chave = f"{cfop}_{cst}"
            if chave not in cfop_cst_grupos:
                cfop_cst_grupos[chave] = {
                    'cfop': cfop, 'cst': cst,
                    'vl_opr': 0, 'vl_bc_icms': 0, 'vl_icms': 0,
                    'vl_bc_icms_st': 0, 'vl_icms_st': 0, 'vl_red_bc': 0, 'vl_ipi': 0
                }
            cfop_cst_grupos[chave]['vl_opr'] += float(prod.get('valor_total', 0) or 0)
            cfop_cst_grupos[chave]['vl_bc_icms'] += float(prod.get('bc_icms', 0) or 0)
            cfop_cst_grupos[chave]['vl_icms'] += float(prod.get('v_icms', 0) or 0)
        
        for grupo in cfop_cst_grupos.values():
            # |REG|CST_ICMS|CFOP|ALIQ_ICMS|VL_OPR|VL_BC_ICMS|VL_ICMS|VL_BC_ICMS_ST|VL_ICMS_ST|VL_RED_BC|VL_IPI|COD_OBS|
            aliq = 0
            if grupo['vl_bc_icms'] > 0:
                aliq = (grupo['vl_icms'] / grupo['vl_bc_icms']) * 100
            
            lines.append("|C190|{}|{}|{}|{}|{}|{}|0|0|0|0||".format(
                grupo['cst'],
                grupo['cfop'],
                f"{aliq:.2f}".replace('.',','),
                f"{grupo['vl_opr']:.2f}".replace('.',','),
                f"{grupo['vl_bc_icms']:.2f}".replace('.',','),
                f"{grupo['vl_icms']:.2f}".replace('.',',')
            ))
    
    # Registro C990 - Encerramento do Bloco C
    qtd_linhas_bloco_c = len([l for l in lines if l.startswith('|C')]) + 1
    lines.append("|C990|{}|".format(qtd_linhas_bloco_c))
    
    # BLOCO E - Apuração do ICMS e do IPI
    lines.append("|E001|0|")  # 0 = com movimento
    
    # Registro E100 - Período da apuração do ICMS
    lines.append("|E100|{}|{}|".format(dt_inicio, dt_fim))
    
    # Registro E110 - Apuração do ICMS - Operações Próprias
    # CFOPs de Substituição Tributária (não dão direito a crédito de ICMS)
    CFOPS_ST_SPED = ['1403', '1409', '2403', '2409', '3403', '3409', '5403', '5405', '5409', '6403', '6404', '6409']
    
    # CFOPs de Despesa/Uso e Consumo (não dão direito a crédito de ICMS)
    CFOPS_DESPESA_SPED = [
        '1407', '2407',  # Compra para uso/consumo com ST
        '1556', '2556',  # Compra para uso/consumo
        '1557', '2557',  # Transferência para uso/consumo
        '1128', '2128',  # Compra para ativo imobilizado
        '1551', '2551',  # Compra ativo imobilizado
        '1553', '2553',  # Devolução de venda ativo imobilizado
        '1554', '2554',  # Retorno de remessa ativo imobilizado
        '1406', '2406',  # Compra energia elétrica para uso/consumo
        '1408', '2408',  # Transferência energia elétrica
    ]
    
    # Combinar todos os CFOPs sem direito a crédito de ICMS
    CFOPS_SEM_CREDITO_SPED = set(CFOPS_ST_SPED + CFOPS_DESPESA_SPED)
    
    # Calcular totais de débitos (saídas)
    vl_debitos = sum(
        sum(float(p.get('v_icms', 0) or 0) for p in d.produtos)
        for d in documents if d.tipo == 'saida'
    )
    
    # Calcular totais de créditos (entradas) - aplicar flag de exclusão
    if excluir_creditos_despesa_st:
        # EXCLUIR créditos de CFOPs de despesa e ST (apuração conservadora)
        vl_creditos = sum(
            sum(float(p.get('v_icms', 0) or 0) 
                for p in d.produtos 
                if str(p.get('cfop', '')) not in CFOPS_SEM_CREDITO_SPED)
            for d in documents if d.tipo == 'entrada'
        )
    else:
        # INCLUIR todos os créditos (como vem no XML)
        vl_creditos = sum(
            sum(float(p.get('v_icms', 0) or 0) for p in d.produtos)
            for d in documents if d.tipo == 'entrada'
        )
    
    vl_saldo = vl_debitos - vl_creditos
    vl_pagar = max(0, vl_saldo)
    vl_credito_acum = max(0, -vl_saldo)
    
    # Registro E110 - Apuração do ICMS - Operações Próprias
    # Layout: |E110|VL_TOT_DEBITOS|VL_AJ_DEBITOS|VL_TOT_AJ_DEBITOS|VL_ESTORNOS_CRED|VL_TOT_CREDITOS|VL_AJ_CREDITOS|VL_TOT_AJ_CREDITOS|VL_ESTORNOS_DEB|VL_SLD_CREDOR_ANT|VL_SLD_APURADO|VL_TOT_DED|VL_ICMS_RECOLHER|VL_SLD_CREDOR_TRANSPORTAR|DEB_ESP|
    lines.append("|E110|{}|0,00|0,00|0,00|{}|0,00|0,00|0,00|0,00|{}|0,00|{}|{}|0,00|".format(
        f"{vl_debitos:.2f}".replace('.',','),      # 02 VL_TOT_DEBITOS
        # 03 VL_AJ_DEBITOS = 0
        # 04 VL_TOT_AJ_DEBITOS = 0
        # 05 VL_ESTORNOS_CRED = 0
        f"{vl_creditos:.2f}".replace('.',','),     # 06 VL_TOT_CREDITOS
        # 07 VL_AJ_CREDITOS = 0
        # 08 VL_TOT_AJ_CREDITOS = 0
        # 09 VL_ESTORNOS_DEB = 0
        # 10 VL_SLD_CREDOR_ANT = 0
        f"{vl_saldo:.2f}".replace('.',','),        # 11 VL_SLD_APURADO
        # 12 VL_TOT_DED = 0
        f"{vl_pagar:.2f}".replace('.',','),        # 13 VL_ICMS_RECOLHER
        f"{vl_credito_acum:.2f}".replace('.',',')  # 14 VL_SLD_CREDOR_TRANSPORTAR
        # 15 DEB_ESP = 0
    ))
    
    lines.append("|E990|{}|".format(len([l for l in lines if l.startswith('|E')]) + 1))
    
    # BLOCO H - Inventário Físico
    lines.append("|H001|1|")  # 1 = sem movimento
    lines.append("|H990|2|")
    
    # BLOCO K - Controle da Produção e do Estoque
    lines.append("|K001|1|")  # 1 = sem movimento
    lines.append("|K990|2|")
    
    # BLOCO 1 - Outras informações
    lines.append("|1001|1|")  # 1 = sem movimento
    lines.append("|1990|2|")
    
    # BLOCO 9 - Controle e encerramento do arquivo digital
    lines.append("|9001|0|")
    
    # Registro 9900 - Registros do arquivo
    registros_count = {}
    for line in lines:
        reg = line.split('|')[1] if '|' in line else ''
        if reg:
            registros_count[reg] = registros_count.get(reg, 0) + 1
    
    for reg, count in sorted(registros_count.items()):
        lines.append("|9900|{}|{}|".format(reg, count))
    
    # Adicionar contagem do próprio 9900
    lines.append("|9900|9900|{}|".format(len(registros_count) + 1))
    lines.append("|9900|9990|1|")
    lines.append("|9900|9999|1|")
    
    # Registro 9990 - Encerramento do Bloco 9
    lines.append("|9990|{}|".format(len([l for l in lines if l.startswith('|9')]) + 2))
    
    # Registro 9999 - Encerramento do arquivo digital
    lines.append("|9999|{}|".format(len(lines) + 1))
    
    return '\n'.join(lines)

@api_router.get("/cnpj/{cnpj}")
async def buscar_dados_cnpj(cnpj: str):
    cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '')
    
    try:
        response = requests.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            endereco = f"{data.get('logradouro', '')} {data.get('numero', '')}".strip()
            
            return {
                "cnpj": cnpj,
                "razao_social": data.get('razao_social', ''),
                "nome_fantasia": data.get('nome_fantasia', ''),
                "cnae_principal": str(data.get('cnae_fiscal', '')),
                "cnae_principal_descricao": data.get('cnae_fiscal_descricao', ''),
                "cep": data.get('cep', '').replace('.', '').replace('-', ''),
                "logradouro": endereco,
                "numero": data.get('numero', ''),
                "municipio": data.get('municipio', ''),
                "uf": data.get('uf', '')
            }
        else:
            raise HTTPException(status_code=404, detail="CNPJ não encontrado na Receita Federal")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail="Erro ao consultar Receita Federal")

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.model_dump(exclude={'password'})
    user = User(**user_dict)
    
    doc = user.model_dump()
    doc['hashed_password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get('hashed_password', '')):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    
    access_token = create_access_token(data={"sub": user['id']})
    user.pop('hashed_password', None)
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return Token(access_token=access_token, token_type="bearer", user=User(**user))

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir empresas")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Excluir documentos vinculados primeiro (Cascade Delete)
    docs_count = await db.xml_documents.count_documents({"company_id": company_id})
    if docs_count > 0:
        await db.xml_documents.delete_many({"company_id": company_id})
        # Também apagar regras aprendidas
        await db.learned_rules.delete_many({"company_id": company_id})
    
    await db.companies.delete_one({"id": company_id})
    return {"message": f"Empresa e {docs_count} documento(s) excluídos com sucesso"}

@api_router.post("/companies", response_model=Company)
async def create_company(company_data: CompanyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar empresas")
    
    # Verificar se CNPJ já existe
    existing = await db.companies.find_one({"cnpj": company_data.cnpj}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    
    company = Company(**company_data.model_dump())
    doc = company.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.companies.insert_one(doc)
    return company

@api_router.get("/companies", response_model=List[Company])
async def list_companies(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    else:
        companies = await db.companies.find({"cnpj": {"$in": current_user.company_ids}}, {"_id": 0}).to_list(1000)
    
    for c in companies:
        if 'created_at' in c:
            if isinstance(c['created_at'], str):
                c['created_at'] = datetime.fromisoformat(c['created_at'])
        else:
            c['created_at'] = datetime.now(timezone.utc) # Fallback for old records
    
    return companies

@api_router.get("/companies/{company_id}", response_model=Company)
async def get_company(company_id: str, current_user: User = Depends(get_current_user)):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if isinstance(company['created_at'], str):
        company['created_at'] = datetime.fromisoformat(company['created_at'])
    
    return Company(**company)

@api_router.put("/companies/{company_id}")
async def update_company(
    company_id: str, 
    company_data: CompanyUpdate, 
    current_user: User = Depends(get_current_user)
):
    """Atualizar empresa existente"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem editar empresas")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Atualizar apenas campos fornecidos
    update_data = {k: v for k, v in company_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.companies.update_one(
            {"id": company_id},
            {"$set": update_data}
        )
    
    updated = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    
    return updated

@api_router.delete("/documents/{company_id}/competencia/{competencia:path}")
async def delete_documents_by_competencia(
    company_id: str,
    competencia: str,
    tipo: str = None,
    status: str = None,
    current_user: User = Depends(get_current_user)
):
    """Apagar notas da competência da empresa, opcionalmente filtrando por tipo e status"""
    
    print(f"DELETE /documents request: company={company_id}, competencia={competencia}, type={tipo}, status={status}, user={current_user.email}")
    # Verificar se a empresa existe
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Verificar permissão: Admin ou dono da empresa
    if current_user.role != UserRole.ADMIN:
        if company['cnpj'] not in current_user.company_ids:
            raise HTTPException(status_code=403, detail="Acesso negado: Você não tem permissão para esta empresa")
    
    # Construir filtro
    filter_query = {
        "company_id": company_id,
        "competencia": competencia
    }
    
    # Aplicar filtro de tipo se especificado
    if tipo and tipo in ['entrada', 'saida']:
        filter_query["tipo"] = tipo
        
    # Aplicar filtro de status se especificado
    if status:
        filter_query["status_validacao"] = status
    
    result = await db.xml_documents.delete_many(filter_query)
    
    tipo_label = f" do tipo {tipo.upper()}" if tipo else ""
    status_label = f" com status {status.upper()}" if status else ""
    
    return {
        "message": f"{result.deleted_count} documento(s){tipo_label}{status_label} apagado(s) da competência {competencia}",
        "deleted_count": result.deleted_count
    }

@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Apagar documento individual"""
    print(f"DELETE /documents/id request: doc_id={document_id}, user={current_user.email}")
    
    doc = await db.xml_documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    # Verificar permissão: Admin ou dono da empresa
    if current_user.role != UserRole.ADMIN:
        # Buscar empresa do documento
        company = await db.companies.find_one({"id": doc['company_id']}, {"_id": 0})
        if not company or company['cnpj'] not in current_user.company_ids:
             raise HTTPException(status_code=403, detail="Acesso negado")
    
    await db.xml_documents.delete_one({"id": document_id})
    
    return {
        "message": "Documento apagado com sucesso",
        "documento": {
            "numero_nfe": doc.get('numero_nfe'),
            "emitente": doc.get('emitente_nome')
        }
    }

# ============================================================================
# SIEG INTEGRATION ENDPOINTS
# ============================================================================

@api_router.get("/sieg/count/{company_id}")
async def sieg_count_xmls(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """
    Conta quantos XMLs estão disponíveis no SIEG para a empresa e competência
    """
    # Buscar empresa
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    cnpj = company.get('cnpj', '')
    if not cnpj:
        raise HTTPException(status_code=400, detail="CNPJ da empresa não configurado")
    
    try:
        result = await count_xmls_sieg(cnpj, competencia)
        return {
            "empresa": company.get('razao_social', ''),
            "cnpj": cnpj,
            "competencia": competencia,
            "contagem": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar SIEG: {str(e)}")


# ============== SIEG SYNC COM SSE ==============
sieg_progress_store: Dict[str, Dict] = {}

# ============== REIMPORT PROGRESS COM SSE ==============
reimport_progress_store: Dict[str, Dict] = {}

@api_router.post("/xml/reimport-init")
async def reimport_init(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """Inicializa uma sessão de reimportação e retorna um task_id para acompanhar o progresso"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    cnpj_empresa = company.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')
    
    # Contar apenas documentos de ENTRADA (onde o emitente NÃO é a empresa)
    # Primeiro, buscamos todos os docs para filtrar
    all_docs = await db.xml_documents.find(
        {"company_id": company_id, "competencia": competencia},
        {"_id": 0, "emitente_cnpj": 1, "cnpj_emitente": 1, "tipo": 1}
    ).to_list(2000)
    
    # Filtrar apenas entradas
    entrada_count = 0
    for doc in all_docs:
        cnpj_emit = (doc.get('emitente_cnpj') or doc.get('cnpj_emitente', '')).replace('.', '').replace('/', '').replace('-', '')
        tipo_atual = doc.get('tipo', '')
        # É entrada se emitente NÃO é a empresa OU se já está marcado como entrada
        if cnpj_emit != cnpj_empresa or tipo_atual == 'entrada':
            entrada_count += 1
    
    if entrada_count == 0:
        raise HTTPException(status_code=404, detail="Nenhum documento de ENTRADA encontrado para esta competência")
    
    task_id = str(uuid.uuid4())
    reimport_progress_store[task_id] = {
        "status": "initialized",
        "step": "Iniciando reimportação...",
        "progress_percent": 0,
        "company_id": company_id,
        "competencia": competencia,
        "cnpj_empresa": cnpj_empresa,
        "total_docs": entrada_count,
        "processed": 0,
        "classificados": 0,
        "errors": 0,
        "completed": False,
        "results": None
    }
    
    return {"task_id": task_id, "total_docs": entrada_count}


@api_router.get("/xml/reimport-progress/{task_id}")
async def stream_reimport_progress(task_id: str):
    """Stream de progresso da reimportação via Server-Sent Events"""
    
    async def generate():
        last_progress = -1
        while True:
            if task_id not in reimport_progress_store:
                yield f"data: {json.dumps({'error': 'Task não encontrada'})}\n\n"
                break
            
            progress = reimport_progress_store[task_id]
            current_progress = progress.get("progress_percent", 0)
            
            if current_progress != last_progress or progress.get("completed"):
                event_data = {
                    "status": progress["status"],
                    "step": progress["step"],
                    "progress_percent": progress["progress_percent"],
                    "processed": progress["processed"],
                    "total_docs": progress["total_docs"],
                    "classificados": progress["classificados"],
                    "errors": progress["errors"],
                    "completed": progress.get("completed", False)
                }
                
                if progress.get("completed") and progress.get("results"):
                    event_data["results"] = progress["results"]
                    yield f"data: {json.dumps(event_data)}\n\n"
                    if task_id in reimport_progress_store:
                        del reimport_progress_store[task_id]
                    break
                
                yield f"data: {json.dumps(event_data)}\n\n"
                last_progress = current_progress
            
            await asyncio.sleep(0.3)
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


@api_router.post("/xml/reimport-execute/{task_id}")
async def reimport_execute(
    task_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Executa a reimportação com progresso em tempo real"""
    if task_id not in reimport_progress_store:
        raise HTTPException(status_code=404, detail="Task não encontrada")
    
    progress = reimport_progress_store[task_id]
    company_id = progress["company_id"]
    competencia = progress["competencia"]
    
    # Executar em background
    background_tasks.add_task(execute_reimport_task, task_id, company_id, competencia)
    
    return {"message": "Reimportação iniciada", "task_id": task_id}


async def execute_reimport_task(task_id: str, company_id: str, competencia: str):
    """Função de background que executa a reimportação - APENAS ENTRADAS"""
    progress = reimport_progress_store[task_id]
    
    try:
        progress["status"] = "running"
        progress["step"] = "Buscando documentos de entrada..."
        
        # Buscar dados da empresa
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if not company:
            progress["status"] = "error"
            progress["step"] = "Empresa não encontrada"
            progress["completed"] = True
            return
        
        cnpj_empresa = company.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')
        uf_empresa = company.get('uf', 'SP')
        
        # Buscar todos os documentos
        all_documents = await db.xml_documents.find(
            {"company_id": company_id, "competencia": competencia},
            {"_id": 0}
        ).to_list(2000)
        
        if not all_documents:
            progress["status"] = "error"
            progress["step"] = "Nenhum documento encontrado"
            progress["completed"] = True
            return
        
        # Filtrar apenas documentos de ENTRADA
        documents = []
        for doc in all_documents:
            cnpj_emit = (doc.get('emitente_cnpj') or doc.get('cnpj_emitente', '')).replace('.', '').replace('/', '').replace('-', '')
            # É entrada se o emitente NÃO é a empresa
            if cnpj_emit != cnpj_empresa:
                documents.append(doc)
        
        if not documents:
            progress["status"] = "completed"
            progress["step"] = "Nenhum documento de entrada para processar"
            progress["completed"] = True
            progress["results"] = {"total": 0, "success": 0, "errors": 0, "classificados": 0, "entradas": 0, "saidas_ignoradas": len(all_documents)}
            return
        
        total = len(documents)
        progress["total_docs"] = total
        progress["step"] = f"Processando {total} documentos de entrada..."
        
        results = {
            "total": total,
            "success": 0,
            "errors": 0,
            "classificados": 0,
            "entradas": total,
            "saidas_ignoradas": len(all_documents) - total
        }
        
        for i, doc in enumerate(documents):
            try:
                progress["step"] = f"Processando entrada {i+1}/{total}..."
                progress["processed"] = i + 1
                progress["progress_percent"] = int((i + 1) / total * 100)
                
                xml_content = doc.get('xml_content', '')
                if not xml_content:
                    results['errors'] += 1
                    progress["errors"] = results['errors']
                    continue
                
                # Re-parsear o XML
                modelo = doc.get('modelo', 'nfe')
                if modelo == 'nfse':
                    parsed = parse_xml_nfse(xml_content)
                elif modelo == 'nfce':
                    parsed = parse_xml_nfce(xml_content)
                else:
                    parsed = parse_xml_nfe(xml_content)
                
                # Já sabemos que é ENTRADA (filtrado acima)
                tipo = 'entrada'
                emitente_uf = parsed.get('emitente_uf', '')
                produtos = parsed.get('produtos', [])
                
                # Classificar produtos de ENTRADA
                if produtos:
                    progress["step"] = f"Classificando produtos do doc {i+1}/{total}..."
                    
                    # Converter CFOPs de saída para entrada (o XML vem com CFOP do emitente)
                    for product in produtos:
                        cfop = str(product.get('cfop', ''))
                        if cfop.startswith('5') or cfop.startswith('6'):
                            cfop_entrada = cfop.replace('5', '1', 1).replace('6', '2', 1)
                            product['cfop_original'] = cfop
                            product['cfop'] = cfop_entrada
                    
                    try:
                        classifications, stats = await classify_products_with_cache(
                            produtos, company_id, company, emitente_uf
                        )
                        
                        for idx, product in enumerate(produtos):
                            p_id = str(idx)
                            if p_id in classifications:
                                result = classifications[p_id]
                                product['cfop_original'] = product.get('cfop_original', product.get('cfop', ''))
                                product['cfop'] = result['cfop']
                                product['cfop_sugerido'] = result['cfop']
                                product['classificacao'] = result['categoria']
                                product['categoria_classificada'] = result['categoria']
                                product['justificativa_ia'] = result['justificativa']
                                product['aprovado'] = False
                                product['reclassificado'] = False
                                results['classificados'] += 1
                            else:
                                is_interestadual = emitente_uf and emitente_uf != uf_empresa
                                cfop_prefix = '2' if is_interestadual else '1'
                                cst = product.get('cst', '')
                                is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
                                cfop_novo = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
                                
                                product['cfop'] = cfop_novo
                                product['cfop_sugerido'] = cfop_novo
                                product['classificacao'] = 'revenda'
                                product['categoria_classificada'] = 'revenda'
                                product['justificativa_ia'] = 'Classificação padrão: REVENDA'
                                product['aprovado'] = False
                                product['reclassificado'] = False
                                results['classificados'] += 1
                                
                        progress["classificados"] = results['classificados']
                    except Exception as e:
                        print(f"Erro na classificação: {e}")
                        for product in produtos:
                            is_interestadual = emitente_uf and emitente_uf != uf_empresa
                            cfop_prefix = '2' if is_interestadual else '1'
                            product['cfop'] = cfop_prefix + '102'
                            product['cfop_sugerido'] = cfop_prefix + '102'
                            product['classificacao'] = 'revenda'
                            product['categoria_classificada'] = 'revenda'
                            product['justificativa_ia'] = 'Classificação padrão: REVENDA (fallback)'
                            product['aprovado'] = False
                            product['reclassificado'] = False
                
                # Atualizar documento
                update_data = {
                    'tipo': tipo,
                    'produtos': produtos,
                    'valor_total': parsed.get('valor_total', 0),
                    'data_emissao': parsed.get('data_emissao'),
                    'numero_nfe': parsed.get('numero_nfe', ''),
                    'chave_acesso': parsed.get('chave_acesso', ''),
                    'emitente_nome': parsed.get('emitente_nome', ''),
                    'emitente_cnpj': parsed.get('cnpj_emitente', ''),
                    'emitente_uf': emitente_uf,
                    'emitente_ie': parsed.get('emitente_ie', ''),
                    'emitente_endereco': parsed.get('emitente_endereco', {}),
                    'destinatario_nome': parsed.get('destinatario_nome', ''),
                    'destinatario_cnpj': parsed.get('cnpj_destinatario', ''),
                    'destinatario_ie': parsed.get('destinatario_ie', ''),
                    'destinatario_endereco': parsed.get('destinatario_endereco', {}),
                    'total_icms': parsed.get('total_icms', 0),
                    'total_icms_st': parsed.get('total_icms_st', 0),
                    'total_ipi': parsed.get('total_ipi', 0),
                    'total_pis': parsed.get('total_pis', 0),
                    'total_cofins': parsed.get('total_cofins', 0),
                    'total_frete': parsed.get('total_frete', 0),
                    'total_seguro': parsed.get('total_seguro', 0),
                    'total_outras_despesas': parsed.get('total_outras_despesas', 0),
                    'total_desconto': parsed.get('total_desconto', 0),
                    'status_validacao': 'pendente',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                await db.xml_documents.update_one(
                    {"id": doc['id']},
                    {"$set": update_data}
                )
                
                results['success'] += 1
                
            except Exception as e:
                print(f"Erro ao reimportar documento: {e}")
                results['errors'] += 1
                progress["errors"] = results['errors']
        
        progress["status"] = "completed"
        progress["step"] = "Reimportação concluída!"
        progress["progress_percent"] = 100
        progress["completed"] = True
        progress["results"] = results
        
    except Exception as e:
        progress["status"] = "error"
        progress["step"] = f"Erro: {str(e)}"
        progress["completed"] = True


@api_router.post("/sieg/sync-init/{company_id}")
async def sieg_sync_init(
    company_id: str,
    competencia: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Inicializa uma sessão de sincronização SIEG e retorna um sync_id para acompanhar o progresso"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    cnpj = company.get('cnpj', '')
    if not cnpj:
        raise HTTPException(status_code=400, detail="CNPJ da empresa não configurado")
    
    sync_id = str(uuid.uuid4())
    sieg_progress_store[sync_id] = {
        "status": "initialized",
        "step": "Iniciando sincronização...",
        "progress_percent": 0,
        "company_id": company_id,
        "competencia": competencia,
        "user_id": current_user.id,
        "user_email": current_user.email,
        "cnpj": cnpj,
        "company": company,
        "results": None,
        "completed": False
    }
    
    return {"sync_id": sync_id}


@api_router.get("/sieg/sync-progress/{sync_id}")
async def stream_sieg_progress(sync_id: str):
    """Stream de progresso da sincronização SIEG via Server-Sent Events"""
    
    async def event_generator():
        last_progress = -1
        while True:
            if sync_id not in sieg_progress_store:
                yield f"data: {json.dumps({'error': 'Sincronização não encontrada'})}\n\n"
                break
            
            progress = sieg_progress_store[sync_id]
            current_progress = progress.get("progress_percent", 0)
            
            if current_progress != last_progress or progress.get("completed"):
                event_data = {
                    "status": progress["status"],
                    "step": progress["step"],
                    "progress_percent": progress["progress_percent"],
                    "completed": progress.get("completed", False)
                }
                
                if progress.get("completed") and progress.get("results"):
                    event_data["results"] = progress["results"]
                    yield f"data: {json.dumps(event_data)}\n\n"
                    await asyncio.sleep(1)
                    if sync_id in sieg_progress_store:
                        del sieg_progress_store[sync_id]
                    break
                
                yield f"data: {json.dumps(event_data)}\n\n"
                last_progress = current_progress
            
            await asyncio.sleep(0.3)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@api_router.post("/sieg/sync-execute/{sync_id}")
async def sieg_sync_execute(
    sync_id: str,
    current_user: User = Depends(get_current_user)
):
    """Executa a sincronização SIEG com progresso em tempo real"""
    
    if sync_id not in sieg_progress_store:
        raise HTTPException(status_code=404, detail="Sessão de sincronização não encontrada")
    
    progress = sieg_progress_store[sync_id]
    company_id = progress["company_id"]
    competencia = progress["competencia"]
    cnpj = progress["cnpj"]
    company = progress["company"]
    
    regime_tributario = company.get('regime_tributario', 'lucro_presumido')
    
    results = {
        "empresa": company.get('razao_social', ''),
        "competencia": competencia,
        "sieg_stats": {"entrada": 0, "saida": 0},
        "processados": {"entrada": 0, "saida": 0},
        "classificados": {"cache": 0, "regras": 0, "ia": 0},
        "erros": [],
        "duplicados": [],
        "relatorio_conversoes": []
    }
    
    try:
        # STEP 1: Baixar XMLs do SIEG
        progress["status"] = "downloading"
        progress["step"] = "Baixando XMLs do SIEG..."
        progress["progress_percent"] = 5
        
        sieg_result = await sync_from_sieg(cnpj, competencia)
        
        entrada_xmls = sieg_result.get("entrada", {}).get("xmls", [])
        saida_xmls = sieg_result.get("saida", {}).get("xmls", [])
        total_xmls = len(entrada_xmls) + len(saida_xmls)
        
        results["sieg_stats"]["entrada"] = len(entrada_xmls)
        results["sieg_stats"]["saida"] = len(saida_xmls)
        
        if total_xmls == 0:
            progress["step"] = "Nenhum XML encontrado no SIEG"
            progress["progress_percent"] = 100
            progress["status"] = "completed"
            progress["completed"] = True
            progress["results"] = results
            return results
        
        progress["step"] = f"Encontrados {total_xmls} XMLs ({len(entrada_xmls)} entradas, {len(saida_xmls)} saídas)"
        progress["progress_percent"] = 10
        
        # STEP 2: Processar XMLs de ENTRADA (com classificação IA)
        total_stats = {"from_cache": 0, "from_rules": 0, "from_ai": 0, "total": 0}
        processed_count = 0
        
        for idx, xml_data in enumerate(entrada_xmls):
            processed_count += 1
            progress["step"] = f"Processando entrada {idx + 1}/{len(entrada_xmls)}..."
            progress["progress_percent"] = 10 + int((processed_count / total_xmls) * 80)
            
            try:
                xml_content = xml_data.get("xml", "")
                if not xml_content:
                    continue
                
                # Detectar tipo e parsear
                xml_type = detect_xml_type(xml_content)
                if xml_type == 'nfse':
                    parsed_data = parse_xml_nfse(xml_content)
                elif xml_type == 'nfce':
                    parsed_data = parse_xml_nfce(xml_content)
                else:
                    parsed_data = parse_xml_nfe(xml_content)
                
                chave_nfe = parsed_data.get('chave_nfe', '')
                
                # Verificar duplicata
                existing = await db.xml_documents.find_one({
                    "company_id": company_id,
                    "competencia": competencia,
                    "chave_nfe": chave_nfe
                }, {"_id": 0})
                
                if existing:
                    results["duplicados"].append(chave_nfe[-10:])
                    continue
                
                # Aplicar CST calculado em cada produto
                for product in parsed_data.get('produtos', []):
                    cfop = product.get('cfop', '')
                    ncm = product.get('ncm', '')
                    cst_info = calcular_cst_pis_cofins(
                        ncm=ncm,
                        cfop=cfop,
                        tipo_operacao="entrada",
                        cst_xml=product.get('cst_pis_xml', product.get('cst_pis', '')),
                        regime=regime_tributario
                    )
                    product.update({
                        'cst_pis_calculado': cst_info['cst_calculado'],
                        'cst_cofins_calculado': cst_info['cst_calculado'],
                        'cst_pis': cst_info['cst_calculado'],
                        'cst_cofins': cst_info['cst_calculado'],
                        'ncm_aliq_zero': cst_info['aliq_zero']
                    })
                
                # Classificar produtos com IA/cache
                produtos_para_classificar = parsed_data.get('produtos', [])
                emitente_uf = parsed_data.get('emitente_uf', '')
                
                if produtos_para_classificar:
                    file_conversions = []
                    
                    classifications, stats = await classify_products_with_cache(
                        produtos_para_classificar, 
                        company_id, 
                        company, 
                        emitente_uf
                    )
                    
                    total_stats["from_cache"] += stats.get("from_cache", 0)
                    total_stats["from_rules"] += stats.get("from_rules", 0)
                    total_stats["from_ai"] += stats.get("from_ai", 0)
                    total_stats["total"] += stats.get("total", 0)
                    
                    for p_idx, product in enumerate(produtos_para_classificar):
                        p_id = str(p_idx)
                        if p_id in classifications:
                            result_class = classifications[p_id]
                            cfop_original = product.get('cfop', '')
                            cfop_novo = result_class['cfop']
                            
                            product['cfop_original'] = cfop_original
                            product['cfop'] = cfop_novo
                            product['cfop_sugerido'] = cfop_novo
                            product['categoria_classificada'] = result_class['categoria']
                            product['justificativa_ia'] = result_class['justificativa']
                            
                            origem = "cache" if "Memorizado" in result_class['justificativa'] else ("regra" if "cadastrado" in result_class['justificativa'].lower() else "ia")
                            
                            file_conversions.append({
                                'produto': product.get('descricao', ''),
                                'cfop_original': cfop_original,
                                'cfop_convertido': cfop_novo,
                                'categoria': result_class['categoria'],
                                'motivo': result_class['justificativa'],
                                'origem': origem
                            })
                        else:
                            # FALLBACK: Classificação padrão como REVENDA
                            cfop_original = product.get('cfop', '')
                            cst = product.get('cst', '')
                            is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
                            cfop_prefix = '1'  # Upload padrão estadual
                            cfop_novo = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
                            
                            product['cfop_original'] = cfop_original
                            product['cfop'] = cfop_novo
                            product['cfop_sugerido'] = cfop_novo
                            product['categoria_classificada'] = 'revenda'
                            product['justificativa_ia'] = 'Classificação padrão: REVENDA'
                            
                            file_conversions.append({
                                'produto': product.get('descricao', ''),
                                'cfop_original': cfop_original,
                                'cfop_convertido': cfop_novo,
                                'categoria': 'revenda',
                                'motivo': 'Classificação padrão (REVENDA)',
                                'origem': 'fallback'
                            })
                    
                    if file_conversions:
                        results["relatorio_conversoes"].append({
                            "nfe": parsed_data.get('numero_nfe', ''),
                            "tipo": "entrada",
                            "conversoes": file_conversions
                        })
                
                # Salvar documento
                xml_doc = XMLDocument(
                    company_id=company_id,
                    competencia=competencia,
                    tipo="entrada",
                    modelo=parsed_data.get('modelo', xml_type),
                    xml_content=xml_content,
                    uploaded_by=current_user.id,
                    **{k: v for k, v in parsed_data.items() if k != 'modelo'}
                )
                
                doc = xml_doc.model_dump()
                doc['uploaded_at'] = doc['uploaded_at'].isoformat()
                doc['origem'] = 'sieg'
                
                await db.xml_documents.insert_one(doc)
                results["processados"]["entrada"] += 1
                
            except Exception as e:
                results["erros"].append(f"Entrada {idx + 1}: {str(e)}")
        
        # STEP 3: Processar XMLs de SAÍDA (sem classificação IA)
        for idx, xml_data in enumerate(saida_xmls):
            processed_count += 1
            progress["step"] = f"Processando saída {idx + 1}/{len(saida_xmls)}..."
            progress["progress_percent"] = 10 + int((processed_count / total_xmls) * 80)
            
            try:
                xml_content = xml_data.get("xml", "")
                if not xml_content:
                    continue
                
                xml_type = detect_xml_type(xml_content)
                if xml_type == 'nfse':
                    parsed_data = parse_xml_nfse(xml_content)
                elif xml_type == 'nfce':
                    parsed_data = parse_xml_nfce(xml_content)
                else:
                    parsed_data = parse_xml_nfe(xml_content)
                
                chave_nfe = parsed_data.get('chave_nfe', '')
                
                existing = await db.xml_documents.find_one({
                    "company_id": company_id,
                    "competencia": competencia,
                    "chave_nfe": chave_nfe
                }, {"_id": 0})
                
                if existing:
                    results["duplicados"].append(chave_nfe[-10:])
                    continue
                
                # Aplicar CST calculado em cada produto
                for product in parsed_data.get('produtos', []):
                    cfop = product.get('cfop', '')
                    ncm = product.get('ncm', '')
                    cst_info = calcular_cst_pis_cofins(
                        ncm=ncm,
                        cfop=cfop,
                        tipo_operacao="saida",
                        cst_xml=product.get('cst_pis_xml', product.get('cst_pis', '')),
                        regime=regime_tributario
                    )
                    product.update({
                        'cst_pis_calculado': cst_info['cst_calculado'],
                        'cst_cofins_calculado': cst_info['cst_calculado'],
                        'cst_pis': cst_info['cst_calculado'],
                        'cst_cofins': cst_info['cst_calculado'],
                        'ncm_aliq_zero': cst_info['aliq_zero']
                    })
                
                xml_doc = XMLDocument(
                    company_id=company_id,
                    competencia=competencia,
                    tipo="saida",
                    modelo=parsed_data.get('modelo', xml_type),
                    xml_content=xml_content,
                    uploaded_by=current_user.id,
                    **{k: v for k, v in parsed_data.items() if k != 'modelo'}
                )
                
                doc = xml_doc.model_dump()
                doc['uploaded_at'] = doc['uploaded_at'].isoformat()
                doc['origem'] = 'sieg'
                
                await db.xml_documents.insert_one(doc)
                results["processados"]["saida"] += 1
                
            except Exception as e:
                results["erros"].append(f"Saída {idx + 1}: {str(e)}")
        
        # Finalizar
        results["classificados"] = {
            "cache": total_stats["from_cache"],
            "regras": total_stats["from_rules"],
            "ia": total_stats["from_ai"]
        }
        
        progress["step"] = "Sincronização concluída!"
        progress["progress_percent"] = 100
        progress["status"] = "completed"
        progress["completed"] = True
        progress["results"] = results
        
        print(f"[SIEG] Sincronização concluída: {results['processados']}")
        return results
        
    except Exception as e:
        print(f"[SIEG] Erro na sincronização: {e}")
        progress["step"] = f"Erro: {str(e)}"
        progress["status"] = "error"
        progress["completed"] = True
        progress["results"] = {"error": str(e)}
        raise HTTPException(status_code=500, detail=f"Erro ao sincronizar com SIEG: {str(e)}")


@api_router.post("/sieg/sync/{company_id}")
async def sieg_sync_xmls(
    company_id: str,
    competencia: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Sincroniza XMLs do SIEG para a empresa e competência (versão simples sem SSE).
    Mantido para compatibilidade com código existente.
    """
    # Inicializar
    init_data = await sieg_sync_init(company_id, competencia, current_user)
    sync_id = init_data["sync_id"]
    
    # Executar
    result = await sieg_sync_execute(sync_id, current_user)
    return result


@api_router.get("/sieg/status")
async def sieg_check_status(
    current_user: User = Depends(get_current_user)
):
    """
    Verifica se a API do SIEG está configurada e acessível
    """
    api_key = os.environ.get('SIEG_API_KEY', '')
    
    return {
        "configurado": bool(api_key),
        "api_key_preview": api_key[:10] + "..." if api_key else None
    }

@api_router.post("/xml/upload")
async def upload_xml_batch(
    company_id: str = Form(...),
    competencia: str = Form(...),
    tipo: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Extrair CNPJ da empresa selecionada (limpar formatação)
    cnpj_empresa = company.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')
    uf_empresa = company.get('uf', 'SP')
    regime_tributario = company.get('regime_tributario', 'lucro_presumido')
    
    results = []
    errors = []
    conversion_report = []
    duplicadas = []
    rejeitadas_cnpj = []
    rejeitadas_competencia = []
    alertas_cfop = []  # Alertas de CFOPs de operações distintas
    
    # Estatísticas de performance do cache
    total_stats = {"from_cache": 0, "from_rules": 0, "from_ai": 0, "total": 0}
    
    # CFOPs de operações distintas que precisam de alerta
    CFOPS_OPERACOES_DISTINTAS_UPLOAD = {
        '5910': 'Remessa em bonificação',
        '5911': 'Remessa de amostra grátis',
        '5912': 'Remessa de mercadoria para demonstração',
        '5913': 'Retorno de mercadoria para demonstração',
        '5914': 'Remessa de mercadoria para exposição/feira',
        '5915': 'Remessa de mercadoria para consignação',
        '5916': 'Retorno de mercadoria de consignação',
        '5917': 'Remessa de mercadoria em consignação simbólica',
        '5918': 'Devolução de mercadoria de consignação simbólica',
        '5919': 'Devolução simbólica por venda em consignação',
        '5920': 'Remessa de vasilhame/sacaria',
        '5921': 'Devolução de vasilhame/sacaria',
        '5922': 'Lançamento para simples faturamento',
        '5923': 'Remessa de mercadoria por conta e ordem',
        '5924': 'Remessa para industrialização por conta e ordem',
        '5925': 'Retorno de mercadoria de depósito',
        '5949': 'Outra saída não especificada',
        '5201': 'Devolução de compra - indústria',
        '5202': 'Devolução de compra - comercialização',
        '5208': 'Devolução de mercadoria em transferência',
        '5209': 'Devolução de mercadoria para uso/consumo',
        '5210': 'Devolução de compra para industrialização',
        '5122': 'Venda com entrega futura',
        '5123': 'Venda de mercadoria em consignação mercantil',
        '6910': 'Remessa em bonificação (interestadual)',
        '6911': 'Remessa de amostra grátis (interestadual)',
        '6912': 'Remessa para demonstração (interestadual)',
        '6949': 'Outra saída não especificada (interestadual)',
        '6201': 'Devolução de compra - indústria (interestadual)',
        '6202': 'Devolução de compra - comercialização (interestadual)',
        '6122': 'Venda com entrega futura (interestadual)',
    }
    
    for file in files:
        try:
            content = await file.read()
            xml_str = content.decode('utf-8')
            
            # Detectar tipo de XML automaticamente
            xml_type = detect_xml_type(xml_str)
            
            # Parser apropriado para cada tipo
            if xml_type == 'nfse':
                parsed_data = parse_xml_nfse(xml_str)
            elif xml_type == 'nfce':
                parsed_data = parse_xml_nfce(xml_str)
            else:
                parsed_data = parse_xml_nfe(xml_str)
            
            chave_nfe = parsed_data['chave_nfe']
            modelo = parsed_data.get('modelo', xml_type)
            
            # VALIDAR CNPJ - Verificar se a NF-e pertence à empresa selecionada
            # Para ENTRADA: o destinatário deve ser a empresa
            # Para SAÍDA: o emitente deve ser a empresa
            cnpj_emitente = parsed_data.get('emitente_cnpj', '').replace('.', '').replace('/', '').replace('-', '')
            cnpj_destinatario = parsed_data.get('destinatario_cnpj', '').replace('.', '').replace('/', '').replace('-', '')
            
            cnpj_valido = False
            if tipo == 'entrada':
                cnpj_valido = cnpj_destinatario == cnpj_empresa
                if not cnpj_valido:
                    rejeitadas_cnpj.append({
                        "filename": file.filename,
                        "numero_nfe": parsed_data.get('numero_nfe', ''),
                        "motivo": f"CNPJ do destinatário ({cnpj_destinatario}) não corresponde à empresa selecionada ({cnpj_empresa})",
                        "emitente": parsed_data.get('emitente_nome', ''),
                        "destinatario": parsed_data.get('destinatario_nome', '')
                    })
                    continue
            else:  # saida
                cnpj_valido = cnpj_emitente == cnpj_empresa
                if not cnpj_valido:
                    rejeitadas_cnpj.append({
                        "filename": file.filename,
                        "numero_nfe": parsed_data.get('numero_nfe', ''),
                        "motivo": f"CNPJ do emitente ({cnpj_emitente}) não corresponde à empresa selecionada ({cnpj_empresa})",
                        "emitente": parsed_data.get('emitente_nome', ''),
                        "destinatario": parsed_data.get('destinatario_nome', '')
                    })
                    continue
            
            # VALIDAR COMPETÊNCIA - Verificar se a data da NF-e corresponde à competência selecionada
            data_emissao = parsed_data.get('data_emissao', '')
            if data_emissao:
                # data_emissao pode ser formato ISO: 2024-01-15T10:30:00-03:00
                try:
                    if 'T' in data_emissao:
                        data_emissao_dt = datetime.fromisoformat(data_emissao.replace('Z', '+00:00'))
                    else:
                        data_emissao_dt = datetime.strptime(data_emissao[:10], '%Y-%m-%d')
                    
                    # Extrair mês/ano da NF-e
                    mes_nfe = str(data_emissao_dt.month).zfill(2)
                    ano_nfe = str(data_emissao_dt.year)
                    competencia_nfe = f"{mes_nfe}/{ano_nfe}"
                    
                    if competencia_nfe != competencia:
                        rejeitadas_competencia.append({
                            "filename": file.filename,
                            "numero_nfe": parsed_data.get('numero_nfe', ''),
                            "motivo": f"Data da NF-e ({competencia_nfe}) não corresponde à competência selecionada ({competencia})",
                            "data_emissao": data_emissao[:10]
                        })
                        continue
                except Exception as e:
                    # Se não conseguir parsear a data, deixa passar
                    pass
            
            # VERIFICAR DUPLICAÇÃO
            existing_doc = await db.xml_documents.find_one({
                "company_id": company_id,
                "competencia": competencia,
                "chave_nfe": chave_nfe
            }, {"_id": 0})
            
            if existing_doc:
                duplicadas.append({
                    "filename": file.filename,
                    "chave": chave_nfe,
                    "numero_nfe": parsed_data['numero_nfe']
                })
                continue
            
            file_conversions = []
            file_alertas_cfop = []  # Alertas de CFOP para este arquivo
            
            # Mapeamento de CFOPs de saída para entrada (mantendo natureza)
            CFOP_SAIDA_PARA_ENTRADA = {
                # Estadual (5xxx -> 1xxx)
                '5910': '1910', '5911': '1911', '5912': '1912', '5913': '1913',
                '5914': '1914', '5915': '1915', '5916': '1916', '5917': '1917',
                '5918': '1918', '5919': '1919', '5920': '1920', '5921': '1921',
                '5922': '1922', '5923': '1923', '5924': '1924', '5925': '1925',
                '5949': '1949', '5201': '1201', '5202': '1202', '5208': '1208',
                '5209': '1209', '5210': '1210', '5122': '1102', '5123': '1102',
                # Interestadual (6xxx -> 2xxx)
                '6910': '2910', '6911': '2911', '6912': '2912', '6913': '2913',
                '6949': '2949', '6201': '2201', '6202': '2202', '6122': '2102',
            }
            
            emitente_uf = parsed_data.get('emitente_uf', '')
            
            # Separar produtos para classificação
            produtos_para_classificar = []
            produtos_operacao_distinta = []
            
            # 1. Primeira passada: Aplicar CST e separar produtos
            for product in parsed_data['produtos']:
                cfop_original = product.get('cfop', '')
                ncm = product.get('ncm', '')
                
                # APLICAR CST CALCULADO DE PIS/COFINS
                cst_info = calcular_cst_pis_cofins(
                    ncm=ncm,
                    cfop=cfop_original,
                    tipo_operacao=tipo,
                    cst_xml=product.get('cst_pis_xml', product.get('cst_pis', '')),
                    regime=regime_tributario
                )
                
                product.update({
                    'cst_pis_calculado': cst_info['cst_calculado'],
                    'cst_cofins_calculado': cst_info['cst_calculado'],
                    'cst_pis': cst_info['cst_calculado'],
                    'cst_cofins': cst_info['cst_calculado'],
                    'cst_divergente': cst_info['divergente'],
                    'cst_motivo': cst_info['motivo'],
                    'ncm_aliq_zero': cst_info['aliq_zero'],
                    'cfop_sem_incidencia': cst_info.get('sem_incidencia', False)
                })

                if tipo == 'entrada':
                    if cfop_original in CFOPS_OPERACOES_DISTINTAS_UPLOAD:
                        produtos_operacao_distinta.append((product, cfop_original))
                    else:
                        produtos_para_classificar.append(product)
            
            # 2. Processar operações distintas (CFOPs especiais)
            for product, cfop_original in produtos_operacao_distinta:
                cfop_convertido = CFOP_SAIDA_PARA_ENTRADA.get(cfop_original, cfop_original)
                product['cfop_original_emissor'] = cfop_original
                product['cfop'] = cfop_convertido
                product['pendente_revisao_cfop'] = True
                product['natureza_operacao_original'] = CFOPS_OPERACOES_DISTINTAS_UPLOAD[cfop_original]
                
                file_alertas_cfop.append({
                    'produto': product.get('descricao', ''),
                    'codigo': product.get('codigo', ''),
                    'cfop_emissor': cfop_original,
                    'cfop_convertido': cfop_convertido,
                    'descricao_cfop': CFOPS_OPERACOES_DISTINTAS_UPLOAD[cfop_original],
                    'valor': product.get('valor_total', 0),
                    'acao_tomada': f'Convertido para {cfop_convertido} (pendente revisão)'
                })
                
                file_conversions.append({
                    'produto': product.get('descricao', ''),
                    'codigo': product.get('codigo', ''),
                    'cfop_original': cfop_original,
                    'cfop_convertido': cfop_convertido,
                    'categoria': 'operacao_distinta',
                    'motivo': f"CFOP {cfop_original} ({CFOPS_OPERACOES_DISTINTAS_UPLOAD[cfop_original]}) → {cfop_convertido}"
                })
            
            # 3. CLASSIFICAR COM CACHE + IA (OTIMIZADO)
            if produtos_para_classificar and tipo == 'entrada':
                classifications, stats = await classify_products_with_cache(
                    produtos_para_classificar, 
                    company_id, 
                    company, 
                    emitente_uf
                )
                
                # Acumular estatísticas
                total_stats["from_cache"] += stats.get("from_cache", 0)
                total_stats["from_rules"] += stats.get("from_rules", 0)
                total_stats["from_ai"] += stats.get("from_ai", 0)
                total_stats["total"] += stats.get("total", 0)
                
                # Log de performance
                print(f"📊 Classificação: {stats['from_cache']} do cache, {stats['from_rules']} de regras, {stats['from_ai']} da IA")
                
                # Aplicar classificações
                for idx, product in enumerate(produtos_para_classificar):
                    p_id = str(idx)
                    if p_id in classifications:
                        result = classifications[p_id]
                        cfop_original = product.get('cfop', '')
                        cfop_novo = result['cfop']
                        
                        product['cfop_original'] = cfop_original
                        product['cfop'] = cfop_novo
                        product['cfop_sugerido'] = cfop_novo
                        product['categoria_classificada'] = result['categoria']
                        product['justificativa_ia'] = result['justificativa']
                        
                        # Marcar origem da classificação
                        origem = "cache" if "Memorizado" in result['justificativa'] else ("regra" if "cadastrado" in result['justificativa'].lower() else "ia")
                        
                        file_conversions.append({
                            'produto': product.get('descricao', ''),
                            'codigo': product.get('codigo', ''),
                            'cfop_original': cfop_original,
                            'cfop_convertido': cfop_novo,
                            'categoria': result['categoria'],
                            'motivo': result['justificativa'],
                            'origem': origem
                        })
                    else:
                        # FALLBACK: Nenhuma NF de entrada pode ficar sem classificação
                        # Na dúvida, classificar como REVENDA
                        cfop_original = product.get('cfop', '')
                        cst = product.get('cst', '')
                        is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
                        cfop_prefix = '2' if (emitente_uf and emitente_uf != uf_empresa) else '1'
                        cfop_novo = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
                        
                        product['cfop_original'] = cfop_original
                        product['cfop'] = cfop_novo
                        product['cfop_sugerido'] = cfop_novo
                        product['categoria_classificada'] = 'revenda'
                        product['justificativa_ia'] = 'Classificação padrão: REVENDA (produto para comercialização)'
                        
                        file_conversions.append({
                            'produto': product.get('descricao', ''),
                            'codigo': product.get('codigo', ''),
                            'cfop_original': cfop_original,
                            'cfop_convertido': cfop_novo,
                            'categoria': 'revenda',
                            'motivo': 'Classificação padrão (REVENDA)',
                            'origem': 'fallback'
                        })
            
            # Registrar alertas de CFOP para este arquivo
            if file_alertas_cfop:
                alertas_cfop.append({
                    "arquivo": file.filename,
                    "nfe": parsed_data['numero_nfe'],
                    "emitente": parsed_data.get('emitente_nome', ''),
                    "qtd_produtos": len(file_alertas_cfop),
                    "alertas": file_alertas_cfop
                })
            
            xml_doc = XMLDocument(
                company_id=company_id,
                competencia=competencia,
                tipo=tipo,
                modelo=modelo,
                xml_content=xml_str,
                uploaded_by=current_user.id,
                **{k: v for k, v in parsed_data.items() if k != 'modelo'}
            )
            
            doc = xml_doc.model_dump()
            doc['uploaded_at'] = doc['uploaded_at'].isoformat()
            
            await db.xml_documents.insert_one(doc)
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "chave": parsed_data['chave_nfe'],
                "conversoes": len(file_conversions)
            })
            
            if file_conversions:
                conversion_report.append({
                    "arquivo": file.filename,
                    "nfe": parsed_data['numero_nfe'],
                    "conversoes": file_conversions
                })
            
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {
        "success": results,
        "errors": errors,
        "duplicadas": duplicadas,
        "rejeitadas_cnpj": rejeitadas_cnpj,
        "rejeitadas_competencia": rejeitadas_competencia,
        "relatorio_conversoes": conversion_report,
        "alertas_cfop": alertas_cfop,
        "total_conversoes": sum(len(r['conversoes']) for r in conversion_report),
        "total_alertas_cfop": sum(len(a['alertas']) for a in alertas_cfop),
        "performance": {
            "produtos_do_cache": total_stats["from_cache"],
            "produtos_de_regras": total_stats["from_rules"],
            "produtos_da_ia": total_stats["from_ai"],
            "total_classificados": total_stats["total"]
        },
        "resumo": {
            "total_arquivos": len(files),
            "importados": len(results),
            "duplicados": len(duplicadas),
            "rejeitados_cnpj": len(rejeitadas_cnpj),
            "rejeitados_competencia": len(rejeitadas_competencia),
            "erros": len(errors),
            "alertas_cfop": len(alertas_cfop)
        }
    }


# ============== UPLOAD COM PROGRESSO (SSE) ==============
upload_progress_store: Dict[str, Dict] = {}

@api_router.post("/xml/upload-init")
async def init_upload(
    company_id: str = Form(...),
    competencia: str = Form(...),
    tipo: str = Form(...),
    total_files: int = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Inicializa uma sessão de upload e retorna um upload_id para acompanhar o progresso"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    upload_id = str(uuid.uuid4())
    upload_progress_store[upload_id] = {
        "status": "initialized",
        "total_files": total_files,
        "processed_files": 0,
        "current_file": "",
        "current_step": "Aguardando arquivos...",
        "progress_percent": 0,
        "company_id": company_id,
        "competencia": competencia,
        "tipo": tipo,
        "user_id": current_user.id,
        "results": None,
        "completed": False
    }
    
    return {"upload_id": upload_id}


@api_router.get("/xml/upload-progress/{upload_id}")
async def stream_upload_progress(upload_id: str):
    """Stream de progresso do upload via Server-Sent Events"""
    
    async def event_generator():
        last_progress = -1
        while True:
            if upload_id not in upload_progress_store:
                yield f"data: {json.dumps({'error': 'Upload não encontrado'})}\n\n"
                break
            
            progress = upload_progress_store[upload_id]
            current_progress = progress.get("progress_percent", 0)
            
            # Enviar atualização apenas se houver mudança
            if current_progress != last_progress or progress.get("completed"):
                event_data = {
                    "status": progress["status"],
                    "total_files": progress["total_files"],
                    "processed_files": progress["processed_files"],
                    "current_file": progress["current_file"],
                    "current_step": progress["current_step"],
                    "progress_percent": progress["progress_percent"],
                    "completed": progress.get("completed", False)
                }
                
                if progress.get("completed") and progress.get("results"):
                    event_data["results"] = progress["results"]
                    yield f"data: {json.dumps(event_data)}\n\n"
                    # Limpar dados após enviar resultados
                    await asyncio.sleep(1)
                    if upload_id in upload_progress_store:
                        del upload_progress_store[upload_id]
                    break
                
                yield f"data: {json.dumps(event_data)}\n\n"
                last_progress = current_progress
            
            await asyncio.sleep(0.3)  # Verificar a cada 300ms
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@api_router.post("/xml/upload-stream")
async def upload_xml_with_progress(
    upload_id: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload de XMLs com progresso em tempo real"""
    
    if upload_id not in upload_progress_store:
        raise HTTPException(status_code=404, detail="Sessão de upload não encontrada")
    
    progress = upload_progress_store[upload_id]
    company_id = progress["company_id"]
    competencia = progress["competencia"]
    tipo = progress["tipo"]
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    cnpj_empresa = company.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')
    uf_empresa = company.get('uf', 'SP')
    regime_tributario = company.get('regime_tributario', 'lucro_presumido')
    
    results = []
    errors = []
    conversion_report = []
    duplicadas = []
    rejeitadas_cnpj = []
    rejeitadas_competencia = []
    alertas_cfop = []
    
    total_stats = {"from_cache": 0, "from_rules": 0, "from_ai": 0, "total": 0}
    
    CFOPS_OPERACOES_DISTINTAS_UPLOAD = {
        '5910': 'Remessa em bonificação', '5911': 'Remessa de amostra grátis',
        '5912': 'Remessa de mercadoria para demonstração', '5913': 'Retorno de mercadoria para demonstração',
        '5914': 'Remessa de mercadoria para exposição/feira', '5915': 'Remessa de mercadoria para consignação',
        '5916': 'Retorno de mercadoria de consignação', '5917': 'Remessa de mercadoria em consignação simbólica',
        '5918': 'Devolução de mercadoria de consignação simbólica', '5919': 'Devolução simbólica por venda em consignação',
        '5920': 'Remessa de vasilhame/sacaria', '5921': 'Devolução de vasilhame/sacaria',
        '5922': 'Lançamento para simples faturamento', '5923': 'Remessa de mercadoria por conta e ordem',
        '5924': 'Remessa para industrialização por conta e ordem', '5925': 'Retorno de mercadoria de depósito',
        '5949': 'Outra saída não especificada', '5201': 'Devolução de compra - indústria',
        '5202': 'Devolução de compra - comercialização', '5208': 'Devolução de mercadoria em transferência',
        '5209': 'Devolução de mercadoria para uso/consumo', '5210': 'Devolução de compra para industrialização',
        '5122': 'Venda com entrega futura', '5123': 'Venda de mercadoria em consignação mercantil',
        '6910': 'Remessa em bonificação (interestadual)', '6911': 'Remessa de amostra grátis (interestadual)',
        '6912': 'Remessa para demonstração (interestadual)', '6949': 'Outra saída não especificada (interestadual)',
        '6201': 'Devolução de compra - indústria (interestadual)', '6202': 'Devolução de compra - comercialização (interestadual)',
        '6122': 'Venda com entrega futura (interestadual)',
    }
    
    CFOP_SAIDA_PARA_ENTRADA = {
        '5910': '1910', '5911': '1911', '5912': '1912', '5913': '1913',
        '5914': '1914', '5915': '1915', '5916': '1916', '5917': '1917',
        '5918': '1918', '5919': '1919', '5920': '1920', '5921': '1921',
        '5922': '1922', '5923': '1923', '5924': '1924', '5925': '1925',
        '5949': '1949', '5201': '1201', '5202': '1202', '5208': '1208',
        '5209': '1209', '5210': '1210', '5122': '1102', '5123': '1102',
        '6910': '2910', '6911': '2911', '6912': '2912', '6913': '2913',
        '6949': '2949', '6201': '2201', '6202': '2202', '6122': '2102',
    }
    
    total_files = len(files)
    
    for file_idx, file in enumerate(files):
        # Atualizar progresso: lendo arquivo
        progress["processed_files"] = file_idx
        progress["current_file"] = file.filename
        progress["current_step"] = f"Lendo arquivo {file_idx + 1}/{total_files}..."
        progress["progress_percent"] = int((file_idx / total_files) * 100)
        progress["status"] = "processing"
        
        try:
            content = await file.read()
            xml_str = content.decode('utf-8')
            
            # Atualizar progresso: validando
            progress["current_step"] = f"Validando {file.filename}..."
            
            xml_type = detect_xml_type(xml_str)
            
            if xml_type == 'nfse':
                parsed_data = parse_xml_nfse(xml_str)
            elif xml_type == 'nfce':
                parsed_data = parse_xml_nfce(xml_str)
            else:
                parsed_data = parse_xml_nfe(xml_str)
            
            chave_nfe = parsed_data['chave_nfe']
            modelo = parsed_data.get('modelo', xml_type)
            
            cnpj_emitente = parsed_data.get('emitente_cnpj', '').replace('.', '').replace('/', '').replace('-', '')
            cnpj_destinatario = parsed_data.get('destinatario_cnpj', '').replace('.', '').replace('/', '').replace('-', '')
            
            cnpj_valido = False
            if tipo == 'entrada':
                cnpj_valido = cnpj_destinatario == cnpj_empresa
                if not cnpj_valido:
                    rejeitadas_cnpj.append({
                        "filename": file.filename,
                        "numero_nfe": parsed_data.get('numero_nfe', ''),
                        "motivo": f"CNPJ do destinatário ({cnpj_destinatario}) não corresponde à empresa selecionada ({cnpj_empresa})",
                        "emitente": parsed_data.get('emitente_nome', ''),
                        "destinatario": parsed_data.get('destinatario_nome', '')
                    })
                    continue
            else:
                cnpj_valido = cnpj_emitente == cnpj_empresa
                if not cnpj_valido:
                    rejeitadas_cnpj.append({
                        "filename": file.filename,
                        "numero_nfe": parsed_data.get('numero_nfe', ''),
                        "motivo": f"CNPJ do emitente ({cnpj_emitente}) não corresponde à empresa selecionada ({cnpj_empresa})",
                        "emitente": parsed_data.get('emitente_nome', ''),
                        "destinatario": parsed_data.get('destinatario_nome', '')
                    })
                    continue
            
            data_emissao = parsed_data.get('data_emissao', '')
            if data_emissao:
                try:
                    if 'T' in data_emissao:
                        data_emissao_dt = datetime.fromisoformat(data_emissao.replace('Z', '+00:00'))
                    else:
                        data_emissao_dt = datetime.strptime(data_emissao[:10], '%Y-%m-%d')
                    
                    mes_nfe = str(data_emissao_dt.month).zfill(2)
                    ano_nfe = str(data_emissao_dt.year)
                    competencia_nfe = f"{mes_nfe}/{ano_nfe}"
                    
                    if competencia_nfe != competencia:
                        rejeitadas_competencia.append({
                            "filename": file.filename,
                            "numero_nfe": parsed_data.get('numero_nfe', ''),
                            "motivo": f"Data da NF-e ({competencia_nfe}) não corresponde à competência selecionada ({competencia})",
                            "data_emissao": data_emissao[:10]
                        })
                        continue
                except Exception:
                    pass
            
            existing_doc = await db.xml_documents.find_one({
                "company_id": company_id,
                "competencia": competencia,
                "chave_nfe": chave_nfe
            }, {"_id": 0})
            
            if existing_doc:
                duplicadas.append({
                    "filename": file.filename,
                    "chave": chave_nfe,
                    "numero_nfe": parsed_data['numero_nfe']
                })
                continue
            
            file_conversions = []
            file_alertas_cfop = []
            
            emitente_uf = parsed_data.get('emitente_uf', '')
            
            produtos_para_classificar = []
            produtos_operacao_distinta = []
            
            for product in parsed_data['produtos']:
                cfop_original = product.get('cfop', '')
                ncm = product.get('ncm', '')
                
                cst_info = calcular_cst_pis_cofins(
                    ncm=ncm,
                    cfop=cfop_original,
                    tipo_operacao=tipo,
                    cst_xml=product.get('cst_pis_xml', product.get('cst_pis', '')),
                    regime=regime_tributario
                )
                
                product.update({
                    'cst_pis_calculado': cst_info['cst_calculado'],
                    'cst_cofins_calculado': cst_info['cst_calculado'],
                    'cst_pis': cst_info['cst_calculado'],
                    'cst_cofins': cst_info['cst_calculado'],
                    'cst_divergente': cst_info['divergente'],
                    'cst_motivo': cst_info['motivo'],
                    'ncm_aliq_zero': cst_info['aliq_zero'],
                    'cfop_sem_incidencia': cst_info.get('sem_incidencia', False)
                })

                if tipo == 'entrada':
                    if cfop_original in CFOPS_OPERACOES_DISTINTAS_UPLOAD:
                        produtos_operacao_distinta.append((product, cfop_original))
                    else:
                        produtos_para_classificar.append(product)
            
            for product, cfop_original in produtos_operacao_distinta:
                cfop_convertido = CFOP_SAIDA_PARA_ENTRADA.get(cfop_original, cfop_original)
                product['cfop_original_emissor'] = cfop_original
                product['cfop'] = cfop_convertido
                product['pendente_revisao_cfop'] = True
                product['natureza_operacao_original'] = CFOPS_OPERACOES_DISTINTAS_UPLOAD[cfop_original]
                
                file_alertas_cfop.append({
                    'produto': product.get('descricao', ''),
                    'codigo': product.get('codigo', ''),
                    'cfop_emissor': cfop_original,
                    'cfop_convertido': cfop_convertido,
                    'descricao_cfop': CFOPS_OPERACOES_DISTINTAS_UPLOAD[cfop_original],
                    'valor': product.get('valor_total', 0),
                    'acao_tomada': f'Convertido para {cfop_convertido} (pendente revisão)'
                })
                
                file_conversions.append({
                    'produto': product.get('descricao', ''),
                    'codigo': product.get('codigo', ''),
                    'cfop_original': cfop_original,
                    'cfop_convertido': cfop_convertido,
                    'categoria': 'operacao_distinta',
                    'motivo': f"CFOP {cfop_original} ({CFOPS_OPERACOES_DISTINTAS_UPLOAD[cfop_original]}) → {cfop_convertido}"
                })
            
            # Atualizar progresso: classificando
            if produtos_para_classificar and tipo == 'entrada':
                progress["current_step"] = f"Classificando produtos de {file.filename}..."
                
                classifications, stats = await classify_products_with_cache(
                    produtos_para_classificar, 
                    company_id, 
                    company, 
                    emitente_uf
                )
                
                total_stats["from_cache"] += stats.get("from_cache", 0)
                total_stats["from_rules"] += stats.get("from_rules", 0)
                total_stats["from_ai"] += stats.get("from_ai", 0)
                total_stats["total"] += stats.get("total", 0)
                
                for idx, product in enumerate(produtos_para_classificar):
                    p_id = str(idx)
                    if p_id in classifications:
                        result = classifications[p_id]
                        cfop_original = product.get('cfop', '')
                        cfop_novo = result['cfop']
                        
                        product['cfop_original'] = cfop_original
                        product['cfop'] = cfop_novo
                        product['cfop_sugerido'] = cfop_novo
                        product['categoria_classificada'] = result['categoria']
                        product['justificativa_ia'] = result['justificativa']
                        
                        origem = "cache" if "Memorizado" in result['justificativa'] else ("regra" if "cadastrado" in result['justificativa'].lower() else "ia")
                        
                        file_conversions.append({
                            'produto': product.get('descricao', ''),
                            'codigo': product.get('codigo', ''),
                            'cfop_original': cfop_original,
                            'cfop_convertido': cfop_novo,
                            'categoria': result['categoria'],
                            'motivo': result['justificativa'],
                            'origem': origem
                        })
                    else:
                        # FALLBACK: Classificação padrão como REVENDA
                        cfop_original = product.get('cfop', '')
                        cst = product.get('cst', '')
                        is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
                        cfop_prefix = '2' if (emitente_uf and emitente_uf != uf_empresa) else '1'
                        cfop_novo = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
                        
                        product['cfop_original'] = cfop_original
                        product['cfop'] = cfop_novo
                        product['cfop_sugerido'] = cfop_novo
                        product['categoria_classificada'] = 'revenda'
                        product['justificativa_ia'] = 'Classificação padrão: REVENDA'
                        
                        file_conversions.append({
                            'produto': product.get('descricao', ''),
                            'codigo': product.get('codigo', ''),
                            'cfop_original': cfop_original,
                            'cfop_convertido': cfop_novo,
                            'categoria': 'revenda',
                            'motivo': 'Classificação padrão (REVENDA)',
                            'origem': 'fallback'
                        })
            
            if file_alertas_cfop:
                alertas_cfop.append({
                    "arquivo": file.filename,
                    "nfe": parsed_data['numero_nfe'],
                    "emitente": parsed_data.get('emitente_nome', ''),
                    "qtd_produtos": len(file_alertas_cfop),
                    "alertas": file_alertas_cfop
                })
            
            # Atualizar progresso: salvando
            progress["current_step"] = f"Salvando {file.filename}..."
            
            xml_doc = XMLDocument(
                company_id=company_id,
                competencia=competencia,
                tipo=tipo,
                modelo=modelo,
                xml_content=xml_str,
                uploaded_by=current_user.id,
                **{k: v for k, v in parsed_data.items() if k != 'modelo'}
            )
            
            doc = xml_doc.model_dump()
            doc['uploaded_at'] = doc['uploaded_at'].isoformat()
            
            await db.xml_documents.insert_one(doc)
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "chave": parsed_data['chave_nfe'],
                "conversoes": len(file_conversions)
            })
            
            if file_conversions:
                conversion_report.append({
                    "arquivo": file.filename,
                    "nfe": parsed_data['numero_nfe'],
                    "conversoes": file_conversions
                })
            
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    # Upload concluído
    final_results = {
        "success": results,
        "errors": errors,
        "duplicadas": duplicadas,
        "rejeitadas_cnpj": rejeitadas_cnpj,
        "rejeitadas_competencia": rejeitadas_competencia,
        "relatorio_conversoes": conversion_report,
        "alertas_cfop": alertas_cfop,
        "total_conversoes": sum(len(r['conversoes']) for r in conversion_report),
        "total_alertas_cfop": sum(len(a['alertas']) for a in alertas_cfop),
        "performance": {
            "produtos_do_cache": total_stats["from_cache"],
            "produtos_de_regras": total_stats["from_rules"],
            "produtos_da_ia": total_stats["from_ai"],
            "total_classificados": total_stats["total"]
        },
        "resumo": {
            "total_arquivos": len(files),
            "importados": len(results),
            "duplicados": len(duplicadas),
            "rejeitados_cnpj": len(rejeitadas_cnpj),
            "rejeitados_competencia": len(rejeitadas_competencia),
            "erros": len(errors),
            "alertas_cfop": len(alertas_cfop)
        }
    }
    
    progress["processed_files"] = total_files
    progress["progress_percent"] = 100
    progress["current_step"] = "Upload concluído!"
    progress["status"] = "completed"
    progress["completed"] = True
    progress["results"] = final_results
    
    return final_results


@api_router.get("/xml/documents")
async def list_documents(
    company_id: Optional[str] = None,
    competencia: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if current_user.role != UserRole.ADMIN:
        companies = await db.companies.find({"cnpj": {"$in": current_user.company_ids}}, {"_id": 0}).to_list(1000)
        company_ids = [c['id'] for c in companies]
        query['company_id'] = {"$in": company_ids}
    elif company_id:
        query['company_id'] = company_id
    
    if competencia:
        query['competencia'] = competencia
    
    documents = await db.xml_documents.find(query, {"_id": 0, "xml_content": 0}).to_list(1000)
    
    for doc in documents:
        if isinstance(doc['uploaded_at'], str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
    
    return documents

@api_router.get("/xml/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    document = await db.xml_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    if current_user.role != UserRole.ADMIN:
        company = await db.companies.find_one({"id": document['company_id']}, {"_id": 0})
        if not company or company['cnpj'] not in current_user.company_ids:
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    if isinstance(document['uploaded_at'], str):
        document['uploaded_at'] = datetime.fromisoformat(document['uploaded_at'])
    
    return document


@api_router.post("/xml/reprocess/{document_id}")
async def reprocess_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Re-processa o XML original de um documento para extrair campos faltantes
    (como ICMS-ST, endereços, etc.) MANTENDO as classificações da IA e memórias.
    """
    document = await db.xml_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    xml_content = document.get('xml_content', '')
    if not xml_content:
        return {"success": False, "error": "XML original não encontrado"}
    
    try:
        # Re-parsear o XML original
        modelo = document.get('modelo', 'nfe')
        if modelo == 'nfse':
            parsed = parse_xml_nfse(xml_content)
        elif modelo == 'nfce':
            parsed = parse_xml_nfce(xml_content)
        else:
            parsed = parse_xml_nfe(xml_content)
        
        # Mesclar produtos: manter classificações da IA, adicionar campos novos do XML
        produtos_atuais = document.get('produtos', [])
        produtos_novos = parsed.get('produtos', [])
        
        # Criar mapa dos produtos atuais por código
        produtos_map = {p.get('codigo', ''): p for p in produtos_atuais}
        
        # Mesclar: para cada produto do XML, preservar campos da IA
        produtos_mesclados = []
        for prod_novo in produtos_novos:
            codigo = prod_novo.get('codigo', '')
            prod_atual = produtos_map.get(codigo, {})
            
            # Campos que devem ser PRESERVADOS (classificações da IA)
            campos_preservar = [
                'classificacao',      # REVENDA, INSUMO, DESPESA, etc.
                'cfop',               # CFOP classificado pela IA
                'cfop_sugerido',      # Sugestão da IA
                'justificativa_ia',   # Justificativa da classificação
                'aprovado',           # Se foi aprovado pelo usuário
                'reclassificado',     # Se foi reclassificado manualmente
                'reclassificado_por', # Quem reclassificou
                'data_reclassificacao', # Quando foi reclassificado
            ]
            
            # Começar com os dados novos do XML
            prod_mesclado = prod_novo.copy()
            
            # Preservar campos da IA que existem no produto atual
            for campo in campos_preservar:
                if campo in prod_atual and prod_atual[campo]:
                    prod_mesclado[campo] = prod_atual[campo]
            
            produtos_mesclados.append(prod_mesclado)
        
        # Atualizar o documento com os novos campos extraídos
        update_data = {
            'produtos': produtos_mesclados,
            'emitente_ie': parsed.get('emitente_ie', '') or document.get('emitente_ie', ''),
            'emitente_endereco': parsed.get('emitente_endereco', {}) or document.get('emitente_endereco', {}),
            'destinatario_ie': parsed.get('destinatario_ie', '') or document.get('destinatario_ie', ''),
            'destinatario_endereco': parsed.get('destinatario_endereco', {}) or document.get('destinatario_endereco', {}),
            'total_ipi': parsed.get('total_ipi', 0),
            'total_icms_st': parsed.get('total_icms_st', 0),
            'total_frete': parsed.get('total_frete', 0),
            'total_seguro': parsed.get('total_seguro', 0),
            'total_outras_despesas': parsed.get('total_outras_despesas', 0),
            'total_desconto': parsed.get('total_desconto', 0),
        }
        
        await db.xml_documents.update_one(
            {"id": document_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "document_id": document_id,
            "numero_nfe": document.get('numero_nfe'),
            "campos_atualizados": list(update_data.keys()),
            "total_icms_st": update_data['total_icms_st'],
            "produtos_com_st": sum(1 for p in update_data['produtos'] if p.get('v_icms_st', 0) > 0),
            "classificacoes_preservadas": sum(1 for p in produtos_mesclados if p.get('classificacao'))
        }
        
    except Exception as e:
        return {"success": False, "error": f"Erro ao re-processar: {str(e)}"}


@api_router.post("/xml/reprocess-batch")
async def reprocess_batch(
    company_id: str,
    competencia: str,
    classificar: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Re-processa todos os XMLs de uma competência para extrair campos faltantes.
    Se classificar=True, também aplica classificação da IA usando memória aprendida.
    MANTÉM as classificações existentes que foram feitas manualmente.
    """
    # Buscar documentos COM os produtos atuais para preservar classificações
    documents = await db.xml_documents.find(
        {"company_id": company_id, "competencia": competencia},
        {"_id": 0}
    ).to_list(2000)
    
    if not documents:
        return {"success": False, "error": "Nenhum documento encontrado"}
    
    # Buscar dados da empresa para classificação
    company = None
    if classificar:
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if not company:
            return {"success": False, "error": "Empresa não encontrada para classificação"}
    
    results = {
        "total": len(documents), 
        "success": 0, 
        "errors": 0, 
        "with_st": 0, 
        "classificacoes_preservadas": 0,
        "classificacoes_novas": 0
    }
    
    for doc in documents:
        try:
            xml_content = doc.get('xml_content', '')
            if not xml_content:
                results['errors'] += 1
                continue
            
            modelo = doc.get('modelo', 'nfe')
            if modelo == 'nfse':
                parsed = parse_xml_nfse(xml_content)
            elif modelo == 'nfce':
                parsed = parse_xml_nfce(xml_content)
            else:
                parsed = parse_xml_nfe(xml_content)
            
            # Mesclar produtos: manter classificações existentes, adicionar campos novos do XML
            produtos_atuais = doc.get('produtos', [])
            produtos_novos = parsed.get('produtos', [])
            
            # Criar mapa dos produtos atuais por código
            produtos_map = {p.get('codigo', ''): p for p in produtos_atuais}
            
            # Campos que devem ser PRESERVADOS se existirem
            campos_preservar = [
                'classificacao', 'cfop', 'cfop_sugerido', 'justificativa_ia',
                'aprovado', 'reclassificado', 'reclassificado_por', 'data_reclassificacao'
            ]
            
            # Mesclar produtos
            produtos_mesclados = []
            produtos_para_classificar = []
            
            for prod_novo in produtos_novos:
                codigo = prod_novo.get('codigo', '')
                prod_atual = produtos_map.get(codigo, {})
                
                prod_mesclado = prod_novo.copy()
                has_classification = False
                
                for campo in campos_preservar:
                    if campo in prod_atual and prod_atual[campo]:
                        prod_mesclado[campo] = prod_atual[campo]
                        if campo == 'classificacao':
                            has_classification = True
                
                produtos_mesclados.append(prod_mesclado)
                
                if has_classification:
                    results['classificacoes_preservadas'] += 1
                elif classificar:
                    # Marcar para classificação
                    produtos_para_classificar.append(prod_mesclado)
            
            # Classificar produtos pendentes se solicitado
            if classificar and produtos_para_classificar and doc.get('tipo') == 'entrada':
                emitente_uf = doc.get('emitente_uf', '') or parsed.get('emitente_uf', '')
                
                try:
                    classifications, stats = await classify_products_with_cache(
                        produtos_para_classificar,
                        company_id,
                        company,
                        emitente_uf
                    )
                    
                    # Aplicar classificações
                    for prod in produtos_mesclados:
                        if prod in produtos_para_classificar:
                            idx = str(produtos_para_classificar.index(prod))
                            if idx in classifications:
                                result = classifications[idx]
                                prod['classificacao'] = result.get('categoria', 'revenda')
                                prod['cfop'] = result.get('cfop', '')
                                prod['cfop_sugerido'] = result.get('cfop', '')
                                prod['justificativa_ia'] = result.get('justificativa', 'Classificado por IA no re-processamento')
                                results['classificacoes_novas'] += 1
                except Exception as e:
                    # Se falhar a classificação, continua sem classificar
                    pass
            
            update_data = {
                'produtos': produtos_mesclados,
                'emitente_ie': parsed.get('emitente_ie', '') or doc.get('emitente_ie', ''),
                'emitente_endereco': parsed.get('emitente_endereco', {}) or doc.get('emitente_endereco', {}),
                'destinatario_ie': parsed.get('destinatario_ie', '') or doc.get('destinatario_ie', ''),
                'destinatario_endereco': parsed.get('destinatario_endereco', {}) or doc.get('destinatario_endereco', {}),
                'total_ipi': parsed.get('total_ipi', 0),
                'total_icms_st': parsed.get('total_icms_st', 0),
                'total_frete': parsed.get('total_frete', 0),
                'total_seguro': parsed.get('total_seguro', 0),
                'total_outras_despesas': parsed.get('total_outras_despesas', 0),
                'total_desconto': parsed.get('total_desconto', 0),
            }
            
            await db.xml_documents.update_one(
                {"id": doc['id']},
                {"$set": update_data}
            )
            
            results['success'] += 1
            if update_data['total_icms_st'] > 0:
                results['with_st'] += 1
                results['with_st'] += 1
                
        except Exception as e:
            results['errors'] += 1
    
    return results


@api_router.post("/xml/reimport-batch")
async def reimport_batch(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """
    Re-importa completamente todos os XMLs de ENTRADA de uma competência.
    Funciona como se os documentos fossem apagados e importados novamente:
    - Re-extrai TODOS os dados do XML original
    - APAGA todas as classificações anteriores
    - Aplica classificação da IA do zero
    - Atualiza status normalmente
    NOTA: Saídas (emissão própria) são IGNORADAS - não precisam de classificação
    """
    # Buscar dados da empresa
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        return {"success": False, "error": "Empresa não encontrada"}
    
    cnpj_empresa = company.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')
    uf_empresa = company.get('uf', 'SP')
    
    # Buscar todos os documentos
    all_documents = await db.xml_documents.find(
        {"company_id": company_id, "competencia": competencia},
        {"_id": 0}
    ).to_list(2000)
    
    if not all_documents:
        return {"success": False, "error": "Nenhum documento encontrado"}
    
    # Filtrar apenas documentos de ENTRADA
    documents = []
    for doc in all_documents:
        cnpj_emit = (doc.get('emitente_cnpj') or doc.get('cnpj_emitente', '')).replace('.', '').replace('/', '').replace('-', '')
        if cnpj_emit != cnpj_empresa:
            documents.append(doc)
    
    if not documents:
        return {"success": False, "error": "Nenhum documento de ENTRADA encontrado"}
    
    results = {
        "total": len(documents), 
        "success": 0, 
        "errors": 0, 
        "classificados": 0,
        "entradas": len(documents),
        "saidas_ignoradas": len(all_documents) - len(documents)
    }
    
    for doc in documents:
        try:
            xml_content = doc.get('xml_content', '')
            if not xml_content:
                results['errors'] += 1
                continue
            
            # Re-parsear o XML completamente
            modelo = doc.get('modelo', 'nfe')
            if modelo == 'nfse':
                parsed = parse_xml_nfse(xml_content)
            elif modelo == 'nfce':
                parsed = parse_xml_nfce(xml_content)
            else:
                parsed = parse_xml_nfe(xml_content)
            
            # Já sabemos que é ENTRADA (filtrado acima)
            tipo = 'entrada'
            emitente_uf = parsed.get('emitente_uf', '')
            produtos = parsed.get('produtos', [])
            
            # Classificar produtos de ENTRADA com IA
            if produtos:
                # Converter CFOPs de saída para entrada (o XML vem com CFOP do emitente)
                for product in produtos:
                    cfop = str(product.get('cfop', ''))
                    if cfop.startswith('5') or cfop.startswith('6'):
                        cfop_entrada = cfop.replace('5', '1', 1).replace('6', '2', 1)
                        product['cfop_original'] = cfop
                        product['cfop'] = cfop_entrada
                
                # Classificar com IA
                try:
                    classifications, stats = await classify_products_with_cache(
                        produtos,
                        company_id,
                        company,
                        emitente_uf
                    )
                    
                    # Aplicar classificações
                    for idx, product in enumerate(produtos):
                        p_id = str(idx)
                        if p_id in classifications:
                            result = classifications[p_id]
                            cfop_original = product.get('cfop_original', product.get('cfop', ''))
                            cfop_novo = result['cfop']
                            
                            product['cfop_original'] = cfop_original
                            product['cfop'] = cfop_novo
                            product['cfop_sugerido'] = cfop_novo
                            product['classificacao'] = result['categoria']
                            product['categoria_classificada'] = result['categoria']
                            product['justificativa_ia'] = result['justificativa']
                            product['aprovado'] = False
                            product['reclassificado'] = False
                            results['classificados'] += 1
                        else:
                            # Fallback: REVENDA
                            is_interestadual = emitente_uf and emitente_uf != uf_empresa
                            cfop_prefix = '2' if is_interestadual else '1'
                            cst = product.get('cst', '')
                            is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
                            cfop_novo = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
                            
                            product['cfop'] = cfop_novo
                            product['cfop_sugerido'] = cfop_novo
                            product['classificacao'] = 'revenda'
                            product['categoria_classificada'] = 'revenda'
                            product['justificativa_ia'] = 'Classificação padrão: REVENDA'
                            product['aprovado'] = False
                            product['reclassificado'] = False
                            results['classificados'] += 1
                            
                except Exception as e:
                    print(f"Erro na classificação IA: {e}")
                    # Se falhar IA, aplicar fallback para todos
                    for product in produtos:
                        is_interestadual = emitente_uf and emitente_uf != uf_empresa
                        cfop_prefix = '2' if is_interestadual else '1'
                        product['cfop'] = cfop_prefix + '102'
                        product['cfop_sugerido'] = cfop_prefix + '102'
                        product['classificacao'] = 'revenda'
                        product['categoria_classificada'] = 'revenda'
                        product['justificativa_ia'] = 'Classificação padrão: REVENDA (fallback)'
                        product['aprovado'] = False
                        product['reclassificado'] = False
            
            # Atualizar documento com TODOS os dados re-extraídos
            update_data = {
                'tipo': tipo,
                'produtos': produtos,
                'valor_total': parsed.get('valor_total', 0),
                'data_emissao': parsed.get('data_emissao'),
                'numero_nfe': parsed.get('numero_nfe', ''),
                'chave_acesso': parsed.get('chave_acesso', ''),
                'emitente_nome': parsed.get('emitente_nome', ''),
                'emitente_cnpj': parsed.get('cnpj_emitente', ''),
                'emitente_uf': emitente_uf,
                'emitente_ie': parsed.get('emitente_ie', ''),
                'emitente_endereco': parsed.get('emitente_endereco', {}),
                'destinatario_nome': parsed.get('destinatario_nome', ''),
                'destinatario_cnpj': parsed.get('cnpj_destinatario', ''),
                'destinatario_ie': parsed.get('destinatario_ie', ''),
                'destinatario_endereco': parsed.get('destinatario_endereco', {}),
                'total_icms': parsed.get('total_icms', 0),
                'total_icms_st': parsed.get('total_icms_st', 0),
                'total_ipi': parsed.get('total_ipi', 0),
                'total_pis': parsed.get('total_pis', 0),
                'total_cofins': parsed.get('total_cofins', 0),
                'total_frete': parsed.get('total_frete', 0),
                'total_seguro': parsed.get('total_seguro', 0),
                'total_outras_despesas': parsed.get('total_outras_despesas', 0),
                'total_desconto': parsed.get('total_desconto', 0),
                'status_validacao': 'pendente',  # Reset para pendente
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            await db.xml_documents.update_one(
                {"id": doc['id']},
                {"$set": update_data}
            )
            
            results['success'] += 1
                
        except Exception as e:
            print(f"Erro ao reimportar documento: {e}")
            results['errors'] += 1
    
    return results


@api_router.get("/xml/validate-integrity/{document_id}")
async def validate_document_integrity(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Valida integridade do documento comparando valores salvos com XML original.
    Garante que valores não foram alterados após importação.
    """
    document = await db.xml_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    xml_content = document.get('xml_content', '')
    if not xml_content:
        return {"valid": False, "error": "XML original não encontrado"}
    
    try:
        # Re-parsear o XML original
        modelo = document.get('modelo', 'nfe')
        if modelo == 'nfse':
            parsed = parse_xml_nfse(xml_content)
        elif modelo == 'nfce':
            parsed = parse_xml_nfce(xml_content)
        else:
            parsed = parse_xml_nfe(xml_content)
        
        divergencias = []
        
        # Comparar valor total da NF
        valor_xml = round(float(parsed.get('valor_total', 0)), 2)
        valor_db = round(float(document.get('valor_total', 0)), 2)
        if valor_xml != valor_db:
            divergencias.append({
                "campo": "valor_total",
                "descricao": "Valor Total da NF",
                "valor_xml": valor_xml,
                "valor_db": valor_db,
                "diferenca": round(valor_db - valor_xml, 2)
            })
        
        # Comparar número da NF
        numero_xml = str(parsed.get('numero_nfe', ''))
        numero_db = str(document.get('numero_nfe', ''))
        if numero_xml != numero_db:
            divergencias.append({
                "campo": "numero_nfe",
                "descricao": "Número da NF",
                "valor_xml": numero_xml,
                "valor_db": numero_db
            })
        
        # Comparar produtos (quantidade e valores)
        produtos_xml = parsed.get('produtos', [])
        produtos_db = document.get('produtos', [])
        
        # Criar mapa por código de produto para comparação
        for i, prod_db in enumerate(produtos_db):
            codigo = prod_db.get('codigo', '')
            
            # Encontrar produto correspondente no XML
            prod_xml = None
            for px in produtos_xml:
                if px.get('codigo', '') == codigo:
                    prod_xml = px
                    break
            
            if prod_xml:
                # Comparar valor total do produto
                valor_prod_xml = round(float(prod_xml.get('valor_total', 0)), 2)
                valor_prod_db = round(float(prod_db.get('valor_total', 0)), 2)
                
                # Nota: O valor_total no DB pode incluir IPI e ST conforme lógica de importação
                # Vamos comparar o valor_produto (vProd) se disponível
                valor_vprod_xml = round(float(prod_xml.get('valor_produto', prod_xml.get('valor_total', 0))), 2)
                valor_vprod_db = round(float(prod_db.get('valor_produto', prod_db.get('valor_total', 0))), 2)
                
                if valor_vprod_xml != valor_vprod_db:
                    divergencias.append({
                        "campo": f"produto_{i}_valor",
                        "descricao": f"Valor Produto: {prod_db.get('descricao', codigo)[:30]}",
                        "valor_xml": valor_vprod_xml,
                        "valor_db": valor_vprod_db,
                        "diferenca": round(valor_vprod_db - valor_vprod_xml, 2)
                    })
                
                # Comparar quantidade
                qtd_xml = round(float(prod_xml.get('quantidade', 0)), 4)
                qtd_db = round(float(prod_db.get('quantidade', 0)), 4)
                if qtd_xml != qtd_db:
                    divergencias.append({
                        "campo": f"produto_{i}_qtd",
                        "descricao": f"Quantidade: {prod_db.get('descricao', codigo)[:30]}",
                        "valor_xml": qtd_xml,
                        "valor_db": qtd_db
                    })
        
        return {
            "valid": len(divergencias) == 0,
            "document_id": document_id,
            "numero_nfe": document.get('numero_nfe'),
            "divergencias": divergencias,
            "total_divergencias": len(divergencias)
        }
        
    except Exception as e:
        return {
            "valid": False,
            "document_id": document_id,
            "error": f"Erro ao validar: {str(e)}"
        }


@api_router.get("/xml/integrity-summary/{company_id}")
async def get_integrity_summary(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """
    Retorna resumo de integridade de todos os documentos da competência.
    """
    documents = await db.xml_documents.find(
        {"company_id": company_id, "competencia": competencia},
        {"_id": 0, "id": 1, "numero_nfe": 1, "valor_total": 1, "xml_content": 1, "modelo": 1, "produtos": 1}
    ).to_list(1000)
    
    total = len(documents)
    validos = 0
    com_divergencia = 0
    erros = 0
    divergencias_detalhe = []
    
    for doc in documents:
        try:
            xml_content = doc.get('xml_content', '')
            if not xml_content:
                erros += 1
                continue
            
            modelo = doc.get('modelo', 'nfe')
            if modelo == 'nfse':
                parsed = parse_xml_nfse(xml_content)
            elif modelo == 'nfce':
                parsed = parse_xml_nfce(xml_content)
            else:
                parsed = parse_xml_nfe(xml_content)
            
            # Comparar valor total
            valor_xml = round(float(parsed.get('valor_total', 0)), 2)
            valor_db = round(float(doc.get('valor_total', 0)), 2)
            
            if valor_xml == valor_db:
                validos += 1
            else:
                com_divergencia += 1
                divergencias_detalhe.append({
                    "document_id": doc['id'],
                    "numero_nfe": doc.get('numero_nfe'),
                    "valor_xml": valor_xml,
                    "valor_db": valor_db,
                    "diferenca": round(valor_db - valor_xml, 2)
                })
        except Exception as e:
            erros += 1
    
    return {
        "company_id": company_id,
        "competencia": competencia,
        "total": total,
        "validos": validos,
        "com_divergencia": com_divergencia,
        "erros": erros,
        "percentual_valido": round((validos / total * 100) if total > 0 else 100, 1),
        "divergencias": divergencias_detalhe[:10]  # Limitar a 10 para não sobrecarregar
    }

@api_router.get("/dashboard/stats/{company_id}")
async def get_dashboard_stats(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """Estatísticas do dashboard por empresa e competência"""
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar todos os documentos da empresa na competência
    query = {"company_id": company_id, "competencia": competencia}
    documents = await db.xml_documents.find(query, {"_id": 0, "xml_content": 0}).to_list(1000)
    
    # Buscar aprovações do localStorage (persistidas no backend se houver)
    # Por enquanto, vamos calcular baseado no status_validacao
    
    # Contadores por tipo
    nfe_entrada = [d for d in documents if d.get('tipo') == 'entrada' and d.get('modelo', 'nfe') == 'nfe']
    nfe_saida = [d for d in documents if d.get('tipo') == 'saida' and d.get('modelo', 'nfe') == 'nfe']
    nfce = [d for d in documents if d.get('modelo') == 'nfce']
    nfse = [d for d in documents if d.get('modelo') == 'nfse']
    
    # Valores totais
    total_entradas = sum(d.get('valor_total', 0) for d in nfe_entrada)
    total_vendas = sum(d.get('valor_total', 0) for d in nfe_saida)
    total_cupons = sum(d.get('valor_total', 0) for d in nfce)
    total_servicos = sum(d.get('valor_total', 0) for d in nfse)
    faturamento_total = total_vendas + total_cupons + total_servicos
    
    # Regime tributário da empresa (definir antes do loop de créditos)
    regime_tributario = company.get('regime_tributario', 'lucro_presumido')
    
    # Créditos (entradas)
    # CFOPs de Substituição Tributária (mesma lista usada na apuração)
    CFOPS_ST = ['1403', '1409', '2403', '2409', '5403', '5405', '5409', '6403', '6404', '6409']
    
    credito_icms = 0
    credito_icms_st_desconsiderado = 0  # Para mostrar quanto foi desconsiderado
    credito_pis = 0
    credito_cofins = 0
    
    for doc in nfe_entrada:
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            v_icms = float(prod.get('v_icms', 0) or 0)
            
            # ICMS-ST não gera crédito - usar CFOP para determinar ST (igual apuração)
            is_st = cfop in CFOPS_ST
            if is_st:
                credito_icms_st_desconsiderado += v_icms
            else:
                credito_icms += v_icms
            
            # PIS e COFINS - usar mesma lógica do endpoint de apuração
            # Verificar se o produto tem direito a crédito baseado em NCM, CFOP e regime
            ncm = str(prod.get('ncm', ''))
            cfop = str(prod.get('cfop', ''))
            valor_prod = float(prod.get('valor_total', 0) or prod.get('v_prod', 0) or 0)
            cst_pis_calculado = str(prod.get('cst_pis_calculado', prod.get('cst_pis', ''))).strip()
            
            # Verificar se NCM é alíquota zero
            aliq_zero = prod.get('ncm_aliq_zero', is_ncm_aliquota_zero(ncm))
            
            # Verificar se CFOP não gera crédito (sem incidência)
            cfop_sem_incidencia = cfop in CFOPS_ENTRADA_SEM_INCIDENCIA
            
            # Lógica de crédito PIS/COFINS (igual ao endpoint de apuração)
            if cfop_sem_incidencia or cst_pis_calculado == '98':
                # Sem incidência - CST 98 - não gera crédito
                pass
            elif aliq_zero or cst_pis_calculado == '73':
                # Alíquota zero - CST 73 - não gera crédito
                pass
            elif cst_pis_calculado == '50' or ((cfop in CFOPS_COM_CREDITO_PIS_COFINS or not cfop) and regime_tributario == 'lucro_real'):
                # Gera crédito - CST 50 (apenas Lucro Real)
                # Calcular crédito com alíquotas do Lucro Real (1,65% PIS, 7,6% COFINS)
                credito_pis += round(valor_prod * 0.0165, 2)
                credito_cofins += round(valor_prod * 0.076, 2)
    
    # Alíquotas por regime
    ALIQ_PIS_LUCRO_REAL = 0.0165  # 1.65%
    ALIQ_COFINS_LUCRO_REAL = 0.076  # 7.6%
    ALIQ_PIS_LUCRO_PRESUMIDO = 0.0065  # 0.65%
    ALIQ_COFINS_LUCRO_PRESUMIDO = 0.03  # 3%
    
    # Débitos (saídas) - Calcular valores do XML e valores esperados
    debito_icms = 0
    debito_pis_xml = 0  # Valor que veio no XML
    debito_cofins_xml = 0  # Valor que veio no XML
    total_base_pis_cofins = 0  # Base de cálculo para PIS/COFINS (apenas produtos TRIBUTADOS)
    total_aliquota_zero = 0  # Total de produtos com alíquota zero (não geram débito)
    total_cfop_sem_incidencia = 0  # Total de produtos com CFOP sem incidência de PIS/COFINS
    
    # CFOPs de saída que NÃO geram débito de PIS/COFINS (remessas, devoluções, transferências, etc.)
    CFOPS_SAIDA_SEM_DEBITO = [
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
    
    for doc in nfe_saida + nfce:
        for prod in doc.get('produtos', []):
            debito_icms += float(prod.get('v_icms', 0) or 0)
            debito_pis_xml += float(prod.get('v_pis', 0) or 0)
            debito_cofins_xml += float(prod.get('v_cofins', 0) or 0)
            
            valor_prod = float(prod.get('valor_total', 0) or prod.get('v_prod', 0) or 0)
            ncm = prod.get('ncm', '')
            cfop = str(prod.get('cfop', ''))
            
            # Verificar se o produto é de alíquota zero pelo NCM ou pelo CST calculado
            ncm_aliq_zero = prod.get('ncm_aliq_zero', is_ncm_aliquota_zero(ncm))
            cst_calculado = str(prod.get('cst_pis_calculado', prod.get('cst_pis', ''))).strip()
            
            # Verificar se o CFOP não gera débito de PIS/COFINS
            cfop_sem_debito = cfop in CFOPS_SAIDA_SEM_DEBITO
            
            # Verificar também se o CST calculado é 49 (sem incidência)
            if cfop_sem_debito or cst_calculado == '49':
                # CFOP de remessa/devolução/transferência - CST 49 - não gera débito
                total_cfop_sem_incidencia += valor_prod
            elif ncm_aliq_zero or cst_calculado == '06':
                # Produto é alíquota zero pelo NCM ou CST 06
                total_aliquota_zero += valor_prod
            else:
                # Apenas produtos TRIBUTADOS (CST 01) entram na base de cálculo do débito
                total_base_pis_cofins += valor_prod
    
    # Para Lucro Real, usar alíquotas corretas e verificar divergências
    divergencias_pis_cofins = []
    
    if regime_tributario == 'lucro_real':
        # Calcular valores esperados com alíquotas do Lucro Real
        debito_pis_esperado = total_base_pis_cofins * ALIQ_PIS_LUCRO_REAL
        debito_cofins_esperado = total_base_pis_cofins * ALIQ_COFINS_LUCRO_REAL
        
        # Usar valores esperados (alíquotas corretas do regime)
        debito_pis = debito_pis_esperado
        debito_cofins = debito_cofins_esperado
        
        # Verificar divergências com XML
        tolerancia = 0.01  # 1% de tolerância para arredondamentos
        
        if total_base_pis_cofins > 0:
            # Divergência PIS
            if debito_pis_xml > 0:
                diferenca_pis = abs(debito_pis_esperado - debito_pis_xml)
                perc_diferenca_pis = (diferenca_pis / debito_pis_esperado) if debito_pis_esperado > 0 else 0
                if perc_diferenca_pis > tolerancia:
                    aliq_xml_pis = (debito_pis_xml / total_base_pis_cofins) * 100 if total_base_pis_cofins > 0 else 0
                    divergencias_pis_cofins.append({
                        "imposto": "PIS",
                        "aliquota_esperada": "1.65%",
                        "aliquota_xml": f"{aliq_xml_pis:.2f}%",
                        "valor_esperado": round(debito_pis_esperado, 2),
                        "valor_xml": round(debito_pis_xml, 2),
                        "diferenca": round(debito_pis_esperado - debito_pis_xml, 2)
                    })
            
            # Divergência COFINS
            if debito_cofins_xml > 0:
                diferenca_cofins = abs(debito_cofins_esperado - debito_cofins_xml)
                perc_diferenca_cofins = (diferenca_cofins / debito_cofins_esperado) if debito_cofins_esperado > 0 else 0
                if perc_diferenca_cofins > tolerancia:
                    aliq_xml_cofins = (debito_cofins_xml / total_base_pis_cofins) * 100 if total_base_pis_cofins > 0 else 0
                    divergencias_pis_cofins.append({
                        "imposto": "COFINS",
                        "aliquota_esperada": "7.6%",
                        "aliquota_xml": f"{aliq_xml_cofins:.2f}%",
                        "valor_esperado": round(debito_cofins_esperado, 2),
                        "valor_xml": round(debito_cofins_xml, 2),
                        "diferenca": round(debito_cofins_esperado - debito_cofins_xml, 2)
                    })
    else:
        # Lucro Presumido - usar valores do XML (alíquotas cumulativas)
        debito_pis = debito_pis_xml
        debito_cofins = debito_cofins_xml
    
    # ISS (serviços)
    total_iss = 0
    for doc in nfse:
        for serv in doc.get('servicos', []):
            total_iss += float(serv.get('valor_iss', 0) or 0)
    
    # Impostos a pagar
    icms_pagar = max(0, debito_icms - credito_icms)
    pis_pagar = max(0, debito_pis - credito_pis)
    cofins_pagar = max(0, debito_cofins - credito_cofins)
    total_impostos_pagar = icms_pagar + pis_pagar + cofins_pagar + total_iss
    
    # Markup médio (entradas vs saídas)
    markup_percentual = 0
    if total_entradas > 0:
        markup_percentual = ((faturamento_total - total_entradas) / total_entradas) * 100
    
    # Validação - contar produtos pendentes de validação
    total_produtos = 0
    produtos_validados = 0
    
    for doc in documents:
        for prod in doc.get('produtos', []):
            total_produtos += 1
            # Considera validado se tiver categoria classificada ou status_validacao = validado
            if prod.get('categoria_classificada') or doc.get('status_validacao') == 'validado':
                produtos_validados += 1
    
    notas_pendentes = len([d for d in documents if d.get('status_validacao') != 'validado'])
    notas_validadas = len(documents) - notas_pendentes
    
    # Análise comparativa Lucro Presumido vs. Lucro Real
    # Para Lucro Presumido: não há crédito de PIS/COFINS
    # Para Lucro Real: há crédito de PIS/COFINS (1.65% e 7.6%)
    # IMPORTANTE: Usar apenas a base tributada (excluindo alíquota zero)
    
    analise_comparativa = None
    
    if regime_tributario == 'lucro_presumido' and total_base_pis_cofins > 0:
        # Alíquotas do Lucro Presumido (cumulativo)
        aliq_pis_presumido = 0.0065  # 0.65%
        aliq_cofins_presumido = 0.03  # 3%
        
        # Alíquotas do Lucro Real (não cumulativo)
        aliq_pis_real = 0.0165  # 1.65%
        aliq_cofins_real = 0.076  # 7.6%
        
        # Cálculo para Lucro Presumido (atual) - APENAS sobre base tributada
        pis_presumido = total_base_pis_cofins * aliq_pis_presumido
        cofins_presumido = total_base_pis_cofins * aliq_cofins_presumido
        total_presumido = pis_presumido + cofins_presumido
        
        # Cálculo hipotético para Lucro Real (com créditos) - APENAS sobre base tributada
        debito_pis_real = total_base_pis_cofins * aliq_pis_real
        debito_cofins_real = total_base_pis_cofins * aliq_cofins_real
        
        # Créditos hipotéticos (assumindo mesmas alíquotas sobre compras)
        credito_pis_real = total_entradas * aliq_pis_real
        credito_cofins_real = total_entradas * aliq_cofins_real
        
        pis_real_pagar = max(0, debito_pis_real - credito_pis_real)
        cofins_real_pagar = max(0, debito_cofins_real - credito_cofins_real)
        total_real = pis_real_pagar + cofins_real_pagar
        
        # Diferença
        diferenca = total_presumido - total_real
        
        analise_comparativa = {
            "regime_atual": "lucro_presumido",
            "base_calculo": round(total_base_pis_cofins, 2),
            "aliquota_zero_excluida": round(total_aliquota_zero, 2),
            "lucro_presumido": {
                "pis": round(pis_presumido, 2),
                "cofins": round(cofins_presumido, 2),
                "total": round(total_presumido, 2),
                "aliq_pis": "0.65%",
                "aliq_cofins": "3%"
            },
            "lucro_real_hipotetico": {
                "debito_pis": round(debito_pis_real, 2),
                "debito_cofins": round(debito_cofins_real, 2),
                "credito_pis": round(credito_pis_real, 2),
                "credito_cofins": round(credito_cofins_real, 2),
                "pis_pagar": round(pis_real_pagar, 2),
                "cofins_pagar": round(cofins_real_pagar, 2),
                "total": round(total_real, 2),
                "aliq_pis": "1.65%",
                "aliq_cofins": "7.6%"
            },
            "diferenca": round(diferenca, 2),
            "regime_mais_vantajoso": "lucro_real" if diferenca > 0 else "lucro_presumido",
            "economia_potencial": round(abs(diferenca), 2)
        }
    elif regime_tributario == 'lucro_real' and total_base_pis_cofins > 0:
        # Para empresas no Lucro Real, mostrar quanto seria no Presumido
        aliq_pis_presumido = 0.0065
        aliq_cofins_presumido = 0.03
        
        # APENAS sobre base tributada
        pis_presumido = total_base_pis_cofins * aliq_pis_presumido
        cofins_presumido = total_base_pis_cofins * aliq_cofins_presumido
        total_presumido = pis_presumido + cofins_presumido
        
        total_real = pis_pagar + cofins_pagar
        diferenca = total_presumido - total_real
        
        analise_comparativa = {
            "regime_atual": "lucro_real",
            "base_calculo": round(total_base_pis_cofins, 2),
            "aliquota_zero_excluida": round(total_aliquota_zero, 2),
            "cfop_sem_incidencia_excluida": round(total_cfop_sem_incidencia, 2),
            "lucro_presumido_hipotetico": {
                "pis": round(pis_presumido, 2),
                "cofins": round(cofins_presumido, 2),
                "total": round(total_presumido, 2)
            },
            "lucro_real": {
                "pis_pagar": round(pis_pagar, 2),
                "cofins_pagar": round(cofins_pagar, 2),
                "total": round(total_real, 2)
            },
            "diferenca": round(diferenca, 2),
            "regime_mais_vantajoso": "lucro_presumido" if diferenca < 0 else "lucro_real",
            "economia_potencial": round(abs(diferenca), 2)
        }
    
    return {
        "empresa": {
            "id": company['id'],
            "razao_social": company['razao_social'],
            "cnpj": company['cnpj'],
            "regime_tributario": regime_tributario
        },
        "competencia": competencia,
        "quantidades": {
            "nfe_entrada": len(nfe_entrada),
            "nfe_saida": len(nfe_saida),
            "nfce": len(nfce),
            "nfse": len(nfse),
            "total_documentos": len(documents)
        },
        "validacao": {
            "notas_validadas": notas_validadas,
            "notas_pendentes": notas_pendentes,
            "produtos_total": total_produtos,
            "produtos_validados": produtos_validados
        },
        "valores": {
            "total_entradas": round(total_entradas, 2),
            "total_vendas": round(total_vendas, 2),
            "total_cupons": round(total_cupons, 2),
            "total_servicos": round(total_servicos, 2),
            "faturamento_total": round(faturamento_total, 2)
        },
        "creditos": {
            "icms": round(credito_icms, 2),
            "icms_st_desconsiderado": round(credito_icms_st_desconsiderado, 2),
            "pis": round(credito_pis, 2),
            "cofins": round(credito_cofins, 2),
            "total": round(credito_icms + credito_pis + credito_cofins, 2)
        },
        "debitos": {
            "icms": round(debito_icms, 2),
            "pis": round(debito_pis, 2),
            "pis_xml": round(debito_pis_xml, 2) if regime_tributario == 'lucro_real' else None,
            "cofins": round(debito_cofins, 2),
            "cofins_xml": round(debito_cofins_xml, 2) if regime_tributario == 'lucro_real' else None,
            "iss": round(total_iss, 2),
            "total": round(debito_icms + debito_pis + debito_cofins + total_iss, 2),
            "base_tributada": round(total_base_pis_cofins, 2),
            "aliquota_zero": round(total_aliquota_zero, 2),
            "cfop_sem_incidencia": round(total_cfop_sem_incidencia, 2),
            "divergencias": divergencias_pis_cofins if divergencias_pis_cofins else None
        },
        "impostos_pagar": {
            "icms": round(icms_pagar, 2),
            "pis": round(pis_pagar, 2),
            "cofins": round(cofins_pagar, 2),
            "iss": round(total_iss, 2),
            "total": round(total_impostos_pagar, 2)
        },
        "indicadores": {
            "markup_percentual": round(markup_percentual, 2)
        },
        "analise_comparativa": analise_comparativa
    }

@api_router.get("/apuracao-pis-cofins/{company_id}")
async def apuracao_pis_cofins(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """Apuração inteligente de PIS/COFINS com base em CFOP e NCM"""
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    regime = company.get('regime_tributario', 'lucro_presumido')
    
    # CFOPs que geram direito a crédito de PIS/COFINS (entradas)
    # Apenas Lucro Real tem direito a crédito
    CFOPS_CREDITO_PIS_COFINS = [
        '1101', '1102', '1111', '1113', '1116', '1117', '1118', '1120', '1121', '1122',
        '1124', '1125', '1126', '1128', '1151', '1152', '1153', '1154', '1201', '1202',
        '1203', '1204', '1205', '1206', '1207', '1208', '1209', '1251', '1252', '1253',
        '1254', '1255', '1256', '1257', '1301', '1302', '1303', '1304', '1305', '1306',
        '1351', '1352', '1353', '1354', '1355', '1356', '1401', '1403', '1406', '1407',
        '1408', '1409', '1410', '1411', '1414', '1415', '1451', '1452', '1453', '1454',
        '1501', '1503', '1504', '1505', '1506', '1551', '1552', '1553', '1554', '1555',
        '1556', '1557', '1601', '1602', '1603', '1604', '1605', '1651', '1652', '1653',
        '1658', '1659', '1660', '1661', '1662', '1663', '1664',
        '2101', '2102', '2111', '2113', '2116', '2117', '2118', '2120', '2121', '2122',
        '2124', '2125', '2126', '2128', '2151', '2152', '2153', '2154', '2201', '2202',
        '2203', '2204', '2205', '2206', '2207', '2208', '2209', '2251', '2252', '2253',
        '2254', '2255', '2256', '2257', '2301', '2302', '2303', '2304', '2305', '2306',
        '2351', '2352', '2353', '2354', '2355', '2356', '2401', '2403', '2406', '2407',
        '2408', '2409', '2410', '2411', '2414', '2415', '2501', '2503', '2504', '2505',
        '2506', '2551', '2552', '2553', '2554', '2555', '2556', '2557', '2603', '2651',
        '2652', '2653', '2658', '2659', '2660', '2661', '2662', '2663', '2664',
        '3101', '3102', '3126', '3127', '3201', '3202', '3205', '3206', '3207', '3211',
        '3251', '3301', '3351', '3352', '3353', '3354', '3355', '3356', '3503', '3551',
        '3553', '3556', '3651', '3652', '3653'
    ]
    
    # CFOPs que geram débito de PIS/COFINS (saídas)
    CFOPS_DEBITO_PIS_COFINS = [
        '5101', '5102', '5103', '5104', '5105', '5106', '5109', '5110', '5111', '5112',
        '5113', '5114', '5115', '5116', '5117', '5118', '5119', '5120', '5122', '5123',
        '5124', '5125', '5151', '5152', '5153', '5155', '5156', '5201', '5202', '5205',
        '5206', '5207', '5208', '5209', '5210', '5251', '5252', '5253', '5254', '5255',
        '5256', '5257', '5258', '5301', '5302', '5303', '5304', '5305', '5306', '5307',
        '5351', '5352', '5353', '5354', '5355', '5356', '5357', '5359', '5360', '5401',
        '5402', '5403', '5405', '5408', '5409', '5410', '5411', '5412', '5413', '5414',
        '5415', '5451', '5501', '5502', '5503', '5504', '5505', '5551', '5552', '5553',
        '5554', '5555', '5556', '5557', '5601', '5602', '5603', '5605', '5606', '5651',
        '5652', '5653', '5654', '5655', '5656', '5657', '5658', '5659', '5660', '5661',
        '5662', '5663', '5664', '5665', '5666', '5667', '5901', '5902', '5903', '5904',
        '5905', '5906', '5907', '5908', '5909', '5910', '5911', '5912', '5913', '5914',
        '5915', '5916', '5917', '5918', '5919', '5920', '5921', '5922', '5923', '5924',
        '5925', '5926', '5927', '5928', '5929', '5931', '5932', '5933', '5934', '5949',
        '6101', '6102', '6103', '6104', '6105', '6106', '6107', '6108', '6109', '6110',
        '6111', '6112', '6113', '6114', '6115', '6116', '6117', '6118', '6119', '6120',
        '6122', '6123', '6124', '6125', '6151', '6152', '6153', '6155', '6156', '6201',
        '6202', '6205', '6206', '6207', '6208', '6209', '6210', '6251', '6252', '6253',
        '6254', '6255', '6256', '6257', '6258', '6301', '6302', '6303', '6304', '6305',
        '6306', '6307', '6351', '6352', '6353', '6354', '6355', '6356', '6357', '6359',
        '6360', '6401', '6402', '6403', '6404', '6408', '6409', '6410', '6411', '6412',
        '6413', '6414', '6415', '6501', '6502', '6503', '6504', '6505', '6551', '6552',
        '6553', '6554', '6555', '6556', '6557', '6603', '6651', '6652', '6653', '6654',
        '6655', '6656', '6657', '6658', '6659', '6660', '6661', '6662', '6663', '6664',
        '6665', '6666', '6667', '6901', '6902', '6903', '6904', '6905', '6906', '6907',
        '6908', '6909', '6910', '6911', '6912', '6913', '6914', '6915', '6916', '6917',
        '6918', '6919', '6920', '6921', '6922', '6923', '6924', '6925', '6929', '6931',
        '6932', '6933', '6934', '6949'
    ]
    
    # NCMs com alíquota zero (Tabela 4.3.13 SPED - Atualizada em 23/06/2025)
    # Inclui monofásicos, isentos, suspensão, produtos da cesta básica, etc.
    
    # PREFIXOS NCM (4 dígitos) - aplicam-se a todos os NCMs que começam com esses dígitos
    NCMS_ALIQUOTA_ZERO_PREFIXOS = [
        '0105',  # Aves vivas
        '0206',  # Miudezas comestíveis de bovinos, suínos, etc.
        '0210',  # Carnes e miudezas salgadas/secas/defumadas
        '0302',  # Peixes frescos/refrigerados
        '0405',  # Manteiga e outras gorduras do leite
        '0506',  # Ossos e núcleos córneos
        '0510',  # Âmbar-cinzento, castóreo, etc.
        '0511',  # Produtos de origem animal
        '0713',  # Legumes secos
        '1006',  # Arroz
        '1101',  # Farinha de trigo
        '1102',  # Farinhas de cereais (exceto trigo)
        '1103',  # Grumos, sêmolas e pellets de cereais
        '1104',  # Grãos de cereais trabalhados
        '1106',  # Farinhas de leguminosas/raízes
        '1502',  # Gorduras de bovinos/ovinos/caprinos
        '1517',  # Margarina
        '1701',  # Açúcares de cana ou beterraba
        '1901',  # Extratos de malte, preparações alimentícias
        '1902',  # Massas alimentícias
        '1905',  # Pão, bolachas, biscoitos
        '2101',  # Extratos de café/chá
        '2106',  # Preparações alimentícias
        '2201',  # Águas minerais/gaseificadas
        '2202',  # Outras águas/bebidas não alcoólicas
        '2710',  # Óleos de petróleo (combustíveis)
        '2711',  # Gás de petróleo e hidrocarbonetos
        '3002',  # Sangue humano, antissoros, vacinas
        '3003',  # Medicamentos não dosados
        '3004',  # Medicamentos dosados
        '3401',  # Sabões
        '3826',  # Biodiesel
        '4011',  # Pneus novos (monofásico)
        '4013',  # Câmaras de ar
        '4103',  # Outros couros
        '4801',  # Papel de jornal
        '4802',  # Papel/cartão não revestidos
        '4810',  # Papel/cartão revestidos
        '4818',  # Papel higiênico, fraldas, absorventes
        '8443',  # Máquinas de impressão/impressoras
        '8469',  # Máquinas de escrever
        '8470',  # Máquinas de calcular
        '8471',  # Máquinas automáticas processamento dados (computadores)
        '8472',  # Outras máquinas de escritório
        '8502',  # Grupos eletrogêneos
        '8503',  # Partes para máquinas elétricas
        '8517',  # Telefones, aparelhos de telecomunicação
        '8525',  # Aparelhos de radiotelefonia
        '8702',  # Veículos para transporte coletivo
        '8714',  # Partes de veículos
        '8901',  # Embarcações
        '9018',  # Instrumentos médico-cirúrgicos
        '9021',  # Artigos ortopédicos, próteses
    ]
    
    # NCMs COMPLETOS (8 dígitos) com alíquota zero
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
    
    # Buscar documentos
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia
    }, {"_id": 0}).to_list(None)
    
    # CSTs de PIS/COFINS
    # Saída: 01 (tributado), 06 (alíquota zero)
    # Entrada: 50 (com crédito), 73 (alíquota zero)
    
    # CFOPs de transferência (não geram crédito/débito)
    CFOPS_TRANSFERENCIA = [
        '1152', '1153', '1154', '1409', '1411', '1552', '1553', '1554', '1556',
        '2152', '2153', '2154', '2409', '2411', '2552', '2553', '2554', '2556',
        '5152', '5153', '5155', '5156', '5409', '5411', '5552', '5553', '5555', '5556',
        '6152', '6153', '6155', '6156', '6409', '6411', '6552', '6553', '6555', '6556'
    ]
    
    # CFOPs de operações distintas de venda (saída do emissor que virou entrada para nós)
    # Quando um fornecedor emite NF com esses CFOPs, precisamos alertar o usuário
    CFOPS_OPERACOES_DISTINTAS = {
        # Remessas
        '5910': {'descricao': 'Remessa em bonificação', 'sugestao': '1910'},
        '5911': {'descricao': 'Remessa de amostra grátis', 'sugestao': '1911'},
        '5912': {'descricao': 'Remessa de mercadoria para demonstração', 'sugestao': '1912'},
        '5913': {'descricao': 'Retorno de mercadoria para demonstração', 'sugestao': '1913'},
        '5914': {'descricao': 'Remessa de mercadoria para exposição/feira', 'sugestao': '1914'},
        '5915': {'descricao': 'Remessa de mercadoria para consignação', 'sugestao': '1915'},
        '5916': {'descricao': 'Retorno de mercadoria de consignação', 'sugestao': '1916'},
        '5917': {'descricao': 'Remessa de mercadoria em consignação simbólica', 'sugestao': '1917'},
        '5918': {'descricao': 'Devolução de mercadoria de consignação simbólica', 'sugestao': '1918'},
        '5919': {'descricao': 'Devolução simbólica por venda de mercadoria de consignação', 'sugestao': '1919'},
        '5920': {'descricao': 'Remessa de vasilhame/sacaria', 'sugestao': '1920'},
        '5921': {'descricao': 'Devolução de vasilhame/sacaria', 'sugestao': '1921'},
        '5922': {'descricao': 'Lançamento para simples faturamento', 'sugestao': '1922'},
        '5923': {'descricao': 'Remessa de mercadoria por conta e ordem', 'sugestao': '1923'},
        '5924': {'descricao': 'Remessa para industrialização por conta e ordem', 'sugestao': '1924'},
        '5925': {'descricao': 'Retorno de mercadoria depositada em depósito fechado/armazém', 'sugestao': '1925'},
        '5949': {'descricao': 'Outra saída não especificada', 'sugestao': '1949'},
        # Devoluções
        '5201': {'descricao': 'Devolução de compra - indústria', 'sugestao': '1201'},
        '5202': {'descricao': 'Devolução de compra - comercialização', 'sugestao': '1202'},
        '5208': {'descricao': 'Devolução de mercadoria recebida em transferência', 'sugestao': '1208'},
        '5209': {'descricao': 'Devolução de mercadoria recebida para uso/consumo', 'sugestao': '1209'},
        '5210': {'descricao': 'Devolução de compra para industrialização', 'sugestao': '1210'},
        '5122': {'descricao': 'Venda com entrega futura', 'sugestao': '1102'},
        '5123': {'descricao': 'Venda de mercadoria remetida anteriormente em consignação mercantil', 'sugestao': '1102'},
        # Remessas interestaduais (6xxx)
        '6910': {'descricao': 'Remessa em bonificação', 'sugestao': '2910'},
        '6911': {'descricao': 'Remessa de amostra grátis', 'sugestao': '2911'},
        '6912': {'descricao': 'Remessa de mercadoria para demonstração', 'sugestao': '2912'},
        '6949': {'descricao': 'Outra saída não especificada', 'sugestao': '2949'},
        '6201': {'descricao': 'Devolução de compra - indústria', 'sugestao': '2201'},
        '6202': {'descricao': 'Devolução de compra - comercialização', 'sugestao': '2202'},
        '6122': {'descricao': 'Venda com entrega futura', 'sugestao': '2102'},
    }
    
    # Estruturas para armazenar dados
    creditos = {
        "com_credito": {"por_cfop": {}, "por_ncm": {}, "por_cst": {}, "total": 0, "pis": 0, "cofins": 0, "cst": "50"},
        "aliquota_zero": {"por_cfop": {}, "por_ncm": {}, "por_cst": {}, "total": 0, "cst": "73"}
    }
    
    debitos = {
        "com_debito": {"por_cfop": {}, "por_ncm": {}, "por_cst": {}, "total": 0, "pis": 0, "cofins": 0, "cst": "01"},
        "aliquota_zero": {"por_cfop": {}, "por_ncm": {}, "por_cst": {}, "total": 0, "cst": "06"}
    }
    
    transferencias = {
        "entrada": {"por_cfop": {}, "por_ncm": {}, "total": 0},
        "saida": {"por_cfop": {}, "por_ncm": {}, "total": 0}
    }
    
    def is_ncm_aliquota_zero(ncm):
        """Verifica se NCM tem alíquota zero (Tabela 4.3.13 SPED)"""
        if not ncm:
            return False
        ncm_str = str(ncm).replace('.', '').strip()
        
        # Verificar NCM completo (8 dígitos)
        if len(ncm_str) >= 8 and ncm_str[:8] in NCMS_ALIQUOTA_ZERO_COMPLETOS:
            return True
        
        # Verificar prefixo (4 dígitos)
        if len(ncm_str) >= 4 and ncm_str[:4] in NCMS_ALIQUOTA_ZERO_PREFIXOS:
            return True
            
        return False
    
    def add_to_dict(d, key, valor, pis, cofins, cst=None):
        """Adiciona valores a um dicionário agrupador"""
        if key not in d:
            d[key] = {"valor": 0, "pis": 0, "cofins": 0, "qtd": 0, "cst": cst}
        d[key]["valor"] += valor
        d[key]["pis"] += pis
        d[key]["cofins"] += cofins
        d[key]["qtd"] += 1
        if cst:
            d[key]["cst"] = cst
    
    # Processar documentos
    for doc in documents:
        tipo_op = doc.get('tipo_operacao', doc.get('tipo', 'entrada'))
        
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            ncm = str(prod.get('ncm', ''))
            
            # Usar CST CALCULADO (não o do XML) - aplicado durante importação
            cst_calculado = str(prod.get('cst_pis_calculado', prod.get('cst_pis', '')))
            cst_xml = str(prod.get('cst_pis_xml', ''))
            
            valor = float(prod.get('valor_total', 0) or prod.get('v_prod', 0) or 0)
            v_pis = float(prod.get('v_pis', 0) or 0)
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            
            primeiro_digito = cfop[0] if cfop else ''
            aliq_zero = prod.get('ncm_aliq_zero', is_ncm_aliquota_zero(ncm))
            
            # Verificar se é transferência
            is_transferencia = cfop in CFOPS_TRANSFERENCIA
            
            # Determinar entrada/saída pelo CFOP ou tipo do documento
            is_entrada = primeiro_digito in ['1', '2', '3'] if primeiro_digito else (tipo_op == 'entrada')
            is_saida = primeiro_digito in ['5', '6', '7'] if primeiro_digito else (tipo_op == 'saida')
            
            # Se não tem CFOP, usar "SEM CFOP" como chave
            cfop_key = cfop if cfop else f"SEM CFOP"
            
            # USAR CST CALCULADO (não do XML)
            # Entrada: 50 (com crédito), 70 (sem crédito), 73 (alíquota zero), 98 (sem incidência)
            # Saída: 01 (tributado), 06 (alíquota zero), 49 (sem incidência)
            
            # Entradas (créditos)
            if is_entrada:
                cst_usado = cst_calculado or calcular_cst_pis_cofins(ncm, cfop, 'entrada', cst_xml, regime)['cst_calculado']
                
                if cst_usado == '98' or cfop in CFOPS_ENTRADA_SEM_INCIDENCIA:
                    # Sem incidência - CST 98 - não gera crédito (remessa/devolução/transferência)
                    add_to_dict(creditos["aliquota_zero"]["por_cfop"], cfop_key, valor, 0, 0, '98')
                    add_to_dict(creditos["aliquota_zero"]["por_ncm"], ncm or "SEM NCM", valor, 0, 0, '98')
                    add_to_dict(creditos["aliquota_zero"]["por_cst"], '98', valor, 0, 0, '98')
                    creditos["aliquota_zero"]["total"] += valor
                elif aliq_zero or cst_usado == '73':
                    # Alíquota zero - CST 73 - não gera crédito
                    add_to_dict(creditos["aliquota_zero"]["por_cfop"], cfop_key, valor, 0, 0, '73')
                    add_to_dict(creditos["aliquota_zero"]["por_ncm"], ncm or "SEM NCM", valor, 0, 0, '73')
                    add_to_dict(creditos["aliquota_zero"]["por_cst"], '73', valor, 0, 0, '73')
                    creditos["aliquota_zero"]["total"] += valor
                elif cst_usado == '50' or ((cfop in CFOPS_COM_CREDITO_PIS_COFINS or not cfop) and regime == 'lucro_real'):
                    # Gera crédito - CST 50 (apenas Lucro Real)
                    # CALCULAR crédito com alíquotas do Lucro Real (1,65% PIS, 7,6% COFINS)
                    pis_calc = round(valor * 0.0165, 2)  # PIS Lucro Real: 1,65%
                    cofins_calc = round(valor * 0.076, 2)  # COFINS Lucro Real: 7,6%
                    
                    add_to_dict(creditos["com_credito"]["por_cfop"], cfop_key, valor, pis_calc, cofins_calc, '50')
                    add_to_dict(creditos["com_credito"]["por_ncm"], ncm or "SEM NCM", valor, pis_calc, cofins_calc, '50')
                    add_to_dict(creditos["com_credito"]["por_cst"], '50', valor, pis_calc, cofins_calc, '50')
                    creditos["com_credito"]["total"] += valor
                    creditos["com_credito"]["pis"] += pis_calc
                    creditos["com_credito"]["cofins"] += cofins_calc
                else:
                    # CFOP não gera crédito ou empresa é Lucro Presumido - CST 70
                    add_to_dict(creditos["aliquota_zero"]["por_cfop"], cfop_key, valor, 0, 0, '70')
                    add_to_dict(creditos["aliquota_zero"]["por_ncm"], ncm or "SEM NCM", valor, 0, 0, '70')
                    add_to_dict(creditos["aliquota_zero"]["por_cst"], '70', valor, 0, 0, '70')
                    creditos["aliquota_zero"]["total"] += valor
            
            # Saídas (débitos)
            elif is_saida:
                cst_usado = cst_calculado or calcular_cst_pis_cofins(ncm, cfop, 'saida', cst_xml, regime)['cst_calculado']
                
                if cst_usado == '49' or cfop in CFOPS_SAIDA_SEM_INCIDENCIA:
                    # Sem incidência - CST 49 - não gera débito (remessa/devolução/transferência)
                    add_to_dict(debitos["aliquota_zero"]["por_cfop"], cfop_key, valor, 0, 0, '49')
                    add_to_dict(debitos["aliquota_zero"]["por_ncm"], ncm or "SEM NCM", valor, 0, 0, '49')
                    add_to_dict(debitos["aliquota_zero"]["por_cst"], '49', valor, 0, 0, '49')
                    debitos["aliquota_zero"]["total"] += valor
                elif aliq_zero or cst_usado == '06':
                    # Alíquota zero - CST 06 - não gera débito
                    add_to_dict(debitos["aliquota_zero"]["por_cfop"], cfop_key, valor, 0, 0, '06')
                    add_to_dict(debitos["aliquota_zero"]["por_ncm"], ncm or "SEM NCM", valor, 0, 0, '06')
                    add_to_dict(debitos["aliquota_zero"]["por_cst"], '06', valor, 0, 0, '06')
                    debitos["aliquota_zero"]["total"] += valor
                else:
                    # Gera débito - CST 01
                    # IMPORTANTE: Para Lucro Real, calcular débito com alíquotas corretas (1,65% PIS, 7,6% COFINS)
                    # Para Lucro Presumido, usar alíquotas cumulativas (0,65% PIS, 3% COFINS)
                    if regime == 'lucro_real':
                        pis_calc = round(valor * 0.0165, 2)  # PIS Lucro Real: 1,65%
                        cofins_calc = round(valor * 0.076, 2)  # COFINS Lucro Real: 7,6%
                    else:
                        pis_calc = round(valor * 0.0065, 2)  # PIS Lucro Presumido: 0,65%
                        cofins_calc = round(valor * 0.03, 2)  # COFINS Lucro Presumido: 3%
                    
                    add_to_dict(debitos["com_debito"]["por_cfop"], cfop_key, valor, pis_calc, cofins_calc, '01')
                    add_to_dict(debitos["com_debito"]["por_ncm"], ncm or "SEM NCM", valor, pis_calc, cofins_calc, '01')
                    add_to_dict(debitos["com_debito"]["por_cst"], '01', valor, pis_calc, cofins_calc, '01')
                    debitos["com_debito"]["total"] += valor
                    debitos["com_debito"]["pis"] += pis_calc
                    debitos["com_debito"]["cofins"] += cofins_calc
    
    # Converter dicionários para listas ordenadas
    def dict_to_list(d):
        return sorted([{"codigo": k, **v} for k, v in d.items()], key=lambda x: -x["valor"])
    
    # Calcular apuração
    pis_credito = round(creditos["com_credito"]["pis"], 2)
    cofins_credito = round(creditos["com_credito"]["cofins"], 2)
    pis_debito = round(debitos["com_debito"]["pis"], 2)
    cofins_debito = round(debitos["com_debito"]["cofins"], 2)
    
    pis_pagar = max(0, pis_debito - pis_credito)
    cofins_pagar = max(0, cofins_debito - cofins_credito)
    
    return {
        "empresa": {
            "id": company['id'],
            "razao_social": company['razao_social'],
            "cnpj": company['cnpj'],
            "regime_tributario": regime
        },
        "competencia": competencia,
        "creditos": {
            "com_credito": {
                "cst": "50",
                "descricao_cst": "Operação com Direito a Crédito",
                "valor_operacoes": round(creditos["com_credito"]["total"], 2),
                "pis": pis_credito,
                "cofins": cofins_credito,
                "por_cfop": dict_to_list(creditos["com_credito"]["por_cfop"]),
                "por_ncm": dict_to_list(creditos["com_credito"]["por_ncm"]),
                "por_cst": dict_to_list(creditos["com_credito"]["por_cst"])
            },
            "aliquota_zero": {
                "cst": "73",
                "descricao_cst": "Operação de Aquisição a Alíquota Zero",
                "valor_operacoes": round(creditos["aliquota_zero"]["total"], 2),
                "por_cfop": dict_to_list(creditos["aliquota_zero"]["por_cfop"]),
                "por_ncm": dict_to_list(creditos["aliquota_zero"]["por_ncm"]),
                "por_cst": dict_to_list(creditos["aliquota_zero"]["por_cst"])
            }
        },
        "debitos": {
            "com_debito": {
                "cst": "01",
                "descricao_cst": "Operação Tributável com Alíquota Básica",
                "valor_operacoes": round(debitos["com_debito"]["total"], 2),
                "pis": pis_debito,
                "cofins": cofins_debito,
                "por_cfop": dict_to_list(debitos["com_debito"]["por_cfop"]),
                "por_ncm": dict_to_list(debitos["com_debito"]["por_ncm"]),
                "por_cst": dict_to_list(debitos["com_debito"]["por_cst"])
            },
            "aliquota_zero": {
                "cst": "06",
                "descricao_cst": "Operação Tributável a Alíquota Zero",
                "valor_operacoes": round(debitos["aliquota_zero"]["total"], 2),
                "por_cfop": dict_to_list(debitos["aliquota_zero"]["por_cfop"]),
                "por_ncm": dict_to_list(debitos["aliquota_zero"]["por_ncm"]),
                "por_cst": dict_to_list(debitos["aliquota_zero"]["por_cst"])
            }
        },
        "apuracao": {
            "pis": {
                "credito": pis_credito,
                "debito": pis_debito,
                "saldo": round(pis_debito - pis_credito, 2),
                "a_pagar": pis_pagar
            },
            "cofins": {
                "credito": cofins_credito,
                "debito": cofins_debito,
                "saldo": round(cofins_debito - cofins_credito, 2),
                "a_pagar": cofins_pagar
            },
            "total_a_pagar": round(pis_pagar + cofins_pagar, 2)
        },
        "transferencias": {
            "entrada": {
                "valor_operacoes": round(transferencias["entrada"]["total"], 2),
                "por_cfop": dict_to_list(transferencias["entrada"]["por_cfop"]),
                "por_ncm": dict_to_list(transferencias["entrada"]["por_ncm"])
            },
            "saida": {
                "valor_operacoes": round(transferencias["saida"]["total"], 2),
                "por_cfop": dict_to_list(transferencias["saida"]["por_cfop"]),
                "por_ncm": dict_to_list(transferencias["saida"]["por_ncm"])
            },
            "total": round(transferencias["entrada"]["total"] + transferencias["saida"]["total"], 2)
        }
    }

@api_router.get("/apuracao-periodo/{company_id}")
async def apuracao_periodo(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """Apuração do período por CFOP com totais de entradas e saídas"""
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    regime = company.get('regime_tributario', 'lucro_presumido')
    
    # Buscar documentos da competência
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia
    }, {"_id": 0}).to_list(None)
    
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
    CFOPS_SEM_CREDITO = set(CFOPS_ST + CFOPS_DESPESA)
    
    # Agrupar por CFOP
    cfop_entradas = {}  # CFOPs de entrada (1xxx, 2xxx, 3xxx)
    cfop_saidas = {}    # CFOPs de saída (5xxx, 6xxx, 7xxx)
    
    for doc in documents:
        tipo_operacao = doc.get('tipo_operacao', doc.get('tipo', 'entrada'))
        
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            # Usar CST de PIS/COFINS em vez de ICMS
            cst_pis = str(prod.get('cst_pis', ''))
            cst_cofins = str(prod.get('cst_cofins', ''))
            cst = cst_pis or cst_cofins or str(prod.get('cst', ''))  # Fallback para CST ICMS se não houver
            
            # Valores do produto - usar campos corretos
            valor = float(prod.get('valor_total', 0) or prod.get('v_prod', 0) or 0)
            # Base de cálculo de ICMS - NÃO usar valor como fallback
            bc_icms = float(prod.get('v_bc_icms', 0) or prod.get('v_bc', 0) or 0)
            v_icms = float(prod.get('v_icms', 0) or 0)
            
            # PIS e COFINS - CALCULAR com alíquotas corretas do regime
            ncm = str(prod.get('ncm', ''))
            aliq_zero = prod.get('ncm_aliq_zero', False) or cst in ['04', '05', '06', '07', '08', '09', '73']
            
            if aliq_zero:
                v_pis = 0
                v_cofins = 0
            elif regime == 'lucro_real':
                v_pis = round(valor * 0.0165, 2)  # PIS Lucro Real: 1,65%
                v_cofins = round(valor * 0.076, 2)  # COFINS Lucro Real: 7,6%
            else:
                v_pis = round(valor * 0.0065, 2)  # PIS Lucro Presumido: 0,65%
                v_cofins = round(valor * 0.03, 2)  # COFINS Lucro Presumido: 3%
            
            # Verificar se é CFOP de Substituição Tributária ou Despesa
            is_st = cfop in CFOPS_ST
            is_despesa = cfop in CFOPS_DESPESA
            sem_credito = cfop in CFOPS_SEM_CREDITO
            
            # Determinar se é entrada ou saída pelo TIPO DO DOCUMENTO (não pelo CFOP)
            # Isso é importante porque em notas de entrada, o CFOP vem do emitente (que é saída para ele)
            primeiro_digito = cfop[0] if cfop else ''
            
            # Usar o tipo do documento como critério principal
            doc_tipo = doc.get('tipo', 'entrada')
            is_entrada = doc_tipo == 'entrada'
            is_saida = doc_tipo == 'saida'
            
            # Converter CFOP de saída para entrada quando for documento de entrada
            if is_entrada and primeiro_digito in ['5', '6', '7']:
                # Converter: 5xxx -> 1xxx, 6xxx -> 2xxx, 7xxx -> 3xxx
                cfop_convertido = cfop.replace(primeiro_digito, {'5': '1', '6': '2', '7': '3'}[primeiro_digito], 1)
                cfop_key = cfop_convertido
            elif is_saida and primeiro_digito in ['1', '2', '3']:
                # Converter: 1xxx -> 5xxx, 2xxx -> 6xxx, 3xxx -> 7xxx (caso raro)
                cfop_convertido = cfop.replace(primeiro_digito, {'1': '5', '2': '6', '3': '7'}[primeiro_digito], 1)
                cfop_key = cfop_convertido
            else:
                cfop_key = cfop if cfop else f"SEM CFOP ({doc_tipo.upper()})"
            
            # Verificar ST/Despesa no CFOP convertido
            if is_entrada:
                cfops_st_entrada = ['1403', '1409', '2403', '2409', '3403', '3409']
                cfops_despesa_entrada = ['1407', '2407', '1556', '2556', '1557', '2557', '1128', '2128', '1551', '2551', '1406', '2406']
                is_st = cfop_key in cfops_st_entrada
                is_despesa = cfop_key in cfops_despesa_entrada
                sem_credito = is_st or is_despesa
            
            if is_entrada:
                # Entrada
                if cfop_key not in cfop_entradas:
                    cfop_entradas[cfop_key] = {
                        'cfop': cfop_key,
                        'cst': cst,
                        'valor': 0,
                        'bc_icms': 0,
                        'v_icms': 0,
                        'v_pis': 0,
                        'v_cofins': 0,
                        'qtd_itens': 0,
                        'is_st': is_st,  # Marcar como ST
                        'is_despesa': is_despesa,  # Marcar como Despesa
                        'sem_credito_icms': sem_credito  # Não dá crédito (ST ou Despesa)
                    }
                cfop_entradas[cfop_key]['valor'] += valor
                cfop_entradas[cfop_key]['bc_icms'] += bc_icms
                cfop_entradas[cfop_key]['v_icms'] += v_icms
                cfop_entradas[cfop_key]['v_pis'] += v_pis
                cfop_entradas[cfop_key]['v_cofins'] += v_cofins
                cfop_entradas[cfop_key]['qtd_itens'] += 1
                # Manter o CST mais comum (último encontrado)
                if cst:
                    cfop_entradas[cfop_key]['cst'] = cst
                
            elif is_saida:
                # Saída
                if cfop_key not in cfop_saidas:
                    cfop_saidas[cfop_key] = {
                        'cfop': cfop_key,
                        'cst': cst,
                        'valor': 0,
                        'bc_icms': 0,
                        'v_icms': 0,
                        'v_pis': 0,
                        'v_cofins': 0,
                        'qtd_itens': 0,
                        'is_st': is_st,
                        'is_despesa': is_despesa,
                        'sem_credito_icms': sem_credito
                    }
                cfop_saidas[cfop_key]['valor'] += valor
                cfop_saidas[cfop_key]['bc_icms'] += bc_icms
                cfop_saidas[cfop_key]['v_icms'] += v_icms
                cfop_saidas[cfop_key]['v_pis'] += v_pis
                cfop_saidas[cfop_key]['v_cofins'] += v_cofins
                cfop_saidas[cfop_key]['qtd_itens'] += 1
                # Manter o CST mais comum (último encontrado)
                if cst:
                    cfop_saidas[cfop_key]['cst'] = cst
    
    # Converter para listas ordenadas por CFOP
    lista_entradas = sorted(cfop_entradas.values(), key=lambda x: x['cfop'])
    lista_saidas = sorted(cfop_saidas.values(), key=lambda x: x['cfop'])
    
    # Arredondar valores
    for item in lista_entradas + lista_saidas:
        item['valor'] = round(item['valor'], 2)
        item['bc_icms'] = round(item['bc_icms'], 2)
        item['v_icms'] = round(item['v_icms'], 2)
        item['v_pis'] = round(item['v_pis'], 2)
        item['v_cofins'] = round(item['v_cofins'], 2)
    
    # Calcular subtotais - separando operações com e sem crédito de ICMS
    # Entradas com crédito de ICMS (excluindo ST e Despesa)
    entradas_com_credito = [x for x in lista_entradas if not x.get('sem_credito_icms', False)]
    entradas_st = [x for x in lista_entradas if x.get('is_st', False)]
    entradas_despesa = [x for x in lista_entradas if x.get('is_despesa', False)]
    
    subtotal_entradas = {
        'valor': round(sum(x['valor'] for x in lista_entradas), 2),
        'bc_icms': round(sum(x['bc_icms'] for x in entradas_com_credito), 2),  # Só soma BC das que dão crédito
        'v_icms': round(sum(x['v_icms'] for x in entradas_com_credito), 2),    # Só soma ICMS das que dão crédito
        'v_pis': round(sum(x['v_pis'] for x in lista_entradas), 2),
        'v_cofins': round(sum(x['v_cofins'] for x in lista_entradas), 2),
        'qtd_itens': sum(x['qtd_itens'] for x in lista_entradas),
        # Informação sobre ST desconsiderado
        'st_desconsiderado': {
            'bc_icms': round(sum(x['bc_icms'] for x in entradas_st), 2),
            'v_icms': round(sum(x['v_icms'] for x in entradas_st), 2),
            'qtd_itens': sum(x['qtd_itens'] for x in entradas_st)
        },
        # Informação sobre Despesa desconsiderada
        'despesa_desconsiderada': {
            'bc_icms': round(sum(x['bc_icms'] for x in entradas_despesa), 2),
            'v_icms': round(sum(x['v_icms'] for x in entradas_despesa), 2),
            'qtd_itens': sum(x['qtd_itens'] for x in entradas_despesa)
        }
    }
    
    subtotal_saidas = {
        'valor': round(sum(x['valor'] for x in lista_saidas), 2),
        'bc_icms': round(sum(x['bc_icms'] for x in lista_saidas), 2),
        'v_icms': round(sum(x['v_icms'] for x in lista_saidas), 2),
        'v_pis': round(sum(x['v_pis'] for x in lista_saidas), 2),
        'v_cofins': round(sum(x['v_cofins'] for x in lista_saidas), 2),
        'qtd_itens': sum(x['qtd_itens'] for x in lista_saidas)
    }
    
    return {
        "empresa": {
            "id": company['id'],
            "razao_social": company['razao_social'],
            "cnpj": company['cnpj'],
            "regime_tributario": company.get('regime_tributario', 'lucro_presumido')
        },
        "competencia": competencia,
        "entradas": {
            "itens": lista_entradas,
            "subtotal": subtotal_entradas
        },
        "saidas": {
            "itens": lista_saidas,
            "subtotal": subtotal_saidas
        }
    }

@api_router.get("/analise-aliquotas-saida/{company_id}")
async def analise_aliquotas_saida(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """Análise de alíquotas de ICMS, PIS e COFINS nas NFs de saída"""
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Regime tributário e UF da empresa
    regime = company.get('regime_tributario', 'lucro_presumido')
    uf_empresa = company.get('uf', 'SP')
    
    # Alíquotas de PIS/COFINS por regime
    if regime == 'lucro_real':
        ALIQ_PIS_PADRAO = 1.65
        ALIQ_COFINS_PADRAO = 7.6
    else:  # lucro_presumido ou simples
        ALIQ_PIS_PADRAO = 0.65
        ALIQ_COFINS_PADRAO = 3.0
    
    # Alíquotas de ICMS por UF (principais estados)
    ALIQ_ICMS_POR_UF = {
        'SP': 18.0, 'RJ': 20.0, 'MG': 18.0, 'RS': 18.0, 'PR': 19.0,
        'SC': 17.0, 'BA': 19.0, 'PE': 18.0, 'CE': 18.0, 'GO': 17.0,
        'DF': 18.0, 'ES': 17.0, 'MT': 17.0, 'MS': 17.0, 'PA': 17.0,
        'AM': 18.0, 'MA': 18.0, 'PI': 18.0, 'RN': 18.0, 'PB': 18.0,
        'AL': 18.0, 'SE': 18.0, 'TO': 18.0, 'RO': 17.5, 'AC': 17.0,
        'AP': 18.0, 'RR': 17.0
    }
    ALIQ_ICMS_PADRAO = ALIQ_ICMS_POR_UF.get(uf_empresa, 18.0)
    
    # NCMs com alíquota zero de PIS/COFINS (monofásico/isentos comuns)
    NCM_ALIQ_ZERO = [
        '0901', '1006', '1101', '1102',  # Café, arroz, farinha de trigo
        '2201', '2202',  # Águas, refrigerantes (alguns)
        '2710',  # Combustíveis (monofásico)
        '3002', '3003', '3004',  # Medicamentos (alguns)
        '8703',  # Veículos (alguns)
    ]
    
    def is_ncm_aliq_zero(ncm: str) -> bool:
        """Verifica se NCM é de produto com alíquota zero"""
        ncm_4 = ncm[:4] if ncm else ''
        return ncm_4 in NCM_ALIQ_ZERO
    
    # Buscar apenas documentos de saída
    query = {"company_id": company_id, "competencia": competencia, "tipo": "saida"}
    documents = await db.xml_documents.find(query, {"_id": 0, "xml_content": 0}).to_list(1000)
    
    alertas = []
    produtos_analisados = []
    
    for doc in documents:
        for prod in doc.get('produtos', []):
            valor_total = float(prod.get('valor_total', 0) or 0)
            v_icms = float(prod.get('v_icms', 0) or 0)
            v_pis = float(prod.get('v_pis', 0) or 0)
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            ncm = prod.get('ncm', '')
            
            # Calcular alíquotas efetivas
            aliq_icms = (v_icms / valor_total * 100) if valor_total > 0 else 0
            aliq_pis = (v_pis / valor_total * 100) if valor_total > 0 else 0
            aliq_cofins = (v_cofins / valor_total * 100) if valor_total > 0 else 0
            
            # Verificar se é alíquota zero pelo NCM
            ncm_is_aliq_zero = is_ncm_aliq_zero(ncm)
            
            produto_info = {
                'documento': doc.get('numero_nfe'),
                'codigo': prod.get('codigo'),
                'descricao': prod.get('descricao'),
                'ncm': ncm,
                'valor_total': valor_total,
                'aliquotas': {
                    'icms': round(aliq_icms, 2),
                    'pis': round(aliq_pis, 2),
                    'cofins': round(aliq_cofins, 2)
                },
                'valores': {
                    'icms': v_icms,
                    'pis': v_pis,
                    'cofins': v_cofins
                },
                'ncm_aliq_zero': ncm_is_aliq_zero,
                'alertas': []
            }
            
            # ICMS - verificar alíquota com base no UF
            if aliq_icms == 0 and valor_total > 0:
                produto_info['alertas'].append({
                    'tipo': 'info',
                    'imposto': 'ICMS',
                    'mensagem': f'ICMS zerado - verificar se é isento, ST ou imune'
                })
            elif aliq_icms > 0 and abs(aliq_icms - ALIQ_ICMS_PADRAO) > 1:
                # Verificar se é alíquota de outro estado ou redução de base
                if aliq_icms in [7, 12, 4]:  # Alíquotas interestaduais
                    produto_info['alertas'].append({
                        'tipo': 'info',
                        'imposto': 'ICMS',
                        'mensagem': f'ICMS {aliq_icms:.2f}% parece interestadual ou com redução'
                    })
                else:
                    produto_info['alertas'].append({
                        'tipo': 'atencao',
                        'imposto': 'ICMS',
                        'mensagem': f'ICMS {aliq_icms:.2f}% diferente do padrão {uf_empresa} ({ALIQ_ICMS_PADRAO}%)'
                    })
            
            # PIS - verificar com base no regime e NCM
            if aliq_pis == 0 and valor_total > 0:
                if ncm_is_aliq_zero:
                    # OK - NCM com alíquota zero
                    pass
                else:
                    produto_info['alertas'].append({
                        'tipo': 'info',
                        'imposto': 'PIS',
                        'mensagem': f'PIS zerado - NCM não identificado como alíq. zero'
                    })
            elif aliq_pis > 0 and abs(aliq_pis - ALIQ_PIS_PADRAO) > 0.15:
                produto_info['alertas'].append({
                    'tipo': 'atencao',
                    'imposto': 'PIS',
                    'mensagem': f'PIS {aliq_pis:.2f}% diferente do padrão {regime.replace("_", " ").title()} ({ALIQ_PIS_PADRAO}%)'
                })
            
            # COFINS - verificar com base no regime e NCM
            if aliq_cofins == 0 and valor_total > 0:
                if ncm_is_aliq_zero:
                    # OK - NCM com alíquota zero
                    pass
                else:
                    produto_info['alertas'].append({
                        'tipo': 'info',
                        'imposto': 'COFINS',
                        'mensagem': f'COFINS zerado - NCM não identificado como alíq. zero'
                    })
            elif aliq_cofins > 0 and abs(aliq_cofins - ALIQ_COFINS_PADRAO) > 0.15:
                produto_info['alertas'].append({
                    'tipo': 'atencao',
                    'imposto': 'COFINS',
                    'mensagem': f'COFINS {aliq_cofins:.2f}% diferente do padrão {regime.replace("_", " ").title()} ({ALIQ_COFINS_PADRAO}%)'
                })
            
            produtos_analisados.append(produto_info)
            alertas.extend(produto_info['alertas'])
    
    # Resumo
    total_produtos = len(produtos_analisados)
    produtos_com_alerta = len([p for p in produtos_analisados if p['alertas']])
    
    return {
        "empresa": company['razao_social'],
        "competencia": competencia,
        "regime_tributario": regime,
        "uf": uf_empresa,
        "aliquotas_esperadas": {
            "icms": ALIQ_ICMS_PADRAO,
            "pis": ALIQ_PIS_PADRAO,
            "cofins": ALIQ_COFINS_PADRAO
        },
        "total_documentos_saida": len(documents),
        "total_produtos": total_produtos,
        "produtos_com_alerta": produtos_com_alerta,
        "resumo_alertas": {
            "total": len(alertas),
            "icms": len([a for a in alertas if a['imposto'] == 'ICMS']),
            "pis": len([a for a in alertas if a['imposto'] == 'PIS']),
            "cofins": len([a for a in alertas if a['imposto'] == 'COFINS'])
        },
        "produtos": produtos_analisados
    }

@api_router.get("/relatorio-divergencias-saida/{company_id}")
async def relatorio_divergencias_saida(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """
    Gera relatório de divergências nas saídas:
    - Produtos com NCM de alíquota zero mas com tributação (PIS/COFINS CST != 06)
    - Produtos com tributação normal mas que deveriam ter alíquota zero
    """
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar documentos de saída
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia,
        "tipo": "saida"
    }, {"_id": 0}).to_list(10000)
    
    # NCMs com alíquota zero (prefixos e completos)
    NCMS_ALIQ_ZERO_PREFIXOS = [
        '0105', '0206', '0210', '0302', '0405', '0506', '0510', '0511', '0713', '1006',
        '1101', '1102', '1103', '1104', '1106', '1502', '1517', '1701', '1901', '1902', '1905',
        '2101', '2106', '2201', '2202', '2710', '2711', '3002', '3003', '3004', '3401', '3826',
        '4011', '4013', '4103', '4801', '4802', '4810', '4818', '8443', '8469', '8470', '8471',
        '8472', '8502', '8503', '8517', '8525', '8702', '8714', '8901', '9018', '9021'
    ]
    
    NCMS_ALIQ_ZERO_COMPLETOS = [
        '02061000', '02063000', '02068000', '02102000', '02109900', '03029000', '04051000',
        '05069000', '05100010', '05111000', '05119910', '05119920', '07133319', '07133329',
        '07133399', '11010010', '15171000', '17011400', '17019900', '19012000', '19021100',
        '19021900', '19022000', '19023000', '19059090', '21069010', '22011000', '22029000',
        '27101911', '27101921', '27111100', '27111910', '27112100', '30029099', '30039099',
        '30049099', '34011190', '38260000', '40115000', '40132000', '48010010', '48010090',
        '48026191', '48026199', '48101989', '48102290', '48181000', '84433222', '84690039',
        '84701000', '84713012', '84713019', '84713090', '84715010', '84716052', '84716053',
        '84716090', '84719014', '84721000', '85023100', '85030090', '85171231', '85176241',
        '85176255', '85176262', '85176272', '85176277', '85258019', '87021000', '87029090',
        '87100000', '87142000', '89019000', '89061000', '90189099', '90213980', '90214000',
        '90219019', '90219082', '90219089', '90219091', '90219092', '90219099'
    ]
    
    def is_ncm_aliq_zero(ncm):
        if not ncm:
            return False
        ncm_str = str(ncm).replace('.', '').strip()
        if len(ncm_str) >= 8 and ncm_str[:8] in NCMS_ALIQ_ZERO_COMPLETOS:
            return True
        if len(ncm_str) >= 4 and ncm_str[:4] in NCMS_ALIQ_ZERO_PREFIXOS:
            return True
        return False
    
    divergencias = []
    total_valor_divergente = 0
    
    for doc in documents:
        doc_divergencias = []
        
        for prod in doc.get('produtos', []):
            ncm = str(prod.get('ncm', '')).replace('.', '').strip()
            cst_pis = str(prod.get('cst_pis', ''))
            cst_cofins = str(prod.get('cst_cofins', ''))
            v_pis = float(prod.get('v_pis', 0) or 0)
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            valor = float(prod.get('valor_total', 0) or 0)
            
            deveria_ser_aliq_zero = is_ncm_aliq_zero(ncm)
            
            # CSTs de alíquota zero/isento: 04, 05, 06, 07, 08, 09
            csts_aliq_zero = ['04', '05', '06', '07', '08', '09']
            esta_tributado = cst_pis not in csts_aliq_zero or cst_cofins not in csts_aliq_zero
            tem_valor_imposto = v_pis > 0 or v_cofins > 0
            
    # Divergência: NCM é alíquota zero mas está tributado (com valor > 0)
            if deveria_ser_aliq_zero and tem_valor_imposto:
                doc_divergencias.append({
                    'produto': prod.get('descricao', ''),
                    'codigo': prod.get('codigo', ''),
                    'ncm': ncm,
                    'valor': valor,
                    'cst_pis_atual': cst_pis or '-',
                    'cst_cofins_atual': cst_cofins or '-',
                    'cst_pis_correto': '06',
                    'cst_cofins_correto': '06',
                    'v_pis_cobrado': v_pis,
                    'v_cofins_cobrado': v_cofins,
                    'tipo_divergencia': 'NCM é alíquota zero mas está sendo tributado',
                    'impacto_pis': v_pis,
                    'impacto_cofins': v_cofins
                })
                total_valor_divergente += valor
        
        if doc_divergencias:
            divergencias.append({
                'documento_id': doc.get('id', ''),
                'numero_nfe': doc.get('numero_nfe', ''),
                'cliente': doc.get('destinatario_nome', ''),
                'data_emissao': doc.get('data_emissao', ''),
                'valor_total': doc.get('valor_total', 0),
                'qtd_divergencias': len(doc_divergencias),
                'produtos': doc_divergencias
            })
    
    # Calcular totais de impacto
    total_pis_divergente = sum(
        sum(p['impacto_pis'] for p in d['produtos']) 
        for d in divergencias
    )
    total_cofins_divergente = sum(
        sum(p['impacto_cofins'] for p in d['produtos']) 
        for d in divergencias
    )
    
    return {
        "empresa": company['razao_social'],
        "competencia": competencia,
        "total_documentos_saida": len(documents),
        "documentos_com_divergencia": len(divergencias),
        "total_produtos_divergentes": sum(len(d['produtos']) for d in divergencias),
        "valor_total_divergente": round(total_valor_divergente, 2),
        "impacto_fiscal": {
            "pis_indevido": round(total_pis_divergente, 2),
            "cofins_indevido": round(total_cofins_divergente, 2),
            "total_indevido": round(total_pis_divergente + total_cofins_divergente, 2)
        },
        "divergencias": divergencias
    }


# ============== ANÁLISE COMPLETA DE PIS/COFINS ==============

# Tabela de NCMs com tributação MONOFÁSICA (alíquota zero na revenda)
# Referência: Lei 10.147/2000, Lei 10.485/2002, Lei 10.833/2003
NCMS_MONOFASICOS = {
    # Combustíveis e derivados de petróleo
    '2710': {'tipo': 'COMBUSTÍVEL', 'motivo': 'Gasolina, óleo diesel, GLP - Tributação concentrada'},
    '2711': {'tipo': 'COMBUSTÍVEL', 'motivo': 'GLP, gás natural - Tributação concentrada'},
    # Medicamentos e produtos farmacêuticos
    '3001': {'tipo': 'MEDICAMENTO', 'motivo': 'Glândulas e órgãos para fins terapêuticos'},
    '3002': {'tipo': 'MEDICAMENTO', 'motivo': 'Sangue humano, vacinas, soros'},
    '3003': {'tipo': 'MEDICAMENTO', 'motivo': 'Medicamentos (exceto 3002, 3005, 3006)'},
    '3004': {'tipo': 'MEDICAMENTO', 'motivo': 'Medicamentos dosados para venda a retalho'},
    # Perfumaria, higiene pessoal e cosméticos
    '3303': {'tipo': 'PERFUMARIA', 'motivo': 'Perfumes e águas-de-colônia'},
    '3304': {'tipo': 'COSMÉTICOS', 'motivo': 'Produtos de beleza, maquiagem'},
    '3305': {'tipo': 'COSMÉTICOS', 'motivo': 'Preparações capilares'},
    '3306': {'tipo': 'HIGIENE', 'motivo': 'Preparações para higiene bucal'},
    '3307': {'tipo': 'COSMÉTICOS', 'motivo': 'Preparações para barbear, desodorantes'},
    # Bebidas frias
    '2201': {'tipo': 'BEBIDA FRIA', 'motivo': 'Águas minerais e gaseificadas'},
    '2202': {'tipo': 'BEBIDA FRIA', 'motivo': 'Refrigerantes, refrescos'},
    '2203': {'tipo': 'BEBIDA FRIA', 'motivo': 'Cervejas de malte'},
    # Veículos e autopeças (alguns)
    '8702': {'tipo': 'VEÍCULO', 'motivo': 'Veículos para transporte de pessoas'},
    '8703': {'tipo': 'VEÍCULO', 'motivo': 'Automóveis de passageiros'},
    '8704': {'tipo': 'VEÍCULO', 'motivo': 'Veículos para transporte de mercadorias'},
    '8711': {'tipo': 'VEÍCULO', 'motivo': 'Motocicletas'},
    # Máquinas e equipamentos
    '8443': {'tipo': 'EQUIPAMENTO', 'motivo': 'Máquinas de impressão'},
    '8471': {'tipo': 'EQUIPAMENTO', 'motivo': 'Computadores e processadores de dados'},
}

# NCMs específicos de alíquota zero (não monofásicos, mas zerados por lei específica)
NCMS_ALIQUOTA_ZERO_ESPECIFICOS = {
    # Cesta básica - Lei 10.925/2004
    '0203': {'motivo': 'Carnes de suínos - Cesta básica'},
    '0207': {'motivo': 'Carnes de aves - Cesta básica'},
    '0401': {'motivo': 'Leite e creme de leite - Cesta básica'},
    '0402': {'motivo': 'Leite concentrado - Cesta básica'},
    '0701': {'motivo': 'Batata - Cesta básica'},
    '0702': {'motivo': 'Tomate - Cesta básica'},
    '0703': {'motivo': 'Cebola, alho - Cesta básica'},
    '0901': {'motivo': 'Café - Cesta básica'},
    '1001': {'motivo': 'Trigo - Cesta básica'},
    '1005': {'motivo': 'Milho - Cesta básica'},
    '1006': {'motivo': 'Arroz - Cesta básica'},
    '1101': {'motivo': 'Farinha de trigo - Cesta básica'},
    '1507': {'motivo': 'Óleo de soja - Cesta básica'},
    '1701': {'motivo': 'Açúcar - Cesta básica'},
    '1901': {'motivo': 'Extratos de malte - Cesta básica'},
    '1902': {'motivo': 'Massas alimentícias - Cesta básica'},
    '1905': {'motivo': 'Pão - Cesta básica'},
    '2009': {'motivo': 'Sucos de frutas - Cesta básica'},
}

# CFOPs que NÃO geram débito de PIS/COFINS nas saídas
CFOPS_SEM_DEBITO_SAIDA = {
    # Transferências
    '5151': {'motivo': 'Transferência para industrialização', 'gera_debito': False},
    '5152': {'motivo': 'Transferência para comercialização', 'gera_debito': False},
    '5153': {'motivo': 'Transferência de energia elétrica', 'gera_debito': False},
    '5155': {'motivo': 'Transferência de produção própria', 'gera_debito': False},
    '5156': {'motivo': 'Transferência de mercadoria adquirida', 'gera_debito': False},
    # Devoluções (estorno, não débito)
    '5201': {'motivo': 'Devolução de compra industrialização', 'gera_debito': False},
    '5202': {'motivo': 'Devolução de compra comercialização', 'gera_debito': False},
    '5208': {'motivo': 'Devolução de mercadoria de terceiros', 'gera_debito': False},
    '5209': {'motivo': 'Devolução de compra para ativo imobilizado', 'gera_debito': False},
    '5210': {'motivo': 'Devolução de compra para uso/consumo', 'gera_debito': False},
    '5411': {'motivo': 'Devolução de compra para comercialização ST', 'gera_debito': False},
    '5412': {'motivo': 'Devolução de bem do ativo imobilizado', 'gera_debito': False},
    # Remessas (não geram receita)
    '5901': {'motivo': 'Remessa para industrialização por encomenda', 'gera_debito': False},
    '5902': {'motivo': 'Retorno de mercadoria industrialização', 'gera_debito': False},
    '5903': {'motivo': 'Retorno de mercadoria não industrializada', 'gera_debito': False},
    '5904': {'motivo': 'Remessa para venda fora do estabelecimento', 'gera_debito': False},
    '5905': {'motivo': 'Remessa para depósito fechado/armazém', 'gera_debito': False},
    '5906': {'motivo': 'Retorno de mercadoria de depósito', 'gera_debito': False},
    '5907': {'motivo': 'Retorno simbólico de depósito fechado', 'gera_debito': False},
    '5908': {'motivo': 'Remessa de bem por conta de contrato de comodato', 'gera_debito': False},
    '5909': {'motivo': 'Retorno de bem recebido por conta de comodato', 'gera_debito': False},
    '5910': {'motivo': 'Remessa em bonificação, doação', 'gera_debito': False},
    '5911': {'motivo': 'Remessa de amostra grátis', 'gera_debito': False},
    '5912': {'motivo': 'Remessa de mercadoria para demonstração', 'gera_debito': False},
    '5913': {'motivo': 'Retorno de mercadoria de demonstração', 'gera_debito': False},
    '5914': {'motivo': 'Remessa para exposição/feira', 'gera_debito': False},
    '5915': {'motivo': 'Remessa de mercadoria para consignação', 'gera_debito': False},
    '5916': {'motivo': 'Retorno de mercadoria de consignação', 'gera_debito': False},
    '5917': {'motivo': 'Remessa de consignação simbólica', 'gera_debito': False},
    '5918': {'motivo': 'Devolução de consignação simbólica', 'gera_debito': False},
    '5919': {'motivo': 'Devolução simbólica de consignação', 'gera_debito': False},
    '5920': {'motivo': 'Remessa de vasilhame/sacaria', 'gera_debito': False},
    '5921': {'motivo': 'Devolução de vasilhame/sacaria', 'gera_debito': False},
    '5922': {'motivo': 'Lançamento simples faturamento', 'gera_debito': False},
    '5923': {'motivo': 'Remessa por conta e ordem', 'gera_debito': False},
    '5924': {'motivo': 'Remessa industrialização por conta e ordem', 'gera_debito': False},
    '5925': {'motivo': 'Retorno de mercadoria de depósito fechado', 'gera_debito': False},
    '5929': {'motivo': 'Lançamento de crédito relativo à NF', 'gera_debito': False},
    '5949': {'motivo': 'Outra saída não especificada', 'gera_debito': False},
}

# CFOPs interestaduais (6xxx) - mesmas regras
CFOPS_SEM_DEBITO_SAIDA.update({
    '6' + cfop[1:]: {**info, 'motivo': info['motivo'] + ' (interestadual)'}
    for cfop, info in CFOPS_SEM_DEBITO_SAIDA.items() if cfop.startswith('5')
})

# Alíquotas padrão de PIS/COFINS
ALIQUOTAS_PADRAO = {
    'lucro_real': {
        'pis': 1.65,
        'cofins': 7.60
    },
    'lucro_presumido': {
        'pis': 0.65,
        'cofins': 3.00
    }
}


@api_router.get("/analise-pis-cofins-completa/{company_id}")
async def analise_pis_cofins_completa(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """
    Análise COMPLETA de PIS/COFINS nas saídas:
    - Compara CST e alíquotas usados vs corretos por NCM e CFOP
    - Identifica NCMs monofásicos tributados indevidamente
    - Identifica CFOPs que não deveriam gerar débito
    - Calcula impacto financeiro real
    """
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    regime = company.get('regime_tributario', 'lucro_real').lower().replace(' ', '_')
    if regime not in ALIQUOTAS_PADRAO:
        regime = 'lucro_real'
    
    aliq_padrao = ALIQUOTAS_PADRAO[regime]
    
    # Buscar documentos de saída
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia,
        "tipo": "saida"
    }, {"_id": 0}).to_list(10000)
    
    if not documents:
        return {
            "empresa": company.get('razao_social', ''),
            "competencia": competencia,
            "regime_tributario": regime,
            "total_documentos": 0,
            "total_produtos": 0,
            "resumo": {},
            "divergencias": []
        }
    
    def get_ncm_prefix(ncm_str):
        """Retorna o prefixo de 4 dígitos do NCM"""
        ncm_clean = str(ncm_str).replace('.', '').replace('-', '').strip()
        return ncm_clean[:4] if len(ncm_clean) >= 4 else ncm_clean
    
    def analisa_produto(produto, cfop):
        """Analisa um produto e retorna a classificação correta"""
        ncm = str(produto.get('ncm', '')).replace('.', '').replace('-', '').strip()
        ncm_prefix = ncm[:4] if len(ncm) >= 4 else ncm
        
        cst_pis_atual = str(produto.get('cst_pis', '') or '')
        cst_cofins_atual = str(produto.get('cst_cofins', '') or '')
        
        aliq_pis_atual = float(produto.get('p_pis', 0) or 0)
        aliq_cofins_atual = float(produto.get('p_cofins', 0) or 0)
        
        v_pis_atual = float(produto.get('v_pis', 0) or 0)
        v_cofins_atual = float(produto.get('v_cofins', 0) or 0)
        
        valor_produto = float(produto.get('valor_total', 0) or 0)
        bc_pis = float(produto.get('v_bc_pis', valor_produto) or valor_produto)
        bc_cofins = float(produto.get('v_bc_cofins', valor_produto) or valor_produto)
        
        # CSTs que indicam não-tributação (não geram débito)
        csts_nao_tributados = ['04', '05', '06', '07', '08', '09', '49']
        cst_pis_nao_tributado = cst_pis_atual in csts_nao_tributados
        cst_cofins_nao_tributado = cst_cofins_atual in csts_nao_tributados
        
        resultado = {
            'descricao': produto.get('descricao', ''),
            'codigo': produto.get('codigo', ''),
            'ncm': ncm,
            'cfop': cfop,
            'valor_produto': valor_produto,
            'bc_pis': bc_pis,
            'bc_cofins': bc_cofins,
            # Valores ATUAIS
            'cst_pis_atual': cst_pis_atual,
            'cst_cofins_atual': cst_cofins_atual,
            'aliq_pis_atual': aliq_pis_atual,
            'aliq_cofins_atual': aliq_cofins_atual,
            'v_pis_atual': v_pis_atual,
            'v_cofins_atual': v_cofins_atual,
            # Valores CORRETOS (a serem preenchidos)
            'cst_pis_correto': '',
            'cst_cofins_correto': '',
            'aliq_pis_correto': 0,
            'aliq_cofins_correto': 0,
            'v_pis_correto': 0,
            'v_cofins_correto': 0,
            # Análise
            'motivo': '',
            'tipo_divergencia': None,
            'divergente': False,
            'impacto_pis': 0,
            'impacto_cofins': 0
        }
        
        # 1. Verificar se CFOP não gera débito
        cfop_str = str(cfop)[:4]
        if cfop_str in CFOPS_SEM_DEBITO_SAIDA:
            info = CFOPS_SEM_DEBITO_SAIDA[cfop_str]
            resultado['cst_pis_correto'] = '08'  # Sem incidência
            resultado['cst_cofins_correto'] = '08'
            resultado['aliq_pis_correto'] = 0
            resultado['aliq_cofins_correto'] = 0
            resultado['v_pis_correto'] = 0
            resultado['v_cofins_correto'] = 0
            resultado['motivo'] = f"CFOP {cfop_str}: {info['motivo']}"
            
            # Só é divergência se PAGOU imposto quando não deveria
            # Se o CST atual já é não-tributado E valor é zero, está correto
            if v_pis_atual > 0.01 or v_cofins_atual > 0.01:
                resultado['divergente'] = True
                resultado['tipo_divergencia'] = 'CFOP_SEM_DEBITO'
                resultado['impacto_pis'] = v_pis_atual
                resultado['impacto_cofins'] = v_cofins_atual
            
            return resultado
        
        # 2. Verificar se NCM é monofásico
        if ncm_prefix in NCMS_MONOFASICOS:
            info = NCMS_MONOFASICOS[ncm_prefix]
            resultado['cst_pis_correto'] = '04'  # Monofásico - alíquota zero
            resultado['cst_cofins_correto'] = '04'
            resultado['aliq_pis_correto'] = 0
            resultado['aliq_cofins_correto'] = 0
            resultado['v_pis_correto'] = 0
            resultado['v_cofins_correto'] = 0
            resultado['motivo'] = f"{info['tipo']}: {info['motivo']}"
            
            # Só é divergência se PAGOU imposto quando não deveria
            if v_pis_atual > 0.01 or v_cofins_atual > 0.01:
                resultado['divergente'] = True
                resultado['tipo_divergencia'] = 'NCM_MONOFASICO'
                resultado['impacto_pis'] = v_pis_atual
                resultado['impacto_cofins'] = v_cofins_atual
            
            return resultado
        
        # 3. Verificar se NCM é alíquota zero específico
        if ncm_prefix in NCMS_ALIQUOTA_ZERO_ESPECIFICOS:
            info = NCMS_ALIQUOTA_ZERO_ESPECIFICOS[ncm_prefix]
            resultado['cst_pis_correto'] = '06'  # Alíquota zero
            resultado['cst_cofins_correto'] = '06'
            resultado['aliq_pis_correto'] = 0
            resultado['aliq_cofins_correto'] = 0
            resultado['v_pis_correto'] = 0
            resultado['v_cofins_correto'] = 0
            resultado['motivo'] = info['motivo']
            
            # Só é divergência se PAGOU imposto quando não deveria
            if v_pis_atual > 0.01 or v_cofins_atual > 0.01:
                resultado['divergente'] = True
                resultado['tipo_divergencia'] = 'NCM_ALIQUOTA_ZERO'
                resultado['impacto_pis'] = v_pis_atual
                resultado['impacto_cofins'] = v_cofins_atual
            
            return resultado
        
        # 4. Operação tributada normalmente
        resultado['cst_pis_correto'] = '01'  # Tributável
        resultado['cst_cofins_correto'] = '01'
        resultado['aliq_pis_correto'] = aliq_padrao['pis']
        resultado['aliq_cofins_correto'] = aliq_padrao['cofins']
        resultado['v_pis_correto'] = round(bc_pis * aliq_padrao['pis'] / 100, 2)
        resultado['v_cofins_correto'] = round(bc_cofins * aliq_padrao['cofins'] / 100, 2)
        resultado['motivo'] = 'Operação tributável normal'
        
        # Verificar se está tributando menos que deveria
        diff_pis = resultado['v_pis_correto'] - v_pis_atual
        diff_cofins = resultado['v_cofins_correto'] - v_cofins_atual
        
        # Tolerância de R$ 0.50 para arredondamentos
        if abs(diff_pis) > 0.50 or abs(diff_cofins) > 0.50:
            resultado['divergente'] = True
            resultado['tipo_divergencia'] = 'ALIQUOTA_INCORRETA'
            resultado['impacto_pis'] = round(diff_pis, 2)
            resultado['impacto_cofins'] = round(diff_cofins, 2)
        
        return resultado
    
    # Processar todos os documentos
    divergencias = []
    total_produtos = 0
    total_divergentes = 0
    
    resumo = {
        'total_valor_saidas': 0,
        'total_pis_declarado': 0,
        'total_cofins_declarado': 0,
        'total_pis_correto': 0,
        'total_cofins_correto': 0,
        'por_tipo_divergencia': {
            'CFOP_SEM_DEBITO': {'qtd': 0, 'impacto_pis': 0, 'impacto_cofins': 0},
            'NCM_MONOFASICO': {'qtd': 0, 'impacto_pis': 0, 'impacto_cofins': 0},
            'NCM_ALIQUOTA_ZERO': {'qtd': 0, 'impacto_pis': 0, 'impacto_cofins': 0},
            'ALIQUOTA_INCORRETA': {'qtd': 0, 'impacto_pis': 0, 'impacto_cofins': 0}
        }
    }
    
    for doc in documents:
        doc_info = {
            'documento_id': doc.get('id', ''),
            'numero_nfe': doc.get('numero_nfe', ''),
            'serie': doc.get('serie', '1'),
            'cliente': doc.get('destinatario_nome', ''),
            'cnpj_cliente': doc.get('destinatario_cnpj', ''),
            'data_emissao': doc.get('data_emissao', ''),
            'valor_total': float(doc.get('valor_total', 0) or 0),
            'produtos': []
        }
        
        resumo['total_valor_saidas'] += doc_info['valor_total']
        
        for produto in doc.get('produtos', []):
            total_produtos += 1
            cfop = produto.get('cfop', '')
            
            analise = analisa_produto(produto, cfop)
            
            resumo['total_pis_declarado'] += analise['v_pis_atual']
            resumo['total_cofins_declarado'] += analise['v_cofins_atual']
            resumo['total_pis_correto'] += analise['v_pis_correto']
            resumo['total_cofins_correto'] += analise['v_cofins_correto']
            
            if analise['divergente']:
                total_divergentes += 1
                doc_info['produtos'].append(analise)
                
                tipo = analise['tipo_divergencia']
                if tipo in resumo['por_tipo_divergencia']:
                    resumo['por_tipo_divergencia'][tipo]['qtd'] += 1
                    resumo['por_tipo_divergencia'][tipo]['impacto_pis'] += analise['impacto_pis']
                    resumo['por_tipo_divergencia'][tipo]['impacto_cofins'] += analise['impacto_cofins']
        
        if doc_info['produtos']:
            divergencias.append(doc_info)
    
    # Arredondar valores do resumo
    resumo['total_pis_declarado'] = round(resumo['total_pis_declarado'], 2)
    resumo['total_cofins_declarado'] = round(resumo['total_cofins_declarado'], 2)
    resumo['total_pis_correto'] = round(resumo['total_pis_correto'], 2)
    resumo['total_cofins_correto'] = round(resumo['total_cofins_correto'], 2)
    resumo['diferenca_pis'] = round(resumo['total_pis_declarado'] - resumo['total_pis_correto'], 2)
    resumo['diferenca_cofins'] = round(resumo['total_cofins_declarado'] - resumo['total_cofins_correto'], 2)
    resumo['diferenca_total'] = round(resumo['diferenca_pis'] + resumo['diferenca_cofins'], 2)
    
    for tipo in resumo['por_tipo_divergencia']:
        resumo['por_tipo_divergencia'][tipo]['impacto_pis'] = round(resumo['por_tipo_divergencia'][tipo]['impacto_pis'], 2)
        resumo['por_tipo_divergencia'][tipo]['impacto_cofins'] = round(resumo['por_tipo_divergencia'][tipo]['impacto_cofins'], 2)
        resumo['por_tipo_divergencia'][tipo]['impacto_total'] = round(
            resumo['por_tipo_divergencia'][tipo]['impacto_pis'] + resumo['por_tipo_divergencia'][tipo]['impacto_cofins'], 2
        )
    
    # Criar agrupamentos por produto e por NCM
    agrup_produto = {}
    agrup_ncm = {}
    
    for doc in divergencias:
        for prod in doc['produtos']:
            # Agrupamento por código do produto
            codigo = prod.get('codigo', '') or prod.get('descricao', '')[:30]
            if codigo not in agrup_produto:
                agrup_produto[codigo] = {
                    'codigo': codigo,
                    'descricao': prod.get('descricao', ''),
                    'ncm': prod.get('ncm', ''),
                    'cfop': prod.get('cfop', ''),
                    'qtd_ocorrencias': 0,
                    'valor_total': 0,
                    # CST e Alíquotas (média/moda)
                    'cst_pis_atual': prod.get('cst_pis_atual', ''),
                    'cst_pis_correto': prod.get('cst_pis_correto', ''),
                    'cst_cofins_atual': prod.get('cst_cofins_atual', ''),
                    'cst_cofins_correto': prod.get('cst_cofins_correto', ''),
                    'aliq_pis_atual': prod.get('aliq_pis_atual', 0),
                    'aliq_pis_correto': prod.get('aliq_pis_correto', 0),
                    'aliq_cofins_atual': prod.get('aliq_cofins_atual', 0),
                    'aliq_cofins_correto': prod.get('aliq_cofins_correto', 0),
                    # Valores
                    'v_pis_atual': 0,
                    'v_pis_correto': 0,
                    'v_cofins_atual': 0,
                    'v_cofins_correto': 0,
                    'impacto_pis': 0,
                    'impacto_cofins': 0,
                    'tipo_divergencia': prod.get('tipo_divergencia', ''),
                    'motivo': prod.get('motivo', '')
                }
            agrup_produto[codigo]['qtd_ocorrencias'] += 1
            agrup_produto[codigo]['valor_total'] += prod.get('valor_produto', 0)
            agrup_produto[codigo]['v_pis_atual'] += prod.get('v_pis_atual', 0)
            agrup_produto[codigo]['v_pis_correto'] += prod.get('v_pis_correto', 0)
            agrup_produto[codigo]['v_cofins_atual'] += prod.get('v_cofins_atual', 0)
            agrup_produto[codigo]['v_cofins_correto'] += prod.get('v_cofins_correto', 0)
            agrup_produto[codigo]['impacto_pis'] += prod.get('impacto_pis', 0)
            agrup_produto[codigo]['impacto_cofins'] += prod.get('impacto_cofins', 0)
            
            # Agrupamento por NCM
            ncm = prod.get('ncm', '')[:4]  # Primeiros 4 dígitos
            if ncm and ncm not in agrup_ncm:
                agrup_ncm[ncm] = {
                    'ncm': ncm,
                    'ncm_completo': prod.get('ncm', ''),
                    'produtos': set(),
                    'qtd_ocorrencias': 0,
                    'valor_total': 0,
                    # CST e Alíquotas
                    'cst_pis_atual': prod.get('cst_pis_atual', ''),
                    'cst_pis_correto': prod.get('cst_pis_correto', ''),
                    'cst_cofins_atual': prod.get('cst_cofins_atual', ''),
                    'cst_cofins_correto': prod.get('cst_cofins_correto', ''),
                    'aliq_pis_atual': prod.get('aliq_pis_atual', 0),
                    'aliq_pis_correto': prod.get('aliq_pis_correto', 0),
                    'aliq_cofins_atual': prod.get('aliq_cofins_atual', 0),
                    'aliq_cofins_correto': prod.get('aliq_cofins_correto', 0),
                    # Valores
                    'v_pis_atual': 0,
                    'v_pis_correto': 0,
                    'v_cofins_atual': 0,
                    'v_cofins_correto': 0,
                    'impacto_pis': 0,
                    'impacto_cofins': 0,
                    'tipo_divergencia': prod.get('tipo_divergencia', ''),
                    'motivo': prod.get('motivo', '')
                }
            if ncm:
                agrup_ncm[ncm]['produtos'].add(prod.get('descricao', '')[:50])
                agrup_ncm[ncm]['qtd_ocorrencias'] += 1
                agrup_ncm[ncm]['valor_total'] += prod.get('valor_produto', 0)
                agrup_ncm[ncm]['v_pis_atual'] += prod.get('v_pis_atual', 0)
                agrup_ncm[ncm]['v_pis_correto'] += prod.get('v_pis_correto', 0)
                agrup_ncm[ncm]['v_cofins_atual'] += prod.get('v_cofins_atual', 0)
                agrup_ncm[ncm]['v_cofins_correto'] += prod.get('v_cofins_correto', 0)
                agrup_ncm[ncm]['impacto_pis'] += prod.get('impacto_pis', 0)
                agrup_ncm[ncm]['impacto_cofins'] += prod.get('impacto_cofins', 0)
    
    # Converter sets para listas e arredondar valores
    for codigo in agrup_produto:
        agrup_produto[codigo]['valor_total'] = round(agrup_produto[codigo]['valor_total'], 2)
        agrup_produto[codigo]['v_pis_atual'] = round(agrup_produto[codigo]['v_pis_atual'], 2)
        agrup_produto[codigo]['v_pis_correto'] = round(agrup_produto[codigo]['v_pis_correto'], 2)
        agrup_produto[codigo]['v_cofins_atual'] = round(agrup_produto[codigo]['v_cofins_atual'], 2)
        agrup_produto[codigo]['v_cofins_correto'] = round(agrup_produto[codigo]['v_cofins_correto'], 2)
        agrup_produto[codigo]['impacto_pis'] = round(agrup_produto[codigo]['impacto_pis'], 2)
        agrup_produto[codigo]['impacto_cofins'] = round(agrup_produto[codigo]['impacto_cofins'], 2)
        agrup_produto[codigo]['impacto_total'] = round(
            agrup_produto[codigo]['impacto_pis'] + agrup_produto[codigo]['impacto_cofins'], 2
        )
    
    for ncm in agrup_ncm:
        agrup_ncm[ncm]['produtos'] = list(agrup_ncm[ncm]['produtos'])[:5]  # Max 5 exemplos
        agrup_ncm[ncm]['valor_total'] = round(agrup_ncm[ncm]['valor_total'], 2)
        agrup_ncm[ncm]['v_pis_atual'] = round(agrup_ncm[ncm]['v_pis_atual'], 2)
        agrup_ncm[ncm]['v_pis_correto'] = round(agrup_ncm[ncm]['v_pis_correto'], 2)
        agrup_ncm[ncm]['v_cofins_atual'] = round(agrup_ncm[ncm]['v_cofins_atual'], 2)
        agrup_ncm[ncm]['v_cofins_correto'] = round(agrup_ncm[ncm]['v_cofins_correto'], 2)
        agrup_ncm[ncm]['impacto_pis'] = round(agrup_ncm[ncm]['impacto_pis'], 2)
        agrup_ncm[ncm]['impacto_cofins'] = round(agrup_ncm[ncm]['impacto_cofins'], 2)
        agrup_ncm[ncm]['impacto_total'] = round(
            agrup_ncm[ncm]['impacto_pis'] + agrup_ncm[ncm]['impacto_cofins'], 2
        )
    
    # Ordenar por impacto
    agrup_produto_list = sorted(agrup_produto.values(), key=lambda x: -x['impacto_total'])
    agrup_ncm_list = sorted(agrup_ncm.values(), key=lambda x: -x['impacto_total'])
    
    return {
        "empresa": company.get('razao_social', ''),
        "competencia": competencia,
        "regime_tributario": regime.replace('_', ' ').title(),
        "aliquotas_regime": aliq_padrao,
        "total_documentos": len(documents),
        "total_produtos": total_produtos,
        "total_divergentes": total_divergentes,
        "resumo": resumo,
        "divergencias": divergencias,
        "agrupamentos": {
            "por_produto": agrup_produto_list,
            "por_ncm": agrup_ncm_list
        }
    }


# CFOPs de operações distintas de venda (saída do emissor que virou entrada para nós)
CFOPS_OPERACOES_DISTINTAS_GLOBAL = {
    # Remessas
    '5910': {'descricao': 'Remessa em bonificação', 'sugestao_entrada': '1910'},
    '5911': {'descricao': 'Remessa de amostra grátis', 'sugestao_entrada': '1911'},
    '5912': {'descricao': 'Remessa de mercadoria para demonstração', 'sugestao_entrada': '1912'},
    '5913': {'descricao': 'Retorno de mercadoria para demonstração', 'sugestao_entrada': '1913'},
    '5914': {'descricao': 'Remessa de mercadoria para exposição/feira', 'sugestao_entrada': '1914'},
    '5915': {'descricao': 'Remessa de mercadoria para consignação', 'sugestao_entrada': '1915'},
    '5916': {'descricao': 'Retorno de mercadoria de consignação', 'sugestao_entrada': '1916'},
    '5917': {'descricao': 'Remessa de mercadoria em consignação simbólica', 'sugestao_entrada': '1917'},
    '5918': {'descricao': 'Devolução de mercadoria de consignação simbólica', 'sugestao_entrada': '1918'},
    '5919': {'descricao': 'Devolução simbólica por venda de mercadoria de consignação', 'sugestao_entrada': '1919'},
    '5920': {'descricao': 'Remessa de vasilhame/sacaria', 'sugestao_entrada': '1920'},
    '5921': {'descricao': 'Devolução de vasilhame/sacaria', 'sugestao_entrada': '1921'},
    '5922': {'descricao': 'Lançamento para simples faturamento', 'sugestao_entrada': '1922'},
    '5923': {'descricao': 'Remessa de mercadoria por conta e ordem', 'sugestao_entrada': '1923'},
    '5924': {'descricao': 'Remessa para industrialização por conta e ordem', 'sugestao_entrada': '1924'},
    '5925': {'descricao': 'Retorno de mercadoria depositada em depósito fechado/armazém', 'sugestao_entrada': '1925'},
    '5949': {'descricao': 'Outra saída não especificada', 'sugestao_entrada': '1949'},
    # Devoluções
    '5201': {'descricao': 'Devolução de compra - indústria', 'sugestao_entrada': '1201'},
    '5202': {'descricao': 'Devolução de compra - comercialização', 'sugestao_entrada': '1202'},
    '5208': {'descricao': 'Devolução de mercadoria recebida em transferência', 'sugestao_entrada': '1208'},
    '5209': {'descricao': 'Devolução de mercadoria recebida para uso/consumo', 'sugestao_entrada': '1209'},
    '5210': {'descricao': 'Devolução de compra para industrialização', 'sugestao_entrada': '1210'},
    '5122': {'descricao': 'Venda com entrega futura', 'sugestao_entrada': '1102', 'sugestao_compra': '1102'},
    '5123': {'descricao': 'Venda de mercadoria remetida anteriormente em consignação mercantil', 'sugestao_entrada': '1102', 'sugestao_compra': '1102'},
    # Remessas interestaduais (6xxx)
    '6910': {'descricao': 'Remessa em bonificação', 'sugestao_entrada': '2910'},
    '6911': {'descricao': 'Remessa de amostra grátis', 'sugestao_entrada': '2911'},
    '6912': {'descricao': 'Remessa de mercadoria para demonstração', 'sugestao_entrada': '2912'},
    '6949': {'descricao': 'Outra saída não especificada', 'sugestao_entrada': '2949'},
    '6201': {'descricao': 'Devolução de compra - indústria', 'sugestao_entrada': '2201'},
    '6202': {'descricao': 'Devolução de compra - comercialização', 'sugestao_entrada': '2202'},
    '6122': {'descricao': 'Venda com entrega futura', 'sugestao_entrada': '2102', 'sugestao_compra': '2102'},
}

@api_router.get("/alertas-cfop/{company_id}")
async def alertas_cfop_operacoes_distintas(
    company_id: str,
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """
    Busca documentos de entrada com produtos pendentes de revisão de CFOP.
    Estes são produtos que foram convertidos automaticamente durante o upload
    (CFOPs de operações distintas como bonificação, remessa, etc.)
    """
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar documentos de entrada que tenham produtos pendentes de revisão
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia,
        "tipo": "entrada"
    }, {"_id": 0}).to_list(10000)
    
    alertas = []
    total_pendentes = 0
    
    for doc in documents:
        doc_alertas = []
        
        for idx, prod in enumerate(doc.get('produtos', [])):
            # Verificar se produto está pendente de revisão
            if prod.get('pendente_revisao_cfop'):
                cfop_atual = str(prod.get('cfop', ''))
                cfop_original = str(prod.get('cfop_original_emissor', ''))
                natureza = prod.get('natureza_operacao_original', '')
                
                # Sugestões de conversão
                cfop_compra = cfop_atual.replace('9', '0') if '9' in cfop_atual else cfop_atual[:2] + '02'
                if cfop_atual.startswith('1'):
                    cfop_compra = '1102'  # Compra estadual
                elif cfop_atual.startswith('2'):
                    cfop_compra = '2102'  # Compra interestadual
                
                doc_alertas.append({
                    'produto_idx': idx,
                    'produto_codigo': prod.get('codigo', ''),
                    'produto_descricao': prod.get('descricao', ''),
                    'ncm': prod.get('ncm', ''),
                    'valor': prod.get('valor_total', 0),
                    'cfop_original_emissor': cfop_original,
                    'cfop_atual': cfop_atual,
                    'natureza_operacao': natureza,
                    'opcoes': {
                        'manter_natureza': {
                            'cfop': cfop_atual,
                            'descricao': f'Manter como {natureza}'
                        },
                        'converter_compra': {
                            'cfop': cfop_compra,
                            'descricao': f'Converter para compra ({cfop_compra})'
                        }
                    }
                })
                total_pendentes += 1
        
        if doc_alertas:
            alertas.append({
                'documento_id': doc.get('id', ''),
                'numero_nfe': doc.get('numero_nfe', ''),
                'emitente': doc.get('emitente_nome', ''),
                'data_emissao': doc.get('data_emissao', ''),
                'valor_total': doc.get('valor_total', 0),
                'qtd_pendentes': len(doc_alertas),
                'produtos': doc_alertas
            })
    
    return {
        "empresa": company['razao_social'],
        "competencia": competencia,
        "total_documentos_entrada": len(documents),
        "documentos_com_alerta": len(alertas),
        "total_produtos_pendentes": total_pendentes,
        "alertas": alertas
    }

@api_router.post("/alertas-cfop/resolver-individual")
async def resolver_alerta_cfop_individual(
    documento_id: str,
    produto_idx: int,
    novo_cfop: str,
    salvar_regra: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Resolve um alerta de CFOP individual.
    """
    doc = await db.xml_documents.find_one({"id": documento_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    produtos = doc.get('produtos', [])
    if produto_idx >= len(produtos):
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    produto = produtos[produto_idx]
    cfop_anterior = produto.get('cfop', '')
    
    # Atualizar produto
    produtos[produto_idx]['cfop'] = novo_cfop
    produtos[produto_idx]['pendente_revisao_cfop'] = False
    produtos[produto_idx]['cfop_revisado_por'] = current_user.id
    produtos[produto_idx]['cfop_revisado_em'] = datetime.now(timezone.utc).isoformat()
    
    await db.xml_documents.update_one(
        {"id": documento_id},
        {"$set": {"produtos": produtos}}
    )
    
    # Salvar regra se solicitado
    if salvar_regra:
        await db.learned_rules.insert_one({
            "id": str(uuid.uuid4()),
            "company_id": doc.get('company_id'),
            "produto_descricao": produto.get('descricao', ''),
            "produto_codigo": produto.get('codigo', ''),
            "ncm": produto.get('ncm', ''),
            "cfop_original": produto.get('cfop_original_emissor', cfop_anterior),
            "cfop_correto": novo_cfop,
            "categoria_correta": "conversao_cfop",
            "motivo": f"Conversão manual de {cfop_anterior} para {novo_cfop}",
            "aprendido_de": "user_correction",
            "created_by": current_user.id,
            "created_at": datetime.now(timezone.utc)
        })
    
    return {"success": True, "message": f"CFOP alterado de {cfop_anterior} para {novo_cfop}"}

@api_router.post("/alertas-cfop/resolver-lote")
async def resolver_alerta_cfop_lote(
    company_id: str,
    competencia: str,
    acao: str,  # 'manter_natureza' ou 'converter_compra'
    current_user: User = Depends(get_current_user)
):
    """
    Resolve todos os alertas de CFOP em lote.
    acao: 'manter_natureza' mantém o CFOP convertido, 'converter_compra' converte para CFOP de compra
    """
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia,
        "tipo": "entrada"
    }).to_list(10000)
    
    total_resolvidos = 0
    
    for doc in documents:
        produtos = doc.get('produtos', [])
        atualizado = False
        
        for idx, prod in enumerate(produtos):
            if prod.get('pendente_revisao_cfop'):
                cfop_atual = prod.get('cfop', '')
                
                if acao == 'converter_compra':
                    # Converter para CFOP de compra
                    if cfop_atual.startswith('1'):
                        novo_cfop = '1102'
                    elif cfop_atual.startswith('2'):
                        novo_cfop = '2102'
                    else:
                        novo_cfop = cfop_atual
                    produtos[idx]['cfop'] = novo_cfop
                # Se 'manter_natureza', mantém o CFOP atual
                
                produtos[idx]['pendente_revisao_cfop'] = False
                produtos[idx]['cfop_revisado_por'] = current_user.id
                produtos[idx]['cfop_revisado_em'] = datetime.now(timezone.utc).isoformat()
                produtos[idx]['acao_lote'] = acao
                atualizado = True
                total_resolvidos += 1
        
        if atualizado:
            await db.xml_documents.update_one(
                {"id": doc['id']},
                {"$set": {"produtos": produtos}}
            )
    
    return {
        "success": True, 
        "total_resolvidos": total_resolvidos,
        "acao": acao,
        "message": f"{total_resolvidos} produtos atualizados com ação '{acao}'"
    }

@api_router.post("/alertas-cfop/resolver-ia")
async def resolver_alerta_cfop_ia(
    company_id: str,
    competencia: str,
    comando: str,
    current_user: User = Depends(get_current_user)
):
    """
    Resolve alertas de CFOP usando comando de IA.
    Ex: "classificar bonificações como 1910", "converter todas remessas para compra"
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Buscar produtos pendentes
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia,
        "tipo": "entrada"
    }).to_list(10000)
    
    produtos_pendentes = []
    for doc in documents:
        for idx, prod in enumerate(doc.get('produtos', [])):
            if prod.get('pendente_revisao_cfop'):
                produtos_pendentes.append({
                    'doc_id': doc['id'],
                    'idx': idx,
                    'descricao': prod.get('descricao', ''),
                    'codigo': prod.get('codigo', ''),
                    'ncm': prod.get('ncm', ''),
                    'cfop_atual': prod.get('cfop', ''),
                    'cfop_original': prod.get('cfop_original_emissor', ''),
                    'natureza': prod.get('natureza_operacao_original', ''),
                    'valor': prod.get('valor_total', 0)
                })
    
    if not produtos_pendentes:
        return {"success": True, "message": "Nenhum produto pendente de revisão", "alteracoes": []}
    
    # Preparar contexto para IA
    produtos_texto = "\n".join([
        f"- {p['descricao']} (NCM: {p['ncm']}, CFOP atual: {p['cfop_atual']}, Original emissor: {p['cfop_original']}, Natureza: {p['natureza']})"
        for p in produtos_pendentes[:50]  # Limitar para não estourar contexto
    ])
    
    prompt = f"""Você é um assistente fiscal especializado. O usuário quer aplicar uma regra para classificar CFOPs.

Comando do usuário: "{comando}"

Produtos pendentes de classificação:
{produtos_texto}

CFOPs de entrada comuns:
- 1102: Compra para comercialização (estadual)
- 2102: Compra para comercialização (interestadual)
- 1910: Entrada de bonificação (estadual)
- 2910: Entrada de bonificação (interestadual)
- 1949: Outra entrada não especificada (estadual)
- 2949: Outra entrada não especificada (interestadual)

Com base no comando do usuário, retorne um JSON com as alterações a serem feitas.
Formato: {{"alteracoes": [{{"descricao_produto": "...", "cfop_atual": "...", "novo_cfop": "...", "motivo": "..."}}]}}

Se o comando não for claro ou não se aplicar a nenhum produto, retorne {{"alteracoes": [], "erro": "mensagem explicativa"}}
"""

    try:
        llm = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"cfop-resolver-{company_id}-{competencia}",
            system_message="Você é um assistente fiscal especializado em classificação de CFOPs. Responda sempre em formato JSON válido."
        )
        response = await llm.send_message(UserMessage(text=prompt))
        
        # Extrair JSON da resposta
        response_text = response if isinstance(response, str) else str(response)
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        
        if json_match:
            resultado = json.loads(json_match.group())
        else:
            # Não encontrou JSON, mas pode ter uma mensagem da IA
            return {"success": True, "message": response_text, "alteracoes": [], "total_alteracoes": 0}
        
        if resultado.get('erro'):
            return {"success": True, "message": resultado['erro'], "alteracoes": [], "total_alteracoes": 0}
        
        # Aplicar alterações em LOTE - processar TODOS os produtos que correspondem
        alteracoes_aplicadas = []
        docs_atualizados = {}  # Cache para evitar múltiplas leituras do mesmo documento
        
        for alt in resultado.get('alteracoes', []):
            cfop_destino = alt.get('novo_cfop', '')
            if not cfop_destino:
                continue
                
            # Encontrar TODOS os produtos correspondentes
            for p in produtos_pendentes:
                # Match por descrição parcial, CFOP atual, ou natureza
                desc_match = alt.get('descricao_produto', '').lower() in p['descricao'].lower() if alt.get('descricao_produto') else False
                cfop_match = p['cfop_atual'] == alt.get('cfop_atual')
                natureza_match = alt.get('natureza', '').lower() in p.get('natureza', '').lower() if alt.get('natureza') else False
                
                # Se o comando menciona "todas" ou "todos", aplicar a todos com CFOP correspondente
                aplicar_todos = 'todas' in comando.lower() or 'todos' in comando.lower()
                
                if cfop_match or desc_match or natureza_match or aplicar_todos:
                    doc_id = p['doc_id']
                    
                    # Buscar documento do cache ou do banco
                    if doc_id not in docs_atualizados:
                        doc = await db.xml_documents.find_one({"id": doc_id})
                        if doc:
                            docs_atualizados[doc_id] = doc.get('produtos', [])
                    
                    if doc_id in docs_atualizados:
                        produtos_doc = docs_atualizados[doc_id]
                        if p['idx'] < len(produtos_doc):
                            produtos_doc[p['idx']]['cfop'] = cfop_destino
                            produtos_doc[p['idx']]['pendente_revisao_cfop'] = False
                            produtos_doc[p['idx']]['cfop_revisado_por'] = current_user.id
                            produtos_doc[p['idx']]['cfop_revisado_por_ia'] = True
                            produtos_doc[p['idx']]['motivo_ia'] = alt.get('motivo', comando)
                            
                            alteracoes_aplicadas.append({
                                'produto': p['descricao'],
                                'cfop_anterior': p['cfop_atual'],
                                'cfop_novo': cfop_destino,
                                'motivo': alt.get('motivo', comando)
                            })
        
        # Salvar todas as atualizações no banco
        for doc_id, produtos in docs_atualizados.items():
            await db.xml_documents.update_one(
                {"id": doc_id},
                {"$set": {"produtos": produtos}}
            )
        
        return {
            "success": True,
            "total_alteracoes": len(alteracoes_aplicadas),
            "alteracoes": alteracoes_aplicadas,
            "comando_original": comando
        }
        
    except Exception as e:
        return {"success": False, "message": f"Erro ao processar com IA: {str(e)}", "alteracoes": []}

@api_router.post("/converter-cfop")
async def converter_cfop_documento(
    documento_id: str,
    produto_codigo: str,
    novo_cfop: str,
    aplicar_regra: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Converte o CFOP de um produto específico em um documento.
    Se aplicar_regra=True, salva como regra para aplicação futura.
    """
    doc = await db.xml_documents.find_one({"id": documento_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    # Atualizar o CFOP do produto
    produtos = doc.get('produtos', [])
    atualizado = False
    
    for i, prod in enumerate(produtos):
        if prod.get('codigo') == produto_codigo:
            produtos[i]['cfop'] = novo_cfop
            produtos[i]['cfop_original'] = prod.get('cfop', '')
            produtos[i]['cfop_convertido'] = True
            atualizado = True
            break
    
    if not atualizado:
        raise HTTPException(status_code=404, detail="Produto não encontrado no documento")
    
    # Atualizar documento no banco
    await db.xml_documents.update_one(
        {"id": documento_id},
        {"$set": {"produtos": produtos}}
    )
    
    # Se solicitado, salvar como regra
    if aplicar_regra:
        prod_info = next((p for p in produtos if p.get('codigo') == produto_codigo), {})
        await db.learned_rules.insert_one({
            "id": str(uuid.uuid4()),
            "company_id": doc.get('company_id'),
            "produto_descricao": prod_info.get('descricao', ''),
            "produto_codigo": produto_codigo,
            "ncm": prod_info.get('ncm', ''),
            "categoria_correta": "conversao_cfop",
            "cfop_correto": novo_cfop,
            "cfop_original": prod_info.get('cfop_original', ''),
            "motivo": f"Conversão de {prod_info.get('cfop_original', '')} para {novo_cfop}",
            "aprendido_de": "user_correction",
            "created_by": current_user.id,
            "created_at": datetime.now(timezone.utc)
        })
    
    return {"success": True, "message": f"CFOP convertido para {novo_cfop}"}

@api_router.get("/reports/by-product/{company_id}")
async def report_by_product(
    company_id: str,
    competencia: Optional[str] = None,
    tipo: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {"company_id": company_id}
    if competencia:
        query['competencia'] = competencia
    if tipo and tipo != 'todos':
        query['tipo'] = tipo
    
    documents = await db.xml_documents.find(query, {"_id": 0}).to_list(10000)
    
    product_summary = defaultdict(lambda: {
        'descricao': '',
        'ncm': '',
        'quantidade': 0,
        'valor_total': 0,
        'credito_icms': 0,
        'credito_pis': 0,
        'credito_cofins': 0,
        'documentos': 0
    })
    
    for doc in documents:
        for prod in doc.get('produtos', []):
            codigo = prod.get('codigo', '')
            product_summary[codigo]['descricao'] = prod.get('descricao', '')
            product_summary[codigo]['ncm'] = prod.get('ncm', '')
            product_summary[codigo]['quantidade'] += prod.get('quantidade', 0)
            product_summary[codigo]['valor_total'] += prod.get('valor_total', 0)
            product_summary[codigo]['credito_icms'] += prod.get('v_icms', 0)
            product_summary[codigo]['credito_pis'] += prod.get('v_pis', 0)
            product_summary[codigo]['credito_cofins'] += prod.get('v_cofins', 0)
            product_summary[codigo]['documentos'] += 1
    
    report = []
    for codigo, data in product_summary.items():
        report.append({
            'codigo': codigo,
            **data
        })
    
    return sorted(report, key=lambda x: x['valor_total'], reverse=True)

@api_router.get("/reports/by-ncm/{company_id}")
async def report_by_ncm(
    company_id: str,
    competencia: Optional[str] = None,
    tipo: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {"company_id": company_id}
    if competencia:
        query['competencia'] = competencia
    if tipo and tipo != 'todos':
        query['tipo'] = tipo
    
    documents = await db.xml_documents.find(query, {"_id": 0}).to_list(10000)
    
    ncm_summary = defaultdict(lambda: {
        'quantidade_produtos': 0,
        'quantidade': 0,
        'valor_total': 0,
        'credito_icms': 0,
        'credito_pis': 0,
        'credito_cofins': 0,
        'documentos': set()
    })
    
    for doc in documents:
        for prod in doc.get('produtos', []):
            ncm = prod.get('ncm', '')
            ncm_summary[ncm]['quantidade_produtos'] += 1
            ncm_summary[ncm]['quantidade'] += prod.get('quantidade', 0)
            ncm_summary[ncm]['valor_total'] += prod.get('valor_total', 0)
            ncm_summary[ncm]['credito_icms'] += prod.get('v_icms', 0)
            ncm_summary[ncm]['credito_pis'] += prod.get('v_pis', 0)
            ncm_summary[ncm]['credito_cofins'] += prod.get('v_cofins', 0)
            ncm_summary[ncm]['documentos'].add(doc['id'])
    
    report = []
    for ncm, data in ncm_summary.items():
        report.append({
            'ncm': ncm,
            'quantidade_produtos': data['quantidade_produtos'],
            'quantidade': data['quantidade'],
            'valor_total': data['valor_total'],
            'credito_icms': data['credito_icms'],
            'credito_pis': data['credito_pis'],
            'credito_cofins': data['credito_cofins'],
            'documentos': len(data['documentos'])
        })
    
    return sorted(report, key=lambda x: x['valor_total'], reverse=True)

@api_router.post("/cfop/rules", response_model=CFOPRule)
async def create_cfop_rule(rule_data: CFOPRule, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar regras")
    
    doc = rule_data.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.cfop_rules.insert_one(doc)
    return rule_data

@api_router.get("/cfop/rules", response_model=List[CFOPRule])
async def list_cfop_rules(current_user: User = Depends(get_current_user)):
    rules = await db.cfop_rules.find({}, {"_id": 0}).to_list(1000)
    
    for rule in rules:
        if isinstance(rule['created_at'], str):
            rule['created_at'] = datetime.fromisoformat(rule['created_at'])
    
    return rules

@api_router.post("/exceptions", response_model=ValidationException)
async def create_exception(
    exception_data: ExceptionCreate,
    current_user: User = Depends(get_current_user)
):
    exception = ValidationException(**exception_data.model_dump(), created_by=current_user.id)
    
    doc = exception.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.validation_exceptions.insert_one(doc)
    
    await db.xml_documents.update_one(
        {"id": exception_data.xml_document_id},
        {"$set": {"status_validacao": "com_excecao"}}
    )
    
    return exception

@api_router.get("/exceptions")
async def list_exceptions(
    document_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if document_id:
        query['xml_document_id'] = document_id
    
    exceptions = await db.validation_exceptions.find(query, {"_id": 0}).to_list(1000)
    
    for exc in exceptions:
        if isinstance(exc['created_at'], str):
            exc['created_at'] = datetime.fromisoformat(exc['created_at'])
    
    return exceptions

@api_router.get("/sped/export/{company_id}")
async def export_sped(
    company_id: str,
    competencia: Optional[str] = None,
    excluir_creditos_despesa_st: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Exporta SPED Fiscal para a empresa e competência especificadas.
    
    Parâmetros:
    - excluir_creditos_despesa_st: Se True, exclui créditos de ICMS de CFOPs de despesa (1556, 2556) e ST na apuração
    """
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {"company_id": company_id}
    if competencia:
        query['competencia'] = competencia
    
    documents = await db.xml_documents.find(query, {"_id": 0}).to_list(10000)
    
    for doc in documents:
        if isinstance(doc['uploaded_at'], str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
    
    xml_docs = [XMLDocument(**doc) for doc in documents]
    
    if isinstance(company['created_at'], str):
        company['created_at'] = datetime.fromisoformat(company['created_at'])
    
    company_obj = Company(**company)
    
    # Usar competência para gerar o período correto
    periodo = competencia or "01/2024"
    sped_content = generate_sped_fiscal(company_obj, xml_docs, periodo, excluir_creditos_despesa_st)
    
    return {
        "content": sped_content,
        "filename": f"SPED_FISCAL_{company['cnpj']}_{competencia or periodo}.txt",
        "excluir_creditos_despesa_st": excluir_creditos_despesa_st
    }


@api_router.get("/sped/validar/{company_id}")
async def validar_sped(
    company_id: str,
    competencia: Optional[str] = None,
    excluir_creditos_despesa_st: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Valida o SPED gerado confrontando com a apuração do sistema.
    Retorna comparativo de totalizadores por CFOP.
    """
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    query = {"company_id": company_id}
    if competencia:
        query['competencia'] = competencia
    
    documents = await db.xml_documents.find(query, {"_id": 0}).to_list(10000)
    
    # CFOPs sem crédito de ICMS (despesa e ST)
    CFOPS_SEM_CREDITO = {
        '1403', '1409', '2403', '2409', '3403', '3409',
        '1407', '2407', '1556', '2556', '1557', '2557',
        '1128', '2128', '1551', '2551', '1553', '2553',
        '1554', '2554', '1406', '2406', '1408', '2408'
    }
    
    # Calcular totais do sistema (fonte: documentos XML)
    totais_sistema = {
        'entradas': {'valor': 0, 'icms': 0, 'icms_excluido': 0, 'pis': 0, 'cofins': 0, 'por_cfop': {}},
        'saidas': {'valor': 0, 'icms': 0, 'pis': 0, 'cofins': 0, 'por_cfop': {}}
    }
    
    for doc in documents:
        tipo = 'entradas' if doc.get('tipo') == 'entrada' else 'saidas'
        
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            valor = float(prod.get('valor_total', 0) or 0)
            v_icms = float(prod.get('v_icms', 0) or 0)
            v_pis = float(prod.get('v_pis', 0) or 0)
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            
            # Totais gerais
            totais_sistema[tipo]['valor'] += valor
            totais_sistema[tipo]['pis'] += v_pis
            totais_sistema[tipo]['cofins'] += v_cofins
            
            # ICMS com lógica de exclusão
            if tipo == 'entradas' and excluir_creditos_despesa_st and cfop in CFOPS_SEM_CREDITO:
                totais_sistema[tipo]['icms_excluido'] += v_icms
            else:
                totais_sistema[tipo]['icms'] += v_icms
            
            # Totais por CFOP
            if cfop not in totais_sistema[tipo]['por_cfop']:
                totais_sistema[tipo]['por_cfop'][cfop] = {
                    'cfop': cfop,
                    'qtd_notas': 0,
                    'qtd_itens': 0,
                    'valor': 0,
                    'icms': 0,
                    'pis': 0,
                    'cofins': 0,
                    'credito_excluido': cfop in CFOPS_SEM_CREDITO if tipo == 'entradas' else False
                }
            
            totais_sistema[tipo]['por_cfop'][cfop]['qtd_itens'] += 1
            totais_sistema[tipo]['por_cfop'][cfop]['valor'] += valor
            totais_sistema[tipo]['por_cfop'][cfop]['icms'] += v_icms
            totais_sistema[tipo]['por_cfop'][cfop]['pis'] += v_pis
            totais_sistema[tipo]['por_cfop'][cfop]['cofins'] += v_cofins
    
    # Contar notas por CFOP
    notas_por_cfop = {'entradas': {}, 'saidas': {}}
    for doc in documents:
        tipo = 'entradas' if doc.get('tipo') == 'entrada' else 'saidas'
        cfops_na_nota = set()
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            if cfop:
                cfops_na_nota.add(cfop)
        for cfop in cfops_na_nota:
            if cfop in totais_sistema[tipo]['por_cfop']:
                totais_sistema[tipo]['por_cfop'][cfop]['qtd_notas'] += 1
    
    # Calcular apuração
    total_debitos = totais_sistema['saidas']['icms']
    total_creditos = totais_sistema['entradas']['icms']
    total_creditos_excluidos = totais_sistema['entradas']['icms_excluido']
    
    saldo_icms = total_debitos - total_creditos
    icms_a_pagar = max(0, saldo_icms)
    icms_a_compensar = max(0, -saldo_icms)
    
    # Preparar resposta
    return {
        "empresa": company.get('razao_social'),
        "competencia": competencia,
        "excluir_creditos_despesa_st": excluir_creditos_despesa_st,
        "resumo": {
            "entradas": {
                "total_valor": round(totais_sistema['entradas']['valor'], 2),
                "total_icms_creditavel": round(totais_sistema['entradas']['icms'], 2),
                "total_icms_excluido": round(totais_sistema['entradas']['icms_excluido'], 2),
                "total_pis": round(totais_sistema['entradas']['pis'], 2),
                "total_cofins": round(totais_sistema['entradas']['cofins'], 2),
                "qtd_cfops": len(totais_sistema['entradas']['por_cfop'])
            },
            "saidas": {
                "total_valor": round(totais_sistema['saidas']['valor'], 2),
                "total_icms": round(totais_sistema['saidas']['icms'], 2),
                "total_pis": round(totais_sistema['saidas']['pis'], 2),
                "total_cofins": round(totais_sistema['saidas']['cofins'], 2),
                "qtd_cfops": len(totais_sistema['saidas']['por_cfop'])
            },
            "apuracao_icms": {
                "debitos": round(total_debitos, 2),
                "creditos": round(total_creditos, 2),
                "creditos_excluidos": round(total_creditos_excluidos, 2),
                "saldo": round(saldo_icms, 2),
                "icms_a_pagar": round(icms_a_pagar, 2),
                "icms_a_compensar": round(icms_a_compensar, 2)
            }
        },
        "detalhamento_cfop": {
            "entradas": sorted(
                [
                    {
                        **v,
                        'valor': round(v['valor'], 2),
                        'icms': round(v['icms'], 2),
                        'pis': round(v['pis'], 2),
                        'cofins': round(v['cofins'], 2)
                    }
                    for v in totais_sistema['entradas']['por_cfop'].values()
                ],
                key=lambda x: x['cfop']
            ),
            "saidas": sorted(
                [
                    {
                        **v,
                        'valor': round(v['valor'], 2),
                        'icms': round(v['icms'], 2),
                        'pis': round(v['pis'], 2),
                        'cofins': round(v['cofins'], 2)
                    }
                    for v in totais_sistema['saidas']['por_cfop'].values()
                ],
                key=lambda x: x['cfop']
            )
        }
    }


@api_router.get("/analise-tributaria-ia/{company_id}")
async def analise_tributaria_ia(
    company_id: str,
    competencia: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Análise Tributária Inteligente por IA.
    Identifica vilões tributários, oportunidades e gera insights personalizados.
    """
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    query = {"company_id": company_id}
    if competencia:
        query['competencia'] = competencia
    
    documents = await db.xml_documents.find(query, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    if not documents:
        return {
            "empresa": company.get('razao_social'),
            "competencia": competencia,
            "total_documentos": 0,
            "viloes_tributarios": [],
            "oportunidades": [],
            "analise_por_ncm": [],
            "insights_ia": None,
            "resumo": {
                "total_entradas": 0,
                "total_saidas": 0,
                "credito_icms": 0,
                "debito_icms": 0,
                "saldo_icms": 0
            }
        }
    
    # Separar entradas e saídas
    entradas = [d for d in documents if d.get('tipo') == 'entrada']
    saidas = [d for d in documents if d.get('tipo') == 'saida']
    
    # Agrupar produtos por código+NCM para análise cruzada entrada/saída
    produtos_entrada = {}  # {codigo_ncm: {aliq_icms, cst, valor, qtd, st}}
    produtos_saida = {}    # {codigo_ncm: {aliq_icms, cst, valor, qtd, st}}
    
    # CFOPs de ST (Substituição Tributária)
    CFOPS_ST_ENTRADA = {'1401', '1403', '1407', '1408', '1409', '2401', '2403', '2407', '2408', '2409'}
    CFOPS_ST_SAIDA = {'5401', '5403', '5405', '5408', '5409', '6401', '6403', '6405', '6408', '6409'}
    
    # Processar entradas
    for doc in entradas:
        for prod in doc.get('produtos', []):
            ncm = str(prod.get('ncm', ''))[:8]
            codigo = prod.get('codigo', '')
            descricao = prod.get('descricao', '')[:50]
            key = f"{ncm}_{descricao[:30]}"
            
            cfop = str(prod.get('cfop', ''))
            aliq_icms = float(prod.get('p_icms', 0) or 0)
            v_icms = float(prod.get('v_icms', 0) or 0)
            valor = float(prod.get('valor_total', 0) or 0)
            cst = str(prod.get('cst_icms', '') or '')
            is_st = cfop in CFOPS_ST_ENTRADA or cst in ['10', '30', '60', '70']
            
            if key not in produtos_entrada:
                produtos_entrada[key] = {
                    'ncm': ncm,
                    'descricao': descricao,
                    'codigo': codigo,
                    'aliq_icms_media': 0,
                    'total_icms': 0,
                    'total_valor': 0,
                    'qtd_itens': 0,
                    'is_st': is_st,
                    'cfops': set(),
                    'csts': set()
                }
            
            produtos_entrada[key]['total_icms'] += v_icms
            produtos_entrada[key]['total_valor'] += valor
            produtos_entrada[key]['qtd_itens'] += 1
            produtos_entrada[key]['cfops'].add(cfop)
            produtos_entrada[key]['csts'].add(cst)
            if is_st:
                produtos_entrada[key]['is_st'] = True
    
    # Processar saídas
    for doc in saidas:
        for prod in doc.get('produtos', []):
            ncm = str(prod.get('ncm', ''))[:8]
            descricao = prod.get('descricao', '')[:50]
            key = f"{ncm}_{descricao[:30]}"
            
            cfop = str(prod.get('cfop', ''))
            aliq_icms = float(prod.get('p_icms', 0) or 0)
            v_icms = float(prod.get('v_icms', 0) or 0)
            valor = float(prod.get('valor_total', 0) or 0)
            cst = str(prod.get('cst_icms', '') or '')
            is_st = cfop in CFOPS_ST_SAIDA or cst in ['10', '30', '60', '70']
            
            if key not in produtos_saida:
                produtos_saida[key] = {
                    'ncm': ncm,
                    'descricao': descricao,
                    'aliq_icms_media': 0,
                    'total_icms': 0,
                    'total_valor': 0,
                    'qtd_itens': 0,
                    'is_st': is_st,
                    'cfops': set(),
                    'csts': set()
                }
            
            produtos_saida[key]['total_icms'] += v_icms
            produtos_saida[key]['total_valor'] += valor
            produtos_saida[key]['qtd_itens'] += 1
            produtos_saida[key]['cfops'].add(cfop)
            produtos_saida[key]['csts'].add(cst)
            if is_st:
                produtos_saida[key]['is_st'] = True
    
    # Calcular alíquota média de ICMS
    for key, prod in produtos_entrada.items():
        if prod['total_valor'] > 0:
            prod['aliq_icms_media'] = round((prod['total_icms'] / prod['total_valor']) * 100, 2)
    
    for key, prod in produtos_saida.items():
        if prod['total_valor'] > 0:
            prod['aliq_icms_media'] = round((prod['total_icms'] / prod['total_valor']) * 100, 2)
    
    # ===== IDENTIFICAR VILÕES TRIBUTÁRIOS =====
    viloes = []
    oportunidades = []
    
    # Cruzar produtos entrada x saída
    for key in set(produtos_entrada.keys()) & set(produtos_saida.keys()):
        entrada = produtos_entrada[key]
        saida = produtos_saida[key]
        
        aliq_entrada = entrada['aliq_icms_media']
        aliq_saida = saida['aliq_icms_media']
        icms_credito = entrada['total_icms']
        icms_debito = saida['total_icms']
        impacto = icms_debito - icms_credito
        
        # Vilão 1: Entrada com crédito menor que débito na saída (ex: entra 12%, sai 18%)
        if aliq_entrada > 0 and aliq_saida > 0 and aliq_entrada < aliq_saida and impacto > 0:
            viloes.append({
                'tipo': 'ALIQUOTA_DESFAVORAVEL',
                'ncm': entrada['ncm'],
                'descricao': entrada['descricao'],
                'aliq_entrada': aliq_entrada,
                'aliq_saida': aliq_saida,
                'diferenca_aliquota': round(aliq_saida - aliq_entrada, 2),
                'icms_credito': round(icms_credito, 2),
                'icms_debito': round(icms_debito, 2),
                'impacto_negativo': round(impacto, 2),
                'qtd_entrada': entrada['qtd_itens'],
                'qtd_saida': saida['qtd_itens'],
                'valor_entrada': round(entrada['total_valor'], 2),
                'valor_saida': round(saida['total_valor'], 2),
                'explicacao': f"Produto entra com {aliq_entrada}% de ICMS e sai com {aliq_saida}%. Diferença de {round(aliq_saida - aliq_entrada, 2)}% gera prejuízo tributário de R$ {round(impacto, 2)}"
            })
        
        # Vilão 2: Entrada ST (sem crédito) → Saída tributada (com débito)
        if entrada['is_st'] and not saida['is_st'] and icms_debito > 0:
            viloes.append({
                'tipo': 'ST_ENTRADA_TRIBUTADO_SAIDA',
                'ncm': entrada['ncm'],
                'descricao': entrada['descricao'],
                'aliq_entrada': 0,  # ST não gera crédito
                'aliq_saida': aliq_saida,
                'diferenca_aliquota': aliq_saida,
                'icms_credito': 0,
                'icms_debito': round(icms_debito, 2),
                'impacto_negativo': round(icms_debito, 2),
                'qtd_entrada': entrada['qtd_itens'],
                'qtd_saida': saida['qtd_itens'],
                'valor_entrada': round(entrada['total_valor'], 2),
                'valor_saida': round(saida['total_valor'], 2),
                'cfops_entrada': list(entrada['cfops']),
                'cfops_saida': list(saida['cfops']),
                'explicacao': f"Produto entra com ST (sem direito a crédito) mas sai tributado com {aliq_saida}% de ICMS. Todo débito de R$ {round(icms_debito, 2)} é prejuízo."
            })
        
        # Oportunidade: Entrada tributada → Saída ST (favorável)
        if not entrada['is_st'] and saida['is_st'] and icms_credito > 0:
            oportunidades.append({
                'tipo': 'TRIBUTADO_ENTRADA_ST_SAIDA',
                'ncm': entrada['ncm'],
                'descricao': entrada['descricao'],
                'aliq_entrada': aliq_entrada,
                'aliq_saida': 0,  # ST não gera débito
                'icms_credito': round(icms_credito, 2),
                'icms_debito': 0,
                'beneficio': round(icms_credito, 2),
                'qtd_entrada': entrada['qtd_itens'],
                'qtd_saida': saida['qtd_itens'],
                'explicacao': f"Produto entra tributado com crédito de R$ {round(icms_credito, 2)} e sai com ST (sem débito). Situação favorável!"
            })
        
        # Oportunidade: Alíquota favorável (entrada > saída)
        if aliq_entrada > aliq_saida and aliq_saida > 0 and icms_credito > icms_debito:
            beneficio = icms_credito - icms_debito
            oportunidades.append({
                'tipo': 'ALIQUOTA_FAVORAVEL',
                'ncm': entrada['ncm'],
                'descricao': entrada['descricao'],
                'aliq_entrada': aliq_entrada,
                'aliq_saida': aliq_saida,
                'diferenca_aliquota': round(aliq_entrada - aliq_saida, 2),
                'icms_credito': round(icms_credito, 2),
                'icms_debito': round(icms_debito, 2),
                'beneficio': round(beneficio, 2),
                'explicacao': f"Produto entra com {aliq_entrada}% e sai com {aliq_saida}%. Crédito maior que débito gera benefício de R$ {round(beneficio, 2)}"
            })
    
    # Ordenar vilões pelo impacto (maior primeiro)
    viloes = sorted(viloes, key=lambda x: x.get('impacto_negativo', 0), reverse=True)
    oportunidades = sorted(oportunidades, key=lambda x: x.get('beneficio', 0), reverse=True)
    
    # ===== ANÁLISE POR NCM =====
    analise_ncm = {}
    
    for key, prod in produtos_entrada.items():
        ncm = prod['ncm']
        if ncm not in analise_ncm:
            analise_ncm[ncm] = {
                'ncm': ncm,
                'descricao': prod['descricao'],
                'entrada_valor': 0,
                'entrada_icms': 0,
                'entrada_qtd': 0,
                'saida_valor': 0,
                'saida_icms': 0,
                'saida_qtd': 0,
                'saldo_icms': 0,
                'margem_icms': 0
            }
        analise_ncm[ncm]['entrada_valor'] += prod['total_valor']
        analise_ncm[ncm]['entrada_icms'] += prod['total_icms']
        analise_ncm[ncm]['entrada_qtd'] += prod['qtd_itens']
    
    for key, prod in produtos_saida.items():
        ncm = prod['ncm']
        if ncm not in analise_ncm:
            analise_ncm[ncm] = {
                'ncm': ncm,
                'descricao': prod['descricao'],
                'entrada_valor': 0,
                'entrada_icms': 0,
                'entrada_qtd': 0,
                'saida_valor': 0,
                'saida_icms': 0,
                'saida_qtd': 0,
                'saldo_icms': 0,
                'margem_icms': 0
            }
        analise_ncm[ncm]['saida_valor'] += prod['total_valor']
        analise_ncm[ncm]['saida_icms'] += prod['total_icms']
        analise_ncm[ncm]['saida_qtd'] += prod['qtd_itens']
    
    # Calcular saldo e margem
    for ncm, dados in analise_ncm.items():
        dados['saldo_icms'] = round(dados['saida_icms'] - dados['entrada_icms'], 2)
        dados['entrada_valor'] = round(dados['entrada_valor'], 2)
        dados['entrada_icms'] = round(dados['entrada_icms'], 2)
        dados['saida_valor'] = round(dados['saida_valor'], 2)
        dados['saida_icms'] = round(dados['saida_icms'], 2)
        # Margem = quanto % do valor de saída virou imposto líquido
        if dados['saida_valor'] > 0:
            dados['margem_icms'] = round((dados['saldo_icms'] / dados['saida_valor']) * 100, 2)
    
    analise_ncm_list = sorted(analise_ncm.values(), key=lambda x: x['saldo_icms'], reverse=True)
    
    # ===== RESUMO GERAL =====
    total_entrada_valor = sum(p['total_valor'] for p in produtos_entrada.values())
    total_entrada_icms = sum(p['total_icms'] for p in produtos_entrada.values())
    total_saida_valor = sum(p['total_valor'] for p in produtos_saida.values())
    total_saida_icms = sum(p['total_icms'] for p in produtos_saida.values())
    
    resumo = {
        'total_documentos': len(documents),
        'total_entradas': len(entradas),
        'total_saidas': len(saidas),
        'valor_entradas': round(total_entrada_valor, 2),
        'valor_saidas': round(total_saida_valor, 2),
        'credito_icms': round(total_entrada_icms, 2),
        'debito_icms': round(total_saida_icms, 2),
        'saldo_icms': round(total_saida_icms - total_entrada_icms, 2),
        'total_viloes': len(viloes),
        'impacto_viloes': round(sum(v.get('impacto_negativo', 0) for v in viloes), 2),
        'total_oportunidades': len(oportunidades),
        'beneficio_oportunidades': round(sum(o.get('beneficio', 0) for o in oportunidades), 2)
    }
    
    # ===== GERAR INSIGHTS COM IA =====
    insights_ia = None
    try:
        # Preparar contexto para a IA
        contexto = {
            'empresa': company.get('razao_social'),
            'regime_tributario': company.get('regime_tributario', 'lucro_real'),
            'atividade': company.get('tipo_atividade', 'comercio'),
            'uf': company.get('uf', 'SP'),
            'competencia': competencia,
            'resumo': resumo,
            'viloes_top5': viloes[:5],
            'oportunidades_top5': oportunidades[:5],
            'ncm_mais_impacto': analise_ncm_list[:5]
        }
        
        prompt = f"""Você é um especialista em tributação brasileira (ICMS, PIS, COFINS).
Analise os dados tributários da empresa e forneça insights estratégicos.

DADOS DA EMPRESA:
- Razão Social: {contexto['empresa']}
- Regime Tributário: {contexto['regime_tributario']}
- Atividade: {contexto['atividade']}
- UF: {contexto['uf']}
- Competência: {contexto['competencia']}

RESUMO TRIBUTÁRIO:
- Valor total de entradas: R$ {resumo['valor_entradas']:,.2f}
- Valor total de saídas: R$ {resumo['valor_saidas']:,.2f}
- Crédito de ICMS: R$ {resumo['credito_icms']:,.2f}
- Débito de ICMS: R$ {resumo['debito_icms']:,.2f}
- Saldo ICMS (a pagar): R$ {resumo['saldo_icms']:,.2f}
- Quantidade de "vilões tributários" identificados: {resumo['total_viloes']}
- Impacto negativo total dos vilões: R$ {resumo['impacto_viloes']:,.2f}

TOP 5 VILÕES TRIBUTÁRIOS (produtos com prejuízo tributário):
{json.dumps(contexto['viloes_top5'], ensure_ascii=False, indent=2)}

TOP 5 OPORTUNIDADES (produtos com situação favorável):
{json.dumps(contexto['oportunidades_top5'], ensure_ascii=False, indent=2)}

NCMs COM MAIOR IMPACTO NO ICMS:
{json.dumps(contexto['ncm_mais_impacto'], ensure_ascii=False, indent=2)}

Por favor, forneça:
1. PONTOS POSITIVOS (2-3 itens): Aspectos favoráveis da tributação da empresa
2. PONTOS DE ATENÇÃO (2-3 itens): Riscos ou problemas identificados
3. RECOMENDAÇÕES ESTRATÉGICAS (3-4 itens): Ações concretas para otimização tributária
4. ANÁLISE DE PRECIFICAÇÃO: Considerando os vilões tributários, sugira ajustes de markup/preço
5. OPORTUNIDADES LEGAIS: Benefícios fiscais ou regimes especiais que a empresa pode aproveitar

Seja direto, prático e específico para o perfil desta empresa. Use linguagem técnica mas acessível."""

        llm = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"analise_tributaria_{company_id}_{competencia}_{datetime.now().timestamp()}",
            system_message="Você é um consultor tributário especialista em legislação brasileira (ICMS, PIS, COFINS). Analise os dados e forneça insights estratégicos."
        ).with_model("openai", "gpt-4o")
        
        response = await llm.send_message(UserMessage(text=prompt))
        
        insights_ia = response if isinstance(response, str) else str(response)
        
    except Exception as e:
        logging.error(f"Erro ao gerar insights IA: {e}")
        insights_ia = f"Não foi possível gerar análise por IA: {str(e)}"
    
    # Converter sets para lists antes de retornar
    for v in viloes:
        if 'cfops_entrada' not in v:
            v['cfops_entrada'] = []
        if 'cfops_saida' not in v:
            v['cfops_saida'] = []
    
    return {
        "empresa": company.get('razao_social'),
        "competencia": competencia,
        "resumo": resumo,
        "viloes_tributarios": viloes[:20],  # Top 20 vilões
        "oportunidades": oportunidades[:20],  # Top 20 oportunidades
        "analise_por_ncm": analise_ncm_list[:30],  # Top 30 NCMs
        "insights_ia": insights_ia
    }


@api_router.post("/sped/exportar-e-validar/{company_id}")
async def exportar_e_validar_sped(
    company_id: str,
    competencia: str,
    excluir_creditos_despesa_st: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Exporta o SPED Fiscal e automaticamente valida confrontando o arquivo gerado
    com os dados do sistema.
    """
    company_doc = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company_doc:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    company = Company(**company_doc)
    
    # Buscar documentos da competência
    documents_cursor = db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia
    }, {"_id": 0})
    documents_data = await documents_cursor.to_list(10000)
    
    if not documents_data:
        raise HTTPException(status_code=404, detail=f"Nenhum documento encontrado para competência {competencia}")
    
    documents = [XMLDocument(**d) for d in documents_data]
    
    # Gerar o SPED
    periodo = competencia.replace('/', '')
    sped_content = generate_sped_fiscal(company, documents, competencia, excluir_creditos_despesa_st)
    
    # ===== VALIDAR O SPED GERADO =====
    # Parse do arquivo SPED para extrair totais
    sped_totais = {
        'entradas': {'por_cfop': {}, 'total_icms': 0, 'total_valor': 0},
        'saidas': {'por_cfop': {}, 'total_icms': 0, 'total_valor': 0},
        'apuracao': {'debitos': 0, 'creditos': 0, 'saldo': 0}
    }
    
    # Totais do sistema (banco de dados)
    sistema_totais = {
        'entradas': {'por_cfop': {}, 'total_icms': 0, 'total_valor': 0},
        'saidas': {'por_cfop': {}, 'total_icms': 0, 'total_valor': 0}
    }
    
    # CFOPs sem crédito
    CFOPS_SEM_CREDITO = {
        '1403', '1409', '2403', '2409', '3403', '3409',
        '1407', '2407', '1556', '2556', '1557', '2557',
        '1128', '2128', '1551', '2551', '1553', '2553',
        '1554', '2554', '1406', '2406', '1408', '2408'
    }
    
    # Calcular totais do sistema
    for doc in documents:
        tipo = 'entradas' if doc.tipo == 'entrada' else 'saidas'
        
        for prod in doc.produtos:
            cfop = str(prod.get('cfop', ''))
            valor = float(prod.get('valor_total', 0) or 0)
            v_icms = float(prod.get('v_icms', 0) or 0)
            
            sistema_totais[tipo]['total_valor'] += valor
            
            # Aplicar lógica de exclusão de créditos se necessário
            if tipo == 'entradas' and excluir_creditos_despesa_st and cfop in CFOPS_SEM_CREDITO:
                pass  # Não conta o ICMS
            else:
                sistema_totais[tipo]['total_icms'] += v_icms
            
            if cfop not in sistema_totais[tipo]['por_cfop']:
                sistema_totais[tipo]['por_cfop'][cfop] = {'valor': 0, 'icms': 0, 'qtd': 0}
            
            sistema_totais[tipo]['por_cfop'][cfop]['valor'] += valor
            sistema_totais[tipo]['por_cfop'][cfop]['icms'] += v_icms
            sistema_totais[tipo]['por_cfop'][cfop]['qtd'] += 1
    
    # Parse das linhas do SPED para extrair C100 e E110
    linhas = sped_content.split('\n')
    documento_atual = {'tipo': None, 'cfop': None}
    
    for linha in linhas:
        campos = linha.split('|')
        if len(campos) < 2:
            continue
        
        reg = campos[1] if len(campos) > 1 else ''
        
        # C100 - Documento (NF-e)
        if reg == 'C100':
            # |C100|IND_OPER|IND_EMIT|COD_PART|COD_MOD|COD_SIT|SER|NUM_DOC|CHV_NFE|...
            if len(campos) > 2:
                ind_oper = campos[2]  # 0=Entrada, 1=Saída
                documento_atual['tipo'] = 'entradas' if ind_oper == '0' else 'saidas'
        
        # C170 - Itens do documento
        elif reg == 'C170' and documento_atual['tipo']:
            # |C170|NUM_ITEM|COD_ITEM|DESCR_COMPL|QTD|UNID|VL_ITEM|VL_DESC|IND_MOV|CST_ICMS|CFOP|...
            if len(campos) > 11:
                cfop = campos[11]
                valor = float(campos[7].replace(',', '.')) if campos[7] else 0
                # ICMS está no campo 17 (VL_ICMS)
                v_icms = float(campos[17].replace(',', '.')) if len(campos) > 17 and campos[17] else 0
                
                tipo = documento_atual['tipo']
                sped_totais[tipo]['total_valor'] += valor
                sped_totais[tipo]['total_icms'] += v_icms
                
                if cfop not in sped_totais[tipo]['por_cfop']:
                    sped_totais[tipo]['por_cfop'][cfop] = {'valor': 0, 'icms': 0, 'qtd': 0}
                
                sped_totais[tipo]['por_cfop'][cfop]['valor'] += valor
                sped_totais[tipo]['por_cfop'][cfop]['icms'] += v_icms
                sped_totais[tipo]['por_cfop'][cfop]['qtd'] += 1
        
        # E110 - Apuração ICMS
        elif reg == 'E110':
            # |E110|VL_TOT_DEBITOS|VL_AJ_DEBITOS|VL_TOT_AJ_DEBITOS|VL_ESTORNOS_CRED|VL_TOT_CREDITOS|...
            if len(campos) > 6:
                sped_totais['apuracao']['debitos'] = float(campos[2].replace(',', '.')) if campos[2] else 0
                sped_totais['apuracao']['creditos'] = float(campos[6].replace(',', '.')) if campos[6] else 0
                sped_totais['apuracao']['saldo'] = sped_totais['apuracao']['debitos'] - sped_totais['apuracao']['creditos']
    
    # ===== COMPARAR E GERAR RELATÓRIO DE VALIDAÇÃO =====
    validacao = {
        'status': 'OK',
        'divergencias': [],
        'totais_sistema': {
            'entradas': {
                'valor': round(sistema_totais['entradas']['total_valor'], 2),
                'icms': round(sistema_totais['entradas']['total_icms'], 2),
                'cfops': len(sistema_totais['entradas']['por_cfop'])
            },
            'saidas': {
                'valor': round(sistema_totais['saidas']['total_valor'], 2),
                'icms': round(sistema_totais['saidas']['total_icms'], 2),
                'cfops': len(sistema_totais['saidas']['por_cfop'])
            }
        },
        'totais_sped': {
            'entradas': {
                'valor': round(sped_totais['entradas']['total_valor'], 2),
                'icms': round(sped_totais['entradas']['total_icms'], 2),
                'cfops': len(sped_totais['entradas']['por_cfop'])
            },
            'saidas': {
                'valor': round(sped_totais['saidas']['total_valor'], 2),
                'icms': round(sped_totais['saidas']['total_icms'], 2),
                'cfops': len(sped_totais['saidas']['por_cfop'])
            }
        },
        'comparativo_cfop': {
            'entradas': [],
            'saidas': []
        }
    }
    
    # Comparar por CFOP
    for tipo in ['entradas', 'saidas']:
        all_cfops = set(sistema_totais[tipo]['por_cfop'].keys()) | set(sped_totais[tipo]['por_cfop'].keys())
        
        for cfop in sorted(all_cfops):
            sistema_cfop = sistema_totais[tipo]['por_cfop'].get(cfop, {'valor': 0, 'icms': 0, 'qtd': 0})
            sped_cfop = sped_totais[tipo]['por_cfop'].get(cfop, {'valor': 0, 'icms': 0, 'qtd': 0})
            
            diff_valor = abs(round(sistema_cfop['valor'], 2) - round(sped_cfop['valor'], 2))
            diff_icms = abs(round(sistema_cfop['icms'], 2) - round(sped_cfop['icms'], 2))
            
            status_cfop = 'OK' if diff_valor < 0.01 and diff_icms < 0.01 else 'DIVERGENTE'
            
            if status_cfop == 'DIVERGENTE':
                validacao['status'] = 'DIVERGENTE'
                validacao['divergencias'].append({
                    'tipo': tipo,
                    'cfop': cfop,
                    'valor_sistema': round(sistema_cfop['valor'], 2),
                    'valor_sped': round(sped_cfop['valor'], 2),
                    'icms_sistema': round(sistema_cfop['icms'], 2),
                    'icms_sped': round(sped_cfop['icms'], 2)
                })
            
            validacao['comparativo_cfop'][tipo].append({
                'cfop': cfop,
                'sistema': {
                    'valor': round(sistema_cfop['valor'], 2),
                    'icms': round(sistema_cfop['icms'], 2),
                    'qtd': sistema_cfop['qtd']
                },
                'sped': {
                    'valor': round(sped_cfop['valor'], 2),
                    'icms': round(sped_cfop['icms'], 2),
                    'qtd': sped_cfop['qtd']
                },
                'status': status_cfop
            })
    
    # Gerar filename
    cnpj_limpo = company.cnpj.replace('.', '').replace('/', '').replace('-', '')
    filename = f"SPED_{cnpj_limpo}_{competencia.replace('/', '')}.txt"
    
    return {
        "filename": filename,
        "content": sped_content,
        "validacao": validacao
    }


@api_router.get("/export/csv/saida")
async def export_csv_saida(
    company_id: str, 
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """Exportar CSV de Saídas (Layout Personalizado)"""
    # Verify company access
    if current_user.role != UserRole.ADMIN:
        company = await db.companies.find_one({"id": company_id})
        if not company or company['cnpj'] not in current_user.company_ids:
             raise HTTPException(status_code=403, detail="Acesso negado")

    docs = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia,
        "tipo": "saida"
    }, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    csv_content = generate_csv_saida(docs)
    
    filename = f"saidas_{company_id}_{competencia.replace('/', '-')}.txt"
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/export/csv/entrada")
async def export_csv_entrada(
    company_id: str, 
    competencia: str,
    current_user: User = Depends(get_current_user)
):
    """Exportar CSV de Entradas (Layout Personalizado)"""
    # Verify company access
    if current_user.role != UserRole.ADMIN:
        company = await db.companies.find_one({"id": company_id})
        if not company or company['cnpj'] not in current_user.company_ids:
             raise HTTPException(status_code=403, detail="Acesso negado")

    docs = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia,
        "tipo": "entrada"
    }, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    csv_content = generate_csv_entrada(docs)
    
    filename = f"entradas_{company_id}_{competencia.replace('/', '-')}.txt"
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/cfop/initialize")
async def initialize_cfop_rules(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta ação")
    
    default_rules = [
        {"cfop": "1101", "descricao": "Compra para industrialização ou produção rural", "tipo_operacao": "entrada", "categoria": "insumo"},
        {"cfop": "1102", "descricao": "Compra para comercialização", "tipo_operacao": "entrada", "categoria": "revenda"},
        {"cfop": "1401", "descricao": "Compra para industrialização em operação com mercadoria sujeita ao regime de substituição tributária", "tipo_operacao": "entrada", "categoria": "insumo_st"},
        {"cfop": "1403", "descricao": "Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária", "tipo_operacao": "entrada", "categoria": "revenda_st"},
        {"cfop": "1407", "descricao": "Compra de mercadoria para uso ou consumo cuja mercadoria está sujeita ao regime de substituição tributária", "tipo_operacao": "entrada", "categoria": "despesa_st"},
        {"cfop": "1152", "descricao": "Transferência para comercialização", "tipo_operacao": "entrada", "categoria": "transferencia"},
        {"cfop": "1556", "descricao": "Compra de material para uso ou consumo", "tipo_operacao": "entrada", "categoria": "despesa"},
        {"cfop": "1653", "descricao": "Compra de combustível ou lubrificante por consumidor ou usuário final", "tipo_operacao": "entrada", "categoria": "combustivel"},
        {"cfop": "2101", "descricao": "Compra para industrialização ou produção rural - Interestadual", "tipo_operacao": "entrada", "categoria": "insumo"},
        {"cfop": "2102", "descricao": "Compra para comercialização - Interestadual", "tipo_operacao": "entrada", "categoria": "revenda"},
        {"cfop": "2401", "descricao": "Compra para industrialização em operação com mercadoria sujeita ao regime de substituição tributária - Interestadual", "tipo_operacao": "entrada", "categoria": "insumo_st"},
        {"cfop": "2403", "descricao": "Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária - Interestadual", "tipo_operacao": "entrada", "categoria": "revenda_st"},
        {"cfop": "2407", "descricao": "Compra de mercadoria para uso ou consumo cuja mercadoria está sujeita ao regime de substituição tributária - Interestadual", "tipo_operacao": "entrada", "categoria": "despesa_st"},
        {"cfop": "2152", "descricao": "Transferência para comercialização - Interestadual", "tipo_operacao": "entrada", "categoria": "transferencia"},
        {"cfop": "2556", "descricao": "Compra de material para uso ou consumo - Interestadual", "tipo_operacao": "entrada", "categoria": "despesa"},
        {"cfop": "2653", "descricao": "Compra de combustível ou lubrificante por consumidor ou usuário final - Interestadual", "tipo_operacao": "entrada", "categoria": "combustivel"},
        {"cfop": "5101", "descricao": "Venda de produção do estabelecimento", "tipo_operacao": "saida", "categoria": "revenda"},
        {"cfop": "5102", "descricao": "Venda de mercadoria adquirida ou recebida de terceiros", "tipo_operacao": "saida", "categoria": "revenda"},
        {"cfop": "5405", "descricao": "Venda de mercadoria adquirida ou recebida de terceiros em operação com mercadoria sujeita ao regime de substituição tributária", "tipo_operacao": "saida", "categoria": "revenda_st"},
        {"cfop": "5152", "descricao": "Transferência de mercadoria adquirida ou recebida de terceiros", "tipo_operacao": "saida", "categoria": "transferencia"},
    ]
    
    inserted = 0
    for rule_data in default_rules:
        existing = await db.cfop_rules.find_one({"cfop": rule_data['cfop']}, {"_id": 0})
        if not existing:
            rule = CFOPRule(**rule_data)
            doc = rule.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.cfop_rules.insert_one(doc)
            inserted += 1
    
    return {"message": f"{inserted} regras CFOP criadas com sucesso"}

@api_router.post("/db/reset")
async def reset_database(current_user: User = Depends(get_current_user)):
    """Zera todas as tabelas do banco de dados (exceto usuários)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta ação")
    
    # Deletar todas as collections (exceto users)
    deleted_counts = {}
    
    # Empresas
    result = await db.companies.delete_many({})
    deleted_counts['companies'] = result.deleted_count
    
    # Documentos XML
    result = await db.xml_documents.delete_many({})
    deleted_counts['xml_documents'] = result.deleted_count
    
    # Regras CFOP
    result = await db.cfop_rules.delete_many({})
    deleted_counts['cfop_rules'] = result.deleted_count
    
    # Exceções de validação
    result = await db.validation_exceptions.delete_many({})
    deleted_counts['validation_exceptions'] = result.deleted_count
    
    # Regras aprendidas
    result = await db.learned_rules.delete_many({})
    deleted_counts['learned_rules'] = result.deleted_count
    
    return {
        "message": "Base de dados zerada com sucesso!",
        "deleted": deleted_counts,
        "nota": "Os usuários foram mantidos. Faça login novamente."
    }

# ============== NOVOS ENDPOINTS PARA IA E RECLASSIFICAÇÃO ==============

async def get_ai_chat(session_id: str, system_message: str):
    """Cria uma instância do chat com IA"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Chave de IA não configurada")
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message
    ).with_model("openai", "gpt-4o")
    
    return chat

@api_router.get("/reclassification/documents/{company_id}")
async def get_documents_for_reclassification(
    company_id: str,
    competencia: str,
    tipo: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Lista documentos para reclassificação com contagem sequencial"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    query = {"company_id": company_id, "competencia": competencia}
    if tipo:
        query['tipo'] = tipo
    
    documents = await db.xml_documents.find(query, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    # Adicionar contagem sequencial
    for idx, doc in enumerate(documents, 1):
        doc['numero_sequencial'] = idx
        if isinstance(doc['uploaded_at'], str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
        
        # Adicionar contagem sequencial aos produtos
        for prod_idx, prod in enumerate(doc.get('produtos', []), 1):
            prod['numero_sequencial'] = prod_idx
            prod['id_unico'] = f"{doc['id']}_{prod.get('codigo', prod_idx)}"
    
    return {
        "total_documentos": len(documents),
        "documentos": documents
    }

@api_router.get("/reclassification/products/{company_id}")
async def get_products_grouped(
    company_id: str,
    competencia: str,
    tipo: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Lista produtos agrupados por código para reclassificação em lote"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    query = {"company_id": company_id, "competencia": competencia}
    if tipo:
        query['tipo'] = tipo
    
    documents = await db.xml_documents.find(query, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    # Agrupar produtos por código
    produtos_agrupados = defaultdict(lambda: {
        'codigo': '',
        'descricao': '',
        'ncm': '',
        'cfop_atual': '',
        'categoria_atual': '',
        'quantidade_total': 0,
        'valor_total': 0,
        'ocorrencias': 0,
        'documentos': [],
        'produtos_ids': []
    })
    
    for doc in documents:
        for prod in doc.get('produtos', []):
            codigo = prod.get('codigo', 'SEM_CODIGO')
            grupo = produtos_agrupados[codigo]
            grupo['codigo'] = codigo
            grupo['descricao'] = prod.get('descricao', '')
            grupo['ncm'] = prod.get('ncm', '')
            grupo['cfop_atual'] = prod.get('cfop', '')
            grupo['categoria_atual'] = prod.get('categoria_classificada', 'não classificado')
            grupo['quantidade_total'] += prod.get('quantidade', 0)
            grupo['valor_total'] += prod.get('valor_total', 0)
            grupo['ocorrencias'] += 1
            grupo['documentos'].append({
                'doc_id': doc['id'],
                'numero_nfe': doc['numero_nfe'],
                'data_emissao': doc['data_emissao']
            })
            grupo['produtos_ids'].append(f"{doc['id']}_{codigo}")
    
    # Converter para lista e adicionar número sequencial
    produtos_lista = []
    for idx, (codigo, dados) in enumerate(sorted(produtos_agrupados.items()), 1):
        dados['numero_sequencial'] = idx
        produtos_lista.append(dados)
    
    return {
        "total_produtos": len(produtos_lista),
        "produtos": produtos_lista
    }

@api_router.get("/learned-rules/{company_id}")
async def get_learned_rules(
    company_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lista regras aprendidas pela IA para uma empresa"""
    rules = await db.learned_rules.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    return rules

@api_router.put("/ai/learned-rules/{rule_id}")
async def update_learned_rule(
    rule_id: str,
    categoria: str,
    cfop: str = None,
    motivo: str = None,
    current_user: User = Depends(get_current_user)
):
    """Atualiza uma regra aprendida pela IA"""
    rule = await db.learned_rules.find_one({"id": rule_id}, {"_id": 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    
    update_data = {
        "categoria": categoria,
        "updated_at": datetime.utcnow().isoformat()
    }
    if cfop:
        update_data["cfop"] = cfop
    if motivo:
        update_data["motivo"] = motivo
    
    await db.learned_rules.update_one(
        {"id": rule_id},
        {"$set": update_data}
    )
    
    return {"message": "Regra atualizada com sucesso"}

@api_router.delete("/ai/learned-rules/{rule_id}")
async def delete_learned_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Exclui uma regra aprendida pela IA"""
    rule = await db.learned_rules.find_one({"id": rule_id}, {"_id": 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    
    await db.learned_rules.delete_one({"id": rule_id})
    
    return {"message": "Regra excluída com sucesso"}

@api_router.delete("/ai/learned-rules/company/{company_id}")
async def delete_all_learned_rules(
    company_id: str,
    current_user: User = Depends(get_current_user)
):
    """Exclui todas as regras aprendidas de uma empresa"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir todas as regras")
    
    result = await db.learned_rules.delete_many({"company_id": company_id})
    
    return {"message": f"{result.deleted_count} regra(s) excluída(s) com sucesso"}

@api_router.post("/products/reclassify-manual")
async def reclassify_product_manual(
    request: ManualReclassificationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Reclassifica manualmente um produto em um documento.
    Atualiza a categoria (REVENDA/INSUMO/DESPESA) e o CFOP correspondente.
    Salva a reclassificação como regra aprendida para futuras importações.
    """
    # Buscar documento
    doc = await db.xml_documents.find_one({"id": request.document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    # Verificar se o índice é válido
    produtos = doc.get('produtos', [])
    if request.product_index < 0 or request.product_index >= len(produtos):
        raise HTTPException(status_code=400, detail=f"Índice de produto inválido. O documento tem {len(produtos)} produtos.")
    
    produto = produtos[request.product_index]
    categoria = request.nova_categoria.lower()
    
    if categoria not in ['revenda', 'insumo', 'despesa', 'combustivel']:
        raise HTTPException(status_code=400, detail="Categoria deve ser: revenda, insumo, despesa ou combustivel")
    
    # Buscar empresa para determinar UF
    company = await db.companies.find_one({"id": doc['company_id']}, {"_id": 0})
    company_uf = company.get('uf', 'SP') if company else 'SP'
    
    # Determinar prefixo do CFOP (1=estadual, 2=interestadual)
    cfop_original = str(produto.get('cfop', ''))
    cfop_prefix = cfop_original[0] if cfop_original else '1'
    
    # Verificar se é ST
    cst = str(produto.get('cst', ''))
    is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
    
    # Mapear categoria para CFOP
    if categoria == 'revenda':
        novo_cfop = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
    elif categoria == 'insumo':
        novo_cfop = (cfop_prefix + '401') if is_st else (cfop_prefix + '101')
    elif categoria == 'despesa':
        novo_cfop = (cfop_prefix + '407') if is_st else (cfop_prefix + '556')
    elif categoria == 'combustivel':
        novo_cfop = cfop_prefix + '653'
    else:
        novo_cfop = cfop_prefix + '102'
    
    cfop_anterior = produto.get('cfop', '')
    categoria_anterior = produto.get('categoria_classificada', 'não classificado')
    
    # Atualizar produto no documento
    produtos[request.product_index]['cfop'] = novo_cfop
    produtos[request.product_index]['cfop_anterior'] = cfop_anterior
    produtos[request.product_index]['categoria_classificada'] = categoria
    produtos[request.product_index]['reclassificado_por'] = current_user.email
    produtos[request.product_index]['reclassificado_em'] = datetime.now(timezone.utc).isoformat()
    produtos[request.product_index]['justificativa_reclassificacao'] = request.motivo or f"Reclassificado manualmente de {categoria_anterior} para {categoria}"
    
    # Atualizar documento no banco
    await db.xml_documents.update_one(
        {"id": request.document_id},
        {"$set": {"produtos": produtos}}
    )
    
    # Salvar como regra aprendida para futuras importações
    descricao = produto.get('descricao', '')
    if descricao:
        existing_rule = await db.learned_rules.find_one({
            "company_id": doc['company_id'],
            "produto_descricao": descricao
        })
        
        if existing_rule:
            # Atualizar regra existente
            await db.learned_rules.update_one(
                {"id": existing_rule['id']},
                {"$set": {
                    "categoria_correta": categoria,
                    "cfop_correto": novo_cfop,
                    "motivo": request.motivo or f"Reclassificado manualmente por {current_user.email}",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user.email
                }}
            )
        else:
            # Criar nova regra
            rule = {
                "id": str(uuid.uuid4()),
                "company_id": doc['company_id'],
                "produto_descricao": descricao,
                "produto_codigo": produto.get('codigo', ''),
                "ncm": produto.get('ncm', ''),
                "categoria_correta": categoria,
                "cfop_correto": novo_cfop,
                "motivo": request.motivo or f"Reclassificado manualmente por {current_user.email}",
                "aprendido_de": "manual_reclassification",
                "created_by": current_user.email,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.learned_rules.insert_one(rule)
    
    return {
        "success": True,
        "produto": {
            "descricao": descricao,
            "codigo": produto.get('codigo', ''),
            "categoria_anterior": categoria_anterior,
            "categoria_nova": categoria,
            "cfop_anterior": cfop_anterior,
            "cfop_novo": novo_cfop
        },
        "regra_aprendida": bool(descricao),
        "message": f"Produto reclassificado de {categoria_anterior.upper()} para {categoria.upper()}"
    }

@api_router.post("/ai/reclassify")
async def ai_reclassify_products(
    request: ReclassificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Reclassifica produtos usando IA baseado em instrução do usuário"""
    company = await db.companies.find_one({"id": request.company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Buscar regras aprendidas
    learned_rules = await db.learned_rules.find({"company_id": request.company_id}, {"_id": 0}).to_list(1000)
    
    # Buscar documentos da competência
    query = {"company_id": request.company_id, "competencia": request.competencia}
    documents = await db.xml_documents.find(query, {"_id": 0}).to_list(10000)
    
    if not documents:
        raise HTTPException(status_code=404, detail="Nenhum documento encontrado para esta competência")
    
    # Preparar dados para a IA
    produtos_para_analise = []
    for doc in documents:
        for prod in doc.get('produtos', []):
            prod_id = f"{doc['id']}_{prod.get('codigo', '')}"
            if not request.product_ids or prod_id in request.product_ids:
                produtos_para_analise.append({
                    'doc_id': doc['id'],
                    'produto_id': prod_id,
                    'codigo': prod.get('codigo', ''),
                    'descricao': prod.get('descricao', ''),
                    'ncm': prod.get('ncm', ''),
                    'cfop_atual': prod.get('cfop', ''),
                    'categoria_atual': prod.get('categoria_classificada', ''),
                    'cst': prod.get('cst', ''),
                    'valor_total': prod.get('valor_total', 0)
                })
    
    # Criar prompt para IA
    system_message = """Você é um especialista em classificação fiscal brasileira.
Sua tarefa é analisar produtos e reclassificar seus CFOPs e categorias baseado nas instruções do usuário.

Regras de CFOP:
- Prefixo 1: Operações internas (dentro do estado)
- Prefixo 2: Operações interestaduais
- 1101/2101: Compra para industrialização (INSUMO)
- 1102/2102: Compra para comercialização (REVENDA)
- 1401/2401: Compra para industrialização com ST (INSUMO_ST)
- 1403/2403: Compra para comercialização com ST (REVENDA_ST)
- 1407/2407: Compra para uso/consumo com ST (DESPESA_ST)
- 1556/2556: Compra para uso/consumo (DESPESA)
- 1653/2653: Compra de combustível (COMBUSTIVEL)

Categorias válidas: revenda, insumo, despesa, combustivel, revenda_st, insumo_st, despesa_st

Responda APENAS com um JSON válido no formato:
{
    "reclassificacoes": [
        {
            "produto_id": "id do produto",
            "cfop_novo": "novo cfop",
            "categoria_nova": "nova categoria",
            "motivo": "explicação breve"
        }
    ],
    "regras_aprendidas": [
        {
            "descricao_produto": "padrão de descrição",
            "categoria": "categoria a aplicar",
            "cfop": "cfop a aplicar",
            "motivo": "regra para memorizar"
        }
    ]
}"""
    
    # Contexto com regras aprendidas
    regras_contexto = ""
    if learned_rules:
        regras_contexto = "\n\nRegras já aprendidas para esta empresa:\n"
        for rule in learned_rules[:20]:
            regras_contexto += f"- Produtos como '{rule.get('produto_descricao', '')}' devem ser classificados como {rule.get('categoria_correta', '')} (CFOP {rule.get('cfop_correto', '')})\n"
    
    user_prompt = f"""Empresa: {company.get('razao_social', '')}
CNAE: {company.get('cnae_principal', '')} - {company.get('cnae_principal_descricao', '')}
Produtos comercializados: {', '.join(company.get('produtos_comercializados', []))}
Insumos de produção: {', '.join(company.get('insumos_producao', []))}
Produtos de despesa: {', '.join(company.get('produtos_despesa', []))}
{regras_contexto}

INSTRUÇÃO DO USUÁRIO: {request.instrucao_usuario}

Produtos para análise:
{json.dumps(produtos_para_analise[:50], ensure_ascii=False, indent=2)}

Analise os produtos e aplique a instrução do usuário. Retorne o JSON com as reclassificações."""
    
    try:
        chat = await get_ai_chat(
            session_id=f"reclassify_{request.company_id}_{datetime.now().timestamp()}",
            system_message=system_message
        )
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        # Extrair JSON da resposta
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text)
        
        # Aplicar reclassificações se solicitado
        reclassificacoes_aplicadas = []
        if request.aplicar_em_lote and result.get('reclassificacoes'):
            for reclass in result['reclassificacoes']:
                prod_id = reclass.get('produto_id', '')
                if '_' in prod_id:
                    doc_id = prod_id.rsplit('_', 1)[0]
                    
                    # Atualizar produto no documento
                    doc = await db.xml_documents.find_one({"id": doc_id}, {"_id": 0})
                    if doc:
                        produtos_atualizados = []
                        for prod in doc.get('produtos', []):
                            current_prod_id = f"{doc_id}_{prod.get('codigo', '')}"
                            if current_prod_id == prod_id:
                                prod['cfop'] = reclass.get('cfop_novo', prod.get('cfop', ''))
                                prod['categoria_classificada'] = reclass.get('categoria_nova', '')
                                prod['reclassificado_por_ia'] = True
                                prod['motivo_reclassificacao'] = reclass.get('motivo', '')
                            produtos_atualizados.append(prod)
                        
                        await db.xml_documents.update_one(
                            {"id": doc_id},
                            {"$set": {"produtos": produtos_atualizados}}
                        )
                        reclassificacoes_aplicadas.append(reclass)
        
        # Salvar regras aprendidas
        regras_salvas = []
        if result.get('regras_aprendidas'):
            for regra in result['regras_aprendidas']:
                learned_rule = LearnedRule(
                    company_id=request.company_id,
                    produto_descricao=regra.get('descricao_produto', ''),
                    categoria_correta=regra.get('categoria', ''),
                    cfop_correto=regra.get('cfop', ''),
                    motivo=regra.get('motivo', ''),
                    aprendido_de='ai_suggestion',
                    created_by=current_user.id
                )
                doc = learned_rule.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.learned_rules.insert_one(doc)
                regras_salvas.append(regra)
        
        return {
            "success": True,
            "reclassificacoes": result.get('reclassificacoes', []),
            "reclassificacoes_aplicadas": len(reclassificacoes_aplicadas),
            "regras_aprendidas": regras_salvas,
            "mensagem": f"Processados {len(produtos_para_analise)} produtos. {len(reclassificacoes_aplicadas)} reclassificações aplicadas. {len(regras_salvas)} novas regras aprendidas."
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Erro ao processar resposta da IA: {str(e)}",
            "resposta_raw": response_text if 'response_text' in dir() else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise com IA: {str(e)}")

class SmartReclassifyRequest(BaseModel):
    company_id: str
    competencia: str
    comando: str  # Ex: "reclassificar todas as esponjas como revenda"
    aplicar: bool = True  # Aplicar as alterações imediatamente
    sobrepor_regras: bool = True  # Sobrepor regras existentes

@api_router.post("/ai/smart-reclassify")
async def ai_smart_reclassify(
    request: SmartReclassifyRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Reclassificação inteligente em lote usando busca semântica.
    A IA identifica produtos relacionados ao termo buscado e reclassifica todos de uma vez.
    """
    company = await db.companies.find_one({"id": request.company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Buscar todos os documentos da competência
    query = {"company_id": request.company_id, "competencia": request.competencia}
    documents = await db.xml_documents.find(query, {"_id": 0}).to_list(10000)
    
    if not documents:
        raise HTTPException(status_code=404, detail="Nenhum documento encontrado")
    
    # Coletar todos os produtos únicos
    produtos_unicos = {}
    for doc in documents:
        for idx, prod in enumerate(doc.get('produtos', [])):
            codigo = prod.get('codigo', f"sem_codigo_{idx}")
            if codigo not in produtos_unicos:
                produtos_unicos[codigo] = {
                    'codigo': codigo,
                    'descricao': prod.get('descricao', ''),
                    'ncm': prod.get('ncm', ''),
                    'categoria_atual': prod.get('categoria_classificada', 'não classificado'),
                    'cfop_atual': prod.get('cfop', ''),
                    'ocorrencias': []
                }
            produtos_unicos[codigo]['ocorrencias'].append({
                'doc_id': doc['id'],
                'idx': idx
            })
    
    # Preparar lista de produtos para a IA analisar
    lista_produtos = []
    for codigo, prod in produtos_unicos.items():
        lista_produtos.append({
            'codigo': codigo,
            'descricao': prod['descricao'],
            'ncm': prod['ncm'],
            'categoria_atual': prod['categoria_atual'],
            'qtd_ocorrencias': len(prod['ocorrencias'])
        })
    
    # Prompt para a IA identificar produtos relacionados e classificar
    system_message = """Você é um especialista em classificação fiscal e busca semântica de produtos.

Sua tarefa é:
1. Analisar o comando do usuário para entender quais produtos ele quer reclassificar
2. Usar busca SEMÂNTICA (não apenas exata) para encontrar todos os produtos relacionados
3. Considerar sinônimos, variações, abreviações e termos relacionados

Exemplos de busca semântica:
- "esponja" deve encontrar: esponja de aço, esponja multiuso, bucha, esponja limpeza, esponja abrasiva
- "papel" deve encontrar: papel toalha, papel higiênico, papel sulfite, papel A4, folha de papel
- "limpeza" deve encontrar: detergente, desinfetante, água sanitária, sabão, limpa vidro

Categorias válidas:
- REVENDA: produtos para revender (CFOP 1102/2102 ou 1403/2403 se ST)
- INSUMO: matéria-prima para produção (CFOP 1101/2101 ou 1401/2401 se ST)
- DESPESA: uso e consumo da empresa (CFOP 1556/2556 ou 1407/2407 se ST)
- ATIVO_IMOBILIZADO: bens duráveis (CFOP 1551/2551 ou 1406/2406 se ST)
- COMBUSTIVEL: combustíveis (CFOP 1653/2653)

Responda APENAS com JSON válido no formato:
{
    "termo_buscado": "termo extraído do comando",
    "categoria_destino": "CATEGORIA em maiúsculo",
    "cfop_padrao": "CFOP padrão para esta categoria",
    "produtos_encontrados": [
        {"codigo": "código", "descricao": "descrição", "motivo_match": "por que este produto foi selecionado"}
    ],
    "regra_para_memorizar": {
        "padrao": "padrão de descrição para aplicar em futuros produtos",
        "categoria": "CATEGORIA",
        "cfop": "CFOP"
    }
}"""

    user_prompt = f"""Empresa: {company.get('razao_social', '')}
Atividade: {company.get('cnae_principal_descricao', '')}

COMANDO DO USUÁRIO: "{request.comando}"

Lista de produtos disponíveis (total: {len(lista_produtos)}):
{json.dumps(lista_produtos[:100], ensure_ascii=False, indent=2)}

Analise o comando e identifique TODOS os produtos que correspondem semanticamente ao termo buscado.
Seja abrangente na busca - inclua variações, sinônimos e produtos relacionados."""

    try:
        chat = await get_ai_chat(
            session_id=f"smart_reclassify_{request.company_id}_{datetime.now().timestamp()}",
            system_message=system_message
        )
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        # Extrair JSON da resposta
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text)
        
        produtos_reclassificados = []
        
        if request.aplicar and result.get('produtos_encontrados'):
            categoria_nova = result.get('categoria_destino', '').lower()
            cfop_novo = result.get('cfop_padrao', '')
            
            # Aplicar reclassificação em lote
            for prod_match in result['produtos_encontrados']:
                codigo = prod_match.get('codigo', '')
                if codigo in produtos_unicos:
                    prod_info = produtos_unicos[codigo]
                    
                    # Determinar CFOP baseado em estadual/interestadual
                    for occ in prod_info['ocorrencias']:
                        doc = await db.xml_documents.find_one({"id": occ['doc_id']})
                        if doc:
                            produtos = doc.get('produtos', [])
                            if occ['idx'] < len(produtos):
                                cfop_atual = produtos[occ['idx']].get('cfop', '')
                                is_interestadual = cfop_atual.startswith('2') if cfop_atual else False
                                
                                # Calcular CFOP correto
                                prefix = '2' if is_interestadual else '1'
                                cfop_map = {
                                    'revenda': prefix + '102',
                                    'revenda_st': prefix + '403',
                                    'insumo': prefix + '101',
                                    'insumo_st': prefix + '401',
                                    'despesa': prefix + '556',
                                    'despesa_st': prefix + '407',
                                    'ativo_imobilizado': prefix + '551',
                                    'ativo_imobilizado_st': prefix + '406',
                                    'combustivel': prefix + '653',
                                }
                                cfop_aplicar = cfop_map.get(categoria_nova, cfop_novo or prefix + '102')
                                
                                # Atualizar produto
                                produtos[occ['idx']]['categoria_classificada'] = categoria_nova.upper()
                                produtos[occ['idx']]['cfop'] = cfop_aplicar
                                produtos[occ['idx']]['reclassificado_por_ia'] = True
                                produtos[occ['idx']]['motivo_reclassificacao'] = f"Smart reclassify: {request.comando}"
                                produtos[occ['idx']]['justificativa'] = f"IA identificou como '{prod_match.get('motivo_match', 'relacionado ao termo buscado')}'"
                                
                                await db.xml_documents.update_one(
                                    {"id": occ['doc_id']},
                                    {"$set": {"produtos": produtos}}
                                )
                    
                    produtos_reclassificados.append({
                        'codigo': codigo,
                        'descricao': prod_info['descricao'],
                        'categoria_nova': categoria_nova.upper(),
                        'ocorrencias_atualizadas': len(prod_info['ocorrencias']),
                        'motivo': prod_match.get('motivo_match', '')
                    })
            
            # Salvar regra para aplicação futura (sobrepondo existentes se solicitado)
            if result.get('regra_para_memorizar'):
                regra = result['regra_para_memorizar']
                
                if request.sobrepor_regras:
                    # Remover regras existentes com padrão similar
                    await db.learned_rules.delete_many({
                        "company_id": request.company_id,
                        "produto_descricao": {"$regex": regra.get('padrao', ''), "$options": "i"}
                    })
                
                # Inserir nova regra
                await db.learned_rules.insert_one({
                    "id": str(uuid.uuid4()),
                    "company_id": request.company_id,
                    "produto_descricao": regra.get('padrao', result.get('termo_buscado', '')),
                    "categoria_correta": regra.get('categoria', categoria_nova).upper(),
                    "cfop_correto": regra.get('cfop', cfop_novo),
                    "motivo": f"Regra automática: {request.comando}",
                    "aprendido_de": "smart_reclassify",
                    "created_by": current_user.id,
                    "created_at": datetime.now(timezone.utc)
                })
        
        return {
            "success": True,
            "termo_buscado": result.get('termo_buscado', ''),
            "categoria_destino": result.get('categoria_destino', ''),
            "total_produtos_encontrados": len(result.get('produtos_encontrados', [])),
            "produtos_reclassificados": produtos_reclassificados,
            "regra_memorizada": result.get('regra_para_memorizar'),
            "mensagem": f"Encontrados {len(result.get('produtos_encontrados', []))} produtos. {len(produtos_reclassificados)} reclassificados."
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Erro ao processar resposta da IA: {str(e)}",
            "resposta_raw": response_text if 'response_text' in dir() else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na reclassificação inteligente: {str(e)}")

@api_router.post("/ai/validate-taxes")
async def ai_validate_taxes(
    request: TaxValidationRequest,
    current_user: User = Depends(get_current_user)
):
    """Valida PIS, COFINS e ICMS com base legal usando IA"""
    company = await db.companies.find_one({"id": request.company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    query = {"company_id": request.company_id, "competencia": request.competencia}
    if request.document_ids:
        query['id'] = {"$in": request.document_ids}
    
    documents = await db.xml_documents.find(query, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    if not documents:
        raise HTTPException(status_code=404, detail="Nenhum documento encontrado")
    
    # Preparar produtos para análise
    produtos_para_validar = []
    for doc in documents:
        for prod in doc.get('produtos', []):
            produtos_para_validar.append({
                'doc_id': doc['id'],
                'numero_nfe': doc['numero_nfe'],
                'codigo': prod.get('codigo', ''),
                'descricao': prod.get('descricao', ''),
                'ncm': prod.get('ncm', ''),
                'cfop': prod.get('cfop', ''),
                'cst': prod.get('cst', ''),
                'valor_total': prod.get('valor_total', 0),
                'v_icms': prod.get('v_icms', 0),
                'v_pis': prod.get('v_pis', 0),
                'v_cofins': prod.get('v_cofins', 0)
            })
    
    system_message = """Você é um especialista em tributação brasileira (ICMS, PIS e COFINS).
Sua tarefa é analisar produtos e identificar inconsistências tributárias, fornecendo base legal.

REGRAS IMPORTANTES SOBRE ALÍQUOTA ZERO DE PIS/COFINS:
Produtos com ALÍQUOTA ZERO (não geram crédito nem débito):
- Cesta básica: arroz, feijão, açúcar, farinha de trigo, pão, leite, carnes, ovos, óleo de soja
- Hortifrutigranjeiros: frutas, verduras, legumes
- Insumos agropecuários: sementes, fertilizantes, defensivos
- Produtos farmacêuticos (alguns NCMs específicos)
- Papel imune para impressão de periódicos

NCMs com ALÍQUOTA ZERO de PIS/COFINS (principais):
- NCM 0201-0210 (carnes)
- NCM 0401-0407 (laticínios e ovos)
- NCM 0701-0714 (hortaliças)
- NCM 0801-0814 (frutas)
- NCM 1001-1008 (cereais)
- NCM 1101-1109 (farinha de trigo e derivados)
- NCM 1501-1517 (óleos vegetais)
- NCM 1901 (massas alimentícias)

QUANDO V_PIS = 0 E V_COFINS = 0 PODE SER CORRETO SE:
1. Produto tem alíquota zero prevista em lei
2. Produto está isento (ex: exportação)
3. CST de PIS/COFINS indica não tributado (04, 05, 06, 07, 08, 09)
NÃO APONTE ERRO SE O PRODUTO FOR DA LISTA ACIMA COM VALORES ZERADOS!

ALÍQUOTAS DE ICMS POR ESTADO (operações internas):
- SP, MG, RJ, PR: 18%
- SC, RS: 17%
- Demais estados: 17% ou 18%
- Produtos da cesta básica: 7% ou isentos em muitos estados
- Medicamentos: 12% ou isentos
- Alíquota interestadual Sul/Sudeste → outros estados: 7%
- Alíquota interestadual outros estados → Sul/Sudeste: 12%

Base legal comum:
- Lei 10.637/2002 (PIS não-cumulativo)
- Lei 10.833/2003 (COFINS não-cumulativo)
- Lei 10.865/2004 Art. 8º (Alíquota Zero)
- Decreto 8.426/2015 (Lista de produtos alíquota zero)
- Lei Complementar 87/96 (Lei Kandir - ICMS)
- Convênio ICMS 142/2018 (Substituição Tributária)

Responda APENAS com um JSON válido:
{
    "analise": [
        {
            "produto_codigo": "código",
            "produto_descricao": "descrição",
            "ncm": "ncm",
            "status": "ok|inconsistente",
            "inconsistencias": [
                {
                    "tipo": "PIS|COFINS|ICMS",
                    "valor_atual": 0,
                    "valor_esperado": 0,
                    "descricao": "descrição do problema"
                }
            ],
            "base_legal": ["referências legais"],
            "sugestao_correcao": "o que deve ser feito"
        }
    ],
    "resumo": {
        "total_analisados": 0,
        "com_inconsistencias": 0,
        "corretos": 0,
        "aliquota_zero_identificados": 0,
        "principais_problemas": ["lista de problemas mais comuns"]
    }
}"""
    
    uf_empresa = company.get('uf', 'SP')
    
    user_prompt = f"""Empresa: {company.get('razao_social', '')}
CNAE: {company.get('cnae_principal', '')} - {company.get('cnae_principal_descricao', '')}
UF DA EMPRESA: {uf_empresa}

ATENÇÃO: A empresa está localizada em {uf_empresa}. Use as alíquotas de ICMS corretas para este estado.
- Alíquota interna de {uf_empresa}: {'18%' if uf_empresa in ['SP', 'MG', 'RJ', 'PR'] else '17%'}
- Considere também produtos da cesta básica com alíquotas reduzidas (7%) ou isentos

Validar: PIS={request.validar_pis}, COFINS={request.validar_cofins}, ICMS={request.validar_icms}

Produtos para análise ({len(produtos_para_validar)} itens):
{json.dumps(produtos_para_validar[:30], ensure_ascii=False, indent=2)}

IMPORTANTE: 
1. Verifique o NCM de cada produto antes de apontar erro em PIS/COFINS zerados
2. Produtos alimentícios e da cesta básica frequentemente têm alíquota zero - isso NÃO é erro
3. Para ICMS, considere o estado {uf_empresa} e o tipo de produto

Analise os tributos e identifique APENAS inconsistências reais, não aponte como erro produtos com alíquota zero legitimamente aplicada."""
    
    try:
        chat = await get_ai_chat(
            session_id=f"validate_taxes_{request.company_id}_{datetime.now().timestamp()}",
            system_message=system_message
        )
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        # Extrair JSON
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text)
        
        return {
            "success": True,
            "analise": result.get('analise', []),
            "resumo": result.get('resumo', {}),
            "total_produtos_analisados": len(produtos_para_validar)
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Erro ao processar resposta: {str(e)}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na validação: {str(e)}")

@api_router.post("/ai/apply-tax-corrections")
async def apply_tax_corrections(
    company_id: str,
    competencia: str,
    corrections: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user)
):
    """Aplica correções de impostos em lote"""
    applied = 0
    for correction in corrections:
        doc_id = correction.get('doc_id')
        produto_codigo = correction.get('produto_codigo')
        
        doc = await db.xml_documents.find_one({"id": doc_id}, {"_id": 0})
        if doc:
            produtos_atualizados = []
            for prod in doc.get('produtos', []):
                if prod.get('codigo') == produto_codigo:
                    if 'v_pis_corrigido' in correction:
                        prod['v_pis'] = correction['v_pis_corrigido']
                    if 'v_cofins_corrigido' in correction:
                        prod['v_cofins'] = correction['v_cofins_corrigido']
                    if 'v_icms_corrigido' in correction:
                        prod['v_icms'] = correction['v_icms_corrigido']
                    prod['corrigido_por_ia'] = True
                    prod['data_correcao'] = datetime.now(timezone.utc).isoformat()
                    applied += 1
                produtos_atualizados.append(prod)
            
            await db.xml_documents.update_one(
                {"id": doc_id},
                {"$set": {"produtos": produtos_atualizados}}
            )
    
    return {"success": True, "correcoes_aplicadas": applied}

class AnaliseTributariaRequest(BaseModel):
    company_id: str
    competencia: str

async def internal_analise_tributaria(
    request: AnaliseTributariaRequest
):
    """Gera análise tributária completa usando IA"""
    company = await db.companies.find_one({"id": request.company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    regime = company.get('regime_tributario', 'lucro_presumido')
    tipo_atividade = company.get('tipo_atividade', 'comercio')
    uf_empresa = company.get('uf', 'SP')
    
    # Buscar documentos
    docs_entrada = await db.xml_documents.find({
        "company_id": request.company_id,
        "competencia": request.competencia,
        "tipo": "entrada"
    }, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    docs_saida = await db.xml_documents.find({
        "company_id": request.company_id,
        "competencia": request.competencia,
        "tipo": "saida"
    }, {"_id": 0, "xml_content": 0}).to_list(10000)
    
    if len(docs_entrada) == 0 and len(docs_saida) == 0:
        raise HTTPException(status_code=404, detail="Nenhum documento encontrado para esta competência")
    
    # ============ ANÁLISE DETALHADA DE ENTRADAS (CRÉDITOS) ============
    total_entradas = sum(d.get('valor_total', 0) for d in docs_entrada)
    
    # Créditos separados por imposto
    credito_icms_tributado = 0
    credito_icms_st = 0  # ST não dá crédito
    credito_pis_tributado = 0
    credito_pis_aliquota_zero = 0
    credito_pis_sem_incidencia = 0
    credito_cofins_tributado = 0
    credito_cofins_aliquota_zero = 0
    credito_cofins_sem_incidencia = 0
    
    # Análise de CFOPs de entrada
    cfops_interestadual = 0
    cfops_interno = 0
    valor_interestadual = 0
    valor_interno = 0
    
    # Base de crédito (apenas produtos com direito a crédito)
    base_credito_pis_cofins = 0
    
    for doc in docs_entrada:
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            ncm = str(prod.get('ncm', ''))
            cst = str(prod.get('cst', ''))
            cst_pis = str(prod.get('cst_pis_calculado', prod.get('cst_pis', '')))
            valor = float(prod.get('valor_total', 0) or 0)
            v_pis = float(prod.get('v_pis', 0) or 0)
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            
            # Classificar CFOP
            if cfop.startswith('2'):
                cfops_interestadual += 1
                valor_interestadual += valor
            elif cfop.startswith('1'):
                cfops_interno += 1
                valor_interno += valor
            
            # ICMS - ST não dá crédito (CST 10, 30, 60, 70)
            if cst in ['10', '30', '60', '70'] or 'ST' in cfop.upper():
                credito_icms_st += float(prod.get('v_icms', 0) or 0)
            else:
                credito_icms_tributado += float(prod.get('v_icms', 0) or 0)
            
            # PIS/COFINS - Usar CST calculado
            if cst_pis == '98' or cfop in CFOPS_ENTRADA_SEM_INCIDENCIA:
                # Sem incidência (CST 98)
                credito_pis_sem_incidencia += valor
                credito_cofins_sem_incidencia += valor
            elif cst_pis == '73' or prod.get('ncm_aliq_zero', False) or is_ncm_aliquota_zero(ncm):
                # Alíquota zero (CST 73)
                credito_pis_aliquota_zero += valor
                credito_cofins_aliquota_zero += valor
            elif cst_pis == '50' or (cfop in CFOPS_COM_CREDITO_PIS_COFINS and regime == 'lucro_real'):
                # Com crédito (CST 50) - apenas Lucro Real
                credito_pis_tributado += v_pis
                credito_cofins_tributado += v_cofins
                base_credito_pis_cofins += valor
            else:
                # CST 70 ou outro - sem crédito
                credito_pis_aliquota_zero += valor
                credito_cofins_aliquota_zero += valor
    
    # ============ ANÁLISE DETALHADA DE SAÍDAS (DÉBITOS/FATURAMENTO) ============
    total_saidas = sum(d.get('valor_total', 0) for d in docs_saida)
    total_servicos = sum(d.get('valor_servicos', 0) for d in docs_saida)
    total_vendas = total_saidas - total_servicos
    
    # Débitos separados por imposto
    debito_icms_tributado = 0
    debito_icms_st = 0
    debito_icms_isento = 0
    debito_pis_tributado = 0
    debito_pis_aliquota_zero = 0
    debito_pis_sem_incidencia = 0
    debito_cofins_tributado = 0
    debito_cofins_aliquota_zero = 0
    debito_cofins_sem_incidencia = 0
    
    valor_vendas_st = 0
    valor_vendas_tributado = 0
    valor_vendas_isento = 0
    
    # Base de débito (apenas produtos tributados)
    base_debito_pis_cofins = 0
    
    for doc in docs_saida:
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            ncm = str(prod.get('ncm', ''))
            cst = str(prod.get('cst', ''))
            cst_pis = str(prod.get('cst_pis_calculado', prod.get('cst_pis', '')))
            valor = float(prod.get('valor_total', 0) or 0)
            v_pis = float(prod.get('v_pis', 0) or 0)
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            
            # Classificar ICMS de saída
            if cst in ['10', '30', '60', '70'] or 'ST' in cfop.upper():
                debito_icms_st += float(prod.get('v_icms', 0) or 0)
                valor_vendas_st += valor
            elif cst in ['40', '41', '50'] or float(prod.get('v_icms', 0) or 0) == 0:
                debito_icms_isento += float(prod.get('v_icms', 0) or 0)
                valor_vendas_isento += valor
            else:
                debito_icms_tributado += float(prod.get('v_icms', 0) or 0)
                valor_vendas_tributado += valor
            
            # PIS/COFINS de saída - Usar CST calculado
            if cst_pis == '49' or cfop in CFOPS_SAIDA_SEM_INCIDENCIA:
                # Sem incidência (CST 49)
                debito_pis_sem_incidencia += valor
                debito_cofins_sem_incidencia += valor
            elif cst_pis == '06' or prod.get('ncm_aliq_zero', False) or is_ncm_aliquota_zero(ncm):
                # Alíquota zero (CST 06)
                debito_pis_aliquota_zero += valor
                debito_cofins_aliquota_zero += valor
            else:
                # Tributado (CST 01)
                debito_pis_tributado += valor
                debito_cofins_tributado += valor
                base_debito_pis_cofins += valor
    
    # ============ CÁLCULOS FISCAIS ============
    total_cfops = cfops_interestadual + cfops_interno
    percentual_interestadual = (cfops_interestadual / total_cfops * 100) if total_cfops > 0 else 0
    
    # Percentuais de faturamento
    percentual_servicos = (total_servicos / total_saidas * 100) if total_saidas > 0 else 0
    percentual_vendas = (total_vendas / total_saidas * 100) if total_saidas > 0 else 0
    
    # Percentuais das vendas
    percentual_vendas_st = (valor_vendas_st / total_vendas * 100) if total_vendas > 0 else 0
    percentual_vendas_tributado = (valor_vendas_tributado / total_vendas * 100) if total_vendas > 0 else 0
    percentual_vendas_isento = (valor_vendas_isento / total_vendas * 100) if total_vendas > 0 else 0
    
    # Percentual PIS/COFINS tributado vs alíquota zero/sem incidência
    total_pis_saida_base = debito_pis_tributado + debito_pis_aliquota_zero + debito_pis_sem_incidencia
    total_cofins_saida_base = debito_cofins_tributado + debito_cofins_aliquota_zero + debito_cofins_sem_incidencia
    percentual_pis_tributado = (debito_pis_tributado / total_pis_saida_base * 100) if total_pis_saida_base > 0 else 0
    percentual_cofins_tributado = (debito_cofins_tributado / total_cofins_saida_base * 100) if total_cofins_saida_base > 0 else 0
    
    # Alíquotas de PIS/COFINS conforme regime
    if regime == 'lucro_real':
        aliq_pis = 0.0165  # 1.65%
        aliq_cofins = 0.076  # 7.6%
    else:
        aliq_pis = 0.0065  # 0.65%
        aliq_cofins = 0.03  # 3%
    
    # Calcular débitos de PIS/COFINS sobre a base tributada
    debito_pis_calculado = base_debito_pis_cofins * aliq_pis
    debito_cofins_calculado = base_debito_pis_cofins * aliq_cofins
    
    # Calcular créditos de PIS/COFINS sobre a base com crédito (apenas Lucro Real)
    credito_pis_calculado = base_credito_pis_cofins * aliq_pis if regime == 'lucro_real' else 0
    credito_cofins_calculado = base_credito_pis_cofins * aliq_cofins if regime == 'lucro_real' else 0
    
    # Créditos efetivos (descontando ST e alíquota zero)
    credito_icms_efetivo = credito_icms_tributado
    credito_pis_efetivo = credito_pis_calculado
    credito_cofins_efetivo = credito_cofins_calculado
    
    # Débitos efetivos
    debito_icms_efetivo = debito_icms_tributado
    debito_pis_efetivo = debito_pis_calculado
    debito_cofins_efetivo = debito_cofins_calculado
    
    # Apuração
    icms_a_pagar = max(0, debito_icms_efetivo - credito_icms_efetivo)
    pis_a_pagar = max(0, debito_pis_efetivo - credito_pis_efetivo)
    cofins_a_pagar = max(0, debito_cofins_efetivo - credito_cofins_efetivo)
    
    # Markup
    markup_medio = ((total_saidas / total_entradas - 1) * 100) if total_entradas > 0 else 0
    
    # Carga tributária efetiva
    total_impostos = icms_a_pagar + pis_a_pagar + cofins_a_pagar
    carga_tributaria = (total_impostos / total_saidas * 100) if total_saidas > 0 else 0
    
    # ============ CÁLCULO IRPJ/CSLL (Lucro Presumido) ============
    irpj_devido = 0
    csll_devido = 0
    
    if regime == 'lucro_presumido':
        perc_irpj = company.get('percentual_presuncao_irpj', 8.0) / 100
        perc_csll = company.get('percentual_presuncao_csll', 12.0) / 100
        
        base_irpj = total_saidas * perc_irpj
        base_csll = total_saidas * perc_csll
        
        irpj_devido = base_irpj * 0.15  # 15%
        if base_irpj > 20000:  # Adicional de 10% sobre excedente
            irpj_devido += (base_irpj - 20000) * 0.10
        csll_devido = base_csll * 0.09  # 9%
    
    # ============ PONTO DE EQUILÍBRIO (Lucro Real) ============
    ponto_equilibrio = None
    if regime == 'lucro_real':
        estoque_inicial = company.get('estoque_inicial', 0)
        estoque_final = company.get('estoque_final', 0)
        cmv = total_entradas + estoque_inicial - estoque_final
        lucro_bruto = total_saidas - cmv
        # Despesa necessária para zerar lucro = Lucro Bruto - Impostos
        despesa_ponto_equilibrio = lucro_bruto - total_impostos
        
        ponto_equilibrio = {
            "faturamento": total_saidas,
            "cmv": cmv,
            "lucro_bruto": lucro_bruto,
            "impostos_apurados": total_impostos,
            "despesa_para_equilibrio": max(0, despesa_ponto_equilibrio),
            "estoque_inicial": estoque_inicial,
            "estoque_final": estoque_final
        }
    
    # ============ PREPARAR DADOS PARA IA ============
    resumo_dados = {
        "empresa": company.get('razao_social', ''),
        "regime_tributario": regime,
        "tipo_atividade": tipo_atividade,
        "uf": uf_empresa,
        "competencia": request.competencia,
        "faturamento": {
            "total": total_saidas,
            "servicos": total_servicos,
            "vendas": total_vendas,
            "percentual_servicos": round(percentual_servicos, 1),
            "percentual_vendas": round(percentual_vendas, 1)
        },
        "vendas_por_tributacao": {
            "st": valor_vendas_st,
            "tributado": valor_vendas_tributado,
            "isento": valor_vendas_isento,
            "percentual_st": round(percentual_vendas_st, 1),
            "percentual_tributado": round(percentual_vendas_tributado, 1),
            "percentual_isento": round(percentual_vendas_isento, 1)
        },
        "creditos": {
            "icms_tributado": round(credito_icms_tributado, 2),
            "icms_st_sem_credito": round(credito_icms_st, 2),
            "pis_base": round(base_credito_pis_cofins, 2),
            "pis_calculado": round(credito_pis_calculado, 2),
            "pis_aliquota_zero": round(credito_pis_aliquota_zero, 2),
            "pis_sem_incidencia": round(credito_pis_sem_incidencia, 2),
            "cofins_base": round(base_credito_pis_cofins, 2),
            "cofins_calculado": round(credito_cofins_calculado, 2),
            "cofins_aliquota_zero": round(credito_cofins_aliquota_zero, 2),
            "cofins_sem_incidencia": round(credito_cofins_sem_incidencia, 2)
        },
        "debitos": {
            "icms_tributado": round(debito_icms_tributado, 2),
            "icms_st": round(debito_icms_st, 2),
            "icms_isento": round(debito_icms_isento, 2),
            "pis_base": round(base_debito_pis_cofins, 2),
            "pis_calculado": round(debito_pis_calculado, 2),
            "pis_aliquota_zero": round(debito_pis_aliquota_zero, 2),
            "pis_sem_incidencia": round(debito_pis_sem_incidencia, 2),
            "cofins_base": round(base_debito_pis_cofins, 2),
            "cofins_calculado": round(debito_cofins_calculado, 2),
            "cofins_aliquota_zero": round(debito_cofins_aliquota_zero, 2),
            "cofins_sem_incidencia": round(debito_cofins_sem_incidencia, 2)
        },
        "apuracao": {
            "icms_a_pagar": round(icms_a_pagar, 2),
            "pis_a_pagar": round(pis_a_pagar, 2),
            "cofins_a_pagar": round(cofins_a_pagar, 2),
            "total_impostos": round(total_impostos, 2)
        },
        "percentuais_pis_cofins": {
            "pis_tributado": round(percentual_pis_tributado, 1),
            "cofins_tributado": round(percentual_cofins_tributado, 1)
        }
    }
    
    if regime == 'lucro_presumido':
        resumo_dados["irpj_csll"] = {
            "irpj_devido": round(irpj_devido, 2),
            "csll_devido": round(csll_devido, 2),
            "percentual_presuncao_irpj": company.get('percentual_presuncao_irpj', 8.0),
            "percentual_presuncao_csll": company.get('percentual_presuncao_csll', 12.0)
        }
    
    if ponto_equilibrio:
        resumo_dados["ponto_equilibrio"] = ponto_equilibrio
    
    system_message = """Você é um consultor tributário sênior especializado em análise fiscal brasileira.
Sua tarefa é analisar os dados fiscais de uma empresa e gerar insights estratégicos.

INDICADORES IMPORTANTES A ANALISAR:
1. Percentual de compras interestaduais vs internas (impacto no DIFAL)
2. Fornecedores do Simples Nacional (sem direito a crédito de ICMS)
3. Diferencial de alíquotas (entrada 12% vs saída 18%)
4. Clientes do Simples Nacional (não aplicam redução de base de cálculo)
5. Análise de markup (margem praticada vs carga tributária)
6. Carga tributária efetiva sobre faturamento
7. Oportunidades de economia fiscal
8. Riscos de compliance

ALÍQUOTAS DE ICMS POR ESTADO:
- SP, MG, RJ, PR: 18%
- SC, RS: 17%
- Interestadual Sul/Sudeste → outros: 7%
- Interestadual outros → Sul/Sudeste: 12%

Responda APENAS com um JSON válido no formato:
{
    "indicadores": {
        "percentual_interestadual": 0,
        "percentual_simples_nacional": 0,
        "diferencial_aliquota": 0,
        "markup_medio": 0,
        "carga_tributaria": 0,
        "total_creditos": 0,
        "total_debitos": 0,
        "clientes_simples_nacional": 0
    },
    "alertas": [
        {
            "tipo": "critico|atencao|oportunidade|info",
            "titulo": "título do alerta",
            "descricao": "descrição detalhada",
            "impacto": "valor ou percentual estimado",
            "base_legal": "referência legal se aplicável"
        }
    ],
    "recomendacoes": [
        {
            "titulo": "título da recomendação",
            "descricao": "o que fazer",
            "economia_potencial": 0,
            "prazo": "curto/médio/longo prazo"
        }
    ],
    "markup": {
        "minimo": 0,
        "medio": 0,
        "maximo": 0,
        "analise": "análise da margem praticada"
    }
}"""
    
    user_prompt = f"""Analise os dados fiscais da empresa e gere insights estratégicos:

DADOS DA EMPRESA:
{json.dumps(resumo_dados, ensure_ascii=False, indent=2)}

AMOSTRA DE PRODUTOS DE ENTRADA (primeiros 20):
{json.dumps([{
    'descricao': p.get('descricao', ''),
    'cfop': p.get('cfop', ''),
    'ncm': p.get('ncm', ''),
    'valor': p.get('valor_total', 0),
    'icms': p.get('v_icms', 0)
} for d in docs_entrada[:5] for p in d.get('produtos', [])[:4]], ensure_ascii=False, indent=2)}

AMOSTRA DE PRODUTOS DE SAÍDA (primeiros 20):
{json.dumps([{
    'descricao': p.get('descricao', ''),
    'cfop': p.get('cfop', ''),
    'ncm': p.get('ncm', ''),
    'valor': p.get('valor_total', 0),
    'icms': p.get('v_icms', 0)
} for d in docs_saida[:5] for p in d.get('produtos', [])[:4]], ensure_ascii=False, indent=2)}

GERE:
1. Indicadores calculados baseados nos dados reais
2. Alertas sobre situações que merecem atenção
3. Recomendações estratégicas com economia potencial
4. Análise de markup considerando a carga tributária

Seja específico e use os valores reais fornecidos."""
    
    try:
        chat = await get_ai_chat(
            session_id=f"analise_tributaria_{request.company_id}_{datetime.now().timestamp()}",
            system_message=system_message
        )
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        # Extrair JSON
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text)
        
        # Retornar dados calculados + análise da IA
        return {
            "success": True,
            "regime_tributario": regime,
            "dados_calculados": resumo_dados,
            "indicadores_ia": result.get('indicadores', {}),
            "alertas": result.get('alertas', []),
            "recomendacoes": result.get('recomendacoes', []),
            "markup": result.get('markup', {}),
            "ponto_equilibrio": ponto_equilibrio,
            "irpj_csll": resumo_dados.get('irpj_csll'),
            "notas_processadas": {
                "entrada": len(docs_entrada),
                "saida": len(docs_saida)
            }
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Erro ao processar resposta: {str(e)}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")

def get_cfop_from_category(categoria: str, cst: str, company_uf: str, cfop_original: str, emitente_uf: str = '') -> str:
    """Helper para converter categoria (IA) em CFOP"""
    is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
    
    # Prefixo Inteligente
    if emitente_uf and emitente_uf != company_uf:
        cfop_prefix = '2'
    else:
        cfop_prefix = '1'
    
    if categoria == 'combustivel':
        return cfop_prefix + '653'
    elif categoria == 'ativo_imobilizado':
        return (cfop_prefix + '406') if is_st else (cfop_prefix + '551')
    elif categoria == 'revenda':
        return (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
    elif categoria == 'insumo':
        return (cfop_prefix + '401') if is_st else (cfop_prefix + '101')
    elif categoria == 'despesa':
        return (cfop_prefix + '407') if is_st else (cfop_prefix + '556')
    return None

def apply_classification(product, result, cfop_original, file_conversions):
    """Aplica o resultado da classificação ao produto"""
    product['cfop_sugerido'] = result['cfop_sugerido']
    product['cfop_original'] = cfop_original
    product['categoria_classificada'] = result['categoria']
    product['justificativa_ia'] = result.get('justificativa', '')
    
    # APLICAR AUTOMATICAMENTE O CFOP SUGERIDO
    product['cfop'] = result['cfop_sugerido']
    
    # Registrar conversão
    file_conversions.append({
        'produto': product.get('descricao', ''),
        'codigo': product.get('codigo', ''),
        'cfop_original': cfop_original,
        'cfop_convertido': result['cfop_sugerido'],
        'categoria': result['categoria'],
        'motivo': result.get('justificativa', f"Classificado como {result['categoria'].upper()}")
    })

async def get_ai_chat(session_id: str, system_message: str):
    emergent_key = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-bE6955669B918F9301')
    return LlmChat(
        api_key=emergent_key,
        session_id=session_id,
        system_message=system_message
    )

# ============================================================================
# CACHE DE CLASSIFICAÇÕES - Para acelerar uploads recorrentes
# ============================================================================

def normalize_product_key(descricao: str) -> str:
    """Normaliza descrição do produto para usar como chave de cache"""
    import unicodedata
    # Remover acentos, converter para minúsculas, remover caracteres especiais
    text = unicodedata.normalize('NFD', descricao.lower())
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = ' '.join(text.split())  # Normalizar espaços
    return text

async def get_cached_classification(company_id: str, descricao: str) -> Optional[Dict]:
    """Busca classificação no cache (learned_rules)"""
    normalized_key = normalize_product_key(descricao)
    
    # Buscar por descrição normalizada similar
    rules = await db.learned_rules.find({
        "company_id": company_id
    }, {"_id": 0}).to_list(1000)
    
    for rule in rules:
        rule_key = normalize_product_key(rule.get('produto_descricao', ''))
        # Match exato ou substring significativa
        if rule_key == normalized_key or (len(rule_key) > 5 and rule_key in normalized_key) or (len(normalized_key) > 5 and normalized_key in rule_key):
            return {
                "categoria": rule['categoria_correta'],
                "cfop": rule['cfop_correto'],
                "justificativa": f"Memorizado: {rule.get('motivo', 'Classificação anterior')}"
            }
    return None

async def save_classification_to_cache(company_id: str, product: Dict, categoria: str, cfop: str, justificativa: str, created_by: str = "system"):
    """Salva classificação no cache para uso futuro"""
    # Verificar se já existe
    existing = await db.learned_rules.find_one({
        "company_id": company_id,
        "produto_descricao": product.get('descricao', '')
    })
    
    if not existing:
        rule = {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "produto_descricao": product.get('descricao', ''),
            "produto_codigo": product.get('codigo', ''),
            "ncm": product.get('ncm', ''),
            "categoria_correta": categoria,
            "cfop_correto": cfop,
            "motivo": justificativa,
            "aprendido_de": "ai_classification",
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.learned_rules.insert_one(rule)

async def classify_products_with_cache(products: List[Dict], company_id: str, company_data: Dict, emitente_uf: str = '') -> tuple:
    """
    Classifica produtos usando cache primeiro, depois IA para os não-cacheados.
    Retorna: (resultados_classificados, stats)
    """
    results = {}
    stats = {
        "total": len(products),
        "from_cache": 0,
        "from_ai": 0,
        "from_rules": 0
    }
    
    products_for_ai = []
    company_uf = company_data.get('uf', 'SP')
    
    for idx, product in enumerate(products):
        product['_temp_id'] = str(idx)
        descricao = product.get('descricao', '')
        
        # 1. Verificar cache primeiro
        cached = await get_cached_classification(company_id, descricao)
        if cached:
            results[str(idx)] = cached
            stats["from_cache"] += 1
            continue
        
        # 2. Verificar regras diretas (keywords exatas)
        produtos_comercializados = company_data.get('produtos_comercializados', [])
        insumos_producao = company_data.get('insumos_producao', [])
        produtos_despesa = company_data.get('produtos_despesa', [])
        
        categoria, justificativa = classify_product_category(
            descricao,
            product.get('ncm', ''),
            produtos_comercializados,
            insumos_producao,
            produtos_despesa
        )
        
        is_strong_match = "cadastrado" in justificativa.lower()
        
        if is_strong_match:
            # Prefixo baseado em UF
            cfop_prefix = '2' if (emitente_uf and emitente_uf != company_uf) else '1'
            cst = product.get('cst', '')
            is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
            
            if categoria == 'revenda':
                cfop = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
            elif categoria == 'insumo':
                cfop = (cfop_prefix + '401') if is_st else (cfop_prefix + '101')
            elif categoria == 'despesa':
                cfop = (cfop_prefix + '407') if is_st else (cfop_prefix + '556')
            elif categoria == 'combustivel':
                cfop = cfop_prefix + '653'
            else:
                cfop = cfop_prefix + '102'
            
            results[str(idx)] = {
                "categoria": categoria,
                "cfop": cfop,
                "justificativa": justificativa
            }
            stats["from_rules"] += 1
            continue
        
        # 3. Enviar para IA
        products_for_ai.append(product)
    
    # Classificar com IA os produtos restantes
    if products_for_ai:
        ai_results = await classify_products_batch_llm(products_for_ai, company_data)
        
        for product in products_for_ai:
            p_id = product.get('_temp_id')
            if p_id in ai_results:
                ai_result = ai_results[p_id]
                categoria = ai_result['categoria']
                
                # Calcular CFOP
                cfop_prefix = '2' if (emitente_uf and emitente_uf != company_uf) else '1'
                cst = product.get('cst', '')
                is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
                
                if categoria == 'revenda':
                    cfop = (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
                elif categoria == 'insumo':
                    cfop = (cfop_prefix + '401') if is_st else (cfop_prefix + '101')
                elif categoria == 'despesa':
                    cfop = (cfop_prefix + '407') if is_st else (cfop_prefix + '556')
                elif categoria == 'combustivel':
                    cfop = cfop_prefix + '653'
                elif categoria == 'ativo_imobilizado':
                    cfop = (cfop_prefix + '406') if is_st else (cfop_prefix + '551')
                else:
                    cfop = cfop_prefix + '102'
                
                justificativa = f"IA ({categoria.upper()}): {ai_result['justificativa']}"
                
                results[p_id] = {
                    "categoria": categoria,
                    "cfop": cfop,
                    "justificativa": justificativa
                }
                
                # Salvar no cache para próximas vezes
                await save_classification_to_cache(
                    company_id, product, categoria, cfop, justificativa
                )
                
                stats["from_ai"] += 1
            else:
                # Fallback
                cfop_prefix = '2' if (emitente_uf and emitente_uf != company_uf) else '1'
                results[p_id] = {
                    "categoria": "revenda",
                    "cfop": cfop_prefix + '102',
                    "justificativa": "Classificação padrão (revenda)"
                }
    
    return results, stats

async def classify_products_batch_llm(products: List[Dict[str, Any]], company_data: Dict[str, Any], batch_size: int = 20) -> Dict[str, Any]:
    """
    Classifica uma lista de produtos usando LLM com base nas regras da empresa.
    PRIORIDADE: Palavras-chave cadastradas na empresa têm MÁXIMA prioridade.
    """
    if not products:
        return {}
        
    classified_results = {}
    
    # Extrair palavras-chave cadastradas (com destaque para importância)
    revenda_keywords = company_data.get('produtos_comercializados', [])
    insumo_keywords = company_data.get('insumos_producao', [])
    despesa_keywords = company_data.get('produtos_despesa', [])
    ativo_keywords = company_data.get('ativo_imobilizado', [])
    combustivel_keywords = company_data.get('combustivel', [])
    
    # Construir contexto da empresa com ênfase nas palavras-chave
    context = f"""Você é um especialista em classificação fiscal de produtos.

=== EMPRESA ===
Nome: {company_data.get('razao_social', 'N/A')}
Atividade: {company_data.get('tipo_atividade', 'comercio')}
CNAE: {company_data.get('cnae_principal_descricao', 'N/A')}

=== REGRAS ABSOLUTAS DE CLASSIFICAÇÃO (MÁXIMA PRIORIDADE) ===
O cliente cadastrou as seguintes palavras-chave para classificação. 
Se o produto corresponder a QUALQUER uma destas palavras-chave, USE ESSA CLASSIFICAÇÃO.
Use correspondência SEMÂNTICA - não precisa ser exata, produtos relacionados também devem ser incluídos.

🛒 REVENDA (produtos para comercialização): 
{', '.join(revenda_keywords) if revenda_keywords else '(nenhum cadastrado)'}

⚙️ INSUMO (matéria-prima para produção): 
{', '.join(insumo_keywords) if insumo_keywords else '(nenhum cadastrado)'}

📋 DESPESA (uso e consumo da empresa): 
{', '.join(despesa_keywords) if despesa_keywords else '(nenhum cadastrado)'}

🏭 ATIVO IMOBILIZADO (bens permanentes): 
{', '.join(ativo_keywords) if ativo_keywords else '(nenhum cadastrado)'}

⛽ COMBUSTÍVEL: 
{', '.join(combustivel_keywords) if combustivel_keywords else '(nenhum cadastrado)'}

=== REGRAS GERAIS (se não houver match com palavras-chave) ===
- DESPESA: materiais de limpeza, escritório, manutenção, uso interno
- ATIVO_IMOBILIZADO: máquinas, equipamentos, veículos, móveis, computadores
- COMBUSTIVEL: gasolina, diesel, etanol, GNV
- INSUMO: matéria-prima para produção/industrialização
- REVENDA: produtos para revenda (padrão para empresas comerciais)

=== IMPORTANTE ===
1. Se o produto tem QUALQUER relação com as palavras-chave cadastradas, USE essa classificação
2. Use busca SEMÂNTICA (sinônimos, variações, termos relacionados)
3. Exemplo: se "esponja" está em REVENDA, então "esponja de aço", "bucha", "esponja multiuso" também são REVENDA
4. Na justificativa, indique qual palavra-chave você usou como referência

Responda APENAS um JSON válido:
{{
    "resultados": [
        {{
            "id": "id_do_produto",
            "categoria": "revenda|insumo|despesa|ativo_imobilizado|combustivel",
            "justificativa": "Baseado em [palavra-chave] cadastrada como [categoria]" ou "Regra geral: [motivo]"
        }}
    ]
}}"""
    
    # Adicionar ID temporário para cada produto para garantir mapeamento correto
    for idx, p in enumerate(products):
        p['_temp_id'] = str(idx)
    
    for i in range(0, len(products), batch_size):
        batch = products[i:i+batch_size]
        
        batch_prompt = "Classifique estes produtos:\n" + json.dumps([{
            'id': p['_temp_id'],
            'descricao': p['descricao'],
            'ncm': p['ncm']
        } for p in batch], ensure_ascii=False)
        
        try:
            chat = await get_ai_chat(session_id=f"classification_{uuid.uuid4()}", system_message=context)
            response = await chat.send_message(UserMessage(text=batch_prompt))
            
            # Extrair JSON
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
                
            result = json.loads(response_text)
            
            for item in result.get('resultados', []):
                classified_results[item['id']] = {
                    "categoria": item['categoria'],
                    "justificativa": item['justificativa']
                }
                
        except Exception as e:
            print(f"Erro na classificação LLM: {str(e)}")
            continue
            
    return classified_results

@api_router.post("/manual-reclassify")
async def run_analise_task_wrapper(task_id: str, request: AnaliseTributariaRequest):
    try:
        tasks_store[task_id] = {"status": "processing", "progress": 0}
        result = await internal_analise_tributaria(request)
        tasks_store[task_id] = {"status": "completed", "result": result}
    except Exception as e:
        tasks_store[task_id] = {"status": "error", "error": str(e)}

@api_router.post("/ai/analise-tributaria")
async def ai_analise_tributaria(
    request: AnaliseTributariaRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Inicia análise tributária em background"""
    task_id = str(uuid.uuid4())
    tasks_store[task_id] = {"status": "pending"}
    background_tasks.add_task(run_analise_task_wrapper, task_id, request)
    return {"task_id": task_id, "status": "pending"}

@api_router.get("/ai/tasks/{task_id}")
async def get_task_status(task_id: str):
    task = tasks_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

async def manual_reclassify_product(
    doc_id: str,
    produto_codigo: str,
    novo_cfop: str,
    nova_categoria: str,
    motivo: str,
    salvar_regra: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Reclassifica manualmente um produto e opcionalmente salva como regra aprendida"""
    doc = await db.xml_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    produto_atualizado = None
    produtos_atualizados = []
    
    for prod in doc.get('produtos', []):
        if prod.get('codigo') == produto_codigo:
            prod['cfop_original'] = prod.get('cfop', '')
            prod['cfop'] = novo_cfop
            prod['categoria_classificada'] = nova_categoria
            prod['reclassificado_manualmente'] = True
            prod['motivo_reclassificacao'] = motivo
            prod['reclassificado_por'] = current_user.id
            prod['data_reclassificacao'] = datetime.now(timezone.utc).isoformat()
            produto_atualizado = prod
        produtos_atualizados.append(prod)
    
    if not produto_atualizado:
        raise HTTPException(status_code=404, detail="Produto não encontrado no documento")
    
    await db.xml_documents.update_one(
        {"id": doc_id},
        {"$set": {"produtos": produtos_atualizados}}
    )
    
    # Salvar como regra aprendida
    if salvar_regra:
        learned_rule = LearnedRule(
            company_id=doc['company_id'],
            produto_descricao=produto_atualizado.get('descricao', ''),
            produto_codigo=produto_codigo,
            ncm=produto_atualizado.get('ncm', ''),
            categoria_correta=nova_categoria,
            cfop_correto=novo_cfop,
            motivo=motivo,
            aprendido_de='user_correction',
            created_by=current_user.id
        )
        rule_doc = learned_rule.model_dump()
        rule_doc['created_at'] = rule_doc['created_at'].isoformat()
        await db.learned_rules.insert_one(rule_doc)
    
    return {
        "success": True,
        "produto_atualizado": produto_atualizado,
        "regra_salva": salvar_regra
    }

# Estoque por Competência
class EstoqueCompetencia(BaseModel):
    competencia: str
    estoque_inicial: float = 0
    estoque_final: float = 0

@api_router.get("/estoque-competencia/{company_id}")
async def get_estoque_competencia(company_id: str, competencia: str, current_user: dict = Depends(get_current_user)):
    """Buscar estoque de uma competência específica"""
    estoque = await db.estoques_competencia.find_one(
        {"company_id": company_id, "competencia": competencia},
        {"_id": 0}
    )
    if not estoque:
        return {"estoque_inicial": 0, "estoque_final": 0}
    return estoque

@api_router.post("/estoque-competencia/{company_id}")
async def save_estoque_competencia(company_id: str, estoque: EstoqueCompetencia, current_user: dict = Depends(get_current_user)):
    """Salvar estoque de uma competência"""
    await db.estoques_competencia.update_one(
        {"company_id": company_id, "competencia": estoque.competencia},
        {"$set": {
            "company_id": company_id,
            "competencia": estoque.competencia,
            "estoque_inicial": estoque.estoque_inicial,
            "estoque_final": estoque.estoque_final,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    return {"success": True, "message": "Estoque salvo com sucesso"}

@api_router.get("/")
async def root():
    return {"message": "Business Contabilidade - Sistema de Fechamento Fiscal"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()