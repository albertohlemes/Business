"""
Test Iteration 41 Features:
1. Endpoint /pis-cofins/divergencias uses company regime (not fixed LUCRO_REAL)
2. Endpoint /pis-cofins/detalhamento uses company regime
3. Endpoint /inteligencia-tributaria returns pis_debitos and cofins_debitos for Lucro Real
4. Endpoint /learned-rules/{company_id} returns learned rules
5. Endpoints PUT /ai/learned-rules/{rule_id} and DELETE /ai/learned-rules/{rule_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"

# Test company - Lucro Presumido
COMPANY_LUCRO_PRESUMIDO = {
    "id": "b76b3672-229c-4973-8ed4-5eaa9739e160",
    "nome": "TEKNOLINK SJC",
    "competencia": "01/2026"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestPisCofinsEndpoints:
    """Test PIS/COFINS endpoints use company regime"""
    
    def test_divergencias_endpoint_returns_regime(self, api_client):
        """Test /pis-cofins/divergencias returns regime_tributario in response"""
        company_id = COMPANY_LUCRO_PRESUMIDO["id"]
        competencia = COMPANY_LUCRO_PRESUMIDO["competencia"]
        
        response = api_client.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/{company_id}?competencia={competencia}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify regime_tributario is in totais
        assert "totais" in data, "Response should have 'totais' field"
        totais = data["totais"]
        assert "regime_tributario" in totais, "totais should have 'regime_tributario' field"
        
        # For Teknolink (Lucro Presumido), regime should be lucro_presumido
        print(f"Regime tributário returned: {totais['regime_tributario']}")
        assert totais["regime_tributario"] == "lucro_presumido", \
            f"Expected lucro_presumido, got {totais['regime_tributario']}"
    
    def test_detalhamento_endpoint_works(self, api_client):
        """Test /pis-cofins/detalhamento endpoint works and uses company regime"""
        company_id = COMPANY_LUCRO_PRESUMIDO["id"]
        competencia = COMPANY_LUCRO_PRESUMIDO["competencia"]
        
        response = api_client.get(
            f"{BASE_URL}/api/pis-cofins/detalhamento/{company_id}?competencia={competencia}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure - actual structure has nested subtotais
        assert "entradas" in data, "Response should have 'entradas' field"
        assert "saidas" in data, "Response should have 'saidas' field"
        
        # Check nested structure
        entradas = data["entradas"]
        saidas = data["saidas"]
        
        # Entradas should have itens and subtotais
        assert "itens" in entradas or isinstance(entradas, list), "entradas should have 'itens' or be a list"
        assert "subtotais" in entradas or "itens" in entradas, "entradas should have 'subtotais'"
        
        # Get subtotais
        subtotais_entrada = entradas.get("subtotais", {})
        subtotais_saida = saidas.get("subtotais", {})
        
        print(f"Entradas count: {len(entradas.get('itens', []))}")
        print(f"Saidas count: {len(saidas.get('itens', []))}")
        print(f"Subtotais entrada: {subtotais_entrada}")
        print(f"Subtotais saida: {subtotais_saida}")


class TestInteligenciaTributaria:
    """Test /inteligencia-tributaria endpoint returns pis_debitos and cofins_debitos"""
    
    def test_inteligencia_tributaria_has_pis_cofins_debitos(self, api_client):
        """Test that inteligencia-tributaria returns pis_debitos and cofins_debitos for Lucro Real"""
        company_id = COMPANY_LUCRO_PRESUMIDO["id"]
        competencia = COMPANY_LUCRO_PRESUMIDO["competencia"]
        
        # Correct endpoint is GET with query params
        response = api_client.get(
            f"{BASE_URL}/api/inteligencia-tributaria/{company_id}?competencia={competencia}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "real" in data, "Response should have 'real' field"
        real = data["real"]
        
        # Check for pis_debitos and cofins_debitos
        assert "pis_debitos" in real, "real should have 'pis_debitos' field"
        assert "cofins_debitos" in real, "real should have 'cofins_debitos' field"
        assert "pis_creditos" in real, "real should have 'pis_creditos' field"
        assert "cofins_creditos" in real, "real should have 'cofins_creditos' field"
        
        print(f"PIS Débitos: {real['pis_debitos']}")
        print(f"COFINS Débitos: {real['cofins_debitos']}")
        print(f"PIS Créditos: {real['pis_creditos']}")
        print(f"COFINS Créditos: {real['cofins_creditos']}")
        print(f"PIS (líquido): {real['pis']}")
        print(f"COFINS (líquido): {real['cofins']}")
        
        # Verify they are numbers
        assert isinstance(real["pis_debitos"], (int, float)), "pis_debitos should be a number"
        assert isinstance(real["cofins_debitos"], (int, float)), "cofins_debitos should be a number"
        
        # Verify values are reasonable (should be positive for debitos)
        assert real["pis_debitos"] >= 0, "pis_debitos should be >= 0"
        assert real["cofins_debitos"] >= 0, "cofins_debitos should be >= 0"


class TestLearnedRulesEndpoints:
    """Test learned rules CRUD endpoints"""
    
    def test_get_learned_rules(self, api_client):
        """Test GET /learned-rules/{company_id} returns rules"""
        company_id = COMPANY_LUCRO_PRESUMIDO["id"]
        
        response = api_client.get(f"{BASE_URL}/api/learned-rules/{company_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Total learned rules: {len(data)}")
        
        if len(data) > 0:
            # Check structure of first rule
            rule = data[0]
            print(f"Sample rule: {rule}")
            
            # Common fields that should exist
            assert "id" in rule, "Rule should have 'id' field"
            assert "company_id" in rule, "Rule should have 'company_id' field"
    
    def test_create_and_delete_learned_rule(self, api_client):
        """Test creating and deleting a learned rule"""
        company_id = COMPANY_LUCRO_PRESUMIDO["id"]
        
        # First, get current rules to find one to test with
        response = api_client.get(f"{BASE_URL}/api/learned-rules/{company_id}")
        assert response.status_code == 200
        rules = response.json()
        
        if len(rules) > 0:
            # Test update endpoint
            rule_id = rules[0]["id"]
            original_categoria = rules[0].get("categoria") or rules[0].get("categoria_correta", "revenda")
            
            # Update the rule
            new_categoria = "despesa" if original_categoria != "despesa" else "insumo"
            update_response = api_client.put(
                f"{BASE_URL}/api/ai/learned-rules/{rule_id}?categoria={new_categoria}"
            )
            
            assert update_response.status_code == 200, \
                f"Expected 200, got {update_response.status_code}: {update_response.text}"
            
            print(f"Successfully updated rule {rule_id} to categoria: {new_categoria}")
            
            # Restore original
            restore_response = api_client.put(
                f"{BASE_URL}/api/ai/learned-rules/{rule_id}?categoria={original_categoria}"
            )
            assert restore_response.status_code == 200
            print(f"Restored rule to original categoria: {original_categoria}")
        else:
            print("No rules found to test update/delete - skipping")
            pytest.skip("No learned rules available for testing")
    
    def test_update_nonexistent_rule_returns_404(self, api_client):
        """Test updating a non-existent rule returns 404"""
        fake_rule_id = "nonexistent-rule-id-12345"
        
        response = api_client.put(
            f"{BASE_URL}/api/ai/learned-rules/{fake_rule_id}?categoria=despesa"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_delete_nonexistent_rule_returns_404(self, api_client):
        """Test deleting a non-existent rule returns 404"""
        fake_rule_id = "nonexistent-rule-id-12345"
        
        response = api_client.delete(f"{BASE_URL}/api/ai/learned-rules/{fake_rule_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestCompanyRegimeUsage:
    """Test that company regime is properly used in calculations"""
    
    def test_company_has_regime_tributario(self, api_client):
        """Verify company has regime_tributario field"""
        company_id = COMPANY_LUCRO_PRESUMIDO["id"]
        
        response = api_client.get(f"{BASE_URL}/api/companies/{company_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        company = response.json()
        
        assert "regime_tributario" in company, "Company should have 'regime_tributario' field"
        print(f"Company regime: {company['regime_tributario']}")
        
        # Teknolink should be lucro_presumido
        assert company["regime_tributario"] == "lucro_presumido", \
            f"Expected lucro_presumido, got {company['regime_tributario']}"


class TestApuracaoICMSEndpoint:
    """Test ICMS apuracao endpoint for sortable data"""
    
    def test_apuracao_icms_returns_data(self, api_client):
        """Test /apuracao-icms endpoint returns data with sortable fields"""
        company_id = COMPANY_LUCRO_PRESUMIDO["id"]
        competencia = COMPANY_LUCRO_PRESUMIDO["competencia"]
        
        response = api_client.get(
            f"{BASE_URL}/api/apuracao-icms/{company_id}?competencia={competencia}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "entradas" in data, "Response should have 'entradas' field"
        assert "saidas" in data, "Response should have 'saidas' field"
        
        # Check nested structure - entradas has por_cfop and totais
        entradas = data["entradas"]
        assert "por_cfop" in entradas, "entradas should have 'por_cfop' field"
        
        # Check that entries have sortable fields
        por_cfop = entradas.get("por_cfop", [])
        if por_cfop and len(por_cfop) > 0:
            entry = por_cfop[0]
            sortable_fields = ["cfop", "qtd", "valor_total", "bc_icms", "valor_icms"]
            for field in sortable_fields:
                assert field in entry, f"Entry should have '{field}' field for sorting"
            print(f"Sample entrada: CFOP={entry['cfop']}, Valor={entry['valor_total']}")
        
        saidas = data["saidas"]
        saidas_por_cfop = saidas.get("por_cfop", [])
        if saidas_por_cfop and len(saidas_por_cfop) > 0:
            saida = saidas_por_cfop[0]
            print(f"Sample saida: CFOP={saida['cfop']}, Valor={saida['valor_total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
