from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import shutil
import subprocess
import tempfile
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.datastructures import UploadFile

MODEL_DIR = Path(os.environ.get("ASR_MODEL_DIR", "./model")).resolve()
TEMP_DIR = Path(os.environ.get("ASR_TEMP_DIR", "./tmp")).resolve()
FFMPEG = os.environ.get("ASR_FFMPEG_PATH", "")
TOKEN = os.environ.get("ASR_SERVICE_TOKEN", "")
MAX_UPLOAD = int(os.environ.get("ASR_MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
MAX_SECONDS = int(os.environ.get("ASR_MAX_AUDIO_SECONDS", "60"))
NUM_THREADS = int(os.environ.get("ASR_NUM_THREADS", "2"))
DEADLINE_SECONDS = float(os.environ.get("ASR_REQUEST_TIMEOUT_SECONDS", "45"))
SAMPLE_RATE = 16_000
MAX_PCM_BYTES = SAMPLE_RATE * 2 * MAX_SECONDS

recognizer: Any = None
jobs: asyncio.Queue[tuple[bytes, str, asyncio.Future[dict[str, str]], float]] | None = None
ready = False


@dataclass
class SafeFailure(Exception):
    code: str
    status: int


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _load_model() -> Any:
    import sherpa_onnx

    manifest = json.loads(Path(__file__).with_name("model-manifest.json").read_text(encoding="utf-8"))
    if manifest.get("revision") != "a6039be7cee829a9044a69ac0ebaf1c191217c97":
        raise RuntimeError("ASR model revision is not pinned")
    required = ("encoder.int8.onnx", "decoder.onnx", "joiner.onnx", "tokens.txt")
    for filename in required:
        path = MODEL_DIR / filename
        if not path.is_file():
            raise RuntimeError("ASR model files are incomplete")
        expected_hash = manifest["files"].get(filename)
        if not expected_hash or _sha256_file(path) != expected_hash:
            raise RuntimeError("ASR model integrity check failed")
    return sherpa_onnx.OfflineRecognizer.from_transducer(
        tokens=str(MODEL_DIR / "tokens.txt"),
        encoder=str(MODEL_DIR / "encoder.int8.onnx"),
        decoder=str(MODEL_DIR / "decoder.onnx"),
        joiner=str(MODEL_DIR / "joiner.onnx"),
        num_threads=NUM_THREADS,
        sample_rate=SAMPLE_RATE,
        feature_dim=80,
        decoding_method="greedy_search",
        model_type="nemo_transducer",
        provider="cpu",
    )


def _ffmpeg_path() -> str:
    if FFMPEG:
        return FFMPEG
    system = shutil.which("ffmpeg")
    if system:
        return system
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def _decode_audio(payload: bytes, deadline: float) -> list[float]:
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=TEMP_DIR, suffix=".audio", delete=False) as source:
            path = source.name
            source.write(payload)
        command = [
            _ffmpeg_path(), "-nostdin", "-hide_banner", "-loglevel", "error", "-i", path,
            "-vn", "-t", str(MAX_SECONDS + 1), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "pipe:1",
        ]
        try:
            decoded = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                timeout=max(0.1, deadline - time.monotonic()),
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise SafeFailure("ASR_TIMEOUT", 504) from exc
        pcm = decoded.stdout
        if len(pcm) > MAX_PCM_BYTES:
            raise SafeFailure("AUDIO_TOO_LONG", 413)
        if decoded.returncode != 0 or len(pcm) < SAMPLE_RATE * 2 // 10 or len(pcm) % 2:
            raise SafeFailure("AUDIO_INVALID", 400)
        import array

        samples = array.array("h")
        samples.frombytes(pcm)
        return [sample / 32768.0 for sample in samples]
    except FileNotFoundError as exc:
        raise SafeFailure("ASR_NOT_READY", 503) from exc
    finally:
        if path:
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass


def _transcribe(payload: bytes, deadline: float) -> str:
    if recognizer is None:
        raise SafeFailure("ASR_NOT_READY", 503)
    samples = _decode_audio(payload, deadline)
    stream = recognizer.create_stream()
    stream.accept_waveform(SAMPLE_RATE, samples)
    if time.monotonic() >= deadline:
        raise SafeFailure("ASR_TIMEOUT", 504)
    recognizer.decode_stream(stream)
    text = stream.result.text.strip()
    if not text:
        raise SafeFailure("NO_SPEECH", 422)
    return text[:4000]


async def _worker() -> None:
    while True:
        assert jobs is not None
        payload, request_id, result, deadline = await jobs.get()
        try:
            if result.cancelled():
                continue
            text = await asyncio.to_thread(_transcribe, payload, deadline)
            if not result.cancelled():
                result.set_result({"requestId": request_id, "engine": "sherpa", "text": text})
        except SafeFailure as exc:
            if not result.cancelled():
                result.set_result({"requestId": request_id, "code": exc.code, "status": str(exc.status)})
        except Exception:
            if not result.cancelled():
                result.set_result({"requestId": request_id, "code": "ASR_FAILED", "status": "500"})
        finally:
            jobs.task_done()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global recognizer, jobs, ready
    if not TOKEN or len(TOKEN) < 32:
        raise RuntimeError("ASR_SERVICE_TOKEN must contain at least 32 characters")
    if MAX_UPLOAD > 8 * 1024 * 1024 or MAX_SECONDS != 60 or NUM_THREADS < 1 or NUM_THREADS > 2:
        raise RuntimeError("ASR limits exceed configured policy")
    jobs = asyncio.Queue(maxsize=2)
    recognizer = await asyncio.to_thread(_load_model)
    ready = True
    worker = asyncio.create_task(_worker(), name="asr-single-worker")
    try:
        yield
    finally:
        ready = False
        worker.cancel()
        await asyncio.gather(worker, return_exceptions=True)
        recognizer = None
        jobs = None


app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/ready")
async def readiness() -> dict[str, bool]:
    if not ready:
        raise HTTPException(status_code=503, detail="not_ready")
    return {"ready": True}


@app.post("/transcribe")
async def transcribe(request: Request, x_asr_token: str = Header(default=""), x_request_id: str = Header(default="")) -> JSONResponse:
    if not hmac.compare_digest(x_asr_token, TOKEN):
        raise HTTPException(status_code=401, detail="unauthorized")
    if len(x_request_id) > 80 or not x_request_id:
        raise HTTPException(status_code=400, detail="invalid_request")
    declared = request.headers.get("content-length")
    if declared and (not declared.isdigit() or int(declared) > MAX_UPLOAD + 64 * 1024):
        raise HTTPException(status_code=413, detail="too_large")
    try:
        form = await request.form(max_files=1, max_fields=0, max_part_size=MAX_UPLOAD)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="invalid_audio") from exc
    audio = form.get("audio")
    if not isinstance(audio, UploadFile):
        raise HTTPException(status_code=400, detail="invalid_audio")
    payload = await audio.read(MAX_UPLOAD + 1)
    await audio.close()
    if not payload or len(payload) > MAX_UPLOAD:
        raise HTTPException(status_code=413 if payload else 400, detail="invalid_audio")
    future: asyncio.Future[dict[str, str]] = asyncio.get_running_loop().create_future()
    try:
        if jobs is None:
            raise HTTPException(status_code=503, detail="ASR_NOT_READY")
        jobs.put_nowait((payload, x_request_id, future, time.monotonic() + DEADLINE_SECONDS))
    except asyncio.QueueFull:
        raise HTTPException(status_code=503, detail="ASR_BUSY")
    try:
        result = await asyncio.wait_for(asyncio.shield(future), timeout=DEADLINE_SECONDS + 1)
    except TimeoutError:
        future.cancel()
        raise HTTPException(status_code=504, detail="ASR_TIMEOUT")
    if "code" in result:
        return JSONResponse({"requestId": result["requestId"], "code": result["code"]}, status_code=int(result["status"]))
    return JSONResponse(result)
