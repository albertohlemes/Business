from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
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
    """Importa colaboradores usando OCR local + IA opcional (híbrido)"""
    from document_processor import doc_processor, GoogleAIProcessor
    
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
        # 1. PRIMEIRO: Tenta OCR local (rápido e gratuito)
        logger.info(f"Extraindo texto com OCR local de {file.filename}")
        extracted_text = doc_processor.extract_text(tmp_path)
        
        colaboradores = []
        confianca = "baixa"
        
        if extracted_text and len(extracted_text) > 100:
            # Tenta extrair colaboradores do texto com regex
            colaboradores = doc_processor.parse_colaboradores_from_text(extracted_text)
            
            if colaboradores and len(colaboradores) > 0:
                # Se encontrou colaboradores com OCR local
                confianca = "media"
                logger.info(f"OCR local extraiu {len(colaboradores)} colaborador(es)")
        
        # 2. Se OCR local não funcionou bem e IA está habilitada, tenta IA
        google_ai_key = os.environ.get('GOOGLE_AI_API_KEY')
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        
        # Filtra colaboradores inválidos (nomes que não parecem nomes de pessoas)
        invalid_names = ['registro', 'colaboradores', 'empregado', 'funcionário', 'empresa', 'ficha']
        colaboradores = [c for c in colaboradores if c.get('nome') and not any(inv in c.get('nome', '').lower() for inv in invalid_names)]
        
        # Verifica se tem colaboradores válidos suficientes
        valid_count = sum(1 for c in colaboradores if c.get('nome') and len(c.get('nome', '').split()) >= 2)
        
        if use_ai and valid_count < 2:
            logger.info("OCR insuficiente, tentando IA...")
            
            # Tenta Google AI Studio primeiro (gratuito)
            if google_ai_key:
                try:
                    google_ai = GoogleAIProcessor(google_ai_key)
                    if google_ai.is_available():
                        ai_colaboradores = await google_ai.extract_colaboradores(extracted_text)
                        if ai_colaboradores:
                            colaboradores = ai_colaboradores
                            confianca = "alta"
                            logger.info(f"Google AI extraiu {len(colaboradores)} colaborador(es)")
                except Exception as e:
                    logger.warning(f"Google AI falhou: {e}")
            
            # Se Google AI não disponível/falhou, tenta Emergent (pago) - com timeout
            if (not colaboradores or valid_count < 2) and emergent_key:
                try:
                    import asyncio
                    # Timeout de 30 segundos para não travar
                    colaboradores_ai = await asyncio.wait_for(
                        _extract_with_emergent_ai(tmp_path, suffix, tipo_documento, emergent_key),
                        timeout=30.0
                    )
                    if colaboradores_ai:
                        colaboradores = colaboradores_ai
                        confianca = "alta"
                        logger.info(f"Emergent AI extraiu {len(colaboradores)} colaborador(es)")
                except asyncio.TimeoutError:
                    logger.warning("Emergent AI timeout - usando resultado do OCR")
                except Exception as e:
                    logger.error(f"Emergent AI falhou: {e}")
                    # Retorna o que OCR conseguiu
        
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
    """Extração usando Emergent AI (pago) - chamada interna"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    # Determine document type for better extraction
    doc_context = ""
    if tipo_documento == "ficha_registro":
        doc_context = "Este é uma FICHA DE REGISTRO DE EMPREGADO. PODE CONTER MÚLTIPLOS FUNCIONÁRIOS/VÍNCULOS."
    elif tipo_documento == "holerite":
        doc_context = "Este é um HOLERITE/CONTRACHEQUE. PODE CONTER MÚLTIPLOS FUNCIONÁRIOS."
    elif tipo_documento == "ficha_esocial":
        doc_context = "Este é uma FICHA DE ADMISSÃO eSocial. PODE CONTER MÚLTIPLOS FUNCIONÁRIOS."
    else:
        doc_context = "Este documento pode conter UM OU MAIS FUNCIONÁRIOS. Identifique e extraia TODOS."
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"importar-colab-{uuid.uuid4()}",
        system_message=f"""Você é um especialista em departamento pessoal brasileiro. {doc_context}

IMPORTANTE: O documento pode conter MÚLTIPLOS FUNCIONÁRIOS/VÍNCULOS. Extraia TODOS os colaboradores encontrados.

Retorne em formato JSON com ARRAY de colaboradores:
{{
    "colaboradores": [
        {{
            "nome": "nome completo",
            "cpf": "CPF",
            "cargo": "cargo/função",
            "salario_base": 0,
            "data_admissao": "DD/MM/AAAA",
            "data_nascimento": "DD/MM/AAAA",
            "rg": "RG",
            "pis": "PIS",
            "ctps": "CTPS",
            "endereco": "endereço",
            "cidade": "cidade",
            "uf": "UF"
        }}
    ]
}}

REGRAS: Extraia TODOS os funcionários. Salário como número. Datas DD/MM/AAAA."""
    ).with_model("gemini", "gemini-2.5-flash")
    
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
    mime_type = mime_types.get(suffix.lower(), "application/pdf")
    
    file_content = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
    
    # Retry logic
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = await chat.send_message(UserMessage(
                text=f"Extraia TODOS os funcionários. {doc_context}",
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
        return resultado.get("colaboradores", [])
    except (json.JSONDecodeError, IndexError, KeyError):
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
    Validação unificada de folha de pagamento com suporte a MÚLTIPLOS COLABORADORES.
    - Extrai todos os colaboradores da folha atual
    - Compara cada colaborador individualmente com o mês anterior
    - Cruza dados de apoio por colaborador (HE, vale, etc.)
    - Retorna uma tabela organizada por colaborador
    """
    try:
        from document_processor import doc_processor
        
        # Verificar cliente
        cliente = await db.clientes.find_one({"id": cliente_id, "user_id": current_user["id"]})
        if not cliente:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        temp_files = []
        
        try:
            # 1. Processar holerite atual - MÚLTIPLOS COLABORADORES
            holerite_atual_content = await holerite_atual.read()
            holerite_atual_suffix = Path(holerite_atual.filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=holerite_atual_suffix) as tmp:
                tmp.write(holerite_atual_content)
                tmp.flush()
                temp_files.append(tmp.name)
                
                logger.info(f"Extraindo colaboradores de {holerite_atual.filename}...")
                texto_atual = doc_processor.extract_text(tmp.name)
                colaboradores_atual = doc_processor.parse_folha_multiplos_colaboradores(texto_atual)
                logger.info(f"Encontrados {len(colaboradores_atual)} colaborador(es) na folha atual")
            
            # 2. Processar holerite anterior (se fornecido)
            colaboradores_anterior = []
            has_anterior = False
            if holerite_anterior and holerite_anterior.filename:
                holerite_anterior_content = await holerite_anterior.read()
                if holerite_anterior_content:
                    has_anterior = True
                    holerite_anterior_suffix = Path(holerite_anterior.filename).suffix
                    with tempfile.NamedTemporaryFile(delete=False, suffix=holerite_anterior_suffix) as tmp:
                        tmp.write(holerite_anterior_content)
                        tmp.flush()
                        temp_files.append(tmp.name)
                        
                        logger.info(f"Extraindo colaboradores de {holerite_anterior.filename}...")
                        texto_anterior = doc_processor.extract_text(tmp.name)
                        colaboradores_anterior = doc_processor.parse_folha_multiplos_colaboradores(texto_anterior)
                        logger.info(f"Encontrados {len(colaboradores_anterior)} colaborador(es) na folha anterior")
            
            # 3. Processar arquivos de apoio COM IA
            referencias_apoio = []
            has_apoio = False
            apoio_filenames = []
            if apoio_files:
                for apoio in apoio_files:
                    if apoio and apoio.filename:
                        apoio_content = await apoio.read()
                        if apoio_content:
                            has_apoio = True
                            apoio_suffix = Path(apoio.filename).suffix
                            with tempfile.NamedTemporaryFile(delete=False, suffix=apoio_suffix) as tmp:
                                tmp.write(apoio_content)
                                tmp.flush()
                                temp_files.append(tmp.name)
                                apoio_filenames.append(apoio.filename)
                                
                                logger.info(f"Extraindo referências de {apoio.filename} com IA...")
                                # Usar IA para extrair referências do arquivo de apoio
                                refs = await doc_processor.extrair_referencias_apoio_ia(tmp.name)
                                for ref in refs:
                                    ref['arquivo'] = apoio.filename
                                referencias_apoio.extend(refs)
                                logger.info(f"Encontradas {len(refs)} referências em {apoio.filename}")
            
            # 4. Criar índice de colaboradores anteriores por nome/CPF
            idx_anterior = {}
            for c in colaboradores_anterior:
                key = c.get('cpf') or c.get('nome', '').upper().strip()
                if key:
                    idx_anterior[key] = c
                    # Também indexar por nome normalizado
                    if c.get('nome'):
                        idx_anterior[c['nome'].upper().strip()] = c
            
            # 5. Processar cada colaborador da folha atual
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
                    'status': 'ok',  # ok, atencao, divergente
                    'dados_atuais': {
                        'salario_base': colab.get('salario_base', 0),
                        'horas_extras': colab.get('horas_extras', 0),
                        'horas_extras_50': colab.get('horas_extras_50', 0),
                        'horas_extras_100': colab.get('horas_extras_100', 0),
                        'adicional_noturno': colab.get('adicional_noturno', 0),
                        'vale_transporte': colab.get('vale_transporte', 0),
                        'vale_refeicao': colab.get('vale_refeicao', 0),
                        'vale_alimentacao': colab.get('vale_alimentacao', 0),
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
                    nome_parts = nome_upper.split()
                    
                    for ref in referencias_apoio:
                        ref_id = ref.get('identificador', '').upper().strip()
                        
                        # Verificar se referência é para este colaborador
                        match = False
                        if ref_id == nome_upper:
                            match = True
                        elif ref_id in nome_upper or nome_upper in ref_id:
                            match = True
                        elif nome_parts and ref_id in nome_parts:
                            match = True
                        elif ref_id == colab.get('matricula', ''):
                            match = True
                        
                        if match:
                            tipo_ref = ref.get('tipo', '')
                            valor_apoio = ref.get('valor', 0)
                            
                            # Mapear tipo para campo do holerite
                            campo_holerite = {
                                'horas_extras': 'horas_extras',
                                'vale_transporte': 'vale_transporte',
                                'vale_refeicao': 'vale_refeicao',
                                'vale_alimentacao': 'vale_alimentacao',
                                'faltas': 'faltas',
                                'atrasos': 'atrasos',
                                'comissao': 'comissao',
                                'bonificacao': 'bonificacao'
                            }.get(tipo_ref, tipo_ref)
                            
                            valor_holerite = colab.get(campo_holerite, 0)
                            
                            # Se for horas extras, também checar os campos específicos
                            if tipo_ref == 'horas_extras' and valor_holerite == 0:
                                valor_holerite = colab.get('horas_extras_50', 0) + colab.get('horas_extras_100', 0)
                            
                            diff = valor_holerite - valor_apoio
                            
                            if abs(diff) > 0.01:
                                colab_resultado['status'] = 'divergente'
                                colab_resultado['divergencias_apoio'].append({
                                    'campo': tipo_ref.replace('_', ' ').title(),
                                    'valor_apoio': valor_apoio,
                                    'valor_holerite': valor_holerite,
                                    'diferenca': round(diff, 2),
                                    'arquivo': ref.get('arquivo', ''),
                                    'severidade': 'alta' if abs(diff) > 100 else 'media'
                                })
                                total_divergencias += 1
                            else:
                                colab_resultado['conferidos'].append({
                                    'campo': tipo_ref.replace('_', ' ').title(),
                                    'valor': valor_apoio,
                                    'fonte': ref.get('arquivo', '')
                                })
                                total_conferidos += 1
                
                resultado_colaboradores.append(colab_resultado)
            
            # 6. Determinar tipo de análise
            if has_anterior and has_apoio:
                tipo_analise = "completa"
            elif has_anterior:
                tipo_analise = "comparacao_mensal"
            elif has_apoio:
                tipo_analise = "comparacao_apoio"
            else:
                tipo_analise = "analise_isolada"
            
            # 7. Gerar resumo executivo
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
            
            # 8. Gerar recomendações
            recomendacoes = []
            if total_divergente > 0:
                recomendacoes.append(f"Revisar {total_divergente} colaborador(es) com divergências antes de fechar a folha.")
            if has_apoio and any(c['divergencias_apoio'] for c in resultado_colaboradores):
                recomendacoes.append("Verificar diferenças entre documentos de apoio e holerite.")
            
            # 9. Salvar no banco
            validacao_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            validacao_doc = {
                "id": validacao_id,
                "cliente_id": cliente_id,
                "cliente_nome": cliente.get("nome_fantasia") or cliente.get("razao_social"),
                "mes_referencia": mes_referencia,
                "ano_referencia": ano_referencia,
                "tipo_validacao": tipo_analise,
                "status": "concluido",
                "arquivos": {
                    "holerite_atual": holerite_atual.filename,
                    "holerite_anterior": holerite_anterior.filename if has_anterior else None,
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
                "user_id": current_user["id"]
            }
            
            await db.validacoes.insert_one(validacao_doc)
            logger.info(f"Validação {validacao_id} salva com {len(resultado_colaboradores)} colaboradores")
            
            return {
                "id": validacao_id,
                "success": True,
                "tipo_analise": tipo_analise,
                "empresa": cliente.get("nome_fantasia") or cliente.get("razao_social"),
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
            
        finally:
            for tmp_path in temp_files:
                try:
                    os.unlink(tmp_path)
                except:
                    pass
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na validação completa: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao validar folha: {str(e)}")


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
