from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status, BackgroundTasks, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import json
import tempfile
import asyncio
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'portal-dp-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Portal DP - Departamento Pessoal")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# In-memory job storage for async validation tasks
# Structure: {job_id: {status, progress, step, result, error, created_at}}
validation_jobs: Dict[str, Dict[str, Any]] = {}

# ==================== MODELS ====================

# Auth Models
class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

class UserResponse(BaseModel):
    id: str
    nome: str
    email: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Cliente/Empresa Models
class ClienteCreate(BaseModel):
    razao_social: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    sindicato: Optional[str] = None
    codigo_interno: Optional[str] = None
    # Campos fiscais
    cnae_principal: Optional[str] = None
    cnae_descricao: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    regime_tributario: Optional[str] = None  # simples, lucro_presumido, lucro_real
    tipo_atividade: Optional[str] = None  # comercio, servicos, industria
    # Dados DP
    data_abertura: Optional[str] = None
    natureza_juridica: Optional[str] = None
    porte: Optional[str] = None
    situacao: Optional[str] = None
    responsavel_dp: Optional[str] = None
    contador_responsavel: Optional[str] = None
    observacoes: Optional[str] = None

class ClienteResponse(BaseModel):
    id: str
    razao_social: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    sindicato: Optional[str] = None
    codigo_interno: Optional[str] = None
    cnae_principal: Optional[str] = None
    cnae_descricao: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    regime_tributario: Optional[str] = None
    tipo_atividade: Optional[str] = None
    data_abertura: Optional[str] = None
    natureza_juridica: Optional[str] = None
    porte: Optional[str] = None
    situacao: Optional[str] = None
    responsavel_dp: Optional[str] = None
    contador_responsavel: Optional[str] = None
    observacoes: Optional[str] = None
    created_at: str
    total_colaboradores: int = 0

# Colaborador Models - Completo eSocial
class ColaboradorCreate(BaseModel):
    cliente_id: str
    # Dados Cadastrais
    nome: str
    cpf: str
    endereco: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    complemento: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    email: Optional[str] = None
    celular: Optional[str] = None
    ddd: Optional[str] = None
    # Dados Admissionais
    deficiencia: Optional[bool] = False
    tipo_deficiencia: Optional[str] = None
    cidade_nascimento: Optional[str] = None
    uf_nascimento: Optional[str] = None
    data_nascimento: Optional[str] = None
    estado_civil: Optional[str] = None
    grau_instrucao: Optional[str] = None
    data_admissao: Optional[str] = None
    cargo: Optional[str] = None
    etnia: Optional[str] = None
    recebendo_seguro_desemprego: Optional[bool] = False
    sexo: Optional[str] = None
    # Documentos
    rg: Optional[str] = None
    rg_orgao_emissor: Optional[str] = None
    rg_data_emissao: Optional[str] = None
    rg_uf: Optional[str] = None
    reservista: Optional[str] = None
    pis: Optional[str] = None
    ctps: Optional[str] = None
    ctps_serie: Optional[str] = None
    ctps_data_emissao: Optional[str] = None
    ctps_uf: Optional[str] = None
    titulo_eleitor: Optional[str] = None
    titulo_zona: Optional[str] = None
    titulo_secao: Optional[str] = None
    cnh: Optional[str] = None
    cnh_uf: Optional[str] = None
    cnh_categoria: Optional[str] = None
    cnh_vencimento: Optional[str] = None
    cnh_emissao: Optional[str] = None
    cnh_primeira_habilitacao: Optional[str] = None
    # Dados Adicionais
    nome_mae: Optional[str] = None
    nome_pai: Optional[str] = None
    nome_conjuge: Optional[str] = None
    # Informações Contratuais
    salario_base: float = 0.0
    horista: Optional[bool] = False
    insalubridade_percentual: Optional[float] = None
    periculosidade_percentual: Optional[float] = None
    prazo_experiencia: Optional[str] = None
    quadro_horario: Optional[str] = None
    vale_transporte: Optional[bool] = False
    adiantamento_salarial: Optional[bool] = False
    desconto_sindical: Optional[bool] = False
    data_exame_admissional: Optional[str] = None
    # Dados Bancários
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    # Dependentes (JSON array)
    dependentes: Optional[List[Dict[str, Any]]] = None
    # Campos legados
    departamento: Optional[str] = None
    telefone: Optional[str] = None
    data_admissao: Optional[str] = None
    departamento: Optional[str] = None
    pis: Optional[str] = None
    ctps: Optional[str] = None
    rg: Optional[str] = None
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None

class ColaboradorResponse(BaseModel):
    id: str
    cliente_id: str
    # Dados Cadastrais
    nome: str
    cpf: str
    endereco: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    complemento: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    email: Optional[str] = None
    celular: Optional[str] = None
    ddd: Optional[str] = None
    # Dados Admissionais
    deficiencia: Optional[bool] = False
    tipo_deficiencia: Optional[str] = None
    cidade_nascimento: Optional[str] = None
    uf_nascimento: Optional[str] = None
    data_nascimento: Optional[str] = None
    estado_civil: Optional[str] = None
    grau_instrucao: Optional[str] = None
    data_admissao: Optional[str] = None
    cargo: Optional[str] = None
    etnia: Optional[str] = None
    recebendo_seguro_desemprego: Optional[bool] = False
    sexo: Optional[str] = None
    # Documentos
    rg: Optional[str] = None
    rg_orgao_emissor: Optional[str] = None
    rg_data_emissao: Optional[str] = None
    rg_uf: Optional[str] = None
    reservista: Optional[str] = None
    pis: Optional[str] = None
    ctps: Optional[str] = None
    ctps_serie: Optional[str] = None
    ctps_data_emissao: Optional[str] = None
    ctps_uf: Optional[str] = None
    titulo_eleitor: Optional[str] = None
    titulo_zona: Optional[str] = None
    titulo_secao: Optional[str] = None
    cnh: Optional[str] = None
    cnh_uf: Optional[str] = None
    cnh_categoria: Optional[str] = None
    cnh_vencimento: Optional[str] = None
    cnh_emissao: Optional[str] = None
    cnh_primeira_habilitacao: Optional[str] = None
    # Dados Adicionais
    nome_mae: Optional[str] = None
    nome_pai: Optional[str] = None
    nome_conjuge: Optional[str] = None
    # Informações Contratuais
    salario_base: float = 0.0
    horista: Optional[bool] = False
    insalubridade_percentual: Optional[float] = None
    periculosidade_percentual: Optional[float] = None
    prazo_experiencia: Optional[str] = None
    quadro_horario: Optional[str] = None
    vale_transporte: Optional[bool] = False
    adiantamento_salarial: Optional[bool] = False
    desconto_sindical: Optional[bool] = False
    data_exame_admissional: Optional[str] = None
    # Dados Bancários
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    # Dependentes
    dependentes: Optional[List[Dict[str, Any]]] = None
    # Legados
    departamento: Optional[str] = None
    telefone: Optional[str] = None
    created_at: str

# Dissídio Models
class DissidioCreate(BaseModel):
    cliente_id: str
    sindicato: str
    percentual_reajuste: float
    data_base: str
    observacoes: Optional[str] = None

class DissidioResponse(BaseModel):
    id: str
    cliente_id: str
    sindicato: str
    percentual_reajuste: float
    data_base: str
    status: str
    observacoes: Optional[str] = None
    colaboradores_afetados: int = 0
    valor_total_reajuste: float = 0.0
    created_at: str
    aprovado_em: Optional[str] = None

# Admissão Models
class AdmissaoCreate(BaseModel):
    cliente_id: str
    dados_extraidos: Dict[str, Any]
    status: str = "pendente"

class AdmissaoResponse(BaseModel):
    id: str
    cliente_id: str
    dados_extraidos: Dict[str, Any]
    status: str
    created_at: str

# Validação Folha Models
class ValidacaoFolhaCreate(BaseModel):
    cliente_id: str
    mes_referencia: str
    ano_referencia: int

class ValidacaoFolhaResponse(BaseModel):
    id: str
    cliente_id: Optional[str] = None
    cliente_nome: Optional[str] = None
    mes_referencia: str
    ano_referencia: int
    tipo_validacao: Optional[str] = None
    status: str
    arquivos: Optional[Dict[str, Any]] = None
    funcionarios_analisados: Optional[int] = 0
    discrepancias: List[Any] = []
    divergencias: List[Any] = []
    campos_conferidos: List[Any] = []
    alertas: List[Any] = []
    total_verificados: int = 0
    total_erros: int = 0
    total_divergencias: int = 0
    total_conferidos: int = 0
    total_alertas: int = 0
    impacto_financeiro_total: float = 0.0
    resumo_executivo: Optional[str] = None
    created_at: str

# Média Models
class MediaHistoricoCreate(BaseModel):
    cliente_id: str
    colaborador_id: str
    competencia: str
    salario_bruto: float
    horas_extras: float = 0.0
    comissoes: float = 0.0
    adicionais: float = 0.0

class MediaHistoricoResponse(BaseModel):
    id: str
    cliente_id: str
    colaborador_id: str
    competencia: str
    salario_bruto: float
    horas_extras: float
    comissoes: float
    adicionais: float
    total: float
    created_at: str

# Dashboard Models
class DashboardStats(BaseModel):
    total_clientes: int
    total_colaboradores: int
    dissidios_pendentes: int
    admissoes_pendentes: int
    validacoes_pendentes: int
    tarefas_recentes: List[Dict[str, Any]]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "senha": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "nome": user.nome,
        "email": user.email,
        "senha": hash_password(user.senha),
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, nome=user.nome, email=user.email, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.senha, user["senha"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            nome=user["nome"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ==================== RECEITA FEDERAL LOOKUP ====================

@api_router.get("/receita/{cnpj}")
async def buscar_cnpj_receita(cnpj: str, current_user: dict = Depends(get_current_user)):
    """Busca dados de CNPJ na Receita Federal via API pública"""
    import requests
    
    # Clean CNPJ (remove . / -)
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    
    if len(cnpj_limpo) != 14:
        raise HTTPException(status_code=400, detail="CNPJ deve ter 14 dígitos")
    
    try:
        # Use ReceitaWS API (free tier)
        response = requests.get(
            f"https://receitaws.com.br/v1/cnpj/{cnpj_limpo}",
            timeout=30,
            headers={"Accept": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("status") == "ERROR":
                raise HTTPException(status_code=404, detail=data.get("message", "CNPJ não encontrado"))
            
            # Format address
            logradouro = data.get('logradouro', '')
            numero = data.get('numero', '')
            bairro = data.get('bairro', '')
            endereco = f"{logradouro} {numero}".strip()
            if bairro:
                endereco += f", {bairro}"
            
            # Format response with all available fields
            return {
                "cnpj": data.get("cnpj", cnpj_limpo),
                "razao_social": data.get("nome", ""),
                "nome_fantasia": data.get("fantasia", ""),
                "endereco": endereco,
                "cidade": data.get("municipio", ""),
                "uf": data.get("uf", ""),
                "cep": data.get("cep", ""),
                "telefone": data.get("telefone", ""),
                "email": data.get("email", ""),
                "cnae_principal": data.get("atividade_principal", [{}])[0].get("code", "") if data.get("atividade_principal") else "",
                "cnae_descricao": data.get("atividade_principal", [{}])[0].get("text", "") if data.get("atividade_principal") else "",
                "situacao": data.get("situacao", ""),
                "data_abertura": data.get("abertura", ""),
                "natureza_juridica": data.get("natureza_juridica", ""),
                "capital_social": data.get("capital_social", ""),
                "porte": data.get("porte", ""),
                "tipo": data.get("tipo", "")
            }
        elif response.status_code == 429:
            raise HTTPException(status_code=429, detail="Muitas requisições. Aguarde alguns segundos e tente novamente.")
        else:
            raise HTTPException(status_code=response.status_code, detail="Erro ao consultar Receita Federal")
            
    except requests.Timeout:
        raise HTTPException(status_code=504, detail="Timeout ao consultar Receita Federal")
    except requests.RequestException as e:
        logger.error(f"Erro na consulta à Receita: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao consultar Receita Federal")

# ==================== CLIENTE ROUTES ====================

@api_router.post("/clientes", response_model=ClienteResponse)
async def create_cliente(cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.clientes.find_one({"cnpj": cliente.cnpj})
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    
    cliente_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    cliente_doc = {
        "id": cliente_id,
        **cliente.model_dump(),
        "created_at": now,
        "user_id": current_user["id"]
    }
    await db.clientes.insert_one(cliente_doc)
    
    return ClienteResponse(id=cliente_id, **cliente.model_dump(), created_at=now, total_colaboradores=0)

@api_router.get("/clientes", response_model=List[ClienteResponse])
async def list_clientes(current_user: dict = Depends(get_current_user)):
    clientes = await db.clientes.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    result = []
    for c in clientes:
        total_colab = await db.colaboradores.count_documents({"cliente_id": c["id"]})
        result.append(ClienteResponse(**c, total_colaboradores=total_colab))
    return result

@api_router.get("/clientes/{cliente_id}", response_model=ClienteResponse)
async def get_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    total_colab = await db.colaboradores.count_documents({"cliente_id": cliente_id})
    return ClienteResponse(**cliente, total_colaboradores=total_colab)

@api_router.put("/clientes/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(cliente_id: str, cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    await db.clientes.update_one(
        {"id": cliente_id},
        {"$set": cliente.model_dump()}
    )
    updated = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    total_colab = await db.colaboradores.count_documents({"cliente_id": cliente_id})
    return ClienteResponse(**updated, total_colaboradores=total_colab)

@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clientes.delete_one({"id": cliente_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    # Also delete related colaboradores
    await db.colaboradores.delete_many({"cliente_id": cliente_id})
    return {"message": "Cliente excluído com sucesso"}


@api_router.post("/clientes/importar-lote")
async def importar_clientes_lote(
    arquivo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Importa empresas em lote a partir de um arquivo CSV ou Excel.
    Formato esperado: CNPJ, Razão Social, Nome Fantasia, Endereço, Telefone, Email, Tipo Atividade, Data Base Dissídio, Sindicato
    """
    try:
        content = await arquivo.read()
        filename = arquivo.filename.lower()
        
        empresas_importadas = []
        empresas_erros = []
        
        # Determinar tipo de arquivo e processar
        if filename.endswith('.csv'):
            import io
            import csv
            
            # Tentar diferentes encodings
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    text_content = content.decode(encoding)
                    break
                except:
                    continue
            else:
                text_content = content.decode('utf-8', errors='ignore')
            
            reader = csv.DictReader(io.StringIO(text_content), delimiter=';')
            rows = list(reader)
            
            # Se não encontrou colunas, tentar com vírgula
            if not rows or not rows[0]:
                reader = csv.DictReader(io.StringIO(text_content), delimiter=',')
                rows = list(reader)
            
        elif filename.endswith(('.xlsx', '.xls')):
            import pandas as pd
            import io
            
            df = pd.read_excel(io.BytesIO(content))
            rows = df.to_dict('records')
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use CSV ou Excel.")
        
        # Mapear nomes de colunas possíveis
        column_mapping = {
            'cnpj': ['cnpj', 'CNPJ', 'Cnpj', 'cnpj_empresa'],
            'razao_social': ['razao_social', 'RAZAO_SOCIAL', 'Razão Social', 'razao social', 'RazaoSocial', 'razao'],
            'nome_fantasia': ['nome_fantasia', 'NOME_FANTASIA', 'Nome Fantasia', 'nome fantasia', 'NomeFantasia', 'fantasia'],
            'endereco': ['endereco', 'ENDERECO', 'Endereço', 'endereco_completo', 'logradouro'],
            'telefone': ['telefone', 'TELEFONE', 'Telefone', 'tel', 'fone'],
            'email': ['email', 'EMAIL', 'Email', 'e-mail', 'E-mail'],
            'tipo_atividade': ['tipo_atividade', 'TIPO_ATIVIDADE', 'Tipo Atividade', 'segmento', 'ramo', 'atividade'],
            'data_base_dissidio': ['data_base_dissidio', 'data_base', 'DATA_BASE', 'Data Base', 'database'],
            'sindicato': ['sindicato', 'SINDICATO', 'Sindicato']
        }
        
        def get_value(row, field_names):
            for name in field_names:
                if name in row and row[name]:
                    val = row[name]
                    if pd.notna(val) if 'pandas' in str(type(val)) else val:
                        return str(val).strip()
            return None
        
        for idx, row in enumerate(rows, 1):
            try:
                cnpj = get_value(row, column_mapping['cnpj'])
                razao_social = get_value(row, column_mapping['razao_social'])
                
                if not cnpj or not razao_social:
                    empresas_erros.append({
                        "linha": idx,
                        "erro": "CNPJ ou Razão Social não informados",
                        "dados": str(row)[:100]
                    })
                    continue
                
                # Limpar CNPJ (remover caracteres especiais)
                cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
                if len(cnpj_limpo) == 14:
                    cnpj_formatado = f"{cnpj_limpo[:2]}.{cnpj_limpo[2:5]}.{cnpj_limpo[5:8]}/{cnpj_limpo[8:12]}-{cnpj_limpo[12:14]}"
                else:
                    cnpj_formatado = cnpj
                
                # Verificar se CNPJ já existe
                existing = await db.clientes.find_one({"cnpj": cnpj_formatado})
                if existing:
                    empresas_erros.append({
                        "linha": idx,
                        "erro": f"CNPJ {cnpj_formatado} já cadastrado",
                        "dados": razao_social
                    })
                    continue
                
                # Criar empresa
                cliente_id = str(uuid.uuid4())
                now = datetime.now(timezone.utc).isoformat()
                
                cliente_doc = {
                    "id": cliente_id,
                    "cnpj": cnpj_formatado,
                    "razao_social": razao_social,
                    "nome_fantasia": get_value(row, column_mapping['nome_fantasia']) or razao_social,
                    "endereco": get_value(row, column_mapping['endereco']) or "",
                    "telefone": get_value(row, column_mapping['telefone']) or "",
                    "email": get_value(row, column_mapping['email']) or "",
                    "tipo_atividade": get_value(row, column_mapping['tipo_atividade']) or "",
                    "data_base_dissidio": get_value(row, column_mapping['data_base_dissidio']) or "",
                    "sindicato": get_value(row, column_mapping['sindicato']) or "",
                    "created_at": now,
                    "user_id": current_user["id"]
                }
                
                await db.clientes.insert_one(cliente_doc)
                empresas_importadas.append({
                    "id": cliente_id,
                    "cnpj": cnpj_formatado,
                    "razao_social": razao_social
                })
                
            except Exception as e:
                empresas_erros.append({
                    "linha": idx,
                    "erro": str(e),
                    "dados": str(row)[:100]
                })
        
        return {
            "success": True,
            "total_processadas": len(rows),
            "importadas": len(empresas_importadas),
            "erros": len(empresas_erros),
            "empresas_importadas": empresas_importadas,
            "empresas_erros": empresas_erros[:20]  # Limitar erros retornados
        }
        
    except Exception as e:
        logger.error(f"Erro na importação em lote: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")

# ==================== COLABORADOR ROUTES ====================

@api_router.post("/colaboradores", response_model=ColaboradorResponse)
async def create_colaborador(colaborador: ColaboradorCreate, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": colaborador.cliente_id, "user_id": current_user["id"]})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    colaborador_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    colab_doc = {
        "id": colaborador_id,
        **colaborador.model_dump(),
        "created_at": now
    }
    await db.colaboradores.insert_one(colab_doc)
    
    return ColaboradorResponse(id=colaborador_id, **colaborador.model_dump(), created_at=now)

@api_router.get("/colaboradores", response_model=List[ColaboradorResponse])
async def list_colaboradores(cliente_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if cliente_id:
        cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        query["cliente_id"] = cliente_id
    else:
        clientes = await db.clientes.find({"user_id": current_user["id"]}, {"id": 1}).to_list(1000)
        cliente_ids = [c["id"] for c in clientes]
        query["cliente_id"] = {"$in": cliente_ids}
    
    colaboradores = await db.colaboradores.find(query, {"_id": 0}).to_list(1000)
    return [ColaboradorResponse(**c) for c in colaboradores]

@api_router.get("/colaboradores/{colaborador_id}", response_model=ColaboradorResponse)
async def get_colaborador(colaborador_id: str, current_user: dict = Depends(get_current_user)):
    colaborador = await db.colaboradores.find_one({"id": colaborador_id}, {"_id": 0})
    if not colaborador:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return ColaboradorResponse(**colaborador)

@api_router.put("/colaboradores/{colaborador_id}", response_model=ColaboradorResponse)
async def update_colaborador(colaborador_id: str, colaborador: ColaboradorCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.colaboradores.find_one({"id": colaborador_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    
    await db.colaboradores.update_one(
        {"id": colaborador_id},
        {"$set": colaborador.model_dump()}
    )
    updated = await db.colaboradores.find_one({"id": colaborador_id}, {"_id": 0})
    return ColaboradorResponse(**updated)

@api_router.delete("/colaboradores/{colaborador_id}")
async def delete_colaborador(colaborador_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.colaboradores.delete_one({"id": colaborador_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return {"message": "Colaborador excluído com sucesso"}


@api_router.post("/colaboradores/importar")
async def importar_colaborador_documento(
    file: UploadFile = File(...),
    cliente_id: str = None,
    tipo_documento: str = "auto",  # auto, ficha_registro, holerite, ficha_esocial
    use_ai: bool = True,  # Se False, usa apenas OCR local
    current_user: dict = Depends(get_current_user)
):
    """Importa colaboradores usando IA (Emergent) para melhor precisão"""
    from document_processor import doc_processor
    
    # Validate cliente
    if cliente_id:
        cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
        if not cliente:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    content = await file.read()
    suffix = Path(file.filename).suffix
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        colaboradores = []
        confianca = "baixa"
        extracted_text = ""  # Inicializa a variável
        
        # SEMPRE usa IA para melhor precisão na extração
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        
        if emergent_key:
            try:
                import asyncio
                logger.info(f"Extraindo colaboradores com IA de {file.filename}")
                colaboradores_ai = await asyncio.wait_for(
                    _extract_with_emergent_ai(tmp_path, suffix, tipo_documento, emergent_key),
                    timeout=60.0  # 60 segundos para documentos grandes
                )
                if colaboradores_ai:
                    colaboradores = colaboradores_ai
                    confianca = "alta"
                    logger.info(f"IA extraiu {len(colaboradores)} colaborador(es)")
            except asyncio.TimeoutError:
                logger.warning("IA timeout - tentando OCR local")
            except Exception as e:
                logger.error(f"IA falhou: {e}")
        
        # Fallback para OCR local se IA não funcionou
        if not colaboradores:
            logger.info(f"Usando OCR local para {file.filename}")
            extracted_text = doc_processor.extract_text(tmp_path)
            
            if extracted_text and len(extracted_text) > 100:
                colaboradores = doc_processor.parse_colaboradores_from_text(extracted_text)
                
                # Filtra nomes inválidos
                invalid_names = ['registro', 'colaboradores', 'empregado', 'funcionário', 'empresa', 'ficha', 'ltda', 'eireli', 's/a', 'cnpj']
                colaboradores = [c for c in colaboradores if c.get('nome') and not any(inv in c.get('nome', '').lower() for inv in invalid_names)]
                
                if colaboradores:
                    confianca = "media"
        
        # Prepara resposta
        if not colaboradores:
            colaboradores = [{"nome": "", "cpf": "", "cargo": "", "salario_base": 0}]
            confianca = "baixa"
        
        return {
            "tipo_documento_detectado": tipo_documento,
            "confianca": confianca,
            "total_colaboradores": len(colaboradores),
            "colaboradores": colaboradores,
            "metodo_extracao": "ocr_local" if confianca != "alta" else "ia",
            "texto_extraido_preview": extracted_text[:500] if extracted_text else ""
        }
        
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


async def _extract_with_emergent_ai(tmp_path: str, suffix: str, tipo_documento: str, api_key: str) -> List[Dict]:
    """Extração usando Emergent AI - chamada interna"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"importar-colab-{uuid.uuid4()}",
        system_message="""Você é um especialista em departamento pessoal brasileiro.
Sua tarefa é extrair dados de FUNCIONÁRIOS/COLABORADORES de documentos de RH.

⚠️ ATENÇÃO - REGRAS CRÍTICAS:
1. SEPARE dados da EMPRESA dos dados do FUNCIONÁRIO
2. O NOME do funcionário NUNCA é o nome da empresa (LTDA, EIRELI, S/A, ME, etc são empresas!)
3. O CPF do funcionário tem 11 dígitos, CNPJ tem 14 dígitos - NÃO CONFUNDA
4. Cada funcionário é uma PESSOA FÍSICA com nome próprio

📋 ESTRUTURA DO DOCUMENTO:
- Geralmente no TOPO: dados da EMPRESA (razão social, CNPJ, endereço da empresa)
- No CORPO: dados dos FUNCIONÁRIOS (nome, CPF, cargo, salário, etc)

🔍 COMO IDENTIFICAR UM FUNCIONÁRIO:
- Tem CPF (11 dígitos)
- Tem nome de PESSOA (João, Maria, Carlos, etc)
- Pode ter cargo, salário, data de admissão
- NUNCA tem CNPJ

Retorne em formato JSON EXATAMENTE assim:
{
    "colaboradores": [
        {
            "nome": "NOME COMPLETO DO FUNCIONÁRIO EM MAIÚSCULAS",
            "cpf": "000.000.000-00",
            "rg": "número do RG",
            "rg_orgao_emissor": "SSP",
            "rg_data_emissao": "DD/MM/AAAA",
            "rg_uf": "SP",
            "data_nascimento": "DD/MM/AAAA",
            "cidade_nascimento": "cidade",
            "uf_nascimento": "SP",
            "sexo": "masculino ou feminino",
            "estado_civil": "solteiro/casado/divorciado/viuvo/separado/uniao_estavel",
            "grau_instrucao": "fundamental/medio/superior/pos_graduacao/mestrado/doutorado",
            "etnia": "branca/preta/parda/amarela/indigena",
            "nome_mae": "nome completo da mãe",
            "nome_pai": "nome completo do pai",
            "endereco": "rua/avenida completa",
            "numero": "número",
            "complemento": "apto/bloco",
            "bairro": "bairro",
            "cidade": "cidade",
            "uf": "UF",
            "cep": "00000-000",
            "ddd": "11",
            "celular": "999999999",
            "telefone": "telefone fixo",
            "email": "email@exemplo.com",
            "pis": "número PIS/PASEP",
            "ctps": "número CTPS",
            "ctps_serie": "série",
            "ctps_uf": "UF",
            "ctps_data_emissao": "DD/MM/AAAA",
            "titulo_eleitor": "número",
            "titulo_zona": "zona",
            "titulo_secao": "seção",
            "reservista": "número certificado",
            "cnh": "número CNH",
            "cnh_uf": "UF",
            "cnh_categoria": "B/AB/C/D/E",
            "cnh_vencimento": "DD/MM/AAAA",
            "cargo": "cargo/função",
            "departamento": "setor/departamento",
            "data_admissao": "DD/MM/AAAA",
            "salario_base": 0.00,
            "horista": false,
            "prazo_experiencia": "45/90 dias",
            "quadro_horario": "08:00 às 17:00",
            "data_exame_admissional": "DD/MM/AAAA",
            "insalubridade_percentual": null,
            "periculosidade_percentual": null,
            "vale_transporte": true,
            "adiantamento_salarial": false,
            "desconto_sindical": false,
            "deficiencia": false,
            "tipo_deficiencia": null,
            "banco": "código ou nome",
            "agencia": "número",
            "conta": "número",
            "dependentes": [
                {
                    "nome": "nome do dependente",
                    "parentesco": "filho/cônjuge/pai/mae",
                    "data_nascimento": "DD/MM/AAAA",
                    "cpf": "CPF"
                }
            ]
        }
    ]
}

REGRAS:
1. Extraia TODOS os funcionários do documento
2. O campo "sexo" deve ser "masculino" ou "feminino" (baseado no nome se não explícito)
3. Salário SEMPRE como número decimal (ex: 1850.00, não "R$ 1.850,00")
4. Datas SEMPRE no formato DD/MM/AAAA
5. CPF com pontuação (000.000.000-00)
6. Se não encontrar um campo, use null
7. NUNCA coloque dados da empresa como se fossem do funcionário"""
    ).with_model("gemini", "gemini-2.0-flash")
    
    # Tipos de arquivos que podem ser enviados como anexo para a IA
    mime_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel"
    }
    
    # Arquivos de texto devem ter seu conteúdo enviado diretamente na mensagem
    text_extensions = ['.txt', '.csv', '.md', '.text']
    is_text_file = suffix.lower() in text_extensions
    
    # Retry logic
    max_retries = 2
    for attempt in range(max_retries):
        try:
            if is_text_file:
                # Para arquivos de texto, lê o conteúdo e envia diretamente
                with open(tmp_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text_content = f.read()
                
                response = await chat.send_message(UserMessage(
                    text=f"""EXTRAIA OS DADOS DOS FUNCIONÁRIOS do texto abaixo.

IMPORTANTE:
- IGNORE os dados da empresa (razão social, CNPJ, endereço da empresa)
- EXTRAIA apenas dados de PESSOAS FÍSICAS (funcionários/colaboradores)
- O nome do funcionário é de PESSOA (ex: João Silva, Maria Santos), NUNCA de empresa
- Preencha TODOS os campos que conseguir encontrar
- Inclua sexo, estado civil, endereço completo, documentos, dados bancários
- Se houver múltiplos funcionários, extraia TODOS

=== DOCUMENTO ===
{text_content}
================="""
                ))
            else:
                # Para outros tipos de arquivo (PDF, imagem, Excel), anexa o arquivo
                mime_type = mime_types.get(suffix.lower(), "application/pdf")
                file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
                
                response = await chat.send_message(UserMessage(
                    text="""EXTRAIA OS DADOS DOS FUNCIONÁRIOS deste documento.

IMPORTANTE:
- IGNORE os dados da empresa (razão social, CNPJ, endereço da empresa)
- EXTRAIA apenas dados de PESSOAS FÍSICAS (funcionários/colaboradores)
- O nome do funcionário é de PESSOA (ex: João Silva, Maria Santos), NUNCA de empresa
- Preencha TODOS os campos que conseguir encontrar
- Inclua sexo, estado civil, endereço completo, documentos, dados bancários
- Se houver múltiplos funcionários, extraia TODOS""",
                    file_contents=[file_content]
                ))
            break
        except Exception as e:
            if attempt < max_retries - 1 and ("502" in str(e) or "503" in str(e)):
                import asyncio
                await asyncio.sleep(2)
                continue
            raise e
    
    # Parse JSON response
    try:
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        resultado = json.loads(response_text.strip())
        colaboradores = resultado.get("colaboradores", [])
        
        # Validação adicional - remove registros que parecem ser empresas
        colaboradores_validos = []
        for c in colaboradores:
            nome = c.get('nome', '').upper()
            # Verifica se o nome parece ser de empresa
            empresa_indicators = ['LTDA', 'EIRELI', 'S/A', 'S.A.', 'ME', 'EPP', 'CNPJ', 'EMPRESA', 'COMERCIO', 'SERVICOS', 'INDUSTRIA']
            is_empresa = any(ind in nome for ind in empresa_indicators)
            
            # Verifica se tem CPF válido (11 dígitos)
            cpf = c.get('cpf', '').replace('.', '').replace('-', '').replace(' ', '')
            has_valid_cpf = len(cpf) == 11 and cpf.isdigit()
            
            # Só adiciona se parecer ser pessoa física
            if not is_empresa and (has_valid_cpf or len(nome.split()) >= 2):
                colaboradores_validos.append(c)
        
        return colaboradores_validos if colaboradores_validos else colaboradores
        
    except (json.JSONDecodeError, IndexError, KeyError) as e:
        logger.error(f"Erro ao parsear resposta da IA: {e}")
        return []

@api_router.post("/colaboradores/salvar-lote")
async def salvar_colaboradores_lote(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Salva múltiplos colaboradores de uma vez"""
    try:
        cliente_id = data.get("cliente_id")
        colaboradores = data.get("colaboradores", [])
        
        if not colaboradores:
            raise HTTPException(status_code=400, detail="Nenhum colaborador para salvar")
        
        if not cliente_id:
            raise HTTPException(status_code=400, detail="cliente_id é obrigatório")
        
        # Verify cliente exists
        cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
        if not cliente:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        saved = []
        errors = []
        
        for colab in colaboradores:
            try:
                colab_id = str(uuid.uuid4())
                now = datetime.now(timezone.utc).isoformat()
                
                colab_doc = {
                    "id": colab_id,
                    "cliente_id": cliente_id,
                    "user_id": current_user["id"],
                    **colab,
                    "created_at": now,
                    "updated_at": now
                }
                
                await db.colaboradores.insert_one(colab_doc)
                saved.append({"id": colab_id, "nome": colab.get("nome", "")})
            except Exception as e:
                errors.append({"nome": colab.get("nome", ""), "erro": str(e)})
        
        return {
            "success": True,
            "total_salvos": len(saved),
            "total_erros": len(errors),
            "salvos": saved,
            "erros": errors,
            "message": f"{len(saved)} colaborador(es) salvo(s) com sucesso."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao salvar colaboradores em lote: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar: {str(e)}")

@api_router.post("/colaboradores/importar-lote")
async def importar_colaboradores_lote(
    files: List[UploadFile] = File(...),
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Importa múltiplos colaboradores de uma vez"""
    resultados = []
    for file in files:
        try:
            # Reuse single import logic
            result = await importar_colaborador_documento(file, cliente_id, "auto", current_user)
            resultados.append({
                "arquivo": file.filename,
                "sucesso": True,
                "dados": result
            })
        except Exception as e:
            resultados.append({
                "arquivo": file.filename,
                "sucesso": False,
                "erro": str(e)
            })
    
    return {
        "total": len(files),
        "sucesso": len([r for r in resultados if r["sucesso"]]),
        "falhas": len([r for r in resultados if not r["sucesso"]]),
        "resultados": resultados
    }

# ==================== DISSÍDIO ROUTES ====================

@api_router.post("/dissidios", response_model=DissidioResponse)
async def create_dissidio(dissidio: DissidioCreate, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": dissidio.cliente_id, "user_id": current_user["id"]})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Calculate affected employees and total adjustment
    colaboradores = await db.colaboradores.find({"cliente_id": dissidio.cliente_id}).to_list(1000)
    total_reajuste = sum(c.get("salario_base", 0) * (dissidio.percentual_reajuste / 100) for c in colaboradores)
    
    dissidio_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    dissidio_doc = {
        "id": dissidio_id,
        **dissidio.model_dump(),
        "status": "pendente",
        "colaboradores_afetados": len(colaboradores),
        "valor_total_reajuste": round(total_reajuste, 2),
        "created_at": now,
        "aprovado_em": None,
        "user_id": current_user["id"]
    }
    await db.dissidios.insert_one(dissidio_doc)
    
    return DissidioResponse(**{k: v for k, v in dissidio_doc.items() if k != "user_id" and k != "_id"})

@api_router.get("/dissidios", response_model=List[DissidioResponse])
async def list_dissidios(cliente_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    dissidios = await db.dissidios.find(query, {"_id": 0, "user_id": 0}).to_list(1000)
    return [DissidioResponse(**d) for d in dissidios]

@api_router.put("/dissidios/{dissidio_id}/aprovar")
async def aprovar_dissidio(dissidio_id: str, current_user: dict = Depends(get_current_user)):
    dissidio = await db.dissidios.find_one({"id": dissidio_id, "user_id": current_user["id"]})
    if not dissidio:
        raise HTTPException(status_code=404, detail="Dissídio não encontrado")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Apply adjustment to all employees
    percentual = dissidio["percentual_reajuste"]
    await db.colaboradores.update_many(
        {"cliente_id": dissidio["cliente_id"]},
        {"$mul": {"salario_base": 1 + (percentual / 100)}}
    )
    
    await db.dissidios.update_one(
        {"id": dissidio_id},
        {"$set": {"status": "aprovado", "aprovado_em": now}}
    )
    
    return {"message": "Dissídio aprovado e salários atualizados com sucesso"}

@api_router.put("/dissidios/{dissidio_id}/rejeitar")
async def rejeitar_dissidio(dissidio_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.dissidios.update_one(
        {"id": dissidio_id, "user_id": current_user["id"]},
        {"$set": {"status": "rejeitado"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Dissídio não encontrado")
    return {"message": "Dissídio rejeitado"}

@api_router.get("/dissidios/{dissidio_id}/previa")
async def previa_dissidio(dissidio_id: str, current_user: dict = Depends(get_current_user)):
    """Get preview of salary adjustments for a dissídio before approval"""
    dissidio = await db.dissidios.find_one({"id": dissidio_id, "user_id": current_user["id"]})
    if not dissidio:
        raise HTTPException(status_code=404, detail="Dissídio não encontrado")
    
    percentual = dissidio["percentual_reajuste"]
    colaboradores = await db.colaboradores.find(
        {"cliente_id": dissidio["cliente_id"]},
        {"_id": 0, "id": 1, "nome": 1, "cpf": 1, "cargo": 1, "salario_base": 1}
    ).to_list(1000)
    
    previa_colaboradores = []
    total_atual = 0
    total_novo = 0
    total_diferenca = 0
    
    for colab in colaboradores:
        salario_atual = colab.get("salario_base", 0) or 0
        diferenca = round(salario_atual * (percentual / 100), 2)
        salario_novo = round(salario_atual + diferenca, 2)
        
        total_atual += salario_atual
        total_novo += salario_novo
        total_diferenca += diferenca
        
        previa_colaboradores.append({
            "id": colab.get("id"),
            "nome": colab.get("nome", ""),
            "cpf": colab.get("cpf", ""),
            "cargo": colab.get("cargo", ""),
            "salario_atual": salario_atual,
            "salario_novo": salario_novo,
            "diferenca": diferenca,
            "percentual": percentual
        })
    
    return {
        "dissidio_id": dissidio_id,
        "sindicato": dissidio.get("sindicato", ""),
        "percentual_reajuste": percentual,
        "data_base": dissidio.get("data_base", ""),
        "colaboradores": previa_colaboradores,
        "resumo": {
            "total_colaboradores": len(previa_colaboradores),
            "total_salarios_atual": round(total_atual, 2),
            "total_salarios_novo": round(total_novo, 2),
            "total_diferenca": round(total_diferenca, 2),
            "percentual": percentual
        }
    }

@api_router.post("/dissidios/simular")
async def simular_dissidio(
    cliente_id: str,
    percentual_reajuste: float,
    current_user: dict = Depends(get_current_user)
):
    """Simulate salary adjustments without creating a dissídio"""
    cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    colaboradores = await db.colaboradores.find(
        {"cliente_id": cliente_id},
        {"_id": 0, "id": 1, "nome": 1, "cpf": 1, "cargo": 1, "salario_base": 1}
    ).to_list(1000)
    
    previa_colaboradores = []
    total_atual = 0
    total_novo = 0
    total_diferenca = 0
    
    for colab in colaboradores:
        salario_atual = colab.get("salario_base", 0) or 0
        diferenca = round(salario_atual * (percentual_reajuste / 100), 2)
        salario_novo = round(salario_atual + diferenca, 2)
        
        total_atual += salario_atual
        total_novo += salario_novo
        total_diferenca += diferenca
        
        previa_colaboradores.append({
            "id": colab.get("id"),
            "nome": colab.get("nome", ""),
            "cpf": colab.get("cpf", ""),
            "cargo": colab.get("cargo", ""),
            "salario_atual": salario_atual,
            "salario_novo": salario_novo,
            "diferenca": diferenca,
            "percentual": percentual_reajuste
        })
    
    return {
        "cliente_id": cliente_id,
        "cliente_nome": cliente.get("nome_fantasia") or cliente.get("razao_social"),
        "percentual_reajuste": percentual_reajuste,
        "colaboradores": previa_colaboradores,
        "resumo": {
            "total_colaboradores": len(previa_colaboradores),
            "total_salarios_atual": round(total_atual, 2),
            "total_salarios_novo": round(total_novo, 2),
            "total_diferenca": round(total_diferenca, 2),
            "percentual": percentual_reajuste
        }
    }

# ==================== ADMISSÃO ROUTES ====================

@api_router.post("/admissoes/extrair")
async def extrair_dados_admissao(
    file: UploadFile = File(...),
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Extract employee data from uploaded document using AI"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        # Save uploaded file temporarily
        content = await file.read()
        suffix = Path(file.filename).suffix
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Use Gemini for file analysis (supports file attachments)
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"admissao-{uuid.uuid4()}",
                system_message="""Você é um assistente especializado em extração de dados de documentos de admissão de funcionários.
                Extraia todas as informações possíveis do documento e retorne em formato JSON com os seguintes campos quando disponíveis:
                - nome (nome completo)
                - cpf
                - rg
                - data_nascimento (formato DD/MM/YYYY)
                - endereco
                - telefone
                - email
                - pis
                - ctps
                - cargo
                - salario_base (apenas o número)
                - data_admissao (formato DD/MM/YYYY)
                - banco
                - agencia
                - conta
                
                Retorne APENAS o JSON, sem texto adicional."""
            ).with_model("gemini", "gemini-2.5-flash")
            
            # Determine mime type
            mime_types = {
                ".pdf": "application/pdf",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png"
            }
            mime_type = mime_types.get(suffix.lower(), "application/octet-stream")
            
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text="Extraia os dados de admissão do funcionário deste documento.",
                file_contents=[file_content]
            ))
            
            # Parse JSON from response
            try:
                # Try to extract JSON from response
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                dados = json.loads(response_text.strip())
            except json.JSONDecodeError:
                dados = {"raw_response": response, "parsing_error": True}
            
            # Save admission record
            admissao_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            admissao_doc = {
                "id": admissao_id,
                "cliente_id": cliente_id,
                "dados_extraidos": dados,
                "status": "pendente",
                "created_at": now,
                "user_id": current_user["id"]
            }
            await db.admissoes.insert_one(admissao_doc)
            
            return {
                "id": admissao_id,
                "dados_extraidos": dados,
                "status": "pendente",
                "message": "Dados extraídos com sucesso. Revise e confirme."
            }
            
        finally:
            # Clean up temp file
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Erro na extração: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar documento: {str(e)}")

@api_router.get("/admissoes", response_model=List[AdmissaoResponse])
async def list_admissoes(cliente_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    admissoes = await db.admissoes.find(query, {"_id": 0, "user_id": 0}).to_list(1000)
    return [AdmissaoResponse(**a) for a in admissoes]

@api_router.post("/admissoes/{admissao_id}/confirmar")
async def confirmar_admissao(admissao_id: str, dados: ColaboradorCreate, current_user: dict = Depends(get_current_user)):
    """Confirm admission and create employee record"""
    admissao = await db.admissoes.find_one({"id": admissao_id, "user_id": current_user["id"]})
    if not admissao:
        raise HTTPException(status_code=404, detail="Admissão não encontrada")
    
    # Create colaborador
    colaborador = await create_colaborador(dados, current_user)
    
    # Update admission status
    await db.admissoes.update_one(
        {"id": admissao_id},
        {"$set": {"status": "confirmado", "colaborador_id": colaborador.id}}
    )
    
    return {"message": "Admissão confirmada", "colaborador": colaborador}

# ==================== VALIDAÇÃO FOLHA ROUTES ====================

@api_router.post("/validacoes/analisar")
async def analisar_folha(
    file: UploadFile = File(...),
    cliente_id: str = None,
    mes_referencia: str = None,
    ano_referencia: int = None,
    current_user: dict = Depends(get_current_user)
):
    """Analyze payroll spreadsheet and detect discrepancies"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        content = await file.read()
        suffix = Path(file.filename).suffix
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"validacao-{uuid.uuid4()}",
                system_message="""Você é um auditor especializado em folha de pagamento.
                Analise o documento e identifique:
                1. Possíveis erros de cálculo
                2. Valores inconsistentes
                3. Dados faltantes
                4. Discrepâncias entre valores
                
                Retorne em JSON com a estrutura:
                {
                    "total_verificados": número de funcionários analisados,
                    "total_erros": número de problemas encontrados,
                    "discrepancias": [
                        {
                            "funcionario": "nome",
                            "tipo": "tipo do problema",
                            "descricao": "descrição detalhada",
                            "severidade": "alta/media/baixa"
                        }
                    ],
                    "resumo": "resumo geral da análise"
                }"""
            ).with_model("gemini", "gemini-2.5-flash")
            
            mime_types = {
                ".pdf": "application/pdf",
                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xls": "application/vnd.ms-excel",
                ".csv": "text/csv"
            }
            mime_type = mime_types.get(suffix.lower(), "application/octet-stream")
            
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text="Analise esta folha de pagamento e identifique possíveis erros e discrepâncias.",
                file_contents=[file_content]
            ))
            
            # Parse response
            try:
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                resultado = json.loads(response_text.strip())
            except json.JSONDecodeError:
                resultado = {
                    "total_verificados": 0,
                    "total_erros": 0,
                    "discrepancias": [],
                    "resumo": response
                }
            
            # Save validation record
            validacao_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            validacao_doc = {
                "id": validacao_id,
                "cliente_id": cliente_id,
                "mes_referencia": mes_referencia or datetime.now().strftime("%m"),
                "ano_referencia": ano_referencia or datetime.now().year,
                "status": "concluido",
                "discrepancias": resultado.get("discrepancias", []),
                "total_verificados": resultado.get("total_verificados", 0),
                "total_erros": resultado.get("total_erros", 0),
                "resumo": resultado.get("resumo", ""),
                "created_at": now,
                "user_id": current_user["id"]
            }
            await db.validacoes.insert_one(validacao_doc)
            
            return {
                "id": validacao_id,
                **resultado,
                "message": "Análise concluída"
            }
            
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Erro na validação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao analisar folha: {str(e)}")

@api_router.post("/validacoes/comparar-apoio")
async def comparar_holerite_apoio(
    holerite: UploadFile = File(...),
    apoio: UploadFile = File(...),
    cliente_id: str = None,
    mes_referencia: str = None,
    ano_referencia: int = None,
    current_user: dict = Depends(get_current_user)
):
    """Compare holerite with support document (email, spreadsheet, image, etc.) to validate data"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        # Read both files
        holerite_content = await holerite.read()
        apoio_content = await apoio.read()
        
        holerite_suffix = Path(holerite.filename).suffix
        apoio_suffix = Path(apoio.filename).suffix
        
        # Save to temp files
        with tempfile.NamedTemporaryFile(delete=False, suffix=holerite_suffix) as tmp1:
            tmp1.write(holerite_content)
            holerite_path = tmp1.name
            
        with tempfile.NamedTemporaryFile(delete=False, suffix=apoio_suffix) as tmp2:
            tmp2.write(apoio_content)
            apoio_path = tmp2.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"comparar-apoio-{uuid.uuid4()}",
                system_message="""Você é um auditor especializado em departamento pessoal brasileiro.
                
Você receberá DOIS documentos:
1. HOLERITE/FOLHA DE PAGAMENTO: O documento oficial gerado pelo sistema de folha
2. RELATÓRIO DE APOIO: Um documento de referência (pode ser email, planilha, imagem, PDF) com informações que devem constar no holerite

Sua tarefa é COMPARAR os dois documentos e identificar DIVERGÊNCIAS, verificando se as informações do relatório de apoio estão corretamente refletidas no holerite.

Exemplos de verificações:
- Horas extras informadas no apoio vs horas extras no holerite
- Comissões de vendas no apoio vs comissões no holerite
- Faltas/atrasos no apoio vs descontos no holerite
- Adicional noturno, DSR, gratificações
- Valores de benefícios (VT, VR, VA)
- Qualquer outra referência numérica ou informação que possa ser cruzada

Retorne em JSON com a estrutura:
{
    "tipo_validacao": "comparacao_apoio",
    "total_verificados": número de itens/valores verificados,
    "divergencias_encontradas": número de divergências encontradas,
    "divergencias": [
        {
            "campo": "nome do campo (ex: horas_extras, comissao, falta)",
            "funcionario": "nome do funcionário se identificável",
            "tipo": "tipo da divergência",
            "descricao": "descrição detalhada da divergência",
            "valor_holerite": "valor encontrado no holerite",
            "valor_apoio": "valor encontrado no relatório de apoio",
            "severidade": "alta/media/baixa"
        }
    ],
    "campos_conferidos": ["lista dos campos que foram verificados e estão corretos"],
    "resumo": "resumo geral da comparação",
    "recomendacoes": ["lista de ações recomendadas para corrigir as divergências"]
}

IMPORTANTE:
- Se não conseguir identificar valores específicos, descreva o que foi possível verificar
- Considere variações de formatação (1.500,00 vs 1500.00)
- Se o documento de apoio for uma imagem ou manuscrito, extraia o máximo possível
- Severidade ALTA: valores muito diferentes ou que impactam significativamente
- Severidade MÉDIA: pequenas diferenças ou arredondamentos
- Severidade BAIXA: divergências menores ou de formatação"""
            ).with_model("gemini", "gemini-2.5-flash")
            
            # Determine MIME types
            mime_types = {
                ".pdf": "application/pdf",
                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xls": "application/vnd.ms-excel",
                ".csv": "text/csv",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".txt": "text/plain",
                ".eml": "message/rfc822",
                ".msg": "application/vnd.ms-outlook"
            }
            
            holerite_mime = mime_types.get(holerite_suffix.lower(), "application/octet-stream")
            apoio_mime = mime_types.get(apoio_suffix.lower(), "application/octet-stream")
            
            holerite_file_content = FileContentWithMimeType(file_path=holerite_path, mime_type=holerite_mime)
            apoio_file_content = FileContentWithMimeType(file_path=apoio_path, mime_type=apoio_mime)
            
            response = await chat.send_message(UserMessage(
                text=f"""Compare os dois documentos anexados:

DOCUMENTO 1 (HOLERITE): {holerite.filename}
DOCUMENTO 2 (RELATÓRIO DE APOIO): {apoio.filename}

Verifique se as informações do relatório de apoio estão corretamente refletidas no holerite.
Identifique todas as divergências encontradas.""",
                file_contents=[holerite_file_content, apoio_file_content]
            ))
            
            # Parse response
            try:
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                resultado = json.loads(response_text.strip())
            except json.JSONDecodeError:
                resultado = {
                    "tipo_validacao": "comparacao_apoio",
                    "total_verificados": 0,
                    "divergencias_encontradas": 0,
                    "divergencias": [],
                    "resumo": response
                }
            
            # Save validation record
            validacao_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            validacao_doc = {
                "id": validacao_id,
                "cliente_id": cliente_id,
                "mes_referencia": mes_referencia or datetime.now().strftime("%m"),
                "ano_referencia": ano_referencia or datetime.now().year,
                "tipo_validacao": "comparacao_apoio",
                "status": "concluido",
                "discrepancias": resultado.get("divergencias", []),
                "total_verificados": resultado.get("total_verificados", 0),
                "total_erros": resultado.get("divergencias_encontradas", 0),
                "resumo": resultado.get("resumo", ""),
                "recomendacoes": resultado.get("recomendacoes", []),
                "campos_conferidos": resultado.get("campos_conferidos", []),
                "holerite_filename": holerite.filename,
                "apoio_filename": apoio.filename,
                "created_at": now,
                "user_id": current_user["id"]
            }
            await db.validacoes.insert_one(validacao_doc)
            
            return {
                "id": validacao_id,
                **resultado,
                "message": "Comparação concluída"
            }
            
        finally:
            os.unlink(holerite_path)
            os.unlink(apoio_path)
            
    except Exception as e:
        logger.error(f"Erro na comparação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao comparar documentos: {str(e)}")


@api_router.post("/validacoes/validar-completa")
async def validacao_completa(
    holerite_atual: UploadFile = File(...),
    holerite_anterior: UploadFile = File(None),
    apoio_files: List[UploadFile] = File(default=[]),
    cliente_id: str = Form(...),
    mes_referencia: str = Form(...),
    ano_referencia: int = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Inicia validação assíncrona de folha de pagamento.
    Retorna um job_id para acompanhar o progresso via polling.
    """
    # Verificar cliente
    cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
    if not cliente:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Gerar job_id
    job_id = str(uuid.uuid4())
    
    # Criar diretório temporário para salvar os arquivos
    job_dir = f"/tmp/validacao_jobs/{job_id}"
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        # Salvar arquivos no diretório temporário
        holerite_atual_path = f"{job_dir}/holerite_atual{Path(holerite_atual.filename).suffix}"
        holerite_atual_content = await holerite_atual.read()
        with open(holerite_atual_path, 'wb') as f:
            f.write(holerite_atual_content)
        
        holerite_anterior_path = None
        if holerite_anterior and holerite_anterior.filename:
            holerite_anterior_content = await holerite_anterior.read()
            if holerite_anterior_content:
                holerite_anterior_path = f"{job_dir}/holerite_anterior{Path(holerite_anterior.filename).suffix}"
                with open(holerite_anterior_path, 'wb') as f:
                    f.write(holerite_anterior_content)
        
        apoio_paths = []
        apoio_filenames = []
        if apoio_files:
            for i, apoio in enumerate(apoio_files):
                if apoio and apoio.filename:
                    apoio_content = await apoio.read()
                    if apoio_content:
                        apoio_path = f"{job_dir}/apoio_{i}{Path(apoio.filename).suffix}"
                        with open(apoio_path, 'wb') as f:
                            f.write(apoio_content)
                        apoio_paths.append(apoio_path)
                        apoio_filenames.append(apoio.filename)
        
        # Inicializar job no dicionário
        validation_jobs[job_id] = {
            "status": "processing",
            "progress": 0,
            "step": "Iniciando validação...",
            "result": None,
            "error": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "cliente_id": cliente_id,
            "cliente_nome": cliente.get("nome_fantasia") or cliente.get("razao_social"),
            "mes_referencia": mes_referencia,
            "ano_referencia": ano_referencia,
            "user_id": current_user["id"]
        }
        
        # Iniciar processamento em background
        asyncio.create_task(process_validacao_background(
            job_id=job_id,
            job_dir=job_dir,
            holerite_atual_path=holerite_atual_path,
            holerite_atual_filename=holerite_atual.filename,
            holerite_anterior_path=holerite_anterior_path,
            holerite_anterior_filename=holerite_anterior.filename if holerite_anterior else None,
            apoio_paths=apoio_paths,
            apoio_filenames=apoio_filenames,
            cliente_id=cliente_id,
            cliente_nome=cliente.get("nome_fantasia") or cliente.get("razao_social"),
            mes_referencia=mes_referencia,
            ano_referencia=ano_referencia,
            user_id=current_user["id"]
        ))
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Validação iniciada. Use o endpoint de status para acompanhar."
        }
        
    except Exception as e:
        # Limpar diretório em caso de erro
        shutil.rmtree(job_dir, ignore_errors=True)
        logger.error(f"Erro ao iniciar validação: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao iniciar validação: {str(e)}")


async def process_validacao_background(
    job_id: str,
    job_dir: str,
    holerite_atual_path: str,
    holerite_atual_filename: str,
    holerite_anterior_path: Optional[str],
    holerite_anterior_filename: Optional[str],
    apoio_paths: List[str],
    apoio_filenames: List[str],
    cliente_id: str,
    cliente_nome: str,
    mes_referencia: str,
    ano_referencia: int,
    user_id: str
):
    """Processa validação em background e atualiza o job status."""
    try:
        from document_processor import doc_processor
        
        # Step 1: Extrair colaboradores da folha atual
        validation_jobs[job_id]["step"] = "Extraindo dados da folha atual..."
        validation_jobs[job_id]["progress"] = 10
        
        logger.info(f"[Job {job_id}] Extraindo colaboradores de {holerite_atual_filename}...")
        texto_atual = doc_processor.extract_text(holerite_atual_path)
        colaboradores_atual = doc_processor.parse_folha_multiplos_colaboradores(texto_atual)
        logger.info(f"[Job {job_id}] Encontrados {len(colaboradores_atual)} colaborador(es) na folha atual")
        
        validation_jobs[job_id]["progress"] = 25
        
        # Step 2: Processar holerite anterior
        colaboradores_anterior = []
        has_anterior = False
        if holerite_anterior_path:
            validation_jobs[job_id]["step"] = "Comparando com mês anterior..."
            has_anterior = True
            logger.info(f"[Job {job_id}] Extraindo colaboradores de {holerite_anterior_filename}...")
            texto_anterior = doc_processor.extract_text(holerite_anterior_path)
            colaboradores_anterior = doc_processor.parse_folha_multiplos_colaboradores(texto_anterior)
            logger.info(f"[Job {job_id}] Encontrados {len(colaboradores_anterior)} colaborador(es) na folha anterior")
        
        validation_jobs[job_id]["progress"] = 40
        
        # Step 3: Processar arquivos de apoio COM IA
        referencias_apoio = []
        has_apoio = False
        if apoio_paths:
            validation_jobs[job_id]["step"] = "Analisando arquivos de apoio com IA..."
            has_apoio = True
            for i, apoio_path in enumerate(apoio_paths):
                logger.info(f"[Job {job_id}] Extraindo referências de {apoio_filenames[i]} com IA...")
                refs = await doc_processor.extrair_referencias_apoio_ia(apoio_path)
                for ref in refs:
                    ref['arquivo'] = apoio_filenames[i]
                referencias_apoio.extend(refs)
                logger.info(f"[Job {job_id}] Encontradas {len(refs)} referências em {apoio_filenames[i]}")
        
        validation_jobs[job_id]["progress"] = 60
        validation_jobs[job_id]["step"] = "Validando colaboradores..."
        
        # Step 4: Criar índice de colaboradores anteriores por nome/CPF
        idx_anterior = {}
        for c in colaboradores_anterior:
            key = c.get('cpf') or c.get('nome', '').upper().strip()
            if key:
                idx_anterior[key] = c
                if c.get('nome'):
                    idx_anterior[c['nome'].upper().strip()] = c
        
        # Step 4b: Carregar itens fixos do cliente
        itens_fixos = await db.itens_fixos.find({
            "cliente_id": cliente_id,
            "user_id": user_id
        }, {"_id": 0}).to_list(100)
        
        # Criar índice de itens fixos por colaborador/campo
        itens_fixos_idx = {}
        for item in itens_fixos:
            colab_nome = (item.get('colaborador_nome') or '').upper().strip()
            campo = item.get('campo', '').lower()
            key = f"{colab_nome}|{campo}" if colab_nome else f"*|{campo}"
            itens_fixos_idx[key] = item
        
        logger.info(f"[Job {job_id}] Carregados {len(itens_fixos)} itens fixos")
        
        # Step 5: Processar cada colaborador
        resultado_colaboradores = []
        total_divergencias = 0
        total_conferidos = 0
        impacto_total = 0
        
        for colab in colaboradores_atual:
            nome = colab.get('nome', 'Sem Nome')
            cpf = colab.get('cpf', '')
            
            colab_resultado = {
                'nome': nome,
                'cpf': cpf,
                'matricula': colab.get('matricula', ''),
                'cargo': colab.get('cargo', ''),
                'status': 'ok',
                'dados_atuais': {
                    'salario_base': colab.get('salario_base', 0),
                    'horas_extras': colab.get('horas_extras', 0),
                    'horas_extras_50': colab.get('horas_extras_50', 0),
                    'horas_extras_50_ref': colab.get('horas_extras_50_ref', 0),
                    'horas_extras_100': colab.get('horas_extras_100', 0),
                    'horas_extras_100_ref': colab.get('horas_extras_100_ref', 0),
                    'adicional_noturno': colab.get('adicional_noturno', 0),
                    'vale_transporte': colab.get('vale_transporte', 0),
                    'vale_refeicao': colab.get('vale_refeicao', 0),
                    'vale_alimentacao': colab.get('vale_alimentacao', 0),
                    'vale_compras': colab.get('vale_compras', 0),
                    'atrasos': colab.get('atrasos', 0),
                    'faltas': colab.get('faltas', 0),
                    'faltas_dias': colab.get('faltas_dias', 0),
                    'inss': colab.get('inss', 0),
                    'irrf': colab.get('irrf', 0),
                    'fgts': colab.get('fgts', 0),
                    'total_proventos': colab.get('total_proventos', 0),
                    'total_descontos': colab.get('total_descontos', 0),
                    'liquido': colab.get('liquido', 0),
                    'proventos': colab.get('proventos', []),
                    'descontos': colab.get('descontos', [])
                },
                'comparacao_anterior': None,
                'divergencias_apoio': [],
                'divergencias': [],
                'conferidos': []
            }
            
            # Conferidos básicos
            if colab.get('total_proventos'):
                colab_resultado['conferidos'].append({'campo': 'Total Proventos', 'valor': colab['total_proventos']})
                total_conferidos += 1
            if colab.get('total_descontos'):
                colab_resultado['conferidos'].append({'campo': 'Total Descontos', 'valor': colab['total_descontos']})
                total_conferidos += 1
            if colab.get('liquido'):
                colab_resultado['conferidos'].append({'campo': 'Líquido', 'valor': colab['liquido']})
                total_conferidos += 1
            
            # 5a. Comparar com mês anterior
            if has_anterior:
                key_busca = cpf or nome.upper().strip()
                colab_ant = idx_anterior.get(key_busca)
                
                if colab_ant:
                    comp = {
                        'encontrado': True,
                        'campos': []
                    }
                    
                    campos_comparar = [
                        ('total_proventos', 'Total Proventos'),
                        ('total_descontos', 'Total Descontos'),
                        ('liquido', 'Líquido'),
                        ('salario_base', 'Salário Base'),
                        ('horas_extras', 'Horas Extras'),
                        ('inss', 'INSS'),
                        ('irrf', 'IRRF')
                    ]
                    
                    for campo, nome_campo in campos_comparar:
                        val_atual = colab.get(campo, 0) or 0
                        val_anterior = colab_ant.get(campo, 0) or 0
                        
                        if val_atual or val_anterior:
                            diff = val_atual - val_anterior
                            perc = ((val_atual / val_anterior) - 1) * 100 if val_anterior else (100 if val_atual else 0)
                            
                            comp['campos'].append({
                                'campo': nome_campo,
                                'anterior': val_anterior,
                                'atual': val_atual,
                                'diferenca': round(diff, 2),
                                'percentual': round(perc, 2)
                            })
                            
                            # Divergência significativa
                            if abs(perc) > 10 and abs(diff) > 50:
                                colab_resultado['status'] = 'divergente'
                                colab_resultado['divergencias'].append({
                                    'tipo': 'variacao_mensal',
                                    'campo': nome_campo,
                                    'esperado': val_anterior,
                                    'encontrado': val_atual,
                                    'diferenca': diff,
                                    'percentual': perc,
                                    'severidade': 'alta' if abs(perc) > 20 else 'media'
                                })
                                total_divergencias += 1
                                impacto_total += abs(diff)
                            elif abs(perc) > 5:
                                if colab_resultado['status'] == 'ok':
                                    colab_resultado['status'] = 'atencao'
                    
                    colab_resultado['comparacao_anterior'] = comp
                else:
                    colab_resultado['comparacao_anterior'] = {
                        'encontrado': False,
                        'mensagem': 'Colaborador não encontrado na folha anterior (pode ser admissão)'
                    }
            
            # 5b. Cruzar com arquivos de apoio
            if has_apoio and referencias_apoio:
                nome_upper = nome.upper().strip()
                nome_parts = [p for p in nome_upper.split() if len(p) > 2]
                primeiro_nome = nome_parts[0] if nome_parts else ''
                
                for ref in referencias_apoio:
                    ref_nome = ref.get('nome', '').upper().strip()
                    ref_nome_parts = [p for p in ref_nome.split() if len(p) > 2]
                    
                    match = False
                    if ref_nome == nome_upper:
                        match = True
                    elif ref_nome and (ref_nome in nome_upper or nome_upper in ref_nome):
                        match = True
                    elif primeiro_nome and ref_nome_parts:
                        if primeiro_nome == ref_nome_parts[0] or primeiro_nome in ref_nome:
                            match = True
                    elif nome_parts and ref_nome:
                        for parte in nome_parts:
                            if parte in ref_nome or ref_nome in parte:
                                match = True
                                break
                    
                    if match:
                        campo_ref = ref.get('campo', '').lower()
                        valor_apoio = ref.get('valor', 0)
                        unidade_apoio = ref.get('unidade', '').lower()
                        
                        # ===== CLASSIFICAÇÃO: REFERÊNCIA vs VALOR =====
                        # REFERÊNCIA = quantidade que a contabilidade usa para CALCULAR (horas, dias)
                        # VALOR = dinheiro direto em R$
                        
                        campos_referencia = [
                            'horas_extras', 'horas_50', 'horas_100', 'hora_extra', 'he',
                            'atrasos', 'atraso',
                            'faltas', 'falta',
                            'adicional_noturno'  # pode ser horas também
                        ]
                        
                        campos_valor = [
                            'vale_compras', 'vale_transporte', 'vale_refeicao', 'vale_alimentacao',
                            'adiantamento', 'vale_adiantamento', 'adiantamento_salarial',
                            'gratificacao', 'bonificacao', 'bonus',
                            'quebra_caixa', 'quebra_de_caixa',
                            'comissao', 'comissoes',
                            'desconto', 'descontos'
                        ]
                        
                        # Determinar se é referência ou valor
                        is_referencia = any(r in campo_ref for r in campos_referencia) or unidade_apoio in ['horas', 'dias', 'minutos']
                        is_valor = any(v in campo_ref for v in campos_valor) or unidade_apoio == 'reais'
                        
                        # Se não classificou, assumir pelo contexto
                        if not is_referencia and not is_valor:
                            # Se tem "h" no texto original ou unidade é horas, é referência
                            texto_orig = ref.get('texto_original', '').lower()
                            if 'h' in texto_orig or ':' in texto_orig:
                                is_referencia = True
                            else:
                                is_valor = True  # default
                        
                        # Mapeamento de campos
                        campo_map_ref = {
                            'horas_50': 'horas_extras_50_ref',
                            'horas_100': 'horas_extras_100_ref',
                            'horas_extras': 'horas_extras_50_ref',  # fallback
                            'atrasos': 'atrasos_ref',
                            'atraso': 'atrasos_ref',
                            'faltas': 'faltas_ref',
                            'falta': 'faltas_ref',
                        }
                        
                        campo_map_valor = {
                            'vale_compras': ['vale_compras'],
                            'vale_adiantamento_salarial': ['vale_adiantamento', 'adiantamento', 'adiantamento_salarial'],
                            'vale_adiantamento': ['vale_adiantamento', 'adiantamento'],
                            'adiantamento': ['adiantamento', 'vale_adiantamento'],
                            'vale_transporte': ['vale_transporte'],
                            'vale_refeicao': ['vale_refeicao'],
                            'vale_alimentacao': ['vale_alimentacao'],
                            'quebra_caixa': ['quebra_caixa', 'quebra_de_caixa'],
                            'quebra_de_caixa': ['quebra_caixa'],
                            'comissao': ['comissao'],
                            'gratificacao': ['gratificacao'],
                        }
                        
                        campo_display = campo_ref.replace('_', ' ').title()
                        
                        if is_referencia:
                            # ===== COMPARAR REFERÊNCIA (quantidade) =====
                            ref_holerite = 0
                            valor_monetario = 0
                            
                            # Buscar a referência no holerite
                            if 'horas_100' in campo_ref or '100' in campo_ref:
                                ref_holerite = colab.get('horas_extras_100_ref', 0)
                                valor_monetario = colab.get('horas_extras_100', 0)
                            elif 'horas_50' in campo_ref or '50' in campo_ref:
                                ref_holerite = colab.get('horas_extras_50_ref', 0)
                                valor_monetario = colab.get('horas_extras_50', 0)
                            elif 'atraso' in campo_ref:
                                ref_holerite = colab.get('atrasos_ref', 0) or colab.get('atrasos', 0)
                            elif 'falta' in campo_ref:
                                ref_holerite = colab.get('faltas_ref', 0) or colab.get('faltas_dias', 0)
                            else:
                                # Horas extras genérico
                                ref_holerite = colab.get('horas_extras_50_ref', 0) or colab.get('horas_extras_100_ref', 0)
                            
                            if ref_holerite > 0:
                                # Temos a referência no holerite - comparar!
                                diff = abs(ref_holerite - valor_apoio)
                                tolerancia = 0.1 if 'hora' in campo_ref else 0.5  # 6min para horas, 0.5 para outros
                                
                                if diff <= tolerancia:
                                    colab_resultado['conferidos'].append({
                                        'campo': campo_display,
                                        'valor_apoio': valor_apoio,
                                        'valor_holerite': ref_holerite,
                                        'tipo': 'referencia',
                                        'valor_monetario': valor_monetario if valor_monetario else None,
                                        'fonte': ref.get('arquivo', ''),
                                        'status': 'ok'
                                    })
                                    total_conferidos += 1
                                else:
                                    colab_resultado['status'] = 'divergente'
                                    colab_resultado['divergencias_apoio'].append({
                                        'campo': campo_display,
                                        'valor_apoio': valor_apoio,
                                        'valor_holerite': ref_holerite,
                                        'tipo': 'referencia',
                                        'diferenca': round(diff, 2),
                                        'arquivo': ref.get('arquivo', ''),
                                        'severidade': 'alta' if diff > 2 else 'media',
                                        'texto_original': ref.get('texto_original', '')
                                    })
                                    total_divergencias += 1
                            elif valor_monetario > 0:
                                # Só temos valor em R$, não temos referência
                                colab_resultado['conferidos'].append({
                                    'campo': campo_display,
                                    'valor_apoio': valor_apoio,
                                    'valor_holerite': f"R$ {valor_monetario:.2f}",
                                    'tipo': 'referencia',
                                    'nota': 'Apenas valor R$ disponível no holerite',
                                    'fonte': ref.get('arquivo', ''),
                                    'status': 'verificar'
                                })
                                total_conferidos += 1
                            else:
                                # Não encontrou no holerite
                                colab_resultado['status'] = 'divergente'
                                colab_resultado['divergencias_apoio'].append({
                                    'campo': campo_display,
                                    'valor_apoio': valor_apoio,
                                    'valor_holerite': 'Não encontrado',
                                    'tipo': 'referencia',
                                    'arquivo': ref.get('arquivo', ''),
                                    'severidade': 'media',
                                    'texto_original': ref.get('texto_original', '')
                                })
                                total_divergencias += 1
                        
                        else:
                            # ===== COMPARAR VALOR (R$) =====
                            valor_holerite = 0
                            
                            # Buscar valor no holerite
                            campos_busca = campo_map_valor.get(campo_ref, [campo_ref])
                            for campo_h in campos_busca:
                                v = colab.get(campo_h, 0)
                                if v:
                                    valor_holerite = v
                                    break
                            
                            # Buscar também na lista de proventos/descontos
                            if valor_holerite == 0:
                                campo_busca = campo_ref.replace('_', ' ').lower()
                                for p in colab.get('proventos', []) + colab.get('descontos', []):
                                    desc = p.get('descricao', '').lower()
                                    if campo_busca in desc or any(c.replace('_', ' ') in desc for c in campos_busca):
                                        valor_holerite = p.get('valor', 0)
                                        break
                            
                            diff = abs(valor_holerite - valor_apoio)
                            
                            if diff <= 0.50:  # Tolerância de R$ 0,50
                                colab_resultado['conferidos'].append({
                                    'campo': campo_display,
                                    'valor_apoio': valor_apoio,
                                    'valor_holerite': valor_holerite,
                                    'tipo': 'valor',
                                    'fonte': ref.get('arquivo', ''),
                                    'status': 'ok'
                                })
                                total_conferidos += 1
                            else:
                                colab_resultado['status'] = 'divergente'
                                colab_resultado['divergencias_apoio'].append({
                                    'campo': campo_display,
                                    'valor_apoio': valor_apoio,
                                    'valor_holerite': valor_holerite,
                                    'tipo': 'valor',
                                    'diferenca': round(diff, 2),
                                    'arquivo': ref.get('arquivo', ''),
                                    'severidade': 'alta' if diff > 100 else 'media',
                                    'texto_original': ref.get('texto_original', '')
                                })
                                total_divergencias += 1
            
            # 5c. Verificar itens fixos - marcar como conferido automático
            if itens_fixos:
                nome_upper = nome.upper().strip()
                campos_verificados = set(c.get('campo', '').lower() for c in colab_resultado['conferidos'])
                campos_verificados.update(d.get('campo', '').lower() for d in colab_resultado['divergencias_apoio'])
                
                for item in itens_fixos:
                    item_colab = (item.get('colaborador_nome') or '').upper().strip()
                    item_campo = item.get('campo', '').lower()
                    
                    # Verificar se aplica a este colaborador
                    if item_colab and item_colab not in nome_upper:
                        continue
                    
                    # Verificar se já foi conferido/divergente
                    if item_campo in campos_verificados:
                        continue
                    
                    # Buscar valor no holerite
                    valor_holerite = colab.get(item_campo, 0)
                    if not valor_holerite:
                        # Buscar em proventos/descontos
                        campo_busca = item_campo.replace('_', ' ')
                        for p in colab.get('proventos', []) + colab.get('descontos', []):
                            if campo_busca in p.get('descricao', '').lower():
                                valor_holerite = p.get('valor', 0)
                                break
                    
                    if valor_holerite:
                        colab_resultado['conferidos'].append({
                            'campo': item_campo.replace('_', ' ').title(),
                            'valor': valor_holerite,
                            'fonte': 'Item Fixo',
                            'status': 'fixo',
                            'nota': item.get('descricao') or 'Marcado como item recorrente'
                        })
                        total_conferidos += 1
            
            resultado_colaboradores.append(colab_resultado)
        
        validation_jobs[job_id]["progress"] = 85
        validation_jobs[job_id]["step"] = "Finalizando validação..."
        
        # Step 6: Determinar tipo de análise
        if has_anterior and has_apoio:
            tipo_analise = "completa"
        elif has_anterior:
            tipo_analise = "comparacao_mensal"
        elif has_apoio:
            tipo_analise = "comparacao_apoio"
        else:
            tipo_analise = "analise_isolada"
        
        # Step 7: Gerar resumo executivo
        total_ok = len([c for c in resultado_colaboradores if c['status'] == 'ok'])
        total_atencao = len([c for c in resultado_colaboradores if c['status'] == 'atencao'])
        total_divergente = len([c for c in resultado_colaboradores if c['status'] == 'divergente'])
        
        resumo = f"Validação {tipo_analise.replace('_', ' ')} de {len(resultado_colaboradores)} colaborador(es). "
        if total_divergente > 0:
            resumo += f"⚠️ {total_divergente} com divergências. "
        if total_atencao > 0:
            resumo += f"⚡ {total_atencao} requer atenção. "
        if total_ok > 0:
            resumo += f"✅ {total_ok} OK. "
        if impacto_total > 0:
            resumo += f"Impacto total: R$ {impacto_total:.2f}"
        
        # Step 8: Gerar recomendações
        recomendacoes = []
        if total_divergente > 0:
            recomendacoes.append(f"Revisar {total_divergente} colaborador(es) com divergências antes de fechar a folha.")
        if has_apoio and any(c['divergencias_apoio'] for c in resultado_colaboradores):
            recomendacoes.append("Verificar diferenças entre documentos de apoio e holerite.")
        
        # Step 9: Salvar no banco
        validacao_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        validacao_doc = {
            "id": validacao_id,
            "cliente_id": cliente_id,
            "cliente_nome": cliente_nome,
            "mes_referencia": mes_referencia,
            "ano_referencia": ano_referencia,
            "tipo_validacao": tipo_analise,
            "status": "concluido",
            "arquivos": {
                "holerite_atual": holerite_atual_filename,
                "holerite_anterior": holerite_anterior_filename,
                "apoio": apoio_filenames
            },
            "funcionarios_analisados": len(resultado_colaboradores),
            "colaboradores": resultado_colaboradores,
            "referencias_apoio": referencias_apoio,
            "resumo_executivo": resumo,
            "recomendacoes": recomendacoes,
            "total_divergencias": total_divergencias,
            "total_conferidos": total_conferidos,
            "total_alertas": total_atencao,
            "impacto_financeiro_total": round(impacto_total, 2),
            "estatisticas": {
                "total_colaboradores": len(resultado_colaboradores),
                "ok": total_ok,
                "atencao": total_atencao,
                "divergente": total_divergente
            },
            "created_at": now,
            "user_id": user_id
        }
        
        await db.validacoes.insert_one(validacao_doc)
        logger.info(f"[Job {job_id}] Validação {validacao_id} salva com {len(resultado_colaboradores)} colaboradores")
        
        # Atualizar job como concluído
        validation_jobs[job_id]["status"] = "completed"
        validation_jobs[job_id]["progress"] = 100
        validation_jobs[job_id]["step"] = "Concluído!"
        validation_jobs[job_id]["result"] = {
            "id": validacao_id,
            "success": True,
            "tipo_analise": tipo_analise,
            "empresa": cliente_nome,
            "competencia": f"{mes_referencia}/{ano_referencia}",
            "funcionarios_analisados": len(resultado_colaboradores),
            "colaboradores": resultado_colaboradores,
            "referencias_apoio": referencias_apoio if has_apoio else [],
            "resumo_executivo": resumo,
            "recomendacoes": recomendacoes,
            "total_divergencias": total_divergencias,
            "total_conferidos": total_conferidos,
            "impacto_financeiro_total": round(impacto_total, 2),
            "estatisticas": {
                "total_colaboradores": len(resultado_colaboradores),
                "ok": total_ok,
                "atencao": total_atencao,
                "divergente": total_divergente
            },
            "message": f"Validação concluída para {len(resultado_colaboradores)} colaborador(es)"
        }
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Erro na validação: {str(e)}", exc_info=True)
        validation_jobs[job_id]["status"] = "failed"
        validation_jobs[job_id]["error"] = str(e)
        validation_jobs[job_id]["step"] = "Erro no processamento"
    
    finally:
        # Limpar arquivos temporários
        shutil.rmtree(job_dir, ignore_errors=True)


@api_router.get("/validacoes/job-status/{job_id}")
async def get_validacao_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna o status de um job de validação em andamento."""
    if job_id not in validation_jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    
    job = validation_jobs[job_id]
    
    # Verificar se o job pertence ao usuário
    if job.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "step": job["step"],
        "result": job.get("result"),
        "error": job.get("error"),
        "created_at": job.get("created_at")
    }


@api_router.get("/validacoes/{validacao_id}")
async def get_validacao_detalhes(validacao_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna detalhes completos de uma validação específica"""
    validacao = await db.validacoes.find_one(
        {"id": validacao_id, "user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    )
    if not validacao:
        raise HTTPException(status_code=404, detail="Validação não encontrada")
    return validacao


@api_router.get("/validacoes", response_model=List[ValidacaoFolhaResponse])
async def list_validacoes(cliente_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    validacoes = await db.validacoes.find(query, {"_id": 0, "user_id": 0, "resumo": 0}).to_list(1000)
    return [ValidacaoFolhaResponse(**v) for v in validacoes]


@api_router.delete("/validacoes/{validacao_id}")
async def delete_validacao(validacao_id: str, current_user: dict = Depends(get_current_user)):
    """Exclui uma validação"""
    result = await db.validacoes.delete_one({
        "id": validacao_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Validação não encontrada")
    
    return {"message": "Validação excluída com sucesso", "id": validacao_id}


@api_router.post("/validacoes/delete-batch")
async def delete_validacoes_batch(ids: List[str], current_user: dict = Depends(get_current_user)):
    """Exclui múltiplas validações de uma vez"""
    result = await db.validacoes.delete_many({
        "id": {"$in": ids},
        "user_id": current_user["id"]
    })
    
    return {
        "message": f"{result.deleted_count} validação(ões) excluída(s)",
        "deleted_count": result.deleted_count
    }

# ==================== ITENS FIXOS ROUTES ====================

@api_router.get("/itens-fixos")
async def listar_itens_fixos(
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista itens fixos (proventos/descontos recorrentes)"""
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    itens = await db.itens_fixos.find(query, {"_id": 0}).to_list(500)
    return itens

@api_router.post("/itens-fixos")
async def criar_item_fixo(
    item: dict,
    current_user: dict = Depends(get_current_user)
):
    """Cria um item fixo (provento/desconto recorrente)"""
    item_doc = {
        "id": str(uuid.uuid4()),
        "cliente_id": item.get("cliente_id"),
        "cliente_nome": item.get("cliente_nome"),
        "colaborador_nome": item.get("colaborador_nome"),  # Opcional - se vazio, aplica a todos
        "campo": item.get("campo"),  # Ex: "vale_transporte", "quebra_caixa"
        "tipo": item.get("tipo", "valor"),  # "valor" ou "referencia"
        "descricao": item.get("descricao", ""),
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.itens_fixos.insert_one(item_doc)
    return {"id": item_doc["id"], "message": "Item fixo criado com sucesso"}

@api_router.delete("/itens-fixos/{item_id}")
async def deletar_item_fixo(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove um item fixo"""
    result = await db.itens_fixos.delete_one({
        "id": item_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    return {"message": "Item fixo removido"}

# ==================== MÉDIAS ROUTES ====================

@api_router.post("/medias/importar")
async def importar_medias(
    file: UploadFile = File(...),
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Import historical salary data for average calculations"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        content = await file.read()
        suffix = Path(file.filename).suffix
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"medias-{uuid.uuid4()}",
                system_message="""Você é um assistente de departamento pessoal especializado em cálculos de médias salariais.
                Extraia os dados históricos de salários do documento.
                
                Retorne em JSON com a estrutura:
                {
                    "colaboradores": [
                        {
                            "nome": "nome do funcionário",
                            "cpf": "cpf se disponível",
                            "historico": [
                                {
                                    "competencia": "MM/YYYY",
                                    "salario_bruto": valor,
                                    "horas_extras": valor,
                                    "comissoes": valor,
                                    "adicionais": valor
                                }
                            ]
                        }
                    ],
                    "periodo_inicio": "MM/YYYY",
                    "periodo_fim": "MM/YYYY"
                }"""
            ).with_model("gemini", "gemini-2.5-flash")
            
            mime_types = {
                ".pdf": "application/pdf",
                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xls": "application/vnd.ms-excel",
                ".csv": "text/csv"
            }
            mime_type = mime_types.get(suffix.lower(), "application/octet-stream")
            
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text="Extraia os dados históricos de salários deste documento para cálculo de médias.",
                file_contents=[file_content]
            ))
            
            try:
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                dados = json.loads(response_text.strip())
            except json.JSONDecodeError:
                dados = {"colaboradores": [], "raw_response": response}
            
            # Save extracted data
            now = datetime.now(timezone.utc).isoformat()
            registros_salvos = 0
            
            for colab_data in dados.get("colaboradores", []):
                # Try to find existing colaborador
                colaborador = await db.colaboradores.find_one({
                    "cliente_id": cliente_id,
                    "$or": [
                        {"nome": {"$regex": colab_data.get("nome", ""), "$options": "i"}},
                        {"cpf": colab_data.get("cpf", "")}
                    ]
                })
                
                colaborador_id = colaborador["id"] if colaborador else None
                
                for hist in colab_data.get("historico", []):
                    media_doc = {
                        "id": str(uuid.uuid4()),
                        "cliente_id": cliente_id,
                        "colaborador_id": colaborador_id,
                        "colaborador_nome": colab_data.get("nome"),
                        "competencia": hist.get("competencia"),
                        "salario_bruto": float(hist.get("salario_bruto", 0)),
                        "horas_extras": float(hist.get("horas_extras", 0)),
                        "comissoes": float(hist.get("comissoes", 0)),
                        "adicionais": float(hist.get("adicionais", 0)),
                        "created_at": now,
                        "user_id": current_user["id"]
                    }
                    await db.medias_historico.insert_one(media_doc)
                    registros_salvos += 1
            
            return {
                "message": f"Importação concluída. {registros_salvos} registros salvos.",
                "dados": dados,
                "registros_salvos": registros_salvos
            }
            
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Erro na importação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao importar médias: {str(e)}")

@api_router.get("/medias/importacoes")
async def listar_importacoes_medias(current_user: dict = Depends(get_current_user)):
    """List all media imports"""
    importacoes = await db.importacoes_medias.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).to_list(100)
    return importacoes

@api_router.get("/medias/{colaborador_id}")
async def get_medias_colaborador(colaborador_id: str, meses: int = 12, current_user: dict = Depends(get_current_user)):
    """Get historical averages for a specific employee"""
    medias = await db.medias_historico.find(
        {"colaborador_id": colaborador_id},
        {"_id": 0, "user_id": 0}
    ).sort("competencia", -1).to_list(meses)
    
    if not medias:
        return {"colaborador_id": colaborador_id, "medias": [], "media_calculada": 0}
    
    # Calculate averages
    total_salario = sum(m.get("salario_bruto", 0) for m in medias)
    total_extras = sum(m.get("horas_extras", 0) for m in medias)
    total_comissoes = sum(m.get("comissoes", 0) for m in medias)
    total_adicionais = sum(m.get("adicionais", 0) for m in medias)
    
    count = len(medias)
    
    return {
        "colaborador_id": colaborador_id,
        "medias": medias,
        "periodo_meses": count,
        "media_salario": round(total_salario / count, 2) if count else 0,
        "media_horas_extras": round(total_extras / count, 2) if count else 0,
        "media_comissoes": round(total_comissoes / count, 2) if count else 0,
        "media_adicionais": round(total_adicionais / count, 2) if count else 0,
        "media_total": round((total_salario + total_extras + total_comissoes + total_adicionais) / count, 2) if count else 0
    }

@api_router.post("/medias/extrair")
async def extrair_medias_documento(
    file: UploadFile = File(...),
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Extract salary averages data from document using AI"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        content = await file.read()
        suffix = Path(file.filename).suffix
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"medias-extrair-{uuid.uuid4()}",
                system_message="""Você é um especialista em departamento pessoal brasileiro, focado em extração de dados de médias salariais.

Extraia do documento todas as informações de MÉDIAS SALARIAIS de funcionários. O documento pode ser:
- Relatório de médias da antiga contabilidade
- Histórico de proventos
- Planilha de variáveis
- Holerites consolidados

Para CADA FUNCIONÁRIO encontrado, extraia:
- Nome completo
- CPF (se disponível)
- Matrícula (se disponível)
- Para cada mês/competência disponível:
  - Competência (MM/AAAA)
  - Salário bruto
  - Horas extras (50%, 100%, etc - some tudo)
  - Comissões
  - DSR sobre variáveis
  - Adicional noturno
  - Outros proventos variáveis

Retorne em JSON:
{
    "confianca": "alta/media/baixa",
    "funcionarios": [
        {
            "nome": "Nome Completo",
            "cpf": "000.000.000-00",
            "matricula": "12345",
            "medias": [
                {
                    "competencia": "01/2024",
                    "salario_bruto": 2500.00,
                    "horas_extras": 350.00,
                    "comissoes": 500.00,
                    "dsr": 150.00,
                    "adicional_noturno": 0,
                    "outros": 0
                }
            ]
        }
    ],
    "periodo_encontrado": "01/2024 a 12/2024",
    "observacoes": "observações sobre a extração, campos não encontrados, etc"
}

IMPORTANTE:
- Extraia TODOS os funcionários encontrados no documento
- Extraia TODOS os meses disponíveis (idealmente 12-24 meses)
- Valores devem ser numéricos (sem R$, pontos de milhar, etc)
- Se um valor não existir, use 0
- Se não conseguir identificar algum campo, deixe em branco"""
            ).with_model("gemini", "gemini-2.5-flash")
            
            mime_types = {
                ".pdf": "application/pdf",
                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xls": "application/vnd.ms-excel",
                ".csv": "text/csv",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".txt": "text/plain"
            }
            
            mime_type = mime_types.get(suffix.lower(), "application/octet-stream")
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text=f"Extraia os dados de médias salariais do documento: {file.filename}",
                file_contents=[file_content]
            ))
            
            # Parse response
            try:
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                resultado = json.loads(response_text.strip())
            except json.JSONDecodeError:
                resultado = {
                    "confianca": "baixa",
                    "funcionarios": [],
                    "observacoes": response
                }
            
            return {
                "success": True,
                "confianca": resultado.get("confianca", "media"),
                "funcionarios": resultado.get("funcionarios", []),
                "periodo_encontrado": resultado.get("periodo_encontrado", ""),
                "observacoes": resultado.get("observacoes", ""),
                "message": "Dados extraídos. Revise antes de gerar o arquivo."
            }
            
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Erro na extração de médias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao extrair médias: {str(e)}")

@api_router.post("/medias/salvar")
async def salvar_medias_extraidas(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Save extracted media data to database"""
    cliente_id = data.get("cliente_id")
    funcionarios = data.get("funcionarios", [])
    
    if not funcionarios:
        raise HTTPException(status_code=400, detail="Nenhum funcionário para salvar")
    
    try:
        # Save import record
        importacao_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        total_meses = sum(len(f.get("medias", [])) for f in funcionarios)
        
        importacao_doc = {
            "id": importacao_id,
            "cliente_id": cliente_id,
            "user_id": current_user["id"],
            "total_funcionarios": len(funcionarios),
            "total_meses": total_meses,
            "formato_exportado": None,
            "created_at": now
        }
        await db.importacoes_medias.insert_one(importacao_doc)
        
        # Save individual media records
        for func in funcionarios:
            for media in func.get("medias", []):
                media_doc = {
                    "id": str(uuid.uuid4()),
                    "importacao_id": importacao_id,
                    "cliente_id": cliente_id,
                    "funcionario_nome": func.get("nome"),
                    "funcionario_cpf": func.get("cpf"),
                    "funcionario_matricula": func.get("matricula"),
                    "competencia": media.get("competencia"),
                    "salario_bruto": media.get("salario_bruto", 0),
                    "horas_extras": media.get("horas_extras", 0),
                    "comissoes": media.get("comissoes", 0),
                    "dsr": media.get("dsr", 0),
                    "adicional_noturno": media.get("adicional_noturno", 0),
                    "outros": media.get("outros", 0),
                    "user_id": current_user["id"],
                    "created_at": now
                }
                await db.medias_extraidas.insert_one(media_doc)
        
        return {
            "success": True,
            "importacao_id": importacao_id,
            "total_funcionarios": len(funcionarios),
            "total_meses": total_meses
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao salvar médias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar médias: {str(e)}")

@api_router.post("/medias/gerar-importacao")
async def gerar_arquivo_importacao_sci(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Generate import file for SCI Único (Excel or TXT format)"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    cliente_id = data.get("cliente_id")
    funcionarios = data.get("funcionarios", [])
    formato = data.get("formato", "xlsx")
    
    if not funcionarios:
        raise HTTPException(status_code=400, detail="Nenhum funcionário para exportar")
    
    try:
        if formato == "xlsx":
            # Generate Excel file
            wb = Workbook()
            ws = wb.active
            ws.title = "Importação Médias SCI"
            
            header_font = Font(bold=True, color="FFFFFF")
            header_fill = PatternFill(start_color="059669", end_color="059669", fill_type="solid")
            border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
            
            # Headers - Format for SCI Único import
            headers = ["MATRÍCULA", "CPF", "NOME", "COMPETÊNCIA", "SALÁRIO", "HE", "COMISSÕES", "DSR", "AD.NOTURNO", "OUTROS", "TOTAL"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal='center')
                cell.border = border
            
            row = 2
            for func in funcionarios:
                for media in func.get("medias", []):
                    total = (
                        (media.get("salario_bruto") or 0) +
                        (media.get("horas_extras") or 0) +
                        (media.get("comissoes") or 0) +
                        (media.get("dsr") or 0) +
                        (media.get("adicional_noturno") or 0) +
                        (media.get("outros") or 0)
                    )
                    
                    data_row = [
                        func.get("matricula", ""),
                        func.get("cpf", ""),
                        func.get("nome", ""),
                        media.get("competencia", ""),
                        media.get("salario_bruto", 0),
                        media.get("horas_extras", 0),
                        media.get("comissoes", 0),
                        media.get("dsr", 0),
                        media.get("adicional_noturno", 0),
                        media.get("outros", 0),
                        total
                    ]
                    
                    for col, value in enumerate(data_row, 1):
                        cell = ws.cell(row=row, column=col, value=value)
                        cell.border = border
                        if col >= 5:  # Numeric columns
                            cell.number_format = '#,##0.00'
                    
                    row += 1
            
            # Adjust column widths
            ws.column_dimensions['A'].width = 12
            ws.column_dimensions['B'].width = 15
            ws.column_dimensions['C'].width = 30
            ws.column_dimensions['D'].width = 12
            for col in ['E', 'F', 'G', 'H', 'I', 'J', 'K']:
                ws.column_dimensions[col].width = 12
            
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=importacao_medias_sci_unico.xlsx"}
            )
            
        else:
            # Generate TXT file (pipe-delimited for SCI Único)
            lines = []
            
            # Header
            header = "MATRICULA|CPF|NOME|COMPETENCIA|SALARIO|HE|COMISSOES|DSR|ADNOTURNO|OUTROS|TOTAL"
            lines.append(header)
            
            for func in funcionarios:
                for media in func.get("medias", []):
                    total = (
                        (media.get("salario_bruto") or 0) +
                        (media.get("horas_extras") or 0) +
                        (media.get("comissoes") or 0) +
                        (media.get("dsr") or 0) +
                        (media.get("adicional_noturno") or 0) +
                        (media.get("outros") or 0)
                    )
                    
                    line = "|".join([
                        str(func.get("matricula", "")),
                        str(func.get("cpf", "")).replace(".", "").replace("-", ""),
                        str(func.get("nome", "")),
                        str(media.get("competencia", "")),
                        f"{media.get('salario_bruto', 0):.2f}",
                        f"{media.get('horas_extras', 0):.2f}",
                        f"{media.get('comissoes', 0):.2f}",
                        f"{media.get('dsr', 0):.2f}",
                        f"{media.get('adicional_noturno', 0):.2f}",
                        f"{media.get('outros', 0):.2f}",
                        f"{total:.2f}"
                    ])
                    lines.append(line)
            
            content = "\n".join(lines)
            output = BytesIO(content.encode('utf-8'))
            
            return StreamingResponse(
                output,
                media_type="text/plain",
                headers={"Content-Disposition": "attachment; filename=importacao_medias_sci_unico.txt"}
            )
        
        # Update import record with format
        if cliente_id:
            await db.importacoes_medias.update_one(
                {"cliente_id": cliente_id, "user_id": current_user["id"]},
                {"$set": {"formato_exportado": formato}},
                upsert=False
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar arquivo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar arquivo: {str(e)}")

@api_router.post("/informes/comparar")
async def comparar_informes(
    file_esocial: UploadFile = File(...),
    file_sistema: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Compare eSocial report with internal system report"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        content_esocial = await file_esocial.read()
        content_sistema = await file_sistema.read()
        
        suffix_esocial = Path(file_esocial.filename).suffix
        suffix_sistema = Path(file_sistema.filename).suffix
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix_esocial) as tmp1:
            tmp1.write(content_esocial)
            tmp_path_esocial = tmp1.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix_sistema) as tmp2:
            tmp2.write(content_sistema)
            tmp_path_sistema = tmp2.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"informes-{uuid.uuid4()}",
                system_message="""Você é um auditor especializado em comparação de informes de rendimento para departamento pessoal brasileiro.
                
Compare os dois documentos:
1. DOCUMENTO DO eSocial: Relatório oficial gerado pelo sistema do governo eSocial
2. DOCUMENTO DO SCI ÚNICO: Relatório do sistema interno de folha de pagamento (SCI Único)

Identifique:
1. Divergências de valores entre eSocial e SCI Único
2. Funcionários presentes em um e ausentes no outro
3. Diferenças em bases de cálculo (INSS, FGTS, IR)
4. Erros de IR retido na fonte
5. Diferenças em rendimentos tributáveis e isentos
6. Valores de 13º salário e férias
7. Deduções e contribuições previdenciárias

Retorne em JSON:
{
    "tipo_comparacao": "esocial_vs_sci_unico",
    "total_comparados": número de funcionários comparados,
    "divergencias_encontradas": número total de divergências,
    "divergencias": [
        {
            "funcionario": "nome completo",
            "cpf": "CPF",
            "campo": "nome do campo divergente (ex: rendimentos_tributaveis, ir_retido, inss)",
            "valor_esocial": valor no eSocial,
            "valor_sci_unico": valor no SCI Único,
            "diferenca": diferença em R$,
            "severidade": "alta/media/baixa",
            "observacao": "explicação da divergência"
        }
    ],
    "funcionarios_apenas_esocial": ["lista de funcionários apenas no eSocial"],
    "funcionarios_apenas_sci": ["lista de funcionários apenas no SCI Único"],
    "resumo": "resumo geral da comparação",
    "recomendacoes": ["lista de ações recomendadas para correção"]
}

IMPORTANTE:
- Severidade ALTA: diferenças > R$ 100 ou que afetam IR/INSS
- Severidade MÉDIA: diferenças entre R$ 10 e R$ 100
- Severidade BAIXA: diferenças de arredondamento < R$ 10"""
            ).with_model("gemini", "gemini-2.5-flash")
            
            mime_types = {".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
            
            file1 = FileContentWithMimeType(
                file_path=tmp_path_esocial,
                mime_type=mime_types.get(suffix_esocial.lower(), "application/pdf")
            )
            file2 = FileContentWithMimeType(
                file_path=tmp_path_sistema,
                mime_type=mime_types.get(suffix_sistema.lower(), "application/pdf")
            )
            
            response = await chat.send_message(UserMessage(
                text=f"""Compare estes dois documentos de informe de rendimentos:

DOCUMENTO 1 (eSocial): {file_esocial.filename}
DOCUMENTO 2 (SCI Único): {file_sistema.filename}

Identifique todas as divergências entre os valores do eSocial e do SCI Único.""",
                file_contents=[file1, file2]
            ))
            
            try:
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                resultado = json.loads(response_text.strip())
            except json.JSONDecodeError:
                resultado = {
                    "total_comparados": 0,
                    "divergencias_encontradas": 0,
                    "divergencias": [],
                    "resumo": response,
                    "recomendacoes": []
                }
            
            # Save comparison record
            comparacao_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            comparacao_doc = {
                "id": comparacao_id,
                **resultado,
                "created_at": now,
                "user_id": current_user["id"]
            }
            await db.comparacoes_informes.insert_one(comparacao_doc)
            
            return {"id": comparacao_id, **resultado}
            
        finally:
            os.unlink(tmp_path_esocial)
            os.unlink(tmp_path_sistema)
            
    except Exception as e:
        logger.error(f"Erro na comparação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao comparar informes: {str(e)}")

@api_router.get("/informes/historico")
async def listar_comparacoes_informes(current_user: dict = Depends(get_current_user)):
    """List all income report comparisons"""
    comparacoes = await db.comparacoes_informes.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).to_list(100)
    return comparacoes

# ==================== RELATÓRIOS (PDF/EXCEL) ====================

@api_router.get("/relatorios/colaboradores/excel")
async def relatorio_colaboradores_excel(
    cliente_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate Excel report of employees"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from io import BytesIO
    
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    colaboradores = await db.colaboradores.find(query, {"_id": 0, "user_id": 0}).to_list(10000)
    clientes = await db.clientes.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    clientes_dict = {c["id"]: c.get("nome_fantasia") or c.get("razao_social") for c in clientes}
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Colaboradores"
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["Empresa", "Nome", "CPF", "Cargo", "Departamento", "Salário Base", "Data Admissão", "PIS", "Email", "Celular"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = border
    
    # Data
    for row, colab in enumerate(colaboradores, 2):
        empresa = clientes_dict.get(colab.get("cliente_id"), "N/A")
        data = [
            empresa,
            colab.get("nome", ""),
            colab.get("cpf", ""),
            colab.get("cargo", ""),
            colab.get("departamento", ""),
            colab.get("salario_base", 0),
            colab.get("data_admissao", ""),
            colab.get("pis", ""),
            colab.get("email", ""),
            colab.get("celular", "")
        ]
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = border
            if col == 6:  # Salary column
                cell.number_format = 'R$ #,##0.00'
    
    # Adjust column widths
    ws.column_dimensions['A'].width = 25
    ws.column_dimensions['B'].width = 30
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 20
    ws.column_dimensions['E'].width = 20
    ws.column_dimensions['F'].width = 15
    ws.column_dimensions['G'].width = 15
    ws.column_dimensions['H'].width = 15
    ws.column_dimensions['I'].width = 25
    ws.column_dimensions['J'].width = 15
    
    # Save to bytes
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"colaboradores_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/relatorios/dissidios/excel")
async def relatorio_dissidios_excel(
    cliente_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate Excel report of dissídios"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from io import BytesIO
    
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    dissidios = await db.dissidios.find(query, {"_id": 0, "user_id": 0}).to_list(1000)
    clientes = await db.clientes.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    clientes_dict = {c["id"]: c.get("nome_fantasia") or c.get("razao_social") for c in clientes}
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Dissídios"
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    headers = ["Empresa", "Sindicato", "Percentual (%)", "Data-Base", "Colaboradores Afetados", "Valor Total Reajuste", "Status", "Criado em", "Aprovado em"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = border
    
    for row, dissidio in enumerate(dissidios, 2):
        empresa = clientes_dict.get(dissidio.get("cliente_id"), "N/A")
        data = [
            empresa,
            dissidio.get("sindicato", ""),
            dissidio.get("percentual_reajuste", 0),
            dissidio.get("data_base", ""),
            dissidio.get("colaboradores_afetados", 0),
            dissidio.get("valor_total_reajuste", 0),
            dissidio.get("status", "").upper(),
            dissidio.get("created_at", "")[:10] if dissidio.get("created_at") else "",
            dissidio.get("aprovado_em", "")[:10] if dissidio.get("aprovado_em") else ""
        ]
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = border
            if col == 3:
                cell.number_format = '0.00%'
            elif col == 6:
                cell.number_format = 'R$ #,##0.00'
    
    for col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']:
        ws.column_dimensions[col].width = 18
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"dissidios_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/relatorios/dissidio/{dissidio_id}/previa/excel")
async def relatorio_previa_dissidio_excel(
    dissidio_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate Excel report with salary adjustment preview for a specific dissídio"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from io import BytesIO
    
    dissidio = await db.dissidios.find_one({"id": dissidio_id, "user_id": current_user["id"]})
    if not dissidio:
        raise HTTPException(status_code=404, detail="Dissídio não encontrado")
    
    cliente = await db.clientes.find_one({"id": dissidio["cliente_id"]})
    cliente_nome = cliente.get("nome_fantasia") or cliente.get("razao_social") if cliente else "N/A"
    
    percentual = dissidio["percentual_reajuste"]
    colaboradores = await db.colaboradores.find(
        {"cliente_id": dissidio["cliente_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Prévia Reajuste"
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="059669", end_color="059669", fill_type="solid")
    title_font = Font(bold=True, size=14)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Title section
    ws.cell(row=1, column=1, value="PRÉVIA DE REAJUSTE SALARIAL - DISSÍDIO").font = title_font
    ws.cell(row=2, column=1, value=f"Empresa: {cliente_nome}")
    ws.cell(row=3, column=1, value=f"Sindicato: {dissidio.get('sindicato', '')}")
    ws.cell(row=4, column=1, value=f"Percentual de Reajuste: {percentual}%")
    ws.cell(row=5, column=1, value=f"Data-Base: {dissidio.get('data_base', '')}")
    
    # Headers
    headers = ["Nome", "CPF", "Cargo", "Salário Atual", "Percentual", "Diferença (R$)", "Novo Salário"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=7, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = border
    
    total_atual = 0
    total_diferenca = 0
    total_novo = 0
    
    for row, colab in enumerate(colaboradores, 8):
        salario_atual = colab.get("salario_base", 0) or 0
        diferenca = round(salario_atual * (percentual / 100), 2)
        salario_novo = round(salario_atual + diferenca, 2)
        
        total_atual += salario_atual
        total_diferenca += diferenca
        total_novo += salario_novo
        
        data = [
            colab.get("nome", ""),
            colab.get("cpf", ""),
            colab.get("cargo", ""),
            salario_atual,
            f"{percentual}%",
            diferenca,
            salario_novo
        ]
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = border
            if col in [4, 6, 7]:
                cell.number_format = 'R$ #,##0.00'
    
    # Totals row
    total_row = 8 + len(colaboradores)
    total_fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
    
    for col, value in enumerate(["TOTAL", "", "", total_atual, "", total_diferenca, total_novo], 1):
        cell = ws.cell(row=total_row, column=col, value=value)
        cell.font = Font(bold=True)
        cell.fill = total_fill
        cell.border = border
        if col in [4, 6, 7]:
            cell.number_format = 'R$ #,##0.00'
    
    # Adjust widths
    ws.column_dimensions['A'].width = 30
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 15
    ws.column_dimensions['G'].width = 15
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"previa_dissidio_{dissidio_id[:8]}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/relatorios/validacoes/excel")
async def relatorio_validacoes_excel(
    cliente_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate Excel report of payroll validations"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from io import BytesIO
    
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    validacoes = await db.validacoes.find(query, {"_id": 0, "user_id": 0}).to_list(1000)
    clientes = await db.clientes.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    clientes_dict = {c["id"]: c.get("nome_fantasia") or c.get("razao_social") for c in clientes}
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Validações"
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    headers = ["Empresa", "Mês/Ano", "Tipo", "Itens Verificados", "Erros/Divergências", "Status", "Data"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = border
    
    for row, val in enumerate(validacoes, 2):
        empresa = clientes_dict.get(val.get("cliente_id"), "N/A")
        tipo = "Comparação c/ Apoio" if val.get("tipo_validacao") == "comparacao_apoio" else "Análise da Folha"
        status = "OK" if val.get("total_erros", 0) == 0 else "Revisar"
        data = [
            empresa,
            f"{val.get('mes_referencia', '')}/{val.get('ano_referencia', '')}",
            tipo,
            val.get("total_verificados", 0),
            val.get("total_erros", 0),
            status,
            val.get("created_at", "")[:10] if val.get("created_at") else ""
        ]
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = border
    
    for col in ['A', 'B', 'C', 'D', 'E', 'F', 'G']:
        ws.column_dimensions[col].width = 18
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"validacoes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== CONVENÇÃO COLETIVA (DISSÍDIO) ====================

@api_router.post("/convencao/analisar")
async def analisar_convencao(
    file: UploadFile = File(...),
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Analyze union convention and extract adjustment data"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        content = await file.read()
        suffix = Path(file.filename).suffix
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"convencao-{uuid.uuid4()}",
                system_message="""Você é um especialista em convenções coletivas de trabalho e departamento pessoal.
                Analise o documento da convenção coletiva e extraia TODAS as informações relevantes para cálculo de dissídio.
                
                MUITO IMPORTANTE - PISOS SALARIAIS POR FUNÇÃO:
                Muitas convenções definem PISOS DIFERENTES para cada cargo/função. Identifique TODOS:
                - Piso do cargo X: R$ valor
                - Piso do cargo Y: R$ valor
                - Se houver apenas um piso geral, informe apenas esse
                
                IMPORTANTE - VIGÊNCIA:
                Identifique claramente o período de vigência da convenção (data início e fim).
                
                MUITO IMPORTANTE - PROPORCIONALIDADE POR DATA DE ADMISSÃO:
                Muitas convenções definem que funcionários admitidos DURANTE o período de retroatividade
                recebem o retroativo de forma PROPORCIONAL. Procure por tabelas ou cláusulas que definam:
                - "Admitidos em janeiro: 100% do retroativo"
                - "Admitidos em fevereiro: 11/12 do retroativo"
                - Etc.
                Se não encontrar tabela específica, deixe como null.
                
                IMPORTANTE - Identifique também:
                1. VERBAS QUE RECEBEM REAJUSTE (salário, horas extras, DSR, adicional noturno, etc)
                2. VERBAS QUE NÃO RECEBEM REAJUSTE (vale transporte, vale refeição fixo, INSS, IRRF, etc)
                3. BENEFÍCIOS COM VALORES NOVOS (VA, VR, VT, auxílio creche, etc)
                4. DESCONTOS QUE MUDARAM (contribuição sindical, assistencial, etc)
                
                Retorne APENAS um JSON válido (sem texto adicional):
                {
                    "sindicato": "nome completo do sindicato",
                    "categoria": "categoria profissional",
                    "percentual_reajuste": número decimal (ex: 5.5 para 5,5%),
                    "data_base": "MM/YYYY (mês/ano da data base)",
                    "mes_convencao": "MM/YYYY (mês/ano que a convenção foi assinada/publicada)",
                    "meses_retroativos": número de meses entre data_base e mes_convencao,
                    "piso_salarial": valor do piso geral (ou do menor piso se houver vários),
                    "piso_salarial_anterior": valor anterior se mencionado ou null,
                    "pisos_por_funcao": [
                        {
                            "funcao": "Auxiliar Administrativo",
                            "piso_novo": 1650.00,
                            "piso_anterior": 1550.00
                        },
                        {
                            "funcao": "Vendedor",
                            "piso_novo": 1800.00,
                            "piso_anterior": 1700.00
                        },
                        {
                            "funcao": "Gerente",
                            "piso_novo": 3500.00,
                            "piso_anterior": 3300.00
                        }
                    ],
                    "tabela_proporcionalidade": [
                        {"mes_admissao": 1, "percentual": 100, "descricao": "Janeiro - 12/12"},
                        {"mes_admissao": 2, "percentual": 91.67, "descricao": "Fevereiro - 11/12"},
                        {"mes_admissao": 3, "percentual": 83.33, "descricao": "Março - 10/12"}
                    ],
                    "proporcionalidade_extraida_da_convencao": true ou false,
                    "verbas_com_reajuste": [
                        "salario_base",
                        "horas_extras_50",
                        "horas_extras_100",
                        "dsr",
                        "adicional_noturno",
                        "comissao",
                        "gratificacao"
                    ],
                    "verbas_sem_reajuste": [
                        "vale_transporte",
                        "vale_refeicao",
                        "vale_alimentacao",
                        "inss",
                        "irrf"
                    ],
                    "beneficios": [
                        {
                            "tipo": "vale_alimentacao",
                            "nome": "Vale Alimentação",
                            "valor_novo": 800.00,
                            "valor_anterior": 700.00,
                            "variacao_percentual": 14.29,
                            "observacao": "aumento de R$ 100,00"
                        },
                        {
                            "tipo": "vale_refeicao",
                            "nome": "Vale Refeição",
                            "valor_novo": 35.00,
                            "valor_anterior": 32.00,
                            "variacao_percentual": 9.38,
                            "observacao": "por dia trabalhado"
                        },
                        {
                            "tipo": "auxilio_creche",
                            "nome": "Auxílio Creche",
                            "valor_novo": 400.00,
                            "valor_anterior": null,
                            "variacao_percentual": null,
                            "observacao": "novo benefício"
                        }
                    ],
                    "descontos": [
                        {
                            "tipo": "contribuicao_assistencial",
                            "nome": "Contribuição Assistencial",
                            "valor_novo": 50.00,
                            "valor_anterior": 40.00,
                            "variacao_percentual": 25.0,
                            "observacao": "desconto em folha"
                        },
                        {
                            "tipo": "mensalidade_sindical",
                            "nome": "Mensalidade Sindical",
                            "percentual": 1.0,
                            "observacao": "1% do salário base"
                        }
                    ],
                    "clausulas_importantes": ["cláusulas relevantes para DP"],
                    "vigencia_inicio": "DD/MM/YYYY",
                    "vigencia_fim": "DD/MM/YYYY",
                    "resumo": "resumo executivo em 2-3 frases"
                }
                
                Se não encontrar informação sobre algum campo, use null.
                Para benefícios e descontos, extraia TODOS que encontrar com seus valores.
                Se não encontrar tabela de proporcionalidade na convenção, deixe tabela_proporcionalidade como null e proporcionalidade_extraida_da_convencao como false."""
            ).with_model("gemini", "gemini-2.0-flash")
            
            file_content = FileContentWithMimeType(
                file_path=tmp_path,
                mime_type="application/pdf"
            )
            
            response = await chat.send_message(UserMessage(
                text="Analise esta convenção coletiva e extraia TODOS os dados para cálculo de dissídio retroativo, incluindo quais verbas devem ou não receber reajuste. Busque especialmente por tabelas de proporcionalidade para funcionários admitidos durante o período retroativo.",
                file_contents=[file_content]
            ))
            
            try:
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                dados = json.loads(response_text.strip())
                
                # Se não encontrou tabela de proporcionalidade, gerar uma padrão
                if not dados.get('tabela_proporcionalidade'):
                    meses_retro = dados.get('meses_retroativos', 12)
                    if meses_retro and meses_retro > 0:
                        tabela_padrao = []
                        for mes in range(1, min(meses_retro + 1, 13)):
                            avos = meses_retro - mes + 1
                            percentual = round((avos / meses_retro) * 100, 2)
                            nomes_meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
                            nome_mes = nomes_meses[mes - 1] if mes <= 12 else f'Mês {mes}'
                            tabela_padrao.append({
                                "mes_admissao": mes,
                                "percentual": percentual,
                                "descricao": f"{nome_mes} - {avos}/{meses_retro}",
                                "avos": avos
                            })
                        dados['tabela_proporcionalidade'] = tabela_padrao
                        dados['proporcionalidade_extraida_da_convencao'] = False
                    
            except json.JSONDecodeError:
                dados = {"raw_response": response, "parsing_error": True}
            
            return {
                "cliente_id": cliente_id,
                "dados_convencao": dados,
                "message": "Convenção analisada com sucesso. Revise os dados antes de aplicar o dissídio."
            }
            
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Erro na análise: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao analisar convenção: {str(e)}")


@api_router.post("/dissidio/calcular-retroativo")
async def calcular_dissidio_retroativo(
    convencao_dados: str = Form(...),
    holerites: List[UploadFile] = File(...),
    cliente_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Calcula dissídio retroativo automaticamente.
    - convencao_dados: JSON com dados extraídos da convenção
    - holerites: Lista de holerites dos meses retroativos
    - Exclui impostos (INSS, IRRF) pois serão calculados na competência de pagamento
    - Aplica proporcionalidade para funcionários admitidos durante o período retroativo
    """
    try:
        from document_processor import doc_processor
        
        # Parse dados da convenção
        conv = json.loads(convencao_dados)
        percentual = float(conv.get('percentual_reajuste', 0)) / 100
        verbas_com_reajuste = [v.lower() for v in conv.get('verbas_com_reajuste', [])]
        
        # Obter tabela de proporcionalidade
        tabela_proporcionalidade = conv.get('tabela_proporcionalidade', [])
        data_base_str = conv.get('data_base', '')  # MM/YYYY
        
        # Verbas que são IMPOSTOS/DESCONTOS LEGAIS - não entram no cálculo de retroativo
        # Serão calculados automaticamente na competência de pagamento
        verbas_impostos_excluir = [
            'inss', 'irrf', 'ir', 'imposto_renda', 'contribuicao_sindical',
            'fgts', 'pensao_alimenticia', 'adiantamento', 'vale_transporte',
            'desconto_vt', 'desc_vt', 'faltas', 'atrasos', 'desconto'
        ]
        
        if not percentual:
            raise HTTPException(status_code=400, detail="Percentual de reajuste não informado")
        
        # Verificar cliente
        cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
        if not cliente:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        # Função auxiliar para calcular proporcionalidade baseada na data de admissão
        def calcular_proporcionalidade(data_admissao_str, data_base_str, meses_retroativos):
            """
            Calcula o percentual de proporcionalidade baseado na data de admissão.
            Se o funcionário foi admitido após a data base, recebe proporcional.
            """
            if not data_admissao_str or not data_base_str:
                return 100.0, None  # Sem data de admissão, assume 100%
            
            try:
                # Parse data base (MM/YYYY)
                mes_base, ano_base = map(int, data_base_str.split('/'))
                
                # Parse data admissão (pode ser DD/MM/YYYY ou MM/YYYY)
                partes = data_admissao_str.split('/')
                if len(partes) == 3:
                    dia_adm, mes_adm, ano_adm = int(partes[0]), int(partes[1]), int(partes[2])
                elif len(partes) == 2:
                    mes_adm, ano_adm = int(partes[0]), int(partes[1])
                else:
                    return 100.0, None
                
                # Calcular meses desde a data base até a admissão
                meses_desde_base = (ano_adm - ano_base) * 12 + (mes_adm - mes_base)
                
                # Se foi admitido antes ou na data base, recebe 100%
                if meses_desde_base <= 0:
                    return 100.0, None
                
                # Se foi admitido depois do período retroativo, não tem direito
                if meses_desde_base >= meses_retroativos:
                    return 0.0, f"Admitido após período retroativo"
                
                # Calcular proporcional baseado nos meses que tem direito
                meses_direito = meses_retroativos - meses_desde_base
                percentual_prop = (meses_direito / meses_retroativos) * 100
                
                return round(percentual_prop, 2), f"Proporcional: {meses_direito}/{meses_retroativos} meses"
                
            except (ValueError, AttributeError):
                return 100.0, None  # Erro no parse, assume 100%
        
        # Processar cada holerite
        resultados_por_mes = []
        total_geral_retroativo = 0
        colaboradores_consolidado = {}
        meses_retroativos = conv.get('meses_retroativos', 12)
        
        for holerite in holerites:
            content = await holerite.read()
            suffix = Path(holerite.filename).suffix
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                # Extrair texto e colaboradores
                texto = doc_processor.extract_text(tmp_path)
                colaboradores = doc_processor.parse_folha_multiplos_colaboradores(texto)
                
                # Extrair competência do nome do arquivo ou do conteúdo
                competencia = extrair_competencia_holerite(holerite.filename, texto)
                
                mes_resultado = {
                    'arquivo': holerite.filename,
                    'competencia': competencia,
                    'colaboradores': [],
                    'total_retroativo_mes': 0,
                    'total_valor_anterior_mes': 0,
                    'total_valor_novo_mes': 0
                }
                
                # Obter pisos salariais da convenção para validação
                pisos_por_funcao = conv.get('pisos_por_funcao', [])
                piso_salarial_geral = conv.get('piso_salarial')
                
                for colab in colaboradores:
                    nome = colab.get('nome', 'Sem Nome')
                    cargo = colab.get('cargo', colab.get('funcao', ''))
                    data_admissao = colab.get('data_admissao', '')
                    
                    # Calcular proporcionalidade baseada na data de admissão
                    percentual_proporcional, obs_proporcional = calcular_proporcionalidade(
                        data_admissao, data_base_str, meses_retroativos
                    )
                    
                    # Calcular reajuste sobre verbas aplicáveis
                    valor_base_reajuste = 0
                    verbas_calculadas = []
                    total_valor_anterior_colab = 0
                    total_valor_novo_colab = 0
                    
                    # Mapear campos do colaborador para verbas da convenção
                    mapeamento_verbas = {
                        'salario_base': ['salario_base', 'salario', 'salario_mensalista'],
                        'horas_extras_50': ['horas_extras_50', 'horas_extras', 'hora_extra_50'],
                        'horas_extras_100': ['horas_extras_100', 'hora_extra_100'],
                        'dsr': ['dsr', 'dsr_horas_extras', 'descanso_semanal'],
                        'adicional_noturno': ['adicional_noturno', 'adic_noturno'],
                        'comissao': ['comissao', 'comissoes'],
                        'gratificacao': ['gratificacao', 'gratificacoes'],
                        'quebra_caixa': ['quebra_caixa', 'quebra_de_caixa'],
                        'adicional_insalubridade': ['adicional_insalubridade', 'insalubridade'],
                        'adicional_periculosidade': ['adicional_periculosidade', 'periculosidade'],
                    }
                    
                    # Obter salário base do colaborador para verificação de piso
                    salario_base_colab = 0
                    for campo in ['salario_base', 'salario', 'salario_mensalista']:
                        if colab.get(campo, 0) > 0:
                            salario_base_colab = colab.get(campo, 0)
                            break
                    
                    for verba_conv in verbas_com_reajuste:
                        # EXCLUIR impostos e descontos legais do cálculo
                        verba_lower = verba_conv.lower()
                        if any(imp in verba_lower for imp in verbas_impostos_excluir):
                            continue
                        
                        # Encontrar o campo correspondente no holerite
                        campos_holerite = mapeamento_verbas.get(verba_conv, [verba_conv])
                        
                        valor = 0
                        for campo in campos_holerite:
                            v = colab.get(campo, 0)
                            if v:
                                valor = v
                                break
                        
                        if valor > 0:
                            diferenca = valor * percentual
                            valor_novo = valor + diferenca
                            valor_base_reajuste += valor
                            total_valor_anterior_colab += valor
                            total_valor_novo_colab += valor_novo
                            
                            verbas_calculadas.append({
                                'verba': verba_conv,
                                'valor_anterior': round(valor, 2),
                                'valor_original': round(valor, 2),  # Mantido para compatibilidade
                                'valor_novo': round(valor_novo, 2),
                                'diferenca': round(diferenca, 2)
                            })
                    
                    retroativo_colab = sum(v['diferenca'] for v in verbas_calculadas)
                    
                    # ========== APLICAR PROPORCIONALIDADE ==========
                    retroativo_original = retroativo_colab
                    proporcionalidade_info = None
                    
                    if percentual_proporcional < 100:
                        retroativo_colab = retroativo_colab * (percentual_proporcional / 100)
                        proporcionalidade_info = {
                            'percentual': percentual_proporcional,
                            'observacao': obs_proporcional,
                            'data_admissao': data_admissao,
                            'retroativo_original': round(retroativo_original, 2),
                            'retroativo_proporcional': round(retroativo_colab, 2)
                        }
                    
                    # ========== VALIDAÇÃO DO PISO SALARIAL ==========
                    alerta_piso = None
                    piso_aplicavel = None
                    piso_funcao_nome = None
                    
                    # 1. Verificar piso específico por função/cargo
                    if cargo and pisos_por_funcao:
                        cargo_lower = cargo.lower().strip()
                        for piso_func in pisos_por_funcao:
                            funcao_piso = piso_func.get('funcao', '').lower().strip()
                            # Match parcial: se o cargo contém a função ou vice-versa
                            if funcao_piso and (funcao_piso in cargo_lower or cargo_lower in funcao_piso):
                                piso_aplicavel = piso_func.get('piso_novo', 0)
                                piso_funcao_nome = piso_func.get('funcao')
                                break
                    
                    # 2. Se não encontrou piso específico, usar piso geral
                    if piso_aplicavel is None and piso_salarial_geral:
                        try:
                            piso_aplicavel = float(piso_salarial_geral)
                        except:
                            piso_aplicavel = None
                    
                    # 3. Verificar se salário novo está abaixo do piso
                    salario_novo_calculado = salario_base_colab * (1 + percentual) if salario_base_colab else 0
                    
                    if piso_aplicavel and salario_novo_calculado > 0:
                        try:
                            piso_val = float(piso_aplicavel)
                            if salario_novo_calculado < piso_val:
                                diferenca_piso = piso_val - salario_novo_calculado
                                alerta_piso = {
                                    'tipo': 'SALARIO_ABAIXO_PISO',
                                    'mensagem': f'Salário abaixo do piso salarial',
                                    'salario_calculado': round(salario_novo_calculado, 2),
                                    'piso_aplicavel': round(piso_val, 2),
                                    'diferenca': round(diferenca_piso, 2),
                                    'funcao_piso': piso_funcao_nome or 'Piso Geral',
                                    'cargo_colaborador': cargo or 'Não informado'
                                }
                        except (ValueError, TypeError):
                            pass
                    
                    colab_resultado = {
                        'nome': nome,
                        'cpf': colab.get('cpf', ''),
                        'cargo': cargo,
                        'data_admissao': data_admissao,
                        'valor_base_reajuste': round(valor_base_reajuste, 2),
                        'total_valor_anterior': round(total_valor_anterior_colab, 2),
                        'total_valor_novo': round(total_valor_novo_colab, 2),
                        'retroativo': round(retroativo_colab, 2),
                        'verbas': verbas_calculadas,
                        'alerta_piso': alerta_piso,
                        'proporcionalidade': proporcionalidade_info
                    }
                    
                    mes_resultado['colaboradores'].append(colab_resultado)
                    mes_resultado['total_retroativo_mes'] += retroativo_colab
                    mes_resultado['total_valor_anterior_mes'] += total_valor_anterior_colab
                    mes_resultado['total_valor_novo_mes'] += total_valor_novo_colab
                    
                    # Consolidar por colaborador
                    if nome not in colaboradores_consolidado:
                        colaboradores_consolidado[nome] = {
                            'nome': nome,
                            'cpf': colab.get('cpf', ''),
                            'cargo': cargo,
                            'data_admissao': data_admissao,
                            'meses': [],
                            'total_retroativo': 0,
                            'total_valor_anterior': 0,
                            'total_valor_novo': 0,
                            'alertas_piso': [],
                            'proporcionalidade': proporcionalidade_info
                        }
                    colaboradores_consolidado[nome]['meses'].append({
                        'competencia': competencia,
                        'retroativo': round(retroativo_colab, 2),
                        'valor_anterior': round(total_valor_anterior_colab, 2),
                        'valor_novo': round(total_valor_novo_colab, 2),
                        'verbas': verbas_calculadas,
                        'alerta_piso': alerta_piso,
                        'proporcionalidade': proporcionalidade_info
                    })
                    colaboradores_consolidado[nome]['total_retroativo'] += retroativo_colab
                    colaboradores_consolidado[nome]['total_valor_anterior'] += total_valor_anterior_colab
                    colaboradores_consolidado[nome]['total_valor_novo'] += total_valor_novo_colab
                    
                    # Acumular alertas de piso por colaborador
                    if alerta_piso:
                        colaboradores_consolidado[nome]['alertas_piso'].append({
                            'competencia': competencia,
                            **alerta_piso
                        })
                
                mes_resultado['total_retroativo_mes'] = round(mes_resultado['total_retroativo_mes'], 2)
                mes_resultado['total_valor_anterior_mes'] = round(mes_resultado['total_valor_anterior_mes'], 2)
                mes_resultado['total_valor_novo_mes'] = round(mes_resultado['total_valor_novo_mes'], 2)
                total_geral_retroativo += mes_resultado['total_retroativo_mes']
                resultados_por_mes.append(mes_resultado)
                
            finally:
                os.unlink(tmp_path)
        
        # Arredondar totais consolidados
        for colab_data in colaboradores_consolidado.values():
            colab_data['total_retroativo'] = round(colab_data['total_retroativo'], 2)
            colab_data['total_valor_anterior'] = round(colab_data['total_valor_anterior'], 2)
            colab_data['total_valor_novo'] = round(colab_data['total_valor_novo'], 2)
        
        # Consolidar alertas de piso salarial
        alertas_piso_geral = []
        for colab_data in colaboradores_consolidado.values():
            if colab_data.get('alertas_piso'):
                # Pegar apenas o alerta mais recente (último mês)
                ultimo_alerta = colab_data['alertas_piso'][-1]
                alertas_piso_geral.append({
                    'colaborador': colab_data['nome'],
                    'cargo': colab_data.get('cargo', ''),
                    **ultimo_alerta
                })
        
        # Salvar cálculo no banco
        calculo_id = str(uuid.uuid4())
        calculo_doc = {
            "id": calculo_id,
            "cliente_id": cliente_id,
            "cliente_nome": cliente.get("nome_fantasia") or cliente.get("razao_social"),
            "dados_convencao": conv,
            "percentual_reajuste": conv.get('percentual_reajuste'),
            "meses_processados": len(resultados_por_mes),
            "resultados_por_mes": resultados_por_mes,
            "colaboradores_consolidado": list(colaboradores_consolidado.values()),
            "total_retroativo": round(total_geral_retroativo, 2),
            "alertas_piso": alertas_piso_geral,
            "impostos_excluidos": True,  # Flag para indicar que impostos foram excluídos
            "nota_impostos": "INSS, IRRF e demais encargos serão calculados na competência de pagamento",
            "status": "calculado",
            "user_id": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.calculos_dissidio.insert_one(calculo_doc)
        
        return {
            "id": calculo_id,
            "success": True,
            "percentual_reajuste": conv.get('percentual_reajuste'),
            "meses_processados": len(resultados_por_mes),
            "total_colaboradores": len(colaboradores_consolidado),
            "total_retroativo": round(total_geral_retroativo, 2),
            "resultados_por_mes": resultados_por_mes,
            "colaboradores_consolidado": list(colaboradores_consolidado.values()),
            "alertas_piso": alertas_piso_geral,
            "impostos_excluidos": True,
            "nota_impostos": "INSS, IRRF e demais encargos serão calculados na competência de pagamento",
            "message": f"Cálculo concluído: R$ {total_geral_retroativo:,.2f} de retroativo"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Dados da convenção inválidos")
    except HTTPException:
        # Re-raise HTTP exceptions as-is (404, 400, etc.)
        raise
    except Exception as e:
        logger.error(f"Erro no cálculo de dissídio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao calcular dissídio: {str(e)}")


def extrair_competencia_holerite(filename: str, texto: str) -> str:
    """Extrai a competência (MM/YYYY) do nome do arquivo ou do texto do holerite"""
    import re
    
    # Tentar extrair do nome do arquivo (ex: "folha_01_2024.pdf", "202401.pdf")
    patterns = [
        r'(\d{2})[_\-/]?(\d{4})',  # 01_2024, 01-2024, 01/2024
        r'(\d{4})[_\-]?(\d{2})',    # 2024_01, 202401
        r'(\d{2})(\d{4})',           # 012024
    ]
    
    for pattern in patterns:
        match = re.search(pattern, filename)
        if match:
            g1, g2 = match.groups()
            if len(g1) == 4:  # Ano primeiro
                return f"{g2}/{g1}"
            else:  # Mês primeiro
                return f"{g1}/{g2}"
    
    # Tentar extrair do texto
    comp_match = re.search(r'[Cc]ompet[êe]ncia[:\s]*(\d{2})[/\-](\d{4})', texto)
    if comp_match:
        return f"{comp_match.group(1)}/{comp_match.group(2)}"
    
    return "??/????"


@api_router.get("/calculos-dissidio")
async def listar_calculos_dissidio(
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista cálculos de dissídio realizados"""
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    calculos = await db.calculos_dissidio.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return calculos


@api_router.get("/calculos-dissidio/{calculo_id}")
async def obter_calculo_dissidio(
    calculo_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retorna detalhes de um cálculo de dissídio"""
    calculo = await db.calculos_dissidio.find_one(
        {"id": calculo_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not calculo:
        raise HTTPException(status_code=404, detail="Cálculo não encontrado")
    return calculo


@api_router.delete("/calculos-dissidio/{calculo_id}")
async def excluir_calculo_dissidio(
    calculo_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exclui um cálculo de dissídio"""
    result = await db.calculos_dissidio.delete_one({
        "id": calculo_id,
        "user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cálculo não encontrado")
    return {"message": "Cálculo excluído com sucesso"}


@api_router.get("/calculos-dissidio/{calculo_id}/exportar-convencao-pdf")
async def exportar_convencao_pdf_de_calculo(
    calculo_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exporta o PDF do resumo da convenção a partir de um cálculo de dissídio existente"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm, cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    # Buscar o cálculo
    calculo = await db.calculos_dissidio.find_one(
        {"id": calculo_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not calculo:
        raise HTTPException(status_code=404, detail="Cálculo não encontrado")
    
    # Verificar se há dados da convenção
    dados_convencao = calculo.get("dados_convencao")
    if not dados_convencao:
        raise HTTPException(status_code=400, detail="Este cálculo não possui dados da convenção para exportar")
    
    # Cores profissionais
    VERMELHO = colors.HexColor("#991b1b")
    VERMELHO_CLARO = colors.HexColor("#fef2f2")
    AZUL_ESCURO = colors.HexColor("#1e293b")
    VERDE = colors.HexColor("#059669")
    VERDE_CLARO = colors.HexColor("#ecfdf5")
    CINZA = colors.HexColor("#64748b")
    CINZA_CLARO = colors.HexColor("#f1f5f9")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    styles = getSampleStyleSheet()
    
    # Helper para formatar valores
    def fmt_valor(val):
        if val is None: return "N/A"
        try:
            v = float(val)
            return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        except:
            return str(val) if val else "N/A"
    
    def fmt_pct(val):
        try:
            return f"{float(val):.2f}%"
        except:
            return str(val) if val else "0%"
    
    # Estilos customizados
    est_header = ParagraphStyle('Header', fontSize=20, textColor=VERMELHO, alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=2*mm)
    est_subheader = ParagraphStyle('SubHeader', fontSize=10, textColor=CINZA, alignment=TA_CENTER, spaceAfter=8*mm)
    est_secao = ParagraphStyle('Secao', fontSize=12, textColor=AZUL_ESCURO, fontName='Helvetica-Bold', spaceBefore=6*mm, spaceAfter=3*mm)
    est_normal = ParagraphStyle('Normal', fontSize=10, textColor=colors.black, alignment=TA_JUSTIFY, spaceAfter=2*mm)
    est_pequeno = ParagraphStyle('Pequeno', fontSize=8, textColor=CINZA, alignment=TA_CENTER)
    est_destaque_titulo = ParagraphStyle('DestaqueTitulo', fontSize=9, textColor=CINZA, alignment=TA_CENTER, fontName='Helvetica')
    est_destaque_valor = ParagraphStyle('DestaqueValor', fontSize=22, textColor=VERMELHO, alignment=TA_CENTER, fontName='Helvetica-Bold')
    est_destaque_valor_verde = ParagraphStyle('DestaqueValorVerde', fontSize=22, textColor=VERDE, alignment=TA_CENTER, fontName='Helvetica-Bold')
    
    elementos = []
    
    # ========== CABEÇALHO ==========
    elementos.append(Paragraph("<b>BUSINESS CONTABILIDADE</b>", est_header))
    elementos.append(Paragraph("Análise de Convenção Coletiva de Trabalho", est_subheader))
    
    # Linha divisória
    elementos.append(HRFlowable(width="100%", thickness=2, color=VERMELHO, spaceBefore=0, spaceAfter=8*mm))
    
    # ========== DESTAQUE PRINCIPAL ==========
    percentual = dados_convencao.get('percentual_reajuste', 0)
    piso_novo = dados_convencao.get('piso_salarial')
    piso_anterior = dados_convencao.get('piso_salarial_anterior')
    meses_retro = dados_convencao.get('meses_retroativos', 0)
    
    # Box de destaque principal
    destaque_data = [
        [
            Paragraph("REAJUSTE SALARIAL", est_destaque_titulo),
            Paragraph("PISO ANTERIOR", est_destaque_titulo),
            Paragraph("PISO NOVO", est_destaque_titulo),
            Paragraph("MESES RETROATIVOS", est_destaque_titulo)
        ],
        [
            Paragraph(f"<b>{fmt_pct(percentual)}</b>", est_destaque_valor),
            Paragraph(f"<b>{fmt_valor(piso_anterior)}</b>", ParagraphStyle('V', fontSize=16, textColor=CINZA, alignment=TA_CENTER, fontName='Helvetica-Bold')),
            Paragraph(f"<b>{fmt_valor(piso_novo)}</b>", est_destaque_valor_verde),
            Paragraph(f"<b>{meses_retro}</b>", ParagraphStyle('V', fontSize=22, textColor=AZUL_ESCURO, alignment=TA_CENTER, fontName='Helvetica-Bold'))
        ]
    ]
    
    tabela_destaque = Table(destaque_data, colWidths=[4.5*cm, 4.5*cm, 4.5*cm, 4.5*cm])
    tabela_destaque.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CINZA_CLARO),
        ('BOX', (0, 0), (-1, -1), 2, VERMELHO),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('TOPPADDING', (0, 1), (-1, 1), 2),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
        ('BACKGROUND', (0, 0), (0, -1), VERMELHO_CLARO),
        ('BACKGROUND', (2, 0), (2, -1), VERDE_CLARO),
    ]))
    elementos.append(tabela_destaque)
    elementos.append(Spacer(1, 8*mm))
    
    # ========== DADOS DA CONVENÇÃO ==========
    elementos.append(Paragraph("DADOS DA CONVENÇÃO", est_secao))
    
    sindicato = dados_convencao.get('sindicato', 'Não informado')
    categoria = dados_convencao.get('categoria', 'Não informado')
    data_base = dados_convencao.get('data_base', 'Não informado')
    mes_conv = dados_convencao.get('mes_convencao', 'Não informado')
    
    info_data = [
        ["Sindicato:", sindicato, "Categoria:", categoria],
        ["Data Base:", data_base, "Mês Convenção:", mes_conv],
    ]
    
    tabela_info = Table(info_data, colWidths=[3*cm, 6*cm, 3*cm, 6*cm])
    tabela_info.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), CINZA),
        ('TEXTCOLOR', (2, 0), (2, -1), CINZA),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (-1, -1), CINZA_CLARO),
        ('BOX', (0, 0), (-1, -1), 0.5, CINZA),
    ]))
    elementos.append(tabela_info)
    elementos.append(Spacer(1, 6*mm))
    
    # ========== PISOS POR FUNÇÃO ==========
    pisos_funcao = dados_convencao.get('pisos_por_funcao', [])
    if pisos_funcao:
        elementos.append(Paragraph("PISOS SALARIAIS POR FUNÇÃO", est_secao))
        
        piso_headers = ['Função/Cargo', 'Piso Anterior', 'Piso Novo', 'Variação']
        piso_data = [piso_headers]
        for piso in pisos_funcao:
            funcao = piso.get('funcao', 'N/A')
            ant = piso.get('piso_anterior')
            novo = piso.get('piso_novo')
            variacao = ""
            try:
                if ant and novo:
                    var = ((float(novo) - float(ant)) / float(ant)) * 100
                    variacao = f"+{var:.1f}%"
            except:
                pass
            piso_data.append([funcao, fmt_valor(ant), fmt_valor(novo), variacao])
        
        tabela_pisos = Table(piso_data, colWidths=[7*cm, 4*cm, 4*cm, 3*cm])
        tabela_pisos.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#d97706")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef3c7")]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elementos.append(tabela_pisos)
        elementos.append(Spacer(1, 6*mm))
    
    # ========== VERBAS ==========
    verbas_com = dados_convencao.get('verbas_com_reajuste', [])
    verbas_sem = dados_convencao.get('verbas_sem_reajuste', [])
    
    if verbas_com or verbas_sem:
        elementos.append(Paragraph("VERBAS AFETADAS", est_secao))
        
        verbas_data = [["✓ COM REAJUSTE", "✗ SEM REAJUSTE"]]
        max_len = max(len(verbas_com), len(verbas_sem), 1)
        for i in range(max_len):
            v_com = verbas_com[i].replace('_', ' ').title() if i < len(verbas_com) else ""
            v_sem = verbas_sem[i].replace('_', ' ').title() if i < len(verbas_sem) else ""
            verbas_data.append([v_com, v_sem])
        
        tabela_verbas = Table(verbas_data, colWidths=[9*cm, 9*cm])
        tabela_verbas.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), VERDE_CLARO),
            ('BACKGROUND', (1, 0), (1, 0), VERMELHO_CLARO),
            ('TEXTCOLOR', (0, 0), (0, 0), VERDE),
            ('TEXTCOLOR', (1, 0), (1, 0), VERMELHO),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elementos.append(tabela_verbas)
        elementos.append(Spacer(1, 6*mm))
    
    # ========== BENEFÍCIOS ==========
    beneficios = dados_convencao.get('beneficios', [])
    if beneficios:
        elementos.append(Paragraph("BENEFÍCIOS", est_secao))
        
        ben_data = [["Benefício", "Valor Anterior", "Valor Novo", "Variação"]]
        for ben in beneficios:
            nome = ben.get('nome', ben.get('tipo', 'N/A'))
            val_ant = ben.get('valor_anterior')
            val_novo = ben.get('valor_novo')
            variacao = ""
            try:
                if val_ant and val_novo:
                    var = ((float(val_novo) - float(val_ant)) / float(val_ant)) * 100
                    variacao = f"+{var:.1f}%"
            except:
                pass
            ben_data.append([nome, fmt_valor(val_ant), fmt_valor(val_novo), variacao])
        
        tabela_ben = Table(ben_data, colWidths=[6*cm, 4*cm, 4*cm, 4*cm])
        tabela_ben.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), VERDE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, VERDE_CLARO]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elementos.append(tabela_ben)
        elementos.append(Spacer(1, 6*mm))
    
    # ========== RESUMO ==========
    resumo = dados_convencao.get('resumo')
    if resumo:
        elementos.append(Paragraph("RESUMO EXECUTIVO", est_secao))
        elementos.append(Paragraph(resumo, est_normal))
        elementos.append(Spacer(1, 4*mm))
    
    # ========== RODAPÉ ==========
    elementos.append(Spacer(1, 8*mm))
    elementos.append(HRFlowable(width="100%", thickness=1, color=CINZA, spaceBefore=0, spaceAfter=4*mm))
    
    data_geracao = datetime.now(timezone.utc).strftime("%d/%m/%Y às %H:%M")
    elementos.append(Paragraph(f"Documento gerado automaticamente em {data_geracao}", est_pequeno))
    elementos.append(Paragraph(f"Referente ao cálculo realizado em {calculo.get('created_at', '')[:10]}", est_pequeno))
    elementos.append(Paragraph("<b>Business Contabilidade</b> - Departamento Pessoal", est_pequeno))
    
    # Construir PDF
    doc.build(elementos)
    buffer.seek(0)
    
    sindicato_nome = dados_convencao.get('sindicato', 'convencao')[:30].replace(' ', '_').replace('/', '-')
    filename = f"resumo_convencao_{sindicato_nome}_{calculo_id[:8]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@api_router.get("/calculos-dissidio/{calculo_id}/excel")
async def exportar_calculo_dissidio_excel(
    calculo_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exporta cálculo de dissídio para Excel"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    calculo = await db.calculos_dissidio.find_one(
        {"id": calculo_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not calculo:
        raise HTTPException(status_code=404, detail="Cálculo não encontrado")
    
    wb = Workbook()
    
    # Aba 1: Resumo por Colaborador
    ws1 = wb.active
    ws1.title = "Resumo por Colaborador"
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    
    headers = ["Colaborador", "CPF", "Total Retroativo"]
    for col, header in enumerate(headers, 1):
        cell = ws1.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = border
    
    for row, colab in enumerate(calculo.get('colaboradores_consolidado', []), 2):
        data = [colab['nome'], colab.get('cpf', ''), colab['total_retroativo']]
        for col, value in enumerate(data, 1):
            cell = ws1.cell(row=row, column=col, value=value)
            cell.border = border
            if col == 3:
                cell.number_format = 'R$ #,##0.00'
    
    # Total
    total_row = len(calculo.get('colaboradores_consolidado', [])) + 2
    ws1.cell(row=total_row, column=1, value="TOTAL").font = Font(bold=True)
    ws1.cell(row=total_row, column=3, value=calculo.get('total_retroativo', 0)).number_format = 'R$ #,##0.00'
    
    # Aba 2: Detalhado por Mês
    ws2 = wb.create_sheet("Detalhado por Mês")
    
    headers2 = ["Competência", "Colaborador", "Verba", "Valor Original", "Diferença"]
    for col, header in enumerate(headers2, 1):
        cell = ws2.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = border
    
    row = 2
    for mes in calculo.get('resultados_por_mes', []):
        for colab in mes.get('colaboradores', []):
            for verba in colab.get('verbas', []):
                data = [
                    mes.get('competencia'),
                    colab['nome'],
                    verba['verba'],
                    verba['valor_original'],
                    verba['diferenca']
                ]
                for col, value in enumerate(data, 1):
                    cell = ws2.cell(row=row, column=col, value=value)
                    cell.border = border
                    if col in [4, 5]:
                        cell.number_format = 'R$ #,##0.00'
                row += 1
    
    # Ajustar larguras
    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_length = max(len(str(cell.value or '')) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_length + 2, 40)
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"dissidio_retroativo_{calculo_id[:8]}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@api_router.post("/convencao/exportar-resumo-pdf")
async def exportar_resumo_convencao_pdf(
    dados_convencao: dict = Body(...),
    cliente_id: str = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Gera PDF profissional com resumo da convenção coletiva"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm, cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from io import BytesIO
    from datetime import datetime
    from fastapi.responses import StreamingResponse
    
    # Cores profissionais
    VERMELHO = colors.HexColor("#991b1b")
    VERMELHO_CLARO = colors.HexColor("#fef2f2")
    AZUL_ESCURO = colors.HexColor("#1e293b")
    VERDE = colors.HexColor("#059669")
    VERDE_CLARO = colors.HexColor("#ecfdf5")
    CINZA = colors.HexColor("#64748b")
    CINZA_CLARO = colors.HexColor("#f1f5f9")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    styles = getSampleStyleSheet()
    
    # Helper para formatar valores
    def fmt_valor(val):
        if val is None: return "N/A"
        try:
            v = float(val)
            return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        except:
            return str(val) if val else "N/A"
    
    def fmt_pct(val):
        try:
            return f"{float(val):.2f}%"
        except:
            return str(val) if val else "0%"
    
    # Estilos customizados
    est_header = ParagraphStyle('Header', fontSize=20, textColor=VERMELHO, alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=2*mm)
    est_subheader = ParagraphStyle('SubHeader', fontSize=10, textColor=CINZA, alignment=TA_CENTER, spaceAfter=8*mm)
    est_secao = ParagraphStyle('Secao', fontSize=12, textColor=AZUL_ESCURO, fontName='Helvetica-Bold', spaceBefore=6*mm, spaceAfter=3*mm)
    est_normal = ParagraphStyle('Normal', fontSize=10, textColor=colors.black, alignment=TA_JUSTIFY, spaceAfter=2*mm)
    est_pequeno = ParagraphStyle('Pequeno', fontSize=8, textColor=CINZA, alignment=TA_CENTER)
    est_destaque_titulo = ParagraphStyle('DestaqueTitulo', fontSize=9, textColor=CINZA, alignment=TA_CENTER, fontName='Helvetica')
    est_destaque_valor = ParagraphStyle('DestaqueValor', fontSize=22, textColor=VERMELHO, alignment=TA_CENTER, fontName='Helvetica-Bold')
    est_destaque_valor_verde = ParagraphStyle('DestaqueValorVerde', fontSize=22, textColor=VERDE, alignment=TA_CENTER, fontName='Helvetica-Bold')
    
    elementos = []
    
    # ========== CABEÇALHO ==========
    elementos.append(Paragraph("<b>BUSINESS CONTABILIDADE</b>", est_header))
    elementos.append(Paragraph("Análise de Convenção Coletiva de Trabalho", est_subheader))
    
    # Linha divisória
    elementos.append(HRFlowable(width="100%", thickness=2, color=VERMELHO, spaceBefore=0, spaceAfter=8*mm))
    
    # ========== DESTAQUE PRINCIPAL - REAJUSTE E PISOS ==========
    percentual = dados_convencao.get('percentual_reajuste', 0)
    piso_novo = dados_convencao.get('piso_salarial')
    piso_anterior = dados_convencao.get('piso_salarial_anterior')
    meses_retro = dados_convencao.get('meses_retroativos', 0)
    
    # Calcular variação do piso
    variacao_piso = ""
    if piso_novo and piso_anterior:
        try:
            var = ((float(piso_novo) - float(piso_anterior)) / float(piso_anterior)) * 100
            variacao_piso = f"+{var:.1f}%"
        except:
            pass
    
    # Box de destaque principal
    destaque_data = [
        [
            Paragraph("REAJUSTE SALARIAL", est_destaque_titulo),
            Paragraph("PISO ANTERIOR", est_destaque_titulo),
            Paragraph("PISO NOVO", est_destaque_titulo),
            Paragraph("MESES RETROATIVOS", est_destaque_titulo)
        ],
        [
            Paragraph(f"<b>{fmt_pct(percentual)}</b>", est_destaque_valor),
            Paragraph(f"<b>{fmt_valor(piso_anterior)}</b>", ParagraphStyle('V', fontSize=16, textColor=CINZA, alignment=TA_CENTER, fontName='Helvetica-Bold')),
            Paragraph(f"<b>{fmt_valor(piso_novo)}</b>", est_destaque_valor_verde),
            Paragraph(f"<b>{meses_retro}</b>", ParagraphStyle('V', fontSize=22, textColor=AZUL_ESCURO, alignment=TA_CENTER, fontName='Helvetica-Bold'))
        ]
    ]
    
    tabela_destaque = Table(destaque_data, colWidths=[4.5*cm, 4.5*cm, 4.5*cm, 4.5*cm])
    tabela_destaque.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CINZA_CLARO),
        ('BOX', (0, 0), (-1, -1), 2, VERMELHO),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('TOPPADDING', (0, 1), (-1, 1), 2),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
        ('BACKGROUND', (0, 0), (0, -1), VERMELHO_CLARO),
        ('BACKGROUND', (2, 0), (2, -1), VERDE_CLARO),
    ]))
    elementos.append(tabela_destaque)
    elementos.append(Spacer(1, 8*mm))
    
    # ========== DADOS DA CONVENÇÃO ==========
    elementos.append(Paragraph("DADOS DA CONVENÇÃO", est_secao))
    
    sindicato = dados_convencao.get('sindicato', 'Não informado')
    categoria = dados_convencao.get('categoria', 'Não informado')
    data_base = dados_convencao.get('data_base', 'Não informado')
    mes_conv = dados_convencao.get('mes_convencao', 'Não informado')
    vigencia_ini = dados_convencao.get('vigencia_inicio', 'N/A')
    vigencia_fim = dados_convencao.get('vigencia_fim', 'N/A')
    
    info_data = [
        ["Sindicato:", sindicato, "Categoria:", categoria],
        ["Data Base:", data_base, "Mês Convenção:", mes_conv],
        ["Vigência:", f"{vigencia_ini} a {vigencia_fim}", "", ""]
    ]
    
    tabela_info = Table(info_data, colWidths=[3*cm, 6*cm, 3*cm, 6*cm])
    tabela_info.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), CINZA),
        ('TEXTCOLOR', (2, 0), (2, -1), CINZA),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (-1, -1), CINZA_CLARO),
        ('BOX', (0, 0), (-1, -1), 0.5, CINZA),
    ]))
    elementos.append(tabela_info)
    elementos.append(Spacer(1, 6*mm))
    
    # ========== PISOS POR FUNÇÃO ==========
    pisos_funcao = dados_convencao.get('pisos_por_funcao', [])
    if pisos_funcao:
        elementos.append(Paragraph("PISOS SALARIAIS POR FUNÇÃO", est_secao))
        
        piso_headers = ['Função/Cargo', 'Piso Anterior', 'Piso Novo', 'Variação']
        piso_data = [piso_headers]
        for piso in pisos_funcao:
            funcao = piso.get('funcao', 'N/A')
            ant = piso.get('piso_anterior')
            novo = piso.get('piso_novo')
            variacao = ""
            try:
                if ant and novo:
                    var = ((float(novo) - float(ant)) / float(ant)) * 100
                    variacao = f"+{var:.1f}%"
            except:
                pass
            piso_data.append([funcao, fmt_valor(ant), fmt_valor(novo), variacao])
        
        tabela_pisos = Table(piso_data, colWidths=[7*cm, 4*cm, 4*cm, 3*cm])
        tabela_pisos.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#d97706")),  # Amber
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef3c7")]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elementos.append(tabela_pisos)
        elementos.append(Spacer(1, 6*mm))
    
    # ========== ANÁLISE DO REAJUSTE ==========
    elementos.append(Paragraph("ANÁLISE DO IMPACTO", est_secao))
    
    # Calcular impactos
    try:
        pct = float(percentual) / 100
        exemplo_salario = float(piso_anterior) if piso_anterior else 1500
        impacto_mensal = exemplo_salario * pct
        impacto_retro = impacto_mensal * int(meses_retro)
    except:
        impacto_mensal = 0
        impacto_retro = 0
    
    analise_texto = f"""
    Com base no reajuste de <b>{fmt_pct(percentual)}</b> definido na convenção coletiva, 
    apresentamos a seguinte análise de impacto financeiro:
    """
    elementos.append(Paragraph(analise_texto.strip(), est_normal))
    
    # Tabela de impacto
    impacto_data = [
        ["Descrição", "Cálculo", "Valor"],
        ["Aumento mensal (base piso)", f"{fmt_valor(piso_anterior)} × {fmt_pct(percentual)}", fmt_valor(impacto_mensal)],
        ["Diferença de piso", f"{fmt_valor(piso_novo)} - {fmt_valor(piso_anterior)}", fmt_valor(float(piso_novo or 0) - float(piso_anterior or 0)) if piso_novo and piso_anterior else "N/A"],
        [f"Retroativo ({meses_retro} meses)", f"{fmt_valor(impacto_mensal)} × {meses_retro}", fmt_valor(impacto_retro)],
    ]
    
    tabela_impacto = Table(impacto_data, colWidths=[6*cm, 6*cm, 6*cm])
    tabela_impacto.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), AZUL_ESCURO),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, CINZA_CLARO]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('FONTNAME', (2, 1), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (2, -1), (2, -1), VERDE),
    ]))
    elementos.append(tabela_impacto)
    elementos.append(Spacer(1, 6*mm))
    
    # ========== VERBAS ==========
    verbas_com = dados_convencao.get('verbas_com_reajuste', [])
    verbas_sem = dados_convencao.get('verbas_sem_reajuste', [])
    
    if verbas_com or verbas_sem:
        elementos.append(Paragraph("VERBAS AFETADAS", est_secao))
        
        verbas_data = [["✓ COM REAJUSTE", "✗ SEM REAJUSTE"]]
        max_len = max(len(verbas_com), len(verbas_sem), 1)
        for i in range(max_len):
            v_com = verbas_com[i].replace('_', ' ').title() if i < len(verbas_com) else ""
            v_sem = verbas_sem[i].replace('_', ' ').title() if i < len(verbas_sem) else ""
            verbas_data.append([v_com, v_sem])
        
        tabela_verbas = Table(verbas_data, colWidths=[9*cm, 9*cm])
        tabela_verbas.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), VERDE_CLARO),
            ('BACKGROUND', (1, 0), (1, 0), VERMELHO_CLARO),
            ('TEXTCOLOR', (0, 0), (0, 0), VERDE),
            ('TEXTCOLOR', (1, 0), (1, 0), VERMELHO),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elementos.append(tabela_verbas)
        elementos.append(Spacer(1, 6*mm))
    
    # ========== BENEFÍCIOS ==========
    beneficios = dados_convencao.get('beneficios', [])
    if beneficios:
        elementos.append(Paragraph("BENEFÍCIOS", est_secao))
        
        ben_data = [["Benefício", "Valor Anterior", "Valor Novo", "Variação"]]
        for ben in beneficios:
            nome = ben.get('nome', ben.get('tipo', 'N/A'))
            val_ant = ben.get('valor_anterior')
            val_novo = ben.get('valor_novo')
            variacao = ""
            try:
                if val_ant and val_novo:
                    var = ((float(val_novo) - float(val_ant)) / float(val_ant)) * 100
                    variacao = f"+{var:.1f}%"
            except:
                pass
            ben_data.append([nome, fmt_valor(val_ant), fmt_valor(val_novo), variacao])
        
        tabela_ben = Table(ben_data, colWidths=[6*cm, 4*cm, 4*cm, 4*cm])
        tabela_ben.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), VERDE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, VERDE_CLARO]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elementos.append(tabela_ben)
        elementos.append(Spacer(1, 6*mm))
    
    # ========== DESCONTOS ==========
    descontos = dados_convencao.get('descontos', [])
    if descontos:
        elementos.append(Paragraph("DESCONTOS", est_secao))
        
        desc_data = [["Desconto", "Valor Anterior", "Valor Novo", "Observação"]]
        for desc in descontos:
            nome = desc.get('nome', desc.get('tipo', 'N/A'))
            desc_data.append([nome, fmt_valor(desc.get('valor_anterior')), fmt_valor(desc.get('valor_novo')), desc.get('observacao', '-')[:25]])
        
        tabela_desc = Table(desc_data, colWidths=[5*cm, 4*cm, 4*cm, 5*cm])
        tabela_desc.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), VERMELHO),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (2, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, CINZA),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, VERMELHO_CLARO]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elementos.append(tabela_desc)
        elementos.append(Spacer(1, 6*mm))
    
    # ========== PONTOS DE ATENÇÃO ==========
    clausulas = dados_convencao.get('clausulas_importantes', [])
    if clausulas:
        elementos.append(Paragraph("⚠ PONTOS DE ATENÇÃO", est_secao))
        for clausula in clausulas[:5]:
            elementos.append(Paragraph(f"• {clausula}", est_normal))
        elementos.append(Spacer(1, 4*mm))
    
    # ========== RESUMO EXECUTIVO ==========
    resumo = dados_convencao.get('resumo')
    if resumo:
        elementos.append(Paragraph("RESUMO EXECUTIVO", est_secao))
        elementos.append(Paragraph(resumo, est_normal))
        elementos.append(Spacer(1, 4*mm))
    
    # ========== RODAPÉ ==========
    elementos.append(Spacer(1, 8*mm))
    elementos.append(HRFlowable(width="100%", thickness=1, color=CINZA, spaceBefore=0, spaceAfter=4*mm))
    
    data_geracao = datetime.now().strftime("%d/%m/%Y às %H:%M")
    elementos.append(Paragraph(f"Documento gerado automaticamente em {data_geracao}", est_pequeno))
    elementos.append(Paragraph("<b>Business Contabilidade</b> - Departamento Pessoal", est_pequeno))
    elementos.append(Paragraph("Este documento é apenas informativo e não substitui a leitura integral da convenção coletiva.", est_pequeno))
    
    # Construir PDF
    doc.build(elementos)
    buffer.seek(0)
    
    sindicato_nome = dados_convencao.get('sindicato', 'convencao')[:30].replace(' ', '_').replace('/', '-')
    filename = f"resumo_convencao_{sindicato_nome}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== CONVERSÕES ====================

@api_router.post("/conversao/apontamentos")
async def converter_apontamentos(
    arquivos: List[UploadFile] = File(...),
    cliente_id: str = Form(...),
    competencia: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Converte apontamentos de clientes para formato SCI Único usando IA (versão legada)"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    from openpyxl import Workbook
    from io import BytesIO
    import base64
    
    try:
        # Salvar arquivos temporariamente
        temp_files = []
        for arquivo in arquivos:
            content = await arquivo.read()
            suffix = Path(arquivo.filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                temp_files.append({
                    "path": tmp.name,
                    "name": arquivo.filename,
                    "mime": arquivo.content_type or "application/octet-stream"
                })
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"apontamentos-{uuid.uuid4()}",
                system_message="""Você é um especialista em departamento pessoal.
                Analise os documentos de apontamentos enviados (podem ser imagens, planilhas, emails, PDFs) e extraia as informações no formato SCI Único.
                
                O formato SCI Único para apontamentos contém:
                - Nome do colaborador
                - CPF (se disponível)
                - Horas Extras 50%
                - Horas Extras 100%
                - Horas Noturnas
                - Adicional Noturno
                - DSR sobre HE
                - Faltas (dias)
                - Atrasos (horas)
                - Comissões
                - Gratificações
                - Outras verbas variáveis
                
                Retorne APENAS um JSON válido (sem texto adicional):
                {
                    "registros": [
                        {
                            "nome": "Nome do Colaborador",
                            "cpf": "000.000.000-00 ou null",
                            "horas_extras_50": 10.5,
                            "horas_extras_100": 2.0,
                            "horas_noturnas": 0,
                            "adicional_noturno": 0,
                            "dsr_he": 0,
                            "faltas": 0,
                            "atrasos": 0,
                            "comissoes": 0,
                            "gratificacoes": 0,
                            "outras_verbas": [],
                            "observacoes": "observações do colaborador"
                        }
                    ],
                    "observacoes_gerais": "observações sobre a extração"
                }
                
                Se não encontrar algum valor, use 0. Extraia TODOS os colaboradores encontrados nos documentos."""
            ).with_model("gemini", "gemini-2.0-flash")
            
            # Preparar arquivos para IA
            file_contents = []
            for tf in temp_files:
                file_contents.append(FileContentWithMimeType(
                    file_path=tf["path"],
                    mime_type=tf["mime"]
                ))
            
            response = await chat.send_message(UserMessage(
                text=f"Extraia os apontamentos destes {len(temp_files)} documento(s) para o formato SCI Único. Competência: {competencia or 'não informada'}",
                file_contents=file_contents
            ))
            
            # Parse response
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            registros = dados.get("registros", [])
            
            # Gerar planilha Excel
            wb = Workbook()
            ws = wb.active
            ws.title = "Apontamentos SCI"
            
            headers = ["Nome", "CPF", "HE 50%", "HE 100%", "H.Noturnas", "Adic.Noturno", "DSR/HE", "Faltas", "Atrasos", "Comissões", "Gratificações", "Observações"]
            for col, header in enumerate(headers, 1):
                ws.cell(row=1, column=col, value=header)
            
            for row, reg in enumerate(registros, 2):
                ws.cell(row=row, column=1, value=reg.get("nome", ""))
                ws.cell(row=row, column=2, value=reg.get("cpf", ""))
                ws.cell(row=row, column=3, value=reg.get("horas_extras_50", 0))
                ws.cell(row=row, column=4, value=reg.get("horas_extras_100", 0))
                ws.cell(row=row, column=5, value=reg.get("horas_noturnas", 0))
                ws.cell(row=row, column=6, value=reg.get("adicional_noturno", 0))
                ws.cell(row=row, column=7, value=reg.get("dsr_he", 0))
                ws.cell(row=row, column=8, value=reg.get("faltas", 0))
                ws.cell(row=row, column=9, value=reg.get("atrasos", 0))
                ws.cell(row=row, column=10, value=reg.get("comissoes", 0))
                ws.cell(row=row, column=11, value=reg.get("gratificacoes", 0))
                ws.cell(row=row, column=12, value=reg.get("observacoes", ""))
            
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            excel_base64 = base64.b64encode(output.read()).decode('utf-8')
            
            return {
                "success": True,
                "registros_extraidos": len(registros),
                "registros": registros,
                "observacoes": dados.get("observacoes_gerais", ""),
                "arquivo_base64": excel_base64,
                "arquivo_nome": f"apontamentos_sci_{competencia or 'atual'}.xlsx"
            }
            
        finally:
            for tf in temp_files:
                try:
                    os.unlink(tf["path"])
                except:
                    pass
                    
    except Exception as e:
        logger.error(f"Erro na conversão de apontamentos: {str(e)}")
        return {"success": False, "error": str(e)}


@api_router.post("/conversao/apontamentos-sci")
async def converter_apontamentos_com_template(
    apontamentos: List[UploadFile] = File(...),
    template_sci: UploadFile = File(...),
    cliente_id: str = Form(...),
    competencia: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Converte apontamentos usando a planilha modelo do SCI como referência.
    A IA analisa a estrutura do template e preenche com os dados extraídos dos apontamentos.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    from openpyxl import load_workbook, Workbook
    from openpyxl.utils import get_column_letter
    from io import BytesIO
    import base64
    
    try:
        temp_files = []
        template_path = None
        
        # Salvar template SCI
        template_content = await template_sci.read()
        template_suffix = Path(template_sci.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=template_suffix) as tmp:
            tmp.write(template_content)
            template_path = tmp.name
        
        # Salvar arquivos de apontamentos
        for arquivo in apontamentos:
            content = await arquivo.read()
            suffix = Path(arquivo.filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                temp_files.append({
                    "path": tmp.name,
                    "name": arquivo.filename,
                    "mime": arquivo.content_type or "application/octet-stream"
                })
        
        try:
            # Analisar estrutura do template
            try:
                wb_template = load_workbook(template_path)
                ws_template = wb_template.active
                
                # Extrair cabeçalhos e estrutura
                headers = []
                for col in range(1, ws_template.max_column + 1):
                    header_value = ws_template.cell(row=1, column=col).value
                    if header_value:
                        headers.append({"coluna": col, "nome": str(header_value)})
                
                # Pegar algumas linhas de exemplo se existirem
                sample_rows = []
                for row in range(2, min(5, ws_template.max_row + 1)):
                    row_data = {}
                    for h in headers:
                        cell_value = ws_template.cell(row=row, column=h["coluna"]).value
                        row_data[h["nome"]] = cell_value
                    if any(row_data.values()):
                        sample_rows.append(row_data)
                
                template_info = {
                    "headers": headers,
                    "header_names": [h["nome"] for h in headers],
                    "sample_rows": sample_rows,
                    "num_colunas": len(headers)
                }
            except Exception as e:
                template_info = {"error": str(e), "headers": [], "header_names": []}
            
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            # Criar exemplo de registro baseado nas colunas do template
            header_names = template_info.get('header_names', [])
            exemplo_registro = {}
            for h in header_names:
                exemplo_registro[h] = "valor_extraido"
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"apontamentos-sci-{uuid.uuid4()}",
                system_message=f"""Você é um especialista em departamento pessoal e folha de pagamento.
Sua tarefa é EXTRAIR DADOS de apontamentos e MAPEAR para as colunas corretas da planilha SCI.

=== COLUNAS DISPONÍVEIS NO TEMPLATE SCI ===
{json.dumps(header_names, ensure_ascii=False, indent=2)}

{f"Exemplo de dados existentes: {json.dumps(template_info.get('sample_rows', [])[:2], ensure_ascii=False)}" if template_info.get('sample_rows') else ""}

=== MAPEAMENTO DE NOMES (MUITO IMPORTANTE!) ===
Os nomes no apontamento podem ser DIFERENTES dos nomes das colunas. Faça o mapeamento inteligente:

EXEMPLOS DE EQUIVALÊNCIAS COMUNS:
- "Atraso" ou "Atrasos" → pode ser "Falta Horas", "FH", "Horas Falta"
- "Hora Extra" ou "HE" ou "H.E." → pode ser "HE 50%", "HE 100%", "Hora Extra"
- "Falta" ou "Faltas" → pode ser "Falta Dias", "FD", "Dias Falta"
- "Adicional Noturno" ou "Ad. Not." → pode ser "AN", "Adic. Noturno"
- "DSR" ou "Descanso" → pode ser "DSR", "Repouso"
- "Comissão" → pode ser "Comissões", "COM"
- Nomes de funcionários podem vir abreviados ou com sobrenome apenas

USE AS COLUNAS DO TEMPLATE - analise qual coluna corresponde a cada evento!

=== SUA TAREFA ===
1. Leia o documento de apontamento
2. Identifique cada COLABORADOR e cada EVENTO
3. MAPEIE cada evento para a coluna CORRETA do template
4. Se um evento NÃO TEM coluna correspondente, liste em "eventos_sem_coluna"

=== FORMATO DE SAÍDA (JSON) ===
{{
    "registros": [
        {json.dumps(exemplo_registro, ensure_ascii=False)}
    ],
    "colaboradores_identificados": 0,
    "eventos_identificados": 0,
    "eventos_sem_coluna": [
        {{
            "evento_original": "Nome do evento no apontamento",
            "colaborador": "Nome do colaborador",
            "valor": "Valor/quantidade encontrado",
            "sugestao_coluna": "Coluna mais próxima do template (se houver)"
        }}
    ],
    "mapeamentos_realizados": [
        {{
            "evento_apontamento": "Nome no apontamento",
            "coluna_template": "Coluna usada no template"
        }}
    ],
    "observacoes": "detalhes sobre a extração"
}}

REGRAS:
- Use EXATAMENTE os nomes das colunas do template nos registros
- Se nao souber mapear um evento, coloque em "eventos_sem_coluna"
- Extraia TODOS os dados, nao pule nenhum colaborador ou evento
- Cada linha = 1 colaborador + 1 evento (se tem 3 eventos, gera 3 linhas)
- Se nao conseguir identificar um campo, deixe como null
- Nao invente dados - extraia apenas o que esta no documento
- Mantenha os nomes das colunas EXATAMENTE como no template"""
            ).with_model("gemini", "gemini-2.0-flash")
            
            # Preparar arquivos de apontamentos para análise
            file_contents = []
            excel_text_contents = []
            
            # Processar cada arquivo de apontamento
            for tf in temp_files:
                suffix = Path(tf["path"]).suffix.lower()
                
                if suffix in ['.jpg', '.jpeg']:
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="image/jpeg"))
                elif suffix == '.png':
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="image/png"))
                elif suffix == '.pdf':
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="application/pdf"))
                elif suffix == '.gif':
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="image/gif"))
                elif suffix in ['.xlsx', '.xls']:
                    # Extrair conteúdo de Excel como texto formatado
                    try:
                        wb_ap = load_workbook(tf["path"])
                        ws_ap = wb_ap.active
                        excel_text = f"\n\n=== DADOS DO ARQUIVO: {tf['name']} ===\n"
                        excel_text += "| " + " | ".join([str(ws_ap.cell(row=1, column=c).value or "") for c in range(1, ws_ap.max_column + 1)]) + " |\n"
                        excel_text += "|" + "---|" * ws_ap.max_column + "\n"
                        for row in range(2, min(500, ws_ap.max_row + 1)):
                            row_data = [str(ws_ap.cell(row=row, column=c).value or "") for c in range(1, ws_ap.max_column + 1)]
                            if any(row_data):  # Só adiciona se tiver dados
                                excel_text += "| " + " | ".join(row_data) + " |\n"
                        excel_text_contents.append(excel_text)
                    except Exception as e:
                        excel_text_contents.append(f"\n[Erro ao ler {tf['name']}: {str(e)}]\n")
                elif suffix == '.txt':
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="text/plain"))
            
            # Montar texto com conteúdo de arquivos Excel
            extra_text = "".join(excel_text_contents)
            
            response = await chat.send_message(UserMessage(
                text=f"""ANALISE O DOCUMENTO DE APONTAMENTO e extraia TODOS os dados para preencher a planilha.

=== COLUNAS DA PLANILHA DE DESTINO ===
{json.dumps(header_names, ensure_ascii=False)}

=== COMPETÊNCIA ===
{competencia or 'Não informada - identifique pelo documento'}

=== DADOS DO DOCUMENTO DE APONTAMENTO ===
{extra_text if extra_text else "(Analise os arquivos de imagem/PDF anexados)"}

=== INSTRUÇÕES ===
1. Leia TODOS os dados do documento de apontamento
2. Identifique CADA funcionário e CADA evento/lançamento
3. Preencha os registros usando os NOMES EXATOS das colunas acima
4. Gere uma linha para cada combinação funcionário + evento
5. Retorne o JSON com os registros preenchidos

ATENÇÃO: Extraia TODOS os dados visíveis no documento. Não deixe de incluir nenhum funcionário ou evento.""",
                file_contents=file_contents if file_contents else None
            ))
            
            # Parse response
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            registros = dados.get("registros", [])
            
            logger.info(f"Registros extraídos: {len(registros)}")
            if registros:
                logger.info(f"Primeiro registro: {registros[0]}")
            
            # USAR O TEMPLATE ORIGINAL como base - preserva toda a estrutura, formatação, estilos
            wb_output = load_workbook(template_path)
            ws_output = wb_output.active
            
            # Criar mapeamento de coluna por nome do cabeçalho (case insensitive e normalizado)
            header_to_col = {}
            col_to_header = {}
            for col in range(1, ws_output.max_column + 1):
                header_value = ws_output.cell(row=1, column=col).value
                if header_value:
                    header_str = str(header_value).strip()
                    header_to_col[header_str] = col
                    header_to_col[header_str.lower()] = col  # Também mapeia lowercase
                    header_to_col[header_str.upper()] = col  # Também mapeia uppercase
                    col_to_header[col] = header_str
            
            logger.info(f"Colunas do template: {list(col_to_header.values())}")
            
            # Limpar dados existentes (exceto cabeçalho) se houver
            for row in range(2, ws_output.max_row + 1):
                for col in range(1, ws_output.max_column + 1):
                    ws_output.cell(row=row, column=col, value=None)
            
            # Escrever dados extraídos
            for row_idx, reg in enumerate(registros, 2):  # Começa na linha 2
                logger.info(f"Escrevendo linha {row_idx}: {reg}")
                
                for key, value in reg.items():
                    if value is None or value == "" or value == "null":
                        continue
                    
                    # Tentar encontrar a coluna correspondente
                    col_idx = None
                    
                    # Primeiro: busca exata
                    if key in header_to_col:
                        col_idx = header_to_col[key]
                    # Segundo: busca case insensitive
                    elif key.lower() in header_to_col:
                        col_idx = header_to_col[key.lower()]
                    elif key.upper() in header_to_col:
                        col_idx = header_to_col[key.upper()]
                    else:
                        # Terceiro: busca parcial (se o nome da coluna contém a key ou vice-versa)
                        for header, col in header_to_col.items():
                            if isinstance(header, str):
                                if key.lower() in header.lower() or header.lower() in key.lower():
                                    col_idx = col
                                    break
                    
                    if col_idx:
                        ws_output.cell(row=row_idx, column=col_idx, value=value)
                        logger.info(f"  -> Coluna {col_idx} ({col_to_header.get(col_idx, '?')}): {value}")
                    else:
                        logger.warning(f"  -> Coluna não encontrada para '{key}': {value}")
            
            # Salvar como bytes - mantendo o formato original
            output = BytesIO()
            wb_output.save(output)
            output.seek(0)
            excel_base64 = base64.b64encode(output.read()).decode('utf-8')
            
            # Preparar preview - TODOS os registros (sem limite)
            preview_dados = registros
            
            # Usar o nome original do template
            original_filename = template_sci.filename
            output_filename = f"preenchido_{original_filename}" if original_filename else f"apontamentos_sci_{competencia or 'atual'}.xlsx"
            
            # Extrair eventos sem coluna e mapeamentos realizados
            eventos_sem_coluna = dados.get("eventos_sem_coluna", [])
            mapeamentos_realizados = dados.get("mapeamentos_realizados", [])
            
            return {
                "success": True,
                "registros_extraidos": len(registros),
                "colaboradores_identificados": dados.get("colaboradores_identificados", len(registros)),
                "eventos_identificados": dados.get("eventos_identificados", len(registros)),
                "mapeamento_colunas": list(col_to_header.values()),
                "eventos_sem_coluna": eventos_sem_coluna,
                "mapeamentos_realizados": mapeamentos_realizados,
                "observacoes": dados.get("observacoes", ""),
                "preview_dados": preview_dados,
                "arquivo_base64": excel_base64,
                "arquivo_nome": output_filename
            }
            
        finally:
            # Limpar arquivos temporários
            if template_path:
                try:
                    os.unlink(template_path)
                except:
                    pass
            for tf in temp_files:
                try:
                    os.unlink(tf["path"])
                except:
                    pass
                    
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao parsear resposta da IA: {str(e)}")
        return {"success": False, "error": "Erro ao processar resposta da IA. Tente novamente."}
    except Exception as e:
        logger.error(f"Erro na conversão de apontamentos SCI: {str(e)}")
        return {"success": False, "error": str(e)}


@api_router.post("/conversao/admissional")
async def converter_admissional(
    arquivos: List[UploadFile] = File(...),
    cliente_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Extrai e valida dados de documentos admissionais usando IA"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    try:
        # Buscar dados da empresa
        cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]}, {"_id": 0})
        empresa_id = cliente.get("codigo_interno", cliente.get("id", "")[:8]) if cliente else ""
        
        temp_files = []
        for arquivo in arquivos:
            content = await arquivo.read()
            suffix = Path(arquivo.filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                temp_files.append({
                    "path": tmp.name,
                    "name": arquivo.filename,
                    "mime": arquivo.content_type or "application/octet-stream"
                })
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"admissional-{uuid.uuid4()}",
                system_message="""Você é um especialista em departamento pessoal e admissões.
                Analise os documentos admissionais enviados (fotos, PDFs, fichas) e extraia TODOS os dados do colaborador.
                
                CAMPOS OBRIGATÓRIOS para eSocial:
                - Nome completo
                - CPF (apenas números)
                - RG (número e órgão emissor)
                - Data de nascimento (DD/MM/AAAA)
                - Sexo (M ou F)
                - Estado civil (solteiro, casado, divorciado, viuvo, separado, uniao_estavel)
                - Nacionalidade
                - Endereço completo (rua, número, complemento, bairro, cidade, estado, CEP)
                - Cargo/função
                - Salário
                - Data de admissão (DD/MM/AAAA)
                - PIS/PASEP
                - CTPS (número e série)
                - Dados bancários (banco, agência, conta, tipo conta)
                - Email
                - Telefone/Celular
                - Nome da mãe
                - Nome do pai
                - Deficiência (se houver)
                
                Retorne APENAS um JSON válido:
                {
                    "colaborador": {
                        "nome_completo": "NOME COMPLETO EM MAIUSCULAS",
                        "cpf": "00000000000",
                        "rg": {"numero": "...", "orgao": "SSP", "uf": "SP", "data_emissao": "DD/MM/AAAA"},
                        "data_nascimento": "DD/MM/AAAA",
                        "sexo": "M ou F",
                        "estado_civil": "solteiro/casado/divorciado/viuvo/separado/uniao_estavel",
                        "nacionalidade": "brasileiro",
                        "naturalidade": {"cidade": "...", "uf": "..."},
                        "nome_mae": "...",
                        "nome_pai": "...",
                        "endereco": {
                            "cep": "00000000",
                            "logradouro_tipo": "Rua/Avenida/etc",
                            "logradouro": "Nome da rua",
                            "numero": "...",
                            "complemento": "...",
                            "bairro": "...",
                            "cidade": "...",
                            "uf": "..."
                        },
                        "telefone": "00000000000",
                        "celular": "00000000000",
                        "email": "...",
                        "cargo": "...",
                        "funcao": "...",
                        "salario": 0.00,
                        "data_admissao": "DD/MM/AAAA",
                        "pis_pasep": "...",
                        "ctps": {"numero": "...", "serie": "...", "uf": "..."},
                        "dados_bancarios": {"banco_codigo": "000", "banco_nome": "...", "agencia": "0000", "conta": "000000", "tipo_conta": "corrente/poupanca"},
                        "escolaridade": "fundamental/medio/superior/pos_graduacao/mestrado/doutorado",
                        "deficiencia": null,
                        "cor_raca": "branca/preta/parda/amarela/indigena"
                    },
                    "campos_encontrados": ["Nome completo", "CPF", ...],
                    "campos_faltantes": ["CTPS", "PIS/PASEP", ...],
                    "observacoes": "observações sobre documentos ilegíveis ou dados inconsistentes"
                }
                
                IMPORTANTE:
                - CPF deve conter apenas números (11 dígitos)
                - CEP deve conter apenas números (8 dígitos)
                - Telefones devem conter apenas números (com DDD)
                - Datas no formato DD/MM/AAAA
                - Se não encontrar algum campo, deixe como null."""
            ).with_model("gemini", "gemini-2.0-flash")
            
            file_contents = [FileContentWithMimeType(file_path=tf["path"], mime_type=tf["mime"]) for tf in temp_files]
            
            response = await chat.send_message(UserMessage(
                text=f"Extraia todos os dados admissionais destes {len(temp_files)} documento(s). Preciso dos dados formatados para importação no sistema de folha de pagamento.",
                file_contents=file_contents
            ))
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            colab = dados.get("colaborador", {})
            
            # Gerar o JSON no formato de importação do sistema
            endereco = colab.get("endereco", {})
            dados_bancarios = colab.get("dados_bancarios", {})
            ctps = colab.get("ctps", {})
            rg = colab.get("rg", {})
            naturalidade = colab.get("naturalidade", {})
            
            # Mapear sexo para código
            sexo_map = {"M": "1", "F": "2", "masculino": "1", "feminino": "2"}
            sexo_codigo = sexo_map.get(colab.get("sexo", "").upper(), None)
            
            # Mapear estado civil para código
            estado_civil_map = {
                "solteiro": "1", "casado": "2", "divorciado": "3", 
                "viuvo": "4", "separado": "5", "uniao_estavel": "6"
            }
            estado_civil_codigo = estado_civil_map.get(colab.get("estado_civil", "").lower(), None)
            
            # Mapear escolaridade para código
            escolaridade_map = {
                "analfabeto": "1", "fundamental_incompleto": "2", "fundamental": "3",
                "medio_incompleto": "4", "medio": "5", "superior_incompleto": "6",
                "superior": "7", "pos_graduacao": "8", "mestrado": "9", "doutorado": "10"
            }
            escolaridade_codigo = escolaridade_map.get(colab.get("escolaridade", "").lower(), None)
            
            # Mapear tipo de conta
            tipo_conta_map = {"corrente": "1", "poupanca": "2", "salario": "3"}
            tipo_conta_codigo = tipo_conta_map.get(dados_bancarios.get("tipo_conta", "").lower(), "1")
            
            # Mapear cor/raça para código
            cor_raca_map = {"branca": "1", "preta": "2", "parda": "3", "amarela": "4", "indigena": "5"}
            cor_raca_codigo = cor_raca_map.get(colab.get("cor_raca", "").lower(), None)
            
            # Converter data para formato ISO (AAAA-MM-DD)
            def converter_data(data_str):
                if not data_str:
                    return None
                try:
                    partes = data_str.split("/")
                    if len(partes) == 3:
                        return f"{partes[2]}-{partes[1]}-{partes[0]}"
                except:
                    pass
                return None
            
            # Extrair DDD do telefone
            def extrair_ddd(telefone):
                if not telefone:
                    return None, None
                tel = telefone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "")
                if len(tel) >= 10:
                    return tel[:2], tel[2:]
                return None, tel
            
            ddd_tel, tel_sem_ddd = extrair_ddd(colab.get("telefone"))
            ddd_cel, cel_sem_ddd = extrair_ddd(colab.get("celular"))
            
            # Gerar JSON no formato COMPLETO do sistema de importação
            json_importacao = {
                # Identificação
                "tipo": None,
                "empresaId": empresa_id,
                "funcionarioContribuinteId": None,
                "vFuncionarioContribuinteId": None,
                
                # Dados Pessoais
                "nome": colab.get("nome_completo"),
                "nomeSocial": colab.get("nome_social"),
                "email": colab.get("email"),
                "sexo": sexo_codigo,
                "estadoCivilId": estado_civil_codigo,
                "nascimentoData": converter_data(colab.get("data_nascimento")),
                "paisNascimentoId": None,
                "nascimentoCidadeId": None,
                "paisNacionalidadeId": "105" if colab.get("nacionalidade", "").lower() in ["brasileiro", "brasileira", "brasil"] else None,
                "grauInstrucaoId": escolaridade_codigo,
                "etniaId": cor_raca_codigo,
                "tipoSanguineoId": None,
                "cabeloCorId": None,
                "olhoCorId": None,
                "altura": None,
                "peso": None,
                "sinaisCorpo": None,
                "fotoNome": None,
                "foto": None,
                
                # Endereço
                "enderecoCep": endereco.get("cep", "").replace("-", "").replace(".", "") if endereco.get("cep") else None,
                "enderecoLogradouroId": None,
                "endereco": endereco.get("logradouro"),
                "enderecoNumero": endereco.get("numero"),
                "enderecoComplemento": endereco.get("complemento"),
                "enderecoBairro": endereco.get("bairro"),
                "enderecoCidadeId": None,
                
                # Contato
                "dddTelefone": ddd_tel,
                "telefone": tel_sem_ddd,
                "dddCelular": ddd_cel,
                "celular": cel_sem_ddd,
                
                # Endereço Estrangeiro
                "estrangeiroEnderecoPaisId": None,
                "estrangeiroEndereco": None,
                "estrangeiroEnderecoNumero": None,
                "estrangeiroComplemento": None,
                "estrangeiroEnderecoBairro": None,
                "estrangeiroEnderecoCidade": None,
                "estrangeiroEnderecoCodPostal": None,
                "estrangeiroDataChegadaBrasil": None,
                "estrangeiroCasadoComBrasileiro": None,
                "Estrangeirocomfilhobrasileiro": None,
                "estrangeiroCondicaoIngresso": None,
                "estrangeiroTipoResidencia": None,
                
                # Deficiência
                "ehDeficiente": None,
                "deficienciaCota": None,
                "deficienciaFisica": None,
                "deficienciaAuditiva": None,
                "deficienciaVisual": None,
                "deficienciaIntelectual": None,
                "deficienciaMental": None,
                "deficienciaReabilitado": None,
                "deficienciaObservacao": colab.get("deficiencia"),
                
                # Filiação
                "maeNome": colab.get("nome_mae"),
                "paiNome": colab.get("nome_pai"),
                "conjugeNome": None,
                "conjugeNascimentoCidadeId": None,
                "conjugeNascimentoData": None,
                
                # Documentos - CPF
                "cpf": colab.get("cpf", "").replace(".", "").replace("-", "") if colab.get("cpf") else None,
                "nomeImagemCPF": None,
                "imagemCPF": None,
                
                # Documentos - RG
                "rg": rg.get("numero"),
                "rgOrgaoEmissor": rg.get("orgao"),
                "rgEmissao": converter_data(rg.get("data_emissao")),
                "rgUf": rg.get("uf"),
                "nomeImagemRG": None,
                "imagemRG": None,
                
                # Documentos - RNE (Estrangeiro)
                "rneNumero": None,
                "rneOrgaoEmissor": None,
                "rneEmissao": None,
                
                # Documentos - Título de Eleitor
                "tituloEleitor": colab.get("titulo_eleitor", {}).get("numero") if isinstance(colab.get("titulo_eleitor"), dict) else colab.get("titulo_eleitor"),
                "tituloEleitorZona": colab.get("titulo_eleitor", {}).get("zona") if isinstance(colab.get("titulo_eleitor"), dict) else None,
                "tituloEleitorSecao": colab.get("titulo_eleitor", {}).get("secao") if isinstance(colab.get("titulo_eleitor"), dict) else None,
                "nomeImagemTituloEleitor": None,
                "imagemTituloEleitor": None,
                
                # Documentos - PIS
                "pisNumero": colab.get("pis_pasep", "").replace(".", "").replace("-", "") if colab.get("pis_pasep") else None,
                "pisEmissao": None,
                "nomeImagemPis": None,
                "imagemPis": None,
                
                # Documentos - Certificado Reservista
                "certificadoReservista": colab.get("certificado_reservista"),
                
                # Documentos - Registro Civil
                "registroCivilId": None,
                "registroCivilTermoMatricula": None,
                "registroCivilCartorio": None,
                "registroCivilLivro": None,
                "registroCivilFolha": None,
                "registroCivilCidadeId": None,
                "registroCivilEmissao": None,
                
                # Documentos - CTPS
                "carteiraTrabalho": ctps.get("numero"),
                "carteiraTrabalhoSerie": ctps.get("serie"),
                "carteiraTrabalhoSerieDigito": None,
                "carteiraTrabalhoEmissao": converter_data(ctps.get("emissao")),
                "carteiraTrabalhoUf": ctps.get("uf"),
                "nomeImagemCTPS": None,
                "imagemCTPS": None,
                
                # Documentos - CNH
                "cnh": colab.get("cnh", {}).get("numero") if isinstance(colab.get("cnh"), dict) else colab.get("cnh"),
                "cnhUf": colab.get("cnh", {}).get("uf") if isinstance(colab.get("cnh"), dict) else None,
                "cnhCategoria": colab.get("cnh", {}).get("categoria") if isinstance(colab.get("cnh"), dict) else None,
                "cnhEmissao": converter_data(colab.get("cnh", {}).get("emissao")) if isinstance(colab.get("cnh"), dict) else None,
                "cnhVencimento": converter_data(colab.get("cnh", {}).get("vencimento")) if isinstance(colab.get("cnh"), dict) else None,
                "cnhPrimeiraHabilitacao": None,
                "nomeImagemCNH": None,
                "imagemCNH": None,
                
                # Documentos - RIC
                "ricNumero": None,
                "ricOrgaoEmissor": None,
                "ricEmissao": None,
                
                # Documentos - OC (Ordem de Classe)
                "ocNumero": None,
                "ocOrgaoEmissor": None,
                "ocEmissao": None,
                "ocValidade": None,
                
                # Dados Admissão
                "admissaoData": converter_data(colab.get("data_admissao")),
                "entradaData": converter_data(colab.get("data_admissao")),
                "cadastroData": None,
                "admissaoTipoId": None,
                "contratoTipoId": None,
                "ocupacaoNatureza": None,
                "cnpjEmpresaAnterior": None,
                "transferenciaOnus": None,
                "transferenciaData": None,
                "adicionalTempoServicoInicio": None,
                "aposentadoriaData": None,
                "desligamentoData": None,
                "baixaData": None,
                "matriculaAnterior": None,
                "dataReintegracao": None,
                
                # eSocial
                "categoriaeSocialId": None,
                "fgtsOcorrenciaId": None,
                "fgtsConta": None,
                "regimePrevidenciario": None,
                "regimeTrabalhistaId": None,
                
                # Sindicato
                "sindicatoId": None,
                "sindicalizado": None,
                
                # Classificação
                "classeId": None,
                "funcionario": None,
                "contribuinte": None,
                "centroCustoId": None,
                "departamentoId": None,
                
                # Registro
                "cartaoPonto": None,
                "fichaRegistro": None,
                "livro": None,
                "folha": None,
                
                # Jornada de Trabalho
                "regimeJornadaTrabalhoId": None,
                "tipoJornada": None,
                "tipoJornadaDescricao": None,
                "horarioNoturno": None,
                "tipoEscalaId": None,
                "descansoSemanalId": None,
                "quadroHorarioId": None,
                
                # Cargo
                "cargoId": None,
                
                # Remuneração
                "formaPagamento": None,
                "funcionarioTipoId": None,
                "salarioInicial": colab.get("salario"),
                "remuneracao": colab.get("salario"),
                "percentualComissao": None,
                "horaMensal": None,
                "horaSemanal": None,
                "horaDiaria": None,
                
                # Adicionais
                "insalubridadeAdicional": None,
                "insalubridadeIncidenciaId": None,
                "periculosidadeAdicional": None,
                "periculosidadeIncidenciaId": None,
                "noturnoAdicional": None,
                "noturnoIncidenciaId": None,
                "valorPrevidenciaPrivada": None,
                "valorPrevidenciaPrivada13": None,
                
                # Experiência
                "prazoExperiencia": None,
                "prazoExperienciaFim": None,
                "prazoExperienciaProrrogacao": None,
                "prazoExperienciaProrrogacaoFim": None,
                
                # Dados Bancários
                "bancoId": dados_bancarios.get("banco_codigo"),
                "bancoContaAgencia": dados_bancarios.get("agencia"),
                "bancoConta": dados_bancarios.get("conta"),
                "bancoContaDigito": dados_bancarios.get("digito"),
                "bancoContaTipoId": tipo_conta_codigo,
                "Vbancomodopagamento": None,
                "cartaoSalario": None,
                
                # Benefícios
                "recebeValeRefeicao": None,
                "cartaoVR": None,
                "recebeValeAlimentacao": None,
                "cartaoVA": None,
                "recebeValeTransporte": None,
                "cartaoVT": None,
                "percentualAdiantamento": None,
                "contribuicaoSindical": None,
                "recebeAdiantamento": None,
                "regimeTempoParcial": None,
                "beneficioDesemprego": None,
                "descSimpIRRF": None,
                
                # Outros
                "observacao": colab.get("observacoes"),
                "numeroRecibo": None,
                "dataIntegracao": None,
                "qualificacaoStatus": None,
                "qualificacaoMensagem": None,
                "qualificacaoOrientacao": None
            }
            
            return {
                "success": True,
                "colaborador": colab,
                "colaborador_nome": colab.get("nome_completo", "Dados Extraídos"),
                "campos_encontrados": dados.get("campos_encontrados", []),
                "campos_faltantes": dados.get("campos_faltantes", []),
                "observacoes": dados.get("observacoes", ""),
                "json_importacao": json_importacao,
                "empresa_id": empresa_id
            }
            
        finally:
            for tf in temp_files:
                try:
                    os.unlink(tf["path"])
                except:
                    pass
                    
    except Exception as e:
        logger.error(f"Erro na conversão admissional: {str(e)}")
        return {"success": False, "error": str(e), "campos_faltantes": ["Erro no processamento"]}


@api_router.post("/validacao/rescisao")
async def validar_rescisao(
    cliente_id: str = Form(...),
    termo_rescisao: UploadFile = File(...),
    convencao: UploadFile = File(None),
    extrato_fgts: UploadFile = File(None),
    apoio: List[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Valida cálculos de rescisão usando IA"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    try:
        temp_files = []
        
        # Termo de rescisão (obrigatório)
        content = await termo_rescisao.read()
        suffix = Path(termo_rescisao.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            temp_files.append({"path": tmp.name, "mime": termo_rescisao.content_type or "application/pdf", "tipo": "termo"})
        
        # Convenção (opcional)
        if convencao:
            content = await convencao.read()
            suffix = Path(convencao.filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                temp_files.append({"path": tmp.name, "mime": convencao.content_type or "application/pdf", "tipo": "convencao"})
        
        # Extrato FGTS (opcional)
        if extrato_fgts:
            content = await extrato_fgts.read()
            suffix = Path(extrato_fgts.filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                temp_files.append({"path": tmp.name, "mime": extrato_fgts.content_type or "application/pdf", "tipo": "fgts"})
        
        # Apoio (opcional)
        if apoio:
            for ap in apoio:
                content = await ap.read()
                suffix = Path(ap.filename).suffix
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(content)
                    temp_files.append({"path": tmp.name, "mime": ap.content_type or "application/octet-stream", "tipo": "apoio"})
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"rescisao-{uuid.uuid4()}",
                system_message="""Você é um especialista em cálculos trabalhistas e rescisões contratuais.
                Analise os documentos da rescisão e VALIDE se os cálculos estão corretos.
                
                ITENS QUE DEVEM SER VERIFICADOS:
                1. Saldo de salário (dias trabalhados no mês)
                2. Aviso prévio (indenizado ou trabalhado, proporcionalidade)
                3. Férias vencidas + 1/3 constitucional
                4. Férias proporcionais + 1/3 constitucional
                5. 13º salário proporcional
                6. Multa 40% do FGTS (se aplicável)
                7. FGTS sobre verbas rescisórias
                8. Descontos legais (INSS, IRRF, adiantamentos)
                9. Valor líquido final
                
                TIPOS DE RESCISÃO:
                - Sem justa causa: aviso prévio + multa 40% FGTS
                - Pedido de demissão: sem aviso indenizado, sem multa FGTS
                - Justa causa: só saldo de salário e férias vencidas
                - Acordo mútuo (reforma trabalhista): 50% aviso + 20% multa FGTS
                
                Retorne APENAS um JSON válido:
                {
                    "colaborador": "Nome do colaborador",
                    "resumo": {
                        "data_admissao": "DD/MM/AAAA",
                        "data_demissao": "DD/MM/AAAA",
                        "tipo_rescisao": "Sem justa causa / Pedido de demissão / etc",
                        "salario_base": 0.00,
                        "valor_bruto": 0.00,
                        "valor_descontos": 0.00,
                        "valor_liquido": "0.000,00"
                    },
                    "itens_corretos": ["Saldo de salário", "Aviso prévio", ...],
                    "itens_divergentes": ["Multa 40% FGTS", ...],
                    "divergencias": [
                        {
                            "item": "Multa 40% FGTS",
                            "valor_informado": "R$ 1.200,00",
                            "valor_esperado": "R$ 1.450,00",
                            "observacao": "Cálculo deveria considerar média de horas extras"
                        }
                    ],
                    "observacoes": "Observações gerais sobre a rescisão"
                }"""
            ).with_model("gemini", "gemini-2.0-flash")
            
            file_contents = [FileContentWithMimeType(file_path=tf["path"], mime_type=tf["mime"]) for tf in temp_files]
            
            descricao_docs = []
            for tf in temp_files:
                descricao_docs.append(f"- {tf['tipo'].upper()}")
            
            response = await chat.send_message(UserMessage(
                text=f"Analise e VALIDE esta rescisão. Documentos enviados:\n" + "\n".join(descricao_docs) + "\n\nVerifique todos os cálculos e aponte qualquer divergência.",
                file_contents=file_contents
            ))
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            
            return {
                "success": True,
                "colaborador": dados.get("colaborador", ""),
                "resumo": dados.get("resumo", {}),
                "itens_corretos": dados.get("itens_corretos", []),
                "itens_divergentes": dados.get("itens_divergentes", []),
                "divergencias": dados.get("divergencias", []),
                "observacoes": dados.get("observacoes", "")
            }
            
        finally:
            for tf in temp_files:
                try:
                    os.unlink(tf["path"])
                except:
                    pass
                    
    except Exception as e:
        logger.error(f"Erro na validação de rescisão: {str(e)}")
        return {"success": False, "error": str(e), "divergencias": [{"item": "Erro", "valor_informado": str(e), "valor_esperado": "-"}]}


# ==================== VALIDAÇÃO DE RESCISÃO - ETAPAS ====================

@api_router.post("/validacao/rescisao/etapa1")
async def validar_rescisao_etapa1(
    cliente_id: str = Form(...),
    termo_rescisao: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Etapa 1: Analisa o termo de rescisão e extrai dados do colaborador"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    try:
        content = await termo_rescisao.read()
        suffix = Path(termo_rescisao.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"rescisao-etapa1-{uuid.uuid4()}",
                system_message="""Voce e um especialista em departamento pessoal e rescisoes trabalhistas no Brasil.
Analise o termo de rescisao (TRCT) e extraia TODOS os dados, incluindo TODAS as rubricas detalhadas.

Retorne APENAS um JSON valido:
{
    "colaborador": "Nome completo",
    "cpf": "CPF",
    "cargo": "Cargo",
    "resumo": {
        "colaborador": "Nome",
        "data_admissao": "DD/MM/AAAA",
        "data_demissao": "DD/MM/AAAA",
        "tipo_rescisao": "Tipo",
        "salario_base": 0.00,
        "dias_trabalhados": 0,
        "aviso_previo_tipo": "Indenizado/Trabalhado",
        "aviso_previo_dias": 0
    },
    "rubricas_proventos": [
        {"codigo": "50", "descricao": "Saldo de 20 dias", "referencia": "20 dias", "valor": 1873.81},
        {"codigo": "55", "descricao": "Adic. Noturno", "referencia": "5:36 horas", "valor": 10.22},
        {"codigo": "56.2", "descricao": "Hs. Extras Not", "referencia": "5,36 horas a 50%", "valor": 92.46},
        {"codigo": "50.1", "descricao": "Horas Extras", "referencia": "357,25 horas a 50%", "valor": 7668.60}
    ],
    "rubricas_descontos": [
        {"codigo": "115.14", "descricao": "Faltas nao justificadas", "referencia": "horas 08:27", "valor": 77.51},
        {"codigo": "115.5", "descricao": "Faltas nao justificadas", "referencia": "dias 4", "valor": 267.69},
        {"codigo": "112.1", "descricao": "Previdencia Social", "referencia": "", "valor": 988.07}
    ],
    "totais": {
        "total_bruto": 0.00,
        "total_descontos": 0.00,
        "valor_liquido": "0,00"
    },
    "verbas_rescisorias": {
        "saldo_salario": 0.00,
        "horas_extras": 0.00,
        "adicional_noturno": 0.00,
        "ferias_vencidas": 0.00,
        "ferias_proporcionais": 0.00,
        "terco_ferias": 0.00,
        "decimo_terceiro_proporcional": 0.00,
        "aviso_previo_indenizado": 0.00,
        "multa_fgts_40": 0.00
    },
    "descontos": {
        "faltas_dias": 0.00,
        "faltas_horas": 0.00,
        "atrasos": 0.00,
        "inss": 0.00,
        "irrf": 0.00,
        "outros_descontos": 0.00
    },
    "observacoes": ""
}

MUITO IMPORTANTE:
- Extraia TODAS as rubricas de proventos listadas (codigo, descricao, referencia, valor)
- Extraia TODAS as rubricas de descontos listadas (codigo, descricao, referencia, valor)
- A referencia pode conter horas, dias, percentual, etc.
- Valores sempre como numeros decimais
- Inclua horas extras, adicional noturno, faltas, atrasos, DSR, etc."""
            ).with_model("gemini", "gemini-2.0-flash")
            
            mime_type = termo_rescisao.content_type or "application/pdf"
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text="Analise este termo de rescisao (TRCT) e extraia TODOS os dados. IMPORTANTE: Extraia TODAS as rubricas de proventos e descontos com codigo, descricao, referencia e valor.",
                file_contents=[file_content]
            ))
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            
            return {
                "success": True,
                "etapa": 1,
                "colaborador": dados.get("colaborador", ""),
                "cpf": dados.get("cpf", ""),
                "cargo": dados.get("cargo", ""),
                "resumo": dados.get("resumo", {}),
                "verbas_rescisorias": dados.get("verbas_rescisorias", {}),
                "descontos": dados.get("descontos", {}),
                "totais": dados.get("totais", {}),
                "rubricas_proventos": dados.get("rubricas_proventos", []),
                "rubricas_descontos": dados.get("rubricas_descontos", []),
                "itens_validados": dados.get("itens_validados", []),
                "alertas": dados.get("alertas", []),
                "divergencias": [],
                "observacoes": dados.get("observacoes", "")
            }
            
        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Erro na etapa 1 (termo): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/validacao/rescisao/etapa2")
async def validar_rescisao_etapa2(
    cliente_id: str = Form(...),
    termo_data: str = Form(...),
    apoio: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Etapa 2: Valida apontamentos de apoio contra o termo de rescisão"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    from openpyxl import load_workbook
    
    try:
        termo_info = json.loads(termo_data)
        temp_files = []
        excel_contents = []
        
        for ap in apoio:
            content = await ap.read()
            suffix = Path(ap.filename).suffix.lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                temp_files.append({"path": tmp.name, "suffix": suffix, "name": ap.filename})
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            # Extrair TODOS os dados do termo para comparação
            resumo = termo_info.get('resumo', {})
            verbas = termo_info.get('verbas_rescisorias', {})
            descontos = termo_info.get('descontos', {})
            totais = termo_info.get('totais', {})
            rubricas_proventos = termo_info.get('rubricas_proventos', [])
            rubricas_descontos = termo_info.get('rubricas_descontos', [])
            
            # Formatar rubricas para o prompt
            proventos_texto = "\n".join([f"  - {r.get('codigo', '')} {r.get('descricao', '')}: {r.get('referencia', '')} = R$ {r.get('valor', 0)}" for r in rubricas_proventos]) if rubricas_proventos else "Nenhuma rubrica detalhada extraida"
            descontos_texto = "\n".join([f"  - {r.get('codigo', '')} {r.get('descricao', '')}: {r.get('referencia', '')} = R$ {r.get('valor', 0)}" for r in rubricas_descontos]) if rubricas_descontos else "Nenhuma rubrica detalhada extraida"
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"rescisao-etapa2-{uuid.uuid4()}",
                system_message=f"""Voce e um analista de departamento pessoal validando uma rescisao.

=== DADOS EXTRAIDOS DO TERMO DE RESCISAO (TRCT) ===
Colaborador: {termo_info.get('colaborador', 'N/A')}
Admissao: {resumo.get('data_admissao', 'N/A')} | Demissao: {resumo.get('data_demissao', 'N/A')}
Tipo: {resumo.get('tipo_rescisao', 'N/A')}
Salario Base: R$ {resumo.get('salario_base', 0)}

=== RUBRICAS DE PROVENTOS DO TERMO ===
{proventos_texto}

=== RUBRICAS DE DESCONTOS DO TERMO ===
{descontos_texto}

=== TOTAIS ===
Bruto: R$ {totais.get('total_bruto', 0)} | Liquido: R$ {totais.get('valor_liquido', 'N/A')}

=== SUA TAREFA ===
Analise o ARQUIVO DE APOIO e compare com as RUBRICAS DO TERMO listadas acima.

1. EXTRAIA do apoio: horas extras, faltas, atrasos, adicionais, comissoes, DSR, etc.

2. COMPARE cada item do apoio com as RUBRICAS DO TERMO:
   - Se o apoio mostra "HE 5:23" e o termo tem rubrica "Hs. Extras 5,36 horas" = VALIDADO (valores proximos)
   - Se o apoio mostra "Adicional Noturno 5:36" e o termo tem "Adic. Noturno 5:36 horas" = VALIDADO
   - Se o apoio mostra "Faltas 5 dias" e o termo tem "Faltas nao justificadas dias 4" = DIVERGENCIA (valores diferentes)
   - Se o apoio mostra "Atrasos 8:27" e o termo tem "Faltas nao justificadas horas 08:27" = VALIDADO

3. REGRAS:
   - IGNORE impostos (INSS, IRRF) - nao precisa validar
   - Use as RUBRICAS DETALHADAS do termo para comparar (codigo, descricao, referencia)
   - Valores aproximados (diferencas pequenas por arredondamento) = VALIDADO
   - Valores muito diferentes = DIVERGENCIA
   - Se achou no apoio E achou rubrica correspondente no termo = VALIDADO

Retorne APENAS JSON:
{{
    "dados_encontrados_no_apoio": [
        {{"tipo": "Hora Extra 50%", "referencia": "5:23", "valor": ""}},
        {{"tipo": "Adicional Noturno", "referencia": "5:36", "valor": ""}}
    ],
    "itens_validados": ["HE 50% - apoio 5:23 / termo 5,36h", "Adic. Noturno - apoio 5:36 / termo 5:36h"],
    "divergencias": [
        {{
            "item": "Faltas dias",
            "valor_no_apoio": "5 dias",
            "valor_no_termo": "4 dias (rubrica 115.5)",
            "observacao": "Diferenca de 1 dia"
        }}
    ],
    "alertas": [],
    "observacoes": "Resumo"
}}"""
            ).with_model("gemini", "gemini-2.0-flash")
            
            # Processar arquivos - extrair Excel como texto, enviar PDF/imagens normalmente
            file_contents = []
            
            for tf in temp_files:
                suffix = tf["suffix"]
                
                if suffix in ['.xlsx', '.xls']:
                    # Extrair conteúdo do Excel como texto formatado
                    try:
                        wb = load_workbook(tf["path"])
                        ws = wb.active
                        excel_text = f"\n=== DADOS DO ARQUIVO: {tf['name']} ===\n"
                        # Pegar cabeçalhos
                        headers = [str(ws.cell(row=1, column=c).value or "") for c in range(1, min(20, ws.max_column + 1))]
                        excel_text += "| " + " | ".join(headers) + " |\n"
                        excel_text += "|" + "---|" * len(headers) + "\n"
                        # Pegar dados
                        for row in range(2, min(100, ws.max_row + 1)):
                            row_data = [str(ws.cell(row=row, column=c).value or "") for c in range(1, min(20, ws.max_column + 1))]
                            if any(row_data):
                                excel_text += "| " + " | ".join(row_data) + " |\n"
                        excel_contents.append(excel_text)
                    except Exception as e:
                        excel_contents.append(f"\n=== Erro ao ler {tf['name']}: {str(e)} ===\n")
                elif suffix in ['.pdf']:
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="application/pdf"))
                elif suffix in ['.jpg', '.jpeg']:
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="image/jpeg"))
                elif suffix in ['.png']:
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="image/png"))
                elif suffix in ['.txt']:
                    file_contents.append(FileContentWithMimeType(file_path=tf["path"], mime_type="text/plain"))
            
            # Montar prompt com conteúdo de arquivos Excel
            extra_text = "".join(excel_contents)
            
            response = await chat.send_message(UserMessage(
                text=f"""Analise o ARQUIVO DE APOIO abaixo e compare com os dados do TERMO.

=== ARQUIVO DE APOIO ===
{extra_text if extra_text else "(Analise o arquivo anexado - imagem/PDF)"}

INSTRUÇÕES:
1. Liste os dados que você encontrou no apoio (HE, faltas, adicionais, etc.)
2. Compare cada item com os dados do TERMO que informei no contexto
3. IGNORE impostos (INSS, IRRF) - não precisa validar
4. Aponte divergência APENAS se o valor do apoio for DIFERENTE do termo
5. Se encontrar HE/faltas/adicionais no apoio, verifique se há valor correspondente no termo""",
                file_contents=file_contents if file_contents else None
            ))
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            
            # Normalizar divergencias para o formato esperado pelo frontend
            divergencias = []
            for div in dados.get("divergencias", []):
                divergencias.append({
                    "item": div.get("item", ""),
                    "valor_informado": div.get("valor_no_termo", div.get("valor_informado", "")),
                    "valor_esperado": div.get("valor_no_apoio", div.get("valor_esperado", "")),
                    "observacao": div.get("observacao", "")
                })
            
            return {
                "success": True,
                "etapa": 2,
                "dados_encontrados_no_apoio": dados.get("dados_encontrados_no_apoio", []),
                "itens_validados": dados.get("itens_validados", []),
                "divergencias": divergencias,
                "alertas": dados.get("alertas", []),
                "observacoes": dados.get("observacoes", "")
            }
            
        finally:
            for tf in temp_files:
                try:
                    os.unlink(tf["path"])
                except:
                    pass
                    
    except Exception as e:
        logger.error(f"Erro na etapa 2 (apoio): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/validacao/rescisao/etapa3")
async def validar_rescisao_etapa3(
    cliente_id: str = Form(...),
    termo_data: str = Form(...),
    convencao: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Etapa 3: Valida se a rescisão atende aos termos da convenção coletiva"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    try:
        termo_info = json.loads(termo_data)
        
        content = await convencao.read()
        suffix = Path(convencao.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"rescisao-etapa3-{uuid.uuid4()}",
                system_message=f"""Você é um especialista em convenções coletivas e direito trabalhista.
                
                DADOS DO TERMO DE RESCISÃO:
                - Colaborador: {termo_info.get('colaborador', 'N/A')}
                - Data Admissão: {termo_info.get('resumo', {}).get('data_admissao', 'N/A')}
                - Data Demissão: {termo_info.get('resumo', {}).get('data_demissao', 'N/A')}
                - Tipo Rescisão: {termo_info.get('resumo', {}).get('tipo_rescisao', 'N/A')}
                - Salário Base: {termo_info.get('resumo', {}).get('salario_base', 'N/A')}
                - Verbas: {json.dumps(termo_info.get('verbas_rescisorias', {}), ensure_ascii=False)}
                
                Analise a CONVENÇÃO COLETIVA e valide:
                1. Se existe estabilidade provisória que impediria a demissão
                2. Se o aviso prévio adicional por tempo de serviço foi aplicado
                3. Se existe multa adicional prevista em convenção
                4. Se existe piso salarial que deve ser considerado
                5. Se existem benefícios que devem ser proporcionalizados
                6. Se a rescisão foi feita em período de garantia de emprego
                
                Retorne APENAS um JSON válido:
                {{
                    "itens_validados": ["Aviso prévio adicional", "Estabilidade", ...],
                    "divergencias": [
                        {{
                            "item": "Nome do item previsto na CCT",
                            "valor_informado": "Como está no termo",
                            "valor_esperado": "Como deveria ser pela CCT",
                            "observacao": "Cláusula e explicação"
                        }}
                    ],
                    "alertas": ["Alertas sobre a convenção"],
                    "clausulas_aplicaveis": ["Lista de cláusulas relevantes"],
                    "observacoes": "Observações gerais"
                }}"""
            ).with_model("gemini", "gemini-2.0-flash")
            
            mime_type = convencao.content_type or "application/pdf"
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text=f"Analise esta convenção coletiva e verifique se a rescisão atende a todos os termos e direitos previstos. Identifique possíveis divergências ou direitos não pagos.",
                file_contents=[file_content]
            ))
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            
            return {
                "success": True,
                "etapa": 3,
                "itens_validados": dados.get("itens_validados", []),
                "divergencias": dados.get("divergencias", []),
                "alertas": dados.get("alertas", []),
                "clausulas_aplicaveis": dados.get("clausulas_aplicaveis", []),
                "observacoes": dados.get("observacoes", "")
            }
            
        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass
                    
    except Exception as e:
        logger.error(f"Erro na etapa 3 (convenção): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/validacao/rescisao/etapa4")
async def validar_rescisao_etapa4(
    cliente_id: str = Form(...),
    termo_data: str = Form(...),
    extrato_fgts: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Etapa 4: Valida o extrato FGTS e a multa rescisória"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    try:
        termo_info = json.loads(termo_data)
        
        content = await extrato_fgts.read()
        suffix = Path(extrato_fgts.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            # Determinar tipo de rescisão e percentual de multa
            tipo_rescisao = termo_info.get('resumo', {}).get('tipo_rescisao', '').lower()
            percentual_multa = "40%"
            if "acordo" in tipo_rescisao:
                percentual_multa = "20%"
            elif "justa causa" in tipo_rescisao or "pedido" in tipo_rescisao:
                percentual_multa = "0% (não aplicável)"
            
            multa_no_termo = termo_info.get('verbas_rescisorias', {}).get('multa_fgts_40', 0)
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"rescisao-etapa4-{uuid.uuid4()}",
                system_message=f"""Você é um especialista em FGTS e cálculos rescisórios.
                
                DADOS DO TERMO DE RESCISÃO:
                - Colaborador: {termo_info.get('colaborador', 'N/A')}
                - Tipo Rescisão: {termo_info.get('resumo', {}).get('tipo_rescisao', 'N/A')}
                - Multa FGTS no termo: R$ {multa_no_termo}
                - Percentual esperado de multa: {percentual_multa}
                
                Analise o EXTRATO DE FGTS ou relatório de fins rescisórios e valide:
                1. Se o saldo de FGTS está correto
                2. Se a multa ({percentual_multa}) foi calculada corretamente
                3. Se os depósitos mensais estão regulares
                4. Se há depósitos faltantes
                5. Se o valor da multa no termo bate com o calculado
                
                CÁLCULO DA MULTA:
                - Sem justa causa: 40% sobre saldo FGTS
                - Acordo mútuo (reforma trabalhista): 20% sobre saldo FGTS
                - Justa causa ou pedido de demissão: não há multa
                
                Retorne APENAS um JSON válido:
                {{
                    "saldo_fgts_extrato": 0.00,
                    "saldo_fgts_calculado": 0.00,
                    "multa_esperada": 0.00,
                    "multa_no_termo": {multa_no_termo},
                    "diferenca_multa": 0.00,
                    "itens_validados": ["Saldo FGTS", "Multa 40%", ...],
                    "divergencias": [
                        {{
                            "item": "Multa FGTS",
                            "valor_informado": "R$ X no termo",
                            "valor_esperado": "R$ Y calculado",
                            "observacao": "Diferença de R$ Z"
                        }}
                    ],
                    "alertas": ["Alertas sobre o FGTS"],
                    "depositos_faltantes": ["Lista de competências sem depósito, se houver"],
                    "observacoes": "Observações gerais"
                }}"""
            ).with_model("gemini", "gemini-2.0-flash")
            
            mime_type = extrato_fgts.content_type or "application/pdf"
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text=f"Analise este extrato de FGTS ou relatório de fins rescisórios. Calcule se a multa de {percentual_multa} está correta e identifique possíveis divergências.",
                file_contents=[file_content]
            ))
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            dados = json.loads(response_text.strip())
            
            return {
                "success": True,
                "etapa": 4,
                "resumo": {
                    "saldo_fgts_extrato": dados.get("saldo_fgts_extrato", 0),
                    "saldo_fgts_calculado": dados.get("saldo_fgts_calculado", 0),
                    "multa_esperada": dados.get("multa_esperada", 0),
                    "multa_no_termo": dados.get("multa_no_termo", multa_no_termo),
                    "diferenca_multa": dados.get("diferenca_multa", 0)
                },
                "itens_validados": dados.get("itens_validados", []),
                "divergencias": dados.get("divergencias", []),
                "alertas": dados.get("alertas", []),
                "depositos_faltantes": dados.get("depositos_faltantes", []),
                "observacoes": dados.get("observacoes", "")
            }
            
        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass
                    
    except Exception as e:
        logger.error(f"Erro na etapa 4 (FGTS): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DASHBOARD ====================

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    cliente_id: Optional[str] = None,
    competencia: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    
    # Parse competencia (MM/YYYY)
    mes_ref = None
    ano_ref = None
    if competencia:
        try:
            parts = competencia.split('/')
            mes_ref = parts[0]
            ano_ref = int(parts[1])
        except:
            pass
    
    # If cliente_id is specified, filter by that cliente
    if cliente_id:
        # Verify cliente belongs to user
        cliente = await db.clientes.find_one({"id": cliente_id, "user_id": user_id})
        if not cliente:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        cliente_ids = [cliente_id]
        total_clientes = 1
    else:
        total_clientes = await db.clientes.count_documents({"user_id": user_id})
        clientes = await db.clientes.find({"user_id": user_id}, {"id": 1}).to_list(1000)
        cliente_ids = [c["id"] for c in clientes]
    
    total_colaboradores = await db.colaboradores.count_documents({"cliente_id": {"$in": cliente_ids}})
    
    # Build query for pending items
    dissidio_query = {"user_id": user_id, "status": "pendente"}
    validacao_query = {"user_id": user_id, "status": "pendente"}
    admissao_query = {"user_id": user_id, "status": "pendente"}
    
    if cliente_id:
        dissidio_query["cliente_id"] = cliente_id
        validacao_query["cliente_id"] = cliente_id
        admissao_query["cliente_id"] = cliente_id
    
    if mes_ref and ano_ref:
        validacao_query["mes_referencia"] = mes_ref
        validacao_query["ano_referencia"] = ano_ref
    
    dissidios_pendentes = await db.dissidios.count_documents(dissidio_query)
    admissoes_pendentes = await db.admissoes.count_documents(admissao_query)
    validacoes_pendentes = await db.validacoes.count_documents(validacao_query)
    
    # Get recent activities for selected cliente/competencia
    tarefas = []
    
    activity_dissidio_query = {"user_id": user_id}
    activity_validacao_query = {"user_id": user_id}
    activity_admissao_query = {"user_id": user_id}
    
    if cliente_id:
        activity_dissidio_query["cliente_id"] = cliente_id
        activity_validacao_query["cliente_id"] = cliente_id
        activity_admissao_query["cliente_id"] = cliente_id
    
    recent_dissidios = await db.dissidios.find(
        activity_dissidio_query,
        {"_id": 0, "id": 1, "sindicato": 1, "status": 1, "created_at": 1, "cliente_id": 1}
    ).sort("created_at", -1).to_list(5)
    for d in recent_dissidios:
        tarefas.append({"tipo": "dissidio", "titulo": f"Dissídio - {d.get('sindicato', 'N/A')}", **d})
    
    recent_admissoes = await db.admissoes.find(
        activity_admissao_query,
        {"_id": 0, "id": 1, "status": 1, "created_at": 1, "dados_extraidos": 1, "cliente_id": 1}
    ).sort("created_at", -1).to_list(5)
    for a in recent_admissoes:
        nome = a.get("dados_extraidos", {}).get("nome", "Novo Funcionário")
        tarefas.append({"tipo": "admissao", "titulo": f"Admissão - {nome}", "id": a["id"], "status": a["status"], "created_at": a["created_at"]})
    
    recent_validacoes = await db.validacoes.find(
        activity_validacao_query,
        {"_id": 0, "id": 1, "status": 1, "created_at": 1, "mes_referencia": 1, "ano_referencia": 1, "cliente_id": 1, "cliente_nome": 1}
    ).sort("created_at", -1).to_list(5)
    for v in recent_validacoes:
        tarefas.append({"tipo": "validacao", "titulo": f"Validação {v.get('mes_referencia', '')}/{v.get('ano_referencia', '')} - {v.get('cliente_nome', '')}", "id": v["id"], "status": v["status"], "created_at": v["created_at"]})
    
    # Sort by date
    tarefas.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return DashboardStats(
        total_clientes=total_clientes,
        total_colaboradores=total_colaboradores,
        dissidios_pendentes=dissidios_pendentes,
        admissoes_pendentes=admissoes_pendentes,
        validacoes_pendentes=validacoes_pendentes,
        tarefas_recentes=tarefas[:10]
    )


@api_router.get("/dashboard/completo")
async def get_dashboard_completo(current_user: dict = Depends(get_current_user)):
    """Dashboard completo com métricas úteis para o usuário"""
    user_id = current_user["id"]
    
    # Total de empresas do usuário
    total_clientes = await db.clientes.count_documents({"user_id": user_id})
    
    # Lista de IDs das empresas
    clientes = await db.clientes.find({"user_id": user_id}).to_list(1000)
    cliente_ids = [c["id"] for c in clientes]
    
    # Total de colaboradores
    total_colaboradores = await db.colaboradores.count_documents({"cliente_id": {"$in": cliente_ids}})
    
    # Admissões pendentes
    admissoes_pendentes = await db.admissoes.count_documents({"user_id": user_id, "status": "pendente"})
    
    # Lista de admissões pendentes
    admissoes_lista = []
    admissoes_docs = await db.admissoes.find(
        {"user_id": user_id, "status": "pendente"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    for adm in admissoes_docs:
        cliente = next((c for c in clientes if c["id"] == adm.get("cliente_id")), None)
        admissoes_lista.append({
            "nome": adm.get("nome", "N/A"),
            "empresa": cliente.get("nome_fantasia") or cliente.get("razao_social", "N/A") if cliente else "N/A",
            "data_admissao": adm.get("data_admissao", "N/A"),
            "status": adm.get("status", "pendente")
        })
    
    # Próximos dissídios (baseado na data-base das empresas)
    proximos_dissidios = []
    hoje = datetime.now()
    
    for cliente in clientes:
        # Verificar se tem data_base ou sindicato
        data_base_str = cliente.get("data_base_dissidio") or cliente.get("data_base")
        sindicato = cliente.get("sindicato", "")
        
        if data_base_str:
            try:
                # Tentar parsear diferentes formatos
                if "/" in data_base_str:
                    parts = data_base_str.split("/")
                    if len(parts) == 2:
                        mes, ano = int(parts[0]), int(parts[1])
                    else:
                        mes, ano = int(parts[1]), int(parts[2])
                else:
                    mes = int(data_base_str[:2]) if len(data_base_str) >= 2 else 1
                    ano = hoje.year
                
                # Calcular próxima data-base
                ano_dissidio = hoje.year if mes >= hoje.month else hoje.year + 1
                data_dissidio = datetime(ano_dissidio, mes, 1)
                dias_restantes = (data_dissidio - hoje).days
                
                if 0 <= dias_restantes <= 180:  # Próximos 6 meses
                    proximos_dissidios.append({
                        "empresa": cliente.get("nome_fantasia") or cliente.get("razao_social"),
                        "sindicato": sindicato,
                        "data_base": f"{mes:02d}/{ano_dissidio}",
                        "dias_restantes": dias_restantes
                    })
            except:
                pass
    
    # Ordenar por dias restantes
    proximos_dissidios.sort(key=lambda x: x["dias_restantes"])
    
    # Empresas por segmento/tipo de atividade
    empresas_por_segmento = {}
    for cliente in clientes:
        segmento = cliente.get("tipo_atividade") or cliente.get("cnae_descricao") or "Não informado"
        # Simplificar o nome do segmento
        if len(segmento) > 30:
            segmento = segmento[:30] + "..."
        empresas_por_segmento[segmento] = empresas_por_segmento.get(segmento, 0) + 1
    
    segmentos_lista = [
        {"segmento": k, "quantidade": v}
        for k, v in sorted(empresas_por_segmento.items(), key=lambda x: -x[1])
    ][:6]  # Top 6 segmentos
    
    # Evolução mensal do ano atual
    ano_atual = hoje.year
    meses_abrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    evolucao_mensal = []
    
    for mes_num in range(1, hoje.month + 1):
        # Contar empresas criadas até este mês
        data_inicio = datetime(ano_atual, 1, 1)
        data_fim = datetime(ano_atual, mes_num + 1, 1) if mes_num < 12 else datetime(ano_atual + 1, 1, 1)
        
        # Empresas existentes até o final do mês
        empresas_mes = 0
        colaboradores_mes = 0
        
        for cliente in clientes:
            created_at = cliente.get("created_at")
            if created_at:
                try:
                    if isinstance(created_at, str):
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_date = created_at
                    
                    if created_date.replace(tzinfo=None) < data_fim:
                        empresas_mes += 1
                except:
                    empresas_mes += 1  # Se não conseguir parsear, assume que já existia
            else:
                empresas_mes += 1
        
        # Para colaboradores, contar os que existiam até o mês
        # Simplificando: usar proporção baseada no total atual
        if total_clientes > 0:
            colaboradores_mes = int((empresas_mes / total_clientes) * total_colaboradores)
        
        evolucao_mensal.append({
            "mes": meses_abrev[mes_num - 1],
            "empresas": empresas_mes,
            "colaboradores": colaboradores_mes
        })
    
    return {
        "total_clientes": total_clientes,
        "total_colaboradores": total_colaboradores,
        "admissoes_pendentes": admissoes_pendentes,
        "admissoes_lista": admissoes_lista,
        "proximos_dissidios": proximos_dissidios[:10],
        "empresas_por_segmento": segmentos_lista,
        "evolucao_mensal": evolucao_mensal
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Portal DP API - Online", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
