from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
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
            
            cfop = ""
            cst_icms = ""
            for key in icms:
                if isinstance(icms[key], dict):
                    if 'CFOP' in icms[key]:
                        cfop = icms[key]['CFOP']
                    if 'CST' in icms[key]:
                        cst_icms = icms[key]['CST']
                    elif 'CSOSN' in icms[key]:
                        cst_icms = icms[key]['CSOSN']
                    if cfop:
                        break
            
            v_icms = 0
            v_pis = 0
            v_cofins = 0
            
            for key in icms:
                if isinstance(icms[key], dict):
                    v_icms = float(icms[key].get('vICMS', 0))
                    break
            
            for key in pis:
                if isinstance(pis[key], dict):
                    v_pis = float(pis[key].get('vPIS', 0))
                    break
            
            for key in cofins:
                if isinstance(cofins[key], dict):
                    v_cofins = float(cofins[key].get('vCOFINS', 0))
                    break
            
            produtos.append({
                'codigo': prod.get('cProd', ''),
                'descricao': prod.get('xProd', ''),
                'ncm': prod.get('NCM', ''),
                'cfop': cfop,
                'cst': cst_icms,
                'quantidade': float(prod.get('qCom', 0)),
                'valor_unitario': float(prod.get('vUnCom', 0)),
                'valor_total': float(prod.get('vProd', 0)),
                'unidade': prod.get('uCom', ''),
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
            v_icms = 0
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
                    v_icms = float(icms[key].get('vICMS', 0))
            
            for key in pis:
                if isinstance(pis[key], dict):
                    v_pis = float(pis[key].get('vPIS', 0))
                    break
            
            for key in cofins:
                if isinstance(cofins[key], dict):
                    v_cofins = float(cofins[key].get('vCOFINS', 0))
                    break
            
            produtos.append({
                'codigo': prod.get('cProd', ''),
                'descricao': prod.get('xProd', ''),
                'ncm': prod.get('NCM', ''),
                'cfop': cfop,
                'cst': cst_icms,
                'quantidade': float(prod.get('qCom', 0)),
                'valor_unitario': float(prod.get('vUnCom', 0)),
                'valor_total': float(prod.get('vProd', 0)),
                'unidade': prod.get('uCom', ''),
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

def classify_product_category(descricao: str, ncm: str, company_products: List[str], company_insumos: List[str], company_despesas: List[str]) -> str:
    descricao_lower = descricao.lower()
    
    # Verificar produtos de despesa customizados da empresa
    for despesa in company_despesas:
        if despesa.lower() in descricao_lower or descricao_lower in despesa.lower():
            return 'despesa'
    
    # Combustíveis
    combustiveis = ['gasolina', 'diesel', 'etanol', 'alcool combustivel', 'gnv', 'gas natural', 'oleo diesel']
    for item in combustiveis:
        if item in descricao_lower:
            return 'combustivel'
    
    # Materiais de despesa genéricos
    materiais_escritorio = ['papel', 'caneta', 'lapis', 'pasta', 'grampeador', 'clips', 'borracha', 'toner', 'cartucho', 'impressora', 'tinta impressora']
    materiais_limpeza = ['sabao', 'detergente', 'desinfetante', 'alcool gel', 'alcool', 'papel higienico', 'toalha', 'vassoura', 'pano', 'luva', 'saco lixo']
    materiais_construcao = ['cimento', 'areia', 'tijolo', 'telha', 'tinta parede', 'massa corrida', 'prego', 'parafuso', 'madeira', 'ferro', 'porta', 'janela']
    
    for item in materiais_escritorio + materiais_limpeza + materiais_construcao:
        if item in descricao_lower:
            return 'despesa'
    
    # Verificar insumos
    for insumo in company_insumos:
        if insumo.lower() in descricao_lower or descricao_lower in insumo.lower():
            return 'insumo'
    
    # Verificar revenda
    for produto in company_products:
        if produto.lower() in descricao_lower or descricao_lower in produto.lower():
            return 'revenda'
    
    return 'revenda'

async def suggest_cfop_intelligent(product: Dict[str, Any], company_id: str, tipo_doc: str, cfop_original: str) -> Dict[str, Any]:
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        return {"cfop_sugerido": None, "categoria": None}
    
    produtos_comercializados = company.get('produtos_comercializados', [])
    insumos_producao = company.get('insumos_producao', [])
    produtos_despesa = company.get('produtos_despesa', [])
    company_uf = company.get('uf', 'SP')
    
    categoria = classify_product_category(
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
        elif categoria == 'combustivel':
            cfop_sugerido = cfop_prefix + '653'
        elif categoria == 'revenda':
            if is_st:
                cfop_sugerido = cfop_prefix + '403'
            else:
                cfop_sugerido = cfop_prefix + '102'
        elif categoria == 'insumo':
            if is_st:
                cfop_sugerido = cfop_prefix + '401'
            else:
                cfop_sugerido = cfop_prefix + '101'
        elif categoria == 'despesa':
            if is_st:
                cfop_sugerido = cfop_prefix + '407'
            else:
                cfop_sugerido = cfop_prefix + '556'
    
    return {
        "cfop_sugerido": cfop_sugerido,
        "categoria": categoria,
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
    
    results = []
    errors = []
    conversion_report = []
    duplicadas = []
    rejeitadas_cnpj = []
    rejeitadas_competencia = []
    
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
            
            # APLICAR ANÁLISE INTELIGENTE E CONVERTER CFOP AUTOMATICAMENTE
            for product in parsed_data['produtos']:
                suggestion = await suggest_cfop_intelligent(
                    product, company_id, tipo, product.get('cfop', '')
                )
                
                cfop_original = product.get('cfop', '')
                
                if suggestion['cfop_sugerido']:
                    product['cfop_sugerido'] = suggestion['cfop_sugerido']
                    product['cfop_original'] = cfop_original
                    product['categoria_classificada'] = suggestion['categoria']
                    
                    # APLICAR AUTOMATICAMENTE O CFOP SUGERIDO
                    product['cfop'] = suggestion['cfop_sugerido']
                    
                    # Registrar conversão
                    file_conversions.append({
                        'produto': product.get('descricao', ''),
                        'codigo': product.get('codigo', ''),
                        'cfop_original': cfop_original,
                        'cfop_convertido': suggestion['cfop_sugerido'],
                        'categoria': suggestion['categoria'],
                        'motivo': f"Classificado como {suggestion['categoria'].upper()}"
                    })
            
            xml_doc = XMLDocument(
                company_id=company_id,
                competencia=competencia,
                tipo=tipo,
                xml_content=xml_str,
                uploaded_by=current_user.id,
                **parsed_data
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
        "total_conversoes": sum(len(r['conversoes']) for r in conversion_report),
        "resumo": {
            "total_arquivos": len(files),
            "importados": len(results),
            "duplicados": len(duplicadas),
            "rejeitados_cnpj": len(rejeitadas_cnpj),
            "rejeitados_competencia": len(rejeitadas_competencia),
            "erros": len(errors)
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

@api_router.get("/reports/by-product/{company_id}")
async def report_by_product(
    company_id: str,
    competencia: Optional[str] = None,
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
        for prod in doc['produtos']:
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
        for prod in doc['produtos']:
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

@api_router.post("/ai/analise-tributaria")
async def ai_analise_tributaria(
    request: AnaliseTributariaRequest,
    current_user: User = Depends(get_current_user)
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
    credito_cofins_tributado = 0
    credito_cofins_aliquota_zero = 0
    
    # Análise de CFOPs de entrada
    cfops_interestadual = 0
    cfops_interno = 0
    valor_interestadual = 0
    valor_interno = 0
    
    # NCMs de alíquota zero (cesta básica)
    ncms_aliquota_zero = ['0201', '0202', '0203', '0204', '0206', '0207', '0401', '0402', '0403',
                          '0701', '0702', '0703', '0713', '0901', '1001', '1006', '1101', '1501', '1507', '1701']
    
    for doc in docs_entrada:
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            ncm = str(prod.get('ncm', ''))[:4]
            cst = str(prod.get('cst', ''))
            valor = prod.get('valor_total', 0)
            
            # Classificar CFOP
            if cfop.startswith('2'):
                cfops_interestadual += 1
                valor_interestadual += valor
            elif cfop.startswith('1'):
                cfops_interno += 1
                valor_interno += valor
            
            # ICMS - ST não dá crédito (CST 10, 30, 60, 70)
            if cst in ['10', '30', '60', '70'] or 'ST' in cfop.upper():
                credito_icms_st += prod.get('v_icms', 0)
            else:
                credito_icms_tributado += prod.get('v_icms', 0)
            
            # PIS/COFINS - Verificar alíquota zero
            if ncm in ncms_aliquota_zero or prod.get('v_pis', 0) == 0:
                credito_pis_aliquota_zero += prod.get('v_pis', 0)
            else:
                credito_pis_tributado += prod.get('v_pis', 0)
            
            if ncm in ncms_aliquota_zero or prod.get('v_cofins', 0) == 0:
                credito_cofins_aliquota_zero += prod.get('v_cofins', 0)
            else:
                credito_cofins_tributado += prod.get('v_cofins', 0)
    
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
    debito_cofins_tributado = 0
    debito_cofins_aliquota_zero = 0
    
    valor_vendas_st = 0
    valor_vendas_tributado = 0
    valor_vendas_isento = 0
    
    for doc in docs_saida:
        for prod in doc.get('produtos', []):
            cfop = str(prod.get('cfop', ''))
            ncm = str(prod.get('ncm', ''))[:4]
            cst = str(prod.get('cst', ''))
            valor = prod.get('valor_total', 0)
            
            # Classificar ICMS de saída
            if cst in ['10', '30', '60', '70'] or 'ST' in cfop.upper():
                debito_icms_st += prod.get('v_icms', 0)
                valor_vendas_st += valor
            elif cst in ['40', '41', '50'] or prod.get('v_icms', 0) == 0:
                debito_icms_isento += prod.get('v_icms', 0)
                valor_vendas_isento += valor
            else:
                debito_icms_tributado += prod.get('v_icms', 0)
                valor_vendas_tributado += valor
            
            # PIS/COFINS de saída
            if ncm in ncms_aliquota_zero or prod.get('v_pis', 0) == 0:
                debito_pis_aliquota_zero += prod.get('v_pis', 0)
            else:
                debito_pis_tributado += prod.get('v_pis', 0)
            
            if ncm in ncms_aliquota_zero or prod.get('v_cofins', 0) == 0:
                debito_cofins_aliquota_zero += prod.get('v_cofins', 0)
            else:
                debito_cofins_tributado += prod.get('v_cofins', 0)
    
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
    
    # Percentual PIS/COFINS tributado vs alíquota zero
    total_pis_saida = debito_pis_tributado + debito_pis_aliquota_zero
    total_cofins_saida = debito_cofins_tributado + debito_cofins_aliquota_zero
    percentual_pis_tributado = (debito_pis_tributado / total_pis_saida * 100) if total_pis_saida > 0 else 0
    percentual_cofins_tributado = (debito_cofins_tributado / total_cofins_saida * 100) if total_cofins_saida > 0 else 0
    
    # Créditos efetivos (descontando ST e alíquota zero)
    credito_icms_efetivo = credito_icms_tributado
    credito_pis_efetivo = credito_pis_tributado if regime == 'lucro_real' else 0
    credito_cofins_efetivo = credito_cofins_tributado if regime == 'lucro_real' else 0
    
    # Débitos efetivos
    debito_icms_efetivo = debito_icms_tributado
    debito_pis_efetivo = debito_pis_tributado
    debito_cofins_efetivo = debito_cofins_tributado
    
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
            "pis_tributado": round(credito_pis_tributado, 2),
            "pis_aliquota_zero": round(credito_pis_aliquota_zero, 2),
            "cofins_tributado": round(credito_cofins_tributado, 2),
            "cofins_aliquota_zero": round(credito_cofins_aliquota_zero, 2)
        },
        "debitos": {
            "icms_tributado": round(debito_icms_tributado, 2),
            "icms_st": round(debito_icms_st, 2),
            "icms_isento": round(debito_icms_isento, 2),
            "pis_tributado": round(debito_pis_tributado, 2),
            "pis_aliquota_zero": round(debito_pis_aliquota_zero, 2),
            "cofins_tributado": round(debito_cofins_tributado, 2),
            "cofins_aliquota_zero": round(debito_cofins_aliquota_zero, 2)
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