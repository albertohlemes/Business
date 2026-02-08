#!/usr/bin/env python3
"""
Focused test for Company Cascade Delete functionality
Tests that deleting a company also deletes all associated XML documents
"""

import requests
import json
import uuid
from datetime import datetime
from pymongo import MongoClient

class CascadeDeleteTester:
    def __init__(self, base_url="https://sped-contabil.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.test_company_id = None
        self.test_document_id = None
        # MongoDB connection for direct DB operations
        self.mongo_client = MongoClient("mongodb://localhost:27017")
        self.db = self.mongo_client["test_database"]

    def setup_admin_user(self):
        """Create and login admin user"""
        print("🔧 Setting up admin user...")
        
        # Register admin
        admin_data = {
            "email": f"cascade_admin_{datetime.now().strftime('%H%M%S')}@business.com",
            "password": "AdminPass123!",
            "name": "Cascade Test Admin",
            "role": "admin"
        }
        
        response = requests.post(f"{self.base_url}/auth/register", json=admin_data)
        if response.status_code != 200:
            print(f"❌ Failed to register admin: {response.status_code}")
            return False
        
        # Login admin
        login_data = {
            "email": admin_data["email"],
            "password": admin_data["password"]
        }
        
        response = requests.post(f"{self.base_url}/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Failed to login admin: {response.status_code}")
            return False
        
        self.admin_token = response.json()['access_token']
        print("✅ Admin user setup complete")
        return True

    def create_test_company(self):
        """Create a company for cascade delete testing"""
        print("🏢 Creating test company...")
        
        company_data = {
            "cnpj": f"99.{datetime.now().strftime('%H%M%S')}.999/0001-99",
            "razao_social": "Cascade Delete Test Company LTDA",
            "nome_fantasia": "Cascade Test Corp",
            "inscricao_estadual": "999888777",
            "endereco": "Rua Cascade Delete, 123",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01234-567"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.post(f"{self.base_url}/companies", json=company_data, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to create company: {response.status_code} - {response.text}")
            return False
        
        self.test_company_id = response.json()['id']
        print(f"✅ Created company with ID: {self.test_company_id}")
        return True

    def insert_test_documents(self, num_docs=3):
        """Insert multiple test XML documents directly into MongoDB"""
        print(f"📄 Inserting {num_docs} test documents...")
        
        inserted_docs = []
        
        for i in range(num_docs):
            document_id = str(uuid.uuid4())
            
            dummy_document = {
                "id": document_id,
                "company_id": self.test_company_id,
                "competencia": f"{str(i+1).zfill(2)}/2024",
                "tipo": "entrada" if i % 2 == 0 else "saida",
                "modelo": "nfe",
                "chave_nfe": f"35202499{datetime.now().strftime('%H%M%S')}000199550010000000{str(i+1).zfill(2)}1234567890",
                "numero_nfe": f"12345{i+1}",
                "data_emissao": f"2024-{str(i+1).zfill(2)}-15T10:30:00-03:00",
                "emitente_cnpj": "99.999.999/0001-99",
                "emitente_nome": f"Fornecedor Teste {i+1} LTDA",
                "destinatario_cnpj": "99.999.999/0001-99",
                "destinatario_nome": "Cascade Delete Test Company LTDA",
                "valor_total": 1000.00 * (i+1),
                "valor_servicos": 0.0,
                "xml_content": f"<?xml version='1.0'?><nfe>dummy content {i+1}</nfe>",
                "produtos": [
                    {
                        "codigo": f"PROD{i+1}",
                        "descricao": f"Produto Teste Cascade {i+1}",
                        "ncm": "12345678",
                        "cfop": "1102" if i % 2 == 0 else "5102",
                        "quantidade": 10.0,
                        "valor_unitario": 100.0 * (i+1),
                        "valor_total": 1000.0 * (i+1),
                        "unidade": "UN"
                    }
                ],
                "servicos": [],
                "status_validacao": "pendente",
                "uploaded_at": datetime.now().isoformat(),
                "uploaded_by": "cascade_test_user"
            }
            
            try:
                result = self.db.xml_documents.insert_one(dummy_document)
                inserted_docs.append(document_id)
                print(f"  ✅ Inserted document {i+1}: {document_id}")
            except Exception as e:
                print(f"  ❌ Failed to insert document {i+1}: {str(e)}")
                return False, []
        
        print(f"✅ Successfully inserted {len(inserted_docs)} documents")
        return True, inserted_docs

    def verify_data_exists(self, document_ids):
        """Verify company and documents exist before deletion"""
        print("🔍 Verifying data exists before deletion...")
        
        # Check company exists
        company_check = self.db.companies.find_one({"id": self.test_company_id})
        if not company_check:
            print("❌ Company not found in database")
            return False
        print(f"  ✅ Company found: {company_check['razao_social']}")
        
        # Check documents exist
        found_docs = 0
        for doc_id in document_ids:
            document_check = self.db.xml_documents.find_one({"id": doc_id})
            if document_check:
                found_docs += 1
        
        if found_docs != len(document_ids):
            print(f"❌ Expected {len(document_ids)} documents, found {found_docs}")
            return False
        
        print(f"  ✅ All {found_docs} documents found in database")
        return True

    def delete_company(self):
        """Delete the company via API"""
        print("🗑️  Deleting company via API...")
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.delete(f"{self.base_url}/companies/{self.test_company_id}", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to delete company: {response.status_code} - {response.text}")
            return False, None
        
        response_data = response.json()
        print(f"✅ Company deleted successfully")
        print(f"  📝 Response: {response_data['message']}")
        return True, response_data

    def verify_cascade_delete(self, document_ids):
        """Verify both company and all documents are deleted"""
        print("🔍 Verifying cascade delete completed...")
        
        # Check company is deleted
        company_check = self.db.companies.find_one({"id": self.test_company_id})
        if company_check:
            print("❌ Company still exists after deletion")
            return False
        print("  ✅ Company successfully deleted")
        
        # Check all documents are deleted
        remaining_docs = 0
        for doc_id in document_ids:
            document_check = self.db.xml_documents.find_one({"id": doc_id})
            if document_check:
                remaining_docs += 1
                print(f"  ❌ Document still exists: {doc_id}")
        
        if remaining_docs > 0:
            print(f"❌ {remaining_docs} documents still exist after company deletion")
            return False
        
        print(f"  ✅ All {len(document_ids)} documents successfully deleted")
        
        # Double-check: count all documents for this company
        total_remaining = self.db.xml_documents.count_documents({"company_id": self.test_company_id})
        if total_remaining > 0:
            print(f"❌ Found {total_remaining} orphaned documents for deleted company")
            return False
        
        print("  ✅ No orphaned documents found")
        return True

    def run_cascade_delete_test(self):
        """Run the complete cascade delete test"""
        print("🚀 Starting Company Cascade Delete Test")
        print("=" * 60)
        
        # Setup
        if not self.setup_admin_user():
            return False
        
        if not self.create_test_company():
            return False
        
        # Insert multiple documents to test cascade delete thoroughly
        success, document_ids = self.insert_test_documents(num_docs=5)
        if not success:
            return False
        
        # Verify data exists before deletion
        if not self.verify_data_exists(document_ids):
            return False
        
        # Perform cascade delete
        success, response_data = self.delete_company()
        if not success:
            return False
        
        # Verify cascade delete worked
        if not self.verify_cascade_delete(document_ids):
            return False
        
        print("\n" + "=" * 60)
        print("✅ CASCADE DELETE TEST PASSED")
        print(f"✅ Company and {len(document_ids)} associated documents successfully deleted")
        print("✅ No orphaned data remains in the system")
        print("✅ Cascade delete functionality is working correctly")
        
        return True

def main():
    tester = CascadeDeleteTester()
    
    try:
        success = tester.run_cascade_delete_test()
        return 0 if success else 1
    except Exception as e:
        print(f"\n❌ Test failed with exception: {str(e)}")
        return 1
    finally:
        # Cleanup MongoDB connection
        if hasattr(tester, 'mongo_client'):
            tester.mongo_client.close()

if __name__ == "__main__":
    exit(main())