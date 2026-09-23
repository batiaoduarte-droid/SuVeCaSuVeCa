import { afterEach, describe, expect, it, vi } from 'vitest';
import { pcmToWavBuffer } from './wavUtils';
import { TTSPlayer } from './ttsService';
import { resolveModelForTask } from '../geminiTaskMapping';
import { LiveAudioClient } from './liveAudioClient';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../authenticatedFetch', () => ({ authenticatedFetch: mocks.fetch }));
afterEach(() => { vi.unstubAllGlobals(); });

describe('audio contracts', () => {
  it('encapsulates PCM samples without changing bytes and rejects incomplete samples', () => {
    const pcm = new Uint8Array([0, 128, 255, 127]);
    const result = pcmToWavBuffer(pcm, 16000);
    const view = new DataView(result);
    expect(new TextDecoder().decode(new Uint8Array(result, 0, 4))).toBe('RIFF');
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(40, true)).toBe(4);
    expect(new Uint8Array(result, 44)).toEqual(pcm);
    expect(() => pcmToWavBuffer(new Uint8Array([1]))).toThrow();
  });
  it('does not restart playback or run completion after cancellation during HTTP', async () => {
    let resolve!: (value: Response) => void;
    mocks.fetch.mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    const audio = vi.fn(); vi.stubGlobal('Audio', audio);
    const player = new TTSPlayer(); const end = vi.fn();
    const request = player.speak('Texto de teste.', { onEnd: end });
    const signal = mocks.fetch.mock.calls.at(-1)![1].signal;
    player.stop();
    resolve(new Response(JSON.stringify({ audioBase64: 'AAAA', mimeType: 'audio/pcm;rate=24000' })));
    await request;
    expect(signal.aborted).toBe(true); expect(audio).not.toHaveBeenCalled(); expect(end).not.toHaveBeenCalled();
  });
  it('falls back to the complete text after a failed authenticated request', async () => {
    mocks.fetch.mockResolvedValue(new Response('{}', { status: 401 }));
    const speak = vi.fn(); vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    const end = vi.fn(); const player = new TTSPlayer();
    await player.speak('A resposta (com condição) deve ser preservada.', { onEnd: end });
    const utterance = speak.mock.calls[0][0];
    expect(utterance.text).toContain('(com condição)'); utterance.onend();
    expect(end).toHaveBeenCalledTimes(1);
  });
  it('does not accept a voice model for text tasks or a text model for speech', () => {
    expect(resolveModelForTask('tts', 'gemini-3.8-flash')).toBe('gemini-3.1-flash-tts-preview');
    expect(resolveModelForTask('questions', 'gemini-3.1-flash-live-preview')).toBe('gemini-3.8-flash');
    expect(resolveModelForTask('explain', 'gemini-3.5-flash')).toBe('gemini-3.5-flash');
  });
  it('releases a late microphone permission result after the session was stopped', async () => {
    let grant!: (value: unknown) => void;
    const mic = vi.fn(() => new Promise(resolve => { grant = resolve; }));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: mic } });
    const close = vi.fn(async () => {});
    vi.stubGlobal('AudioContext', class { sampleRate = 16000; resume = async () => {}; close = close; });
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ ticket: 'test-ticket' })));
    const socket = vi.fn(); vi.stubGlobal('WebSocket', socket);
    const client = new LiveAudioClient({ onStatus: vi.fn(), onText: vi.fn(), onError: vi.fn() });
    const pending = client.start('Contexto publicado');
    await vi.waitFor(() => expect(mic).toHaveBeenCalledOnce());
    client.stop();
    const stop = vi.fn(); grant({ getTracks: () => [{ stop }] }); await pending;
    expect(stop).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce(); expect(socket).not.toHaveBeenCalled();
  });
  it('waits for provider readiness, sends PCM and releases capture on disconnect', async () => {
    const stop = vi.fn(), disconnect = vi.fn(), send = vi.fn(), close = vi.fn();
    const port: { onmessage?: (event: { data: ArrayBuffer }) => void } = {};
    const ws: any = { readyState: 1, bufferedAmount: 0, send, close };
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop }] }) } });
    vi.stubGlobal('AudioContext', class {
      sampleRate = 16000; destination = {}; resume = async () => {}; close = async () => {};
      audioWorklet = { addModule: async () => {} };
      createMediaStreamSource = () => ({ connect: vi.fn(), disconnect });
    });
    vi.stubGlobal('AudioWorkletNode', class { port = port; connect = vi.fn(); disconnect = disconnect; });
    vi.stubGlobal('WebSocket', class { static OPEN = 1; constructor() { return ws; } });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:worklet', revokeObjectURL: vi.fn() });
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ ticket: 'test-ticket' })));
    const client = new LiveAudioClient({ onStatus: vi.fn(), onText: vi.fn(), onError: vi.fn() });
    await client.start('Contexto publicado'); expect(send).not.toHaveBeenCalled();
    ws.onmessage({ data: JSON.stringify({ type: 'ready' }) });
    expect(JSON.parse(send.mock.calls[0][0])).toEqual({ type: 'text', text: 'Contexto publicado' });
    port.onmessage!({ data: new Uint8Array([0, 0, 255, 127]).buffer });
    expect(JSON.parse(send.mock.calls[1][0])).toEqual({ type: 'audio', data: 'AAD/fw==' });
    client.stop(); expect(stop).toHaveBeenCalledOnce(); expect(disconnect).toHaveBeenCalledTimes(2); expect(close).toHaveBeenCalledOnce();
  });
});
