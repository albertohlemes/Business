"""
SIEG Soluções API Integration Service
Permite buscar XMLs diretamente do cofre SIEG

Autenticação: OAuth2 Client Credentials
"""

import os
import httpx
import base64
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from io import BytesIO

SIEG_API_BASE = "https://api.sieg.com"

# Tipos de XML
XML_TYPES = {
    "nfe": 1,      # NF-e (Nota Fiscal Eletrônica)
    "cte": 2,      # CT-e (Conhecimento de Transporte)
    "nfse": 3,     # NFS-e (Nota Fiscal de Serviço)
    "nfce": 4,     # NFC-e (Nota Fiscal Consumidor)
    "cfe": 5,      # CF-e (Cupom Fiscal)
}

# Cache do token JWT
_jwt_token_cache = {
    "token": None,
    "expires_at": None
}


def get_sieg_api_key() -> str:
    """Obtém a API Key do SIEG (para endpoints legados)"""
    from urllib.parse import unquote
    api_key = os.environ.get('SIEG_API_KEY', '')
    # Se a chave estiver URL-encoded, decodificar
    if '%' in api_key:
        api_key = unquote(api_key)
    return api_key


def get_sieg_credentials() -> tuple:
    """Obtém as credenciais OAuth2 do SIEG (para JWT)"""
    client_id = os.environ.get('SIEG_CLIENT_ID', '')
    client_secret = os.environ.get('SIEG_CLIENT_SECRET', '')
    return client_id, client_secret


async def get_sieg_jwt_token() -> Optional[str]:
    """
    Obtém token JWT do SIEG usando OAuth2 Client Credentials.
    Endpoint: https://api.sieg.com/api/v1/create-jwt
    Headers: x-client-id, x-secret-key
    """
    global _jwt_token_cache
    
    # Verificar se tem token válido em cache
    if _jwt_token_cache["token"] and _jwt_token_cache["expires_at"]:
        if datetime.now() < _jwt_token_cache["expires_at"]:
            print(f"[SIEG] Usando token em cache (válido até {_jwt_token_cache['expires_at']})")
            return _jwt_token_cache["token"]
    
    client_id, client_secret = get_sieg_credentials()
    if not client_id or not client_secret:
        print("[SIEG] Credenciais não configuradas")
        return None
    
    # Endpoint oficial do SIEG para criar JWT
    token_url = f"{SIEG_API_BASE}/api/v1/create-jwt"
    
    # Headers conforme documentação SIEG (x-client-id e x-secret-key)
    headers = {
        "x-client-id": client_id,
        "x-secret-key": client_secret,
        "Content-Type": "application/json"
    }
    
    print(f"[SIEG] Obtendo token JWT de {token_url}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # POST para criar JWT com headers de autenticação
            response = await client.post(
                token_url,
                headers=headers,
                json={}  # Corpo vazio
            )
            
            print(f"[SIEG] Resposta: {response.status_code}")
            
            if response.status_code == 200:
                # O token é retornado diretamente como string
                token = response.text.strip().strip('"')
                
                if token and token.startswith("eyJ"):
                    # Token JWT válido! Cache por 23 horas (token dura 24h)
                    _jwt_token_cache["token"] = token
                    _jwt_token_cache["expires_at"] = datetime.now() + timedelta(hours=23)
                    print(f"[SIEG] ✅ Token JWT obtido com sucesso!")
                    return token
                else:
                    print(f"[SIEG] Resposta inesperada: {response.text[:100]}")
            else:
                print(f"[SIEG] Erro {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            print(f"[SIEG] Erro ao obter token: {e}")
    
    print("[SIEG] ❌ Não foi possível obter token JWT")
    return None


def build_sieg_url(endpoint: str) -> str:
    """Constrói URL do SIEG com API Key no query parameter (para endpoints legados)"""
    api_key = get_sieg_api_key()
    if api_key:
        return f"{SIEG_API_BASE}/{endpoint}?api_key={api_key}"
    return f"{SIEG_API_BASE}/{endpoint}"


async def get_sieg_headers() -> dict:
    """
    Obtém headers para requisições SIEG com token JWT e API Key.
    Combina ambos métodos de autenticação para máxima compatibilidade.
    """
    headers = {
        "Content-Type": "application/json"
    }
    
    # Obter token JWT
    jwt_token = await get_sieg_jwt_token()
    if jwt_token:
        headers["Authorization"] = f"Bearer {jwt_token}"
    else:
        print("[SIEG] ⚠️ Requisição será feita sem token JWT")
    
    # Adicionar API Key também no header (alguns endpoints exigem)
    api_key = get_sieg_api_key()
    if api_key:
        headers["x-api-key"] = api_key
    
    return headers


def get_competencia_dates(competencia: str) -> tuple:
    """
    Converte competência (MM/AAAA) em datas de início e fim
    Returns: (data_inicio, data_fim)
    """
    try:
        parts = competencia.replace('-', '/').split('/')
        if len(parts) == 2:
            mes = int(parts[0])
            ano = int(parts[1])
        else:
            raise ValueError("Formato inválido")
        
        # Primeiro dia do mês
        data_inicio = datetime(ano, mes, 1)
        
        # Último dia do mês
        if mes == 12:
            data_fim = datetime(ano + 1, 1, 1) - timedelta(days=1)
        else:
            data_fim = datetime(ano, mes + 1, 1) - timedelta(days=1)
        
        # Incluir até 23:59:59 do último dia
        data_fim = data_fim.replace(hour=23, minute=59, second=59)
        
        return data_inicio, data_fim
    except Exception as e:
        raise ValueError(f"Competência inválida: {competencia}. Use formato MM/AAAA")


async def count_xmls_sieg(
    cnpj: str,
    competencia: str,
    api_key: str = None
) -> Dict[str, int]:
    """
    Conta quantos XMLs estão disponíveis no SIEG para o CNPJ e competência.
    Usa o endpoint BaixarXmls com Take=1 para estimar contagem.
    """
    # Limpar CNPJ
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    
    # Obter datas da competência
    data_inicio, data_fim = get_competencia_dates(competencia)
    
    # Usar API Key diretamente (funciona melhor que JWT para este endpoint)
    api_key = api_key or get_sieg_api_key()
    
    results = {
        "entrada": {"count": 0, "error": None},
        "saida": {"count": 0, "error": None}
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Contar notas de entrada (CnpjDest)
        try:
            # URL encode a API Key para a requisição
            from urllib.parse import quote
            api_key_encoded = quote(api_key, safe='')
            url = f"{SIEG_API_BASE}/BaixarXmls?api_key={api_key_encoded}"
            payload = {
                "XmlType": 1,  # NF-e
                "Take": 50,
                "Skip": 0,
                "DataEmissaoInicio": data_inicio.strftime("%Y-%m-%d"),
                "DataEmissaoFim": data_fim.strftime("%Y-%m-%d"),
                "CnpjDest": cnpj_limpo
            }
            
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            
            if response.status_code == 200:
                # Double decode - SIEG retorna JSON stringificado
                raw_data = response.text
                data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                if isinstance(data, str):
                    data = json.loads(data)
                    
                if isinstance(data, list):
                    results["entrada"]["count"] = len(data)
                elif isinstance(data, dict) and "Message" in data:
                    # Mensagem de erro como "Nenhum arquivo localizado"
                    results["entrada"]["count"] = 0
                else:
                    results["entrada"]["count"] = 0
            elif response.status_code == 404:
                # 404 significa nenhum arquivo encontrado
                results["entrada"]["count"] = 0
            else:
                results["entrada"]["error"] = response.text[:200]
                
        except Exception as e:
            results["entrada"]["error"] = str(e)
        
        # Contar notas de saída (CnpjEmit)
        try:
            payload = {
                "XmlType": 1,
                "Take": 50,
                "Skip": 0,
                "DataEmissaoInicio": data_inicio.strftime("%Y-%m-%d"),
                "DataEmissaoFim": data_fim.strftime("%Y-%m-%d"),
                "CnpjEmit": cnpj_limpo
            }
            
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            
            if response.status_code == 200:
                # Double decode - SIEG retorna JSON stringificado
                raw_data = response.text
                data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                if isinstance(data, str):
                    data = json.loads(data)
                    
                if isinstance(data, list):
                    results["saida"]["count"] = len(data)
                elif isinstance(data, dict) and "Message" in data:
                    results["saida"]["count"] = 0
                else:
                    results["saida"]["count"] = 0
            elif response.status_code == 404:
                results["saida"]["count"] = 0
            else:
                results["saida"]["error"] = response.text[:200]
                
        except Exception as e:
            results["saida"]["error"] = str(e)
    
    return results


async def download_xmls_sieg(
    cnpj: str,
    competencia: str,
    tipo: str = "entrada",  # "entrada" ou "saida"
    xml_types: List[str] = None,  # ["nfe", "nfse", etc]
    take: int = 50,
    skip: int = 0,
    api_key: str = None
) -> Dict[str, Any]:
    """
    Baixa XMLs do SIEG para o CNPJ e competência especificados
    
    Returns:
        Dict com "xmls" (lista de XMLs em string), "total", "downloaded"
    """
    # Limpar CNPJ
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    
    # Obter datas da competência
    data_inicio, data_fim = get_competencia_dates(competencia)
    
    # Tipos de XML para baixar (default: NFe)
    if not xml_types:
        xml_types = ["nfe"]
    
    # Obter headers com token JWT
    headers = await get_sieg_headers()
    
    all_xmls = []
    stats = {
        "total_encontrados": 0,
        "total_baixados": 0,
        "por_tipo": {}
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Usar API Key diretamente no URL (funciona melhor)
        api_key = api_key or get_sieg_api_key()
        from urllib.parse import quote
        api_key_encoded = quote(api_key, safe='')
        base_url = f"{SIEG_API_BASE}/BaixarXmls?api_key={api_key_encoded}"
        
        for xml_type in xml_types:
            xml_type_code = XML_TYPES.get(xml_type.lower(), 1)
            
            # Configurar filtro baseado no tipo (entrada/saída)
            payload = {
                "XmlType": xml_type_code,
                "Take": take,
                "Skip": skip,
                "DataEmissaoInicio": data_inicio.strftime("%Y-%m-%d"),
                "DataEmissaoFim": data_fim.strftime("%Y-%m-%d"),
                "Downloadevent": False
            }
            
            if tipo == "entrada":
                payload["CnpjDest"] = cnpj_limpo
            else:
                payload["CnpjEmit"] = cnpj_limpo
            
            print(f"[SIEG] Baixando {xml_type.upper()} - {tipo} para CNPJ {cnpj_limpo}")
            
            try:
                response = await client.post(
                    base_url,
                    headers={"Content-Type": "application/json"},
                    json=payload
                )
                
                if response.status_code == 200:
                    # Double decode - SIEG retorna JSON stringificado
                    raw_data = response.text
                    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                    if isinstance(data, str):
                        data = json.loads(data)
                    
                    # Verificar se é erro
                    if isinstance(data, dict) and "Message" in data:
                        print(f"[SIEG] Aviso {xml_type}: {data['Message']}")
                        stats["por_tipo"][xml_type] = 0
                        continue
                    
                    # A API retorna lista de XMLs em Base64
                    if isinstance(data, list):
                        for item in data:
                            try:
                                # O item é uma string Base64
                                if isinstance(item, str) and len(item) > 50:
                                    xml_content = base64.b64decode(item).decode('utf-8')
                                    all_xmls.append({
                                        "xml": xml_content,
                                        "tipo": xml_type,
                                        "chave": "",
                                        "numero": "",
                                        "data_emissao": "",
                                        "cnpj_emit": "",
                                        "cnpj_dest": "",
                                        "valor": 0
                                    })
                                elif isinstance(item, dict) and "Xml" in item:
                                    xml_content = base64.b64decode(item["Xml"]).decode('utf-8')
                                    all_xmls.append({
                                        "xml": xml_content,
                                        "tipo": xml_type,
                                        "chave": item.get("Chave", ""),
                                        "numero": item.get("Numero", ""),
                                        "data_emissao": item.get("DataEmissao", ""),
                                        "cnpj_emit": item.get("CnpjEmit", ""),
                                        "cnpj_dest": item.get("CnpjDest", ""),
                                        "valor": item.get("Valor", 0)
                                    })
                            except Exception as e:
                                print(f"[SIEG] Erro ao decodificar XML: {e}")
                        
                        stats["por_tipo"][xml_type] = len(all_xmls)
                        stats["total_baixados"] = len(all_xmls)
                    
                    # Formato alternativo (V2)
                    elif isinstance(data, dict) and "Xmls" in data:
                        for item in data["Xmls"]:
                            if "Xml" in item:
                                try:
                                    xml_content = base64.b64decode(item["Xml"]).decode('utf-8')
                                    all_xmls.append({
                                        "xml": xml_content,
                                        "tipo": xml_type,
                                        "chave": item.get("Chave", ""),
                                        "numero": item.get("Numero", ""),
                                        "data_emissao": item.get("DataEmissao", ""),
                                        "cnpj_emit": item.get("CnpjEmit", ""),
                                        "cnpj_dest": item.get("CnpjDest", ""),
                                        "valor": item.get("Valor", 0)
                                    })
                                except Exception as e:
                                    print(f"[SIEG] Erro ao decodificar XML: {e}")
                        
                        stats["por_tipo"][xml_type] = len(data.get("Xmls", []))
                        stats["total_baixados"] += len(data.get("Xmls", []))
                else:
                    print(f"[SIEG] Erro na requisição: {response.status_code} - {response.text}")
                    stats["por_tipo"][xml_type] = 0
                    
            except Exception as e:
                print(f"[SIEG] Exceção ao baixar {xml_type}: {e}")
                stats["por_tipo"][xml_type] = 0
    
    return {
        "xmls": all_xmls,
        "stats": stats,
        "competencia": competencia,
        "cnpj": cnpj_limpo,
        "tipo": tipo
    }


async def sync_from_sieg(
    cnpj: str,
    competencia: str,
    api_key: str = None
) -> Dict[str, Any]:
    """
    Sincroniza XMLs de entrada e saída do SIEG
    Retorna todos os XMLs encontrados para processamento posterior
    """
    results = {
        "entrada": {"xmls": [], "stats": {}},
        "saida": {"xmls": [], "stats": {}},
        "totais": {"entrada": 0, "saida": 0}
    }
    
    # Baixar entradas (NFe onde empresa é destinatária)
    try:
        entrada = await download_xmls_sieg(
            cnpj=cnpj,
            competencia=competencia,
            tipo="entrada",
            xml_types=["nfe", "nfse"],
            take=100,
            api_key=api_key
        )
        results["entrada"] = entrada
        results["totais"]["entrada"] = len(entrada.get("xmls", []))
    except Exception as e:
        print(f"[SIEG] Erro ao baixar entradas: {e}")
        results["entrada"]["error"] = str(e)
    
    # Baixar saídas (NFe onde empresa é emitente)
    try:
        saida = await download_xmls_sieg(
            cnpj=cnpj,
            competencia=competencia,
            tipo="saida",
            xml_types=["nfe", "nfce", "nfse"],
            take=100,
            api_key=api_key
        )
        results["saida"] = saida
        results["totais"]["saida"] = len(saida.get("xmls", []))
    except Exception as e:
        print(f"[SIEG] Erro ao baixar saídas: {e}")
        results["saida"]["error"] = str(e)
    
    return results
