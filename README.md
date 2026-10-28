# Mission Lecture · Lionel

A mobile-friendly French reading and daily-progress app implementing [issue #1](https://github.com/webnatu/natu-apps/issues/1). The UI uses French labels and an original illustrated forest direction, with no dependency on the historical Benji prototypes.

## Run

Requires Node.js 20 or newer. There are no production dependencies, credentials, services, or build step.

```sh
npm ci
npm run dev
```

Open the address for port **5173** in your development environment. The server binds to `127.0.0.1` by default. Set `HOST=0.0.0.0` when your environment's port forwarding requires it, and `PORT` to choose a different port. Use the existing checkout; cloud tasks are already isolated and do not need a separate Git worktree.

Deploy `index.html` and the `src/` directory together to any static HTTPS host, preserving their relative paths. No server-side rendering or SPA rewrite is required. The included development server intentionally serves only application assets, not Git metadata, dependencies, or tests.

## Validate

```sh
npm test
TZ=America/Toronto npm test
npx playwright install --with-deps chromium
npm run test:browser
```

With a compatible system Chromium already installed, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` instead of downloading a browser. Playwright's default browser is used when `CHROMIUM_PATH` is unset. CI runs the unit and browser checks and uploads mobile/desktop screenshots.

Unit tests cover awards, reload serialization, undo/recheck, local dates, DST and year boundaries, weekly streaks, levels, reward redemption, and malformed/unavailable storage. Browser tests exercise actual checkboxes, reloads, local midnight rollover, calendar checkmarks, separate-tab resource links, backup import/export, purchases, responsive overflow, and preserving a malformed previous save. Screenshots are written to ignored `test-results/`.

## Missions and adjustable defaults

Values live in `SETTINGS` in `src/progress.js`:

| Mission | XP | Coins | Frequency |
| --- | ---: | ---: | --- |
| Lecture en français — 15 minutes | 15 | 8 | Once per local calendar day |
| Mes devoirs du jour | 20 | 10 | Once per local calendar day |

- Levels start at 1 and increase every **150 total XP**. The level progress bar shows XP toward the next threshold.
- Three virtual room treasures cost **100**, **200**, and **400 coins**. Each can be unlocked once; spending coins never subtracts XP. These are virtual decorations, not monetary rewards.
- Completion is **manual and self-reported**. Alloprof/Grimoire open in a new tab, and the app does not verify time spent or activity there. No grades, timers, remote approvals, parent account, or online sync are implied.
- Checkmarks may be undone to correct the calendar, but an already-issued daily award remains recorded. Rechecking that same day cannot grant a second award. There is no penalty for an unfinished day.
- The week is **Monday–Sunday**. The weekly count is the number of checked reading days in that week up to today. The consecutive streak ends today if today's reading is complete, or yesterday if today is still unfinished; a gap before that ends the streak.
- Dates use the **device's local calendar**, never UTC date slicing. Day rollover is checked every 30 seconds, when the page regains focus/visibility, and when a mission is changed. Missed days remain in history; changing the device clock changes which day is shown.

## Persistence and limitations

Versioned daily history and collected rewards are stored under `mission-lecture-lionel-v1` in localStorage. XP, coins, level, streak, and progress bars are derived from that saved history rather than independent balances. Progress automatically restores on reload and remains on the same browser/device and website origin. It does **not** sync across devices; clearing site data deletes it. Use **Exporter ma sauvegarde** and **Importer** to move or preserve progress. Backups replace the current history only after confirmation and validation.

Storage failures are shown visibly. If an existing save cannot be read, it is left untouched and changes are temporary until a valid backup is imported. If saving fails because storage is blocked or full, export progress before closing. External resources need network access. Offline/PWA installation is not included in this issue's scope.

History contains user-entered checkmarks, not independently verified activity. This client-only app has no authentication or anti-tampering mechanism; a person with access to browser storage or backup JSON can edit it. No analytics, remote database, or third-party scripts are loaded by the app. The optional writing checker can send the selected draft to LanguageTool only after explicit consent and a manual verification request; see below.

## Structure

- `src/progress.js`: date handling, versioned history, rewards, levels and streak calculations.
- `src/app.js`: French UI, calendar, storage feedback, and backup actions.
- `src/styles.css`, `src/icon.svg`: responsive styles and local artwork.
- `scripts/serve.mjs`: minimal development server.
- `tests/progress.test.mjs`, `scripts/browser-test.mjs`: unit and end-to-end checks.


## Québec 2e secondaire reading and writing workshop

The app now includes the original story **Le message effacé**, in three sections, with five scaffolded questions about emotion, motivation, inference, values, character traits and character development. It is a starting-level educational activity rather than a formally assessed curriculum resource. Prompts distinguish an idea, a textual clue and an explanation. Suggested responses remain hidden until requested; open interpretations are not automatically graded.

Reading supports include selectable 18/20/24/28 px sans-serif text, optional wider spacing, short paragraphs, a vocabulary panel, and strategies for previewing, chunking, summarizing and identifying evidence. These are adjustable supports, not a treatment or a guarantee of suitability for every reader with dyslexia. They complement the student's school accommodations. The 15-minute quest is a flexible effort goal, not a deadline for finishing the story.

**Milo** is an original CSS-illustrated animated guide with short step-by-step capsules on emotion/traits/values, inference, justification and revision. A help button on open questions navigates to the relevant explanation. Three fixed-answer practice questions explain mistakes and allow retrying without penalties. These are animated text-and-audio capsules, not externally hosted or prerecorded videos. Animation respects reduced-motion settings.

Three writing prompts support a journal entry, Sami's point of view and an interpretive paragraph. Separate drafts, comprehension answers, practice choices, text size and spacing are included in the existing on-device save and JSON backups. Old version-1 saves acquire an empty workbook without changing their XP/history. Reading, listening, practicing and drafting do not automatically complete the mission or generate additional XP/coins.

### Audio and revision

- Story, capsule and draft audio use the browser's **Web Speech API**, invoked by a button tap, preferring a `fr-CA` voice and falling back to another French voice. Device/browser voice availability and network requirements vary; text always remains accessible. There are stop buttons and an unavailable-audio fallback. Real voice playback must be checked on the intended iPhone; automated tests simulate speech to verify control wiring.
- Native browser spellcheck is enabled on writing drafts with `lang="fr-CA"`; underlining and dictionaries vary by browser. The local revision helper checks only a few basic issues (repeated words, initial capital and final punctuation) and offers a checklist. It does not claim to correct all spelling/grammar.
- Optional **LanguageTool** verification POSTs only the selected draft and `language=fr` to `https://api.languagetool.org/v2/check`. No request runs on typing or page load. The student must explicitly consent and click the verification button; consent resets after a check and when editing/changing drafts. There is a privacy notice/link and no API key. Results are presented as suggestions, not a grade or guaranteed corrections, and are never applied automatically. General French suggestions may not match Québec usage. The public service can rate-limit or be unavailable; requests time out after 15 seconds and leave the local draft intact.
- Live LanguageTool access was blocked by the development environment's network policy. Tests validate payloads, offsets, consent, rendering and error paths using controlled responses; they do not establish live service availability. Check the real service and voices on the deployed site before relying on them. Never put personal information in a draft sent to an external checker.

Updated validation includes 21 unit tests and the browser workflow for workbook persistence, per-exercise drafts, reading preferences, retry feedback, audio-control wiring, correction consent and existing daily-reward invariants.
