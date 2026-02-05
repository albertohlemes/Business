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
        
        if suffix == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif suffix in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']:
            return self.extract_text_from_image(file_path)
        elif suffix in ['.txt', '.csv']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        else:
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
        
        # Extrai nome do funcionário
        nome_match = re.search(r'(?:Funcionário|Nome|FUNCIONÁRIO|NOME)[:\s]*([A-Za-záéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ\s]+)', text)
        if nome_match:
            dados['funcionario'] = nome_match.group(1).strip()
        
        # Extrai competência (MM/AAAA)
        comp_match = re.search(r'(?:Competência|Referência|MÊS)[:\s]*(\d{2}/\d{4})', text)
        if comp_match:
            dados['competencia'] = comp_match.group(1)
        
        # Extrai valores monetários
        valores = re.findall(r'([A-Za-záéíóúâêôãõç\s.]+?)\s+([\d.,]+)\s*$', text, re.MULTILINE)
        
        for desc, valor in valores:
            try:
                v = float(valor.replace('.', '').replace(',', '.'))
                if v > 0:
                    item = {'descricao': desc.strip(), 'valor': v}
                    # Classifica como provento ou desconto baseado em palavras-chave
                    if any(x in desc.upper() for x in ['INSS', 'IRRF', 'IR', 'DESC', 'FALTA', 'ATRASO', 'VT', 'PENSÃO']):
                        dados['descontos'].append(item)
                    else:
                        dados['proventos'].append(item)
            except:
                pass
        
        # Calcula totais
        dados['total_proventos'] = sum(p['valor'] for p in dados['proventos'])
        dados['total_descontos'] = sum(d['valor'] for d in dados['descontos'])
        dados['liquido'] = dados['total_proventos'] - dados['total_descontos']
        
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
