"""
Sistema de Importação em Lote de XMLs
=====================================
Este módulo permite importar XMLs automaticamente de uma estrutura de pastas,
distribuindo cada arquivo para a empresa correta baseado no código da pasta.

Estrutura esperada:
/base_path/
└── 0175 - BUSINESS CONTABILIDADE/
    └── 2026/
        └── 002 - FISCAL/
            └── 01/  (janeiro)
                ├── nota1.xml
                ├── lote.zip
                └── subpasta/
                    └── nota2.xml

Uso:
    python batch_import.py --path /Volumes/SHARE/Operacional/Clientes/Ativos --api-url https://seu-servidor.com
"""

import os
import re
import sys
import json
import asyncio
import aiohttp
import zipfile
import tempfile
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
import argparse

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/batch_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class ImportResult:
    """Resultado da importação de uma empresa"""
    codigo_empresa: str
    nome_empresa: str
    company_id: str = ""
    total_arquivos: int = 0
    importados: int = 0
    duplicados: int = 0
    erros: int = 0
    desconsiderados: int = 0
    arquivos_processados: List[str] = field(default_factory=list)
    erros_detalhados: List[Dict] = field(default_factory=list)
    tempo_processamento: float = 0.0


@dataclass
class BatchImportReport:
    """Relatório completo da importação em lote"""
    inicio: str = ""
    fim: str = ""
    tempo_total: float = 0.0
    total_empresas: int = 0
    total_arquivos: int = 0
    total_importados: int = 0
    total_duplicados: int = 0
    total_erros: int = 0
    empresas_processadas: List[ImportResult] = field(default_factory=list)
    empresas_nao_encontradas: List[str] = field(default_factory=list)
    erros_gerais: List[str] = field(default_factory=list)


class BatchImporter:
    """Importador em lote de XMLs"""
    
    def __init__(self, api_url: str, token: str):
        self.api_url = api_url.rstrip('/')
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}'
        }
        self.companies_cache: Dict[str, Dict] = {}
        
    async def load_companies(self, session: aiohttp.ClientSession) -> bool:
        """Carrega todas as empresas do sistema para cache"""
        try:
            async with session.get(
                f'{self.api_url}/api/companies',
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    companies = data if isinstance(data, list) else data.get('companies', [])
                    
                    for company in companies:
                        codigo = company.get('codigo_empresa', '').strip()
                        if codigo:
                            # Normalizar código (remover zeros à esquerda se necessário)
                            self.companies_cache[codigo] = company
                            # Também indexar com zeros à esquerda (4 dígitos)
                            codigo_padded = codigo.zfill(4)
                            self.companies_cache[codigo_padded] = company
                    
                    logger.info(f"Carregadas {len(companies)} empresas, {len(self.companies_cache)} com código")
                    return True
                else:
                    logger.error(f"Erro ao carregar empresas: {resp.status}")
                    return False
        except Exception as e:
            logger.error(f"Exceção ao carregar empresas: {e}")
            return False
    
    def extract_codigo_from_folder(self, folder_name: str) -> Optional[str]:
        """Extrai o código da empresa do nome da pasta"""
        # Padrão: "0175 - NOME DA EMPRESA" ou "175 - NOME"
        match = re.match(r'^(\d+)\s*-\s*', folder_name)
        if match:
            return match.group(1).zfill(4)  # Padronizar para 4 dígitos
        return None
    
    def extract_competencia_from_path(self, path: Path, base_path: Path) -> Optional[str]:
        """Extrai a competência (MM/YYYY) do caminho do arquivo"""
        # Estrutura: EMPRESA/ANO/002 - FISCAL/MES/arquivo.xml
        try:
            relative = path.relative_to(base_path)
            parts = relative.parts
            
            # Procurar por ano (4 dígitos) e mês (1-2 dígitos)
            ano = None
            mes = None
            
            for part in parts:
                # Ano: 2024, 2025, 2026, etc.
                if re.match(r'^20\d{2}$', part):
                    ano = part
                # Mês: 01, 02, ..., 12 ou 1, 2, ..., 12
                elif re.match(r'^(0?[1-9]|1[0-2])$', part):
                    mes = part.zfill(2)
            
            if ano and mes:
                return f"{mes}/{ano}"
            elif ano:
                # Se não encontrou mês, usar mês atual
                return f"{datetime.now().strftime('%m')}/{ano}"
            
            return None
        except Exception:
            return None
    
    def find_xml_files(self, base_path: Path) -> Dict[str, List[Tuple[Path, str]]]:
        """
        Varre a estrutura de pastas e retorna XMLs agrupados por código de empresa.
        
        Retorna: {codigo_empresa: [(caminho_arquivo, competencia), ...]}
        """
        result: Dict[str, List[Tuple[Path, str]]] = {}
        
        if not base_path.exists():
            logger.error(f"Caminho não existe: {base_path}")
            return result
        
        # Iterar sobre pastas de empresas (primeiro nível)
        for empresa_folder in base_path.iterdir():
            if not empresa_folder.is_dir():
                continue
            
            codigo = self.extract_codigo_from_folder(empresa_folder.name)
            if not codigo:
                logger.warning(f"Pasta sem código válido: {empresa_folder.name}")
                continue
            
            if codigo not in result:
                result[codigo] = []
            
            # Buscar XMLs recursivamente
            for xml_file in empresa_folder.rglob('*.xml'):
                competencia = self.extract_competencia_from_path(xml_file, empresa_folder)
                result[codigo].append((xml_file, competencia))
            
            # Buscar ZIPs e extrair XMLs
            for zip_file in empresa_folder.rglob('*.zip'):
                try:
                    with zipfile.ZipFile(zip_file, 'r') as zf:
                        competencia = self.extract_competencia_from_path(zip_file, empresa_folder)
                        # Extrair para pasta temporária
                        temp_dir = tempfile.mkdtemp()
                        zf.extractall(temp_dir)
                        
                        # Buscar XMLs extraídos
                        for xml_file in Path(temp_dir).rglob('*.xml'):
                            result[codigo].append((xml_file, competencia))
                except Exception as e:
                    logger.warning(f"Erro ao processar ZIP {zip_file}: {e}")
        
        return result
    
    async def import_files_for_company(
        self, 
        session: aiohttp.ClientSession,
        company: Dict,
        files: List[Tuple[Path, str]],
        default_competencia: str
    ) -> ImportResult:
        """Importa arquivos para uma empresa específica"""
        
        result = ImportResult(
            codigo_empresa=company.get('codigo_empresa', ''),
            nome_empresa=company.get('razao_social', company.get('nome_fantasia', '')),
            company_id=company.get('id', '')
        )
        
        start_time = datetime.now()
        result.total_arquivos = len(files)
        
        # Agrupar arquivos por competência
        files_by_competencia: Dict[str, List[Path]] = {}
        for file_path, competencia in files:
            comp = competencia or default_competencia
            if comp not in files_by_competencia:
                files_by_competencia[comp] = []
            files_by_competencia[comp].append(file_path)
        
        # Processar cada competência
        for competencia, comp_files in files_by_competencia.items():
            # Determinar tipo (entrada/saída) - por padrão, entrada
            tipo = 'entrada'
            
            # Preparar FormData
            form_data = aiohttp.FormData()
            form_data.add_field('company_id', company['id'])
            form_data.add_field('competencia', competencia)
            form_data.add_field('tipo', tipo)
            form_data.add_field('skip_ai', 'false')
            
            # Adicionar arquivos
            for file_path in comp_files:
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    form_data.add_field(
                        'files',
                        content,
                        filename=file_path.name,
                        content_type='application/xml'
                    )
                    result.arquivos_processados.append(str(file_path))
                except Exception as e:
                    result.erros += 1
                    result.erros_detalhados.append({
                        'arquivo': str(file_path),
                        'erro': str(e)
                    })
            
            # Enviar para API
            try:
                async with session.post(
                    f'{self.api_url}/api/xml/upload-stream',
                    headers={'Authorization': f'Bearer {self.token}'},
                    data=form_data,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        result.importados += data.get('importados', 0)
                        result.duplicados += data.get('duplicados', 0)
                        result.erros += len(data.get('erros', []))
                        result.desconsiderados += len(data.get('notas_devolucao_fornecedor', []))
                    else:
                        error_text = await resp.text()
                        logger.error(f"Erro na API: {resp.status} - {error_text[:200]}")
                        result.erros += len(comp_files)
                        result.erros_detalhados.append({
                            'competencia': competencia,
                            'erro': f'HTTP {resp.status}: {error_text[:200]}'
                        })
            except Exception as e:
                logger.error(f"Exceção ao enviar arquivos: {e}")
                result.erros += len(comp_files)
                result.erros_detalhados.append({
                    'competencia': competencia,
                    'erro': str(e)
                })
        
        result.tempo_processamento = (datetime.now() - start_time).total_seconds()
        return result
    
    async def run_batch_import(
        self, 
        base_path: str,
        default_competencia: Optional[str] = None
    ) -> BatchImportReport:
        """Executa a importação em lote completa"""
        
        report = BatchImportReport()
        report.inicio = datetime.now(timezone.utc).isoformat()
        start_time = datetime.now()
        
        if not default_competencia:
            now = datetime.now()
            default_competencia = f"{now.strftime('%m')}/{now.strftime('%Y')}"
        
        async with aiohttp.ClientSession() as session:
            # Carregar empresas
            if not await self.load_companies(session):
                report.erros_gerais.append("Falha ao carregar empresas do sistema")
                return report
            
            # Encontrar arquivos
            base = Path(base_path)
            logger.info(f"Buscando XMLs em: {base}")
            files_by_company = self.find_xml_files(base)
            
            report.total_empresas = len(files_by_company)
            logger.info(f"Encontradas {report.total_empresas} pastas de empresas")
            
            # Processar cada empresa
            for codigo, files in files_by_company.items():
                company = self.companies_cache.get(codigo)
                
                if not company:
                    logger.warning(f"Empresa não encontrada para código: {codigo}")
                    report.empresas_nao_encontradas.append(codigo)
                    continue
                
                logger.info(f"Processando {len(files)} arquivos para {company.get('razao_social', codigo)}")
                
                result = await self.import_files_for_company(
                    session, company, files, default_competencia
                )
                
                report.empresas_processadas.append(result)
                report.total_arquivos += result.total_arquivos
                report.total_importados += result.importados
                report.total_duplicados += result.duplicados
                report.total_erros += result.erros
        
        report.fim = datetime.now(timezone.utc).isoformat()
        report.tempo_total = (datetime.now() - start_time).total_seconds()
        
        return report
    
    def generate_report_text(self, report: BatchImportReport) -> str:
        """Gera relatório em texto"""
        lines = [
            "=" * 60,
            "RELATÓRIO DE IMPORTAÇÃO EM LOTE",
            "=" * 60,
            f"Início: {report.inicio}",
            f"Fim: {report.fim}",
            f"Tempo total: {report.tempo_total:.2f} segundos",
            "",
            "RESUMO GERAL",
            "-" * 40,
            f"Empresas processadas: {len(report.empresas_processadas)}",
            f"Empresas não encontradas: {len(report.empresas_nao_encontradas)}",
            f"Total de arquivos: {report.total_arquivos}",
            f"Importados: {report.total_importados}",
            f"Duplicados: {report.total_duplicados}",
            f"Erros: {report.total_erros}",
            "",
        ]
        
        if report.empresas_nao_encontradas:
            lines.extend([
                "EMPRESAS NÃO ENCONTRADAS",
                "-" * 40,
            ])
            for codigo in report.empresas_nao_encontradas:
                lines.append(f"  - Código: {codigo}")
            lines.append("")
        
        lines.extend([
            "DETALHES POR EMPRESA",
            "-" * 40,
        ])
        
        for empresa in report.empresas_processadas:
            lines.extend([
                f"\n{empresa.codigo_empresa} - {empresa.nome_empresa}",
                f"  Arquivos: {empresa.total_arquivos}",
                f"  Importados: {empresa.importados}",
                f"  Duplicados: {empresa.duplicados}",
                f"  Desconsiderados: {empresa.desconsiderados}",
                f"  Erros: {empresa.erros}",
                f"  Tempo: {empresa.tempo_processamento:.2f}s",
            ])
            
            if empresa.erros_detalhados:
                lines.append("  Erros detalhados:")
                for err in empresa.erros_detalhados[:5]:
                    lines.append(f"    - {err}")
        
        if report.erros_gerais:
            lines.extend([
                "",
                "ERROS GERAIS",
                "-" * 40,
            ])
            for erro in report.erros_gerais:
                lines.append(f"  - {erro}")
        
        lines.append("=" * 60)
        return "\n".join(lines)


async def main():
    parser = argparse.ArgumentParser(description='Importação em lote de XMLs')
    parser.add_argument('--path', required=True, help='Caminho base das pastas de empresas')
    parser.add_argument('--api-url', required=True, help='URL da API do Aurion')
    parser.add_argument('--token', help='Token de autenticação (ou use --email/--password)')
    parser.add_argument('--email', help='Email para login')
    parser.add_argument('--password', help='Senha para login')
    parser.add_argument('--competencia', help='Competência padrão (MM/YYYY)')
    parser.add_argument('--output', help='Arquivo para salvar relatório')
    
    args = parser.parse_args()
    
    # Obter token
    token = args.token
    if not token and args.email and args.password:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{args.api_url}/api/auth/login',
                json={'email': args.email, 'password': args.password}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    token = data.get('access_token')
                else:
                    print(f"Erro no login: {resp.status}")
                    sys.exit(1)
    
    if not token:
        print("Token de autenticação necessário. Use --token ou --email/--password")
        sys.exit(1)
    
    # Executar importação
    importer = BatchImporter(args.api_url, token)
    report = await importer.run_batch_import(args.path, args.competencia)
    
    # Gerar relatório
    report_text = importer.generate_report_text(report)
    print(report_text)
    
    # Salvar relatório
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report_text)
        print(f"\nRelatório salvo em: {args.output}")
    
    # Salvar JSON também
    json_output = args.output.replace('.txt', '.json') if args.output else '/tmp/batch_import_report.json'
    with open(json_output, 'w') as f:
        json.dump(asdict(report), f, indent=2, default=str)
    print(f"Relatório JSON salvo em: {json_output}")


if __name__ == '__main__':
    asyncio.run(main())
