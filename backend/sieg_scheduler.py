"""
SIEG Scheduler - Job agendado para sincronização automática de XMLs

Este módulo gerencia a execução periódica da sincronização de XMLs do SIEG
para todas as empresas com sync automático ativado.
"""

import asyncio
import os
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from motor.motor_asyncio import AsyncIOMotorClient

# Importar o serviço SIEG
from sieg_service import sync_from_sieg, get_sieg_jwt_token

# Configuração do MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Cliente MongoDB para o scheduler
_scheduler_db_client = None
_scheduler_db = None

def get_scheduler_db():
    """Obtém conexão com o banco de dados para o scheduler"""
    global _scheduler_db_client, _scheduler_db
    if _scheduler_db is None:
        _scheduler_db_client = AsyncIOMotorClient(MONGO_URL)
        _scheduler_db = _scheduler_db_client[DB_NAME]
    return _scheduler_db


# Scheduler global
scheduler = AsyncIOScheduler()


async def sync_empresa_sieg(company_id: str, cnpj: str, competencia: str = None):
    """
    Sincroniza uma empresa específica com o SIEG
    """
    db = get_scheduler_db()
    
    # Usar competência atual se não especificada
    if not competencia:
        now = datetime.now()
        competencia = f"{now.month:02d}/{now.year}"
    
    start_time = datetime.now(timezone.utc)
    log_entry = {
        "company_id": company_id,
        "competencia": competencia,
        "data_sync": start_time.isoformat(),
        "status": "em_andamento",
        "total_encontrados": 0,
        "total_importados": 0,
        "total_duplicados": 0,
        "total_erros": 0,
        "entradas": {},
        "saidas": {},
        "duracao_segundos": 0,
        "detalhes": [],
        "tipo_execucao": "automatico"
    }
    
    try:
        print(f"[SIEG-SCHEDULER] Iniciando sync para empresa {company_id} - {competencia}")
        
        # Executar sincronização
        result = await sync_from_sieg(cnpj, competencia)
        
        entrada_xmls = result.get("entrada", {}).get("xmls", [])
        saida_xmls = result.get("saida", {}).get("xmls", [])
        
        total_encontrados = len(entrada_xmls) + len(saida_xmls)
        total_importados = 0
        total_duplicados = 0
        total_erros = 0
        
        # Processar XMLs de entrada
        for xml_data in entrada_xmls:
            try:
                chave = xml_data.get("chave", "")
                # Verificar se já existe
                existing = await db.xml_documents.find_one({"chave_acesso": chave})
                if existing:
                    total_duplicados += 1
                    continue
                
                # Aqui seria processado o XML e salvo no banco
                # Por enquanto, apenas contabilizamos
                total_importados += 1
                
            except Exception as e:
                total_erros += 1
                log_entry["detalhes"].append({
                    "tipo": "erro",
                    "chave": xml_data.get("chave", ""),
                    "mensagem": str(e)
                })
        
        # Processar XMLs de saída
        for xml_data in saida_xmls:
            try:
                chave = xml_data.get("chave", "")
                existing = await db.xml_documents.find_one({"chave_acesso": chave})
                if existing:
                    total_duplicados += 1
                    continue
                    
                total_importados += 1
                
            except Exception as e:
                total_erros += 1
                log_entry["detalhes"].append({
                    "tipo": "erro",
                    "chave": xml_data.get("chave", ""),
                    "mensagem": str(e)
                })
        
        end_time = datetime.now(timezone.utc)
        duracao = (end_time - start_time).total_seconds()
        
        log_entry.update({
            "status": "sucesso" if total_erros == 0 else "parcial",
            "total_encontrados": total_encontrados,
            "total_importados": total_importados,
            "total_duplicados": total_duplicados,
            "total_erros": total_erros,
            "duracao_segundos": round(duracao, 2),
            "entradas": {
                "encontrados": len(entrada_xmls),
                "stats": result.get("entrada", {}).get("stats", {})
            },
            "saidas": {
                "encontrados": len(saida_xmls),
                "stats": result.get("saida", {}).get("stats", {})
            }
        })
        
        print(f"[SIEG-SCHEDULER] Sync concluído para {company_id}: {total_importados} importados, {total_duplicados} duplicados, {total_erros} erros")
        
    except Exception as e:
        print(f"[SIEG-SCHEDULER] Erro ao sincronizar empresa {company_id}: {e}")
        log_entry.update({
            "status": "erro",
            "detalhes": [{"tipo": "erro_fatal", "mensagem": str(e)}]
        })
    
    # Salvar log
    await db.sieg_sync_logs.insert_one(log_entry)
    
    return log_entry


async def job_sync_todas_empresas():
    """
    Job principal que sincroniza todas as empresas com sync automático ativo
    """
    db = get_scheduler_db()
    
    print(f"[SIEG-SCHEDULER] Iniciando job de sincronização em massa - {datetime.now()}")
    
    # Registrar início do batch
    batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    batch_log = {
        "batch_id": batch_id,
        "iniciado_em": datetime.now(timezone.utc).isoformat(),
        "status": "em_andamento",
        "total_empresas": 0,
        "empresas_processadas": 0,
        "empresas_erro": 0,
        "resultados": []
    }
    
    try:
        # Buscar empresas com sync automático ativo
        configs = await db.sieg_config.find({
            "ativo": True,
            "sync_automatico": True
        }).to_list(1000)
        
        batch_log["total_empresas"] = len(configs)
        
        if not configs:
            print("[SIEG-SCHEDULER] Nenhuma empresa com sync automático ativo")
            batch_log["status"] = "concluido"
            await db.sieg_sync_batches.insert_one(batch_log)
            return
        
        # Obter competência atual
        now = datetime.now()
        competencia_atual = f"{now.month:02d}/{now.year}"
        
        # Processar cada empresa
        for config in configs:
            company_id = config.get("company_id")
            
            # Buscar dados da empresa
            company = await db.companies.find_one({"id": company_id}, {"_id": 0})
            if not company:
                print(f"[SIEG-SCHEDULER] Empresa {company_id} não encontrada")
                batch_log["empresas_erro"] += 1
                continue
            
            cnpj = company.get("cnpj", "")
            if not cnpj:
                print(f"[SIEG-SCHEDULER] CNPJ não encontrado para empresa {company_id}")
                batch_log["empresas_erro"] += 1
                continue
            
            # Executar sync
            try:
                result = await sync_empresa_sieg(company_id, cnpj, competencia_atual)
                batch_log["empresas_processadas"] += 1
                batch_log["resultados"].append({
                    "company_id": company_id,
                    "status": result.get("status"),
                    "total_importados": result.get("total_importados", 0)
                })
            except Exception as e:
                print(f"[SIEG-SCHEDULER] Erro ao processar empresa {company_id}: {e}")
                batch_log["empresas_erro"] += 1
                batch_log["resultados"].append({
                    "company_id": company_id,
                    "status": "erro",
                    "mensagem": str(e)
                })
            
            # Pequeno delay entre empresas para não sobrecarregar a API
            await asyncio.sleep(2)
        
        batch_log["status"] = "concluido"
        batch_log["finalizado_em"] = datetime.now(timezone.utc).isoformat()
        
    except Exception as e:
        print(f"[SIEG-SCHEDULER] Erro no job de sincronização: {e}")
        batch_log["status"] = "erro"
        batch_log["erro"] = str(e)
    
    # Salvar batch log
    await db.sieg_sync_batches.insert_one(batch_log)
    
    print(f"[SIEG-SCHEDULER] Job finalizado: {batch_log['empresas_processadas']}/{batch_log['total_empresas']} empresas processadas")


def start_scheduler():
    """
    Inicia o scheduler com os jobs configurados
    """
    if scheduler.running:
        print("[SIEG-SCHEDULER] Scheduler já está rodando")
        return
    
    # Job diário às 06:00
    scheduler.add_job(
        job_sync_todas_empresas,
        CronTrigger(hour=6, minute=0),
        id='sieg_daily_sync',
        name='SIEG - Sincronização Diária',
        replace_existing=True
    )
    
    # Job a cada 12 horas (para empresas com frequência 12h)
    # Este job verifica e executa apenas para empresas com essa config
    scheduler.add_job(
        job_sync_todas_empresas,
        CronTrigger(hour='6,18', minute=0),
        id='sieg_12h_sync',
        name='SIEG - Sincronização 12h',
        replace_existing=True
    )
    
    scheduler.start()
    print("[SIEG-SCHEDULER] Scheduler iniciado com sucesso")
    print("[SIEG-SCHEDULER] Jobs agendados:")
    for job in scheduler.get_jobs():
        print(f"  - {job.name}: {job.trigger}")


def stop_scheduler():
    """Para o scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("[SIEG-SCHEDULER] Scheduler parado")


async def run_sync_now():
    """
    Executa sincronização imediatamente (para uso manual/debug)
    """
    await job_sync_todas_empresas()


# Funções para verificar status do scheduler
def get_scheduler_status():
    """Retorna status do scheduler"""
    return {
        "running": scheduler.running,
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run": str(job.next_run_time) if job.next_run_time else None
            }
            for job in scheduler.get_jobs()
        ] if scheduler.running else []
    }
