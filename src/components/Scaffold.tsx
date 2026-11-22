import type { Question } from "../math/engine";
import { fmt } from "../math/engine";
export function Scaffold({
  q,
  worked = false,
}: {
  q: Question;
  worked?: boolean;
}) {
  const kind = q.template.scaffold,
    numbers = q.values,
    total = Math.max(...numbers),
    known = Math.min(...numbers),
    split = Math.max(45, Math.min(260, (320 * known) / total));
  return (
    <div className={"scaffold " + (worked ? "worked" : "")}>
      <span className="eyebrow">
        {worked ? "A different example" : "Let’s see it another way"}
      </span>
      {worked ? (
        <>
          <div className="example-equation">
            {q.equation.replace("□", fmt(q.answer))}
          </div>
          <p>{q.strategy}</p>
        </>
      ) : kind === "bar" ? (
        <>
          <p>The whole is made of two parts. Find the part that is missing.</p>
          <svg
            viewBox="0 0 340 105"
            role="img"
            aria-label={`Part part whole bar: whole ${fmt(total)}, known part ${fmt(known)}, missing part box`}
          >
            <rect x="10" y="12" width="320" height="34" rx="5" fill="#b6d9c5" />
            <text x="170" y="35" textAnchor="middle">
              Whole: {fmt(total)}
            </text>
            <rect
              x="10"
              y="52"
              width={split - 3}
              height="36"
              rx="5"
              fill="#f5ce9f"
            />
            <rect
              x={10 + split + 2}
              y="52"
              width={318 - split}
              height="36"
              rx="5"
              fill="#e3ebe8"
            />
            <text x={10 + split / 2} y="76" textAnchor="middle">
              {fmt(known)}
            </text>
            <text x={10 + split + (320 - split) / 2} y="76" textAnchor="middle">
              □
            </text>
          </svg>
        </>
      ) : kind === "triangle" ? (
        <>
          <p>
            Use these three numbers to build a multiplication and division fact
            family.
          </p>
          <svg
            viewBox="0 0 340 130"
            role="img"
            aria-label="Fact family triangle"
          >
            <path
              d="m170 12 100 100H70z"
              fill="#e5f0ea"
              stroke="#8eb49f"
              strokeWidth="2"
            />
            <text x="170" y="46" textAnchor="middle">
              {q.template.kind === "dividend" ? "□" : fmt(total)}
            </text>
            <text x="105" y="104" textAnchor="middle">
              {fmt(known)}
            </text>
            <text x="235" y="104" textAnchor="middle">
              {q.template.kind === "dividend" ? fmt(total) : "□"}
            </text>
            <text x="170" y="87" textAnchor="middle">
              × / ÷
            </text>
          </svg>
        </>
      ) : kind === "array" ? (
        <>
          <p>
            {fmt(total)} objects in {fmt(known)} equal rows. Count how many
            belong in each row.
          </p>
          <svg
            viewBox={`0 0 ${q.answer * 18 + 10} ${known * 18 + 10}`}
            style={{ maxHeight: 160 }}
            role="img"
            aria-label={`${fmt(total)} objects in ${fmt(known)} rows`}
          >
            {Array.from({ length: total }, (_, i) => (
              <rect
                key={i}
                x={(i % q.answer) * 18 + 4}
                y={Math.floor(i / q.answer) * 18 + 4}
                width="12"
                height="12"
                rx="2"
                fill="#92b47e"
              />
            ))}
          </svg>
        </>
      ) : (
        <>
          <p>
            The equals sign means “has the same value as”. Keep both sides
            balanced.
          </p>
          <svg viewBox="0 0 340 110" role="img" aria-label="Balanced see-saw">
            <path d="m170 65-24 35h48z" fill="#95b8a6" />
            <path
              d="M45 50h250M80 50 55 80h50zm180 0-25 30h50z"
              stroke="#385e51"
              strokeWidth="3"
              fill="#ecd4b2"
            />
            <text x="80" y="35" textAnchor="middle">
              Left side
            </text>
            <text x="260" y="35" textAnchor="middle">
              Right side
            </text>
            <text x="170" y="40" textAnchor="middle">
              =
            </text>
          </svg>
        </>
      )}
    </div>
  );
}
