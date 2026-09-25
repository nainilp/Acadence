# Acadence

A personal Windows study planner with a floating white Shih Tzu companion. Acadence rotates between subjects, fits study sessions around school and breaks, and returns to unfinished topics at the next turn of their subject.

## Install and open

Run **`release/Acadence-Setup-1.0.0.exe`**. The installer installs for the current Windows user and can create a desktop shortcut. The installed app is self-contained: no Node.js, account, API key, or internet connection is needed.

The installer is unsigned. Windows may show an unfamiliar-publisher or SmartScreen prompt. Only use the installer you built or obtained from a source you trust.

The unpacked app is also available at **`release/win-unpacked/Acadence.exe`**. Keep its whole folder together; the executable depends on the files beside it.

## Your first week

1. Open **Subjects & topics**, add subjects, and enter topics in the order you want to study them. Pick a week with the week selector. Use arrows to change the rotation or topic order.
2. Choose Light, Normal, or Heavy effort. Automatic timing starts at **40, 60, or 90 minutes** and adjusts to available time. Turn off Auto decide to enter an estimate yourself. You can add an optional deadline.
3. Open **Availability**. Click or drag over the half-hour grid to mark times you are available. Enter study minutes, number of breaks, and break length for each day. Study budgets exclude breaks. Date overrides and buffers around classes are supported.
4. Open **School timetable** and choose a timetable photo, or enter classes and other commitments manually. Everything is read locally. Check the proposed entries, correct them, and confirm them before saving.
5. Open **Your week** and choose **Build / replan week**. Review any planning notes about deadlines, unavailable time, or work that did not fit.
6. Open **Today**, or click your desktop companion, to start a study session. Sessions are never marked finished automatically.

Once a plan exists, changes to topics, classes, availability, and breaks automatically replan upcoming unlocked sessions. Completed and missed records stay in history. Locked sessions are preserved; conflicts involving them are explicitly flagged for you to resolve.

## Sessions and the companion

- Subjects alternate, continuing across days. Subjects without pending topics are skipped.
- **Finished** completes the topic. **Need more time** asks for additional minutes and returns to that topic at the next turn of its subject.
- Longer topics can span more than one turn. Automatic sessions have a 30-minute minimum; explicit manual estimates can be shorter.
- Early starts must fit your availability and other commitments. Starting late within a reserved slot uses the time left before the next event.
- The timer pauses on sleep or screen lock. On restart, it stays paused until you resume. If resuming would collide with a commitment, stop and replan.
- Click the dog to open or close its speech bubble. Drag its small name bar to move it. The arrow opens the planner; the X tucks it away. Restore it through Settings or the system tray.
- Closing the main window keeps Acadence in the system tray so sessions and reminders can continue. Choose **Quit Acadence** in the tray menu to exit.
- The pet can stay above other windows, hide during fullscreen use, and respect reduced motion. Sounds and Windows startup are optional.

## Calendar and history

Drag a future session to move it. Click it to change the date, start, or end time, or to lock/unlock it. Manual changes lock the session so automatic replanning respects your choice. Unscheduled topics remain pending and are included ahead of newly added work in their subject when you build a later week.

Progress includes actual study time, completed topics, session history, and streaks. A day earns a streak when all study sessions are attended. Starting more than 10 minutes late or skipping a session breaks the streak. Studying for the allocated session counts even if the topic is unfinished. Finishing the topic early also counts. Days without study sessions are neutral. Moving a session after it was missed cannot erase the miss.

## Local data and backups

The exact data folder is displayed in **Settings**. Study data lives in `study-data.json` inside the app's Windows user-data folder. Saves use a temporary file and atomic replacement. A running timer is checkpointed every 30 seconds and saved on a normal quit.

**Export backup** saves all subjects, schedules, history, and settings to a JSON file. **Restore backup** validates the selected file and asks before replacing current data. **Clear all data** requires confirmation and resets the app, including any internal recovery file; exported backups elsewhere are intentionally kept.

Timetable images are processed in memory and not saved as part of study history. The app bundles Tesseract and English recognition data; it does not download a model or send images to a server. There is no telemetry or remote API. Renderer network access is blocked.

## Timetable recognition limits

Printed English timetables with readable day/time labels work best. Recognition supports ordinary time ranges, weekday columns, and user-entered period mappings. Ambiguous layouts, handwriting, alternating weeks, non-English text, and missing time labels may need manual correction. Use date-specific commitments for a timetable that changes from week to week. Recognition is a starting point, never an unreviewed schedule import.

## Development

Built with Electron, React, Vite, and Tesseract.js. The scheduling rules are separate, deterministic modules in `shared/`, with an Electron-owned store shared by both windows. The renderer runs with context isolation, sandboxing, no Node integration, and a narrowly scoped preload API.

Requirements to build from source: Windows x64, a current Node.js installation compatible with the locked dependencies, and internet access for the initial dependency/build-tool downloads.

```powershell
npm ci
npm run assets
npm start
```

`npm run dev` runs a browser-only UI preview. It uses separate browser storage and does not include desktop OCR, native windows, or Windows notifications.

```powershell
npm test                 # scheduling, streak, validation, and parser tests
npm run build           # production renderer
npm run smoke           # desktop UI and offline OCR integration
node scripts/lifecycle.mjs  # timer recovery, backup, restore, and reset
npm run dist            # Windows x64 NSIS installer
```

The Electron integration tests use fresh `.test-data/` profiles and do not touch your real study records. Screenshots and test reports go to `test-results/`. You can set `ACADENCE_EXECUTABLE` to a packaged or installed `Acadence.exe` to run those same tests against the actual distribution.

Build outputs, dependencies, local test data, and logs are ignored by Git. Commit the source, `package-lock.json`, and the bundled custom artwork in `assets/`.

## Reference documentation

- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [Electron Builder NSIS installer](https://www.electron.build/nsis/)
