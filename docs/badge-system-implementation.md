# Badge System — Implementation Summary

What was actually built and shipped on `feature-badges`. Companion docs:
- `badge-system-plan.md` — architecture and the decisions behind it
- `badge-system-spec.md` — per-table/per-function detail (§A–§G), including the "Tracked for later" list to revisit before full release

## What this delivers

Four badge types, all awarded through one shared, idempotent write path:

| Type | Created when | Awarded when |
|---|---|---|
| **Challenge Position** (gold/silver/bronze/participant) | Admin creates a challenge — 4 badges auto-created, names/images template-defaulted, admin can override | Challenge is settled (see "pending integrations") — ties share a tier; anyone else with approved points gets Participant |
| **Activity** (frequency / magnitude / streak × activity / category / any scope) | Admin creates an activity — magnitude tiers admin-defined, the rest template-generated; category/any sets created only the first time | Student logs points via `POST /api/activity/:activityid/award-points` |
| **Daily Quest** (frequency / streak × any-one / all-of-the-day) | Seeded once at boot (12 fixed badges) | Pending — quest completion tracking is separate work; the evaluator + contract are ready |
| **Specialty** (hardcoded rules: `triple_activity_day`, `iron_man`) | Admin via `POST /api/badge/add` (rule must exist in code first) | Student logs activity points (same hook as Activity badges) |

## New files

```
src/services/badges/
  constants.ts        — global ladders: FREQUENCY_TIERS [10,50,100], STREAK_TIERS [7,30,100],
                        TIER_XP [500,1000,2500], PARTICIPANT_XP 100
  dateUtils.ts        — date-only helpers + the shared streak-walk
  awardBadge.ts       — awardBadgeIfNotOwned: THE only writer of user_badges (atomic via
                        findOrCreate + unique index; increments User.totalXp once)
  streak.ts           — computeCurrentStreak: one query + in-memory walk, nothing stored
  activityBadges.ts   — ensureActivityBadges (creation) + evaluateActivityBadges (on log)
  challengeBadges.ts  — createChallengeBadges + settleChallengePositionBadges
  questBadges.ts      — seedQuestBadges + evaluateQuestBadges (completion-data stub throws
                        until quest-completion work fills it in — integration comment on the fn)
  specialtyBadges.ts  — rule registry + evaluateSpecialtyBadges
src/services/dailyQuests.ts — resolveDailyQuests extracted from questController so the
                        badge system and GET /api/quest/daily can never disagree
src/models/{ChallengePositionBadge,ActivityBadge,QuestBadge,SpecialtyBadge}.ts
```

## Changed files

- `src/models/Badges.ts` — `badgeType` added (7-value app-level enum); `completionCriteria` removed (superseded by per-type `threshold`); `badgeImage` nullable **for now** (revisit before release)
- `src/models/UserBadge.ts` — unique index on `(userId, badgeID)` (backs the atomic award); explicit `onDelete: CASCADE`
- `src/models/associations.ts` — new badge sub-type associations; **fixed the pre-existing `badgeId`/`badgeID` casing mismatch** that would have silently broken `user.getBadges()`/`badge.getOwners()`
- `src/controllers/activityController.ts` — `createActivity` now transactional and creates the badge set (requires `magnitude: [{threshold},{threshold},{threshold}]`, accepts name/image overrides); `awardActivityPoints` evaluates activity + specialty badges in the same transaction (also removed a dead duplicate-validation block that read a wrong param name); new `getActivityBadgeTemplate`
- `src/controllers/challengeController.ts` — `createChallenge` now transactional, creates the 4 position badges, and accepts `podiumFirst/Second/Third` (previously dropped; they feed podium badge XP) plus optional `badges` overrides
- `src/controllers/badgeController.ts` — `createBadge` rewritten (was broken: never passed the NOT-NULL `awardXpValue`); now specialty-only with `ruleKey` validated against the code registry; new `deleteBadge`; removed the never-implemented `awardBadge` stub
- `src/controllers/questController.ts` — daily-quest selection moved to `services/dailyQuests.ts`, behavior identical
- `src/routes/activityRoutes.ts` — `GET /activity/badge-template`; removed a leftover DEBUG console.log
- `src/routes/badgeRoutes.ts` — `DELETE /badge/:badgeId`
- `src/config/seed.ts` — seeds the 12 quest badges (idempotent)

## Endpoint changes (frontend-facing surface)

| Endpoint | Change |
|---|---|
| `GET /api/activity/badge-template?activityName=&category=` | **New**, admin. Preview of template-default badge names/thresholds so the create-activity form can show editable fields; tells the client whether category/any badge sets are newly triggered. |
| `POST /api/activity/create` | Now **requires** `magnitude` (3 × `{threshold, name?, image?}`) and accepts override arrays for the auto-generated frequency/streak badges. |
| `POST /api/activity/:activityid/award-points` | Same request/response; badge evaluation now happens behind it. |
| `POST /api/challenge/add` | Accepts `podiumFirst/Second/Third` and optional `badges: {gold?,silver?,bronze?,participant?}` name/image overrides. |
| `POST /api/badge/add` | Specialty-only now; requires `badgeType: "specialty"`, numeric `awardXpValue`, and a registered `ruleKey` (400 otherwise). |
| `DELETE /api/badge/:badgeId` | **New**, admin. Two-step confirm: 409 + award count if already awarded, `?confirm=true` proceeds (cascade removes award rows; XP is not clawed back). |

## Verification performed (against the live server + Postgres, not just tests-in-theory)

- Activity flow: created "Lane Swimming" → all 21 badges (3 magnitude + 6 activity + 6 category + 6 any) with correct names/thresholds/XP; a 60-unit log awarded all 3 magnitude tiers at once; the 10th log awarded frequency tier 1 at all three scopes simultaneously; zero duplicate awards; XP totals matched hand-computed values exactly.
- Challenge flow: created "Spring 5K" with a gold name override + `podiumFirst: 800` → 4 position badges correct; two students registered/submitted/approved (100 vs 40 pts); settlement awarded gold and silver correctly, left bronze/participant unawarded (only two distinct point values); a second settlement run changed nothing (idempotent).
- Specialty flow: bad `ruleKey` and non-specialty `badgeType` both rejected with 400; a student logging swimming+running+cycling in one day earned `triple_activity_day` and `iron_man` exactly on the third log.
- Delete flow: 409 with count → `?confirm=true` → badge + award row + rule row all gone, user XP unchanged.
- Quest badges: 12 rows seeded exactly once across many server restarts.
- `npx tsc --noEmit` clean.

## Pending integrations (deliberately not built here)

1. **Quest completion tracking** (separate work) must implement `getQuestCompletionData` in `questBadges.ts` and call `evaluateQuestBadges(userId, dateKey, transaction)` after recording a completion — full contract in the comment on that function.
2. **"Admin ends challenge"** (doesn't exist yet) must call `settleChallengePositionBadges(challengeId, transaction)` after flipping status — comment on that function.

## Known deferred items

- `PARTICIPANT_XP = 100` was never explicitly confirmed (podium XP uses each challenge's own fields).
- Quest badges currently reuse the activity tier/XP ladders — flagged in spec §E.1 in case quests should be an easier reward loop.
- `Badge.badgeImage` nullable is dev-time only — see "Tracked for later" in the spec doc.
- `iron_man` matches `Activity.category` by literal string ("Cycling"/"Running"/"Swimming") — renaming a category silently disables it; grep `IRON_MAN_CATEGORIES` when renaming.
