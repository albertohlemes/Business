"""
Test suite for PIS/COFINS Module
Tests the apuração, comparativo, and divergências endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPisCofinsModule:
    """Tests for PIS/COFINS calculation module endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token and company ID"""
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "123456"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get companies
        companies_response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=self.headers
        )
        assert companies_response.status_code == 200
        companies = companies_response.json()
        
        # Find COMERCIAL RS LTDA (has data in 01/2026)
        self.company_with_data = None
        self.company_without_data = None
        for company in companies:
            if company.get('razao_social') == 'COMERCIAL RS LTDA':
                self.company_with_data = company
            elif company.get('razao_social') == 'Empresa Teste LTDA':
                self.company_without_data = company
        
        assert self.company_with_data is not None, "Test company COMERCIAL RS LTDA not found"
    
    # ==================== APURAÇÃO ENDPOINT TESTS ====================
    
    def test_apuracao_endpoint_returns_200(self):
        """Test that apuração endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_apuracao_returns_both_regimes(self):
        """Test that apuração returns calculations for both lucro_real and lucro_presumido"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify both regimes are present
        assert "lucro_real" in data, "Missing lucro_real in response"
        assert "lucro_presumido" in data, "Missing lucro_presumido in response"
        
        # Verify structure of lucro_real
        lucro_real = data["lucro_real"]
        assert "creditos" in lucro_real
        assert "debitos_comercio" in lucro_real
        assert "debitos_servicos" in lucro_real
        assert "debitos_total" in lucro_real
        assert "saldo" in lucro_real
        assert "imposto_a_pagar" in lucro_real
        
        # Verify structure of lucro_presumido
        lucro_presumido = data["lucro_presumido"]
        assert "creditos" in lucro_presumido
        assert "debitos_comercio" in lucro_presumido
        assert "debitos_servicos" in lucro_presumido
        assert "debitos_total" in lucro_presumido
        assert "saldo" in lucro_presumido
        assert "imposto_a_pagar" in lucro_presumido
    
    def test_apuracao_returns_comparativo(self):
        """Test that apuração returns comparativo with regime_mais_economico"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify comparativo is present
        assert "comparativo" in data, "Missing comparativo in response"
        comparativo = data["comparativo"]
        
        # Verify comparativo structure
        assert "regime_mais_economico" in comparativo
        assert "economia" in comparativo
        
        # Verify regime_mais_economico is valid value
        assert comparativo["regime_mais_economico"] in ["LUCRO_REAL", "LUCRO_PRESUMIDO", "IGUAL"], \
            f"Invalid regime_mais_economico: {comparativo['regime_mais_economico']}"
    
    def test_apuracao_returns_empresa_info(self):
        """Test that apuração returns empresa information"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify empresa info
        assert "empresa" in data
        empresa = data["empresa"]
        assert "id" in empresa
        assert "razao_social" in empresa
        assert "cnpj" in empresa
        assert "regime_tributario" in empresa
    
    def test_apuracao_with_data_has_values(self):
        """Test that apuração with data returns non-zero values"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # With data in 01/2026, we should have some values
        lucro_real = data["lucro_real"]
        
        # At least one of these should be non-zero
        has_values = (
            lucro_real["creditos"]["total"] > 0 or
            lucro_real["debitos_total"]["total"] > 0
        )
        assert has_values, "Expected non-zero values for company with data"
    
    def test_apuracao_without_data_returns_zeros(self):
        """Test that apuração without data returns zero values"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "02/2026"},  # No data in this period
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Without data, all values should be zero
        lucro_real = data["lucro_real"]
        assert lucro_real["creditos"]["total"] == 0
        assert lucro_real["debitos_total"]["total"] == 0
        assert lucro_real["imposto_a_pagar"]["total"] == 0
    
    def test_apuracao_invalid_company_returns_404(self):
        """Test that apuração with invalid company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/invalid-company-id",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 404
    
    def test_apuracao_without_auth_returns_401(self):
        """Test that apuração without auth returns 401/403"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"}
        )
        assert response.status_code in [401, 403]
    
    # ==================== DIVERGÊNCIAS ENDPOINT TESTS ====================
    
    def test_divergencias_endpoint_returns_200(self):
        """Test that divergências endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_divergencias_returns_grouped_products(self):
        """Test that divergências returns products grouped by NCM/produto"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_produtos_divergentes" in data
        assert "resumo" in data
        assert "produtos" in data
        
        # Verify resumo structure
        resumo = data["resumo"]
        assert "total_divergencias" in resumo
        assert "recolhido_a_maior" in resumo
        assert "recolhido_a_menor" in resumo
        assert "saldo_reclassificacao" in resumo
    
    def test_divergencias_product_structure(self):
        """Test that each divergent product has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["total_produtos_divergentes"] > 0:
            produto = data["produtos"][0]
            
            # Verify product structure
            assert "ncm" in produto
            assert "produto" in produto
            assert "ocorrencias" in produto
            assert "valor_base_total" in produto
            assert "diferenca_pis_total" in produto
            assert "diferenca_cofins_total" in produto
            assert "diferenca_total" in produto
    
    def test_divergencias_without_data_returns_empty(self):
        """Test that divergências without data returns empty list"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/{self.company_with_data['id']}",
            params={"competencia": "02/2026"},  # No data in this period
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_produtos_divergentes"] == 0
        assert len(data["produtos"]) == 0
    
    def test_divergencias_invalid_company_returns_404(self):
        """Test that divergências with invalid company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/invalid-company-id",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 404
    
    # ==================== COMPARATIVO LOGIC TESTS ====================
    
    def test_comparativo_lucro_real_more_economical(self):
        """Test that comparativo correctly identifies lucro_real as more economical"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        comparativo = data["comparativo"]
        lucro_real = data["lucro_real"]["imposto_a_pagar"]["total"]
        lucro_presumido = data["lucro_presumido"]["imposto_a_pagar"]["total"]
        
        # Verify logic is correct
        if lucro_real < lucro_presumido:
            assert comparativo["regime_mais_economico"] == "LUCRO_REAL"
            assert comparativo["economia"] == pytest.approx(lucro_presumido - lucro_real, rel=0.01)
        elif lucro_presumido < lucro_real:
            assert comparativo["regime_mais_economico"] == "LUCRO_PRESUMIDO"
            assert comparativo["economia"] == pytest.approx(lucro_real - lucro_presumido, rel=0.01)
        else:
            assert comparativo["regime_mais_economico"] == "IGUAL"
            assert comparativo["economia"] == 0
    
    # ==================== CALCULATION STRUCTURE TESTS ====================
    
    def test_creditos_structure(self):
        """Test that creditos has pis, cofins, and total fields"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for regime in ["lucro_real", "lucro_presumido"]:
            creditos = data[regime]["creditos"]
            assert "pis" in creditos
            assert "cofins" in creditos
            assert "total" in creditos
            
            # Total should be sum of pis and cofins
            assert creditos["total"] == pytest.approx(creditos["pis"] + creditos["cofins"], rel=0.01)
    
    def test_debitos_structure(self):
        """Test that debitos has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for regime in ["lucro_real", "lucro_presumido"]:
            debitos_comercio = data[regime]["debitos_comercio"]
            debitos_servicos = data[regime]["debitos_servicos"]
            debitos_total = data[regime]["debitos_total"]
            
            # Each should have pis, cofins, total
            for debito in [debitos_comercio, debitos_servicos, debitos_total]:
                assert "pis" in debito
                assert "cofins" in debito
                assert "total" in debito
            
            # debitos_total should be sum of comercio and servicos
            assert debitos_total["pis"] == pytest.approx(
                debitos_comercio["pis"] + debitos_servicos["pis"], rel=0.01
            )
            assert debitos_total["cofins"] == pytest.approx(
                debitos_comercio["cofins"] + debitos_servicos["cofins"], rel=0.01
            )
    
    def test_imposto_a_pagar_non_negative(self):
        """Test that imposto_a_pagar is never negative"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{self.company_with_data['id']}",
            params={"competencia": "01/2026"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for regime in ["lucro_real", "lucro_presumido"]:
            imposto = data[regime]["imposto_a_pagar"]
            assert imposto["pis"] >= 0, f"PIS should be non-negative for {regime}"
            assert imposto["cofins"] >= 0, f"COFINS should be non-negative for {regime}"
            assert imposto["total"] >= 0, f"Total should be non-negative for {regime}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
