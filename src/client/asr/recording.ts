export type StopReason = "manual" | "silence" | "no-speech" | "maximum" | "error";
export type RecordedAudio = { blob: Blob; durationMs: number; reason: StopReason };

export type RecordingHandle = {
  stop: (reason?: StopReason) => void;
  cancel: () => void;
  finished: Promise<RecordedAudio>;
};

type RecordingOptions = {
  silenceMs: number;
  noSpeechMs: number;
  maxDurationMs: number;
  onTick?: (seconds: number) => void;
  onLevel?: (level: number) => void;
};

const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];

function recordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") throw new Error("recording-unsupported");
  return RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export async function startSherpaRecording(options: RecordingOptions): Promise<RecordingHandle> {
  const mimeType = recordingMimeType();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder;
  try {
    context = new AudioContext();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const startedAt = Date.now();
    let stopped = false;
    let cancelled = false;
    let recorderFailed = false;
    let reason: StopReason = "manual";
    let noiseFloor = 0.004;
    let speechMs = 0;
    let silenceMs = 0;
    let elapsedMs = 0;
    let lastLevelTime = startedAt;
    let resolveFinished: (recording: RecordedAudio) => void;
    let rejectFinished: (error: Error) => void;
    const finished = new Promise<RecordedAudio>((resolve, reject) => { resolveFinished = resolve; rejectFinished = reject; });

    const stop = (stopReason: StopReason = "manual") => {
      if (stopped) return;
      stopped = true;
      reason = stopReason;
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onerror = () => { recorderFailed = true; stop("error"); };
    recorder.onstop = () => {
      if (timer) clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      void context?.close();
      if (cancelled) { rejectFinished(new Error("recording-cancelled")); return; }
      if (recorderFailed) { rejectFinished(new Error("recording-failed")); return; }
      if (speechMs < 300) reason = "no-speech";
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "application/octet-stream" });
      if (!blob.size) { rejectFinished(new Error("recording-empty")); return; }
      resolveFinished({ blob, durationMs: Math.max(0, Date.now() - startedAt), reason });
    };

    const cancel = () => {
      cancelled = true;
      if (recorder.state !== "inactive") stop("manual");
    };
    recorder.start(250);
    timer = setInterval(() => {
      const now = Date.now();
      const frameMs = Math.min(150, now - lastLevelTime);
      lastLevelTime = now;
      elapsedMs = now - startedAt;
      options.onTick?.(Math.floor(elapsedMs / 1000));
      const frame = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(frame);
      let sum = 0;
      for (const value of frame) sum += value * value;
      const rms = Math.sqrt(sum / frame.length);
      options.onLevel?.(Math.min(100, Math.round(rms * 500)));
      const active = rms > Math.max(0.012, noiseFloor * 2.5 + 0.004);
      if (active) {
        speechMs += frameMs;
        silenceMs = 0;
      } else {
        if (speechMs < 300) noiseFloor = noiseFloor * 0.88 + rms * 0.12;
        if (speechMs >= 300) silenceMs += frameMs;
      }
      if (elapsedMs >= options.maxDurationMs) stop("maximum");
      else if (speechMs < 300 && elapsedMs >= options.noSpeechMs) stop("no-speech");
      else if (speechMs >= 300 && silenceMs >= options.silenceMs) stop("silence");
    }, 100);

    return { stop, cancel, finished };
  } catch (error) {
    if (timer) clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    await context?.close().catch(() => undefined);
    throw error;
  }
}
