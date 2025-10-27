# Bro Messenger

A full-stack chat application consisting of a Node.js/Express API, WebSocket server, and vanilla JS/HTML/CSS frontend served via Nginx.

## Frameworks & Libraries


- **Express.js**: Web framework for Node.js
- **Mongoose**: MongoDB object modeling
- **Zod**: TypeScript-first schema validation
- **dotenv**: Loads environment variables
- **ts-node-dev**: TypeScript execution and hot-reloading for development
- **JSON Web Token (jsonwebtoken)**: Stateless auth tokens for HTTP & WebSocket.
- **bcryptjs**: Password hashing for user credentials.
- **ws**: WebSocket server used for real-time chat updates.
- **Jest** + **ts-jest**: Unit/integration testing in TypeScript.
- **mongodb-memory-server**: In-memory MongoDB for fast test suites.
- **nginx** (Docker): Static frontend hosting + reverse proxy for REST/WS traffic.
- **Vanilla JS + HTML/CSS frontend**: Lightweight login and chat UI consumed directly from the API.

## Getting Started

### Prerequisites

- Node.js (v22+ recommended)
- MongoDB database (local with docker or Atlas)

### Installation

1. Clone the repository:
   ```sh
   git clone git@github.com:ferbert-dev/bro-messenger.git
   cd bro-messenger
   ```

2. Install dependencies:
   ```sh
   npm ci
   ```

3. Create a `.env` file in the root directory:
   ```
   PORT=3005
   MONGO_INITDB_ROOT_USERNAME=admin
   MONGO_INITDB_ROOT_PASSWORD=admin-secret
   MONGO_INITDB_DATABASE=message-db
   NODE_ENV=development
   MONGO_URI=mongodb://admin:admin-secret@localhost:27017/message-db?authSource=admin
   JWT_SECRET=X9w!pR3u@7kLz^2hF0q7Mb6TgY8dN4cV
   EXPIRES_IN=1d
   SECURITY_WEB_ORIGINS=http://localhost:3000, http://localhost:5173, http://localhost, http://localhost:80
   SECURITY_API_ORIGINS=
   SECURITY_WS_ORIGINS=ws://localhost:3005
   SECURITY_JSON_LIMIT=12mb
   SECURITY_AVATAR_MAX_BYTES=12mb
   SECURITY_TRUST_PROXY=1

   ```
   <details>
     <summary>Optional: .env.dev for local docker compose</summary>

     When running via `docker-compose` you can keep an `.env` like the example
     above—the compose file maps the in-cluster Mongo service automatically.
   </details>

4. (Optional) Verify your JWT secret:
   ```sh
   node -e "require('jsonwebtoken').sign({ test: true }, process.env.JWT_SECRET || 'test-secret')"
   ```

### Building & Running

#### Local Node (outside Docker)

The API and WebSocket server run on the port specified in `.env` (`PORT=3005` by default) and expect MongoDB reachable via `MONGO_URI`.

```sh
npm run build   # compile TypeScript to ./dist
npm start       # runs node dist/server.js
```

For development with hot reload:

```sh
npm run dev:watch   # use your preferred watcher (e.g. ts-node-dev) if configured
```

#### Docker Compose (API + Mongo + Nginx frontend)

The repo ships with a `docker-compose.yml` that creates three services:

- `api`: the Node.js backend listening on port `3005` (internal only).
- `mongo`: replica MongoDB instance seeded with credentials from `.env`.
- `web`: Nginx serving the static frontend (`frontend/public`) and reverse proxying API/WebSocket traffic.

To spin up the full stack:

```sh
docker compose up --build
```

Key behavior:

- `web` exposes port `80` so the frontend is reachable at `http://localhost/`.
- API traffic is proxied internally to `api:3005`; the container port is not published to the host.
- Uploads are limited to 10 MB (configure via `client_max_body_size` in `nginx.conf`).

To tear down:

```sh
docker compose down
```

#### Testing

All Jest suites run against an in-memory Mongo instance:

```sh
npm test
 ```

Give tests extra time if you see Mongo binaries downloading on first run.

### Security Configuration

- `SECURITY_WEB_ORIGINS` controls which browser origins can call the API. In production set this to your HTTPS frontend domains (comma separated). Leaving it empty allows only same-origin requests.
- `SECURITY_API_ORIGINS` and `SECURITY_WS_ORIGINS` complement the Content-Security-Policy headers for REST/WebSocket calls from the browser. Supply `https://`/`wss://` URLs as needed.
- Optional CDN allow-lists: `SECURITY_SCRIPT_CDN`, `SECURITY_STYLE_CDN`, `SECURITY_IMG_CDN`.
- `SECURITY_JSON_LIMIT` caps JSON payload size (default `100kb`). Bump this (for example to `10mb`) if you send large base64 payloads.
- `SECURITY_AVATAR_MAX_BYTES` limits avatar uploads after decoding. Accepts values such as `10mb`; defaults to `2mb`.
- `SECURITY_TRUST_PROXY` mirrors Express’ [`trust proxy`](https://expressjs.com/en/guide/behind-proxies.html). Set it when you run behind Nginx/Load Balancer so rate-limiting and IP detection work (e.g. `SECURITY_TRUST_PROXY=1` or `loopback`).
- Auth routes are rate limited (`authLimiter`) to mitigate brute-force login attempts.

### Frontend & CORS

- The static frontend reads `window.API_BASE_URL`/`window.WS_BASE_URL` before it loads any modules. Set them by editing the `<meta name="api-base-url">` and `<meta name="ws-base-url">` tags in `frontend/public/login.html` and `frontend/public/chat.html`, or override them at runtime with an inline script.
- Example (local dev hitting the API on `http://localhost:3005`):
  ```html
  <meta name="api-base-url" content="http://localhost:3005/api">
  <meta name="ws-base-url" content="ws://localhost:3005/ws">
  ```
- Ensure the same origins are present in `SECURITY_WEB_ORIGINS` (and `SECURITY_WS_ORIGINS` for sockets) so the server’s CORS/CSP allow the browser requests.

## API Endpoints

### Status

- `GET /`
  - Returns a status page with a logo and message.
- `GET /health`
  - Lightweight JSON health-check used by Docker and uptime monitoring.

### Authentication

All auth endpoints are prefixed with `/api/auth`.

- `POST /api/auth/register`
  - Register a new account. Validates name, email, password (8+ chars) and optional age.
- `POST /api/auth/login`
  - Authenticate with email and password. Returns a JWT used for authenticated routes.

### Users

All user endpoints are prefixed with `/api/users`.

- `GET /api/users` *(auth required)*
  - List users (currently limited to authenticated requests).
- `GET /api/users/me` *(auth required)*
  - Fetch the profile for the currently authenticated user.
- `PUT /api/users/me` *(auth required)*
  - Update profile fields such as `name` or `age`.
- `POST /api/users/me/avatar` *(auth required)*
  - Upload or replace the current user's avatar (base64 payload).
- `GET /api/users/me/avatar` *(auth required)*
  - Download the current user's avatar image.
- `GET /api/users/:id` *(admin token required)*
  - Fetch another user by id.
- `DELETE /api/users/:id` *(admin token required)*
  - Remove a user account.

### Chats

All chat endpoints are prefixed with `/api/chats`.

- `GET /api/chats` *(auth required)*
  - List chats the current user participates in.
- `POST /api/chats` *(auth required)*
  - Create a new chat. Supports optional `participantIds` and base64 `avatarImage`.
- `GET /api/chats/:chatId` *(auth required)*
  - Retrieve metadata for a single chat.
- `GET /api/chats/:chatId/messages` *(auth required)*
  - Fetch messages for the chat.
- `POST /api/chats/:chatId/members` *(auth required, chat admin)*
  - Add a participant by user id.
- `DELETE /api/chats/:chatId/members/:userId` *(auth required, chat admin)*
  - Remove a participant.
- `POST /api/chats/:chatId/avatar` *(auth required, chat admin)*
  - Upload or replace the chat avatar image.
- `GET /api/chats/:chatId/avatar` *(auth required)*
  - Download the chat avatar image.

### WebSocket

- `GET /ws?token=<JWT>` *(auth required)*
  - Upgrades to a WebSocket connection used for real-time chat events. Supply the same JWT returned by `login`.
  - Example handshake:
    ```
    const socket = new WebSocket('wss://your-host/ws?token=JWT_HERE');
    ```
  - Example subscribe payload:
    ```json
    { "type": "subscribe", "chatId": "64fabc..." }
    ```

**Messages you may receive**

```mermaid
  sequenceDiagram
    participant Client
    participant Server
    Client->>Server: Connect (wss://.../ws?token=JWT)
    Server-->>Client: {"type":"welcome","userId":"..."}
    Client->>Server: {"type":"subscribe","chatId":"chat-1"}
    Server-->>Client: {"type":"subscribed","chatId":"chat-1"}
    Client->>Server: {"type":"subscribe","chatId":"chat-2"}
    Server-->>Client: {"type":"subscribed","chatId":"chat-2"}
    Server-->>Client: {"type":"chat:message","chatId":"chat-1",...}
    Server-->>Client: {"type":"chat:system","chatId":"chat-2",...}
    Client->>Server: {"type":"unsubscribe","chatId":"chat-1"}
    Server-->>Client: {"type":"unsubscribed","chatId":"chat-1"}
    Client->>Server: {"type":"subscribe","chatId":"chat-nonexistent"}
    Server-->>Client: {"type":"error","code":"chat:not_found","chatId":"chat-nonexistent"}
```

- `welcome`: sent immediately after a successful connection.
- `subscribed`: confirms a `subscribe` request for a chat.
- `unsubscribed`: indicates the user was removed/unsubscribed from a chat.
- `chat:message`: a user message broadcast to all subscribers.
  ```json
  {
    "type": "chat:message",
    "chatId": "64fabc...",
    "authorId": "638d...",
    "authorName": "Alice",
    "authorAvatar": "/uploads/alice.png",
    "content": "Hello world!",
    "createdAt": "2024-02-18T21:05:00.000Z"
  }
  ```
- `chat:system`: broadcast system notices (e.g., someone left the room).
- `error`: error responses (e.g., `chat:not_found`, `chat:forbidden`).

## Static Files

- Files in the `public/` directory (e.g., `logo.svg`) are served at the root URL (e.g., `/logo.svg`).

## Error Handling

- All errors return JSON with a `success: false` and a descriptive `message`.

## TODOs
- IF-01 - story to check and request a subscription to a chat
---

**Author:** IF DEV
---
**License:** ISC
