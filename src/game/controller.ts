import {
  Generator,
  bossPool,
  templates,
  type Question,
  type Template,
} from "../math/engine";
import type { Difficulty, Level } from "../types";
export type Entity = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: number;
  hp: number;
  age: number;
};
export type World = {
  tick: number;
  score: number;
  lives: number;
  ammo: number;
  x: number;
  y: number;
  wave: number;
  segment: number;
  entities: Entity[];
  bullets: Entity[];
  enemyBullets: Entity[];
  pickups: Entity[];
  effects: Entity[];
  invincible: number;
  shield: number;
  spread: number;
  bombs: number;
  nextId: number;
  bossHp: number;
  bossMaxHp: number;
  bossTime: number;
  bossTicket: number;
  bossActive: boolean;
  escort: number;
};
export type Snapshot = {
  version: 1 | 2;
  timelineDuration?: number;
  levelId: number;
  world: World;
  templateId?: string;
  lastQuestions?: [string, string][];
};
export type Phase = "question" | "countdown" | "flight" | "paused" | "result";
export type GameHooks = {
  change: () => void;
  checkpoint: (s: Snapshot) => void;
  finish: () => void;
  sound: (s: string) => void;
};
export class Controller {
  w: World;
  checkpoint?: Snapshot;
  phase: Phase = "question";
  question!: Question;
  questionStart = Date.now();
  wrong = 0;
  countdown = 0;
  input = { left: false, right: false, up: false, down: false, fire: false };
  auto = true;
  generator = new Generator();
  failures: Record<string, number> = {};
  practice = false;
  stopped = false;
  resumePhase: Phase = "flight";
  constructor(
    public level: Level,
    public difficulty: Difficulty,
    public assigned: number[],
    public hooks: GameHooks,
    saved?: Snapshot,
    practice = false,
  ) {
    this.practice = practice;
    this.w = {
      tick: 0,
      score: 0,
      lives: 3,
      ammo: 0,
      x: 240,
      y: 600,
      wave: 0,
      segment: 0,
      entities: [],
      bullets: [],
      enemyBullets: [],
      pickups: [],
      effects: [],
      invincible: 0,
      shield: 0,
      spread: 0,
      bombs: 0,
      nextId: 1,
      bossHp: level.bossConfig.health,
      bossMaxHp: level.bossConfig.health,
      bossTime: 0,
      bossTicket: 0,
      bossActive: false,
      escort: 0,
    };
    if (saved && [1, 2].includes(saved.version) && saved.levelId === level.id) {
      this.w = { ...this.w, ...structuredClone(saved.world) };
      // Preserve old flights and learning history when shortening the timeline.
      const oldDuration = saved.timelineDuration ?? 240;
      if (oldDuration !== level.duration) {
        this.w.tick = this.w.bossActive
          ? level.duration * 60 + this.w.bossTime
          : Math.min(
              level.duration * 60,
              Math.round((this.w.tick * level.duration) / oldDuration),
            );
        this.w.segment = level.segments.filter(
          (s) => this.w.tick >= s * 60,
        ).length;
      }
      const oldMaxHp = saved.world.bossMaxHp ?? 90;
      this.w.bossMaxHp = level.bossConfig.health;
      this.w.bossHp = this.w.bossActive
        ? Math.max(
            1,
            Math.min(
              this.w.bossMaxHp,
              Math.round((this.w.bossHp / oldMaxHp) * this.w.bossMaxHp),
            ),
          )
        : this.w.bossMaxHp;
      this.generator.last = new Map(saved.lastQuestions ?? []);
    }
    this.w.ammo = 0;
    this.gate(templates.find((t) => t.id === saved?.templateId));
  }
  get capacity() {
    return Math.round(this.level.ammoCapacity * this.difficulty.ammo);
  }
  get bossX() {
    return (
      240 +
      Math.sin(this.w.bossTime / this.level.bossConfig.movePeriod) *
        this.level.bossConfig.moveAmplitude
    );
  }
  snapshot(): Snapshot {
    return {
      version: 2,
      timelineDuration: this.level.duration,
      levelId: this.level.id,
      world: structuredClone(this.w),
      templateId: this.question?.template.id,
      lastQuestions: [...this.generator.last.entries()],
    };
  }
  gate(template?: Template) {
    this.w.ammo = 0;
    this.phase = "question";
    this.wrong = 0;
    this.nextQuestion(template);
    this.checkpoint = this.snapshot();
    this.hooks.checkpoint(this.checkpoint);
  }
  nextQuestion(template?: Template) {
    const pool = this.w.bossActive
      ? bossPool(
          this.generator,
          this.assigned,
          this.difficulty,
          this.w.bossTicket,
        )
      : undefined;
    const t =
      template ??
      this.generator.select(
        this.level.id,
        this.difficulty,
        this.failures,
        pool,
      );
    this.question = this.generator.generate(t, this.difficulty);
    this.questionStart = Date.now();
    this.hooks.change();
  }
  submit(value: number) {
    if (this.phase !== "question") return false;
    const good = Math.abs(value - this.question.answer) < 1e-8;
    if (!good) {
      this.wrong++;
      this.failures[this.question.template.skill] =
        (this.failures[this.question.template.skill] || 0) + 1;
      return false;
    }
    this.hooks.sound("correct");
    this.w.ammo = this.capacity;
    if (this.w.bossActive && this.w.bossTicket < 3) this.w.bossTicket++;
    this.phase = "countdown";
    this.countdown = 120;
    this.hooks.change();
    return true;
  }
  nextVariant() {
    this.nextQuestion(this.question.template);
  }
  pause() {
    if (["flight", "question", "countdown"].includes(this.phase)) {
      this.resumePhase = this.phase;
      this.phase = "paused";
      this.hooks.change();
    }
  }
  resume() {
    if (this.phase === "paused") {
      this.phase = this.resumePhase === "question" ? "question" : "countdown";
      this.countdown = 120;
      this.hooks.change();
    }
  }
  move(x: number, y: number) {
    if (this.phase === "flight") {
      this.w.x = Math.max(22, Math.min(458, x));
      this.w.y = Math.max(50, Math.min(680, y));
    }
  }
  entity(
    x: number,
    y: number,
    vx: number,
    vy: number,
    kind = 0,
    hp = 1,
  ): Entity {
    return { id: this.w.nextId++, x, y, vx, vy, kind, hp, age: 0 };
  }
  damage() {
    if (this.w.invincible > 0 || this.w.shield > 0) return;
    this.w.lives--;
    this.hooks.sound("hit");
    if (this.w.lives <= 0) {
      if (this.checkpoint) this.w = structuredClone(this.checkpoint.world);
      this.w.lives = 3;
      this.w.ammo = 0;
      this.gate(templates.find((t) => t.id === this.checkpoint?.templateId));
    } else {
      this.w.x = 240;
      this.w.y = 600;
      this.w.invincible = 120;
    }
    this.hooks.change();
  }
  bomb() {
    if (this.phase === "flight" && this.w.bombs > 0) {
      this.w.bombs--;
      for (const e of this.w.entities)
        this.w.effects.push(this.entity(e.x, e.y, 0, 0, 1));
      this.w.score += this.w.entities.length * 60;
      this.w.entities = [];
      this.w.enemyBullets = [];
      if (this.w.bossActive) this.w.bossHp -= 12;
      this.hooks.sound("hit");
    }
  }
  tick() {
    if (this.stopped) return;
    if (this.phase === "countdown") {
      if (--this.countdown <= 0) {
        if (this.practice) {
          this.gate();
          return;
        }
        if (this.w.bossActive && this.w.bossTicket < 3) {
          this.gate();
          return;
        }
        this.phase = "flight";
        this.hooks.change();
      }
      return;
    }
    if (this.phase !== "flight") return;
    const w = this.w;
    if (
      !w.bossActive &&
      w.segment < this.level.segments.length &&
      w.tick + 1 >= this.level.segments[w.segment] * 60
    ) {
      w.tick++;
      w.segment++;
      if (w.segment >= this.level.segments.length) {
        if (this.level.boss) {
          w.bossActive = true;
          w.bossTicket = 0;
          w.bossTime = 0;
          w.bossHp = w.bossMaxHp;
          w.entities = [];
          w.bullets = [];
          w.enemyBullets = [];
          w.escort = 0;
          w.invincible = 120;
          this.gate();
          return;
        }
        this.finish();
        return;
      }
      this.gate();
      return;
    }
    w.tick++;
    if (w.bossActive) w.bossTime++;
    w.invincible = Math.max(0, w.invincible - 1);
    w.shield = Math.max(0, w.shield - 1);
    w.spread = Math.max(0, w.spread - 1);
    this.move(
      w.x + (+this.input.right - +this.input.left) * 4,
      w.y + (+this.input.down - +this.input.up) * 4,
    );
    if ((this.auto || this.input.fire) && w.tick % 15 === 0) {
      if (w.ammo === 0) {
        this.gate();
        return;
      }
      w.ammo--;
      for (const vx of w.spread > 0 ? [-1.5, 0, 1.5] : [0])
        w.bullets.push(this.entity(w.x, w.y - 24, vx, -9));
      this.hooks.sound("shot");
      if (w.ammo === 0) {
        this.gate();
        return;
      }
    }
    if (!w.bossActive) {
      const interval = Math.round(this.level.waveEvery * 60);
      if (w.tick % interval === 0) {
        const i = w.wave++;
        const n = 2 + (i % 2);
        for (let k = 0; k < n; k++)
          w.entities.push(
            this.entity(
              60 + ((i * 83 + k * 137 + this.level.id * 23) % 360),
              -k * 46 - 25,
              Math.sin(i + k) * 0.45,
              1.05 + this.level.id * 0.035,
              i % 3,
              1 + (i % 3 === 2 ? 1 : 0),
            ),
          );
      }
      if (w.tick % 1800 === 600) {
        if (this.level.event === "rings")
          for (let k = 0; k < 3; k++)
            w.pickups.push(this.entity(110 + k * 130, -k * 70, 0, 1.5, 3));
        else {
          w.entities.push(this.entity(240, 750, 0, -0.7, 3, 8));
          w.escort = 600;
        }
      }
    } else if (w.bossTime % this.level.bossConfig.fireInterval === 0) {
      const config = this.level.bossConfig;
      for (const vx of Array.from(
        { length: config.bulletCount },
        (_, i) => (i - (config.bulletCount - 1) / 2) * 1.15,
      ))
        w.enemyBullets.push(
          this.entity(this.bossX, 145, vx, config.bulletSpeed, 1),
        );
      if (config.aimedShots && w.bossTime % (config.fireInterval * 2) === 0) {
        const angle = Math.atan2(w.y - 145, w.x - this.bossX);
        w.enemyBullets.push(
          this.entity(
            this.bossX,
            145,
            Math.cos(angle) * (config.bulletSpeed + 0.3),
            Math.sin(angle) * (config.bulletSpeed + 0.3),
            2,
          ),
        );
      }
    }
    for (const e of w.entities) {
      e.age++;
      e.x += e.vx;
      e.y += e.vy;
      if (e.kind !== 3 && e.age % 150 === 0)
        w.enemyBullets.push(this.entity(e.x, e.y, (w.x - e.x) / 200, 2.6));
      if (e.kind === 3 && e.age % 150 === 0 && w.escort > 0) {
        w.score += 50;
        w.escort -= 150;
      }
      if (e.kind !== 3 && Math.hypot(e.x - w.x, e.y - w.y) < 27) {
        e.y = 900;
        this.damage();
        if (this.phase !== "flight") return;
      }
    }
    for (const arr of [w.bullets, w.enemyBullets, w.pickups])
      for (const e of arr) {
        e.age++;
        e.x += e.vx;
        e.y += e.vy;
      }
    for (const bullet of w.bullets) {
      if (
        w.bossActive &&
        Math.abs(bullet.x - this.bossX) < 55 + (this.level.id - 1) * 1.4 &&
        bullet.y < 160 &&
        bullet.y > 55
      ) {
        w.bossHp--;
        bullet.y = -100;
        w.effects.push(this.entity(bullet.x, bullet.y + 120, 0, 0, 0));
      } else
        for (const e of w.entities) {
          if (
            e.kind !== 3 &&
            e.hp > 0 &&
            Math.hypot(e.x - bullet.x, e.y - bullet.y) < 24
          ) {
            e.hp--;
            bullet.y = -100;
            if (e.hp <= 0) {
              w.score += 100;
              w.effects.push(this.entity(e.x, e.y, 0, 0, 1));
              this.hooks.sound("hit");
              if (e.id % 4 === 0)
                w.pickups.push(this.entity(e.x, e.y, 0, 1.2, e.id % 3));
            }
            break;
          }
        }
    }
    for (const e of w.enemyBullets) {
      for (const cargo of w.entities.filter((x) => x.kind === 3 && x.hp > 0)) {
        if (Math.hypot(e.x - cargo.x, e.y - cargo.y) < 32) {
          cargo.hp--;
          e.y = 900;
          if (cargo.hp === 0)
            w.effects.push(this.entity(cargo.x, cargo.y, 0, 0, 1));
        }
      }
      if (Math.hypot(e.x - w.x, e.y - w.y) < 18) {
        e.y = 900;
        this.damage();
        if (this.phase !== "flight") return;
      }
    }
    for (const p of w.pickups) {
      if (Math.hypot(p.x - w.x, p.y - w.y) < 32) {
        p.y = 900;
        if (p.kind === 0) w.shield = 600;
        else if (p.kind === 1) w.spread = 600;
        else if (p.kind === 2) w.bombs++;
        else w.score += 250;
        this.hooks.sound("pickup");
      }
    }
    for (const cargo of w.entities.filter(
      (e) => e.kind === 3 && e.hp > 0 && e.y < -40,
    )) {
      w.score += 1000;
      cargo.hp = 0;
      w.escort = 0;
    }
    for (const e of w.effects) e.age++;
    w.effects = w.effects.filter((e) => e.age < 30);
    w.entities = w.entities.filter((e) => e.hp > 0 && e.y < 820 && e.y > -150);
    w.bullets = w.bullets.filter((e) => e.y > -30);
    w.enemyBullets = w.enemyBullets.filter((e) => e.y < 800);
    w.pickups = w.pickups.filter((e) => e.y < 800);
    if (w.bossActive && w.bossHp <= 0) {
      w.score += 2500;
      this.finish();
    }
  }
  finish() {
    if (this.phase === "result") return;
    this.phase = "result";
    this.hooks.finish();
    this.hooks.change();
  }
}
