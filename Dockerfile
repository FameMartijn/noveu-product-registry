# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN npm prune --production --legacy-peer-deps

# Production Stage
FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /var/cache/noveu-artifacts && chown -R node:node /var/cache/noveu-artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 4013

USER node

CMD ["npm", "run", "start:prod"]
