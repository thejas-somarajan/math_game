import raw from "../data/templates.json";
import type { Difficulty } from "../types";
export type Expr = number | "?" | [string, Expr, Expr];
export type Template = {
  id: string;
  module: number;
  skill: string;
  kind: string;
  variant: number;
  trap: string;
  scaffold: string;
  pattern: string;
  params: Record<string, { min: number; max: number; step?: number }>;
  constraints: string[];
  answer_type: string;
  input: string[];
  strategy_text: string;
  levels: number[];
  defaults?: Record<string, Omit<Question, "template">[]>;
};
export const templates = raw as unknown as Template[];
export type Question = {
  template: Template;
  answer: number;
  left: Expr;
  right: Expr;
  equation: string;
  prompt: string;
  strategy: string;
  values: number[];
  choices: number[];
  signature: string;
};
export const fmt = (n: number) => Number(n.toFixed(1)).toString();
export function evaluate(e: Expr, answer: number): number {
  if (e === "?") return answer;
  if (typeof e === "number") return e;
  const a = evaluate(e[1], answer),
    b = evaluate(e[2], answer);
  switch (e[0]) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
    default:
      return NaN;
  }
}
export function display(e: Expr): string {
  if (e === "?") return "□";
  if (typeof e === "number") return fmt(e);
  const show = (x: Expr) => (Array.isArray(x) ? `(${display(x)})` : display(x));
  return `${show(e[1])} ${e[0]} ${show(e[2])}`;
}
const op = (o: string, a: Expr, b: Expr): Expr => [o, a, b];
export function valid(q: Question, cap: number) {
  return (
    q.answer >= 0 &&
    q.answer <= cap &&
    Number.isFinite(q.answer) &&
    Math.abs(q.answer * 10 - Math.round(q.answer * 10)) < 1e-7 &&
    Math.abs(evaluate(q.left, q.answer) - evaluate(q.right, q.answer)) < 1e-7 &&
    q.values.every((n) => n >= 0 && n <= cap) &&
    q.prompt.split(/\s+/).length <= 25
  );
}
export class Generator {
  last = new Map<string, string>();
  constructor(public random = Math.random) {}
  eligible(level: number, d: Difficulty) {
    return templates.filter(
      (t) =>
        t.levels.includes(level) && (d.decimals || t.answer_type !== "decimal"),
    );
  }
  select(
    level: number,
    d: Difficulty,
    failures: Record<string, number> = {},
    pool?: Template[],
  ) {
    const ts = pool ?? this.eligible(level, d);
    if (!ts.length)
      throw Error(
        "No eligible maths content. Ask your tutor to adjust this assignment.",
      );
    const weights = ts.map((t) => 1 + Math.min(4, failures[t.skill] || 0));
    let r = this.random() * weights.reduce((a, b) => a + b, 0);
    return ts[weights.findIndex((w) => (r -= w) < 0)] ?? ts[ts.length - 1];
  }
  generate(t: Template, d: Difficulty): Question {
    for (let attempt = 0; attempt < 50; attempt++) {
      const q = this.make(t, d.cap, this.random);
      if (valid(q, d.cap) && q.signature !== this.last.get(t.id)) {
        this.last.set(t.id, q.signature);
        return q;
      }
    }
    for (const fallback of t.defaults?.[String(d.cap)] ?? []) {
      const q = { ...structuredClone(fallback), template: t };
      if (valid(q, d.cap) && q.signature !== this.last.get(t.id)) {
        this.last.set(t.id, q.signature);
        return q;
      }
    }
    throw Error("This template has no valid fresh variant for these settings.");
  }
  make(t: Template, cap: number, r: () => number): Question {
    const int = (min: number, max: number) =>
      Math.floor(r() * (Math.max(min, max) - min + 1)) + min;
    const limit = Math.max(10, cap),
      a = int(
        Math.max(2, t.params.a.min),
        Math.min(t.params.a.max, Math.floor(limit / 3)),
      ),
      b = int(
        Math.max(2, t.params.b.min),
        Math.min(t.params.b.max, Math.floor(limit / a)),
      );
    let x = int(1, Math.max(2, Math.floor(limit / 2))),
      known = int(1, Math.max(2, Math.floor(limit / 2))),
      left: Expr = "?",
      right: Expr = 0,
      strategy = "",
      prompt = "Find the missing number.";
    const v = t.variant;
    switch (t.kind) {
      case "addend":
        right = x + known;
        left = v % 2 ? op("+", known, "?") : op("+", "?", known);
        strategy = `${fmt(right as number)} − ${known} = ${x}. Subtraction undoes addition.`;
        break;
      case "subtrahend":
        left = op("−", x + known, "?");
        right = known;
        strategy = `${x + known} − ${known} = ${x}. Find the missing part.`;
        break;
      case "minuend":
        left = op("−", "?", known);
        right = x;
        x += known;
        strategy = `${fmt(right as number)} + ${known} = ${x}. Addition undoes subtraction.`;
        break;
      case "decimal":
        known = int(1, Math.floor(limit * 5)) / 10;
        x = int(1, Math.floor(limit * 5)) / 10;
        right = Math.round((x + known) * 10) / 10;
        left = v % 2 ? op("+", known, "?") : op("+", "?", known);
        strategy = `${fmt(right as number)} − ${fmt(known)} = ${fmt(x)}. Undo the addition.`;
        break;
      case "balance": {
        const c = int(1, Math.max(2, Math.floor(limit / 3)));
        known = int(c, Math.max(c, Math.floor(limit / 2)));
        x = int(1, Math.max(2, Math.floor(limit / 3)));
        left = op("+", x + c, known - c);
        right = v % 2 ? op("+", known, "?") : op("+", "?", known);
        strategy = `Both sides equal ${x + known}. Subtract ${known} to find ${x}.`;
        break;
      }
      case "factor":
        x = b;
        left = v % 2 ? op("×", "?", a) : op("×", a, "?");
        right = a * b;
        strategy = `${a * b} ÷ ${a} = ${b}. Division undoes multiplication.`;
        break;
      case "dividend":
        x = a * b;
        left = op("÷", "?", a);
        right = b;
        strategy = `${b} × ${a} = ${x}. Multiplication undoes division.`;
        break;
      case "divisor":
        x = a;
        left = op("÷", a * b, "?");
        right = b;
        strategy = `${a * b} ÷ ${b} = ${a}. Use the fact family.`;
        break;
      case "equivalent": {
        const divisor = int(1, Math.min(5, Math.floor(limit / (a * b))));
        if (v % 2) {
          x = b;
          left = op("×", a, "?");
          right = op("÷", a * b * divisor, divisor);
          strategy = `First ${a * b * divisor} ÷ ${divisor} = ${a * b}. Then ${a * b} ÷ ${a} = ${b}.`;
        } else {
          x = divisor;
          left = op("×", a, b);
          right = op("÷", a * b * x, "?");
          strategy = `First ${a} × ${b} = ${a * b}. Then ${a * b * x} ÷ ${a * b} = ${x}.`;
        }
        break;
      }
      case "story": {
        x = b;
        left = op("×", "?", a);
        right = a * b;
        const stories = [
          `I think of a number, multiply it by ${a}, and get ${a * b}. What is my number?`,
          `${a} equal trays hold ${a * b} seedlings. How many seedlings are in each tray?`,
          `${a} equal teams share ${a * b} tokens. How many tokens per team?`,
          `${a} packs hold ${a * b} pencils altogether. How many pencils per pack?`,
        ];
        prompt = stories[v];
        strategy = `${a * b} ÷ ${a} = ${b}. Substitute ${b}: ${b} × ${a} = ${a * b}.`;
        break;
      }
      case "change": {
        const start = v % 2 === 0;
        left = op("+", start ? "?" : known, start ? known : "?");
        right = x + known;
        prompt = start
          ? `A pilot collects ${known} stars and now has ${x + known}. How many stars did they start with?`
          : `A pilot starts with ${known} stars and finishes with ${x + known}. How many stars did they collect?`;
        strategy = `${x + known} − ${known} = ${x}. Check the start plus the change.`;
        break;
      }
      case "machine":
        x = b;
        known = int(1, Math.max(2, limit - a * b));
        left =
          v % 2
            ? op("−", op("×", "?", a), known)
            : op("+", op("×", "?", a), known);
        right = v % 2 ? a * b - known : a * b + known;
        if ((right as number) < 0) {
          known = 1;
          left = op("−", op("×", "?", a), known);
          right = a * b - 1;
        }
        prompt = `A number machine multiplies by ${a}, then ${v % 2 ? "subtracts" : "adds"} ${known}, giving ${right}. What went in?`;
        strategy = `Undo the last step, then divide by ${a}: the input is ${x}.`;
        break;
      case "ribbon": {
        const piece = int(2, Math.min(30, Math.floor((limit * 10) / a))) / 10;
        x = Math.round(piece * a * 10) / 10;
        left = op("÷", "?", a);
        right = piece;
        prompt = [
          `A ribbon is cut into ${a} equal pieces of ${fmt(piece)} metres. How long was the ribbon?`,
          `${a} equal bottles each hold ${fmt(piece)} litres. How many litres altogether?`,
          `${a} equal lengths of cord measure ${fmt(piece)} metres each. What was the total length?`,
          `${a} identical parcels each weigh ${fmt(piece)} kilograms. What is their combined mass?`,
        ][v];
        strategy = `${fmt(piece)} × ${a} = ${fmt(x)}. Substitute to check each equal part.`;
        break;
      }
    }
    x = Number(x.toFixed(1));
    if (
      v >= 2 &&
      [
        "addend",
        "subtrahend",
        "minuend",
        "decimal",
        "balance",
        "factor",
        "dividend",
        "divisor",
        "equivalent",
      ].includes(t.kind)
    )
      [left, right] = [right, left];
    const values: number[] = [];
    const collect = (e: Expr) => {
      if (typeof e === "number") values.push(e);
      else if (Array.isArray(e)) {
        collect(e[1]);
        collect(e[2]);
      }
    };
    collect(left);
    collect(right);
    const equation = `${display(left)} = ${display(right)}`;
    const wrong =
      t.trap === "adding_instead_of_subtracting"
        ? values.reduce((a, b) => a + b, 0)
        : t.trap === "missing_divisor"
          ? a * b * b
          : evaluate(left, x);
    const choices = [x];
    for (const n of [wrong, x + 1, Math.max(0, x - 1), x + 2])
      if (
        !choices.includes(Number(n.toFixed(1))) &&
        Number.isFinite(n) &&
        n >= 0
      )
        choices.push(Number(n.toFixed(1)));
    const options = choices.slice(0, 3);
    for (let i = options.length - 1; i > 0; i--) {
      const j = int(0, i);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      template: t,
      answer: x,
      left,
      right,
      equation,
      prompt,
      strategy,
      values,
      choices: options,
      signature: equation + ":" + x,
    };
  }
}
export function bossPool(
  g: Generator,
  assigned: number[],
  d: Difficulty,
  index: number,
) {
  const ts = templates.filter(
    (t) =>
      t.levels.some((n) => assigned.includes(n)) &&
      (d.decimals || t.answer_type !== "decimal"),
  );
  const groups = [
    ts.filter((t) => t.module === 1),
    ts.filter((t) => ["divisor", "dividend"].includes(t.kind)),
    ts.filter((t) => t.module === 3),
  ];
  return groups.every((x) => x.length) ? groups[index % 3] : ts;
}
