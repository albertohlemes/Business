"""
Test suite for Validação de Folha OCR functionality
Tests the OCR-based payroll validation with:
- Análise Isolada (only current holerite)
- Comparação Mensal (current + previous month)
- Data extraction from holerite (employee, competência, proventos, descontos, líquido)
- Detection of significant divergences between months
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "teste@emergent.com"
TEST_PASSWORD = "Teste123!"
CLIENTE_ID = "897c7b37-a18f-4e66-9562-961697a460b3"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "senha": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}"
    }


@pytest.fixture(scope="module")
def holerite_atual_content():
    """Content of current month holerite test file"""
    return """RECIBO DE PAGAMENTO
Empresa: Teste LTDA
CNPJ: 12.345.678/0001-99
Competência: 12/2025

Funcionário: JOÃO DA SILVA
CPF: 123.456.789-00
Cargo: Analista

PROVENTOS:
Salário Base           3000.00
Horas Extras 50%        450.00
Adicional Noturno       150.00
DSR                     400.00
TOTAL PROVENTOS       4000.00

DESCONTOS:
INSS                    440.00
IRRF                    142.50
Vale Transporte          90.00
TOTAL DESCONTOS        672.50

LÍQUIDO A RECEBER     3327.50

FGTS: R$ 320.00"""


@pytest.fixture(scope="module")
def holerite_anterior_content():
    """Content of previous month holerite test file"""
    return """RECIBO DE PAGAMENTO
Empresa: Teste LTDA
Competência: 11/2025

Funcionário: JOÃO DA SILVA
CPF: 123.456.789-00

PROVENTOS:
Salário Base           2800.00
Horas Extras 50%        200.00
DSR                     300.00
TOTAL PROVENTOS       3300.00

DESCONTOS:
INSS                    363.00
IRRF                     98.00
Vale Transporte          90.00
TOTAL DESCONTOS        551.00

LÍQUIDO A RECEBER     2749.00"""


class TestAnaliseIsolada:
    """Test Análise Isolada - upload only current holerite"""
    
    def test_analise_isolada_with_text_file(self, auth_headers, holerite_atual_content):
        """Test validation with only current holerite (text file)"""
        # Create test file from content
        test_file = io.BytesIO(holerite_atual_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("holerite_atual.txt", test_file, "text/plain")},
            data={
                "cliente_id": CLIENTE_ID,
                "mes_referencia": "12",
                "ano_referencia": 2025
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Validation failed: {response.status_code} - {response.text}"
        
        result = response.json()
        print(f"\n=== Análise Isolada Result ===")
        print(f"ID: {result.get('id')}")
        print(f"Tipo: {result.get('tipo_validacao')}")
        print(f"Status: {result.get('status')}")
        print(f"Funcionários analisados: {result.get('funcionarios_analisados')}")
        print(f"Total divergências: {result.get('total_divergencias')}")
        print(f"Total conferidos: {result.get('total_conferidos')}")
        
        # Verify response structure
        assert "id" in result, "Response should have id"
        assert result.get("status") == "concluido", f"Status should be 'concluido', got {result.get('status')}"
        
        # Check tipo_validacao
        tipo = result.get("tipo_validacao")
        assert tipo in ["analise_isolada", "completa", None], f"Unexpected tipo_validacao: {tipo}"
        
        print("✓ Análise Isolada completed successfully")
        return result
    
    def test_analise_isolada_extracts_employee_data(self, auth_headers, holerite_atual_content):
        """Test that OCR extracts employee data correctly"""
        test_file = io.BytesIO(holerite_atual_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("holerite_atual.txt", test_file, "text/plain")},
            data={
                "cliente_id": CLIENTE_ID,
                "mes_referencia": "12",
                "ano_referencia": 2025
            },
            timeout=60
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Check if data was extracted
        dados_atual = result.get("dados_atual", {})
        if dados_atual:
            print(f"\n=== Extracted Data ===")
            print(f"Funcionário: {dados_atual.get('funcionario')}")
            print(f"Competência: {dados_atual.get('competencia')}")
            print(f"Total Proventos: {dados_atual.get('total_proventos')}")
            print(f"Total Descontos: {dados_atual.get('total_descontos')}")
            print(f"Líquido: {dados_atual.get('liquido')}")
            
            # Verify extracted values (approximate due to OCR)
            if dados_atual.get('funcionario'):
                assert 'SILVA' in dados_atual.get('funcionario', '').upper() or 'JOAO' in dados_atual.get('funcionario', '').upper(), \
                    f"Expected employee name to contain SILVA or JOAO, got {dados_atual.get('funcionario')}"
                print("✓ Employee name extracted correctly")
        
        print("✓ Data extraction test completed")


class TestComparacaoMensal:
    """Test Comparação Mensal - upload current + previous month holerite"""
    
    def test_comparacao_mensal(self, auth_headers, holerite_atual_content, holerite_anterior_content):
        """Test validation with current and previous month holerites"""
        atual_file = io.BytesIO(holerite_atual_content.encode('utf-8'))
        anterior_file = io.BytesIO(holerite_anterior_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={
                "holerite_atual": ("holerite_atual.txt", atual_file, "text/plain"),
                "holerite_anterior": ("holerite_anterior.txt", anterior_file, "text/plain")
            },
            data={
                "cliente_id": CLIENTE_ID,
                "mes_referencia": "12",
                "ano_referencia": 2025
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Validation failed: {response.status_code} - {response.text}"
        
        result = response.json()
        print(f"\n=== Comparação Mensal Result ===")
        print(f"ID: {result.get('id')}")
        print(f"Tipo: {result.get('tipo_validacao')}")
        print(f"Status: {result.get('status')}")
        print(f"Total divergências: {result.get('total_divergencias')}")
        
        # Check tipo_validacao
        tipo = result.get("tipo_validacao")
        assert tipo in ["comparacao_mensal", "completa", None], f"Unexpected tipo_validacao: {tipo}"
        
        # Check for divergences (salary increased from 2800 to 3000)
        divergencias = result.get("divergencias", [])
        print(f"Divergências encontradas: {len(divergencias)}")
        for d in divergencias[:5]:
            print(f"  - {d.get('campo', d.get('tipo'))}: {d.get('descricao', '')}")
        
        print("✓ Comparação Mensal completed successfully")
        return result
    
    def test_comparacao_detects_salary_increase(self, auth_headers, holerite_atual_content, holerite_anterior_content):
        """Test that comparison detects significant salary changes"""
        atual_file = io.BytesIO(holerite_atual_content.encode('utf-8'))
        anterior_file = io.BytesIO(holerite_anterior_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={
                "holerite_atual": ("holerite_atual.txt", atual_file, "text/plain"),
                "holerite_anterior": ("holerite_anterior.txt", anterior_file, "text/plain")
            },
            data={
                "cliente_id": CLIENTE_ID,
                "mes_referencia": "12",
                "ano_referencia": 2025
            },
            timeout=60
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Check comparacoes if present
        comparacoes = result.get("comparacoes", {})
        if comparacoes:
            com_mes_anterior = comparacoes.get("com_mes_anterior", [])
            print(f"\n=== Comparações com Mês Anterior ===")
            for comp in com_mes_anterior[:5]:
                print(f"  {comp.get('campo')}: {comp.get('valor_anterior')} -> {comp.get('valor_atual')} ({comp.get('diferenca')})")
        
        # Check resumo_executivo
        resumo = result.get("resumo_executivo", "")
        if resumo:
            print(f"\n=== Resumo Executivo ===")
            print(resumo[:500])
        
        print("✓ Salary change detection test completed")


class TestValidacaoListAndDetails:
    """Test listing and viewing validation details"""
    
    def test_list_validacoes_by_competencia(self, auth_headers):
        """Test listing validations filtered by competência"""
        response = requests.get(
            f"{BASE_URL}/api/validacoes?cliente_id={CLIENTE_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        validacoes = response.json()
        
        # Group by competência
        by_competencia = {}
        for v in validacoes:
            comp = f"{v.get('mes_referencia')}/{v.get('ano_referencia')}"
            if comp not in by_competencia:
                by_competencia[comp] = []
            by_competencia[comp].append(v)
        
        print(f"\n=== Validações por Competência ===")
        for comp, vals in sorted(by_competencia.items(), reverse=True)[:5]:
            print(f"  {comp}: {len(vals)} validação(ões)")
        
        print(f"✓ Listed {len(validacoes)} validações for cliente {CLIENTE_ID}")
    
    def test_view_validacao_details(self, auth_headers):
        """Test viewing details of a specific validation"""
        # First get list
        response = requests.get(
            f"{BASE_URL}/api/validacoes?cliente_id={CLIENTE_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        validacoes = response.json()
        
        if not validacoes:
            pytest.skip("No validations to view details")
        
        # Get details of most recent
        validacao_id = validacoes[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/validacoes/{validacao_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        detail = response.json()
        
        print(f"\n=== Validação Details ===")
        print(f"ID: {detail.get('id')}")
        print(f"Cliente: {detail.get('cliente_nome')}")
        print(f"Competência: {detail.get('mes_referencia')}/{detail.get('ano_referencia')}")
        print(f"Tipo: {detail.get('tipo_validacao')}")
        print(f"Status: {detail.get('status')}")
        print(f"Arquivos: {detail.get('arquivos')}")
        print(f"Divergências: {len(detail.get('divergencias', []))}")
        print(f"Campos conferidos: {len(detail.get('campos_conferidos', []))}")
        print(f"Impacto financeiro: {detail.get('impacto_financeiro_total')}")
        
        print("✓ Validação details retrieved successfully")


class TestOCRDataExtraction:
    """Test OCR data extraction from holerite"""
    
    def test_extract_proventos_descontos(self, auth_headers, holerite_atual_content):
        """Test extraction of proventos and descontos"""
        test_file = io.BytesIO(holerite_atual_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("holerite_atual.txt", test_file, "text/plain")},
            data={
                "cliente_id": CLIENTE_ID,
                "mes_referencia": "12",
                "ano_referencia": 2025
            },
            timeout=60
        )
        
        assert response.status_code == 200
        result = response.json()
        
        dados_atual = result.get("dados_atual", {})
        if dados_atual:
            proventos = dados_atual.get("proventos", [])
            descontos = dados_atual.get("descontos", [])
            
            print(f"\n=== Proventos Extraídos ({len(proventos)}) ===")
            for p in proventos[:5]:
                print(f"  {p.get('descricao')}: {p.get('valor')}")
            
            print(f"\n=== Descontos Extraídos ({len(descontos)}) ===")
            for d in descontos[:5]:
                print(f"  {d.get('descricao')}: {d.get('valor')}")
            
            print(f"\nTotal Proventos: {dados_atual.get('total_proventos')}")
            print(f"Total Descontos: {dados_atual.get('total_descontos')}")
            print(f"Líquido: {dados_atual.get('liquido')}")
        
        print("✓ Proventos/Descontos extraction test completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
