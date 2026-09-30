"""JanSetu API - Citizen Demand Intelligence as a Digital Public Good for India (Track 1: AI for Digital Public Infrastructure & Governance)."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import analytics, channels, clusters, connectors, insights, intake, meta, open311, projects, public, requests
from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.models import Area

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        empty = db.query(Area).count() == 0
    finally:
        db.close()
    if empty:
        from app.seed.seed import run
        logging.getLogger("jansetu").warning("Empty database: loading demo dataset...")
        run()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="JanSetu API",
    version="1.0.0",
    description=("Multilingual citizen development-demand aggregation, need-gap analytics and project "
                 "recommendation for policymakers. Open source (Apache-2.0), Digital Public Good."),
    license_info={"name": "Apache-2.0", "url": "https://www.apache.org/licenses/LICENSE-2.0"},
)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",")] + ["*"],
                   allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

for r in (meta, public, intake, requests, clusters, analytics, projects, insights, connectors, channels):
    app.include_router(r.router, prefix="/api")
app.include_router(open311.router)


class SPAStaticFiles(StaticFiles):
    """Falls back to index.html so client-side routes (/dashboard, /projects ...) work on refresh."""
    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except Exception:
            return await super().get_response("index.html", scope)


_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _dist.exists():
    app.mount("/", SPAStaticFiles(directory=_dist, html=True), name="web")
