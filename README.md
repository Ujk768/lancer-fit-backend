# API Routes Documentation

## Auth Routes (`/api/auth`)

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|--------------|
| POST | `/api/auth/register` | `validate(signupSchema)` | `registerUser` | Register a new user account |
| POST | `/api/auth/login` | `validate(loginSchema)` | `loginUser` | Log in an existing user |

---

## User Routes (`/api/user`)

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|--------------|
| GET | `/api/user/all` | — | `getAllUsers` | Fetch all users |

> ⚠️ No `authenticate`/`authorize` middleware on this route — currently public. Worth double-checking if that's intentional, since exposing all user data without auth is a common oversight.

---

## Badge Routes (`/api/badge`)

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|--------------|
| GET | `/api/badge/all` | — | `getAllBadges` | Fetch all badges (public) |
| POST | `/api/badge/add` | `authenticate`, `authorize('admin')` | `createBadge` | Create a new badge (admin only) |

---

## Challenge Routes (`/api/challenge`)

### Personal Challenges

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|--------------|
| GET | `/api/challenge/personal/me` | `authenticate` | `getUserPersonalChallenges` | Get all personal challenges for the logged-in user |
| POST | `/api/challenge/personal` | `authenticate` | `createPersonalChallenge` | Create a new personal challenge |
| PATCH | `/api/challenge/personal/:challengeId/complete` | `authenticate` | `completePersonalChallenge` | Mark a personal challenge complete and set final points |
| POST | `/api/challenge/personal/:challengeId/points` | `authenticate` | `addPersonalChallengePoints` | Incrementally add points to an existing personal challenge |

**Note:** `/personal/me` is defined before `/personal/:challengeId/...` routes so Express doesn't mistake `"me"` for a dynamic `challengeId` param.

### TLC (Team/Leaderboard Challenges)

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|--------------|
| GET | `/api/challenge/tlc/me` | `authenticate` | `getUserTLCChallenges` | Get all TLC challenges the current user is active in |
| POST | `/api/challenge/tlc/:challengeId/register` | `authenticate` | `registerForTLC` | Register the current user into a TLC challenge |
| GET | `/api/challenge/tlc/:challengeId/leaderboard` | `authenticate` | `getTLCLeaderboard` | View the ranked points leaderboard for a challenge |
| GET | `/api/challenge/tlc/:challengeId/participants` | `authenticate`, `authorize('admin')` | `getTLCParticipants` | Admin-only: view full roster of participants |
| PATCH | `/api/challenge/tlc/:challengeId/points` | `authenticate`, `authorize('admin')` | `awardTLCPoints` | Admin-only: award points to a target user |

**Note:** `/tlc/me` is defined before `/tlc/:challengeId/...` routes for the same reason — avoids `"me"` being parsed as a `challengeId`.

---

## Middleware Reference

- **`authenticate`** — Verifies the request includes a valid logged-in user (e.g. JWT/session check).
- **`authorize('admin')`** — Requires the authenticated user to have the `admin` role.
- **`validate(schema)`** — Validates the request body against a Zod/Joi-style schema (`loginSchema`, `signupSchema`) before reaching the controller.

---

## Mounting (assumed)

Based on the import paths and route prefixes used above, these routers are likely mounted in your main app file like:

```ts
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/badge', badgeRouter);
app.use('/api/challenge', challengeRouter);
```

If your actual mount points differ, update the prefixes in this doc accordingly.