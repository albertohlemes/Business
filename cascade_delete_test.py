#!/usr/bin/env python3
"""
Focused test for company cascade delete functionality
"""
import requests
import json
from datetime import datetime
import uuid
from pymongo import MongoClient

class CascadeDeleteTester:
    def __init__(self, base_url="https://contaboost.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.mongo_client = MongoClient("mongodb://localhost:27017")
        self.db = self.mongo_client["test_database"]

    def register_and_login_admin(self):
        """Register and login admin user"""
        # Register admin
        admin_data = {
            "email": f"cascade_admin_{datetime.now().strftime('%H%M%S')}@business.com",
            "password": "AdminPass123!",
            "name": "Cascade Admin Test User",
            "role": "admin"
        }
        
        response = requests.post(f"{self.base_url}/auth/register", json=admin_data)
        if response.status_code != 200:
            print(f"❌ Admin registration failed: {response.status_code}")
            return False
        
        # Login admin
        login_data = {
            "email": admin_data["email"],
            "password": admin_data["password"]
        }
        
        response = requests.post(f"{self.base_url}/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Admin login failed: {response.status_code}")
            return False
        
        self.admin_token = response.json()['access_token']
        print("✅ Admin registered and logged in successfully")
        return True

    def test_cascade_delete(self):
        """Test company deletion with cascade delete of associated XML documents"""
        print("\n🔍 Testing Company Cascade Delete Functionality...")
        
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        # Step 1: Create a company for cascade delete testing
        company_data = {
            "cnpj": f"99.888.777/0001-{datetime.now().strftime('%S')}",  # Unique CNPJ
            "razao_social": "Empresa Cascade Delete Test LTDA",
            "nome_fantasia": "Cascade Delete Test Corp",
            "inscricao_estadual": "123456789",
            "endereco": "Rua Cascade Delete, 789",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01234-567"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}', 'Content-Type': 'application/json'}
        response = requests.post(f"{self.base_url}/companies", json=company_data, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to create company: {response.status_code} - {response.text}")
            return False
        
        company_id = response.json()['id']
        print(f"✅ Created company with ID: {company_id}")
        
        # Step 2: Insert a dummy XML document directly into the database
        document_id = str(uuid.uuid4())
        
        dummy_document = {
            "id": document_id,
            "company_id": company_id,
            "competencia": "12/2024",
            "tipo": "entrada",
            "modelo": "nfe",
            "chave_nfe": f"35202499888777000155550010000000011234567890",
            "numero_nfe": "999888",
            "data_emissao": "2024-12-30T15:30:00-03:00",
            "emitente_cnpj": "99.888.777/0001-55",
            "emitente_nome": "Fornecedor Cascade Test LTDA",
            "destinatario_cnpj": company_data["cnpj"],
            "destinatario_nome": company_data["razao_social"],
            "valor_total": 2500.00,
            "valor_servicos": 0.0,
            "xml_content": "<?xml version='1.0'?><nfe>cascade delete test content</nfe>",
            "produtos": [
                {
                    "codigo": "CASCADE001",
                    "descricao": "Produto Teste Cascade Delete",
                    "ncm": "87654321",
                    "cfop": "1102",
                    "quantidade": 5.0,
                    "valor_unitario": 500.0,
                    "valor_total": 2500.0,
                    "unidade": "UN"
                }
            ],
            "servicos": [],
            "status_validacao": "pendente",
            "uploaded_at": datetime.now().isoformat(),
            "uploaded_by": "cascade_test_user"
        }
        
        try:
            # Insert document directly into MongoDB
            result = self.db.xml_documents.insert_one(dummy_document)
            print(f"✅ Inserted dummy document directly to DB: {document_id}")
        except Exception as e:
            print(f"❌ Failed to insert dummy document: {str(e)}")
            return False
        
        # Step 3: Verify both company and document exist before deletion
        company_check = self.db.companies.find_one({"id": company_id})
        document_check = self.db.xml_documents.find_one({"id": document_id})
        
        if not company_check:
            print("❌ Company not found before deletion")
            return False
        
        if not document_check:
            print("❌ Document not found before deletion")
            return False
        
        print("✅ Verified both company and document exist before deletion")
        
        # Step 4: Call DELETE /companies/{id}
        response = requests.delete(f"{self.base_url}/companies/{company_id}", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Company deletion failed: {response.status_code} - {response.text}")
            return False
        
        response_data = response.json()
        message = response_data.get('message', '')
        print(f"✅ Delete API response: {message}")
        
        # Verify response mentions document deletion
        if 'documento(s) excluídos' not in message:
            print(f"❌ Response message doesn't mention document deletion: {message}")
            return False
        
        # Step 5: Verify both company and document are gone
        company_check_after = self.db.companies.find_one({"id": company_id})
        document_check_after = self.db.xml_documents.find_one({"id": document_id})
        
        if company_check_after:
            print("❌ Company still exists after deletion")
            return False
        
        if document_check_after:
            print("❌ Document still exists after deletion")
            return False
        
        print("✅ Verified both company and document are completely deleted")
        print("✅ CASCADE DELETE FUNCTIONALITY WORKING CORRECTLY")
        
        return True

def main():
    print("🚀 Testing Company Cascade Delete Functionality")
    print("=" * 60)
    
    tester = CascadeDeleteTester()
    
    # Setup
    if not tester.register_and_login_admin():
        print("❌ Failed to setup admin user")
        return 1
    
    # Run cascade delete test
    if tester.test_cascade_delete():
        print("\n✅ CASCADE DELETE TEST PASSED")
        print("✅ Company deletion now works even if the company has associated XML documents")
        return 0
    else:
        print("\n❌ CASCADE DELETE TEST FAILED")
        return 1

if __name__ == "__main__":
    exit(main())