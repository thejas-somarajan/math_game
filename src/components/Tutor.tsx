import { useState } from "react";
import type { AppData, Level, Profile } from "../types";
import { isAvailable, newProfile, uid } from "../types";
import { deleteStudent, emptyData } from "../storage";
import { hashPin, salt, validPin } from "../security";
import { Icon, Stars } from "./Icons";
export function Tutor({
  data,
  levels,
  onSave,
  onClose,
  onPlay,
}: {
  data: AppData;
  levels: Level[];
  onSave: () => void;
  onClose: () => void;
  onPlay: (level: Level, practice: boolean) => void;
}) {
  const [tab, setTab] = useState("students"),
    [selected, setSelected] = useState(data.selected),
    [name, setName] = useState(""),
    [newPin, setNewPin] = useState(""),
    [note, setNote] = useState("");
  const p = data.profiles.find((x) => x.id === selected) ?? data.profiles[0];
  const attempts = data.attempts.filter((a) => a.studentId === p?.id);
  const first = attempts.filter((a) => a.first);
  const accuracy = first.length
    ? Math.round((first.filter((a) => a.correct).length / first.length) * 100)
    : 0;
  const update = (fn: () => void) => {
    fn();
    onSave();
  };
  function csv() {
    const header = [
      "Student",
      "Session date",
      "Level",
      "Skill",
      "Equation",
      "Answer",
      "Submitted",
      "Correct",
      "First attempt",
      "Misconception",
      "Scaffold",
      "Time ms",
      "Date",
    ];
    const rows = attempts.map((a) => [
      p.name,
      new Date(
        data.sessions.find((s) => s.id === a.sessionId)?.startedAt ??
          a.timestamp,
      ).toISOString(),
      a.level,
      a.skill,
      a.equation,
      a.answer,
      a.given,
      a.correct,
      a.first,
      a.trap,
      a.scaffold,
      a.timeMs,
      new Date(a.timestamp).toISOString(),
    ]);
    const quote = (v: unknown) => {
      let s = String(v);
      if (/^[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const blob = new Blob(
      [
        "\uFEFF" +
          [header, ...rows].map((r) => r.map(quote).join(",")).join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "Sky-Numeracy-report.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function play(practice: boolean) {
    const level = levels.find((l) => isAvailable(p, l.id));
    if (!level) {
      setNote("Assign and unlock a compatible mission first.");
      return;
    }
    update(() => {
      data.selected = p.id;
      for (const s of data.sessions)
        if (s.studentId === p.id && !s.endedAt) s.endedAt = Date.now();
      data.sessions.push({
        id: uid(),
        studentId: p.id,
        startedAt: Date.now(),
        duration: practice ? 0 : data.settings.sessionLength,
        levels: [],
        results: [],
        practice,
        exitScores: {},
      });
    });
    onPlay(level, practice);
  }
  return (
    <main className="tutor-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">A little guidance. A lot of growth.</span>
          <h1>Tutor console</h1>
          <p>Make the adventure work for your learner.</p>
        </div>
        <button className="button secondary" onClick={onClose}>
          <Icon name="lock" size={16} /> Lock & return
        </button>
      </div>
      <div className="tutor-layout">
        <aside className="tutor-nav">
          {[
            ["students", "Pilots & lessons"],
            ["assignments", "Mission assignments"],
            ["reports", "Learning reports"],
            ["settings", "Settings & access"],
          ].map(([id, label]) => (
            <button
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => setTab(id)}
            >
              {label}
              <Icon name="arrow" size={16} />
            </button>
          ))}
          <div className="local-note">
            <Icon name="shield" />
            <p>
              Stored on this device.
              <br />
              No accounts. No cloud.
            </p>
          </div>
        </aside>
        <section className="tutor-content">
          {p && (
            <div className="student-switch">
              <label>
                Active learner
                <select
                  value={p.id}
                  onChange={(e) =>
                    update(() => {
                      setSelected(e.target.value);
                      data.selected = e.target.value;
                    })
                  }
                >
                  {data.profiles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="chip">
                <i />
                {attempts.length} recorded attempts
              </span>
            </div>
          )}
          {tab === "students" && (
            <>
              <div className="panel">
                <span className="eyebrow">Your next lesson</span>
                <h2>
                  {p
                    ? `Ready when you are, ${p.name}.`
                    : "Add your first pilot."}
                </h2>
                <p>
                  Start a guided session, or practise just the maths together.
                </p>
                <div className="field-row">
                  <label>
                    Lesson length
                    <select
                      value={data.settings.sessionLength}
                      onChange={(e) =>
                        update(() => {
                          data.settings.sessionLength = +e.target.value;
                        })
                      }
                    >
                      {[15, 30, 45, 60].map((n) => (
                        <option key={n} value={n}>
                          {n} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="button-row">
                    <button
                      className="button primary"
                      disabled={!p}
                      onClick={() => play(false)}
                    >
                      Start lesson <Icon name="arrow" />
                    </button>
                    <button
                      className="button secondary"
                      disabled={!p}
                      onClick={() => play(true)}
                    >
                      Questions only <Icon name="book" size={17} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="panel">
                <h2>Learner profile</h2>
                {p && (
                  <>
                    <label>
                      First name or nickname
                      <input
                        value={p.name}
                        maxLength={24}
                        onChange={(e) =>
                          update(() => {
                            p.name = e.target.value;
                          })
                        }
                      />
                    </label>
                    <div className="profile-summary">
                      <span>
                        <b>
                          {Object.values(p.stars).reduce((a, b) => a + b, 0)}
                        </b>{" "}
                        stars earned
                      </span>
                      <span>
                        <b>{Object.keys(p.stars).length}</b> missions completed
                      </span>
                      <span>
                        <b>{accuracy}%</b> first-try accuracy
                      </span>
                    </div>
                    <button
                      className="text-button danger"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete ${p.name} and every associated attempt, session and saved flight? This cannot be undone.`,
                          )
                        )
                          update(() => {
                            deleteStudent(data, p.id);
                            setSelected(data.selected);
                          });
                      }}
                    >
                      Delete this learner and all their data
                    </button>
                  </>
                )}
              </div>
              <div className="panel">
                <h2>Add another pilot</h2>
                <form
                  className="field-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    update(() => {
                      const s = newProfile(name);
                      data.profiles.push(s);
                      data.selected = s.id;
                      setSelected(s.id);
                      setName("");
                    });
                  }}
                >
                  <label>
                    First name or nickname
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={24}
                      placeholder="e.g. Alex"
                    />
                  </label>
                  <button className="button secondary" disabled={!name.trim()}>
                    Add learner +
                  </button>
                </form>
              </div>
            </>
          )}
          {tab === "assignments" && p && (
            <>
              <div className="panel">
                <h2>Choose their next adventure.</h2>
                <p>
                  Assigned and unlocked missions can be played. An explicit lock
                  takes priority over automatic progression.
                </p>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={p.autoProgress}
                    onChange={(e) =>
                      update(() => {
                        p.autoProgress = e.target.checked;
                      })
                    }
                  />{" "}
                  Automatically assign the next mission after two stars
                </label>
                {[1, 2, 3].map((m) => (
                  <div className="assignment-module" key={m}>
                    <div className="assignment-module-head">
                      <h3>
                        Module {m} ·{" "}
                        {
                          [
                            "Addition & subtraction",
                            "Multiplication & division",
                            "Stories & working backwards",
                          ][m - 1]
                        }
                      </h3>
                      <button
                        className="text-button"
                        onClick={() =>
                          update(() => {
                            for (const l of levels.filter(
                              (l) => l.module === m,
                            )) {
                              if (!p.assigned.includes(l.id))
                                p.assigned.push(l.id);
                              p.locks[l.id] = false;
                            }
                          })
                        }
                      >
                        Assign module +
                      </button>
                    </div>
                    {levels
                      .filter((l) => l.module === m)
                      .map((l) => (
                        <div className="assignment" key={l.id}>
                          <span className="number-badge">
                            {String(l.id).padStart(2, "0")}
                          </span>
                          <span>
                            <strong>{l.skill}</strong>
                            <small>
                              {l.name}
                              {[4, 14].includes(l.id) && !p.difficulty.decimals
                                ? " · Enable decimals to play"
                                : ""}
                            </small>
                          </span>
                          <Stars count={p.stars[l.id] || 0} />
                          <label className="inline-check">
                            <input
                              type="checkbox"
                              checked={p.assigned.includes(l.id)}
                              onChange={(e) =>
                                update(() => {
                                  p.assigned = e.target.checked
                                    ? [...p.assigned, l.id]
                                    : p.assigned.filter((x) => x !== l.id);
                                })
                              }
                            />{" "}
                            Assigned
                          </label>
                          <button
                            className={
                              "lock-control " +
                              (p.locks[l.id] === true ? "locked" : "")
                            }
                            aria-label={`${p.locks[l.id] === true ? "Unlock" : "Lock"} level ${l.id}`}
                            onClick={() =>
                              update(() => {
                                p.locks[l.id] = p.locks[l.id] !== true;
                              })
                            }
                          >
                            <Icon
                              name={p.locks[l.id] === true ? "lock" : "check"}
                              size={16}
                            />
                            {p.locks[l.id] === true ? "Locked" : "Unlocked"}
                          </button>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
              <div className="panel">
                <h2>Difficulty & pace</h2>
                <div className="settings-grid">
                  <label>
                    Number range cap
                    <select
                      value={p.difficulty.cap}
                      onChange={(e) =>
                        update(() => {
                          p.difficulty.cap = +e.target.value;
                        })
                      }
                    >
                      {[20, 50, 100, 200].map((n) => (
                        <option key={n} value={n}>
                          Up to {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ammunition capacity
                    <select
                      value={p.difficulty.ammo}
                      onChange={(e) =>
                        update(() => {
                          p.difficulty.ammo = +e.target.value;
                        })
                      }
                    >
                      {[0.5, 1, 1.5, 2].map((n) => (
                        <option key={n} value={n}>
                          {n}× {n === 1 ? "· Standard" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={p.difficulty.choices}
                      onChange={(e) =>
                        update(() => {
                          p.difficulty.choices = e.target.checked;
                        })
                      }
                    />{" "}
                    Multiple choice in Levels 1–2
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={p.difficulty.decimals}
                      onChange={(e) =>
                        update(() => {
                          p.difficulty.decimals = e.target.checked;
                        })
                      }
                    />{" "}
                    Decimal questions enabled
                  </label>
                </div>
              </div>
            </>
          )}
          {tab === "reports" && (
            <div className="report-print">
              <div className="panel">
                <div className="report-heading">
                  <div>
                    <span className="eyebrow">Learning, made visible</span>
                    <h2>
                      {p ? `${p.name}’s progress` : "Your learner’s progress"}
                    </h2>
                  </div>
                  <div className="button-row no-print">
                    <button
                      className="button secondary"
                      onClick={csv}
                      disabled={!p}
                    >
                      <Icon name="download" size={16} /> CSV
                    </button>
                    <button
                      className="button secondary"
                      disabled={!p}
                      onClick={() => window.print()}
                    >
                      Print / Save PDF
                    </button>
                  </div>
                </div>
                <div className="report-stats">
                  <span>
                    <b>{attempts.length}</b>Total attempts
                  </span>
                  <span>
                    <b>{accuracy}%</b>First-try accuracy
                  </span>
                  <span>
                    <b>{attempts.filter((a) => a.scaffold).length}</b>Scaffolds
                    used
                  </span>
                </div>
                <h3>By skill</h3>
                {!attempts.length ? (
                  <div className="empty-state">
                    <Icon name="book" size={32} />
                    <p>
                      Their story starts with the first question.
                      <br />
                      Learning reports will appear here after play.
                    </p>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Skill</th>
                          <th>Attempts</th>
                          <th>First try</th>
                          <th>Average time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...new Set(attempts.map((a) => a.skill))].map(
                          (skill) => {
                            const a = attempts.filter((x) => x.skill === skill),
                              f = a.filter((x) => x.first);
                            return (
                              <tr key={skill}>
                                <td>{skill.replaceAll("_", " ")}</td>
                                <td>{a.length}</td>
                                <td>
                                  {f.length
                                    ? Math.round(
                                        (f.filter((x) => x.correct).length /
                                          f.length) *
                                          100,
                                      )
                                    : 0}
                                  %
                                </td>
                                <td>
                                  {(
                                    a.reduce((n, x) => n + x.timeMs, 0) /
                                    Math.max(1, f.length) /
                                    1000
                                  ).toFixed(1)}{" "}
                                  s
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <h3>Misconception signals</h3>
                <p className="muted">
                  Wrong attempts grouped by each template’s targeted trap; these
                  are teaching signals, not a diagnosis.
                </p>
                <div className="trap-list">
                  {[
                    [
                      "adding_instead_of_subtracting",
                      "Adding instead of subtracting",
                    ],
                    ["missing_divisor", "Missing divisor confusion"],
                    [
                      "left_to_right_equals",
                      "Equals as “the answer comes next”",
                    ],
                  ].map(([id, label]) => (
                    <div key={id}>
                      <span>{label}</span>
                      <b>
                        {
                          attempts.filter((a) => !a.correct && a.trap === id)
                            .length
                        }
                      </b>
                    </div>
                  ))}
                </div>
                <h3>Sessions</h3>
                {data.sessions
                  .filter((s) => s.studentId === p?.id)
                  .slice(-20)
                  .reverse()
                  .map((s) => {
                    const a = attempts.filter((x) => x.sessionId === s.id);
                    return (
                      <div className="session-row" key={s.id}>
                        <strong>
                          {new Date(s.startedAt).toLocaleDateString("en-AU")} ·{" "}
                          {s.practice ? "Practice" : "Flight"}
                        </strong>
                        <p>
                          {s.levels.map((l) => `L${l}`).join(", ") ||
                            "Ready to start"}{" "}
                          · {a.length} attempts ·{" "}
                          {a.filter((x) => x.correct).length} correct ·{" "}
                          {a.filter((x) => x.scaffold).length} scaffolded
                        </p>
                        <small>
                          {s.results
                            .map((r) => `L${r.level}: ${r.stars} stars`)
                            .join(" · ") || "No completed missions yet"}
                          {Object.entries(s.exitScores).map(
                            ([m, n]) => ` · Module ${m} exit ticket: ${n}/3`,
                          )}
                        </small>
                      </div>
                    );
                  })}
                <h3>Last 50 questions</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Response</th>
                        <th>Result</th>
                        <th>Scaffold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts
                        .slice(-50)
                        .reverse()
                        .map((a) => (
                          <tr key={a.id}>
                            <td>{a.equation}</td>
                            <td>{a.given}</td>
                            <td>{a.correct ? "Correct" : "Try again"}</td>
                            <td>{a.scaffold || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {tab === "settings" && (
            <>
              <div className="panel">
                <h2>Comfort & accessibility</h2>
                <div className="settings-grid">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={data.settings.reducedMotion}
                      onChange={(e) =>
                        update(() => {
                          data.settings.reducedMotion = e.target.checked;
                        })
                      }
                    />{" "}
                    Reduced motion
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={data.settings.readAloud}
                      onChange={(e) =>
                        update(() => {
                          data.settings.readAloud = e.target.checked;
                        })
                      }
                    />{" "}
                    Offline read-aloud button
                  </label>
                  <label>
                    Text size
                    <select
                      value={data.settings.textSize}
                      onChange={(e) =>
                        update(() => {
                          data.settings.textSize = +e.target.value;
                        })
                      }
                    >
                      <option value={1}>Standard</option>
                      <option value={1.15}>Large</option>
                      <option value={1.3}>Larger</option>
                    </select>
                  </label>
                  <label>
                    Music volume
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".05"
                      value={data.settings.music}
                      onChange={(e) =>
                        update(() => {
                          data.settings.music = +e.target.value;
                        })
                      }
                    />
                  </label>
                  <label>
                    Sound effects
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".05"
                      value={data.settings.sound}
                      onChange={(e) =>
                        update(() => {
                          data.settings.sound = +e.target.value;
                        })
                      }
                    />
                  </label>
                </div>
                <p className="muted">
                  Read-aloud uses an installed offline English voice. Browser
                  storage is separate on every device.
                </p>
              </div>
              <div className="panel">
                <h2>Change tutor PIN</h2>
                <form
                  className="field-row"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!validPin(newPin)) {
                      setNote("Choose a PIN with 4 to 6 digits.");
                      return;
                    }
                    const s = salt();
                    const h = await hashPin(newPin, s);
                    update(() => {
                      data.settings.salt = s;
                      data.settings.pinHash = h;
                      setNewPin("");
                      setNote("Tutor PIN updated.");
                    });
                  }}
                >
                  <label>
                    New PIN
                    <input
                      type="password"
                      inputMode="numeric"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      maxLength={6}
                      autoComplete="new-password"
                    />
                  </label>
                  <button className="button secondary">Update PIN</button>
                </form>
              </div>
              <div className="panel danger-panel">
                <h2>Delete all local data</h2>
                <p>
                  This removes every learner, report, saved flight and setting
                  from this browser.
                </p>
                <button
                  className="button danger-button"
                  onClick={() => {
                    if (
                      confirm(
                        "Permanently delete ALL Sky Numeracy data in this browser? This cannot be undone.",
                      )
                    ) {
                      Object.assign(data, emptyData());
                      onSave();
                      onClose();
                    }
                  }}
                >
                  Delete all app data
                </button>
              </div>
            </>
          )}
          {note && (
            <p className="kind-message" role="status">
              {note}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
