# Bro Messager Frontend

Static HTML, CSS, and vanilla JS client that talks to the Express API for
authentication, chat, and avatar uploads. The stack assumes Nginx serves these
files from Docker, but you can load them locally with any static server. API
URLs and WebSocket endpoints are resolved dynamically from the current host so
the UI works both on localhost and across your LAN.

## Key Features
- **Auth flow**: `login.html` posts to `/api/auth/login` and `/api/auth/register`
  and stores the resulting token + user object in `localStorage`. `dashboard.html`
  displays the stored profile and guards access when data is missing.
- **Realtime chat**: `chat.html` consumes REST endpoints and WebSocket updates
  to load history, send messages, and stream new activity in real time.
- **Responsive UI**: Below 980px the layout switches to a mobile view that shows
  the chats list and conversation screen as separate panels, adds a back button,
  and keeps the composer visible while auto-scrolling to the latest messages.
- **Media & emoji**: Users can upload avatars (with client-side compression and
  scaling), pick emoji via the built-in emoji picker, and preview chat images
  before saving.
- **Presence indicators**: When other participants join a chat the list and
  message avatars gain a green halo and the chat header updates with live
  presence counts.
- **Profile modal**: Centered avatar, enlarged headings, quick access to update
  name/avatar, and an easy-to-spot logout button.

## Project Layout
```
frontend/
  public/              # HTML entry points + static assets
    assets/
    chat.html
    login.html
  js/                  # Auth logic, chat fetch helpers, websocket utilities
  uploads/             # Sample avatars served from /uploads in Docker
```

## Running with Docker Compose
The root `docker-compose.yml` mounts `frontend/` at `/var/www/frontend` and the
provided `nginx.conf` points Nginx at `public/`. Recreate the containers after
editing either file so the new config is picked up:

```bash
docker compose up --build
```

## Local Development Without Docker
Launch any static server from the repository root and visit
`http://localhost:PORT/login.html`. Example:

```bash
npx serve frontend/public
```

Ensure the API runs on `http://localhost:3000` (default in `frontend/js/app.js`)
so the forms and chat REST calls succeed.

> Tip: When opening the frontend from another device on your network, browse to
> `http://<host-ip>/` and make sure port `3000` on the host is reachable for the
> API/WebSocket traffic.
