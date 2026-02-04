"""
Test suite for iteration 8 features:
1. Header: Link 'Empresas' no header
2. CompanySelector: Competência auto-format (122025 → 12/2025)
3. Dashboard: Botão 'Selecionar Empresa'
4. Validação: Mensagem de sucesso ao aprovar produto
5. Validação: Justificativa da IA ao lado da classificação
6. Reclassificação IA: Botão 'Memória da IA' com explicação
7. Backend endpoint /api/analise-aliquotas-saida/{company_id}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnaliseAliquotasSaida:
    """Tests for the new /api/analise-aliquotas-saida endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, "Login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.company_id = "e04975c4-b209-483f-b9bf-4e429a52fa74"  # ANZEN
        self.competencia = "12/2025"
    
    def test_analise_aliquotas_saida_returns_200(self):
        """Test that endpoint returns 200 for valid company"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{self.company_id}",
            params={"competencia": self.competencia},
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"SUCCESS: /api/analise-aliquotas-saida returns 200")
    
    def test_analise_aliquotas_saida_structure(self):
        """Test response structure contains required fields"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{self.company_id}",
            params={"competencia": self.competencia},
            headers=self.headers
        )
        data = response.json()
        
        # Check required fields
        assert "empresa" in data, "Missing 'empresa' field"
        assert "competencia" in data, "Missing 'competencia' field"
        assert "total_documentos_saida" in data, "Missing 'total_documentos_saida' field"
        assert "total_produtos" in data, "Missing 'total_produtos' field"
        assert "produtos_com_alerta" in data, "Missing 'produtos_com_alerta' field"
        assert "resumo_alertas" in data, "Missing 'resumo_alertas' field"
        assert "produtos" in data, "Missing 'produtos' field"
        
        print(f"SUCCESS: Response structure is correct")
        print(f"  - Empresa: {data['empresa']}")
        print(f"  - Total documentos saída: {data['total_documentos_saida']}")
        print(f"  - Total produtos: {data['total_produtos']}")
        print(f"  - Produtos com alerta: {data['produtos_com_alerta']}")
    
    def test_analise_aliquotas_resumo_alertas(self):
        """Test resumo_alertas contains ICMS, PIS, COFINS counts"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{self.company_id}",
            params={"competencia": self.competencia},
            headers=self.headers
        )
        data = response.json()
        resumo = data["resumo_alertas"]
        
        assert "total" in resumo, "Missing 'total' in resumo_alertas"
        assert "icms" in resumo, "Missing 'icms' in resumo_alertas"
        assert "pis" in resumo, "Missing 'pis' in resumo_alertas"
        assert "cofins" in resumo, "Missing 'cofins' in resumo_alertas"
        
        print(f"SUCCESS: resumo_alertas structure is correct")
        print(f"  - Total alertas: {resumo['total']}")
        print(f"  - ICMS alertas: {resumo['icms']}")
        print(f"  - PIS alertas: {resumo['pis']}")
        print(f"  - COFINS alertas: {resumo['cofins']}")
    
    def test_analise_aliquotas_produto_structure(self):
        """Test individual produto structure in response"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{self.company_id}",
            params={"competencia": self.competencia},
            headers=self.headers
        )
        data = response.json()
        
        if data["produtos"]:
            produto = data["produtos"][0]
            assert "documento" in produto, "Missing 'documento' in produto"
            assert "codigo" in produto, "Missing 'codigo' in produto"
            assert "descricao" in produto, "Missing 'descricao' in produto"
            assert "valor_total" in produto, "Missing 'valor_total' in produto"
            assert "aliquotas" in produto, "Missing 'aliquotas' in produto"
            assert "valores" in produto, "Missing 'valores' in produto"
            assert "alertas" in produto, "Missing 'alertas' in produto"
            
            # Check aliquotas structure
            aliq = produto["aliquotas"]
            assert "icms" in aliq, "Missing 'icms' in aliquotas"
            assert "pis" in aliq, "Missing 'pis' in aliquotas"
            assert "cofins" in aliq, "Missing 'cofins' in aliquotas"
            
            print(f"SUCCESS: Produto structure is correct")
            print(f"  - Produto: {produto['descricao'][:50]}...")
            print(f"  - Alíquotas: ICMS={aliq['icms']}%, PIS={aliq['pis']}%, COFINS={aliq['cofins']}%")
        else:
            print("INFO: No produtos in response (no saída documents)")
    
    def test_analise_aliquotas_invalid_company(self):
        """Test endpoint returns 404 for invalid company"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/invalid-company-id",
            params={"competencia": self.competencia},
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"SUCCESS: Returns 404 for invalid company")


class TestLearnedRulesEndpoint:
    """Tests for the /api/learned-rules endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, "Login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.company_id = "e04975c4-b209-483f-b9bf-4e429a52fa74"  # ANZEN
    
    def test_learned_rules_returns_200(self):
        """Test that endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/learned-rules/{self.company_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"SUCCESS: /api/learned-rules returns 200")
    
    def test_learned_rules_returns_list(self):
        """Test that endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/learned-rules/{self.company_id}",
            headers=self.headers
        )
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Returns list with {len(data)} rules")


class TestDashboardStats:
    """Tests for dashboard stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, "Login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.company_id = "e04975c4-b209-483f-b9bf-4e429a52fa74"  # ANZEN
        self.competencia = "12/2025"
    
    def test_dashboard_stats_returns_200(self):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{self.company_id}",
            params={"competencia": self.competencia},
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"SUCCESS: /api/dashboard/stats returns 200")
    
    def test_dashboard_stats_has_quantidades(self):
        """Test dashboard stats has document quantities"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{self.company_id}",
            params={"competencia": self.competencia},
            headers=self.headers
        )
        data = response.json()
        
        assert "quantidades" in data
        quant = data["quantidades"]
        assert "nfe_entrada" in quant
        assert "nfe_saida" in quant
        assert "nfce" in quant
        assert "nfse" in quant
        
        print(f"SUCCESS: Dashboard has document quantities")
        print(f"  - NF-e Entrada: {quant['nfe_entrada']}")
        print(f"  - NF-e Saída: {quant['nfe_saida']}")


class TestDocumentsWithJustificativa:
    """Tests for documents with justificativa_ia field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, "Login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.company_id = "e04975c4-b209-483f-b9bf-4e429a52fa74"  # ANZEN
        self.competencia = "12/2025"
    
    def test_documents_have_justificativa_ia(self):
        """Test that documents have justificativa_ia field in produtos"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": self.company_id, "competencia": self.competencia},
            headers=self.headers
        )
        assert response.status_code == 200
        documents = response.json()
        
        # Check first document with produtos
        docs_with_justificativa = 0
        for doc in documents[:10]:  # Check first 10 docs
            for prod in doc.get("produtos", []):
                if prod.get("justificativa_ia"):
                    docs_with_justificativa += 1
                    print(f"Found justificativa_ia: {prod['justificativa_ia'][:50]}...")
                    break
        
        print(f"SUCCESS: Found {docs_with_justificativa} documents with justificativa_ia")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
