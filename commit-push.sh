#!/bin/bash

# Script para commit e push automático para GitHub
# Uso: ./commit-push.sh "mensagem do commit"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando processo de commit e push para GitHub...${NC}"
echo ""

# 1. Verificar se foi passada uma mensagem de commit
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: Mensagem de commit é obrigatória!${NC}"
    echo -e "${YELLOW}💡 Uso: ./commit-push.sh \"sua mensagem de commit\"${NC}"
    exit 1
fi

COMMIT_MESSAGE="$1"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}📝 Mensagem do commit: ${YELLOW}$COMMIT_MESSAGE${NC}"
echo ""

# 2. Verificar status do git
echo -e "${BLUE}🔍 Verificando status do repositório...${NC}"
git status --porcelain > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro: Este não é um repositório Git válido!${NC}"
    exit 1
fi

# Verificar se há mudanças
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Nenhuma mudança detectada para commit.${NC}"
    echo -e "${BLUE}ℹ️  Verificando se há commits para push...${NC}"
    
    # Verificar se há commits não enviados
    UNPUSHED=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l)
    if [ "$UNPUSHED" -eq 0 ]; then
        echo -e "${GREEN}✅ Repositório já está sincronizado com o GitHub!${NC}"
        exit 0
    else
        echo -e "${YELLOW}📤 Há $UNPUSHED commit(s) para enviar...${NC}"
        # Pular para o push
        git push origin main
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Push realizado com sucesso!${NC}"
            # Criar e enviar tag baseada na versão do package.json
            echo -e "${BLUE}🏷️ Gerando tag de versão baseada no package.json...${NC}"
            VERSION=$(grep -m1 '"version"' package.json | sed -E 's/.*"version": *"([^"]+)".*/\1/')
            if [ -n "$VERSION" ]; then
                TAG="v$VERSION"
                if git rev-parse "$TAG" >/dev/null 2>&1; then
                    echo -e "${YELLOW}🔖 Tag ${TAG} já existe, pulando criação.${NC}"
                else
                    git tag -a "$TAG" -m "Release ${TAG} - ${COMMIT_MESSAGE}"
                    if [ $? -eq 0 ]; then
                        git push origin "$TAG"
                        echo -e "${GREEN}✅ Tag ${TAG} criada e enviada com sucesso!${NC}"
                    else
                        echo -e "${YELLOW}⚠️  Não foi possível criar/enviar a tag ${TAG}.${NC}"
                    fi
                fi
            else
                echo -e "${YELLOW}⚠️  Não foi possível obter versão do package.json.${NC}"
            fi
        else
            echo -e "${RED}❌ Erro no push!${NC}"
            exit 1
        fi
        exit 0
    fi
fi

# 3. Mostrar arquivos que serão commitados
echo -e "${BLUE}📋 Arquivos modificados:${NC}"
git status --short

echo ""
read -p "$(echo -e ${YELLOW}Continuar com o commit? [Y/n]: ${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}❌ Operação cancelada pelo usuário.${NC}"
    exit 0
fi

# 4. Adicionar todos os arquivos
echo -e "${BLUE}📦 Adicionando arquivos ao staging area...${NC}"
git add .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao adicionar arquivos!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivos adicionados com sucesso!${NC}"

# 5. Fazer commit
echo -e "${BLUE}💾 Fazendo commit...${NC}"
git commit -m "$COMMIT_MESSAGE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no commit!${NC}"
    exit 1
fi

COMMIT_HASH=$(git rev-parse --short HEAD)
echo -e "${GREEN}✅ Commit realizado com sucesso! Hash: $COMMIT_HASH${NC}"

# 6. Push para GitHub
echo -e "${BLUE}🌐 Enviando para GitHub...${NC}"
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no push para GitHub!${NC}"
    echo -e "${YELLOW}💡 Verifique sua conexão e credenciais do Git.${NC}"
    exit 1
fi

# 6.1 Criar e enviar tag da versão (package.json)
echo -e "${BLUE}🏷️ Gerando tag de versão baseada no package.json...${NC}"
VERSION=$(grep -m1 '"version"' package.json | sed -E 's/.*"version": *"([^"]+)".*/\1/')
if [ -n "$VERSION" ]; then
    TAG="v$VERSION"
    if git rev-parse "$TAG" >/dev/null 2>&1; then
        echo -e "${YELLOW}🔖 Tag ${TAG} já existe, pulando criação.${NC}"
    else
        git tag -a "$TAG" -m "Release ${TAG} - ${COMMIT_MESSAGE}"
        if [ $? -eq 0 ]; then
            git push origin "$TAG"
            echo -e "${GREEN}✅ Tag ${TAG} criada e enviada com sucesso!${NC}"
        else
            echo -e "${YELLOW}⚠️  Não foi possível criar/enviar a tag ${TAG}.${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Não foi possível obter versão do package.json.${NC}"
fi

# 7. Verificar se o push foi bem-sucedido
echo -e "${BLUE}🔍 Verificando sincronização...${NC}"
git fetch origin main --quiet
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main)

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    echo -e "${GREEN}✅ Repositório sincronizado com sucesso!${NC}"
else
    echo -e "${YELLOW}⚠️  Atenção: Pode haver diferenças entre local e remoto.${NC}"
fi

# 8. Resumo final
echo ""
echo -e "${GREEN}🎉 Processo concluído com sucesso!${NC}"
echo -e "${BLUE}📊 Resumo:${NC}"
echo -e "   • Commit: ${YELLOW}$COMMIT_HASH${NC}"
echo -e "   • Mensagem: ${YELLOW}$COMMIT_MESSAGE${NC}"
echo -e "   • Timestamp: ${YELLOW}$TIMESTAMP${NC}"
echo -e "   • Branch: ${YELLOW}main${NC}"
echo ""
echo -e "${BLUE}🔗 Verifique no GitHub: ${YELLOW}https://github.com/seu-usuario/gestao-educa${NC}"
echo ""