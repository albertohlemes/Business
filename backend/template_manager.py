"""
Gerenciador de Templates para Minutas
- Upload de templates (Word/PDF)
- Extração de formatação
- Geração de documentos formatados
"""
import os
import re
import io
import base64
from datetime import datetime
from typing import Dict, Any, Optional, List
from docx import Document
from docx.shared import Pt, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
import logging

logger = logging.getLogger(__name__)

TEMPLATES_DIR = "/app/backend/templates"
os.makedirs(TEMPLATES_DIR, exist_ok=True)

class TemplateManager:
    """Gerencia templates de formatação para minutas"""
    
    def __init__(self):
        self.templates_dir = TEMPLATES_DIR
    
    def salvar_template(self, user_id: str, nome: str, arquivo_path: str, tipo: str) -> Dict[str, Any]:
        """Salva um template de formatação"""
        template_id = f"{user_id}_{nome.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Extrair informações de formatação do template
        formato = self._extrair_formatacao(arquivo_path, tipo)
        
        return {
            "id": template_id,
            "nome": nome,
            "tipo": tipo,
            "arquivo": arquivo_path,
            "formato": formato
        }
    
    def _extrair_formatacao(self, arquivo_path: str, tipo: str) -> Dict[str, Any]:
        """Extrai informações de formatação de um documento"""
        formato = {
            "fonte_padrao": "Times New Roman",
            "tamanho_fonte": 12,
            "margens": {"top": 2.5, "bottom": 2.5, "left": 3, "right": 2},
            "espacamento_linha": 1.5,
            "alinhamento": "justify",
            "estilos": {}
        }
        
        if tipo == "docx" and os.path.exists(arquivo_path):
            try:
                doc = Document(arquivo_path)
                
                # Extrair margens
                section = doc.sections[0]
                formato["margens"] = {
                    "top": section.top_margin.cm if section.top_margin else 2.5,
                    "bottom": section.bottom_margin.cm if section.bottom_margin else 2.5,
                    "left": section.left_margin.cm if section.left_margin else 3,
                    "right": section.right_margin.cm if section.right_margin else 2
                }
                
                # Extrair estilos de parágrafos
                for para in doc.paragraphs[:10]:  # Analisar primeiros parágrafos
                    if para.runs:
                        run = para.runs[0]
                        if run.font.name:
                            formato["fonte_padrao"] = run.font.name
                        if run.font.size:
                            formato["tamanho_fonte"] = run.font.size.pt
                
            except Exception as e:
                logger.error(f"Erro ao extrair formatação: {e}")
        
        return formato
    
    def gerar_documento_formatado(
        self,
        conteudo: str,
        template_path: Optional[str] = None,
        dados_empresa: Dict[str, Any] = None,
        formato_saida: str = "docx"
    ) -> bytes:
        """
        Gera documento Word com a formatação do template
        """
        if template_path and os.path.exists(template_path):
            # Usar template como base
            doc = Document(template_path)
            # Limpar conteúdo existente mas manter formatação
            for para in doc.paragraphs:
                para.clear()
        else:
            # Criar documento novo com formatação padrão
            doc = Document()
            self._aplicar_formatacao_padrao(doc)
        
        # Processar conteúdo e adicionar ao documento
        self._adicionar_conteudo(doc, conteudo, dados_empresa)
        
        # Salvar em memória
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return buffer.getvalue()
    
    def _aplicar_formatacao_padrao(self, doc: Document):
        """Aplica formatação padrão Business Contabilidade"""
        # Configurar seção
        section = doc.sections[0]
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(3)
        section.right_margin = Cm(2)
        
        # Configurar estilo Normal
        style = doc.styles['Normal']
        font = style.font
        font.name = 'Times New Roman'
        font.size = Pt(12)
        
        paragraph_format = style.paragraph_format
        paragraph_format.line_spacing = 1.5
        paragraph_format.space_after = Pt(6)
        paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    def _adicionar_conteudo(self, doc: Document, conteudo: str, dados_empresa: Dict[str, Any] = None):
        """Adiciona conteúdo ao documento preservando estrutura"""
        linhas = conteudo.split('\n')
        
        for linha in linhas:
            linha_limpa = linha.strip()
            
            if not linha_limpa:
                doc.add_paragraph()
                continue
            
            # Detectar títulos/seções
            is_titulo = self._is_titulo(linha_limpa)
            is_clausula = self._is_clausula(linha_limpa)
            
            para = doc.add_paragraph()
            run = para.add_run(linha_limpa)
            
            if is_titulo:
                run.bold = True
                run.font.size = Pt(14)
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif is_clausula:
                run.bold = True
                para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            else:
                para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    def _is_titulo(self, texto: str) -> bool:
        """Verifica se é um título"""
        titulos = [
            'ALTERAÇÃO', 'CONTRATO SOCIAL', 'CONSOLIDAÇÃO',
            'ENCERRAMENTO', 'PREÂMBULO', 'QUALIFICAÇÃO'
        ]
        texto_upper = texto.upper()
        return any(t in texto_upper for t in titulos) and len(texto) < 100
    
    def _is_clausula(self, texto: str) -> bool:
        """Verifica se é uma cláusula"""
        return bool(re.match(r'^(CLÁUSULA|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA)', texto, re.IGNORECASE))
    
    def substituir_campos(self, texto: str, dados: Dict[str, Any]) -> str:
        """Substitui campos {campo} pelos valores reais"""
        resultado = texto
        
        # Mapeamento de campos
        campos = {
            'razao_social': dados.get('empresa', {}).get('razao_social', ''),
            'cnpj': dados.get('empresa', {}).get('cnpj', ''),
            'endereco': dados.get('empresa', {}).get('endereco', ''),
            'capital_social': dados.get('empresa', {}).get('capital_social', ''),
            'objeto_social': dados.get('empresa', {}).get('objeto_social', ''),
            'data': datetime.now().strftime('%d de %B de %Y'),
            'data_extenso': self._data_por_extenso(),
        }
        
        # Adicionar sócios
        socios = dados.get('socios', [])
        for i, socio in enumerate(socios):
            campos[f'socio{i+1}_nome'] = socio.get('nome', '')
            campos[f'socio{i+1}_cpf'] = socio.get('cpf', '')
            campos[f'socio{i+1}_participacao'] = socio.get('participacao', '')
        
        # Substituir campos
        for campo, valor in campos.items():
            resultado = resultado.replace(f'{{{campo}}}', str(valor) if valor else f'[{campo.upper()}]')
        
        return resultado
    
    def _data_por_extenso(self) -> str:
        """Retorna data atual por extenso"""
        meses = {
            1: 'janeiro', 2: 'fevereiro', 3: 'março', 4: 'abril',
            5: 'maio', 6: 'junho', 7: 'julho', 8: 'agosto',
            9: 'setembro', 10: 'outubro', 11: 'novembro', 12: 'dezembro'
        }
        hoje = datetime.now()
        return f"{hoje.day} de {meses[hoje.month]} de {hoje.year}"


# Instância global
template_manager = TemplateManager()


def gerar_minuta_word(conteudo: str, dados_extraidos: Dict = None, template_path: str = None) -> bytes:
    """Função auxiliar para gerar documento Word"""
    return template_manager.gerar_documento_formatado(
        conteudo=conteudo,
        template_path=template_path,
        dados_empresa=dados_extraidos,
        formato_saida="docx"
    )
