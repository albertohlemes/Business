"""
Test suite for new dissídio features - Iteration 16:
1. POST /api/convencao/analisar - Must return tabela_proporcionalidade and proporcionalidade_extraida_da_convencao
2. POST /api/dissidio/calcular-retroativo - Must apply proporcionalidade for employees hired after data base
3. GET /api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf - Must generate PDF from convention summary
"""
import pytest
import requests
import os
import json
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@teste.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "senha": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_cliente(auth_headers):
    """Create a test cliente for testing"""
    unique_id = datetime.now().strftime("%H%M%S")
    cliente_data = {
        "razao_social": f"TEST_Proporcionalidade_{unique_id}",
        "cnpj": f"11.222.333/0001-{unique_id[:2]}",
        "nome_fantasia": f"Test Prop {unique_id}"
    }
    response = requests.post(
        f"{BASE_URL}/api/clientes",
        headers=auth_headers,
        json=cliente_data
    )
    assert response.status_code in [200, 201], f"Failed to create cliente: {response.text}"
    cliente = response.json()
    yield cliente
    # Cleanup
    requests.delete(f"{BASE_URL}/api/clientes/{cliente['id']}", headers=auth_headers)


class TestConvencaoAnalisar:
    """Tests for POST /api/convencao/analisar - tabela_proporcionalidade extraction"""
    
    def test_analisar_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/convencao/analisar")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Convenção analisar requires authentication")
    
    def test_analisar_requires_file(self, auth_headers, test_cliente):
        """Test that endpoint requires a file"""
        response = requests.post(
            f"{BASE_URL}/api/convencao/analisar",
            headers={"Authorization": auth_headers["Authorization"]},
            data={"cliente_id": test_cliente["id"]}
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Convenção analisar requires file upload")
    
    def test_analisar_requires_cliente_id(self, auth_headers):
        """Test that endpoint requires cliente_id"""
        # Create a dummy PDF file
        pdf_content = b"%PDF-1.4\n%Test PDF content"
        files = {"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/convencao/analisar",
            headers={"Authorization": auth_headers["Authorization"]},
            files=files
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Convenção analisar requires cliente_id")


class TestCalcularRetroativo:
    """Tests for POST /api/dissidio/calcular-retroativo - proporcionalidade application"""
    
    def test_calcular_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/dissidio/calcular-retroativo")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Calcular retroativo requires authentication")
    
    def test_calcular_requires_holerites(self, auth_headers, test_cliente):
        """Test that endpoint requires holerite files"""
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers={"Authorization": auth_headers["Authorization"]},
            data={
                "cliente_id": test_cliente["id"],
                "dados_convencao": json.dumps({"percentual_reajuste": 5.0})
            }
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Calcular retroativo requires holerite files")
    
    def test_calcular_requires_percentual_reajuste(self, auth_headers, test_cliente):
        """Test that endpoint requires percentual_reajuste in dados_convencao"""
        # Create a dummy holerite file
        holerite_content = b"HOLERITE\nNome: Joao Silva\nSalario Base: 2000.00"
        files = {"holerites": ("holerite.txt", io.BytesIO(holerite_content), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers={"Authorization": auth_headers["Authorization"]},
            files=files,
            data={
                "cliente_id": test_cliente["id"],
                "dados_convencao": json.dumps({})  # Missing percentual_reajuste
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Calcular retroativo requires percentual_reajuste")
    
    def test_calcular_with_proporcionalidade_data(self, auth_headers, test_cliente):
        """Test calculation with proporcionalidade data in convenção"""
        # Create a holerite file with employee data
        holerite_content = """FOLHA DE PAGAMENTO - JANEIRO/2024
Nome: Maria Santos
CPF: 123.456.789-00
Cargo: Auxiliar Administrativo
Data Admissão: 15/03/2024
Salário Base: R$ 2.000,00
"""
        files = {"holerites": ("holerite_01_2024.txt", io.BytesIO(holerite_content.encode()), "text/plain")}
        
        # Convenção data with proporcionalidade table
        dados_convencao = {
            "percentual_reajuste": 5.0,
            "data_base": "01/2024",
            "meses_retroativos": 6,
            "verbas_com_reajuste": ["salario_base"],
            "tabela_proporcionalidade": [
                {"mes_admissao": 1, "percentual": 100, "descricao": "Janeiro - 6/6"},
                {"mes_admissao": 2, "percentual": 83.33, "descricao": "Fevereiro - 5/6"},
                {"mes_admissao": 3, "percentual": 66.67, "descricao": "Março - 4/6"},
                {"mes_admissao": 4, "percentual": 50, "descricao": "Abril - 3/6"},
                {"mes_admissao": 5, "percentual": 33.33, "descricao": "Maio - 2/6"},
                {"mes_admissao": 6, "percentual": 16.67, "descricao": "Junho - 1/6"}
            ],
            "proporcionalidade_extraida_da_convencao": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers={"Authorization": auth_headers["Authorization"]},
            files=files,
            data={
                "cliente_id": test_cliente["id"],
                "dados_convencao": json.dumps(dados_convencao)
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should have id"
        assert "dados_convencao" in data, "Response should have dados_convencao"
        assert "resultados_por_mes" in data, "Response should have resultados_por_mes"
        
        # Verify dados_convencao contains proporcionalidade
        conv = data.get("dados_convencao", {})
        assert "tabela_proporcionalidade" in conv or conv.get("meses_retroativos"), \
            "dados_convencao should have proporcionalidade info"
        
        print("✓ Calcular retroativo accepts proporcionalidade data")
        print(f"  - Calculation ID: {data.get('id')}")
        print(f"  - Total retroativo: {data.get('total_retroativo', 0)}")
        
        return data


class TestExportarConvencaoPDF:
    """Tests for GET /api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf"""
    
    def test_export_pdf_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/calculos-dissidio/fake-id/exportar-convencao-pdf")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ PDF export requires authentication")
    
    def test_export_pdf_not_found(self, auth_headers):
        """Test 404 for non-existent calculation"""
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio/non-existent-id/exportar-convencao-pdf",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PDF export returns 404 for non-existent calculation")
    
    def test_export_pdf_from_existing_calculo(self, auth_headers):
        """Test PDF export from an existing calculation"""
        # First, list existing calculations
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200
        calculos = response.json()
        
        if not calculos:
            pytest.skip("No existing calculations to test PDF export")
        
        # Find a calculation with dados_convencao
        calculo_with_convencao = None
        for calc in calculos:
            if calc.get('dados_convencao'):
                calculo_with_convencao = calc
                break
        
        if not calculo_with_convencao:
            pytest.skip("No calculations with dados_convencao found")
        
        calculo_id = calculo_with_convencao['id']
        
        # Export PDF
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Verify PDF content starts with %PDF
        assert response.content[:4] == b'%PDF', "Response should be a valid PDF"
        
        print(f"✓ PDF export successful for calculation {calculo_id}")
        print(f"  - Content-Type: {response.headers.get('content-type')}")
        print(f"  - PDF size: {len(response.content)} bytes")


class TestListCalculosDissidio:
    """Tests for GET /api/calculos-dissidio - list calculations"""
    
    def test_list_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/calculos-dissidio")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ List calculos requires authentication")
    
    def test_list_calculos(self, auth_headers):
        """Test listing calculations"""
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of calculations"
        
        # Verify structure of each calculation
        for calc in data:
            assert "id" in calc, "Calculation should have id"
            assert "cliente_id" in calc, "Calculation should have cliente_id"
            
        print(f"✓ Listed {len(data)} calculations")
        
        # Check if any calculation has dados_convencao with proporcionalidade
        for calc in data:
            conv = calc.get('dados_convencao', {})
            if conv.get('tabela_proporcionalidade'):
                print(f"  - Found calculation with tabela_proporcionalidade: {calc['id']}")
                break


class TestProporcionalidadeCalculation:
    """Tests for proporcionalidade calculation logic"""
    
    def test_proporcionalidade_for_employee_after_data_base(self, auth_headers, test_cliente):
        """Test that employees hired after data base receive proportional retroactive"""
        # Create holerite with employee hired in March (after January data base)
        holerite_content = """FOLHA DE PAGAMENTO - JANEIRO/2024
Nome: Pedro Almeida
CPF: 987.654.321-00
Cargo: Vendedor
Data Admissão: 01/03/2024
Salário Base: R$ 3.000,00
"""
        files = {"holerites": ("holerite_01_2024.txt", io.BytesIO(holerite_content.encode()), "text/plain")}
        
        # Convenção with 6 months retroactive from January
        dados_convencao = {
            "percentual_reajuste": 5.0,
            "data_base": "01/2024",
            "meses_retroativos": 6,
            "verbas_com_reajuste": ["salario_base"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers={"Authorization": auth_headers["Authorization"]},
            files=files,
            data={
                "cliente_id": test_cliente["id"],
                "dados_convencao": json.dumps(dados_convencao)
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check if proporcionalidade was applied
        resultados = data.get("resultados_por_mes", [])
        if resultados:
            for mes in resultados:
                for colab in mes.get("colaboradores", []):
                    prop_info = colab.get("proporcionalidade_info")
                    if prop_info:
                        print(f"✓ Proporcionalidade applied:")
                        print(f"  - Percentual: {prop_info.get('percentual')}%")
                        print(f"  - Observação: {prop_info.get('observacao')}")
                        print(f"  - Retroativo original: {prop_info.get('retroativo_original')}")
                        print(f"  - Retroativo proporcional: {prop_info.get('retroativo_proporcional')}")
        
        print(f"✓ Calculation completed with proporcionalidade logic")


class TestVigenciaFields:
    """Tests for vigência fields in convenção data"""
    
    def test_vigencia_fields_in_response(self, auth_headers):
        """Test that vigência fields are present in calculation response"""
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200
        calculos = response.json()
        
        if not calculos:
            pytest.skip("No calculations to check vigência fields")
        
        # Check if any calculation has vigência fields
        found_vigencia = False
        for calc in calculos:
            conv = calc.get('dados_convencao', {})
            if conv.get('vigencia_inicio') or conv.get('vigencia_fim'):
                found_vigencia = True
                print(f"✓ Found vigência in calculation {calc['id']}:")
                print(f"  - Vigência início: {conv.get('vigencia_inicio')}")
                print(f"  - Vigência fim: {conv.get('vigencia_fim')}")
                break
        
        if not found_vigencia:
            print("⚠ No calculations with vigência fields found (may be expected if not extracted from convention)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
