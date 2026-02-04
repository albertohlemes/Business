import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid
import requests

load_dotenv('/app/backend/.env')

async def setup_data():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Ensure Company
    company_id = "comp_test_div"
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "id": company_id,
            "cnpj": "12345678000199",
            "razao_social": "Empresa Teste Divergencia",
            "uf": "SP",
            "regime_tributario": "lucro_real"
        }},
        upsert=True
    )
    
    # Insert Document
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "company_id": company_id,
        "competencia": "01/2024",
        "tipo": "saida",
        "modelo": "55",
        "chave_nfe": f"35240112345678000199550010000000011{doc_id[:8]}",
        "numero_nfe": "1001",
        "data_emissao": "2024-01-15T10:00:00",
        "emitente_cnpj": "12345678000199",
        "emitente_nome": "Empresa Teste",
        "destinatario_cnpj": "98765432000100",
        "destinatario_nome": "Cliente Teste",
        "valor_total": 1500.0,
        "produtos": [
            {
                "codigo": "PROD1",
                "descricao": "Produto Aliq Zero Tributado",
                "ncm": "02061000", # Aliq Zero (Carne Bovina)
                "cfop": "5102",
                "cst": "00",
                "cst_pis": "01", # Tributado
                "cst_cofins": "01", # Tributado
                "v_pis": 16.50, # Tem valor (1.65%)
                "v_cofins": 76.00, # Tem valor (7.6%)
                "valor_total": 1000.0
            },
            {
                "codigo": "PROD2",
                "descricao": "Produto Aliq Zero OK",
                "ncm": "02061000", # Aliq Zero
                "cfop": "5102",
                "cst": "00",
                "cst_pis": "06", # Aliq Zero
                "cst_cofins": "06", # Aliq Zero
                "v_pis": 0.0,
                "v_cofins": 0.0,
                "valor_total": 500.0
            },
            {
                "codigo": "PROD3",
                "descricao": "Produto Tributado sem Valor (Erro CST)",
                "ncm": "02061000", # Aliq Zero
                "cfop": "5102",
                "cst": "00",
                "cst_pis": "01", # Tributado
                "cst_cofins": "01", 
                "v_pis": 0.0, # Sem valor -> Should NOT appear with new filter
                "v_cofins": 0.0,
                "valor_total": 200.0
            }
        ]
    }
    await db.xml_documents.insert_one(doc)
    print(f"Inserted document {doc_id}")
    return company_id

asyncio.run(setup_data())
