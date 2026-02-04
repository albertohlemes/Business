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
Sua tarefa é extrair informações estruturadas do contrato.

SEMPRE responda APENAS com um JSON válido, sem markdown, sem explicações.
O JSON deve seguir EXATAMENTE esta estrutura:

{
    "empresa": {
        "razao_social": "Nome completo da empresa",
        "cnpj": "00.000.000/0000-00",
        "endereco": "Endereço completo com CEP",
        "capital_social": "R$ 0.000,00 (forma de integralização)",
        "objeto_social": "Descrição das atividades"
    },
    "socios": [
        {
            "nome": "Nome completo",
            "cpf": "000.000.000-00",
            "participacao": "50%",
            "administrador": true,
            "nacionalidade": "Brasileiro",
            "estado_civil": "Casado",
            "profissao": "Empresário",
            "rg": "00.000.000-0"
        }
    ],
    "atividades": ["CNAE ou descrição de cada atividade"]
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
        else:
            mime_type = "image/jpeg"
        
        user_message = UserMessage(
            text="Extraia todos os dados estruturados deste contrato social. Retorne APENAS o JSON.",
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
        raise HTTPException(status_code=500, detail=f"Erro ao extrair dados: {str(e)}")

@api_router.get("/minutas", response_model=List[MinutaResponse])
async def list_minutas(current_user: dict = Depends(get_current_user)):
    minutas = await db.minutas.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0, "mensagens": 0}
    ).sort("numero_alteracao", -1).to_list(100)
    
    return [MinutaResponse(
        id=m["id"],
        tipo_alteracao=m["tipo_alteracao"],
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

Ao analisar documentos, identifique e extraia:
- Do contrato social: Razão social, CNPJ, endereço, capital social, quadro societário, objeto social
- De CNH/RG: Nome completo, CPF, RG, data de nascimento, nacionalidade, estado civil
- De comprovante de endereço: Endereço completo com CEP
- De lista de CNAEs: Códigos e descrições das atividades

Ao gerar minutas de alteração, siga o formato padrão:
1. Preâmbulo com dados da empresa
2. Cláusulas de alteração específicas (usando os dados extraídos dos documentos)
3. Consolidação do contrato social
4. Cláusula de encerramento

Responda sempre em português brasileiro formal. Quando extrair dados de documentos, liste-os claramente para o usuário confirmar antes de gerar a minuta."""

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
    from template_manager import gerar_minuta_word
    
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    conteudo = minuta.get("conteudo_gerado")
    if not conteudo:
        raise HTTPException(status_code=400, detail="Minuta ainda não foi gerada")
    
    dados_extraidos = minuta.get("dados_extraidos", {})
    
    # Verificar se usuário tem template
    template = await db.templates.find_one({"user_id": current_user["id"]})
    template_path = template["arquivo"] if template else None
    
    # Gerar documento Word
    doc_bytes = gerar_minuta_word(conteudo, dados_extraidos, template_path)
    
    # Nome do arquivo
    cnpj = minuta.get("cnpj", "").replace(".", "").replace("/", "").replace("-", "")
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
    from template_manager import template_manager_fiel
    from jspdf_wrapper import gerar_pdf_simples
    
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Minuta não encontrada")
    
    conteudo = minuta.get("conteudo_gerado")
    if not conteudo:
        raise HTTPException(status_code=400, detail="Minuta ainda não foi gerada")
    
    dados_extraidos = minuta.get("dados_extraidos", {})
    
    # Verificar se usuário tem template para extrair formatação
    template = await db.templates.find_one({"user_id": current_user["id"]})
    formato = None
    
    if template and template.get("arquivo"):
        try:
            formato = template_manager_fiel.extrair_formatacao_completa(template["arquivo"])
        except Exception as e:
            logger.warning(f"Erro ao extrair formatação do template para PDF: {e}")
    
    # Gerar PDF com formatação do template
    pdf_bytes = gerar_pdf_simples(conteudo, dados_extraidos, formato)
    
    cnpj = minuta.get("cnpj", "").replace(".", "").replace("/", "").replace("-", "")
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
