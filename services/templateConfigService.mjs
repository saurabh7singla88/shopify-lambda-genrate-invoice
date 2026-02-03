import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TEMPLATES_TABLE = process.env.TEMPLATES_TABLE_NAME || 'Templates';
const TEMPLATE_CONFIG_TABLE = process.env.TEMPLATE_CONFIG_TABLE_NAME || 'TemplateConfigurations';
const SHOPS_TABLE = process.env.SHOPS_TABLE_NAME || 'Shops';

/**
 * Fetch template configuration for a shop
 * 1. Gets shop's configured templateId from Shops table
 * 2. Fetches shop-specific config from TemplateConfigurations table
 * 3. Falls back to default template config from Templates table
 * 4. Falls back to env variables if not found in DB
 * @param {string} shop - Shop domain (e.g., "mystore.myshopify.com")
 * @returns {Promise<Object>} Template configuration object
 */
export async function getTemplateConfig(shop) {
    try {
        // Step 1: Get shop's configured templateId
        let templateId = 'minimalist'; // Default fallback
        
        try {
            const shopResult = await dynamodb.send(new GetCommand({
                TableName: SHOPS_TABLE,
                Key: { shop }
            }));
            
            if (shopResult.Item && shopResult.Item.templateId) {
                templateId = shopResult.Item.templateId;
                console.log(`✅ Shop ${shop} is using template: ${templateId}`);
            } else {
                console.log(`⚠️ Shop not found or no templateId set for ${shop}, using default: ${templateId}`);
            }
        } catch (shopError) {
            console.error(`❌ Error fetching shop: ${shopError.message}, using default template: ${templateId}`);
        }
        
        // Step 2: Try to fetch shop-specific configuration
        const configResult = await dynamodb.send(new GetCommand({
            TableName: TEMPLATE_CONFIG_TABLE,
            Key: { shop, templateId }
        }));

        if (configResult.Item) {
            console.log(`✅ Using DB config for shop: ${shop}, template: ${templateId}`);
            return {
                source: 'database',
                templateId: configResult.Item.templateId,
                styling: configResult.Item.styling || {},
                company: configResult.Item.company || {},
                useDatabase: true
            };
        }

        // Step 3: Configuration not found - fetch default template
        console.log(`⚠️ Shop config not found, fetching default template: ${templateId}`);
        const templateResult = await dynamodb.send(new GetCommand({
            TableName: TEMPLATES_TABLE,
            Key: { templateId }
        }));

        if (templateResult.Item && templateResult.Item.defaultConfig) {
            console.log(`✅ Using default template config from Templates table`);
            return {
                source: 'template_default',
                templateId: templateResult.Item.templateId,
                styling: templateResult.Item.defaultConfig.styling || {},
                company: templateResult.Item.defaultConfig.company || {},
                useDatabase: true
            };
        }

        // Step 4: Fallback to environment variables
        console.log(`⚠️ Template not found in DB, falling back to env variables`);
        return getEnvConfig();

    } catch (error) {
        console.error('❌ Error fetching template config from DB:', error);
        console.log('⚠️ Falling back to env variables');
        return getEnvConfig();
    }
}

/**
 * Get configuration from environment variables (fallback)
 * @returns {Object} Configuration from env variables
 */
function getEnvConfig() {
    return {
        source: 'environment',
        templateId: process.env.INVOICE_TEMPLATE || 'minimalist',
        styling: {
            fonts: {
                heading: process.env.INVOICE_FONT_FAMILY || 'Helvetica-Bold',
                body: process.env.INVOICE_FONT_FAMILY || 'Helvetica',
                emphasis: process.env.INVOICE_FONT_FAMILY || 'Helvetica-Bold'
            },
            colors: {
                primary: process.env.INVOICE_PRIMARY_COLOR || '#1a1a1a',
                secondary: '#666666',
                accent: process.env.INVOICE_PRIMARY_COLOR || '#0066cc',
                background: '#ffffff',
                border: '#dddddd'
            }
        },
        company: {
            name: process.env.COMPANY_NAME || 'Your Company Name',
            legalName: process.env.COMPANY_LEGAL_NAME || 'Legal Entity Name',
            address: process.env.COMPANY_ADDRESS_LINE1 || 'Address Line 1',
            addressLine2: process.env.COMPANY_ADDRESS_LINE2 || 'Address Line 2',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            phone: '',
            email: '',
            gstin: process.env.COMPANY_GSTIN || 'GSTIN Number',
            pan: '',
            logo: process.env.COMPANY_LOGO_FILENAME || 'logo.jpg'
        },
        useDatabase: false
    };
}

/**
 * Convert template config to format expected by PDF generator
 * @param {Object} config - Template configuration from DB or env
 * @returns {Object} Formatted configuration for PDF generator
 */
export function formatConfigForPDF(config) {
    return {
        template: config.templateId || 'minimalist',
        fonts: {
            family: config.styling?.fontFamily || config.styling?.fonts?.family || 'Helvetica',
            heading: config.styling?.fonts?.heading || 'Helvetica-Bold',
            body: config.styling?.fonts?.body || 'Helvetica',
            emphasis: config.styling?.fonts?.emphasis || 'Helvetica-Bold',
            titleSize: config.styling?.titleFontSize || config.styling?.fonts?.titleSize || 28,
            headingSize: config.styling?.headingFontSize || config.styling?.fonts?.headingSize || 16,
            bodySize: config.styling?.bodyFontSize || config.styling?.fonts?.bodySize || 11,
            tableSize: config.styling?.itemTableFontSize || config.styling?.fonts?.tableSize || 8
        },
        styling: {
            headerBackgroundColor: config.styling?.headerBackgroundColor || '#333333',
            headerTextColor: config.styling?.headerTextColor || '#ffffff'
        },
        colors: {
            primary: config.styling?.primaryColor || config.styling?.colors?.primary || '#1a1a1a',
            secondary: config.styling?.colors?.secondary || '#666666',
            accent: config.styling?.colors?.accent || config.styling?.primaryColor || '#0066cc',
            background: config.styling?.colors?.background || '#ffffff',
            border: config.styling?.colors?.border || '#dddddd'
        },
        company: {
            name: config.company?.name || config.company?.companyName || 'Your Company Name',
            legalName: config.company?.legalName || config.company?.name || 'Legal Entity Name',
            address: {
                line1: config.company?.addressLine1 || config.company?.address || 'Address Line 1',
                line2: config.company?.addressLine2 || 'Address Line 2',
                city: config.company?.city || '',
                state: config.company?.state || '',
                pincode: config.company?.pincode || ''
            },
            gstin: config.company?.gstin || 'GSTIN Number',
            pan: config.company?.pan || '',
            phone: config.company?.phone || '',
            email: config.company?.email || config.company?.supportEmail || '',
            logo: config.company?.logo || config.company?.logoFilename || 'logo.jpg',
            signature: config.company?.signature || config.company?.signatureFilename || '',
            includeSignature: config.company?.includeSignature !== false,
            sendEmailToCustomer: config.company?.sendEmailToCustomer || false
        },
        source: config.source || 'environment'
    };
}
