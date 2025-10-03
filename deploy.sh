#!/bin/bash

# Script de Deploy Automático - Gestão Educa
# Resolve problemas de cache do Docker/Traefik

set -e  # Para se houver erro

echo "🚀 Iniciando deploy com cache-busting..."

# Timestamp único para cada deploy
TIMESTAMP=$(date +%s)
echo "📅 Timestamp: $TIMESTAMP"

# 1. Limpar build anterior
echo "🧹 Limpando build anterior..."
rm -rf dist/

# 2. Novo build do frontend
echo "🔨 Fazendo build do frontend..."
npm run build

# 3. Criar nova imagem Docker com timestamp único
echo "🐳 Criando nova imagem Docker..."
docker build -f Dockerfile.frontend -t gestao-educa-frontend:$TIMESTAMP .
docker tag gestao-educa-frontend:$TIMESTAMP gestao-educa-frontend:latest

# 4. Remover serviço frontend (força recriação)
echo "🔄 Removendo serviço frontend..."
docker service rm gestao-educa_gestao-educa-frontend || true
sleep 5

# 5. Deploy com nova imagem
echo "🚀 Fazendo deploy..."
docker stack deploy -c docker-stack.yml gestao-educa

# 6. Forçar atualização do backend (garante que mudanças no código sejam aplicadas)
echo "🔄 Atualizando serviço backend..."
docker service update --force gestao-educa_gestao-educa-backend

# 7. Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 20

# 8. Verificar se funcionou
echo "✅ Testando deploy..."
curl -I "https://gestao-educa.autoflixtreinamentos.com/?v=$TIMESTAMP" | head -1

echo ""
echo "🎉 Deploy concluído!"
echo "🌐 Acesse: https://gestao-educa.autoflixtreinamentos.com"
echo "💡 Use Ctrl+Shift+R para garantir que não há cache do navegador"
echo ""