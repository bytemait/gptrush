# Firstlight — one link, one treasure

An admin makes a unique link for a treasure. When someone opens that link, the browser immediately sends a claim request. The first successful claim sees the secret. Everyone after sees “Better luck next time.” No name, signup, start button, or event setup is required.

## Run with Docker

1. Install Docker and Docker Compose.
2. Copy `.env.example` to `.env`. Set strong unique `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` (at least 32 characters). Set `APP_URL` to the externally reachable HTTPS origin in production.
3. Run `docker compose up --build -d`. Open http://localhost:3000 (or your configured `APP_PORT`) and sign in.
4. Stop with `docker compose down`. Database data persists in the named `postgres_data` volume; **do not** run `docker compose down -v` unless you intend to delete all treasure links.

Tables are initialized automatically on first use. Keep `.env` private and back up the Postgres volume for production use. Terminate HTTPS at a trusted reverse proxy; set `APP_URL` to that same public origin.

## Run without Docker

Install Node 20+ and PostgreSQL 14+, create an empty database, run `npm ci`, then set `DATABASE_URL`, `APP_URL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in `.env.local` (see `.env.example`) and run `npm run dev`.

Run `DATABASE_URL=postgres://... npm run test:race` against an **isolated test database** to verify 100 simultaneous claims produce one winner.

## Claim semantics

`POST /api/treasures/:token/claim` performs `UPDATE treasure_links SET claimed_at = clock_timestamp() WHERE token = $1 AND claimed_at IS NULL RETURNING title, treasure`. PostgreSQL's row lock and predicate recheck make exactly one concurrent request receive the treasure, even across multiple application replicas. Other requests get only `{state: "claimed"}`. The public page never embeds the treasure; the dashboard list never returns it either. Responses are marked private and no-store. The first claim is the first claim processed by the database, not necessarily the first camera scan on the network.

**Important limitation:** A browser prefetch, link preview bot, security scanner, or anyone else who opens the link in a JavaScript-enabled browser can claim it. If the winner's connection drops after commit, the secret cannot be recovered without weakening the guarantee that it is revealed only once. Don't preview the link before sharing it. Preserve the winner's screen or capture the secret. For high-value prizes, use trusted participant identities, rate limiting, audit logs, and a formal redemption process. Admin login is protected by a server-side password and signed session, but production deployments should add login throttling at the reverse proxy/WAF and rotate secrets regularly. Use a managed PostgreSQL instance and configure pool sizes across replicas under the database connection limit.

**No third-party scripts** run on the public link. Browser HTTP previews that don't run JavaScript won't claim it. The claim is initiated only in the hydrated page. One-time revelation is enforced at the server/database level; it cannot prevent someone from screenshotting or sharing the treasure once revealed.
