# Multi-stage Docker build for Wingman API Server

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY packages/wingman-api/package*.json ./packages/wingman-api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@wingman/wingman-api --workspace=@wingman/shared

# Copy source code
COPY packages/wingman-api ./packages/wingman-api
COPY packages/shared ./packages/shared

# Build TypeScript
RUN npm run build --workspace=@wingman/shared
RUN npm run build --workspace=@wingman/wingman-api

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/wingman-api/package*.json ./packages/wingman-api/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --workspace=@wingman/wingman-api --workspace=@wingman/shared --omit=dev

# Copy built application
COPY --from=builder /app/packages/wingman-api/dist ./packages/wingman-api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Create wingman storage directory
RUN mkdir -p /data/.wingman/annotations /data/.wingman/sessions

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV STORAGE_PATH=/data/.wingman
# Allow CORS from the frontend
ENV CORS_ORIGIN=https://wingman-app.fly.dev

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 8787

# Start server
CMD ["node", "packages/wingman-api/dist/index.js"]