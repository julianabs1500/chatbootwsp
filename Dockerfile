# ==========================
# Stage 1: Build
# ==========================
FROM node:20-slim AS builder

# Directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para build)
RUN npm install

# Copiar todo el código fuente
COPY . .

# Compilar TypeScript y bundle con Rollup
RUN npm run build

# ==========================
# Stage 2: Production
# ==========================
FROM node:20-slim

WORKDIR /app

# Instalar ffmpeg en producción
RUN apt-get update && apt-get install -y ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --production

# Copiar código compilado desde la etapa de build
COPY --from=builder /app/dist ./dist

# Configurar variable de entorno para fluent-ffmpeg
ENV FFMPEG_PATH=/usr/bin/ffmpeg


# Comando para iniciar la app
CMD ["node", "dist/app.js"]
