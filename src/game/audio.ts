export class AudioSystem {
  ctx?: AudioContext;
  music = 0.25;
  sound = 0.5;
  timer?: ReturnType<typeof setInterval>;
  beat = 0;
  tone(
    freq: number,
    duration = 0.1,
    volume = 1,
    type: OscillatorType = "square",
    music = false,
  ) {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      const o = this.ctx.createOscillator(),
        g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(
        Math.max(0.0001, (music ? this.music : this.sound) * volume * 0.055),
        this.ctx.currentTime,
      );
      g.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + duration,
      );
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + duration);
    } catch {
      /* Silent devices retain full gameplay. */
    }
  }
  cue(kind: string) {
    if (kind === "correct") {
      this.tone(523, 0.15);
      setTimeout(() => this.tone(784, 0.25), 120);
    } else if (kind === "shot") this.tone(1800, 0.045, 0.1, "triangle");
    else if (kind === "hit") this.tone(90, 0.18, 0.6, "sawtooth");
    else this.tone(440, 0.08, 0.3);
  }
  start(level: number) {
    this.stop();
    const scales = [
      [0, 3, 7, 10, 12, 7, 3, 5],
      [0, 4, 7, 11, 12, 7, 4, 2],
      [0, 2, 7, 9, 12, 9, 7, 2],
    ];
    const sequence = scales[(level - 1) % 3];
    this.timer = setInterval(
      () => {
        this.tone(
          130.81 * 2 ** ((sequence[this.beat++ % 8] + (level % 5) * 2) / 12),
          0.22,
          0.5,
          "triangle",
          true,
        );
      },
      240 + (level % 5) * 20,
    );
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
export const audio = new AudioSystem();
