export type BrowserTranscriptError = { name: string; message: string };

type SpeechResult = { readonly isFinal: boolean; readonly 0: { readonly transcript: string } };
type SpeechRecognitionEvent = Event & { readonly results: ArrayLike<SpeechResult> };
type SpeechRecognitionErrorEvent = Event & { readonly error: string };

export type SpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: (audioTrack?: MediaStreamTrack) => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
export type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function supportsRecordedTrackRecognition(userAgent = navigator.userAgent): boolean {
  if (/Android|iPhone|iPad|iPod|CriOS|FxiOS/i.test(userAgent)) return false;
  const edge = userAgent.match(/Edg\/(\d+)/);
  const opera = userAgent.match(/OPR\/(\d+)/);
  const chrome = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/);
  if (edge) return Number(edge[1]) >= 135;
  if (opera) return Number(opera[1]) >= 120;
  if (chrome) return Number(chrome[1]) >= 135;
  return false;
}

export function speechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  return typeof window === "undefined" ? null : window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function recognizeRecordedBlob(blob: Blob, onTranscript: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const Recognition = speechRecognitionConstructor();
  if (!Recognition || !supportsRecordedTrackRecognition()) return Promise.reject(new Error("browser-track-unsupported"));

  return new Promise((resolve, reject) => {
    const recognition = new Recognition();
    const context = new AudioContext();
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(blob);
    const destination = context.createMediaStreamDestination();
    audio.src = objectUrl;
    audio.preload = "auto";
    audio.onloadeddata = () => { void context.resume(); };
    const source = context.createMediaElementSource(audio);
    source.connect(destination);
    const track = destination.stream.getAudioTracks()[0];
    let settled = false;
    let transcript = "";
    const cleanup = () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      audio.pause();
      audio.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
      destination.stream.getTracks().forEach((entry) => entry.stop());
      source.disconnect();
      void context.close();
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (transcript.trim()) resolve(transcript.trim());
      else reject(new Error("no-speech"));
    };
    const timeout = window.setTimeout(() => fail(new Error("timeout")), 65000);
    const onAbort = () => fail(new Error("aborted"));
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) { onAbort(); return; }
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let next = "";
      for (let index = 0; index < event.results.length; index += 1) next += event.results[index][0].transcript;
      transcript = next.slice(0, 4000);
      onTranscript(transcript);
    };
    recognition.onerror = (event) => fail(new Error(event.error || "recognition-failed"));
    recognition.onend = finish;
    audio.onended = () => recognition.stop();
    try {
      recognition.start(track);
      void audio.play().catch((error: unknown) => fail(error instanceof Error ? error : new Error("playback-failed")));
    } catch (error) {
      fail(error instanceof Error ? error : new Error("recognition-start-failed"));
    }
  });
}

export function recognizeMicrophone(onTranscript: (text: string) => void, onError: (error: BrowserTranscriptError) => void, onEnd: () => void): { stop: () => void; abort: () => void } {
  const Recognition = speechRecognitionConstructor();
  if (!Recognition) throw new Error("browser-asr-unsupported");
  const recognition = new Recognition();
  recognition.lang = "ru-RU";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
    onTranscript(transcript.slice(0, 4000));
  };
  recognition.onerror = (event) => onError({ name: event.error, message: "" });
  recognition.onend = onEnd;
  recognition.start();
  return { stop: () => recognition.stop(), abort: () => recognition.abort() };
}
