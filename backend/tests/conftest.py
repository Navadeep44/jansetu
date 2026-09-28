import os
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_jansetu.db")

from app.main import app
from app.seed.seed import run as seed_db


@pytest.fixture(scope="session")
def client():
    seed_db()
    with TestClient(app) as c:
        yield c
