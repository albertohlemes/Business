#!/usr/bin/env python3
"""
Edge case tests for Company Cascade Delete functionality
Tests various scenarios including companies with no documents, many documents, etc.
"""

import requests
import json
import uuid
from datetime import datetime
from pymongo import MongoClient

class CascadeDeleteEdgeCaseTester:
    def __init__(self, base_url="https://taxhelper-20.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        # MongoDB connection for direct DB operations
        self.mongo_client = MongoClient("mongodb://localhost:27017")
        self.db = self.mongo_client["test_database"]

    def setup_admin_user(self):
        """Create and login admin user"""
        print("🔧 Setting up admin user...")
        
        # Register admin
        admin_data = {
            "email": f"edge_admin_{datetime.now().strftime('%H%M%S')}@business.com",
            "password": "AdminPass123!",
            "name": "Edge Case Test Admin",
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

    def test_delete_company_no_documents(self):
        """Test deleting a company with no associated documents"""
        print("\n📋 Test Case 1: Delete company with NO documents")
        print("-" * 50)
        
        # Create company
        company_data = {
            "cnpj": f"88.{datetime.now().strftime('%H%M%S')}.888/0001-88",
            "razao_social": "No Documents Company LTDA",
            "nome_fantasia": "No Docs Corp"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.post(f"{self.base_url}/companies", json=company_data, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to create company: {response.status_code}")
            return False
        
        company_id = response.json()['id']
        print(f"✅ Created company with ID: {company_id}")
        
        # Verify no documents exist for this company
        doc_count = self.db.xml_documents.count_documents({"company_id": company_id})
        print(f"📄 Documents before deletion: {doc_count}")
        
        # Delete company
        response = requests.delete(f"{self.base_url}/companies/{company_id}", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to delete company: {response.status_code}")
            return False
        
        response_data = response.json()
        print(f"✅ Delete response: {response_data['message']}")
        
        # Verify company is deleted
        company_check = self.db.companies.find_one({"id": company_id})
        if company_check:
            print("❌ Company still exists after deletion")
            return False
        
        print("✅ Company successfully deleted")
        return True

    def test_delete_company_many_documents(self):
        """Test deleting a company with many associated documents"""
        print("\n📋 Test Case 2: Delete company with MANY documents (20)")
        print("-" * 50)
        
        # Create company
        company_data = {
            "cnpj": f"77.{datetime.now().strftime('%H%M%S')}.777/0001-77",
            "razao_social": "Many Documents Company LTDA",
            "nome_fantasia": "Many Docs Corp"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.post(f"{self.base_url}/companies", json=company_data, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to create company: {response.status_code}")
            return False
        
        company_id = response.json()['id']
        print(f"✅ Created company with ID: {company_id}")
        
        # Insert 20 documents
        num_docs = 20
        print(f"📄 Inserting {num_docs} documents...")
        
        for i in range(num_docs):
            document_id = str(uuid.uuid4())
            
            dummy_document = {
                "id": document_id,
                "company_id": company_id,
                "competencia": f"{str((i % 12) + 1).zfill(2)}/2024",
                "tipo": "entrada" if i % 2 == 0 else "saida",
                "modelo": "nfe",
                "chave_nfe": f"35202477{datetime.now().strftime('%H%M%S')}000177550010000000{str(i+1).zfill(2)}1234567890",
                "numero_nfe": f"99999{i+1}",
                "data_emissao": f"2024-{str((i % 12) + 1).zfill(2)}-15T10:30:00-03:00",
                "emitente_cnpj": "77.777.777/0001-77",
                "emitente_nome": f"Fornecedor Many {i+1} LTDA",
                "destinatario_cnpj": "77.777.777/0001-77",
                "destinatario_nome": "Many Documents Company LTDA",
                "valor_total": 500.00 * (i+1),
                "valor_servicos": 0.0,
                "xml_content": f"<?xml version='1.0'?><nfe>many docs content {i+1}</nfe>",
                "produtos": [
                    {
                        "codigo": f"MANY{i+1}",
                        "descricao": f"Produto Many Docs {i+1}",
                        "ncm": "87654321",
                        "cfop": "1102" if i % 2 == 0 else "5102",
                        "quantidade": 5.0,
                        "valor_unitario": 100.0 * (i+1),
                        "valor_total": 500.0 * (i+1),
                        "unidade": "UN"
                    }
                ],
                "servicos": [],
                "status_validacao": "pendente",
                "uploaded_at": datetime.now().isoformat(),
                "uploaded_by": "many_docs_test_user"
            }
            
            try:
                self.db.xml_documents.insert_one(dummy_document)
            except Exception as e:
                print(f"❌ Failed to insert document {i+1}: {str(e)}")
                return False
        
        # Verify documents were inserted
        doc_count = self.db.xml_documents.count_documents({"company_id": company_id})
        print(f"✅ Inserted {doc_count} documents")
        
        if doc_count != num_docs:
            print(f"❌ Expected {num_docs} documents, found {doc_count}")
            return False
        
        # Delete company
        print("🗑️  Deleting company with many documents...")
        response = requests.delete(f"{self.base_url}/companies/{company_id}", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to delete company: {response.status_code}")
            return False
        
        response_data = response.json()
        print(f"✅ Delete response: {response_data['message']}")
        
        # Verify company is deleted
        company_check = self.db.companies.find_one({"id": company_id})
        if company_check:
            print("❌ Company still exists after deletion")
            return False
        
        # Verify all documents are deleted
        remaining_docs = self.db.xml_documents.count_documents({"company_id": company_id})
        if remaining_docs > 0:
            print(f"❌ {remaining_docs} documents still exist after company deletion")
            return False
        
        print(f"✅ Company and all {num_docs} documents successfully deleted")
        return True

    def test_delete_nonexistent_company(self):
        """Test deleting a company that doesn't exist"""
        print("\n📋 Test Case 3: Delete NON-EXISTENT company")
        print("-" * 50)
        
        fake_company_id = str(uuid.uuid4())
        print(f"🎭 Attempting to delete fake company ID: {fake_company_id}")
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.delete(f"{self.base_url}/companies/{fake_company_id}", headers=headers)
        
        if response.status_code == 404:
            print("✅ Correctly returned 404 for non-existent company")
            return True
        else:
            print(f"❌ Expected 404, got {response.status_code}")
            return False

    def test_delete_company_mixed_document_types(self):
        """Test deleting a company with mixed document types (NFe, NFCe, NFSe)"""
        print("\n📋 Test Case 4: Delete company with MIXED document types")
        print("-" * 50)
        
        # Create company
        company_data = {
            "cnpj": f"66.{datetime.now().strftime('%H%M%S')}.666/0001-66",
            "razao_social": "Mixed Docs Company LTDA",
            "nome_fantasia": "Mixed Types Corp"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.post(f"{self.base_url}/companies", json=company_data, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to create company: {response.status_code}")
            return False
        
        company_id = response.json()['id']
        print(f"✅ Created company with ID: {company_id}")
        
        # Insert mixed document types
        document_types = [
            ("nfe", "entrada", "NFe Entrada"),
            ("nfe", "saida", "NFe Saída"),
            ("nfce", "saida", "NFCe Saída"),
            ("nfse", "saida", "NFSe Saída")
        ]
        
        inserted_docs = []
        
        for i, (modelo, tipo, desc) in enumerate(document_types):
            document_id = str(uuid.uuid4())
            inserted_docs.append(document_id)
            
            dummy_document = {
                "id": document_id,
                "company_id": company_id,
                "competencia": "12/2024",
                "tipo": tipo,
                "modelo": modelo,
                "chave_nfe": f"35202466{datetime.now().strftime('%H%M%S')}000166550010000000{str(i+1).zfill(2)}1234567890",
                "numero_nfe": f"88888{i+1}",
                "data_emissao": f"2024-12-{str(i+15).zfill(2)}T10:30:00-03:00",
                "emitente_cnpj": "66.666.666/0001-66",
                "emitente_nome": f"Fornecedor Mixed {i+1} LTDA",
                "destinatario_cnpj": "66.666.666/0001-66",
                "destinatario_nome": "Mixed Docs Company LTDA",
                "valor_total": 750.00 * (i+1),
                "valor_servicos": 100.0 if modelo == "nfse" else 0.0,
                "xml_content": f"<?xml version='1.0'?><{modelo}>mixed content {i+1}</{modelo}>",
                "produtos": [] if modelo == "nfse" else [
                    {
                        "codigo": f"MIX{i+1}",
                        "descricao": f"Produto Mixed {desc}",
                        "ncm": "11223344",
                        "cfop": "1102" if tipo == "entrada" else "5102",
                        "quantidade": 3.0,
                        "valor_unitario": 250.0 * (i+1),
                        "valor_total": 750.0 * (i+1),
                        "unidade": "UN"
                    }
                ],
                "servicos": [
                    {
                        "codigo": f"SERV{i+1}",
                        "descricao": f"Serviço Mixed {desc}",
                        "valor_total": 100.0,
                        "aliq_iss": 5.0,
                        "valor_iss": 5.0
                    }
                ] if modelo == "nfse" else [],
                "status_validacao": "pendente",
                "uploaded_at": datetime.now().isoformat(),
                "uploaded_by": "mixed_docs_test_user"
            }
            
            try:
                self.db.xml_documents.insert_one(dummy_document)
                print(f"  ✅ Inserted {desc}: {document_id}")
            except Exception as e:
                print(f"  ❌ Failed to insert {desc}: {str(e)}")
                return False
        
        # Verify documents were inserted
        doc_count = self.db.xml_documents.count_documents({"company_id": company_id})
        print(f"✅ Inserted {doc_count} mixed-type documents")
        
        # Delete company
        print("🗑️  Deleting company with mixed document types...")
        response = requests.delete(f"{self.base_url}/companies/{company_id}", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to delete company: {response.status_code}")
            return False
        
        response_data = response.json()
        print(f"✅ Delete response: {response_data['message']}")
        
        # Verify company is deleted
        company_check = self.db.companies.find_one({"id": company_id})
        if company_check:
            print("❌ Company still exists after deletion")
            return False
        
        # Verify all documents are deleted
        remaining_docs = self.db.xml_documents.count_documents({"company_id": company_id})
        if remaining_docs > 0:
            print(f"❌ {remaining_docs} documents still exist after company deletion")
            return False
        
        print(f"✅ Company and all {len(inserted_docs)} mixed-type documents successfully deleted")
        return True

    def run_all_edge_case_tests(self):
        """Run all edge case tests"""
        print("🚀 Starting Company Cascade Delete Edge Case Tests")
        print("=" * 70)
        
        # Setup
        if not self.setup_admin_user():
            return False
        
        # Run all test cases
        test_results = []
        
        test_cases = [
            ("No Documents", self.test_delete_company_no_documents),
            ("Many Documents", self.test_delete_company_many_documents),
            ("Non-existent Company", self.test_delete_nonexistent_company),
            ("Mixed Document Types", self.test_delete_company_mixed_document_types)
        ]
        
        for test_name, test_func in test_cases:
            try:
                result = test_func()
                test_results.append((test_name, result))
                if result:
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: EXCEPTION - {str(e)}")
                test_results.append((test_name, False))
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 EDGE CASE TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for _, result in test_results if result)
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"  {test_name}: {status}")
        
        print(f"\n📈 Overall Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL EDGE CASE TESTS PASSED!")
            print("✅ Cascade delete functionality is robust and handles all edge cases correctly")
            return True
        else:
            print("⚠️  Some edge case tests failed")
            return False

def main():
    tester = CascadeDeleteEdgeCaseTester()
    
    try:
        success = tester.run_all_edge_case_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n❌ Edge case tests failed with exception: {str(e)}")
        return 1
    finally:
        # Cleanup MongoDB connection
        if hasattr(tester, 'mongo_client'):
            tester.mongo_client.close()

if __name__ == "__main__":
    exit(main())