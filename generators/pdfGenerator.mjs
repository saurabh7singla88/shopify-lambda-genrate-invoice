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
 * @param {Object} templateConfig - Template configuration (from DB or env)
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateInvoicePDF(data, templateConfig = null) {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ 
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks = [];
        
        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        try {
            // Get selected template
            const template = getTemplate();
            
            // Use provided config or fallback to env variable
            const colorScheme = templateConfig ? 
                template.getColorScheme(templateConfig.colors.primary, templateConfig.colors) :
                template.getColorScheme(process.env.INVOICE_PRIMARY_COLOR || '#333333');
            
            // Render invoice using template with color scheme and config (now async)
            let yPos = await template.renderHeader(doc, data, colorScheme, templateConfig);
            yPos = template.renderOrderInfo(doc, data, yPos, colorScheme, templateConfig);
            yPos = template.renderLineItems(doc, data, yPos, colorScheme, templateConfig);
            yPos = template.renderTotals(doc, data, yPos, colorScheme, templateConfig);
            yPos = await template.renderSignature(doc, data, yPos, colorScheme, templateConfig);
            yPos = template.renderFooter(doc, data, yPos, colorScheme, templateConfig);
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}
