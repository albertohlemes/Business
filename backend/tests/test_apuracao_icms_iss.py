"""
Test suite for Apuração ICMS, ISS, and PIS/COFINS endpoints
Tests the new restructured menu features:
1. Apuração ICMS - entradas/saídas por CFOP, Top 10 produtos/NCMs, saldo
2. Apuração ISS - serviços prestados, ISS devido, ISS retido, saldo a pagar
3. PIS/COFINS - top_10 and por_cfop_cst fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://easyfisc-1.preview.emergentagent.com')
COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"
COMPETENCIA = "01/2026"

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestApuracaoICMS:
    """Tests for /api/apuracao-icms/{company_id} endpoint"""
    
    def test_apuracao_icms_returns_200(self, auth_headers):
        """Test that endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_apuracao_icms_has_empresa_info(self, auth_headers):
        """Test that response includes empresa info"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "empresa" in data
        assert "razao_social" in data["empresa"]
        assert "cnpj" in data["empresa"]
        assert "uf" in data["empresa"]
    
    def test_apuracao_icms_has_entradas_por_cfop(self, auth_headers):
        """Test that response includes entradas grouped by CFOP"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "entradas" in data
        assert "por_cfop" in data["entradas"]
        assert "totais" in data["entradas"]
        
        # Check totais structure
        totais = data["entradas"]["totais"]
        assert "valor_total" in totais
        assert "bc_icms" in totais
        assert "valor_icms" in totais
        assert "qtd_documentos" in totais
        assert "qtd_itens" in totais
    
    def test_apuracao_icms_has_saidas_por_cfop(self, auth_headers):
        """Test that response includes saidas grouped by CFOP"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "saidas" in data
        assert "por_cfop" in data["saidas"]
        assert "totais" in data["saidas"]
    
    def test_apuracao_icms_has_top_10(self, auth_headers):
        """Test that response includes Top 10 rankings"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "top_10" in data
        assert "produtos_credito" in data["top_10"]
        assert "produtos_debito" in data["top_10"]
        assert "ncms_credito" in data["top_10"]
        assert "ncms_debito" in data["top_10"]
    
    def test_apuracao_icms_has_saldo(self, auth_headers):
        """Test that response includes apuracao with saldo"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "apuracao" in data
        assert "credito_icms" in data["apuracao"]
        assert "debito_icms" in data["apuracao"]
        assert "saldo" in data["apuracao"]
        assert "situacao" in data["apuracao"]
        assert data["apuracao"]["situacao"] in ["A_PAGAR", "A_RECUPERAR", "ZERADO"]
    
    def test_apuracao_icms_cfop_structure(self, auth_headers):
        """Test that CFOP items have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        
        # Check entradas CFOP structure
        if data["entradas"]["por_cfop"]:
            cfop_item = data["entradas"]["por_cfop"][0]
            assert "cfop" in cfop_item
            assert "valor_total" in cfop_item
            assert "bc_icms" in cfop_item
            assert "valor_icms" in cfop_item
            assert "qtd" in cfop_item
    
    def test_apuracao_icms_invalid_company_returns_404(self, auth_headers):
        """Test that invalid company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/invalid-company-id?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_apuracao_icms_without_auth_returns_401(self):
        """Test that request without auth returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}"
        )
        assert response.status_code in [401, 403]


class TestApuracaoISS:
    """Tests for /api/apuracao-iss/{company_id} endpoint"""
    
    def test_apuracao_iss_returns_200(self, auth_headers):
        """Test that endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_apuracao_iss_has_empresa_info(self, auth_headers):
        """Test that response includes empresa info"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "empresa" in data
        assert "razao_social" in data["empresa"]
        assert "cnpj" in data["empresa"]
    
    def test_apuracao_iss_has_resumo(self, auth_headers):
        """Test that response includes resumo with all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "resumo" in data
        
        resumo = data["resumo"]
        assert "valor_servicos" in resumo
        assert "base_calculo" in resumo
        assert "iss_devido" in resumo
        assert "iss_retido" in resumo
        assert "iss_a_pagar" in resumo
        assert "qtd_notas" in resumo
        assert "aliquota_media" in resumo
    
    def test_apuracao_iss_has_por_codigo_servico(self, auth_headers):
        """Test that response includes services grouped by code"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "por_codigo_servico" in data
        assert isinstance(data["por_codigo_servico"], list)
    
    def test_apuracao_iss_has_por_tomador(self, auth_headers):
        """Test that response includes services grouped by tomador"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "por_tomador" in data
        assert isinstance(data["por_tomador"], list)
    
    def test_apuracao_iss_has_situacao(self, auth_headers):
        """Test that response includes situacao field"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "situacao" in data
        assert data["situacao"] in ["A_PAGAR", "ZERADO", "COMPENSADO"]
    
    def test_apuracao_iss_iss_a_pagar_calculation(self, auth_headers):
        """Test that ISS a pagar is correctly calculated (devido - retido)"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        resumo = data["resumo"]
        
        # ISS a pagar should be max(0, devido - retido)
        expected = max(0, resumo["iss_devido"] - resumo["iss_retido"])
        assert resumo["iss_a_pagar"] == expected
    
    def test_apuracao_iss_invalid_company_returns_404(self, auth_headers):
        """Test that invalid company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/invalid-company-id?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_apuracao_iss_without_auth_returns_401(self):
        """Test that request without auth returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-iss/{COMPANY_ID}?competencia={COMPETENCIA}"
        )
        assert response.status_code in [401, 403]


class TestPisCofinsApuracao:
    """Tests for /api/pis-cofins/apuracao/{company_id} endpoint - new fields"""
    
    def test_pis_cofins_returns_200(self, auth_headers):
        """Test that endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_pis_cofins_has_top_10(self, auth_headers):
        """Test that response includes top_10 field"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "top_10" in data
        assert "produtos_credito" in data["top_10"]
        assert "produtos_debito" in data["top_10"]
        assert "ncms_credito" in data["top_10"]
        assert "ncms_debito" in data["top_10"]
    
    def test_pis_cofins_has_por_cfop_cst(self, auth_headers):
        """Test that response includes por_cfop_cst field"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "por_cfop_cst" in data
        assert isinstance(data["por_cfop_cst"], list)
    
    def test_pis_cofins_cfop_cst_structure(self, auth_headers):
        """Test that por_cfop_cst items have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        
        if data["por_cfop_cst"]:
            item = data["por_cfop_cst"][0]
            assert "cfop" in item
            assert "cst" in item
            assert "tipo" in item
            assert item["tipo"] in ["ENTRADA", "SAIDA"]
            assert "valor_base" in item
            assert "valor_pis" in item
            assert "valor_cofins" in item
            assert "qtd" in item
    
    def test_pis_cofins_top_10_produto_structure(self, auth_headers):
        """Test that top_10 produto items have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        
        # Check produtos_credito structure
        if data["top_10"]["produtos_credito"]:
            item = data["top_10"]["produtos_credito"][0]
            assert "descricao" in item
            assert "ncm" in item
            assert "valor_total" in item
            assert "qtd" in item
    
    def test_pis_cofins_top_10_ncm_structure(self, auth_headers):
        """Test that top_10 NCM items have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        
        # Check ncms_credito structure
        if data["top_10"]["ncms_credito"]:
            item = data["top_10"]["ncms_credito"][0]
            assert "ncm" in item
            assert "valor_total" in item
            assert "qtd" in item
            assert "produtos" in item
    
    def test_pis_cofins_has_both_regimes(self, auth_headers):
        """Test that response includes both lucro_real and lucro_presumido"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        assert "lucro_real" in data
        assert "lucro_presumido" in data
        assert "comparativo" in data
    
    def test_pis_cofins_invalid_company_returns_404(self, auth_headers):
        """Test that invalid company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/invalid-company-id?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestNavigationMenu:
    """Tests for navigation menu items"""
    
    def test_auth_login_works(self):
        """Test that login works with test credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
