# --- Stage 1: build the app ---
FROM node:20-alpine AS builder

WORKDIR /app
# copy dependency manifests and install ALL deps (including dev)
COPY package*.json ./
RUN npm install

# copy source files and build TypeScript
COPY tsconfig.json ./
COPY src/ ./src

# Compile TypeScript
RUN npx tsc


# --- Stage 2: create a lightweight runtime image ---
FROM node:20-alpine AS runtime

WORKDIR /app

# copy only the compiled output from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# set the port your app listens on (change if different)
EXPOSE 3000

CMD ["node", "dist/server.js"]