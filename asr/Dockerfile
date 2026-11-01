FROM python:3.12.3-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update \
    && apt-get install --no-install-recommends -y ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 asr \
    && useradd --system --uid 10001 --gid asr --home-dir /app --no-create-home asr
WORKDIR /app
COPY asr/requirements.lock ./asr/requirements.lock
RUN python -m pip install --no-cache-dir --requirement asr/requirements.lock
COPY asr/service.py asr/model-manifest.json ./asr/
RUN mkdir -p /tmp/asr && chown -R asr:asr /app /tmp/asr
USER asr
EXPOSE 8796
CMD ["python", "-m", "uvicorn", "asr.service:app", "--host", "0.0.0.0", "--port", "8796", "--workers", "1", "--no-access-log"]
