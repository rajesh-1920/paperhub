# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the application (compiled CSS ships in public/, so no build step needed).
COPY server ./server
COPY public ./public

EXPOSE 8000
CMD ["node", "server/index.js"]
