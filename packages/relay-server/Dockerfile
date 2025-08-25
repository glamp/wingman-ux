# Multi-stage Docker build for Wingman Unified Server

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY packages/relay-server/package*.json ./packages/relay-server/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@wingman/relay-server --workspace=@wingman/shared

# Copy source code
COPY packages/relay-server ./packages/relay-server
COPY packages/shared ./packages/shared

# Build TypeScript
RUN npm run build --workspace=@wingman/shared
RUN npm run build --workspace=@wingman/relay-server

# Copy pre-built webapp dist (built locally before deployment)
COPY packages/webapp/dist ./packages/webapp/dist

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/relay-server/package*.json ./packages/relay-server/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --workspace=@wingman/relay-server --workspace=@wingman/shared --omit=dev

# Copy built application
COPY --from=builder /app/packages/relay-server/dist ./packages/relay-server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/webapp/dist ./packages/webapp/dist

# Create wingman storage directory
RUN mkdir -p /data/.wingman/annotations /data/.wingman/sessions

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV STORAGE_PATH=/data/.wingman

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 8787

# Start server
CMD ["node", "packages/relay-server/dist/index.js"]