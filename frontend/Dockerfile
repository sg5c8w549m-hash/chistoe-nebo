# ===== BUILD STAGE =====
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ===== NGINX STAGE =====
FROM nginx:alpine

# SPA nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# static files
COPY --from=build /app/dist /usr/share/nginx/html
