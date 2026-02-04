import requests
import json

API_URL = "http://localhost:8001/api"

def login():
    try:
        response = requests.post(f"{API_URL}/auth/login", json={"email": "test@test.com", "password": "test"})
        # Try dev credentials
        if response.status_code != 200:
             response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_default@test.com", "password": "test"}) # admin_default created in wipe
        if response.status_code != 200:
             # Try wipe_db credentials
             response = requests.post(f"{API_URL}/auth/login", json={"email": "test@test.com", "password": "123456"})
        
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def list_docs(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_URL}/xml/documents", headers=headers)
    if response.status_code == 200:
        docs = response.json()
        print(f"Found {len(docs)} documents.")
        if len(docs) > 0:
            print("Sample doc keys:", docs[0].keys())
            print("Sample doc ID:", docs[0].get('id'))
    else:
        print(f"List failed: {response.text}")

if __name__ == "__main__":
    token = login()
    if token:
        list_docs(token)
