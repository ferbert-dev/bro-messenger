# Bro Messager Frontend

Static HTML, CSS, and vanilla JS client that talks to the Express API for
authentication, chat, and avatar uploads. The stack assumes Nginx serves these
files from Docker, but you can load them locally with any static server.

## Pages and Features
- `login.html` posts credentials to `/api/auth/login` and `/api/auth/register`,
  then stores `authToken` and `user` in `localStorage`.
- `dashboard.html` reads the stored session data, shows profile details, and
  redirects to the login page if anything is missing.
- `chat.html` interacts with the REST and WebSocket services using
  `frontend/js/chat.fetch.js` plus `frontend/js/ws.handlers.js` to keep the
  conversation list and messages in sync.

## Project Layout
```
frontend/
  public/              # HTML entry points + static assets
    assets/
    chat.html
    dashboard.html
    login.html
  css/                 # Base styles and page-specific themes
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
