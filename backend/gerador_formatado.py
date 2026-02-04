"""
Gerador de Documentos com Formatação Manual
Usa as configurações definidas pelo usuário no formulário
"""
import os
import io
import re
import base64
from datetime import datetime
from typing import Dict, Any, List, Optional
from docx import Document
from docx.shared import Pt, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
import logging

logger = logging.getLogger(__name__)

# Mapeamento de alinhamento
ALINHAMENTO_MAP = {
    'left': WD_ALIGN_PARAGRAPH.LEFT,
    'center': WD_ALIGN_PARAGRAPH.CENTER,
    'justify': WD_ALIGN_PARAGRAPH.JUSTIFY,
    'right': WD_ALIGN_PARAGRAPH.RIGHT
}


def gerar_documento_formatado(
    conteudo: str,
    formatacao: Dict[str, Any],
    dados_extraidos: Dict[str, Any] = None
) -> bytes:
    """
    Gera documento Word usando a formatação manual configurada pelo usuário.
    
    Args:
        conteudo: Texto da minuta gerada pela IA
        formatacao: Configuração de formatação do usuário
        dados_extraidos: Dados extraídos do contrato (empresa, sócios, etc.)
    
    Returns:
        bytes do documento .docx
    """
    doc = Document()
    
    # Configurar margens
    margens = formatacao.get('margens', {})
    section = doc.sections[0]
    section.top_margin = Cm(float(margens.get('superior', 2.5)))
    section.bottom_margin = Cm(float(margens.get('inferior', 2.5)))
    section.left_margin = Cm(float(margens.get('esquerda', 3.0)))
    section.right_margin = Cm(float(margens.get('direita', 2.0)))
    
    # Obter configurações de cada seção
    secoes_config = {s['id']: s for s in formatacao.get('secoes', [])}
    espacamento = float(formatacao.get('espacamento', 1.5))
    
    # Adicionar logo se existir
    logo_base64 = formatacao.get('logo_base64')
    if logo_base64:
        try:
            _adicionar_logo(doc, logo_base64)
        except Exception as e:
            logger.warning(f"Erro ao adicionar logo: {e}")
    
    # Processar conteúdo
    linhas = conteudo.split('\n')
    
    for linha in linhas:
        linha_limpa = linha.strip()
        
        if not linha_limpa:
            # Linha vazia
            para = doc.add_paragraph()
            para.paragraph_format.space_after = Pt(6)
            continue
        
        # Detectar tipo da linha
        tipo = _detectar_tipo_linha(linha_limpa)
        config = secoes_config.get(tipo, _config_padrao(tipo))
        
        # Criar parágrafo com formatação
        _adicionar_paragrafo(doc, linha_limpa, config, espacamento, dados_extraidos)
    
    # Adicionar rodapé
    rodape_config = secoes_config.get('rodape')
    if rodape_config and rodape_config.get('exemplo'):
        _adicionar_rodape(doc, rodape_config)
    
    # Salvar em memória
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return buffer.getvalue()


def _detectar_tipo_linha(texto: str) -> str:
    """Detecta o tipo de uma linha para aplicar formatação correta"""
    texto_upper = texto.upper()
    
    # Títulos principais
    titulos = ['ALTERAÇÃO', 'CONTRATO SOCIAL', 'CONSOLIDAÇÃO', 'ENCERRAMENTO']
    if any(t in texto_upper for t in titulos) and len(texto) < 80:
        return 'titulo'
    
    # Preâmbulo
    if texto_upper.startswith('PELO PRESENTE') or 'INSTRUMENTO PARTICULAR' in texto_upper:
        return 'preambulo'
    
    # Cláusulas (título)
    if re.match(r'^(CLÁUSULA|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA|ARTIGO)', texto_upper):
        return 'clausula_titulo'
    
    # Assinaturas
    if texto.startswith('_') or 'CPF:' in texto_upper or 'ASSINATURA' in texto_upper:
        return 'assinatura'
    
    # Qualificação de sócios (nome seguido de qualificação)
    if re.match(r'^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+,\s*(brasileiro|brasileira)', texto, re.IGNORECASE):
        return 'socios'
    
    # Texto padrão (cláusula texto)
    return 'clausula_texto'


def _config_padrao(tipo: str) -> Dict[str, Any]:
    """Retorna configuração padrão para um tipo de seção"""
    configs = {
        'titulo': {
            'fonte': 'Times New Roman', 'tamanho': '14',
            'negrito': True, 'italico': False, 'alinhamento': 'center'
        },
        'preambulo': {
            'fonte': 'Times New Roman', 'tamanho': '12',
            'negrito': False, 'italico': False, 'alinhamento': 'justify'
        },
        'socios': {
            'fonte': 'Times New Roman', 'tamanho': '12',
            'negrito': False, 'italico': False, 'alinhamento': 'justify',
            'nomeNegrito': True
        },
        'clausula_titulo': {
            'fonte': 'Times New Roman', 'tamanho': '12',
            'negrito': True, 'italico': False, 'alinhamento': 'justify'
        },
        'clausula_texto': {
            'fonte': 'Times New Roman', 'tamanho': '12',
            'negrito': False, 'italico': False, 'alinhamento': 'justify'
        },
        'assinatura': {
            'fonte': 'Times New Roman', 'tamanho': '12',
            'negrito': False, 'italico': False, 'alinhamento': 'center'
        },
        'rodape': {
            'fonte': 'Times New Roman', 'tamanho': '9',
            'negrito': False, 'italico': True, 'alinhamento': 'center'
        }
    }
    return configs.get(tipo, configs['clausula_texto'])


def _adicionar_paragrafo(
    doc: Document, 
    texto: str, 
    config: Dict[str, Any],
    espacamento: float,
    dados_extraidos: Dict[str, Any] = None
):
    """Adiciona um parágrafo com a formatação especificada"""
    para = doc.add_paragraph()
    
    # Alinhamento
    alinhamento = config.get('alinhamento', 'justify')
    para.alignment = ALINHAMENTO_MAP.get(alinhamento, WD_ALIGN_PARAGRAPH.JUSTIFY)
    
    # Espaçamento
    para.paragraph_format.line_spacing = espacamento
    para.paragraph_format.space_after = Pt(6)
    
    # Verificar se é qualificação de sócio com nome em negrito
    if config.get('nomeNegrito') and config.get('id') == 'socios':
        _adicionar_texto_socio(para, texto, config)
    else:
        # Adicionar texto normal
        run = para.add_run(texto)
        _aplicar_estilo_run(run, config)


def _adicionar_texto_socio(para, texto: str, config: Dict[str, Any]):
    """Adiciona texto de qualificação de sócio com nome em negrito"""
    # Tentar separar nome da qualificação
    # Padrão: "JOÃO DA SILVA, brasileiro, casado..."
    match = re.match(r'^([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+),\s*(.+)$', texto)
    
    if match:
        nome = match.group(1)
        qualificacao = match.group(2)
        
        # Nome em negrito
        run_nome = para.add_run(nome)
        _aplicar_estilo_run(run_nome, config)
        run_nome.bold = True
        
        # Resto normal
        run_resto = para.add_run(', ' + qualificacao)
        _aplicar_estilo_run(run_resto, config)
    else:
        # Não conseguiu separar, usar texto completo
        run = para.add_run(texto)
        _aplicar_estilo_run(run, config)


def _aplicar_estilo_run(run, config: Dict[str, Any]):
    """Aplica estilo (fonte, tamanho, negrito, itálico) a um run"""
    fonte = config.get('fonte', 'Times New Roman')
    tamanho = int(config.get('tamanho', 12))
    
    run.font.name = fonte
    run.font.size = Pt(tamanho)
    run.bold = config.get('negrito', False)
    run.italic = config.get('italico', False)
    
    # Garantir fonte em caracteres latinos
    run._element.rPr.rFonts.set(qn('w:eastAsia'), fonte)


def _adicionar_logo(doc: Document, logo_base64: str):
    """Adiciona logo no cabeçalho do documento"""
    # Extrair dados do base64
    if 'base64,' in logo_base64:
        logo_data = logo_base64.split('base64,')[1]
    else:
        logo_data = logo_base64
    
    # Decodificar
    logo_bytes = base64.b64decode(logo_data)
    
    # Salvar temporariamente
    temp_path = '/tmp/logo_temp.png'
    with open(temp_path, 'wb') as f:
        f.write(logo_bytes)
    
    # Adicionar ao cabeçalho
    section = doc.sections[0]
    header = section.header
    
    # Limpar cabeçalho existente
    for para in header.paragraphs:
        para.clear()
    
    # Adicionar imagem
    para = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run()
    run.add_picture(temp_path, height=Cm(2))
    
    # Remover arquivo temporário
    if os.path.exists(temp_path):
        os.remove(temp_path)


def _adicionar_rodape(doc: Document, config: Dict[str, Any]):
    """Adiciona rodapé ao documento"""
    section = doc.sections[0]
    footer = section.footer
    
    # Limpar rodapé existente
    for para in footer.paragraphs:
        para.clear()
    
    # Adicionar texto do rodapé
    para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    
    alinhamento = config.get('alinhamento', 'center')
    para.alignment = ALINHAMENTO_MAP.get(alinhamento, WD_ALIGN_PARAGRAPH.CENTER)
    
    run = para.add_run(config.get('exemplo', 'Documento gerado pelo Portal Societário'))
    _aplicar_estilo_run(run, config)
