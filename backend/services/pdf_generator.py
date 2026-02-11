"""
PDF Report Generator com suporte a logo da empresa
Utilizado para gerar relatórios fiscais personalizados
"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
import os


def get_default_logo_path():
    """Retorna o caminho do logo padrão"""
    default_path = "/app/backend/assets/logo_default.png"
    if os.path.exists(default_path):
        return default_path
    return None


def create_pdf_header(elements, styles, company_name, company_cnpj, report_title, competencia, logo_path=None):
    """
    Cria o cabeçalho padrão do PDF com logo e informações da empresa
    """
    # Estilo do título
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#C8A951'),
        alignment=TA_CENTER,
        spaceAfter=6
    )
    
    # Estilo do subtítulo
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#666666'),
        alignment=TA_CENTER,
        spaceAfter=12
    )
    
    # Estilo de informações
    info_style = ParagraphStyle(
        'InfoStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#333333'),
        alignment=TA_LEFT,
        spaceAfter=4
    )
    
    # Adicionar logo se existir
    if logo_path and os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=50*mm, height=20*mm)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 5*mm))
        except:
            pass
    
    # Título do relatório
    elements.append(Paragraph(report_title, title_style))
    
    # Informações da empresa
    elements.append(Paragraph(f"{company_name}", subtitle_style))
    elements.append(Paragraph(f"CNPJ: {company_cnpj} | Competência: {competencia}", subtitle_style))
    elements.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}", info_style))
    
    elements.append(Spacer(1, 10*mm))
    
    return elements


def create_pdf_table(data, column_widths=None, header_color='#C8A951', stripe_color='#F5F5F5'):
    """
    Cria uma tabela estilizada para o PDF
    
    Args:
        data: Lista de listas com os dados (primeira linha é header)
        column_widths: Lista com larguras das colunas (opcional)
        header_color: Cor do header (hex)
        stripe_color: Cor das linhas alternadas (hex)
    """
    table = Table(data, colWidths=column_widths)
    
    # Estilo da tabela
    style = TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(header_color)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Corpo
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        
        # Alinhamento
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Bordas
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
    ])
    
    # Adicionar listras (zebra stripes)
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor(stripe_color))
    
    table.setStyle(style)
    return table


def create_pdf_footer(elements, styles, page_number=1, total_pages=1):
    """
    Cria o rodapé padrão do PDF
    """
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#999999'),
        alignment=TA_CENTER
    )
    
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph(
        f"FiscalWave - Sistema de Gestão Fiscal | Página {page_number} de {total_pages}",
        footer_style
    ))
    
    return elements


def generate_simple_pdf(
    company_name: str,
    company_cnpj: str,
    report_title: str,
    competencia: str,
    table_data: list,
    column_widths: list = None,
    landscape_mode: bool = False,
    logo_path: str = None
) -> BytesIO:
    """
    Gera um PDF simples com cabeçalho, tabela e rodapé
    
    Args:
        company_name: Nome da empresa
        company_cnpj: CNPJ da empresa
        report_title: Título do relatório
        competencia: Competência (MM/YYYY)
        table_data: Dados da tabela (lista de listas)
        column_widths: Larguras das colunas (opcional)
        landscape_mode: Se True, usa orientação paisagem
        logo_path: Caminho para o logo da empresa (opcional)
    
    Returns:
        BytesIO com o PDF gerado
    """
    buffer = BytesIO()
    
    pagesize = landscape(A4) if landscape_mode else A4
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=pagesize,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Cabeçalho
    elements = create_pdf_header(
        elements, styles, 
        company_name, company_cnpj, 
        report_title, competencia,
        logo_path
    )
    
    # Tabela de dados
    if table_data:
        table = create_pdf_table(table_data, column_widths)
        elements.append(table)
    
    # Rodapé
    elements = create_pdf_footer(elements, styles)
    
    # Construir PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer


def format_currency_pdf(value):
    """Formata valor para exibição em PDF"""
    try:
        return f"R$ {float(value):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    except:
        return "R$ 0,00"


def format_percent_pdf(value):
    """Formata percentual para exibição em PDF"""
    try:
        return f"{float(value):.2f}%"
    except:
        return "0,00%"
