# Multi-stage Docker build for Wingman App (Frontend)

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/webapp/package*.json ./packages/webapp/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source code  
COPY packages/webapp ./packages/webapp
COPY packages/shared ./packages/shared

# Build the app with production API URL
ARG VITE_API_URL=https://wingman-tunnel.fly.dev
ENV VITE_API_URL=$VITE_API_URL

# Build TypeScript for shared package
RUN npm run build --workspace=@wingman/shared

# Build the frontend app
RUN npm run build --workspace=@wingman/webapp

# Runtime stage - nginx to serve static files
FROM nginx:alpine

# Copy custom nginx config
COPY packages/webapp/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app to nginx html directory
COPY --from=builder /app/packages/webapp/dist /usr/share/nginx/html

# Copy Chrome extension from webapp public directory (already packaged there)
COPY packages/webapp/public/wingman-chrome-extension.zip /usr/share/nginx/html/wingman-chrome-extension.zip

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]