# Stage 1: Build production assets
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build application
COPY . .
RUN npm run build

# Stage 2: Lightweight runtime environment
FROM node:20-alpine AS runtime
WORKDIR /app

# Install static file server (serve)
RUN npm install -g serve

# Create non-root system user for container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built production assets from build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json

# Create database and storage directory for MySQL data persistence
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data /app/dist

USER appuser

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
