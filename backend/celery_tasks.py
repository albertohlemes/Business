"""
Tarefas Celery para processamento de XMLs em background
"""
import asyncio
import logging
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from celery import shared_task, current_task
from celery_config import celery_app
from motor.motor_asyncio import AsyncIOMotorClient
import os

logger = logging.getLogger(__name__)

# Conexão MongoDB para tasks - usar mesmo DB do servidor principal
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


def get_db():
    """Retorna conexão com MongoDB"""
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


@celery_app.task(bind=True, name='celery_tasks.process_xml_batch')
def process_xml_batch(self, job_id: str, xml_contents: List[Dict], company_id: str, 
                      competencia: str, tipo: str, user_id: str):
    """
    Processa um lote de XMLs em background.
    
    Args:
        job_id: ID único do job
        xml_contents: Lista de {filename, content_b64} - conteúdo em base64
        company_id: ID da empresa
        competencia: Competência fiscal (MM/YYYY)
        tipo: 'entrada' ou 'saida'
        user_id: ID do usuário que iniciou
    """
    import base64
    
    total_files = len(xml_contents)
    logger.info(f"CELERY-TASK: Iniciando processamento de {total_files} XMLs - job_id={job_id}")
    
    # Atualizar estado inicial
    self.update_state(state='PROCESSING', meta={
        'job_id': job_id,
        'current': 0,
        'total': total_files,
        'status': 'Iniciando processamento...',
        'results': None
    })
    
    # Rodar o processamento assíncrono
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        result = loop.run_until_complete(
            _process_xmls_async(self, job_id, xml_contents, company_id, competencia, tipo, user_id)
        )
        return result
    except Exception as e:
        logger.error(f"CELERY-TASK: Erro no processamento - job_id={job_id}: {e}")
        return {
            'job_id': job_id,
            'status': 'error',
            'error': str(e),
            'total_files': total_files,
            'processed': 0
        }
    finally:
        loop.close()


async def _process_xmls_async(task, job_id: str, xml_contents: List[Dict], 
                               company_id: str, competencia: str, tipo: str, user_id: str):
    """Processamento assíncrono dos XMLs"""
    import base64
    from xml.etree import ElementTree as ET
    
    db = get_db()
    total_files = len(xml_contents)
    
    # Buscar empresa
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise Exception(f"Empresa não encontrada: {company_id}")
    
    cnpj_empresa = company.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')
    
    # Pré-carregar cache de documentos existentes
    existing_docs_cache = set()
    existing_docs = await db.xml_documents.find({
        "company_id": company_id,
        "competencia": competencia
    }, {"chave_nfe": 1, "_id": 0}).to_list(length=None)
    
    for doc in existing_docs:
        if doc.get("chave_nfe"):
            existing_docs_cache.add(doc["chave_nfe"])
    
    logger.info(f"CELERY-TASK: Cache carregado - {len(existing_docs_cache)} docs existentes")
    
    # Resultados
    results = []
    errors = []
    duplicadas = []
    entradas_count = 0
    saidas_count = 0
    
    # Buffer para bulk insert
    docs_to_insert = []
    BULK_SIZE = 200
    
    async def flush_bulk():
        nonlocal docs_to_insert
        if docs_to_insert:
            try:
                await db.xml_documents.insert_many(docs_to_insert, ordered=False)
                logger.info(f"CELERY-TASK: Bulk insert de {len(docs_to_insert)} docs")
            except Exception as e:
                logger.warning(f"CELERY-TASK: Erro bulk insert: {e}")
                for doc in docs_to_insert:
                    try:
                        await db.xml_documents.insert_one(doc)
                    except:
                        pass
            docs_to_insert = []
    
    # Processar XMLs
    for idx, xml_data in enumerate(xml_contents):
        try:
            filename = xml_data.get('filename', f'xml_{idx}.xml')
            content_b64 = xml_data.get('content_b64', '')
            
            # Decodificar conteúdo
            try:
                content = base64.b64decode(content_b64)
                xml_str = content.decode('utf-8')
            except Exception as e:
                errors.append({'filename': filename, 'error': f'Erro ao decodificar: {e}'})
                continue
            
            # Parse do XML
            try:
                root = ET.fromstring(xml_str)
            except Exception as e:
                errors.append({'filename': filename, 'error': f'XML inválido: {e}'})
                continue
            
            # Extrair chave NFe
            chave_nfe = None
            ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
            
            infNFe = root.find('.//nfe:infNFe', ns)
            if infNFe is not None:
                chave_nfe = infNFe.get('Id', '').replace('NFe', '')
            
            if not chave_nfe:
                # Tentar sem namespace
                infNFe = root.find('.//infNFe')
                if infNFe is not None:
                    chave_nfe = infNFe.get('Id', '').replace('NFe', '')
            
            if not chave_nfe or len(chave_nfe) != 44:
                errors.append({'filename': filename, 'error': 'Chave NFe não encontrada ou inválida'})
                continue
            
            # Verificar duplicado
            if chave_nfe in existing_docs_cache:
                duplicadas.append({'filename': filename, 'chave': chave_nfe})
                continue
            
            # Extrair CNPJ do emitente - tentar várias formas
            cnpj_emitente = ''
            
            # Método 1: Com namespace
            emit = root.find('.//nfe:emit', ns)
            if emit is not None:
                cnpj_el = emit.find('nfe:CNPJ', ns)
                if cnpj_el is not None and cnpj_el.text:
                    cnpj_emitente = cnpj_el.text.strip()
            
            # Método 2: Sem namespace (fallback)
            if not cnpj_emitente:
                emit = root.find('.//{http://www.portalfiscal.inf.br/nfe}emit')
                if emit is not None:
                    cnpj_el = emit.find('{http://www.portalfiscal.inf.br/nfe}CNPJ')
                    if cnpj_el is not None and cnpj_el.text:
                        cnpj_emitente = cnpj_el.text.strip()
            
            # Método 3: Sem namespace algum
            if not cnpj_emitente:
                emit = root.find('.//emit')
                if emit is not None:
                    cnpj_el = emit.find('CNPJ')
                    if cnpj_el is not None and cnpj_el.text:
                        cnpj_emitente = cnpj_el.text.strip()
            
            # CLASSIFICAÇÃO AUTOMÁTICA baseada na regra de negócio:
            # - Se CNPJ emitente == CNPJ empresa -> SAÍDA (empresa emitiu)
            # - Se CNPJ emitente != CNPJ empresa -> ENTRADA (empresa recebeu)
            tipo_calculado = 'saida' if cnpj_emitente == cnpj_empresa else 'entrada'
            
            logger.debug(f"CELERY-TASK: Classificação - CNPJ emit={cnpj_emitente}, CNPJ empresa={cnpj_empresa} -> {tipo_calculado}")
            
            # Extrair dados básicos
            ide = root.find('.//nfe:ide', ns) or root.find('.//ide')
            numero_nfe = ''
            serie = '1'
            data_emissao = ''
            
            if ide is not None:
                nNF = ide.find('nfe:nNF', ns) or ide.find('nNF')
                if nNF is not None and nNF.text:
                    numero_nfe = nNF.text.strip()
                
                serie_el = ide.find('nfe:serie', ns) or ide.find('serie')
                if serie_el is not None and serie_el.text:
                    serie = serie_el.text.strip()
                
                dhEmi = ide.find('nfe:dhEmi', ns) or ide.find('dhEmi')
                if dhEmi is not None and dhEmi.text:
                    data_emissao = dhEmi.text.strip()[:10]
            
            # Extrair valor total
            total = root.find('.//nfe:total/nfe:ICMSTot', ns) or root.find('.//total/ICMSTot')
            valor_total = 0
            if total is not None:
                vNF = total.find('nfe:vNF', ns) or total.find('vNF')
                if vNF is not None and vNF.text:
                    try:
                        valor_total = float(vNF.text.strip())
                    except:
                        pass
            
            # Criar documento
            doc = {
                "id": str(uuid.uuid4()),
                "company_id": company_id,
                "competencia": competencia,
                "tipo": tipo_calculado,
                "modelo": "nfe",
                "chave_nfe": chave_nfe,
                "numero_nfe": numero_nfe,
                "serie": serie,
                "data_emissao": data_emissao,
                "valor_total": valor_total,
                "emitente_cnpj": cnpj_emitente,
                "status": "ativa",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "importado_por": user_id,
                "origem_importacao": "celery_batch"
            }
            
            docs_to_insert.append(doc)
            existing_docs_cache.add(chave_nfe)
            
            results.append({
                'filename': filename,
                'status': 'success',
                'chave': chave_nfe,
                'numero': numero_nfe,
                'tipo': tipo_calculado
            })
            
            # Contar por tipo
            if tipo_calculado == 'entrada':
                entradas_count += 1
            else:
                saidas_count += 1
            
            # Flush se atingiu tamanho
            if len(docs_to_insert) >= BULK_SIZE:
                await flush_bulk()
            
            # Atualizar progresso a cada 100 arquivos
            if (idx + 1) % 100 == 0:
                task.update_state(state='PROCESSING', meta={
                    'job_id': job_id,
                    'current': idx + 1,
                    'total': total_files,
                    'status': f'Processando {idx + 1}/{total_files}...',
                    'importados': len(results),
                    'duplicados': len(duplicadas),
                    'erros': len(errors)
                })
                logger.info(f"CELERY-TASK: Progresso {idx + 1}/{total_files}")
        
        except Exception as e:
            errors.append({'filename': xml_data.get('filename', f'xml_{idx}'), 'error': str(e)})
    
    # Flush final
    await flush_bulk()
    
    # Salvar resultado do job no MongoDB
    job_result = {
        'job_id': job_id,
        'company_id': company_id,
        'competencia': competencia,
        'tipo': tipo,
        'user_id': user_id,
        'status': 'completed',
        'total_files': total_files,
        'importados': len(results),
        'duplicados': len(duplicadas),
        'rejeitados_cnpj': len(rejeitadas_cnpj),
        'erros': len(errors),
        'results': results[:100],  # Limitar para não estourar memória
        'duplicadas': duplicadas[:50],
        'rejeitadas_cnpj': rejeitadas_cnpj[:50],
        'errors': errors[:50],
        'completed_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.import_jobs.update_one(
        {'job_id': job_id},
        {'$set': job_result},
        upsert=True
    )
    
    logger.info(f"CELERY-TASK: Concluído job_id={job_id} - {len(results)} importados, {len(duplicadas)} duplicados, {len(errors)} erros")
    
    return job_result


@celery_app.task(bind=True, name='celery_tasks.get_job_status')
def get_job_status(self, job_id: str):
    """Retorna status de um job"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        result = loop.run_until_complete(_get_job_status_async(job_id))
        return result
    finally:
        loop.close()


async def _get_job_status_async(job_id: str):
    """Busca status do job no MongoDB"""
    db = get_db()
    job = await db.import_jobs.find_one({'job_id': job_id}, {'_id': 0})
    return job
