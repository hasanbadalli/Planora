from fastapi.testclient import TestClient
import pytest

from app.main import app


client = TestClient(app)


def test_application_health() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "Planora API"
    assert payload["environment"] == "development"
    assert payload["timestamp"]


def test_local_frontend_origin_is_allowed() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == (
        "http://localhost:3000"
    )


def test_database_health_hides_internal_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fail_database_check() -> None:
        raise RuntimeError("sensitive database details")

    monkeypatch.setattr(
        "app.api.routes.health.check_database_connection",
        fail_database_check,
    )

    response = client.get("/api/v1/health/database")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "code": "DATABASE_UNAVAILABLE",
            "message": "Database connection is unavailable.",
        }
    }
    assert "sensitive" not in response.text
