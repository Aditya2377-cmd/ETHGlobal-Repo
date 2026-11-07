# =================================================================
# PerPay Frontend - Production Cloud Run Container
# =================================================================
FROM node:22-slim AS builder

WORKDIR /app

COPY frontend-design/package*.json ./
RUN npm install

COPY frontend-design/ ./
RUN npm run build

# -----------------------------------------------------------------
# Production Web Server (NGINX)
# -----------------------------------------------------------------
FROM nginx:alpine

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY frontend-design/nginx.conf /etc/nginx/conf.d/default.conf

# Support dynamic Cloud Run $PORT environment variable
ENV PORT=8080

CMD ["sh", "-c", "sed -i 's/listen       8080;/listen       '\"${PORT:-8080}\"';/g' /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
