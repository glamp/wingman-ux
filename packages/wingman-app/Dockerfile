# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/wingman-app/package*.json ./packages/wingman-app/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@wingman/wingman-app --workspace=@wingman/shared

# Copy source code
COPY packages/wingman-app ./packages/wingman-app
COPY packages/shared ./packages/shared

# Build the app with production API URL
ARG VITE_API_URL=https://wingman-tunnel.fly.dev
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=@wingman/wingman-app

# Runtime stage
FROM nginx:alpine

# Copy nginx configuration
COPY packages/wingman-app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/packages/wingman-app/dist /usr/share/nginx/html

# Expose port 8080 (Fly.io default)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]