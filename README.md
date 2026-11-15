
# Strawberry Outbreak - Last Survivor

A 2D survival shooting game built for the
CIS046-3 Software for Enterprise assignment.

## Game Rules

- The player starts with one life.
- There are three survival stages.
- Losing a life opens a Banana API puzzle.
- A correct answer restores one life.
- A maximum of three revivals is allowed per run.
- The fourth death ends the game.

## Controls

- Move: WASD / arrow keys, or drag on the game area (touch screens)
- Shoot: automatic at the nearest enemy; aim and hold the mouse to fire faster at the cursor
- Dash: Space / Shift / Dash button (short invulnerability, 1.2s cooldown)
- Pause: P / Esc / Pause button (auto-pauses when the window loses focus)
- Sound: M / Sound button
- Defeated enemies can drop power-ups: rapid fire, speed boost and shield

## Database

Game data is stored in SQLite using Node's built-in `node:sqlite` module (Node.js 22.13 or newer, no extra package needed).
The file is `data/strawberry.db` (override with `DB_FILE` or `DATA_DIR`).

| Table | Contents |
|---|---|
| `users` | Player accounts (username is unique, case-insensitive; passwords stored as bcrypt hashes) |
| `runs` | Every game run: stage, status, revivals used, pending puzzle, score |
| `rescue_attempts` | Every Banana puzzle answer: question, correct solution, player's answer, correct or not |
| `scores` | Leaderboard entries for won runs |
| `sessions` | Login sessions (so players stay logged in across server restarts; expired rows are pruned automatically) |
| `settings` | The generated session-signing secret, used when `SESSION_SECRET` is not set |

Existing `data/*.json` files from the earlier version are imported automatically the first time the server starts.
Node prints an `ExperimentalWarning` for SQLite; it is harmless.

## HTTPS

The server runs on HTTPS only and the session cookie (`__Host-sid`) is `Secure`, `HttpOnly` and `SameSite=Lax`.

```bash
npm install
npm run cert   # one-time: self-signed localhost certificate in certs/ (needs OpenSSL, included with Git for Windows)
npm start      # https://localhost:3443  (http://localhost:3000 redirects to it)
```

Your browser will warn about the self-signed certificate once; accept it for localhost.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3443` | HTTPS port |
| `HTTP_PORT` | `3000` | Plain HTTP port that only redirects to HTTPS (`0` disables it) |
| `TLS_KEY_FILE` / `TLS_CERT_FILE` | `certs/key.pem` / `certs/cert.pem` | Certificate to use (e.g. a real one in production) |
| `TRUST_PROXY` | unset | Set (e.g. `1`) when an HTTPS reverse proxy terminates TLS; the server then listens on plain HTTP on `PORT` |
| `SESSION_SECRET` | generated, stored in SQLite | Secret used to sign session cookies |

## Technology

- HTML5 Canvas
- CSS
- JavaScript
- Node.js
- SQLite (node:sqlite)
- Express
- Banana Game API

## Development

This project is developed incrementally
using Git and GitHub.
