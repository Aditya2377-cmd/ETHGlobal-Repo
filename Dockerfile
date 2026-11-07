# =================================================================
# PerPay Frontend (Root) - Production Cloud Run Container
# =================================================================
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

# -----------------------------------------------------------------
# Production Web Server (NGINX)
# -----------------------------------------------------------------
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend-design/nginx.conf /etc/nginx/conf.d/default.conf

ENV PORT=8080

CMD ["sh", "-c", "sed -i 's/listen       8080;/listen       '\"${PORT:-8080}\"';/g' /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
