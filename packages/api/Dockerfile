# Multi-stage Docker build for Wingman API Server

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for canvas
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    python3 \
    make \
    g++

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@wingman/api --workspace=@wingman/shared

# Copy source code
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Build TypeScript
RUN npm run build --workspace=@wingman/shared
RUN npm run build --workspace=@wingman/api

# Runtime stage
FROM node:20-alpine

# Install canvas dependencies for Alpine Linux
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    pangomm-dev \
    python3 \
    make \
    g++

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install with canvas support
RUN npm ci --workspace=@wingman/api --workspace=@wingman/shared --omit=dev --include=optional

# Copy built application
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Create wingman storage directories with proper permissions
RUN mkdir -p /data/.wingman/annotations /data/.wingman/sessions /data/.wingman/shares && \
    chmod -R 755 /data/.wingman

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV STORAGE_PATH=/data/.wingman
# Allow CORS from the frontend
ENV CORS_ORIGIN=https://wingmanux.com

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 8787

# Start server
CMD ["node", "packages/api/dist/index.js"]