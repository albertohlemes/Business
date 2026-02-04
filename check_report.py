import requests
import sys

API_URL = "http://localhost:8001/api"

def test_report(company_id):
    # Login
    try:
        response = requests.post(f"{API_URL}/auth/login", json={"email": "test@test.com", "password": "test"})
        token = response.json()['access_token']
    except:
        # Try dev credentials
        response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_debug@test.com", "password": "123456"})
        token = response.json()['access_token']

    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch Report
    resp = requests.get(f"{API_URL}/relatorio-divergencias-saida/{company_id}?competencia=01/2024", headers=headers)
    if resp.status_code != 200:
        print(f"Error fetching report: {resp.text}")
        return

    data = resp.json()
    print(f"Total Divergences: {data['total_produtos_divergentes']}")
    for doc in data['divergencias']:
        for prod in doc['produtos']:
            print(f"Prod: {prod['produto']}, NCM: {prod['ncm']}, PIS: {prod['impacto_pis']}, CST: {prod['cst_pis_atual']}")

if __name__ == "__main__":
    test_report("comp_test_div")
