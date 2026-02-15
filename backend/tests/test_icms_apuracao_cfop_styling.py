"""
Tests for ICMS Apuração - CFOP Styling and Top 10 Products/NCM
Bug fixes tested:
1. Top 10 Produtos/NCM não apareciam na versão agregada - FIXED
2. CFOPs de despesa/ST (1403, 1551, 1556) não marcados com desconsiderado - FIXED

Test company: test-company-icms-cfop (competencia 2026-01)
- desconsiderar_icms_despesas=True
- desconsiderar_icms_st=True
- 4 documentos de entrada (CFOPs 1403, 1551, 1556, 1102)
- 1 documento de saída (CFOP 5102)

Expected values:
- CFOP 1403 (ST) R$600 desconsiderado
- CFOP 1551 R$360 desconsiderado (despesa)
- CFOP 1556 R$240 desconsiderado (despesa)
- CFOP 1102 R$1200 crédito normal
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classificacao-beta.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "Business@2026"

# Test company and competencia
TEST_COMPANY_ID = "test-company-icms-cfop"
TEST_COMPETENCIA = "2026-01"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def api_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def icms_data(api_headers):
    """Fetch ICMS apuração data for test company"""
    response = requests.get(
        f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
        headers=api_headers
    )
    assert response.status_code == 200, f"Failed to fetch ICMS data: {response.text}"
    return response.json()


class TestICMSApuracaoEndpoint:
    """Test GET /api/apuracao-icms/{company_id}?competencia={competencia}"""
    
    def test_endpoint_returns_200(self, api_headers):
        """Test that the endpoint returns 200 status code"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
            headers=api_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "empresa" in data
        assert "entradas" in data
        assert "saidas" in data
        assert "top_10" in data
        assert "desconsiderados" in data
        print(f"✓ Endpoint returned 200 with complete response structure")
    
    def test_company_info_correct(self, icms_data):
        """Test that company info is correct"""
        empresa = icms_data.get("empresa", {})
        assert empresa.get("id") == TEST_COMPANY_ID
        assert empresa.get("razao_social") == "EMPRESA TESTE ICMS CFOP"
        print(f"✓ Company info verified: {empresa.get('razao_social')}")


class TestTop10ProdutosNCM:
    """Test that Top 10 Produtos and NCMs are returned with data"""
    
    def test_top_10_produtos_credito_exists(self, icms_data):
        """Test that top_10.produtos_credito exists and has data"""
        top_10 = icms_data.get("top_10", {})
        produtos_credito = top_10.get("produtos_credito", [])
        
        assert len(produtos_credito) > 0, "produtos_credito should have data"
        
        # Verify first product has expected fields
        first_product = produtos_credito[0]
        assert "descricao" in first_product
        assert "valor_icms" in first_product
        assert "qtd" in first_product
        
        # Verify product has valor_icms > 0
        assert first_product.get("valor_icms", 0) > 0
        
        print(f"✓ top_10.produtos_credito has {len(produtos_credito)} items")
        print(f"  First product: {first_product.get('descricao')} - R$ {first_product.get('valor_icms')}")
    
    def test_top_10_produtos_debito_exists(self, icms_data):
        """Test that top_10.produtos_debito exists and has data"""
        top_10 = icms_data.get("top_10", {})
        produtos_debito = top_10.get("produtos_debito", [])
        
        assert len(produtos_debito) > 0, "produtos_debito should have data"
        
        # Verify first product has expected fields
        first_product = produtos_debito[0]
        assert "descricao" in first_product
        assert "valor_icms" in first_product
        assert "qtd" in first_product
        
        # Verify product has valor_icms > 0
        assert first_product.get("valor_icms", 0) > 0
        
        print(f"✓ top_10.produtos_debito has {len(produtos_debito)} items")
        print(f"  First product: {first_product.get('descricao')} - R$ {first_product.get('valor_icms')}")
    
    def test_top_10_ncms_credito_exists(self, icms_data):
        """Test that top_10.ncms_credito exists and has data"""
        top_10 = icms_data.get("top_10", {})
        ncms_credito = top_10.get("ncms_credito", [])
        
        assert len(ncms_credito) > 0, "ncms_credito should have data"
        
        # Verify first NCM has expected fields
        first_ncm = ncms_credito[0]
        assert "ncm" in first_ncm
        assert "valor_icms" in first_ncm
        # Can have either 'qtd' or 'quantidade' field
        assert "qtd" in first_ncm or "quantidade" in first_ncm
        
        print(f"✓ top_10.ncms_credito has {len(ncms_credito)} items")
        print(f"  First NCM: {first_ncm.get('ncm')} - R$ {first_ncm.get('valor_icms')}")
    
    def test_top_10_ncms_debito_exists(self, icms_data):
        """Test that top_10.ncms_debito exists and has data"""
        top_10 = icms_data.get("top_10", {})
        ncms_debito = top_10.get("ncms_debito", [])
        
        assert len(ncms_debito) > 0, "ncms_debito should have data"
        
        # Verify first NCM has expected fields
        first_ncm = ncms_debito[0]
        assert "ncm" in first_ncm
        assert "valor_icms" in first_ncm
        
        print(f"✓ top_10.ncms_debito has {len(ncms_debito)} items")
        print(f"  First NCM: {first_ncm.get('ncm')} - R$ {first_ncm.get('valor_icms')}")


class TestCFOPStylingFields:
    """Test that CFOPs have 'desconsiderado', 'is_despesa', 'is_st' fields"""
    
    def test_entradas_cfop_has_styling_fields(self, icms_data):
        """Test that each entrada CFOP has the required styling fields"""
        entradas = icms_data.get("entradas", {}).get("por_cfop", [])
        
        assert len(entradas) > 0, "Should have entrada CFOPs"
        
        for cfop_item in entradas:
            cfop = cfop_item.get("cfop")
            assert "is_despesa" in cfop_item, f"CFOP {cfop} missing 'is_despesa' field"
            assert "is_st" in cfop_item, f"CFOP {cfop} missing 'is_st' field"
            assert "desconsiderado" in cfop_item, f"CFOP {cfop} missing 'desconsiderado' field"
            
            # Verify types are boolean
            assert isinstance(cfop_item.get("is_despesa"), bool), f"CFOP {cfop}: is_despesa should be boolean"
            assert isinstance(cfop_item.get("is_st"), bool), f"CFOP {cfop}: is_st should be boolean"
            assert isinstance(cfop_item.get("desconsiderado"), bool), f"CFOP {cfop}: desconsiderado should be boolean"
        
        print(f"✓ All {len(entradas)} entrada CFOPs have styling fields (is_despesa, is_st, desconsiderado)")


class TestCFOPDesconsideradoLogic:
    """Test the desconsiderado logic for specific CFOPs"""
    
    def _get_cfop_data(self, icms_data, cfop_code):
        """Helper to find CFOP data by code"""
        entradas = icms_data.get("entradas", {}).get("por_cfop", [])
        for item in entradas:
            if item.get("cfop") == cfop_code:
                return item
        return None
    
    def test_cfop_1403_is_st_and_desconsiderado(self, icms_data):
        """Test that CFOP 1403 (Compra ST) is marked as ST and desconsiderado=true"""
        cfop_1403 = self._get_cfop_data(icms_data, "1403")
        
        assert cfop_1403 is not None, "CFOP 1403 should exist in entradas"
        assert cfop_1403.get("is_st") == True, "CFOP 1403 should have is_st=true"
        assert cfop_1403.get("is_despesa") == False, "CFOP 1403 should have is_despesa=false"
        assert cfop_1403.get("desconsiderado") == True, "CFOP 1403 should be desconsiderado (ST flag active)"
        
        valor_icms = cfop_1403.get("valor_icms", 0)
        assert valor_icms == 600, f"CFOP 1403 should have valor_icms=600, got {valor_icms}"
        
        print(f"✓ CFOP 1403 (ST): is_st=True, desconsiderado=True, valor_icms=R$ {valor_icms}")
    
    def test_cfop_1551_is_despesa_and_desconsiderado(self, icms_data):
        """Test that CFOP 1551 (Compra Ativo Imobilizado) is marked as despesa and desconsiderado=true"""
        cfop_1551 = self._get_cfop_data(icms_data, "1551")
        
        assert cfop_1551 is not None, "CFOP 1551 should exist in entradas"
        assert cfop_1551.get("is_despesa") == True, "CFOP 1551 should have is_despesa=true"
        assert cfop_1551.get("is_st") == False, "CFOP 1551 should have is_st=false"
        assert cfop_1551.get("desconsiderado") == True, "CFOP 1551 should be desconsiderado (despesa flag active)"
        
        valor_icms = cfop_1551.get("valor_icms", 0)
        assert valor_icms == 360, f"CFOP 1551 should have valor_icms=360, got {valor_icms}"
        
        print(f"✓ CFOP 1551 (DESPESA): is_despesa=True, desconsiderado=True, valor_icms=R$ {valor_icms}")
    
    def test_cfop_1556_is_despesa_and_desconsiderado(self, icms_data):
        """Test that CFOP 1556 (Compra Uso/Consumo) is marked as despesa and desconsiderado=true"""
        cfop_1556 = self._get_cfop_data(icms_data, "1556")
        
        assert cfop_1556 is not None, "CFOP 1556 should exist in entradas"
        assert cfop_1556.get("is_despesa") == True, "CFOP 1556 should have is_despesa=true"
        assert cfop_1556.get("is_st") == False, "CFOP 1556 should have is_st=false"
        assert cfop_1556.get("desconsiderado") == True, "CFOP 1556 should be desconsiderado (despesa flag active)"
        
        valor_icms = cfop_1556.get("valor_icms", 0)
        assert valor_icms == 240, f"CFOP 1556 should have valor_icms=240, got {valor_icms}"
        
        print(f"✓ CFOP 1556 (DESPESA): is_despesa=True, desconsiderado=True, valor_icms=R$ {valor_icms}")
    
    def test_cfop_1102_is_normal_not_desconsiderado(self, icms_data):
        """Test that CFOP 1102 (Compra Normal) is NOT marked as despesa/ST and NOT desconsiderado"""
        cfop_1102 = self._get_cfop_data(icms_data, "1102")
        
        assert cfop_1102 is not None, "CFOP 1102 should exist in entradas"
        assert cfop_1102.get("is_despesa") == False, "CFOP 1102 should have is_despesa=false"
        assert cfop_1102.get("is_st") == False, "CFOP 1102 should have is_st=false"
        assert cfop_1102.get("desconsiderado") == False, "CFOP 1102 should NOT be desconsiderado"
        
        valor_icms = cfop_1102.get("valor_icms", 0)
        assert valor_icms == 1200, f"CFOP 1102 should have valor_icms=1200, got {valor_icms}"
        
        print(f"✓ CFOP 1102 (NORMAL): is_despesa=False, is_st=False, desconsiderado=False, valor_icms=R$ {valor_icms}")


class TestDesconsideradosValores:
    """Test the desconsiderados totals are calculated correctly"""
    
    def test_desconsiderados_despesas_valor_icms(self, icms_data):
        """Test that desconsiderados.despesas.valor_icms is correct (sum of 1551+1556)"""
        desconsiderados = icms_data.get("desconsiderados", {})
        despesas = desconsiderados.get("despesas", {})
        
        valor_icms = despesas.get("valor_icms", 0)
        expected_valor = 600  # 360 (1551) + 240 (1556)
        
        assert valor_icms == expected_valor, f"desconsiderados.despesas.valor_icms should be {expected_valor}, got {valor_icms}"
        
        qtd_itens = despesas.get("qtd_itens", 0)
        assert qtd_itens == 2, f"desconsiderados.despesas.qtd_itens should be 2, got {qtd_itens}"
        
        print(f"✓ desconsiderados.despesas: valor_icms=R$ {valor_icms}, qtd_itens={qtd_itens}")
    
    def test_desconsiderados_st_valor_icms(self, icms_data):
        """Test that desconsiderados.st.valor_icms is correct (from 1403)"""
        desconsiderados = icms_data.get("desconsiderados", {})
        st = desconsiderados.get("st", {})
        
        valor_icms = st.get("valor_icms", 0)
        expected_valor = 600  # from CFOP 1403
        
        assert valor_icms == expected_valor, f"desconsiderados.st.valor_icms should be {expected_valor}, got {valor_icms}"
        
        qtd_itens = st.get("qtd_itens", 0)
        assert qtd_itens == 1, f"desconsiderados.st.qtd_itens should be 1, got {qtd_itens}"
        
        print(f"✓ desconsiderados.st: valor_icms=R$ {valor_icms}, qtd_itens={qtd_itens}")
    
    def test_total_icms_desconsiderado(self, icms_data):
        """Test that total_icms_desconsiderado is the sum of despesas + st"""
        desconsiderados = icms_data.get("desconsiderados", {})
        
        total = desconsiderados.get("total_icms_desconsiderado", 0)
        expected_total = 1200  # 600 (despesas) + 600 (ST)
        
        assert total == expected_total, f"total_icms_desconsiderado should be {expected_total}, got {total}"
        
        print(f"✓ total_icms_desconsiderado: R$ {total}")


class TestApuracaoCalculation:
    """Test the final apuração calculation considering desconsiderados"""
    
    def test_credito_icms_only_normal_cfops(self, icms_data):
        """Test that credito_icms only includes normal CFOPs (1102)"""
        apuracao = icms_data.get("apuracao", {})
        
        credito_icms = apuracao.get("credito_icms", 0)
        expected_credito = 1200  # Only from CFOP 1102 (not 1403, 1551, 1556)
        
        assert credito_icms == expected_credito, f"credito_icms should be {expected_credito}, got {credito_icms}"
        
        print(f"✓ apuracao.credito_icms: R$ {credito_icms} (only normal CFOPs)")
    
    def test_debito_icms(self, icms_data):
        """Test that debito_icms is from saídas"""
        apuracao = icms_data.get("apuracao", {})
        
        debito_icms = apuracao.get("debito_icms", 0)
        expected_debito = 1800  # From CFOP 5102
        
        assert debito_icms == expected_debito, f"debito_icms should be {expected_debito}, got {debito_icms}"
        
        print(f"✓ apuracao.debito_icms: R$ {debito_icms}")
    
    def test_saldo_calculation(self, icms_data):
        """Test that saldo = debito - credito"""
        apuracao = icms_data.get("apuracao", {})
        
        saldo = apuracao.get("saldo", 0)
        expected_saldo = 600  # 1800 - 1200
        
        assert saldo == expected_saldo, f"saldo should be {expected_saldo}, got {saldo}"
        
        situacao = apuracao.get("situacao", "")
        assert situacao == "A_PAGAR", f"situacao should be A_PAGAR, got {situacao}"
        
        print(f"✓ apuracao.saldo: R$ {saldo}, situacao: {situacao}")


class TestFlagsConfiguration:
    """Test that flags configuration is returned correctly"""
    
    def test_flags_present_in_response(self, icms_data):
        """Test that flags object is present with correct values"""
        flags = icms_data.get("flags", {})
        
        assert "desconsiderar_icms_despesas" in flags
        assert "desconsiderar_icms_st" in flags
        assert "cfops_despesa" in flags
        assert "cfops_st" in flags
        
        assert flags.get("desconsiderar_icms_despesas") == True
        assert flags.get("desconsiderar_icms_st") == True
        
        print(f"✓ Flags: desconsiderar_icms_despesas=True, desconsiderar_icms_st=True")
    
    def test_cfops_lists_contain_expected_values(self, icms_data):
        """Test that CFOP lists contain the expected values"""
        flags = icms_data.get("flags", {})
        
        cfops_despesa = flags.get("cfops_despesa", [])
        cfops_st = flags.get("cfops_st", [])
        
        # Check that our test CFOPs are in the lists
        assert "1551" in cfops_despesa, "1551 should be in cfops_despesa"
        assert "1556" in cfops_despesa, "1556 should be in cfops_despesa"
        assert "1403" in cfops_st, "1403 should be in cfops_st"
        
        # Check 1102 is NOT in either list
        assert "1102" not in cfops_despesa, "1102 should NOT be in cfops_despesa"
        assert "1102" not in cfops_st, "1102 should NOT be in cfops_st"
        
        print(f"✓ CFOP lists configured correctly: despesa contains 1551, 1556; st contains 1403")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
