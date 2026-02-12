"""
Configuração do Celery para processamento de XMLs em background
"""
from celery import Celery
import os

# Configuração do Redis
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Criar app Celery
celery_app = Celery(
    'xml_processor',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['celery_tasks']
)

# Configurações do Celery
celery_app.conf.update(
    # Serialização
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='America/Sao_Paulo',
    enable_utc=True,
    
    # Tarefas
    task_track_started=True,
    task_time_limit=3600,  # 1 hora max por tarefa
    task_soft_time_limit=3000,  # 50 min soft limit
    
    # Workers
    worker_prefetch_multiplier=1,  # Processar 1 tarefa por vez
    worker_concurrency=4,  # 4 workers paralelos
    
    # Resultados
    result_expires=86400,  # Resultados expiram em 24h
    
    # Retry
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

# Configurar rotas de tarefas (opcional)
celery_app.conf.task_routes = {
    'celery_tasks.process_xml_batch': {'queue': 'xml_processing'},
    'celery_tasks.process_single_xml': {'queue': 'xml_processing'},
}
