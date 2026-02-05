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
        """Extrai colaboradores do texto usando regex e padrões"""
        colaboradores = []
        
        # Padrões comuns em fichas de registro
        # CPF: 000.000.000-00
        cpf_pattern = r'\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b'
        # Nome: geralmente em maiúsculas antes do CPF ou após "Nome:"
        nome_pattern = r'(?:Nome[:\s]*)?([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+?)(?=\s*(?:CPF|RG|\d{3}\.\d{3}|\n))'
        # Salário: R$ 0.000,00
        salario_pattern = r'R\$\s*([\d.,]+)'
        # Data admissão: DD/MM/AAAA
        data_pattern = r'\b(\d{2}/\d{2}/\d{4})\b'
        # Cargo
        cargo_patterns = [
            r'(?:Cargo|Função)[:\s]*([A-Za-záéíóúâêôãõç\s]+?)(?=\n|Salário|R\$|\d)',
            r'(?:CARGO|FUNÇÃO)[:\s]*([A-Za-záéíóúâêôãõç\s]+?)(?=\n|SALÁRIO|R\$|\d)'
        ]
        
        # Divide o texto em blocos por colaborador
        # Procura padrões que indicam novo registro
        blocks = re.split(r'(?=(?:Nome|NOME|Funcionário|FUNCIONÁRIO)[:\s])', text)
        
        for block in blocks:
            if len(block.strip()) < 20:
                continue
            
            colab = {
                'nome': '',
                'cpf': '',
                'cargo': '',
                'salario_base': 0,
                'data_admissao': ''
            }
            
            # Extrai CPF
            cpf_match = re.search(cpf_pattern, block)
            if cpf_match:
                cpf = re.sub(r'[.\s-]', '', cpf_match.group())
                if len(cpf) == 11:
                    colab['cpf'] = f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
            
            # Extrai Nome
            nome_match = re.search(nome_pattern, block, re.IGNORECASE)
            if nome_match:
                colab['nome'] = nome_match.group(1).strip().title()
            else:
                # Tenta pegar nome em maiúsculas no início
                lines = block.split('\n')
                for line in lines[:5]:
                    if re.match(r'^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{5,50}$', line.strip()):
                        colab['nome'] = line.strip().title()
                        break
            
            # Extrai Salário
            salario_matches = re.findall(salario_pattern, block)
            for sal in salario_matches:
                try:
                    valor = float(sal.replace('.', '').replace(',', '.'))
                    if 500 < valor < 50000:  # Faixa razoável de salário
                        colab['salario_base'] = valor
                        break
                except:
                    pass
            
            # Extrai Data de Admissão
            datas = re.findall(data_pattern, block)
            if datas:
                colab['data_admissao'] = datas[0]
            
            # Extrai Cargo
            for pattern in cargo_patterns:
                cargo_match = re.search(pattern, block)
                if cargo_match:
                    colab['cargo'] = cargo_match.group(1).strip().title()
                    break
            
            # Só adiciona se tiver pelo menos nome ou CPF
            if colab['nome'] or colab['cpf']:
                colaboradores.append(colab)
        
        return colaboradores
    
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
        self.model = None
        
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("Google AI Studio configurado com sucesso")
            except Exception as e:
                logger.error(f"Erro ao configurar Google AI: {e}")
    
    def is_available(self) -> bool:
        return self.model is not None
    
    async def analyze_document(self, text: str, prompt: str) -> str:
        """Analisa texto usando Gemini"""
        if not self.is_available():
            return ""
        
        try:
            import google.generativeai as genai
            
            full_prompt = f"{prompt}\n\nTexto do documento:\n{text[:15000]}"  # Limita tamanho
            response = self.model.generate_content(full_prompt)
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
