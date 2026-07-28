"""Vercel serverless entrypoint: exposes the FastAPI ASGI app."""

from app.main import app as app  # noqa: F401
