# Acadence 1.0

Personal Windows desktop application and per-user installer. No account, cloud service, telemetry, or runtime network dependency. Store study history locally; allow backup/restore and complete reset in Settings.

## Planning rules
- Subject slide goals: name, total slides, starting slide, deadline, effort. Divide whole slide ranges across available sessions through the date; track partial progress and return unfinished ranges at the next subject turn. Preserve history and migrate older local backups.
- Ordered subjects and ordered topics. Rotate across subjects, continuing across days. Skip exhausted subjects.
- Repeating availability selected on a weekly grid; daily study budgets exclude breaks. Date overrides supported.
- School classes and manual commitments block time, with optional buffer. Confirm locally recognized timetable entries before saving; manual correction and period mappings cover ambiguous images.
- Manual topic estimates and automatic allocation coexist. Light/Normal/Heavy targets are 40/60/90 minutes; automatic allocation uses effort weights, a 30-minute session floor, and explicit overflow. Optional deadlines.
- Daily requested break count and length. Fit breaks inside availability between sessions. Class gaps are not requested breaks. Flag insufficient capacity.
- Move/resize/lock future sessions. Preserve completed, active, missed, and locked records during replanning. Never extend availability or budgets silently.
- Incomplete work returns at the next turn of its subject ahead of its next topic. Carryover stays ahead of new work. Early finish offers Start next now, without automatically shifting the plan.
- Missed work is not automatically complete. Sleep pauses the timer. Returning users can start, skip, or replan.
- One streak day for attending every planned session. Starting over 10 minutes late breaks the streak; completion of allotted time counts even when the topic is unfinished. Unscheduled days are neutral. Rescheduling after missing does not erase the miss.

## Companion
Movable, illustrated white Shih Tzu with small brown patches. Separate transparent window, optional always-on-top, does not steal focus on prompts. Topic, slide range, timer, completion/pause and partial-slide controls. Minimize to tray, optional startup and sound, fullscreen hiding, reduced motion. Contextual local messages, no open-ended AI chat or voice.

## Interface
Today, Week, Subjects, Availability, Timetable, Progress, Settings. Light and dark modes. Design: notebook-blue #EEF3FC, ink #192D4D, royal #3C64D8, mint #DFF3E9, paper #FFFFFF, slate #66758C. Segoe UI Variable for body/display, Georgia sparingly for welcome copy, Consolas for timer. Signature: a visible subject rotation ribbon connecting study sessions, with the dog as a quiet study partner. Motion only for short state feedback; no constant bouncing while studying.

## Verification
Node tests for rotation, conflicts, breaks, budgets, incomplete work, streaks and overdue sessions; Electron smoke test for local persistence and companion; bundled OCR test without network; production installer build and installed-app smoke test where supported.
