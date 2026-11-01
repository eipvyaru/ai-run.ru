import tempfile
import unittest
import wave
import asyncio
from pathlib import Path
from unittest.mock import patch

import service
from fastapi import HTTPException
from starlette.requests import Request
from service import MAX_PCM_BYTES, MAX_UPLOAD, SAMPLE_RATE, SafeFailure, _decode_audio, _load_model

TEMP_ROOT = Path(__file__).parent / ".test-tmp"
TEMP_ROOT.mkdir(exist_ok=True)


class ServiceBoundaryTests(unittest.TestCase):
    def test_limits_are_within_approved_bounds(self) -> None:
        self.assertEqual(MAX_UPLOAD, 8 * 1024 * 1024)
        self.assertEqual(MAX_PCM_BYTES, 60 * SAMPLE_RATE * 2)

    def test_model_missing_file_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory(dir=TEMP_ROOT) as directory:
            with patch("service.MODEL_DIR", Path(directory)):
                with self.assertRaisesRegex(RuntimeError, "incomplete"):
                    _load_model()

    def test_invalid_audio_is_rejected_and_temp_file_removed(self) -> None:
        with tempfile.TemporaryDirectory(dir=TEMP_ROOT) as directory:
            temporary = Path(directory)
            with patch.object(service, "TEMP_DIR", temporary):
                with self.assertRaises(SafeFailure) as failure:
                    _decode_audio(b"not audio", __import__("time").monotonic() + 5)
            self.assertEqual(failure.exception.code, "AUDIO_INVALID")
            self.assertEqual(list(temporary.iterdir()), [])

    def test_more_than_sixty_seconds_is_rejected(self) -> None:
        import time

        with tempfile.TemporaryDirectory(dir=TEMP_ROOT) as directory:
            source = Path(directory) / "long.wav"
            with wave.open(str(source), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(SAMPLE_RATE)
                output.writeframes(b"\0\0" * (61 * SAMPLE_RATE))
            with patch.object(service, "TEMP_DIR", Path(directory)):
                with self.assertRaises(SafeFailure) as failure:
                    _decode_audio(source.read_bytes(), time.monotonic() + 15)
            self.assertEqual(failure.exception.code, "AUDIO_TOO_LONG")
            self.assertEqual([p.name for p in Path(directory).iterdir()], ["long.wav"])


class ServiceAuthorizationTests(unittest.IsolatedAsyncioTestCase):
    async def test_unauthorized_request_is_rejected_before_reading_body(self) -> None:
        body_read = False

        async def receive() -> dict[str, object]:
            nonlocal body_read
            body_read = True
            return {"type": "http.request", "body": b"sensitive body", "more_body": False}

        scope: dict[str, object] = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/transcribe",
            "raw_path": b"/transcribe",
            "query_string": b"",
            "root_path": "",
            "headers": [(b"content-length", b"14")],
            "client": ("127.0.0.1", 12345),
            "server": ("127.0.0.1", 8794),
        }
        request = Request(scope, receive)
        with patch.object(service, "TOKEN", "x" * 48):
            with self.assertRaises(HTTPException) as failure:
                await service.transcribe(request, "wrong", "request-1")
        self.assertEqual(failure.exception.status_code, 401)
        self.assertFalse(body_read)


if __name__ == "__main__":
    unittest.main()
