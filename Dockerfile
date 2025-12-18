# ==========================
# Stage 1: Build
# ==========================
FROM node:20-bullseye AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (dev + prod)
RUN npm install

# Copiar todo el código fuente
COPY . .

# Compilar TypeScript y bundle con Rollup
RUN npm run build

# ==========================
# Stage 2: Production
# ==========================
FROM node:20-bullseye

WORKDIR /app

# Instalar ffmpeg nativo y librerías necesarias
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libx264-dev \
    libx265-dev \
    libmp3lame-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar solo dependencias de producción
COPY package*.json ./
RUN npm install --production

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Variable de entorno para fluent-ffmpeg
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Exponer puerto
EXPOSE 3008

# Comando de arranque
CMD ["node", "dist/app.js"]
