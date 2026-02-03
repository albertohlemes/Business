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

class CNPJData(BaseModel):
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnae_principal: str
    cnae_principal_descricao: str
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None

class XMLDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    tipo: str
    chave_nfe: str
    numero_nfe: str
    data_emissao: str
    emitente_cnpj: str
    emitente_nome: str
    destinatario_cnpj: str
    destinatario_nome: str
    valor_total: float
    xml_content: str
    produtos: List[Dict[str, Any]] = []
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

def classify_product_category(descricao: str, ncm: str, company_products: List[str], company_insumos: List[str]) -> str:
    descricao_lower = descricao.lower()
    
    # Combustíveis
    combustiveis = ['gasolina', 'diesel', 'etanol', 'alcool combustivel', 'gnv', 'gas natural', 'oleo diesel']
    
    # Materiais de despesa
    materiais_escritorio = ['papel', 'caneta', 'lapis', 'pasta', 'grampeador', 'clips', 'borracha', 'toner', 'cartucho', 'impressora', 'tinta impressora']
    materiais_limpeza = ['sabao', 'detergente', 'desinfetante', 'alcool gel', 'alcool', 'papel higienico', 'toalha', 'vassoura', 'pano', 'luva', 'saco lixo']
    materiais_construcao = ['cimento', 'areia', 'tijolo', 'telha', 'tinta parede', 'massa corrida', 'prego', 'parafuso', 'madeira', 'ferro', 'porta', 'janela']
    servicos_terceiros = ['manutencao', 'servico', 'consultoria', 'assessoria', 'reparo']
    
    # Verificar combustíveis primeiro
    for item in combustiveis:
        if item in descricao_lower:
            return 'combustivel'
    
    # Verificar despesas
    for item in materiais_escritorio:
        if item in descricao_lower:
            return 'despesa'
    
    for item in materiais_limpeza:
        if item in descricao_lower:
            return 'despesa'
    
    for item in materiais_construcao:
        if item in descricao_lower:
            return 'despesa'
    
    for item in servicos_terceiros:
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
    
    # Default: revenda
    return 'revenda'

async def suggest_cfop_intelligent(product: Dict[str, Any], company_id: str, tipo_doc: str, cfop_original: str) -> Dict[str, Any]:
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        return {"cfop_sugerido": None, "categoria": None}
    
    produtos_comercializados = company.get('produtos_comercializados', [])
    insumos_producao = company.get('insumos_producao', [])
    company_uf = company.get('uf', 'SP')
    
    categoria = classify_product_category(
        product.get('descricao', ''),
        product.get('ncm', ''),
        produtos_comercializados,
        insumos_producao
    )
    
    cst = product.get('cst', '')
    is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
    
    # Detectar se é transferência (CFOPs 5152/6152 ou 5552/6552)
    is_transferencia = cfop_original.startswith('5152') or cfop_original.startswith('6152') or \
                       cfop_original.startswith('5552') or cfop_original.startswith('6552')
    
    # Detectar UF (1=dentro do estado, 2=fora do estado)
    cfop_prefix = '1' if company_uf == 'SP' else '2'  # Simplificado - idealmente verificar UF do emitente
    
    cfop_sugerido = None
    
    if tipo_doc == 'entrada':
        # Transferência tem prioridade
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
    
    # Verificar se tem documentos vinculados
    docs_count = await db.xml_documents.count_documents({"company_id": company_id})
    if docs_count > 0:
        raise HTTPException(status_code=400, detail=f"Não é possível excluir. Empresa possui {docs_count} documento(s) vinculado(s)")
    
    await db.companies.delete_one({"id": company_id})
    return {"message": "Empresa excluída com sucesso"}

@api_router.post("/companies", response_model=Company)
async def create_company(company_data: CompanyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar empresas")
    
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
    tipo: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    results = []
    errors = []
    
    for file in files:
        try:
            content = await file.read()
            xml_str = content.decode('utf-8')
            
            parsed_data = parse_xml_nfe(xml_str)
            
            # APLICAR ANÁLISE INTELIGENTE E CONVERTER CFOP AUTOMATICAMENTE
            for product in parsed_data['produtos']:
                suggestion = await suggest_cfop_intelligent(
                    product, company_id, tipo, product.get('cfop', '')
                )
                if suggestion['cfop_sugerido']:
                    product['cfop_sugerido'] = suggestion['cfop_sugerido']
                    product['cfop_original'] = product.get('cfop', '')
                    product['categoria_classificada'] = suggestion['categoria']
                    # APLICAR AUTOMATICAMENTE O CFOP SUGERIDO
                    product['cfop'] = suggestion['cfop_sugerido']
            
            xml_doc = XMLDocument(
                company_id=company_id,
                tipo=tipo,
                xml_content=xml_str,
                uploaded_by=current_user.id,
                **parsed_data
            )
            
            doc = xml_doc.model_dump()
            doc['uploaded_at'] = doc['uploaded_at'].isoformat()
            
            await db.xml_documents.insert_one(doc)
            results.append({"filename": file.filename, "status": "success", "chave": parsed_data['chave_nfe']})
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {"success": results, "errors": errors}

@api_router.get("/xml/documents")
async def list_documents(
    company_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if current_user.role != UserRole.ADMIN:
        companies = await db.companies.find({"cnpj": {"$in": current_user.company_ids}}, {"_id": 0}).to_list(1000)
        company_ids = [c['id'] for c in companies]
        query['company_id'] = {"$in": company_ids}
    elif company_id:
        query['company_id'] = company_id
    
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
    current_user: User = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    documents = await db.xml_documents.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    
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
    current_user: User = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    documents = await db.xml_documents.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    
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
    periodo: str = "012024",
    current_user: User = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != UserRole.ADMIN and company['cnpj'] not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    documents = await db.xml_documents.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    
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
        "filename": f"SPED_FISCAL_{company['cnpj']}_{periodo}.txt"
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