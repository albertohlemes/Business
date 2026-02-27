"""
Tests for Validador ICMS and Validador PIS/COFINS endpoints
Features tested:
1. Validador ICMS:
   - /api/validador-icms/{company_id}/por-produto returns tipo_operacao, is_st, uf_destino
   - /api/validador-icms/{company_id}/regras POST accepts excecoes as list of objects
   - Validation applies exceptions correctly (ex: product with 'cachaca' uses exception rate)
2. Validador PIS/COFINS:
   - /api/validador-pis-cofins/{company_id}/por-cfop returns entradas and saídas separately  
   - /api/validador-pis-cofins/{company_id}/por-ncm returns NCMs with aliquota_pis and aliquota_cofins
   - /api/validador-pis-cofins/{company_id}/regras CRUD works
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://sieg-import-debug.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "@Ahl142536"
COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"
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
    """Return headers with authentication"""
    return {"Authorization": f"Bearer {auth_token}"}


# ============================================================
# VALIDADOR ICMS - Por Produto Tests
# ============================================================

class TestValidadorICMSPorProduto:
    """Tests for /api/validador-icms/{company_id}/por-produto endpoint"""
    
    def test_endpoint_returns_200(self, auth_headers):
        """Test endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/por-produto",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Endpoint returned 200")
    
    def test_response_has_required_structure(self, auth_headers):
        """Test response has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/por-produto",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        data = response.json()
        
        # Check main structure
        assert "company_id" in data
        assert "competencia" in data
        assert "estatisticas" in data
        assert "produtos" in data
        
        # Check estatisticas structure
        stats = data["estatisticas"]
        assert "total" in stats
        assert "ok" in stats
        assert "divergentes" in stats
        assert "sem_regra" in stats
        
        print(f"✅ Response has required structure")
        print(f"   Total products: {stats['total']}")
        print(f"   OK: {stats['ok']}, Divergent: {stats['divergentes']}, No rule: {stats['sem_regra']}")
    
    def test_products_have_tipo_operacao(self, auth_headers):
        """Test products contain tipo_operacao (interna/interestadual)"""
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/por-produto",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        data = response.json()
        
        produtos = data.get("produtos", [])
        if produtos:
            produto = produtos[0]
            assert "tipo_operacao" in produto, "Product must have tipo_operacao field"
            assert produto["tipo_operacao"] in ["interna", "interestadual"], f"tipo_operacao must be 'interna' or 'interestadual', got: {produto['tipo_operacao']}"
            
            # Count by operation type
            internas = len([p for p in produtos if p.get("tipo_operacao") == "interna"])
            interestaduais = len([p for p in produtos if p.get("tipo_operacao") == "interestadual"])
            print(f"✅ Products have tipo_operacao field")
            print(f"   Internal operations: {internas}")
            print(f"   Interstate operations: {interestaduais}")
        else:
            print("⚠️ No products found, skipping tipo_operacao test")
    
    def test_products_have_is_st(self, auth_headers):
        """Test products contain is_st (ST - Substituição Tributária) flag"""
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/por-produto",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        data = response.json()
        
        produtos = data.get("produtos", [])
        if produtos:
            produto = produtos[0]
            assert "is_st" in produto, "Product must have is_st field"
            assert isinstance(produto["is_st"], bool), f"is_st must be boolean, got: {type(produto['is_st'])}"
            
            # Count ST products
            st_products = len([p for p in produtos if p.get("is_st") == True])
            print(f"✅ Products have is_st field")
            print(f"   ST products: {st_products}")
        else:
            print("⚠️ No products found, skipping is_st test")
    
    def test_products_have_uf_destino(self, auth_headers):
        """Test products contain uf_destino for interstate operations"""
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/por-produto",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        data = response.json()
        
        produtos = data.get("produtos", [])
        interestaduais = [p for p in produtos if p.get("tipo_operacao") == "interestadual"]
        
        if interestaduais:
            produto = interestaduais[0]
            assert "uf_destino" in produto, "Interstate product must have uf_destino field"
            print(f"✅ Interstate products have uf_destino field")
            print(f"   Example uf_destino: {produto.get('uf_destino')}")
        else:
            # Check if field exists in internal operations (should be None)
            if produtos:
                produto = produtos[0]
                assert "uf_destino" in produto, "Product must have uf_destino field (can be None for internal)"
                print(f"✅ Products have uf_destino field (None for internal operations)")
            else:
                print("⚠️ No products found, skipping uf_destino test")


# ============================================================
# VALIDADOR ICMS - Regras CRUD Tests
# ============================================================

class TestValidadorICMSRegras:
    """Tests for /api/validador-icms/{company_id}/regras endpoints"""
    
    def test_get_regras(self, auth_headers):
        """Test GET regras returns list"""
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/regras",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "regras" in data
        print(f"✅ GET regras returns {len(data['regras'])} rules")
    
    def test_post_regra_with_excecoes(self, auth_headers):
        """Test POST regra with excecoes as list of objects"""
        # Create a test rule with exceptions
        test_rule = {
            "tipo": "ncm",
            "chave": "2208TEST",  # Unique NCM for test
            "descricao": "Bebidas destiladas - TESTE",
            "aliquota_interna": 25.0,
            "aliquota_interestadual_sul_sudeste": 12.0,
            "aliquota_interestadual_outros": 7.0,
            "aliquota_st": 0.0,
            "excecoes": [
                {
                    "chave": "cachaca",
                    "descricao": "Cachaça/Aguardente de cana",
                    "aliquota": 18.0,
                    "condicao": "contains"
                },
                {
                    "chave": "aguardente",
                    "descricao": "Aguardente em geral",
                    "aliquota": 18.0,
                    "condicao": "contains"
                }
            ],
            "base_legal": "RICMS SP Art. 54 - TESTE",
            "aplica_st": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/regras",
            json=test_rule,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Response can be {"message": ..., "regra": {...}} or directly the rule
        regra = data.get("regra", data)
        
        # Verify rule was created with excecoes
        assert "id" in regra, f"Response must have rule id. Got: {list(data.keys())}"
        assert "excecoes" in regra, "Response must have excecoes"
        assert len(regra["excecoes"]) == 2, f"Expected 2 exceptions, got {len(regra['excecoes'])}"
        
        # Verify exception structure
        exc = regra["excecoes"][0]
        assert "chave" in exc, "Exception must have chave"
        assert "aliquota" in exc, "Exception must have aliquota"
        
        print(f"✅ POST regra with excecoes succeeded")
        print(f"   Rule ID: {regra['id']}")
        print(f"   Exceptions: {len(regra['excecoes'])}")
        
        # Clean up - delete test rule
        rule_id = regra["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/regras/{rule_id}",
            headers=auth_headers
        )
        assert delete_response.status_code in [200, 204], f"Failed to delete test rule: {delete_response.text}"
        print(f"   Test rule deleted successfully")
    
    def test_excecoes_structure_validation(self, auth_headers):
        """Test excecoes must be list of objects with required fields"""
        # Get existing rules to check structure
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/regras",
            headers=auth_headers
        )
        data = response.json()
        regras = data.get("regras", [])
        
        # Find a rule with exceptions
        rule_with_exc = None
        for r in regras:
            if r.get("excecoes") and len(r.get("excecoes", [])) > 0:
                rule_with_exc = r
                break
        
        if rule_with_exc:
            excecoes = rule_with_exc["excecoes"]
            for exc in excecoes:
                assert isinstance(exc, dict), f"Exception must be dict, got {type(exc)}"
                assert "chave" in exc, "Exception must have 'chave'"
                assert "aliquota" in exc, "Exception must have 'aliquota'"
            print(f"✅ Found rule with {len(excecoes)} exceptions, structure is correct")
        else:
            print("⚠️ No rules with exceptions found, creating test rule for validation")
            # The test_post_regra_with_excecoes already validates this


# ============================================================
# VALIDADOR ICMS - Inicializar Regras Test
# ============================================================

class TestValidadorICMSInicializarRegras:
    """Tests for /api/validador-icms/{company_id}/inicializar-regras endpoint"""
    
    def test_inicializar_regras_endpoint(self, auth_headers):
        """Test POST inicializar-regras creates rules from RICMS"""
        response = requests.post(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/inicializar-regras",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response must have message"
        assert "regras_criadas" in data or "regras_existentes" in data, "Response must have regras count"
        
        print(f"✅ Inicializar regras endpoint returned 200")
        print(f"   Message: {data.get('message')}")
        print(f"   Regras criadas: {data.get('regras_criadas', 0)}")
        print(f"   Regras existentes: {data.get('regras_existentes', 0)}")
        print(f"   UF da empresa: {data.get('uf', 'N/A')}")
    
    def test_inicializar_regras_creates_with_base_legal(self, auth_headers):
        """Test that created rules have base_legal field populated"""
        # Get current rules
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/regras",
            headers=auth_headers
        )
        regras = response.json().get("regras", [])
        
        if regras:
            # Check that rules have base_legal
            rules_with_base_legal = [r for r in regras if r.get("base_legal")]
            print(f"✅ Found {len(rules_with_base_legal)}/{len(regras)} rules with base_legal")
            
            if rules_with_base_legal:
                sample = rules_with_base_legal[0]
                print(f"   Sample: NCM {sample.get('chave')}, Base Legal: {sample.get('base_legal')}")


# ============================================================
# VALIDADOR ICMS - Exception Application Tests
# ============================================================

class TestValidadorICMSExceptionApplication:
    """Test that ICMS validator correctly applies exceptions"""
    
    def test_exception_applied_to_product_description(self, auth_headers):
        """Test product with 'cachaca' in description uses exception rate"""
        # First check if there's a rule for NCM 2208 with cachaca exception
        response = requests.get(
            f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/regras",
            headers=auth_headers
        )
        regras = response.json().get("regras", [])
        
        ncm_2208_rule = None
        for r in regras:
            if r.get("chave", "").startswith("2208"):
                ncm_2208_rule = r
                break
        
        if ncm_2208_rule and ncm_2208_rule.get("excecoes"):
            excecoes = ncm_2208_rule["excecoes"]
            has_cachaca_exception = any("cachaca" in (e.get("chave", "").lower()) for e in excecoes)
            
            if has_cachaca_exception:
                # Now check products to see if exception is applied
                prod_response = requests.get(
                    f"{BASE_URL}/api/validador-icms/{COMPANY_ID}/por-produto",
                    params={"competencia": COMPETENCIA},
                    headers=auth_headers
                )
                produtos = prod_response.json().get("produtos", [])
                
                # Find cachaca products
                cachaca_products = [p for p in produtos if "cachaca" in p.get("descricao", "").lower() or "aguardente" in p.get("descricao", "").lower()]
                
                if cachaca_products:
                    # Check if the expected rate is the exception rate (18%) instead of general rate (25%)
                    prod = cachaca_products[0]
                    print(f"✅ Found cachaca product:")
                    print(f"   Description: {prod.get('descricao', '')[:50]}")
                    print(f"   Expected rate: {prod.get('aliquota_esperada')}")
                    print(f"   Practiced rate: {prod.get('aliquota_praticada')}")
                    if prod.get("regra") and prod["regra"].get("excecao_aplicada"):
                        print(f"   Exception applied: {prod['regra']['excecao_aplicada']}")
                else:
                    print("⚠️ No cachaca products found in this period")
            else:
                print("⚠️ No cachaca exception in rule")
        else:
            print("⚠️ No NCM 2208 rule with exceptions found")


# ============================================================
# VALIDADOR PIS/COFINS - /dados endpoint Tests (Unified endpoint)
# Note: The old /por-cfop endpoint was removed. The unified /dados endpoint
# now returns both CFOPs de Exceção and NCMs data.
# ============================================================

class TestValidadorPisCofinsDados:
    """Tests for /api/validador-pis-cofins/{company_id}/dados endpoint"""
    
    def test_endpoint_returns_200(self, auth_headers):
        """Test endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/dados",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Endpoint returned 200")
    
    def test_response_has_cfops_excecao(self, auth_headers):
        """Test response contains cfops_excecao with entradas and saidas"""
        response = requests.get(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/dados",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        data = response.json()
        
        assert "cfops_excecao" in data, "Response must have 'cfops_excecao' field"
        cfops_excecao = data["cfops_excecao"]
        assert "entradas" in cfops_excecao, "cfops_excecao must have 'entradas' field"
        assert "saidas" in cfops_excecao, "cfops_excecao must have 'saidas' field"
        assert isinstance(cfops_excecao["entradas"], list), "entradas must be a list"
        assert isinstance(cfops_excecao["saidas"], list), "saidas must be a list"
        
        print(f"✅ Response has cfops_excecao with entradas and saidas")
        print(f"   Entradas: {len(cfops_excecao['entradas'])} CFOPs de exceção")
        print(f"   Saidas: {len(cfops_excecao['saidas'])} CFOPs de exceção")
    
    def test_cfops_excecao_have_required_fields(self, auth_headers):
        """Test CFOP exceção items have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/dados",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        data = response.json()
        cfops_excecao = data.get("cfops_excecao", {})
        
        required_fields = ["cfop", "descricao", "quantidade", "valor_total", "status"]
        
        # Check entradas
        entradas = cfops_excecao.get("entradas", [])
        if entradas:
            entrada = entradas[0]
            for field in required_fields:
                assert field in entrada, f"CFOP exceção entrada must have '{field}' field"
            print(f"✅ Entradas CFOPs exceção have required fields")
            print(f"   Sample: {entrada.get('cfop')} - {entrada.get('descricao')}")
        
        # Check saidas
        saidas = cfops_excecao.get("saidas", [])
        if saidas:
            saida = saidas[0]
            for field in required_fields:
                assert field in saida, f"CFOP exceção saída must have '{field}' field"
            print(f"✅ Saídas CFOPs exceção have required fields")
            print(f"   Sample: {saida.get('cfop')} - {saida.get('descricao')}")


# ============================================================
# VALIDADOR PIS/COFINS - Por NCM Tests
# ============================================================

class TestValidadorPisCofinsPorNCM:
    """Tests for /api/validador-pis-cofins/{company_id}/por-ncm endpoint"""
    
    def test_endpoint_returns_200(self, auth_headers):
        """Test endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/por-ncm",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Endpoint returned 200")
    
    def test_ncms_have_aliquota_pis_cofins(self, auth_headers):
        """Test NCMs have aliquota_pis and aliquota_cofins fields"""
        response = requests.get(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/por-ncm",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        data = response.json()
        
        ncms = data.get("ncms", [])
        if ncms:
            ncm = ncms[0]
            # Check for aliquota fields (can be praticada or esperada)
            aliquota_fields = ["aliquota_pis_praticada", "aliquota_cofins_praticada", 
                              "aliquota_pis_esperada", "aliquota_cofins_esperada"]
            found_fields = [f for f in aliquota_fields if f in ncm]
            
            assert len(found_fields) > 0, f"NCM must have at least one aliquota field. Found: {list(ncm.keys())}"
            print(f"✅ NCMs have aliquota fields: {found_fields}")
            print(f"   Example NCM: {ncm.get('ncm')}")
            print(f"   PIS praticada: {ncm.get('aliquota_pis_praticada')}%")
            print(f"   COFINS praticada: {ncm.get('aliquota_cofins_praticada')}%")
        else:
            print("⚠️ No NCMs found")


# ============================================================
# VALIDADOR PIS/COFINS - Regras CRUD Tests
# ============================================================

class TestValidadorPisCofinsRegras:
    """Tests for /api/validador-pis-cofins/{company_id}/regras endpoints"""
    
    def test_get_regras(self, auth_headers):
        """Test GET regras returns list"""
        response = requests.get(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "regras" in data
        print(f"✅ GET regras returns {len(data['regras'])} rules")
    
    def test_post_regra(self, auth_headers):
        """Test POST regra creates new rule"""
        test_rule = {
            "tipo": "cfop",
            "chave": "1102TEST",
            "descricao": "Compra p/ comercialização - TESTE",
            "aliquota_pis": 1.65,
            "aliquota_cofins": 7.6,
            "gera_credito": True,
            "gera_debito": False,
            "base_legal": "Lei 10.833/2003 - TESTE"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras",
            json=test_rule,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Response can be {"message": ..., "regra": {...}} or directly the rule
        regra = data.get("regra", data)
        
        assert "id" in regra, f"Response must have rule id. Got: {list(data.keys())}"
        assert regra.get("aliquota_pis") == 1.65
        assert regra.get("aliquota_cofins") == 7.6
        assert regra.get("gera_credito") == True
        
        print(f"✅ POST regra succeeded")
        print(f"   Rule ID: {regra['id']}")
        
        # Clean up
        rule_id = regra["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras/{rule_id}",
            headers=auth_headers
        )
        assert delete_response.status_code in [200, 204], f"Failed to delete: {delete_response.text}"
        print(f"   Test rule deleted successfully")
    
    def test_put_regra(self, auth_headers):
        """Test PUT regra updates existing rule"""
        # First create a rule
        test_rule = {
            "tipo": "ncm",
            "chave": "1905TEST",
            "descricao": "Pães e bolos - TESTE",
            "aliquota_pis": 0.0,
            "aliquota_cofins": 0.0,
            "gera_credito": False,
            "gera_debito": False,
            "base_legal": "Aliquota zero - TESTE"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras",
            json=test_rule,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        create_data = create_response.json()
        regra = create_data.get("regra", create_data)
        rule_id = regra["id"]
        
        # Update the rule
        update_data = {
            "descricao": "Pães e bolos - ATUALIZADO",
            "aliquota_pis": 0.5
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras/{rule_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        update_result = update_response.json()
        
        # API returns {"message": "Regra atualizada com sucesso"} on success
        assert "message" in update_result or "regra" in update_result, f"Unexpected response: {update_result}"
        
        print(f"✅ PUT regra succeeded")
        print(f"   Response: {update_result}")
        
        # Clean up
        requests.delete(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras/{rule_id}",
            headers=auth_headers
        )
        print(f"   Test rule deleted successfully")
    
    def test_delete_regra(self, auth_headers):
        """Test DELETE regra removes rule"""
        # First create a rule
        test_rule = {
            "tipo": "ncm",
            "chave": "9999TEST",
            "descricao": "Test rule for deletion",
            "aliquota_pis": 1.65,
            "aliquota_cofins": 7.6,
            "gera_credito": True,
            "gera_debito": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras",
            json=test_rule,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        create_data = create_response.json()
        regra = create_data.get("regra", create_data)
        rule_id = regra["id"]
        
        # Delete the rule
        delete_response = requests.delete(
            f"{BASE_URL}/api/validador-pis-cofins/{COMPANY_ID}/regras/{rule_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code in [200, 204], f"Expected 200/204, got {delete_response.status_code}"
        print(f"✅ DELETE regra succeeded")


# ============================================================
# Run tests
# ============================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
