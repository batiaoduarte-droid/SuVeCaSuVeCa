export function decodeBase64Audio(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

/** Gemini PCM is signed 16-bit little endian. RIFF/WAV has a separate 44-byte header. */
export function pcmToWavBuffer(pcm: Uint8Array, sampleRate = 24000): ArrayBuffer {
  if (!pcm.length || pcm.length % 2 || !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new Error('Áudio PCM inválido.');
  const buffer = new ArrayBuffer(44 + pcm.length);
  const view = new DataView(buffer);
  const ascii = (offset: number, value: string) => [...value].forEach((character, i) => view.setUint8(offset + i, character.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + pcm.length, true); ascii(8, 'WAVE'); ascii(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, pcm.length, true);
  new Uint8Array(buffer, 44).set(pcm);
  return buffer;
}

export function pcmSampleRate(mimeType: string): number {
  return Number(/(?:^|;)\s*rate=(\d+)/i.exec(mimeType)?.[1] || 24000);
}
