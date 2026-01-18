import PDFDocument from 'pdfkit';
import { minimalistTemplate } from './templates/minimalistTemplate.mjs';

/**
 * Get the selected template based on environment variable or default
 * @returns {Object} Template module
 */
function getTemplate() {
    const templateName = process.env.INVOICE_TEMPLATE || 'minimalist';
    
    switch (templateName.toLowerCase()) {
        case 'minimalist':
        default:
            return minimalistTemplate;
    }
}

/**
 * Generates a PDF invoice from invoice data
 * @param {Object} data - Invoice data containing order, customer, line items, and totals
 * @returns {Promise<Buffer>} PDF buffer
 */
export function generateInvoicePDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks = [];
        
        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Get selected template
        const template = getTemplate();
        
        // Get color scheme from environment variable or default to B&W
        const primaryColor = process.env.INVOICE_PRIMARY_COLOR || '#333333';
        const colorScheme = template.getColorScheme(primaryColor);
        
        // Render invoice using template with color scheme
        let yPos = template.renderHeader(doc, data, colorScheme);
        yPos = template.renderOrderInfo(doc, data, yPos, colorScheme);
        yPos = template.renderLineItems(doc, data, yPos, colorScheme);
        yPos = template.renderTotals(doc, data, yPos, colorScheme);
        yPos = template.renderSignature(doc, data, yPos, colorScheme);
        yPos = template.renderFooter(doc, data, yPos, colorScheme);
        
        doc.end();
    });
}
