"""
Test suite for backend modular routers and core configuration.
Verifies catalog endpoints and configuration resolver.
"""

from fastapi.testclient import TestClient
from app import app
from app.core import get_allowed_media_roots, get_cors_origins

client = TestClient(app)

def test_catalog_teams_endpoint():
    """Verify /api/catalog/teams returns meta team compositions."""
    response = client.get("/api/catalog/teams")
    assert response.status_code == 200
    data = response.json()
    assert "Mavuika" in data
    assert len(data["Mavuika"]) == 4

def test_catalog_archetypes_endpoint():
    """Verify /api/catalog/archetypes returns archetype arrays."""
    response = client.get("/api/catalog/archetypes")
    assert response.status_code == 200
    data = response.json()
    assert "Mavuika" in data
    assert "OVERLOAD" in data["Mavuika"]

def test_core_config_helpers():
    """Verify core config returns valid allowed roots and origins."""
    roots = get_allowed_media_roots()
    assert len(roots) > 0
    origins = get_cors_origins()
    assert "http://127.0.0.1:7860" in origins
