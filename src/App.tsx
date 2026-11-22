import { useEffect, useState } from "react";
import levelData from "./data/levels.json";
import type { AppData, Level, Profile } from "./types";
import { isAvailable, newProfile } from "./types";
import { readData, saveData } from "./storage";
import { hashPin } from "./security";
import { audio } from "./game/audio";
import { Game } from "./components/Game";
import { Tutor } from "./components/Tutor";
import { Icon, Stars } from "./components/Icons";
const levels = levelData as Level[];
const modules = [
  {
    title: "The missing pieces",
    skill: "Addition & subtraction",
    description: "Find the unknown. Keep the balance.",
    symbol: "+",
  },
  {
    title: "Stronger together",
    skill: "Multiplication & division",
    description: "Discover what makes the numbers work.",
    symbol: "×",
  },
  {
    title: "Stories in the sky",
    skill: "Stories & working backwards",
    description: "Turn a little story into a big idea.",
    symbol: "□",
  },
];
export default function App() {
  const [data, setData] = useState<AppData | null>(null),
    [route, setRoute] = useState("missions"),
    [module, setModule] = useState(1),
    [, rev] = useState(0),
    [modal, setModal] = useState(""),
    [selectedLevel, setSelectedLevel] = useState<Level | null>(null),
    [activeLevel, setActiveLevel] = useState<Level | null>(null),
    [practice, setPractice] = useState(false),
    [name, setName] = useState(""),
    [pin, setPin] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [storageError, setStorageError] = useState("");
  useEffect(() => {
    readData()
      .then(setData)
      .catch(() =>
        setStorageError(
          "Local storage is unavailable. Open this game in a regular browser window with storage enabled.",
        ),
      );
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = `${(data?.settings.textSize ?? 1) * 16}px`;
  }, [data?.settings.textSize]);
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement | null;
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal("");
        setMessage("");
        return;
      }
      if (e.key !== "Tab") return;
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".modal button:not(:disabled),.modal input,.modal select,.modal a[href]",
        ),
      );
      const first = elements[0],
        last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      before?.focus();
    };
  }, [modal]);
  const save = () => {
    if (!data) return;
    rev((n) => n + 1);
    void saveData(data).catch(() =>
      setStorageError(
        "Your browser could not save progress. Check available storage before continuing.",
      ),
    );
  };
  const p =
    data?.profiles.find((p) => p.id === data.selected) ?? data?.profiles[0];
  const available = levels.filter((l) =>
      p ? isAvailable(p, l.id) : l.id === 1,
    ),
    next =
      available.find((l) => !((p?.stars[l.id] ?? 0) >= 2)) ??
      available[0] ??
      levels[0];
  const totalStars = p ? Object.values(p.stars).reduce((a, b) => a + b, 0) : 0;
  const completed = p ? Object.keys(p.stars).length : 0;
  function tutor() {
    setPin("");
    setMessage("");
    setModal("pin");
  }
  function start(l: Level, onlyQuestions = false) {
    if (!p) {
      setSelectedLevel(l);
      setPractice(onlyQuestions);
      setModal("setup");
      return;
    }
    if (!isAvailable(p, l.id)) {
      setMessage("Your tutor can assign and unlock this mission.");
      setSelectedLevel(l);
      setModal("brief");
      return;
    }
    setSelectedLevel(l);
    setPractice(onlyQuestions);
    if (!data!.settings.tutorial && !onlyQuestions) {
      setModal("tutorial");
      return;
    }
    setActiveLevel(l);
    setRoute("game");
    setModal("");
  }
  async function setup(e: React.FormEvent) {
    e.preventDefault();
    if (!data || busy) return;
    if (!name.trim()) {
      setMessage("Give your pilot a first name or nickname.");
      return;
    }
    setBusy(true);
    try {
      const profile = newProfile(name);
      data.profiles.push(profile);
      data.selected = profile.id;
      save();
      setModal("");
      setPin("");
      setMessage("");
      if (selectedLevel) {
        setModal(practice ? "" : "tutorial");
        if (practice) {
          setActiveLevel(selectedLevel);
          setRoute("game");
        }
      } else setRoute("missions");
    } finally {
      setBusy(false);
    }
  }
  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!data || busy) return;
    setBusy(true);
    if ((await hashPin(pin, data.settings.salt)) === data.settings.pinHash) {
      setRoute("tutor");
      setModal("");
      setPin("");
      setMessage("");
    } else {
      setMessage("That PIN doesn’t match. Try again.");
      setPin("");
    }
    setBusy(false);
  }
  const closeModal = () => {
    setModal("");
    setMessage("");
    setPin("");
  };
  if (!data)
    return (
      <div className="loading-screen">
        <Icon name="plane" size={48} />
        <h1>Sky Numeracy</h1>
        <p>{storageError || "Preparing your adventure…"}</p>
      </div>
    );
  return (
    <div
      className={"app " + (data.settings.reducedMotion ? "reduced-motion" : "")}
    >
      <header className="site-header">
        <button
          className="brand"
          onClick={() => {
            if (route !== "game") setRoute("missions");
          }}
          aria-label="Sky Numeracy home"
        >
          <span className="brand-mark">
            <Icon name="plane" size={25} />
          </span>
          <span>
            sky<span className="brand-light">numeracy</span>
            <small>BIG THINKING. HIGH FLYING.</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          {[
            ["missions", "Missions"],
            ["hangar", "The hangar"],
            ["manual", "Flight manual"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={route === id ? "active" : ""}
              disabled={route === "game"}
              onClick={() => setRoute(id)}
            >
              {label}
              {route === id && <i />}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <span className="offline-label">
            <i /> Offline ready
          </span>
          <button
            className="tutor-button"
            onClick={tutor}
            disabled={route === "game"}
          >
            <Icon name="settings" size={17} /> Tutor console{" "}
            <Icon name="lock" size={12} />
          </button>
          <div className="avatar" title={p?.name || "New pilot"}>
            {p?.name?.[0]?.toUpperCase() || "✦"}
          </div>
        </div>
      </header>
      {route === "game" && p && activeLevel ? (
        <Game
          key={p.id + ":" + activeLevel.id + ":" + practice}
          data={data}
          profile={p}
          level={activeLevel}
          practice={practice}
          onSave={save}
          onExit={() => setRoute("missions")}
        />
      ) : route === "tutor" ? (
        <Tutor
          data={data}
          levels={levels}
          onSave={save}
          onClose={() => {
            setRoute("missions");
            setSelectedLevel(null);
          }}
          onPlay={(l, pr) => start(l, pr)}
        />
      ) : route === "hangar" ? (
        <main className="page-content">
          <div className="page-title">
            <div>
              <span className="eyebrow">Built for big adventures</span>
              <h1>Your wings. Your way.</h1>
              <p>Earn stars through great thinking to unlock your next jet.</p>
            </div>
            <span className="chip">
              <Icon name="star" size={17} />
              {totalStars} stars collected
            </span>
          </div>
          <div className="hangar-grid">
            {[
              [
                "Kingfisher",
                "Your first set of wings. Nimble, bright and ready for anything.",
                0,
              ],
              [
                "Sunbird",
                "A golden explorer for a mind that keeps on growing.",
                12,
              ],
              [
                "Starling",
                "A cosmic companion for a sky full of possibilities.",
                30,
              ],
            ].map(([title, desc, cost], i) => {
              const unlocked = totalStars >= +cost,
                chosen = p?.jet === i;
              return (
                <article
                  className={"jet-card " + (chosen ? "selected" : "")}
                  key={title}
                >
                  <div className="hangar-number">AIRFRAME / 0{i + 1}</div>
                  <div
                    className="jet-sprite"
                    style={{
                      backgroundImage: "url(/assets/jets.png)",
                      backgroundPosition: `${i * 50}% 50%`,
                    }}
                  />
                  <span className="eyebrow">
                    {i === 0
                      ? "The original"
                      : i === 1
                        ? "The explorer"
                        : "The dreamer"}
                  </span>
                  <h2>{title}</h2>
                  <p>{desc}</p>
                  <button
                    className={"button " + (chosen ? "primary" : "secondary")}
                    disabled={!unlocked || !p}
                    onClick={() => {
                      if (p) {
                        p.jet = i;
                        save();
                      }
                    }}
                  >
                    {chosen ? (
                      <>
                        <Icon name="check" size={16} /> Your current jet
                      </>
                    ) : unlocked ? (
                      "Select jet"
                    ) : (
                      <>
                        <Icon name="lock" size={16} />
                        {cost} stars to unlock
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </main>
      ) : route === "manual" ? (
        <main className="page-content">
          <div className="page-title">
            <div>
              <span className="eyebrow">Your guide to the skies</span>
              <h1>Great pilots are great thinkers.</h1>
              <p>Everything you need for your first adventure.</p>
            </div>
          </div>
          <div className="manual-grid">
            {[
              [
                "01",
                "Find your mission",
                "Your tutor chooses the skills you practise. Start with River Run and earn two stars to unlock the next adventure.",
              ],
              [
                "02",
                "Make your move",
                "Use arrow keys or W A S D. On a tablet, hold the on-screen arrows or drag your jet. Hold FIRE to shoot, or leave auto-fire on.",
              ],
              [
                "03",
                "Think to refuel",
                "A correct maths answer is the only way to earn ammo. The whole game pauses while you think. Take all the time you need.",
              ],
              [
                "04",
                "Learn a little differently",
                "If you miss an answer, a bar, triangle or balance scale helps you see it another way. Fresh numbers give you a fresh start.",
              ],
              [
                "05",
                "Discover your power-ups",
                "Collect shields, spread shots and energy bombs. Press B or the bomb button to clear the skies. These never refill ammo.",
              ],
              [
                "06",
                "Reach for the stars",
                "Stars celebrate first-try maths accuracy and remaining lives. Shooting speed doesn’t determine your stars. Two stars unlock your next mission.",
              ],
            ].map(([n, title, text]) => (
              <article className="panel" key={n}>
                <span className="manual-number">{n}</span>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="manual-footer">
            <Icon name="shield" size={26} />
            <span>
              <strong>A safe place to make mistakes.</strong>
              <br />
              No lost lives or points for a wrong maths answer. Ever.
            </span>
            <button className="button primary" onClick={() => start(next)}>
              Let’s fly <Icon name="arrow" />
            </button>
          </div>
        </main>
      ) : (
        <main className="page-content missions-page">
          <div className="welcome-row">
            <div>
              <span className="eyebrow">YOUR NEXT GREAT ADVENTURE</span>
              <h1>
                {p ? `Welcome back, ${p.name}.` : "Ready to reach new heights?"}
              </h1>
              <p>A little courage. A little maths. A whole sky to explore.</p>
            </div>
            <div className="pilot-stats">
              <span>
                <Icon name="star" size={19} />
                <b>{totalStars}</b>
                <small>STARS EARNED</small>
              </span>
              <div />
              <span>
                <Icon name="check" size={19} />
                <b>
                  {completed}
                  <em>/15</em>
                </b>
                <small>MISSIONS COMPLETE</small>
              </span>
            </div>
          </div>
          <section className="adventure-hero">
            <div className="hero-art" />
            <div className="hero-copy">
              <span className="hero-badge">
                <i /> THE ADVENTURE STARTS WITH YOU
              </span>
              <h2>
                A little maths.
                <br />A big adventure.
              </h2>
              <p>
                Take to the skies, find the missing numbers,
                <br className="desktop-break" /> and let your thinking take you
                further.
              </p>
              <button
                className="button primary hero-cta"
                onClick={() => start(next)}
              >
                {completed ? "Continue adventure" : "Let’s take flight"}
                <Icon name="arrow" size={19} />
              </button>
              <div className="hero-caption">
                <span className="tiny-jet">✦</span>
                <span>
                  Next stop: <b>{next.name}</b>
                </span>
                <span className="hero-level">
                  LEVEL {String(next.id).padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="hero-coordinates">
              <span>FLIGHT PATH / 01</span>
              <span>EXPLORE. THINK. SOAR.</span>
            </div>
            <div className="hero-stamp">
              <Icon name="plane" size={16} />
              <span>
                YOUR MIND IS
                <br />
                YOUR SUPERPOWER
              </span>
            </div>
          </section>
          <section className="journey-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ONE MISSION AT A TIME</span>
                <h2>Your learning journey</h2>
              </div>
              <span className="journey-count">
                3 worlds <i /> 15 missions <i /> Endless possibilities
              </span>
            </div>
            <div className="journey-layout">
              <aside className="module-list">
                {modules.map((m, i) => {
                  const stars = levels
                    .filter((l) => l.module === i + 1)
                    .reduce((sum, l) => sum + (p?.stars[l.id] || 0), 0);
                  return (
                    <button
                      key={m.title}
                      className={
                        "module-card " + (module === i + 1 ? "active" : "")
                      }
                      onClick={() => setModule(i + 1)}
                    >
                      <span className="module-symbol">{m.symbol}</span>
                      <span className="module-card-text">
                        <small>WORLD 0{i + 1}</small>
                        <strong>{m.title}</strong>
                        <span>{m.skill}</span>
                        <span className="module-progress">
                          <i style={{ width: `${(stars / 15) * 100}%` }} />
                        </span>
                      </span>
                      <Icon
                        name={module === i + 1 ? "arrow" : "lock"}
                        size={16}
                      />
                    </button>
                  );
                })}
                <div className="encouragement">
                  <Icon name="spark" size={22} />
                  <p>
                    Small steps.
                    <br />
                    <strong>Sky-high possibilities.</strong>
                  </p>
                </div>
              </aside>
              <div className="mission-area">
                <div className="world-heading">
                  <div>
                    <span className="eyebrow">
                      WORLD 0{module} · {modules[module - 1].skill}
                    </span>
                    <h3>{modules[module - 1].description}</h3>
                  </div>
                  <span className="world-progress">
                    {
                      levels.filter(
                        (l) => l.module === module && p?.stars[l.id],
                      ).length
                    }{" "}
                    / 5 complete
                  </span>
                </div>
                <div className="mission-grid">
                  {levels
                    .filter((l) => l.module === module)
                    .map((l) => {
                      const can = p ? isAvailable(p, l.id) : l.id === 1,
                        stars = p?.stars[l.id] || 0;
                      return (
                        <button
                          className={
                            "mission-card " +
                            (!can ? "mission-locked" : "") +
                            (l.id === next.id ? " mission-next" : "")
                          }
                          key={l.id}
                          onClick={() => {
                            setSelectedLevel(l);
                            setMessage("");
                            setModal("brief");
                          }}
                        >
                          <div
                            className="mission-thumbnail"
                            style={{
                              backgroundImage: `url(/assets/terrain-${l.id}.png)`,
                            }}
                          >
                            <span className="level-label">
                              {String(l.id).padStart(2, "0")}
                            </span>
                            {l.boss ? (
                              <span className="boss-label">
                                <Icon name="shield" size={11} /> BOSS
                              </span>
                            ) : can && stars === 0 ? (
                              <span className="ready-label">READY TO FLY</span>
                            ) : null}
                            <div className="thumbnail-status">
                              <Icon
                                name={can ? "plane" : "lock"}
                                size={can ? 28 : 20}
                              />
                            </div>
                          </div>
                          <div className="mission-details">
                            <h4>{l.name}</h4>
                            <p>{l.skill}</p>
                            <div className="mission-card-bottom">
                              <Stars count={stars} />
                              <span>
                                {stars ? (
                                  "Replay"
                                ) : can ? (
                                  "Let’s go"
                                ) : (
                                  <Icon name="lock" size={13} />
                                )}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
                <div className="learning-note">
                  <span className="note-icon">
                    <Icon name="book" size={19} />
                  </span>
                  <p>
                    <strong>Good thinking fuels great flying.</strong> Answer
                    questions to resupply. Every mistake is a chance to learn.
                  </p>
                  <span>YEAR 5 · AUSTRALIA</span>
                </div>
              </div>
            </div>
          </section>
          <section className="bottom-strip">
            <div>
              <Icon name="shield" size={20} />
              <span>
                <strong>Made for learning.</strong> No ads, no accounts, just
                adventure.
              </span>
            </div>
            <button className="text-button" onClick={() => setRoute("manual")}>
              First time in the cockpit? <span>Read the flight manual</span>
              <Icon name="arrow" size={16} />
            </button>
          </section>
        </main>
      )}
      {route !== "game" && (
        <footer className="site-footer">
          <span>
            SKY NUMERACY <i /> Every great adventure starts with a little
            thinking.
          </span>
          <div>
            <span className="offline-label">
              <i /> All progress stays on this device
            </span>
            <button
              onClick={() => {
                data.settings.sound = data.settings.sound ? 0 : 0.5;
                data.settings.music = data.settings.sound ? 0.25 : 0;
                audio.sound = data.settings.sound;
                audio.music = data.settings.music;
                save();
              }}
            >
              <Icon name="sound" size={15} />
              {data.settings.sound ? "SOUND ON" : "SOUND OFF"}
            </button>
          </div>
        </footer>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <section
            className={"modal " + (modal === "brief" ? "brief-modal" : "")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={closeModal}
            >
              <Icon name="close" />
            </button>
            {modal === "setup" ? (
              <>
                <span className="modal-emblem">
                  <Icon name="plane" size={28} />
                </span>
                <span className="eyebrow">Before the first adventure</span>
                <h2 id="modal-title">Meet your new pilot.</h2>
                <p>Choose a nickname and get ready to fly.</p>
                <form onSubmit={setup}>
                  <label>
                    Pilot’s first name or nickname
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={24}
                      placeholder="e.g. Alex"
                      required
                    />
                  </label>
                  {message && <p className="kind-message">{message}</p>}
                  <button className="button primary full" disabled={busy}>
                    {busy ? "Preparing your pilot…" : "Prepare for take-off"}
                    <Icon name="arrow" />
                  </button>
                </form>
                <p className="modal-foot">
                  Only a nickname is saved. Tutor settings have a separate
                  login.
                </p>
              </>
            ) : modal === "pin" ? (
              <>
                <span className="modal-emblem">
                  <Icon name="lock" size={25} />
                </span>
                <span className="eyebrow">Just for the grown-up in charge</span>
                <h2 id="modal-title">Welcome, tutor.</h2>
                <p>
                  Enter your PIN to manage missions and see learning progress.
                </p>
                <form onSubmit={unlock}>
                  <label>
                    Tutor PIN
                    <input
                      autoFocus
                      type="password"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      maxLength={6}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  {message && <p className="kind-message">{message}</p>}
                  <button className="button primary full" disabled={busy}>
                    {busy ? "Checking…" : "Open tutor console"}
                    <Icon name="arrow" />
                  </button>
                </form>
              </>
            ) : modal === "tutorial" ? (
              <>
                <span className="modal-emblem">
                  <Icon name="plane" size={30} />
                </span>
                <span className="eyebrow">Your first flight</span>
                <h2 id="modal-title">Think. Resupply. Fly.</h2>
                <div className="tutorial-steps">
                  <p>
                    <b>01</b>
                    <span>
                      <strong>Find your wings.</strong>Drag the jet, or use
                      arrow keys / W A S D.
                    </span>
                  </p>
                  <p>
                    <b>02</b>
                    <span>
                      <strong>Your maths is your fuel.</strong>Answer correctly
                      to earn ammo. Auto-fire is on.
                    </span>
                  </p>
                  <p>
                    <b>03</b>
                    <span>
                      <strong>Take your time.</strong>The whole game pauses
                      while you think.
                    </span>
                  </p>
                </div>
                <button
                  className="button primary full"
                  onClick={() => {
                    data.settings.tutorial = true;
                    save();
                    setActiveLevel(selectedLevel ?? next);
                    setRoute("game");
                    setModal("");
                  }}
                >
                  I’m ready. Let’s fly! <Icon name="arrow" />
                </button>
              </>
            ) : selectedLevel ? (
              <>
                <div
                  className="brief-image"
                  style={{
                    backgroundImage: `url(/assets/terrain-${selectedLevel.id}.png)`,
                  }}
                >
                  <span className="hero-badge">
                    MISSION {String(selectedLevel.id).padStart(2, "0")}
                  </span>
                </div>
                <span className="eyebrow">
                  WORLD 0{selectedLevel.module} · {selectedLevel.theme}
                </span>
                <h2 id="modal-title">{selectedLevel.name}</h2>
                <p>
                  {selectedLevel.skill}. {selectedLevel.subtitle}
                </p>
                <div className="brief-facts">
                  <span>
                    <Icon name="plane" size={16} /> {selectedLevel.duration}{" "}
                    seconds of flight + boss battle & thinking time
                  </span>
                  <span>
                    <Icon name="shield" size={16} /> Rank {selectedLevel.id}{" "}
                    boss · {selectedLevel.bossConfig.name}
                  </span>
                  <span>
                    <Icon name="book" size={16} /> Three-question boss shield ·
                    Take your time to think
                  </span>
                </div>
                {(!p && selectedLevel.id === 1) ||
                (p && isAvailable(p, selectedLevel.id)) ? (
                  <>
                    <button
                      className="button primary full"
                      onClick={() => start(selectedLevel)}
                    >
                      Launch mission <Icon name="arrow" />
                    </button>
                    <button
                      className="text-button centered"
                      onClick={() => start(selectedLevel, true)}
                    >
                      Practise just the maths <Icon name="book" size={16} />
                    </button>
                  </>
                ) : (
                  <div className="locked-note">
                    <Icon name="lock" size={20} />
                    <p>
                      This adventure is waiting for you.
                      <br />
                      Your tutor can assign and unlock it.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      )}
      {storageError && (
        <div className="storage-error" role="alert">
          {storageError}
        </div>
      )}
    </div>
  );
}
