FROM node:22-alpine

WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV PORT=8788

EXPOSE 8788

CMD ["node", "server/index.js"]
