"""
SIEG Smart Sync Service
Sincronização inteligente de XMLs com:
- Data de corte (só busca novos documentos)
- Verificação de cancelamentos posteriores
- Detecção de devoluções de fornecedor
"""

import os
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger("sieg_smart_sync")


async def get_data_corte_sync(db, company_id: str, competencia: str) -> Optional[datetime]:
    """
    Retorna a data de corte para sincronização incremental.
    
    Lógica:
    - Se é a primeira sync da competência: retorna None (busca tudo)
    - Se já teve sync bem-sucedida: retorna data da última sync
    
    Isso evita baixar XMLs que já foram processados.
    """
    ultima_sync = await db.sieg_sync_logs.find_one(
        {
            "company_id": company_id,
            "competencia": competencia,
            "status": "sucesso"
        },
        sort=[("data_sync", -1)]
    )
    
    if ultima_sync:
        data_sync = ultima_sync.get("data_sync")
        if isinstance(data_sync, str):
            data_sync = datetime.fromisoformat(data_sync.replace('Z', '+00:00'))
        logger.info(f"[SMART SYNC] Data de corte para {company_id}/{competencia}: {data_sync}")
        return data_sync
    
    logger.info(f"[SMART SYNC] Primeira sync para {company_id}/{competencia} - sem data de corte")
    return None


async def get_chaves_ja_importadas(db, company_id: str, competencia: str) -> set:
    """
    Retorna um set com todas as chaves de NFe já importadas para a competência.
    Usado para evitar duplicados e identificar documentos novos rapidamente.
    """
    # Buscar documentos com chave_nfe
    cursor = db.xml_documents.find(
        {
            "company_id": company_id,
            "competencia": competencia,
            "chave_nfe": {"$exists": True, "$ne": ""}
        },
        {"chave_nfe": 1, "_id": 0}
    )
    
    docs = await cursor.to_list(length=50000)
    chaves = {doc.get("chave_nfe") for doc in docs if doc.get("chave_nfe")}
    
    # Também buscar por chave_acesso (campo alternativo usado em alguns documentos)
    cursor_alt = db.xml_documents.find(
        {
            "company_id": company_id,
            "competencia": competencia,
            "chave_acesso": {"$exists": True, "$ne": ""},
            "chave_nfe": {"$exists": False}  # Só se não tiver chave_nfe
        },
        {"chave_acesso": 1, "_id": 0}
    )
    
    docs_alt = await cursor_alt.to_list(length=50000)
    chaves_alt = {doc.get("chave_acesso") for doc in docs_alt if doc.get("chave_acesso")}
    chaves.update(chaves_alt)
    
    # Contar total de documentos para diagnóstico
    total_docs = await db.xml_documents.count_documents({
        "company_id": company_id,
        "competencia": competencia
    })
    
    logger.info(f"[SMART SYNC] {len(chaves)} chaves já importadas para {company_id}/{competencia} (total docs: {total_docs})")
    
    if total_docs > 0 and len(chaves) == 0:
        logger.warning(f"[SMART SYNC] ATENÇÃO: {total_docs} documentos existem mas nenhuma chave foi encontrada! Verificar campos chave_nfe/chave_acesso.")
    
    return chaves


async def verificar_cancelamentos_posteriores(
    db, 
    company_id: str, 
    competencia: str,
    chaves_sieg: List[str] = None,
    xmls_sieg: List[Dict] = None
) -> Dict[str, Any]:
    """
    Verifica se alguma nota já importada foi cancelada posteriormente no SIEG.
    
    ATUALIZADO: Agora verifica:
    1. Eventos de cancelamento na collection eventos_cancelamento
    2. Eventos de cancelamento embutidos nos XMLs do SIEG (procEvento, cStat 135)
    3. Notas que existem no banco mas não vieram no SIEG (podem ter sido canceladas)
    
    Args:
        db: Database connection
        company_id: ID da empresa
        competencia: Competência (MM/YYYY)
        chaves_sieg: Lista de chaves NFe que vieram do SIEG
        xmls_sieg: Lista de XMLs raw do SIEG para buscar eventos de cancelamento
    
    Returns:
        {
            "canceladas": [{"chave": "xxx", "motivo": "..."}],
            "total": int
        }
    """
    import re
    
    canceladas = []
    chaves_sieg_set = set(chaves_sieg or [])
    
    # 1. Buscar notas importadas que NÃO vieram no SIEG (podem ter sido canceladas)
    if chaves_sieg_set:
        notas_importadas = await db.xml_documents.find(
            {
                "company_id": company_id,
                "competencia": competencia,
                "cancelada": {"$ne": True},
                "chave_nfe": {"$exists": True, "$ne": ""}
            },
            {"chave_nfe": 1, "numero_nfe": 1, "_id": 0}
        ).to_list(length=50000)
        
        chaves_importadas = {doc.get("chave_nfe") for doc in notas_importadas if doc.get("chave_nfe")}
        
        # Notas que existem no banco mas não vieram no SIEG
        # CUIDADO: Isso pode ser por limite de paginação, então só logar como warning
        notas_ausentes = chaves_importadas - chaves_sieg_set
        if notas_ausentes:
            logger.warning(f"[SMART SYNC] {len(notas_ausentes)} notas existem no banco mas não vieram no SIEG. Verificar se foram canceladas.")
    
    # 2. Verificar eventos de cancelamento embutidos nos XMLs do SIEG
    if xmls_sieg:
        for xml_info in xmls_sieg:
            xml_content = xml_info.get("xml", "")
            if not xml_content:
                continue
            
            # Verificar se o XML é um evento de cancelamento (procEventoNFe)
            if "<procEventoNFe" in xml_content and "<cStat>135</cStat>" in xml_content:
                # Evento de cancelamento homologado
                chave_match = re.search(r'<chNFe>(\d{44})</chNFe>', xml_content)
                justificativa_match = re.search(r'<xJust>([^<]+)</xJust>', xml_content)
                data_match = re.search(r'<dhRegEvento>([^<]+)</dhRegEvento>', xml_content)
                
                if chave_match:
                    chave = chave_match.group(1)
                    canceladas.append({
                        "chave": chave,
                        "motivo": justificativa_match.group(1) if justificativa_match else "Cancelamento via evento SIEG",
                        "data_cancelamento": data_match.group(1) if data_match else datetime.now(timezone.utc).isoformat(),
                        "origem": "evento_xml_sieg"
                    })
                    logger.info(f"[SMART SYNC] Cancelamento detectado via evento XML: {chave[:20]}...")
            
            # Verificar se o próprio XML da NFe indica cancelamento (cStat 101, 151, 155)
            # cStat 101 = Cancelamento homologado
            # cStat 151 = Cancelamento de NFe autorizada
            # cStat 155 = Cancelamento de NFe autorizada fora do prazo
            cstat_match = re.search(r'<cStat>(\d+)</cStat>', xml_content)
            if cstat_match and cstat_match.group(1) in ['101', '151', '155']:
                chave_match = re.search(r'<chNFe>(\d{44})</chNFe>', xml_content)
                if not chave_match:
                    chave_match = re.search(r'Id="NFe(\d{44})"', xml_content)
                
                if chave_match:
                    chave = chave_match.group(1)
                    xmotivo_match = re.search(r'<xMotivo>([^<]+)</xMotivo>', xml_content)
                    canceladas.append({
                        "chave": chave,
                        "motivo": xmotivo_match.group(1) if xmotivo_match else f"Cancelamento - cStat {cstat_match.group(1)}",
                        "data_cancelamento": datetime.now(timezone.utc).isoformat(),
                        "origem": "cstat_cancelamento"
                    })
                    logger.info(f"[SMART SYNC] Cancelamento detectado via cStat: {chave[:20]}...")
    
    # 3. Verificar eventos de cancelamento na collection (método original)
    if chaves_sieg_set:
        for chave in chaves_sieg_set:
            evento = await db.eventos_cancelamento.find_one({
                "chave_nfe": chave,
                "processado": {"$ne": True}
            })
            if evento:
                # Verificar se já não está na lista
                if not any(c["chave"] == chave for c in canceladas):
                    canceladas.append({
                        "chave": chave,
                        "motivo": evento.get("justificativa", "Cancelamento via SIEG"),
                        "data_cancelamento": evento.get("data_cancelamento"),
                        "origem": "collection_eventos"
                    })
    
    # Remover duplicatas
    chaves_vistas = set()
    canceladas_unicas = []
    for c in canceladas:
        if c["chave"] not in chaves_vistas:
            chaves_vistas.add(c["chave"])
            canceladas_unicas.append(c)
    
    logger.info(f"[SMART SYNC] {len(canceladas_unicas)} notas com cancelamento pendente")
    return {
        "canceladas": canceladas_unicas,
        "total": len(canceladas_unicas)
    }


async def processar_cancelamentos(db, company_id: str, cancelamentos: List[Dict]) -> int:
    """
    Marca as notas como canceladas no banco de dados.
    """
    total_processados = 0
    
    for cancel in cancelamentos:
        chave = cancel.get("chave")
        if not chave:
            continue
        
        result = await db.xml_documents.update_one(
            {
                "company_id": company_id,
                "chave_nfe": chave
            },
            {
                "$set": {
                    "cancelada": True,
                    "data_cancelamento": cancel.get("data_cancelamento", datetime.now(timezone.utc).isoformat()),
                    "justificativa_cancelamento": cancel.get("motivo", "Cancelamento identificado via SIEG"),
                    "status_validacao": "cancelada"
                }
            }
        )
        
        if result.modified_count > 0:
            total_processados += 1
            # Marcar evento como processado
            await db.eventos_cancelamento.update_one(
                {"chave_nfe": chave},
                {"$set": {"processado": True}}
            )
    
    logger.info(f"[SMART SYNC] {total_processados} notas marcadas como canceladas")
    return total_processados


async def detectar_devolucoes_fornecedor(
    db,
    company_id: str,
    xmls_novos: List[Dict]
) -> List[Dict]:
    """
    Detecta notas de devolução de fornecedor que referenciam notas já importadas.
    
    Uma devolução de fornecedor é quando:
    - finNFe = 4 (Devolução/Retorno)
    - Tem NFe referenciada (refNFe)
    - CFOP de devolução (1201, 1202, 2201, 2202, etc.)
    
    IMPORTANTE: Inclui comparação de valores!
    - Se valor igual: desconsiderar automaticamente
    - Se valor diferente: marcar para análise do usuário
    
    Returns:
        Lista de {
            "chave_devolucao": str,
            "chave_original": str,
            "motivo": str,
            "valor_devolucao": float,
            "valor_original": float,
            "tem_divergencia_valor": bool
        }
    """
    import re
    devolucoes = []
    
    cfops_devolucao = [
        '1201', '1202', '1203', '1204', '1410', '1411', '1503', '1504',
        '2201', '2202', '2203', '2204', '2410', '2411', '2503', '2504',
        '1949', '2949'  # Outras entradas
    ]
    
    for xml_info in xmls_novos:
        xml_content = xml_info.get("xml", "")
        if not xml_content:
            continue
        
        # Verificar se é devolução
        is_devolucao = False
        chave_ref = None
        motivo = ""
        
        # Verificar finalidade
        if "<finNFe>4</finNFe>" in xml_content:
            is_devolucao = True
            motivo = "finNFe=4 (Devolução)"
        
        # Verificar NFe referenciada
        ref_match = re.search(r'<refNFe>(\d{44})</refNFe>', xml_content)
        if ref_match:
            chave_ref = ref_match.group(1)
            if not is_devolucao:
                # Verificar CFOP
                cfop_match = re.search(r'<CFOP>(\d{4})</CFOP>', xml_content)
                if cfop_match and cfop_match.group(1) in cfops_devolucao:
                    is_devolucao = True
                    motivo = f"CFOP de devolução ({cfop_match.group(1)})"
        
        if is_devolucao and chave_ref:
            # Verificar se a nota referenciada existe no banco
            nota_original = await db.xml_documents.find_one({
                "company_id": company_id,
                "chave_nfe": chave_ref
            })
            
            if nota_original:
                chave_devolucao = ""
                chave_match = re.search(r'<chNFe>(\d{44})</chNFe>', xml_content)
                if chave_match:
                    chave_devolucao = chave_match.group(1)
                
                # Extrair valor da devolução do XML
                valor_devolucao = 0.0
                valor_match = re.search(r'<vNF>([0-9.]+)</vNF>', xml_content)
                if valor_match:
                    try:
                        valor_devolucao = float(valor_match.group(1))
                    except (ValueError, TypeError):
                        valor_devolucao = 0.0
                
                valor_original = float(nota_original.get("valor_total", 0) or 0)
                
                # Verificar divergência de valores (tolerância de R$ 0.01)
                tem_divergencia_valor = abs(valor_original - valor_devolucao) > 0.01
                
                devolucoes.append({
                    "chave_devolucao": chave_devolucao,
                    "chave_original": chave_ref,
                    "motivo": motivo,
                    "numero_original": nota_original.get("numero_nfe"),
                    "valor_original": valor_original,
                    "valor_devolucao": valor_devolucao,
                    "tem_divergencia_valor": tem_divergencia_valor,
                    "diferenca": round(valor_original - valor_devolucao, 2) if tem_divergencia_valor else 0
                })
                
                if tem_divergencia_valor:
                    logger.info(f"[SMART SYNC] DIVERGÊNCIA DE VALOR: Devolução {valor_devolucao:.2f} != Original {valor_original:.2f}")
    
    logger.info(f"[SMART SYNC] {len(devolucoes)} devoluções de fornecedor detectadas")
    return devolucoes


async def marcar_notas_devolvidas(db, company_id: str, devolucoes: List[Dict]) -> Tuple[int, List[Dict]]:
    """
    Marca as notas originais como desconsideradas por devolução.
    
    IMPORTANTE: 
    - Se valor igual: desconsiderar automaticamente
    - Se valor diferente: NÃO desconsiderar, registrar para análise do usuário
    
    Returns:
        (total_marcadas, divergencias_para_analise)
    """
    total_marcadas = 0
    divergencias_para_analise = []
    
    for dev in devolucoes:
        chave_original = dev.get("chave_original")
        if not chave_original:
            continue
        
        tem_divergencia = dev.get("tem_divergencia_valor", False)
        
        if tem_divergencia:
            # VALORES DIFERENTES: NÃO desconsiderar automaticamente
            # Registrar para análise no Wizard de Fechamento
            divergencias_para_analise.append({
                "tipo": "devolucao_divergente_sieg",
                "chave_original": chave_original,
                "chave_devolucao": dev.get("chave_devolucao"),
                "numero_original": dev.get("numero_original"),
                "valor_original": dev.get("valor_original"),
                "valor_devolucao": dev.get("valor_devolucao"),
                "diferenca": dev.get("diferenca"),
                "motivo": f"ATENÇÃO: Valor da devolução ({dev.get('valor_devolucao', 0):.2f}) difere do original ({dev.get('valor_original', 0):.2f}). Requer análise.",
                "requer_decisao_usuario": True,
                "origem": "sieg"
            })
            logger.info(f"[SMART SYNC] Divergência de valor - NÃO desconsiderando automaticamente: {chave_original[:20]}...")
        else:
            # VALORES IGUAIS: Marcar como desconsiderada automaticamente
            result = await db.xml_documents.update_one(
                {
                    "company_id": company_id,
                    "chave_nfe": chave_original,
                    "desconsiderada_devolucao": {"$ne": True}  # Não re-marcar
                },
                {
                    "$set": {
                        "desconsiderada_devolucao": True,
                        "motivo_desconsideracao": f"Devolução de fornecedor (SIEG): {dev.get('motivo')}. Valor igual.",
                        "nfe_vinculada_devolucao": dev.get("chave_devolucao"),
                        "status_validacao": "desconsiderada"
                    }
                }
            )
            
            if result.modified_count > 0:
                total_marcadas += 1
    
    logger.info(f"[SMART SYNC] {total_marcadas} notas marcadas como devolvidas, {len(divergencias_para_analise)} com divergência para análise")
    return total_marcadas, divergencias_para_analise


async def filtrar_xmls_novos(
    xmls: List[Dict],
    chaves_ja_importadas: set
) -> Tuple[List[Dict], int]:
    """
    Filtra XMLs para retornar apenas os que ainda não foram importados.
    
    Returns:
        (xmls_novos, total_duplicados)
    """
    xmls_novos = []
    duplicados = 0
    sem_chave = 0
    
    logger.info(f"[SMART SYNC] Iniciando filtro: {len(xmls)} XMLs recebidos, {len(chaves_ja_importadas)} chaves já importadas")
    
    for xml_info in xmls:
        xml_content = xml_info.get("xml", "")
        
        if not xml_content:
            logger.warning(f"[SMART SYNC] XML vazio encontrado, ignorando")
            continue
        
        # Extrair chave do XML
        import re
        chave_match = re.search(r'<chNFe>(\d{44})</chNFe>', xml_content)
        if not chave_match:
            # Tentar formato alternativo
            chave_match = re.search(r'Id="NFe(\d{44})"', xml_content)
        
        if not chave_match:
            # Tentar mais formatos (infNFe Id)
            chave_match = re.search(r'<infNFe[^>]*Id="NFe(\d{44})"', xml_content)
        
        if chave_match:
            chave = chave_match.group(1)
            if chave in chaves_ja_importadas:
                duplicados += 1
                logger.debug(f"[SMART SYNC] XML duplicado: chave {chave[:20]}...")
                continue
            else:
                logger.debug(f"[SMART SYNC] XML novo: chave {chave[:20]}...")
        else:
            # XML sem chave - ainda assim adiciona para processamento
            # O parse posterior pode extrair a chave
            sem_chave += 1
            logger.warning(f"[SMART SYNC] XML sem chave NFe detectável (tamanho: {len(xml_content)} chars). Adicionando para processamento.")
        
        xmls_novos.append(xml_info)
    
    logger.info(f"[SMART SYNC] Resultado filtro: {len(xmls_novos)} novos, {duplicados} duplicados, {sem_chave} sem chave")
    return xmls_novos, duplicados


async def registrar_sync_log(
    db,
    company_id: str,
    competencia: str,
    status: str,
    stats: Dict[str, Any]
) -> str:
    """
    Registra o log da sincronização no banco.
    ATUALIZADO: Inclui relatório detalhado igual ao upload manual.
    """
    import uuid
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "competencia": competencia,
        "data_sync": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "modo": stats.get("modo", "incremental"),  # "full" ou "incremental"
        "total_encontrados": stats.get("total_encontrados", 0),
        "total_novos": stats.get("total_novos", 0),
        "total_duplicados": stats.get("total_duplicados", 0),
        "total_importados": stats.get("total_importados", 0),
        "total_cancelamentos": stats.get("total_cancelamentos", 0),
        "total_devolucoes": stats.get("total_devolucoes", 0),
        "total_erros": stats.get("total_erros", 0),
        "duracao_segundos": stats.get("duracao_segundos", 0),
        "detalhes": stats.get("detalhes", {}),
        "entradas": stats.get("entradas", {}),
        "saidas": stats.get("saidas", {}),
        # Relatório detalhado igual ao upload manual
        "relatorio_detalhado": {
            "notas_importadas": stats.get("notas_importadas", []),
            "notas_duplicadas": stats.get("notas_duplicadas", []),
            "notas_canceladas": stats.get("notas_canceladas", []),
            "devolucoes_detectadas": stats.get("devolucoes_detectadas", []),
            "conversoes_cfop": stats.get("conversoes_cfop", []),
            "erros": stats.get("erros", []),
            "resumo_classificacao": stats.get("resumo_classificacao", {
                "total": 0,
                "from_cache": 0,
                "from_rules": 0,
                "from_ai": 0
            })
        }
    }
    
    await db.sieg_sync_logs.insert_one(log_entry)
    return log_entry["id"]



async def detectar_notas_excluidas_para_reimportar(
    db,
    company_id: str,
    competencia: str,
    chaves_sieg: set
) -> Dict[str, Any]:
    """
    Detecta notas que foram excluídas pelo usuário mas ainda existem no SIEG.
    Essas notas devem ser reimportadas.
    
    LÓGICA:
    1. O usuário exclui manualmente uma nota do sistema (ou exclui todo o mês)
    2. Na próxima sincronização, o SIEG traz as mesmas notas
    3. Como a nota não existe mais no banco, ela deve ser reimportada
    
    Esta função identifica quais chaves do SIEG NÃO existem mais no banco
    (foram excluídas) e devem ser reimportadas.
    
    Returns:
        {
            "chaves_para_reimportar": set(),
            "total": int
        }
    """
    if not chaves_sieg:
        return {"chaves_para_reimportar": set(), "total": 0}
    
    # Buscar todas as chaves que existem no banco para esta competência
    docs_existentes = await db.xml_documents.find(
        {
            "company_id": company_id,
            "competencia": competencia,
            "chave_nfe": {"$exists": True, "$ne": ""}
        },
        {"chave_nfe": 1, "_id": 0}
    ).to_list(length=100000)
    
    chaves_existentes = {doc.get("chave_nfe") for doc in docs_existentes if doc.get("chave_nfe")}
    
    # Chaves do SIEG que não existem no banco = foram excluídas ou nunca importadas
    chaves_para_reimportar = chaves_sieg - chaves_existentes
    
    if chaves_para_reimportar:
        logger.info(f"[SMART SYNC] {len(chaves_para_reimportar)} notas do SIEG não existem no banco (excluídas ou novas)")
    
    return {
        "chaves_para_reimportar": chaves_para_reimportar,
        "total": len(chaves_para_reimportar)
    }


async def sincronizar_cancelamentos_sieg(
    db,
    company_id: str,
    competencia: str,
    xmls_sieg: List[Dict]
) -> Dict[str, Any]:
    """
    Sincroniza status de cancelamento entre SIEG e banco local.
    
    IMPORTANTE: Esta função deve ser chamada em TODA sincronização SIEG.
    
    1. Verifica eventos de cancelamento nos XMLs do SIEG
    2. Marca notas canceladas no banco local
    3. Remove notas do SIEG que foram canceladas (para evitar reimportação)
    
    Returns:
        {
            "notas_canceladas": List de chaves,
            "total_cancelados": int,
            "xmls_filtrados": List de XMLs sem os cancelados
        }
    """
    import re
    
    cancelamentos = await verificar_cancelamentos_posteriores(
        db=db,
        company_id=company_id,
        competencia=competencia,
        chaves_sieg=None,
        xmls_sieg=xmls_sieg
    )
    
    total_processados = 0
    notas_canceladas = []
    
    if cancelamentos["canceladas"]:
        total_processados = await processar_cancelamentos(db, company_id, cancelamentos["canceladas"])
        notas_canceladas = [c["chave"] for c in cancelamentos["canceladas"]]
    
    # Filtrar XMLs para remover os cancelados
    chaves_canceladas = set(notas_canceladas)
    xmls_filtrados = []
    
    for xml_info in xmls_sieg:
        xml_content = xml_info.get("xml", "")
        if not xml_content:
            continue
        
        # Extrair chave
        chave_match = re.search(r'<chNFe>(\d{44})</chNFe>', xml_content)
        if not chave_match:
            chave_match = re.search(r'Id="NFe(\d{44})"', xml_content)
        
        if chave_match:
            chave = chave_match.group(1)
            if chave in chaves_canceladas:
                logger.info(f"[SMART SYNC] Removendo XML cancelado do processamento: {chave[:20]}...")
                continue
        
        xmls_filtrados.append(xml_info)
    
    return {
        "notas_canceladas": notas_canceladas,
        "total_cancelados": total_processados,
        "xmls_filtrados": xmls_filtrados
    }
