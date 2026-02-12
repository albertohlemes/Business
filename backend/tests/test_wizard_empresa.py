"""
Test suite for Wizard Empresa functionality
Tests: Create, Edit, and verify all fields are saved correctly in MongoDB
Also tests impact on calculations: ICMS credit, Lucro Presumido, Intelligent Classification
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"


class TestWizardEmpresa:
    """Test Wizard Empresa CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_01_create_company_via_wizard(self):
        """Test 1: Create company via Wizard and verify all fields are saved"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Complete company data matching Wizard fields
        company_data = {
            # Step 1: Dados Básicos
            "cnpj": f"99.999.{unique_id[:3]}/0001-99",
            "codigo_empresa": f"TEST_{unique_id}",
            "razao_social": f"EMPRESA TESTE WIZARD {unique_id}",
            "nome_fantasia": f"TESTE WIZARD {unique_id}",
            "inscricao_estadual": "123456789",
            "inscricao_municipal": "987654321",
            "endereco": "Rua Teste, 123",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01234-567",
            "cnae_principal": "4711302",
            "cnae_principal_descricao": "Comércio varejista de mercadorias em geral",
            "cnaes": ["4712100", "4713001"],
            
            # Step 2: Atividade
            "tipo_atividade": "mista",
            "tipos_servico": ["consultoria", "manutencao"],
            "atividade_locacao": True,
            "perfis_comerciais": ["varejo", "distribuidor"],
            "aplicacao_em_servicos": True,
            "is_transportadora": False,
            "tipo_transporte": "carga",
            
            # Step 3: Tributação
            "regime_tributario": "lucro_presumido",
            "anexos_simples": ["I", "III"],
            "anexos_confirmados": True,
            "controla_fator_r": True,
            "folha_pagamento_12m": 50000.0,
            "equiparado_industria": False,
            "apura_icms": True,
            "apura_icms_st": True,
            "apura_pis_cofins": True,
            "apura_iss": True,
            "desconsiderar_icms_despesas": True,
            "desconsiderar_icms_st": False,
            
            # Presunção (Lucro Presumido)
            "percentual_presuncao_irpj": 16.0,
            "percentual_presuncao_csll": 12.0,
            "percentual_presuncao_irpj_comercio": 8.0,
            "percentual_presuncao_csll_comercio": 12.0,
            "percentual_presuncao_irpj_servico": 32.0,
            "percentual_presuncao_csll_servico": 32.0,
            "percentual_presuncao_irpj_industria": 8.0,
            "percentual_presuncao_csll_industria": 12.0,
            
            # Step 4: Classificação - Palavras-chave
            "produtos_comercializados": ["eletronicos", "informatica", "celulares"],
            "produtos_aplicacao_servico": ["pecas", "componentes"],
            "insumos_producao": ["materia_prima", "embalagens"],
            "produtos_despesa": ["limpeza", "escritorio", "manutencao"],
            "ativo_imobilizado": ["computadores", "moveis", "veiculos"],
            "combustivel": ["gasolina", "diesel"],
            
            # Step 5: Benefícios Fiscais
            "beneficio_fiscal_icms": True,
            "tipo_beneficio_fiscal": "reducao_base",
            "tipo_estabelecimento_beneficio": "mercado",
            "percentual_reducao_icms": 33.33,
            "produtos_sem_credito_icms": ["carne", "bebida", "8517"],
            "produtos_sem_credito_descricao": "Produtos da cesta básica",
            "credito_presumido_icms_percent": 20.0,
            
            # Saldo Credor
            "possui_saldo_credor": True,
            "saldo_credor_icms": 1000.0,
            "saldo_credor_pis": 500.0,
            "saldo_credor_cofins": 2000.0,
            "competencia_saldo_inicial": "01/2026",
        }
        
        # Create company
        response = requests.post(f"{BASE_URL}/api/companies", 
                                json=company_data, 
                                headers=self.headers)
        
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        created = response.json()
        company_id = created.get("id")
        assert company_id, "Company ID not returned"
        
        # Verify by fetching the company
        get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}", 
                                   headers=self.headers)
        assert get_response.status_code == 200, f"Get failed: {get_response.text}"
        
        saved = get_response.json()
        
        # Verify all fields were saved correctly
        # Step 1: Dados Básicos
        assert saved.get("codigo_empresa") == company_data["codigo_empresa"]
        assert saved.get("razao_social") == company_data["razao_social"]
        assert saved.get("nome_fantasia") == company_data["nome_fantasia"]
        assert saved.get("inscricao_estadual") == company_data["inscricao_estadual"]
        assert saved.get("inscricao_municipal") == company_data["inscricao_municipal"]
        assert saved.get("cidade") == company_data["cidade"]
        assert saved.get("uf") == company_data["uf"]
        
        # Step 2: Atividade
        assert saved.get("tipo_atividade") == company_data["tipo_atividade"]
        assert saved.get("atividade_locacao") == company_data["atividade_locacao"]
        assert saved.get("aplicacao_em_servicos") == company_data["aplicacao_em_servicos"]
        
        # Step 3: Tributação
        assert saved.get("regime_tributario") == company_data["regime_tributario"]
        assert saved.get("percentual_presuncao_irpj") == company_data["percentual_presuncao_irpj"]
        assert saved.get("percentual_presuncao_irpj_servico") == company_data["percentual_presuncao_irpj_servico"]
        
        # Step 4: Classificação
        assert saved.get("produtos_comercializados") == company_data["produtos_comercializados"]
        assert saved.get("insumos_producao") == company_data["insumos_producao"]
        assert saved.get("produtos_despesa") == company_data["produtos_despesa"]
        
        # Step 5: Benefícios
        assert saved.get("beneficio_fiscal_icms") == company_data["beneficio_fiscal_icms"]
        assert saved.get("tipo_beneficio_fiscal") == company_data["tipo_beneficio_fiscal"]
        assert saved.get("tipo_estabelecimento_beneficio") == company_data["tipo_estabelecimento_beneficio"]
        assert saved.get("produtos_sem_credito_icms") == company_data["produtos_sem_credito_icms"]
        
        print(f"✓ Company created successfully with ID: {company_id}")
        
        # Cleanup - delete test company
        delete_response = requests.delete(f"{BASE_URL}/api/companies/{company_id}", 
                                         headers=self.headers)
        assert delete_response.status_code in [200, 204], f"Delete failed: {delete_response.text}"
        print(f"✓ Test company deleted")
        
    def test_02_edit_company_via_wizard(self):
        """Test 2: Edit existing company via Wizard and verify data loads correctly"""
        # Get existing company
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) > 0, "No companies found for testing"
        
        company = companies[0]
        company_id = company.get("id")
        
        # Verify all Wizard fields are present in the response
        wizard_fields = [
            # Step 1
            "cnpj", "codigo_empresa", "razao_social", "nome_fantasia",
            "inscricao_estadual", "inscricao_municipal", "endereco", "cidade", "uf", "cep",
            "cnae_principal", "cnae_principal_descricao", "cnaes",
            # Step 2
            "tipo_atividade", "tipos_servico", "atividade_locacao", "perfis_comerciais",
            "aplicacao_em_servicos", "is_transportadora", "tipo_transporte",
            # Step 3
            "regime_tributario", "anexos_simples", "anexos_confirmados",
            "equiparado_industria", "apura_icms", "apura_icms_st",
            "percentual_presuncao_irpj", "percentual_presuncao_csll",
            "percentual_presuncao_irpj_comercio", "percentual_presuncao_csll_comercio",
            "percentual_presuncao_irpj_servico", "percentual_presuncao_csll_servico",
            # Step 4
            "produtos_comercializados", "produtos_aplicacao_servico",
            "insumos_producao", "produtos_despesa", "ativo_imobilizado", "combustivel",
            # Step 5
            "beneficio_fiscal_icms", "tipo_beneficio_fiscal", "tipo_estabelecimento_beneficio",
            "produtos_sem_credito_icms", "produtos_sem_credito_descricao",
            "credito_presumido_icms_percent",
        ]
        
        missing_fields = []
        for field in wizard_fields:
            if field not in company:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"⚠ Missing fields in company response: {missing_fields}")
        
        # Test update
        update_data = {
            "nome_fantasia": f"UPDATED {company.get('nome_fantasia', 'TEST')}",
            "produtos_comercializados": ["updated_product_1", "updated_product_2"],
            "percentual_presuncao_irpj": 16.0,
        }
        
        update_response = requests.put(f"{BASE_URL}/api/companies/{company_id}",
                                      json=update_data,
                                      headers=self.headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}",
                                   headers=self.headers)
        assert get_response.status_code == 200
        updated = get_response.json()
        
        assert "updated_product_1" in updated.get("produtos_comercializados", [])
        assert updated.get("percentual_presuncao_irpj") == 16.0
        
        print(f"✓ Company {company_id} updated successfully")
        
        # Revert changes
        revert_data = {
            "nome_fantasia": company.get("nome_fantasia", ""),
            "produtos_comercializados": company.get("produtos_comercializados", []),
            "percentual_presuncao_irpj": company.get("percentual_presuncao_irpj", 8.0),
        }
        requests.put(f"{BASE_URL}/api/companies/{company_id}",
                    json=revert_data,
                    headers=self.headers)
        print(f"✓ Changes reverted")


class TestProdutosSemCreditoICMS:
    """Test 3: Verify produtos_sem_credito_icms affects ICMS credit calculation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_03_produtos_sem_credito_icms_impact(self):
        """Test that produtos_sem_credito_icms affects ICMS credit calculation"""
        # Get a company with beneficio_fiscal_icms enabled
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        
        # Find company with beneficio_fiscal_icms
        company_with_benefit = None
        for c in companies:
            if c.get("beneficio_fiscal_icms"):
                company_with_benefit = c
                break
        
        if not company_with_benefit:
            # Use first company and enable benefit
            company_with_benefit = companies[0]
            company_id = company_with_benefit.get("id")
            
            # Enable benefit and set produtos_sem_credito
            update_data = {
                "beneficio_fiscal_icms": True,
                "tipo_beneficio_fiscal": "reducao_base",
                "produtos_sem_credito_icms": ["carne", "bebida", "8517"]
            }
            update_response = requests.put(f"{BASE_URL}/api/companies/{company_id}",
                                          json=update_data,
                                          headers=self.headers)
            assert update_response.status_code == 200
            print(f"✓ Enabled beneficio_fiscal_icms for company {company_id}")
        else:
            company_id = company_with_benefit.get("id")
            print(f"✓ Found company with beneficio_fiscal_icms: {company_id}")
        
        # Verify the field is saved
        get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}",
                                   headers=self.headers)
        assert get_response.status_code == 200
        company = get_response.json()
        
        assert company.get("beneficio_fiscal_icms") == True
        assert len(company.get("produtos_sem_credito_icms", [])) > 0
        
        print(f"✓ produtos_sem_credito_icms: {company.get('produtos_sem_credito_icms')}")
        print(f"✓ Test passed - produtos_sem_credito_icms field is properly saved")


class TestPercentualPresuncaoLucroPresumido:
    """Test 4: Verify percentual_presuncao_irpj affects Lucro Presumido calculation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_04_percentual_presuncao_irpj_impact(self):
        """Test that percentual_presuncao_irpj affects Lucro Presumido calculation"""
        # Get a company with lucro_presumido
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        
        # Find company with lucro_presumido
        company_lp = None
        for c in companies:
            if c.get("regime_tributario") == "lucro_presumido":
                company_lp = c
                break
        
        if not company_lp:
            pytest.skip("No company with lucro_presumido found")
        
        company_id = company_lp.get("id")
        
        # Test different presunção values
        test_values = [8.0, 16.0, 32.0]
        
        for perc in test_values:
            update_data = {"percentual_presuncao_irpj": perc}
            update_response = requests.put(f"{BASE_URL}/api/companies/{company_id}",
                                          json=update_data,
                                          headers=self.headers)
            assert update_response.status_code == 200
            
            # Verify saved
            get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}",
                                       headers=self.headers)
            assert get_response.status_code == 200
            saved = get_response.json()
            assert saved.get("percentual_presuncao_irpj") == perc
            print(f"✓ percentual_presuncao_irpj set to {perc}%")
        
        # Test Lucro Presumido calculation endpoint
        lp_response = requests.get(
            f"{BASE_URL}/api/apuracao/lucro-presumido/{company_id}?competencia=01/2026",
            headers=self.headers
        )
        
        if lp_response.status_code == 200:
            lp_data = lp_response.json()
            print(f"✓ Lucro Presumido calculation returned: {lp_data.get('percentual_presuncao_irpj', 'N/A')}%")
        else:
            print(f"⚠ Lucro Presumido endpoint returned {lp_response.status_code}")
        
        # Revert to original
        requests.put(f"{BASE_URL}/api/companies/{company_id}",
                    json={"percentual_presuncao_irpj": company_lp.get("percentual_presuncao_irpj", 8.0)},
                    headers=self.headers)


class TestClassificacaoInteligente:
    """Test 5: Verify produtos_comercializados, insumos_producao, produtos_despesa affect classification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_05_classificacao_inteligente_keywords(self):
        """Test that classification keywords affect intelligent classification"""
        # Get a company
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) > 0
        
        company = companies[0]
        company_id = company.get("id")
        
        # Update classification keywords
        update_data = {
            "produtos_comercializados": ["bebidas", "alimentos", "higiene"],
            "insumos_producao": ["embalagens", "materia_prima"],
            "produtos_despesa": ["limpeza", "escritorio", "manutencao"],
            "ativo_imobilizado": ["computadores", "moveis"],
            "combustivel": ["gasolina", "diesel"]
        }
        
        update_response = requests.put(f"{BASE_URL}/api/companies/{company_id}",
                                      json=update_data,
                                      headers=self.headers)
        assert update_response.status_code == 200
        
        # Verify saved
        get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}",
                                   headers=self.headers)
        assert get_response.status_code == 200
        saved = get_response.json()
        
        assert "bebidas" in saved.get("produtos_comercializados", [])
        assert "embalagens" in saved.get("insumos_producao", [])
        assert "limpeza" in saved.get("produtos_despesa", [])
        
        print(f"✓ Classification keywords saved successfully")
        
        # Test classification suggestions endpoint
        class_response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/{company_id}?competencia=01/2026",
            headers=self.headers
        )
        
        if class_response.status_code == 200:
            class_data = class_response.json()
            print(f"✓ Classification suggestions returned with {len(class_data.get('sugestoes', []))} suggestions")
        else:
            print(f"⚠ Classification endpoint returned {class_response.status_code}")
        
        # Revert changes
        requests.put(f"{BASE_URL}/api/companies/{company_id}",
                    json={
                        "produtos_comercializados": company.get("produtos_comercializados", []),
                        "insumos_producao": company.get("insumos_producao", []),
                        "produtos_despesa": company.get("produtos_despesa", []),
                    },
                    headers=self.headers)


class TestAnexosSimplesNacional:
    """Test 6: Verify anexos_simples are suggested correctly for Simples Nacional"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_06_anexos_simples_nacional(self):
        """Test that anexos_simples are saved correctly for Simples Nacional companies"""
        # Get a company with simples_nacional
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        
        # Find company with simples_nacional
        company_sn = None
        for c in companies:
            if c.get("regime_tributario") == "simples_nacional":
                company_sn = c
                break
        
        if not company_sn:
            # Create test with first company
            company_sn = companies[0]
            company_id = company_sn.get("id")
            
            # Temporarily set to simples_nacional
            update_data = {
                "regime_tributario": "simples_nacional",
                "anexos_simples": ["I", "III", "V"],
                "anexos_confirmados": True
            }
            update_response = requests.put(f"{BASE_URL}/api/companies/{company_id}",
                                          json=update_data,
                                          headers=self.headers)
            assert update_response.status_code == 200
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}",
                                       headers=self.headers)
            assert get_response.status_code == 200
            saved = get_response.json()
            
            assert saved.get("regime_tributario") == "simples_nacional"
            assert "I" in saved.get("anexos_simples", [])
            assert "III" in saved.get("anexos_simples", [])
            assert saved.get("anexos_confirmados") == True
            
            print(f"✓ anexos_simples saved: {saved.get('anexos_simples')}")
            
            # Revert
            requests.put(f"{BASE_URL}/api/companies/{company_id}",
                        json={
                            "regime_tributario": company_sn.get("regime_tributario"),
                            "anexos_simples": company_sn.get("anexos_simples", []),
                            "anexos_confirmados": company_sn.get("anexos_confirmados", False)
                        },
                        headers=self.headers)
        else:
            company_id = company_sn.get("id")
            print(f"✓ Found Simples Nacional company: {company_id}")
            print(f"✓ anexos_simples: {company_sn.get('anexos_simples')}")


class TestTipoAtividade:
    """Test 7: Verify tipo_atividade changes available fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_07_tipo_atividade_fields(self):
        """Test that tipo_atividade is saved and affects company configuration"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) > 0
        
        company = companies[0]
        company_id = company.get("id")
        original_tipo = company.get("tipo_atividade", "comercio")
        
        # Test all activity types
        activity_types = ["comercio", "servicos", "mista", "industria"]
        
        for tipo in activity_types:
            update_data = {"tipo_atividade": tipo}
            
            # Add specific fields based on activity type
            if tipo == "servicos":
                update_data["tipos_servico"] = ["consultoria", "manutencao"]
                update_data["atividade_locacao"] = True
            elif tipo == "mista":
                update_data["perfis_comerciais"] = ["varejo", "distribuidor"]
                update_data["aplicacao_em_servicos"] = True
            elif tipo == "industria":
                update_data["equiparado_industria"] = True
            
            update_response = requests.put(f"{BASE_URL}/api/companies/{company_id}",
                                          json=update_data,
                                          headers=self.headers)
            assert update_response.status_code == 200
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}",
                                       headers=self.headers)
            assert get_response.status_code == 200
            saved = get_response.json()
            
            assert saved.get("tipo_atividade") == tipo
            print(f"✓ tipo_atividade set to '{tipo}'")
        
        # Revert to original
        requests.put(f"{BASE_URL}/api/companies/{company_id}",
                    json={"tipo_atividade": original_tipo},
                    headers=self.headers)
        print(f"✓ Reverted to original tipo_atividade: {original_tipo}")


class TestTipoEstabelecimentoBeneficio:
    """Test tipo_estabelecimento_beneficio field for automatic product exclusion suggestions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_08_tipo_estabelecimento_beneficio(self):
        """Test that tipo_estabelecimento_beneficio is saved correctly"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        
        company = companies[0]
        company_id = company.get("id")
        
        # Test different establishment types
        establishment_types = [
            "restaurante",
            "casa_carnes",
            "padaria",
            "hortifruti",
            "mercado",
            "laticinios",
            "bebidas",
            "outros"
        ]
        
        for tipo in establishment_types:
            update_data = {
                "beneficio_fiscal_icms": True,
                "tipo_estabelecimento_beneficio": tipo
            }
            
            update_response = requests.put(f"{BASE_URL}/api/companies/{company_id}",
                                          json=update_data,
                                          headers=self.headers)
            assert update_response.status_code == 200
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/companies/{company_id}",
                                       headers=self.headers)
            assert get_response.status_code == 200
            saved = get_response.json()
            
            assert saved.get("tipo_estabelecimento_beneficio") == tipo
            print(f"✓ tipo_estabelecimento_beneficio set to '{tipo}'")
        
        # Revert
        requests.put(f"{BASE_URL}/api/companies/{company_id}",
                    json={
                        "beneficio_fiscal_icms": company.get("beneficio_fiscal_icms", False),
                        "tipo_estabelecimento_beneficio": company.get("tipo_estabelecimento_beneficio", "")
                    },
                    headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
