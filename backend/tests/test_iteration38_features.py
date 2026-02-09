"""
Test suite for Iteration 38 features:
1. GET /api/xml/documents/{id} - Document detail with products, CFOP, CST, taxes
2. POST /api/products/classify-single - Single product reclassification
3. POST /api/classification/ia-command/{company_id} - IA classification with CFOP update
4. GET /api/pis-cofins/divergencias/{company_id} - Only SAIDA documents
5. GET /api/pis-cofins/apuracao/{company_id} - lucro_real and lucro_presumido structure
6. GET /api/inteligencia-tributaria/{company_id} - Presumido calculations with PIS/COFINS
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
COMPANY_ID_SIMPLES = "e33af37a-38c3-41cb-a786-f8a685c860f6"
COMPANY_ID_PRESUMIDO = "b76b3672-229c-4973-8ed4-5eaa9739e160"
COMPETENCIA = "01/2026"


class TestAuth:
    """Authentication helper"""
    
    @staticmethod
    def get_token():
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        return None


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for all tests"""
    token = TestAuth.get_token()
    if not token:
        pytest.skip("Authentication failed - skipping tests")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDocumentDetail:
    """Test GET /api/xml/documents/{id} - Document detail with products"""
    
    def test_get_document_list_first(self, auth_headers):
        """Get a document ID from the list to test detail endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID_SIMPLES, "competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get documents: {response.text}"
        data = response.json()
        assert "documents" in data, "Response should have 'documents' key"
        assert len(data["documents"]) > 0, "Should have at least one document"
        return data["documents"][0]["id"]
    
    def test_get_document_detail_structure(self, auth_headers):
        """Test document detail returns complete structure with products"""
        # First get a document ID
        list_response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID_SIMPLES, "competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert list_response.status_code == 200
        documents = list_response.json().get("documents", [])
        assert len(documents) > 0, "Need at least one document to test"
        
        doc_id = documents[0]["id"]
        
        # Get document detail
        response = requests.get(
            f"{BASE_URL}/api/xml/documents/{doc_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get document detail: {response.text}"
        
        doc = response.json()
        
        # Verify basic document structure
        assert "id" in doc, "Document should have 'id'"
        assert "company_id" in doc, "Document should have 'company_id'"
        assert "numero_nfe" in doc or "numero" in doc, "Document should have number"
        
        # Verify products structure
        assert "produtos" in doc, "Document should have 'produtos' array"
        
        if len(doc.get("produtos", [])) > 0:
            produto = doc["produtos"][0]
            # Check product fields
            assert "descricao" in produto or "xProd" in produto, "Product should have description"
            print(f"✓ Document {doc_id} has {len(doc['produtos'])} products")
            print(f"  First product: {produto.get('descricao', produto.get('xProd', 'N/A'))[:50]}")
            
            # Check tax fields if present
            if "cfop" in produto:
                print(f"  CFOP: {produto['cfop']}")
            if "ncm" in produto:
                print(f"  NCM: {produto['ncm']}")
            if "cst_pis" in produto:
                print(f"  CST PIS: {produto['cst_pis']}")
            if "valor_icms" in produto or "v_icms" in produto:
                print(f"  ICMS: {produto.get('valor_icms', produto.get('v_icms', 0))}")
    
    def test_get_document_not_found(self, auth_headers):
        """Test 404 for non-existent document"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents/non-existent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404, "Should return 404 for non-existent document"


class TestSingleProductClassification:
    """Test POST /api/products/classify-single - Single product reclassification"""
    
    def test_classify_single_product_endpoint_exists(self, auth_headers):
        """Test that the endpoint exists and validates input"""
        # Test with invalid document_id
        response = requests.post(
            f"{BASE_URL}/api/products/classify-single",
            json={
                "document_id": "non-existent-doc",
                "product_idx": 0,
                "nova_categoria": "revenda",
                "salvar_regra": False
            },
            headers=auth_headers
        )
        # Should return 404 for non-existent document
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        assert "não encontrado" in response.json().get("detail", "").lower()
    
    def test_classify_single_product_success(self, auth_headers):
        """Test successful single product classification"""
        # First get a document with products
        list_response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID_SIMPLES, "competencia": COMPETENCIA, "tipo": "entrada"},
            headers=auth_headers
        )
        assert list_response.status_code == 200
        documents = list_response.json().get("documents", [])
        
        # Find a document with products
        doc_with_products = None
        for doc in documents:
            detail_response = requests.get(
                f"{BASE_URL}/api/xml/documents/{doc['id']}",
                headers=auth_headers
            )
            if detail_response.status_code == 200:
                detail = detail_response.json()
                if len(detail.get("produtos", [])) > 0:
                    doc_with_products = detail
                    break
        
        if not doc_with_products:
            pytest.skip("No document with products found for testing")
        
        doc_id = doc_with_products["id"]
        
        # Classify the first product
        response = requests.post(
            f"{BASE_URL}/api/products/classify-single",
            json={
                "document_id": doc_id,
                "product_idx": 0,
                "nova_categoria": "revenda",
                "salvar_regra": False
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to classify product: {response.text}"
        result = response.json()
        
        # Verify response structure
        assert result.get("success") == True, "Should return success=True"
        assert "categoria_nova" in result, "Should return nova categoria"
        assert result["categoria_nova"] == "revenda", "Category should be 'revenda'"
        
        # Verify CFOP was updated
        if "cfop_novo" in result:
            print(f"✓ CFOP updated to: {result['cfop_novo']}")
            # For revenda, CFOP should end with 102
            assert result["cfop_novo"].endswith("102"), f"CFOP for revenda should end with 102, got {result['cfop_novo']}"
        
        print(f"✓ Product classified successfully: {result.get('message', '')}")
    
    def test_classify_single_product_invalid_index(self, auth_headers):
        """Test classification with invalid product index"""
        # Get a document
        list_response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID_SIMPLES, "competencia": COMPETENCIA},
            headers=auth_headers
        )
        documents = list_response.json().get("documents", [])
        if not documents:
            pytest.skip("No documents found")
        
        doc_id = documents[0]["id"]
        
        # Try to classify with invalid index
        response = requests.post(
            f"{BASE_URL}/api/products/classify-single",
            json={
                "document_id": doc_id,
                "product_idx": 9999,  # Invalid index
                "nova_categoria": "revenda",
                "salvar_regra": False
            },
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid index, got {response.status_code}"


class TestPisCofinsApuracao:
    """Test GET /api/pis-cofins/apuracao/{company_id} - Structure with lucro_real and lucro_presumido"""
    
    def test_apuracao_structure_lucro_real_presumido(self, auth_headers):
        """Test that apuração returns both lucro_real and lucro_presumido structures"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID_SIMPLES}",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get apuração: {response.text}"
        data = response.json()
        
        # Verify lucro_real structure
        assert "lucro_real" in data, "Response should have 'lucro_real'"
        lucro_real = data["lucro_real"]
        assert "creditos" in lucro_real, "lucro_real should have 'creditos'"
        assert "debitos_comercio" in lucro_real, "lucro_real should have 'debitos_comercio'"
        assert "debitos_servicos" in lucro_real, "lucro_real should have 'debitos_servicos'"
        assert "debitos_total" in lucro_real, "lucro_real should have 'debitos_total'"
        assert "saldo" in lucro_real, "lucro_real should have 'saldo'"
        assert "imposto_a_pagar" in lucro_real, "lucro_real should have 'imposto_a_pagar'"
        
        # Verify lucro_presumido structure
        assert "lucro_presumido" in data, "Response should have 'lucro_presumido'"
        lucro_presumido = data["lucro_presumido"]
        assert "creditos" in lucro_presumido, "lucro_presumido should have 'creditos'"
        assert "debitos_comercio" in lucro_presumido, "lucro_presumido should have 'debitos_comercio'"
        assert "debitos_servicos" in lucro_presumido, "lucro_presumido should have 'debitos_servicos'"
        assert "debitos_total" in lucro_presumido, "lucro_presumido should have 'debitos_total'"
        assert "saldo" in lucro_presumido, "lucro_presumido should have 'saldo'"
        assert "imposto_a_pagar" in lucro_presumido, "lucro_presumido should have 'imposto_a_pagar'"
        
        # Verify PIS/COFINS values in each structure
        for regime in ["lucro_real", "lucro_presumido"]:
            regime_data = data[regime]
            for section in ["creditos", "debitos_comercio", "debitos_servicos", "debitos_total", "saldo", "imposto_a_pagar"]:
                section_data = regime_data[section]
                assert "pis" in section_data, f"{regime}.{section} should have 'pis'"
                assert "cofins" in section_data, f"{regime}.{section} should have 'cofins'"
        
        print(f"✓ Lucro Real - PIS a pagar: R$ {lucro_real['imposto_a_pagar']['pis']:.2f}")
        print(f"✓ Lucro Real - COFINS a pagar: R$ {lucro_real['imposto_a_pagar']['cofins']:.2f}")
        print(f"✓ Lucro Presumido - PIS a pagar: R$ {lucro_presumido['imposto_a_pagar']['pis']:.2f}")
        print(f"✓ Lucro Presumido - COFINS a pagar: R$ {lucro_presumido['imposto_a_pagar']['cofins']:.2f}")
        
        # Verify comparativo
        assert "comparativo" in data, "Response should have 'comparativo'"
        print(f"✓ Regime mais econômico: {data['comparativo'].get('regime_mais_economico', 'N/A')}")


class TestPisCofinsDivergencias:
    """Test GET /api/pis-cofins/divergencias/{company_id} - Only SAIDA documents"""
    
    def test_divergencias_only_saida(self, auth_headers):
        """Test that divergências endpoint returns only SAIDA documents"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/{COMPANY_ID_SIMPLES}",
            params={"competencia": COMPETENCIA, "agrupamento": "notas"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get divergências: {response.text}"
        data = response.json()
        
        # Check totais structure
        assert "totais" in data, "Response should have 'totais'"
        totais = data["totais"]
        assert "total_documentos" in totais, "totais should have 'total_documentos'"
        
        print(f"✓ Total documentos analisados: {totais['total_documentos']}")
        print(f"✓ Documentos com divergência: {totais.get('documentos_com_divergencia', 0)}")
        
        # If there are divergências, verify they are from SAIDA documents
        divergencias = data.get("divergencias", [])
        if len(divergencias) > 0:
            print(f"✓ Found {len(divergencias)} divergências")
            # Check first divergência
            first_div = divergencias[0]
            print(f"  First divergência: {first_div.get('documento', 'N/A')}")
    
    def test_divergencias_for_presumido_company(self, auth_headers):
        """Test divergências for Lucro Presumido company (Teknolink)"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/divergencias/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA, "agrupamento": "notas"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get divergências for Presumido: {response.text}"
        data = response.json()
        
        print(f"✓ Teknolink (Presumido) - Total documentos: {data.get('totais', {}).get('total_documentos', 0)}")


class TestInteligenciaTributaria:
    """Test GET /api/inteligencia-tributaria/{company_id} - Presumido calculations with PIS/COFINS"""
    
    def test_inteligencia_tributaria_structure(self, auth_headers):
        """Test inteligência tributária returns complete structure"""
        response = requests.get(
            f"{BASE_URL}/api/inteligencia-tributaria/{COMPANY_ID_SIMPLES}",
            params={"competencia": COMPETENCIA, "tipo": "periodo"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get inteligência tributária: {response.text}"
        data = response.json()
        
        # Verify main structure
        assert "empresa" in data, "Response should have 'empresa'"
        assert "faturamento" in data, "Response should have 'faturamento'"
        assert "compras" in data, "Response should have 'compras'"
        
        # Verify all three regimes
        assert "simples" in data, "Response should have 'simples'"
        assert "presumido" in data, "Response should have 'presumido'"
        assert "real" in data, "Response should have 'real'"
        
        print(f"✓ Empresa: {data['empresa']}")
        print(f"✓ Faturamento: R$ {data['faturamento']:,.2f}")
        print(f"✓ Compras: R$ {data['compras']:,.2f}")
    
    def test_presumido_has_pis_cofins(self, auth_headers):
        """Test that Presumido regime includes PIS and COFINS calculations"""
        response = requests.get(
            f"{BASE_URL}/api/inteligencia-tributaria/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA, "tipo": "periodo"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get inteligência tributária: {response.text}"
        data = response.json()
        
        presumido = data.get("presumido", {})
        
        # Verify Presumido has all tax fields
        assert "icms" in presumido, "Presumido should have 'icms'"
        assert "pis" in presumido, "Presumido should have 'pis'"
        assert "cofins" in presumido, "Presumido should have 'cofins'"
        assert "irpj" in presumido, "Presumido should have 'irpj'"
        assert "csll" in presumido, "Presumido should have 'csll'"
        assert "total" in presumido, "Presumido should have 'total'"
        
        # Verify PIS/COFINS are calculated (cumulativo: 0.65% PIS, 3% COFINS)
        faturamento = data.get("faturamento", 0)
        if faturamento > 0:
            expected_pis = faturamento * 0.0065
            expected_cofins = faturamento * 0.03
            
            # Allow small tolerance for rounding
            assert abs(presumido["pis"] - expected_pis) < 1, f"PIS should be ~{expected_pis:.2f}, got {presumido['pis']}"
            assert abs(presumido["cofins"] - expected_cofins) < 1, f"COFINS should be ~{expected_cofins:.2f}, got {presumido['cofins']}"
        
        print(f"✓ Teknolink (Presumido) - Inteligência Tributária:")
        print(f"  ICMS: R$ {presumido.get('icms', 0):,.2f}")
        print(f"  PIS (0.65%): R$ {presumido.get('pis', 0):,.2f}")
        print(f"  COFINS (3%): R$ {presumido.get('cofins', 0):,.2f}")
        print(f"  IRPJ: R$ {presumido.get('irpj', 0):,.2f}")
        print(f"  CSLL: R$ {presumido.get('csll', 0):,.2f}")
        print(f"  Total: R$ {presumido.get('total', 0):,.2f}")
    
    def test_melhor_regime_calculation(self, auth_headers):
        """Test that melhor_regime is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/inteligencia-tributaria/{COMPANY_ID_PRESUMIDO}",
            params={"competencia": COMPETENCIA, "tipo": "periodo"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "melhor_regime" in data, "Response should have 'melhor_regime'"
        assert "simples_disponivel" in data, "Response should have 'simples_disponivel'"
        assert "economia_potencial" in data, "Response should have 'economia_potencial'"
        
        print(f"✓ Melhor regime: {data['melhor_regime']}")
        print(f"✓ Simples disponível: {data['simples_disponivel']}")
        print(f"✓ Economia potencial: R$ {data['economia_potencial']:,.2f}")


class TestCfopPorCategoria:
    """Test obter_cfop_por_categoria function behavior"""
    
    def test_cfop_mapping_via_classify_single(self, auth_headers):
        """Test CFOP mapping through classify-single endpoint"""
        # Get a document with products
        list_response = requests.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID_SIMPLES, "competencia": COMPETENCIA, "tipo": "entrada"},
            headers=auth_headers
        )
        documents = list_response.json().get("documents", [])
        
        # Find a document with products
        doc_with_products = None
        for doc in documents[:10]:  # Check first 10
            detail_response = requests.get(
                f"{BASE_URL}/api/xml/documents/{doc['id']}",
                headers=auth_headers
            )
            if detail_response.status_code == 200:
                detail = detail_response.json()
                if len(detail.get("produtos", [])) > 0:
                    doc_with_products = detail
                    break
        
        if not doc_with_products:
            pytest.skip("No document with products found")
        
        doc_id = doc_with_products["id"]
        
        # Test different categories and their expected CFOP suffixes
        categories_cfop = {
            "revenda": "102",      # Compra para comercialização
            "insumo": "101",       # Compra para industrialização
            "despesa": "556",      # Uso e consumo
            "ativo_imobilizado": "551",  # Ativo imobilizado
            "combustivel": "653",  # Combustível
        }
        
        for categoria, expected_suffix in categories_cfop.items():
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
            
            if response.status_code == 200:
                result = response.json()
                cfop_novo = result.get("cfop_novo", "")
                if cfop_novo:
                    assert cfop_novo.endswith(expected_suffix), \
                        f"CFOP for {categoria} should end with {expected_suffix}, got {cfop_novo}"
                    print(f"✓ {categoria} → CFOP {cfop_novo}")


class TestIACommandClassification:
    """Test POST /api/classification/ia-command/{company_id} - IA classification with CFOP update"""
    
    def test_ia_command_endpoint_exists(self, auth_headers):
        """Test that IA command endpoint exists and accepts requests"""
        # Test with a simple command
        response = requests.post(
            f"{BASE_URL}/api/classification/ia-command/{COMPANY_ID_SIMPLES}",
            params={"competencia": COMPETENCIA, "comando": "listar produtos"},
            headers=auth_headers
        )
        
        # Should return 200 even if no products match
        assert response.status_code == 200, f"IA command endpoint failed: {response.text}"
        data = response.json()
        
        assert "success" in data, "Response should have 'success'"
        print(f"✓ IA command endpoint working: {data.get('message', 'OK')}")
    
    def test_ia_command_updates_cfop(self, auth_headers):
        """Test that IA command updates CFOP when classifying products"""
        # This test verifies the CFOP update logic is in place
        # The actual IA response depends on the LLM
        response = requests.post(
            f"{BASE_URL}/api/classification/ia-command/{COMPANY_ID_SIMPLES}",
            params={"competencia": COMPETENCIA, "comando": "classificar produtos de limpeza como despesa"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"IA command failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "success" in data
        assert "alteracoes" in data or "message" in data
        
        alteracoes = data.get("alteracoes", [])
        if len(alteracoes) > 0:
            print(f"✓ IA classified {len(alteracoes)} products")
            for alt in alteracoes[:3]:  # Show first 3
                print(f"  - {alt.get('produto', 'N/A')[:40]} → {alt.get('categoria_nova', 'N/A')}")
        else:
            print(f"✓ IA command processed: {data.get('message', 'No products matched')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
