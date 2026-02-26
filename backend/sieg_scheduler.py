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

# Configuração padrão de horários
DEFAULT_CONFIG = {
    "horario_diario": "03:00",  # Horário da sincronização diária
    "horarios_12h": ["03:00", "15:00"],  # Horários para frequência 12h
    "horarios_6h": ["03:00", "09:00", "15:00", "21:00"],  # Horários para frequência 6h
    "ativo": True
}

def get_scheduler_db():
    """Obtém conexão com o banco de dados para o scheduler"""
    global _scheduler_db_client, _scheduler_db
    if _scheduler_db is None:
        _scheduler_db_client = AsyncIOMotorClient(MONGO_URL)
        _scheduler_db = _scheduler_db_client[DB_NAME]
    return _scheduler_db


async def get_scheduler_config():
    """Obtém configuração do scheduler do banco de dados"""
    db = get_scheduler_db()
    config = await db.sieg_scheduler_config.find_one({"_id": "global"})
    if not config:
        # Criar configuração padrão
        config = {**DEFAULT_CONFIG, "_id": "global"}
        await db.sieg_scheduler_config.insert_one(config)
    return config


async def save_scheduler_config(config: dict):
    """Salva configuração do scheduler no banco de dados"""
    db = get_scheduler_db()
    config["_id"] = "global"
    config["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.sieg_scheduler_config.update_one(
        {"_id": "global"},
        {"$set": config},
        upsert=True
    )
    return config


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
    Job principal que sincroniza todas as empresas com sync automático ativo.
    
    ATUALIZADO: Agora lê configuração diretamente da coleção 'companies'
    em vez da antiga coleção 'sieg_config'.
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
        # NOVO: Buscar empresas com sync automático ativo diretamente da coleção companies
        empresas = await db.companies.find({
            "sieg_ativo": True,
            "sieg_sync_automatico": True
        }, {"_id": 0}).to_list(1000)
        
        batch_log["total_empresas"] = len(empresas)
        
        if not empresas:
            print("[SIEG-SCHEDULER] Nenhuma empresa com sync automático ativo")
            batch_log["status"] = "concluido"
            await db.sieg_sync_batches.insert_one(batch_log)
            return
        
        # Obter competência atual
        now = datetime.now()
        competencia_atual = f"{now.month:02d}/{now.year}"
        
        # Processar cada empresa
        for company in empresas:
            company_id = company.get("id")
            cnpj = company.get("cnpj", "")
            razao_social = company.get("razao_social", "N/A")
            
            if not cnpj:
                print(f"[SIEG-SCHEDULER] CNPJ não encontrado para empresa {company_id}")
                batch_log["empresas_erro"] += 1
                continue
            
            # Executar sync
            try:
                print(f"[SIEG-SCHEDULER] Sincronizando: {razao_social} ({cnpj})")
                result = await sync_empresa_sieg(company_id, cnpj, competencia_atual)
                batch_log["empresas_processadas"] += 1
                batch_log["resultados"].append({
                    "company_id": company_id,
                    "razao_social": razao_social,
                    "status": result.get("status"),
                    "total_importados": result.get("total_importados", 0)
                })
            except Exception as e:
                print(f"[SIEG-SCHEDULER] Erro ao processar empresa {company_id}: {e}")
                batch_log["empresas_erro"] += 1
                batch_log["resultados"].append({
                    "company_id": company_id,
                    "razao_social": razao_social,
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
    
    # Carregar configuração do banco de dados
    async def load_config_and_start():
        config = await get_scheduler_config()
        horario_diario = config.get("horario_diario", "03:00")
        
        try:
            hora, minuto = map(int, horario_diario.split(":"))
        except:
            hora, minuto = 3, 0
        
        # Job diário com horário do banco (usando timezone de Brasília)
        from pytz import timezone
        tz_brasilia = timezone('America/Sao_Paulo')
        
        scheduler.add_job(
            job_sync_todas_empresas,
            CronTrigger(hour=hora, minute=minuto, timezone=tz_brasilia),
            id='sieg_daily_sync',
            name=f'SIEG - Sincronização Diária ({horario_diario})',
            replace_existing=True
        )
        
        print(f"[SIEG-SCHEDULER] Scheduler iniciado com horário: {horario_diario} (Brasília)")
        print("[SIEG-SCHEDULER] Jobs agendados:")
        for job in scheduler.get_jobs():
            print(f"  - {job.name}: {job.trigger}")
    
    scheduler.start()
    
    # Executar carregamento da config de forma assíncrona
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(load_config_and_start())
        else:
            loop.run_until_complete(load_config_and_start())
    except RuntimeError:
        # Criar novo loop se necessário
        asyncio.run(load_config_and_start())
    
    print("[SIEG-SCHEDULER] Scheduler iniciado com sucesso")


async def update_scheduler_jobs():
    """
    Atualiza os jobs do scheduler com base na configuração do banco.
    MELHORADO: Se o horário configurado ainda não passou hoje, executa hoje.
    Se já passou, executa amanhã.
    """
    config = await get_scheduler_config()
    
    # Remover jobs existentes
    for job_id in ['sieg_daily_sync', 'sieg_12h_sync', 'sieg_6h_sync', 'sieg_today_sync']:
        try:
            scheduler.remove_job(job_id)
        except:
            pass
    
    # Job diário
    horario_diario = config.get("horario_diario", "03:00")
    hora, minuto = map(int, horario_diario.split(":"))
    
    # Verificar se o horário já passou hoje
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    # Converter para horário local (Brasília UTC-3)
    now_local = now - timedelta(hours=3)
    hora_atual = now_local.hour
    minuto_atual = now_local.minute
    
    # Se o horário configurado ainda não passou hoje
    if hora > hora_atual or (hora == hora_atual and minuto > minuto_atual):
        # Calcular próxima execução para hoje
        from apscheduler.triggers.date import DateTrigger
        proximo = now_local.replace(hour=hora, minute=minuto, second=0, microsecond=0)
        proximo_utc = proximo + timedelta(hours=3)
        
        print(f"[SIEG-SCHEDULER] Horário {horario_diario} ainda não passou hoje. Agendando para hoje às {horario_diario}")
        
        # Agendar execução única para hoje
        scheduler.add_job(
            job_sync_todas_empresas,
            DateTrigger(run_date=proximo_utc),
            id='sieg_today_sync',
            name=f'SIEG - Sincronização Hoje ({horario_diario})',
            replace_existing=True
        )
    else:
        print(f"[SIEG-SCHEDULER] Horário {horario_diario} já passou hoje. Próxima execução amanhã.")
    
    # Sempre configurar o job diário recorrente (CronTrigger para os próximos dias)
    # Usando timezone de Brasília para horário correto
    from pytz import timezone
    tz_brasilia = timezone('America/Sao_Paulo')
    
    scheduler.add_job(
        job_sync_todas_empresas,
        CronTrigger(hour=hora, minute=minuto, timezone=tz_brasilia),
        id='sieg_daily_sync',
        name=f'SIEG - Sincronização Diária ({horario_diario})',
        replace_existing=True
    )
    
    # Jobs 12h
    horarios_12h = config.get("horarios_12h", ["03:00", "15:00"])
    horas_12h = [int(h.split(":")[0]) for h in horarios_12h]
    scheduler.add_job(
        job_sync_todas_empresas,
        CronTrigger(hour=','.join(map(str, horas_12h)), minute=0, timezone=tz_brasilia),
        id='sieg_12h_sync',
        name=f'SIEG - Sincronização 12h ({", ".join(horarios_12h)})',
        replace_existing=True
    )
    
    # Jobs 6h
    horarios_6h = config.get("horarios_6h", ["03:00", "09:00", "15:00", "21:00"])
    horas_6h = [int(h.split(":")[0]) for h in horarios_6h]
    scheduler.add_job(
        job_sync_todas_empresas,
        CronTrigger(hour=','.join(map(str, horas_6h)), minute=0, timezone=tz_brasilia),
        id='sieg_6h_sync',
        name=f'SIEG - Sincronização 6h',
        replace_existing=True
    )
    
    print(f"[SIEG-SCHEDULER] Jobs atualizados com horário diário: {horario_diario}")
    return config


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
