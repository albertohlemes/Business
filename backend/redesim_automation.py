"""
Automação REDESIM SP - Consulta de Licenças
Abre navegador, navega até consulta, usuário faz login, sistema consulta automaticamente
"""
import asyncio
import os
import json
import base64
from datetime import datetime
from typing import Optional, Dict, Any, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import logging

logger = logging.getLogger(__name__)

class RedesimConsulta:
    """Automação para consulta de licenças no REDESIM SP"""
    
    REDESIM_URL = "https://vreredesim.sp.gov.br"
    SESSION_DIR = "/app/backend/browser_sessions"
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # Criar diretório de sessões
        os.makedirs(self.SESSION_DIR, exist_ok=True)
    
    async def iniciar(self, session_id: str = "default") -> Dict[str, Any]:
        """Inicia navegador com sessão persistente"""
        try:
            self.playwright = await async_playwright().start()
            
            session_path = os.path.join(self.SESSION_DIR, session_id)
            
            # Usar contexto persistente para manter login
            self.context = await self.playwright.chromium.launch_persistent_context(
                session_path,
                headless=True,  # Servidor não tem display
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                ],
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            self.page = await self.context.new_page()
            
            return {"success": True, "message": "Navegador iniciado"}
            
        except Exception as e:
            logger.error(f"Erro ao iniciar: {e}")
            return {"success": False, "error": str(e)}
    
    async def navegar_para_redesim(self) -> Dict[str, Any]:
        """Navega para o portal REDESIM"""
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            await self.page.goto(self.REDESIM_URL, timeout=30000, wait_until='networkidle')
            await self.page.wait_for_timeout(2000)
            
            title = await self.page.title()
            url = self.page.url
            
            # Capturar screenshot
            screenshot = await self.page.screenshot()
            screenshot_b64 = base64.b64encode(screenshot).decode()
            
            return {
                "success": True,
                "title": title,
                "url": url,
                "screenshot": screenshot_b64
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def verificar_login(self) -> Dict[str, Any]:
        """Verifica se está logado no portal"""
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            # Procurar elementos que indicam login
            # Pode ser nome do usuário, menu de usuário, etc.
            logged_indicators = [
                'text=Sair',
                'text=Meu Espaço',
                'text=Bem-vindo',
                '[data-testid="user-menu"]',
                '.user-name',
                '#user-area',
            ]
            
            for indicator in logged_indicators:
                try:
                    element = self.page.locator(indicator)
                    if await element.count() > 0:
                        return {"logged_in": True, "indicator": indicator}
                except:
                    continue
            
            # Verificar se há botão de login (significa não logado)
            login_buttons = ['text=Entrar', 'text=Login', 'text=Acessar']
            for btn in login_buttons:
                try:
                    element = self.page.locator(btn)
                    if await element.count() > 0:
                        return {"logged_in": False, "has_login_button": True}
                except:
                    continue
            
            return {"logged_in": False, "has_login_button": False}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def clicar_entrar(self) -> Dict[str, Any]:
        """Clica no botão de entrar/login"""
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            # Procurar botão de login
            login_selectors = [
                'a:has-text("Entrar")',
                'button:has-text("Entrar")',
                'a:has-text("Login")',
                'a:has-text("Acessar")',
                '[href*="login"]',
                '[href*="sso.acesso.gov.br"]',
            ]
            
            for selector in login_selectors:
                try:
                    btn = self.page.locator(selector).first
                    if await btn.count() > 0:
                        await btn.click()
                        await self.page.wait_for_timeout(3000)
                        
                        screenshot = await self.page.screenshot()
                        
                        return {
                            "success": True,
                            "clicked": selector,
                            "current_url": self.page.url,
                            "screenshot": base64.b64encode(screenshot).decode()
                        }
                except:
                    continue
            
            return {"success": False, "error": "Botão de login não encontrado"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def navegar_consulta_licenca(self) -> Dict[str, Any]:
        """Navega para a área de consulta de licenças"""
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            # URLs possíveis de consulta
            consulta_urls = [
                f"{self.REDESIM_URL}/servicos/consulta-previa",
                f"{self.REDESIM_URL}/consulta",
                f"{self.REDESIM_URL}/licenca/consulta",
            ]
            
            # Primeiro tenta encontrar link na página
            consulta_links = [
                'a:has-text("Consultar")',
                'a:has-text("Consulta")',
                'a:has-text("Licença")',
                'a:has-text("Pesquisar")',
                '[href*="consulta"]',
            ]
            
            for link in consulta_links:
                try:
                    element = self.page.locator(link).first
                    if await element.count() > 0:
                        await element.click()
                        await self.page.wait_for_timeout(2000)
                        break
                except:
                    continue
            
            screenshot = await self.page.screenshot()
            
            return {
                "success": True,
                "url": self.page.url,
                "title": await self.page.title(),
                "screenshot": base64.b64encode(screenshot).decode()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def consultar_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """Preenche CNPJ e faz a consulta"""
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            # Limpar formatação do CNPJ
            cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '')
            
            # Procurar campo de CNPJ
            cnpj_selectors = [
                'input[name*="cnpj"]',
                'input[placeholder*="CNPJ"]',
                'input[id*="cnpj"]',
                'input[type="text"]',
            ]
            
            for selector in cnpj_selectors:
                try:
                    input_field = self.page.locator(selector).first
                    if await input_field.count() > 0:
                        await input_field.clear()
                        await input_field.fill(cnpj_limpo)
                        await self.page.wait_for_timeout(500)
                        break
                except:
                    continue
            
            # Procurar botão de consulta
            consulta_buttons = [
                'button:has-text("Consultar")',
                'button:has-text("Pesquisar")',
                'button:has-text("Buscar")',
                'input[type="submit"]',
                'button[type="submit"]',
            ]
            
            for btn in consulta_buttons:
                try:
                    button = self.page.locator(btn).first
                    if await button.count() > 0:
                        await button.click()
                        await self.page.wait_for_timeout(5000)
                        break
                except:
                    continue
            
            # Capturar resultado
            screenshot = await self.page.screenshot()
            content = await self.page.content()
            
            # Tentar extrair informações da licença
            resultado = await self._extrair_dados_licenca()
            
            return {
                "success": True,
                "cnpj": cnpj,
                "url": self.page.url,
                "screenshot": base64.b64encode(screenshot).decode(),
                "dados_extraidos": resultado
            }
            
        except Exception as e:
            return {"success": False, "error": str(e), "cnpj": cnpj}
    
    async def _extrair_dados_licenca(self) -> Dict[str, Any]:
        """Tenta extrair dados da licença da página"""
        try:
            dados = {}
            
            # Tentar extrair textos relevantes
            page_text = await self.page.inner_text('body')
            
            # Procurar padrões comuns
            if 'vigente' in page_text.lower() or 'ativa' in page_text.lower():
                dados['status'] = 'ativa'
            elif 'vencida' in page_text.lower() or 'expirada' in page_text.lower():
                dados['status'] = 'vencida'
            elif 'pendente' in page_text.lower():
                dados['status'] = 'pendente'
            
            # Tentar extrair data de vencimento
            import re
            data_pattern = r'\d{2}/\d{2}/\d{4}'
            datas = re.findall(data_pattern, page_text)
            if datas:
                dados['datas_encontradas'] = datas
            
            return dados
            
        except Exception as e:
            return {"error": str(e)}
    
    async def capturar_tela(self) -> Dict[str, Any]:
        """Captura screenshot da tela atual"""
        if not self.page:
            return {"success": False, "error": "Navegador não iniciado"}
        
        try:
            screenshot = await self.page.screenshot(full_page=True)
            
            return {
                "success": True,
                "url": self.page.url,
                "title": await self.page.title(),
                "screenshot": base64.b64encode(screenshot).decode()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def fechar(self):
        """Fecha o navegador"""
        try:
            if self.context:
                await self.context.close()
            if self.playwright:
                await self.playwright.stop()
        except:
            pass


# Instância global para manter sessão
_consulta_instance: Optional[RedesimConsulta] = None

async def get_consulta_instance() -> RedesimConsulta:
    """Retorna instância da automação"""
    global _consulta_instance
    if _consulta_instance is None:
        _consulta_instance = RedesimConsulta()
    return _consulta_instance

async def executar_consulta_completa(cnpj: str, session_id: str = "default") -> Dict[str, Any]:
    """
    Executa consulta completa:
    1. Inicia navegador
    2. Navega para REDESIM
    3. Verifica login
    4. Se não logado, vai para tela de login
    5. Navega para consulta
    6. Consulta CNPJ
    """
    consulta = await get_consulta_instance()
    resultado = {"etapas": []}
    
    try:
        # Etapa 1: Iniciar
        res = await consulta.iniciar(session_id)
        resultado["etapas"].append({"etapa": "iniciar", **res})
        if not res.get("success"):
            return resultado
        
        # Etapa 2: Navegar para REDESIM
        res = await consulta.navegar_para_redesim()
        resultado["etapas"].append({"etapa": "navegar_redesim", **res})
        if not res.get("success"):
            return resultado
        
        # Etapa 3: Verificar login
        res = await consulta.verificar_login()
        resultado["etapas"].append({"etapa": "verificar_login", **res})
        
        if not res.get("logged_in"):
            # Etapa 4: Clicar em entrar
            res = await consulta.clicar_entrar()
            resultado["etapas"].append({"etapa": "clicar_entrar", **res})
            resultado["aguardando_login"] = True
            resultado["mensagem"] = "Faça login com seu certificado digital no Gov.br"
            
            # Capturar tela atual
            tela = await consulta.capturar_tela()
            resultado["tela_login"] = tela
            
            return resultado
        
        # Etapa 5: Navegar para consulta
        res = await consulta.navegar_consulta_licenca()
        resultado["etapas"].append({"etapa": "navegar_consulta", **res})
        
        # Etapa 6: Consultar CNPJ
        res = await consulta.consultar_cnpj(cnpj)
        resultado["etapas"].append({"etapa": "consultar_cnpj", **res})
        resultado["consulta_realizada"] = True
        
        return resultado
        
    except Exception as e:
        resultado["error"] = str(e)
        return resultado
