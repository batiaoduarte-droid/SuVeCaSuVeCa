/**
 * SuVeCa Live Duplex - AudioWorkletProcessor
 *
 * Processador de áudio em thread dedicada (AudioWorklet) para streaming de baixa latência
 * compatível com a Gemini Multimodal Live API (PCM 16kHz mono linear, signed 16-bit little-endian).
 */

// Declarações de escopo de AudioWorklet para conformidade com o compilador TypeScript
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

export const PCM16_WORKLET_NAME = 'pcm16-worklet-processor';

/**
 * Código-fonte puro do AudioWorkletProcessor para instanciação dinâmica
 * via Blob URL, eliminando complexidades de empacotamento ou resolução de assets em produção.
 */
export const PCM16_WORKLET_CODE = `
class PCM16WorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512;
    this.buffer = new Int16Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const length = channelData.length;

    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      this.buffer[this.bufferIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

      if (this.bufferIndex >= this.bufferSize) {
        // Envia o chunk PCM 16-bit transferindo o ownership do buffer
        const chunk = this.buffer.buffer;
        this.port.postMessage(chunk, [chunk]);
        this.buffer = new Int16Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('${PCM16_WORKLET_NAME}', PCM16WorkletProcessor);
`;

/**
 * Cria uma URL Blob para registrar o AudioWorklet no AudioContext do navegador.
 *
 * Exemplo de uso:
 * ```ts
 * const audioCtx = new AudioContext({ sampleRate: 16000 });
 * const blobUrl = createAudioWorkletBlobUrl();
 * await audioCtx.audioWorklet.addModule(blobUrl);
 * const workletNode = new AudioWorkletNode(audioCtx, PCM16_WORKLET_NAME);
 * ```
 */
export function createAudioWorkletBlobUrl(): string {
  const blob = new Blob([PCM16_WORKLET_CODE], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/**
 * Utilitário para conversão de Float32 [-1.0, 1.0] para Int16 PCM mono.
 */
export function convertFloat32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/**
 * Utilitário para converter um ArrayBuffer PCM em string base64 para envio WebSocket/REST.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(buffer).toString('base64');
}
