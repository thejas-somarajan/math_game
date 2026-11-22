import fs from "node:fs";
import { Generator, templates, valid } from "../src/math/engine";
const g = new Generator();
for (const t of templates) {
  const defaults: Record<string, unknown[]> = {};
  for (const cap of [20, 50, 100, 200]) {
    const values: unknown[] = [];
    const used = new Set<string>();
    let seed = 17 + t.variant;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    while (values.length < 2) {
      const q = g.make(t, cap, random);
      if (valid(q, cap) && !used.has(q.signature)) {
        used.add(q.signature);
        const { template, ...rest } = q;
        values.push(rest);
      }
    }
    defaults[cap] = values;
  }
  Object.assign(t, { defaults });
}
fs.writeFileSync(
  new URL("../src/data/templates.json", import.meta.url),
  JSON.stringify(templates, null, 2) + "\n",
);
