from __future__ import annotations

import hashlib
import json
import os
import sys
import time
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def main() -> int:
    model_dir = Path(os.environ.get("ASR_MODEL_DIR", "")).resolve()
    sample = Path(os.environ.get("ASR_TEST_WAV", str(model_dir / "test_wavs" / "example.wav"))).resolve()
    if not model_dir.is_dir() or not sample.is_file():
        print("ASR model or WAV sample is unavailable", file=sys.stderr)
        return 2
    manifest_path = model_dir / "manifest.json"
    if not manifest_path.is_file():
        print("Model manifest is unavailable", file=sys.stderr)
        return 2
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected = {item["file"]: item["sha256"] for item in manifest["files"]}
    for name in ("encoder.int8.onnx", "decoder.onnx", "joiner.onnx", "tokens.txt"):
        path = model_dir / name
        if name not in expected or hashlib.sha256(path.read_bytes()).hexdigest() != expected[name]:
            print(f"ASR model integrity check failed: {name}", file=sys.stderr)
            return 2
    try:
        sample_relative = sample.relative_to(model_dir).as_posix()
        sample_expected = expected[sample_relative]
    except (ValueError, KeyError):
        print("Smoke WAV must be listed in the model manifest", file=sys.stderr)
        return 2
    sample_hash = hashlib.sha256(sample.read_bytes()).hexdigest()
    if sample_hash != sample_expected:
        print("ASR sample integrity check failed", file=sys.stderr)
        return 2

    from asr.service import _load_model

    with wave.open(str(sample), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != 16000:
            print("Smoke WAV must be mono PCM16 at 16 kHz", file=sys.stderr)
            return 2
        rate = wav.getframerate()
        raw = wav.readframes(wav.getnframes())
    import array

    samples = array.array("h")
    samples.frombytes(raw)
    recognizer = _load_model()
    stream = recognizer.create_stream()
    stream.accept_waveform(rate, [sample_value / 32768.0 for sample_value in samples])
    started = time.perf_counter()
    recognizer.decode_stream(stream)
    elapsed_ms = round((time.perf_counter() - started) * 1000)
    transcript = stream.result.text.strip()
    if not transcript:
        print("ASR model returned an empty transcript", file=sys.stderr)
        return 1
    print(json.dumps({"result": "passed", "revision": manifest["revision"], "runtime": "sherpa-onnx 1.13.8", "durationSeconds": round(len(samples) / rate, 2), "decodeMilliseconds": elapsed_ms, "transcriptCharacters": len(transcript), "transcript": "omitted"}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
