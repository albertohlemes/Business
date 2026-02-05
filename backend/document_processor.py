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
