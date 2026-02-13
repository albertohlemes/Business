"""
Gerador de Relatório PDF - Reforma Tributária
==============================================
Gera relatório PDF com a simulação do IVA Dual (CBS + IBS)
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any


def format_currency(value):
    """Formata valor como moeda brasileira"""
    try:
        return f"R$ {float(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except:
        return "R$ 0,00"


def format_percent(value):
    """Formata valor como percentual"""
    try:
        return f"{float(value):.2f}%"
    except:
        return "0,00%"


def generate_reforma_tributaria_pdf(data: Dict[str, Any], company_name: str) -> BytesIO:
    """
    Gera o relatório PDF da Reforma Tributária
    
    Args:
        data: Dados da apuração retornados pelo endpoint
        company_name: Nome da empresa
    
    Returns:
        BytesIO com o PDF gerado
    """
    buffer = BytesIO()
    
    # Configurar documento
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a1a1a')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor('#333333')
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading3'],
        fontSize=12,
        spaceBefore=12,
        spaceAfter=8,
        textColor=colors.HexColor('#10b981')  # Emerald
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#666666')
    )
    
    # Elementos do PDF
    elements = []
    
    # Header
    elements.append(Paragraph("RELATÓRIO DE SIMULAÇÃO", title_style))
    elements.append(Paragraph("REFORMA TRIBUTÁRIA - IVA DUAL (CBS + IBS)", subtitle_style))
    elements.append(Spacer(1, 5*mm))
    
    # Informações gerais
    config = data.get('config', {})
    competencia = data.get('competencia', '')
    
    info_data = [
        ['Empresa:', company_name],
        ['Competência:', competencia],
        ['Data do Relatório:', datetime.now().strftime('%d/%m/%Y %H:%M')],
        ['Cenário:', '2027 - Transição para Não-Cumulatividade Plena'],
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 10*mm))
    
    # Alíquotas
    elements.append(Paragraph("ALÍQUOTAS APLICADAS", section_style))
    
    aliq_data = [
        ['Tributo', 'Alíquota', 'Descrição'],
        ['CBS', format_percent(config.get('aliquota_cbs', 8.80)), 'Contribuição sobre Bens e Serviços (Federal)'],
        ['IBS', format_percent(config.get('aliquota_ibs', 17.70)), 'Imposto sobre Bens e Serviços (Estadual/Municipal)'],
        ['TOTAL', format_percent(config.get('aliquota_total', 26.50)), 'Alíquota Total do IVA Dual'],
    ]
    
    aliq_table = Table(aliq_data, colWidths=[3*cm, 3*cm, 10*cm])
    aliq_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#d1fae5')),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(aliq_table)
    elements.append(Spacer(1, 10*mm))
    
    # Apuração
    apuracao = data.get('apuracao', {})
    creditos = apuracao.get('creditos', {})
    debitos = apuracao.get('debitos', {})
    saldo = apuracao.get('saldo', {})
    imposto_seletivo = apuracao.get('imposto_seletivo', {})
    
    elements.append(Paragraph("DEMONSTRATIVO DE APURAÇÃO", section_style))
    
    # Tabela principal de apuração
    apuracao_data = [
        ['Descrição', 'CBS', 'IBS', 'Total'],
        ['CRÉDITOS (Entradas)', 
         format_currency(creditos.get('cbs', 0)),
         format_currency(creditos.get('ibs', 0)),
         format_currency(creditos.get('total', 0))],
        ['DÉBITOS (Saídas)', 
         format_currency(debitos.get('cbs', 0)),
         format_currency(debitos.get('ibs', 0)),
         format_currency(debitos.get('total', 0))],
        ['IMPOSTO SELETIVO', '-', '-', format_currency(imposto_seletivo.get('total', 0))],
        ['SALDO', 
         format_currency(saldo.get('cbs', 0)),
         format_currency(saldo.get('ibs', 0)),
         format_currency(saldo.get('total', 0))],
    ]
    
    apuracao_table = Table(apuracao_data, colWidths=[6*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    apuracao_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        # Cores para créditos (verde)
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#d1fae5')),
        ('TEXTCOLOR', (1, 1), (-1, 1), colors.HexColor('#059669')),
        # Cores para débitos (vermelho)
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#fee2e2')),
        ('TEXTCOLOR', (1, 2), (-1, 2), colors.HexColor('#dc2626')),
        # Cores para IS (amarelo)
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#fef3c7')),
        ('TEXTCOLOR', (1, 3), (-1, 3), colors.HexColor('#d97706')),
        # Cores para saldo
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
    ]))
    elements.append(apuracao_table)
    elements.append(Spacer(1, 5*mm))
    
    # Situação
    situacao = saldo.get('situacao', 'a_pagar')
    situacao_texto = 'IMPOSTO A PAGAR' if situacao == 'a_pagar' else 'CRÉDITO ACUMULADO'
    situacao_cor = colors.HexColor('#dc2626') if situacao == 'a_pagar' else colors.HexColor('#059669')
    
    situacao_style = ParagraphStyle(
        'Situacao',
        parent=styles['Normal'],
        fontSize=14,
        alignment=TA_CENTER,
        textColor=situacao_cor,
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=10
    )
    elements.append(Paragraph(f"{situacao_texto}: {format_currency(abs(saldo.get('total', 0)))}", situacao_style))
    elements.append(Spacer(1, 10*mm))
    
    # Comparativo com regime atual
    comparativo = data.get('comparativo_regime_atual', {})
    diferenca = data.get('diferenca', {})
    
    elements.append(Paragraph("COMPARATIVO COM REGIME ATUAL", section_style))
    
    comp_data = [
        ['', 'Regime Atual', 'Reforma Tributária', 'Diferença'],
        ['PIS/COFINS', format_currency(comparativo.get('pis_cofins', 0)), '-', '-'],
        ['ICMS', format_currency(comparativo.get('icms', 0)), '-', '-'],
        ['CBS', '-', format_currency(saldo.get('cbs', 0)), '-'],
        ['IBS', '-', format_currency(saldo.get('ibs', 0)), '-'],
        ['Imposto Seletivo', '-', format_currency(imposto_seletivo.get('total', 0)), '-'],
        ['TOTAL', 
         format_currency(comparativo.get('total', 0)),
         format_currency(saldo.get('total', 0)),
         format_currency(diferenca.get('valor', 0))],
    ]
    
    comp_table = Table(comp_data, colWidths=[4.5*cm, 4*cm, 4*cm, 4*cm])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3e8ff')),
    ]))
    elements.append(comp_table)
    elements.append(Spacer(1, 5*mm))
    
    # Impacto percentual
    impacto_valor = diferenca.get('valor', 0)
    impacto_percentual = diferenca.get('percentual', 0)
    impacto_texto = "AUMENTO" if impacto_valor > 0 else "REDUÇÃO"
    impacto_cor = colors.HexColor('#dc2626') if impacto_valor > 0 else colors.HexColor('#059669')
    
    impacto_style = ParagraphStyle(
        'Impacto',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        textColor=impacto_cor,
        fontName='Helvetica-Bold'
    )
    
    if comparativo.get('total', 0) > 0:
        elements.append(Paragraph(
            f"IMPACTO DA REFORMA: {impacto_texto} DE {format_currency(abs(impacto_valor))} ({format_percent(abs(impacto_percentual))})",
            impacto_style
        ))
    elements.append(Spacer(1, 10*mm))
    
    # Estatísticas
    estatisticas = data.get('estatisticas', {})
    entradas_stats = estatisticas.get('entradas', {})
    saidas_stats = estatisticas.get('saidas', {})
    
    elements.append(Paragraph("ESTATÍSTICAS", section_style))
    
    stats_data = [
        ['', 'Entradas', 'Saídas'],
        ['Documentos processados', str(entradas_stats.get('documentos', 0)), str(saidas_stats.get('documentos', 0))],
        ['Produtos/Itens', str(entradas_stats.get('produtos', 0)), str(saidas_stats.get('produtos', 0))],
    ]
    
    stats_table = Table(stats_data, colWidths=[6*cm, 5*cm, 5*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6b7280')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 15*mm))
    
    # Notas
    elements.append(Paragraph("NOTAS IMPORTANTES", section_style))
    
    notas = [
        "1. Este relatório apresenta uma SIMULAÇÃO baseada nas regras da Reforma Tributária (LC 214/2025).",
        "2. As alíquotas utilizadas são ESTIMATIVAS para o cenário de 2027.",
        "3. Os valores finais podem sofrer alterações conforme regulamentação específica.",
        "4. A CBS é de competência federal e o IBS é compartilhado entre estados e municípios.",
        "5. O Imposto Seletivo (IS) incide sobre produtos específicos como bebidas, cigarros e veículos.",
        "6. Produtos da Cesta Básica Nacional têm alíquota ZERO nas saídas, mas mantêm direito a crédito.",
        "7. Medicamentos e equipamentos médicos têm redução de 60% na alíquota.",
    ]
    
    for nota in notas:
        elements.append(Paragraph(nota, small_style))
    
    elements.append(Spacer(1, 10*mm))
    
    # Rodapé
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#9ca3af')
    )
    elements.append(Paragraph("_" * 80, footer_style))
    elements.append(Paragraph("Relatório gerado pelo Sistema AURION - Business Contabilidade", footer_style))
    elements.append(Paragraph(f"© {datetime.now().year} - Todos os direitos reservados", footer_style))
    
    # Gerar PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer
