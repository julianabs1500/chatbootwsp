# ==========================
# Stage 1: Build
# ==========================
FROM node:20-bullseye AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript (si aplica)
RUN npm run build

# ==========================
# Stage 2: Production
# ==========================
FROM node:20-bullseye

WORKDIR /app

# Copiar solo dependencias de producción
COPY package*.json ./
RUN npm install --production

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 3008

# Comando de arranque
CMD ["node", "dist/app.js"]
