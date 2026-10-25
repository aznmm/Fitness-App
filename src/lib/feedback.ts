let ctx: AudioContext | undefined;

/** Short double beep + vibration when the rest timer ends. */
export function restFinishedAlert(sound: boolean): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Vibration isn't supported everywhere (e.g. iOS Safari).
  }
  if (!sound) return;
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    for (const offset of [0, 0.25]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    }
  } catch {
    // Audio can be blocked until the user interacts with the page.
  }
}

/** Browsers only allow audio after a user gesture; call this from one. */
export function primeAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // ignore
  }
}
