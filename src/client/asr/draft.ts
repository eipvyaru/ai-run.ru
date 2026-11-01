export function mergeTranscript(base: string, transcript: string) {
  const clean = transcript.trim();
  return `${base}${base && clean ? " " : ""}${clean}`.slice(0, 2000);
}
