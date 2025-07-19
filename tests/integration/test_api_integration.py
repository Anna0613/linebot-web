"""
Integration tests for API endpoints.
"""

import pytest
import requests
import time
from urllib.parse import urljoin


class TestAPIIntegration:
    """Integration tests for the API."""
    
    BASE_URL = "http://localhost:8000"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for integration tests."""
        # Wait for services to be ready
        self.wait_for_service(self.BASE_URL)
    
    def wait_for_service(self, url, timeout=30):
        """Wait for service to be available."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(urljoin(url, "/health"))
                if response.status_code == 200:
                    return
            except requests.exceptions.ConnectionError:
                pass
            time.sleep(1)
        pytest.fail(f"Service at {url} not available after {timeout} seconds")
    
    def test_health_endpoint(self):
        """Test health check endpoint."""
        response = requests.get(urljoin(self.BASE_URL, "/health"))
        assert response.status_code == 200
        assert "status" in response.json()
    
    def test_api_v1_endpoints(self):
        """Test API v1 base endpoints."""
        response = requests.get(urljoin(self.BASE_URL, "/api/v1/"))
        # Should return some form of API documentation or status
        assert response.status_code in [200, 404]  # 404 is acceptable if no root endpoint