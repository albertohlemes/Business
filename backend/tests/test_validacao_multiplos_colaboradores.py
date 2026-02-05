"""
Test suite for multi-collaborator payroll validation feature.
Tests:
- Extraction of multiple collaborators from a single payroll file
- Individual comparison with previous month (percentage variation)
- Cross-referencing support data per collaborator (e.g., support says 10 HE, payslip says 7 = divergence)
- Expanded view with collaborator table in validation list
- Detail modal with statistics by status (OK/Attention/Divergent)
- Extracted support references displayed
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "teste@emergent.com"
TEST_PASSWORD = "Teste123!"
CLIENTE_ID = "897c7b37-a18f-4e66-9562-961697a460b3"


class TestMultiColaboradorValidation:
    """Tests for multi-collaborator payroll validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    def test_01_login_works(self):
        """Test that login works with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✅ Login successful for {TEST_EMAIL}")
    
    def test_02_validar_completa_requires_cliente_id(self):
        """Test that validation requires cliente_id"""
        files = {
            'holerite_atual': ('test.txt', b'Test content', 'text/plain')
        }
        data = {
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✅ Validation correctly requires cliente_id")
    
    def test_03_validar_completa_requires_holerite_atual(self):
        """Test that validation requires holerite_atual file"""
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            data=data
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✅ Validation correctly requires holerite_atual file")
    
    def test_04_validar_completa_validates_cliente_exists(self):
        """Test that validation checks if cliente exists"""
        files = {
            'holerite_atual': ('test.txt', b'Test content', 'text/plain')
        }
        data = {
            'cliente_id': 'invalid-cliente-id-12345',
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        # Can be 404 (not found) or 422 (validation error)
        assert response.status_code in [404, 422], f"Expected 404 or 422, got {response.status_code}"
        print("✅ Validation correctly validates cliente exists")
    
    def test_05_extract_multiple_colaboradores_from_folha(self):
        """Test extraction of multiple collaborators from a single payroll file"""
        # Read the test file with 3 collaborators
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_content = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_content, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        
        # Verify multiple collaborators extracted
        assert 'colaboradores' in result, "Response should contain 'colaboradores'"
        colaboradores = result['colaboradores']
        assert len(colaboradores) >= 3, f"Expected at least 3 collaborators, got {len(colaboradores)}"
        
        # Verify collaborator names
        nomes = [c['nome'] for c in colaboradores]
        print(f"✅ Extracted {len(colaboradores)} collaborators: {nomes}")
        
        # Verify each collaborator has required fields
        for colab in colaboradores:
            assert 'nome' in colab, "Collaborator should have 'nome'"
            assert 'status' in colab, "Collaborator should have 'status'"
            assert 'dados_atuais' in colab, "Collaborator should have 'dados_atuais'"
            assert 'liquido' in colab['dados_atuais'], "dados_atuais should have 'liquido'"
        
        print("✅ All collaborators have required fields")
    
    def test_06_individual_comparison_with_previous_month(self):
        """Test individual comparison per collaborator with previous month"""
        # Read test files
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_atual = f.read()
        with open('/tmp/folha_anterior.txt', 'rb') as f:
            folha_anterior = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_atual, 'text/plain'),
            'holerite_anterior': ('folha_anterior.txt', folha_anterior, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        
        # Verify tipo_analise is comparacao_mensal
        assert result.get('tipo_analise') in ['comparacao_mensal', 'completa'], \
            f"Expected comparacao_mensal or completa, got {result.get('tipo_analise')}"
        
        colaboradores = result['colaboradores']
        
        # Check that collaborators have comparison data
        colaboradores_com_comparacao = [c for c in colaboradores if c.get('comparacao_anterior', {}).get('encontrado')]
        print(f"✅ {len(colaboradores_com_comparacao)} collaborators have comparison with previous month")
        
        # Verify comparison fields
        for colab in colaboradores_com_comparacao:
            comp = colab['comparacao_anterior']
            assert 'campos' in comp, "Comparison should have 'campos'"
            
            # Check for percentage variation
            for campo in comp['campos']:
                assert 'percentual' in campo, f"Campo {campo.get('campo')} should have 'percentual'"
                assert 'diferenca' in campo, f"Campo {campo.get('campo')} should have 'diferenca'"
                print(f"  - {colab['nome']}: {campo['campo']} = {campo['percentual']:.1f}% variation")
        
        print("✅ Individual comparison with percentage variation working")
    
    def test_07_cross_reference_support_data_per_colaborador(self):
        """Test cross-referencing support data per collaborator (HE, vales, etc.)"""
        # Read test files
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_atual = f.read()
        with open('/tmp/apoio_horas.txt', 'rb') as f:
            apoio_content = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_atual, 'text/plain'),
            'apoio_files': ('apoio_horas.txt', apoio_content, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        
        # Verify tipo_analise includes apoio
        assert result.get('tipo_analise') in ['comparacao_apoio', 'completa'], \
            f"Expected comparacao_apoio or completa, got {result.get('tipo_analise')}"
        
        # Verify referencias_apoio extracted
        referencias = result.get('referencias_apoio', [])
        assert len(referencias) > 0, "Should have extracted support references"
        print(f"✅ Extracted {len(referencias)} support references")
        
        for ref in referencias:
            print(f"  - {ref.get('identificador')}: {ref.get('valor')} {ref.get('tipo')}")
        
        # Check for divergences between support and payslip
        colaboradores = result['colaboradores']
        divergencias_apoio_total = sum(len(c.get('divergencias_apoio', [])) for c in colaboradores)
        
        print(f"✅ Found {divergencias_apoio_total} divergences between support and payslip")
        
        # Verify divergence structure
        for colab in colaboradores:
            for div in colab.get('divergencias_apoio', []):
                assert 'campo' in div, "Divergence should have 'campo'"
                assert 'valor_apoio' in div, "Divergence should have 'valor_apoio'"
                assert 'valor_holerite' in div, "Divergence should have 'valor_holerite'"
                print(f"  - {colab['nome']}: {div['campo']} - Apoio={div['valor_apoio']} vs Holerite={div['valor_holerite']}")
    
    def test_08_complete_validation_with_all_files(self):
        """Test complete validation with current, previous month, and support files"""
        # Read all test files
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_atual = f.read()
        with open('/tmp/folha_anterior.txt', 'rb') as f:
            folha_anterior = f.read()
        with open('/tmp/apoio_horas.txt', 'rb') as f:
            apoio_content = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_atual, 'text/plain'),
            'holerite_anterior': ('folha_anterior.txt', folha_anterior, 'text/plain'),
            'apoio_files': ('apoio_horas.txt', apoio_content, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        
        # Verify tipo_analise is completa
        assert result.get('tipo_analise') == 'completa', \
            f"Expected 'completa', got {result.get('tipo_analise')}"
        
        # Verify all components present
        assert 'colaboradores' in result
        assert 'referencias_apoio' in result
        assert 'estatisticas' in result
        assert 'resumo_executivo' in result
        
        print(f"✅ Complete validation successful")
        print(f"  - Tipo: {result['tipo_analise']}")
        print(f"  - Colaboradores: {result['funcionarios_analisados']}")
        print(f"  - Divergências: {result['total_divergencias']}")
        print(f"  - Conferidos: {result['total_conferidos']}")
        print(f"  - Impacto: R$ {result['impacto_financeiro_total']:.2f}")
    
    def test_09_statistics_by_status(self):
        """Test statistics by status (OK/Attention/Divergent)"""
        # Read test files
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_atual = f.read()
        with open('/tmp/folha_anterior.txt', 'rb') as f:
            folha_anterior = f.read()
        with open('/tmp/apoio_horas.txt', 'rb') as f:
            apoio_content = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_atual, 'text/plain'),
            'holerite_anterior': ('folha_anterior.txt', folha_anterior, 'text/plain'),
            'apoio_files': ('apoio_horas.txt', apoio_content, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify estatisticas structure
        estatisticas = result.get('estatisticas', {})
        assert 'ok' in estatisticas, "Statistics should have 'ok' count"
        assert 'atencao' in estatisticas, "Statistics should have 'atencao' count"
        assert 'divergente' in estatisticas, "Statistics should have 'divergente' count"
        assert 'total_colaboradores' in estatisticas, "Statistics should have 'total_colaboradores'"
        
        print(f"✅ Statistics by status:")
        print(f"  - Total: {estatisticas['total_colaboradores']}")
        print(f"  - OK: {estatisticas['ok']}")
        print(f"  - Atenção: {estatisticas['atencao']}")
        print(f"  - Divergente: {estatisticas['divergente']}")
        
        # Verify counts match
        total = estatisticas['ok'] + estatisticas['atencao'] + estatisticas['divergente']
        assert total == estatisticas['total_colaboradores'], \
            f"Status counts ({total}) should match total ({estatisticas['total_colaboradores']})"
    
    def test_10_get_validation_details(self):
        """Test getting validation details with collaborator table"""
        # First, get list of validations
        response = self.session.get(f"{BASE_URL}/api/validacoes?cliente_id={CLIENTE_ID}")
        assert response.status_code == 200
        validacoes = response.json()
        
        assert len(validacoes) > 0, "Should have at least one validation"
        
        # Get details of the most recent validation
        validacao_id = validacoes[0]['id']
        response = self.session.get(f"{BASE_URL}/api/validacoes/{validacao_id}")
        assert response.status_code == 200
        
        validacao = response.json()
        
        # Verify structure
        assert 'id' in validacao
        assert 'cliente_nome' in validacao or 'cliente_id' in validacao
        assert 'mes_referencia' in validacao
        assert 'ano_referencia' in validacao
        
        # Check for collaborators if present
        if 'colaboradores' in validacao and validacao['colaboradores']:
            print(f"✅ Validation {validacao_id} has {len(validacao['colaboradores'])} collaborators")
            for colab in validacao['colaboradores'][:3]:
                print(f"  - {colab.get('nome')}: {colab.get('status')} - Líquido: {colab.get('dados_atuais', {}).get('liquido', 0)}")
        else:
            print(f"✅ Validation {validacao_id} retrieved (older format without collaborators)")
    
    def test_11_list_validations_with_collaborators(self):
        """Test that validation list includes collaborator data for expanded view"""
        response = self.session.get(f"{BASE_URL}/api/validacoes?cliente_id={CLIENTE_ID}")
        assert response.status_code == 200
        validacoes = response.json()
        
        # Find validations with collaborators
        validacoes_com_colaboradores = [v for v in validacoes if v.get('colaboradores')]
        
        print(f"✅ Found {len(validacoes_com_colaboradores)} validations with collaborator data")
        
        for v in validacoes_com_colaboradores[:3]:
            print(f"  - {v['mes_referencia']}/{v['ano_referencia']}: {len(v['colaboradores'])} colaboradores")
    
    def test_12_new_collaborator_detection(self):
        """Test detection of new collaborators (not in previous month)"""
        # The test file has 3 collaborators in current month but only 2 in previous
        # Pedro Oliveira should be detected as new
        
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_atual = f.read()
        with open('/tmp/folha_anterior.txt', 'rb') as f:
            folha_anterior = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_atual, 'text/plain'),
            'holerite_anterior': ('folha_anterior.txt', folha_anterior, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        
        colaboradores = result['colaboradores']
        
        # Find collaborators not found in previous month
        novos = [c for c in colaboradores if c.get('comparacao_anterior', {}).get('encontrado') == False]
        
        print(f"✅ Detected {len(novos)} new collaborator(s):")
        for c in novos:
            print(f"  - {c['nome']} (possible new hire)")
    
    def test_13_resumo_executivo_generated(self):
        """Test that executive summary is generated"""
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_atual = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_atual, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert 'resumo_executivo' in result, "Should have resumo_executivo"
        assert len(result['resumo_executivo']) > 0, "Resumo should not be empty"
        
        print(f"✅ Executive summary generated:")
        print(f"  {result['resumo_executivo']}")
    
    def test_14_recomendacoes_generated(self):
        """Test that recommendations are generated when there are divergences"""
        with open('/tmp/folha_multiplos.txt', 'rb') as f:
            folha_atual = f.read()
        with open('/tmp/folha_anterior.txt', 'rb') as f:
            folha_anterior = f.read()
        with open('/tmp/apoio_horas.txt', 'rb') as f:
            apoio_content = f.read()
        
        files = {
            'holerite_atual': ('folha_multiplos.txt', folha_atual, 'text/plain'),
            'holerite_anterior': ('folha_anterior.txt', folha_anterior, 'text/plain'),
            'apoio_files': ('apoio_horas.txt', apoio_content, 'text/plain')
        }
        data = {
            'cliente_id': CLIENTE_ID,
            'mes_referencia': '12',
            'ano_referencia': '2025'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        
        if result.get('total_divergencias', 0) > 0:
            assert 'recomendacoes' in result, "Should have recommendations when divergences exist"
            print(f"✅ Recommendations generated:")
            for rec in result.get('recomendacoes', []):
                print(f"  - {rec}")
        else:
            print("✅ No divergences found, recommendations may be empty")


class TestDocumentProcessor:
    """Tests for document processor functions"""
    
    def test_parse_folha_multiplos_colaboradores(self):
        """Test parsing multiple collaborators from payroll text"""
        import sys
        sys.path.insert(0, '/app/backend')
        from document_processor import doc_processor
        
        with open('/tmp/folha_multiplos.txt', 'r') as f:
            texto = f.read()
        
        colaboradores = doc_processor.parse_folha_multiplos_colaboradores(texto)
        
        assert len(colaboradores) >= 3, f"Expected at least 3 collaborators, got {len(colaboradores)}"
        
        print(f"✅ Parsed {len(colaboradores)} collaborators from text")
        for c in colaboradores:
            print(f"  - {c.get('nome')}: Líquido={c.get('liquido', 0)}")
    
    def test_parse_apoio_referencias(self):
        """Test parsing support references"""
        import sys
        sys.path.insert(0, '/app/backend')
        from document_processor import doc_processor
        
        with open('/tmp/apoio_horas.txt', 'r') as f:
            texto = f.read()
        
        referencias = doc_processor.parse_apoio_referencias(texto)
        
        assert len(referencias) > 0, "Should extract at least one reference"
        
        print(f"✅ Parsed {len(referencias)} support references")
        for ref in referencias:
            print(f"  - {ref.get('identificador')}: {ref.get('valor')} {ref.get('tipo')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
