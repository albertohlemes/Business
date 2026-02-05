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
    minuta = await db.minutas.find_one({"id": minuta_id})
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
        {"id": minuta_id},
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
        {"id": minuta_id},
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
    minuta = await db.minutas.find_one({"id": minuta_id})
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
    # Listar TODOS os processos (visível para todos os usuários)
    minutas = await db.minutas.find(
        {},
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
    # Permitir acesso a qualquer processo (visível para todos)
    minuta = await db.minutas.find_one(
        {"id": minuta_id},
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
    minuta = await db.minutas.find_one({"id": minuta_id})
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
    minuta = await db.minutas.find_one({"id": minuta_id})
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
    result = await db.minutas.delete_one({"id": minuta_id})
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
    
    minuta = await db.minutas.find_one({"id": minuta_id})
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
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    codigo_cliente: Optional[str] = None

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
        
        # Determinar tipo de arquivo pelo nome e content_type
        filename = file.filename or ''
        content_type = file.content_type or ''
        
        # Mapeamento de extensões para MIME types suportados pelo Gemini
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        mime_mapping = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'heic': 'image/heic',
            'heif': 'image/heif',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        
        if ext in mime_mapping:
            mime_type = mime_mapping[ext]
        elif 'pdf' in content_type:
            mime_type = 'application/pdf'
        elif 'image' in content_type:
            mime_type = content_type
        elif 'word' in content_type or 'document' in content_type:
            mime_type = content_type
        else:
            # Para arquivos não suportados, tentar como imagem PNG (pode funcionar para screenshots)
            mime_type = 'image/png'
        
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
        
        # Log para debug
        logger.info(f"Gerando contrato - Empresa: {empresa.razao_social}")
        for i, s in enumerate(socios):
            logger.info(f"Sócio {i+1}: {s.nome}, data_nasc={s.data_nascimento}, cidade_nasc={s.cidade_nascimento}, estado_nasc={s.estado_nascimento}")
        
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

# ============ INTEGRAÇÃO GCLICK ============

GCLICK_API_URL = "https://api.gestaoclick.com"
GCLICK_CLIENT_ID = os.environ.get("GCLICK_CLIENT_ID", "")
GCLICK_CLIENT_SECRET = os.environ.get("GCLICK_CLIENT_SECRET", "")

class GClickEnvioRequest(BaseModel):
    minuta_id: str

@api_router.post("/gclick/enviar-empresa")
async def enviar_empresa_gclick(
    request: GClickEnvioRequest,
    current_user: dict = Depends(get_current_user)
):
    """Envia dados da empresa e sócios para o GClick"""
    try:
        # Buscar dados da minuta
        minuta = await db.minutas.find_one({"id": request.minuta_id, "user_id": current_user["id"]})
        if not minuta:
            raise HTTPException(status_code=404, detail="Processo não encontrado")
        
        dados_empresa = minuta.get("dados_empresa", {})
        dados_socios = minuta.get("dados_socios", [])
        
        if not dados_empresa:
            raise HTTPException(status_code=400, detail="Dados da empresa não encontrados no processo")
        
        # Montar endereço completo
        endereco = dados_empresa.get("endereco", {})
        endereco_completo = ""
        if isinstance(endereco, dict):
            endereco_completo = f"{endereco.get('logradouro', '')}, {endereco.get('numero', '')}"
            if endereco.get('complemento'):
                endereco_completo += f", {endereco.get('complemento')}"
        elif isinstance(endereco, str):
            endereco_completo = endereco
        
        # Preparar nome no formato: ID - RAZÃO SOCIAL
        codigo_cliente = dados_empresa.get("codigo_cliente", "")
        razao_social = dados_empresa.get("razao_social", "")
        nome_gclick = f"{codigo_cliente} - {razao_social}" if codigo_cliente else razao_social
        
        # Preparar dados para GClick
        cliente_data = {
            "tipo_pessoa": "PJ",
            "nome": nome_gclick,
            "nome_fantasia": dados_empresa.get("nome_fantasia", ""),
            "cpf_cnpj": minuta.get("cnpj", ""),
            "inscricao_estadual": dados_empresa.get("inscricao_estadual", ""),
            "inscricao_municipal": dados_empresa.get("inscricao_municipal", ""),
            "endereco": endereco_completo,
            "bairro": endereco.get("bairro", "") if isinstance(endereco, dict) else "",
            "cidade": endereco.get("cidade", "") if isinstance(endereco, dict) else "",
            "estado": endereco.get("estado", "") if isinstance(endereco, dict) else "",
            "cep": endereco.get("cep", "") if isinstance(endereco, dict) else "",
            "observacoes": f"Código Cliente: {codigo_cliente}\nCapital Social: {dados_empresa.get('capital_social', '')}\nObjeto Social: {dados_empresa.get('objeto_social', '')[:500] if dados_empresa.get('objeto_social') else ''}"
        }
        
        # Adicionar sócios nas observações
        if dados_socios:
            socios_texto = "\n\nSÓCIOS:\n"
            for s in dados_socios:
                socios_texto += f"- {s.get('nome', '')} (CPF: {s.get('cpf', '')}) - {s.get('participacao', '')}%"
                if s.get('administrador'):
                    socios_texto += " [ADMINISTRADOR]"
                socios_texto += "\n"
            cliente_data["observacoes"] += socios_texto
        
        # Enviar para GClick
        headers = {
            "Content-Type": "application/json",
            "access-token": GCLICK_CLIENT_ID,
            "secret-access-token": GCLICK_CLIENT_SECRET
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GCLICK_API_URL}/clientes",
                json=cliente_data,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                
                # Atualizar minuta com info de envio
                await db.minutas.update_one(
                    {"id": request.minuta_id},
                    {"$set": {
                        "gclick_enviado": True,
                        "gclick_data_envio": datetime.now(timezone.utc),
                        "gclick_response": result
                    }}
                )
                
                return {
                    "success": True,
                    "message": "Empresa enviada com sucesso para o GClick",
                    "gclick_id": result.get("id"),
                    "data": result
                }
            else:
                error_detail = response.text
                logger.error(f"Erro GClick: {response.status_code} - {error_detail}")
                return {
                    "success": False,
                    "message": f"Erro ao enviar para GClick: {response.status_code}",
                    "error": error_detail
                }
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao enviar para GClick: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar para GClick: {str(e)}")

@api_router.get("/gclick/status/{minuta_id}")
async def verificar_status_gclick(
    minuta_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Verifica se a empresa já foi enviada para o GClick"""
    minuta = await db.minutas.find_one({"id": minuta_id, "user_id": current_user["id"]})
    if not minuta:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    
    return {
        "enviado": minuta.get("gclick_enviado", False),
        "data_envio": minuta.get("gclick_data_envio"),
        "gclick_id": minuta.get("gclick_response", {}).get("id") if minuta.get("gclick_response") else None
    }

class GClickCadastroDiretoRequest(BaseModel):
    """Modelo para cadastro direto no GClick sem processo associado"""
    nome: str
    nome_fantasia: Optional[str] = None
    cpf_cnpj: str
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    observacoes: Optional[str] = None

@api_router.post("/gclick/cadastrar-direto")
async def cadastrar_direto_gclick(
    request: GClickCadastroDiretoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cadastra empresa diretamente no GClick sem precisar de um processo no portal"""
    try:
        if not GCLICK_CLIENT_ID or not GCLICK_CLIENT_SECRET:
            raise HTTPException(status_code=500, detail="Credenciais do GClick não configuradas")
        
        # Preparar dados para GClick
        cliente_data = {
            "tipo_pessoa": "PJ" if len(request.cpf_cnpj.replace(".", "").replace("/", "").replace("-", "")) > 11 else "PF",
            "nome": request.nome,
            "nome_fantasia": request.nome_fantasia or "",
            "cpf_cnpj": request.cpf_cnpj,
            "inscricao_estadual": request.inscricao_estadual or "",
            "inscricao_municipal": request.inscricao_municipal or "",
            "endereco": request.endereco or "",
            "bairro": request.bairro or "",
            "cidade": request.cidade or "",
            "estado": request.estado or "",
            "cep": request.cep or "",
            "telefone": request.telefone or "",
            "email": request.email or "",
            "observacoes": request.observacoes or ""
        }
        
        # Enviar para GClick
        headers = {
            "Content-Type": "application/json",
            "access-token": GCLICK_CLIENT_ID,
            "secret-access-token": GCLICK_CLIENT_SECRET
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GCLICK_API_URL}/clientes",
                json=cliente_data,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                
                # Salvar registro de envio no banco (para histórico)
                cadastro_log = {
                    "id": str(uuid.uuid4()),
                    "tipo": "cadastro_direto_gclick",
                    "user_id": current_user["id"],
                    "dados_enviados": cliente_data,
                    "gclick_response": result,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.cadastros_externos.insert_one(cadastro_log)
                
                return {
                    "success": True,
                    "message": "Empresa cadastrada com sucesso no GClick",
                    "gclick_id": result.get("id"),
                    "data": result
                }
            else:
                error_detail = response.text
                logger.error(f"Erro GClick cadastro direto: {response.status_code} - {error_detail}")
                return {
                    "success": False,
                    "message": f"Erro ao cadastrar no GClick: {response.status_code}",
                    "error": error_detail
                }
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao cadastrar direto no GClick: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao cadastrar no GClick: {str(e)}")

class SCIUnicoCadastroRequest(BaseModel):
    """Modelo para salvar cadastro do SCI Único no histórico"""
    razao_social: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    regime_tributario: Optional[str] = None
    data_abertura: Optional[str] = None
    capital_social: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    responsavel: Optional[str] = None
    cpf_responsavel: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None

@api_router.post("/cadastros/salvar-sci")
async def salvar_cadastro_sci(
    request: SCIUnicoCadastroRequest,
    current_user: dict = Depends(get_current_user)
):
    """Salva cadastro do SCI Único no histórico (para rastreamento)"""
    cadastro = {
        "id": str(uuid.uuid4()),
        "tipo": "sci_unico",
        "user_id": current_user["id"],
        "dados_enviados": {
            "razao_social": request.razao_social,
            "cnpj": request.cnpj,
            "nome_fantasia": request.nome_fantasia,
            "inscricao_estadual": request.inscricao_estadual,
            "inscricao_municipal": request.inscricao_municipal,
            "regime_tributario": request.regime_tributario,
            "data_abertura": request.data_abertura,
            "capital_social": request.capital_social,
            "endereco": request.endereco,
            "bairro": request.bairro,
            "cidade": request.cidade,
            "estado": request.estado,
            "cep": request.cep,
            "responsavel": request.responsavel,
            "cpf_responsavel": request.cpf_responsavel,
            "telefone": request.telefone,
            "email": request.email
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cadastros_externos.insert_one(cadastro)
    
    return {
        "success": True,
        "message": "Cadastro salvo no histórico",
        "id": cadastro["id"]
    }

# ============ EXPORTAÇÃO PARA SCI ÚNICO ============

class PerfilClienteSCI(BaseModel):
    """Perfil do cliente para configuração automática"""
    regime_tributario: str = "simples"  # simples, presumido, real
    codigo_acesso_simples: Optional[str] = None
    tipo_atividade: str = "servicos"  # comercio, servicos, industria, misto
    tem_funcionarios: bool = False
    contribuinte_icms: bool = False
    enquadramento_simples: Optional[str] = "anexo3"  # anexo1-5

class SCIUnicoEmpresaExport(BaseModel):
    """Dados da empresa para exportação ao SCI Único"""
    codigo: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: str
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    data_entrada: Optional[str] = None
    data_constituicao: Optional[str] = None
    data_registro: Optional[str] = None
    orgao_registro: Optional[str] = None
    numero_registro: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    socios: Optional[List[dict]] = None
    perfil: Optional[PerfilClienteSCI] = None

# Valores padrão fixos do SCI Único
PADROES_SCI = {
    "contador": "6",                    # ALBERTO HENRIQUE
    "plano_contabilizacao": "51",       # Plano Business
    "plano_contas": "90113",            # Plano de contas SCI - Departamentalizado
    "plano_historicos": "9001",         # Histórico padrão SCI
    "centro_custo": ""
}

def gerar_configuracoes_perfil(perfil: PerfilClienteSCI):
    """
    Gera TODAS as configurações baseadas no perfil do cliente.
    
    Perfis suportados:
    - Comércio Lucro Real
    - Indústria Lucro Real
    - Serviços Lucro Real
    - Comércio Lucro Presumido
    - Serviços Lucro Presumido
    - Simples Nacional - Comércio
    - Simples Nacional - Serviços (com exceção Anexo IV)
    """
    
    regime = perfil.regime_tributario  # simples, presumido, real
    atividade = perfil.tipo_atividade  # comercio, servicos, industria, misto
    anexo = perfil.enquadramento_simples  # anexo3, anexo4, anexo5
    is_servicos = atividade in ["servicos", "misto"]
    is_comercio = atividade in ["comercio", "industria"]
    is_anexo_iv = anexo == "anexo4" and regime == "simples"
    
    # ========== ABA CONTADORES (Padrão para todos) ==========
    contadores = {
        "contador_contabil": PADROES_SCI["contador"],
        "contador_fiscal": PADROES_SCI["contador"],
        "contador_rh": PADROES_SCI["contador"]
    }
    
    # ========== ABA PLANOS ==========
    planos = {
        "plano_contabilizacao": PADROES_SCI["plano_contabilizacao"],
        "plano_contas": PADROES_SCI["plano_contas"],
        "plano_historicos": PADROES_SCI["plano_historicos"],
        "centro_custo": PADROES_SCI["centro_custo"],
        "plano_tributario": "",
        "plano_contas_referencial": ""
    }
    
    # Plano tributário baseado no perfil
    if regime == "simples":
        planos["plano_tributario"] = "1"  # Empresa Simples Nacional
        planos["plano_contas_referencial"] = "PJ em Geral"
    elif regime == "presumido":
        if is_servicos:
            planos["plano_tributario"] = "20"  # Industria, Comercio e Servicos LP - SP
        else:
            planos["plano_tributario"] = "20"  # Industria, Comercio e Servicos LP - SP
        planos["plano_contas_referencial"] = "PJ em Geral - Lucro Presumido"
    elif regime == "real":
        planos["plano_tributario"] = "12"  # Industria, Comercio e Servicos LR - SP
        planos["plano_contas_referencial"] = "PJ em Geral"
    
    # ========== ABA ENQUADRAMENTO FEDERAL ==========
    enquadramento = {
        "enquadramento_federal": "Normal" if regime != "simples" else "ME",
        "forma_tributacao": "Lucro real" if regime == "real" else ("Lucro presumido" if regime == "presumido" else "Nenhum"),
        "atividade_comercio": is_comercio if regime == "simples" else False,
        "atividade_industria": atividade == "industria",
        "atividade_servico": is_servicos if regime == "simples" else False,
        # Anexos de prestação de serviços (apenas para Simples Serviços)
        "anexo_folha_iii": is_servicos and regime == "simples" and anexo in ["anexo3", "anexo4", "anexo5"],
        "anexo_folha_iv": is_servicos and regime == "simples" and anexo == "anexo4",
        "anexo_folha_v": is_servicos and regime == "simples" and anexo in ["anexo3", "anexo5"],
        "anexo_fiscal_iii": is_servicos and regime == "simples" and anexo in ["anexo3", "anexo4", "anexo5"],
        "anexo_fiscal_iv": is_servicos and regime == "simples" and anexo == "anexo4",
        "anexo_fiscal_v": is_servicos and regime == "simples" and anexo in ["anexo3", "anexo5"],
        "relacao_folha_faturamento_anexo_iii": is_servicos and regime == "simples",
        "empresa_optante_rtt": False,
        "exportar_fcont": False,
        "optante_ret": False,
        "empresas_afetadas_eua": False,
        "codigo_acesso_simples": perfil.codigo_acesso_simples or ""
    }
    
    # ========== ABA LALUR (apenas para Lucro Real) ==========
    lalur = {
        "plano_integracao_contabil": "4",
        "parte_a": "90001",
        "parte_a_estimado": "90002",
        "parte_b": "90001",
        "tributacao": "90001",
        "indice": "1" if regime != "real" else "4",  # UFIR para outros, SELIC para Lucro Real
        "indice_descricao": "UFIR" if regime != "real" else "SELIC",
        "data_incorporacao": ""
    }
    
    # ========== ABA FISCAL - PARÂMETROS ==========
    fiscal_parametros = {
        "ir_csll": "",
        "ir_csll_descricao": "",
        "ipi": "",
        "ipi_descricao": "",
        "pis_cofins_lr": "",
        "pis_cofins_lr_descricao": "",
        "sped_fiscal": "1",
        "sped_fiscal_descricao": "ICMS normal SCI",
        "ciap": "",
        "bloco_p": "",
        "cprb_reinf": "2",
        "cprb_reinf_descricao": "CPRB - Reinf",
        "bloco_m": "",
        "bloco_m_descricao": "",
        "lancar_produtos_entradas": True,
        "lancar_produtos_saidas": True,
        "tipo_apuracao_impostos_federais": "competencia",
        "contabilizar_pis_cofins_regime_caixa": False,
        "tipo_apuracao_retencoes_pis_cofins_csll": "competencia",
        "deduzir_pis": True,
        "deduzir_cofins": True,
        "deduzir_csll": True,
        "deduzir_irrf": True,
        "deduzir_issqn": True,
        "deduzir_inss": True,
        "deduzir_funrural": False,
        "tipo_apuracao_irrf_emitido": "competencia",
        "tipo_apuracao_irrf_recebido": "competencia"
    }
    
    # IR/CSLL baseado no perfil
    if regime == "presumido":
        if is_servicos:
            fiscal_parametros["ir_csll"] = "10"
            fiscal_parametros["ir_csll_descricao"] = "IR/CSLL 8%/32% Padrão SCI - Clínicas"
        else:
            fiscal_parametros["ir_csll"] = "3"
            fiscal_parametros["ir_csll_descricao"] = "IR/CSLL 8%/32% Padrão SCI"
    
    # IPI e PIS/Cofins para Lucro Real
    if regime == "real":
        fiscal_parametros["ipi"] = "1"
        fiscal_parametros["ipi_descricao"] = "IPI Mensal"
        fiscal_parametros["pis_cofins_lr"] = "2"
        fiscal_parametros["pis_cofins_lr_descricao"] = "Não-Cumulativo"
        if atividade == "industria":
            fiscal_parametros["sped_fiscal"] = "2"
            fiscal_parametros["sped_fiscal_descricao"] = "ICMS substituição tributária SCI"
    
    # Bloco M baseado na atividade
    if atividade == "industria":
        fiscal_parametros["bloco_m"] = "1"
        fiscal_parametros["bloco_m_descricao"] = "Bloco M Indústria"
    elif is_comercio:
        fiscal_parametros["bloco_m"] = "2"
        fiscal_parametros["bloco_m_descricao"] = "Bloco M Comércio"
    elif is_servicos:
        fiscal_parametros["bloco_m"] = "3"
        fiscal_parametros["bloco_m_descricao"] = "Bloco M Serviço"
    
    # ========== ABA FISCAL - FEDERAL ==========
    fiscal_federal = {
        # Sped ICMS/IPI
        "sped_icms_ipi_perfil": "A - Perfil A",
        "sped_icms_ipi_atividade": "0" if atividade == "industria" else "1",
        "sped_icms_ipi_atividade_descricao": "Industrial ou equiparado a industrial" if atividade == "industria" else "Outros",
        "sped_icms_ipi_data_obrigatoriedade": "01/01/2022" if regime == "real" else "",
        "sped_icms_ipi_classificacao": "08 - Equiparado a industrial" if atividade == "industria" else "",
        "preencher_cfop_cst_c425": False,
        # Sped Contribuições
        "natureza_pessoa_juridica": "00 - Sociedade empresária em geral",
        "atividade_preponderante": "",
        "atividade_preponderante_descricao": "",
        "tipo_incidencia": "1 - Apuração somente sobre a receita bruta",
        "sped_contribuicoes_data_obrigatoriedade": "",
        # Reinf
        "reinf_data_obrigatoriedade": "01/07/2023",
        "entrega_ecd": regime == "real",
        # Dmed
        "dmed_tipo_declarante": "0 - Não se aplica",
        "dmed_tipo_descricao": "Não se aplica",
        # Simples Nacional
        "simples_codigo_acesso": perfil.codigo_acesso_simples or "",
        "simples_codigo_configuracao": "1" if regime == "simples" else "",
        "contabilizar_icms_iss_sublimite": False,
        "nao_utiliza_reducao_iss": False
    }
    
    # Atividade preponderante baseado no perfil
    if atividade == "industria":
        fiscal_federal["atividade_preponderante"] = "0"
        fiscal_federal["atividade_preponderante_descricao"] = "Industrial ou equiparado a industrial"
    elif is_comercio:
        fiscal_federal["atividade_preponderante"] = "2"
        fiscal_federal["atividade_preponderante_descricao"] = "Atividade de comércio"
    elif is_servicos:
        fiscal_federal["atividade_preponderante"] = "1" if regime == "real" else "1"
        fiscal_federal["atividade_preponderante_descricao"] = "Prestador de serviços" if regime == "presumido" else "Outros"
    
    # Datas de obrigatoriedade
    if regime == "real":
        fiscal_federal["sped_contribuicoes_data_obrigatoriedade"] = "01/01/2022"
        fiscal_federal["reinf_data_obrigatoriedade"] = "01/01/2022"
    elif regime == "presumido":
        fiscal_federal["sped_contribuicoes_data_obrigatoriedade"] = "01/07/2023"
    
    # Dmed para serviços de saúde
    if is_servicos and regime == "presumido":
        fiscal_federal["dmed_tipo_declarante"] = "1 - Prestador de serviço de saúde"
        fiscal_federal["dmed_tipo_descricao"] = "Prestador de serviço de saúde"
    
    # ========== ABA FISCAL - ESTADUAL GERAIS ==========
    fiscal_estadual_gerais = {
        "substituto_tributario": is_comercio and regime != "simples",
        "porte_empresa": "3" if (is_comercio and regime != "simples") else "1",
        "porte_empresa_descricao": "Normal" if (is_comercio and regime != "simples") else "ME",
        "lancar_base_icms_valor_contabil": False,
        "icms_lancar_em": "Outras" if (is_comercio and regime != "simples") else "Isentas",
        "antecipacao_imposto": False,
        "reducao_base_icms_entradas": "0,0000",
        "reducao_base_icms_saidas": "0,0000",
        "considerar_icms_monofasico": False,
        # Parâmetros ICMS
        "dia_vencimento": "20" if (is_comercio and regime != "simples") else "00",
        "antecipar_sabados_domingos_feriados": is_comercio and regime != "simples",
        "vence_no_mes": "No mês seguinte",
        # Juros
        "juros_a_partir_de": "00",
        "juros_percentual": "0,0000",
        "juros_percentual_ao": "Dia",
        "juros_indice": "Nenhum",
        # Multa
        "multa_a_partir_de": "00",
        "multa_percentual": "0,0000",
        "multa_percentual_ao": "Dia",
        "multa_maxima": "0,0000",
        # GIA ST
        "apura_gia_st": is_comercio and regime != "simples",
        "distribuidor_combustiveis": False,
        "declara_ec87_15": False,
        "configuracao_gia_st": "1" if (is_comercio and regime != "simples") else ""
    }
    
    # ========== ABA FISCAL - ESTADUAL SP ==========
    fiscal_estadual_sp = {
        "codigo_configuracao": "2" if (is_comercio and regime != "simples") else "",
        "codigo_configuracao_descricao": "Configuração com Substituição Tributária" if (is_comercio and regime != "simples") else "",
        "e_credac_cat_207_09": False,
        "plano_configuracao_cat_66_2018": "1" if (is_comercio and regime != "simples") else "",
        "manter_c197_d197_c597": False,
        "calculo_st_retido": False,
        "st_percentual": "0,0000",
        "configuracao_cat_42_2018": "",
        "consolidar_1200_cupom_fiscal": False,
        "dipam_b_saidas_revendedores": False
    }
    
    # ========== ABA FISCAL - MUNICIPAL ==========
    fiscal_municipal = {
        "movimenta_servicos": True,
        "aliquota_iss": "0,0000",
        "reducao_base_issqn": "0,0000",
        "movimenta_irrf": True,
        "aliquota_irrf": "0,0000",
        "irrf_isento": "0,0000",
        "retencao_inss": True,
        "valor_minimo_inss": "0,0000",
        "aliquota_inss": "0,0000",
        "valor_iss_fixo": "0,00",
        "lancar_nota_servico_tomados": False,
        "importacao_continua": False
    }
    
    # ========== ABA FISCAL - INTEGRAÇÃO ==========
    fiscal_integracao = {
        # Somar frete
        "somar_frete_valor_contabil": True,
        "somar_frete_base_icms": is_comercio or regime == "simples",
        # Somar valor notas de importação
        "somar_pis_cofins": False,
        "somar_imposto_importacao": False,
        "somar_icms_importacao": False,
        "somar_afrmm": False,
        # Lançar notas Vista/Outras
        "lancar_parcelas_automaticamente": True,
        "manter_parcelas_notas": True,
        "plano_pagamento": "1",
        "plano_pagamento_descricao": "Padrão SCI 30 dias",
        # Simples Nacional - Importar valores de
        "importar_icms": False,
        "importar_icms_st": False,
        "importar_iss": False,
        # Somar ao valor do produto
        "somar_ipi": False,
        "somar_st": False,
        # Ratear valores E14 nos itens E15
        "ratear_desconto": False,
        "ratear_acrescimos": False,
        # NF-e/NFC-e
        "venda_cooperado": False,
        # Planos de importação
        "cfop_de_para": "14" if regime == "simples" else "",
        "cfop_de_para_descricao": "GRUPO CONVENIENCIAS" if regime == "simples" else "",
        "acao_inconsistencia": "1" if regime != "simples" else "",
        "acao_inconsistencia_descricao": "IMPORTACAO SPED FISCAL" if regime != "simples" else "",
        "centro_custo_automatico": "",
        "e115": "",
        "ajustes_sped": "",
        "planos_vinculados": "1" if (is_comercio and regime != "simples") or (regime == "simples" and is_comercio) else "0",
        "nao_arredondar_plano_trocas": False,
        # Diferencial de Alíquota
        "diferencial_aliquota_tipo": "Por Dentro" if regime != "simples" else "Por Fora",
        "calcular_diferencial_aliquota": False,
        "diferencial_base": "Base de ICMS",
        "nao_gerar_ajuste_c197": False,
        # NF-e de entradas
        "manter_codigo_produto_original": False,
        "consistir_produtos_mesmo_codigo": False,
        # CT-e de saídas
        "importar_cte_subcontratado": False,
        # Calcular antecipação
        "calcular_antecipacao_icms": False,
        "considerar_ipi_base_calculo": False,
        # Factoring
        "nao_validar_lancamento_sem_contrato": False
    }
    
    # Ajuste para Serviços
    if is_servicos and regime != "simples":
        fiscal_integracao["diferencial_aliquota_tipo"] = "Por Fora" if regime == "presumido" else "Por Dentro"
    
    # ========== ABA FOLHA - GPS ==========
    folha_gps = {
        "fpas": "35",
        "terceiros": "507",
        "terceiros_valor": "0,00",
        "simples_optante": regime == "simples",
        "empresa_tomador_desoneracao": False,
        "rateio_13_salario": "Utilizar os dados da empresa - não ratear",
        "pro_laboristas_percentual": "0,00",
        "autonomos_percentual": "0,00",
        "colaboradores_percentual": "0,00",
        "rat_percentual": "3,00",
        "fap_percentual": "0,5000",
        "rat_x_fap_percentual": "1,5000",
        "indenizacao_compensatoria": "0,00",
        "classificacao_tributaria": "1",
        "classificacao_tributaria_descricao": "Empresas enquadradas no regime de tributação Simples com tributação",
        "cooperativa": "0 - Não",
        "construtora": False,
        "contribuicao_previdenciaria_rural": "0 - Não informado"
    }
    
    # Exceção Anexo IV - GPS diferenciado
    if is_anexo_iv:
        folha_gps["fpas"] = "37"
        folha_gps["terceiros"] = "515"
        folha_gps["pro_laboristas_percentual"] = "20,00"
        folha_gps["autonomos_percentual"] = "20,00"
        folha_gps["colaboradores_percentual"] = "20,00"
        folha_gps["rat_percentual"] = "1,00"
        folha_gps["rat_x_fap_percentual"] = "0,5000"
        folha_gps["classificacao_tributaria"] = "2"
        folha_gps["classificacao_tributaria_descricao"] = "Empresas enquadradas no regime de tributação Simples com tributação"
    
    # GPS para Lucro Real/Presumido
    if regime != "simples":
        folha_gps["fpas"] = "515" if is_comercio else "515"
        folha_gps["terceiros"] = "0115"
        folha_gps["simples_optante"] = False
        folha_gps["classificacao_tributaria"] = "0"
        folha_gps["classificacao_tributaria_descricao"] = "Empresa em Geral"
    
    # ========== ABA FOLHA - VÍNCULOS ==========
    folha_vinculos = {
        "plano_funcoes": "",  # Código da empresa
        "tabela_inss": "1",
        "tabela_inss_descricao": "Tabela de INSS 1",
        "tabela_irrf": "1",
        "tabela_irrf_descricao": "Tabela de IR 1",
        "mensagem_aniversario": "1",
        "mensagem_aniversario_descricao": "Aniversário",
        "mensagem": "",
        "indice_jam": "3",
        "indice_jam_descricao": "Coeficiente JAM",
        "plano_horarios": "",  # Código da empresa
        "plano_convenios_saude": "1",
        "plano_convenios_saude_descricao": "Plano importação planos de saúde",
        "plano_baixa_calculos": "",
        "indice_compensacao": "",
        "plano_alerta_vencimentos": ""
    }
    
    # ========== ABA FOLHA - PROPORCIONALIDADES ==========
    folha_proporcionalidades = {
        "admissao": "Divisão por 30 dias considerando meses com no máximo 30 dias",
        "ferias": "Divisão por 30",
        "rescisao": "Divisão por 30",
        "situacao": "Divisão por 30",
        "folha_por_tomador": "Divisão por 30",
        "dias_trabalhados_adiantamento": "15"
    }
    
    # ========== ABA FOLHA - PARÂMETROS DE CÁLCULO ==========
    folha_parametros_calculo = {
        "fechamento_mes": "",
        "fechamento_vale_transporte": "",
        "pagamento_folha": "Mês da competência da folha",
        "pagamento_folha_pro_labore": "Mês da competência da folha",
        "arredondamento": "Centavos",
        "tipo_arredondamento": "Para cima - desconta no mês seguinte",
        "limite_desc_parcelamentos": "0,00",
        "arredonda_folha_normal": True,
        "arredonda_folha_complementar": True,
        "arredonda_ferias": True,
        "arredonda_adiantamento_13": True,
        "arredonda_13_salario": True,
        "arredonda_complemento_13": True,
        "arredonda_adiantamento_salarial": True,
        "arredonda_servicos": True,
        "arredonda_folha_avulsa": True,
        "arredonda_folha_intermitente": False,
        "semana_desconto_dsr": "Semana atual",
        "referencia_em_horas": True,
        "corrige_dsr_horas_extras": False,
        "estouro_provento_rescisao": True,
        "calcula_13_integral_suspensao_bem": False,
        "nao_altera_periodo_aquisitivo_bem": False,
        "considerar_feriados_cidade_tomador": False,
        "complemento_13_salario_dezembro": False,
        "descontar_complemento_13_negativo": False,
        "desconta_liquido_complemento_13_dezembro": False,
        "descontar_faltas_dias_horas_diarias": False,
        "alterar_faixa_plano_saude_aniversario": False
    }
    
    # ========== ABA FOLHA - PARÂMETROS GERAIS ==========
    folha_parametros_gerais = {
        "tipo_calculo_ferias": "Convencional (anual)",
        "somente_salario_ferias": False,
        "tipo_calculo_adicional_13": "Convencional (anual)",
        "somente_salario_13": False,
        "aviso_previo_proporcionalidade": "Após o primeiro ano de serviço",
        "liminar_aviso_previo": "Não possui",
        "ferias_coletivas_saldo_inferior": "Encerrar período aquisitivo",
        "ferias_coletivas_saldo_superior": "Deixar período aquisitivo em aberto",
        "indicativo_situacao_pj": "0 - Situação normal",
        "codigo_empresa_importacao_ponto": "",
        "considerar_nome_social": False,
        "habilitar_pdf_senha": "Não utiliza"
    }
    
    # ========== ABA FOLHA - ESOCIAL ==========
    folha_esocial = {
        # Faseamento
        "eventos_tabela": "01/01/2019" if regime == "simples" else "01/07/2018",
        "eventos_nao_periodicos": "10/04/2019" if regime == "simples" else "01/10/2018",
        "eventos_periodicos": "01/05/2021" if regime == "simples" else "01/01/2019",
        "dctfweb": "07/2021" if regime == "simples" else "04/2019",
        "seguranca_saude_trabalho": "10/01/2022" if regime == "simples" else "08/09/2021",
        "reclamatoria_trabalhista": "01/10/2023" if regime == "simples" else "01/07/2023",
        "fgts_digital": "01/03/2024",
        "exame_toxicologico": "01/08/2024",
        "grupo": "Grupo 3" if regime == "simples" else "Grupo 2",
        # Ambiente
        "tipo_ambiente": "Produção - Real",
        "empresa_sincronizada_em": "",
        "integrar_apenas_reclamatoria": False,
        "estabelecimento_fora_base": False,
        # Indicativo de contratação
        "aprendiz": "Dispensado de acordo com a lei",
        "aprendiz_contratacao_entidade": False,
        "pcd": "Dispensado de acordo com a lei",
        # Registro eletrônico
        "indicativo_registro_eletronico": "Optou pelo registro eletrônico de empregados",
        "situacao_esocial": "Ativa eSocial",
        # Produção rural
        "entidade_paa": False
    }
    
    # ========== MONTAR CONFIGURAÇÃO FINAL ==========
    config = {
        "contadores": contadores,
        "planos": planos,
        "enquadramento": enquadramento,
        "lalur": lalur,
        "fiscal_parametros": fiscal_parametros,
        "fiscal_federal": fiscal_federal,
        "fiscal_estadual_gerais": fiscal_estadual_gerais,
        "fiscal_estadual_sp": fiscal_estadual_sp,
        "fiscal_municipal": fiscal_municipal,
        "fiscal_integracao": fiscal_integracao,
        "folha_gps": folha_gps,
        "folha_vinculos": folha_vinculos,
        "folha_proporcionalidades": folha_proporcionalidades,
        "folha_parametros_calculo": folha_parametros_calculo,
        "folha_parametros_gerais": folha_parametros_gerais,
        "folha_esocial": folha_esocial,
        # Metadados do perfil
        "perfil_info": {
            "regime_tributario": regime,
            "tipo_atividade": atividade,
            "enquadramento_simples": anexo if regime == "simples" else None,
            "is_anexo_iv": is_anexo_iv,
            "tem_funcionarios": perfil.tem_funcionarios,
            "contribuinte_icms": perfil.contribuinte_icms
        }
    }
    
    return config

@api_router.post("/sci-unico/exportar")
async def exportar_para_sci_unico(
    dados: SCIUnicoEmpresaExport,
    current_user: dict = Depends(get_current_user)
):
    """
    Gera arquivo JSON formatado para o executável de automação do SCI Único.
    O executável lê este arquivo e preenche automaticamente os campos.
    """
    # Formatar dados na ordem dos TABs do SCI Único
    export_data = {
        "empresa": {
            "codigo": dados.codigo,
            "apelido": dados.razao_social[:30] if dados.razao_social else "",  # SCI usa como apelido
            "razao_social": dados.razao_social,
            "reduzido": dados.razao_social[:15] if dados.razao_social else "",  # Versão curta
            "nome_fantasia": dados.nome_fantasia or "",
            "cnpj": dados.cnpj,
            "data_entrada": dados.data_entrada or "",
            "cep": dados.cep or "",
            "endereco": dados.endereco or "",
            "numero": dados.numero or "",
            "complemento": dados.complemento or "",
            "bairro": dados.bairro or "",
            "cidade": dados.cidade or "",
            "estado": dados.estado or "",
            "telefone": dados.telefone or "",
            "inscricao_estadual": dados.inscricao_estadual or "",
            "inscricao_municipal": dados.inscricao_municipal or "",
            "email": dados.email or "",
            "orgao_registro": dados.orgao_registro or "",
            "numero_registro": dados.numero_registro or "",
            "data_registro": dados.data_registro or "",
            "data_constituicao": dados.data_constituicao or ""
        },
        "socios": [],
        "configuracoes": {},
        "padroes": PADROES_SCI
    }
    
    # Gerar configurações baseadas no perfil
    if dados.perfil:
        export_data["configuracoes"] = gerar_configuracoes_perfil(dados.perfil)
        export_data["perfil"] = {
            "regime_tributario": dados.perfil.regime_tributario,
            "codigo_acesso_simples": dados.perfil.codigo_acesso_simples,
            "tipo_atividade": dados.perfil.tipo_atividade,
            "tem_funcionarios": dados.perfil.tem_funcionarios,
            "contribuinte_icms": dados.perfil.contribuinte_icms,
            "enquadramento_simples": dados.perfil.enquadramento_simples
        }
    
    # Formatar sócios
    if dados.socios:
        for idx, socio in enumerate(dados.socios):
            socio_data = {
                "codigo": str(idx + 1),
                "nome": socio.get("nome", ""),
                "cpf": socio.get("cpf", ""),
                "rg": socio.get("rg", ""),
                "orgao_emissor": socio.get("orgao_emissor", "SSP"),
                "uf_emissor": socio.get("uf_emissor", dados.estado or "SP"),
                "responsavel": socio.get("administrador", False),
                "data_nascimento": socio.get("data_nascimento", socio.get("dataNascimento", "")),
                "estado_civil": socio.get("estado_civil", "Solteiro(a)"),
                "cep": socio.get("cep", ""),
                "endereco": socio.get("endereco", ""),
                "numero": socio.get("numero", ""),
                "complemento": socio.get("complemento", ""),
                "bairro": socio.get("bairro", ""),
                "cidade": socio.get("cidade", ""),
                "estado": socio.get("estado", ""),
                "telefone": socio.get("telefone", ""),
                "celular": socio.get("celular", ""),
                "entrada_sociedade": dados.data_constituicao or "",
                "email": socio.get("email", ""),
                "naturalidade": socio.get("naturalidade", ""),
                "sexo": socio.get("sexo", ""),
                "participacao": socio.get("participacao", "")
            }
            export_data["socios"].append(socio_data)
    
    # Salvar no histórico
    registro = {
        "id": str(uuid.uuid4()),
        "tipo": "exportacao_sci_unico",
        "user_id": current_user["id"],
        "dados_enviados": export_data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cadastros_externos.insert_one(registro)
    
    return {
        "success": True,
        "data": export_data,
        "message": "Dados prontos para o SCI Único"
    }

@api_router.get("/sci-unico/download-script")
async def download_script_sci_unico():
    """Retorna o script Python para automação do SCI Único"""
    script = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCI Único - Robô de Preenchimento Automático COMPLETO
Business Contabilidade - Portal Societário

Este script lê os dados exportados do portal e preenche 
automaticamente TODAS as abas do SCI Único:
- Cadastrais (Empresa + Sócios)
- Contadores
- Planos
- Enquadramento Federal
- Lalur
- Fiscal (Parâmetros, Federal, Estadual, Municipal, Integração)
- Folha (GPS, Vínculos, Proporcionalidades, Parâmetros, eSocial)

Requisitos:
- Python 3.8+
- pip install pyautogui pyperclip

Uso:
1. Exporte os dados do Portal Societário (arquivo JSON)
2. Execute: python sci_robo.py dados_empresa.json
3. Siga as instruções na tela
"""

import pyautogui
import pyperclip
import time
import json
import sys
import os

# Configurações de velocidade
DELAY_ENTRE_CAMPOS = 0.08   # segundos entre cada TAB
DELAY_DIGITACAO = 0.02      # segundos entre cada caractere
DELAY_ABA = 0.5             # segundos ao trocar de aba

# Configurar pyautogui
pyautogui.PAUSE = 0.05
pyautogui.FAILSAFE = True   # Mova o mouse para o canto para cancelar

def digitar_texto(texto):
    """Digita texto usando clipboard (mais rápido e seguro)"""
    if not texto:
        return
    pyperclip.copy(str(texto))
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(DELAY_DIGITACAO)

def limpar_campo():
    """Limpa o campo atual"""
    pyautogui.hotkey('ctrl', 'a')
    pyautogui.press('delete')

def tab(n=1):
    """Pressiona TAB n vezes"""
    for _ in range(n):
        pyautogui.press('tab')
        time.sleep(DELAY_ENTRE_CAMPOS)

def shift_tab(n=1):
    """Pressiona SHIFT+TAB n vezes"""
    for _ in range(n):
        pyautogui.hotkey('shift', 'tab')
        time.sleep(DELAY_ENTRE_CAMPOS)

def enter():
    """Pressiona ENTER"""
    pyautogui.press('enter')
    time.sleep(DELAY_ENTRE_CAMPOS)

def space():
    """Pressiona SPACE (para checkboxes)"""
    pyautogui.press('space')
    time.sleep(DELAY_ENTRE_CAMPOS)

def marcar_checkbox(valor):
    """Marca ou desmarca checkbox baseado no valor"""
    if valor:
        space()

def selecionar_dropdown(valor):
    """Seleciona valor em dropdown digitando o código"""
    if valor:
        limpar_campo()
        digitar_texto(valor)
        tab()
    else:
        tab()

def ir_para_aba(nome_aba):
    """Instrui o usuário a ir para uma aba específica"""
    print(f"\\n{'='*50}")
    print(f"  >> Vá para a aba: {nome_aba}")
    print(f"{'='*50}")
    input("Pressione ENTER quando estiver na aba...")
    time.sleep(DELAY_ABA)

# ================= PREENCHIMENTO EMPRESA =================

def preencher_empresa(dados):
    """Preenche os dados da empresa na aba Cadastrais"""
    print("\\n=== PREENCHENDO DADOS DA EMPRESA ===")
    
    campos = [
        ("codigo", "Código"),
        ("apelido", "Apelido"),
        ("razao_social", "Razão Social"),
        ("reduzido", "Reduzido"),
        ("nome_fantasia", "Nome Fantasia"),
    ]
    
    for campo, nome in campos:
        valor = dados.get(campo, "")
        print(f"  {nome}: {valor}")
        digitar_texto(valor)
        tab()
    
    # CNPJ - pula (vem da importação)
    print("  CNPJ: (importado)")
    tab()
    
    # Data entrada
    print(f"  Data entrada: {dados.get('data_entrada', '')}")
    digitar_texto(dados.get('data_entrada', ''))
    tab()
    
    # CEP
    print(f"  CEP: {dados.get('cep', '')}")
    digitar_texto(dados.get('cep', ''))
    tab()
    
    # Data saída + Tipo endereço (pula)
    tab(2)
    
    # Endereço completo
    for campo in ['endereco', 'numero', 'complemento', 'bairro']:
        valor = dados.get(campo, "")
        print(f"  {campo.title()}: {valor}")
        digitar_texto(valor)
        tab()
    
    # Cidade (campo com busca)
    print(f"  Cidade: {dados.get('cidade', '')}")
    digitar_texto(dados.get('cidade', ''))
    enter()
    time.sleep(0.3)
    tab()
    
    # Zoneamento (pula)
    tab()
    
    # Telefones
    print(f"  Telefone: {dados.get('telefone', '')}")
    digitar_texto(dados.get('telefone', ''))
    tab(3)  # Telefone 2 e Celular
    
    # Início das atividades
    print(f"  Início atividades: {dados.get('data_constituicao', '')}")
    digitar_texto(dados.get('data_constituicao', ''))
    tab(2)  # Encerramento
    
    # Inscrições
    print(f"  IE: {dados.get('inscricao_estadual', '')}")
    digitar_texto(dados.get('inscricao_estadual', ''))
    tab()
    
    print(f"  IM: {dados.get('inscricao_municipal', '')}")
    digitar_texto(dados.get('inscricao_municipal', ''))
    tab(4)  # Suframa, checkbox matriz, matriz
    
    # Email
    print(f"  Email: {dados.get('email', '')}")
    digitar_texto(dados.get('email', ''))
    
    print("\\n✅ Empresa preenchida!")

# ================= PREENCHIMENTO SÓCIOS =================

def preencher_socio(dados):
    """Preenche os dados de um sócio"""
    print(f"\\n=== SÓCIO: {dados.get('nome', '')} ===")
    
    # Código e Nome
    digitar_texto(dados.get('codigo', ''))
    tab()
    digitar_texto(dados.get('nome', ''))
    tab(2)  # Exterior, País
    
    # CPF, RG, Órgão, UF
    digitar_texto(dados.get('cpf', ''))
    tab()
    digitar_texto(dados.get('rg', ''))
    tab()
    digitar_texto(dados.get('orgao_emissor', 'SSP'))
    tab()
    digitar_texto(dados.get('uf_emissor', ''))
    tab()
    
    # Responsável (checkbox)
    if dados.get('responsavel', False):
        space()
    tab()
    
    # Data nascimento e Estado civil
    digitar_texto(dados.get('data_nascimento', ''))
    tab()
    digitar_texto(dados.get('estado_civil', ''))
    tab()
    
    # Endereço do sócio
    digitar_texto(dados.get('cep', ''))
    tab(2)  # Tipo endereço
    digitar_texto(dados.get('endereco', ''))
    tab()
    digitar_texto(dados.get('numero', ''))
    tab()
    digitar_texto(dados.get('complemento', ''))
    tab()
    digitar_texto(dados.get('bairro', ''))
    tab()
    digitar_texto(dados.get('cidade', ''))
    enter()
    time.sleep(0.3)
    tab()
    
    # Telefones
    digitar_texto(dados.get('telefone', ''))
    tab(2)  # Fax
    digitar_texto(dados.get('celular', ''))
    tab()
    
    # Entrada na sociedade
    digitar_texto(dados.get('entrada_sociedade', ''))
    tab(3)  # Saída, CBOs
    
    # Email
    digitar_texto(dados.get('email', ''))
    
    print(f"✅ Sócio preenchido!")

# ================= PREENCHIMENTO CONTADORES =================

def preencher_contadores(config):
    """Preenche aba Contadores"""
    print("\\n=== PREENCHENDO CONTADORES ===")
    cont = config.get('contadores', {})
    
    digitar_texto(cont.get('contador_contabil', '6'))
    tab()
    digitar_texto(cont.get('contador_fiscal', '6'))
    tab()
    digitar_texto(cont.get('contador_rh', '6'))
    
    print("✅ Contadores preenchidos!")

# ================= PREENCHIMENTO PLANOS =================

def preencher_planos(config):
    """Preenche aba Planos"""
    print("\\n=== PREENCHENDO PLANOS ===")
    planos = config.get('planos', {})
    
    digitar_texto(planos.get('plano_contabilizacao', '51'))
    tab()
    digitar_texto(planos.get('plano_contas', '90113'))
    tab()
    digitar_texto(planos.get('plano_historicos', '9001'))
    tab()
    digitar_texto(planos.get('centro_custo', ''))
    tab()
    digitar_texto(planos.get('plano_tributario', ''))
    tab()
    digitar_texto(planos.get('plano_contas_referencial', ''))
    
    print("✅ Planos preenchidos!")

# ================= PREENCHIMENTO ENQUADRAMENTO =================

def preencher_enquadramento(config):
    """Preenche aba Enquadramento Federal"""
    print("\\n=== PREENCHENDO ENQUADRAMENTO FEDERAL ===")
    enq = config.get('enquadramento', {})
    
    # Enquadramento federal (dropdown)
    digitar_texto(enq.get('enquadramento_federal', 'Normal'))
    tab()
    
    # Forma de tributação
    digitar_texto(enq.get('forma_tributacao', ''))
    tab()
    
    # Checkboxes de atividade
    if enq.get('atividade_comercio'):
        space()
    tab()
    if enq.get('atividade_industria'):
        space()
    tab()
    if enq.get('atividade_servico'):
        space()
    tab()
    
    # Anexos Folha
    if enq.get('anexo_folha_iii'):
        space()
    tab()
    if enq.get('anexo_folha_iv'):
        space()
    tab()
    if enq.get('anexo_folha_v'):
        space()
    tab()
    
    # Anexos Fiscal
    if enq.get('anexo_fiscal_iii'):
        space()
    tab()
    if enq.get('anexo_fiscal_iv'):
        space()
    tab()
    if enq.get('anexo_fiscal_v'):
        space()
    tab()
    
    # Relação Folha/Faturamento
    if enq.get('relacao_folha_faturamento_anexo_iii'):
        space()
    tab()
    
    # Demais checkboxes (todos False por padrão)
    tab(4)  # RTT, FCont, RET, EUA
    
    print("✅ Enquadramento preenchido!")

# ================= PREENCHIMENTO LALUR =================

def preencher_lalur(config):
    """Preenche aba Lalur (apenas para Lucro Real)"""
    print("\\n=== PREENCHENDO LALUR ===")
    lalur = config.get('lalur', {})
    
    digitar_texto(lalur.get('plano_integracao_contabil', '4'))
    tab()
    digitar_texto(lalur.get('parte_a', '90001'))
    tab()
    digitar_texto(lalur.get('parte_a_estimado', '90002'))
    tab()
    digitar_texto(lalur.get('parte_b', '90001'))
    tab()
    digitar_texto(lalur.get('tributacao', '90001'))
    tab()
    digitar_texto(lalur.get('indice', '1'))
    tab()
    digitar_texto(lalur.get('data_incorporacao', ''))
    
    print("✅ Lalur preenchido!")

# ================= PREENCHIMENTO FISCAL - PARÂMETROS =================

def preencher_fiscal_parametros(config):
    """Preenche sub-aba Fiscal > Parâmetros"""
    print("\\n=== PREENCHENDO FISCAL - PARÂMETROS ===")
    fp = config.get('fiscal_parametros', {})
    
    # Códigos principais
    digitar_texto(fp.get('ir_csll', ''))
    tab()
    digitar_texto(fp.get('ipi', ''))
    tab()
    digitar_texto(fp.get('pis_cofins_lr', ''))
    tab()
    digitar_texto(fp.get('sped_fiscal', '1'))
    tab()
    digitar_texto(fp.get('ciap', ''))
    tab()
    digitar_texto(fp.get('bloco_p', ''))
    tab()
    digitar_texto(fp.get('cprb_reinf', '2'))
    tab()
    digitar_texto(fp.get('bloco_m', ''))
    tab()
    
    # Checkboxes lançar produtos
    if fp.get('lancar_produtos_entradas', True):
        space()
    tab()
    if fp.get('lancar_produtos_saidas', True):
        space()
    tab()
    
    # Radio buttons e checkboxes de dedução
    tab(2)  # Tipo apuração
    
    # Checkboxes deduzir
    for campo in ['deduzir_pis', 'deduzir_cofins', 'deduzir_csll', 'deduzir_irrf', 'deduzir_issqn', 'deduzir_inss']:
        if fp.get(campo, True):
            space()
        tab()
    
    # Funrural
    if fp.get('deduzir_funrural', False):
        space()
    
    print("✅ Fiscal Parâmetros preenchido!")

# ================= PREENCHIMENTO FISCAL - FEDERAL =================

def preencher_fiscal_federal(config):
    """Preenche sub-aba Fiscal > Federal"""
    print("\\n=== PREENCHENDO FISCAL - FEDERAL ===")
    ff = config.get('fiscal_federal', {})
    
    # SPED ICMS/IPI
    digitar_texto(ff.get('sped_icms_ipi_perfil', 'A - Perfil A'))
    tab()
    digitar_texto(ff.get('sped_icms_ipi_atividade', '1'))
    tab()
    digitar_texto(ff.get('sped_icms_ipi_data_obrigatoriedade', ''))
    tab()
    digitar_texto(ff.get('sped_icms_ipi_classificacao', ''))
    tab()
    
    # Checkbox CFOP
    if ff.get('preencher_cfop_cst_c425', False):
        space()
    tab()
    
    # SPED Contribuições
    digitar_texto(ff.get('natureza_pessoa_juridica', '00 - Sociedade empresária em geral'))
    tab()
    digitar_texto(ff.get('atividade_preponderante', ''))
    tab()
    digitar_texto(ff.get('tipo_incidencia', '1 - Apuração somente sobre a receita bruta'))
    tab()
    digitar_texto(ff.get('sped_contribuicoes_data_obrigatoriedade', ''))
    tab()
    
    # Reinf
    digitar_texto(ff.get('reinf_data_obrigatoriedade', '01/07/2023'))
    tab()
    if ff.get('entrega_ecd', False):
        space()
    tab()
    
    # Dmed
    digitar_texto(ff.get('dmed_tipo_declarante', '0 - Não se aplica'))
    tab()
    
    # Simples Nacional
    digitar_texto(ff.get('simples_codigo_acesso', ''))
    tab()
    digitar_texto(ff.get('simples_codigo_configuracao', ''))
    
    print("✅ Fiscal Federal preenchido!")

# ================= PREENCHIMENTO FISCAL - ESTADUAL =================

def preencher_fiscal_estadual_gerais(config):
    """Preenche sub-aba Fiscal > Estadual > Gerais"""
    print("\\n=== PREENCHENDO FISCAL - ESTADUAL GERAIS ===")
    fe = config.get('fiscal_estadual_gerais', {})
    
    # Substituto tributário
    if fe.get('substituto_tributario', False):
        space()
    tab()
    
    # Porte empresa
    digitar_texto(fe.get('porte_empresa', '1'))
    tab()
    
    # Checkbox valor contábil
    if fe.get('lancar_base_icms_valor_contabil', False):
        space()
    tab()
    
    # ICMS lançar em
    digitar_texto(fe.get('icms_lancar_em', 'Isentas'))
    tab()
    
    # Antecipação
    if fe.get('antecipacao_imposto', False):
        space()
    tab()
    
    # Reduções base ICMS
    digitar_texto(fe.get('reducao_base_icms_entradas', '0,0000'))
    tab()
    digitar_texto(fe.get('reducao_base_icms_saidas', '0,0000'))
    tab()
    
    # ICMS Monofásico
    if fe.get('considerar_icms_monofasico', False):
        space()
    tab()
    
    # Parâmetros ICMS
    digitar_texto(fe.get('dia_vencimento', '00'))
    tab()
    if fe.get('antecipar_sabados_domingos_feriados', False):
        space()
    tab()
    
    # Juros e Multa
    digitar_texto(fe.get('juros_a_partir_de', '00'))
    tab()
    digitar_texto(fe.get('juros_percentual', '0,0000'))
    tab(2)
    digitar_texto(fe.get('multa_a_partir_de', '00'))
    tab()
    digitar_texto(fe.get('multa_percentual', '0,0000'))
    tab(2)
    
    # GIA ST
    if fe.get('apura_gia_st', False):
        space()
    tab()
    digitar_texto(fe.get('configuracao_gia_st', ''))
    
    print("✅ Fiscal Estadual Gerais preenchido!")

# ================= PREENCHIMENTO FISCAL - MUNICIPAL =================

def preencher_fiscal_municipal(config):
    """Preenche sub-aba Fiscal > Municipal"""
    print("\\n=== PREENCHENDO FISCAL - MUNICIPAL ===")
    fm = config.get('fiscal_municipal', {})
    
    if fm.get('movimenta_servicos', True):
        space()
    tab()
    digitar_texto(fm.get('aliquota_iss', '0,0000'))
    tab()
    digitar_texto(fm.get('reducao_base_issqn', '0,0000'))
    tab()
    
    if fm.get('movimenta_irrf', True):
        space()
    tab()
    digitar_texto(fm.get('aliquota_irrf', '0,0000'))
    tab()
    digitar_texto(fm.get('irrf_isento', '0,0000'))
    tab()
    
    if fm.get('retencao_inss', True):
        space()
    tab()
    digitar_texto(fm.get('valor_minimo_inss', '0,0000'))
    tab()
    digitar_texto(fm.get('aliquota_inss', '0,0000'))
    tab()
    
    digitar_texto(fm.get('valor_iss_fixo', '0,00'))
    
    print("✅ Fiscal Municipal preenchido!")

# ================= PREENCHIMENTO FOLHA - GPS =================

def preencher_folha_gps(config):
    """Preenche sub-aba Folha > GPS"""
    print("\\n=== PREENCHENDO FOLHA - GPS ===")
    gps = config.get('folha_gps', {})
    
    # FPAS e Terceiros
    digitar_texto(gps.get('fpas', '35'))
    tab()
    digitar_texto(gps.get('terceiros', '507'))
    tab()
    digitar_texto(gps.get('terceiros_valor', '0,00'))
    tab()
    
    # Simples optante
    if gps.get('simples_optante', False):
        space()
    tab()
    
    # Percentuais
    digitar_texto(gps.get('pro_laboristas_percentual', '0,00'))
    tab()
    digitar_texto(gps.get('autonomos_percentual', '0,00'))
    tab()
    digitar_texto(gps.get('colaboradores_percentual', '0,00'))
    tab()
    
    # RAT e FAP
    digitar_texto(gps.get('rat_percentual', '3,00'))
    tab()
    digitar_texto(gps.get('fap_percentual', '0,5000'))
    tab()
    digitar_texto(gps.get('rat_x_fap_percentual', '1,5000'))
    tab()
    
    # Classificação tributária
    digitar_texto(gps.get('classificacao_tributaria', '1'))
    
    print("✅ Folha GPS preenchido!")

# ================= PREENCHIMENTO FOLHA - ESOCIAL =================

def preencher_folha_esocial(config):
    """Preenche sub-aba Folha > eSocial"""
    print("\\n=== PREENCHENDO FOLHA - ESOCIAL ===")
    es = config.get('folha_esocial', {})
    
    # Faseamento
    digitar_texto(es.get('eventos_tabela', '01/01/2019'))
    tab()
    digitar_texto(es.get('eventos_nao_periodicos', '10/04/2019'))
    tab()
    digitar_texto(es.get('eventos_periodicos', '01/05/2021'))
    tab()
    digitar_texto(es.get('dctfweb', '07/2021'))
    tab()
    digitar_texto(es.get('seguranca_saude_trabalho', '10/01/2022'))
    tab()
    digitar_texto(es.get('reclamatoria_trabalhista', '01/10/2023'))
    tab()
    digitar_texto(es.get('fgts_digital', '01/03/2024'))
    tab()
    digitar_texto(es.get('exame_toxicologico', '01/08/2024'))
    tab()
    
    # Grupo
    digitar_texto(es.get('grupo', 'Grupo 3'))
    tab()
    
    # Tipo ambiente
    digitar_texto(es.get('tipo_ambiente', 'Produção - Real'))
    
    print("✅ Folha eSocial preenchido!")

# ================= MENU PRINCIPAL =================

def exibir_menu():
    """Exibe menu de opções"""
    print("\\n" + "="*50)
    print("  MENU DE PREENCHIMENTO")
    print("="*50)
    print("  1. Preencher TUDO (recomendado)")
    print("  2. Apenas Empresa + Sócios")
    print("  3. Apenas Configurações (Contadores, Planos...)")
    print("  4. Aba específica")
    print("  0. Sair")
    print("="*50)
    return input("\\nEscolha uma opção: ")

def menu_aba_especifica():
    """Menu para escolher aba específica"""
    print("\\n  Qual aba deseja preencher?")
    print("  1. Contadores")
    print("  2. Planos")
    print("  3. Enquadramento Federal")
    print("  4. Lalur")
    print("  5. Fiscal - Parâmetros")
    print("  6. Fiscal - Federal")
    print("  7. Fiscal - Estadual Gerais")
    print("  8. Fiscal - Municipal")
    print("  9. Folha - GPS")
    print("  10. Folha - eSocial")
    return input("\\nEscolha: ")

def main():
    print("="*60)
    print("  SCI Único - Robô de Preenchimento Automático COMPLETO")
    print("  Business Contabilidade - Portal Societário")
    print("  Versão 2.0 - Suporta TODAS as abas")
    print("="*60)
    
    # Verificar arquivo
    if len(sys.argv) > 1:
        arquivo = sys.argv[1]
    else:
        arquivo = "sci_dados.json"
    
    if not os.path.exists(arquivo):
        print(f"\\n❌ Arquivo {arquivo} não encontrado!")
        print("\\nUso: python sci_robo.py [arquivo.json]")
        input("\\nPressione ENTER para sair...")
        return
    
    # Carregar dados
    with open(arquivo, 'r', encoding='utf-8') as f:
        dados = json.load(f)
    
    empresa = dados.get('empresa', {})
    socios = dados.get('socios', [])
    config = dados.get('configuracoes', {})
    perfil = dados.get('perfil', {})
    
    print(f"\\n📄 Arquivo: {arquivo}")
    print(f"   Empresa: {empresa.get('razao_social', 'N/A')}")
    print(f"   CNPJ: {empresa.get('cnpj', 'N/A')}")
    print(f"   Sócios: {len(socios)}")
    print(f"   Regime: {perfil.get('regime_tributario', 'N/A').upper()}")
    print(f"   Atividade: {perfil.get('tipo_atividade', 'N/A')}")
    if perfil.get('regime_tributario') == 'simples':
        print(f"   Anexo: {perfil.get('enquadramento_simples', 'N/A')}")
    
    opcao = exibir_menu()
    
    if opcao == "0":
        return
    
    print("\\n⚠️  ATENÇÃO:")
    print("  - Abra o SCI Único na tela correspondente")
    print("  - Posicione o cursor no PRIMEIRO campo")
    print("  - Para CANCELAR, mova o mouse para o canto da tela")
    
    if opcao == "1":
        # Preencher tudo
        ir_para_aba("CADASTRAIS - Empresa")
        print("\\n⏳ Iniciando em 3 segundos...")
        time.sleep(3)
        preencher_empresa(empresa)
        
        for i, socio in enumerate(socios):
            ir_para_aba(f"CADASTRAIS - Sócio {i+1}/{len(socios)}")
            time.sleep(1)
            preencher_socio(socio)
        
        ir_para_aba("CONTADORES")
        preencher_contadores(config)
        
        ir_para_aba("PLANOS")
        preencher_planos(config)
        
        ir_para_aba("ENQUADRAMENTO FEDERAL")
        preencher_enquadramento(config)
        
        if perfil.get('regime_tributario') == 'real':
            ir_para_aba("LALUR")
            preencher_lalur(config)
        
        ir_para_aba("FISCAL > Parâmetros")
        preencher_fiscal_parametros(config)
        
        ir_para_aba("FISCAL > Federal")
        preencher_fiscal_federal(config)
        
        ir_para_aba("FISCAL > Estadual > Gerais")
        preencher_fiscal_estadual_gerais(config)
        
        ir_para_aba("FISCAL > Municipal")
        preencher_fiscal_municipal(config)
        
        ir_para_aba("FOLHA > GPS")
        preencher_folha_gps(config)
        
        ir_para_aba("FOLHA > eSocial")
        preencher_folha_esocial(config)
    
    elif opcao == "2":
        # Apenas empresa + sócios
        ir_para_aba("CADASTRAIS - Empresa")
        time.sleep(2)
        preencher_empresa(empresa)
        
        for i, socio in enumerate(socios):
            ir_para_aba(f"CADASTRAIS - Sócio {i+1}/{len(socios)}")
            time.sleep(1)
            preencher_socio(socio)
    
    elif opcao == "3":
        # Apenas configurações
        ir_para_aba("CONTADORES")
        preencher_contadores(config)
        
        ir_para_aba("PLANOS")
        preencher_planos(config)
        
        ir_para_aba("ENQUADRAMENTO FEDERAL")
        preencher_enquadramento(config)
        
        if perfil.get('regime_tributario') == 'real':
            ir_para_aba("LALUR")
            preencher_lalur(config)
        
        ir_para_aba("FISCAL > Parâmetros")
        preencher_fiscal_parametros(config)
        
        ir_para_aba("FISCAL > Federal")
        preencher_fiscal_federal(config)
        
        ir_para_aba("FISCAL > Estadual > Gerais")
        preencher_fiscal_estadual_gerais(config)
        
        ir_para_aba("FISCAL > Municipal")
        preencher_fiscal_municipal(config)
        
        ir_para_aba("FOLHA > GPS")
        preencher_folha_gps(config)
        
        ir_para_aba("FOLHA > eSocial")
        preencher_folha_esocial(config)
    
    elif opcao == "4":
        # Aba específica
        aba = menu_aba_especifica()
        abas = {
            "1": ("CONTADORES", preencher_contadores),
            "2": ("PLANOS", preencher_planos),
            "3": ("ENQUADRAMENTO FEDERAL", preencher_enquadramento),
            "4": ("LALUR", preencher_lalur),
            "5": ("FISCAL > Parâmetros", preencher_fiscal_parametros),
            "6": ("FISCAL > Federal", preencher_fiscal_federal),
            "7": ("FISCAL > Estadual > Gerais", preencher_fiscal_estadual_gerais),
            "8": ("FISCAL > Municipal", preencher_fiscal_municipal),
            "9": ("FOLHA > GPS", preencher_folha_gps),
            "10": ("FOLHA > eSocial", preencher_folha_esocial),
        }
        if aba in abas:
            nome, func = abas[aba]
            ir_para_aba(nome)
            func(config)
    
    print("\\n" + "="*50)
    print("  ✅ PREENCHIMENTO CONCLUÍDO!")
    print("="*50)
    print("\\n📝 Revise os dados e SALVE o cadastro no SCI Único.")
    input("\\nPressione ENTER para sair...")

if __name__ == "__main__":
    main()
'''
    
    return Response(
        content=script,
        media_type="text/plain",
        headers={
            "Content-Disposition": "attachment; filename=sci_robo.py"
        }
    )

# ============ HISTÓRICO DE CADASTROS ============

@api_router.get("/cadastros/historico")
async def listar_historico_cadastros(
    current_user: dict = Depends(get_current_user)
):
    """Lista todas as empresas cadastradas via ferramenta de Cadastros (visível para todos)"""
    cadastros = await db.cadastros_externos.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    
    return {"cadastros": cadastros}

@api_router.get("/cadastros/historico/{cadastro_id}")
async def get_cadastro_detalhe(
    cadastro_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retorna detalhes de um cadastro específico (visível para todos)"""
    cadastro = await db.cadastros_externos.find_one(
        {"id": cadastro_id},
        {"_id": 0}
    )
    if not cadastro:
        raise HTTPException(status_code=404, detail="Cadastro não encontrado")
    return cadastro

@api_router.delete("/cadastros/historico/{cadastro_id}")
async def delete_cadastro_historico(
    cadastro_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove um cadastro do histórico (qualquer usuário pode remover)"""
    result = await db.cadastros_externos.delete_one(
        {"id": cadastro_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cadastro não encontrado")
    return {"message": "Cadastro removido do histórico"}

# ============ EXTRAÇÃO POR IA PARA CADASTROS ============

@api_router.post("/cadastros/extrair-dados-multiplos")
async def extrair_dados_multiplos_documentos(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Extrai e consolida dados de MÚLTIPLOS documentos empresariais usando IA.
    A IA analisa cada documento e mescla as informações automaticamente.
    
    Aceita: Cartão CNPJ, Certidão Inteiro Teor, Contrato Social, Comprovante de Endereço, RG/CNH dos sócios
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        import tempfile
        import json as json_lib
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Chave de API não configurada")
        
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="Nenhum arquivo enviado")
        
        # Processar cada arquivo e salvar temporariamente
        tmp_files = []
        file_contents = []
        
        for file in files:
            content_type = file.content_type or ''
            filename = file.filename or ''
            
            if 'pdf' in content_type or filename.endswith('.pdf'):
                mime_type = 'application/pdf'
                suffix = '.pdf'
            elif 'png' in content_type or filename.endswith('.png'):
                mime_type = 'image/png'
                suffix = '.png'
            elif 'jpeg' in content_type or 'jpg' in content_type or filename.endswith(('.jpg', '.jpeg')):
                mime_type = 'image/jpeg'
                suffix = '.jpg'
            else:
                mime_type = 'application/pdf'
                suffix = '.pdf'
            
            file_content = await file.read()
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
                tmp_files.append(tmp_path)
                file_contents.append(FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type))
        
        system_message = """Você é um especialista em análise de documentos empresariais brasileiros.
Você receberá MÚLTIPLOS documentos de uma mesma empresa. Sua tarefa é:

1. ANALISAR CADA DOCUMENTO separadamente
2. IDENTIFICAR o tipo de cada documento (Cartão CNPJ, Contrato Social, Certidão Junta, RG/CNH, Comprovante Endereço, etc.)
3. EXTRAIR as informações relevantes de cada um
4. CONSOLIDAR todas as informações em um único JSON, priorizando:
   - Cartão CNPJ: CNPJ, Razão Social, Nome Fantasia, Data Abertura, Situação
   - Contrato Social/Alteração: Sócios, Capital Social, Objeto Social, Administração
   - Certidão Junta: NIRE, dados complementares
   - RG/CNH dos sócios: Nome completo, CPF, Data/Local Nascimento, Estado Civil, ENDEREÇO RESIDENCIAL
   - Comprovante Endereço: Endereço atualizado

IMPORTANTE: 
- Se houver informações conflitantes entre documentos, priorize o documento mais oficial (Cartão CNPJ > Contrato > outros)
- Para dados dos SÓCIOS, extraia de TODOS os documentos (RG, CNH, Contrato, Comprovante de Residência) e consolide
- Inclua a naturalidade (cidade/estado de nascimento) dos sócios quando disponível
- SEMPRE extraia o ENDEREÇO RESIDENCIAL de cada sócio (pode estar no RG, CNH, comprovante de residência ou contrato social)

SEMPRE responda APENAS com um JSON válido, sem markdown, sem explicações.
O JSON deve seguir esta estrutura:

{
    "cnpj": "00.000.000/0001-00",
    "razao_social": "NOME DA EMPRESA LTDA",
    "nome_fantasia": "Nome Fantasia",
    "inscricao_estadual": "000.000.000.000 ou ISENTO",
    "inscricao_municipal": "000.000.000",
    "data_abertura": "DD/MM/AAAA",
    "data_fundacao": "DD/MM/AAAA",
    "endereco": {
        "logradouro": "Rua/Av completo",
        "numero": "000",
        "complemento": "Sala/Andar",
        "bairro": "Bairro",
        "cidade": "Cidade",
        "estado": "UF",
        "cep": "00000-000"
    },
    "telefone": "(00) 00000-0000",
    "email": "email@empresa.com",
    "capital_social": "R$ 0.000,00",
    "objeto_social": "Descrição das atividades",
    "socios": [
        {
            "nome": "NOME COMPLETO",
            "cpf": "000.000.000-00",
            "rg": "00.000.000-0",
            "data_nascimento": "DD/MM/AAAA",
            "naturalidade": "Cidade/UF",
            "estado_civil": "Solteiro/Casado/etc",
            "profissao": "Empresário(a)",
            "participacao": "50",
            "administrador": true,
            "endereco": "Rua Exemplo, 123 - Bairro, Cidade/UF - CEP 00000-000"
        }
    ],
    "nire": "00000000000",
    "regime_tributario": "Simples Nacional / Lucro Presumido / Lucro Real",
    "situacao_cadastral": "ATIVA",
    "documentos_analisados": ["Cartão CNPJ", "Contrato Social", "RG Sócio 1"]
}

Se algum campo não for encontrado em nenhum documento, use null."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"cadastro-multi-extract-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text=f"Analise estes {len(files)} documentos empresariais e extraia/consolide TODAS as informações em um único JSON. Identifique o tipo de cada documento e extraia os dados relevantes de cada um.",
            file_contents=file_contents
        )
        
        response = await chat.send_message(user_message)
        
        # Limpar arquivos temporários
        for tmp_path in tmp_files:
            try:
                os.unlink(tmp_path)
            except:
                pass
        
        # Parsear JSON da resposta
        try:
            json_str = response.strip()
            if json_str.startswith('```'):
                json_str = json_str.split('```')[1]
                if json_str.startswith('json'):
                    json_str = json_str[4:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]
            
            dados = json_lib.loads(json_str.strip())
        except json_lib.JSONDecodeError:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                dados = json_lib.loads(json_match.group())
            else:
                dados = {"raw_text": response}
        
        return {
            "success": True,
            "dados": dados,
            "arquivos_processados": len(files)
        }
        
    except Exception as e:
        logger.error(f"Erro ao extrair dados de múltiplos documentos: {str(e)}")
        return {
            "success": False,
            "message": f"Erro na extração: {str(e)}",
            "dados": {}
        }

@api_router.post("/cadastros/extrair-dados")
async def extrair_dados_cadastro(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Extrai dados de documentos empresariais usando IA.
    Aceita: Cartão CNPJ, Certidão Inteiro Teor, Contrato Social, Comprovante de Endereço
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        import tempfile
        import json as json_lib
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Chave de API não configurada")
        
        # Determinar tipo MIME
        content_type = file.content_type or ''
        filename = file.filename or ''
        
        if 'pdf' in content_type or filename.endswith('.pdf'):
            mime_type = 'application/pdf'
            suffix = '.pdf'
        elif 'png' in content_type or filename.endswith('.png'):
            mime_type = 'image/png'
            suffix = '.png'
        elif 'jpeg' in content_type or 'jpg' in content_type or filename.endswith(('.jpg', '.jpeg')):
            mime_type = 'image/jpeg'
            suffix = '.jpg'
        else:
            mime_type = 'application/pdf'
            suffix = '.pdf'
        
        # Salvar arquivo temporariamente
        file_content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        system_message = """Você é um especialista em análise de documentos empresariais brasileiros.
Sua tarefa é extrair TODOS os dados relevantes de documentos como:
- Cartão CNPJ (Comprovante de Inscrição e de Situação Cadastral)
- Certidão Simplificada ou Inteiro Teor da Junta Comercial
- Contrato Social ou Última Alteração Contratual
- Comprovante de Endereço

EXTRAIA TODOS OS DADOS DISPONÍVEIS, especialmente:
- CNPJ (formato: 00.000.000/0001-00)
- Razão Social completa
- Nome Fantasia (se houver)
- Inscrição Estadual (se constar)
- Inscrição Municipal (se constar)
- Data de Abertura
- Endereço completo (logradouro, número, complemento, bairro, cidade, UF, CEP)
- Telefone e E-mail (se houver)
- Capital Social
- Objeto Social / Atividades (CNAEs)
- Sócios com: Nome, CPF, participação percentual, se é administrador
- NIRE (se houver)

SEMPRE responda APENAS com um JSON válido, sem markdown, sem explicações.
O JSON deve seguir esta estrutura:

{
    "cnpj": "00.000.000/0001-00",
    "razao_social": "NOME DA EMPRESA LTDA",
    "nome_fantasia": "Nome Fantasia",
    "inscricao_estadual": "000.000.000.000 ou ISENTO",
    "inscricao_municipal": "000.000.000",
    "data_abertura": "DD/MM/AAAA",
    "endereco": {
        "logradouro": "Rua/Av completo",
        "numero": "000",
        "complemento": "Sala/Andar",
        "bairro": "Bairro",
        "cidade": "Cidade",
        "estado": "UF",
        "cep": "00000-000"
    },
    "telefone": "(00) 00000-0000",
    "email": "email@empresa.com",
    "capital_social": "R$ 0.000,00",
    "objeto_social": "Descrição das atividades",
    "socios": [
        {
            "nome": "NOME COMPLETO",
            "cpf": "000.000.000-00",
            "participacao": "50",
            "administrador": true
        }
    ],
    "nire": "00000000000",
    "regime_tributario": "Simples Nacional / Lucro Presumido / Lucro Real",
    "situacao_cadastral": "ATIVA"
}

Se algum campo não for encontrado no documento, use null."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"cadastro-extract-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text="Extraia TODOS os dados deste documento empresarial. Retorne APENAS JSON válido.",
            file_contents=[FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)]
        )
        
        response = await chat.send_message(user_message)
        
        # Limpar arquivo temporário
        os.unlink(tmp_path)
        
        # Parsear JSON da resposta
        try:
            json_str = response.strip()
            if json_str.startswith('```'):
                json_str = json_str.split('```')[1]
                if json_str.startswith('json'):
                    json_str = json_str[4:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]
            
            dados = json_lib.loads(json_str.strip())
        except json_lib.JSONDecodeError:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                dados = json_lib.loads(json_match.group())
            else:
                dados = {"raw_text": response}
        
        return {
            "success": True,
            "dados": dados
        }
        
    except Exception as e:
        logger.error(f"Erro ao extrair dados do documento: {str(e)}")
        return {
            "success": False,
            "message": f"Erro na extração: {str(e)}",
            "dados": {}
        }

# ============ CONSULTA SINTEGRA (Inscrição Estadual) ============

@api_router.get("/sintegra/{uf}/{cnpj}")
async def consultar_sintegra(
    uf: str,
    cnpj: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Consulta a Inscrição Estadual no SINTEGRA.
    Retorna a IE se encontrada, ou null se não houver/isento.
    """
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    uf = uf.upper()
    
    if len(cnpj_limpo) != 14:
        raise HTTPException(status_code=400, detail="CNPJ deve ter 14 dígitos")
    
    if uf not in ESTADOS:
        raise HTTPException(status_code=400, detail="UF inválida")
    
    try:
        # Usar API pública do SINTEGRA (via proxy ou scraping básico)
        # Nota: SINTEGRA não tem API oficial, então usamos ReceitaWS que pode ter IE
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Primeiro tentar ReceitaWS que às vezes tem IE
            try:
                response = await client.get(
                    f"https://receitaws.com.br/v1/cnpj/{cnpj_limpo}",
                    headers={"Accept": "application/json"}
                )
                
                if response.status_code == 200:
                    dados = response.json()
                    if dados.get("status") != "ERROR":
                        # ReceitaWS não retorna IE diretamente, mas podemos extrair de outros campos
                        # Se a empresa está ativa e é do estado, provavelmente tem IE
                        return {
                            "success": True,
                            "cnpj": cnpj,
                            "uf": uf,
                            "inscricao_estadual": None,  # ReceitaWS não fornece IE
                            "razao_social": dados.get("nome", ""),
                            "situacao": dados.get("situacao", ""),
                            "message": "SINTEGRA não possui API pública. Verifique diretamente no site: https://www.sintegra.gov.br/"
                        }
            except Exception as e:
                logger.warning(f"Erro ao consultar ReceitaWS: {e}")
        
        # Retornar informação de que precisa consulta manual
        return {
            "success": True,
            "cnpj": cnpj,
            "uf": uf,
            "inscricao_estadual": None,
            "message": f"Consulte manualmente em: http://www.sintegra.gov.br/",
            "url_sintegra": f"http://www.sintegra.gov.br/"
        }
        
    except Exception as e:
        logger.error(f"Erro ao consultar SINTEGRA: {str(e)}")
        return {
            "success": False,
            "message": f"Erro na consulta: {str(e)}",
            "inscricao_estadual": None
        }

# Variável para os estados (usado no endpoint SINTEGRA)
ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

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
            total_perc = 0
            for s in socios:
                if hasattr(s, 'participacao') and s.participacao:
                    perc = float(s.participacao) if s.participacao else 0
                    total_perc += perc
                    patrimonio_distribuicao += f"{s.nome.upper()} - {s.participacao}%\n"
            patrimonio_distribuicao += f"----------------------------------------\nTOTAL - 100%"
        
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
