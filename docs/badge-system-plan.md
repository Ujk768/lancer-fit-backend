# Badge System — Architecture Plan

**Status:** Planning only, no implementation yet. This document defines the overall architecture — data model, trigger points, and the endpoint/internal-function/database boundaries. Individual functions and components will each get a detailed spec in follow-up docs before any of this gets built.

## 1. Overview

Four badge types, all ultimately awarded through one shared code path:

1. **Challenge Position** — gold/silver/bronze/participant, awarded once per challenge when it ends.
2. **Activity** — Frequency, Magnitude, and Streak badges, tiered, scoped to a specific activity / its category / "any activity."
3. **Daily Quest** — Frequency and Streak badges for completing at least one quest in a day, and for completing all of a day's quests.
4. **Specialty** — hardcoded one-off rules (e.g. logging 3 different activity categories in a day).

## 2. Key decisions

| Question | Decision | Rationale |
|---|---|---|
| Are Frequency/Streak tier thresholds global or per-activity? | **Global**, one shared ladder reused at every scope (specific-activity, category, any-activity). | Units are comparable across activities for "how many times" and "how many days in a row" — a count/day-count means the same thing regardless of activity. |
| Are Magnitude tier thresholds global or per-activity? | **Per-activity, admin-defined** at activity creation (3 tiers: threshold + name + icon each). | A lap on a track and a minute on a treadmill aren't comparable — magnitude is inherently unit-specific. |
| How are streaks tracked? | **Computed on demand, nothing stored.** One query fetches every distinct calendar day a user has a qualifying log, then a single in-memory walk backward from today counts the current streak. | A stored streak counter can silently drift from reality (deleted logs, crashed mid-update). Computing from the source of truth every time can't drift, and one query + in-memory loop is cheap at this app's scale — no need for a `UserStreak` table at all. |
| How does a challenge's end actually get detected/triggered? | **Out of scope for this plan.** This app has no "end challenge" endpoint today. We define a pure internal function (`settleChallengePositionBadges`) that whoever builds that feature calls once, after flipping the challenge's status. | Decouples badge settlement from a feature that doesn't exist yet and isn't owned by this work. |
| Who tracks "user completed quest X on day Y"? | **Owned elsewhere.** This plan only defines the contract: whatever records a quest completion must call `evaluateQuestBadges(userId, date)` afterward. | That table/endpoint is being built as a separate effort. |
| Who qualifies for the Participant badge? | Rank all `ChallengeParticipant` rows with `pointsAwarded != 0` by `pointsAwarded` descending. Top 3 get gold/silver/bronze. Everyone else in that ranked (nonzero) set gets Participant. Anyone with `pointsAwarded == 0` (registered but never had a log approved) gets nothing. | A user must have logged — and had that logged submission approved — at least once to count as a real participant. Admin approval already happens at the individual log/submission level (the existing approve/reject flow); badge settlement itself is fully automatic and doesn't add a second manual approval step. |
| Can admins edit auto-generated badge names/icons/milestones? | **Yes, at activity-creation time**, before anything is saved. Every badge that creating this activity would trigger (magnitude always; activity-level frequency & streak always; category-level frequency & streak only if this is the first activity in that category; any-level frequency & streak only if this is the very first activity ever) is shown with a template-generated default name/icon/milestone, editable by the admin. Anything left untouched is created exactly as the template produced it. | Gives admins control without forcing them to configure anything if they're fine with the defaults — matches how the rest of the activity-creation form already works (fill in what you care about, sensible defaults for the rest). |
| How many Magnitude tiers per activity? | **3, for now.** Not hardcoded to 3 in a way that blocks adding a 4th later (see extensibility note below). | Matches every example given so far; no need to build more than what's needed today. |
| Global tier ladder values | **Frequency: `[10, 50, 100]`. Streak: `[7, 30, 100]`.** Evaluators must loop over however many tier rows exist for a given scope+metric (sorted by threshold) rather than hardcoding "check tier 1, 2, 3" — so adding a 4th tier later is purely a data change (insert new `Badge`/`ActivityBadge`/`QuestBadge` rows for every existing scope), not a code change. | Keeps "add more tiers later" cheap by construction, so there's no cost to starting with just 3 and waiting to see if more are needed. |
| Can badges be deleted via the API? | **Yes** — adding `DELETE /badge/:badgeId`, straightforward CRUD alongside the existing `GET /badge/all` and `POST /badge/add`, same `authenticate` + `authorize('admin')` gating already used on badge creation. | Low effort, no design questions attached. |

## 3. Data model additions

| Table | Purpose | Key fields |
|---|---|---|
| `Badge` *(existing, extended)* | Shared identity/display row for every badge, of any type | + `badgeType`: `challenge_position \| activity_frequency \| activity_magnitude \| activity_streak \| quest_frequency \| quest_streak \| specialty` |
| `ChallengePositionBadge` *(new)* | Links a Badge to a specific challenge + rank | `badgeId`, `challengeId`, `position` (`gold\|silver\|bronze\|participant`) |
| `ActivityBadge` *(new)* | Links a Badge to an activity/category/any-scope + metric + tier | `badgeId`, `scope` (`activity\|category\|any`), `scopeRef` (activityId or category string, null if `any`), `metric` (`frequency\|magnitude\|streak`), `tier`, `threshold` |
| `QuestBadge` *(new)* | The fixed set of quest badges (seeded once, not per-quest) | `badgeId`, `metric` (`frequency\|streak`), `completionMode` (`any_one\|all_three`), `tier`, `threshold` |
| `SpecialtyBadge` *(new)* | Points a Badge at a hardcoded rule function | `badgeId`, `ruleKey` (e.g. `"triple_activity_day"`, `"iron_man"`) |
| `UserBadge` *(existing, unchanged)* | The actual award record — used by all 4 types | `userId`, `badgeID`, earned timestamp |

No streak-tracking table — see the streak decision above.

## 4. The one shared write path

```
awardBadgeIfNotOwned(userId, badgeId, transaction)
  1. SELECT UserBadge WHERE userId + badgeId — if found, no-op (idempotent)
  2. INSERT UserBadge
  3. UPDATE User.totalXp += Badge.awardXpValue
```

This replaces the current empty `awardBadge` stub in `badgeController.ts`. **Every evaluator, across all 4 badge types, calls this and only this function to actually grant a badge** — it's the single place that writes `UserBadge`, which is what keeps "has this user already earned this" logic from being duplicated four times. Always runs inside the same transaction as whatever triggered it (a log write, a challenge settlement, a quest completion).

## 5. Streak computation (no stored state)

```
function computeCurrentStreak(userId, scopeFilter):
    # ONE database call — every distinct calendar day this user
    # has a qualifying log for, within this scope, newest first
    dates = SELECT DISTINCT DATE(date) FROM activity_logs
            WHERE userId = :userId AND <scopeFilter>
            ORDER BY date DESC

    streak = 0
    cursor = today()

    for date in dates:          # looping over already-fetched data, no further DB calls
        if date == cursor:
            streak += 1
            cursor -= 1 day
        else:
            break                # first gap found = streak ends here

    return streak
```

`<scopeFilter>` changes per call site: `activityId = X` for a specific activity, a join filtering `Activity.category = Y` for category-level, or no filter at all for "any activity." `DATE(date)` truncates the log's timestamp to a calendar day — necessary because two logs on the same day at different times must count as one day, not two. The same function/shape applies to quest streaks once that table exists, by pointing `scopeFilter`/source table at whatever the quest-completion work produces.

## 6. Per badge type: trigger → endpoint → internal calls → database

### 6.1 Challenge Position

| | |
|---|---|
| Frontend-facing endpoint | `POST /challenge/add` (existing, **extended**) — admin additionally submits gold/silver/bronze `{name, icon}`. Participant badge is auto-named, no input needed. |
| Internal function | `createChallengeBadges(challenge, positions)` — called from inside `createChallenge`. Creates 4 `Badge` + 4 `ChallengePositionBadge` rows in the same transaction as the challenge itself. |
| Internal function | `settleChallengePositionBadges(challengeId)` — **no route of its own.** Loads `ChallengeParticipant` rows for the challenge with `pointsAwarded != 0`, ordered by `pointsAwarded` DESC. Top 3 → gold/silver/bronze. Remainder → participant. Calls `awardBadgeIfNotOwned` for each. Whoever builds "admin ends challenge" calls this once, after flipping status. |
| Database access | Writes `Badge`/`ChallengePositionBadge` on creation. Reads `ChallengeParticipant` on settlement; writes via `awardBadgeIfNotOwned`. |

### 6.2 Activity (Frequency / Magnitude / Streak)

| | |
|---|---|
| Frontend-facing endpoint | `POST /activity/create` (existing, **extended**) — admin submits the activity plus a full badge list: 3 magnitude tiers (threshold + name + icon, always admin-supplied, no template — there's no sensible numeric default), and, editable but template-defaulted, whichever of the activity/category/any-level frequency & streak badges this creation newly triggers (see decisions table above). Exact request/response shape (e.g. whether the admin sees templated defaults via a separate preview step or the client renders them itself from a documented naming convention) is a detail for the per-function spec pass, not this document. |
| Internal function | `ensureActivityBadges(activity, badgeOverrides)` — called from inside `createActivity`. For each badge this activity triggers, uses the admin's override if one was supplied, otherwise falls back to the template default. Creates the 3 magnitude badges. Auto-creates/uses-override for 3 frequency + 3 streak badges at `scope=activity`. Creates `scope=category` frequency/streak badges once per category, the first time an activity in that category is created. Creates `scope=any` frequency/streak badges once, globally, the first time any activity is created. |
| Frontend-facing endpoint | `POST /activity/:activityid/award-points` (existing route, **more happens behind it** — no URL change) |
| Internal function | `evaluateActivityBadges(userId, activity, log)` — called at the end of `awardActivityPoints`, after the existing log+XP write. Three sub-checks: **Magnitude** (compare `log.unitsLogged` to this activity's 3 thresholds), **Frequency** (`COUNT(ActivityLog)` at activity/category/any scope vs. global tiers), **Streak** (`computeCurrentStreak` at activity/category/any scope vs. global tiers). Awards any newly-crossed tier via `awardBadgeIfNotOwned`. |
| Database access | Reads `Activity`, `ActivityLog`; writes `Badge`/`ActivityBadge` on activity creation, `UserBadge`/`User.totalXp` via `awardBadgeIfNotOwned` on logging. |

### 6.3 Daily Quest (owned elsewhere — this plan defines the contract only)

| | |
|---|---|
| Frontend-facing endpoint | None owned here — whatever "complete a quest" endpoint gets built elsewhere. |
| Contract required from that work | After recording a completion, it must call `evaluateQuestBadges(userId, date)`. |
| Internal function | `evaluateQuestBadges(userId, date)` — four separate metrics, each compared against its own fixed `QuestBadge` tiers: **Frequency/any_one** = lifetime count of individual quest-completion events (completing 2 quests in one day adds 2, not 1). **Frequency/all_three** = lifetime count of distinct days where all of that day's active quests were completed (inherently day-based — "all three" can only be true once per day). **Streak/any_one** = `computeCurrentStreak`-style consecutive days with ≥1 completion (a day only ever contributes 1 to the streak, no matter how many quests were completed that day). **Streak/all_three** = consecutive days where all quests were completed each day. All four read from whatever completion table the quest-completion work produces; awards via `awardBadgeIfNotOwned`. |
| One-time setup | 12 `Badge` + `QuestBadge` rows (3 frequency + 3 streak, × `any_one`/`all_three`) seeded once via a script — not tied to any single quest, since the active pool rotates. |
| Database access | Reads the external completion table + `Quest` (to know how many were active that day); writes via `awardBadgeIfNotOwned`. |

### 6.4 Specialty

| | |
|---|---|
| Frontend-facing endpoint | None. Admin can create the `Badge`+`SpecialtyBadge` row (name/image/`ruleKey`), but the matching rule function must already exist in code and be registered — these can't be fully data-driven. |
| Internal function | `evaluateSpecialtyBadges(userId, date)` — called at the end of `awardActivityPoints`, same hook point as activity badges. Looks up all `SpecialtyBadge` rows, runs each rule function keyed by `ruleKey` (e.g. `checkTripleActivityDay`, `checkIronManDay`) against that user's `ActivityLog` rows for `date`, awards via `awardBadgeIfNotOwned`. |
| Database access | Reads `ActivityLog`, `SpecialtyBadge`; writes via `awardBadgeIfNotOwned`. |

### 6.5 Badge management (cross-cutting)

| | |
|---|---|
| Frontend-facing endpoint | `DELETE /badge/:badgeId` (new) — admin-only, same `authenticate` + `authorize('admin')` pattern as `POST /badge/add`. |
| Database access | Deletes the `Badge` row (and, via cascading or an explicit cleanup step — to be decided in the per-function spec — its associated `UserBadge`/`ActivityBadge`/`ChallengePositionBadge`/`QuestBadge`/`SpecialtyBadge` rows). |

## 7. At a glance

- **Talks to the frontend** (only routes that exist or change): `POST /challenge/add` (extended), `POST /activity/create` (extended, now also carries the admin's badge-template edits), `POST /activity/:activityid/award-points` (unchanged URL, extended behavior), `DELETE /badge/:badgeId` (new). Nothing else in the badge system has a route.
- **Called within the backend only**: `awardBadgeIfNotOwned`, `computeCurrentStreak`, `createChallengeBadges`, `settleChallengePositionBadges`, `ensureActivityBadges`, `evaluateActivityBadges`, `evaluateQuestBadges`, `evaluateSpecialtyBadges`, and each individual specialty rule function.
- **Talks to the database**: every function above, directly via Sequelize models (no separate repository/DAO layer, consistent with the rest of the codebase). `awardBadgeIfNotOwned` is the only function anywhere that writes `UserBadge`.

## 8. Open questions / assumptions still to confirm before implementation

- The naming template convention itself (e.g. `"{Activity} Enthusiast I/II/III"`) still needs to be written out — this doc says templates exist and are editable, not what they actually say.
- Exact request/response shape for previewing template defaults before an admin edits them on `POST /activity/create` (server-rendered preview vs. a client-side-known convention) — deferred to the per-function spec.
- Whether the same "editable template, defaults if untouched" flow from activity creation should also apply to the Participant badge on `POST /challenge/add` (currently planned as auto-named with no input at all) — not asked about yet, flagging for consistency.
- Whether `DELETE /badge/:badgeId` should cascade-delete a badge's `UserBadge` awards (a user keeps a badge they already earned even if it's deleted later, or loses it?) — needs a decision before building it.
- An update/edit endpoint for an *already-created* badge (as opposed to editing a template before creation) hasn't been requested — still out of scope unless asked for.
