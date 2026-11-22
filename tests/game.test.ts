import test from "node:test";
import assert from "node:assert/strict";
import { Controller, type Snapshot } from "../src/game/controller";
import levels from "../src/data/levels.json";
import {
  award,
  defaultDifficulty,
  isAvailable,
  newProfile,
  rating,
  type Level,
} from "../src/types";
const hooks = {
  change: () => {},
  checkpoint: (_: Snapshot) => {},
  finish: () => {},
  sound: () => {},
};
const make = (id = 1) =>
  new Controller(
    levels[id - 1] as Level,
    defaultDifficulty,
    Array.from({ length: 15 }, (_, i) => i + 1),
    hooks,
  );
function answer(g: Controller) {
  assert(g.submit(g.question.answer));
  for (let i = 0; i < 120; i++) g.tick();
}
test("Ammo gate freezes all world state, wrong answers cannot refill or damage", () => {
  const g = make();
  const frozen = structuredClone(g.w);
  for (let i = 0; i < 600; i++) g.tick();
  assert.deepEqual(g.w, frozen);
  const old = g.question.signature;
  assert.equal(g.submit(g.question.answer + 1), false);
  assert.equal(g.w.ammo, 0);
  assert.equal(g.w.lives, 3);
  g.nextVariant();
  assert.notEqual(g.question.signature, old);
  assert(g.submit(g.question.answer));
  assert.equal(g.w.ammo, 180);
  for (let i = 0; i < 119; i++) g.tick();
  assert.equal(g.phase, "countdown");
  assert.equal(g.w.tick, 0);
  g.tick();
  assert.equal(g.phase, "flight");
  g.tick();
  assert.equal(g.w.tick, 1);
});
test("Single life invulnerability; total loss restores checkpoint, score, wave and fresh question", () => {
  const g = make();
  answer(g);
  g.auto = false;
  for (let i = 0; i < 800; i++) g.tick();
  g.w.score = 400;
  g.gate();
  const checkpoint = structuredClone(g.w);
  const old = g.question.signature;
  answer(g);
  for (let i = 0; i < 240; i++) g.tick();
  g.w.score = 999;
  g.damage();
  assert.equal(g.w.lives, 2);
  assert.equal(g.w.invincible, 120);
  const life = g.w.lives;
  g.damage();
  assert.equal(g.w.lives, life);
  g.w.invincible = 0;
  g.damage();
  g.w.invincible = 0;
  g.damage();
  assert.equal(g.phase, "question");
  assert.equal(g.w.lives, 3);
  assert.equal(g.w.ammo, 0);
  assert.equal(g.w.tick, checkpoint.tick);
  assert.equal(g.w.score, 400);
  assert.equal(g.w.wave, checkpoint.wave);
  assert.deepEqual(g.w.entities, checkpoint.entities);
  assert.notEqual(g.question.signature, old);
});
test("Saved snapshot reconstructs same scripted waves", () => {
  const first = make();
  answer(first);
  first.auto = false;
  for (let i = 0; i < 800; i++) first.tick();
  first.gate();
  const saved = first.snapshot();
  const second = new Controller(
    levels[0] as Level,
    defaultDifficulty,
    [1],
    hooks,
    saved,
  );
  answer(first);
  answer(second);
  first.auto = second.auto = false;
  first.w.shield = second.w.shield = 99999;
  for (let i = 0; i < 600; i++) {
    first.tick();
    second.tick();
  }
  assert.deepEqual(first.w, second.w);
});
test("All 15 missions, cadence, supply boundaries, and all 15 bosses", () => {
  const intervals: number[] = [];
  for (let id = 1; id <= 15; id++) {
    const g = make(id);
    let questions = 0,
      bossQuestions = 0,
      last = 0;
    let guard = 0;
    while (g.phase !== "result" && guard++ < 25000) {
      g.w.shield = 99999;
      if (g.phase === "question") {
        if (questions > 0 && !g.w.bossActive)
          intervals.push((g.w.tick - last) / 60);
        if (g.w.bossActive) bossQuestions++;
        last = g.w.tick;
        questions++;
        answer(g);
      } else {
        if (g.w.bossActive) g.w.x = g.bossX;
        g.tick();
      }
    }
    assert.equal(g.phase, "result", `Level ${id} did not complete`);
    assert(questions >= 5);
    assert.equal(
      bossQuestions,
      3,
      `Level ${id} must have a three-question boss shield`,
    );
    assert(g.w.tick >= 90 * 60);
    assert(g.w.bossHp <= 0);
  }
  assert(
    intervals.filter((n) => n >= 45 && n <= 90).length / intervals.length >=
      0.9,
    JSON.stringify(intervals),
  );
});
test("Manual fire and ammo multipliers still force segment questions", () => {
  const g = make();
  answer(g);
  g.auto = false;
  g.w.shield = 99999;
  for (let i = 0; i < 2701; i++) g.tick();
  assert.equal(g.phase, "question");
  assert.equal(g.w.segment, 1);
  assert.equal(g.w.ammo, 0);
  for (const ammo of [0.5, 1, 1.5, 2]) {
    const x = new Controller(
      levels[0] as Level,
      { ...defaultDifficulty, ammo },
      [1],
      hooks,
    );
    assert.equal(x.capacity, 180 * ammo);
  }
});
test("Stars, automatic progression, explicit locks, assignment and decimals", () => {
  const p = newProfile("Pilot");
  assert(isAvailable(p, 1));
  assert(!isAvailable(p, 2));
  award(p, 1, 1);
  assert(!isAvailable(p, 2));
  award(p, 1, 2);
  assert(isAvailable(p, 2));
  p.locks[3] = true;
  award(p, 2, 3);
  assert(!isAvailable(p, 3));
  assert(!p.assigned.includes(3));
  p.assigned.push(4);
  p.difficulty.decimals = false;
  assert(!isAvailable(p, 4));
  assert.equal(rating(0.9, 2), 3);
  assert.equal(rating(0.9, 1), 2);
  assert.equal(rating(0.7, 3), 2);
  assert.equal(rating(0.69, 3), 1);
});
test("Pausing a question keeps it frozen and resumes the same question; snapshot remembers prior numbers", () => {
  const g = make();
  const question = g.question.signature;
  g.pause();
  assert.equal(g.phase, "paused");
  for (let i = 0; i < 500; i++) g.tick();
  assert.equal(g.w.tick, 0);
  g.resume();
  assert.equal(g.phase, "question");
  assert.equal(g.question.signature, question);
  const snap = g.snapshot();
  const restored = new Controller(
    levels[0] as Level,
    defaultDifficulty,
    [1],
    hooks,
    snap,
  );
  assert.equal(restored.question.template.id, g.question.template.id);
  assert.notEqual(restored.question.signature, question);
});
test("Practice stays in question mode and never simulates the shooter", () => {
  const g = new Controller(
    levels[10] as Level,
    defaultDifficulty,
    [11],
    hooks,
    undefined,
    true,
  );
  for (let n = 0; n < 10; n++) {
    answer(g);
    assert.equal(g.phase, "question");
    assert.equal(g.w.tick, 0);
    assert.equal(g.w.score, 0);
    assert.equal(g.w.lives, 3);
  }
});

test("Every mission is a 90-second flight with strictly progressing boss difficulty", () => {
  for (const [i, level] of levels.entries()) {
    assert.equal(level.duration, 90);
    assert.deepEqual(level.segments, [45, 90]);
    assert.equal(level.ammoCapacity, 180);
    assert.equal(level.boss, true);
    assert(level.bossConfig.name);
    if (i > 0) {
      const previous = levels[i - 1].bossConfig;
      assert(level.bossConfig.health > previous.health);
      assert(level.bossConfig.fireInterval < previous.fireInterval);
      assert(level.bossConfig.bulletSpeed > previous.bulletSpeed);
      assert(level.bossConfig.movePeriod < previous.movePeriod);
      assert(level.bossConfig.moveAmplitude > previous.moveAmplitude);
      assert(level.bossConfig.bulletCount >= previous.bulletCount);
    }
  }
});

test("The final boundary starts a clean, shield-gated boss instead of ending a mission", () => {
  const g = make(1);
  answer(g);
  g.auto = false;
  g.w.shield = 99999;
  for (let i = 0; i < 2700; i++) g.tick();
  assert.equal(g.phase, "question");
  assert.equal(g.w.tick, 45 * 60);
  answer(g);
  for (let i = 0; i < 2700; i++) g.tick();
  assert.equal(g.w.tick, 90 * 60);
  assert.equal(g.phase, "question");
  assert(g.w.bossActive);
  assert.equal(g.w.bossHp, 20);
  assert.equal(g.w.entities.length, 0);
  assert.equal(g.w.enemyBullets.length, 0);
  assert.equal(g.w.bullets.length, 0);
  for (let ticket = 0; ticket < 3; ticket++) {
    const before = structuredClone(g.w);
    for (let i = 0; i < 100; i++) g.tick();
    assert.deepEqual(g.w, before);
    answer(g);
    assert.equal(g.w.bossTicket, ticket + 1);
    assert.equal(g.phase, ticket < 2 ? "question" : "flight");
  }
  assert.equal(g.w.bossTime, 0);
});

test("Later bosses fire wider fans and introduce aimed shots", () => {
  for (const id of [1, 7, 8, 15]) {
    const g = make(id),
      config = g.level.bossConfig;
    g.auto = false;
    g.phase = "flight";
    g.w.bossActive = true;
    g.w.bossTicket = 3;
    g.w.tick = 90 * 60;
    g.w.shield = 99999;
    for (let i = 0; i < config.fireInterval; i++) g.tick();
    assert.equal(g.w.enemyBullets.length, config.bulletCount);
    for (let i = 0; i < config.fireInterval; i++) g.tick();
    assert.equal(
      g.w.enemyBullets.length,
      config.bulletCount * 2 + (config.aimedShots ? 1 : 0),
    );
    assert.equal(
      g.w.enemyBullets.filter((b) => b.kind === 2).length,
      config.aimedShots ? 1 : 0,
    );
  }
});

test("Old four-minute checkpoints migrate without discarding score, lives or progress", () => {
  const original = make(7);
  const old = {
    ...original.snapshot(),
    version: 1,
    timelineDuration: undefined,
    world: {
      ...original.w,
      tick: 180 * 60,
      segment: 3,
      bossHp: 90,
      bossMaxHp: undefined,
      score: 1234,
      lives: 2,
      wave: 42,
    },
  } as unknown as Snapshot;
  const restored = new Controller(
    levels[6] as Level,
    defaultDifficulty,
    [7],
    hooks,
    old,
  );
  assert.equal(restored.w.tick, 67.5 * 60);
  assert.equal(restored.w.segment, 1);
  assert.equal(restored.w.score, 1234);
  assert.equal(restored.w.lives, 2);
  assert.equal(restored.w.wave, 42);
  assert.equal(restored.w.ammo, 0);
  assert.equal(restored.snapshot().version, 2);
  assert.equal(restored.snapshot().timelineDuration, 90);
  assert.equal(restored.w.bossHp, restored.level.bossConfig.health);
});

test("Boss checkpoint migration preserves shield progress and the proportion of health left", () => {
  const original = make(15);
  const old = {
    ...original.snapshot(),
    version: 1,
    timelineDuration: undefined,
    world: {
      ...original.w,
      tick: 240 * 60 + 99,
      segment: 4,
      bossActive: true,
      bossTime: 99,
      bossTicket: 3,
      bossHp: 45,
      bossMaxHp: 90,
    },
  } as Snapshot;
  const restored = new Controller(
    levels[14] as Level,
    defaultDifficulty,
    [15],
    hooks,
    old,
  );
  assert.equal(restored.w.tick, 90 * 60 + 99);
  assert.equal(restored.w.segment, 2);
  assert.equal(restored.w.bossTicket, 3);
  assert.equal(restored.w.bossHp, 38);
  assert.equal(restored.w.bossMaxHp, 76);
  const reopened = new Controller(
    levels[14] as Level,
    defaultDifficulty,
    [15],
    hooks,
    restored.snapshot(),
  );
  assert.equal(reopened.w.tick, restored.w.tick);
  assert.equal(reopened.w.bossHp, restored.w.bossHp);
});
