# ==============================================================================
# CA-OS Backend — Dockerfile
# Base: python:3.12-slim  |  Non-root user: appuser  |  Port: 8000
# ==============================================================================

FROM python:3.12-slim

# Reproducible, clean Python runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# ---------------------------------------------------------------------------
# System dependencies
#   libmagic1   — required by python-magic (MIME type detection)
#   build-essential / gcc — needed to compile certain Python C extensions
#   curl        — used by HEALTHCHECK
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Install Python dependencies
# --no-cache-dir keeps the image lean; copy requirements first to leverage
# Docker layer caching (only re-runs when requirements.txt changes).
# ---------------------------------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY . .

# ---------------------------------------------------------------------------
# Security: run as non-root user
# ---------------------------------------------------------------------------
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose API runtime port
EXPOSE 8000

# ---------------------------------------------------------------------------
# Health check — hits /api/health every 30 s; 3 consecutive failures = unhealthy
# ---------------------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run API via Uvicorn production server (single worker; scale via orchestrator)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
