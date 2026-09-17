"""
Pipeline correctness and API consistency test suite for Genshin Abyss Studio.
Verifies IntermissionResult data contract, route uniqueness, and module imports.
"""

import pytest
from pathlib import Path
from execution.auto_edit_abyss import IntermissionResult, launch_capcut
from app import app

def test_intermission_result_contract():
    """Verify IntermissionResult supports tuple unpacking, dict keys, and attributes."""
    res = IntermissionResult(start_s=45.0, end_s=50.0, dur_s=120.0, confidence=0.92)

    # 1. Tuple unpacking compatibility
    start, end = res
    assert start == 45.0
    assert end == 50.0

    # 2. Attribute access
    assert res.h1_dur == 45.0
    assert res.h2_dur == 70.0  # 120.0 - 50.0
    assert res.trimmed == 5.0  # 50.0 - 45.0
    assert res.confidence == 0.92

    # 3. Dict-style access
    assert res["h1_dur"] == 45.0
    assert res["h2_dur"] == 70.0
    assert res["trimmed"] == 5.0
    assert res["confidence"] == 0.92

def test_route_uniqueness():
    """Verify no duplicate (method, path) route combinations exist in FastAPI."""
    seen_routes = set()
    duplicates = []
    for route in app.routes:
        methods = getattr(route, "methods", None) or {"GET"}
        for method in methods:
            route_key = (method, route.path)
            if route_key in seen_routes:
                duplicates.append(route_key)
            seen_routes.add(route_key)

    assert len(duplicates) == 0, f"Duplicate routes found: {duplicates}"

def test_auto_edit_abyss_has_subprocess():
    """Verify execution/auto_edit_abyss.py imports subprocess without NameError."""
    import execution.auto_edit_abyss as aea
    assert hasattr(aea, "subprocess")
