FROM node:18-alpine AS base

WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY tsconfig.json ./
COPY .env.example ./
COPY src ./src
COPY src/migrations ./src/migrations
COPY init.sql ./

RUN npm install


RUN npm run build

EXPOSE 3000

CMD ["node", "dist/api/index.js"]
