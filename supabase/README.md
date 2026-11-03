# FCA Rated — backend

## Migrations (run in order in the Supabase SQL editor)

| File | When | What it does |
|---|---|---|
| `migrations/20261103190000_security_hardening_phase_a.sql` | now (applied 2026-11-03) | Stops self-promotion to admin, locks ratings/titles/status to staff, server-validated invites, avatar storage rules, Lichess game ids + played-at time on games |
| `migrations/20261103210000_imports_achievements_seasons.sql` | now | Rating replay function, 1-click arena imports, resync, standings, seasons, achievements, admin stats |
| `migrations/20261103220000_schedule_lichess_sync.sql` | after the file above | Runs the `fca-api` sync every 15 minutes (pg_cron + pg_net) |
| `migrations/20261104000000_lock_after_new_frontend.sql` | **only after the new web app is deployed** | Handles can only be linked through verification; phone and reg number stop being public |

All files are safe to run more than once.

## How a Titled Tuesday gets rated

1. Arenas created by the Lichess accounts in `app_settings.lichess_creators` (default `bona-8`) are found by the
   `fca-api` edge function's `tick` (cron, every 15 min). Upcoming/live arenas show on the home page automatically.
2. When an arena finishes, its games and Lichess standings are fetched and staged in `arena_imports` (status `PENDING`).
3. An arbiter opens **Console → Imports** and taps **Approve & rate**. `apply_arena_import()` inserts the
   member-vs-member games and `recalculate_ratings()` replays every rated game in `played_at` order.
4. Achievements are recomputed (`supabase/functions/fca-api/achievements.ts`, shared with the web app).

Games are the source of truth: ratings, peaks and titles are always rebuilt from them, so late imports, voided games
and corrected results all land in the right chronological place. Titles are never taken away by a replay.

## Resync

When a member links Lichess (verified server-side via `link_lichess`), every arena they appear in is scanned and
their missing games against other members are queued as a `RESYNC` import for approval. Arbiters can also run a
resync for one member or everyone from **Console → Imports**.

## Edge function

`functions/fca-api` (deployed with JWT verification on). Actions are documented at the top of `index.ts`.
`tick` is public but rate-limited (one run per minute); everything that changes data checks the caller's role.
