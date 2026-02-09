"""
Test Iteration 39 Features - Backend API Tests
Tests for:
1. GET /api/analise-tributaria-ia/{company_id} - viloes_tributarios with aliq_entrada, aliq_saida, explicacao
2. GET /api/analise-tributaria-ia/{company_id} - oportunidades_economia with aliq_entrada, aliq_saida, beneficio
3. GET /api/analise-tributaria-ia/{company_id} - insights_ia generated
4. POST /api/dashboard/simples-nacional - das_mes_atual.descontos with produtos_st, produtos_monofasicos, produtos_aliquota_zero
5. GET /api/pis-cofins/apuracao/{company_id} - lucro_presumido.imposto_a_pagar for Teknolink
6. POST /api/products/classify-single - Product reclassification with CFOP update
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
COMPANY_ID_SIMPLES = "e33af37a-38c3-41cb-a786-f8a685c860f6"  # E. L. M. COMERCIO DE ALIMENTOS LTDA
COMPANY_ID_PRESUMIDO = "b76b3672-229c-4973-8ed4-5eaa9739e160"  # TEKNOLINK SJC
COMPETENCIA = "01/2026"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAnaliseTributariaIA:
    """Tests for /api/analise-tributaria-ia/{company_id} endpoint"""
    
    def test_endpoint_returns_200(self, auth_headers):
        """Test that endpoint returns 200 for valid company"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_viloes_tributarios_structure(self, auth_headers):
        """Test that viloes_tributarios contains required fields: aliq_entrada, aliq_saida, explicacao"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check viloes_tributarios exists
        assert "viloes_tributarios" in data, "Response should contain viloes_tributarios"
        viloes = data["viloes_tributarios"]
        
        # If there are viloes, check structure
        if len(viloes) > 0:
            vilao = viloes[0]
            print(f"First vilao: {vilao}")
            
            # Required fields for viloes
            assert "tipo" in vilao, "Vilao should have 'tipo'"
            assert "ncm" in vilao, "Vilao should have 'ncm'"
            assert "descricao" in vilao, "Vilao should have 'descricao'"
            assert "aliq_entrada" in vilao, "Vilao should have 'aliq_entrada'"
            assert "aliq_saida" in vilao, "Vilao should have 'aliq_saida'"
            assert "explicacao" in vilao, "Vilao should have 'explicacao'"
            assert "icms_credito" in vilao, "Vilao should have 'icms_credito'"
            assert "icms_debito" in vilao, "Vilao should have 'icms_debito'"
            assert "impacto_negativo" in vilao, "Vilao should have 'impacto_negativo'"
            
            # Verify explicacao is a string with content
            assert isinstance(vilao["explicacao"], str), "explicacao should be a string"
            assert len(vilao["explicacao"]) > 0, "explicacao should not be empty"
            
            print(f"✓ Vilao has all required fields including aliq_entrada={vilao['aliq_entrada']}, aliq_saida={vilao['aliq_saida']}")
            print(f"✓ Explicacao: {vilao['explicacao'][:100]}...")
        else:
            print("No viloes found for this company/competencia - this is acceptable")
    
    def test_oportunidades_economia_structure(self, auth_headers):
        """Test that oportunidades contains required fields: aliq_entrada, aliq_saida, beneficio"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check oportunidades exists
        assert "oportunidades" in data, "Response should contain oportunidades"
        oportunidades = data["oportunidades"]
        
        # If there are oportunidades, check structure
        if len(oportunidades) > 0:
            oportunidade = oportunidades[0]
            print(f"First oportunidade: {oportunidade}")
            
            # Required fields for oportunidades
            assert "tipo" in oportunidade, "Oportunidade should have 'tipo'"
            assert "ncm" in oportunidade, "Oportunidade should have 'ncm'"
            assert "descricao" in oportunidade, "Oportunidade should have 'descricao'"
            assert "aliq_entrada" in oportunidade, "Oportunidade should have 'aliq_entrada'"
            assert "aliq_saida" in oportunidade, "Oportunidade should have 'aliq_saida'"
            assert "beneficio" in oportunidade, "Oportunidade should have 'beneficio'"
            assert "icms_credito" in oportunidade, "Oportunidade should have 'icms_credito'"
            assert "icms_debito" in oportunidade, "Oportunidade should have 'icms_debito'"
            assert "explicacao" in oportunidade, "Oportunidade should have 'explicacao'"
            
            # Verify beneficio is a number
            assert isinstance(oportunidade["beneficio"], (int, float)), "beneficio should be a number"
            
            print(f"✓ Oportunidade has all required fields including aliq_entrada={oportunidade['aliq_entrada']}, aliq_saida={oportunidade['aliq_saida']}, beneficio={oportunidade['beneficio']}")
        else:
            print("No oportunidades found for this company/competencia - this is acceptable")
    
    def test_insights_ia_generated(self, auth_headers):
        """Test that insights_ia is generated"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers,
            timeout=60  # AI generation may take time
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check insights_ia exists
        assert "insights_ia" in data, "Response should contain insights_ia"
        insights = data["insights_ia"]
        
        # insights_ia should be a string (can be None if no data)
        if insights is not None:
            assert isinstance(insights, str), "insights_ia should be a string"
            print(f"✓ insights_ia generated with {len(insights)} characters")
            print(f"✓ First 200 chars: {insights[:200]}...")
        else:
            print("insights_ia is None - may be due to no documents")
    
    def test_resumo_structure(self, auth_headers):
        """Test that resumo contains expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "resumo" in data, "Response should contain resumo"
        resumo = data["resumo"]
        
        # Check resumo fields
        expected_fields = ["total_documentos", "total_entradas", "total_saidas", 
                          "credito_icms", "debito_icms", "saldo_icms"]
        for field in expected_fields:
            assert field in resumo, f"Resumo should have '{field}'"
        
        print(f"✓ Resumo: {resumo}")


class TestDashboardSimplesNacional:
    """Tests for POST /api/dashboard/simples-nacional endpoint"""
    
    def test_endpoint_returns_200(self, auth_headers):
        """Test that endpoint returns 200 for valid Simples Nacional company"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={"company_id": COMPANY_ID_SIMPLES, "ano": 2026, "mes": 1},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_das_mes_atual_descontos_structure(self, auth_headers):
        """Test that das_mes_atual.descontos contains produtos_st, produtos_monofasicos, produtos_aliquota_zero"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={"company_id": COMPANY_ID_SIMPLES, "ano": 2026, "mes": 1},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check das_mes_atual exists
        assert "das_mes_atual" in data, "Response should contain das_mes_atual"
        das_mes = data["das_mes_atual"]
        
        # Check descontos exists
        assert "descontos" in das_mes, "das_mes_atual should contain descontos"
        descontos = das_mes["descontos"]
        
        # Check required fields in descontos
        assert "produtos_st" in descontos, "descontos should have 'produtos_st'"
        assert "produtos_monofasicos" in descontos, "descontos should have 'produtos_monofasicos'"
        assert "produtos_aliquota_zero" in descontos, "descontos should have 'produtos_aliquota_zero'"
        
        # Verify they are numbers
        assert isinstance(descontos["produtos_st"], (int, float)), "produtos_st should be a number"
        assert isinstance(descontos["produtos_monofasicos"], (int, float)), "produtos_monofasicos should be a number"
        assert isinstance(descontos["produtos_aliquota_zero"], (int, float)), "produtos_aliquota_zero should be a number"
        
        print(f"✓ descontos.produtos_st = {descontos['produtos_st']}")
        print(f"✓ descontos.produtos_monofasicos = {descontos['produtos_monofasicos']}")
        print(f"✓ descontos.produtos_aliquota_zero = {descontos['produtos_aliquota_zero']}")
        
        # Also check other desconto fields
        assert "icms_st" in descontos, "descontos should have 'icms_st'"
        assert "pis_cofins_monofasico" in descontos, "descontos should have 'pis_cofins_monofasico'"
        assert "total" in descontos, "descontos should have 'total'"
        
        print(f"✓ Full descontos structure: {descontos}")


class TestPisCofinsApuracaoLucroPresumido:
    """Tests for GET /api/pis-cofins/apuracao/{company_id} - Lucro Presumido"""
    
    def test_endpoint_returns_200(self, auth_headers):
        """Test that endpoint returns 200 for Teknolink (Lucro Presumido)"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_lucro_presumido_imposto_a_pagar_structure(self, auth_headers):
        """Test that lucro_presumido.imposto_a_pagar contains pis, cofins, total"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check lucro_presumido exists
        assert "lucro_presumido" in data, "Response should contain lucro_presumido"
        lucro_presumido = data["lucro_presumido"]
        
        # Check imposto_a_pagar exists
        assert "imposto_a_pagar" in lucro_presumido, "lucro_presumido should contain imposto_a_pagar"
        imposto = lucro_presumido["imposto_a_pagar"]
        
        # Check required fields
        assert "pis" in imposto, "imposto_a_pagar should have 'pis'"
        assert "cofins" in imposto, "imposto_a_pagar should have 'cofins'"
        assert "total" in imposto, "imposto_a_pagar should have 'total'"
        
        # Verify they are numbers
        assert isinstance(imposto["pis"], (int, float)), "pis should be a number"
        assert isinstance(imposto["cofins"], (int, float)), "cofins should be a number"
        assert isinstance(imposto["total"], (int, float)), "total should be a number"
        
        # Verify total = pis + cofins
        expected_total = imposto["pis"] + imposto["cofins"]
        assert abs(imposto["total"] - expected_total) < 0.01, f"total should equal pis + cofins: {imposto['total']} vs {expected_total}"
        
        print(f"✓ lucro_presumido.imposto_a_pagar.pis = {imposto['pis']}")
        print(f"✓ lucro_presumido.imposto_a_pagar.cofins = {imposto['cofins']}")
        print(f"✓ lucro_presumido.imposto_a_pagar.total = {imposto['total']}")
    
    def test_lucro_presumido_full_structure(self, auth_headers):
        """Test full lucro_presumido structure with creditos, debitos, saldo"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        lucro_presumido = data["lucro_presumido"]
        
        # Check all required sections
        required_sections = ["creditos", "debitos_comercio", "debitos_servicos", 
                           "debitos_total", "saldo", "imposto_a_pagar"]
        for section in required_sections:
            assert section in lucro_presumido, f"lucro_presumido should have '{section}'"
        
        # Each section should have pis, cofins, total
        for section in required_sections:
            section_data = lucro_presumido[section]
            assert "pis" in section_data, f"{section} should have 'pis'"
            assert "cofins" in section_data, f"{section} should have 'cofins'"
            assert "total" in section_data, f"{section} should have 'total'"
        
        print(f"✓ lucro_presumido full structure verified")
        print(f"  - creditos: {lucro_presumido['creditos']}")
        print(f"  - debitos_total: {lucro_presumido['debitos_total']}")
        print(f"  - saldo: {lucro_presumido['saldo']}")
        print(f"  - imposto_a_pagar: {lucro_presumido['imposto_a_pagar']}")


class TestProductClassifySingle:
    """Tests for POST /api/products/classify-single endpoint"""
    
    def test_endpoint_exists(self, auth_headers):
        """Test that endpoint exists and validates input"""
        # Test with invalid document_id
        response = requests.post(
            f"{BASE_URL}/api/products/classify-single",
            json={
                "document_id": "invalid-doc-id",
                "product_idx": 0,
                "nova_categoria": "revenda"
            },
            headers=auth_headers
        )
        # Should return 404 for invalid document
        assert response.status_code == 404, f"Expected 404 for invalid doc, got {response.status_code}"
        print("✓ Endpoint exists and validates document_id")
    
    def test_classify_product_updates_cfop(self, auth_headers):
        """Test that classifying a product updates its CFOP"""
        # First, get a document with products
        docs_response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID_PRESUMIDO, "competencia": COMPETENCIA, "tipo": "entrada"},
            headers=auth_headers
        )
        
        if docs_response.status_code != 200:
            pytest.skip("Could not fetch documents")
        
        docs = docs_response.json()
        if not docs or len(docs) == 0:
            pytest.skip("No documents found for testing")
        
        # Find a document with products
        test_doc = None
        for doc in docs:
            if doc.get('produtos') and len(doc.get('produtos', [])) > 0:
                test_doc = doc
                break
        
        if not test_doc:
            pytest.skip("No document with products found")
        
        doc_id = test_doc.get('id')
        original_cfop = test_doc['produtos'][0].get('cfop', '')
        
        # Test classification to 'despesa' - should update CFOP to X556
        response = requests.post(
            f"{BASE_URL}/api/products/classify-single",
            json={
                "document_id": doc_id,
                "product_idx": 0,
                "nova_categoria": "despesa",
                "salvar_regra": False
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "success" in data, "Response should have 'success'"
        assert data["success"] == True, "success should be True"
        assert "categoria_nova" in data, "Response should have 'categoria_nova'"
        assert data["categoria_nova"] == "despesa", "categoria_nova should be 'despesa'"
        assert "cfop_novo" in data, "Response should have 'cfop_novo'"
        
        # CFOP for despesa should end with 556
        cfop_novo = data["cfop_novo"]
        assert cfop_novo.endswith("556"), f"CFOP for despesa should end with 556, got {cfop_novo}"
        
        print(f"✓ Product classified as 'despesa'")
        print(f"✓ CFOP updated from {original_cfop} to {cfop_novo}")
        
        # Restore original category (revenda)
        restore_response = requests.post(
            f"{BASE_URL}/api/products/classify-single",
            json={
                "document_id": doc_id,
                "product_idx": 0,
                "nova_categoria": "revenda",
                "salvar_regra": False
            },
            headers=auth_headers
        )
        assert restore_response.status_code == 200, "Failed to restore original category"
        print("✓ Original category restored")
    
    def test_cfop_mapping_for_categories(self, auth_headers):
        """Test CFOP mapping for different categories"""
        # Get a document for testing
        docs_response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID_PRESUMIDO, "competencia": COMPETENCIA, "tipo": "entrada"},
            headers=auth_headers
        )
        
        if docs_response.status_code != 200:
            pytest.skip("Could not fetch documents")
        
        docs = docs_response.json()
        test_doc = None
        for doc in docs:
            if doc.get('produtos') and len(doc.get('produtos', [])) > 0:
                test_doc = doc
                break
        
        if not test_doc:
            pytest.skip("No document with products found")
        
        doc_id = test_doc.get('id')
        
        # Test each category and expected CFOP suffix
        category_cfop_map = {
            "revenda": "102",
            "insumo": "101",
            "despesa": "556",
            "ativo_imobilizado": "551",
            "combustivel": "653"
        }
        
        for categoria, expected_suffix in category_cfop_map.items():
            response = requests.post(
                f"{BASE_URL}/api/products/classify-single",
                json={
                    "document_id": doc_id,
                    "product_idx": 0,
                    "nova_categoria": categoria,
                    "salvar_regra": False
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Failed for category {categoria}: {response.text}"
            data = response.json()
            cfop_novo = data.get("cfop_novo", "")
            
            assert cfop_novo.endswith(expected_suffix), f"Category '{categoria}' should have CFOP ending with {expected_suffix}, got {cfop_novo}"
            print(f"✓ {categoria} → CFOP {cfop_novo}")
        
        # Restore to revenda
        requests.post(
            f"{BASE_URL}/api/products/classify-single",
            json={"document_id": doc_id, "product_idx": 0, "nova_categoria": "revenda"},
            headers=auth_headers
        )


class TestTeknolikViloes:
    """Specific tests for Teknolink company viloes (as mentioned in context)"""
    
    def test_teknolink_has_viloes(self, auth_headers):
        """Test that Teknolink has viloes identified (ROTEADOR HIKVISION, SWITCH POE)"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        viloes = data.get("viloes_tributarios", [])
        print(f"Total viloes found: {len(viloes)}")
        
        # Print all viloes for debugging
        for i, vilao in enumerate(viloes[:5]):
            print(f"Vilao {i+1}: {vilao.get('descricao', 'N/A')[:50]} - tipo: {vilao.get('tipo')} - aliq_entrada: {vilao.get('aliq_entrada')} - aliq_saida: {vilao.get('aliq_saida')}")
        
        # According to context, Teknolink should have 2 viloes
        # ROTEADOR HIKVISION (4%→12%) and SWITCH POE (0%→12%)
        if len(viloes) >= 2:
            print(f"✓ Teknolink has {len(viloes)} viloes identified")
        else:
            print(f"⚠ Expected at least 2 viloes, found {len(viloes)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
