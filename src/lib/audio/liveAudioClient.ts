import { authenticatedFetch } from '../authenticatedFetch';
import { createAudioWorkletBlobUrl, PCM16_WORKLET_NAME, arrayBufferToBase64 } from './audioProcessor.worklet';
import { decodeBase64Audio, pcmSampleRate } from './wavUtils';

export type LiveStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'error';
export class LiveAudioClient {
  private revision = 0;
  private socket?: WebSocket;
  private stream?: MediaStream;
  private context?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private processor?: AudioWorkletNode;
  private sources = new Set<AudioBufferSourceNode>();
  private scheduled = 0;
  private abort?: AbortController;
  private timeout?: ReturnType<typeof setTimeout>;
  constructor(private options: { onStatus: (status: LiveStatus) => void; onText: (text: string) => void; onError: (message: string) => void }) {}

  async start(contextText: string) {
    this.stop();
    const revision = this.revision;
    const active = () => revision === this.revision;
    this.options.onStatus('connecting');
    this.timeout = setTimeout(() => { if (active()) this.fail(); }, 30_000);
    try {
      // Resume during the user gesture, before network awaits, for mobile browsers.
      this.context = new AudioContext({ sampleRate: 16000 });
      await this.context.resume();
      if (!active()) return;
      this.abort = new AbortController();
      const response = await authenticatedFetch('/api/gemini/live-ticket', { method: 'POST', signal: this.abort.signal });
      const result = await response.json();
      if (!active()) return;
      if (!response.ok || typeof result.ticket !== 'string') throw new Error('Entre na sua conta para usar a conversa por voz.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      if (!active()) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const context = this.context!;
      if (context.sampleRate !== 16000) throw new Error('Este navegador não suporta a taxa de áudio necessária.');
      const blob = createAudioWorkletBlobUrl();
      try { await context.audioWorklet.addModule(blob); } finally { URL.revokeObjectURL(blob); }
      if (!active()) return;
      this.source = context.createMediaStreamSource(stream);
      this.processor = new AudioWorkletNode(context, PCM16_WORKLET_NAME);
      const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/gemini/live?ticket=${encodeURIComponent(result.ticket)}`);
      this.socket = socket;
      socket.onmessage = event => {
        if (!active()) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'error') { this.fail(); return; }
          if (data.type === 'ready') {
            clearTimeout(this.timeout);
            socket.send(JSON.stringify({ type: 'text', text: contextText.slice(0, 4000) }));
            this.processor!.port.onmessage = ({ data: pcm }) => {
              if (active() && socket.readyState === WebSocket.OPEN) {
                if (socket.bufferedAmount > 128_000) { this.fail(); return; }
                socket.send(JSON.stringify({ type: 'audio', data: arrayBufferToBase64(pcm) }));
              }
            };
            this.source!.connect(this.processor!); this.processor!.connect(context.destination);
            this.options.onStatus('connected');
          }
          const content = data.serverContent;
          if (content?.interrupted) { this.clearPlayback(); this.options.onStatus('connected'); }
          for (const part of content?.modelTurn?.parts || []) {
            if (typeof part.text === 'string') this.options.onText(part.text);
            if (part.inlineData?.data) this.play(part.inlineData.data, part.inlineData.mimeType || 'audio/pcm;rate=24000');
          }
        } catch { this.fail(); }
      };
      socket.onerror = () => { if (active()) this.fail(); };
      socket.onclose = () => { if (active()) this.stop(); };
    } catch (error) { if (active()) this.fail(error instanceof Error ? error.message : undefined); }
  }
  private play(base64: string, mime: string) {
    const context = this.context;
    if (!context) return;
    const bytes = decodeBase64Audio(base64);
    const rate = pcmSampleRate(mime);
    if (!bytes.length || bytes.length % 2 || rate < 8000 || rate > 96000) throw new Error('Invalid PCM');
    const buffer = context.createBuffer(1, bytes.length / 2, rate);
    const view = new DataView(bytes.buffer);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    if (this.scheduled - context.currentTime > 30) throw new Error('Audio queue exceeded');
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
    this.sources.add(source); this.options.onStatus('speaking');
    source.onended = () => { source.disconnect(); this.sources.delete(source); if (!this.sources.size && this.socket) this.options.onStatus('connected'); };
    const start = Math.max(context.currentTime, this.scheduled);
    source.start(start); this.scheduled = start + buffer.duration;
  }
  private clearPlayback() {
    for (const source of this.sources) { source.onended = null; try { source.stop(); source.disconnect(); } catch { /* already ended */ } }
    this.sources.clear(); this.scheduled = this.context?.currentTime || 0;
  }
  private fail(message = 'Não foi possível manter a conversa por voz. Verifique a conexão e tente novamente.') {
    this.stop(); this.options.onError(message); this.options.onStatus('error');
  }
  stop() {
    this.revision++; clearTimeout(this.timeout); this.abort?.abort();
    if (this.socket) { this.socket.onclose = null; this.socket.onerror = null; this.socket.onmessage = null; try { this.socket.close(); } catch { /* failed handshake */ } this.socket = undefined; }
    if (this.processor) { this.processor.port.onmessage = null; this.processor.disconnect(); this.processor = undefined; }
    this.source?.disconnect(); this.source = undefined;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.clearPlayback();
    void this.context?.close().catch(() => {}); this.context = undefined;
    this.options.onStatus('idle');
  }
}
