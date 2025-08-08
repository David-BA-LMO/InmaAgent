# EN DESARROLLO

# Etapa 1: build con producción
FROM node:18 AS builder

WORKDIR /app
COPY . .
RUN npm install

ENV NODE_ENV=production
RUN npm run build

# Etapa 2: servir con nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]