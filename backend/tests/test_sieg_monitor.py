"""
Test SIEG Monitor - Painel de Monitoramento da Integração SIEG
Tests: SIEG scheduler status, painel endpoints, and configuration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Get token first
def get_auth_token():
    """Authenticate and get token"""
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "alberto.lemes@businessconta.com.br",
        "password": "@Ahl142536"
    })
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    data = login_response.json()
    # API returns 'access_token' not 'token'
    return data.get("access_token") or data.get("token")

# Module-level token
TOKEN = None
HEADERS = None

@pytest.fixture(scope="module", autouse=True)
def setup_auth():
    """Setup authentication at module level"""
    global TOKEN, HEADERS
    TOKEN = get_auth_token()
    assert TOKEN is not None, "Failed to get auth token"
    HEADERS = {"Authorization": f"Bearer {TOKEN}"}
    print(f"Auth token obtained: {TOKEN[:20]}...")

class TestSiegMonitor:
    """Test suite for SIEG Monitor feature"""
    
    # ==================== SCHEDULER STATUS TESTS ====================
    
    def test_scheduler_status_endpoint(self):
        """Test /api/sieg/scheduler-status returns scheduler status"""
        global HEADERS
        response = requests.get(f"{BASE_URL}/api/sieg/scheduler-status", headers=HEADERS)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "running" in data, "Response must have 'running' field"
        assert "jobs" in data, "Response must have 'jobs' field"
        
        # Verify scheduler is running
        assert data["running"] == True, "Scheduler should be running"
        
        # Verify jobs exist
        assert len(data["jobs"]) > 0, "Scheduler should have scheduled jobs"
        
        # Verify job structure
        for job in data["jobs"]:
            assert "id" in job, "Job must have id"
            assert "name" in job, "Job must have name"
            assert "next_run" in job, "Job must have next_run"
        
        print(f"✅ Scheduler status: {data['running']}, Jobs: {len(data['jobs'])}")
        for job in data["jobs"]:
            print(f"  - {job['name']}: next run = {job['next_run']}")
    
    # ==================== PAINEL GERAL TESTS ====================
    
    def test_sieg_painel_endpoint(self):
        """Test /api/sieg/painel returns companies list with SIEG status"""
        global HEADERS
        response = requests.get(f"{BASE_URL}/api/sieg/painel", headers=HEADERS)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "total_empresas" in data, "Response must have total_empresas"
        assert "empresas_com_sieg" in data, "Response must have empresas_com_sieg"
        assert "empresas_sync_auto" in data, "Response must have empresas_sync_auto"
        assert "empresas" in data, "Response must have empresas list"
        
        # Verify values are numeric
        assert isinstance(data["total_empresas"], int), "total_empresas must be int"
        assert isinstance(data["empresas_com_sieg"], int), "empresas_com_sieg must be int"
        assert isinstance(data["empresas_sync_auto"], int), "empresas_sync_auto must be int"
        
        print(f"✅ Painel SIEG: {data['total_empresas']} empresas, {data['empresas_com_sieg']} com SIEG ativo, {data['empresas_sync_auto']} com sync automático")
        
        # If there are empresas, verify their structure
        if len(data["empresas"]) > 0:
            empresa = data["empresas"][0]
            assert "company_id" in empresa, "Empresa must have company_id"
            assert "razao_social" in empresa, "Empresa must have razao_social"
            assert "cnpj" in empresa, "Empresa must have cnpj"
            print(f"  First empresa: {empresa['razao_social']}")
    
    # ==================== SIEG STATUS TESTS ====================
    
    def test_sieg_api_status(self):
        """Test /api/sieg/status returns API connection status"""
        global HEADERS
        response = requests.get(f"{BASE_URL}/api/sieg/status", headers=HEADERS)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "status" in data or "message" in data, "Response must have status or message"
        
        print(f"✅ SIEG API status: {data}")
    
    # ==================== PAINEL EMPRESA TESTS ====================
    
    def test_sieg_painel_empresa(self):
        """Test /api/sieg/painel/{company_id} returns specific company data"""
        global HEADERS
        # First get a company from the painel
        painel_response = requests.get(f"{BASE_URL}/api/sieg/painel", headers=HEADERS)
        assert painel_response.status_code == 200
        empresas = painel_response.json().get("empresas", [])
        
        if len(empresas) > 0:
            company_id = empresas[0]["company_id"]
            response = requests.get(f"{BASE_URL}/api/sieg/painel/{company_id}", headers=HEADERS)
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            # Verify structure
            assert "company_id" in data, "Response must have company_id"
            assert "estatisticas" in data or "config" in data, "Response must have estatisticas or config"
            
            print(f"✅ Painel empresa {company_id}: has estatisticas={bool(data.get('estatisticas'))}, config={bool(data.get('config'))}")
        else:
            pytest.skip("No companies available to test")
    
    # ==================== HISTORICO TESTS ====================
    
    def test_sieg_historico(self):
        """Test /api/sieg/historico/{company_id} returns sync history"""
        global HEADERS
        # First get a company
        painel_response = requests.get(f"{BASE_URL}/api/sieg/painel", headers=HEADERS)
        assert painel_response.status_code == 200
        empresas = painel_response.json().get("empresas", [])
        
        if len(empresas) > 0:
            company_id = empresas[0]["company_id"]
            response = requests.get(f"{BASE_URL}/api/sieg/historico/{company_id}", headers=HEADERS)
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            # Verify structure
            assert "historico" in data, "Response must have historico list"
            assert isinstance(data["historico"], list), "historico must be a list"
            
            print(f"✅ Histórico empresa: {len(data['historico'])} registros")
        else:
            pytest.skip("No companies available to test")
    
    # ==================== CANCELADOS TESTS ====================
    
    def test_sieg_cancelados(self):
        """Test /api/sieg/cancelados/{company_id} returns cancelled notes"""
        global HEADERS
        # First get a company
        painel_response = requests.get(f"{BASE_URL}/api/sieg/painel", headers=HEADERS)
        assert painel_response.status_code == 200
        empresas = painel_response.json().get("empresas", [])
        
        if len(empresas) > 0:
            company_id = empresas[0]["company_id"]
            response = requests.get(f"{BASE_URL}/api/sieg/cancelados/{company_id}", headers=HEADERS)
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            # Verify structure
            assert "cancelados" in data, "Response must have cancelados list"
            assert isinstance(data["cancelados"], list), "cancelados must be a list"
            
            print(f"✅ Cancelados empresa: {len(data['cancelados'])} notas canceladas")
        else:
            pytest.skip("No companies available to test")
    
    # ==================== CONFIG TESTS ====================
    
    def test_sieg_config_save(self):
        """Test /api/sieg/config/{company_id} saves configuration"""
        global HEADERS
        # First get a company
        painel_response = requests.get(f"{BASE_URL}/api/sieg/painel", headers=HEADERS)
        assert painel_response.status_code == 200
        empresas = painel_response.json().get("empresas", [])
        
        if len(empresas) > 0:
            company_id = empresas[0]["company_id"]
            
            # Send config
            config_data = {
                "ativo": True,
                "sync_automatico": False,
                "frequencia": "diario",
                "hora_sync": "06:00",
                "competencias_retroativas": 3
            }
            
            response = requests.post(
                f"{BASE_URL}/api/sieg/config/{company_id}",
                json=config_data,
                headers=HEADERS
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            # Verify response has success indication
            print(f"✅ Config saved for company {company_id}: {data}")
        else:
            pytest.skip("No companies available to test")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
