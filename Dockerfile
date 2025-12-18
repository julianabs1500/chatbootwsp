FROM node:20-bullseye AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bullseye
WORKDIR /app

# Instalar ffmpeg completo
RUN apt-get update && apt-get install -y ffmpeg libx264-dev libx265-dev libmp3lame-dev && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist

ENV FFMPEG_PATH=/usr/bin/ffmpeg
CMD ["node", "dist/app.js"]
