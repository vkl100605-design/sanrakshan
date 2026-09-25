FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8001

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

EXPOSE 8001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

ENTRYPOINT ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
