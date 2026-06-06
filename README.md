# Lancer Fit Backend (Boilerplate)

This is a minimal Node + Express + TypeScript boilerplate configured to connect to a PostgreSQL database using TypeORM.

Quick start:

1. Copy `.env.example` to `.env` and update values.
2. Install deps:

```bash
npm install
```

3. Run in development:

```bash
npm run dev
```

4. Build and run:

```bash
npm run build
npm start
```

Endpoints:
- `GET /api/users` - list users
- `GET /api/users/:id` - get user
- `POST /api/users` - create user (json { name, email })
- `DELETE /api/users/:id` - delete user
