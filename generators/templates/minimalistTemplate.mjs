import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { downloadImageFromS3 } from '../../services/s3Service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Minimalist Configurable Invoice Template
 * Clean, professional design with GST compliance and configurable colors
 */

/**
 * Get color scheme based on primary color
 * @param {string} primaryColor - Hex color code (default: #333333 for black/white)
 * @param {Object} colors - Full colors config from DB (optional)
 * @returns {Object} Color scheme object
 */
function getColorScheme(primaryColor = '#333333', colors = null) {
    // If colors object provided from config, use it
    if (colors) {
        return {
            primary: colors.primary || '#333333',
            secondary: colors.secondary || '#6b7280',
            accent: colors.accent || colors.primary || '#111827',
            border: colors.border || '#e5e7eb',
            background: colors.background || '#ffffff',
            error: colors.error || '#dc2626'
        };
    }
    
    // If no primary color or using default, return black & white scheme
    if (!primaryColor || primaryColor === '#333333' || primaryColor.toLowerCase() === 'bw') {
        return {
            primary: '#333333',      // Dark gray/black
            secondary: '#6b7280',    // Medium gray
            accent: '#111827',       // Very dark gray
            border: '#e5e7eb',       // Light gray
            background: '#ffffff',   // White
            error: '#dc2626'         // Red for discounts
        };
    }
    
    // For colored schemes, use the primary color and generate complementary colors
    return {
        primary: primaryColor,
        secondary: '#6b7280',
        accent: primaryColor,
        border: '#e5e7eb',
        background: '#ffffff',
        error: '#dc2626'
    };
}

export const minimalistTemplate = {
    name: 'Minimalist (Configurable)',
    
    /**
     * Render company header with logo
     */
    async renderHeader(doc, data, colorScheme, templateConfig = null) {
        const companyName = templateConfig?.company?.name || 'Your Company Name';
        const companyLegalName = templateConfig?.company?.legalName || 'Legal Entity Name';
        const companyAddress1 = templateConfig?.company?.address?.line1 || 'Address Line 1';
        const companyAddress2 = templateConfig?.company?.address?.line2 || 'Address Line 2';
        const companyCity = templateConfig?.company?.address?.city || '';
        const companyState = templateConfig?.company?.address?.state || '';
        const companyPincode = templateConfig?.company?.address?.pincode || '';
        const companyGSTIN = templateConfig?.company?.gstin || 'GSTIN Number';
        const companyLogo = templateConfig?.company?.logo || 'logo.JPG';
        
        // Font configuration
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const titleSize = templateConfig?.fonts?.titleSize || 28;
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        
        // Calculate dynamic spacing based on font sizes
        const titleLineHeight = titleSize * 1.2;
        const bodyLineHeight = bodySize * 1.35;
        
        let yPos = 50;
        
        doc.font(fontFamily)
           .fontSize(titleSize)
           .fillColor(colorScheme.accent)
           .text(companyName, 50, yPos);
        
        yPos += titleLineHeight + 5;
        
        doc.fontSize(bodySize)
           .fillColor('#6b7280')
           .text(companyLegalName, 50, yPos);
        
        yPos += bodyLineHeight;
        doc.text(companyAddress1, 50, yPos);
        
        yPos += bodyLineHeight;
        doc.text(companyAddress2, 50, yPos);
        
        // Build city, state, pincode line
        yPos += bodyLineHeight;
        const locationParts = [companyCity, companyState, companyPincode].filter(Boolean);
        if (locationParts.length > 0) {
            doc.text(locationParts.join(', '), 50, yPos);
            yPos += bodyLineHeight;
        }
        
        doc.text(companyGSTIN, 50, yPos);
        
        // Logo Image (Top Right) - fetch from S3 or local assets
        try {
            let logoBuffer;
            
            // Check if logo is an S3 path (contains /)
            if (companyLogo.includes('/')) {
                console.log(`Fetching logo from S3: ${companyLogo}`);
                logoBuffer = await downloadImageFromS3(companyLogo);
            } else {
                // Local assets folder
                const logoPath = join(__dirname, '..', '..', 'assets', companyLogo);
                const fs = await import('fs');
                logoBuffer = fs.readFileSync(logoPath);
            }
            
            doc.image(logoBuffer, 455, 55, { width: 90 });
        } catch (error) {
            console.error('Logo file not found, skipping logo:', error.message);
        }
        
        // Horizontal line with dynamic spacing
        yPos += bodyLineHeight + 20;
        doc.moveTo(50, yPos)
           .lineTo(545, yPos)
           .strokeColor(colorScheme.border)
           .stroke();
        
        return yPos + 20; // Return next yPos with padding
    },
    
    /**
     * Render order details and shipping address
     */
    renderOrderInfo(doc, data, yPos, colorScheme, templateConfig = null) {
        // Font configuration
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const headingSize = templateConfig?.fonts?.headingSize || 16;
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        
        // Calculate dynamic spacing
        const headingLineHeight = headingSize * 1.4;
        const bodyLineHeight = bodySize * 1.5;
        
        // Left Column - Order Details
        doc.font(fontFamily)
           .fontSize(headingSize)
           .fillColor(colorScheme.accent)
           .text('Order Details', 50, yPos);
        
        // Right Column - Shipping Address
        doc.fontSize(headingSize)
           .fillColor(colorScheme.accent)
           .text('Shipping Address', 300, yPos, { width: 245, align: 'right' });
        
        yPos += headingLineHeight + 8;
        
        // Left Column - Order Number and Date
        const labelGap = 10; // Consistent gap between label and value
        
        doc.fontSize(bodySize)
           .fillColor('#6b7280')
           .text('Order Number:', 50, yPos);
        const orderLabelWidth = doc.widthOfString('Order Number:');
        doc.fillColor('#111827')
           .text(data.order.name, 50 + orderLabelWidth + labelGap, yPos);
        
        // Right Column - Customer Name
        doc.fontSize(bodySize)
           .fillColor('#111827')
           .text(data.customer.name, 300, yPos, { width: 245, align: 'right' });
        
        yPos += bodyLineHeight + 4;
        
        // Left Column - Order Date
        doc.fillColor('#6b7280')
           .text('Order Date:', 50, yPos);
        const dateLabelWidth = doc.widthOfString('Order Date:');
        doc.fillColor('#111827')
           .text(data.order.date, 50 + dateLabelWidth + labelGap, yPos);
        
        // Right Column - Shipping Address (dynamic height)
        const addressText = data.shippingAddress.address || '';
        const cityStateZip = [data.shippingAddress.city, data.shippingAddress.state, data.shippingAddress.zip].filter(Boolean).join(', ');
        
        // Calculate height needed for address
        let addressYPos = yPos;
        doc.fontSize(bodySize)
           .fillColor('#111827');
        
        if (addressText) {
            doc.text(addressText, 300, addressYPos, { width: 245, align: 'right' });
            addressYPos += doc.heightOfString(addressText, { width: 245 }) + 4;
        }
        
        if (cityStateZip) {
            doc.text(cityStateZip, 300, addressYPos, { width: 245, align: 'right' });
            addressYPos += doc.heightOfString(cityStateZip, { width: 245 }) + 4;
        }
        
        // Update yPos to the maximum of left column or right column height
        return Math.max(yPos + bodyLineHeight + 4, addressYPos);
    },
    
    /**
     * Render line items table
     */
    renderLineItems(doc, data, yPos, colorScheme, templateConfig = null) {
        yPos += 10;
        
        // Font configuration
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const headingSize = templateConfig?.fonts?.headingSize || 16;
        const tableSize = templateConfig?.fonts?.tableSize || 8;
        
        doc.font(fontFamily)
           .fontSize(headingSize)
           .fillColor(colorScheme.accent)
           .text('Items', 50, yPos);
        
        yPos += 30;
        
        // Get header colors from config or defaults
        const headerBgColor = templateConfig?.styling?.headerBackgroundColor || colorScheme.primary;
        const headerTextColor = templateConfig?.styling?.headerTextColor || colorScheme.background;
        
        // Table header with border
        doc.rect(50, yPos, 495, 35)
           .fillAndStroke(headerBgColor, headerBgColor);
        
        // Table headers - conditionally show CGST/SGST or IGST based on transaction type
        const showCGSTSGST = data.totals.cgst && data.totals.sgst;
        const showIGST = data.totals.igst;
        
        if (showCGSTSGST) {
            // Intrastate: Item, Qty, MRP, Discount, Price before tax, CGST, SGST, Price after tax
            doc.fontSize(tableSize)
               .fillColor(headerTextColor)
               .text('Item', 55, yPos + 12, { width: 90 })
               .text('Qty', 150, yPos + 12, { width: 20, align: 'center' })
               .text('MRP', 175, yPos + 12, { width: 48, align: 'right' })
               .text('Discount', 228, yPos + 12, { width: 40, align: 'right' })
               .text('Price\nbefore tax', 273, yPos + 8, { width: 50, align: 'right' })
               .text('CGST', 328, yPos + 12, { width: 40, align: 'right' })
               .text('SGST', 373, yPos + 12, { width: 40, align: 'right' })
               .text('Price after tax', 400, yPos + 8, { width: 105, align: 'right' });
            
            // Draw vertical lines between columns
            doc.strokeColor(headerTextColor);
            [148, 173, 226, 271, 326, 371, 416].forEach(x => {
                doc.moveTo(x, yPos).lineTo(x, yPos + 35).stroke();
            });
        } else if (showIGST) {
            // Interstate: Item, Qty, MRP, Discount, Price before tax, IGST, Price after tax
            doc.fontSize(tableSize)
               .fillColor(headerTextColor)
               .text('Item', 55, yPos + 12, { width: 105 })
               .text('Qty', 165, yPos + 12, { width: 20, align: 'center' })
               .text('MRP', 190, yPos + 12, { width: 50, align: 'right' })
               .text('Discount', 245, yPos + 12, { width: 45, align: 'right' })
               .text('Price\nbefore tax', 295, yPos + 8, { width: 55, align: 'right' })
               .text('IGST', 355, yPos + 12, { width: 50, align: 'right' })
               .text('Price after tax', 400, yPos + 8, { width: 105, align: 'right' });
            
            // Draw vertical lines between columns
            doc.strokeColor(headerTextColor);
            [163, 188, 243, 293, 353, 408].forEach(x => {
                doc.moveTo(x, yPos).lineTo(x, yPos + 35).stroke();
            });
        } else {
            // Fallback: Original format
            doc.fontSize(tableSize)
               .fillColor(headerTextColor)
               .text('Item', 55, yPos + 12, { width: 110 })
               .text('Qty', 170, yPos + 12, { width: 25, align: 'center' })
               .text('MRP', 200, yPos + 12, { width: 55, align: 'right' })
               .text('Discount', 260, yPos + 12, { width: 55, align: 'right' })
               .text('Selling price\nbefore tax', 320, yPos + 8, { width: 60, align: 'right' })
               .text('Tax', 385, yPos + 12, { width: 45, align: 'right' })
               .text('Selling price\nafter tax', 405, yPos + 8, { width: 100, align: 'right' });
        }
        
        yPos += 35;
        
        // Table rows with borders
        data.lineItems.forEach((item, index) => {
            // Concatenate item name with description (variant)
            const itemDisplayName = item.description 
                ? `${item.name} (${item.description.replace('Variant: ', '')})`
                : item.name;
            
            // Calculate height needed for the item name text
            const textWidth = showCGSTSGST ? 90 : (showIGST ? 105 : 110);
            const textHeight = doc.heightOfString(itemDisplayName, { width: textWidth });
            const rowHeight = Math.max(35, textHeight + 20); // Minimum 35px, or text height + padding
            
            // Row border
            doc.rect(50, yPos, 495, rowHeight)
               .strokeColor(colorScheme.border)
               .stroke();
            
            doc.fontSize(tableSize)
               .fillColor('#111827')
               .text(itemDisplayName, 55, yPos + 10, { width: textWidth });
            
            if (showCGSTSGST) {
                // Intrastate: show CGST and SGST
                const cgstAmount = `Rs. ${item._cgst.toFixed(2)}`;
                const sgstAmount = `Rs. ${item._sgst.toFixed(2)}`;
                
                doc.fontSize(tableSize)
                   .fillColor('#111827')
                   .text(item.quantity.toString(), 150, yPos + 10, { width: 20, align: 'center' })
                   .text(item.mrp, 175, yPos + 10, { width: 48, align: 'right' })
                   .text(item.discount, 228, yPos + 10, { width: 40, align: 'right' })
                   .text(item.sellingPrice, 273, yPos + 10, { width: 50, align: 'right' })
                   .text(cgstAmount, 328, yPos + 10, { width: 40, align: 'right' })
                   .text(sgstAmount, 373, yPos + 10, { width: 40, align: 'right' })
                   .text(item.sellingPriceAfterTax, 400, yPos + 10, { width: 105, align: 'right' });
                
                // Draw vertical lines between columns
                doc.strokeColor(colorScheme.border);
                [148, 173, 226, 271, 326, 371, 416].forEach(x => {
                    doc.moveTo(x, yPos).lineTo(x, yPos + rowHeight).stroke();
                });
            } else if (showIGST) {
                // Interstate: show IGST
                const igstAmount = `Rs. ${item._igst.toFixed(2)}`;
                
                doc.fontSize(tableSize)
                   .fillColor('#111827')
                   .text(item.quantity.toString(), 165, yPos + 10, { width: 20, align: 'center' })
                   .text(item.mrp, 190, yPos + 10, { width: 50, align: 'right' })
                   .text(item.discount, 245, yPos + 10, { width: 45, align: 'right' })
                   .text(item.sellingPrice, 295, yPos + 10, { width: 55, align: 'right' })
                   .text(igstAmount, 355, yPos + 10, { width: 50, align: 'right' })
                   .text(item.sellingPriceAfterTax, 400, yPos + 10, { width: 105, align: 'right' });
                
                // Draw vertical lines between columns
                doc.strokeColor(colorScheme.border);
                [163, 188, 243, 293, 353, 408].forEach(x => {
                    doc.moveTo(x, yPos).lineTo(x, yPos + rowHeight).stroke();
                });
            } else {
                // Fallback: original format
                doc.fontSize(tableSize)
                   .fillColor('#111827')
                   .text(item.quantity.toString(), 170, yPos + 10, { width: 25, align: 'center' })
                   .text(item.mrp, 200, yPos + 10, { width: 55, align: 'right' })
                   .text(item.discount, 260, yPos + 10, { width: 55, align: 'right' })
                   .text(item.sellingPrice, 320, yPos + 10, { width: 60, align: 'right' })
                   .text(item.tax, 385, yPos + 10, { width: 45, align: 'right' })
                   .text(item.sellingPriceAfterTax, 435, yPos + 10, { width: 100, align: 'right' });
            }
            
            yPos += rowHeight;
        });
        
        return yPos;
    },
    
    /**
     * Render totals section with GST breakdown
     */
    renderTotals(doc, data, yPos, colorScheme, templateConfig = null) {
        // Font configuration
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        
        // Calculate dynamic spacing
        const bodyLineHeight = bodySize * 1.5;
        
        // Line above totals
        yPos += 10;
        doc.moveTo(350, yPos)
           .lineTo(545, yPos)
           .strokeColor(colorScheme.border)
           .stroke();
        
        yPos += bodyLineHeight + 10;
        
        // Subtotal
        const totalsLabelX = 350;
        const totalsValueX = 460;
        const totalsValueWidth = 85;
        
        doc.font(fontFamily)
           .fontSize(bodySize)
           .fillColor('#6b7280')
           .text('Subtotal (before tax)', totalsLabelX, yPos);
        doc.fontSize(bodySize)
           .fillColor('#111827')
           .text(data.totals.subtotal, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });
        
        // GST Breakdown - show CGST/SGST or IGST before Total Tax
        if (data.totals.cgst && data.totals.sgst) {
            // Intrastate - show CGST and SGST
            yPos += bodyLineHeight + 4;
            doc.fontSize(bodySize)
               .fillColor('#6b7280')
               .text('CGST:', totalsLabelX, yPos);
            doc.fillColor('#111827')
               .text(data.totals.cgst, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });
            
            yPos += bodyLineHeight + 4;
            doc.fillColor('#6b7280')
               .text('SGST:', totalsLabelX, yPos);
            doc.fillColor('#111827')
               .text(data.totals.sgst, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });
        } else if (data.totals.igst) {
            // Interstate - show IGST
            yPos += bodyLineHeight + 4;
            doc.fontSize(bodySize)
               .fillColor('#6b7280')
               .text('IGST:', totalsLabelX, yPos);
            doc.fillColor('#111827')
               .text(data.totals.igst, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });
        }
        
        // Total Tax (summary)
        yPos += bodyLineHeight + 4;
        doc.fontSize(bodySize)
           .fillColor('#6b7280')
           .text('Total Tax:', totalsLabelX, yPos);
        doc.fillColor('#111827')
           .text(data.totals.tax, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });

        // Discount (if exists)
        if (data.totals.discount) {
            yPos += bodyLineHeight + 4;
            doc.fontSize(bodySize)
               .fillColor('#6b7280')
               .text('Discount:', totalsLabelX, yPos);
            doc.fillColor('#dc2626')
               .text(data.totals.discount, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });
        }
        
        // Shipping (always show)
        yPos += bodyLineHeight + 4;
        doc.fillColor('#6b7280')
           .text('Shipping:', totalsLabelX, yPos);
        doc.fillColor('#111827')
           .text(data.totals.shipping, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });
        
        // Total (highlighted)
        yPos += bodyLineHeight + 10;
        
        // Calculate actual height needed for total text
        doc.fontSize(bodySize + 2);
        const totalLabelHeight = doc.heightOfString('TOTAL:', { width: totalsValueX - totalsLabelX - 10 });
        doc.fontSize(bodySize + 4);
        const totalValueHeight = doc.heightOfString(data.totals.total, { width: totalsValueWidth, align: 'right' });
        const maxTextHeight = Math.max(totalLabelHeight, totalValueHeight);
        const totalBoxHeight = Math.max(maxTextHeight + 20, 40);
        
        const totalBoxX = totalsLabelX - 10;
        const totalBoxWidth = (totalsValueX + totalsValueWidth) - totalBoxX + 5;
        
        // Get header colors from config or defaults
        const headerBgColor = templateConfig?.styling?.headerBackgroundColor || colorScheme.primary;
        const headerTextColor = templateConfig?.styling?.headerTextColor || colorScheme.background;
        
        doc.rect(totalBoxX, yPos - 10, totalBoxWidth, totalBoxHeight)
           .fillColor(headerBgColor)
           .fill();
        
        doc.fontSize(bodySize + 2)
           .fillColor(headerTextColor)
           .text('TOTAL:', totalsLabelX, yPos);
        doc.fontSize(bodySize + 4)
           .text(data.totals.total, totalsValueX, yPos, { width: totalsValueWidth, align: 'right' });
        
        return yPos;
    },
    
    /**
     * Render signature section (if configured)
     */
    async renderSignature(doc, data, yPos, colorScheme, templateConfig = null) {
        // Check if signature is enabled and filename is provided
        const includeSignature = templateConfig?.company?.includeSignature !== false; // Default to true if not specified
        const signatureFilename = templateConfig?.company?.signature;
        
        if (!includeSignature || !signatureFilename) {
            console.log('Signature disabled or not configured, skipping signature section');
            return yPos;
        }
        
        // Font configuration
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        const bodyLineHeight = bodySize * 1.5;
        
        try {
            let signatureBuffer;
            
            // Check if signature is an S3 path (contains /)
            if (signatureFilename.includes('/')) {
                console.log(`Fetching signature from S3: ${signatureFilename}`);
                signatureBuffer = await downloadImageFromS3(signatureFilename);
            } else {
                // Local assets folder
                const signaturePath = join(__dirname, '..', '..', 'assets', signatureFilename);
                const fs = await import('fs');
                signatureBuffer = fs.readFileSync(signaturePath);
            }
            
            yPos += bodyLineHeight * 3;
            
            // Signature label
            doc.font(fontFamily)
               .fontSize(bodySize - 1)
               .fillColor('#6b7280')
               .text('Authorized Signatory', 400, yPos, { width: 145, align: 'center' });
            
            // Signature image
            doc.image(signatureBuffer, 415, yPos + 15, { width: 115, height: 40, fit: [115, 40] });
            
            // Line above signature
            doc.moveTo(400, yPos + 60)
               .lineTo(545, yPos + 60)
               .strokeColor(colorScheme.primary)
               .stroke();
            
            yPos += bodyLineHeight;
        } catch (error) {
            console.log('Signature image not found or could not be loaded, skipping signature:', error.message);
        }
        
        return yPos;
    },
    
    /**
     * Render footer notes and terms
     */
    renderFooter(doc, data, yPos, colorScheme, templateConfig = null) {
        // Font configuration
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const headingSize = templateConfig?.fonts?.headingSize || 16;
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        const bodyLineHeight = bodySize * 1.5;
        
        yPos += bodyLineHeight * 4;
        
        const companyState = templateConfig?.company?.address?.state || 'the respective';
        const companyEmail = templateConfig?.company?.email || null;
        
        if (data.order.notes) {
            doc.font(fontFamily)
               .fontSize(headingSize - 4)
               .fillColor('#6b7280')
               .text('NOTES', 50, yPos);
            
            yPos += bodyLineHeight + 5;
            doc.fontSize(bodySize - 2)
               .fillColor('#111827')
               .text(data.order.notes, 50, yPos, { width: 495 });
            
            yPos += bodyLineHeight - 2;
            
            // Contact information
            if (companyEmail) {
               doc.fontSize(bodySize - 2)
                  .fillColor('#111827')
                  .text(`\nIf you have any questions, please contact at ${companyEmail}`, 50, yPos, { width: 495 });
            }

            yPos += bodyLineHeight * 2;
            doc.fontSize(bodySize - 3)
               .fillColor('#111827')
               .text(`\nAll disputes are subject to ${companyState} jurisdiction only. Goods once sold will only be taken back or exchanged as per the store\'s exchange/return policy`, 50, yPos, { width: 495 });
        }
        
        return yPos;
    },
    
    // Export color scheme generator for external use
    getColorScheme
};
