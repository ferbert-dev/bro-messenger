# --- Stage 1: build the app ---
FROM node:18-alpine AS builder
WORKDIR /app
# copy dependency manifests and install dev+prod deps
COPY package*.json ./
RUN npm install
# copy source files and build TypeScript
COPY . .
RUN npm run build

# --- Stage 2: create a lightweight runtime image ---
FROM node:18-alpine AS runtime
WORKDIR /app
# copy only the compiled output from the builder stage
COPY --from=builder /app/dist ./dist
# copy package.json and lockfile so we can install production deps
COPY package*.json ./
RUN npm install --production
# set the port your app listens on (change if different)
EXPOSE 3000
CMD ["node", "dist/server.js"]