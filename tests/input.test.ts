import test from "node:test";
import assert from "node:assert/strict";
import { FlightInput } from "../src/game/input";
import { Controller, type Snapshot } from "../src/game/controller";
import levels from "../src/data/levels.json";
import { defaultDifficulty, type Level } from "../src/types";

test("Two fingers can move and fire together, and release independently", () => {
  const held = new FlightInput();
  held.press("touch:1", "left");
  held.press("touch:2", "fire");
  assert.deepEqual(held.snapshot(), {
    left: true,
    right: false,
    up: false,
    down: false,
    fire: true,
  });
  held.release("touch:1");
  assert(held.snapshot().fire);
  assert(!held.snapshot().left);
  held.release("touch:2");
  assert(!held.snapshot().fire);
});
test("Diagonal movement and overlapping keyboard/touch sources release safely", () => {
  const held = new FlightInput();
  held.press("touch:1", "up");
  held.press("touch:2", "right");
  held.press("key:arrowup", "up");
  held.release("touch:1");
  assert(held.snapshot().up);
  assert(held.snapshot().right);
  held.release("key:arrowup");
  assert(!held.snapshot().up);
  assert(held.snapshot().right);
  held.reset();
  assert.deepEqual(held.snapshot(), {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
  });
});
test("Tablet input actually moves and fires the jet, while the maths gate freezes it", () => {
  const hooks = {
    change: () => {},
    checkpoint: (_: Snapshot) => {},
    finish: () => {},
    sound: () => {},
  };
  const game = new Controller(
    levels[0] as Level,
    defaultDifficulty,
    [1],
    hooks,
  );
  const held = new FlightInput();
  held.press("touch:1", "right");
  held.press("touch:2", "fire");
  game.input = held.snapshot();
  game.auto = false;
  const frozen = structuredClone(game.w);
  for (let i = 0; i < 30; i++) game.tick();
  assert.deepEqual(game.w, frozen);
  game.submit(game.question.answer);
  for (let i = 0; i < 120; i++) game.tick();
  const x = game.w.x;
  for (let i = 0; i < 15; i++) game.tick();
  assert(game.w.x > x);
  assert.equal(game.w.ammo, 179);
  assert.equal(game.w.bullets.length, 1);
  held.reset();
  game.input = held.snapshot();
  const stop = game.w.x;
  for (let i = 0; i < 15; i++) game.tick();
  assert.equal(game.w.x, stop);
  assert.equal(game.w.ammo, 179);
});
