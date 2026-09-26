# Acadence 1.1

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
Today, Week, Subjects, Availability, Timetable, Progress, Settings. Full claymorphism treatment based on the user's off-white and pink reference: pearl #EEEBED, porcelain #F2EFF0, blush #E6A7B7, rose #9C435E, graphite #493D44, muted #76656F. Sculpted rounded surfaces, raised controls, inset fields, and a circular daily-progress indicator. Trebuchet MS headings, Segoe UI body, Consolas timer. The dog retains its original SVG illustration: white fur, brown patches, and a blue bandana. Claymorphism applies to the interface and app icon, never to the dog artwork. Dark mode uses charcoal-plum clay and rose accents. Focus outlines, selected-state markers, short-window layouts, and reduced motion preserve usability. Study data and scheduling behavior remain unchanged.

## Verification
Node tests for rotation, conflicts, breaks, budgets, incomplete work, streaks and overdue sessions; Electron smoke test for local persistence and companion; bundled OCR test without network; production installer build and installed-app smoke test where supported.
