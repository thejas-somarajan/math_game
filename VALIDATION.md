# Validation record

## Automated checks

`npm run build` completes TypeScript checking and a Vite production build. `npm test` runs 74 independent automated checks.

- 10,000 random examples for each of 52 templates: **520,000 independent rational substitutions**. The checker does not call the generator’s evaluator or answer formulas.
- Every generated answer is non-negative, within its cap and a whole number or one decimal place. Multiple-choice options are unique and contain the answer; prompt length is at most 25 words.
- Every supported cap (20, 50, 100 and 200), decimal filtering, consecutive-number repetition prevention, stored fallbacks and random-source failure.
- All 15 missions complete in scripted simulations, including a three-question shield and boss battle in every mission. Default resupply cadence is 45 seconds of flight time; scripted intervals meet the 45–90 second target.
- Every level has a strictly increasing boss-health, movement-speed and bullet-speed curve; later bosses fire wider fans and aimed shots. Boss entry clears regular enemies and waits for all three shield answers. Legacy four-minute checkpoints migrate while preserving score, lives, shield progress and proportional boss health.
- No world advancement during a question; wrong-answer ammo/life safety; exact two-second countdown; single-life invulnerability; full checkpoint restoration and deterministic enemy replay.
- Practice mode never advances flight. Question pause/resume preserves the prompt. Saved question signatures force fresh numbers after reopening.
- Assignment locks, decimal availability, star thresholds and progression with explicit lock overrides.
- IndexedDB round trips, ordered saves, exact report-fixture totals after ten questions and complete per-student/all-app deletion, while preserving other learners.
- PIN input limits, salted hashes, matching and wrong-PIN rejection. The default login accepts 110401 on fresh and migrated installations, preserves existing learner records, and does not overwrite later intentional PIN changes.
- Multi-touch input tracks separate fingers and keyboard sources, supports diagonal movement plus firing, releases each source independently, and resets safely. Controller integration verifies that button input moves and shoots only during active flight.

## Browser checks

Actual local production build checked through the browser UI, using a separate test origin so the main localhost address remains ready for the user’s first-run setup:

- Mission screen and original art, nickname-only first-run setup and tutorial. Tutor login with 110401 verified against an existing browser installation after migration.
- Wrong-answer bar hint, fresh-number retry, second-error worked example with different numbers, correct-answer feedback, ammo refill and countdown.
- Saved learner retained after a page reload, PIN gate, tutor console, assignment of all three modules and reports.
- CSV file downloaded and inspected: correct question rows, numeric responses and results, UTF-8 encoding and actual CSV row breaks.
- Decimal keypad accepted a numerically equivalent trailing-zero answer (29.70 for 29.7).
- Story practice showed the substitution preview before locking the answer; the shooter remained frozen.
- Phone-sized 390 × 844 layout inspected for readable equations, scrolling question cards, full-size answer controls and safe pause/exit.
- Tablet controls checked at 768 × 1024 portrait and 1024 × 768 landscape. All direction, FIRE, BOMB and AUTO-FIRE buttons fit within the viewport and have touch targets of at least 48 pixels. Actual held-button interaction moved the jet and consumed ammunition with auto-fire off. Multi-finger source independence is covered by automated tests; physical multi-touch hardware still needs a device playtest.
- Desktop and tablet-width mission layouts inspected; phone, tablet and desktop playfield controls provided.
- Runtime assets and requests are local; the delivered static build needs no internet service. Tablet play intentionally uses the local Wi-Fi connection to the computer.

## Limits requiring a real-device playtest

The automated tests simulate all missions; a human has not played the entire campaign at its natural duration. Physical iPad/Android touch behaviour, installed offline speech voices, 2020-tablet 60 fps, and measured under-three-second cold start / under-300-ms overlay latency still need device measurements. No claim of a completed external accessibility or privacy audit is made. PDF export uses the browser print dialog rather than a native mobile share sheet.
