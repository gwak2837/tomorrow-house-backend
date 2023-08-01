# Install all packages and transpile TypeScript into JavaScript
FROM node:18 AS builder

WORKDIR /app

COPY . .
RUN npm i
RUN npm run build

# Copy bundle only
FROM node:18 AS runner

EXPOSE $PORT

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/out/index.cjs ./

ENTRYPOINT ["node", "index.cjs"]
