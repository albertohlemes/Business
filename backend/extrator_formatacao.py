"""
Extrator de Formatação de Documentos
Analisa um documento Word e extrai a formatação para preencher o formulário
"""
import os
import re
import logging
from typing import Dict, Any, List, Optional
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

logger = logging.getLogger(__name__)

# Mapeamento de alinhamento reverso
ALINHAMENTO_REVERSO = {
    WD_ALIGN_PARAGRAPH.LEFT: 'left',
    WD_ALIGN_PARAGRAPH.CENTER: 'center',
    WD_ALIGN_PARAGRAPH.JUSTIFY: 'justify',
    WD_ALIGN_PARAGRAPH.RIGHT: 'right',
    None: 'justify'  # Default
}


def extrair_formatacao_documento(file_path: str) -> Dict[str, Any]:
    """
    Extrai formatação de um documento Word e retorna dados estruturados
    para preencher o formulário de configuração.
    
    Returns:
        Dict com secoes, margens e espacamento
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
    
    doc = Document(file_path)
    
    # Extrair margens
    section = doc.sections[0]
    margens = {
        "superior": f"{section.top_margin.cm:.1f}" if section.top_margin else "2.5",
        "inferior": f"{section.bottom_margin.cm:.1f}" if section.bottom_margin else "2.5",
        "esquerda": f"{section.left_margin.cm:.1f}" if section.left_margin else "3.0",
        "direita": f"{section.right_margin.cm:.1f}" if section.right_margin else "2.0"
    }
    
    # Extrair espaçamento padrão
    espacamento = "1.5"
    for para in doc.paragraphs[:5]:
        if para.paragraph_format.line_spacing:
            esp = para.paragraph_format.line_spacing
            if esp <= 1.2:
                espacamento = "1.0"
            elif esp <= 1.7:
                espacamento = "1.5"
            else:
                espacamento = "2.0"
            break
    
    # Analisar parágrafos e classificar
    paragrafos_analisados = []
    for para in doc.paragraphs:
        texto = para.text.strip()
        if not texto:
            continue
        
        # Extrair formatação do parágrafo
        formato = _extrair_formato_paragrafo(para)
        tipo = _classificar_paragrafo(texto, formato)
        
        paragrafos_analisados.append({
            "texto": texto,
            "tipo": tipo,
            "formato": formato
        })
    
    # Agrupar por tipo e pegar o melhor exemplo de cada
    secoes = _construir_secoes(paragrafos_analisados)
    
    return {
        "secoes": secoes,
        "margens": margens,
        "espacamento": espacamento
    }


def _extrair_formato_paragrafo(para) -> Dict[str, Any]:
    """Extrai formatação de um parágrafo"""
    formato = {
        "fonte": "Times New Roman",
        "tamanho": "12",
        "negrito": False,
        "italico": False,
        "alinhamento": "justify"
    }
    
    # Alinhamento
    if para.alignment:
        formato["alinhamento"] = ALINHAMENTO_REVERSO.get(para.alignment, "justify")
    
    # Fonte e estilo do primeiro run
    if para.runs:
        run = para.runs[0]
        if run.font.name:
            formato["fonte"] = run.font.name
        if run.font.size:
            formato["tamanho"] = str(int(run.font.size.pt))
        if run.bold:
            formato["negrito"] = True
        if run.italic:
            formato["italico"] = True
    
    return formato


def _classificar_paragrafo(texto: str, formato: Dict[str, Any]) -> str:
    """Classifica o tipo de um parágrafo baseado no conteúdo e formatação"""
    texto_upper = texto.upper()
    tamanho = int(formato.get("tamanho", 12))
    negrito = formato.get("negrito", False)
    alinhamento = formato.get("alinhamento", "justify")
    
    # Título principal - geralmente centralizado, negrito, tamanho maior
    # Deve ser verificado ANTES de cláusulas
    titulos_keywords = ['CONTRATO SOCIAL', 'CONSOLIDAÇÃO', 'ATA DE', 'INSTRUMENTO DE']
    titulo_alteracao = 'ALTERAÇÃO' in texto_upper and 'CONTRATO' in texto_upper
    
    if (any(k in texto_upper for k in titulos_keywords) or titulo_alteracao) and len(texto) < 100:
        # Não deve conter CLÁUSULA
        if 'CLÁUSULA' not in texto_upper:
            if alinhamento == 'center' or tamanho >= 14:
                return 'titulo'
    
    # Preâmbulo
    preambulo_keywords = ['PELO PRESENTE', 'INSTRUMENTO PARTICULAR', 'ABAIXO ASSINADOS', 'COMPARECERAM']
    if any(k in texto_upper for k in preambulo_keywords):
        return 'preambulo'
    
    # Qualificação de sócios
    socio_pattern = r'^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+,\s*(brasileiro|brasileira|natural|portador|nascido)'
    if re.match(socio_pattern, texto, re.IGNORECASE):
        return 'socios'
    
    # Título de cláusula
    clausula_keywords = ['CLÁUSULA', 'ARTIGO', 'PARÁGRAFO ÚNICO', '§']
    clausula_numerais = ['PRIMEIRA', 'SEGUNDA', 'TERCEIRA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OITAVA', 'NONA', 'DÉCIMA']
    if any(k in texto_upper for k in clausula_keywords) or any(n in texto_upper for n in clausula_numerais):
        if negrito or len(texto) < 100:
            return 'clausula_titulo'
    
    # Assinatura
    if texto.startswith('_') or '___' in texto:
        return 'assinatura'
    assinatura_keywords = ['ASSINATURA', 'CPF:', 'RG:', 'TESTEMUNHA']
    if any(k in texto_upper for k in assinatura_keywords):
        return 'assinatura'
    
    # Local e data
    data_pattern = r'(São Paulo|Rio de Janeiro|Belo Horizonte|.+),\s*\d{1,2}\s*de\s*(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)'
    if re.search(data_pattern, texto, re.IGNORECASE):
        return 'assinatura'
    
    # Rodapé (geralmente texto pequeno, centralizado)
    if tamanho <= 10 and alinhamento == 'center':
        return 'rodape'
    
    # Default: texto de cláusula
    return 'clausula_texto'


def _construir_secoes(paragrafos: List[Dict]) -> List[Dict[str, Any]]:
    """Constrói as seções do formulário baseado nos parágrafos analisados"""
    
    # Templates padrão
    secoes_template = {
        'titulo': {
            'id': 'titulo',
            'nome': 'Título Principal',
            'descricao': 'Ex: "ALTERAÇÃO DO CONTRATO SOCIAL"',
            'exemplo': '',
            'fonte': 'Times New Roman',
            'tamanho': '14',
            'negrito': True,
            'italico': False,
            'alinhamento': 'center'
        },
        'preambulo': {
            'id': 'preambulo',
            'nome': 'Preâmbulo',
            'descricao': 'Texto introdutório do documento',
            'exemplo': '',
            'fonte': 'Times New Roman',
            'tamanho': '12',
            'negrito': False,
            'italico': False,
            'alinhamento': 'justify'
        },
        'socios': {
            'id': 'socios',
            'nome': 'Qualificação dos Sócios',
            'descricao': 'Nome do sócio em negrito, qualificação normal',
            'exemplo': '',
            'fonte': 'Times New Roman',
            'tamanho': '12',
            'negrito': False,
            'italico': False,
            'alinhamento': 'justify',
            'nomeNegrito': True
        },
        'clausula_titulo': {
            'id': 'clausula_titulo',
            'nome': 'Título das Cláusulas',
            'descricao': 'Ex: "CLÁUSULA PRIMEIRA - OBJETO"',
            'exemplo': '',
            'fonte': 'Times New Roman',
            'tamanho': '12',
            'negrito': True,
            'italico': False,
            'alinhamento': 'justify'
        },
        'clausula_texto': {
            'id': 'clausula_texto',
            'nome': 'Texto das Cláusulas',
            'descricao': 'Corpo/conteúdo das cláusulas',
            'exemplo': '',
            'fonte': 'Times New Roman',
            'tamanho': '12',
            'negrito': False,
            'italico': False,
            'alinhamento': 'justify'
        },
        'assinatura': {
            'id': 'assinatura',
            'nome': 'Assinaturas',
            'descricao': 'Área de assinaturas e encerramento',
            'exemplo': '',
            'fonte': 'Times New Roman',
            'tamanho': '12',
            'negrito': False,
            'italico': False,
            'alinhamento': 'center'
        },
        'rodape': {
            'id': 'rodape',
            'nome': 'Rodapé',
            'descricao': 'Texto que aparece em todas as páginas',
            'exemplo': '',
            'fonte': 'Times New Roman',
            'tamanho': '9',
            'negrito': False,
            'italico': True,
            'alinhamento': 'center'
        }
    }
    
    # Preencher com dados extraídos
    for para in paragrafos:
        tipo = para['tipo']
        if tipo in secoes_template:
            secao = secoes_template[tipo]
            
            # Usar o primeiro exemplo encontrado ou o mais representativo
            if not secao['exemplo'] or len(para['texto']) > len(secao['exemplo']):
                # Limitar tamanho do exemplo
                exemplo = para['texto'][:200] + ('...' if len(para['texto']) > 200 else '')
                secao['exemplo'] = exemplo
            
            # Atualizar formatação
            fmt = para['formato']
            secao['fonte'] = fmt.get('fonte', secao['fonte'])
            secao['tamanho'] = fmt.get('tamanho', secao['tamanho'])
            secao['negrito'] = fmt.get('negrito', secao['negrito'])
            secao['italico'] = fmt.get('italico', secao['italico'])
            secao['alinhamento'] = fmt.get('alinhamento', secao['alinhamento'])
    
    # Retornar na ordem correta
    ordem = ['titulo', 'preambulo', 'socios', 'clausula_titulo', 'clausula_texto', 'assinatura', 'rodape']
    return [secoes_template[k] for k in ordem]
