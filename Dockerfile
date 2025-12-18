# Usar Node 20 slim como base
FROM node:20-slim

# Instalar ffmpeg y dependencias necesarias
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Asegurarse de que fluent-ffmpeg use el binario del sistema
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Exponer el puerto (opcional, según tu app)
EXPOSE 3000

# Comando de arranque
CMD ["node", "dist/app.js"]
