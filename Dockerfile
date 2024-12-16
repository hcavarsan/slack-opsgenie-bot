FROM node:18-slim

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build


EXPOSE 8080

ENV PORT=8080

CMD [ "pnpm", "run", "start" ]
