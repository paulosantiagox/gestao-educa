#!/bin/bash

# Script de teste para o sistema de tracking
# Simula ações de um usuário no site ejaeducabrasil.com

BASE_URL="https://gestao-educa.autoflixtreinamentos.com/api/tracking"
SESSION_ID="test_session_$(date +%s)"

echo "🧪 Iniciando teste do sistema de tracking..."
echo "📋 Session ID: $SESSION_ID"
echo "🌐 Base URL: $BASE_URL"
echo ""

# Função para fazer requisições com tratamento de erro
make_request() {
    local endpoint=$1
    local data=$2
    local description=$3
    
    echo "🔄 $description..."
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/$endpoint" \
        -H "Content-Type: application/json" \
        -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
        -d "$data")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Sucesso: $description"
        echo "📄 Resposta: $body"
    else
        echo "❌ Erro: $description (HTTP $http_code)"
        echo "📄 Resposta: $body"
    fi
    echo ""
}

# 1. Criar sessão
make_request "session" '{
    "session_id": "'$SESSION_ID'",
    "domain": "ejaeducabrasil.com",
    "referrer": "https://google.com/search?q=eja+educacao",
    "utm_source": "google",
    "utm_medium": "organic",
    "utm_campaign": "eja_search",
    "screen_resolution": "1920x1080"
}' "Criando nova sessão"

# 2. Registrar pageview da home
make_request "pageview" '{
    "session_id": "'$SESSION_ID'",
    "page_url": "https://ejaeducabrasil.com/",
    "page_title": "EJA Educa Brasil - Educação de Jovens e Adultos",
    "page_path": "/"
}' "Registrando pageview da home"

# 3. Simular clique no botão "Saiba Mais"
make_request "interaction" '{
    "session_id": "'$SESSION_ID'",
    "interaction_type": "click",
    "element_type": "button",
    "element_text": "Saiba Mais",
    "element_id": "btn-saiba-mais",
    "page_url": "https://ejaeducabrasil.com/",
    "x_position": 150,
    "y_position": 300
}' "Simulando clique no botão Saiba Mais"

# 4. Registrar pageview de uma página interna
make_request "pageview" '{
    "session_id": "'$SESSION_ID'",
    "page_url": "https://ejaeducabrasil.com/cursos",
    "page_title": "Cursos EJA - EJA Educa Brasil",
    "page_path": "/cursos"
}' "Registrando pageview da página de cursos"

# 5. Simular preenchimento de formulário
make_request "interaction" '{
    "session_id": "'$SESSION_ID'",
    "interaction_type": "form_submit",
    "element_type": "form",
    "element_id": "form-contato",
    "page_url": "https://ejaeducabrasil.com/cursos",
    "form_data": "{\"nome\": \"João Silva\", \"email\": \"joao@email.com\"}"
}' "Simulando envio de formulário de contato"

# 6. Registrar evento personalizado
make_request "event" '{
    "session_id": "'$SESSION_ID'",
    "event_name": "video_play",
    "event_category": "engagement",
    "event_action": "play",
    "event_label": "curso_introducao_eja",
    "event_value": 1.0,
    "page_url": "https://ejaeducabrasil.com/cursos"
}' "Registrando evento de reprodução de vídeo"

echo "🎉 Teste concluído!"
echo "📊 Verifique os logs do backend para confirmar que todos os eventos foram registrados."
echo "🔍 Session ID usado: $SESSION_ID"