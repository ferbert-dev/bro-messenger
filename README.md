# bro-messager-api

A RESTful API for managing users, built with **Express.js**, **Mongoose**, and **Zod** for schema validation.

## Frameworks & Libraries

- **Express.js**: Web framework for Node.js
- **Mongoose**: MongoDB object modeling
- **Zod**: TypeScript-first schema validation
- **dotenv**: Loads environment variables
- **ts-node-dev**: TypeScript execution and hot-reloading for development

## Getting Started

### Prerequisites

- Node.js (v22+ recommended)
- MongoDB database (local with docker or Atlas)

### Installation

1. Clone the repository:
   ```sh
   git@github.com:ferbert-dev/bro-messager-api.git
   cd bro-messager-api
   ```

2. Install dependencies:
   ```sh
   npm install
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

---

**Author:** IF DEV
---
**License:** ISC
