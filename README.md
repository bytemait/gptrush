# gptrush — one link, one treasure

An admin makes a unique link for a treasure. When someone opens that link, the browser immediately sends a claim request. The first successful claim sees the secret. Everyone after sees “Better luck next time.” No name, signup, start button, or event setup is required.

## Run with Docker

1. Install Docker and Docker Compose.
2. Copy `.env.example` to `.env`. Set strong unique `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` (at least 32 characters). Set `APP_URL` to the externally reachable HTTPS origin in production.
3. Run `docker compose up --build -d`. Open http://localhost:3000 (or your configured `APP_PORT`) and sign in.
4. Stop with `docker compose down`. Database data persists in the named `postgres_data` volume; **do not** run `docker compose down -v` unless you intend to delete all treasure links.

Tables are initialized automatically on first use. Keep `.env` private and back up the Postgres volume for production use. Terminate HTTPS at a trusted reverse proxy; set `APP_URL` to that same public origin. Existing deployments should keep their current `POSTGRES_USER` and `POSTGRES_DB` values in `.env` when upgrading, or the app will connect to a different database. The renamed admin cookie requires signing in again.

## Run without Docker

Install Node 20+ and PostgreSQL 14+, create an empty database, run `npm ci`, then set `DATABASE_URL`, `APP_URL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in `.env.local` (see `.env.example`) and run `npm run dev`.

Run `DATABASE_URL=postgres://... npm run test:race` against an **isolated test database** to verify 100 simultaneous claims produce one winner.

## Claim semantics

`POST /api/treasures/:token/claim` atomically sets `claimed_at` and a hash of a fresh winner-only key. PostgreSQL's row lock and predicate recheck make exactly one concurrent request receive the treasure and that key, even across application replicas. Later requests get only `{state: "claimed"}`. The winner can optionally submit their name to `POST /api/treasures/:token/winner`; only the claim's private key hash can authorize this write, and a link accepts one winner name. The admin view polls for names and shows a pending label until submitted. A losing claim queries PostgreSQL's clock after its serialized claim attempt and receives the nonnegative difference from the winner's `claimed_at`; this is the gap between server-side claim processing times, not a claim about device clocks or exact scan timing. The public page never embeds the secret; admin link listings never return it. The winner screen includes a copy control for the treasure.

**Important limitation:** A browser prefetch, link preview bot, security scanner, or anyone else who opens the link in a JavaScript-enabled browser can claim it. If the winner's connection drops after commit, the secret cannot be recovered without weakening the guarantee that it is revealed only once. Don't preview the link before sharing it. Preserve the winner's screen or capture the secret. For high-value prizes, use trusted participant identities, rate limiting, audit logs, and a formal redemption process. Admin login is protected by a server-side password and signed session, but production deployments should add login throttling at the reverse proxy/WAF and rotate secrets regularly. Use a managed PostgreSQL instance and configure pool sizes across replicas under the database connection limit.

**No third-party scripts** run on the public link. Browser HTTP previews that don't run JavaScript won't claim it. The claim is initiated only in the hydrated page. One-time revelation is enforced at the server/database level; it cannot prevent someone from screenshotting or sharing the treasure once revealed.
