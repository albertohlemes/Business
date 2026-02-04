"""
Gerador de PDF simples para minutas
Usa reportlab para gerar PDFs formatados
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.colors import HexColor
import io
from typing import Dict, Any
from datetime import datetime


def gerar_pdf_simples(conteudo: str, dados_extraidos: Dict[str, Any] = None) -> bytes:
    """
    Gera um PDF formatado da minuta
    """
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=3*cm,
        topMargin=2.5*cm,
        bottomMargin=2.5*cm
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    style_titulo = ParagraphStyle(
        'Titulo',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Times-Bold'
    )
    
    style_subtitulo = ParagraphStyle(
        'Subtitulo',
        parent=styles['Heading2'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=10,
        fontName='Times-Roman',
        textColor=HexColor('#666666')
    )
    
    style_clausula = ParagraphStyle(
        'Clausula',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_JUSTIFY,
        spaceBefore=12,
        spaceAfter=6,
        fontName='Times-Bold'
    )
    
    style_texto = ParagraphStyle(
        'Texto',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_JUSTIFY,
        spaceBefore=6,
        spaceAfter=6,
        fontName='Times-Roman',
        leading=18  # Espaçamento entre linhas
    )
    
    style_cabecalho = ParagraphStyle(
        'Cabecalho',
        parent=styles['Normal'],
        fontSize=14,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        textColor=HexColor('#DC2626')
    )
    
    # Construir documento
    story = []
    
    # Cabeçalho
    story.append(Paragraph("BUSINESS CONTABILIDADE", style_cabecalho))
    story.append(Spacer(1, 0.5*cm))
    
    # Dados da empresa (se disponível)
    empresa = dados_extraidos.get("empresa", {}) if dados_extraidos else {}
    if empresa.get("razao_social"):
        story.append(Paragraph(empresa["razao_social"].upper(), style_subtitulo))
    if empresa.get("cnpj"):
        story.append(Paragraph(f"CNPJ: {empresa['cnpj']}", style_subtitulo))
    
    story.append(Spacer(1, 1*cm))
    
    # Processar conteúdo
    linhas = conteudo.split('\n')
    
    for linha in linhas:
        linha_limpa = linha.strip()
        
        if not linha_limpa:
            story.append(Spacer(1, 0.3*cm))
            continue
        
        # Escapar caracteres especiais do reportlab
        linha_limpa = linha_limpa.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        
        # Detectar tipo de linha
        is_titulo = _is_titulo(linha_limpa)
        is_clausula = _is_clausula(linha_limpa)
        
        if is_titulo:
            story.append(Paragraph(linha_limpa, style_titulo))
        elif is_clausula:
            story.append(Paragraph(linha_limpa, style_clausula))
        else:
            story.append(Paragraph(linha_limpa, style_texto))
    
    # Rodapé com data
    story.append(Spacer(1, 2*cm))
    data_str = datetime.now().strftime("%d de %B de %Y")
    story.append(Paragraph(f"Documento gerado em {data_str}", style_subtitulo))
    
    # Gerar PDF
    doc.build(story)
    
    buffer.seek(0)
    return buffer.getvalue()


def _is_titulo(texto: str) -> bool:
    """Verifica se é um título"""
    titulos = [
        'ALTERAÇÃO', 'CONTRATO SOCIAL', 'CONSOLIDAÇÃO',
        'ENCERRAMENTO', 'PREÂMBULO', 'QUALIFICAÇÃO'
    ]
    texto_upper = texto.upper()
    return any(t in texto_upper for t in titulos) and len(texto) < 100


def _is_clausula(texto: str) -> bool:
    """Verifica se é uma cláusula"""
    import re
    return bool(re.match(r'^(CLÁUSULA|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA)', texto, re.IGNORECASE))
