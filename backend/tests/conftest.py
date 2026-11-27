import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    # These two HTTP smoke tests only exercise static routes. Database and
    # lifespan integration use the disposable PostgreSQL fixture in the Worker suite.
    from app.main import app
    client = TestClient(app, base_url="http://localhost")
    try:
        yield client
    finally:
        client.close()
