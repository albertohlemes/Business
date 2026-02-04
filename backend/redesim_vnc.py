"""
Automação REDESIM SP - Consulta de Licenças com noVNC
Navegador visível via VNC para o usuário fazer login
"""
import asyncio
import os
import base64
from datetime import datetime
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Browser, Page
import logging

# Configurar path dos browsers do Playwright
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/app/backend/browsers'
os.environ['DISPLAY'] = ':99'

logger = logging.getLogger(__name__)

class RedesimVNC:
    """Automação REDESIM com browser visível via noVNC"""
    
    REDESIM_URL = "https://vreredesim.sp.gov.br"
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.cnpj_atual: Optional[str] = None
        self.status = "idle"
    
    async def iniciar(self) -> Dict[str, Any]:
        """Inicia navegador VISÍVEL no display virtual"""
        try:
            # Fechar sessão anterior
            await self.fechar()
            
            self.playwright = await async_playwright().start()
            
            self.browser = await self.playwright.chromium.launch(
                headless=False,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ],
            )
            
            self.page = await self.browser.new_page()
            await self.page.set_viewport_size({'width': 1200, 'height': 700})
            self.status = "iniciado"
            
            return {"success": True, "message": "Browser iniciado"}
            
        except Exception as e:
            logger.error(f"Erro ao iniciar browser: {e}")
            return {"success": False, "error": str(e)}
    
    async def navegar_redesim(self) -> Dict[str, Any]:
        """Navega para o portal REDESIM"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            self.status = "navegando"
            await self.page.goto(self.REDESIM_URL, timeout=30000)
            await self.page.wait_for_timeout(2000)
            self.status = "na_pagina"
            return {"success": True, "url": self.page.url}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def clicar_login(self) -> Dict[str, Any]:
        """Clica no botão de login"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            self.status = "procurando_login"
            
            selectors = [
                'text=Entrar com gov.br',
                'text=Entrar',
                'a[href*="govbr"]',
                'button:has-text("Entrar")',
            ]
            
            for sel in selectors:
                try:
                    btn = self.page.locator(sel).first
                    if await btn.count() > 0:
                        await btn.click()
                        await self.page.wait_for_timeout(3000)
                        self.status = "aguardando_login"
                        return {"success": True, "url": self.page.url}
                except:
                    continue
            
            return {"success": False, "error": "Botão de login não encontrado"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def verificar_login(self) -> Dict[str, Any]:
        """Verifica se o login foi feito"""
        if not self.page:
            return {"logged_in": False, "error": "Browser não iniciado"}
        
        try:
            url = self.page.url
            
            # Se ainda está no Gov.br, não logou
            if 'acesso.gov.br' in url or 'sso.acesso' in url:
                return {"logged_in": False}
            
            # Se voltou para REDESIM, provavelmente logou
            if 'vreredesim' in url:
                self.status = "logado"
                return {"logged_in": True}
            
            return {"logged_in": False, "url": url}
            
        except Exception as e:
            return {"logged_in": False, "error": str(e)}
    
    async def consultar_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """Faz a consulta do CNPJ"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            self.status = "consultando"
            self.cnpj_atual = cnpj
            cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '')
            
            # Procurar link de consulta
            consulta_links = ['text=Consultar', 'text=Licenças', 'a[href*="consulta"]']
            for sel in consulta_links:
                try:
                    link = self.page.locator(sel).first
                    if await link.count() > 0:
                        await link.click()
                        await self.page.wait_for_timeout(2000)
                        break
                except:
                    continue
            
            # Procurar campo CNPJ
            campos = ['input[name*="cnpj" i]', 'input[placeholder*="CNPJ" i]', 'input[type="text"]']
            for sel in campos:
                try:
                    campo = self.page.locator(sel).first
                    if await campo.count() > 0:
                        await campo.clear()
                        await campo.fill(cnpj_limpo)
                        await self.page.wait_for_timeout(500)
                        break
                except:
                    continue
            
            # Clicar em consultar
            btns = ['button:has-text("Consultar")', 'button:has-text("Pesquisar")', 'button[type="submit"]']
            for sel in btns:
                try:
                    btn = self.page.locator(sel).first
                    if await btn.count() > 0:
                        await btn.click()
                        await self.page.wait_for_timeout(5000)
                        break
                except:
                    continue
            
            self.status = "consulta_realizada"
            
            # Extrair dados
            dados = await self._extrair_dados()
            
            return {"success": True, "cnpj": cnpj, "dados": dados}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _extrair_dados(self) -> Dict[str, Any]:
        """Extrai dados da página"""
        dados = {}
        try:
            texto = await self.page.inner_text('body')
            texto_lower = texto.lower()
            
            if 'vigente' in texto_lower or 'ativa' in texto_lower:
                dados['status'] = 'ativa'
            elif 'vencida' in texto_lower:
                dados['status'] = 'vencida'
            elif 'pendente' in texto_lower:
                dados['status'] = 'pendente'
            
            import re
            datas = re.findall(r'\d{2}/\d{2}/\d{4}', texto)
            if datas:
                dados['vencimento'] = datas[-1]
        except:
            pass
        return dados
    
    async def screenshot(self) -> str:
        """Captura screenshot"""
        if not self.page:
            return ""
        try:
            img = await self.page.screenshot()
            return base64.b64encode(img).decode()
        except:
            return ""
    
    async def fechar(self):
        """Fecha o browser"""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except:
            pass
        finally:
            self.browser = None
            self.page = None
            self.playwright = None
            self.status = "fechado"


# Instância global
_instance: Optional[RedesimVNC] = None

def get_vnc_instance() -> RedesimVNC:
    global _instance
    if _instance is None:
        _instance = RedesimVNC()
    return _instance

async def executar_fluxo_completo(cnpj: str) -> Dict[str, Any]:
    """Executa fluxo: iniciar -> navegar -> login -> aguardar"""
    vnc = get_vnc_instance()
    resultado = {"etapas": []}
    
    try:
        # Iniciar
        res = await vnc.iniciar()
        resultado["etapas"].append({"nome": "iniciar_browser", **res})
        if not res.get("success"):
            return resultado
        
        # Navegar
        res = await vnc.navegar_redesim()
        resultado["etapas"].append({"nome": "navegar_redesim", **res})
        if not res.get("success"):
            return resultado
        
        # Clicar login
        res = await vnc.clicar_login()
        resultado["etapas"].append({"nome": "clicar_login", **res})
        
        resultado["aguardando_login"] = True
        resultado["cnpj"] = cnpj
        resultado["mensagem"] = "Faça login no Gov.br com seu certificado digital!"
        
        return resultado
        
    except Exception as e:
        resultado["error"] = str(e)
        return resultado

async def continuar_apos_login(cnpj: str) -> Dict[str, Any]:
    """Continua após o login"""
    vnc = get_vnc_instance()
    resultado = {"etapas": []}
    
    try:
        # Verificar login
        login = await vnc.verificar_login()
        resultado["etapas"].append({"nome": "verificar_login", **login})
        
        if not login.get("logged_in"):
            return {"success": False, "message": "Login não detectado", **resultado}
        
        # Consultar
        res = await vnc.consultar_cnpj(cnpj)
        resultado["etapas"].append({"nome": "consultar_cnpj", **res})
        
        resultado["success"] = True
        resultado["dados"] = res.get("dados", {})
        
        return resultado
        
    except Exception as e:
        return {"success": False, "error": str(e), **resultado}
