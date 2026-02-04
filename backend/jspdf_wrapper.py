"""
Gerador de PDF com formatação igual ao Word
Usa reportlab para gerar PDFs com formatação preservada
Remove Markdown e caracteres decorativos
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.lib.colors import HexColor, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io
import re
from typing import Dict, Any
from datetime import datetime


class PDFComCabecalhoRodape(BaseDocTemplate):
    """PDF com cabeçalho e rodapé em todas as páginas"""
    
    def __init__(self, filename, cabecalho_texto=None, rodape_texto=None, **kwargs):
        BaseDocTemplate.__init__(self, filename, **kwargs)
        self.cabecalho_texto = cabecalho_texto or ["BUSINESS CONTABILIDADE"]
        self.rodape_texto = rodape_texto or ["Documento gerado pelo Portal Societário"]
        
        # Configurar frame e template de página
        frame = Frame(
            self.leftMargin,
            self.bottomMargin + 1.5*cm,
            self.width,
            self.height - 2*cm,
            id='normal'
        )
        
        template = PageTemplate(
            id='todas_paginas',
            frames=frame,
            onPage=self._adicionar_cabecalho_rodape
        )
        
        self.addPageTemplates([template])
    
    def _adicionar_cabecalho_rodape(self, canvas, doc):
        """Adiciona cabeçalho e rodapé em cada página"""
        canvas.saveState()
        
        page_width, page_height = A4
        
        # Cabeçalho
        y_cabecalho = page_height - 1.5*cm
        canvas.setFont('Times-Bold', 14)
        canvas.setFillColor(HexColor('#DC2626'))
        
        for i, texto in enumerate(self.cabecalho_texto):
            if i == 0:
                canvas.setFont('Times-Bold', 14)
            else:
                canvas.setFont('Times-Roman', 10)
                canvas.setFillColor(HexColor('#666666'))
            
            canvas.drawCentredString(page_width/2, y_cabecalho - (i * 0.5*cm), texto)
        
        # Linha separadora do cabeçalho
        canvas.setStrokeColor(HexColor('#DDDDDD'))
        canvas.line(doc.leftMargin, y_cabecalho - 1*cm, page_width - doc.rightMargin, y_cabecalho - 1*cm)
        
        # Rodapé
        canvas.setFont('Times-Italic', 9)
        canvas.setFillColor(HexColor('#888888'))
        
        for i, texto in enumerate(self.rodape_texto):
            canvas.drawCentredString(page_width/2, 1.5*cm - (i * 0.4*cm), texto)
        
        # Número da página
        canvas.drawRightString(page_width - doc.rightMargin, 1*cm, f"Página {doc.page}")
        
        # Linha separadora do rodapé
        canvas.line(doc.leftMargin, 2*cm, page_width - doc.rightMargin, 2*cm)
        
        canvas.restoreState()


def _limpar_markdown_pdf(texto: str) -> str:
    """Remove marcações Markdown e caracteres decorativos do texto para PDF"""
    texto_strip = texto.strip()
    
    # Remover linhas decorativas (===, ---, 3 ou mais caracteres)
    if re.match(r'^[=\-]{3,}$', texto_strip):
        return ''
    
    # Remover linhas apenas com asteriscos
    if re.match(r'^\*{3,}$', texto_strip):
        return ''
    
    # Preservar linhas de assinatura (underscores)
    if re.match(r'^_+$', texto_strip):
        return texto_strip
    
    # Remover cabeçalhos markdown (### Título)
    texto = re.sub(r'^#{1,6}\s*', '', texto)
    
    # Remover marcadores de lista
    texto = re.sub(r'^[\-\*\+]\s+', '', texto)
    texto = re.sub(r'^\d+\.\s+', '', texto)
    
    # Converter **negrito** para tag <b>
    texto = re.sub(r'\*\*\*([^*]+)\*\*\*', r'<b><i>\1</i></b>', texto)
    texto = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', texto)
    texto = re.sub(r'\*([^*]+)\*', r'<i>\1</i>', texto)
    
    # Remover underscores de ênfase
    texto = re.sub(r'__([^_]+)__', r'<b>\1</b>', texto)
    
    # Remover backticks
    texto = re.sub(r'`([^`]+)`', r'\1', texto)
    
    return texto.strip()


def gerar_pdf_simples(conteudo: str, dados_extraidos: Dict[str, Any] = None, formato: Dict[str, Any] = None) -> bytes:
    """
    Gera um PDF formatado da minuta com cabeçalho e rodapé em todas as páginas.
    Remove Markdown e aplica formatação igual ao Word.
    """
    buffer = io.BytesIO()
    
    # Configurações do template (ou padrão)
    if formato is None:
        formato = {
            "fonte": {"nome": "Times", "tamanho": 12},
            "margens": {"top": 2.5, "bottom": 2.5, "left": 3, "right": 2},
            "espacamento": {"linha": 1.5},
            "cabecalho": {"texto": ["BUSINESS CONTABILIDADE", "Portal Societário"]},
            "rodape": {"texto": ["Documento gerado pelo Portal Societário"]}
        }
    
    fonte_nome = formato.get("fonte", {}).get("nome", "Times")
    fonte_tamanho = formato.get("fonte", {}).get("tamanho", 12)
    margens = formato.get("margens", {})
    
    # Usar cabeçalho/rodapé do template se existir
    cabecalho_config = formato.get("cabecalho")
    rodape_config = formato.get("rodape")
    
    cabecalho = cabecalho_config.get("texto", ["BUSINESS CONTABILIDADE"]) if cabecalho_config else ["BUSINESS CONTABILIDADE"]
    rodape = rodape_config.get("texto", ["Documento gerado pelo Portal Societário"]) if rodape_config else ["Documento gerado pelo Portal Societário"]
    
    # Criar documento com cabeçalho/rodapé
    doc = PDFComCabecalhoRodape(
        buffer,
        cabecalho_texto=cabecalho,
        rodape_texto=rodape,
        pagesize=A4,
        rightMargin=float(margens.get("direita", margens.get("right", 2)))*cm,
        leftMargin=float(margens.get("esquerda", margens.get("left", 3)))*cm,
        topMargin=float(margens.get("superior", margens.get("top", 2.5)))*cm + 1.5*cm,
        bottomMargin=float(margens.get("inferior", margens.get("bottom", 2.5)))*cm + 1*cm
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    # Mapear fonte para reportlab
    font_family = "Times-Roman"
    font_bold = "Times-Bold"
    font_italic = "Times-Italic"
    if "arial" in fonte_nome.lower() or "helvetica" in fonte_nome.lower():
        font_family = "Helvetica"
        font_bold = "Helvetica-Bold"
        font_italic = "Helvetica-Oblique"
    
    style_titulo = ParagraphStyle(
        'Titulo',
        parent=styles['Heading1'],
        fontSize=fonte_tamanho + 2,
        alignment=TA_CENTER,
        spaceBefore=18,
        spaceAfter=12,
        fontName=font_bold
    )
    
    style_clausula = ParagraphStyle(
        'Clausula',
        parent=styles['Normal'],
        fontSize=fonte_tamanho,
        alignment=TA_JUSTIFY,
        spaceBefore=12,
        spaceAfter=6,
        fontName=font_bold
    )
    
    style_texto = ParagraphStyle(
        'Texto',
        parent=styles['Normal'],
        fontSize=fonte_tamanho,
        alignment=TA_JUSTIFY,
        spaceBefore=3,
        spaceAfter=6,
        fontName=font_family,
        leading=fonte_tamanho * 1.5
    )
    
    style_assinatura = ParagraphStyle(
        'Assinatura',
        parent=styles['Normal'],
        fontSize=fonte_tamanho,
        alignment=TA_CENTER,
        spaceBefore=24,
        spaceAfter=6,
        fontName=font_family
    )
    
    # Construir documento
    story = []
    
    # Processar conteúdo linha por linha
    linhas = conteudo.split('\n')
    
    for linha in linhas:
        linha_limpa = linha.strip()
        
        if not linha_limpa:
            story.append(Spacer(1, 0.3*cm))
            continue
        
        # Limpar Markdown
        linha_processada = _limpar_markdown_pdf(linha_limpa)
        
        # Pular linhas que ficaram vazias após limpeza
        if not linha_processada:
            continue
        
        # Escapar caracteres especiais (mas preservar tags HTML)
        linha_final = linha_processada.replace('&', '&amp;')
        # Restaurar tags HTML
        linha_final = linha_final.replace('&amp;lt;', '<').replace('&amp;gt;', '>')
        
        # Detectar tipo de linha e aplicar estilo
        if _is_titulo(linha_processada):
            story.append(Paragraph(linha_final, style_titulo))
        elif _is_clausula(linha_processada):
            story.append(Paragraph(linha_final, style_clausula))
        elif _is_assinatura(linha_processada):
            story.append(Paragraph(linha_final, style_assinatura))
        else:
            story.append(Paragraph(linha_final, style_texto))
    
    # Gerar PDF
    try:
        doc.build(story)
    except Exception as e:
        # Se falhar, tentar com conteúdo simplificado
        buffer = io.BytesIO()
        doc_simples = SimpleDocTemplate(buffer, pagesize=A4)
        story_simples = []
        for linha in conteudo.split('\n'):
            linha_limpa = _limpar_markdown_pdf(linha.strip())
            if linha_limpa:
                # Remover todas as tags HTML e caracteres especiais
                linha_simples = re.sub(r'<[^>]+>', '', linha_limpa)
                linha_simples = linha_simples.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story_simples.append(Paragraph(linha_simples, style_texto))
            else:
                story_simples.append(Spacer(1, 0.3*cm))
        doc_simples.build(story_simples)
    
    buffer.seek(0)
    return buffer.getvalue()


def _is_titulo(texto: str) -> bool:
    """Verifica se é um título"""
    # Remover tags HTML para análise
    texto_limpo = re.sub(r'<[^>]+>', '', texto)
    titulos = [
        'ALTERAÇÃO', 'CONTRATO SOCIAL', 'CONSOLIDAÇÃO',
        'ENCERRAMENTO', 'PREÂMBULO', 'QUALIFICAÇÃO',
        'QUADRO SOCIETÁRIO', 'CLÁUSULAS DE ALTERAÇÃO'
    ]
    texto_upper = texto_limpo.upper()
    return any(t in texto_upper for t in titulos) and len(texto_limpo) < 100


def _is_clausula(texto: str) -> bool:
    """Verifica se é uma cláusula"""
    # Remover tags HTML para análise
    texto_limpo = re.sub(r'<[^>]+>', '', texto)
    return bool(re.match(
        r'^(CLÁUSULA|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA|ARTIGO|ART\.)',
        texto_limpo,
        re.IGNORECASE
    ))


def _is_assinatura(texto: str) -> bool:
    """Verifica se é linha de assinatura"""
    # Remover tags HTML para análise
    texto_limpo = re.sub(r'<[^>]+>', '', texto)
    return texto_limpo.startswith('_') or 'CPF:' in texto_limpo.upper() or 'Assinatura' in texto_limpo
