import test from "node:test";
import assert from "node:assert/strict";
import { Generator, templates, type Expr, bossPool } from "../src/math/engine";
import { defaultDifficulty } from "../src/types";
// This checker does not use the generator's evaluator or answer formulas.
function rational(e: Expr, x: number): [number, number] {
  if (typeof e === "number") return [Math.round(e * 10), 10];
  if (e === "?") return [Math.round(x * 10), 10];
  const [a, b] = rational(e[1], x),
    [c, d] = rational(e[2], x);
  switch (e[0]) {
    case "+":
      return [a * d + c * b, b * d];
    case "−":
      return [a * d - c * b, b * d];
    case "×":
      return [a * c, b * d];
    case "÷":
      assert.notEqual(c, 0);
      return [a * d, b * c];
    default:
      throw Error("Unknown operation");
  }
}
for (const template of templates)
  test(`10,000 independent substitutions: ${template.id}`, () => {
    const generator = new Generator();
    let last = "";
    for (let i = 0; i < 10000; i++) {
      const q = generator.generate(template, defaultDifficulty);
      const [a, b] = rational(q.left, q.answer),
        [c, d] = rational(q.right, q.answer);
      assert.equal(a * d, c * b, q.equation);
      assert(q.answer >= 0 && q.answer <= 100);
      assert(Math.abs(q.answer * 10 - Math.round(q.answer * 10)) < 1e-7);
      assert(q.values.every((v) => v >= 0 && v <= 100));
      assert.notEqual(q.signature, last);
      last = q.signature;
      assert.equal(q.choices.length, 3);
      assert.equal(new Set(q.choices).size, 3);
      assert(q.choices.includes(q.answer));
      assert(q.prompt.split(/\s+/).length <= 25);
    }
  });
test("Every difficulty cap, deterministic fallback, and decimal eligibility", () => {
  for (const cap of [20, 50, 100, 200]) {
    const g = new Generator(() => 0);
    for (const t of templates) {
      for (let i = 0; i < 12; i++) {
        const q = g.generate(t, { ...defaultDifficulty, cap });
        assert(q.answer <= cap);
        assert(q.values.every((v) => v <= cap));
      }
    }
    assert(
      g
        .eligible(15, { ...defaultDifficulty, decimals: false })
        .every((t) => t.answer_type !== "decimal"),
    );
  }
});
test("Curriculum coverage and boss restriction", () => {
  const skills = [...new Set(templates.map((t) => t.skill))];
  for (const skill of skills)
    assert(templates.filter((t) => t.skill === skill).length >= 4);
  for (const level of [5, 10, 15])
    assert(templates.filter((t) => t.levels.includes(level)).length >= 6);
  const g = new Generator();
  for (let i = 0; i < 3; i++)
    assert(
      bossPool(g, [1, 2, 3, 4, 5], defaultDifficulty, i).every(
        (t) => t.module === 1,
      ),
    );
  for (let i = 0; i < 3; i++) {
    const pool = bossPool(
      g,
      Array.from({ length: 15 }, (_, i) => i + 1),
      defaultDifficulty,
      i,
    );
    assert(pool.length > 0);
    if (i === 0) assert(pool.every((t) => t.module === 1));
    if (i === 1)
      assert(pool.every((t) => ["dividend", "divisor"].includes(t.kind)));
    if (i === 2) assert(pool.every((t) => t.module === 3));
  }
});
test("Stored fallback variants are independently correct for every cap and survive random-source failure", () => {
  for (const t of templates) {
    for (const cap of [20, 50, 100, 200]) {
      assert((t.defaults?.[cap]?.length ?? 0) >= 2);
      for (const q of t.defaults![cap]) {
        const [a, b] = rational(q.left, q.answer),
          [c, d] = rational(q.right, q.answer);
        assert.equal(a * d, c * b);
        assert(q.values.every((v) => v <= cap));
      }
      const g = new Generator(() => NaN);
      const one = g.generate(t, { ...defaultDifficulty, cap }),
        two = g.generate(t, { ...defaultDifficulty, cap });
      assert.notEqual(one.signature, two.signature);
    }
  }
});
