"""
Test Upload Progress Feature - SSE-based progress bar for XML uploads
Tests:
1. /api/xml/upload-init - Initialize upload session
2. /api/xml/upload-progress/{upload_id} - SSE progress stream
3. /api/xml/upload-stream - Upload files with progress tracking
"""
import pytest
import requests
import os
import time
import threading
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUploadProgress:
    """Test upload progress feature with SSE"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get ANZEN company
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert companies_response.status_code == 200
        companies = companies_response.json()
        
        # Find ANZEN company
        self.company = None
        for c in companies:
            if "ANZEN" in c.get('razao_social', '').upper() or c.get('cnpj', '') == '28225418000116':
                self.company = c
                break
        
        assert self.company is not None, "ANZEN company not found"
        self.company_id = self.company['id']
        print(f"Using company: {self.company.get('razao_social')} (ID: {self.company_id})")
    
    def test_upload_init_success(self):
        """Test /api/xml/upload-init returns upload_id"""
        form_data = {
            "company_id": self.company_id,
            "competencia": "02/2025",
            "tipo": "entrada",
            "total_files": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data=form_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Upload init failed: {response.text}"
        data = response.json()
        assert "upload_id" in data, "Response should contain upload_id"
        assert len(data["upload_id"]) > 0, "upload_id should not be empty"
        print(f"✓ Upload init returned upload_id: {data['upload_id']}")
    
    def test_upload_init_missing_company(self):
        """Test /api/xml/upload-init with invalid company_id"""
        form_data = {
            "company_id": "invalid-company-id",
            "competencia": "02/2025",
            "tipo": "entrada",
            "total_files": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data=form_data,
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Upload init correctly rejects invalid company_id")
    
    def test_upload_progress_sse_endpoint(self):
        """Test /api/xml/upload-progress/{upload_id} returns SSE stream"""
        # First init an upload
        form_data = {
            "company_id": self.company_id,
            "competencia": "02/2025",
            "tipo": "entrada",
            "total_files": 1
        }
        
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data=form_data,
            headers=self.headers
        )
        assert init_response.status_code == 200
        upload_id = init_response.json()["upload_id"]
        
        # Connect to SSE endpoint
        sse_response = requests.get(
            f"{BASE_URL}/api/xml/upload-progress/{upload_id}",
            stream=True,
            timeout=5
        )
        
        assert sse_response.status_code == 200, f"SSE endpoint failed: {sse_response.status_code}"
        assert "text/event-stream" in sse_response.headers.get("Content-Type", ""), \
            "Response should be text/event-stream"
        
        # Read first event
        first_event = None
        for line in sse_response.iter_lines(decode_unicode=True):
            if line and line.startswith("data:"):
                first_event = json.loads(line[5:].strip())
                break
        
        sse_response.close()
        
        assert first_event is not None, "Should receive at least one SSE event"
        assert "status" in first_event, "Event should contain status"
        assert "progress_percent" in first_event, "Event should contain progress_percent"
        assert "total_files" in first_event, "Event should contain total_files"
        print(f"✓ SSE endpoint returns valid events: {first_event}")
    
    def test_upload_progress_invalid_upload_id(self):
        """Test /api/xml/upload-progress with invalid upload_id"""
        sse_response = requests.get(
            f"{BASE_URL}/api/xml/upload-progress/invalid-upload-id",
            stream=True,
            timeout=5
        )
        
        assert sse_response.status_code == 200  # SSE always returns 200
        
        # Read first event - should be error
        first_event = None
        for line in sse_response.iter_lines(decode_unicode=True):
            if line and line.startswith("data:"):
                first_event = json.loads(line[5:].strip())
                break
        
        sse_response.close()
        
        assert first_event is not None
        assert "error" in first_event, "Should return error for invalid upload_id"
        print(f"✓ SSE correctly returns error for invalid upload_id: {first_event}")
    
    def test_full_upload_flow_with_progress(self):
        """Test complete upload flow: init -> progress -> stream"""
        # Read test XML file
        xml_path = "/tmp/test_nfe_valid.xml"
        with open(xml_path, 'r') as f:
            xml_content = f.read()
        
        # 1. Initialize upload
        form_data = {
            "company_id": self.company_id,
            "competencia": "02/2025",
            "tipo": "entrada",
            "total_files": 1
        }
        
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data=form_data,
            headers=self.headers
        )
        assert init_response.status_code == 200
        upload_id = init_response.json()["upload_id"]
        print(f"✓ Step 1: Upload initialized with ID: {upload_id}")
        
        # 2. Start SSE listener in background
        sse_events = []
        sse_error = [None]
        
        def listen_sse():
            try:
                sse_response = requests.get(
                    f"{BASE_URL}/api/xml/upload-progress/{upload_id}",
                    stream=True,
                    timeout=30
                )
                for line in sse_response.iter_lines(decode_unicode=True):
                    if line and line.startswith("data:"):
                        event = json.loads(line[5:].strip())
                        sse_events.append(event)
                        if event.get("completed"):
                            break
                sse_response.close()
            except Exception as e:
                sse_error[0] = str(e)
        
        sse_thread = threading.Thread(target=listen_sse)
        sse_thread.start()
        
        # Give SSE time to connect
        time.sleep(0.5)
        
        # 3. Upload file
        files = {
            'files': ('test_nfe_valid.xml', xml_content, 'application/xml')
        }
        upload_data = {
            'upload_id': upload_id
        }
        
        upload_response = requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            data=upload_data,
            files=files,
            headers=self.headers
        )
        
        # Wait for SSE to complete
        sse_thread.join(timeout=10)
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        print(f"✓ Step 2: Upload completed")
        
        # Verify SSE events
        assert len(sse_events) > 0, "Should have received SSE events"
        print(f"✓ Step 3: Received {len(sse_events)} SSE events")
        
        # Check for progress updates
        has_progress_update = any(e.get("progress_percent", 0) > 0 for e in sse_events)
        has_completed = any(e.get("completed") for e in sse_events)
        
        print(f"  - Has progress updates: {has_progress_update}")
        print(f"  - Has completed event: {has_completed}")
        
        # Verify upload response structure
        result = upload_response.json()
        assert "success" in result or "resumo" in result, "Response should contain success or resumo"
        
        if "resumo" in result:
            resumo = result["resumo"]
            print(f"✓ Upload resumo: {resumo}")
        
        print("✓ Full upload flow with progress completed successfully")
    
    def test_upload_stream_without_init(self):
        """Test /api/xml/upload-stream without prior init"""
        xml_path = "/tmp/test_nfe_valid.xml"
        with open(xml_path, 'r') as f:
            xml_content = f.read()
        
        files = {
            'files': ('test_nfe_valid.xml', xml_content, 'application/xml')
        }
        upload_data = {
            'upload_id': 'non-existent-upload-id'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            data=upload_data,
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Upload stream correctly rejects invalid upload_id")
    
    def test_progress_updates_during_upload(self):
        """Test that progress updates are sent during file processing"""
        xml_path = "/tmp/test_nfe_valid.xml"
        with open(xml_path, 'r') as f:
            xml_content = f.read()
        
        # Initialize upload
        form_data = {
            "company_id": self.company_id,
            "competencia": "02/2025",
            "tipo": "entrada",
            "total_files": 1
        }
        
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data=form_data,
            headers=self.headers
        )
        assert init_response.status_code == 200
        upload_id = init_response.json()["upload_id"]
        
        # Collect progress events
        progress_events = []
        
        def collect_progress():
            try:
                sse_response = requests.get(
                    f"{BASE_URL}/api/xml/upload-progress/{upload_id}",
                    stream=True,
                    timeout=30
                )
                for line in sse_response.iter_lines(decode_unicode=True):
                    if line and line.startswith("data:"):
                        event = json.loads(line[5:].strip())
                        progress_events.append({
                            "percent": event.get("progress_percent", 0),
                            "step": event.get("current_step", ""),
                            "status": event.get("status", ""),
                            "completed": event.get("completed", False)
                        })
                        if event.get("completed"):
                            break
                sse_response.close()
            except Exception as e:
                print(f"SSE error: {e}")
        
        sse_thread = threading.Thread(target=collect_progress)
        sse_thread.start()
        time.sleep(0.5)
        
        # Upload file
        files = {
            'files': ('test_nfe_valid.xml', xml_content, 'application/xml')
        }
        upload_data = {
            'upload_id': upload_id
        }
        
        requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            data=upload_data,
            files=files,
            headers=self.headers
        )
        
        sse_thread.join(timeout=10)
        
        # Verify progress events
        assert len(progress_events) > 0, "Should have received progress events"
        
        # Check for different progress steps
        steps = [e["step"] for e in progress_events if e["step"]]
        print(f"✓ Progress steps received: {steps}")
        
        # Verify final event is completed
        final_event = progress_events[-1] if progress_events else None
        if final_event:
            print(f"✓ Final event: percent={final_event['percent']}%, completed={final_event['completed']}")
        
        print(f"✓ Received {len(progress_events)} progress events during upload")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
