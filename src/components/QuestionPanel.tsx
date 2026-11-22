import { useEffect, useState } from "react";
import type { Controller } from "../game/controller";
import { Generator, fmt } from "../math/engine";
import type { Attempt } from "../types";
import { uid } from "../types";
import { Scaffold } from "./Scaffold";
import { Icon } from "./Icons";
export function QuestionPanel({
  game,
  studentId,
  sessionId,
  onAttempt,
  readAloud,
}: {
  game: Controller;
  studentId: string;
  sessionId: string;
  onAttempt: (a: Attempt) => void;
  readAloud: boolean;
}) {
  const q = game.question;
  const [input, setInput] = useState(""),
    [feedback, setFeedback] = useState<"hint" | "worked" | "storycheck" | null>(
      null,
    ),
    [example, setExample] = useState(q),
    [message, setMessage] = useState("");
  const choices = game.level.id <= 2 && game.difficulty.choices;
  useEffect(() => {
    setInput("");
    setFeedback(null);
    setMessage("");
  }, [q]);
  function submit(given: number, checked = false) {
    if (!Number.isFinite(given) || game.phase !== "question") return;
    if (q.template.module === 3 && !checked) {
      setInput(String(given));
      setFeedback("storycheck");
      return;
    }
    const first = game.wrong === 0;
    const timeMs = Date.now() - game.questionStart;
    const exitTicket =
      game.w.bossActive && game.w.bossTicket < 3
        ? game.w.bossTicket
        : undefined;
    const correct = game.submit(given);
    onAttempt({
      id: uid(),
      studentId,
      sessionId,
      exitTicket,
      level: game.level.id,
      templateId: q.template.id,
      skill: q.template.skill,
      trap: correct ? "" : q.template.trap,
      params: q.values,
      equation: q.equation,
      answer: q.answer,
      given,
      correct,
      first,
      scaffold: !correct ? q.template.scaffold : "",
      timeMs,
      timestamp: Date.now(),
    });
    if (!correct) {
      if (game.wrong >= 2) {
        const g = new Generator();
        g.last.set(q.template.id, q.signature);
        setExample(g.generate(q.template, game.difficulty));
        setFeedback("worked");
      } else setFeedback("hint");
      setMessage("Almost! Let’s look at it another way.");
    }
  }
  function next() {
    game.nextVariant();
    setFeedback(null);
    setInput("");
    setMessage("");
  }
  function speak() {
    const voices = speechSynthesis
      .getVoices()
      .filter((v) => v.localService && v.lang.startsWith("en"));
    if (!voices.length) {
      setMessage("No offline English voice is installed on this device.");
      return;
    }
    speechSynthesis.cancel();
    const words = (q.prompt + " " + q.equation)
      .replaceAll("□", "box")
      .replaceAll("×", " multiplied by ")
      .replaceAll("÷", " divided by ")
      .replaceAll("−", " minus ")
      .replaceAll("=", " equals ");
    const u = new SpeechSynthesisUtterance(words);
    u.voice = voices.find((v) => v.lang === "en-AU") ?? voices[0];
    u.rate = 0.85;
    speechSynthesis.speak(u);
  }
  const disabled = feedback === "hint" || feedback === "worked";
  return (
    <div className="game-overlay">
      <section
        className="question-card"
        aria-labelledby="question-title"
        aria-live="polite"
      >
        <div className="question-top">
          <span className="supply-icon">
            <Icon name="spark" size={24} />
          </span>
          <span className="eyebrow">
            {game.practice
              ? "Practice mission"
              : game.w.bossActive
                ? game.w.bossTicket < 3
                  ? `Boss shield · ${game.w.bossTicket + 1} of 3`
                  : "Boss resupply"
                : "Resupply station"}
          </span>
          <span className="safe-tag">
            <Icon name="shield" size={13} /> Flight paused
          </span>
          <button
            type="button"
            className="question-pause"
            aria-label="Pause mission"
            onClick={() => game.pause()}
          >
            <Icon name="pause" size={18} />
          </button>
        </div>
        <h2 id="question-title">A little maths. More flight.</h2>
        <p className="question-prompt">{q.prompt}</p>
        {q.template.module === 3 && (
          <div className="story-steps">
            <span>1 · Write the equation</span>
            <span>2 · Undo the operation</span>
            <span>3 · Check the story</span>
          </div>
        )}
        <div className="equation">{q.equation}</div>
        {readAloud && "speechSynthesis" in window && (
          <button className="text-button" onClick={speak}>
            <Icon name="sound" size={16} /> Read aloud
          </button>
        )}
        {game.phase === "countdown" ? (
          <div className="answer-success">
            <Icon name="check" size={32} />
            <strong>Brilliant thinking!</strong>
            <p>{q.strategy}</p>
            <span>Take-off in {Math.ceil(game.countdown / 60)}…</span>
          </div>
        ) : (
          <>
            {message && <p className="kind-message">{message}</p>}
            {feedback === "hint" || feedback === "worked" ? (
              <>
                <Scaffold
                  q={feedback === "worked" ? example : q}
                  worked={feedback === "worked"}
                />
                <button className="button primary full" onClick={next}>
                  Try fresh numbers <Icon name="arrow" />
                </button>
              </>
            ) : feedback === "storycheck" ? (
              <div className="substitution">
                <span className="eyebrow">Check inside the story</span>
                <p className="sub-equation">{q.equation.replace("□", input)}</p>
                <p>Does your number make both sides equal and fit the story?</p>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => setFeedback(null)}
                  >
                    Edit answer
                  </button>
                  <button
                    className="button primary"
                    onClick={() => submit(Number(input), true)}
                  >
                    Lock my answer <Icon name="check" />
                  </button>
                </div>
              </div>
            ) : choices ? (
              <div className="choices">
                {q.choices.map((n) => (
                  <button key={n} className="choice" onClick={() => submit(n)}>
                    {fmt(n)}
                  </button>
                ))}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input !== "") submit(Number(input));
                }}
              >
                <label className="answer-label">
                  Your answer
                  <input
                    aria-label="Your answer"
                    inputMode={
                      q.template.answer_type === "decimal"
                        ? "decimal"
                        : "numeric"
                    }
                    value={input}
                    onChange={(e) => {
                      if (/^\d{0,4}(\.\d{0,2})?$/.test(e.target.value))
                        setInput(e.target.value);
                    }}
                    placeholder="?"
                    autoComplete="off"
                  />
                </label>
                <div className="keypad">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    q.template.answer_type === "decimal" ? "." : "⌫",
                    "0",
                    q.template.answer_type === "decimal" ? "⌫" : "C",
                  ].map((k, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        setInput((s) =>
                          k === "⌫"
                            ? s.slice(0, -1)
                            : k === "C"
                              ? ""
                              : k === "."
                                ? s.includes(".")
                                  ? s
                                  : (s || "0") + "."
                                : s.length < 6
                                  ? s + k
                                  : s,
                        );
                      }}
                      disabled={disabled}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <button
                  className="button primary full"
                  type="submit"
                  disabled={input === "" || input === "."}
                >
                  Check answer <Icon name="arrow" />
                </button>
              </form>
            )}
          </>
        )}
        <p className="question-foot">
          <Icon name="shield" size={13} /> Take your time. Your jet is safe
          while you think.
        </p>
      </section>
    </div>
  );
}
