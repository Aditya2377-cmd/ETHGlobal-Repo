# =================================================================
# PerPay AI Gateway - Production Cloud Run Container
# =================================================================
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY gateway/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy gateway source code
COPY gateway /app/gateway

# Expose default port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start Uvicorn bound to 0.0.0.0 and dynamic Cloud Run $PORT
CMD ["sh", "-c", "exec uvicorn gateway.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
