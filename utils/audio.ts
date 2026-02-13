export const createExplosionBuffer = (context: AudioContext): AudioBuffer => {
  const bufferSize = context.sampleRate * 2; // 2 seconds
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / context.sampleRate;
    // White noise * exponential decay.
    // Just simple noise.
    data[i] = (Math.random() * 2 - 1) * Math.exp(-5 * t);
  }
  return buffer;
};
