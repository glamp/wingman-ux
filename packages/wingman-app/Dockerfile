# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/wingman-app/package*.json ./packages/wingman-app/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY packages/wingman-app ./packages/wingman-app
COPY packages/shared ./packages/shared

# Build the app with production API URL
ARG VITE_API_URL=https://api.wingmanux.com
ENV VITE_API_URL=$VITE_API_URL

# Build shared package first
RUN npm run build --workspace=@wingman/shared

# Build the frontend app
RUN npm run build --workspace=@wingman/wingman-app

# Runtime stage
FROM nginx:alpine

# Copy nginx configuration
COPY packages/wingman-app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/packages/wingman-app/dist /usr/share/nginx/html

# Copy Chrome extension
COPY packages/wingman-app/public/wingman-chrome-extension.zip /usr/share/nginx/html/wingman-chrome-extension.zip

# Expose port 80 (nginx default)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]