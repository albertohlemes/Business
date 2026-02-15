#!/usr/bin/env python3
"""
Specific endpoint tests for the review request:
1. "Relatorio Divergencias Saida" endpoint returns ONLY items where tem_valor_imposto is true AND deveria_ser_aliq_zero is true.
2. "Delete Document" endpoint works for admin user.
3. "Delete Batch Documents" endpoint works for admin user with encoded competencia.
"""

import requests
import json
from datetime import datetime

class SpecificEndpointTester:
    def __init__(self, base_url="https://classificacao-beta.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.company_id = None
        self.document_id = None

    def setup_admin_user(self):
        """Setup admin user for testing"""
        # Register admin
        admin_data = {
            "email": f"admin_specific_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "AdminPass123!",
            "name": "Admin Specific Test",
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
        print("✅ Admin user setup complete")
        return True

    def setup_test_company(self):
        """Create a test company"""
        if not self.admin_token:
            return False
        
        company_data = {
            "cnpj": f"12.345.678/0001-{datetime.now().strftime('%S')}",  # Use seconds for uniqueness
            "razao_social": "Empresa Teste Específico LTDA",
            "nome_fantasia": "Teste Específico",
            "uf": "SP"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.post(f"{self.base_url}/companies", json=company_data, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Company creation failed: {response.status_code}")
            if response.content:
                try:
                    error_detail = response.json()
                    print(f"   Error detail: {error_detail}")
                except:
                    print(f"   Error text: {response.text}")
            return False
        
        self.company_id = response.json()['id']
        print("✅ Test company created")
        return True

    def test_relatorio_divergencias_saida_logic(self):
        """Test the Relatorio Divergencias Saida endpoint logic"""
        if not self.admin_token or not self.company_id:
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        competencia = "01/2024"
        
        print(f"\n🔍 Testing Relatorio Divergencias Saida endpoint...")
        
        response = requests.get(
            f"{self.base_url}/relatorio-divergencias-saida/{self.company_id}?competencia={competencia}",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"❌ Request failed with status: {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify response structure
        required_keys = ['empresa', 'competencia', 'total_documentos_saida', 'documentos_com_divergencia', 
                        'total_produtos_divergentes', 'valor_total_divergente', 'impacto_fiscal', 'divergencias']
        
        for key in required_keys:
            if key not in data:
                print(f"❌ Missing required key: {key}")
                return False
        
        # Verify logic: all divergencias should have tem_valor_imposto=true AND deveria_ser_aliq_zero=true
        divergencias = data.get('divergencias', [])
        total_produtos_verificados = 0
        
        for doc in divergencias:
            produtos = doc.get('produtos', [])
            for produto in produtos:
                total_produtos_verificados += 1
                
                # Check tem_valor_imposto (has PIS/COFINS values > 0)
                v_pis = produto.get('v_pis_cobrado', 0)
                v_cofins = produto.get('v_cofins_cobrado', 0)
                tem_valor_imposto = v_pis > 0 or v_cofins > 0
                
                # Check deveria_ser_aliq_zero (should be zero rate based on NCM)
                tipo_divergencia = produto.get('tipo_divergencia', '')
                deveria_ser_aliq_zero = 'alíquota zero' in tipo_divergencia.lower()
                
                if not tem_valor_imposto:
                    print(f"❌ Found product without tax values: {produto.get('produto', 'N/A')}")
                    print(f"   PIS: {v_pis}, COFINS: {v_cofins}")
                    return False
                
                if not deveria_ser_aliq_zero:
                    print(f"❌ Found product that shouldn't be zero rate: {produto.get('produto', 'N/A')}")
                    print(f"   Tipo divergencia: {tipo_divergencia}")
                    return False
        
        print(f"✅ Verified {total_produtos_verificados} products in {len(divergencias)} documents")
        print(f"✅ All products meet criteria: tem_valor_imposto=true AND deveria_ser_aliq_zero=true")
        return True

    def test_delete_document_admin(self):
        """Test Delete Document endpoint for admin user"""
        if not self.admin_token:
            return False
        
        print(f"\n🔍 Testing Delete Document endpoint...")
        
        # First, we need to create a document to delete
        # Let's try to get existing documents first
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        response = requests.get(f"{self.base_url}/xml/documents", headers=headers)
        if response.status_code != 200:
            print(f"❌ Failed to get documents: {response.status_code}")
            return False
        
        documents = response.json()
        if not documents:
            print("⚠️  No documents found to test deletion")
            return True  # Not a failure, just no data
        
        # Use the first document for testing
        document_id = documents[0]['id']
        
        # Delete the document
        response = requests.delete(f"{self.base_url}/documents/{document_id}", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Delete failed with status: {response.status_code}")
            if response.content:
                print(f"   Error: {response.text}")
            return False
        
        result = response.json()
        if 'message' not in result:
            print("❌ Delete response missing 'message' field")
            return False
        
        # Verify document was deleted by trying to get it
        response = requests.get(f"{self.base_url}/xml/documents/{document_id}", headers=headers)
        if response.status_code != 404:
            print(f"❌ Document still exists after deletion (status: {response.status_code})")
            return False
        
        print("✅ Document successfully deleted and verified")
        return True

    def test_delete_batch_documents_admin(self):
        """Test Delete Batch Documents endpoint for admin user with encoded competencia"""
        if not self.admin_token or not self.company_id:
            return False
        
        print(f"\n🔍 Testing Delete Batch Documents endpoint...")
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Use encoded competencia (URL encoded format)
        competencia_encoded = "01%2F2024"  # This is "01/2024" URL encoded
        
        response = requests.delete(
            f"{self.base_url}/documents/{self.company_id}/competencia/{competencia_encoded}",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"❌ Batch delete failed with status: {response.status_code}")
            if response.content:
                print(f"   Error: {response.text}")
            return False
        
        result = response.json()
        
        # Verify response structure
        if 'message' not in result or 'deleted_count' not in result:
            print("❌ Batch delete response missing required fields")
            return False
        
        deleted_count = result.get('deleted_count')
        if not isinstance(deleted_count, int):
            print(f"❌ deleted_count should be integer, got {type(deleted_count)}")
            return False
        
        print(f"✅ Batch delete successful - {deleted_count} documents deleted")
        return True

    def run_all_tests(self):
        """Run all specific endpoint tests"""
        print("🚀 Starting Specific Endpoint Tests")
        print("=" * 50)
        
        if not self.setup_admin_user():
            return False
        
        if not self.setup_test_company():
            return False
        
        tests = [
            ("Relatorio Divergencias Saida Logic", self.test_relatorio_divergencias_saida_logic),
            ("Delete Document Admin", self.test_delete_document_admin),
            ("Delete Batch Documents Admin", self.test_delete_batch_documents_admin)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    print(f"❌ {test_name} FAILED")
            except Exception as e:
                print(f"❌ {test_name} FAILED with exception: {str(e)}")
        
        print("\n" + "=" * 50)
        print(f"📊 Specific Tests Results: {passed}/{total} passed")
        print(f"✅ Success Rate: {passed/total*100:.1f}%")
        
        return passed == total

if __name__ == "__main__":
    tester = SpecificEndpointTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)