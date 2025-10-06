#!/bin/bash

echo "🔍 Monitorando logs do backend em tempo real..."
echo "📊 Logs de tracking aparecerão aqui quando houver atividade no site"
echo "🛑 Pressione Ctrl+C para parar"
echo ""

# Monitorar logs do serviço backend
docker service logs -f gestao-educa_gestao-educa-backend --tail 50 | grep -E "\[TRACKING\]|Error|error"