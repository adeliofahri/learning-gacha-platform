let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    audioContext ??= new AudioContext();

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    return audioContext;
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume = 0.06,
  type: OscillatorType = "sine",
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + duration,
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

export function playArcadeStart() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  playTone(ctx, 330, now, 0.12);
  playTone(ctx, 440, now + 0.12, 0.12);
  playTone(ctx, 660, now + 0.24, 0.2);
}

export function playArcadeSpin(): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(65, now);
  oscillator.frequency.exponentialRampToValueAtTime(145, now + 2);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.025, now + 0.15);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);

  let stopped = false;

  return () => {
    if (stopped) return;
    stopped = true;

    const stopTime = ctx.currentTime;

    gain.gain.cancelScheduledValues(stopTime);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), stopTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.12);

    oscillator.stop(stopTime + 0.14);
  };
}

export function playArcadeReveal(rarity: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const notes =
    rarity >= 6
      ? [523, 659, 784, 1047]
      : rarity >= 5
        ? [440, 554, 659, 880]
        : [392, 494, 587];

  notes.forEach((frequency, index) => {
    playTone(
      ctx,
      frequency,
      now + index * 0.13,
      0.32,
      rarity >= 6 ? 0.075 : 0.05,
      "triangle",
    );
  });
}