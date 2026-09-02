# =====================================================================
# Multi-stage Dockerfile for Campaign Creator Hub
# Stage 1: Build the Vite/React app
# Stage 2: Serve static files with Nginx
# =====================================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build args for Vite env variables (injected at build time)
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_N8N_WEBHOOK_CREATE
ARG VITE_N8N_WEBHOOK_EDIT
ARG VITE_N8N_WEBHOOK_DELETE
ARG VITE_N8N_WEBHOOK_BULK
ARG VITE_N8N_WEBHOOK_LIST_DRIVE
ARG VITE_N8N_WEBHOOK_CREATE_AD
ARG VITE_N8N_WEBHOOK_CREATE_ADSET
ARG VITE_N8N_WEBHOOK_VALIDATE_ADVERTISER

# Build the production bundle
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
