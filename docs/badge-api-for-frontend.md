# Badge API — Frontend Integration Guide

This document is for whoever is building the **badge feature in the frontend/mobile app**. It describes every badge-related endpoint the backend exposes, the exact response shapes, and — importantly — which things happen automatically on the backend so you don't try to trigger them from the client.

Everything here is implemented and working on the backend (branch `feature-badges`). If a response shape here doesn't match what you get, the backend changed — tell the backend side.

---

## 1. The one thing to understand first

**The frontend never awards badges. It only reads them.** Badges are granted automatically by the backend as a side effect of actions the app already does (logging an activity, a challenge ending, etc.). There is no "award badge" call for the client to make, and you should not build one.

So the badge feature on the frontend is essentially two screens' worth of work:
- **"My badges"** — what the logged-in user has earned → `GET /api/badge/me`
- **"All badges / locked + unlocked"** (optional) — the full catalog, with earned ones highlighted → `GET /api/badge/all` cross-referenced with `/api/badge/me`

---

## 2. Connecting to the backend

- **Base URL (local):** `http://localhost:8000/api`
- All examples below are relative to that base. So `GET /badge/me` means `GET http://localhost:8000/api/badge/me`.
- **Auth:** send the logged-in user's access token as `Authorization: Bearer <accessToken>` on every authenticated request. You already get this token from the existing login flow (`POST /api/auth/login` returns `accessToken` + `refreshToken`).
- **Browser/Expo-web only — CORS:** the backend only accepts browser requests from origins listed in its `CLIENT_ORIGINS` env var (default `http://localhost:5173`). If your dev server runs on a different port, the backend operator needs to add it. Native mobile (React Native / Expo Go) is not subject to this.
- **Heads up on login:** the backend now requires email verification before login succeeds. If login returns `403` with `code: "EMAIL_NOT_VERIFIED"`, the user must verify via the email-verification flow first. (Not badge-specific, but it will block you in testing if you don't know.)

---

## 3. Read endpoints (the ones you'll actually use)

### 3.1 `GET /api/badge/me` — the logged-in user's earned badges

**Auth:** required (any logged-in user).
Returns every badge this user has earned, newest first, each with an `earnedAt` timestamp and type-specific `meta`.

```jsonc
{
  "success": true,
  "count": 7,
  "data": [
    {
      "badgeId": 34,
      "name": "Spring 5K Legend",
      "image": null,                       // see §5 — images are currently null
      "description": "Champion — Spring 5K",
      "xp": 800,                            // XP this badge granted when earned
      "type": "challenge_position",
      "secret": false,
      "meta": { "kind": "challenge_position", "challengeId": 1, "position": "gold" },
      "earnedAt": "2026-07-19T05:14:50.453Z"
    },
    {
      "badgeId": 4,
      "name": "Lane Swimming Regular I",
      "image": null,
      "description": "Lane Swimming — Regular tier 1",
      "xp": 500,
      "type": "activity_frequency",
      "secret": false,
      "meta": {
        "kind": "activity", "scope": "activity", "activityId": 1,
        "category": null, "metric": "frequency", "tier": 1, "threshold": 10
      },
      "earnedAt": "2026-07-19T05:01:26.989Z"
    }
    // ...
  ]
}
```

### 3.2 `GET /api/badge/all` — the full badge catalog

**Auth:** public (no token needed).
Same object shape as `/badge/me` but **without** `earnedAt`, and it returns *every* badge that exists (currently ~72 in a seeded dev DB). Use this for a "here are all the badges, these are the ones you've unlocked" view: fetch both, and mark a catalog badge as earned if its `badgeId` appears in `/badge/me`.

```jsonc
{
  "success": true,
  "count": 72,
  "data": [
    { "badgeId": 1, "name": "Lane Swimming Power I", "image": null,
      "description": "Lane Swimming — Power tier 1", "xp": 500,
      "type": "activity_magnitude", "secret": false,
      "meta": { "kind": "activity", "scope": "activity", "activityId": 1,
                "category": null, "metric": "magnitude", "tier": 1, "threshold": 10 } }
    // ...
  ]
}
```

> **Secret badges:** entries with `"secret": true` are meant to be hidden until earned. For a locked/unlocked view, hide secret badges the user hasn't earned (i.e. present in `/badge/all` with `secret: true` but not in `/badge/me`).

---

## 4. Reading the `meta` object (how to render each badge)

`type` tells you the family; `meta.kind` mirrors it and tells you which fields are present. There are four shapes:

| `type` | `meta` fields | Meaning |
|---|---|---|
| `activity_frequency` / `activity_magnitude` / `activity_streak` | `{ kind:"activity", scope, activityId, category, metric, tier, threshold }` | `scope` is `"activity"` (one specific activity, see `activityId`), `"category"` (all activities in `category`), or `"any"` (any activity). `metric` = `frequency` (# of logs), `magnitude` (size of one log), or `streak` (consecutive days). `tier` 1–3, `threshold` is the number required. |
| `challenge_position` | `{ kind:"challenge_position", challengeId, position }` | `position` is `"gold"`, `"silver"`, `"bronze"`, or `"participant"` for challenge `challengeId`. |
| `quest_frequency` / `quest_streak` | `{ kind:"quest", metric, completionMode, tier, threshold }` | `completionMode` is `"any_one"` (completed ≥1 daily quest) or `"all_three"` (completed all of a day's quests). |
| `specialty` | `{ kind:"specialty", ruleKey }` | A one-off badge, e.g. `ruleKey:"iron_man"`. |

Grouping suggestion for the "my badges" screen: group by `type` (or by `meta.scope` for activity badges), and within a group order by `tier`.

---

## 5. Badge images are currently `null` — render your own icons

Every badge's `image` is `null` right now (real image assets haven't been produced yet; the field is intentionally nullable for the moment). **Do not rely on `image` being a URL.** Render a fallback icon on the client, keyed off `type` + `meta` — e.g. a medal for `challenge_position` colored by `position`, a swimmer/runner icon by activity category, a flame for streaks. When real images land, `image` will start coming back as a URL string and you can prefer it when present.

---

## 6. How badges get earned (context — no client action)

You don't call these *to* earn badges; the badge awards happen automatically inside them. Listed so you know when to re-fetch `/badge/me`.

| User action | Existing endpoint | Badges it can trigger |
|---|---|---|
| Logs activity points | `POST /api/activity/:activityid/award-points` | Activity (frequency/magnitude/streak) + Specialty |
| A challenge is settled by an admin | (backend/admin, no client call) | Challenge position (gold/silver/bronze/participant) |
| Completes daily quests | *(not built yet — see §8)* | Quest badges |

Practical implication: after a successful `POST /activity/:id/award-points`, re-fetch `GET /api/badge/me` to show any newly earned badges. The award-points response itself does **not** currently include "badges you just earned" — you detect new ones by diffing against what you had. (If you'd prefer the award-points response to return newly-earned badges directly, ask the backend side — it's a small change.)

---

## 7. Admin badge management (only if you're building an admin dashboard)

Skip this section if the frontend you're building is the student-facing app. All of these require an **admin** token (from `POST /api/admin/login`) with `Authorization: Bearer <token>`.

- **`GET /api/activity/badge-template?activityName=<name>&category=<cat>`** — preview the badge names/thresholds that creating an activity would generate, so the create-activity form can show editable, pre-filled fields. Returns `activityFrequency` / `activityStreak` arrays plus `categoryIsNew` / `anyIsNew` flags and their arrays (null when that scope isn't newly triggered).
- **`POST /api/activity/create`** — creates an activity *and* its badge set in one call. Requires a `magnitude` array of exactly 3 `{ threshold, name?, image? }`. Optional override arrays (`activityFrequency`, `activityStreak`, `categoryFrequency`, `categoryStreak`, `anyFrequency`, `anyStreak`) let the admin rename/re-icon the auto-generated badges; omit them to accept template defaults.
- **`POST /api/challenge/add`** — creates a challenge *and* its 4 position badges. Accepts `podium: { first, second, third }` (gold/silver/bronze XP) and optional `badges: { gold?, silver?, bronze?, participant? }` name/image overrides.
- **`POST /api/badge/add`** — creates a **specialty** badge only (`badgeType: "specialty"` required, plus a `ruleKey` that must already exist in backend code). Other badge types are created via the activity/challenge flows above, not here.
- **`DELETE /api/badge/:badgeId`** — two-step delete. If the badge was already earned by users, the first call returns `409` with `{ requiresConfirmation: true, awardedCount }`; call again with `?confirm=true` to actually delete. Deleting removes it from earners' lists but does **not** claw back XP — worth saying so in the confirm dialog.

---

## 8. Not available yet (so you can plan around it)

- **Quest badges** exist as definitions and will be awarded automatically once the separate "daily quest completion" tracking is built. Until then, a user's `/badge/me` will simply never contain `quest_*` badges. The screens don't need special handling — they'll just start appearing later.
- **Progress toward the next tier** (e.g. "7 / 10 swims to the next badge") is not a dedicated endpoint. You *can* approximate it client-side: the `threshold` is in `meta`, but you'd need the user's current count/streak, which isn't exposed as a single number today. If a progress UI is in scope, ask the backend side to add a small progress endpoint rather than trying to reconstruct it.

---

## 9. Quick reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/badge/me` | user | Earned badges for the logged-in user |
| GET | `/api/badge/all` | public | Full badge catalog |
| GET | `/api/activity/badge-template` | admin | Preview badge defaults for create-activity form |
| POST | `/api/activity/create` | admin | Create activity + its badges |
| POST | `/api/challenge/add` | admin | Create challenge + its position badges |
| POST | `/api/badge/add` | admin | Create a specialty badge |
| DELETE | `/api/badge/:badgeId` | admin | Delete a badge (two-step confirm) |
