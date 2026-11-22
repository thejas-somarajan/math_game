import { useEffect, useRef, useState } from "react";
import type { AppData, Attempt, Level, Profile, Session } from "../types";
import { award, isAvailable, rating, uid } from "../types";
import { Controller, type Snapshot } from "../game/controller";
import { Renderer } from "../game/renderer";
import { audio } from "../game/audio";
import { QuestionPanel } from "./QuestionPanel";
import { Icon, Stars } from "./Icons";
import { FlightInput, type FlightAction } from "../game/input";
import { TabletControls } from "./TabletControls";
export function Game({
  data,
  profile,
  level,
  practice,
  onSave,
  onExit,
}: {
  data: AppData;
  profile: Profile;
  level: Level;
  practice: boolean;
  onSave: () => void;
  onExit: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    controller = useRef<Controller | null>(null),
    [, refresh] = useState(0),
    [result, setResult] = useState<{ stars: number; accuracy: number } | null>(
      null,
    ),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const sessionRef = useRef<Session | null>(null),
    attemptStart = useRef(Date.now()),
    breakAt = useRef(Date.now() + 30 * 60000),
    warned = useRef(false);
  const savedKey = profile.id + ":" + level.id + (practice ? ":practice" : "");
  const game = controller.current;
  const heldInput = useRef(new FlightInput());
  function setHeld(source: string, action: FlightAction | undefined) {
    if (action && controller.current?.phase === "flight")
      heldInput.current.press(source, action);
    else heldInput.current.release(source);
    if (controller.current)
      controller.current.input = heldInput.current.snapshot();
  }
  function resetInput() {
    heldInput.current.reset();
    if (controller.current)
      controller.current.input = heldInput.current.snapshot();
  }
  useEffect(() => {
    if (!isAvailable(profile, level.id)) {
      setError("This mission is locked. Ask your tutor to assign it.");
      return;
    }
    let session = [...data.sessions]
      .reverse()
      .find(
        (s) =>
          s.studentId === profile.id && !s.endedAt && s.practice === practice,
      );
    if (!session) {
      session = {
        id: uid(),
        studentId: profile.id,
        startedAt: Date.now(),
        duration: 0,
        levels: [],
        results: [],
        practice,
        exitScores: {},
      };
      data.sessions.push(session);
    }
    sessionRef.current = session;
    if (!session.levels.includes(level.id)) session.levels.push(level.id);
    const stored = data.checkpoints[savedKey] as Snapshot | undefined;
    attemptStart.current =
      (stored as Snapshot & { startedAt?: number })?.startedAt ?? Date.now();
    let engine: Controller;
    try {
      engine = new Controller(
        level,
        profile.difficulty,
        profile.assigned.filter((id) => isAvailable(profile, id)),
        {
          change: () => refresh((x) => x + 1),
          checkpoint: (s) => {
            data.checkpoints[savedKey] = {
              ...s,
              startedAt: attemptStart.current,
            };
            onSave();
          },
          sound: (s) => audio.cue(s),
          finish: () => {
            const at = data.attempts.filter(
              (a) =>
                a.studentId === profile.id &&
                a.level === level.id &&
                a.timestamp >= attemptStart.current,
            );
            const first = at.filter((a) => a.first);
            const accuracy = first.length
              ? first.filter((a) => a.correct).length / first.length
              : 0;
            const stars = rating(accuracy, engine.w.lives);
            award(profile, level.id, stars);
            session!.results.push({ level: level.id, stars });
            // Only module finales replace the module exit-ticket result.
            if (level.id % 5 === 0)
              session!.exitScores[level.module] = [0, 1, 2].filter(
                (slot) => at.find((a) => a.exitTicket === slot)?.correct,
              ).length;
            delete data.checkpoints[savedKey];
            setResult({ stars, accuracy });
            audio.stop();
            onSave();
          },
        },
        stored,
        practice,
      );
    } catch (e) {
      setError(String(e));
      return;
    }
    for (const a of data.attempts.filter(
      (a) => a.studentId === profile.id && !a.correct,
    ))
      engine.failures[a.skill] = (engine.failures[a.skill] || 0) + 1;
    controller.current = engine;
    audio.music = data.settings.music;
    audio.sound = data.settings.sound;
    audio.start(level.id);
    onSave();
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const renderer = new Renderer(ctx, level.id, level.bossConfig.art);
    let last = performance.now(),
      acc = 0,
      raf = 0,
      lastRefresh = 0;
    const frame = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= 1000 / 60) {
        engine.tick();
        acc -= 1000 / 60;
      }
      renderer.draw(engine, data.settings.reducedMotion, profile.jet);
      if (now - lastRefresh > 100) {
        refresh((x) => x + 1);
        lastRefresh = now;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const timer = setInterval(() => {
      const s = sessionRef.current!;
      if (s.duration > 0 && !s.endedAt) {
        const remain = s.duration * 60000 - (Date.now() - s.startedAt);
        if (remain <= 5 * 60000 && !warned.current) {
          warned.current = true;
          setNotice("Five minutes left. You’re doing great!");
        }
        if (remain <= 0) {
          engine.pause();
          data.checkpoints[savedKey] = {
            ...engine.snapshot(),
            startedAt: attemptStart.current,
          };
          s.endedAt = Date.now();
          engine.stopped = true;
          audio.stop();
          setNotice("Session complete. Your progress is saved.");
          onSave();
        }
      } else if (Date.now() >= breakAt.current) {
        engine.pause();
        setNotice("Time for a little stretch! Take a break, then continue.");
        breakAt.current = Date.now() + 30 * 60000;
      }
    }, 1000);
    const keys = (e: KeyboardEvent, down: boolean) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      const map: Record<string, keyof typeof engine.input> = {
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        " ": "fire",
      };
      if (map[k]) {
        if (engine.phase === "flight") e.preventDefault();
        setHeld("key:" + k, down ? map[k] : undefined);
      }
      if (down && k === "b") engine.bomb();
      if (down && k === "escape") engine.pause();
    };
    const kd = (e: KeyboardEvent) => keys(e, true),
      ku = (e: KeyboardEvent) => keys(e, false);
    const blur = () => {
      resetInput();
      engine.pause();
    };
    const hide = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hide);
    refresh((x) => x + 1);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      audio.stop();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hide);
      if (engine.phase !== "result") {
        data.checkpoints[savedKey] = {
          ...engine.snapshot(),
          startedAt: attemptStart.current,
        };
        onSave();
      }
      engine.stopped = true;
      resetInput();
    };
  }, []);
  function leave() {
    const s = sessionRef.current;
    if (s && !s.endedAt) s.endedAt = Date.now();
    onSave();
    onExit();
  }
  function record(a: Attempt) {
    data.attempts.push(a);
    onSave();
    refresh((x) => x + 1);
  }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons || e.pointerType === "touch") {
      const r = e.currentTarget.getBoundingClientRect();
      controller.current?.move(
        ((e.clientX - r.left) / r.width) * 480,
        ((e.clientY - r.top) / r.height) * 720,
      );
    }
  };
  return (
    <main className="flight-page">
      <div className="flight-heading">
        <button
          className="text-button"
          onClick={() => {
            game?.pause();
          }}
        >
          <Icon name="home" /> Mission control
        </button>
        <span>
          MISSION {String(level.id).padStart(2, "0")} <b>{level.name}</b>
        </span>
        <button
          className="icon-button"
          aria-label="Pause flight"
          onClick={() => game?.pause()}
        >
          <Icon name="pause" />
        </button>
      </div>
      <div className="flight-layout">
        <aside className="flight-side">
          <span className="eyebrow">Your mission</span>
          <h2>{level.skill}</h2>
          <p>{level.subtitle}</p>
          <div className="side-fact">
            <Icon name="spark" />
            <span>
              Think. Resupply. Fly.
              <small>Correct maths is your only fuel.</small>
            </span>
          </div>
          <div className="flight-hints">
            <h3>Pilot’s checklist</h3>
            <p>
              Move with <kbd>W A S D</kbd> or arrow keys.
            </p>
            <p>On a tablet, hold the direction buttons or drag your jet.</p>
            <p>
              Hold <kbd>Space</kbd> to fire, or use auto-fire.
            </p>
            <p>
              Press <kbd>B</kbd> to use an energy bomb.
            </p>
            <p>Every question is a safe place to think.</p>
          </div>
          <button
            className="button secondary full"
            onClick={() => {
              if (game) {
                game.auto = !game.auto;
                refresh((x) => x + 1);
              }
            }}
          >
            Auto-fire {game?.auto ? "ON" : "OFF"}
          </button>
          {game && (
            <button
              className="button secondary full"
              disabled={game.w.bombs === 0}
              onClick={() => game.bomb()}
            >
              Energy bomb · {game.w.bombs}
            </button>
          )}
        </aside>
        <div className="play-column">
          <div className="arcade-shell">
            <div className="arcade-hud">
              <span>
                <small>SCORE</small>
                {String(game?.w.score ?? 0).padStart(6, "0")}
              </span>
              <span className="hud-lives">
                <small>LIVES</small>
                {"♥".repeat(game?.w.lives ?? 3)}
              </span>
              <span>
                <small>AMMO</small>
                {game?.w.ammo ?? 0}
                <i>
                  <em
                    style={{
                      width: `${((game?.w.ammo ?? 0) / (game?.capacity ?? level.ammoCapacity)) * 100}%`,
                    }}
                  />
                </i>
              </span>
            </div>
            <div className="canvas-wrap">
              <canvas
                ref={canvas}
                width="480"
                height="720"
                aria-label={`${level.name} arcade flight. Drag to move your jet.`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setHeld("canvas:" + e.pointerId, "fire");
                  move(e);
                }}
                onPointerMove={move}
                onPointerUp={(e) => setHeld("canvas:" + e.pointerId, undefined)}
                onPointerCancel={(e) =>
                  setHeld("canvas:" + e.pointerId, undefined)
                }
                onLostPointerCapture={(e) =>
                  setHeld("canvas:" + e.pointerId, undefined)
                }
              />
              {game &&
                (game.phase === "question" ||
                  (game.phase === "countdown" && game.w.ammo > 0)) &&
                !result && (
                  <QuestionPanel
                    game={game}
                    studentId={profile.id}
                    sessionId={sessionRef.current?.id ?? ""}
                    onAttempt={record}
                    readAloud={data.settings.readAloud}
                  />
                )}
              {game?.phase === "paused" && (
                <div className="game-overlay">
                  <div className="pause-card">
                    <Icon name="plane" size={42} />
                    <span className="eyebrow">A moment on the ground</span>
                    <h2>
                      {game.stopped ? "Great work, pilot." : "Flight paused"}
                    </h2>
                    <p>
                      {game.stopped
                        ? "Your session has ended and your progress is safe."
                        : "Your jet and your progress are safe."}
                    </p>
                    {!game.stopped && (
                      <button
                        className="button primary full"
                        onClick={() => {
                          setNotice("");
                          game.resume();
                        }}
                      >
                        Continue flight <Icon name="arrow" />
                      </button>
                    )}
                    <button className="button secondary full" onClick={leave}>
                      Back to missions
                    </button>
                  </div>
                </div>
              )}
              {result && (
                <div className="game-overlay">
                  <div className="pause-card result-card">
                    <span className="eyebrow">Mission complete</span>
                    <div className="result-stars">
                      <Stars count={result.stars} />
                    </div>
                    <h2>Sky-high thinking!</h2>
                    <p>You completed {level.name}.</p>
                    <div className="result-numbers">
                      <span>
                        <strong>{Math.round(result.accuracy * 100)}%</strong>
                        First-try accuracy
                      </span>
                      <span>
                        <strong>{game?.w.score.toLocaleString()}</strong>Flight
                        score
                      </span>
                    </div>
                    <p>
                      {result.stars >= 2
                        ? "Your next adventure is ready."
                        : "Replay whenever you like. Two stars unlock the next mission."}
                    </p>
                    <button className="button primary full" onClick={leave}>
                      Back to mission control <Icon name="arrow" />
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div className="game-overlay">
                  <div className="pause-card">
                    <h2>Let’s check this mission.</h2>
                    <p>{error}</p>
                    <button className="button primary" onClick={leave}>
                      Back to missions
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="arcade-footer">
              <span>SKY NUMERACY</span>
              <span>
                {game?.w.bossActive
                  ? `BOSS RANK ${level.id}`
                  : `SECTOR ${Math.min(level.segments.length, (game?.w.segment ?? 0) + 1)} / ${level.segments.length}`}
              </span>
              <span>✦ {profile.name}</span>
            </div>
          </div>
          {!practice && (
            <TabletControls
              game={game}
              onHeld={setHeld}
              onReset={resetInput}
              onAuto={() => {
                if (game) {
                  game.auto = !game.auto;
                  refresh((x) => x + 1);
                }
              }}
            />
          )}
        </div>
        <aside className="flight-side right">
          <span className="eyebrow">Learning radar</span>
          <div className="radar">
            <div />
            <Icon name="plane" size={27} />
          </div>
          <h3>
            {
              [
                "Build your number sense.",
                "Discover the inverse.",
                "Make the story balance.",
              ][level.module - 1]
            }
          </h3>
          <p>
            Flying is the adventure.
            <br />
            Thinking is the superpower.
          </p>
          <div className="tiny-card">
            <Icon name="shield" />
            <strong>No rush, no penalties.</strong>
            <p>Every mistake is a chance to learn something new.</p>
          </div>
        </aside>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
