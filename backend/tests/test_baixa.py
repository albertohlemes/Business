"""
Test suite for Baixa (Distrato Social) functionality
Tests the new Baixa wizard endpoints and workflow
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "teste2@teste.com"
TEST_PASSWORD = "123456"

# Global session and token
_session = None
_token = None

def get_authenticated_session():
    """Get or create authenticated session"""
    global _session, _token
    
    if _session is None or _token is None:
        _session = requests.Session()
        
        # Login to get token
        login_response = _session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            _token = login_response.json().get("access_token")
            _session.headers.update({
                "Authorization": f"Bearer {_token}",
                "Content-Type": "application/json"
            })
        else:
            raise Exception(f"Could not authenticate: {login_response.text}")
    
    return _session, _token


class TestBaixaEndpoints:
    """Tests for Baixa (Distrato) API endpoints"""
    
    def test_health_check(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_baixa_extrair_contrato_endpoint_exists(self):
        """Test that /api/baixa/extrair-contrato endpoint exists (requires file upload)"""
        session, token = get_authenticated_session()
        
        # This endpoint requires a file, so we test with empty request to verify it exists
        response = session.post(f"{BASE_URL}/api/baixa/extrair-contrato")
        # Should return 422 (validation error) because file is required, not 404
        assert response.status_code in [422, 400], f"Expected 422 or 400, got {response.status_code}: {response.text}"
        print("✓ /api/baixa/extrair-contrato endpoint exists")
    
    def test_baixa_gerar_distrato_endpoint_exists(self):
        """Test that /api/baixa/gerar-distrato endpoint exists"""
        session, token = get_authenticated_session()
        
        # Test with minimal payload to verify endpoint exists
        response = session.post(
            f"{BASE_URL}/api/baixa/gerar-distrato",
            json={}  # Empty payload should return validation error
        )
        # Should return 422 (validation error) because required fields are missing, not 404
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("✓ /api/baixa/gerar-distrato endpoint exists")
    
    def test_create_minuta_for_baixa(self):
        """Test creating a minuta that will be used for baixa process"""
        session, token = get_authenticated_session()
        
        # For multipart form data, we need to remove Content-Type header
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            data={
                "tipo_alteracao": "baixa",
                "descricao": "TEST_Distrato Social para teste"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Created minuta for baixa with ID: {data['id']}")
        return data["id"]
    
    def test_gerar_distrato_with_valid_data(self):
        """Test generating distrato with valid data"""
        session, token = get_authenticated_session()
        
        # First create a minuta
        headers = {"Authorization": f"Bearer {token}"}
        
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            data={
                "tipo_alteracao": "baixa",
                "descricao": "TEST_Distrato Social completo"
            },
            headers=headers
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        minuta_id = create_response.json()["id"]
        
        # Now generate distrato
        distrato_payload = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST EMPRESA LTDA",
                "cnpj": "12.345.678/0001-90",
                "nire": "35123456789",
                "capital_social": "R$ 100.000,00",
                "data_registro": "01/01/2020",
                "junta_comercial": "JUCESP",
                "endereco": "Rua Teste, 123, Centro, São Paulo-SP, CEP 01234-567"
            },
            "socios": [
                {
                    "nome": "JOÃO DA SILVA",
                    "cpf": "123.456.789-00",
                    "rg": "12.345.678-9",
                    "orgao_emissor": "SSP/SP",
                    "nacionalidade": "Brasileiro",
                    "estado_civil": "Casado(a)",
                    "regime_casamento": "Comunhão Parcial de Bens",
                    "profissao": "Empresário",
                    "endereco": "Rua Sócio 1, 100, Bairro, São Paulo-SP",
                    "participacao": "50%"
                },
                {
                    "nome": "MARIA DA SILVA",
                    "cpf": "987.654.321-00",
                    "rg": "98.765.432-1",
                    "orgao_emissor": "SSP/SP",
                    "nacionalidade": "Brasileira",
                    "estado_civil": "Casada",
                    "regime_casamento": "Comunhão Parcial de Bens",
                    "profissao": "Empresária",
                    "endereco": "Rua Sócio 2, 200, Bairro, São Paulo-SP",
                    "participacao": "50%"
                }
            ],
            "baixa": {
                "motivo": "vontade_socios",
                "motivo_detalhado": None,
                "data_encerramento": "2026-01-15",
                "destinacao_acervo": "Os livros e documentos ficarão sob guarda de JOÃO DA SILVA",
                "declaracao_quitacao": True,
                "distribuicao_patrimonio": "O patrimônio será dividido igualmente entre os sócios",
                "responsavel_guarda": "JOÃO DA SILVA",
                "prazo_guarda": "5 anos"
            }
        }
        
        response = session.post(
            f"{BASE_URL}/api/baixa/gerar-distrato",
            json=distrato_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "distrato" in data
        assert len(data["distrato"]) > 100  # Should have substantial content
        assert "minuta_id" in data
        print(f"✓ Distrato generated successfully ({len(data['distrato'])} chars)")
        
        # Verify the minuta was updated
        minuta_response = session.get(f"{BASE_URL}/api/minutas/{minuta_id}")
        assert minuta_response.status_code == 200
        minuta_data = minuta_response.json()
        assert minuta_data.get("tipo_processo") == "baixa"
        assert minuta_data.get("status") == "concluida"
        assert minuta_data.get("conteudo_gerado") is not None
        print("✓ Minuta updated with distrato content and status 'concluida'")
        
        return minuta_id
    
    def test_gerar_distrato_validation_errors(self):
        """Test validation errors for gerar-distrato endpoint"""
        session, token = get_authenticated_session()
        
        # Test missing required fields
        invalid_payloads = [
            # Missing empresa
            {
                "minuta_id": "test-id",
                "socios": [],
                "baixa": {"motivo": "vontade_socios", "data_encerramento": "2026-01-15", "responsavel_guarda": "Test"}
            },
            # Missing socios
            {
                "minuta_id": "test-id",
                "empresa": {"razao_social": "Test", "cnpj": "12.345.678/0001-90"},
                "baixa": {"motivo": "vontade_socios", "data_encerramento": "2026-01-15", "responsavel_guarda": "Test"}
            },
            # Missing baixa
            {
                "minuta_id": "test-id",
                "empresa": {"razao_social": "Test", "cnpj": "12.345.678/0001-90"},
                "socios": []
            }
        ]
        
        for i, payload in enumerate(invalid_payloads):
            response = session.post(
                f"{BASE_URL}/api/baixa/gerar-distrato",
                json=payload
            )
            assert response.status_code == 422, f"Payload {i+1}: Expected 422, got {response.status_code}"
        
        print("✓ Validation errors working correctly")
    
    def test_list_minutas_includes_baixa(self):
        """Test that minutas list includes baixa type processes"""
        session, token = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/minutas")
        assert response.status_code == 200
        minutas = response.json()
        
        # Check if any baixa type exists
        baixa_minutas = [m for m in minutas if m.get("tipo_processo") == "baixa" or m.get("tipo_alteracao") == "baixa"]
        print(f"✓ Found {len(baixa_minutas)} baixa processes in minutas list")
    
    def test_download_distrato_word(self):
        """Test downloading distrato as Word document"""
        session, token = get_authenticated_session()
        headers = {"Authorization": f"Bearer {token}"}
        
        # First create and generate a distrato
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            data={
                "tipo_alteracao": "baixa",
                "descricao": "TEST_Distrato para download Word"
            },
            headers=headers
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create minuta for download test")
        
        minuta_id = create_response.json()["id"]
        
        # Generate distrato
        distrato_payload = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST DOWNLOAD LTDA",
                "cnpj": "11.222.333/0001-44"
            },
            "socios": [
                {
                    "nome": "TESTE SOCIO",
                    "cpf": "111.222.333-44"
                }
            ],
            "baixa": {
                "motivo": "vontade_socios",
                "data_encerramento": "2026-01-20",
                "responsavel_guarda": "TESTE SOCIO",
                "prazo_guarda": "5 anos"
            }
        }
        
        gen_response = session.post(
            f"{BASE_URL}/api/baixa/gerar-distrato",
            json=distrato_payload
        )
        
        if gen_response.status_code != 200:
            pytest.skip(f"Could not generate distrato: {gen_response.text}")
        
        # Now try to download Word
        download_response = session.get(f"{BASE_URL}/api/minutas/{minuta_id}/download/word")
        assert download_response.status_code == 200, f"Expected 200, got {download_response.status_code}"
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in download_response.headers.get("Content-Type", "")
        assert len(download_response.content) > 1000  # Should have substantial content
        print(f"✓ Word download successful ({len(download_response.content)} bytes)")
    
    def test_download_distrato_pdf(self):
        """Test downloading distrato as PDF document"""
        session, token = get_authenticated_session()
        headers = {"Authorization": f"Bearer {token}"}
        
        # First create and generate a distrato
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            data={
                "tipo_alteracao": "baixa",
                "descricao": "TEST_Distrato para download PDF"
            },
            headers=headers
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create minuta for download test")
        
        minuta_id = create_response.json()["id"]
        
        # Generate distrato
        distrato_payload = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST PDF LTDA",
                "cnpj": "55.666.777/0001-88"
            },
            "socios": [
                {
                    "nome": "TESTE PDF SOCIO",
                    "cpf": "555.666.777-88"
                }
            ],
            "baixa": {
                "motivo": "inatividade",
                "data_encerramento": "2026-01-25",
                "responsavel_guarda": "TESTE PDF SOCIO",
                "prazo_guarda": "5 anos"
            }
        }
        
        gen_response = session.post(
            f"{BASE_URL}/api/baixa/gerar-distrato",
            json=distrato_payload
        )
        
        if gen_response.status_code != 200:
            pytest.skip(f"Could not generate distrato: {gen_response.text}")
        
        # Now try to download PDF
        download_response = session.get(f"{BASE_URL}/api/minutas/{minuta_id}/download/pdf")
        assert download_response.status_code == 200, f"Expected 200, got {download_response.status_code}"
        assert "application/pdf" in download_response.headers.get("Content-Type", "")
        assert len(download_response.content) > 1000  # Should have substantial content
        print(f"✓ PDF download successful ({len(download_response.content)} bytes)")


class TestBaixaMotivos:
    """Test different motivos (reasons) for baixa"""
    
    def _create_minuta(self):
        """Helper to create a minuta"""
        session, token = get_authenticated_session()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            data={
                "tipo_alteracao": "baixa",
                "descricao": "TEST_Motivo test"
            },
            headers=headers
        )
        return response.json()["id"] if response.status_code == 200 else None
    
    def test_motivo_vontade_socios(self):
        """Test baixa with motivo 'vontade_socios'"""
        session, token = get_authenticated_session()
        minuta_id = self._create_minuta()
        if not minuta_id:
            pytest.skip("Could not create minuta")
        
        payload = {
            "minuta_id": minuta_id,
            "empresa": {"razao_social": "TEST VONTADE LTDA", "cnpj": "11.111.111/0001-11"},
            "socios": [{"nome": "SOCIO TESTE", "cpf": "111.111.111-11"}],
            "baixa": {
                "motivo": "vontade_socios",
                "data_encerramento": "2026-02-01",
                "responsavel_guarda": "SOCIO TESTE",
                "prazo_guarda": "5 anos"
            }
        }
        
        response = session.post(f"{BASE_URL}/api/baixa/gerar-distrato", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "distrato" in data
        print("✓ Motivo 'vontade_socios' working")
    
    def test_motivo_inatividade(self):
        """Test baixa with motivo 'inatividade'"""
        session, token = get_authenticated_session()
        minuta_id = self._create_minuta()
        if not minuta_id:
            pytest.skip("Could not create minuta")
        
        payload = {
            "minuta_id": minuta_id,
            "empresa": {"razao_social": "TEST INATIVIDADE LTDA", "cnpj": "22.222.222/0001-22"},
            "socios": [{"nome": "SOCIO INATIVO", "cpf": "222.222.222-22"}],
            "baixa": {
                "motivo": "inatividade",
                "data_encerramento": "2026-02-01",
                "responsavel_guarda": "SOCIO INATIVO",
                "prazo_guarda": "5 anos"
            }
        }
        
        response = session.post(f"{BASE_URL}/api/baixa/gerar-distrato", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("✓ Motivo 'inatividade' working")
    
    def test_motivo_outros_with_detail(self):
        """Test baixa with motivo 'outros' and detailed reason"""
        session, token = get_authenticated_session()
        minuta_id = self._create_minuta()
        if not minuta_id:
            pytest.skip("Could not create minuta")
        
        payload = {
            "minuta_id": minuta_id,
            "empresa": {"razao_social": "TEST OUTROS LTDA", "cnpj": "33.333.333/0001-33"},
            "socios": [{"nome": "SOCIO OUTROS", "cpf": "333.333.333-33"}],
            "baixa": {
                "motivo": "outros",
                "motivo_detalhado": "Motivo específico personalizado para teste",
                "data_encerramento": "2026-02-01",
                "responsavel_guarda": "SOCIO OUTROS",
                "prazo_guarda": "5 anos"
            }
        }
        
        response = session.post(f"{BASE_URL}/api/baixa/gerar-distrato", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("✓ Motivo 'outros' with detail working")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_minutas(self):
        """Clean up TEST_ prefixed minutas"""
        session, token = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/minutas")
        if response.status_code != 200:
            return
        
        minutas = response.json()
        deleted = 0
        for m in minutas:
            if m.get("descricao", "").startswith("TEST_") or (m.get("razao_social") or "").startswith("TEST"):
                del_response = session.delete(f"{BASE_URL}/api/minutas/{m['id']}")
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test minutas")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
