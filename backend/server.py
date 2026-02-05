from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
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
    cliente_id: str
    mes_referencia: str
    ano_referencia: int
    status: str
    discrepancias: List[Dict[str, Any]] = []
    total_verificados: int = 0
    total_erros: int = 0
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
    current_user: dict = Depends(get_current_user)
):
    """Importa colaborador a partir de ficha de registro, holerite ou ficha eSocial usando IA"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
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
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            # Determine document type for better extraction
            doc_context = ""
            if tipo_documento == "ficha_registro":
                doc_context = "Este é uma FICHA DE REGISTRO DE EMPREGADO."
            elif tipo_documento == "holerite":
                doc_context = "Este é um HOLERITE/CONTRACHEQUE. Extraia os dados do cabeçalho e identificação do funcionário."
            elif tipo_documento == "ficha_esocial":
                doc_context = "Este é uma FICHA DE ADMISSÃO eSocial com todos os campos obrigatórios para envio ao governo."
            else:
                doc_context = "Este documento pode ser uma FICHA DE REGISTRO DE EMPREGADO, FICHA eSocial ou um HOLERITE/CONTRACHEQUE. Identifique o tipo e extraia os dados."
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"importar-colab-{uuid.uuid4()}",
                system_message=f"""Você é um especialista em departamento pessoal brasileiro. {doc_context}

Extraia TODAS as informações possíveis do documento, mesmo que algumas estejam incompletas, manuscritas ou difíceis de ler.
Este é o template completo da Ficha de Admissão eSocial. Extraia todos os campos que conseguir identificar.

Retorne em formato JSON com os seguintes campos (deixe em branco "" os campos não encontrados):
{{
    "tipo_documento_detectado": "ficha_registro", "holerite" ou "ficha_esocial",
    "confianca": "alta", "media" ou "baixa",
    "dados": {{
        "nome": "nome completo do funcionário",
        "cpf": "CPF (apenas números ou formatado)",
        "endereco": "logradouro/rua",
        "numero": "número do endereço",
        "bairro": "bairro",
        "complemento": "complemento do endereço",
        "cep": "CEP",
        "cidade": "cidade/município",
        "uf": "UF (sigla)",
        "email": "email",
        "celular": "telefone celular",
        "ddd": "DDD do telefone",
        "deficiencia": true/false,
        "tipo_deficiencia": "física, visual, auditiva, mental, intelectual, reabilitado",
        "cidade_nascimento": "cidade de nascimento",
        "uf_nascimento": "UF de nascimento",
        "data_nascimento": "data de nascimento (DD/MM/AAAA)",
        "estado_civil": "solteiro, casado, divorciado, viúvo, separado, união estável",
        "grau_instrucao": "fundamental, médio, superior, pós-graduação, mestrado, doutorado",
        "data_admissao": "data de admissão (DD/MM/AAAA)",
        "cargo": "cargo/função",
        "etnia": "branca, preta, parda, amarela, indígena, não declarado",
        "recebendo_seguro_desemprego": true/false,
        "sexo": "masculino ou feminino",
        "rg": "número do RG",
        "rg_orgao_emissor": "órgão emissor do RG (SSP, etc)",
        "rg_data_emissao": "data de emissão do RG (DD/MM/AAAA)",
        "rg_uf": "UF de emissão do RG",
        "reservista": "número do certificado de reservista",
        "pis": "número do PIS/PASEP",
        "ctps": "número da CTPS",
        "ctps_serie": "série da CTPS",
        "ctps_data_emissao": "data de emissão da CTPS (DD/MM/AAAA)",
        "ctps_uf": "UF de emissão da CTPS",
        "titulo_eleitor": "número do título de eleitor",
        "titulo_zona": "zona eleitoral",
        "titulo_secao": "seção eleitoral",
        "cnh": "número da CNH",
        "cnh_uf": "UF da CNH",
        "cnh_categoria": "categoria da CNH (A, B, AB, C, D, E)",
        "cnh_vencimento": "data de vencimento da CNH (DD/MM/AAAA)",
        "cnh_emissao": "data de emissão da CNH (DD/MM/AAAA)",
        "cnh_primeira_habilitacao": "data da primeira habilitação (DD/MM/AAAA)",
        "nome_mae": "nome completo da mãe",
        "nome_pai": "nome completo do pai",
        "nome_conjuge": "nome do cônjuge (se casado/união estável)",
        "salario_base": "salário base (apenas número, ex: 1500.00)",
        "horista": true/false,
        "insalubridade_percentual": "percentual de insalubridade (10, 20 ou 40)",
        "periculosidade_percentual": "percentual de periculosidade (30)",
        "prazo_experiencia": "prazo de experiência em dias (30, 45, 60, 90)",
        "quadro_horario": "horário de trabalho (ex: 08:00 às 17:00)",
        "vale_transporte": true/false,
        "adiantamento_salarial": true/false,
        "desconto_sindical": true/false,
        "data_exame_admissional": "data do exame admissional (DD/MM/AAAA)",
        "banco": "nome ou código do banco",
        "agencia": "número da agência",
        "conta": "número da conta",
        "departamento": "setor/departamento",
        "dependentes": [
            {{
                "nome": "nome do dependente",
                "data_nascimento": "DD/MM/AAAA",
                "cpf": "CPF do dependente",
                "parentesco": "filho, cônjuge, pai, mãe, etc",
                "ir": true/false,
                "salario_familia": true/false
            }}
        ]
    }},
    "campos_extraidos": ["lista dos campos que conseguiu extrair com confiança"],
    "campos_incertos": ["lista dos campos com extração duvidosa"],
    "observacoes": "qualquer observação sobre a qualidade da extração ou campos que não foram encontrados"
}}

IMPORTANTE: 
- Extraia o MÁXIMO possível de informações, mesmo de documentos manuscritos ou escaneados com baixa qualidade
- Se o salário estiver em formato "R$ 1.500,00", retorne apenas "1500.00"
- Datas devem estar no formato DD/MM/AAAA
- Para campos booleanos (true/false), interprete "sim", "x", "marcado" como true
- Campos numéricos devem ser apenas números
- Mesmo dados parciais são úteis, não deixe de extrair
- Se houver dependentes listados no documento, extraia-os no array de dependentes"""
            ).with_model("gemini", "gemini-2.5-flash")
            
            mime_types = {
                ".pdf": "application/pdf",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png"
            }
            mime_type = mime_types.get(suffix.lower(), "application/octet-stream")
            
            file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
            
            response = await chat.send_message(UserMessage(
                text=f"Extraia os dados do funcionário deste documento. {doc_context}",
                file_contents=[file_content]
            ))
            
            # Parse JSON response
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
                    "tipo_documento_detectado": "desconhecido",
                    "confianca": "baixa",
                    "dados": {},
                    "raw_response": response,
                    "parsing_error": True
                }
            
            # Process and normalize extracted data
            dados = resultado.get("dados", {})
            
            # Process salary if present
            if dados.get("salario_base"):
                try:
                    salario_str = str(dados["salario_base"])
                    salario_str = salario_str.replace("R$", "").replace(".", "").replace(",", ".").strip()
                    dados["salario_base"] = float(salario_str)
                except:
                    dados["salario_base"] = 0
            
            # Process percentages
            for field in ["insalubridade_percentual", "periculosidade_percentual"]:
                if dados.get(field):
                    try:
                        dados[field] = float(str(dados[field]).replace("%", "").strip())
                    except:
                        dados[field] = None
            
            # Process boolean fields
            bool_fields = ["deficiencia", "recebendo_seguro_desemprego", "horista", 
                          "vale_transporte", "adiantamento_salarial", "desconto_sindical"]
            for field in bool_fields:
                if field in dados:
                    val = dados[field]
                    if isinstance(val, str):
                        dados[field] = val.lower() in ["true", "sim", "s", "x", "1", "marcado"]
                    elif isinstance(val, bool):
                        pass
                    else:
                        dados[field] = bool(val)
            
            # Process dependentes array
            if dados.get("dependentes"):
                try:
                    deps = dados["dependentes"]
                    if isinstance(deps, list):
                        processed_deps = []
                        for dep in deps:
                            if isinstance(dep, dict):
                                # Process boolean fields in dependentes
                                for bf in ["ir", "salario_familia"]:
                                    if bf in dep:
                                        val = dep[bf]
                                        if isinstance(val, str):
                                            dep[bf] = val.lower() in ["true", "sim", "s", "x", "1"]
                                processed_deps.append(dep)
                        dados["dependentes"] = processed_deps
                except:
                    dados["dependentes"] = []
            
            return {
                "success": True,
                "tipo_documento": resultado.get("tipo_documento_detectado", "desconhecido"),
                "confianca": resultado.get("confianca", "baixa"),
                "dados_extraidos": dados,
                "campos_extraidos": resultado.get("campos_extraidos", []),
                "campos_incertos": resultado.get("campos_incertos", []),
                "observacoes": resultado.get("observacoes", ""),
                "message": "Dados extraídos. Revise antes de salvar."
            }
            
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Erro na importação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar documento: {str(e)}")

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

@api_router.get("/validacoes", response_model=List[ValidacaoFolhaResponse])
async def list_validacoes(cliente_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    validacoes = await db.validacoes.find(query, {"_id": 0, "user_id": 0, "resumo": 0}).to_list(1000)
    return [ValidacaoFolhaResponse(**v) for v in validacoes]

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

# ==================== INFORMES DE RENDIMENTO ====================

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
                system_message="""Você é um auditor especializado em comparação de informes de rendimento.
                Compare os dois documentos (eSocial e Sistema Interno) e identifique:
                1. Divergências de valores
                2. Funcionários presentes em um e ausentes no outro
                3. Diferenças em bases de cálculo
                4. Erros de IR retido
                
                Retorne em JSON:
                {
                    "total_comparados": número,
                    "divergencias_encontradas": número,
                    "divergencias": [
                        {
                            "funcionario": "nome",
                            "cpf": "cpf",
                            "campo": "campo divergente",
                            "valor_esocial": valor,
                            "valor_sistema": valor,
                            "diferenca": valor,
                            "severidade": "alta/media/baixa"
                        }
                    ],
                    "resumo": "resumo da comparação",
                    "recomendacoes": ["lista de ações recomendadas"]
                }"""
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
                text="Compare estes dois documentos de informe de rendimentos. O primeiro é do eSocial e o segundo é do sistema interno.",
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
                system_message="""Você é um especialista em convenções coletivas de trabalho.
                Analise o documento e extraia:
                1. Nome do sindicato
                2. Percentual de reajuste salarial
                3. Data-base da categoria
                4. Piso salarial (se houver)
                5. Benefícios alterados (VA, VT, etc)
                6. Outras cláusulas importantes
                
                Retorne em JSON:
                {
                    "sindicato": "nome do sindicato",
                    "percentual_reajuste": número (ex: 5.5),
                    "data_base": "MM/YYYY",
                    "piso_salarial": valor ou null,
                    "beneficios": [
                        {"tipo": "VA", "valor": 500, "alteracao": "aumento de 10%"}
                    ],
                    "clausulas_importantes": ["lista de cláusulas relevantes"],
                    "vigencia_inicio": "DD/MM/YYYY",
                    "vigencia_fim": "DD/MM/YYYY",
                    "resumo": "resumo executivo da convenção"
                }"""
            ).with_model("gemini", "gemini-2.5-flash")
            
            file_content = FileContentWithMimeType(
                file_path=tmp_path,
                mime_type="application/pdf"
            )
            
            response = await chat.send_message(UserMessage(
                text="Analise esta convenção coletiva e extraia os dados de reajuste salarial e benefícios.",
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

# ==================== DASHBOARD ====================

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    total_clientes = await db.clientes.count_documents({"user_id": user_id})
    
    clientes = await db.clientes.find({"user_id": user_id}, {"id": 1}).to_list(1000)
    cliente_ids = [c["id"] for c in clientes]
    
    total_colaboradores = await db.colaboradores.count_documents({"cliente_id": {"$in": cliente_ids}})
    dissidios_pendentes = await db.dissidios.count_documents({"user_id": user_id, "status": "pendente"})
    admissoes_pendentes = await db.admissoes.count_documents({"user_id": user_id, "status": "pendente"})
    validacoes_pendentes = await db.validacoes.count_documents({"user_id": user_id, "status": "pendente"})
    
    # Get recent activities
    tarefas = []
    
    recent_dissidios = await db.dissidios.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "sindicato": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(3)
    for d in recent_dissidios:
        tarefas.append({"tipo": "dissidio", "titulo": f"Dissídio - {d.get('sindicato', 'N/A')}", **d})
    
    recent_admissoes = await db.admissoes.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "status": 1, "created_at": 1, "dados_extraidos": 1}
    ).sort("created_at", -1).to_list(3)
    for a in recent_admissoes:
        nome = a.get("dados_extraidos", {}).get("nome", "Novo Funcionário")
        tarefas.append({"tipo": "admissao", "titulo": f"Admissão - {nome}", "id": a["id"], "status": a["status"], "created_at": a["created_at"]})
    
    recent_validacoes = await db.validacoes.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "status": 1, "created_at": 1, "mes_referencia": 1, "ano_referencia": 1}
    ).sort("created_at", -1).to_list(3)
    for v in recent_validacoes:
        tarefas.append({"tipo": "validacao", "titulo": f"Validação {v.get('mes_referencia', '')}/{v.get('ano_referencia', '')}", "id": v["id"], "status": v["status"], "created_at": v["created_at"]})
    
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
