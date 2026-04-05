FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache graphviz

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["npm","run","start"]
