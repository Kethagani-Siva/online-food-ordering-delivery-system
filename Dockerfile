FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev
RUN npm uninstall -g npm

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER 1000

CMD ["node", "server.js"]
