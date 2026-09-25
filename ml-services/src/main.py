import uuid
import time
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Header, Response, Request
from pydantic import BaseModel, Field

from src.config import settings
from src.fusion.bayesian_fusion import (
    BayesianConfidenceFusionEngine,
    SignalInput,
)
from src.perception.stubs import (
    score_fire_observation,
    score_flood_observation,
    score_nlp_triage,
)

app = FastAPI(
    title="Sanrakshan ML & Bayesian Fusion Services",
    version=settings.version,
    description="Machine Learning perception inference and Bayesian confidence fusion for disaster decision support.",
)

fusion_engine = BayesianConfidenceFusionEngine()


# Correlation ID Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID")
    if not correlation_id:
        correlation_id = str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    response: Response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response


# Health Endpoint
@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "sanrakshan-ml-services",
        "version": settings.version,
        "environment": settings.environment,
        "models": {
            "fire_detector": "yolov8s-fire-smoke-v1",
            "flood_segmentation": "unet-flood-segmentation-v2",
            "nlp_triage": "distilbert-nlp-triage-v1",
            "fusion_engine": "pymc-bayesian-beta-binomial-v1.4",
        },
    }


# Schemas
class FireInferenceRequest(BaseModel):
    frame_id: str
    thermal_frp: Optional[float] = 0.0


class FloodInferenceRequest(BaseModel):
    water_depth_cm: float
    rainfall_rate_mm: float


class NlpTriageRequest(BaseModel):
    text: str


class SignalModel(BaseModel):
    source_type: str
    raw_score: float = Field(..., ge=0.0, le=1.0)
    weight: float = Field(..., ge=0.0, le=1.0)
    description: str


class FusionRequest(BaseModel):
    signals: List[SignalModel]


@app.post("/ml/v1/predict/fire")
def predict_fire(req: FireInferenceRequest):
    return score_fire_observation(req.frame_id, req.thermal_frp)


@app.post("/ml/v1/predict/flood")
def predict_flood(req: FloodInferenceRequest):
    return score_flood_observation(req.water_depth_cm, req.rainfall_rate_mm)


@app.post("/ml/v1/predict/nlp")
def predict_nlp(req: NlpTriageRequest):
    return score_nlp_triage(req.text)


@app.post("/ml/v1/fusion/posterior")
def calculate_posterior_fusion(req: FusionRequest):
    domain_signals = [
        SignalInput(
            source_type=s.source_type,
            raw_score=s.raw_score,
            weight=s.weight,
            description=s.description,
        )
        for s in req.signals
    ]
    result = fusion_engine.fuse_signals(domain_signals)
    return {
        "posterior_probability": result.posterior_probability,
        "credible_interval": list(result.credible_interval),
        "state_recommendation": result.state_recommendation,
        "top_contributions": result.top_contributions,
        "model_version": "pymc-bayesian-beta-binomial-v1.4",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
