FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./

# Build the TypeScript code directly
RUN npx tsc --outDir dist --rootDir src

# Remove dev dependencies and source files after build
RUN npm prune --omit=dev && rm -rf src tsconfig.json node_modules/@types

# Expose port
EXPOSE 9876

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9876/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]