from app.core.database import normalize_database_url


def test_normalize_database_url_only_replaces_scheme() -> None:
    original = "postgresql://user:p%40ss@host/database?sslmode=require"

    normalized = normalize_database_url(original)

    assert normalized == (
        "postgresql+psycopg://user:p%40ss@host/database?sslmode=require"
    )


def test_normalize_database_url_keeps_configured_driver() -> None:
    original = "postgresql+psycopg://user:password@host/database"

    assert normalize_database_url(original) == original

