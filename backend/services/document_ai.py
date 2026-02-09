"""
Serviço de processamento de documentos fiscais com IA
Usa Gemini para extrair dados de imagens e PDFs de notas fiscais
"""
import os
import json
import tempfile
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Prompt para extração de NFS-e (Nota Fiscal de Serviços)
NFSE_EXTRACTION_PROMPT = """Você é um especialista em escrituração fiscal brasileira. Analise esta imagem/PDF de uma Nota Fiscal de Serviços (NFS-e) e extraia TODOS os dados necessários para escrituração no SPED.

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional.

Estrutura esperada:
{
    "tipo_documento": "nfse",
    "numero_nota": "string",
    "serie": "string ou null",
    "data_emissao": "YYYY-MM-DD",
    "codigo_verificacao": "string ou null",
    
    "prestador": {
        "cnpj": "apenas números",
        "inscricao_municipal": "string ou null",
        "razao_social": "string",
        "nome_fantasia": "string ou null",
        "endereco": {
            "logradouro": "string",
            "numero": "string",
            "complemento": "string ou null",
            "bairro": "string",
            "cidade": "string",
            "uf": "XX",
            "cep": "apenas números",
            "codigo_municipio": "código IBGE 7 dígitos"
        }
    },
    
    "tomador": {
        "cnpj": "apenas números (ou cpf se pessoa física)",
        "inscricao_municipal": "string ou null",
        "razao_social": "string",
        "endereco": {
            "logradouro": "string",
            "numero": "string",
            "complemento": "string ou null",
            "bairro": "string",
            "cidade": "string",
            "uf": "XX",
            "cep": "apenas números",
            "codigo_municipio": "código IBGE 7 dígitos"
        }
    },
    
    "servico": {
        "codigo_servico_lc116": "XX.XX",
        "codigo_cnae": "string ou null",
        "discriminacao": "descrição completa do serviço",
        "codigo_tributacao_municipio": "string ou null"
    },
    
    "valores": {
        "valor_servicos": 0.00,
        "valor_deducoes": 0.00,
        "base_calculo": 0.00,
        "aliquota_iss": 0.00,
        "valor_iss": 0.00,
        "valor_iss_retido": 0.00,
        "valor_pis": 0.00,
        "valor_cofins": 0.00,
        "valor_inss": 0.00,
        "valor_ir": 0.00,
        "valor_csll": 0.00,
        "outras_retencoes": 0.00,
        "valor_liquido": 0.00
    },
    
    "iss_retido": true ou false,
    "optante_simples": true ou false,
    "natureza_operacao": "código da natureza da operação",
    "observacoes": "texto de observações ou null"
}

Se algum campo não estiver visível na nota, use null para strings ou 0.00 para valores numéricos.
Garanta que todos os CNPJs estejam apenas com números (sem pontuação).
"""

# Prompt para extração de documentos de energia/internet/outros
OUTROS_DOCS_EXTRACTION_PROMPT = """Você é um especialista em escrituração fiscal brasileira. Analise esta imagem/PDF de uma conta/fatura (energia elétrica, internet, telefone, água, gás, etc.) e extraia TODOS os dados necessários para escrituração no SPED.

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional.

Estrutura esperada:
{
    "tipo_documento": "conta_consumo",
    "subtipo": "energia|internet|telefone|agua|gas|outro",
    "numero_documento": "string",
    "serie": "string ou null",
    "data_emissao": "YYYY-MM-DD",
    "data_vencimento": "YYYY-MM-DD ou null",
    "mes_referencia": "MM/YYYY",
    
    "fornecedor": {
        "cnpj": "apenas números",
        "inscricao_estadual": "string ou null",
        "razao_social": "string",
        "endereco": {
            "logradouro": "string",
            "numero": "string",
            "cidade": "string",
            "uf": "XX",
            "cep": "apenas números"
        }
    },
    
    "consumidor": {
        "cnpj": "apenas números (ou cpf)",
        "inscricao_estadual": "string ou null",
        "razao_social": "string",
        "endereco": {
            "logradouro": "string",
            "numero": "string",
            "cidade": "string",
            "uf": "XX",
            "cep": "apenas números"
        }
    },
    
    "valores": {
        "valor_total": 0.00,
        "base_calculo_icms": 0.00,
        "aliquota_icms": 0.00,
        "valor_icms": 0.00,
        "base_calculo_pis": 0.00,
        "valor_pis": 0.00,
        "base_calculo_cofins": 0.00,
        "valor_cofins": 0.00
    },
    
    "itens": [
        {
            "descricao": "string",
            "quantidade": 0.00,
            "unidade": "KWH|M3|UN|etc",
            "valor_unitario": 0.00,
            "valor_total": 0.00,
            "cfop": "XXXX"
        }
    ],
    
    "cfop_principal": "use o CFOP correto conforme tabela abaixo",
    "codigo_consumo": "código da classe de consumo se aplicável",
    "observacoes": "texto ou null"
}

REGRAS IMPORTANTES DE CFOP (CLASSIFICAÇÃO AUTOMÁTICA):
Analise o conteúdo do documento e classifique corretamente:

- **1253**: Energia elétrica (contas de luz, distribuidoras de energia)
- **1303**: Serviços de telecomunicação (internet, telefonia fixa, telefonia celular, TV por assinatura, banda larga)
- **1933**: Aquisição de serviços tributados pelo ISSQN (serviços em geral: consultorias, manutenção, vigilância, limpeza, contabilidade, etc.)
- **1556**: Água e esgoto (contas de água/saneamento)
- **1253**: Gás canalizado/encanado

COMO IDENTIFICAR O TIPO DE DOCUMENTO:
- Se mencionar "kWh", "energia", "distribuidora", "CPFL", "CEMIG", "Light", "Enel", "Equatorial", "Energisa" → usar **1253**
- Se mencionar "Mbps", "internet", "banda larga", "fibra", "telefone", "celular", "Vivo", "Claro", "Tim", "Oi", "NET", "SKY" → usar **1303**
- Se mencionar "m³", "água", "esgoto", "saneamento", "SABESP", "COPASA", "CEDAE" → usar **1556**
- Se for nota de serviço (NFS-e) ou fatura de prestador de serviços (contabilidade, advocacia, consultoria, TI, manutenção) → usar **1933**

Se algum campo não estiver visível, use null para strings ou 0.00 para valores numéricos.
"""


async def extract_nfse_from_file(file_path: str, mime_type: str) -> Dict[str, Any]:
    """
    Extrai dados de uma NFS-e a partir de imagem ou PDF usando IA
    """
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY não configurada")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"nfse-extraction-{uuid.uuid4()}",
        system_message="Você é um assistente especializado em extrair dados de documentos fiscais brasileiros."
    ).with_model("gemini", "gemini-2.5-flash")
    
    file_content = FileContentWithMimeType(
        file_path=file_path,
        mime_type=mime_type
    )
    
    user_message = UserMessage(
        text=NFSE_EXTRACTION_PROMPT,
        file_contents=[file_content]
    )
    
    response = await chat.send_message(user_message)
    
    # Limpar resposta e extrair JSON
    json_str = response.strip()
    if json_str.startswith("```json"):
        json_str = json_str[7:]
    if json_str.startswith("```"):
        json_str = json_str[3:]
    if json_str.endswith("```"):
        json_str = json_str[:-3]
    
    try:
        data = json.loads(json_str.strip())
        return {"success": True, "data": data}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Erro ao parsear resposta da IA: {str(e)}", "raw_response": response}


async def extract_outros_docs_from_file(file_path: str, mime_type: str) -> Dict[str, Any]:
    """
    Extrai dados de contas de consumo (energia, internet, etc.) usando IA
    """
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY não configurada")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"outros-extraction-{uuid.uuid4()}",
        system_message="Você é um assistente especializado em extrair dados de documentos fiscais brasileiros."
    ).with_model("gemini", "gemini-2.5-flash")
    
    file_content = FileContentWithMimeType(
        file_path=file_path,
        mime_type=mime_type
    )
    
    user_message = UserMessage(
        text=OUTROS_DOCS_EXTRACTION_PROMPT,
        file_contents=[file_content]
    )
    
    response = await chat.send_message(user_message)
    
    # Limpar resposta e extrair JSON
    json_str = response.strip()
    if json_str.startswith("```json"):
        json_str = json_str[7:]
    if json_str.startswith("```"):
        json_str = json_str[3:]
    if json_str.endswith("```"):
        json_str = json_str[:-3]
    
    try:
        data = json.loads(json_str.strip())
        return {"success": True, "data": data}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Erro ao parsear resposta da IA: {str(e)}", "raw_response": response}


def get_mime_type(filename: str) -> str:
    """Retorna o MIME type baseado na extensão do arquivo"""
    ext = filename.lower().split('.')[-1]
    mime_types = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif'
    }
    return mime_types.get(ext, 'application/octet-stream')


def validate_xml_type(xml_content: str, expected_type: str, expected_operacao: str) -> Dict[str, Any]:
    """
    Valida se o XML corresponde ao tipo esperado
    
    expected_type: '55' (NF-e), '65' (NFC-e), '57' (CT-e), 'nfse'
    expected_operacao: 'entrada' ou 'saida'
    
    Retorna: {"valid": bool, "error": str ou None, "detected_type": str, "detected_operacao": str}
    """
    import xml.etree.ElementTree as ET
    
    try:
        # Remover BOM se presente
        if xml_content.startswith('\ufeff'):
            xml_content = xml_content[1:]
        
        root = ET.fromstring(xml_content)
        
        # Detectar namespace
        ns = {}
        if root.tag.startswith('{'):
            ns_end = root.tag.index('}')
            ns['nfe'] = root.tag[1:ns_end]
        
        detected_type = None
        detected_operacao = None
        
        # Verificar tipo de documento
        # NF-e ou NFC-e
        if 'nfe' in root.tag.lower() or 'NFe' in root.tag:
            # Buscar o modelo
            modelo_elem = root.find('.//{*}mod')
            if modelo_elem is not None:
                modelo = modelo_elem.text
                detected_type = modelo  # '55' ou '65'
            else:
                # Tentar identificar pelo namespace
                if 'nfe' in str(ns.get('nfe', '')).lower():
                    detected_type = '55'  # Assumir NF-e
            
            # Detectar operação pelo CFOP
            cfop_elem = root.find('.//{*}CFOP')
            if cfop_elem is not None:
                cfop = cfop_elem.text
                if cfop and cfop[0] in ['1', '2', '3']:
                    detected_operacao = 'entrada'
                elif cfop and cfop[0] in ['5', '6', '7']:
                    detected_operacao = 'saida'
            
            # Se não encontrou CFOP, verificar se é emissão própria ou de terceiros
            if not detected_operacao:
                # Documentos recebidos de terceiros são entrada
                # Documentos emitidos são saída
                emit_cnpj = root.find('.//{*}emit/{*}CNPJ')
                dest_cnpj = root.find('.//{*}dest/{*}CNPJ')
                # Por padrão, assumir pela estrutura
                detected_operacao = 'entrada'  # Documentos XML geralmente são recebidos
        
        # CT-e
        elif 'cte' in root.tag.lower() or 'CTe' in root.tag:
            detected_type = '57'
            # CT-e recebido é entrada, emitido é saída
            cfop_elem = root.find('.//{*}CFOP')
            if cfop_elem is not None:
                cfop = cfop_elem.text
                if cfop and cfop[0] in ['1', '2', '3']:
                    detected_operacao = 'entrada'
                elif cfop and cfop[0] in ['5', '6', '7']:
                    detected_operacao = 'saida'
            else:
                detected_operacao = 'entrada'
        
        # NFS-e (vários formatos)
        elif 'nfse' in root.tag.lower() or 'rps' in root.tag.lower() or 'servico' in root.tag.lower():
            detected_type = 'nfse'
            # NFS-e pode ser tomado ou prestado
            # Geralmente determinado pelo contexto de upload
            detected_operacao = expected_operacao
        
        # Tentar detecção alternativa
        if not detected_type:
            xml_lower = xml_content.lower()
            if '<mod>55</mod>' in xml_lower:
                detected_type = '55'
            elif '<mod>65</mod>' in xml_lower:
                detected_type = '65'
            elif '<mod>57</mod>' in xml_lower:
                detected_type = '57'
            elif 'nfse' in xml_lower or 'notafiscalservico' in xml_lower:
                detected_type = 'nfse'
            elif '<nfe' in xml_lower or '<infnfe' in xml_lower:
                detected_type = '55'
            elif '<cte' in xml_lower or '<infcte' in xml_lower:
                detected_type = '57'
        
        # Validar contra o esperado
        if detected_type != expected_type:
            type_names = {
                '55': 'NF-e (modelo 55)',
                '65': 'NFC-e (modelo 65)',
                '57': 'CT-e (modelo 57)',
                'nfse': 'NFS-e (Nota de Serviço)'
            }
            return {
                "valid": False,
                "error": f"Tipo de documento incorreto. Esperado: {type_names.get(expected_type, expected_type)}. Detectado: {type_names.get(detected_type, detected_type or 'Desconhecido')}",
                "detected_type": detected_type,
                "detected_operacao": detected_operacao
            }
        
        # Validar operação (entrada/saída) se detectada
        if detected_operacao and detected_operacao != expected_operacao:
            return {
                "valid": False,
                "error": f"Tipo de operação incorreto. Esperado: {expected_operacao.upper()}. Detectado: {detected_operacao.upper()}. O CFOP indica que este documento é de {detected_operacao}.",
                "detected_type": detected_type,
                "detected_operacao": detected_operacao
            }
        
        return {
            "valid": True,
            "error": None,
            "detected_type": detected_type,
            "detected_operacao": detected_operacao or expected_operacao
        }
        
    except ET.ParseError as e:
        return {
            "valid": False,
            "error": f"XML inválido: {str(e)}",
            "detected_type": None,
            "detected_operacao": None
        }
    except Exception as e:
        return {
            "valid": False,
            "error": f"Erro ao validar XML: {str(e)}",
            "detected_type": None,
            "detected_operacao": None
        }
