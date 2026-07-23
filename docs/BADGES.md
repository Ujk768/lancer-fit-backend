# Lancer Fit — Badge System (Definitive Documentation)

**This is the authoritative reference for the badge feature.** It covers everything end-to-end for both frontend and backend developers. Other badge docs in this folder (`badge-system-plan.md`, `-spec.md`, `-implementation.md`) are historical design notes; when they disagree with this file, this file wins.

- [1. Overview](#1-overview)
- [2. Badge types](#2-badge-types)
- [3. When badges are awarded](#3-when-badges-are-awarded-trigger-points)
- [4. Frontend integration](#4-frontend-integration)
- [5. Admin endpoints](#5-admin-endpoints)
- [6. Data model](#6-data-model)
- [7. Backend internals](#7-backend-internals)
- [8. Pending integrations](#8-pending-integrations)
- [9. Known gaps & caveats](#9-known-gaps--caveats)
- [10. File map](#10-file-map)

---

## 1. Overview

The badge system grants users badges as a **side effect of actions they already take** (logging exercises, admins ending challenges, etc.). Two principles drive everything:

1. **The frontend never awards badges — it only reads them.** There is no "award badge" API for a client to call. Badges are granted server-side, inside the same database transaction as the triggering action.
2. **Every award flows through one function** (`awardBadgeIfNotOwned`), which is idempotent — a user can never earn the same badge twice, and XP is granted exactly once.

So the frontend badge feature is essentially read-only: show a user's earned badges, and optionally the full catalog with earned ones highlighted.

---

## 2. Badge types

There are five families. Note the two separate "activity" families — this is the single most important thing to understand (see §4.6).

| Family | `badgeType` values | Earned by | Status |
|---|---|---|---|
| **Challenge Position** | `challenge_position` | Placing in a challenge (gold/silver/bronze) or participating | Definitions live; **awarding not wired yet** (§8) |
| **Activity** (old catalog) | `activity_frequency`, `activity_magnitude`, `activity_streak` | Logging via `POST /api/activity/:id/award-points` | Live, but the app doesn't use this endpoint |
| **Exercise** (app's real path) | `exercise_frequency`, `exercise_streak` | Logging via `POST /api/exercise/log` | **Live — this is what the app hits** |
| **Quest** | `quest_frequency`, `quest_streak` | Completing daily quests | Definitions seeded; **awarding not wired yet** (§8) |
| **Specialty** | `specialty` | A hardcoded rule, or logging a specific exercise | Live |

### 2.1 Exercise badges (the ones that matter for the app)

Generated from the exercise catalog (`ActivityArea` + `ActivitySubActivity`). Three **scopes** × two **metrics** × three **tiers**:

- **Scope** `exercise` — a specific catalog exercise (e.g. `basketball`)
- **Scope** `area` — any exercise in an area (e.g. `courts`)
- **Scope** `any` — any exercise at all
- **Metric** `frequency` — lifetime count of sessions (tiers **10 / 50 / 100**)
- **Metric** `streak` — consecutive days with a session (tiers **7 / 30 / 100** days)

Example names: `Basketball Regular I` (exercise frequency t1), `Open Rec & Courts Streak II` (area streak t2), `Any Exercise Regular III` (any frequency t3).

### 2.2 Activity badges (old path — not used by the app)

Same idea but keyed to the admin-managed `Activity` catalog (`activityId` / `category`) and evaluated on `POST /api/activity/:id/award-points`. Adds a **magnitude** metric (size of a single log). These exist and work, but the mobile app logs through the exercise path, not this one.

### 2.3 Challenge Position badges

Four per challenge: `gold`, `silver`, `bronze`, `participant`. Created automatically when an admin creates a challenge. Gold/silver/bronze XP comes from the challenge's `podiumFirst/Second/Third` fields (defaults 500/300/150); participant XP is a flat `PARTICIPANT_XP = 100`.

### 2.4 Quest badges

12 fixed badges, seeded once at boot: `frequency`/`streak` × `any_one` (completed ≥1 quest that day) / `all_three` (completed all of a day's quests) × 3 tiers.

### 2.5 Specialty badges

Two forms, both stored as a `SpecialtyBadge` with a `ruleKey`:
- **Hardcoded rule** (`triple_activity_day`, `iron_man`) — evaluated on the *activity* path.
- **`exercise:<exerciseKey>`** (e.g. `exercise:basketball`, the "Baller" badge) — earned by logging that exercise once, evaluated on the *exercise* path. Data-driven: create more just by adding badges, no code change.

---

## 3. When badges are awarded (trigger points)

| Trigger | Function(s) called | Badges awarded | Live? |
|---|---|---|---|
| `POST /api/exercise/log` | `evaluateExerciseBadges` | exercise frequency/streak (all 3 scopes) + `exercise:<key>` specialty | ✅ **the app uses this** |
| `POST /api/activity/:id/award-points` | `evaluateActivityBadges`, `evaluateSpecialtyBadges` | activity frequency/magnitude/streak + hardcoded specialty rules | ✅ (app doesn't use it) |
| Admin ends a challenge | `settleChallengePositionBadges` | gold/silver/bronze/participant | ❌ **no caller yet** (§8) |
| Daily quest completed | `evaluateQuestBadges` | quest badges | ❌ **no caller yet** (§8) |

**Badge creation** (definitions, separate from awarding): `POST /api/activity/create` generates an activity's badge set; `POST /api/challenge/add` generates a challenge's 4 position badges; `POST /api/area` and `POST /api/area/:id/activity` generate exercise/area badge sets; server boot seeds quest badges and backfills exercise badges for the whole catalog.

---

## 4. Frontend integration

### 4.1 Connecting

- **Base URL:** `http://<host>:8000/api`
- **React Native / Expo:** `<host>` is **your dev machine's LAN IP** (e.g. `10.2.1.219`), **not** `localhost` (on a device/emulator `localhost` is the device itself) and **not** the Expo/Metro `:8081` address. Find it with `ipconfig getifaddr en0`. Put it in one swappable config value — it changes with WiFi. Native RN is not subject to CORS.
- **Auth header:** `Authorization: Bearer <accessToken>` on authenticated requests, from the normal login flow.

### 4.2 `GET /api/badge/me` — the logged-in user's earned badges

**Auth required.** Newest first, each with `earnedAt` and type-specific `meta`.

```jsonc
{
  "success": true,
  "count": 3,
  "data": [
    {
      "badgeId": 74,
      "name": "Baller",
      "image": null,                 // always null for now — render your own icon (§4.5)
      "description": "Log a Basketball session",
      "xp": 250,
      "type": "specialty",
      "secret": false,
      "meta": { "kind": "specialty", "ruleKey": "exercise:basketball" },
      "earnedAt": "2026-07-22T02:14:42.440Z"
    },
    {
      "badgeId": 120,
      "name": "Basketball Regular I",
      "image": null,
      "description": "Basketball — Regular tier 1",
      "xp": 500,
      "type": "exercise_frequency",
      "secret": false,
      "meta": { "kind": "exercise", "scope": "exercise", "targetKey": "basketball",
                "metric": "frequency", "tier": 1, "threshold": 10 },
      "earnedAt": "2026-07-22T02:41:10.000Z"
    }
  ]
}
```

### 4.3 `GET /api/badge/all` — the full catalog

**Public** (no auth). Same object shape but **without** `earnedAt`, and returns every badge that exists. Use it for a locked/unlocked view: show all, mark a badge earned if its `badgeId` appears in `/badge/me`. Hide `secret: true` badges the user hasn't earned.

### 4.4 The `meta` object

`type` gives the family; `meta.kind` mirrors it and tells you which fields are present:

| `type` | `meta` |
|---|---|
| `exercise_frequency` / `exercise_streak` | `{ kind:"exercise", scope, targetKey, metric, tier, threshold }` — `scope`: `exercise`/`area`/`any`; `targetKey`: the exerciseKey/areaKey (null for `any`) |
| `activity_frequency` / `activity_magnitude` / `activity_streak` | `{ kind:"activity", scope, activityId, category, metric, tier, threshold }` |
| `challenge_position` | `{ kind:"challenge_position", challengeId, position }` — position: gold/silver/bronze/participant |
| `quest_frequency` / `quest_streak` | `{ kind:"quest", metric, completionMode, tier, threshold }` — completionMode: any_one/all_three |
| `specialty` | `{ kind:"specialty", ruleKey }` — e.g. `iron_man` or `exercise:basketball` |

### 4.5 Images are `null`

Every badge's `image` is currently `null` (real assets aren't produced yet; the field is intentionally nullable for now). **Render your own fallback icon** keyed off `type`/`meta` — medal by `position`, sport icon by exercise/area, flame for streaks. When real images ship, `image` will start returning a URL you can prefer when present.

### 4.6 CRITICAL: exercise/area keys must match the catalog

Exercise and area badges are matched by the **`exerciseKey`** and **`areaKey`** the app sends when logging (`POST /api/exercise/log`). These **must equal the canonical catalog keys**, or **nothing is awarded — silently**.

- Get the keys from `GET /api/area` (each item's `key`) — do **not** hardcode your own.
- **Exercise keys:** `fit-lanes`, `leisure-swim`, `recreational-swim`, `cardio`, `strength`, `boxing`, `spin`, `yoga`, `bootcamp`, `basketball`, `badminton`, `walking-track`
- **Area keys:** `pool`, `fitness`, `group`, `courts`

This is the most common reason "badges aren't working": the app sent `imbasket` instead of `basketball`, or `open-rec-courts` instead of `courts`.

### 4.7 When to refetch

After a successful `POST /api/exercise/log`, refetch `GET /api/badge/me` to show any newly earned badges. The log response does not currently return "badges you just earned" — you diff against what you had. (If you'd rather the log response include new badges directly, ask backend — small change.)

---

## 5. Admin endpoints

All require an **admin** token (`POST /api/admin/login`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/activity/badge-template?activityName=&category=` | Preview template badge names/thresholds for the create-activity form |
| `POST` | `/api/activity/create` | Create an activity **and** its badge set. Requires `magnitude` (3 × `{threshold, name?, image?}`); optional override arrays for the auto-generated freq/streak badges |
| `POST` | `/api/challenge/add` | Create a challenge **and** its 4 position badges. Accepts `podium: {first,second,third}` and optional `badges: {gold?,silver?,bronze?,participant?}` overrides |
| `POST` | `/api/badge/add` | Create a **specialty** badge only. `badgeType:"specialty"` required, plus a `ruleKey` that is either a registered hardcoded rule or `exercise:<exerciseKey>` |
| `DELETE` | `/api/badge/:badgeId` | Delete a badge. If already awarded, first call returns `409 { requiresConfirmation, awardedCount }`; retry with `?confirm=true`. Cascades to award rows; **XP is not clawed back** |

Exercise/area badges are **not** created via `/badge/add` — they're generated automatically when an admin adds a sub-activity/area (`POST /api/area`, `POST /api/area/:id/activity`) and backfilled on boot.

---

## 6. Data model

All tables use a shared `badges` row for display info, extended by exactly one sub-type table.

**`badges`** (`Badge`) — `badgeID` PK, `badgeName`, `badgeImage` (nullable), `badgeDescription`, `awardXpValue`, `secret`, `badgeType`, timestamps.

**`user_badges`** (`UserBadge`) — the award record. `id` PK, `userId`, `badgeID`, `createdAt` (= earned-at). **Unique index on `(userId, badgeID)`** — backs idempotent awarding. FK to `badges` cascades on delete.

**Sub-type tables** (each 1:1 with a `badges` row, `badgeId` FK cascades):

| Table | Model | Key columns |
|---|---|---|
| `challenge_position_badges` | `ChallengePositionBadge` | `challengeId`, `position`; unique `(challengeId, position)` |
| `activity_badges` | `ActivityBadge` | `scope`, `activityId`, `category`, `metric`, `tier`, `threshold`; unique `(scope, activityId, category, metric, tier)` |
| `exercise_badges` | `ExerciseBadge` | `scope`, `targetKey`, `metric`, `tier`, `threshold`; unique `(scope, targetKey, metric, tier)` |
| `quest_badges` | `QuestBadge` | `metric`, `completionMode`, `tier`, `threshold`; unique `(metric, completionMode, tier)` |
| `specialty_badges` | `SpecialtyBadge` | `ruleKey` (unique `badgeId`) |

Schema is created/updated by `sequelize.sync({ alter: true })` on boot — there are no migration files; editing a model and restarting applies the change.

---

## 7. Backend internals

Everything lives in `src/services/badges/`.

- **`awardBadge.ts` → `awardBadgeIfNotOwned(userId, badgeId, tx)`** — the ONLY writer of `user_badges`. Uses `findOrCreate` + the unique index for atomic, idempotent awarding; increments `User.totalXp` by the badge's `awardXpValue` exactly once. Returns `true` if newly awarded. Every evaluator calls only this.
- **`streak.ts` / `dateUtils.ts`** — streaks are **computed on demand, never stored**. One `DISTINCT DATE(...)` query gets the qualifying days, then `countStreakFromDays` walks backward from the log date counting consecutive days. Nothing to drift out of sync.
- **`exerciseBadges.ts`** — generation (`ensureExerciseScopeBadges`, `seedExerciseBadges`, `generateExerciseBadgesFor`) and evaluation (`evaluateExerciseBadges`, called from `logExercise`). Handles both the tiered exercise badges and the `exercise:<key>` specialty badges.
- **`activityBadges.ts`** — same for the old Activity path (`ensureActivityBadges`, `evaluateActivityBadges`).
- **`challengeBadges.ts`** — `createChallengeBadges` (on challenge creation) and `settleChallengePositionBadges` (for the future end-challenge flow).
- **`questBadges.ts`** — `seedQuestBadges` (boot) and `evaluateQuestBadges` (for the future quest-completion flow; has a `getQuestCompletionData` stub that throws until implemented).
- **`specialtyBadges.ts`** — the hardcoded rule registry (`triple_activity_day`, `iron_man`) and `evaluateSpecialtyBadges`.
- **`badgeSerializer.ts`** — `buildMetaMap` + `serializeBadge`, used by `/badge/me` and `/badge/all` to attach `meta`.
- **`constants.ts`** — `FREQUENCY_TIERS [10,50,100]`, `STREAK_TIERS [7,30,100]`, `TIER_XP [500,1000,2500]`, `PARTICIPANT_XP 100`.

Every evaluator runs inside the triggering action's transaction, so if the action rolls back, the badge award and its XP roll back too.

---

## 8. Pending integrations

Two features aren't built yet. Each needs exactly one function call when it is — integration comments in the code spell out the contract.

1. **End a challenge** → after flipping the challenge's status, call `settleChallengePositionBadges(challengeId, transaction)` (in `challengeBadges.ts`). Idempotent; ranks participants by distinct point value (ties share a tier), awards podium + participant badges.
2. **Complete a daily quest** → after recording the completion, call `evaluateQuestBadges(userId, dateKey, transaction)` (in `questBadges.ts`), and implement the `getQuestCompletionData` stub against the completion table. Contract is documented on the function.

---

## 9. Known gaps & caveats

- **The exercise-key contract (§4.6) is the #1 gotcha.** Logs with non-catalog keys award nothing, silently.
- **Activity (old) vs Exercise (new) paths.** The tiered *activity* badges only fire on `/activity/:id/award-points`, which the app doesn't call. The app's badges come from the *exercise* path. Long-term these two "activity" systems should probably be unified.
- **`badgeImage` is nullable for now** — meant to become required before full release once real assets exist.
- **`iron_man` specialty rule matches category strings literally** (`"Cycling"`/`"Running"`/`"Swimming"`); renaming a category silently disables it.
- **Streaks** can't be earned by back-dating — logging is restricted to today/yesterday.
- **Magnitude** exists only for activity badges, not exercise badges.

---

## 10. File map

```
src/models/
  Badges.ts                 Badge + BadgeType enum
  UserBadge.ts              award record (unique userId+badgeID)
  ChallengePositionBadge.ts, ActivityBadge.ts, ExerciseBadge.ts,
  QuestBadge.ts, SpecialtyBadge.ts

src/services/badges/
  awardBadge.ts             awardBadgeIfNotOwned (single write path)
  streak.ts, dateUtils.ts   on-demand streak computation
  exerciseBadges.ts         exercise badges: generation + evaluation (app path)
  activityBadges.ts         activity badges (old path)
  challengeBadges.ts        challenge position: create + settle
  questBadges.ts            quest seed + evaluate (evaluate pending)
  specialtyBadges.ts        hardcoded rules + evaluate
  badgeSerializer.ts        /badge/me + /badge/all shaping
  constants.ts              tier/XP ladders

src/controllers/
  badgeController.ts         getAllBadges, getMyBadges, createBadge, deleteBadge
  exerciseController.ts      logExercise -> evaluateExerciseBadges
  activityController.ts      createActivity/awardActivityPoints -> activity badges
  challengeController.ts     createChallenge -> createChallengeBadges
  areaController.ts          add area/sub-activity -> generateExerciseBadgesFor

src/routes/badgeRoutes.ts    /api/badge/{all,me,add,:badgeId}
src/config/seed.ts           seedQuestBadges + seedExerciseBadges on boot
```
