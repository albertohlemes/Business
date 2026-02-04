import requests
import os
from dotenv import load_dotenv
import sys

# Load env to get URL (assuming running in container)
# But here I will just use localhost:8001 as per environment setup
API_URL = "http://localhost:8001/api"

def login():
    try:
        response = requests.post(f"{API_URL}/auth/login", json={"email": "admin_debug@test.com", "password": "123456"})
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        print(f"Login failed: {e}")
        sys.exit(1)

def create_dummy_doc(token):
    # This requires creating a company first or using existing one.
    # I'll just try to list documents first and delete one if exists.
    # If not, I can't test delete. 
    # Actually, I'll assume there are documents or I can skip this step if empty.
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_URL}/xml/documents", headers=headers)
    docs = response.json()
    if docs:
        return docs[0]
    return None

def test_delete(token, doc_id):
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Attempting to delete document {doc_id}...")
    response = requests.delete(f"{API_URL}/documents/{doc_id}", headers=headers)
    if response.status_code == 200:
        print("Delete successful!")
        return True
    else:
        print(f"Delete failed: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    print("Starting reproduction script...")
    token = login()
    print("Logged in.")
    doc = create_dummy_doc(token)
    if doc:
        print(f"Found document: {doc.get('id')} - {doc.get('numero_nfe')}")
        test_delete(token, doc.get('id'))
    else:
        print("No documents found to delete. Please upload one via UI first or create one.")
