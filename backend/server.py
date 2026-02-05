from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import hashlib
import base64
import shutil
import httpx
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'business-secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Portal Societário Business Contabilidade")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CertificadoCreate(BaseModel):
    nome: str
    senha: str
    cnpjs: List[str] = []

class CertificadoResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    arquivo: str
    cnpjs: List[str]
    validade: Optional[str] = None
    status: str
    created_at: str

class CNPJCreate(BaseModel):
    cnpj: str
    razao_social: str
    certificado_id: str

class LicencaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    cnpj: str
    razao_social: str
    certificado_id: str
    status: str
    vencimento: Optional[str] = None
    ultima_consulta: Optional[str] = None
    arquivo_licenca: Optional[str] = None

class MinutaCreate(BaseModel):
    tipo_alteracao: str
    descricao: str

class DadosEmpresa(BaseModel):
    """Dados estruturados extraídos do contrato"""
    razao_social: Optional[str] = None
    cnpj: Optional[str] = None
    endereco: Optional[str] = None
    capital_social: Optional[str] = None
    objeto_social: Optional[str] = None

class Socio(BaseModel):
    """Dados de um sócio"""
    nome: str
    cpf: Optional[str] = None
    participacao: Optional[str] = None
    administrador: Optional[bool] = None
    nacionalidade: Optional[str] = None
    estado_civil: Optional[str] = None
    profissao: Optional[str] = None
    rg: Optional[str] = None

class DadosExtraidos(BaseModel):
    """Todos os dados extraídos do contrato"""
    empresa: Optional[DadosEmpresa] = None
    socios: List[Socio] = []
    atividades: List[str] = []
    raw_text: Optional[str] = None

class MinutaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tipo_alteracao: str
    tipo_processo: Optional[str] = None
    descricao: str
    arquivo_original: Optional[str] = None
    conteudo_gerado: Optional[str] = None
    status: str
    created_at: str
    # Novos campos para listagem
    cnpj: Optional[str] = None
    razao_social: Optional[str] = None
    numero_alteracao: Optional[int] = None

class ChatMessage(BaseModel):
    message: str
    minuta_id: str

class ChatResponse(BaseModel):
    response: str
    minuta_id: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id, user_data.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or user["password"] != hash_password(user_data.password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# ============ CERTIFICADOS ROUTES ============

@api_router.post("/certificados/upload")
async def upload_certificado(
    file: UploadFile = File(...),
    nome: str = Form(...),
    senha: str = Form(...),
    cnpjs: str = Form(default=""),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.endswith('.pfx'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser .pfx")
    
    cert_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"cert_{cert_id}.pfx"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    cnpjs_list = [c.strip() for c in cnpjs.split(",") if c.strip()] if cnpjs else []
    
    certificado = {
        "id": cert_id,
        "nome": nome,
        "arquivo": str(file_path),
        "senha_hash": hash_password(senha),
        "cnpjs": cnpjs_list,
        "validade": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        "status": "ativo",
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.certificados.insert_one(certificado)
    
    return CertificadoResponse(
        id=cert_id,
        nome=nome,
        arquivo=file.filename,
        cnpjs=cnpjs_list,
        validade=certificado["validade"],
        status="ativo",
        created_at=certificado["created_at"]
    )

@api_router.get("/certificados", response_model=List[CertificadoResponse])
async def list_certificados(current_user: dict = Depends(get_current_user)):
    certificados = await db.certificados.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0, "senha_hash": 0}
    ).to_list(100)
    
    return [CertificadoResponse(
        id=c["id"],
        nome=c["nome"],
        arquivo=c.get("arquivo", "").split("/")[-1] if c.get("arquivo") else "",
        cnpjs=c.get("cnpjs", []),
        validade=c.get("validade"),
        status=c.get("status", "ativo"),
        created_at=c["created_at"]
    ) for c in certificados]

@api_router.delete("/certificados/{cert_id}")
async def delete_certificado(cert_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.certificados.delete_one({"id": cert_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certificado não encontrado")
    return {"message": "Certificado removido com sucesso"}

@api_router.post("/certificados/{cert_id}/cnpjs")
async def add_cnpj_to_certificado(
    cert_id: str,
    cnpj_data: CNPJCreate,
    current_user: dict = Depends(get_current_user)
):
    cert = await db.certificados.find_one({"id": cert_id, "user_id": current_user["id"]})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado não encontrado")
    
    # Add CNPJ to certificate
    await db.certificados.update_one(
        {"id": cert_id},
        {"$addToSet": {"cnpjs": cnpj_data.cnpj}}
    )
    
    # Create license entry
    licenca_id = str(uuid.uuid4())
    licenca = {
        "id": licenca_id,
        "cnpj": cnpj_data.cnpj,
        "razao_social": cnpj_data.razao_social,
        "certificado_id": cert_id,
        "user_id": current_user["id"],
        "status": "pendente",
        "vencimento": None,
        "ultima_consulta": None,
        "arquivo_licenca": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.licencas.insert_one(licenca)
    
    return LicencaResponse(**{k: v for k, v in licenca.items() if k != "user_id"})

# ============ LICENÇAS ROUTES ============

@api_router.get("/licencas", response_model=List[LicencaResponse])
async def list_licencas(current_user: dict = Depends(get_current_user)):
    licencas = await db.licencas.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    ).to_list(500)
    return [LicencaResponse(**l) for l in licencas]

@api_router.post("/licencas/{licenca_id}/consultar")
async def consultar_licenca(licenca_id: str, current_user: dict = Depends(get_current_user)):
    licenca = await db.licencas.find_one({"id": licenca_id, "user_id": current_user["id"]})
    if not licenca:
        raise HTTPException(status_code=404, detail="Licença não encontrada")
    
    # Simulate REDESIM consultation
    import random
    dias_ate_vencimento = random.randint(-30, 180)
    vencimento = datetime.now(timezone.utc) + timedelta(days=dias_ate_vencimento)
    
    if dias_ate_vencimento < 0:
        status = "vencida"
    elif dias_ate_vencimento <= 30:
        status = "proxima_vencimento"
    else:
        status = "ativa"
    
    await db.licencas.update_one(
        {"id": licenca_id},
        {"$set": {
            "status": status,
            "vencimento": vencimento.isoformat(),
            "ultima_consulta": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.licencas.find_one({"id": licenca_id}, {"_id": 0, "user_id": 0})
    return LicencaResponse(**updated)

@api_router.post("/licencas/{licenca_id}/renovar")
async def renovar_licenca(licenca_id: str, current_user: dict = Depends(get_current_user)):
    licenca = await db.licencas.find_one({"id": licenca_id, "user_id": current_user["id"]})
    if not licenca:
        raise HTTPException(status_code=404, detail="Licença não encontrada")
    
    # Simulate renewal
    novo_vencimento = datetime.now(timezone.utc) + timedelta(days=365)
    
    await db.licencas.update_one(
        {"id": licenca_id},
        {"$set": {
            "status": "ativa",
            "vencimento": novo_vencimento.isoformat(),
            "ultima_consulta": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.licencas.find_one({"id": licenca_id}, {"_id": 0, "user_id": 0})
    return LicencaResponse(**updated)

@api_router.get("/licencas/{licenca_id}/download")
async def download_licenca(licenca_id: str, current_user: dict = Depends(get_current_user)):
    licenca = await db.licencas.find_one({"id": licenca_id, "user_id": current_user["id"]})
    if not licenca:
        raise HTTPException(status_code=404, detail="Licença não encontrada")
    
    if licenca.get("status") != "ativa":
        raise HTTPException(status_code=400, detail="Licença não está ativa")
    
    # Gerar conteúdo da licença (simulado)
    vencimento = licenca.get("vencimento", "")
    if vencimento:
        vencimento_fmt = datetime.fromisoformat(vencimento.replace('Z', '+00:00')).strftime('%d/%m/%Y')
    else:
        vencimento_fmt = "N/A"
    
    conteudo = f"""
================================================================================
                    PREFEITURA DO MUNICÍPIO DE SÃO PAULO
                    SECRETARIA MUNICIPAL DE URBANISMO E LICENCIAMENTO
                    COORDENADORIA DE LICENCIAMENTO E FISCALIZAÇÃO - SELIF
================================================================================

                         LICENÇA DE FUNCIONAMENTO

CNPJ: {licenca.get('cnpj', 'N/A')}
RAZÃO SOCIAL: {licenca.get('razao_social', 'N/A')}

NÚMERO DA LICENÇA: LF-{licenca_id[:8].upper()}
DATA DE EMISSÃO: {datetime.now(timezone.utc).strftime('%d/%m/%Y')}
DATA DE VALIDADE: {vencimento_fmt}

STATUS: ATIVA

--------------------------------------------------------------------------------

Esta licença autoriza o funcionamento do estabelecimento acima identificado,
de acordo com as normas vigentes do município de São Paulo.

A presente licença deve ser mantida em local visível do estabelecimento.

--------------------------------------------------------------------------------

OBSERVAÇÕES:
- Licença emitida eletronicamente via Portal REDESIM SP
- Documento válido em todo território nacional
- Consulte a autenticidade em www.redesim.sp.gov.br

================================================================================
                    DOCUMENTO GERADO ELETRONICAMENTE
================================================================================
"""
    
    return {
        "conteudo": conteudo,
        "nome_arquivo": f"licenca_{licenca.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')}_{datetime.now().strftime('%Y%m%d')}.txt"
    }

@api_router.delete("/licencas/{licenca_id}")
async def delete_licenca(licenca_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.licencas.delete_one({"id": licenca_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Licença não encontrada")
    return {"message": "Licença removida com sucesso"}

@api_router.post("/licencas/{licenca_id}/consultar-redesim")
async def consultar_redesim_automatico(
    licenca_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """
    Inicia automação para consulta no portal REDESIM SP
    Navega até a tela de login ou consulta automaticamente se já logado
    """
    licenca = await db.licencas.find_one({"id": licenca_id, "user_id": current_user["id"]})
    if not licenca:
        raise HTTPException(status_code=404, detail="Licença não encontrada")
    
    try:
        from redesim_automation import executar_consulta_completa
        
        resultado = await executar_consulta_completa(
            cnpj=licenca["cnpj"],
            session_id=current_user["id"]
        )
        
        # Se conseguiu consultar, atualizar status
        if resultado.get("consulta_realizada"):
            etapa_consulta = next((e for e in resultado.get("etapas", []) if e.get("etapa") == "consultar_cnpj"), {})
            dados = etapa_consulta.get("dados_extraidos", {})
            
            if dados.get("status"):
                await db.licencas.update_one(
                    {"id": licenca_id},
                    {"$set": {
                        "status": dados["status"],
                        "ultima_consulta": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {
            "cnpj": licenca["cnpj"],
            "razao_social": licenca["razao_social"],
            **resultado
        }
        
    except Exception as e:
        logger.error(f"Erro na automação REDESIM: {str(e)}")
        return {
            "status": "erro",
            "error": str(e),
            "cnpj": licenca["cnpj"],
            "portal_url": "https://vreredesim.sp.gov.br",
            "mensagem": "Erro na automação. Acesse o portal manualmente.",
        }

@api_router.post("/redesim/capturar-tela")
async def capturar_tela_redesim(current_user: dict = Depends(get_current_user)):
    """Captura tela atual do navegador REDESIM"""
    try:
        from redesim_automation import get_consulta_instance
        
        consulta = await get_consulta_instance()
        resultado = await consulta.capturar_tela()
        return resultado
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.post("/redesim/continuar-apos-login")
async def continuar_apos_login(
    cnpj: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Continua a automação após o usuário fazer login manualmente
    """
    try:
        from redesim_automation import get_consulta_instance
        
        consulta = await get_consulta_instance()
        
        # Verificar se está logado agora
        login_status = await consulta.verificar_login()
        
        if not login_status.get("logged_in"):
            return {
                "success": False,
                "message": "Ainda não detectamos o login. Faça login no Gov.br com certificado.",
                "login_status": login_status
            }
        
        # Navegar para consulta
        nav_result = await consulta.navegar_consulta_licenca()
        
        # Consultar CNPJ
        consulta_result = await consulta.consultar_cnpj(cnpj)
        
        return {
            "success": True,
            "navegacao": nav_result,
            "consulta": consulta_result
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============ REDESIM VNC (Browser Visível) ============

from redesim_vnc import get_vnc_instance, executar_fluxo_completo, continuar_apos_login

@api_router.post("/redesim-vnc/iniciar")
async def iniciar_consulta_vnc(cnpj: str, current_user: dict = Depends(get_current_user)):
    """
    Inicia consulta REDESIM com browser visível via noVNC.
    O usuário verá a tela do navegador e poderá fazer login.
    """
    try:
        resultado = await executar_fluxo_completo(cnpj)
        resultado["vnc_url"] = "/novnc/vnc.html?autoconnect=true&resize=scale"
        return resultado
    except Exception as e:
        logger.error(f"Erro VNC: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/redesim-vnc/continuar")
async def continuar_consulta_vnc(cnpj: str, current_user: dict = Depends(get_current_user)):
    """
    Continua a automação após o usuário fazer login no Gov.br
    """
    try:
        resultado = await continuar_apos_login(cnpj)
        
        # Se encontrou dados, atualizar licença no banco
        if resultado.get("success") and resultado.get("dados"):
            dados = resultado["dados"]
            
            # Atualizar licença com dados extraídos
            update_data = {}
            if dados.get("status"):
                update_data["status_licenca"] = dados["status"]
            if dados.get("vencimento"):
                update_data["data_vencimento"] = dados["vencimento"]
            
            if update_data:
                await db.licencas.update_one(
                    {"cnpj": cnpj},
                    {"$set": update_data}
                )
        
        return resultado
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.get("/redesim-vnc/status")
async def status_vnc(current_user: dict = Depends(get_current_user)):
    """Retorna status atual da automação VNC"""
    try:
        consulta = get_vnc_instance()
        status = await consulta.get_status()
        screenshot = await consulta.capturar_screenshot()
        return {**status, "screenshot": screenshot}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@api_router.post("/redesim-vnc/fechar")
async def fechar_vnc(current_user: dict = Depends(get_current_user)):
    """Fecha o browser VNC"""
    try:
        consulta = get_vnc_instance()
        await consulta.fechar()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Proxy para noVNC (porta 6080)
@api_router.get("/novnc/{path:path}")
async def proxy_novnc(path: str, request: Request):
    """Proxy para acessar noVNC através da API"""
    try:
        async with httpx.AsyncClient() as client:
            url = f"http://localhost:6080/{path}"
            if request.query_params:
                url += f"?{request.query_params}"
            
            response = await client.get(url, timeout=10.0)
            
            content_type = response.headers.get("content-type", "text/html")
            return Response(
                content=response.content,
                status_code=response.status_code,
                media_type=content_type
            )
    except Exception as e:
        logger.error(f"Proxy VNC error: {e}")
        return Response(content=f"VNC não disponível: {e}", status_code=502)

# ============ MINUTAS ROUTES ============

@api_router.post("/minutas/upload")
async def upload_minuta(
    file: UploadFile = File(None),
    tipo_alteracao: str = Form(...),
    descricao: str = Form(default=""),
    current_user: dict = Depends(get_current_user)
):
    minuta_id = str(uuid.uuid4())
    arquivo_original = None
    arquivo_nome = None
    
    # Buscar próximo número sequencial para o usuário
    ultimo_numero = await db.minutas.find_one(
        {"user_id": current_user["id"]},
        sort=[("numero_alteracao", -1)]
    )
    numero_alteracao = (ultimo_numero.get("numero_alteracao", 0) if ultimo_numero else 0) + 1
    
    # Contrato social é opcional agora
    if file and file.filename:
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
        file_path = UPLOAD_DIR / f"minuta_{minuta_id}.{file_ext}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        arquivo_original = str(file_path)
        arquivo_nome = file.filename
    
    minuta = {
        "id": minuta_id,
        "tipo_alteracao": tipo_alteracao,
        "tipo_processo": "constituicao" if tipo_alteracao == "constituicao" else "alteracao",
        "descricao": descricao,
        "arquivo_original": arquivo_original,
        "arquivo_nome": arquivo_nome,
        "documentos_suporte": [],  # Lista de documentos de suporte
        "conteudo_gerado": None,
        "status": "pendente",
        "user_id": current_user["id"],
        "mensagens": [],
        "numero_alteracao": numero_alteracao,
        "dados_extraidos": None,  # Dados estruturados extraídos do contrato
        "cnpj": None,
        "razao_social": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.minutas.insert_one(minuta)
    
    return MinutaResponse(
        id=minuta_id,
        tipo_alteracao=tipo_alteracao,
        descricao=descricao,
        arquivo_original=arquivo_nome or "",
        conteudo_gerado=None,
        status="pendente",
        created_at=minuta["created_at"],
        numero_alteracao=numero_alteracao
    )

@api_router.post("/minutas/{minuta_id}/documentos")
async def upload_documento_suporte(
    minuta_id: str,
    file: UploadFile = File(...),
    tipo_documento: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de documento de suporte (CNH, comprovante, CNAEs, etc.)"""
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    doc_id = str(uuid.uuid4())
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    file_path = UPLOAD_DIR / f"doc_{minuta_id}_{doc_id}.{file_ext}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    documento = {
        "id": doc_id,
        "tipo": tipo_documento,
        "arquivo": str(file_path),
        "nome": file.filename,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.minutas.update_one(
        {"id": minuta_id},
        {"$push": {"documentos_suporte": documento}}
    )
    
    return {"message": "Documento adicionado com sucesso", "documento": documento}

@api_router.get("/minutas/{minuta_id}/documentos")
async def list_documentos_suporte(
    minuta_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Lista documentos de suporte de uma minuta"""
    minuta = await db.minutas.find_one(
        {"id": minuta_id, "user_id": current_user["id"]},
        {"_id": 0, "documentos_suporte": 1}
    )
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    return {"documentos": minuta.get("documentos_suporte", [])}

@api_router.delete("/minutas/{minuta_id}/documentos/{doc_id}")
async def delete_documento_suporte(
    minuta_id: str,
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove um documento de suporte"""
    result = await db.minutas.update_one(
        {"id": minuta_id, "user_id": current_user["id"]},
        {"$pull": {"documentos_suporte": {"id": doc_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    return {"message": "Documento removido com sucesso"}

@api_router.post("/minutas/{minuta_id}/extrair-dados")
async def extrair_dados_contrato(
    minuta_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Extrai dados estruturados do contrato usando IA.
    Retorna campos individuais em vez de texto corrido.
    """
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    if not minuta.get("arquivo_original"):
        raise HTTPException(status_code=400, detail="Nenhum contrato anexado")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        import json as json_lib
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Chave de API não configurada")
        
        system_message = """Você é um especialista em análise de contratos sociais brasileiros.
Sua tarefa é extrair TODAS as informações estruturadas do contrato social ou última alteração contratual.

IMPORTANTE: Extraia TODAS as informações disponíveis, especialmente:
- NIRE (Número de Identificação do Registro de Empresas)
- Data de registro na Junta Comercial
- Número da alteração (se for alteração contratual)

SEMPRE responda APENAS com um JSON válido, sem markdown, sem explicações.
O JSON deve seguir EXATAMENTE esta estrutura:

{
    "empresa": {
        "razao_social": "Nome completo da empresa",
        "nome_fantasia": "Nome fantasia (se houver)",
        "cnpj": "00.000.000/0000-00",
        "nire": "Número NIRE completo",
        "data_registro": "Data do registro na Junta",
        "junta_comercial": "Nome da Junta Comercial (JUCESP, etc)",
        "endereco": {
            "logradouro": "Rua/Av completo com número",
            "complemento": "Sala, andar, etc",
            "bairro": "Nome do bairro",
            "cidade": "Nome da cidade",
            "estado": "UF",
            "cep": "00000-000"
        },
        "capital_social": {
            "valor": "R$ 0.000,00",
            "extenso": "valor por extenso",
            "integralizacao": "forma de integralização"
        },
        "objeto_social": "Descrição COMPLETA das atividades",
        "prazo_duracao": "Indeterminado ou data específica",
        "inicio_atividades": "Data de início das atividades"
    },
    "socios": [
        {
            "nome": "Nome completo em maiúsculas",
            "cpf": "000.000.000-00",
            "rg": "00.000.000-0",
            "orgao_emissor": "SSP/UF",
            "nacionalidade": "Brasileiro(a)",
            "estado_civil": "Casado(a)/Solteiro(a)/etc",
            "regime_casamento": "Comunhão parcial (se casado)",
            "profissao": "Profissão",
            "endereco": "Endereço completo do sócio",
            "participacao": {
                "quotas": "número de quotas",
                "valor": "R$ 0.000,00",
                "percentual": "50%"
            },
            "administrador": true,
            "poderes": "Descrição dos poderes de administração"
        }
    ],
    "administracao": {
        "tipo": "Administração conjunta/isolada",
        "poderes": "Descrição dos poderes",
        "pro_labore": "Informações sobre pro-labore"
    },
    "clausulas": [
        {
            "numero": "1",
            "titulo": "DO OBJETO SOCIAL",
            "texto": "Texto completo da cláusula"
        }
    ],
    "ultima_alteracao": {
        "numero": "Número da última alteração",
        "data": "Data da última alteração",
        "objeto": "O que foi alterado"
    },
    "atividades_cnae": ["00.00-0-00 - Descrição da atividade"]
}

Se algum campo não for encontrado, use null. SEMPRE retorne JSON válido."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"extract-{minuta_id}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        file_path = minuta["arquivo_original"]
        if file_path.endswith('.pdf'):
            mime_type = "application/pdf"
        elif file_path.endswith('.png'):
            mime_type = "image/png"
        elif file_path.endswith('.docx'):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif file_path.endswith('.doc'):
            mime_type = "application/msword"
        elif file_path.endswith('.txt'):
            mime_type = "text/plain"
        else:
            mime_type = "image/jpeg"
        
        user_message = UserMessage(
            text="""Extraia TODOS os dados estruturados deste contrato social.

ATENÇÃO ESPECIAL PARA OS SÓCIOS:
Para cada sócio, extraia TODAS as informações disponíveis:
- Nome completo
- CPF (formato: 000.000.000-00)
- RG e órgão emissor (SSP/UF)
- Nacionalidade
- Estado civil e regime de casamento (se casado)
- Profissão
- Endereço residencial COMPLETO
- Número de quotas, valor e percentual de participação
- Se é administrador e quais poderes

Retorne APENAS o JSON válido, sem markdown, sem explicações.""",
            file_contents=[FileContentWithMimeType(file_path=file_path, mime_type=mime_type)]
        )
        
        response = await chat.send_message(user_message)
        
        # Tentar parsear o JSON da resposta
        try:
            # Remover possíveis marcadores de markdown
            json_str = response.strip()
            if json_str.startswith('```'):
                json_str = json_str.split('```')[1]
                if json_str.startswith('json'):
                    json_str = json_str[4:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]
            
            dados = json_lib.loads(json_str.strip())
        except json_lib.JSONDecodeError:
            # Se falhar, tentar extrair JSON do texto
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                dados = json_lib.loads(json_match.group())
            else:
                dados = {"raw_text": response}
        
        # Extrair CNPJ e Razão Social para atualizar a minuta
        cnpj = dados.get("empresa", {}).get("cnpj") if dados.get("empresa") else None
        razao_social = dados.get("empresa", {}).get("razao_social") if dados.get("empresa") else None
        
        # Salvar dados extraídos no banco
        await db.minutas.update_one(
            {"id": minuta_id},
            {"$set": {
                "dados_extraidos": dados,
                "cnpj": cnpj,
                "razao_social": razao_social,
                "status": "em_analise"
            }}
        )
        
        return {
            "success": True,
            "dados": dados,
            "cnpj": cnpj,
            "razao_social": razao_social
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Biblioteca de IA não disponível")
    except Exception as e:
        logger.error(f"Erro ao extrair dados: {str(e)}")
        # Retornar estrutura vazia para permitir preenchimento manual
        return {
            "success": False,
            "message": f"Não foi possível extrair dados automaticamente: {str(e)}",
            "dados": {
                "empresa": {},
                "socios": [],
                "clausulas": [],
                "cnaes": []
            }
        }

@api_router.get("/minutas", response_model=List[MinutaResponse])
async def list_minutas(current_user: dict = Depends(get_current_user)):
    minutas = await db.minutas.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0, "mensagens": 0}
    ).sort("numero_alteracao", -1).to_list(100)
    
    return [MinutaResponse(
        id=m["id"],
        tipo_alteracao=m["tipo_alteracao"],
        tipo_processo=m.get("tipo_processo"),
        descricao=m.get("descricao", ""),
        arquivo_original=m.get("arquivo_nome", ""),
        conteudo_gerado=m.get("conteudo_gerado"),
        status=m["status"],
        created_at=m["created_at"],
        cnpj=m.get("cnpj"),
        razao_social=m.get("razao_social"),
        numero_alteracao=m.get("numero_alteracao", 0)
    ) for m in minutas]

@api_router.get("/minutas/{minuta_id}")
async def get_minuta(minuta_id: str, current_user: dict = Depends(get_current_user)):
    minuta = await db.minutas.find_one(
        {"id": minuta_id, "user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    )
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    return minuta

@api_router.post("/minutas/{minuta_id}/chat")
async def chat_minuta(
    minuta_id: str,
    chat_data: ChatMessage,
    current_user: dict = Depends(get_current_user)
):
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Chave de API não configurada")
        
        system_message = """Você é um assistente jurídico especializado em direito societário brasileiro.
Sua função é analisar contratos sociais e documentos de suporte para gerar minutas de alteração contratual.

REGRAS OBRIGATÓRIAS:
1. NUNCA omita informações essenciais como NIRE, CNPJ, data de registro na Junta
2. SEMPRE inclua a qualificação COMPLETA dos sócios (nome, nacionalidade, estado civil, profissão, RG, CPF, endereço)
3. Na consolidação, MANTENHA todas as cláusulas originais que não foram alteradas
4. ALTERE APENAS as cláusulas específicas solicitadas pelo usuário

ESTRUTURA OBRIGATÓRIA DA MINUTA DE ALTERAÇÃO:

1. CABEÇALHO:
   - Nome completo: [NÚMERO]ª ALTERAÇÃO DO CONTRATO SOCIAL DE [RAZÃO SOCIAL]
   - CNPJ: [número completo]
   - NIRE: [número completo]
   - Registrado na [JUNTA COMERCIAL] em [DATA]

2. PREÂMBULO:
   - "Pelo presente instrumento particular de alteração contratual..."
   - Qualificação COMPLETA de TODOS os sócios (nome, nacionalidade, estado civil, profissão, RG com órgão emissor, CPF, endereço completo)

3. QUADRO SOCIETÁRIO ATUAL:
   - Lista de todos os sócios com participação e valor das quotas

4. CLÁUSULAS DE ALTERAÇÃO:
   - Apenas as cláusulas que estão sendo alteradas
   - Redação clara do que muda

5. CONSOLIDAÇÃO DO CONTRATO SOCIAL (se solicitado):
   - TODAS as cláusulas do contrato
   - Cláusulas não alteradas: manter texto ORIGINAL
   - Cláusulas alteradas: usar nova redação

6. ENCERRAMENTO:
   - Local e data
   - Espaço para assinatura de todos os sócios com nome e CPF

IMPORTANTE: Use os dados EXATAMENTE como extraídos do documento original. Não invente ou omita informações."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"minuta-{minuta_id}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Collect all files to attach (contrato + documentos de suporte)
        file_contents = []
        
        def get_mime_type(file_path):
            if file_path.endswith('.pdf'):
                return "application/pdf"
            elif file_path.endswith('.png'):
                return "image/png"
            elif file_path.endswith(('.jpg', '.jpeg')):
                return "image/jpeg"
            else:
                return "application/octet-stream"
        
        # Add main contract if exists
        if minuta.get("arquivo_original") and os.path.exists(minuta["arquivo_original"]):
            file_contents.append(FileContentWithMimeType(
                file_path=minuta["arquivo_original"],
                mime_type=get_mime_type(minuta["arquivo_original"])
            ))
        
        # Add support documents
        for doc in minuta.get("documentos_suporte", []):
            if doc.get("arquivo") and os.path.exists(doc["arquivo"]):
                file_contents.append(FileContentWithMimeType(
                    file_path=doc["arquivo"],
                    mime_type=get_mime_type(doc["arquivo"])
                ))
        
        # Build context from previous messages
        mensagens = minuta.get("mensagens", [])
        context = ""
        if mensagens:
            context = "\n\nHistórico da conversa:\n"
            for msg in mensagens[-5:]:
                context += f"Usuário: {msg.get('user', '')}\n"
                context += f"Assistente: {msg.get('assistant', '')}\n"
        
        # Add info about attached documents
        docs_info = ""
        if minuta.get("arquivo_original"):
            docs_info += f"\nContrato social anexado: {minuta.get('arquivo_nome', 'documento')}"
        if minuta.get("documentos_suporte"):
            docs_info += "\nDocumentos de suporte anexados:"
            for doc in minuta["documentos_suporte"]:
                docs_info += f"\n- {doc['tipo']}: {doc['nome']}"
        
        user_message = UserMessage(
            text=f"{context}{docs_info}\n\nNova mensagem do usuário: {chat_data.message}",
            file_contents=file_contents if file_contents else None
        )
        
        response = await chat.send_message(user_message)
        
        # Save message to history
        nova_mensagem = {
            "user": chat_data.message,
            "assistant": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.minutas.update_one(
            {"id": minuta_id},
            {
                "$push": {"mensagens": nova_mensagem},
                "$set": {"status": "em_analise"}
            }
        )
        
        return ChatResponse(response=response, minuta_id=minuta_id)
    except ImportError:
        # Fallback response if library not available
        response = f"""Recebi sua solicitação sobre: {chat_data.message}

Para o tipo de alteração "{minuta.get('tipo_alteracao', 'não especificado')}", 
irei preparar a minuta conforme solicitado.

Por favor, forneça mais detalhes sobre a alteração desejada."""
        
        nova_mensagem = {
            "user": chat_data.message,
            "assistant": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.minutas.update_one(
            {"id": minuta_id},
            {"$push": {"mensagens": nova_mensagem}}
        )
        
        return ChatResponse(response=response, minuta_id=minuta_id)
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        # Return a helpful fallback response instead of error
        tipo_alt = minuta.get('tipo_alteracao', 'alteração contratual')
        response = f"""Entendi sua solicitação: "{chat_data.message}"

Para a {tipo_alt}, vou auxiliá-lo na elaboração da minuta. 

Por favor, forneça os seguintes detalhes:
1. Dados completos da empresa (se não constar no documento)
2. Dados específicos da alteração que deseja realizar
3. Qualquer informação adicional relevante

Assim que tiver essas informações, poderei gerar a minuta de alteração."""
        
        nova_mensagem = {
            "user": chat_data.message,
            "assistant": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.minutas.update_one(
            {"id": minuta_id},
            {
                "$push": {"mensagens": nova_mensagem},
                "$set": {"status": "em_analise"}
            }
        )
        
        return ChatResponse(response=response, minuta_id=minuta_id)

@api_router.post("/minutas/{minuta_id}/gerar")
async def gerar_minuta(minuta_id: str, current_user: dict = Depends(get_current_user)):
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Chave de API não configurada")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"minuta-gen-{minuta_id}",
            system_message="Você é um advogado societário especialista em minutas contratuais. Gere documentos formais e completos."
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Build context
        mensagens = minuta.get("mensagens", [])
        historico = "\n".join([f"Usuário: {m['user']}\nAssistente: {m['assistant']}" for m in mensagens])
        
        prompt = f"""Com base no histórico de conversa abaixo, gere a minuta de alteração contratual completa.

Tipo de alteração: {minuta.get('tipo_alteracao', 'Alteração Contratual')}
Descrição: {minuta.get('descricao', '')}

Histórico:
{historico}

Gere a minuta completa no formato padrão de alteração contratual, incluindo:
1. Preâmbulo
2. Cláusulas de alteração
3. Consolidação
4. Encerramento"""

        file_contents = []
        if minuta.get("arquivo_original") and os.path.exists(minuta["arquivo_original"]):
            file_path = minuta["arquivo_original"]
            if file_path.endswith('.pdf'):
                mime_type = "application/pdf"
            else:
                mime_type = "image/jpeg"
            file_contents.append(FileContentWithMimeType(file_path=file_path, mime_type=mime_type))
        
        user_message = UserMessage(text=prompt, file_contents=file_contents if file_contents else None)
        conteudo = await chat.send_message(user_message)
        
        await db.minutas.update_one(
            {"id": minuta_id},
            {"$set": {"conteudo_gerado": conteudo, "status": "concluida"}}
        )
        
        return {"conteudo": conteudo, "status": "concluida"}
        
    except Exception as e:
        logger.error(f"Error generating minuta: {str(e)}")
        
        conteudo_fallback = f"""
ALTERAÇÃO DO CONTRATO SOCIAL

Tipo: {minuta.get('tipo_alteracao', 'Alteração Contratual')}

[Minuta gerada com base nas informações fornecidas]

{minuta.get('descricao', 'Sem descrição adicional')}

---
Esta é uma minuta preliminar. Revise e ajuste conforme necessário.
"""
        await db.minutas.update_one(
            {"id": minuta_id},
            {"$set": {"conteudo_gerado": conteudo_fallback, "status": "concluida"}}
        )
        
        return {"conteudo": conteudo_fallback, "status": "concluida"}

@api_router.delete("/minutas/{minuta_id}")
async def delete_minuta(minuta_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.minutas.delete_one({"id": minuta_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    return {"message": "Minuta removida com sucesso"}

# ============ TEMPLATES DE FORMATAÇÃO ============

TEMPLATES_DIR = UPLOAD_DIR / "templates"
TEMPLATES_DIR.mkdir(exist_ok=True)

class SecaoFormatacao(BaseModel):
    """Configuração de formatação de uma seção do documento"""
    id: str
    nome: str
    exemplo: str
    fonte: str = "Times New Roman"
    tamanho: str = "12"
    negrito: bool = False
    italico: bool = False
    alinhamento: str = "justify"
    nomeNegrito: Optional[bool] = None  # Específico para sócios

class ConfiguracaoFormatacao(BaseModel):
    """Configuração completa de formatação do documento"""
    secoes: List[SecaoFormatacao]
    margens: dict = {"superior": "2.5", "inferior": "2.5", "esquerda": "3.0", "direita": "2.0"}
    espacamento: str = "1.5"
    logoBase64: Optional[str] = None
    organizacaoInteligente: bool = True  # Evita quebras de página ruins

@api_router.post("/formatacao/salvar")
async def salvar_formatacao(
    config: ConfiguracaoFormatacao,
    current_user: dict = Depends(get_current_user)
):
    """Salva configuração de formatação manual do usuário"""
    formatacao_id = str(uuid.uuid4())
    
    # Converter para dict e salvar
    formatacao = {
        "id": formatacao_id,
        "user_id": current_user["id"],
        "secoes": [s.model_dump() for s in config.secoes],
        "margens": config.margens,
        "espacamento": config.espacamento,
        "logo_base64": config.logoBase64,
        "organizacao_inteligente": config.organizacaoInteligente,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert - atualiza se já existe para o usuário
    await db.formatacoes.update_one(
        {"user_id": current_user["id"]},
        {"$set": formatacao},
        upsert=True
    )
    
    return {"id": formatacao_id, "message": "Configuração salva com sucesso"}

@api_router.get("/formatacao")
async def get_formatacao(current_user: dict = Depends(get_current_user)):
    """Retorna configuração de formatação do usuário"""
    formatacao = await db.formatacoes.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    )
    return formatacao or {"secoes": [], "margens": {}, "espacamento": "1.5"}

@api_router.post("/formatacao/importar")
async def importar_formatacao_documento(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Importa formatação de um documento Word modelo.
    Analisa o documento e retorna as configurações extraídas para preencher o formulário.
    """
    from extrator_formatacao import extrair_formatacao_documento
    
    # Validar tipo de arquivo
    valid_types = ['.docx', '.doc']
    ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if ext not in valid_types:
        raise HTTPException(status_code=400, detail="Use arquivo Word (.docx)")
    
    # Salvar temporariamente
    temp_path = TEMPLATES_DIR / f"temp_import_{current_user['id']}{ext}"
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extrair formatação
        resultado = extrair_formatacao_documento(str(temp_path))
        
        return {
            "success": True,
            "message": "Formatação extraída com sucesso",
            "data": resultado
        }
    
    except Exception as e:
        logger.error(f"Erro ao importar formatação: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao analisar documento: {str(e)}")
    
    finally:
        # Remover arquivo temporário
        if os.path.exists(temp_path):
            os.remove(temp_path)

@api_router.post("/formatacao/logo")
async def upload_logo_formatacao(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de logo para formatação"""
    valid_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
    if file.content_type not in valid_types:
        raise HTTPException(status_code=400, detail="Use PNG, JPG ou GIF")
    
    # Salvar arquivo
    logo_id = str(uuid.uuid4())
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    file_path = TEMPLATES_DIR / f"logo_{current_user['id']}.{ext}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Converter para base64 para armazenar
    with open(file_path, "rb") as f:
        logo_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    # Atualizar formatação do usuário
    await db.formatacoes.update_one(
        {"user_id": current_user["id"]},
        {"$set": {
            "logo_base64": f"data:{file.content_type};base64,{logo_base64}",
            "logo_path": str(file_path),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Logo salvo com sucesso", "path": str(file_path)}

@api_router.post("/templates/upload")
async def upload_template(
    file: UploadFile = File(...),
    nome: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de template de formatação (Word ou PDF)"""
    valid_types = ['.docx', '.doc', '.pdf']
    ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if ext not in valid_types:
        raise HTTPException(status_code=400, detail="Formato inválido. Use .docx, .doc ou .pdf")
    
    template_id = str(uuid.uuid4())
    file_path = TEMPLATES_DIR / f"template_{template_id}{ext}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    template = {
        "id": template_id,
        "nome": nome,
        "arquivo": str(file_path),
        "arquivo_nome": file.filename,
        "tipo": ext[1:],  # docx, pdf
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.templates.insert_one(template)
    
    return {"id": template_id, "nome": nome, "tipo": ext[1:], "message": "Template salvo com sucesso"}

@api_router.get("/templates")
async def list_templates(current_user: dict = Depends(get_current_user)):
    """Lista templates do usuário"""
    templates = await db.templates.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    ).to_list(50)
    return templates

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Remove um template"""
    template = await db.templates.find_one({"id": template_id, "user_id": current_user["id"]})
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    # Remover arquivo
    if os.path.exists(template["arquivo"]):
        os.remove(template["arquivo"])
    
    await db.templates.delete_one({"id": template_id})
    return {"message": "Template removido"}

@api_router.get("/minutas/{minuta_id}/download/word")
async def download_minuta_word(minuta_id: str, current_user: dict = Depends(get_current_user)):
    """Gera e baixa a minuta em formato Word (.docx)"""
    from gerador_formatado import gerar_documento_formatado
    from template_manager import gerar_minuta_word
    
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    conteudo = minuta.get("conteudo_gerado")
    if not conteudo:
        raise HTTPException(status_code=400, detail="Minuta ainda não foi gerada")
    
    dados_extraidos = minuta.get("dados_extraidos", {})
    
    # PRIORIDADE 1: Verificar se usuário tem formatação manual configurada
    formatacao = await db.formatacoes.find_one({"user_id": current_user["id"]})
    
    if formatacao and formatacao.get("secoes") and len(formatacao.get("secoes", [])) > 0:
        # Usar gerador com formatação manual
        logger.info(f"Usando formatação manual para minuta {minuta_id}")
        doc_bytes = gerar_documento_formatado(conteudo, formatacao, dados_extraidos)
    else:
        # PRIORIDADE 2: Verificar se usuário tem template de arquivo
        template = await db.templates.find_one({"user_id": current_user["id"]})
        template_path = template["arquivo"] if template else None
        
        # Gerar documento Word com template de arquivo
        doc_bytes = gerar_minuta_word(conteudo, dados_extraidos, template_path)
    
    # Nome do arquivo
    cnpj = (minuta.get("cnpj") or "").replace(".", "").replace("/", "").replace("-", "")
    data_str = datetime.now().strftime("%Y%m%d")
    filename = f"alteracao_contratual_{cnpj or 'minuta'}_{data_str}.docx"
    
    return Response(
        content=doc_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@api_router.get("/minutas/{minuta_id}/download/pdf")
async def download_minuta_pdf(minuta_id: str, current_user: dict = Depends(get_current_user)):
    """Gera e baixa a minuta em formato PDF com formatação do template"""
    from jspdf_wrapper import gerar_pdf_simples
    
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    conteudo = minuta.get("conteudo_gerado")
    if not conteudo:
        raise HTTPException(status_code=400, detail="Minuta ainda não foi gerada")
    
    dados_extraidos = minuta.get("dados_extraidos", {})
    
    # Verificar se usuário tem formatação manual
    formatacao = await db.formatacoes.find_one({"user_id": current_user["id"]})
    formato = None
    
    if formatacao and formatacao.get("secoes"):
        # Converter formatação manual para formato esperado pelo PDF
        secoes = {s['id']: s for s in formatacao.get('secoes', [])}
        formato = {
            "fonte": {
                "nome": secoes.get('clausula_texto', {}).get('fonte', 'Times'),
                "tamanho": int(secoes.get('clausula_texto', {}).get('tamanho', 12))
            },
            "margens": formatacao.get('margens', {}),
            "espacamento": {"linha": float(formatacao.get('espacamento', 1.5))},
            "cabecalho": {"texto": [secoes.get('titulo', {}).get('exemplo', 'ALTERAÇÃO CONTRATUAL')]},
            "rodape": {"texto": [secoes.get('rodape', {}).get('exemplo', 'Documento gerado pelo Portal Societário')]},
            "logo_base64": formatacao.get('logo_base64')  # Incluir logo
        }
    else:
        # Tentar usar template de arquivo
        from template_manager import template_manager_fiel
        template = await db.templates.find_one({"user_id": current_user["id"]})
        
        if template and template.get("arquivo"):
            try:
                formato = template_manager_fiel.extrair_formatacao_completa(template["arquivo"])
            except Exception as e:
                logger.warning(f"Erro ao extrair formatação do template para PDF: {e}")
    
    # Gerar PDF
    pdf_bytes = gerar_pdf_simples(conteudo, dados_extraidos, formato)
    
    cnpj = (minuta.get("cnpj") or "").replace(".", "").replace("/", "").replace("-", "")
    data_str = datetime.now().strftime("%Y%m%d")
    filename = f"alteracao_contratual_{cnpj or 'minuta'}_{data_str}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Count certificates
    total_certificados = await db.certificados.count_documents({"user_id": user_id})
    
    # Count licenses by status
    licencas_ativas = await db.licencas.count_documents({"user_id": user_id, "status": "ativa"})
    licencas_vencidas = await db.licencas.count_documents({"user_id": user_id, "status": "vencida"})
    licencas_proximas = await db.licencas.count_documents({"user_id": user_id, "status": "proxima_vencimento"})
    total_licencas = await db.licencas.count_documents({"user_id": user_id})
    
    # Count minutas
    total_minutas = await db.minutas.count_documents({"user_id": user_id})
    minutas_pendentes = await db.minutas.count_documents({"user_id": user_id, "status": "pendente"})
    minutas_concluidas = await db.minutas.count_documents({"user_id": user_id, "status": "concluida"})
    
    return {
        "certificados": {
            "total": total_certificados
        },
        "licencas": {
            "total": total_licencas,
            "ativas": licencas_ativas,
            "vencidas": licencas_vencidas,
            "proximas_vencimento": licencas_proximas
        },
        "minutas": {
            "total": total_minutas,
            "pendentes": minutas_pendentes,
            "concluidas": minutas_concluidas
        }
    }

# ============ ENDPOINT DE BUSCA DE CEP ============

@api_router.get("/cep/{cep}")
async def buscar_cep(cep: str):
    """Busca endereço completo pelo CEP usando API ViaCEP (Correios)"""
    import httpx
    
    # Limpar CEP (remover pontos e hífens)
    cep_limpo = ''.join(filter(str.isdigit, cep))
    
    if len(cep_limpo) != 8:
        raise HTTPException(status_code=400, detail="CEP deve ter 8 dígitos")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://viacep.com.br/ws/{cep_limpo}/json/", timeout=10.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="CEP não encontrado")
            
            dados = response.json()
            
            if dados.get("erro"):
                raise HTTPException(status_code=404, detail="CEP não encontrado")
            
            # Retornar no formato padronizado dos Correios
            return {
                "success": True,
                "endereco": {
                    "cep": dados.get("cep", "").replace("-", ""),
                    "logradouro": dados.get("logradouro", ""),
                    "complemento": dados.get("complemento", ""),
                    "bairro": dados.get("bairro", ""),
                    "cidade": dados.get("localidade", ""),
                    "estado": dados.get("uf", ""),
                    "ibge": dados.get("ibge", ""),
                    "ddd": dados.get("ddd", "")
                }
            }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ao consultar CEP")
    except Exception as e:
        logger.error(f"Erro ao buscar CEP: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar CEP: {str(e)}")

@api_router.get("/cnpj/{cnpj}")
async def buscar_cnpj(cnpj: str):
    """Busca dados da empresa na Receita Federal pelo CNPJ"""
    import httpx
    
    # Limpar CNPJ (remover pontos, barras e hífens)
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    
    if len(cnpj_limpo) != 14:
        raise HTTPException(status_code=400, detail="CNPJ deve ter 14 dígitos")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://receitaws.com.br/v1/cnpj/{cnpj_limpo}",
                timeout=30.0,
                headers={"Accept": "application/json"}
            )
            
            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Limite de consultas excedido. Tente novamente em alguns segundos.")
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="CNPJ não encontrado")
            
            dados = response.json()
            
            if dados.get("status") == "ERROR":
                raise HTTPException(status_code=404, detail=dados.get("message", "CNPJ não encontrado"))
            
            # Formatar CNAEs
            cnaes = []
            
            # Atividade principal
            if dados.get("atividade_principal"):
                for ativ in dados["atividade_principal"]:
                    cnaes.append({
                        "codigo": ativ.get("code", ""),
                        "descricao": ativ.get("text", ""),
                        "principal": True
                    })
            
            # Atividades secundárias
            if dados.get("atividades_secundarias"):
                for ativ in dados["atividades_secundarias"]:
                    if ativ.get("code") and ativ.get("code") != "00.00-0-00":
                        cnaes.append({
                            "codigo": ativ.get("code", ""),
                            "descricao": ativ.get("text", ""),
                            "principal": False
                        })
            
            return {
                "success": True,
                "empresa": {
                    "cnpj": cnpj_limpo,
                    "razao_social": dados.get("nome", ""),
                    "nome_fantasia": dados.get("fantasia", ""),
                    "abertura": dados.get("abertura", ""),
                    "situacao": dados.get("situacao", ""),
                    "tipo": dados.get("tipo", ""),
                    "porte": dados.get("porte", ""),
                    "natureza_juridica": dados.get("natureza_juridica", ""),
                    "capital_social": dados.get("capital_social", ""),
                    "endereco": {
                        "logradouro": dados.get("logradouro", ""),
                        "numero": dados.get("numero", ""),
                        "complemento": dados.get("complemento", ""),
                        "bairro": dados.get("bairro", ""),
                        "cidade": dados.get("municipio", ""),
                        "estado": dados.get("uf", ""),
                        "cep": dados.get("cep", "").replace(".", "").replace("-", "")
                    },
                    "telefone": dados.get("telefone", ""),
                    "email": dados.get("email", "")
                },
                "cnaes": cnaes,
                "qsa": dados.get("qsa", [])
            }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ao consultar Receita Federal")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar CNPJ: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar CNPJ: {str(e)}")

# ============ ENDPOINTS DE CONSTITUIÇÃO ============

class DadosEmpresaConstituicao(BaseModel):
    razao_social: str
    nome_fantasia: Optional[str] = None
    capital_social: str
    capital_extenso: Optional[str] = None
    endereco: dict
    objeto_social: str

class SocioConstituicao(BaseModel):
    nome: str
    cpf: str
    rg: Optional[str] = None
    orgao_emissor: Optional[str] = None
    nacionalidade: Optional[str] = "Brasileiro(a)"
    estado_civil: Optional[str] = None
    regime_casamento: Optional[str] = None
    profissao: Optional[str] = None
    data_nascimento: Optional[str] = None
    cidade_nascimento: Optional[str] = None
    estado_nascimento: Optional[str] = None
    endereco: Optional[str] = None
    participacao: str
    administrador: bool = False

class ConstituicaoRequest(BaseModel):
    minuta_id: str
    empresa: DadosEmpresaConstituicao
    socios: List[SocioConstituicao]
    cnaes: List[str]

@api_router.post("/constituicao/extrair-campo")
async def extrair_campo_documento(
    file: UploadFile = File(...),
    campo: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Extrai um campo específico de um documento usando IA"""
    try:
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Determinar tipo de arquivo
        content_type = file.content_type or ''
        if 'pdf' in content_type:
            mime_type = 'application/pdf'
        elif 'image' in content_type:
            mime_type = content_type
        else:
            mime_type = 'application/octet-stream'
        
        prompts_por_campo = {
            'razao_social': 'Extraia apenas a RAZÃO SOCIAL (nome empresarial) deste documento. Retorne apenas o nome, em maiúsculas, sem explicações.',
            'nome_fantasia': 'Extraia apenas o NOME FANTASIA deste documento. Retorne apenas o nome, sem explicações.',
            'capital_social': 'Extraia apenas o VALOR DO CAPITAL SOCIAL deste documento. Retorne apenas o valor numérico formatado (ex: 100.000,00), sem explicações.',
            'endereco': 'Extraia o ENDEREÇO COMPLETO deste documento e retorne em formato JSON: {"logradouro": "", "numero": "", "complemento": "", "bairro": "", "cidade": "", "estado": "", "cep": ""}. Retorne apenas o JSON.',
            'cnaes': 'Extraia todos os CNAEs (Código Nacional de Atividades Econômicas) deste documento. Retorne uma lista JSON com os códigos e descrições: ["00.00-0-00 - Descrição"]. Retorne apenas o JSON.'
        }
        
        prompt = prompts_por_campo.get(campo, f'Extraia o campo "{campo}" deste documento.')
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        emergent_api_key = os.environ.get("EMERGENT_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        
        # Salvar arquivo temporariamente
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{mime_type.split('/')[-1]}") as tmp:
            tmp.write(base64.b64decode(file_base64))
            tmp_path = tmp.name
        
        chat = LlmChat(
            api_key=emergent_api_key,
            session_id=f"extract-campo-{campo}-{current_user['id']}",
            system_message="Você é um extrator de dados de documentos. Extraia apenas a informação solicitada."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text=prompt,
            file_contents=[FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)]
        )
        
        response = await chat.send_message(user_message)
        
        # Limpar arquivo temporário
        import os as os_module
        os_module.unlink(tmp_path)
        
        valor = response.strip()
        
        # Tentar parsear JSON se for endereco ou cnaes
        if campo in ['endereco', 'cnaes']:
            try:
                import json
                # Remover markdown se houver
                if '```' in valor:
                    valor = valor.split('```')[1]
                    if valor.startswith('json'):
                        valor = valor[4:]
                valor = json.loads(valor.strip())
                
                # Se for endereço e tiver CEP, consultar os Correios para atualizar logradouro
                if campo == 'endereco' and isinstance(valor, dict) and valor.get('cep'):
                    import httpx
                    cep_limpo = ''.join(filter(str.isdigit, str(valor.get('cep', ''))))
                    if len(cep_limpo) == 8:
                        try:
                            async with httpx.AsyncClient() as client:
                                cep_response = await client.get(f"https://viacep.com.br/ws/{cep_limpo}/json/", timeout=5.0)
                                if cep_response.status_code == 200:
                                    dados_correios = cep_response.json()
                                    if not dados_correios.get("erro"):
                                        # Atualizar com dados oficiais dos Correios
                                        valor['logradouro'] = dados_correios.get('logradouro', valor.get('logradouro', ''))
                                        valor['bairro'] = dados_correios.get('bairro', valor.get('bairro', ''))
                                        valor['cidade'] = dados_correios.get('localidade', valor.get('cidade', ''))
                                        valor['estado'] = dados_correios.get('uf', valor.get('estado', ''))
                                        valor['cep'] = dados_correios.get('cep', valor.get('cep', '')).replace('-', '')
                                        logger.info(f"Endereço atualizado via Correios para CEP {cep_limpo}")
                        except Exception as e:
                            logger.warning(f"Não foi possível consultar CEP nos Correios: {str(e)}")
            except:
                pass
        
        return {"success": True, "valor": valor}
        
    except Exception as e:
        logger.error(f"Erro ao extrair campo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/constituicao/extrair-socio")
async def extrair_dados_socio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Extrai dados do sócio de um documento (CNH, RG, etc) usando IA"""
    try:
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Determinar tipo de arquivo
        content_type = file.content_type or ''
        if 'pdf' in content_type:
            mime_type = 'application/pdf'
        elif 'image' in content_type:
            mime_type = content_type
        else:
            mime_type = 'application/octet-stream'
        
        prompt = """Analise este documento (CNH, RG, comprovante de endereço ou certidão) e extraia os dados pessoais.

Retorne APENAS um JSON válido no seguinte formato:
{
    "nome": "NOME COMPLETO EM MAIÚSCULAS",
    "cpf": "000.000.000-00",
    "rg": "00.000.000-0",
    "orgao_emissor": "SSP/UF",
    "nacionalidade": "Brasileiro(a)",
    "data_nascimento": "YYYY-MM-DD",
    "cidade_nascimento": "Nome da cidade de nascimento",
    "estado_nascimento": "UF (sigla do estado de nascimento, ex: SP, RJ, MG)",
    "estado_civil": "Solteiro(a)/Casado(a)/Divorciado(a)/Viúvo(a)",
    "profissao": "Profissão se disponível",
    "endereco": "Endereço completo se disponível"
}

IMPORTANTE:
- data_nascimento deve estar no formato YYYY-MM-DD (ano-mês-dia)
- cidade_nascimento é a cidade onde a pessoa nasceu (naturalidade)
- estado_nascimento é a sigla do estado onde a pessoa nasceu (ex: SP, RJ, MG)
- Se algum campo não for encontrado no documento, use null.
NÃO inclua explicações, apenas o JSON."""
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        emergent_api_key = os.environ.get("EMERGENT_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        
        # Salvar arquivo temporariamente
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{mime_type.split('/')[-1]}") as tmp:
            tmp.write(base64.b64decode(file_base64))
            tmp_path = tmp.name
        
        chat = LlmChat(
            api_key=emergent_api_key,
            session_id=f"extract-socio-{current_user['id']}",
            system_message="Você é um extrator de dados de documentos pessoais. Extraia as informações e retorne apenas JSON."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text=prompt,
            file_contents=[FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)]
        )
        
        response = await chat.send_message(user_message)
        
        # Limpar arquivo temporário
        import os as os_module
        os_module.unlink(tmp_path)
        
        # Parsear JSON
        valor = response.strip()
        try:
            import json
            # Remover markdown se houver
            if '```' in valor:
                valor = valor.split('```')[1]
                if valor.startswith('json'):
                    valor = valor[4:]
            dados = json.loads(valor.strip())
            return {"success": True, "dados": dados}
        except:
            return {"success": False, "error": "Não foi possível extrair os dados"}
        
    except Exception as e:
        logger.error(f"Erro ao extrair dados do sócio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/constituicao/gerar-objeto-social")
async def gerar_objeto_social(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Gera o objeto social baseado nos CNAEs fornecidos"""
    try:
        cnaes = request.get('cnaes', [])
        
        if not cnaes:
            raise HTTPException(status_code=400, detail="Nenhum CNAE fornecido")
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_api_key = os.environ.get("EMERGENT_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        
        cnaes_texto = "\n".join([f"- {cnae}" for cnae in cnaes])
        
        system_message = """Você é um especialista em direito societário brasileiro. 
Sua tarefa é elaborar objetos sociais completos e profissionais para contratos sociais de empresas.
Use linguagem jurídica formal e adequada para registro em Junta Comercial."""

        prompt = f"""Com base nos seguintes CNAEs, elabore um OBJETO SOCIAL completo e profissional:

CNAEs:
{cnaes_texto}

REGRAS:
1. Use linguagem jurídica formal
2. O texto deve ser em parágrafo único, sem bullets ou numeração
3. Deve cobrir todas as atividades dos CNAEs
4. Inclua termos como "compreende", "prestação de serviços", "comércio", conforme aplicável
5. Finalize com "bem como a prática de todos os atos comerciais necessários à consecução do objeto social"
6. NÃO inclua os códigos CNAE no texto, apenas as atividades descritas

Retorne APENAS o texto do objeto social, sem explicações ou comentários."""

        chat = LlmChat(
            api_key=emergent_api_key,
            session_id=f"objeto-social-{current_user['id']}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {"success": True, "objeto_social": response.strip()}
        
    except Exception as e:
        logger.error(f"Erro ao gerar objeto social: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/constituicao/gerar-contrato")
async def gerar_contrato_constituicao(
    request: ConstituicaoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Gera o contrato social completo de constituição"""
    try:
        empresa = request.empresa
        socios = request.socios
        cnaes = request.cnaes
        
        # Formatar endereço
        end = empresa.endereco
        endereco_completo = f"{end.get('logradouro', '').upper()}, Nº {end.get('numero', '')}"
        if end.get('complemento'):
            endereco_completo += f", {end['complemento'].upper()}"
        endereco_completo += f", {end.get('bairro', '').upper()}, {end.get('cidade', '').upper()}/{end.get('estado', '').upper()}"
        if end.get('cep'):
            endereco_completo += f", CEP: {end['cep']}"
        
        # Formatar qualificação de cada sócio
        socios_qualificacao = ""
        for socio in socios:
            qualif = f"{socio.nome.upper()}, nacionalidade: {socio.nacionalidade or 'brasileira'}"
            # Naturalidade (cidade/estado de nascimento)
            if socio.cidade_nascimento and socio.estado_nascimento:
                qualif += f", natural de {socio.cidade_nascimento}/{socio.estado_nascimento}"
            elif socio.cidade_nascimento:
                qualif += f", natural de {socio.cidade_nascimento}"
            # Data de nascimento formatada
            if socio.data_nascimento:
                try:
                    from datetime import datetime as dt
                    data_obj = dt.strptime(socio.data_nascimento, "%Y-%m-%d")
                    data_formatada = data_obj.strftime("%d/%m/%Y")
                    qualif += f", nascido(a) em {data_formatada}"
                except:
                    qualif += f", nascido(a) em {socio.data_nascimento}"
            if socio.estado_civil:
                qualif += f", {socio.estado_civil.lower()}"
                if socio.regime_casamento and 'casado' in socio.estado_civil.lower():
                    qualif += f" sob o regime de {socio.regime_casamento}"
            if socio.profissao:
                qualif += f", {socio.profissao.lower()}"
            if socio.rg:
                qualif += f", portador(a) da Cédula de Identidade RG nº {socio.rg}"
                if socio.orgao_emissor:
                    qualif += f" {socio.orgao_emissor}"
            qualif += f", inscrito(a) no CPF/MF sob o nº {socio.cpf}"
            if socio.endereco:
                qualif += f", residente e domiciliado(a) na {socio.endereco}"
            qualif += ".\n\n"
            socios_qualificacao += qualif
        
        # Determinar administradores
        administradores = [s for s in socios if s.administrador]
        if not administradores:
            administradores = [socios[0]]
        
        # Calcular capital e quotas
        capital_valor = float(empresa.capital_social.replace('.', '').replace(',', '.'))
        qtd_quotas_total = int(capital_valor)
        
        # Tabela de quotas
        tabela_quotas = ""
        for socio in socios:
            perc = float(socio.participacao)
            valor = capital_valor * perc / 100
            qtd_quotas = int(capital_valor * perc / 100)
            tabela_quotas += f"{socio.nome.upper()} | {perc:.0f}% | {qtd_quotas:,} quotas | R$ {valor:,.2f}\n"
        # Linha de TOTAL
        tabela_quotas += f"TOTAL | 100% | {qtd_quotas_total:,} quotas | R$ {capital_valor:,.2f}\n"
        
        # Assinaturas
        assinaturas = ""
        for socio in socios:
            assinaturas += f"\n______________________________\n{socio.nome.upper()}\n"
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_api_key = os.environ.get("EMERGENT_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        
        data_atual = datetime.now().strftime("%d de %B de %Y").replace(
            'January', 'janeiro').replace('February', 'fevereiro').replace('March', 'março'
        ).replace('April', 'abril').replace('May', 'maio').replace('June', 'junho'
        ).replace('July', 'julho').replace('August', 'agosto').replace('September', 'setembro'
        ).replace('October', 'outubro').replace('November', 'novembro').replace('December', 'dezembro')
        
        # Verificar se é sociedade unipessoal ou com múltiplos sócios
        eh_unipessoal = len(socios) == 1
        
        if eh_unipessoal:
            admin_texto = f"ao sócio {administradores[0].nome.upper()}"
            admin_plural = "sócio administrador"
            sócio_plural = "O sócio declara"
            assinatura_plural = "assina o presente instrumento"
        else:
            if len(administradores) == len(socios):
                admin_texto = "AMBOS OS SÓCIOS"
            else:
                admin_texto = ", ".join([a.nome.upper() for a in administradores])
            admin_plural = "sócios administradores"
            sócio_plural = "Os sócios declaram"
            assinatura_plural = "assinam o presente instrumento"
        
        system_message = """Você é um advogado especialista em direito societário brasileiro.
Gere contratos sociais completos e profissionais para registro em Junta Comercial.
Use linguagem jurídica formal. NÃO use Markdown."""

        prompt = f"""Gere um ATO CONSTITUTIVO DE SOCIEDADE EMPRESÁRIA LIMITADA seguindo EXATAMENTE este modelo:

ATO CONSTITUTIVO DE SOCIEDADE EMPRESÁRIA LIMITADA

{empresa.razao_social.upper()}

{socios_qualificacao}
Pelo presente instrumento particular tem entre si justo e contratado a Constituição de uma Sociedade Empresária Limitada que se regerá pelas cláusulas e condições seguintes e nas omissões pela legislação específica que disciplina essa forma societária.

CLÁUSULA PRIMEIRA – DA DENOMINAÇÃO
A sociedade, constituída sob a forma de sociedade empresária limitada, adotará o nome empresarial de {empresa.razao_social.upper()} que será regida por este instrumento de constituição.

CLÁUSULA SEGUNDA – DA SEDE SOCIAL
A sociedade empresária limitada terá sua sede na {endereco_completo}.

CLÁUSULA TERCEIRA – DO OBJETO SOCIAL
A empresa tem como objeto social: {empresa.objeto_social}

Parágrafo Único – {sócio_plural} expressamente que explora{"" if eh_unipessoal else "m"} atividade econômica organizada sendo, portanto, uma sociedade limitada nos termos do Art. 966 do Código Civil.

CLÁUSULA QUARTA – DA DURAÇÃO
A empresa iniciará suas atividades na data da assinatura deste contrato e seu prazo de duração é indeterminado.

CLÁUSULA QUINTA – DO CAPITAL SOCIAL
O capital social é na importância de R$ {empresa.capital_social} ({empresa.capital_extenso or 'por extenso'}) divididos em {qtd_quotas_total:,} ({empresa.capital_extenso or 'por extenso'}) quotas de valor unitário de R$ 1,00 (Um Real) cada, totalmente subscritas e integralizadas em moeda corrente nacional do país, assim distribuído entre os sócios:

{tabela_quotas}

Parágrafo Primeiro – A responsabilidade do{"s sócios é" if not eh_unipessoal else " sócio é"} restrita ao valor de suas quotas, não havendo responsabilidade solidária pelas obrigações sociais, respondendo, no entanto, pela integralização do capital social.

Parágrafo Segundo – Sobre as quotas acima, pesa a cláusula restritiva de incomunicabilidade e impenhorabilidade.

CLÁUSULA SEXTA – DA ADMINISTRAÇÃO
A administração da sociedade limitada{"" if not eh_unipessoal else " unipessoal"} cabe {admin_texto}, com poderes e atribuições de representá-lo ativa e passivamente, com juízo ou fora dele, em todos os atos e termos da via mercantil, autorizado o uso do nome empresarial, vedada, no entanto, em atividades estranhas ao interesse social ou assumir obrigações seja em favor de qualquer dos quotistas ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade, sem autorização.

Parágrafo Primeiro – Ao{"s" if not eh_unipessoal else ""} {admin_plural} compete{"m" if not eh_unipessoal else ""} o uso da firma e a representação da sociedade, podendo para tanto realizar {"em conjunto ou isoladamente " if not eh_unipessoal else "individualmente "}todos os atos necessários ou convenientes para gerenciar, dirigir e orientar os negócios da sociedade e os assuntos relacionados à mesma, podendo abrir, encerrar e movimentar contas bancárias, assumir obrigações, assinar e celebrar contratos, firmar compromissos profissionais de âmbito nacional ou internacional, confessar dívidas, fazer acordos, transigir, renunciar, desistir, adquirir, alienar e onerar bens imóveis, representar a sociedade perante terceiros, no Brasil ou no exterior e perante repartições públicas federais, estaduais, e municipais, autarquias, sociedades de economia mista, estabelecimentos bancários, instituições financeiras, Caixas Econômicas, e respectivas agências, filiais, sucursais ou correspondentes, bem como para representar a sociedade ativa e passivamente, em juízo e fora dele, podendo ainda, constituir mandatários e outorgar procurações com poderes específicos.

Parágrafo Segundo – Faculta-se ao{"s" if not eh_unipessoal else ""} {admin_plural}, nos limites de seus poderes, constituir procuradores em nome da sociedade, devendo ser especificados no instrumento de mandado, os atos e operações que poderão praticar e a duração do mandado, que, no caso de mandado judicial, poderá ser por prazo indeterminado.

CLÁUSULA SÉTIMA – DO PRÓ-LABORE
O{"s" if not eh_unipessoal else ""} {admin_plural} poderá{"ão" if not eh_unipessoal else ""} fixar uma retirada mensal, a título de "Pró-Labore", observadas as disposições regulamentares pertinentes.

CLÁUSULA OITAVA – DO DESIMPEDIMENTO
O{"s" if not eh_unipessoal else ""} {admin_plural} declara{"m" if not eh_unipessoal else ""} sob as penas da lei, não estar incurso em nenhum dos crimes previstos em lei que o{"s" if not eh_unipessoal else ""} impeça de exercer a administração da sociedade em virtude de condenação criminal, nem está sendo processado nem condenado em crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra o sistema financeiro nacional, contra as normas de defesa da concorrência, contra as relações de consumo e a fé pública ou a propriedade.

CLÁUSULA NONA – DA ABERTURA DE FILIAIS
Esta sociedade poderá a qualquer tempo, abrir e encerrar filiais, agências e escritórios, em qualquer parte do território nacional ou no exterior mediante alteração contratual assinada pelo{"s sócios" if not eh_unipessoal else " sócio"}.

CLÁUSULA DÉCIMA – DO EXERCÍCIO SOCIAL E BALANÇO PATRIMONIAL
Ao término de cada exercício social, em 31 de dezembro, será procedido à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico, cabendo ao{"s sócios" if not eh_unipessoal else " sócio"}, os lucros ou perdas apuradas.

{"Parágrafo Primeiro – A sociedade deliberará em reunião dos sócios, devidamente convocada, a respeito da distribuição dos resultados, desproporcional aos percentuais de participação do quadro societário, segundo autoriza o artigo 1.007 da Lei nº 10.406/2002." if not eh_unipessoal else "Parágrafo Único – Fica a sociedade limitada unipessoal autorizada a levantar balanços ou balancetes intermediários em qualquer período do ano calendário, observadas as disposições legais, podendo inclusive, distribuir os resultados se houver e se for de interesse do titular, inclusive a obrigação da reposição dos lucros, se os mesmos forem distribuídos com prejuízo do capital."}

{"Parágrafo Segundo – Fica a sociedade autorizada a distribuir antecipadamente lucros do exercício, com base em levantamento de balanço intermediário, observada a reposição de lucros quando a distribuição afetar o capital social, conforme estabelece o artigo 1.059 da Lei nº 10.406/2002." if not eh_unipessoal else ""}

CLÁUSULA DÉCIMA PRIMEIRA – RESOLUÇÃO DAS QUOTAS EM RELAÇÃO À SOCIEDADE
Falecendo ou interditado o{"s sócios" if not eh_unipessoal else " sócio"}, a empresa continuará suas atividades com os herdeiros, sucessores e/ou sucessores do incapaz. Não sendo possível ou inexistindo interesse destes, o valor de seus haveres será apurado liquidado com base na situação patrimonial da empresa, à data da resolução, verificada em balanço especialmente levantado.

CLÁUSULA DÉCIMA SEGUNDA – DA DISSOLUÇÃO E LIQUIDAÇÃO DA SOCIEDADE
A sociedade poderá ser dissolvida por iniciativa do{"s sócios" if not eh_unipessoal else " sócio"}, que, nessa hipótese, realizará diretamente a liquidação ou indicará um liquidante, ditando-lhe a forma de liquidação. Solvidas as dívidas e extintas as obrigações da sociedade, o patrimônio remanescente será integralmente incorporado ao patrimônio dos sócios.

CLÁUSULA DÉCIMA TERCEIRA – FORO DE ELEIÇÃO
Fica eleito o foro da comarca de {end.get('cidade', 'São Paulo')}/{end.get('estado', 'SP')}, para o exercício e o cumprimento dos direitos e obrigações resultantes do presente deste contrato, com exclusão de qualquer outro, seja qual for ou vier a ser o futuro domicílio do{"s sócios" if not eh_unipessoal else " sócio"}.

E, por estar{"em" if not eh_unipessoal else ""} assim, justo{"s" if not eh_unipessoal else ""} e contratado{"s" if not eh_unipessoal else ""}, {assinatura_plural}.

{end.get('cidade', 'São Paulo')}/{end.get('estado', 'SP')}, {data_atual}.
{assinaturas}

IMPORTANTE: Gere o documento COMPLETO seguindo EXATAMENTE a estrutura acima. NÃO adicione testemunhas."""

        chat = LlmChat(
            api_key=emergent_api_key,
            session_id=f"contrato-{request.minuta_id}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        contrato = response.strip()
        
        # Salvar na minuta
        await db.minutas.update_one(
            {"id": request.minuta_id},
            {
                "$set": {
                    "tipo_processo": "constituicao",
                    "razao_social": empresa.razao_social,
                    "nome_empresa": empresa.razao_social,
                    "conteudo_gerado": contrato,
                    "dados_empresa": empresa.dict(),
                    "dados_socios": [s.dict() for s in socios],
                    "cnaes": cnaes,
                    "status": "concluida",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "success": True, 
            "contrato": contrato,
            "minuta_id": request.minuta_id
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar contrato: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ ENDPOINTS DE BAIXA (DISTRATO) ============

class DadosBaixa(BaseModel):
    motivo: str
    motivo_detalhado: Optional[str] = None
    data_encerramento: str
    destinacao_acervo: Optional[str] = None
    declaracao_quitacao: bool = True
    distribuicao_patrimonio: Optional[str] = None
    responsavel_guarda: str
    prazo_guarda: str = "5 anos"

class DadosEmpresaBaixa(BaseModel):
    razao_social: str
    cnpj: str
    nire: Optional[str] = None
    capital_social: Optional[str] = None
    data_registro: Optional[str] = None
    junta_comercial: Optional[str] = None
    endereco: Optional[str] = None

class SocioBaixa(BaseModel):
    nome: str
    cpf: str
    rg: Optional[str] = None
    orgao_emissor: Optional[str] = None
    nacionalidade: Optional[str] = "Brasileiro(a)"
    estado_civil: Optional[str] = None
    regime_casamento: Optional[str] = None
    profissao: Optional[str] = None
    endereco: Optional[str] = None
    participacao: Optional[str] = None

class BaixaRequest(BaseModel):
    minuta_id: str
    empresa: DadosEmpresaBaixa
    socios: List[SocioBaixa]
    baixa: DadosBaixa

@api_router.post("/baixa/extrair-contrato")
async def extrair_contrato_para_baixa(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Extrai dados do contrato social para preencher o distrato"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        import tempfile
        import json as json_lib
        
        emergent_api_key = os.environ.get("EMERGENT_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        
        # Salvar arquivo temporariamente
        content_type = file.content_type or ''
        if 'pdf' in content_type:
            mime_type = 'application/pdf'
            suffix = '.pdf'
        elif 'image' in content_type:
            mime_type = content_type
            suffix = '.jpg'
        else:
            mime_type = 'application/octet-stream'
            suffix = '.pdf'
        
        file_content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        system_message = """Você é um especialista em análise de contratos sociais brasileiros.
Sua tarefa é extrair TODAS as informações do contrato para preencher um distrato social.

SEMPRE responda APENAS com JSON válido, sem markdown.
Estrutura:

{
    "empresa": {
        "razao_social": "Nome completo da empresa",
        "cnpj": "00.000.000/0000-00",
        "nire": "Número NIRE",
        "capital_social": "R$ 0.000,00",
        "data_registro": "DD/MM/AAAA",
        "junta_comercial": "Nome da Junta",
        "endereco": {
            "logradouro": "Rua/Av",
            "numero": "123",
            "complemento": "",
            "bairro": "Bairro",
            "cidade": "Cidade",
            "estado": "UF",
            "cep": "00000-000"
        }
    },
    "socios": [
        {
            "nome": "NOME COMPLETO",
            "cpf": "000.000.000-00",
            "rg": "00.000.000-0",
            "orgao_emissor": "SSP/UF",
            "nacionalidade": "Brasileiro(a)",
            "estado_civil": "Casado(a)/Solteiro(a)",
            "regime_casamento": "Se casado",
            "profissao": "Profissão",
            "endereco": "Endereço completo",
            "participacao": "50%"
        }
    ]
}

Se algum campo não for encontrado, use null."""

        chat = LlmChat(
            api_key=emergent_api_key,
            session_id=f"baixa-extract-{current_user['id']}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text="Extraia todos os dados deste contrato social para preenchimento do distrato. Retorne APENAS JSON.",
            file_contents=[FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)]
        )
        
        response = await chat.send_message(user_message)
        
        # Limpar arquivo temporário
        import os as os_module
        os_module.unlink(tmp_path)
        
        # Parsear JSON
        try:
            json_str = response.strip()
            if '```' in json_str:
                json_str = json_str.split('```')[1]
                if json_str.startswith('json'):
                    json_str = json_str[4:]
            dados = json_lib.loads(json_str.strip())
        except:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                dados = json_lib.loads(json_match.group())
            else:
                dados = {}
        
        # Consultar CEP nos Correios para atualizar endereço da empresa
        if dados.get('empresa') and dados['empresa'].get('endereco'):
            endereco = dados['empresa']['endereco']
            cep = endereco.get('cep') if isinstance(endereco, dict) else None
            if cep:
                import httpx
                cep_limpo = ''.join(filter(str.isdigit, str(cep)))
                if len(cep_limpo) == 8:
                    try:
                        async with httpx.AsyncClient() as client:
                            cep_response = await client.get(f"https://viacep.com.br/ws/{cep_limpo}/json/", timeout=5.0)
                            if cep_response.status_code == 200:
                                dados_correios = cep_response.json()
                                if not dados_correios.get("erro"):
                                    endereco['logradouro'] = dados_correios.get('logradouro', endereco.get('logradouro', ''))
                                    endereco['bairro'] = dados_correios.get('bairro', endereco.get('bairro', ''))
                                    endereco['cidade'] = dados_correios.get('localidade', endereco.get('cidade', ''))
                                    endereco['estado'] = dados_correios.get('uf', endereco.get('estado', ''))
                                    endereco['cep'] = dados_correios.get('cep', endereco.get('cep', '')).replace('-', '')
                                    logger.info(f"Endereço da empresa atualizado via Correios")
                    except Exception as e:
                        logger.warning(f"Não foi possível consultar CEP nos Correios: {str(e)}")
        
        return {"success": True, "dados": dados}
        
    except Exception as e:
        logger.error(f"Erro ao extrair contrato para baixa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/baixa/gerar-distrato")
async def gerar_distrato_social(
    request: BaixaRequest,
    current_user: dict = Depends(get_current_user)
):
    """Gera o distrato social completo usando IA"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_api_key = os.environ.get("EMERGENT_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        
        empresa = request.empresa
        socios = request.socios
        baixa = request.baixa
        
        # Formatar motivo
        motivos_map = {
            'vontade_socios': 'por deliberação unânime dos sócios',
            'termino_prazo': 'pelo término do prazo de duração',
            'falencia': 'por decretação de falência',
            'incorporacao': 'por incorporação por outra sociedade',
            'fusao': 'por fusão com outra sociedade',
            'cisao_total': 'por cisão total',
            'inatividade': 'por inatividade prolongada',
            'outros': baixa.motivo_detalhado or 'por outros motivos'
        }
        motivo_texto = motivos_map.get(baixa.motivo, baixa.motivo)
        
        # Formatar data
        try:
            from datetime import datetime as dt
            data_obj = dt.strptime(baixa.data_encerramento, '%Y-%m-%d')
            data_formatada = data_obj.strftime('%d de %B de %Y').replace('January', 'janeiro').replace('February', 'fevereiro').replace('March', 'março').replace('April', 'abril').replace('May', 'maio').replace('June', 'junho').replace('July', 'julho').replace('August', 'agosto').replace('September', 'setembro').replace('October', 'outubro').replace('November', 'novembro').replace('December', 'dezembro')
        except:
            data_formatada = baixa.data_encerramento
        
        # Montar qualificação dos sócios
        socios_qualificados = []
        for s in socios:
            qualif = f"{s.nome}, {s.nacionalidade or 'brasileiro(a)'}, {s.estado_civil or 'estado civil não informado'}"
            if s.regime_casamento:
                qualif += f", pelo regime de {s.regime_casamento}"
            qualif += f", {s.profissao or 'profissão não informada'}"
            if s.rg:
                qualif += f", portador(a) da Cédula de Identidade RG nº {s.rg}"
                if s.orgao_emissor:
                    qualif += f" {s.orgao_emissor}"
            qualif += f", inscrito(a) no CPF sob nº {s.cpf}"
            if s.endereco:
                qualif += f", residente e domiciliado(a) em {s.endereco}"
            socios_qualificados.append(qualif)
        
        # Data atual formatada
        data_atual = datetime.now().strftime("%d de %B de %Y").replace(
            'January', 'janeiro').replace('February', 'fevereiro').replace('March', 'março'
        ).replace('April', 'abril').replace('May', 'maio').replace('June', 'junho'
        ).replace('July', 'julho').replace('August', 'agosto').replace('September', 'setembro'
        ).replace('October', 'outubro').replace('November', 'novembro').replace('December', 'dezembro')
        
        # Gerar qualificação completa de cada sócio
        qualificacao_socios = ""
        for i, s in enumerate(socios, 1):
            qualif = f"{i}) {s.nome.upper()}, nacionalidade: {s.nacionalidade or 'brasileira'}"
            # Naturalidade (cidade/estado de nascimento)
            cidade_nasc = getattr(s, 'cidade_nascimento', None)
            estado_nasc = getattr(s, 'estado_nascimento', None)
            if cidade_nasc and estado_nasc:
                qualif += f", natural de {cidade_nasc}/{estado_nasc}"
            elif cidade_nasc:
                qualif += f", natural de {cidade_nasc}"
            # data_nascimento formatada
            data_nasc = getattr(s, 'data_nascimento', None)
            if data_nasc:
                try:
                    data_obj = dt.strptime(data_nasc, "%Y-%m-%d")
                    data_nasc_formatada = data_obj.strftime("%d/%m/%Y")
                    qualif += f", nascido(a) em {data_nasc_formatada}"
                except:
                    qualif += f", nascido(a) em {data_nasc}"
            if s.estado_civil:
                qualif += f", {s.estado_civil.lower()}"
                if s.regime_casamento and 'casado' in s.estado_civil.lower():
                    qualif += f" sob o regime de {s.regime_casamento}"
            if s.profissao:
                qualif += f", {s.profissao.lower()}"
            if s.rg:
                qualif += f", portador(a) da Cédula de Identidade RG nº {s.rg}"
                if s.orgao_emissor:
                    qualif += f" {s.orgao_emissor}"
            qualif += f", inscrito(a) no CPF/MF sob o nº {s.cpf}"
            if s.endereco:
                qualif += f", residente e domiciliado(a) na {s.endereco}"
            qualif += ";\n"
            qualificacao_socios += qualif
        
        # Assinaturas
        assinaturas = ""
        for s in socios:
            assinaturas += f"\n______________________________\n{s.nome.upper()}\nCPF : {s.cpf}\n"
        
        # Calcular patrimônio por sócio se houver
        patrimonio_distribuicao = ""
        if baixa.distribuicao_patrimonio:
            patrimonio_distribuicao = baixa.distribuicao_patrimonio
        else:
            for s in socios:
                if hasattr(s, 'participacao') and s.participacao:
                    patrimonio_distribuicao += f"{s.nome.upper()} - {s.participacao}%\n"
        
        prompt = f"""Gere um DISTRATO SOCIAL seguindo EXATAMENTE este modelo:

DISTRATO SOCIAL
{empresa.razao_social.upper()}

{qualificacao_socios}
Únicos componentes da sociedade empresária limitada denominada {empresa.razao_social.upper()}, com sede na {empresa.endereco or '[ENDEREÇO]'}, inscrita no CNPJ/MF sob o nº {empresa.cnpj}, e registrada na Junta Comercial {empresa.junta_comercial or 'do Estado'} sob o nº {empresa.nire or '[NIRE]'}, em {empresa.data_registro or '[DATA]'}, resolvem de comum acordo, dar por desfeita a sociedade que mantêm, declarando o que segue:

CLÁUSULA PRIMEIRA – DA DISSOLUÇÃO DA SOCIEDADE
Os sócios, por livre e espontânea vontade, resolvem {motivo_texto}, na forma do art. 1.033, inciso II, combinado com os arts. 1.087 do Código Civil brasileiro (Lei nº 10.406/2002), encerrando-se, dessa maneira, toda a atividade.

CLÁUSULA SEGUNDA – DA CESSAÇÃO DAS ATIVIDADES
A cessação das atividades ocorreu em {data_formatada}.

CLÁUSULA TERCEIRA – DO ACERVO CONTÁBIL
{baixa.destinacao_acervo or 'Os livros e documentos contábeis ficarão sob a guarda e responsabilidade do sócio indicado, pelo prazo legal.'}

CLÁUSULA QUARTA – DO PASSIVO SOCIAL
{"Os sócios declaram, sob as penas da lei, que a sociedade não possui qualquer débito ou obrigação pendente de pagamento perante terceiros, trabalhadores, fornecedores, instituições financeiras, Fazenda Pública Federal, Estadual ou Municipal, INSS e FGTS, assumindo a responsabilidade por eventuais débitos que venham a ser apurados posteriormente." if baixa.declaracao_quitacao else "Eventuais débitos existentes serão quitados pelos sócios na proporção de suas participações societárias."}

CLÁUSULA QUINTA – DO PATRIMÔNIO REMANESCENTE
{patrimonio_distribuicao if patrimonio_distribuicao else "O patrimônio líquido remanescente, se houver, será dividido entre os sócios na proporção de suas quotas."}

CLÁUSULA SEXTA – DA RESPONSABILIDADE DOS SÓCIOS
Os sócios assumem a responsabilidade solidária por quaisquer obrigações que porventura venham a ser identificadas e que sejam de responsabilidade da sociedade ora extinta, respondendo cada qual na proporção de sua participação no capital social.

CLÁUSULA SÉTIMA – DA GUARDA DOS DOCUMENTOS
Os livros e documentos da sociedade ficarão sob a guarda de {baixa.responsavel_guarda or 'sócio indicado'}, pelo prazo de {baixa.prazo_guarda or '5 (cinco) anos'}, conforme exigência legal, podendo ser requisitados a qualquer tempo por autoridades competentes.

E, por estarem assim justos e contratados, assinam o presente instrumento particular de distrato em 02 (duas) vias de igual teor e forma, para um só efeito.

{empresa.endereco.split(',')[-2].strip() if empresa.endereco and ',' in empresa.endereco else 'Local'}, {data_atual}.
{assinaturas}

IMPORTANTE: Gere o documento EXATAMENTE neste formato. NÃO adicione testemunhas. O título e nome da empresa devem estar CENTRALIZADOS."""

        system_message = """Você é um advogado societário especialista em dissolução de empresas.
Gere documentos formais, completos e prontos para registro na Junta Comercial.
Use linguagem jurídica adequada. NÃO use Markdown."""

        chat = LlmChat(
            api_key=emergent_api_key,
            session_id=f"distrato-{request.minuta_id}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        distrato = response.strip()
        
        # Salvar na minuta
        await db.minutas.update_one(
            {"id": request.minuta_id},
            {
                "$set": {
                    "tipo_processo": "baixa",
                    "conteudo_gerado": distrato,
                    "dados_empresa": empresa.dict(),
                    "dados_socios": [s.dict() for s in socios],
                    "dados_baixa": baixa.dict(),
                    "cnpj": empresa.cnpj,
                    "razao_social": empresa.razao_social,
                    "status": "concluida",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "distrato": distrato,
            "minuta_id": request.minuta_id
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar distrato: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ HEALTH CHECK ============

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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
