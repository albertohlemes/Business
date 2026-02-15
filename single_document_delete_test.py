#!/usr/bin/env python3
"""
Specific test for the review request: Verify deleting a single document
1. Create a dummy document via direct DB insert
2. Call DELETE /documents/{id} with admin user  
3. Verify it is gone
"""

import requests
import json
import uuid
from datetime import datetime
from pymongo import MongoClient

class SingleDocumentDeleteTester:
    def __init__(self, base_url="https://produto-memory.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.test_document_id = None
        self.test_company_id = None
        # MongoDB connection for direct DB operations
        self.mongo_client = MongoClient("mongodb://localhost:27017")
        self.db = self.mongo_client["test_database"]

    def login_admin_default(self):
        """Login with admin_default credentials"""
        print("🔐 Logging in with admin_default credentials...")
        
        login_data = {
            "email": "test@test.com",
            "password": "123456"
        }
        
        url = f"{self.base_url}/auth/login"
        response = requests.post(url, json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data['access_token']
            print("✅ Successfully logged in as admin")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False

    def create_test_company(self):
        """Create a test company for the document"""
        print("🏢 Creating test company...")
        
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        # Use timestamp to ensure unique CNPJ
        import time
        timestamp = str(int(time.time() * 1000000))[-6:]
        
        company_data = {
            "cnpj": f"88.{timestamp[:3]}.{timestamp[3:]}/0001-99",
            "razao_social": "Empresa Delete Test LTDA",
            "nome_fantasia": "Delete Test Corp",
            "inscricao_estadual": "999888777",
            "endereco": "Rua Delete Test, 999",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01000-999"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"{self.base_url}/companies"
        response = requests.post(url, json=company_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.test_company_id = data['id']
            print(f"✅ Created test company with ID: {self.test_company_id}")
            return True
        else:
            print(f"❌ Failed to create company: {response.status_code} - {response.text}")
            return False

    def insert_dummy_document_directly(self):
        """Step 1: Create a dummy document via direct DB insert"""
        print("📄 Step 1: Creating dummy document via direct DB insert...")
        
        if not self.test_company_id:
            print("❌ No test company available")
            return False
        
        # Generate unique document ID
        self.test_document_id = str(uuid.uuid4())
        
        # Create dummy document with realistic data
        dummy_document = {
            "id": self.test_document_id,
            "company_id": self.test_company_id,
            "competencia": "12/2024",
            "tipo": "entrada",
            "modelo": "nfe",
            "chave_nfe": f"35202488999888000199550010000000{uuid.uuid4().hex[:8]}",
            "numero_nfe": "999888",
            "data_emissao": "2024-12-30T15:45:00-03:00",
            "emitente_cnpj": "11.222.333/0001-44",
            "emitente_nome": "Fornecedor Delete Test LTDA",
            "destinatario_cnpj": "88.999.888/0001-99",  # Our test company
            "destinatario_nome": "Empresa Delete Test LTDA",
            "valor_total": 2500.00,
            "valor_servicos": 0.0,
            "xml_content": "<?xml version='1.0' encoding='UTF-8'?><nfe>dummy delete test content</nfe>",
            "produtos": [
                {
                    "codigo": "PROD_DELETE_TEST",
                    "descricao": "Produto para Teste de Delete",
                    "ncm": "87654321",
                    "cfop": "1102",
                    "quantidade": 5.0,
                    "valor_unitario": 500.0,
                    "valor_total": 2500.0,
                    "unidade": "UN",
                    "cst": "000",
                    "v_icms": 450.0,
                    "v_pis": 16.25,
                    "v_cofins": 75.0
                }
            ],
            "servicos": [],
            "status_validacao": "pendente",
            "uploaded_at": datetime.now().isoformat(),
            "uploaded_by": "delete_test_user"
        }
        
        try:
            # Insert document directly into MongoDB
            result = self.db.xml_documents.insert_one(dummy_document)
            print(f"✅ Step 1 COMPLETE: Inserted dummy document with ID: {self.test_document_id}")
            
            # Verify document was inserted
            check_doc = self.db.xml_documents.find_one({"id": self.test_document_id})
            if check_doc:
                print(f"✅ Verified document exists in database")
                print(f"   - Document ID: {check_doc['id']}")
                print(f"   - Company ID: {check_doc['company_id']}")
                print(f"   - NFe Number: {check_doc['numero_nfe']}")
                print(f"   - Emitente: {check_doc['emitente_nome']}")
                print(f"   - Valor Total: R$ {check_doc['valor_total']}")
                return True
            else:
                print("❌ Document not found after insertion")
                return False
                
        except Exception as e:
            print(f"❌ Failed to insert dummy document: {str(e)}")
            return False

    def delete_document_via_api(self):
        """Step 2: Call DELETE /documents/{id} with admin user"""
        print(f"🗑️  Step 2: Calling DELETE /documents/{self.test_document_id} with admin user...")
        
        if not self.admin_token or not self.test_document_id:
            print("❌ Missing admin token or document ID")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"{self.base_url}/documents/{self.test_document_id}"
        
        print(f"   Making DELETE request to: {url}")
        response = requests.delete(url, headers=headers)
        
        print(f"   Response Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Step 2 COMPLETE: Document deleted successfully")
                print(f"   - Response: {data.get('message', 'No message')}")
                if 'documento' in data:
                    doc_info = data['documento']
                    print(f"   - Deleted NFe: {doc_info.get('numero_nfe', 'N/A')}")
                    print(f"   - Emitente: {doc_info.get('emitente', 'N/A')}")
                return True
            except:
                print(f"✅ Step 2 COMPLETE: Document deleted (no JSON response)")
                return True
        else:
            print(f"❌ Step 2 FAILED: Delete request failed")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False

    def verify_document_is_gone(self):
        """Step 3: Verify it is gone"""
        print(f"🔍 Step 3: Verifying document {self.test_document_id} is gone...")
        
        # Check 1: Try to get document via API (should return 404)
        print("   Checking via API...")
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            url = f"{self.base_url}/xml/documents/{self.test_document_id}"
            response = requests.get(url, headers=headers)
            
            if response.status_code == 404:
                print("   ✅ API returns 404 - document not found (expected)")
            else:
                print(f"   ❌ API returned {response.status_code} instead of 404")
                return False
        
        # Check 2: Check directly in database
        print("   Checking directly in database...")
        try:
            check_doc = self.db.xml_documents.find_one({"id": self.test_document_id})
            if check_doc is None:
                print("   ✅ Document not found in database (expected)")
                print("✅ Step 3 COMPLETE: Document is completely gone")
                return True
            else:
                print("   ❌ Document still exists in database")
                print(f"      Found document: {check_doc.get('numero_nfe', 'N/A')}")
                return False
        except Exception as e:
            print(f"   ❌ Database check failed: {str(e)}")
            return False

    def cleanup_test_company(self):
        """Clean up the test company"""
        print("🧹 Cleaning up test company...")
        
        if not self.admin_token or not self.test_company_id:
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"{self.base_url}/companies/{self.test_company_id}"
        response = requests.delete(url, headers=headers)
        
        if response.status_code == 200:
            print("✅ Test company cleaned up successfully")
        else:
            print(f"⚠️  Failed to cleanup test company: {response.status_code}")

    def run_test(self):
        """Run the complete test sequence"""
        print("🚀 Starting Single Document Delete Test")
        print("=" * 60)
        print("Review Request: Verify deleting a single document")
        print("1. Create a dummy document via direct DB insert")
        print("2. Call DELETE /documents/{id} with admin user")
        print("3. Verify it is gone")
        print("=" * 60)
        
        # Step 0: Setup
        if not self.login_admin_default():
            return False
        
        if not self.create_test_company():
            return False
        
        # Step 1: Create dummy document via direct DB insert
        if not self.insert_dummy_document_directly():
            print("❌ FAILED at Step 1: Could not create dummy document")
            return False
        
        # Step 2: Call DELETE /documents/{id} with admin user
        if not self.delete_document_via_api():
            print("❌ FAILED at Step 2: Could not delete document via API")
            return False
        
        # Step 3: Verify it is gone
        if not self.verify_document_is_gone():
            print("❌ FAILED at Step 3: Document was not properly deleted")
            return False
        
        # Cleanup
        self.cleanup_test_company()
        
        print("\n" + "=" * 60)
        print("✅ ALL STEPS COMPLETED SUCCESSFULLY")
        print("✅ SINGLE DOCUMENT DELETE FUNCTIONALITY IS WORKING")
        print("=" * 60)
        
        return True

def main():
    tester = SingleDocumentDeleteTester()
    success = tester.run_test()
    
    if success:
        print("\n🎉 TEST RESULT: PASSED")
        return 0
    else:
        print("\n💥 TEST RESULT: FAILED")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())