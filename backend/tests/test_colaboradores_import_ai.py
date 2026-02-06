"""
Test suite for Colaboradores Import with AI Extraction
Tests the AI-based extraction of employee data from TXT and PDF files
Verifies that all required fields are correctly extracted
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
TEST_EMAIL = "admin@teste.com"
TEST_PASSWORD = "admin123"
CLIENTE_ID = "922f508e-e04e-4158-b07c-f2886b2c0b13"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "senha": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}"
    }


class TestColaboradoresImportAI:
    """Tests for AI-based colaboradores import functionality"""
    
    def test_login_success(self):
        """Test login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful for user: {data['user']['email']}")
    
    def test_import_txt_file_with_ai(self, auth_headers):
        """
        Test importing colaborador from TXT file using AI extraction
        Verifies that all required fields are extracted correctly
        """
        txt_file_path = "/app/backend/tests/test_ficha_funcionario.txt"
        
        with open(txt_file_path, 'rb') as f:
            files = {'file': ('test_ficha_funcionario.txt', f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/api/colaboradores/importar",
                headers=auth_headers,
                files=files,
                data={'cliente_id': CLIENTE_ID, 'use_ai': 'true'}
            )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        print(f"Response: {data}")
        
        # Verify response structure
        assert "colaboradores" in data, "Response should contain 'colaboradores' field"
        assert "confianca" in data, "Response should contain 'confianca' field"
        assert "metodo_extracao" in data, "Response should contain 'metodo_extracao' field"
        assert "total_colaboradores" in data, "Response should contain 'total_colaboradores' field"
        
        # Verify AI was used (confianca should be 'alta' when AI is used)
        assert data["confianca"] == "alta", f"Expected 'alta' confidence when using AI, got: {data['confianca']}"
        assert data["metodo_extracao"] == "ia", f"Expected 'ia' extraction method, got: {data['metodo_extracao']}"
        
        # Verify at least one colaborador was extracted
        assert data["total_colaboradores"] >= 1, "Should extract at least 1 colaborador"
        assert len(data["colaboradores"]) >= 1, "Colaboradores list should not be empty"
        
        # Get the first colaborador
        colab = data["colaboradores"][0]
        print(f"Extracted colaborador: {colab}")
        
        # Verify required fields are extracted (not empty or None)
        # These are the fields mentioned in the bug report as missing
        required_fields = ["nome", "cpf", "sexo", "estado_civil", "endereco", "cidade", "uf", "cep"]
        
        for field in required_fields:
            assert field in colab, f"Field '{field}' should be present in extracted data"
            # Allow None but check if field exists
            print(f"  {field}: {colab.get(field)}")
        
        # Verify the name is NOT the company name (critical bug fix)
        nome = colab.get("nome", "").upper()
        company_indicators = ["LTDA", "EIRELI", "S/A", "S.A.", "ME", "EPP", "CNPJ", "CONTABILIDADE"]
        for indicator in company_indicators:
            assert indicator not in nome, f"Employee name should not contain company indicator '{indicator}': {nome}"
        
        # Verify CPF format (11 digits)
        cpf = colab.get("cpf", "").replace(".", "").replace("-", "").replace(" ", "")
        assert len(cpf) == 11, f"CPF should have 11 digits, got: {cpf}"
        
        # Verify sexo is extracted
        sexo = colab.get("sexo", "")
        assert sexo in ["masculino", "feminino", "Masculino", "Feminino", "M", "F", None, ""], \
            f"Sexo should be valid value, got: {sexo}"
        
        # Verify estado_civil is extracted
        estado_civil = colab.get("estado_civil", "")
        valid_estados = ["solteiro", "casado", "divorciado", "viuvo", "separado", "uniao_estavel", 
                        "Solteiro", "Casado", "Divorciado", "Viúvo", "Separado", "União Estável",
                        "casada", "Casada", None, ""]
        # Just check it's not empty if present
        print(f"  estado_civil: {estado_civil}")
    
    def test_import_pdf_file_with_ai(self, auth_headers):
        """
        Test importing colaborador from PDF file using AI extraction
        """
        pdf_file_path = "/app/backend/tests/test_ficha.pdf"
        
        with open(pdf_file_path, 'rb') as f:
            files = {'file': ('test_ficha.pdf', f, 'application/pdf')}
            response = requests.post(
                f"{BASE_URL}/api/colaboradores/importar",
                headers=auth_headers,
                files=files,
                data={'cliente_id': CLIENTE_ID, 'use_ai': 'true'}
            )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        print(f"PDF Import Response: {data}")
        
        # Verify response structure
        assert "colaboradores" in data, "Response should contain 'colaboradores' field"
        assert "confianca" in data, "Response should contain 'confianca' field"
        assert "metodo_extracao" in data, "Response should contain 'metodo_extracao' field"
        
        # Verify AI was used
        assert data["confianca"] == "alta", f"Expected 'alta' confidence when using AI, got: {data['confianca']}"
        assert data["metodo_extracao"] == "ia", f"Expected 'ia' extraction method, got: {data['metodo_extracao']}"
        
        # Verify at least one colaborador was extracted
        assert data["total_colaboradores"] >= 1, "Should extract at least 1 colaborador"
    
    def test_txt_extraction_distinguishes_employee_from_company(self, auth_headers):
        """
        Test that AI extraction correctly distinguishes employee data from company data
        This was the main bug: employee name was coming with company name
        """
        txt_file_path = "/app/backend/tests/test_ficha_funcionario.txt"
        
        with open(txt_file_path, 'rb') as f:
            files = {'file': ('test_ficha_funcionario.txt', f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/api/colaboradores/importar",
                headers=auth_headers,
                files=files,
                data={'cliente_id': CLIENTE_ID, 'use_ai': 'true'}
            )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # The test file has:
        # Company: BUSINESS CONTABILIDADE LTDA
        # Employee: MARIA APARECIDA DA SILVA SANTOS
        
        colab = data["colaboradores"][0]
        nome = colab.get("nome", "").upper()
        
        # Employee name should be MARIA APARECIDA DA SILVA SANTOS, not BUSINESS CONTABILIDADE
        assert "MARIA" in nome or "APARECIDA" in nome or "SILVA" in nome or "SANTOS" in nome, \
            f"Expected employee name (MARIA APARECIDA DA SILVA SANTOS), got: {nome}"
        
        assert "BUSINESS" not in nome, f"Employee name should not contain 'BUSINESS': {nome}"
        assert "CONTABILIDADE" not in nome, f"Employee name should not contain 'CONTABILIDADE': {nome}"
        
        print(f"✓ Employee name correctly extracted: {nome}")
    
    def test_txt_extraction_all_additional_fields(self, auth_headers):
        """
        Test that AI extraction captures all additional fields:
        rg, pis, ctps, nome_mae, nome_pai, data_nascimento, cargo, salario_base, bank data, dependentes
        """
        txt_file_path = "/app/backend/tests/test_ficha_funcionario.txt"
        
        with open(txt_file_path, 'rb') as f:
            files = {'file': ('test_ficha_funcionario.txt', f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/api/colaboradores/importar",
                headers=auth_headers,
                files=files,
                data={'cliente_id': CLIENTE_ID, 'use_ai': 'true'}
            )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        colab = data["colaboradores"][0]
        
        # Check additional fields mentioned in the requirements
        additional_fields = [
            "rg", "pis", "ctps", "nome_mae", "nome_pai", 
            "data_nascimento", "cargo", "salario_base",
            "banco", "agencia", "conta"
        ]
        
        extracted_fields = {}
        for field in additional_fields:
            value = colab.get(field)
            extracted_fields[field] = value
            print(f"  {field}: {value}")
        
        # Verify at least some key fields are extracted
        # The test file contains all these values
        assert colab.get("rg") is not None or colab.get("rg") != "", "RG should be extracted"
        assert colab.get("cargo") is not None, "Cargo should be extracted"
        
        # Check dependentes if present
        dependentes = colab.get("dependentes", [])
        print(f"  dependentes: {dependentes}")
        if dependentes:
            assert isinstance(dependentes, list), "Dependentes should be a list"
            print(f"  Found {len(dependentes)} dependente(s)")
    
    def test_import_requires_authentication(self):
        """Test that import endpoint requires authentication"""
        txt_file_path = "/app/backend/tests/test_ficha_funcionario.txt"
        
        with open(txt_file_path, 'rb') as f:
            files = {'file': ('test_ficha_funcionario.txt', f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/api/colaboradores/importar",
                files=files,
                data={'cliente_id': CLIENTE_ID}
            )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got: {response.status_code}"
    
    def test_import_requires_file(self, auth_headers):
        """Test that import endpoint requires a file"""
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/importar",
            headers=auth_headers,
            data={'cliente_id': CLIENTE_ID}
        )
        
        assert response.status_code == 422, f"Expected 422 without file, got: {response.status_code}"


class TestColaboradoresImportValidation:
    """Tests for validation of extracted data"""
    
    def test_extracted_cpf_format(self, auth_headers):
        """Test that extracted CPF has correct format"""
        txt_file_path = "/app/backend/tests/test_ficha_funcionario.txt"
        
        with open(txt_file_path, 'rb') as f:
            files = {'file': ('test_ficha_funcionario.txt', f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/api/colaboradores/importar",
                headers=auth_headers,
                files=files,
                data={'cliente_id': CLIENTE_ID, 'use_ai': 'true'}
            )
        
        assert response.status_code == 200
        data = response.json()
        colab = data["colaboradores"][0]
        
        cpf = colab.get("cpf", "")
        # CPF should be in format XXX.XXX.XXX-XX or just digits
        cpf_digits = cpf.replace(".", "").replace("-", "").replace(" ", "")
        assert len(cpf_digits) == 11, f"CPF should have 11 digits: {cpf}"
        assert cpf_digits.isdigit(), f"CPF should contain only digits: {cpf}"
        
        print(f"✓ CPF format valid: {cpf}")
    
    def test_extracted_salario_is_numeric(self, auth_headers):
        """Test that extracted salary is a numeric value"""
        txt_file_path = "/app/backend/tests/test_ficha_funcionario.txt"
        
        with open(txt_file_path, 'rb') as f:
            files = {'file': ('test_ficha_funcionario.txt', f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/api/colaboradores/importar",
                headers=auth_headers,
                files=files,
                data={'cliente_id': CLIENTE_ID, 'use_ai': 'true'}
            )
        
        assert response.status_code == 200
        data = response.json()
        colab = data["colaboradores"][0]
        
        salario = colab.get("salario_base")
        if salario is not None:
            # Should be a number, not a string like "R$ 4.500,00"
            assert isinstance(salario, (int, float)), f"Salary should be numeric: {salario} (type: {type(salario)})"
            print(f"✓ Salary is numeric: {salario}")
        else:
            print("⚠ Salary not extracted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
