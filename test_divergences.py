import requests
import os
from dotenv import load_dotenv
import sys
import uuid
from datetime import datetime

API_URL = "http://localhost:8001/api"

def login():
    try:
        response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_debug@test.com", "password": "test"})
        # Try correct password from create_admin.py which was 123456
        if response.status_code != 200:
             response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_debug@test.com", "password": "123456"})
        
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        print(f"Login failed: {e}")
        sys.exit(1)

def create_divergent_doc(token, company_id):
    # Create a doc with Aliq Zero NCM but with Tax Value
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
        "valor_total": 1000.0,
        "produtos": [
            {
                "codigo": "PROD1",
                "descricao": "Produto Aliq Zero Tributado",
                "ncm": "02061000", # Aliq Zero
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
            }
        ]
    }
    
    # We need to insert this directly to DB as upload expects file
    # Or we can use a python script to insert to mongo
    return doc

if __name__ == "__main__":
    print("Testing Divergences Report logic...")
    # This script actually just prepares data, I need to run python with asyncio to insert to DB
    pass
