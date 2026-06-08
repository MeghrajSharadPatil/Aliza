/**
 * Audio helpers for raw PCM conversion, downsampling, and base64 parsing.
 */

/**
 * Downsamples float32 Web Audio buffer to 16kHz PCM16 buffer.
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number = 16000
): Int16Array {
  if (inputSampleRate === outputSampleRate) {
    return floatTo16BitPCM(buffer);
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Int16Array(newLength);
  
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    // Average values to downsample with simple low-pass
    const average = count > 0 ? accum / count : 0;
    result[offsetResult] = Math.min(1, Math.max(-1, average)) * 0x7fff;
    
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Converts Float32 dynamic range [-1.0, 1.0] to Int16 PCM array.
 */
export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/**
 * Packages an Int16Array PCM buffer as base64 string.
 */
export function pcmToBase64(buffer: Int16Array): string {
  const uint8 = new Uint8Array(buffer.buffer);
  let binary = "";
  const len = uint8.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string directly into Int16Array PCM buffer.
 */
export function base64ToPCM16(base64: string): Int16Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

/**
 * Decodes Int16Array PCM range to standard Float32Array [-1.0, 1.0] for play waves.
 */
export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
}

/**
 * Fast average amplitude calculations for real-time waveform visualization.
 */
export function calculateVolume(pcm16: Int16Array): number {
  let sum = 0;
  const len = pcm16.length;
  if (len === 0) return 0;
  
  for (let i = 0; i < len; i++) {
    sum += Math.abs(pcm16[i]);
  }
  return sum / len / 32768.0; // Normalised 0 to 1
}
