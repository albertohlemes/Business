"""
Automação REDESIM SP - Consulta de Licenças com noVNC
Navegador visível via VNC para o usuário fazer login
"""
import asyncio
import os
import json
import base64
from datetime import datetime
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import logging

logger = logging.getLogger(__name__)

class RedesimConsultaVNC:
    """Automação REDESIM com browser visível via noVNC"""
    
    REDESIM_URL = "https://vreredesim.sp.gov.br"
    SESSION_DIR = "/app/backend/browser_sessions"
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.cnpj_atual: Optional[str] = None
        self.status = "idle"
        
        os.makedirs(self.SESSION_DIR, exist_ok=True)
    
    async def iniciar_browser_visivel(self, session_id: str = "default") -> Dict[str, Any]:
        """Inicia navegador VISÍVEL no display virtual"""
        try:
            # Fechar sessão anterior se existir
            await self.fechar()
            
            self.playwright = await async_playwright().start()
            
            session_path = os.path.join(self.SESSION_DIR, session_id)
            
            # IMPORTANTE: headless=False para aparecer na tela
            # Usar DISPLAY=:99 (display virtual do Xvfb)
            os.environ['DISPLAY'] = ':99'
            
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # VISÍVEL!
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--start-maximized',
                ],
            )
            
            self.context = await self.browser.new_context(
                viewport={'width': 1200, 'height': 750},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            self.page = await self.context.new_page()
            self.status = "iniciado"
            
            return {"success": True, "message": "Browser visível iniciado. Olhe a tela do VNC!"}
            
        except Exception as e:
            logger.error(f"Erro ao iniciar browser visível: {e}")
            return {"success": False, "error": str(e)}
    
    async def navegar_redesim(self) -> Dict[str, Any]:
        """Navega para o portal REDESIM"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            self.status = "navegando"
            await self.page.goto(self.REDESIM_URL, timeout=30000, wait_until='domcontentloaded')
            await self.page.wait_for_timeout(2000)
            
            self.status = "na_pagina_inicial"
            return {
                "success": True,
                "url": self.page.url,
                "title": await self.page.title(),
                "message": "Na página inicial do REDESIM"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def clicar_entrar_govbr(self) -> Dict[str, Any]:
        """Clica no botão para entrar via Gov.br"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            self.status = "procurando_login"
            
            # Procurar botão de login Gov.br
            login_selectors = [
                'text=Entrar com gov.br',
                'text=Entrar',
                'text=Login',
                'text=Acessar',
                'a[href*="govbr"]',
                'a[href*="acesso.gov.br"]',
                'button:has-text("Entrar")',
            ]
            
            for selector in login_selectors:
                try:
                    btn = self.page.locator(selector).first
                    if await btn.count() > 0:
                        await btn.click()
                        await self.page.wait_for_timeout(3000)
                        self.status = "aguardando_login"
                        return {
                            "success": True,
                            "message": "Na tela de login Gov.br. FAÇA SEU LOGIN COM CERTIFICADO!",
                            "url": self.page.url
                        }
                except:
                    continue
            
            return {"success": False, "error": "Botão de login não encontrado"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def verificar_login(self) -> Dict[str, Any]:
        """Verifica se o usuário completou o login"""
        if not self.page:
            return {"success": False, "logged_in": False}
        
        try:
            url = self.page.url
            
            # Se ainda está na página do Gov.br, não logou
            if 'acesso.gov.br' in url or 'sso.acesso' in url:
                return {"logged_in": False, "message": "Ainda na tela de login"}
            
            # Se voltou para REDESIM, provavelmente logou
            if 'vreredesim' in url:
                # Verificar se tem elementos de usuário logado
                try:
                    # Procurar indicadores de login
                    sair = await self.page.locator('text=Sair').count()
                    menu_user = await self.page.locator('[class*="user"]').count()
                    
                    if sair > 0 or menu_user > 0:
                        self.status = "logado"
                        return {"logged_in": True, "message": "Login detectado!"}
                except:
                    pass
                
                # Se não achou indicadores mas está no REDESIM, assume logado
                self.status = "logado"
                return {"logged_in": True, "message": "Voltou para REDESIM - login possivelmente concluído"}
            
            return {"logged_in": False, "url": url}
            
        except Exception as e:
            return {"logged_in": False, "error": str(e)}
    
    async def navegar_consulta_licencas(self) -> Dict[str, Any]:
        """Navega para a área de consulta de licenças"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            self.status = "navegando_consulta"
            
            # Procurar link de consulta
            consulta_selectors = [
                'text=Consultar Licenças',
                'text=Consulta de Licenças',
                'text=Licenças',
                'text=Consultar',
                'a[href*="consulta"]',
                'a[href*="licenca"]',
            ]
            
            for selector in consulta_selectors:
                try:
                    link = self.page.locator(selector).first
                    if await link.count() > 0:
                        await link.click()
                        await self.page.wait_for_timeout(2000)
                        self.status = "na_consulta"
                        return {
                            "success": True,
                            "message": "Na área de consulta de licenças",
                            "url": self.page.url
                        }
                except:
                    continue
            
            # Se não encontrou link, tenta URL direta
            await self.page.goto(f"{self.REDESIM_URL}/consulta", timeout=15000)
            await self.page.wait_for_timeout(2000)
            
            return {"success": True, "url": self.page.url}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def consultar_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """Preenche CNPJ e executa consulta"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            self.status = "consultando"
            self.cnpj_atual = cnpj
            cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '')
            
            # Procurar campo de CNPJ
            cnpj_fields = [
                'input[name*="cnpj" i]',
                'input[placeholder*="CNPJ" i]',
                'input[id*="cnpj" i]',
                '#cnpj',
            ]
            
            campo_encontrado = False
            for selector in cnpj_fields:
                try:
                    campo = self.page.locator(selector).first
                    if await campo.count() > 0:
                        await campo.clear()
                        await campo.fill(cnpj_limpo)
                        campo_encontrado = True
                        await self.page.wait_for_timeout(500)
                        break
                except:
                    continue
            
            if not campo_encontrado:
                return {"success": False, "error": "Campo CNPJ não encontrado"}
            
            # Marcar checkbox se houver
            try:
                checkbox = self.page.locator('input[type="checkbox"]').first
                if await checkbox.count() > 0:
                    await checkbox.check()
            except:
                pass
            
            # Clicar em consultar
            btn_selectors = [
                'button:has-text("Consultar")',
                'button:has-text("Pesquisar")',
                'button:has-text("Buscar")',
                'input[type="submit"]',
                'button[type="submit"]',
            ]
            
            for selector in btn_selectors:
                try:
                    btn = self.page.locator(selector).first
                    if await btn.count() > 0:
                        await btn.click()
                        await self.page.wait_for_timeout(5000)
                        break
                except:
                    continue
            
            self.status = "consulta_realizada"
            
            # Extrair dados
            dados = await self._extrair_dados()
            
            return {
                "success": True,
                "cnpj": cnpj,
                "dados": dados,
                "url": self.page.url
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _extrair_dados(self) -> Dict[str, Any]:
        """Extrai dados da licença da página"""
        dados = {}
        try:
            texto = await self.page.inner_text('body')
            
            # Status
            texto_lower = texto.lower()
            if 'vigente' in texto_lower or 'ativa' in texto_lower:
                dados['status'] = 'ativa'
            elif 'vencida' in texto_lower or 'expirada' in texto_lower:
                dados['status'] = 'vencida'
            elif 'pendente' in texto_lower:
                dados['status'] = 'pendente'
            
            # Datas
            import re
            datas = re.findall(r'\d{2}/\d{2}/\d{4}', texto)
            if datas:
                dados['datas_encontradas'] = datas
                # Assume última data como vencimento
                dados['vencimento'] = datas[-1] if len(datas) > 1 else datas[0]
            
        except Exception as e:
            dados['erro_extracao'] = str(e)
        
        return dados
    
    async def baixar_pdf_licenca(self) -> Dict[str, Any]:
        """Tenta baixar o PDF da licença"""
        if not self.page:
            return {"success": False, "error": "Browser não iniciado"}
        
        try:
            # Procurar link de download
            download_selectors = [
                'text=Baixar',
                'text=Download',
                'text=PDF',
                'text=Imprimir',
                'a[href*=".pdf"]',
                'button:has-text("Baixar")',
            ]
            
            for selector in download_selectors:
                try:
                    btn = self.page.locator(selector).first
                    if await btn.count() > 0:
                        # Configurar download
                        async with self.page.expect_download() as download_info:
                            await btn.click()
                        
                        download = await download_info.value
                        path = f"/app/backend/uploads/licenca_{self.cnpj_atual}_{datetime.now().strftime('%Y%m%d')}.pdf"
                        await download.save_as(path)
                        
                        return {
                            "success": True,
                            "path": path,
                            "message": "PDF baixado com sucesso!"
                        }
                except:
                    continue
            
            return {"success": False, "error": "Link de download não encontrado"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def capturar_screenshot(self) -> str:
        """Captura screenshot atual"""
        if not self.page:
            return ""
        try:
            screenshot = await self.page.screenshot()
            return base64.b64encode(screenshot).decode()
        except:
            return ""
    
    async def get_status(self) -> Dict[str, Any]:
        """Retorna status atual"""
        return {
            "status": self.status,
            "cnpj": self.cnpj_atual,
            "url": self.page.url if self.page else None
        }
    
    async def fechar(self):
        """Fecha o browser"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except:
            pass
        finally:
            self.browser = None
            self.context = None
            self.page = None
            self.playwright = None
            self.status = "fechado"


# Instância global
_vnc_instance: Optional[RedesimConsultaVNC] = None

def get_vnc_instance() -> RedesimConsultaVNC:
    global _vnc_instance
    if _vnc_instance is None:
        _vnc_instance = RedesimConsultaVNC()
    return _vnc_instance

async def executar_fluxo_completo(cnpj: str) -> Dict[str, Any]:
    """
    Executa fluxo completo:
    1. Abre browser visível
    2. Navega para REDESIM
    3. Clica em login Gov.br
    4. AGUARDA usuário fazer login (monitora via polling)
    5. Navega para consulta de licenças
    6. Preenche CNPJ
    7. Extrai dados
    8. Tenta baixar PDF
    """
    consulta = get_vnc_instance()
    resultado = {"etapas": [], "vnc_url": "/vnc"}
    
    try:
        # 1. Iniciar browser
        res = await consulta.iniciar_browser_visivel()
        resultado["etapas"].append({"nome": "iniciar_browser", **res})
        if not res.get("success"):
            return resultado
        
        # 2. Navegar REDESIM
        res = await consulta.navegar_redesim()
        resultado["etapas"].append({"nome": "navegar_redesim", **res})
        
        # 3. Clicar login
        res = await consulta.clicar_entrar_govbr()
        resultado["etapas"].append({"nome": "clicar_login", **res})
        
        resultado["aguardando_login"] = True
        resultado["cnpj"] = cnpj
        resultado["mensagem"] = "Olhe a tela abaixo e faça login com seu certificado digital!"
        
        return resultado
        
    except Exception as e:
        resultado["error"] = str(e)
        return resultado

async def continuar_apos_login(cnpj: str) -> Dict[str, Any]:
    """Continua a automação após o usuário fazer login"""
    consulta = get_vnc_instance()
    resultado = {"etapas": []}
    
    try:
        # Verificar login
        login = await consulta.verificar_login()
        resultado["etapas"].append({"nome": "verificar_login", **login})
        
        if not login.get("logged_in"):
            return {"success": False, "message": "Login ainda não detectado", **resultado}
        
        # Navegar para consulta
        res = await consulta.navegar_consulta_licencas()
        resultado["etapas"].append({"nome": "navegar_consulta", **res})
        
        # Consultar CNPJ
        res = await consulta.consultar_cnpj(cnpj)
        resultado["etapas"].append({"nome": "consultar_cnpj", **res})
        
        # Tentar baixar PDF
        pdf = await consulta.baixar_pdf_licenca()
        resultado["etapas"].append({"nome": "baixar_pdf", **pdf})
        
        # Screenshot final
        screenshot = await consulta.capturar_screenshot()
        resultado["screenshot"] = screenshot
        resultado["success"] = True
        resultado["dados"] = res.get("dados", {})
        
        return resultado
        
    except Exception as e:
        resultado["error"] = str(e)
        return resultado
