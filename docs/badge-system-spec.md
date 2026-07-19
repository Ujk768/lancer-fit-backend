# Badge System — Detailed Specs

Companion to `badge-system-plan.md` (read that first for the overall architecture and decisions). This document specs individual tables and functions at implementation-ready detail. Filled in incrementally, in dependency order: schema → shared helpers → per badge type.

**Implementation status: §A through §G are all implemented and smoke-tested end-to-end** (schema, shared helpers, activity/challenge/specialty badges, quest badge seed + contract stub, delete endpoint). The one deliberately unfinished piece is `getQuestCompletionData` in `src/services/badges/questBadges.ts`, which throws until the quest-completion work (owned elsewhere) implements it — see the integration comment on `evaluateQuestBadges` there. `settleChallengePositionBadges` works but has no caller yet; whoever builds "admin ends challenge" wires it in (integration comment on the function).

A note on how schema changes actually happen in this repo: there are no migration files anywhere (see `HANDOFF.md`). `src/index.ts` calls `sequelize.sync({ alter: true })` on every server boot, which means simply defining/editing a Model file and restarting the dev server is enough to create or alter the real Postgres tables. So "spec the schema" below is literally the finished shape of the Model files — no separate migration-writing step exists in this project.

## Tracked for later — revisit before full release

Running list of decisions made for dev-time convenience that are **not** meant to be the permanent state. Check this list before shipping.

- **`Badge.badgeImage` allows `null` for now** (see C.0). Fine while badge icons aren't finalized/uploaded yet; before full release this should go back to required (`allowNull: false`) once every badge — auto-generated ones included — has a real image, so nothing ships with a missing icon.

---

## A. Schema

### A.1 `Badge` (existing table, modified)

| Field | Type | Null? | Notes |
|---|---|---|---|
| `badgeID` | INTEGER, PK, autoincrement | no | unchanged |
| `badgeName` | STRING | no | unchanged |
| `badgeImage` | STRING | no | unchanged |
| `badgeDescription` | TEXT | no | unchanged |
| `awardXpValue` | INTEGER | no | unchanged |
| `secret` | BOOLEAN, default `false` | no | unchanged |
| `badgeType` | STRING (app-level enum, see below) | no | **new** |
| ~~`completionCriteria`~~ | — | — | **removed** — superseded by `threshold` on the type-specific tables below; meaningless for `challenge_position`/`specialty` types |

`badgeType` values (validated in application code via a Zod schema on write, not a Postgres `ENUM` — matches how `role`/`status`/`category` etc. are already handled elsewhere in this codebase, i.e. plain `STRING` columns, not DB-level enums):
`"challenge_position" | "activity_frequency" | "activity_magnitude" | "activity_streak" | "quest_frequency" | "quest_streak" | "specialty"`

### A.2 `ChallengePositionBadge` (new table: `challenge_position_badges`)

| Field | Type | Null? | Notes |
|---|---|---|---|
| `id` | INTEGER, PK, autoincrement | no | |
| `badgeId` | INTEGER, FK → `badges.badgeID` | no | `onDelete: CASCADE` — deleting a Badge removes its position record too |
| `challengeId` | INTEGER, FK → `challenges.challengeId` | no | `onDelete: CASCADE` — deleting a challenge removes its badge definitions |
| `position` | STRING: `"gold" \| "silver" \| "bronze" \| "participant"` | no | |

Unique index on `(challengeId, position)` — a challenge can only have one badge per position, which is what lets `settleChallengePositionBadges` look one up unambiguously.

### A.3 `ActivityBadge` (new table: `activity_badges`)

Revising the shape from the architecture doc: instead of one polymorphic `scopeRef` string column, use two separate nullable columns — a real foreign key when the scope is a specific activity, and a plain string when it's a category. This keeps a real FK constraint where one actually applies (Sequelize/Postgres can enforce it, and you get `.include: [{ model: Activity }]` for free) instead of a "this string means different things depending on another column" pattern.

| Field | Type | Null? | Notes |
|---|---|---|---|
| `id` | INTEGER, PK, autoincrement | no | |
| `badgeId` | INTEGER, FK → `badges.badgeID` | no | `onDelete: CASCADE` |
| `scope` | STRING: `"activity" \| "category" \| "any"` | no | |
| `activityId` | INTEGER, FK → `activities.activityId` | **yes** | set only when `scope = "activity"`, else `null` |
| `category` | STRING | **yes** | set only when `scope = "category"`, else `null` |
| `metric` | STRING: `"frequency" \| "magnitude" \| "streak"` | no | |
| `tier` | INTEGER | no | 1, 2, 3, … — not capped at 3 in the schema, per the extensibility decision |
| `threshold` | INTEGER | no | the count/day-count this tier requires |

Unique index on `(scope, activityId, category, metric, tier)` — Postgres treats `NULL` as distinct in unique indexes, so this correctly allows e.g. `(any, null, null, frequency, 1)` to exist exactly once while also allowing many different `(activity, 7, null, frequency, 1)` rows for different activity IDs.

Validation rule enforced in application code (not expressible as a plain column constraint): `metric = "magnitude"` is only ever valid when `scope = "activity"` — category/any-level magnitude badges don't exist, since units aren't comparable across activities (established in the architecture doc).

### A.4 `QuestBadge` (new table: `quest_badges`)

| Field | Type | Null? | Notes |
|---|---|---|---|
| `id` | INTEGER, PK, autoincrement | no | |
| `badgeId` | INTEGER, FK → `badges.badgeID` | no | `onDelete: CASCADE` |
| `metric` | STRING: `"frequency" \| "streak"` | no | |
| `completionMode` | STRING: `"any_one" \| "all_three"` | no | |
| `tier` | INTEGER | no | |
| `threshold` | INTEGER | no | |

Unique index on `(metric, completionMode, tier)`. This table gets exactly 12 rows total, seeded once (see §F later).

### A.5 `SpecialtyBadge` (new table: `specialty_badges`)

| Field | Type | Null? | Notes |
|---|---|---|---|
| `id` | INTEGER, PK, autoincrement | no | |
| `badgeId` | INTEGER, FK → `badges.badgeID`, unique | no | 1:1 with `Badge` — `onDelete: CASCADE` |
| `ruleKey` | STRING | no | must match a key in the hardcoded rule-function lookup (see §E later) — application-level validation, not a DB constraint, since the set of valid keys lives in code |

### A.6 `UserBadge` (existing table, unchanged)

No changes. Still `userId`, `badgeID`, `createdAt`/`updatedAt` (the earned-at timestamp). Used identically by all 4 badge types.

### A.7 New associations (added to `src/models/associations.ts`)

```
Badge.hasOne(ChallengePositionBadge, { foreignKey: "badgeId" });
Badge.hasOne(ActivityBadge,          { foreignKey: "badgeId" });
Badge.hasOne(QuestBadge,             { foreignKey: "badgeId" });
Badge.hasOne(SpecialtyBadge,         { foreignKey: "badgeId" });

ChallengePositionBadge.belongsTo(Badge,     { foreignKey: "badgeId" });
ChallengePositionBadge.belongsTo(Challenge, { foreignKey: "challengeId" });
Challenge.hasMany(ChallengePositionBadge,   { foreignKey: "challengeId" });

ActivityBadge.belongsTo(Badge,    { foreignKey: "badgeId" });
ActivityBadge.belongsTo(Activity, { foreignKey: "activityId" });   // only meaningful when scope="activity"
Activity.hasMany(ActivityBadge,   { foreignKey: "activityId" });

QuestBadge.belongsTo(Badge, { foreignKey: "badgeId" });
SpecialtyBadge.belongsTo(Badge, { foreignKey: "badgeId" });
```

This is on top of the existing `Badge.belongsToMany(User, { through: UserBadge, ... })` association — worth noting while we're in this file that the existing association has the `badgeId`/`badgeID` casing mismatch flagged in `HANDOFF.md` (rough edge #5). Since this new work is about to lean on `UserBadge` far more heavily than today, **fixing that mismatch becomes a prerequisite**, not an optional cleanup — I'll include it as the first step of implementation rather than building on top of a known-shaky association.

**Status: implemented and verified.** All of §A is live in `src/models/` — booted the app against the real dev database and confirmed via `psql` that every table, column, FK, and unique index landed exactly as specced, and that `user_badges.badgeID` now has a single clean foreign key (no leftover shadow column from the old mismatch).

---

## B. Shared helpers

These two functions are the foundation every badge-type evaluator (§C onward) is built on. Neither has an HTTP route — they're called from inside other backend code only.

### B.0 Where this code lives

Nothing in the current codebase is a good home for cross-controller, non-route logic like this — `utils/` is for tiny pure functions with no DB access (`jwt.ts`, `password.ts`), and `controllers/` is one file per resource, request-handling only. Proposing a new `src/services/badges/` directory to hold the badge engine specifically, since it's going to be called from `activityController`, `approveController`/challenge settlement, and eventually whatever quest-completion code gets built — it doesn't belong to any one of them.

```
src/services/badges/
  awardBadge.ts   → awardBadgeIfNotOwned
  streak.ts       → computeCurrentStreak
  (later: activityBadges.ts, challengeBadges.ts, questBadges.ts, specialtyBadges.ts — §C onward)
```

### B.1 Prerequisite: a uniqueness guarantee on `UserBadge`

`UserBadge` (existing table, untouched by §A) currently has **no unique index** on `(userId, badgeID)`. That matters now because `awardBadgeIfNotOwned` below does a "check, then insert" — without a DB-level constraint backing that up, two near-simultaneous requests for the same user (e.g. two rapid activity logs both crossing the same frequency tier) could both pass the "not owned yet" check before either has inserted, resulting in two `UserBadge` rows and the XP being awarded twice.

**Add to `UserBadge.init()`:**
```ts
{
  sequelize,
  modelName: "userBadge",
  tableName: "user_badges",
  timestamps: true,
  underscored: false,
  indexes: [{ unique: true, fields: ["userId", "badgeID"] }],
}
```

### B.2 `awardBadgeIfNotOwned`

```ts
async function awardBadgeIfNotOwned(
  userId: number,
  badgeId: number,
  transaction: Transaction,
): Promise<boolean>   // true = newly awarded, false = user already had it
```

Logic — uses Sequelize's `findOrCreate`, which relies on the unique index above to make the check-and-insert atomic at the database level (rather than a separate `findOne` then `create`, which has a gap a race could slip through):

```ts
async function awardBadgeIfNotOwned(userId, badgeId, transaction) {
  const [, created] = await UserBadge.findOrCreate({
    where: { userId, badgeID: badgeId },
    defaults: { userId, badgeID: badgeId },
    transaction,
  });

  if (!created) return false; // already owned — no-op

  const badge = await Badge.findByPk(badgeId, { transaction });
  await User.increment(
    { totalXp: badge!.awardXpValue },
    { where: { userId }, transaction },
  );

  return true;
}
```

Always called with the same `transaction` the calling code is already using (the activity-log write, the challenge settlement, the quest completion) — so if anything downstream fails and rolls back, the badge award and its XP roll back with it. Returns a boolean specifically so callers can decide whether to do something with a *newly* earned badge (e.g. a future "you just earned X!" notification) without re-querying.

### B.3 `computeCurrentStreak`

```ts
type StreakScope =
  | { type: "activity"; activityId: number }
  | { type: "category"; category: string }
  | { type: "any" };

async function computeCurrentStreak(
  userId: number,
  scope: StreakScope,
  asOf: Date,               // the calendar day to count backward from — always
                             // the triggering log's date, passed explicitly
  transaction: Transaction, // required — see correctness note below
): Promise<number>
```

Logic — one query fetches every distinct calendar day with a qualifying log, then an in-memory walk counts the current streak (see the mechanics discussion earlier in this conversation for why: no stored counter, can't drift out of sync):

```ts
async function computeCurrentStreak(userId, scope, asOf) {
  const where: any = { userId };
  const include: any[] = [];

  if (scope.type === "activity") {
    where.activityId = scope.activityId;
  } else if (scope.type === "category") {
    include.push({
      model: Activity,
      attributes: [],
      where: { category: scope.category },
    });
  }
  // scope.type === "any" → no extra filter, every log for this user counts

  const rows = await ActivityLog.findAll({
    where,
    include,
    attributes: [[fn("DISTINCT", fn("DATE", col("activity_logs.date"))), "day"]],
    order: [[literal('"day"'), "DESC"]],
    raw: true,
    transaction,
  });

  const days = rows.map((r: any) => r.day as string); // "YYYY-MM-DD", newest first

  let streak = 0;
  let cursor = toDateOnly(asOf);

  for (const dayStr of days) {
    const day = parseDateOnly(dayStr);
    if (day.getTime() === cursor.getTime()) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else if (day.getTime() < cursor.getTime()) {
      break; // first gap — streak ends here
    }
    // day > cursor can't happen: rows are sorted DESC and we walk in lockstep
  }

  return streak;
}
```

`toDateOnly`/`parseDateOnly`/`addDays` are trivial date-only helpers (strip time-of-day, add/subtract whole days) — worth their own small util rather than inlining, since both this function and every call site that constructs `asOf` need the same "ignore time-of-day" normalization.

A qualifying log is **any** `ActivityLog` row for the scope, regardless of how much was logged — even a 1-unit log extends the streak by a day. Multiple logs on the same day still only count as one day, which is what the `DISTINCT DATE(...)` in the query guarantees.

**Why `transaction` is required, not optional**: `evaluateActivityBadges` (§C) calls this immediately after writing today's `ActivityLog` row, inside the same transaction. Postgres transactions only see their *own* uncommitted writes when queried from inside that same transaction — query without passing it through, and today's just-written log wouldn't show up yet, undercounting the streak by exactly the log that triggered the check. Every call site in this feature has a transaction in scope already, so there's no case where this should be omitted.

Two things worth flagging, not blocking:
- **Timezone**: `DATE(date)` truncates using whatever timezone the Postgres session defaults to (no explicit timezone is configured anywhere in this app today, and there's no per-user timezone field on `User`). For a student logging right around midnight, which calendar day that lands on depends on server default TZ, not the student's actual local time. Not a new problem introduced here — just worth knowing before someone reports "my streak broke and I definitely logged yesterday."
- **Deleted activities**: `ActivityLog` cascade-deletes when its parent `Activity` is deleted (existing behavior, unrelated to badges) — so deleting an activity retroactively shrinks anyone's streak that depended on it. Existing behavior, not something this feature changes, just inherits.

---

## C. Activity badges

### C.0 Two gaps this section surfaced — resolved

1. **Per-badge XP.** Tier *thresholds* were already settled (`FREQUENCY_TIERS = [10, 50, 100]`, `STREAK_TIERS = [7, 30, 100]`); XP per tier wasn't. Same "global ladder" pattern, confirmed values:
   ```
   TIER_XP = [500, 1000, 2500]   // tier 1 / 2 / 3, reused across frequency/streak/magnitude alike
   ```
2. **`Badge.badgeImage` is currently `NOT NULL`.** Breaks the moment an admin leaves an auto-generated badge's icon un-customized, since there's no real default image asset to fall back to. **Confirmed: make it nullable for now** — `null` means "frontend renders its own fallback icon." This is explicitly a dev-time-only relaxation, not the permanent shape — see the "Tracked for later" list at the top of this doc. Small amendment to the already-implemented §A model (`badgeImage: { type: DataTypes.STRING, allowNull: true }` in `src/models/Badges.ts`) — one-line change, ready whenever you want it applied, not yet done since we're still in the doc-first phase.

### C.1 Naming template

One pure function, shared by the preview endpoint and the create endpoint (so both compute identical defaults):

```ts
const METRIC_WORD: Record<string, string> = {
  frequency: "Regular",
  streak: "Streak",
  magnitude: "Power",
};
const TIER_SUFFIX = ["I", "II", "III"]; // indexed by tier - 1; extend if a 4th tier ever ships

function templateBadgeName(metric: string, tier: number, label: string): string {
  return `${label} ${METRIC_WORD[metric]} ${TIER_SUFFIX[tier - 1]}`;
}
```

`label` is the activity's name for activity-scope, the category name for category-scope, or the fixed string `"Any Activity"` for any-scope. Examples: `templateBadgeName("frequency", 2, "Lane Swimming")` → `"Lane Swimming Regular II"`; `templateBadgeName("streak", 3, "Swimming")` → `"Swimming Streak III"`; `templateBadgeName("frequency", 1, "Any Activity")` → `"Any Activity Regular I"`. Admin can override any of these before creation (see C.3); untouched ones are created exactly as this function produces them.

### C.2 `ensureActivityBadges`

```ts
type BadgeOverride = { name?: string; image?: string };
type MagnitudeTierInput = { threshold: number } & BadgeOverride;  // threshold always required, no template

interface ActivityBadgeInput {
  magnitude: [MagnitudeTierInput, MagnitudeTierInput, MagnitudeTierInput];
  activityFrequency?: [BadgeOverride?, BadgeOverride?, BadgeOverride?];
  activityStreak?: [BadgeOverride?, BadgeOverride?, BadgeOverride?];
  categoryFrequency?: [BadgeOverride?, BadgeOverride?, BadgeOverride?]; // only meaningful if category is new
  categoryStreak?: [BadgeOverride?, BadgeOverride?, BadgeOverride?];
  anyFrequency?: [BadgeOverride?, BadgeOverride?, BadgeOverride?];     // only meaningful if this is the first activity ever
  anyStreak?: [BadgeOverride?, BadgeOverride?, BadgeOverride?];
}

async function ensureActivityBadges(
  activity: Activity,
  input: ActivityBadgeInput,
  transaction: Transaction,
): Promise<void>
```

Steps, all inside the transaction passed in from `createActivity`:

1. **Magnitude** (always, exactly 3): for `tier` 1–3, create `Badge` (`badgeType: "activity_magnitude"`, name/image from `input.magnitude[tier-1]` override or `templateBadgeName("magnitude", tier, activity.activityName)`, `awardXpValue: TIER_XP[tier-1]`) + `ActivityBadge` (`scope: "activity"`, `activityId: activity.activityId`, `metric: "magnitude"`, `tier`, `threshold: input.magnitude[tier-1].threshold`).
2. **Activity-scope frequency & streak** (always, 3 each): same pattern, `scope: "activity"`, `threshold` from the global `FREQUENCY_TIERS`/`STREAK_TIERS` ladder (not admin input), name/image from `input.activityFrequency[tier-1]`/`input.activityStreak[tier-1]` override or template.
3. **Category-scope frequency & streak**: `const categoryExists = await ActivityBadge.count({ where: { scope: "category", category: activity.category }, transaction })`. If `0`, create 3+3 the same way, `scope: "category"`, `category: activity.category`, `activityId: null`, using `input.categoryFrequency`/`input.categoryStreak` overrides. If nonzero, skip entirely — existing category badges are untouched, and any override input for them is ignored (the preview step in C.3 is what keeps the client from sending overrides for a category that isn't new in the first place).
4. **Any-scope frequency & streak**: `const anyExists = await ActivityBadge.count({ where: { scope: "any" }, transaction })`. If `0` (i.e. this is the very first activity ever created), create 3+3 with `scope: "any"`, `activityId: null`, `category: null`, label `"Any Activity"`. Otherwise skip.

### C.3 Endpoints

**`GET /activity/badge-template?activityName=<string>&category=<string>`** *(new — admin-only)*

Read-only, no writes. Lets the admin UI render editable fields pre-filled with defaults before the activity actually exists. Computes the same `templateBadgeName` defaults C.2 would use, and tells the client which of the category/any sections are actually new (so the UI knows whether to show them as editable or hide them, since editing an already-shared category/any badge from a single activity's creation form doesn't make sense — those are edited later via the badge management endpoints instead, if at all).

Response:
```json
{
  "activityFrequency": [{ "tier": 1, "threshold": 10, "name": "Lane Swimming Regular I", "image": null }, ...],
  "activityStreak": [{ "tier": 1, "threshold": 7, "name": "Lane Swimming Streak I", "image": null }, ...],
  "categoryIsNew": true,
  "categoryFrequency": [{ "tier": 1, "threshold": 10, "name": "Swimming Regular I", "image": null }, ...],
  "categoryStreak": [...],
  "anyIsNew": false,
  "anyFrequency": null,
  "anyStreak": null
}
```
(`categoryFrequency`/`categoryStreak`/`anyFrequency`/`anyStreak` are `null` when that scope isn't newly triggered by this activity — nothing to edit.)

**`POST /activity/create`** *(existing, extended — admin-only)*

Request body = existing activity fields (`activityName`, `activityDescription`, `units`, `pointsPerUnit`, `category`, `activityImage`) **plus** `magnitude` (required, 3 entries with `threshold`) and the optional override arrays from `ActivityBadgeInput` (C.2) — whatever the admin edited away from what `GET /activity/badge-template` showed them, or nothing at all if they're happy with every default. Controller creates the `Activity` row, then calls `ensureActivityBadges(activity, input, transaction)`, both in one transaction — either the activity and all its badges exist, or none of them do.

### C.4 `evaluateActivityBadges`

```ts
async function evaluateActivityBadges(
  userId: number,
  activity: Activity,
  log: ActivityLog,
  transaction: Transaction,
): Promise<void>
```

Called from `awardActivityPoints`, right after the existing log-write and `User.totalXp` increment, still inside that same transaction.

1. **Magnitude**: `ActivityBadge.findAll({ where: { scope: "activity", activityId: activity.activityId, metric: "magnitude" }, transaction })`. For every row where `log.unitsLogged >= threshold`, `awardBadgeIfNotOwned(userId, row.badgeId, transaction)` — **all** newly-qualifying tiers, not just the highest, since a single big log can jump straight past tier 1 and 2 on the way to tier 3, and `awardBadgeIfNotOwned` is a safe no-op for ones already owned.
2. **Frequency**, once per scope:
   - activity: `ActivityLog.count({ where: { userId, activityId: activity.activityId }, transaction })`
   - category: `ActivityLog.count({ where: { userId }, include: [{ model: Activity, attributes: [], where: { category: activity.category } }], distinct: true, transaction })` (`distinct: true` guards against Sequelize's known count-with-include inflation gotcha)
   - any: `ActivityLog.count({ where: { userId }, transaction })`

   For each scope's count, fetch the matching `ActivityBadge` rows (`metric: "frequency"`, matching scope/activityId/category) and award every tier whose `threshold <= count`.
3. **Streak**, once per scope, using `computeCurrentStreak(userId, scope, log.date, transaction)` from §B.3 — award every `ActivityBadge` tier (`metric: "streak"`) whose `threshold <= currentStreak`.

All three sub-checks run unconditionally on every log — cheap at this app's scale (a handful of count/streak queries per log, not per user in the system), and simpler than trying to short-circuit which scopes "could possibly" have changed.

---

## D. Challenge Position badges

### D.0 A decision this section surfaced, plus a reason it's simpler than §C

**XP per position wasn't decided either** — but unlike Activity badges, `Challenge` already has fields that look purpose-built for exactly this: `podiumFirst`/`podiumSecond`/`podiumThird` (defaulting 500/300/150), currently unused anywhere except the serializer. Proposing these become each position badge's `awardXpValue`, baked in at badge-creation time from whatever the admin set for *this* challenge — rather than a separate global constant like `TIER_XP`, since a challenge's own reward size is presumably meant to vary per challenge (a big TLC-wide event vs. a small one), not follow a fixed ladder like activity tiers do. There's no equivalent field for participant, so that gets a flat constant:
```
PARTICIPANT_XP = 100   // placeholder, same status as TIER_XP was before confirmation
```

**No preview endpoint needed here**, unlike activities. `GET /activity/badge-template` existed because the client couldn't know whether a category/any-scope badge set already existed without asking the server. Challenge position badges have no such ambiguity — every challenge always gets its own fresh set of 4 (gold/silver/bronze/participant), every time, no sharing across challenges. The client can render template defaults itself with nothing more than the challenge name and the naming function below; no round-trip required before the admin edits and submits.

### D.1 Naming template

```ts
const POSITION_LABEL: Record<string, string> = {
  gold: "Champion",
  silver: "Runner-Up",
  bronze: "Third Place",
  participant: "Participant",
};

function templateChallengeBadgeName(position: string, challengeName: string): string {
  return `${challengeName} ${POSITION_LABEL[position]}`;
}
```
E.g. `templateChallengeBadgeName("gold", "Spring 5K")` → `"Spring 5K Champion"`.

Note this changes what the architecture doc originally said (gold/silver/bronze required admin input, only participant was template-defaulted) — bringing it in line with the pattern §C settled on: **every** badge gets a template default, admin overrides only what they care about, nothing beyond the challenge's own core fields is strictly required.

### D.2 `createChallengeBadges`

```ts
type BadgeOverride = { name?: string; image?: string };
interface ChallengeBadgeInput {
  gold?: BadgeOverride;
  silver?: BadgeOverride;
  bronze?: BadgeOverride;
  participant?: BadgeOverride;
}

async function createChallengeBadges(
  challenge: Challenge,
  input: ChallengeBadgeInput,
  transaction: Transaction,
): Promise<void>
```

For each of the 4 positions: create `Badge` (`badgeType: "challenge_position"`, name/image from the matching override or `templateChallengeBadgeName`, `awardXpValue` = `challenge.podiumFirst`/`podiumSecond`/`podiumThird`/`PARTICIPANT_XP` respectively) + `ChallengePositionBadge` (`badgeId`, `challengeId: challenge.challengeId`, `position`).

### D.3 Endpoint

**`POST /challenge/add`** *(existing, extended — admin-only)*: request body = existing challenge fields, plus an optional `badges: ChallengeBadgeInput` object. Controller creates the `Challenge` row, then calls `createChallengeBadges(challenge, input.badges ?? {}, transaction)`, both in the same transaction as activity creation follows in §C — either the challenge and all 4 of its badges exist, or none of them do.

### D.4 `settleChallengePositionBadges`

```ts
async function settleChallengePositionBadges(
  challengeId: number,
  transaction: Transaction,
): Promise<void>
```

**No route of its own.** Per the earlier decision, whoever eventually builds "admin ends challenge" calls this once, after flipping `challenge.status`, inside that same transaction — so a settlement can never happen without the status change landing, or vice versa.

**Not a strict top-3-by-row ranking — ranked by distinct point *value*.** If multiple participants tie for a podium spot, they all get that badge (e.g. two people tied for 1st both get gold; there is no 2nd place that year). This means ties resolve themselves by definition instead of needing a tiebreaker rule:

```ts
async function settleChallengePositionBadges(challengeId, transaction) {
  const positionRows = await ChallengePositionBadge.findAll({ where: { challengeId }, transaction });
  const badgeIdFor: Record<string, number> = {};
  for (const row of positionRows) badgeIdFor[row.position] = row.badgeId;
  // (all 4 positions expected — if one's missing, that's a data-integrity bug from
  // createChallengeBadges worth logging, not a reason to block everyone else's awards)

  const participants = await ChallengeParticipant.findAll({
    where: { challengeId, pointsAwarded: { [Op.ne]: 0 } },
    order: [["pointsAwarded", "DESC"]],
    transaction,
  });

  // distinct point values, highest first — Set preserves insertion order, and
  // participants is already sorted DESC, so this needs no extra sorting
  const [goldValue, silverValue, bronzeValue] = [...new Set(participants.map((p) => p.pointsAwarded))];

  for (const participant of participants) {
    const position =
      participant.pointsAwarded === goldValue ? "gold" :
      participant.pointsAwarded === silverValue ? "silver" :
      participant.pointsAwarded === bronzeValue ? "bronze" :
      "participant";

    await awardBadgeIfNotOwned(participant.userId, badgeIdFor[position], transaction);
  }
}
```

If fewer than 3 distinct point values exist at all (e.g. only 2 people ever submitted points, or everyone who did tied at one value), whichever podium tier(s) that leaves without a corresponding value just aren't awarded to anyone that round — not an error, just nobody reached that tier this time.

**Idempotency, as a nice side effect, not something extra to build**: since `awardBadgeIfNotOwned` is a no-op for badges a user already has, calling this function twice for the same challenge (e.g. an accidental double-trigger of "end challenge") is naturally safe — it just re-confirms the same awards rather than duplicating anything.

---

## E. Daily Quest badges

Quest-completion tracking itself is owned elsewhere (no table or endpoint for "user completed quest X" exists yet — only quest *definitions* and *daily rotation* do, in `Quest`/`DailyQuestOverride`/`questController.ts`). This section specs the 12 fixed badges, and the exact contract that other work needs to satisfy for `evaluateQuestBadges` to be able to do its job — grounded in the actual rotation logic already in the codebase, not left abstract.

### E.0 What "all_three" actually has to check against

Read `questController.ts` before writing this: the daily active quest set isn't a fixed size. `getDailyQuests(dateKey)` returns whatever `DailyQuestOverride` specifies for that date (admin can set **1 to 5** quests via `setDailyQuests`), or falls back to `pickDeterministic`, which deterministically seeds off the date string and picks up to `DAILY_QUEST_COUNT = 3` from the quest bank (fewer only if the bank itself somehow has fewer than 3, which `removeQuest` already guards against in the normal case). So "all_three" means **"completed every quest that was actually active that day,"** whatever that count happened to be — not literally always 3.

**Recommendation for whoever builds quest completion**: factor the override-or-deterministic-pick logic already in `getDailyQuests` (lines 52–64) out into a standalone exported function, e.g. `resolveDailyQuestIds(dateKey, transaction): Promise<number[]>`, so both the existing endpoint and the future completion/badge-evaluation code call the same logic instead of two copies drifting apart. Small refactor, not badge-specific, flagging it here because this is where the need for it became obvious.

### E.1 Naming template and the 12 badges

```ts
const QUEST_LABEL: Record<string, Record<string, string>> = {
  frequency: { any_one: "Quest Regular",  all_three: "Quest Perfectionist" },
  streak:    { any_one: "Quest Streak",   all_three: "Perfect Streak" },
};

function templateQuestBadgeName(metric: string, completionMode: string, tier: number): string {
  return `${QUEST_LABEL[metric][completionMode]} ${TIER_SUFFIX[tier - 1]}`;
}
```

Tiers and XP reuse the same global ladders already established for Activity badges — proposing these apply here too rather than a separate quest-specific scale, since nothing about quests suggests they need their own numbers:
```
FREQUENCY_TIERS = [10, 50, 100]   // from §C — reused here
STREAK_TIERS    = [7, 30, 100]    // from §C — reused here
TIER_XP         = [500, 1000, 2500]   // from §C — reused here
```
Flagging as an assumption, not a re-confirmed decision — say so if quests should scale differently (e.g. if daily quests are meant to be a faster, easier reward loop than activity logging, these thresholds might want to be lower).

**Seeded once, not per-quest** (12 `Badge` + `QuestBadge` rows total: 2 metrics × 2 completion modes × 3 tiers), following the same idempotent pattern `src/config/seed.ts` already uses elsewhere in this codebase (it already does `if ((await ActivityArea.count()) === 0) { ... }` for areas — same shape works here):
```ts
if ((await QuestBadge.count()) === 0) {
  for (const metric of ["frequency", "streak"] as const) {
    for (const completionMode of ["any_one", "all_three"] as const) {
      const tiers = metric === "frequency" ? FREQUENCY_TIERS : STREAK_TIERS;
      for (const [i, threshold] of tiers.entries()) {
        const tier = i + 1;
        const badge = await Badge.create({
          badgeName: templateQuestBadgeName(metric, completionMode, tier),
          badgeType: metric === "frequency" ? "quest_frequency" : "quest_streak",
          awardXpValue: TIER_XP[i],
          badgeImage: null,
        });
        await QuestBadge.create({ badgeId: badge.badgeID, metric, completionMode, tier, threshold });
      }
    }
  }
}
```

### E.2 The contract — what quest-completion tracking needs to expose

Whatever table/endpoint gets built to record "user completed quest X" needs to persist, at minimum, one row per completion event carrying `userId`, `questId`, and the calendar day it happened on (a `dateKey` string, matching the `"YYYY-MM-DD"` convention `DailyQuestOverride` already uses, keeps the two systems trivially joinable). And after writing that row, **it must call `evaluateQuestBadges(userId, dateKey, transaction)`** inside the same transaction — identical contract shape to how `awardActivityPoints` calls `evaluateActivityBadges` in §C.4.

### E.3 `evaluateQuestBadges` (internal — spec of the logic, exact queries depend on the not-yet-built completion table)

This is the exact comment block to put directly above the real function once it's implemented — written for whoever ends up building quest completion, not just as doc prose, so it travels with the code instead of staying stranded in this file:

```ts
/**
 * BADGE SYSTEM INTEGRATION — READ THIS IF YOU'RE BUILDING QUEST COMPLETION
 *
 * After you write your "user completed quest X" record — inside your own
 * DB transaction — call this once, passing that same transaction:
 *
 *     await evaluateQuestBadges(userId, dateKey, transaction);
 *
 * `dateKey` is the "YYYY-MM-DD" calendar day the completion happened on —
 * reuse DailyQuestOverride's date-key format so the two stay joinable.
 *
 * This function only READS your completion data (to check whether the user
 * just crossed a badge tier) and writes to the badge tables via
 * awardBadgeIfNotOwned — it never touches your table.
 *
 * It currently assumes your implementation can answer two questions:
 *   1. How many completions did this user record for a given dateKey?
 *   2. What are the distinct calendar days this user has any completion
 *      on? (for the streak calculation — same shape as computeCurrentStreak
 *      in docs/badge-system-spec.md §B.3, just sourced from your table
 *      instead of ActivityLog)
 * If your table ends up shaped differently than that, this function's
 * internals may need adjusting — but the CALL SITE contract above (call
 * after writing, pass userId + dateKey + transaction) shouldn't change.
 *
 * Full spec: docs/badge-system-spec.md §E.
 */
async function evaluateQuestBadges(
  userId: number,
  dateKey: string,
  transaction: Transaction,
): Promise<void>
```

1. `activeQuestIds = await resolveDailyQuestIds(dateKey, transaction)` (E.0's proposed shared function).
2. `completedToday = <count of that user's completion rows for dateKey>`.
3. **Frequency/any_one**: lifetime count of *all* completion rows for this user (every individual completion adds 1, same-day duplicates included — per the earlier clarification that any_one frequency is a raw event count, not a day count). Award every `QuestBadge` tier (`metric: "frequency", completionMode: "any_one"`) whose `threshold <= count`.
4. **Frequency/all_three**: lifetime count of *distinct days* where `completedToday >= activeQuestIds.length` was true (today's contribution: `completedToday >= activeQuestIds.length` ? include today, else don't). Award every matching tier the same way.
5. **Streak/any_one**: consecutive-day streak (§B.3's shape, sourced from the completion table's distinct days instead of `ActivityLog`) — a day counts if it has ≥1 completion row, regardless of how many.
6. **Streak/all_three**: same streak shape, but a day only counts if that day's completions covered every quest that was active that day (same condition as step 4, evaluated per historical day rather than just today).
7. Award via `awardBadgeIfNotOwned` throughout, same as every other evaluator.

Steps 5 and 6 need a streak function that reads from the (external) completion table rather than `ActivityLog` — not literally `computeCurrentStreak` as specced in §B.3 (which is hardcoded to that table), but the same distinct-days-then-walk-backward shape applied to a different source. Whoever implements this can either generalize `computeCurrentStreak` to accept an arbitrary date-list query, or write a small quest-specific twin — a decision for implementation time, not this spec.

---

## F. Specialty badges

These are the one badge type that can never be fully data-driven — "log 3 different activities in a day" and "log cycling + running + swimming in one day" are structurally different queries, not different parameter values of the same query. Adding a new Specialty badge always takes a developer, not just an admin.

### F.1 The rule registry

```ts
type SpecialtyRule = (userId: number, date: Date, transaction: Transaction) => Promise<boolean>;

const SPECIALTY_RULES: Record<string, SpecialtyRule> = {
  triple_activity_day: checkTripleActivityDay,
  iron_man: checkIronManDay,
};
```

The two examples from the original brief, written out concretely:

```ts
// 3 distinct activities (not categories) logged on the same calendar day
async function checkTripleActivityDay(userId, date, transaction): Promise<boolean> {
  const logs = await ActivityLog.findAll({
    where: { userId, date: { [Op.between]: [startOfDay(date), endOfDay(date)] } },
    transaction,
  });
  return new Set(logs.map((l) => l.activityId)).size >= 3;
}

// Cycling + Running + Swimming, all logged on the same calendar day
const IRON_MAN_CATEGORIES = ["Cycling", "Running", "Swimming"];

async function checkIronManDay(userId, date, transaction): Promise<boolean> {
  const logs = await ActivityLog.findAll({
    where: { userId, date: { [Op.between]: [startOfDay(date), endOfDay(date)] } },
    include: [{ model: Activity, attributes: ["category"] }],
    transaction,
  });
  const loggedCategories = new Set(logs.map((l) => (l as any).Activity?.category));
  return IRON_MAN_CATEGORIES.every((cat) => loggedCategories.has(cat));
}
```

**Fragility worth flagging, inherent to this badge type, not fixable by better code**: `checkIronManDay` matches on the literal strings `"Cycling"`/`"Running"`/`"Swimming"` in `Activity.category` — a free-text field an admin can type anything into (§A didn't add any enum/validation there, matching how it already worked). If an admin renames that category, or an activity's category gets typo'd, Iron Man silently stops being awardable to anyone — no error, just quietly never triggers again. There's no way to avoid this for a rule this specific; the best mitigation is naming the constant clearly (as above) so it's easy to grep for when a category gets renamed.

### F.2 `evaluateSpecialtyBadges`

```ts
async function evaluateSpecialtyBadges(
  userId: number,
  date: Date,
  transaction: Transaction,
): Promise<void> {
  const specialtyBadges = await SpecialtyBadge.findAll({ transaction });
  for (const sb of specialtyBadges) {
    const rule = SPECIALTY_RULES[sb.ruleKey];
    if (!rule) continue; // a Badge+SpecialtyBadge row exists but no matching code was ever registered — skip, don't throw
    if (await rule(userId, date, transaction)) {
      await awardBadgeIfNotOwned(userId, sb.badgeId, transaction);
    }
  }
}
```

Called from `awardActivityPoints`, the same hook point as `evaluateActivityBadges` (§C.4), passing the log's date — since logging an activity is the only event that could ever complete a Specialty badge under either example rule.

### F.3 Admin-side creation — extends `POST /badge/add`, not a new endpoint

Every other badge type gets created through its own specialized flow (`ensureActivityBadges`, `createChallengeBadges`, the one-time quest seed) — none of them touch the generic badge endpoint. Specialty badges are the one type with no natural "creation moment" to hang off of, so they're the one type actually created through the existing `POST /badge/add`, extended: when `badgeType: "specialty"`, additionally require `ruleKey` in the request body, and **validate it against `Object.keys(SPECIALTY_RULES)`** — reject with `400` if it's not a recognized key, rather than silently creating a `SpecialtyBadge` row whose rule will never run (which §F.2's evaluator would otherwise tolerate forever without complaint). Catching it at creation time turns a silent no-op into an immediate, obvious error for the admin.

---

## G. Badge management

### G.0 The cascade question — resolved: two-step confirm, backend-enforced

Worth grounding first: `UserBadge`'s FK to `badges` currently has no `onDelete` set at all, which means Postgres's default (`NO ACTION`) already blocks deleting an awarded badge today — it would just surface as a raw, ugly foreign-key-violation error instead of a clean response, since nothing in the application layer handles it.

Landed on: **cascade-delete is allowed, but only on a second, explicit confirmation** — and that confirmation is enforced by the backend, not left for every client to independently remember to build correctly. The frontend still owns the actual dialog UI ("are you sure?"), but the *data* it needs (how many people have this badge, whether confirmation is even required) and the *enforcement* (delete doesn't happen without it) both live server-side. That matters because this endpoint could someday be called from more than one client (the admin dashboard today, potentially something else later, or a direct API call) — safety logic that only exists in one frontend's dialog component doesn't protect any of the others.

**Small follow-up to the already-implemented §A model**: `UserBadge`'s `badgeID` FK needs `onDelete: "CASCADE"` added (currently unset). This doesn't make deletes happen more easily — the application code below still decides *whether* `Badge.destroy()` ever gets called — it just means that once a delete is actually allowed to proceed, the database cleans up the matching `UserBadge` rows automatically instead of the controller having to do it by hand.

### G.1 `DELETE /badge/:badgeId` *(new — admin-only, `authenticate` + `authorize("admin")`)*

```ts
export const deleteBadge = async (req: Request, res: Response, next: NextFunction) => {
  const badgeId = Number(req.params.badgeId);
  const confirm = req.query.confirm === "true";

  try {
    const awardedCount = await UserBadge.count({ where: { badgeID: badgeId } });

    if (awardedCount > 0 && !confirm) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        awardedCount,
        message: `This badge has already been awarded to ${awardedCount} user(s). Deleting it removes it from their earned badges (XP they already received is not clawed back). Call again with ?confirm=true to proceed anyway.`,
      });
    }

    const deleted = await Badge.destroy({ where: { badgeID: badgeId } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Badge not found" });
    }

    res.status(200).json({ success: true, awardedCountRemoved: awardedCount });
  } catch (err) {
    next(err);
  }
};
```

First call (no `?confirm=true`) on a badge nobody has: deletes immediately, nothing to warn about. First call on an already-awarded badge: returns `409` with the count and a message the frontend can show verbatim or build its own dialog text around — no delete happens yet. Second call with `?confirm=true`: proceeds regardless of award count.

`Badge.destroy()` cascades automatically to whichever of `ActivityBadge`/`ChallengePositionBadge`/`QuestBadge`/`SpecialtyBadge` was attached (already `onDelete: "CASCADE"` from §A) and now, with G.0's amendment, to `UserBadge` as well — one call cleans up everywhere a badge could be referenced.

**Note the XP already granted is never clawed back** — `awardBadgeIfNotOwned` (§B.2) did a one-time `User.totalXp` increment at award time; deleting the badge later removes it from the user's earned-badges list, but their XP total doesn't change. Worth surfacing in whatever "delete this badge" confirmation dialog the frontend builds, so an admin doesn't expect XP to reverse too.

### G.2 One edge case this creates, tolerated by design, not something needing extra guards

Deleting one of a challenge's 4 position badges, or one tier out of an activity's threshold ladder, leaves a gap — e.g. `settleChallengePositionBadges` (§D.4) would find only 3 `ChallengePositionBadge` rows instead of 4. That's already handled: §D.4 explicitly skips awarding a missing position rather than failing, and every frequency/streak/magnitude evaluator in §C/§E already iterates over "whatever tier rows currently exist" rather than assuming a fixed count of 3 (a deliberate choice back in the architecture doc, originally for *adding* a 4th tier cheaply — turns out it also means *removing* one doesn't break anything). No new code needed here; just worth knowing why deleting a badge mid-tier-ladder doesn't crash anything.

---

**That's the full spec — §A through §G all written.** Summary of what's confirmed vs. still placeholder/flagged, before implementation starts:

| Status | Item |
|---|---|
| ✅ Implemented & verified | §A schema (all 5 tables, associations, the `badgeId`/`badgeID` fix) |
| ✅ Confirmed | `TIER_XP = [500, 1000, 2500]`, `PARTICIPANT_XP = 100` (placeholder), `FREQUENCY_TIERS`/`STREAK_TIERS` reused for quests |
| ✅ Confirmed | `badgeImage` nullable-for-now (tracked at top of doc for pre-release revisit) |
| ✅ Confirmed | Challenge Position badges: template-default names for all 4 positions, tie-handling by distinct point value, two-step confirm on delete |
| ⏳ Not built (by design) | Quest completion tracking itself — §E is a contract for other work, with the integration comment ready to drop in |
| 🚩 Still just a placeholder | `PARTICIPANT_XP = 100` — never explicitly confirmed like the others were |
| 🚩 Still open | Whether quests should get their own tier/XP scale instead of reusing Activity's (§E.1) |

Whenever you're ready, next step is picking where to actually start implementing — §B's shared helpers are the natural first stop since every evaluator depends on them.
