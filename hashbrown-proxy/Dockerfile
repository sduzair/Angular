FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

RUN npm install --global pnpm@10.25.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json app.js ./
COPY --chown=node:node bin ./bin

USER node

EXPOSE 3000

# Supply OPENAI_API_KEY through the container environment.
CMD ["node", "./bin/www"]
