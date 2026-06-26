# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Where the JSON-file store keeps its mutable state. Pointing these at /data (a
# volume owned by the non-root "node" user) lets the container persist data while
# the rest of /app stays read-only. When MONGODB_URI is set these are ignored and
# everything lives in MongoDB/GridFS instead.
ENV PAPERHUB_DB_FILE=/data/paperhub-backend.json
ENV PAPERHUB_UPLOAD_DIR=/data/uploads

# Install production dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the application (compiled CSS ships in public/, so no build step needed).
COPY server ./server
COPY public ./public

# Writable, persistent data dir owned by the unprivileged runtime user.
RUN mkdir -p /data && chown -R node:node /data
VOLUME /data
USER node

EXPOSE 8000

# Liveness probe — uses Node's built-in fetch (no extra tooling in the image).
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server/index.js"]
