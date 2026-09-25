import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "Sanrakshan ML & Bayesian Confidence Fusion Service"
    version: str = "1.0.0"
    environment: str = os.getenv("ENVIRONMENT", "local")
    port: int = int(os.getenv("PORT", "8001"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
