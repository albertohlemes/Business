"""
Script para corrigir CFOPs de operações distintas importados via SIEG.

Problema: Notas de entrada importadas via SIEG com CFOPs de saída (5xxx/6xxx)
não estavam sendo convertidos para CFOPs de entrada (1xxx/2xxx).

Isso causava erros na apuração de PIS/COFINS, onde produtos com CFOPs de saída
apareciam incorretamente na seção de débitos (saídas) ao invés de créditos (entradas).

Este script:
1. Busca todos os documentos de ENTRADA com CFOPs de SAÍDA (5xxx/6xxx)
2. Converte os CFOPs para entrada (1xxx/2xxx)
3. Preserva o CFOP original em cfop_original_emissor
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv('/app/backend/.env')

# Mapeamento de CFOPs de operações distintas
CFOP_OPERACAO_DISTINTA_CONVERSAO = {
    # Estaduais (5xxx -> 1xxx)
    '5910': '1910',  # Bonificação/Doação
    '5911': '1911',  # Amostra Grátis
    '5912': '1912',  # Demonstração
    '5913': '1913',  # Locação de Bens
    '5914': '1914',  # Consignação
    '5915': '1915',  # Retorno de Consignação
    '5916': '1916',  # Retorno de Locação
    '5917': '1917',  # Conserto/Reparo
    '5918': '1918',  # Devolução de Conserto
    '5919': '1919',  # Industrialização por Encomenda
    '5920': '1920',  # Remessa para Armazém
    '5921': '1921',  # Retorno de Vasilhame/Sacaria
    '5922': '1922',  # Lançamento de Comodato
    '5923': '1923',  # Retorno de Comodato
    '5924': '1924',  # Remessa p/ Industrialização
    '5925': '1925',  # Retorno Industrialização não Entregue
    '5949': '1949',  # Outras Saídas -> Outras Entradas
    # Interestaduais (6xxx -> 2xxx)
    '6910': '2910',  # Bonificação/Doação
    '6911': '2911',  # Amostra Grátis
    '6912': '2912',  # Demonstração
    '6913': '2913',  # Locação de Bens
    '6914': '2914',  # Consignação
    '6915': '2915',  # Retorno de Consignação
    '6916': '2916',  # Retorno de Locação
    '6917': '2917',  # Conserto/Reparo
    '6918': '2918',  # Devolução de Conserto
    '6919': '2919',  # Industrialização por Encomenda
    '6920': '2920',  # Remessa para Armazém
    '6921': '2921',  # Retorno de Vasilhame/Sacaria
    '6922': '2922',  # Lançamento de Comodato
    '6923': '2923',  # Retorno de Comodato
    '6924': '2924',  # Remessa p/ Industrialização
    '6925': '2925',  # Retorno Industrialização não Entregue
    '6949': '2949',  # Outras Saídas -> Outras Entradas
    # CFOPs de devolução que também podem precisar conversão
    '5201': '1201',
    '5202': '1202',
    '6201': '2201',
    '6202': '2202',
}

async def fix_cfop_entries():
    """Corrige CFOPs de operações distintas em documentos de entrada."""
    
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # CFOPs de saída que precisam ser convertidos
    cfops_saida = list(CFOP_OPERACAO_DISTINTA_CONVERSAO.keys())
    
    print("=" * 60)
    print("CORREÇÃO DE CFOPs DE OPERAÇÕES DISTINTAS")
    print("=" * 60)
    print(f"Data/Hora: {datetime.now().isoformat()}")
    print(f"CFOPs de saída a converter: {len(cfops_saida)}")
    print()
    
    # Buscar documentos de ENTRADA com CFOPs de SAÍDA nos produtos
    # Filtro: tipo_operacao = 'entrada' AND produtos.cfop começa com 5 ou 6
    query = {
        "$or": [
            {"tipo_operacao": "entrada"},
            {"tipo": "entrada"}
        ],
        "produtos.cfop": {"$in": cfops_saida}
    }
    
    total_docs = await db.xml_documents.count_documents(query)
    print(f"Documentos de entrada com CFOPs de saída encontrados: {total_docs}")
    
    if total_docs == 0:
        print("\nNenhum documento a corrigir!")
        return
    
    # Estatísticas
    stats = {
        "docs_corrigidos": 0,
        "produtos_corrigidos": 0,
        "cfops_atualizados": {}
    }
    
    # Processar documentos
    cursor = db.xml_documents.find(query)
    
    async for doc in cursor:
        doc_id = doc["_id"]
        produtos = doc.get("produtos", [])
        doc_modificado = False
        
        for prod in produtos:
            cfop = str(prod.get("cfop", ""))
            
            if cfop in CFOP_OPERACAO_DISTINTA_CONVERSAO:
                cfop_novo = CFOP_OPERACAO_DISTINTA_CONVERSAO[cfop]
                
                # Preservar CFOP original se não existir
                if not prod.get("cfop_original_emissor"):
                    prod["cfop_original_emissor"] = cfop
                
                # Atualizar CFOP
                prod["cfop"] = cfop_novo
                prod["cfop_original"] = cfop
                
                doc_modificado = True
                stats["produtos_corrigidos"] += 1
                
                # Contabilizar por CFOP
                key = f"{cfop} → {cfop_novo}"
                stats["cfops_atualizados"][key] = stats["cfops_atualizados"].get(key, 0) + 1
        
        if doc_modificado:
            # Atualizar documento no banco
            await db.xml_documents.update_one(
                {"_id": doc_id},
                {"$set": {"produtos": produtos, "cfop_corrigido": True}}
            )
            stats["docs_corrigidos"] += 1
            
            if stats["docs_corrigidos"] % 100 == 0:
                print(f"  Processados: {stats['docs_corrigidos']}/{total_docs}")
    
    # Relatório final
    print()
    print("=" * 60)
    print("RESULTADO")
    print("=" * 60)
    print(f"Documentos corrigidos: {stats['docs_corrigidos']}")
    print(f"Produtos corrigidos: {stats['produtos_corrigidos']}")
    print()
    print("Conversões realizadas:")
    for key, count in sorted(stats["cfops_atualizados"].items()):
        print(f"  {key}: {count} produtos")
    
    print()
    print("✅ Correção concluída!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_cfop_entries())
