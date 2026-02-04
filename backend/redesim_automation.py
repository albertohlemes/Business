"""
Serviço de automação para consulta de licenças no portal REDESIM SP
Usa Playwright com certificado digital A1 (.pfx)
"""
import asyncio
import os
import tempfile
import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any
from cryptography.hazmat.primitives.serialization import pkcs12, Encoding, PrivateFormat, NoEncryption
from cryptography.hazmat.backends import default_backend
from playwright.async_api import async_playwright, Browser, Page

class RedesimAutomation:
    """Classe para automação do portal REDESIM SP"""
    
    REDESIM_URL = "https://vreredesim.sp.gov.br"
    GOVBR_URL = "https://sso.acesso.gov.br"
    
    def __init__(self, cert_path: str, cert_password: str):
        self.cert_path = cert_path
        self.cert_password = cert_password
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self._cert_pem_path: Optional[str] = None
        self._key_pem_path: Optional[str] = None
    
    def _extract_cert_and_key(self) -> tuple:
        """Extrai certificado e chave do arquivo .pfx"""
        with open(self.cert_path, 'rb') as f:
            pfx_data = f.read()
        
        # Carregar PKCS12
        private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
            pfx_data, 
            self.cert_password.encode(), 
            default_backend()
        )
        
        # Criar arquivos temporários para cert e key
        cert_pem = certificate.public_bytes(Encoding.PEM)
        key_pem = private_key.private_bytes(
            Encoding.PEM,
            PrivateFormat.TraditionalOpenSSL,
            NoEncryption()
        )
        
        # Salvar em arquivos temporários
        cert_file = tempfile.NamedTemporaryFile(mode='wb', suffix='.pem', delete=False)
        cert_file.write(cert_pem)
        cert_file.close()
        self._cert_pem_path = cert_file.name
        
        key_file = tempfile.NamedTemporaryFile(mode='wb', suffix='.pem', delete=False)
        key_file.write(key_pem)
        key_file.close()
        self._key_pem_path = key_file.name
        
        return self._cert_pem_path, self._key_pem_path
    
    def _cleanup_temp_files(self):
        """Remove arquivos temporários"""
        for path in [self._cert_pem_path, self._key_pem_path]:
            if path and os.path.exists(path):
                os.unlink(path)
    
    async def iniciar_navegador(self) -> bool:
        """Inicia o navegador com suporte a certificado"""
        try:
            # Extrair certificado
            cert_path, key_path = self._extract_cert_and_key()
            
            playwright = await async_playwright().start()
            
            # Configurar contexto com certificado client
            self.browser = await playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ]
            )
            
            # Criar contexto com certificado
            context = await self.browser.new_context(
                ignore_https_errors=True,
                # Nota: Playwright não suporta client certificates diretamente
                # Vamos tentar via navegação manual
            )
            
            self.page = await context.new_page()
            return True
            
        except Exception as e:
            print(f"Erro ao iniciar navegador: {e}")
            return False
    
    async def fazer_login_govbr(self) -> Dict[str, Any]:
        """
        Tenta fazer login no Gov.br via certificado digital
        Retorna status do login
        """
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            # Acessar REDESIM
            await self.page.goto(self.REDESIM_URL, timeout=30000)
            await self.page.wait_for_load_state('networkidle')
            
            # Procurar botão de login/entrar
            login_btn = self.page.locator('a:has-text("Entrar"), button:has-text("Entrar"), a:has-text("Login")')
            if await login_btn.count() > 0:
                await login_btn.first.click()
                await self.page.wait_for_timeout(3000)
            
            # Screenshot para debug
            screenshot = await self.page.screenshot()
            screenshot_b64 = base64.b64encode(screenshot).decode()
            
            current_url = self.page.url
            
            return {
                "success": True,
                "message": "Navegador iniciado. Login via certificado requer interação manual no Gov.br",
                "current_url": current_url,
                "screenshot": screenshot_b64[:500] + "..." if len(screenshot_b64) > 500 else screenshot_b64,
                "instrucoes": [
                    "1. O portal REDESIM usa autenticação Gov.br",
                    "2. Login com certificado digital requer popup do sistema",
                    "3. Use o link direto para acessar manualmente",
                ]
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def consultar_licenca_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """
        Consulta licença por CNPJ no portal
        """
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            # Navegar para área de consulta
            await self.page.goto(f"{self.REDESIM_URL}/consulta-licenca", timeout=30000)
            await self.page.wait_for_load_state('networkidle')
            
            # Tentar encontrar campo de CNPJ
            cnpj_input = self.page.locator('input[name*="cnpj"], input[placeholder*="CNPJ"], input#cnpj')
            
            if await cnpj_input.count() > 0:
                await cnpj_input.first.fill(cnpj)
                
                # Procurar botão de consulta
                consultar_btn = self.page.locator('button:has-text("Consultar"), button:has-text("Pesquisar"), input[type="submit"]')
                if await consultar_btn.count() > 0:
                    await consultar_btn.first.click()
                    await self.page.wait_for_timeout(5000)
            
            # Capturar resultado
            content = await self.page.content()
            screenshot = await self.page.screenshot()
            
            return {
                "success": True,
                "cnpj": cnpj,
                "url": self.page.url,
                "page_title": await self.page.title(),
                "screenshot_b64": base64.b64encode(screenshot).decode()[:1000],
            }
            
        except Exception as e:
            return {"success": False, "error": str(e), "cnpj": cnpj}
    
    async def fechar(self):
        """Fecha o navegador e limpa recursos"""
        if self.browser:
            await self.browser.close()
        self._cleanup_temp_files()


async def consultar_redesim(cert_path: str, cert_password: str, cnpj: str) -> Dict[str, Any]:
    """
    Função helper para consultar REDESIM
    """
    automation = RedesimAutomation(cert_path, cert_password)
    
    try:
        if not await automation.iniciar_navegador():
            return {"success": False, "error": "Falha ao iniciar navegador"}
        
        login_result = await automation.fazer_login_govbr()
        if not login_result.get("success"):
            return login_result
        
        result = await automation.consultar_licenca_cnpj(cnpj)
        return result
        
    finally:
        await automation.fechar()
