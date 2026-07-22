# Badges × Activities — What the Activities Side Needs to Know

Short version for whoever owns the activity/exercise logging system. Only covers where badges touch your code.

## Where badges hook in

When a user logs an exercise, `logExercise` (`src/controllers/exerciseController.ts`) calls:

```ts
await evaluateExerciseBadges(userId, session, t);
```

right after it creates the `ExerciseSession`, inside the same transaction. That one call awards every badge the log qualifies for. **You don't need to do anything special — it's already wired.** It only reads your data + writes to badge tables; it never touches `ExerciseSession`.

## The one thing that will break badges: the keys

Badges are matched by the **`exerciseKey`** and **`areaKey`** stored on each `ExerciseSession`. These must equal the **canonical catalog keys**:

- `ExerciseSession.exerciseKey` must match an `activity_sub_activities.key`
- `ExerciseSession.areaKey` must match an `activity_areas.key`

If a log is written with a key that isn't in the catalog, **no badge matches and nothing is awarded — silently.** This is currently the main problem: logs are coming in with keys like `imbasket`, `fitlane`, `shallow`, `open-rec-courts` that don't exist in the catalog (real keys are `basketball`, `fit-lanes`, and area `courts`).

**Canonical keys today:**
- Exercises: `fit-lanes`, `leisure-swim`, `recreational-swim`, `cardio`, `strength`, `boxing`, `spin`, `yoga`, `bootcamp`, `basketball`, `badminton`, `walking-track`
- Areas: `pool`, `fitness`, `group`, `courts`

The client should source these from `GET /api/area` (each item's `key`) rather than inventing its own. Whatever you persist as `exerciseKey`/`areaKey` on the session is what badges see.

## What gets awarded per log

Three scopes, two metrics, plus one-offs — all keyed on the above:

- **Frequency** (lifetime count of sessions): per exercise, per area, and any-exercise. Tiers at 10 / 50 / 100.
- **Streak** (consecutive days with a session): same three scopes. Tiers at 7 / 30 / 100 days.
- **Specialty** ("log this specific exercise once"): e.g. a badge with rule `exercise:basketball`.

## New exercises / areas

Badge sets are generated automatically when an admin adds one:
- `addSubActivity` → generates that exercise's frequency + streak badges
- `addArea` → generates that area's badges
- On boot, `seedExerciseBadges()` backfills any catalog entries that don't have badges yet

So adding activities needs no badge-side work — just make sure new entries have a stable `key`, and that logs use it.

## TL;DR for the activities owner

1. Keep persisting `exerciseKey`/`areaKey` on `ExerciseSession` — badges already read them.
2. **Those keys must be the catalog keys** (`activity_sub_activities.key` / `activity_areas.key`), not client-invented ones. This is the current breakage.
3. Everything else (which badges, thresholds, generation) is handled on the badge side.
