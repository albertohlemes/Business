import { jsPDF } from 'jspdf';

/**
 * Gera um PDF formatado da minuta de alteração contratual
 * com template padrão do escritório
 */
export const gerarPDFMinuta = (conteudo, dadosEmpresa = {}, dataAlteracao) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 25;
    const marginRight = 25;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPosition = 20;
    
    // Cores do escritório
    const corVermelha = [220, 38, 38];
    const corPreta = [9, 9, 11];
    
    // ============ CABEÇALHO ============
    // Linha vermelha superior
    doc.setFillColor(...corVermelha);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    // Logo/Nome do escritório
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...corPreta);
    doc.text('BUSINESS CONTABILIDADE', marginLeft, yPosition);
    
    yPosition += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Portal Societário', marginLeft, yPosition);
    
    // Data no canto direito
    const dataFormatada = dataAlteracao 
        ? new Date(dataAlteracao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(10);
    doc.text(dataFormatada, pageWidth - marginRight, yPosition, { align: 'right' });
    
    yPosition += 10;
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    
    yPosition += 15;
    
    // ============ TÍTULO DO DOCUMENTO ============
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...corPreta);
    const titulo = 'ALTERAÇÃO DO CONTRATO SOCIAL';
    doc.text(titulo, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    
    // Subtítulo com dados da empresa (se disponível)
    if (dadosEmpresa.razao_social || dadosEmpresa.cnpj) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        
        if (dadosEmpresa.razao_social) {
            doc.text(dadosEmpresa.razao_social.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 5;
        }
        if (dadosEmpresa.cnpj) {
            doc.text(`CNPJ: ${dadosEmpresa.cnpj}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 5;
        }
    }
    
    yPosition += 10;
    
    // Linha separadora dupla
    doc.setDrawColor(...corVermelha);
    doc.setLineWidth(0.5);
    doc.line(marginLeft + 40, yPosition, pageWidth - marginRight - 40, yPosition);
    
    yPosition += 15;
    
    // ============ CONTEÚDO DA MINUTA ============
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.setTextColor(...corPreta);
    
    // Processar conteúdo linha por linha
    const linhas = conteudo.split('\n');
    
    for (const linha of linhas) {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
            
            // Cabeçalho nas páginas seguintes
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text('BUSINESS CONTABILIDADE - Alteração Contratual', marginLeft, yPosition);
            doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth - marginRight, yPosition, { align: 'right' });
            
            yPosition += 15;
            doc.setFontSize(11);
            doc.setFont('times', 'normal');
            doc.setTextColor(...corPreta);
        }
        
        const linhaLimpa = linha.trim();
        
        // Detectar títulos/seções (em maiúsculas ou com marcadores)
        const isTitulo = linhaLimpa === linhaLimpa.toUpperCase() && 
                        linhaLimpa.length > 3 && 
                        !linhaLimpa.startsWith('-') &&
                        !linhaLimpa.match(/^\d+\./);
        
        const isClausula = linhaLimpa.match(/^(CLÁUSULA|Cláusula|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA)/i);
        
        if (isTitulo || isClausula) {
            doc.setFont('times', 'bold');
            yPosition += 5;
        } else {
            doc.setFont('times', 'normal');
        }
        
        // Quebrar linha longa
        if (linhaLimpa.length > 0) {
            const splitText = doc.splitTextToSize(linhaLimpa, contentWidth);
            doc.text(splitText, marginLeft, yPosition, { align: 'justify' });
            yPosition += splitText.length * 5;
        } else {
            yPosition += 3; // Espaço para linha vazia
        }
    }
    
    // ============ RODAPÉ ============
    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Linha do rodapé
        doc.setDrawColor(200, 200, 200);
        doc.line(marginLeft, pageHeight - 15, pageWidth - marginRight, pageHeight - 15);
        
        // Texto do rodapé
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('Documento gerado pelo Portal Societário - Business Contabilidade', marginLeft, pageHeight - 10);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' });
        
        // Linha vermelha inferior
        doc.setFillColor(...corVermelha);
        doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
    }
    
    return doc;
};

/**
 * Retorna o PDF como Data URL para exibição em iframe/embed
 */
export const gerarPDFDataUrl = (conteudo, dadosEmpresa = {}, dataAlteracao) => {
    const doc = gerarPDFMinuta(conteudo, dadosEmpresa, dataAlteracao);
    return doc.output('datauristring');
};

/**
 * Retorna o PDF como Blob URL para exibição
 */
export const gerarPDFBlobUrl = (conteudo, dadosEmpresa = {}, dataAlteracao) => {
    const doc = gerarPDFMinuta(conteudo, dadosEmpresa, dataAlteracao);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
};

/**
 * Baixa o PDF diretamente
 */
export const baixarPDF = (conteudo, dadosEmpresa = {}, dataAlteracao, nomeArquivo) => {
    const doc = gerarPDFMinuta(conteudo, dadosEmpresa, dataAlteracao);
    const cnpjLimpo = (dadosEmpresa.cnpj || '').replace(/\D/g, '');
    const dataStr = dataAlteracao ? dataAlteracao.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
    const nome = nomeArquivo || `alteracao_contratual_${cnpjLimpo || 'minuta'}_${dataStr}.pdf`;
    doc.save(nome);
};

/**
 * Template padrão para instruir a IA na geração da minuta
 */
export const TEMPLATE_MINUTA = `
ALTERAÇÃO DO CONTRATO SOCIAL

[NOME DA EMPRESA]
CNPJ: [CNPJ]

Pelo presente instrumento particular de alteração contratual, os sócios abaixo qualificados:

QUADRO SOCIETÁRIO ATUAL:
[LISTAR SÓCIOS COM QUALIFICAÇÃO COMPLETA]

Únicos sócios da empresa [RAZÃO SOCIAL], inscrita no CNPJ sob nº [CNPJ], com sede em [ENDEREÇO COMPLETO], registrada na Junta Comercial sob NIRE [NÚMERO], resolvem, de comum acordo, proceder às seguintes alterações no contrato social:

CLÁUSULA PRIMEIRA - [TIPO DA ALTERAÇÃO]
[DESCRIÇÃO DA ALTERAÇÃO COM TODOS OS DETALHES]

[REPETIR CLÁUSULAS CONFORME NECESSÁRIO]

CONSOLIDAÇÃO DO CONTRATO SOCIAL

Com as alterações ora procedidas, o contrato social passa a vigorar com a seguinte redação consolidada:

[TEXTO CONSOLIDADO DO CONTRATO]

ENCERRAMENTO

Os sócios declaram que a empresa não se encontra impedida de funcionar e que não há contra ela qualquer ação judicial que possa comprometer o presente ato.

E, por estarem assim justos e contratados, assinam o presente instrumento em [NÚMERO] vias de igual teor e forma.

[CIDADE], [DATA POR EXTENSO].

_______________________________
[NOME DO SÓCIO 1]
CPF: [CPF]

_______________________________
[NOME DO SÓCIO 2]
CPF: [CPF]
`;

export default { gerarPDFMinuta, gerarPDFDataUrl, gerarPDFBlobUrl, baixarPDF, TEMPLATE_MINUTA };
