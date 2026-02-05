"""
CNPJ router - CNPJ lookup from Brasil API
"""
from fastapi import APIRouter, HTTPException
import requests

router = APIRouter(prefix="/cnpj", tags=["CNPJ"])


@router.get("/{cnpj}")
async def buscar_dados_cnpj(cnpj: str):
    """Busca dados do CNPJ na API da Receita Federal via Brasil API"""
    cnpj_limpo = cnpj.replace(".", "").replace("/", "").replace("-", "")
    
    try:
        response = requests.get(
            f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}",
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "razao_social": data.get("razao_social", ""),
                "nome_fantasia": data.get("nome_fantasia", ""),
                "cnae_principal": data.get("cnae_fiscal", ""),
                "cnae_principal_descricao": data.get("cnae_fiscal_descricao", ""),
                "endereco": f"{data.get('logradouro', '')} {data.get('numero', '')}",
                "cidade": data.get("municipio", ""),
                "uf": data.get("uf", ""),
                "cep": data.get("cep", "")
            }
        return {"error": "CNPJ não encontrado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar CNPJ: {str(e)}")
