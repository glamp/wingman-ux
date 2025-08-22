FROM node:20-alpine AS builder

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including dev for building)
RUN npm install

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./

# Create a minimal tsconfig for standalone build
RUN echo '{ \
  "compilerOptions": { \
    "strict": true, \
    "esModuleInterop": true, \
    "skipLibCheck": true, \
    "forceConsistentCasingInFileNames": true, \
    "module": "esnext", \
    "moduleResolution": "node", \
    "resolveJsonModule": true, \
    "target": "es2020", \
    "lib": ["es2020"], \
    "outDir": "./dist", \
    "rootDir": "./src", \
    "allowSyntheticDefaultImports": true, \
    "downlevelIteration": true \
  }, \
  "include": ["src/**/*"], \
  "exclude": ["node_modules", "dist"] \
}' > tsconfig.build.json

# Build the TypeScript code
RUN npx tsc --project tsconfig.build.json

# Copy static files to dist directory
RUN mkdir -p dist/static && cp -r src/static/* dist/static/

FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package.json for production dependencies
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 9876

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9876/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]