import { authenticatedFetch } from '../authenticatedFetch';
import { toLearnerFacingContent } from '../learnerContent';
import { decodeBase64Audio, pcmSampleRate, pcmToWavBuffer } from './wavUtils';

/** One cancellable player per consumer. Late HTTP responses cannot restart stopped speech. */
export class TTSPlayer {
  private revision = 0;
  private abort?: AbortController;
  private audio?: HTMLAudioElement;
  private utterance?: SpeechSynthesisUtterance;
  private url?: string;
  stop() {
    this.revision++;
    this.abort?.abort(); this.abort = undefined;
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.pause(); this.audio = undefined; }
    if (this.utterance) {
      this.utterance.onend = null; this.utterance.onerror = null;
      window.speechSynthesis?.cancel(); this.utterance = undefined;
    }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = undefined; }
  }
  async speak(text: string, callbacks: { onReady?: () => void; onEnd?: () => void } = {}) {
    this.stop();
    const revision = this.revision;
    const active = () => revision === this.revision;
    const clean = toLearnerFacingContent(text).trim();
    const finish = () => { if (active()) { this.stop(); callbacks.onEnd?.(); } };
    if (!clean) { finish(); return; }
    let fallingBack = false;
    const fallback = () => {
      if (!active() || fallingBack) return;
      fallingBack = true;
      if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.pause(); }
      callbacks.onReady?.();
      if (!window.speechSynthesis) { finish(); return; }
      try {
        const utterance = new SpeechSynthesisUtterance(clean);
        this.utterance = utterance; utterance.lang = 'pt-BR';
        utterance.onend = finish; utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      } catch { finish(); }
    };
    // The server limit is explicit. Read the complete text locally instead of truncating it.
    if (clean.length > 1200) { fallback(); return; }
    this.abort = new AbortController();
    try {
      const response = await authenticatedFetch('/api/gemini/tts', { method: 'POST', signal: this.abort.signal, body: JSON.stringify({ text: clean }) });
      const result = await response.json();
      if (!active()) return;
      if (!response.ok || typeof result.audioBase64 !== 'string') { fallback(); return; }
      const mime = typeof result.mimeType === 'string' ? result.mimeType : 'audio/wav';
      const bytes = decodeBase64Audio(result.audioBase64);
      const pcm = /^audio\/(?:pcm|l16)(?:;|$)/i.test(mime);
      const body = pcm ? pcmToWavBuffer(bytes, pcmSampleRate(mime)) : bytes.buffer as ArrayBuffer;
      this.url = URL.createObjectURL(new Blob([body], { type: pcm ? 'audio/wav' : mime }));
      this.audio = new Audio(this.url);
      this.audio.onended = finish; this.audio.onerror = fallback;
      callbacks.onReady?.();
      await this.audio.play();
    } catch { fallback(); }
  }
}
