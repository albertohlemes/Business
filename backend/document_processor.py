"""
Módulo de processamento de documentos com OCR local e IA opcional.
Usa OCR local (Tesseract) para extrair texto e Google AI Studio para análise complexa.
"""
import os
import re
import tempfile
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Processador de documentos com OCR local"""
    
    def __init__(self):
        self.tesseract_lang = 'por'  # Português
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extrai texto de PDF usando PyMuPDF (rápido) ou OCR (para imagens)"""
        try:
            doc = fitz.open(pdf_path)
            text_parts = []
            
            for page_num, page in enumerate(doc):
                # Tenta extrair texto direto primeiro (mais rápido)
                text = page.get_text()
                
                # Se não tem texto suficiente, usa OCR
                if len(text.strip()) < 50:
                    # Renderiza página como imagem
                    pix = page.get_pixmap(dpi=200)
                    img = Image.open(io.BytesIO(pix.tobytes()))
                    text = pytesseract.image_to_string(img, lang=self.tesseract_lang)
                
                text_parts.append(text)
            
            doc.close()
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"Erro ao extrair texto do PDF: {e}")
            return ""
    
    def extract_text_from_image(self, image_path: str) -> str:
        """Extrai texto de imagem usando OCR"""
        try:
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img, lang=self.tesseract_lang)
            return text
        except Exception as e:
            logger.error(f"Erro ao extrair texto da imagem: {e}")
            return ""
    
    def extract_text(self, file_path: str) -> str:
        """Extrai texto de qualquer arquivo suportado"""
        suffix = Path(file_path).suffix.lower()
        logger.info(f"extract_text: arquivo={file_path}, extensão={suffix}")
        
        if suffix == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif suffix in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']:
            return self.extract_text_from_image(file_path)
        elif suffix in ['.txt', '.csv']:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    logger.info(f"Lido arquivo texto: {len(content)} caracteres")
                    return content
            except Exception as e:
                logger.error(f"Erro ao ler arquivo texto: {e}")
                return ""
        elif suffix in ['.xlsx', '.xls']:
            # Tentar extrair texto de Excel
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
                text_parts = []
                for sheet in wb.worksheets:
                    for row in sheet.iter_rows(values_only=True):
                        row_text = ' '.join([str(cell) for cell in row if cell is not None])
                        if row_text.strip():
                            text_parts.append(row_text)
                wb.close()
                return '\n'.join(text_parts)
            except Exception as e:
                logger.error(f"Erro ao ler Excel: {e}")
                return ""
        else:
            logger.warning(f"Extensão não suportada: {suffix}")
            return ""
    
    def parse_colaboradores_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extrai colaboradores do texto usando regex e padrões inteligentes"""
        colaboradores = []
        
        # Normaliza o texto
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Padrões para extrair dados
        cpf_pattern = r'\b(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[-.\s]?(\d{2})\b'
        salario_pattern = r'(?:R\$|RS)\s*([\d.,]+)|(\d{1,2}[.,]\d{3}[.,]\d{2})'
        data_pattern = r'\b(\d{2}[/.-]\d{2}[/.-]\d{4})\b'
        
        # Divide em blocos que podem conter colaboradores diferentes
        # Procura por padrões de separação comuns em fichas de registro
        
        # Método 1: Procurar por CPFs e extrair dados ao redor
        cpf_matches = list(re.finditer(cpf_pattern, text))
        
        for i, cpf_match in enumerate(cpf_matches):
            cpf = f"{cpf_match.group(1)}.{cpf_match.group(2)}.{cpf_match.group(3)}-{cpf_match.group(4)}"
            
            # Define a região de texto para este colaborador
            start = cpf_match.start() - 500 if cpf_match.start() > 500 else 0
            end = cpf_matches[i+1].start() if i+1 < len(cpf_matches) else cpf_match.end() + 500
            end = min(end, len(text))
            
            region = text[start:end]
            
            colab = {
                'nome': '',
                'cpf': cpf,
                'cargo': '',
                'salario_base': 0,
                'data_admissao': '',
                'data_nascimento': '',
                'rg': '',
                'pis': '',
                'ctps': '',
                'endereco': '',
                'cidade': '',
                'uf': ''
            }
            
            # Extrai nome (geralmente em maiúsculas perto do CPF)
            # Procura linhas em maiúsculas que parecem nomes
            lines = region.split('\n')
            for line in lines:
                line = line.strip()
                # Nome geralmente é uma linha em maiúsculas com 2+ palavras
                if re.match(r'^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{4,50}$', line):
                    # Verifica se não é um cargo comum
                    if not any(x in line.upper() for x in ['CARGO', 'FUNÇÃO', 'ADMISSÃO', 'SALÁRIO', 'CPF', 'RG', 'DATA']):
                        colab['nome'] = line.title()
                        break
            
            # Se não achou nome em maiúsculas, tenta outros padrões
            if not colab['nome']:
                nome_match = re.search(r'(?:Nome|NOME)[:\s]*([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]{3,50})', region)
                if nome_match:
                    colab['nome'] = nome_match.group(1).strip().title()
            
            # Extrai salário
            salario_matches = re.findall(salario_pattern, region)
            for sal_tuple in salario_matches:
                sal = sal_tuple[0] or sal_tuple[1]
                if sal:
                    try:
                        # Remove pontos de milhar e troca vírgula por ponto
                        sal_clean = sal.replace('.', '').replace(',', '.')
                        valor = float(sal_clean)
                        if 500 < valor < 50000:  # Faixa razoável de salário
                            colab['salario_base'] = valor
                            break
                    except:
                        pass
            
            # Extrai datas
            datas = re.findall(data_pattern, region)
            for data in datas:
                data_norm = data.replace('-', '/').replace('.', '/')
                # Tenta identificar se é admissão ou nascimento pelo contexto
                idx = region.find(data)
                context = region[max(0, idx-30):idx].lower()
                if 'admis' in context or 'contrat' in context:
                    colab['data_admissao'] = data_norm
                elif 'nasc' in context:
                    colab['data_nascimento'] = data_norm
                elif not colab['data_admissao']:
                    colab['data_admissao'] = data_norm
            
            # Extrai cargo
            cargo_match = re.search(r'(?:Cargo|CARGO|Função|FUNÇÃO)[:\s]*([A-Za-záéíóúâêôãõç\s]{3,40})', region)
            if cargo_match:
                colab['cargo'] = cargo_match.group(1).strip().title()
            
            # Extrai RG
            rg_match = re.search(r'(?:RG|R\.G\.)[:\s]*([0-9.\-X]{5,15})', region, re.IGNORECASE)
            if rg_match:
                colab['rg'] = rg_match.group(1).strip()
            
            # Extrai PIS
            pis_match = re.search(r'(?:PIS|NIS|PASEP)[:\s]*([0-9.\-]{10,15})', region, re.IGNORECASE)
            if pis_match:
                colab['pis'] = pis_match.group(1).strip()
            
            # Só adiciona se tiver nome ou CPF válido
            if colab['nome'] or (colab['cpf'] and len(colab['cpf']) == 14):
                colaboradores.append(colab)
        
        # Remove duplicatas por CPF
        seen_cpfs = set()
        unique_colabs = []
        for c in colaboradores:
            if c['cpf'] not in seen_cpfs:
                seen_cpfs.add(c['cpf'])
                unique_colabs.append(c)
        
        return unique_colabs
    
    def parse_holerite_from_text(self, text: str) -> Dict[str, Any]:
        """Extrai dados de holerite do texto"""
        dados = {
            'funcionario': '',
            'competencia': '',
            'proventos': [],
            'descontos': [],
            'total_proventos': 0,
            'total_descontos': 0,
            'liquido': 0
        }
        
        # Extrai nome do funcionário (limita a 50 chars e remove quebras de linha)
        nome_match = re.search(r'(?:Funcionário|Nome|FUNCIONÁRIO|NOME)[:\s]*([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]+)', text)
        if nome_match:
            nome = nome_match.group(1).strip().split('\n')[0].strip()
            dados['funcionario'] = nome[:50]
        
        # Extrai competência (MM/AAAA ou MM/AA)
        comp_match = re.search(r'(?:Competência|Referência|MÊS|Competencia)[:\s]*(\d{2}/\d{2,4})', text, re.IGNORECASE)
        if comp_match:
            dados['competencia'] = comp_match.group(1)
        
        def parse_valor(valor_str: str) -> float:
            """Converte string de valor para float, detectando formato BR ou US"""
            valor_str = valor_str.strip()
            
            # Se tem vírgula E ponto, é formato brasileiro (1.234,56)
            if ',' in valor_str and '.' in valor_str:
                return float(valor_str.replace('.', '').replace(',', '.'))
            
            # Se só tem vírgula, verifica se é decimal ou milhar
            if ',' in valor_str:
                partes = valor_str.split(',')
                if len(partes) == 2 and len(partes[1]) <= 2:
                    # Formato brasileiro: 1234,56
                    return float(valor_str.replace(',', '.'))
                else:
                    # Vírgula como separador de milhar: 1,234
                    return float(valor_str.replace(',', ''))
            
            # Se só tem ponto, verifica se é decimal ou milhar
            if '.' in valor_str:
                partes = valor_str.split('.')
                if len(partes) == 2 and len(partes[1]) <= 2:
                    # Formato americano com 2 casas: 1234.56
                    return float(valor_str)
                elif len(partes) > 2:
                    # Múltiplos pontos = separador de milhar BR: 1.234.567
                    return float(valor_str.replace('.', ''))
                else:
                    # Um ponto com mais de 2 casas = milhar: 1.234 (mil)
                    if len(partes[1]) == 3:
                        return float(valor_str.replace('.', ''))
                    return float(valor_str)
            
            # Sem separadores
            return float(valor_str)
        
        # Extrai valores monetários - padrões mais específicos
        # Padrão 1: "Descrição    valor" (espaços entre texto e número)
        valores = re.findall(r'([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s%\d]+?)\s{2,}([\d.,]+)\s*$', text, re.MULTILINE)
        
        # Padrão 2: "R$ valor" ou "RS valor"  
        valores_rs = re.findall(r'(?:R\$|RS)\s*([\d.,]+)', text, re.IGNORECASE)
        
        # Palavras-chave para descontos
        palavras_desconto = ['INSS', 'IRRF', 'IR ', 'DESC', 'FALTA', 'ATRASO', 'VT', 'PENSÃO', 'VALE TRANSPORTE', 
                           'CONTRIBUIÇÃO', 'EMPRÉSTIMO', 'ADIANTAMENTO', 'DESCONTO', 'TOTAL DESC']
        
        # Palavras-chave para totais (não incluir como itens individuais)
        palavras_total = ['TOTAL PROVENTOS', 'TOTAL DESCONTOS', 'LÍQUIDO', 'LIQUIDO', 'TOTAL PROV', 
                         'A RECEBER', 'VALOR LIQUIDO']
        
        proventos_adicionados = set()
        descontos_adicionados = set()
        
        for desc, valor in valores:
            try:
                desc_upper = desc.upper().strip()
                v = parse_valor(valor)
                
                # Ignorar valores muito baixos ou muito altos (provavelmente erros)
                if v <= 0.01 or v > 100000:
                    continue
                
                # Verificar se é um total - extrair mas não adicionar às listas
                is_total = any(t in desc_upper for t in palavras_total)
                
                if 'TOTAL PROVENTOS' in desc_upper or 'TOTAL PROV' in desc_upper:
                    dados['total_proventos'] = v
                    continue
                elif 'TOTAL DESCONTOS' in desc_upper or 'TOTAL DESC' in desc_upper:
                    dados['total_descontos'] = v
                    continue
                elif 'LÍQUIDO' in desc_upper or 'LIQUIDO' in desc_upper or 'A RECEBER' in desc_upper:
                    dados['liquido'] = v
                    continue
                
                if is_total:
                    continue
                
                item = {'descricao': desc.strip(), 'valor': v}
                
                # Classifica como provento ou desconto
                if any(x in desc_upper for x in palavras_desconto):
                    if valor not in descontos_adicionados:
                        dados['descontos'].append(item)
                        descontos_adicionados.add(valor)
                else:
                    if valor not in proventos_adicionados:
                        dados['proventos'].append(item)
                        proventos_adicionados.add(valor)
            except Exception as e:
                logger.debug(f"Erro ao parsear valor '{valor}': {e}")
                pass
        
        # Se não extraiu totais específicos, calcula
        if dados['total_proventos'] == 0 and dados['proventos']:
            dados['total_proventos'] = round(sum(p['valor'] for p in dados['proventos']), 2)
        if dados['total_descontos'] == 0 and dados['descontos']:
            dados['total_descontos'] = round(sum(d['valor'] for d in dados['descontos']), 2)
        if dados['liquido'] == 0 and (dados['total_proventos'] or dados['total_descontos']):
            dados['liquido'] = round(dados['total_proventos'] - dados['total_descontos'], 2)
        
        return dados
    
    def parse_folha_multiplos_colaboradores(self, text: str) -> List[Dict[str, Any]]:
        """
        Extrai dados de MÚLTIPLOS colaboradores de uma folha de pagamento.
        Otimizado para o formato SCI Único.
        """
        colaboradores = []
        
        def parse_valor(valor_str: str) -> float:
            """Converte string de valor brasileiro para float"""
            if not valor_str:
                return 0.0
            valor_str = valor_str.strip().replace(' ', '')
            if not valor_str or valor_str == '-':
                return 0.0
            # Formato brasileiro: 1.234,56
            if ',' in valor_str:
                valor_str = valor_str.replace('.', '').replace(',', '.')
            try:
                return float(valor_str)
            except:
                return 0.0
        
        # ===== FORMATO SCI ÚNICO =====
        # Separar por "Nome do Colaborador" ou "RECIBO DE PAGAMENTO"
        # Cada colaborador aparece 2 vezes (duplicado)
        
        # Padrão para encontrar blocos de colaborador
        # Formato: "Nome do Colaborador\nNOME_AQUI" ou "Código\n000XXX"
        
        # Dividir por padrão de início de recibo
        partes = re.split(r'RECIBO DE PAGAMENTO DE SALÁRIO', text, flags=re.IGNORECASE)
        
        # Se não dividiu, tentar por "Nome do Colaborador"
        if len(partes) <= 1:
            partes = re.split(r'Nome do Colaborador\n', text, flags=re.IGNORECASE)
        
        logger.info(f"Encontradas {len(partes)} partes no documento")
        
        for parte in partes:
            if len(parte.strip()) < 100:  # Muito curto
                continue
            
            colab = self._extract_colaborador_sci_v2(parte, parse_valor)
            if colab and colab.get('nome'):
                colaboradores.append(colab)
        
        # Remover duplicatas (SCI duplica cada página)
        seen = set()
        unique = []
        for c in colaboradores:
            # Usar CPF ou matrícula como chave
            key = c.get('cpf') or c.get('matricula') or c.get('nome', '').upper().strip()
            if key and key not in seen:
                seen.add(key)
                unique.append(c)
        
        logger.info(f"Extraídos {len(unique)} colaboradores únicos")
        return unique if unique else [self.parse_holerite_from_text(text)]
    
    def _extract_colaborador_sci_v2(self, block: str, parse_valor) -> Dict[str, Any]:
        """Extrai dados de um colaborador no formato SCI Único v2"""
        colab = {
            'nome': '',
            'cpf': '',
            'matricula': '',
            'cargo': '',
            'funcao': '',
            'competencia': '',
            'proventos': [],
            'descontos': [],
            'total_proventos': 0,
            'total_descontos': 0,
            'liquido': 0,
            'salario_base': 0,
            'vale_compras': 0,
            'vale_transporte': 0,
            'vale_refeicao': 0,
            'vale_alimentacao': 0,
            'horas_extras': 0,
            'horas_extras_50': 0,
            'horas_extras_100': 0,
            'dsr_horas_extras': 0,
            'adicional_noturno': 0,
            'quebra_caixa': 0,
            'inss': 0,
            'irrf': 0,
            'fgts': 0,
            'faltas': 0,
            'faltas_dias': 0,
            'contribuicao_assistencial': 0,
            'vale': 0,
        }
        
        lines = block.split('\n')
        
        # Extrair nome (aparece após "Nome do Colaborador")
        for i, line in enumerate(lines):
            if 'nome do colaborador' in line.lower():
                if i + 1 < len(lines):
                    nome = lines[i + 1].strip()
                    if nome and len(nome) > 3 and not any(x in nome.lower() for x in ['pis:', 'ctps:', 'cpf:']):
                        colab['nome'] = nome
                        break
        
        # Extrair código/matrícula
        for i, line in enumerate(lines):
            line_strip = line.strip()
            if line_strip.lower() == 'código':
                if i + 1 < len(lines):
                    mat = lines[i + 1].strip()
                    if mat.isdigit() and len(mat) >= 4:
                        colab['matricula'] = mat
                        break
        
        # Extrair CPF
        cpf_match = re.search(r'CPF[:\s]*(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[-.\s]?(\d{2})', block)
        if cpf_match:
            colab['cpf'] = f"{cpf_match.group(1)}.{cpf_match.group(2)}.{cpf_match.group(3)}-{cpf_match.group(4)}"
        
        # Extrair função
        funcao_match = re.search(r'Fun[çc][aã]o[:\s]*([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s\(\)\-]+)', block, re.IGNORECASE)
        if funcao_match:
            funcao = funcao_match.group(1).strip()
            if 'rua' in funcao.lower():
                funcao = funcao.split('RUA')[0].strip()
            colab['funcao'] = funcao
            colab['cargo'] = funcao
        
        # Extrair salário líquido
        liquido_match = re.search(r'SAL[AÁ]RIO\s+L[IÍ]QUIDO\s*\n?\s*R\$\s*([\d.,]+)', block, re.IGNORECASE)
        if liquido_match:
            colab['liquido'] = parse_valor(liquido_match.group(1))
        
        # ===== EXTRAÇÃO DE VALORES - FORMATO SCI =====
        # No formato SCI extraído por OCR, o VALOR aparece ANTES da descrição
        # Padrão: "VALOR\n DESCRIÇÃO\nCÓDIGO"
        
        # Buscar cada campo com valor ANTES da descrição
        extrair_campos = [
            # (regex, campo, é_desconto)
            (r'([\d.,]+)\s*\n\s*Vale compras', 'vale_compras', True),
            (r'([\d.,]+)\s*\n\s*Vale transporte', 'vale_transporte', True),
            (r'([\d.,]+)\s*\n\s*Vale refeição', 'vale_refeicao', True),
            (r'([\d.,]+)\s*\n\s*Vale alimentação', 'vale_alimentacao', True),
            (r'([\d.,]+)\s*\n\s*Vale\n', 'vale', True),  # Vale genérico
            (r'([\d.,]+)\s*\n\s*INSS', 'inss', True),
            (r'([\d.,]+)\s*\n\s*IRRF', 'irrf', True),
            (r'([\d.,]+)\s*\n\s*Contribui[çc][aã]o Assistencial', 'contribuicao_assistencial', True),
            (r'([\d.,]+)\s*\n\s*Faltas n[aã]o justificadas dias', 'faltas_dias', True),
            (r'([\d.,]+)\s*\n\s*Faltas n[aã]o justificadas horas', 'faltas', True),
            (r'([\d.,]+)\s*\n\s*DSR faltas', 'dsr_faltas', True),
            (r'([\d.,]+)\s*\n\s*Sal[aá]rio mensalista', 'salario_mensalista', False),
            (r'([\d.,]+)\s*\n\s*Quebra de caixa', 'quebra_caixa', False),
            (r'([\d.,]+)\s*\n\s*Horas extras 50', 'horas_extras_50', False),
            (r'([\d.,]+)\s*\n\s*Horas extras 100', 'horas_extras_100', False),
            (r'([\d.,]+)\s*\n\s*DSR horas extras', 'dsr_horas_extras', False),
            (r'([\d.,]+)\s*\n\s*Adicional noturno', 'adicional_noturno', False),
        ]
        
        for pattern, campo, is_desconto in extrair_campos:
            match = re.search(pattern, block, re.IGNORECASE)
            if match:
                valor = parse_valor(match.group(1))
                # Validar: descontos geralmente < 5000, proventos podem ser maiores
                if is_desconto and 0.01 < valor < 5000:
                    colab[campo] = valor
                elif not is_desconto and 0.01 < valor < 50000:
                    colab[campo] = valor
        
        # Extrair Valor FGTS
        valor_fgts_match = re.search(r'Valor\s+FGTS\s*\n?\s*([\d.,]+)', block, re.IGNORECASE)
        if valor_fgts_match:
            colab['fgts'] = parse_valor(valor_fgts_match.group(1))
        
        # Extrair salário base do rodapé
        salario_base_match = re.search(r'Sal[aá]rio\s+base\s*\n?\s*([\d.,]+)', block, re.IGNORECASE)
        if salario_base_match:
            colab['salario_base'] = parse_valor(salario_base_match.group(1))
        
        # Se não extraiu salário base do rodapé, usar salário mensalista
        if colab['salario_base'] == 0 and colab.get('salario_mensalista', 0) > 0:
            colab['salario_base'] = colab['salario_mensalista']
        
        # Calcular totais
        if colab['total_proventos'] == 0:
            proventos = [colab['salario_base'], colab['horas_extras'], colab['horas_extras_50'], 
                        colab['horas_extras_100'], colab['dsr_horas_extras'], colab['adicional_noturno'], 
                        colab['quebra_caixa']]
            colab['total_proventos'] = round(sum(p for p in proventos if p > 0), 2)
        
        if colab['total_descontos'] == 0:
            descontos = [colab['inss'], colab['irrf'], colab['contribuicao_assistencial'], 
                        colab['faltas'], colab['faltas_dias'], colab['vale_transporte'], 
                        colab['vale_compras'], colab['vale']]
            colab['total_descontos'] = round(sum(d for d in descontos if d > 0), 2)
        
        return colab
    
    async def extrair_referencias_apoio_ia(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Usa IA (Gemini) para extrair referências de valores de qualquer tipo de arquivo de apoio.
        Funciona com prints, emails, planilhas, PDFs - qualquer formato.
        Para imagens, envia diretamente para a IA sem OCR.
        """
        try:
            suffix = Path(file_path).suffix.lower()
            is_image = suffix in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
            
            referencias = []
            
            # Verificar chaves de IA disponíveis
            google_key = os.environ.get('GOOGLE_AI_API_KEY')
            emergent_key = os.environ.get('EMERGENT_LLM_KEY')
            
            if not google_key and not emergent_key:
                logger.warning("Nenhuma chave de IA disponível para análise de apoio")
                texto = self.extract_text(file_path)
                return self.parse_apoio_referencias(texto) if texto else []
            
            prompt = """Analise este documento e extraia TODAS as referências de valores por colaborador/funcionário.

O documento pode ser um email, planilha, print de tela, apontamento, ou qualquer outro formato.
Procure por informações como:
- Horas extras (quantidade ou valor)
- Vale compras / vale transporte / vale refeição / vale alimentação (valores)
- Faltas / atrasos (quantidade de dias ou horas)
- Comissões / bonificações
- Qualquer outro valor associado a um nome de pessoa

IMPORTANTE: 
- Extraia TODOS os colaboradores que encontrar
- Use o nome EXATO como aparece no documento
- Se houver valores, extraia o valor numérico

RETORNE APENAS UM JSON no formato:
{
  "referencias": [
    {
      "nome": "Nome do colaborador EXATAMENTE como aparece",
      "campo": "tipo do valor (ex: vale_compras, horas_extras, vale_transporte, faltas)",
      "valor": 123.45,
      "unidade": "horas" ou "reais" ou "dias",
      "texto_original": "trecho onde encontrou a informação"
    }
  ]
}

Se não encontrar nenhuma referência, retorne: {"referencias": []}
"""
            
            # Para imagens, usar a IA com a imagem diretamente
            if is_image and google_key:
                try:
                    import google.generativeai as genai
                    import PIL.Image
                    
                    genai.configure(api_key=google_key)
                    # Usar gemini-1.5-flash ou gemini-pro-vision
                    model = genai.GenerativeModel('gemini-2.0-flash')
                    
                    # Carregar imagem
                    img = PIL.Image.open(file_path)
                    
                    # Enviar imagem com prompt
                    response = model.generate_content([prompt, img])
                    response_text = response.text
                    
                    # Parsear JSON
                    if '```json' in response_text:
                        response_text = response_text.split('```json')[1].split('```')[0]
                    elif '```' in response_text:
                        response_text = response_text.split('```')[1].split('```')[0]
                    
                    import json
                    data = json.loads(response_text.strip())
                    referencias = data.get('referencias', [])
                    logger.info(f"IA (imagem) extraiu {len(referencias)} referências")
                    
                except Exception as e:
                    logger.error(f"Erro ao usar Google AI com imagem: {e}")
            
            # Para outros arquivos ou fallback, extrair texto primeiro
            if not referencias:
                texto = self.extract_text(file_path)
                if not texto:
                    logger.warning(f"Não foi possível extrair texto de {file_path}")
                    return []
                
                prompt_com_texto = prompt + "\n\nDOCUMENTO:\n" + texto[:4000]
                
                # Tentar com Google AI
                if google_key and not referencias:
                    try:
                        import google.generativeai as genai
                        genai.configure(api_key=google_key)
                        model = genai.GenerativeModel('gemini-2.0-flash')
                        response = model.generate_content(prompt_com_texto)
                        response_text = response.text
                        
                        if '```json' in response_text:
                            response_text = response_text.split('```json')[1].split('```')[0]
                        elif '```' in response_text:
                            response_text = response_text.split('```')[1].split('```')[0]
                        
                        import json
                        data = json.loads(response_text.strip())
                        referencias = data.get('referencias', [])
                        logger.info(f"IA (texto) extraiu {len(referencias)} referências")
                        
                    except Exception as e:
                        logger.error(f"Erro ao usar Google AI com texto: {e}")
                
                # Fallback para Emergent LLM
                if not referencias and emergent_key:
                    try:
                        from emergentintegrations.llm.chat import LlmChat, UserMessage
                        chat = LlmChat(
                            api_key=emergent_key,
                            session_id=f"apoio-{os.urandom(4).hex()}",
                            system_message="Extraia dados estruturados de documentos."
                        ).with_model("gemini", "gemini-2.5-flash")
                        
                        response = await chat.send_message(UserMessage(text=prompt_com_texto))
                        
                        response_text = response
                        if '```json' in response_text:
                            response_text = response_text.split('```json')[1].split('```')[0]
                        elif '```' in response_text:
                            response_text = response_text.split('```')[1].split('```')[0]
                        
                        import json
                        data = json.loads(response_text.strip())
                        referencias = data.get('referencias', [])
                        logger.info(f"Emergent LLM extraiu {len(referencias)} referências")
                        
                    except Exception as e:
                        logger.error(f"Erro ao usar Emergent LLM: {e}")
            
            # Normalizar campos
            for ref in referencias:
                campo = ref.get('campo', '').lower().replace(' ', '_')
                campo_map = {
                    'horas_extras': 'horas_extras',
                    'hora_extra': 'horas_extras',
                    'he': 'horas_extras',
                    'vale_compras': 'vale_compras',
                    'vale_transporte': 'vale_transporte',
                    'vt': 'vale_transporte',
                    'vale_refeicao': 'vale_refeicao',
                    'vr': 'vale_refeicao',
                    'vale_alimentacao': 'vale_alimentacao',
                    'va': 'vale_alimentacao',
                    'vale': 'vale',
                    'falta': 'faltas',
                    'faltas': 'faltas',
                    'atraso': 'atrasos',
                    'atrasos': 'atrasos',
                    'comissao': 'comissao',
                    'comissoes': 'comissao',
                    'bonificacao': 'bonificacao',
                    'quebra_caixa': 'quebra_caixa',
                }
                ref['campo'] = campo_map.get(campo, campo)
                
                # Garantir que valor é float
                try:
                    val = ref.get('valor', 0)
                    if isinstance(val, str):
                        val = val.replace('.', '').replace(',', '.')
                    ref['valor'] = float(val)
                except:
                    ref['valor'] = 0
                
                # Normalizar nome (uppercase para comparação)
                ref['nome_normalizado'] = ref.get('nome', '').upper().strip()
            
            return referencias
            
        except Exception as e:
            logger.error(f"Erro ao extrair referências com IA: {e}", exc_info=True)
            texto = self.extract_text(file_path)
            return self.parse_apoio_referencias(texto) if texto else []
    
    def _extract_colaborador_from_block(self, block: str, parse_valor) -> Dict[str, Any]:
        """Extrai dados de um colaborador de um bloco de texto"""
        colab = {
            'nome': '',
            'cpf': '',
            'matricula': '',
            'cargo': '',
            'competencia': '',
            'proventos': [],
            'descontos': [],
            'total_proventos': 0,
            'total_descontos': 0,
            'liquido': 0,
            'horas_extras': 0,
            'horas_extras_50': 0,
            'horas_extras_100': 0,
            'adicional_noturno': 0,
            'vale_transporte': 0,
            'vale_refeicao': 0,
            'vale_alimentacao': 0,
            'salario_base': 0,
            'inss': 0,
            'irrf': 0,
            'fgts': 0
        }
        
        # Extrair nome
        nome_match = re.search(r'(?:Funcionário|Nome|FUNCIONÁRIO|NOME)[:\s]*([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]+)', block)
        if nome_match:
            colab['nome'] = nome_match.group(1).strip().split('\n')[0].strip()[:50]
        else:
            # Tentar encontrar nome em maiúsculas
            for line in block.split('\n'):
                line = line.strip()
                if re.match(r'^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{5,40}$', line):
                    if not any(x in line for x in ['PROVENTOS', 'DESCONTOS', 'TOTAL', 'LÍQUIDO', 'SALÁRIO', 'CARGO']):
                        colab['nome'] = line.title()
                        break
        
        # Extrair CPF
        cpf_match = re.search(r'(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[-.\s]?(\d{2})', block)
        if cpf_match:
            colab['cpf'] = f"{cpf_match.group(1)}.{cpf_match.group(2)}.{cpf_match.group(3)}-{cpf_match.group(4)}"
        
        # Extrair matrícula
        mat_match = re.search(r'(?:Matrícula|Mat|MATRÍCULA|MAT)[:\s]*(\d{3,10})', block, re.IGNORECASE)
        if mat_match:
            colab['matricula'] = mat_match.group(1)
        
        # Extrair cargo
        cargo_match = re.search(r'(?:Cargo|CARGO|Função|FUNÇÃO)[:\s]*([A-Za-záéíóúâêôãõç\s]{3,40})', block, re.IGNORECASE)
        if cargo_match:
            colab['cargo'] = cargo_match.group(1).strip()
        
        # Extrair competência
        comp_match = re.search(r'(?:Competência|Referência|MÊS|Competencia)[:\s]*(\d{2}/\d{2,4})', block, re.IGNORECASE)
        if comp_match:
            colab['competencia'] = comp_match.group(1)
        
        # Palavras-chave para campos específicos
        campos_especificos = {
            'salario_base': ['SALÁRIO BASE', 'SALARIO BASE', 'SAL.BASE', 'SALÁRIO', 'SALARIO'],
            'horas_extras': ['HORAS EXTRAS', 'HORA EXTRA', 'HE ', 'H.E.', 'H.EXTRAS'],
            'horas_extras_50': ['HE 50%', 'HORA EXTRA 50', 'H.E. 50', 'HORAS EXTRAS 50'],
            'horas_extras_100': ['HE 100%', 'HORA EXTRA 100', 'H.E. 100', 'HORAS EXTRAS 100'],
            'adicional_noturno': ['ADICIONAL NOTURNO', 'AD.NOTURNO', 'ADIC.NOT'],
            'vale_transporte': ['VALE TRANSPORTE', 'VT', 'V.T.', 'VALE TRANSP'],
            'vale_refeicao': ['VALE REFEIÇÃO', 'VR', 'V.R.', 'VALE REF'],
            'vale_alimentacao': ['VALE ALIMENTAÇÃO', 'VA', 'V.A.', 'VALE ALIM'],
            'inss': ['INSS', 'PREV.SOCIAL'],
            'irrf': ['IRRF', 'IR', 'IMP.RENDA'],
            'fgts': ['FGTS', 'F.G.T.S.']
        }
        
        palavras_desconto = ['INSS', 'IRRF', 'IR ', 'DESC', 'FALTA', 'ATRASO', 'VT', 'PENSÃO', 
                           'VALE TRANSPORTE', 'CONTRIBUIÇÃO', 'EMPRÉSTIMO', 'ADIANTAMENTO', 'DESCONTO']
        
        palavras_total = ['TOTAL PROVENTOS', 'TOTAL DESCONTOS', 'LÍQUIDO', 'LIQUIDO', 'TOTAL PROV', 
                         'A RECEBER', 'VALOR LIQUIDO', 'TOTAL DESC']
        
        # Extrair valores monetários
        valores = re.findall(r'([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s%\d.]+?)\s{2,}([\d.,]+)\s*$', block, re.MULTILINE)
        
        for desc, valor in valores:
            try:
                desc_upper = desc.upper().strip()
                v = parse_valor(valor)
                
                if v <= 0.01 or v > 100000:
                    continue
                
                # Verificar campos específicos
                for campo, keywords in campos_especificos.items():
                    if any(kw in desc_upper for kw in keywords):
                        colab[campo] = v
                        break
                
                # Extrair totais
                if 'TOTAL PROVENTOS' in desc_upper or 'TOTAL PROV' in desc_upper:
                    colab['total_proventos'] = v
                elif 'TOTAL DESCONTOS' in desc_upper or 'TOTAL DESC' in desc_upper:
                    colab['total_descontos'] = v
                elif 'LÍQUIDO' in desc_upper or 'LIQUIDO' in desc_upper or 'A RECEBER' in desc_upper:
                    colab['liquido'] = v
                elif not any(t in desc_upper for t in palavras_total):
                    # Classificar como provento ou desconto
                    item = {'descricao': desc.strip(), 'valor': v}
                    if any(x in desc_upper for x in palavras_desconto):
                        colab['descontos'].append(item)
                    else:
                        colab['proventos'].append(item)
            except:
                pass
        
        # Calcular totais se não extraídos
        if colab['total_proventos'] == 0 and colab['proventos']:
            colab['total_proventos'] = round(sum(p['valor'] for p in colab['proventos']), 2)
        if colab['total_descontos'] == 0 and colab['descontos']:
            colab['total_descontos'] = round(sum(d['valor'] for d in colab['descontos']), 2)
        if colab['liquido'] == 0 and (colab['total_proventos'] or colab['total_descontos']):
            colab['liquido'] = round(colab['total_proventos'] - colab['total_descontos'], 2)
        
        return colab
    
    def parse_apoio_referencias(self, text: str) -> List[Dict[str, Any]]:
        """
        Extrai referências de valores do documento de apoio.
        Procura por padrões como "Fulano - 10 horas extras" ou "Beltrano: R$ 200 vale"
        """
        referencias = []
        
        # Padrões para extrair referências
        patterns = [
            # Nome - quantidade tipo
            r'([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]+?)\s*[-:]\s*(\d+(?:[.,]\d+)?)\s*(horas?\s*extras?|HE|h\.?e\.?)',
            r'([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]+?)\s*[-:]\s*(\d+(?:[.,]\d+)?)\s*(faltas?)',
            r'([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]+?)\s*[-:]\s*(\d+(?:[.,]\d+)?)\s*(atrasos?)',
            r'([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]+?)\s*[-:]\s*R?\$?\s*(\d+(?:[.,]\d+)?)\s*(vale|vt|vr|va|comiss|bonif)',
            # Matrícula + quantidade
            r'(?:Mat|Matr)[:\s]*(\d+)\s*[-:]\s*(\d+(?:[.,]\d+)?)\s*(horas?\s*extras?|HE)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                nome_ou_mat = match[0].strip() if match[0] else ''
                valor = match[1].replace(',', '.')
                tipo = match[2].lower()
                
                # Normalizar tipo
                tipo_normalizado = ''
                if 'hora' in tipo or 'he' in tipo:
                    tipo_normalizado = 'horas_extras'
                elif 'falta' in tipo:
                    tipo_normalizado = 'faltas'
                elif 'atraso' in tipo:
                    tipo_normalizado = 'atrasos'
                elif 'vale' in tipo or 'vt' in tipo:
                    tipo_normalizado = 'vale_transporte'
                elif 'vr' in tipo:
                    tipo_normalizado = 'vale_refeicao'
                elif 'va' in tipo:
                    tipo_normalizado = 'vale_alimentacao'
                elif 'comiss' in tipo:
                    tipo_normalizado = 'comissao'
                elif 'bonif' in tipo:
                    tipo_normalizado = 'bonificacao'
                
                if nome_ou_mat and tipo_normalizado:
                    referencias.append({
                        'identificador': nome_ou_mat,
                        'tipo': tipo_normalizado,
                        'valor': float(valor),
                        'texto_original': ' '.join(match)
                    })
        
        return referencias


class GoogleAIProcessor:
    """Processador usando Google AI Studio (Gemini) com chave própria"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('GOOGLE_AI_API_KEY')
        self.client = None
        
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google AI Studio configurado com sucesso")
            except Exception as e:
                logger.error(f"Erro ao configurar Google AI: {e}")
    
    def is_available(self) -> bool:
        return self.client is not None
    
    async def analyze_document(self, text: str, prompt: str) -> str:
        """Analisa texto usando Gemini"""
        if not self.is_available():
            return ""
        
        try:
            full_prompt = f"{prompt}\n\nTexto do documento:\n{text[:15000]}"
            response = self.client.models.generate_content(
                model='gemini-2.0-flash',
                contents=full_prompt
            )
            return response.text
        except Exception as e:
            logger.error(f"Erro na análise com Google AI: {e}")
            return ""
    
    async def extract_colaboradores(self, text: str) -> List[Dict[str, Any]]:
        """Extrai colaboradores usando IA"""
        prompt = """Extraia todos os colaboradores/funcionários deste documento.
        Retorne um JSON com a lista de colaboradores no formato:
        [{"nome": "...", "cpf": "...", "cargo": "...", "salario_base": 0.00, "data_admissao": "DD/MM/AAAA"}]
        
        Retorne APENAS o JSON, sem explicações."""
        
        response = await self.analyze_document(text, prompt)
        
        try:
            import json
            # Limpa a resposta
            response = response.strip()
            if response.startswith('```'):
                response = re.sub(r'^```\w*\n?', '', response)
                response = re.sub(r'\n?```$', '', response)
            return json.loads(response)
        except:
            return []


# Instância global do processador
doc_processor = DocumentProcessor()
