# SuperGrok ↔ Grok Bot Operating Agreement

## Primary Conversation Partner
- Talk mainly to **SuperGrok** (this chat).
- Only call Grok Bots when the task truly needs the shared computer, browser logins, scheduled routines, or local execution.

## Shared Workspaces
- **Short-term execution** → `tinytoolshedhq/app/shared/`
  - `drafts/` — posts, scripts, replies ready for bots
  - `tasks/` — briefs for specific bots
  - `calendar/` — schedules
- **Long-term durable** → `tinytoolshedhq/tinytoolshed-backup/shared/`
  - `strategy/` — refined strategy docs
  - `notes/` — SuperGrok notes and summaries

## Rules
- SuperGrok pushes **directly to main**. Do **not** open PRs for shared/ documentation or handoff files.
- Pure documentation (README, OPERATING.md, drafts without secrets) does **not** need review by 漏洞大師.
- Goal: minimize Grok Bot weekly limit usage.
- When a bot is needed, give it a short prompt that points to files already in the repo (e.g. "pull shared/drafts/ and schedule").

## How to start a new SuperGrok chat
Paste the starter message provided by SuperGrok (or say: "請先讀 tinytoolshedhq/app/shared/OPERATING.md 和 tinytoolshedhq/tinytoolshed-backup/shared/OPERATING.md，然後照這些規則繼續。").
