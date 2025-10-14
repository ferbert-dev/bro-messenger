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
4. You can test your JWT secret for testing
### Running the Server
Notes: It is requered to have a docker insatlled!
Start the development server and create docker contaiener with DB :

```sh
npm dev
```

Start the development server only :
```sh
npm start
```
The server will run on the port specified in `.env` (default: 3000).

## API Endpoints

### Status

- `GET /`
  - Returns a status page with a logo and message.

### Users

All user endpoints are prefixed with `/api/users`.

- `GET /api/users`
  - Get all users.

- `POST /api/users`
  - Create a new user.
  - **Body:**  
    ```json
    {
      "name": "string",
      "email": "string",
      "age": 18
    }
    ```

- `GET /api/users/:id`
  - Get a user by ID.

- `PUT /api/users/:id`
  - Update a user by ID.
  - **Body:** Partial or full user object.

- `DELETE /api/users/:id`
  - Delete a user by ID.

## Static Files

- Files in the `public/` directory (e.g., `logo.svg`) are served at the root URL (e.g., `/logo.svg`).

## Error Handling

- All errors return JSON with a `success: false` and a descriptive `message`.

---

**Author:** IF DEV
---
**License:** ISC
