# Sky Numeracy

An original local browser arcade adventure for Australian Year 5 equation practice. Fifteen short missions, fifteen progressively harder boss encounters, three teaching modules, original generated pixel artwork, and a PIN-protected tutor console. There is no parent view.

## Start playing

Double-click **Launch Sky Numeracy.command** in this folder. Keep its Terminal window open while playing. The launcher opens **http://localhost:4173**. The production build is already included in `dist/`; playing does not require npm or internet downloads. Node.js 22.12 or later is required (Node 26 was used for validation).

The tutor login PIN is **110401**. Use **Tutor console** to sign in; it is available before a learner is created. On first play, the child only needs a nickname. This update sets the requested PIN once on existing installations while preserving all learner data. Later PIN changes made in Settings are kept. Start with River Run. Use **Tutor console → Mission assignments** to assign individual missions or whole modules. An explicit lock overrides automatic progression.

If macOS opens the launcher in an editor, use Terminal:

```sh
cd '/Users/thejassomarajan/Documents/Tutoring/5th/math_games'
npm start
```

To stop the game server, press **Control+C** in its Terminal window. The launcher detects an already-running Sky Numeracy server on its port. If a different application occupies that port, use `SKY_PORT=4174 npm start`, then open the printed address.

## Play on a tablet

Start the launcher on the computer. Connect the tablet to the **same Wi-Fi** and open the tablet address printed in Terminal, such as `http://192.168.1.20:4173`.

The computer and local connection must remain on. Internet access is not required. This is a local website, not a separately installed tablet application. A browser may ask for local-network access; the Mac firewall may need to allow the local server.

Progress is kept in the browser on the device used for play. A different device, browser, hostname or port has separate storage. Always use the same address for a learner. **Keep using localhost on the computer**, rather than switching between localhost and its numerical address. No device-to-device sync is implemented.

## Teach with it

- **Lesson:** Tutor console → Pilots & lessons → choose 15, 30, 45 or 60 minutes → Start lesson. A five-minute warning appears; the session saves and stops at its end.
- **Practice:** Choose “Questions only” in the tutor console, or “Practise just the maths” on a mission’s briefing. The shooter never advances in this mode.
- **Assignments:** A new learner starts with Level 1. Two or three stars automatically assign the next mission, unless it is explicitly locked. Automatic progression can be disabled.
- **Difficulty:** Set the number cap (20 / 50 / 100 / 200), decimal eligibility, multiple-choice eligibility for Levels 1–2 and ammunition capacity (0.5× to 2×). Turning decimals off makes Levels 4 and 14 unavailable until re-enabled.
- **Reports:** View skill accuracy, response time, targeted misconception signals, scaffold use, sessions and the latest 50 answers. CSV downloads locally. “Print / Save PDF” opens the browser’s print dialog; choose Save as PDF.
- **Privacy:** Only nicknames identify learners. There are no accounts, ads, analytics, external fonts, cloud saves or runtime internet calls. Data is stored in IndexedDB. Use the console’s confirmed deletion actions to erase a learner or all local app data. Clearing browser site data removes progress and any custom PIN; a fresh installation uses the configured default PIN again.
- **Misconceptions:** Trap counts group wrong attempts by the template’s targeted misconception; they are teaching signals rather than a diagnosis of the student’s reasoning.
- **Timing:** First-try accuracy counts the initial answer in each resupply question chain. Fresh-number retries remain part of that chain. Response-time averages total recorded attempt time per initial question, excluding time spent viewing a scaffold.

Tablet controls appear on touch-capable devices and at tablet/phone widths, including landscape layouts. Two fingers can move and shoot together; releasing a finger, cancelling a touch or pausing clears held inputs safely. Movement and firing buttons are disabled during maths questions.

The PIN is stored as a salted PBKDF2-SHA256 hash. It is an interface safeguard on a shared device, not protection from someone with developer tools or access to the browser’s files.

## Controls and gameplay

| Action           | Computer                 | Touchscreen                                       |
| ---------------- | ------------------------ | ------------------------------------------------- |
| Move             | Arrow keys or W A S D    | Hold the on-screen arrow buttons, or drag the jet |
| Fire             | Auto-fire, or hold Space | Hold FIRE, or leave auto-fire on                  |
| Toggle auto-fire | Sidebar button           | Button below the playfield                        |
| Energy bomb      | B or sidebar button      | Button below the playfield                        |
| Pause / exit     | Escape or Pause button   | Pause button                                      |

A correct maths answer is the **only** way to obtain ammunition. All gameplay stops during questions, hints and worked examples. Wrong maths answers never remove lives or points. A correct response gives strategy feedback and a two-second take-off countdown.

Each mission contains two 45-second flight sectors (90 seconds total), followed by a boss battle, plus unhurried thinking time. Default auto-fire asks a resupply question approximately every 45 seconds. Segment boundaries force questions even when ammunition is conserved. Shields, spread shots and bombs never grant ammunition. Fly through bonus rings; protect cargo planes for extra points.

Three lost lives restore the last question checkpoint, including score, waves and power-ups. Learning attempts remain recorded. Restarting the application opens the saved mission from the last persisted checkpoint with a fresh question. Leaving a mission through its pause screen saves that exact position.

Stars depend on **first-try maths accuracy**, not shooting speed: 3 stars require at least 90% accuracy and two lives remaining; 2 require at least 70%; other completions earn 1. Jets unlock at 0, 12 and 30 total stars.

Every mission ends with a three-question boss shield and a boss battle. Boss health rises from 20 in Level 1 to 76 in Level 15; firing intervals shorten, bullets and movement become faster, fan attacks grow from three to seven projectiles, and aimed shots begin at Level 8. The three original boss designs are reused across the worlds with named, ranked encounters. Only Levels 5, 10 and 15 replace the module exit-ticket score. Tickets use eligible assigned skills. If addition/subtraction, division and story skills are all assigned, the ticket contains one of each; otherwise its three questions stay within assigned content. Exit-ticket reports count first-try correct answers out of three.

## Accessibility

Keyboard and multi-touch input, on-screen directional buttons plus FIRE, BOMB and AUTO-FIRE controls, large answer controls, adjustable text, non-colour cues, separate audio sliders, reduced motion and kind error feedback are included. Reduced motion stops decorative terrain scrolling and cloud movement. Read-aloud uses only locally installed English voices; if none exists, the game explains that it is unavailable without contacting a speech service.

## Development

```sh
npm ci
npm run dev       # local development, including LAN access
npm test          # maths, game rules, IndexedDB and PIN checks
npm run build     # type-check and create dist/
npm start         # serve the production build
```

Development dependencies must be installed once with internet access. The completed production build and launcher do not download packages while playing.

- `src/math/engine.ts`: typed equation families, constrained generation, safe arithmetic expressions, adaptive selection and answer checking. No eval or dynamic executable template strings.
- `src/data/templates.json`: 52 templates across 13 tracked skills, orientation/context variants, constraints, input eligibility and two verified fallbacks for each supported cap. Known factor ranges are configurable in template data. New variants of an existing family can be added without changing game code; a genuinely new equation family needs a typed solver and independent tests.
- `src/data/levels.json`: themes, skill mapping, sector boundaries, wave cadence and event choices for all 15 levels.
- `src/game/`: fixed-step simulation, versioned full-world checkpoints (including automatic migration of earlier four-minute flights), canvas rendering and original synthesised audio.
- `src/components/`: maths/scaffold overlays, shooter interface and tutor console.
- `src/storage.ts`: ordered IndexedDB writes and complete per-student deletion.
- `scripts/refresh-fallbacks.ts`: rebuild stored fallbacks after changing template families. Run `node --import tsx scripts/refresh-fallbacks.ts`, then the tests and build.

The Sky Numeracy requirements PDF controls the game and pedagogical behaviour. The browser platform, local delivery, all-module first release, exclusion of parent view and assignment-limited boss tickets are the user-approved changes. The supplied arcade screenshot and GitHub project were inspiration only; no source code, artwork or audio was copied from them. Curriculum codes are intentionally not claimed in the product.

## Deploy to Vercel later

Import [thejas-somarajan/math_game](https://github.com/thejas-somarajan/math_game) into Vercel and use the repository root as the project directory. The included `vercel.json` selects **Vite**, runs **`npm run build`**, and publishes **`dist`**. No environment variables or backend service are required. See [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

Vercel serves the built website directly; the local launcher and `npm start` are for playing from your computer. Learner data remains in each browser's IndexedDB, so the hosted address has its own progress and tutor settings, separate from localhost.

## Original art and audio

All 22 PNG assets in `public/assets/` were generated with the built-in image generation tool: fifteen terrain scenes, title/hangar artwork, three jet designs, four drone/cargo designs, three pickup designs and three boss designs. Atlases contain multiple sprites. Exact prompts and filenames are saved in `public/assets/generation-prompts.json`. They are bundled into the build. The music and effects are original Web Audio synthesis; each mission has its own pitch/tempo/motif combination.

## Verification

See `VALIDATION.md` for automated and browser checks and the hardware validation limits. There is no hosted deployment or backend service.
