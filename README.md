# Acadence

A personal Windows study planner with a floating white Shih Tzu companion with small brown patches. Acadence rotates between subjects, fits study sessions around school and breaks, and returns to unfinished work at the next turn of its subject.

## Install and open

Run **`release/Acadence-Setup-1.1.3.exe`**. The installer installs for the current Windows user and can create a desktop shortcut. The installed app is self-contained: no Node.js, account, or API key is needed. Studying works offline; update checks require an internet connection.

Version 1.1.2 adds equal slide allocation across study blocks and automatic redistribution after recording actual progress, including slides studied ahead and outside the app.

Version 1.1.3 checks [GitHub Releases](https://github.com/nainilp/Acadence/releases) on launch and every six hours while open. A newer stable release offers **Update now** or **Not now**. Update now downloads and verifies the installer, saves study data, pauses any running timer, then installs and restarts. Not now skips that version’s automatic prompts until the next launch. Automatic prompts wait until the active study session and any fullscreen activity end. **Settings → App updates → Check for updates** checks manually, shows download progress, and can offer a declined update again. Offline checks never prevent studying.

People running 1.1.2 or earlier need to install 1.1.3 once manually: choose **Quit Acadence** from the system-tray menu, then run the newest installer using the same installation location. Existing study data and settings are preserved. Future releases can be installed from the update dialog.

Version 1.1 introduces a full claymorphism redesign: pearl-white surfaces, blush-pink controls, raised cards, inset fields, sculpted progress indicators, alongside the original illustrated white Shih Tzu with brown patches and a blue bandana. Dark mode uses charcoal-plum surfaces and rose accents. Keyboard focus and reduced-motion preferences remain supported. Installing over version 1.0 preserves local study records and settings.

The installer is unsigned. Windows may show an unfamiliar-publisher or SmartScreen prompt. Only use the installer you built or obtained from a source you trust.

The unpacked app is also available at **`release/win-unpacked/Acadence.exe`**. Keep its whole folder together; the executable depends on the files beside it.

## Your first week

1. Open **Subjects & topics**, add subjects, and enter topics in the order you want to study them. Pick a week with the week selector. Use arrows to change the rotation or topic order.
2. Choose Light, Normal, or Heavy effort. Automatic timing starts at **40, 60, or 90 minutes** and adjusts to available time. Turn off Auto decide to enter an estimate yourself. You can add an optional deadline.
3. Open **Availability**. Click or drag over the half-hour grid to mark times you are available. Enter study minutes, number of breaks, and break length for each day. Study budgets exclude breaks. Date overrides and buffers around classes are supported.
4. Open **School timetable** and choose a timetable photo, or enter classes and other commitments manually. Everything is read locally. Check the proposed entries, correct them, and confirm them before saving.
5. Open **Your week** and choose **Build / replan week**. Review any planning notes about deadlines, unavailable time, or work that did not fit.
6. Open **Today**, or click your desktop companion, and choose **Start working**. Acadence divides the remaining work into blocks and starts the first one. You do not need to build a plan first.

### Working through blocks

**Start working** uses your time now without changing recurring availability. It keeps your daily study budget, breaks, classes, and locked sessions in mind. The current block shows its topic or exact slide range, with the next blocks listed below it. If a class or a locked block prevents an immediate start, the app waits until that time is free.

Choose **Done block & next** in Today or on your companion to save the assigned work and start the next block automatically. Long topics stay unfinished until all of their blocks are done. For slide goals, this records the whole displayed slide range. Use **Record partial progress** in Today, or the companion’s slide-count field / **Need more time** control, to report less or more work instead. Breaks advance with **End break & continue**. Timers never mark work done automatically.

Choose **Stop working** at any time. Time spent and completed blocks stay in history; unreported slides stay unfinished. The remaining work is replanned around your regular availability, including future weeks when necessary. Stopping is recorded separately from skipping a scheduled session. Choose **Start working** again whenever you are ready to continue.

Once a plan exists, changes to topics, classes, availability, and breaks automatically replan upcoming unlocked sessions. Completed and missed records stay in history. Locked sessions are preserved; conflicts involving them are explicitly flagged for you to resolve.

## Sessions and the companion

The companion is **Bunsoy**, a newly created white Shih Tzu with small brown patches and a blush-pink collar. Its transparent character artwork is bundled locally. Version 1.1.1 updates the previous companion name to Bunsoy once when opening older profiles or backups; study history and other preferences are preserved. You can still change the name in Settings afterward.

### Slide goals

In **Subjects & topics**, choose **Add slide goal** under a subject. Enter a goal name, the number of slides to study, a starting slide number (normally 1), slides completed so far, a finish date, and Light / Normal / Heavy effort. Saving builds a plan through the deadline, up to one year ahead. Each study block displays its exact slide range, and the goal card tracks completed slides.

Remaining slides are divided equally into whole ranges across available study blocks, regardless of block duration. Counts differ by at most one, with any extra slides assigned to earlier blocks. Subjects continue alternating. Sessions aim for 40 / 60 / 90 minutes according to effort and may shorten to fit available time. Review the resulting slide counts: the app does not know how difficult an individual slide is. When no time fits before the deadline, a planning note calls that out.

At check-in, enter **Slides completed this block**, counted from the beginning of the range, then select **Save progress**. You can enter fewer slides than the target or include extra slides studied ahead. The remaining slides are automatically divided equally across future blocks through the deadline. **Finished block** is a shortcut that records every slide in the assigned range. This works in the main app and the companion. Skipped or missed ranges remain in history while their unfinished slides are rescheduled. Replan after a missed session to refresh the remaining work.

Use **Edit goal** in Subjects & topics or Progress to update **Slides completed so far**, including work done outside the app. This is the cumulative count for the whole goal. Editing a goal replans it; archiving removes its upcoming blocks and preserves study history. Locking preserves a session's time, while its slide allocation can change as progress or the goal changes. Goals and progress are included in local backups; older backups without goals still work.

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

Timetable images are processed in memory and not saved as part of study history. The app bundles Tesseract and English recognition data; it does not download a model or send images to a server. There is no telemetry. Update checks contact GitHub and downloads use GitHub’s release hosting. Study records are never uploaded. Renderer network access is blocked; the main-process updater uses a separate network session.

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
node scripts/goals.mjs   # slide goals, partial completion, companion, backup
node scripts/updates.mjs # packaged update UI, consent, progress, and save-before-install
node scripts/updates-live.mjs # real GitHub check/download, installer launch intercepted
node scripts/fullscreen.mjs # companion hides for fullscreen windows
node scripts/clay-review.mjs # all pages in both themes at laptop and desktop sizes
npm run dist            # Windows x64 NSIS installer
```

The Electron integration tests use fresh `.test-data/` profiles and do not touch your real study records. Screenshots and test reports go to `test-results/`. You can set `ACADENCE_EXECUTABLE` to a packaged or installed `Acadence.exe` to run those same tests against the actual distribution.

Build outputs, dependencies, local test data, and logs are ignored by Git. Commit the source, `package-lock.json`, and the bundled custom artwork in `assets/`.

For each GitHub release, use a new version and a matching tag, and upload the installer, its `.blockmap`, and `latest.yml` from the same build. The updater reads `latest.yml` and verifies the downloaded installer’s checksum. The build command creates these files without publishing them automatically.

## Reference documentation

- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [Electron Builder NSIS installer](https://www.electron.build/nsis/)
