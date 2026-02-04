"""
Gerador de PDF fiel ao template
Usa reportlab para gerar PDFs com formatação preservada
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
            self.bottomMargin + 1.5*cm,  # Espaço para rodapé
            self.width,
            self.height - 2*cm,  # Espaço para cabeçalho
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
        canvas.setFillColor(HexColor('#DC2626'))  # Vermelho Business
        
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


def gerar_pdf_simples(conteudo: str, dados_extraidos: Dict[str, Any] = None, formato: Dict[str, Any] = None) -> bytes:
    """
    Gera um PDF formatado da minuta com cabeçalho e rodapé em todas as páginas.
    Usa a formatação do template se fornecida.
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
    
    # Usar cabeçalho/rodapé do template se existir, senão usa padrão
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
        rightMargin=margens.get("right", 2)*cm,
        leftMargin=margens.get("left", 3)*cm,
        topMargin=margens.get("top", 2.5)*cm + 1.5*cm,  # Extra para cabeçalho
        bottomMargin=margens.get("bottom", 2.5)*cm + 1*cm  # Extra para rodapé
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    # Mapear fonte para reportlab
    font_family = "Times-Roman"
    font_bold = "Times-Bold"
    if "arial" in fonte_nome.lower():
        font_family = "Helvetica"
        font_bold = "Helvetica-Bold"
    
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
        leading=fonte_tamanho * 1.5  # Espaçamento entre linhas
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
    
    # Dados da empresa no início
    empresa = dados_extraidos.get("empresa", {}) if dados_extraidos else {}
    if empresa.get("razao_social"):
        story.append(Paragraph(
            f"<b>{empresa['razao_social'].upper()}</b>",
            ParagraphStyle('Empresa', parent=style_titulo, fontSize=fonte_tamanho + 1)
        ))
    if empresa.get("cnpj"):
        story.append(Paragraph(
            f"CNPJ: {empresa['cnpj']}",
            ParagraphStyle('CNPJ', parent=style_texto, alignment=TA_CENTER)
        ))
        story.append(Spacer(1, 0.5*cm))
    
    # Processar conteúdo
    linhas = conteudo.split('\n')
    
    for linha in linhas:
        linha_limpa = linha.strip()
        
        if not linha_limpa:
            story.append(Spacer(1, 0.3*cm))
            continue
        
        # Escapar caracteres especiais
        linha_limpa = linha_limpa.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        
        # Detectar tipo de linha
        if _is_titulo(linha_limpa):
            story.append(Paragraph(linha_limpa, style_titulo))
        elif _is_clausula(linha_limpa):
            story.append(Paragraph(linha_limpa, style_clausula))
        elif _is_assinatura(linha_limpa):
            story.append(Paragraph(linha_limpa, style_assinatura))
        else:
            story.append(Paragraph(linha_limpa, style_texto))
    
    # Data no final
    story.append(Spacer(1, 1*cm))
    data_str = datetime.now().strftime("%d de %B de %Y")
    story.append(Paragraph(
        f"<i>São Paulo, {data_str}</i>",
        ParagraphStyle('Data', parent=style_texto, alignment=TA_CENTER, fontName="Times-Italic")
    ))
    
    # Gerar PDF
    doc.build(story)
    
    buffer.seek(0)
    return buffer.getvalue()


def _is_titulo(texto: str) -> bool:
    """Verifica se é um título"""
    titulos = [
        'ALTERAÇÃO', 'CONTRATO SOCIAL', 'CONSOLIDAÇÃO',
        'ENCERRAMENTO', 'PREÂMBULO', 'QUALIFICAÇÃO',
        'QUADRO SOCIETÁRIO', 'CLÁUSULAS DE ALTERAÇÃO'
    ]
    texto_upper = texto.upper()
    return any(t in texto_upper for t in titulos) and len(texto) < 80


def _is_clausula(texto: str) -> bool:
    """Verifica se é uma cláusula"""
    return bool(re.match(
        r'^(CLÁUSULA|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA|ARTIGO|ART\.)',
        texto,
        re.IGNORECASE
    ))


def _is_assinatura(texto: str) -> bool:
    """Verifica se é linha de assinatura"""
    return texto.startswith('_') or 'CPF:' in texto or 'Assinatura' in texto
