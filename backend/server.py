from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status, BackgroundTasks
from fastapi.responses import StreamingResponse
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
    data_emissao: str
    emitente_cnpj: str
    emitente_nome: str
    destinatario_cnpj: str
    destinatario_nome: str
    valor_total: float
    valor_servicos: float = 0.0
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
        
        if isinstance(det, dict):
            det = [det]
        
        produtos = []
        for item in det:
            prod = item.get('prod', {})
            imposto = item.get('imposto', {})
            icms = imposto.get('ICMS', {})
            pis = imposto.get('PIS', {})
            cofins = imposto.get('COFINS', {})
            
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
            v_pis = 0
            v_cofins = 0
            
            for key in icms:
                if isinstance(icms[key], dict):
                    v_icms = float(icms[key].get('vICMS', 0) or 0)
                    v_bc = float(icms[key].get('vBC', 0) or 0)
                    break
            
            for key in pis:
                if isinstance(pis[key], dict):
                    v_pis = float(pis[key].get('vPIS', 0) or 0)
                    # Extrair CST de PIS
                    cst_pis = pis[key].get('CST', '')
                    break
            
            for key in cofins:
                if isinstance(cofins[key], dict):
                    v_cofins = float(cofins[key].get('vCOFINS', 0) or 0)
                    # Extrair CST de COFINS
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
                'cst_pis_xml': cst_pis,  # CST original do XML
                'cst_cofins_xml': cst_cofins,  # CST original do XML
                'cst_pis': cst_pis,  # Será atualizado após determinar tipo de operação
                'cst_cofins': cst_cofins,  # Será atualizado após determinar tipo de operação
                'ncm_aliq_zero': is_ncm_aliquota_zero(ncm),  # Flag de alíquota zero pelo NCM
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
            'chave_nfe': nfe.get('@Id', '').replace('NFe', ''),
            'numero_nfe': ide.get('nNF', ''),
            'serie': ide.get('serie', ''),
            'data_emissao': ide.get('dhEmi', ''),
            'emitente_cnpj': emit.get('CNPJ', ''),
            'emitente_nome': emit.get('xNome', ''),
            'destinatario_cnpj': dest.get('CNPJ', ''),
            'destinatario_nome': dest.get('xNome', ''),
            'valor_total': float(total.get('vNF', 0)),
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
            'emitente_cnpj': emit.get('CNPJ', ''),
            'emitente_nome': emit.get('xNome', ''),
            'destinatario_cnpj': dest.get('CNPJ', '') or dest.get('CPF', '') or '',
            'destinatario_nome': dest.get('xNome', '') or 'CONSUMIDOR',
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
        
        # Dados do tomador (cliente)
        tomador = nfse.get('TomadorServico', {}) or nfse.get('Tomador', {})
        id_tomador = tomador.get('IdentificacaoTomador', {})
        cpf_cnpj_tomador = id_tomador.get('CpfCnpj', {})
        cnpj_tomador = cpf_cnpj_tomador.get('Cnpj', '') or cpf_cnpj_tomador.get('Cpf', '') or tomador.get('Cnpj', '') or tomador.get('Cpf', '')
        nome_tomador = tomador.get('RazaoSocial', '') or tomador.get('NomeFantasia', '') or 'TOMADOR'
        
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
            'emitente_cnpj': cnpj_prestador,
            'emitente_nome': nome_prestador,
            'destinatario_cnpj': cnpj_tomador,
            'destinatario_nome': nome_tomador,
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

def classify_product_category(descricao: str, ncm: str, company_products: List[str], company_insumos: List[str], company_despesas: List[str]) -> tuple:
    """Classifica produto e retorna (categoria, justificativa)"""
    descricao_lower = descricao.lower()
    
    # Verificar produtos de despesa customizados da empresa
    for despesa in company_despesas:
        if despesa.lower() in descricao_lower or descricao_lower in despesa.lower():
            return ('despesa', f'Produto cadastrado como despesa da empresa ({despesa})')
    
    # Combustíveis
    combustiveis = ['gasolina', 'diesel', 'etanol', 'alcool combustivel', 'gnv', 'gas natural', 'oleo diesel']
    for item in combustiveis:
        if item in descricao_lower:
            return ('combustivel', f'Combustível identificado ({item})')
    
    # Materiais de escritório
    materiais_escritorio = ['papel', 'caneta', 'lapis', 'pasta', 'grampeador', 'clips', 'borracha', 'toner', 'cartucho', 'impressora', 'tinta impressora']
    for item in materiais_escritorio:
        if item in descricao_lower:
            return ('despesa', f'Material de escritório ({item})')
    
    # Materiais de limpeza
    materiais_limpeza = ['sabao', 'detergente', 'desinfetante', 'alcool gel', 'alcool', 'papel higienico', 'toalha', 'vassoura', 'pano', 'luva', 'saco lixo']
    for item in materiais_limpeza:
        if item in descricao_lower:
            return ('despesa', f'Material de limpeza ({item})')
    
    # Materiais de construção
    materiais_construcao = ['cimento', 'areia', 'tijolo', 'telha', 'tinta parede', 'massa corrida', 'prego', 'parafuso', 'madeira', 'ferro', 'porta', 'janela']
    for item in materiais_construcao:
        if item in descricao_lower:
            return ('despesa', f'Material de construção/manutenção ({item})')
    
    # Verificar insumos cadastrados
    for insumo in company_insumos:
        if insumo.lower() in descricao_lower or descricao_lower in insumo.lower():
            return ('insumo', f'Insumo de produção cadastrado ({insumo})')
    
    # Verificar produtos de revenda cadastrados
    for produto in company_products:
        if produto.lower() in descricao_lower or descricao_lower in produto.lower():
            return ('revenda', f'Produto comercializado pela empresa ({produto})')
    
    # Padrão: revenda (produto do escopo da empresa)
    return ('revenda', 'Produto presumido para revenda (escopo comercial da empresa)')

async def suggest_cfop_intelligent(product: Dict[str, Any], company_id: str, tipo_doc: str, cfop_original: str) -> Dict[str, Any]:
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        return {"cfop_sugerido": None, "categoria": None, "justificativa": None}
    
    produtos_comercializados = company.get('produtos_comercializados', [])
    insumos_producao = company.get('insumos_producao', [])
    produtos_despesa = company.get('produtos_despesa', [])
    company_uf = company.get('uf', 'SP')
    
    categoria, justificativa = classify_product_category(
        product.get('descricao', ''),
        product.get('ncm', ''),
        produtos_comercializados,
        insumos_producao,
        produtos_despesa
    )
    
    cst = product.get('cst', '')
    is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
    
    is_transferencia = cfop_original.startswith('5152') or cfop_original.startswith('6152') or \
                       cfop_original.startswith('5552') or cfop_original.startswith('6552')
    
    cfop_prefix = '1' if company_uf == 'SP' else '2'
    
    cfop_sugerido = None
    
    if tipo_doc == 'entrada':
        if is_transferencia:
            cfop_sugerido = cfop_prefix + '152'
            justificativa = 'Transferência entre estabelecimentos'
        elif categoria == 'combustivel':
            cfop_sugerido = cfop_prefix + '653'
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

def generate_sped_fiscal(company: Company, documents: List[XMLDocument], periodo: str) -> str:
    lines = []
    
    lines.append("|0000|014|0|01012024|31012024|BUSINESS CONTABILIDADE||SP|{}|{}|||A|1|".format(
        company.cnpj.replace('.','').replace('/','').replace('-',''),
        company.inscricao_estadual or ''
    ))
    lines.append("|0001|0|")
    lines.append("|0005|{}|{}|{}|{}|{}|{}|{}|{}||".format(
        company.razao_social,
        company.nome_fantasia or company.razao_social,
        company.cep or '',
        company.endereco or '',
        '',
        '',
        '',
        company.cidade or ''
    ))
    lines.append("|0015|{}|SP|{}|".format(
        company.uf or 'SP',
        company.inscricao_estadual or ''
    ))
    lines.append("|0100|BUSINESS CONTABILIDADE|12345678000199|12345678|business@businessconta.com.br|1235123731|")
    lines.append("|0150|BUSINESS CONTABILIDADE|12345678000199|SP|123456789|business@businessconta.com.br|1235123731|")
    
    all_products = {}
    for doc in documents:
        for prod in doc.produtos:
            prod_code = prod.get('codigo', '')
            if prod_code and prod_code not in all_products:
                all_products[prod_code] = prod
    
    for code, prod in all_products.items():
        lines.append("|0200|{}|{}|UN|||{}||".format(
            code,
            prod.get('descricao', '')[:60],
            prod.get('ncm', '')
        ))
    
    lines.append("|0990|{}|".format(len([l for l in lines if l.startswith('|0')]) + 1))
    
    lines.append("|C001|0|")
    
    for doc in documents:
        tipo_doc = '1' if doc.tipo == 'saida' else '0'
        data_emissao = doc.data_emissao[:10].replace('-', '')
        
        lines.append("|C100|{}|1|{}|55|00|{}|{}||{}|{}|{}|||||||{}||0|1||".format(
            tipo_doc,
            doc.numero_nfe,
            doc.emitente_cnpj.replace('.','').replace('/','').replace('-',''),
            doc.destinatario_cnpj.replace('.','').replace('/','').replace('-',''),
            data_emissao,
            data_emissao,
            doc.valor_total,
            doc.chave_nfe
        ))
        
        for prod in doc.produtos:
            lines.append("|C170|{}|{}|{}|{}|{}|{}|||||||||||||||".format(
                prod.get('codigo', ''),
                prod.get('descricao', '')[:60],
                prod.get('quantidade', 0),
                prod.get('unidade', 'UN'),
                prod.get('valor_total', 0),
                prod.get('cfop', '')
            ))
        
        lines.append("|C190|{}|{}|{}|0.00|0.00|0.00|0.00|0.00|".format(
            doc.produtos[0].get('cfop', '') if doc.produtos else '',
            doc.produtos[0].get('cst', '000') if doc.produtos else '000',
            doc.valor_total
        ))
    
    lines.append("|C990|{}|".format(len([l for l in lines if l.startswith('|C')]) + 1))
    
    lines.append("|E001|1|")
    lines.append("|E990|2|")
    
    lines.append("|H001|1|")
    lines.append("|H990|2|")
    
    lines.append("|9001|0|")
    lines.append("|9900|0000|1|")
    lines.append("|9900|0001|1|")
    lines.append("|9900|0005|1|")
    lines.append("|9900|0015|1|")
    lines.append("|9900|0100|1|")
    lines.append("|9900|0150|1|")
    lines.append("|9900|0200|{}|".format(len(all_products)))
    lines.append("|9900|0990|1|")
    lines.append("|9900|C001|1|")
    lines.append("|9900|C100|{}|".format(len([d for d in documents])))
    lines.append("|9900|C170|{}|".format(sum(len(d.produtos) for d in documents)))
    lines.append("|9900|C190|{}|".format(len([d for d in documents])))
    lines.append("|9900|C990|1|")
    lines.append("|9900|E001|1|")
    lines.append("|9900|E990|1|")
    lines.append("|9900|H001|1|")
    lines.append("|9900|H990|1|")
    lines.append("|9900|9001|1|")
    lines.append("|9900|9900|{}|".format(15))
    lines.append("|9900|9990|1|")
    lines.append("|9900|9999|1|")
    lines.append("|9990|{}|".format(len([l for l in lines if l.startswith('|9')]) + 2))
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
    
    docs_count = await db.xml_documents.count_documents({"company_id": company_id})
    if docs_count > 0:
        raise HTTPException(status_code=400, detail=f"Não é possível excluir. Empresa possui {docs_count} documento(s) vinculado(s)")
    
    await db.companies.delete_one({"id": company_id})
    return {"message": "Empresa excluída com sucesso"}

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
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    
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
    current_user: User = Depends(get_current_user)
):
    """Apagar notas da competência da empresa, opcionalmente filtrando por tipo"""
    
    print(f"DELETE /documents request: company={company_id}, competencia={competencia}, type={tipo}, user={current_user.email}")
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
    # O campo no banco é "tipo", não "tipo_operacao"
    if tipo and tipo in ['entrada', 'saida']:
        filter_query["tipo"] = tipo
    
    result = await db.xml_documents.delete_many(filter_query)
    
    tipo_label = f" do tipo {tipo.upper()}" if tipo else ""
    
    return {
        "message": f"{result.deleted_count} documento(s){tipo_label} apagado(s) da competência {competencia}",
        "deleted_count": result.deleted_count
    }

@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Apagar documento individual"""
    
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
            
            # APLICAR ANÁLISE INTELIGENTE E CONVERTER CFOP AUTOMATICAMENTE
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
                
                # Aplicar CST calculado (não o do XML)
                product['cst_pis_calculado'] = cst_info['cst_calculado']
                product['cst_cofins_calculado'] = cst_info['cst_calculado']  # PIS e COFINS usam mesmo CST
                product['cst_pis'] = cst_info['cst_calculado']  # Sobrescrever com calculado
                product['cst_cofins'] = cst_info['cst_calculado']  # Sobrescrever com calculado
                product['cst_divergente'] = cst_info['divergente']
                product['cst_motivo'] = cst_info['motivo']
                product['ncm_aliq_zero'] = cst_info['aliq_zero']
                product['cfop_sem_incidencia'] = cst_info.get('sem_incidencia', False)
                
                # VERIFICAR SE É CFOP DE OPERAÇÃO DISTINTA (apenas para entradas)
                if tipo == 'entrada' and cfop_original in CFOPS_OPERACOES_DISTINTAS_UPLOAD:
                    # Converter automaticamente para CFOP de entrada mantendo natureza
                    cfop_convertido = CFOP_SAIDA_PARA_ENTRADA.get(cfop_original, cfop_original)
                    
                    # Marcar produto como pendente de revisão
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
                        'acao_tomada': f'Convertido automaticamente de {cfop_original} para {cfop_convertido} (mantendo natureza)'
                    })
                    
                    # Registrar conversão
                    file_conversions.append({
                        'produto': product.get('descricao', ''),
                        'codigo': product.get('codigo', ''),
                        'cfop_original': cfop_original,
                        'cfop_convertido': cfop_convertido,
                        'categoria': 'operacao_distinta',
                        'motivo': f"CFOP do emissor ({cfop_original} - {CFOPS_OPERACOES_DISTINTAS_UPLOAD[cfop_original]}) convertido para entrada ({cfop_convertido}). Pendente de revisão no menu Alertas CFOP."
                    })
                else:
                    # Fluxo normal de classificação inteligente
                    suggestion = await suggest_cfop_intelligent(
                        product, company_id, tipo, cfop_original
                    )
                    
                    if suggestion['cfop_sugerido']:
                        product['cfop_sugerido'] = suggestion['cfop_sugerido']
                        product['cfop_original'] = cfop_original
                        product['categoria_classificada'] = suggestion['categoria']
                        product['justificativa_ia'] = suggestion.get('justificativa', '')
                        
                        # APLICAR AUTOMATICAMENTE O CFOP SUGERIDO
                        product['cfop'] = suggestion['cfop_sugerido']
                        
                        # Registrar conversão com justificativa detalhada
                        file_conversions.append({
                            'produto': product.get('descricao', ''),
                            'codigo': product.get('codigo', ''),
                            'cfop_original': cfop_original,
                            'cfop_convertido': suggestion['cfop_sugerido'],
                            'categoria': suggestion['categoria'],
                            'motivo': suggestion.get('justificativa', f"Classificado como {suggestion['categoria'].upper()}")
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
    
    # Créditos (entradas)
    # CSTs de ICMS-ST que NÃO geram direito a crédito de ICMS
    CST_ICMS_ST = ['10', '30', '60', '70', '201', '202', '203', '500']
    
    credito_icms = 0
    credito_icms_st_desconsiderado = 0  # Para mostrar quanto foi desconsiderado
    credito_pis = 0
    credito_cofins = 0
    
    for doc in nfe_entrada:
        for prod in doc.get('produtos', []):
            cst = str(prod.get('cst', ''))
            v_icms = float(prod.get('v_icms', 0) or 0)
            
            # ICMS-ST não gera crédito - mercadoria já teve imposto retido na fonte
            if cst in CST_ICMS_ST:
                credito_icms_st_desconsiderado += v_icms
            else:
                credito_icms += v_icms
            
            # PIS e COFINS mantém cálculo normal
            credito_pis += float(prod.get('v_pis', 0) or 0)
            credito_cofins += float(prod.get('v_cofins', 0) or 0)
    
    # Regime tributário da empresa
    regime_tributario = company.get('regime_tributario', 'lucro_presumido')
    
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
                    add_to_dict(creditos["com_credito"]["por_cfop"], cfop_key, valor, v_pis, v_cofins, '50')
                    add_to_dict(creditos["com_credito"]["por_ncm"], ncm or "SEM NCM", valor, v_pis, v_cofins, '50')
                    add_to_dict(creditos["com_credito"]["por_cst"], '50', valor, v_pis, v_cofins, '50')
                    creditos["com_credito"]["total"] += valor
                    creditos["com_credito"]["pis"] += v_pis
                    creditos["com_credito"]["cofins"] += v_cofins
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
                    add_to_dict(debitos["com_debito"]["por_cfop"], cfop_key, valor, v_pis, v_cofins, '01')
                    add_to_dict(debitos["com_debito"]["por_ncm"], ncm or "SEM NCM", valor, v_pis, v_cofins, '01')
                    add_to_dict(debitos["com_debito"]["por_cst"], '01', valor, v_pis, v_cofins, '01')
                    debitos["com_debito"]["total"] += valor
                    debitos["com_debito"]["pis"] += v_pis
                    debitos["com_debito"]["cofins"] += v_cofins
    
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
    
    # Buscar documentos da competência
    documents = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia
    }, {"_id": 0}).to_list(None)
    
    # CFOPs de Substituição Tributária (não dão direito a crédito de ICMS)
    CFOPS_ST = ['1403', '1409', '2403', '2409', '5403', '5405', '5409', '6403', '6404', '6409']
    
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
            v_pis = float(prod.get('v_pis', 0) or 0)
            v_cofins = float(prod.get('v_cofins', 0) or 0)
            
            # Verificar se é CFOP de Substituição Tributária
            is_st = cfop in CFOPS_ST
            
            # Determinar se é entrada ou saída pelo CFOP ou tipo do documento
            primeiro_digito = cfop[0] if cfop else ''
            
            # Se CFOP vazio, usar tipo do documento
            is_entrada = primeiro_digito in ['1', '2', '3'] if primeiro_digito else (tipo_operacao == 'entrada')
            is_saida = primeiro_digito in ['5', '6', '7'] if primeiro_digito else (tipo_operacao == 'saida')
            
            # Se não tem CFOP, usar "SEM CFOP" como chave
            cfop_key = cfop if cfop else f"SEM CFOP ({tipo_operacao.upper()})"
            
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
                        'sem_credito_icms': is_st  # Não dá crédito
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
                        'sem_credito_icms': is_st
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
    # Entradas com crédito de ICMS (excluindo ST)
    entradas_com_credito = [x for x in lista_entradas if not x.get('sem_credito_icms', False)]
    entradas_sem_credito = [x for x in lista_entradas if x.get('sem_credito_icms', False)]
    
    subtotal_entradas = {
        'valor': round(sum(x['valor'] for x in lista_entradas), 2),
        'bc_icms': round(sum(x['bc_icms'] for x in entradas_com_credito), 2),  # Só soma BC das que dão crédito
        'v_icms': round(sum(x['v_icms'] for x in entradas_com_credito), 2),    # Só soma ICMS das que dão crédito
        'v_pis': round(sum(x['v_pis'] for x in lista_entradas), 2),
        'v_cofins': round(sum(x['v_cofins'] for x in lista_entradas), 2),
        'qtd_itens': sum(x['qtd_itens'] for x in lista_entradas),
        # Informação adicional sobre ST desconsiderado
        'st_desconsiderado': {
            'bc_icms': round(sum(x['bc_icms'] for x in entradas_sem_credito), 2),
            'v_icms': round(sum(x['v_icms'] for x in entradas_sem_credito), 2),
            'qtd_itens': sum(x['qtd_itens'] for x in entradas_sem_credito)
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
    periodo: str = "012024",
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
    
    documents = await db.xml_documents.find(query, {"_id": 0}).to_list(10000)
    
    for doc in documents:
        if isinstance(doc['uploaded_at'], str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
    
    xml_docs = [XMLDocument(**doc) for doc in documents]
    
    if isinstance(company['created_at'], str):
        company['created_at'] = datetime.fromisoformat(company['created_at'])
    
    company_obj = Company(**company)
    
    sped_content = generate_sped_fiscal(company_obj, xml_docs, periodo)
    
    return {
        "content": sped_content,
        "filename": f"SPED_FISCAL_{company['cnpj']}_{competencia or periodo}.txt"
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