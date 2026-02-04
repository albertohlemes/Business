"""
SIEG Soluções API Integration Service
Permite buscar XMLs diretamente do cofre SIEG
"""

import os
import httpx
import base64
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


def get_sieg_api_key() -> str:
    """Obtém a API Key do SIEG"""
    return os.environ.get('SIEG_API_KEY', '')


def build_sieg_url(endpoint: str, api_key: str = None) -> str:
    """Constrói URL com api_key como query parameter (formato SIEG)"""
    if not api_key:
        api_key = get_sieg_api_key()
    return f"{SIEG_API_BASE}/{endpoint}?api_key={api_key}"


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
    Conta quantos XMLs estão disponíveis no SIEG para o CNPJ e competência
    """
    if not api_key:
        api_key = get_sieg_api_key()
    
    if not api_key:
        raise ValueError("SIEG API Key não configurada")
    
    # Limpar CNPJ
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    
    # Obter datas da competência
    data_inicio, data_fim = get_competencia_dates(competencia)
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Request para contar XMLs
    payload = {
        "CnpjDest": cnpj_limpo,  # Notas de entrada (onde a empresa é destinatária)
        "DataEmissaoInicio": data_inicio.isoformat(),
        "DataEmissaoFim": data_fim.isoformat()
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Contar notas de entrada
        try:
            response_entrada = await client.post(
                build_sieg_url("ContarXmls", api_key),
                headers=headers,
                json=payload
            )
            
            count_entrada = {"NFe": 0, "NFCe": 0, "CTe": 0, "CFe": 0, "NFSe": 0}
            if response_entrada.status_code == 200:
                resp_data = response_entrada.json()
                if isinstance(resp_data, dict) and "Message" not in resp_data:
                    count_entrada = resp_data
                elif "Message" in resp_data:
                    print(f"[SIEG] Aviso entrada: {resp_data['Message']}")
        except Exception as e:
            print(f"[SIEG] Erro ao contar entradas: {e}")
            count_entrada = {"NFe": 0, "NFCe": 0, "CTe": 0, "CFe": 0, "NFSe": 0}
        
        # Contar notas de saída (onde a empresa é emitente)
        payload_saida = {
            "CnpjEmit": cnpj_limpo,
            "DataEmissaoInicio": data_inicio.isoformat(),
            "DataEmissaoFim": data_fim.isoformat()
        }
        
        try:
            response_saida = await client.post(
                build_sieg_url("ContarXmls", api_key),
                headers=headers,
                json=payload_saida
            )
            
            count_saida = {"NFe": 0, "NFCe": 0, "CTe": 0, "CFe": 0, "NFSe": 0}
            if response_saida.status_code == 200:
                resp_data = response_saida.json()
                if isinstance(resp_data, dict) and "Message" not in resp_data:
                    count_saida = resp_data
                elif "Message" in resp_data:
                    print(f"[SIEG] Aviso saída: {resp_data['Message']}")
        except Exception as e:
            print(f"[SIEG] Erro ao contar saídas: {e}")
            count_saida = {"NFe": 0, "NFCe": 0, "CTe": 0, "CFe": 0, "NFSe": 0}
    
    return {
        "entrada": {
            "nfe": count_entrada.get("NFe", 0),
            "nfce": count_entrada.get("NFCe", 0),
            "cte": count_entrada.get("CTe", 0),
            "cfe": count_entrada.get("CFe", 0),
            "nfse": count_entrada.get("NFSe", 0),
            "total": sum(v for v in count_entrada.values() if isinstance(v, int))
        },
        "saida": {
            "nfe": count_saida.get("NFe", 0),
            "nfce": count_saida.get("NFCe", 0),
            "cte": count_saida.get("CTe", 0),
            "cfe": count_saida.get("CFe", 0),
            "nfse": count_saida.get("NFSe", 0),
            "total": sum(v for v in count_saida.values() if isinstance(v, int))
        },
        "competencia": competencia,
        "cnpj": cnpj_limpo
    }


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
    if not api_key:
        api_key = get_sieg_api_key()
    
    if not api_key:
        raise ValueError("SIEG API Key não configurada")
    
    # Limpar CNPJ
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    
    # Obter datas da competência
    data_inicio, data_fim = get_competencia_dates(competencia)
    
    # Tipos de XML para baixar (default: NFe)
    if not xml_types:
        xml_types = ["nfe"]
    
    headers = {
        "Content-Type": "application/json"
    }
    
    all_xmls = []
    stats = {
        "total_encontrados": 0,
        "total_baixados": 0,
        "por_tipo": {}
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for xml_type in xml_types:
            xml_type_code = XML_TYPES.get(xml_type.lower(), 1)
            
            # Configurar filtro baseado no tipo (entrada/saída)
            payload = {
                "XmlType": xml_type_code,
                "Take": take,
                "Skip": skip,
                "DataEmissaoInicio": data_inicio.isoformat(),
                "DataEmissaoFim": data_fim.isoformat(),
                "Downloadevent": False
            }
            
            if tipo == "entrada":
                payload["CnpjDest"] = cnpj_limpo
            else:
                payload["CnpjEmit"] = cnpj_limpo
            
            print(f"[SIEG] Baixando {xml_type.upper()} - {tipo} para CNPJ {cnpj_limpo}")
            
            try:
                response = await client.post(
                    build_sieg_url("BaixarXmls", api_key),
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Verificar se é erro
                    if isinstance(data, dict) and "Message" in data:
                        print(f"[SIEG] Aviso {xml_type}: {data['Message']}")
                        stats["por_tipo"][xml_type] = 0
                        continue
                    
                    # A API retorna XMLs em Base64 na resposta
                    # Formato: lista de objetos com "Xml" em Base64
                    if isinstance(data, list):
                        for item in data:
                            if "Xml" in item:
                                try:
                                    # Decodificar Base64
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
                        
                        stats["por_tipo"][xml_type] = len(data)
                        stats["total_baixados"] += len(data)
                    
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
