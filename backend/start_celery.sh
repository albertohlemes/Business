#!/bin/bash
# Script para iniciar Redis e Celery Worker

# Iniciar Redis se não estiver rodando
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Iniciando Redis..."
    redis-server --daemonize yes
    sleep 2
fi

# Verificar Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis rodando"
else
    echo "❌ Erro ao iniciar Redis"
    exit 1
fi

# Iniciar Celery Worker
cd /app/backend
echo "Iniciando Celery Worker..."
/root/.venv/bin/celery -A celery_config worker --loglevel=info --concurrency=4 -Q xml_processing &

echo "✅ Celery Worker iniciado em background"
echo "Para ver logs: tail -f /var/log/celery.log"
