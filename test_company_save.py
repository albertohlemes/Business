import requests
import json

API_URL = "http://localhost:8001/api"

def login():
    try:
        response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_debug@test.com", "password": "test"})
        if response.status_code != 200:
             # Try other password
             response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_debug@test.com", "password": "123456"})
        
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def test_create_company(token):
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "cnpj": "99.999.999/0001-99",
        "razao_social": "Empresa Teste Script",
        "nome_fantasia": "Teste Script",
        "regime_tributario": "lucro_presumido",
        "percentual_presuncao_irpj": 8.0,
        "percentual_presuncao_csll": 12.0
    }
    
    # Strip formatting for API if needed? Frontend sends formatted CNPJ?
    # server.py: `existing = await db.companies.find_one({"cnpj": company_data.cnpj}, ...)`
    # It just checks exact match.
    # But later in code it does `cnpj.replace(...)`.
    # Let's see if Pydantic complains.
    
    print("Attempting to CREATE company...")
    response = requests.post(f"{API_URL}/companies", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        return response.json()['id']
    return None

def test_update_company(token, company_id):
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "razao_social": "Empresa Teste Script Updated",
        "extra_field": "should be ignored"
    }
    
    print(f"Attempting to UPDATE company {company_id}...")
    response = requests.put(f"{API_URL}/companies/{company_id}", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    token = login()
    if token:
        company_id = test_create_company(token)
        if company_id:
            test_update_company(token, company_id)
            
            # Clean up
            # requests.delete(f"{API_URL}/companies/{company_id}", headers={"Authorization": f"Bearer {token}"})
