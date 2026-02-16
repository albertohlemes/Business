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
            
            # Detectar operação pelo CFOP E pela posição da empresa (emitente ou destinatário)
            cfop_elem = root.find('.//{*}CFOP')
            emit_cnpj_elem = root.find('.//{*}emit/{*}CNPJ')
            dest_cnpj_elem = root.find('.//{*}dest/{*}CNPJ')
            
            emit_cnpj = emit_cnpj_elem.text if emit_cnpj_elem is not None else ''
            dest_cnpj = dest_cnpj_elem.text if dest_cnpj_elem is not None else ''
            
            if cfop_elem is not None:
                cfop = cfop_elem.text
                cfop_indica_entrada = cfop and cfop[0] in ['1', '2', '3']
                cfop_indica_saida = cfop and cfop[0] in ['5', '6', '7']
                
                # IMPORTANTE: O CFOP do XML é do ponto de vista do EMITENTE
                # Se a empresa importando é o DESTINATÁRIO:
                #   - CFOP 5xxx/6xxx do emitente = ENTRADA para o destinatário
                #   - CFOP 1xxx/2xxx do emitente (devolução) = deve manter como entrada
                # Se a empresa importando é o EMITENTE:
                #   - CFOP 5xxx/6xxx = SAÍDA
                #   - CFOP 1xxx/2xxx = ENTRADA (compra)
                
                # Para determinar corretamente, precisamos saber qual empresa está importando
                # Por ora, assumimos que XMLs recebidos de terceiros são ENTRADA
                # e o sistema principal corrigirá se necessário
                
                # Se o CFOP indica saída (5xxx, 6xxx) em um XML recebido,
                # provavelmente é uma nota de compra (entrada para quem recebe)
                if cfop_indica_saida:
                    # Não rejeitar automaticamente - deixar o usuário decidir
                    # O CFOP será convertido durante o processamento
                    detected_operacao = None  # Não detectar, confiar no tipo selecionado
                elif cfop_indica_entrada:
                    detected_operacao = 'entrada'
            
            # Se não encontrou CFOP, verificar se é emissão própria ou de terceiros
            if not detected_operacao:
                # Documentos recebidos de terceiros são entrada
                # Documentos emitidos são saída
                # Por padrão, assumir pela estrutura
                detected_operacao = None  # Deixar o usuário decidir
        
        # CT-e
        elif 'cte' in root.tag.lower() or 'CTe' in root.tag:
            detected_type = '57'
            # CT-e: não rejeitar automaticamente pelo CFOP
            # Deixar o usuário definir se é entrada ou saída
            cfop_elem = root.find('.//{*}CFOP')
            if cfop_elem is not None:
                cfop = cfop_elem.text
                if cfop and cfop[0] in ['1', '2', '3']:
                    detected_operacao = 'entrada'
                elif cfop and cfop[0] in ['5', '6', '7']:
                    # CFOP de saída em CT-e recebido = entrada para quem recebe
                    detected_operacao = None  # Deixar usuário decidir
            else:
                detected_operacao = None
        
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


# Prompt para extração de faturas/recibos de locação
FATURA_RECIBO_EXTRACTION_PROMPT = """Você é um especialista em escrituração fiscal brasileira. Analise esta imagem/PDF de uma FATURA ou RECIBO de LOCAÇÃO (aluguel de bens móveis, imóveis, veículos, máquinas, equipamentos) e extraia TODOS os dados necessários para escrituração.

IMPORTANTE: 
1. Locação de bens móveis/imóveis NÃO tem incidência de ISS/ICMS
2. TRIBUTA: PIS (0,65% cumulativo ou 1,65% não-cumulativo), COFINS (3% ou 7,6%), IRPJ, CSLL
3. Retorne APENAS um JSON válido, sem texto adicional

Estrutura esperada:
{
    "tipo_documento": "fatura_recibo",
    "subtipo": "locacao_imovel|locacao_veiculo|locacao_maquinas|locacao_equipamentos|outro",
    "numero_documento": "número da fatura/recibo (ex: 0000000005)",
    "data_emissao": "YYYY-MM-DD",
    "data_vencimento": "YYYY-MM-DD ou null",
    "competencia": "MM/YYYY (derivar do vencimento ou emissão)",
    
    "locador": {
        "cnpj": "apenas números (ou cpf)",
        "razao_social": "nome do locador/proprietário",
        "inscricao_estadual": "número ou null",
        "inscricao_municipal": "número ou null",
        "endereco": {
            "logradouro": "string",
            "numero": "string",
            "complemento": "string ou null",
            "bairro": "string",
            "cidade": "string",
            "uf": "XX",
            "cep": "apenas números"
        },
        "telefone": "string ou null",
        "email": "string ou null"
    },
    
    "locatario": {
        "cnpj": "apenas números (ou cpf)",
        "razao_social": "nome do locatário",
        "endereco": {
            "logradouro": "string",
            "numero": "string",
            "complemento": "string ou null",
            "bairro": "string",
            "cidade": "string",
            "uf": "XX",
            "cep": "apenas números"
        }
    },
    
    "bem_locado": {
        "descricao": "descrição completa do bem/objeto da locação",
        "tipo": "imovel|veiculo|maquina|equipamento|outro",
        "local_utilizacao": "cidade/local onde o bem é utilizado",
        "identificacao": "código do projeto, placa, série, etc. (ex: BM 03, BM 07)",
        "projeto": "nome do projeto/obra se houver"
    },
    
    "valores": {
        "valor_bruto": 0.00,
        "descontos": 0.00,
        "valor_liquido": 0.00,
        "valor_total": 0.00,
        "valor_ir_retido": 0.00
    },
    
    "pagamento": {
        "banco": "nome do banco",
        "agencia": "número da agência",
        "conta": "número da conta",
        "cnpj_favorecido": "CNPJ para depósito"
    },
    
    "retencao_ir": true ou false,
    "periodo_locacao": "descrição do período (ex: 01/01/2026 a 31/01/2026)",
    "observacoes": "texto ou null"
}

REGRAS FISCAIS IMPORTANTES:
- Locação NÃO tem ISS (não é prestação de serviço)
- Locação NÃO tem ICMS (não é circulação de mercadoria)
- Locação TRIBUTA PIS e COFINS como receita de pessoa jurídica
- Pode haver retenção de IR na fonte (1,5% para PJ)
- O valor líquido = valor bruto - descontos

DICAS DE EXTRAÇÃO:
- O número do recibo geralmente aparece como "Recibo: XXXXXXXXXX" ou "Nº XXXXXXXXXX"
- A data de emissão pode estar junto com o local (ex: "Lorena (SP), 10 de Fevereiro de 2026")
- O vencimento pode aparecer no final do documento
- Valores com R$ devem ser convertidos para número decimal

Se algum campo não estiver visível, use null para strings ou 0.00 para valores numéricos.
"""


async def extract_fatura_recibo_from_file(file_path: str, mime_type: str) -> Dict[str, Any]:
    """
    Extrai dados de uma fatura/recibo de locação a partir de imagem ou PDF usando IA
    """
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY não configurada")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"fatura-recibo-extraction-{uuid.uuid4()}",
        system_message="Você é um assistente especializado em extrair dados de documentos fiscais brasileiros, especialmente faturas de locação."
    ).with_model("gemini", "gemini-2.5-flash")
    
    file_content = FileContentWithMimeType(
        file_path=file_path,
        mime_type=mime_type
    )
    
    try:
        response = await chat.send_message(
            UserMessage(
                text=FATURA_RECIBO_EXTRACTION_PROMPT,
                files=[file_content]
            )
        )
        
        # Limpar a resposta e extrair JSON
        response_text = str(response).strip()
        
        # Remover marcadores de código markdown se existirem
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Tentar fazer parse do JSON
        try:
            extracted_data = json.loads(response_text)
        except json.JSONDecodeError:
            # Tentar encontrar JSON válido na resposta
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                extracted_data = json.loads(json_match.group())
            else:
                return {
                    "success": False,
                    "error": "Não foi possível extrair JSON válido da resposta",
                    "raw_response": response_text
                }
        
        # Validar campos obrigatórios
        if not extracted_data.get("valores", {}).get("valor_total") and not extracted_data.get("valores", {}).get("valor_locacao"):
            return {
                "success": False,
                "error": "Não foi possível identificar o valor da locação no documento",
                "raw_response": response_text
            }
        
        # Garantir valor_total preenchido
        if not extracted_data.get("valores", {}).get("valor_total"):
            valores = extracted_data.get("valores", {})
            total = sum([
                valores.get("valor_locacao", 0) or 0,
                valores.get("valor_condominio", 0) or 0,
                valores.get("valor_iptu", 0) or 0,
                valores.get("outros_encargos", 0) or 0
            ])
            extracted_data["valores"]["valor_total"] = total
        
        return {
            "success": True,
            "data": extracted_data,
            "raw_response": response_text
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Erro ao processar com IA: {str(e)}",
            "raw_response": ""
        }
