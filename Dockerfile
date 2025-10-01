# Dockerfile para o backend do sistema-educa
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências do frontend
RUN npm install

# Instalar dependências do backend primeiro
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Voltar para o diretório raiz e copiar código fonte
WORKDIR /app
COPY . .

# Voltar para o diretório raiz
WORKDIR /app

# Expor porta
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "backend/index.js"]