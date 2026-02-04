import requests
import sys

API_URL = "http://localhost:8001/api"

def login():
    try:
        response = requests.post(f"{API_URL}/auth/login", json={"email": "test@test.com", "password": "test"})
        response.raise_for_status()
        return response.json()['access_token']
    except:
        response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_debug@test.com", "password": "123456"})
        return response.json()['access_token']

def test_batch_delete(company_id, competencia):
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Encode format
    comp_encoded = requests.utils.quote(competencia, safe='')
    # requests.utils.quote('01/2024', safe='') -> '01%2F2024'
    
    print(f"Attempting batch delete for {company_id} - {competencia} (Encoded: {comp_encoded})")
    
    # URL: /documents/{company_id}/competencia/{competencia}
    # If I put encoded manually in string, requests might re-encode?
    # Best way is to let requests handle it? No, path param.
    
    url = f"{API_URL}/documents/{company_id}/competencia/{comp_encoded}"
    
    response = requests.delete(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_batch_delete("comp_test_div", "01/2024")
