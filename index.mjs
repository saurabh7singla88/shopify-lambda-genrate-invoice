import { parseShopifyWebhook, transformShopifyOrderToInvoice } from './transformers/shopifyOrderTransformer.mjs';
import { generateInvoicePDF } from './generators/pdfGenerator.mjs';
import { uploadInvoiceToS3 } from './services/s3Service.mjs';
import { sendInvoiceNotification } from './services/snsService.mjs';
import { getTemplateConfig, formatConfigForPDF } from './services/templateConfigService.mjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        console.log('Invoked with event:', JSON.stringify(event, null, 2));
        // Parse Shopify webhook payload
        const shopifyOrder = parseShopifyWebhook(event);
        
        // Extract shop domain from order
        const shop = shopifyOrder.shop || shopifyOrder.domain;
        console.log(`Processing order for shop: ${shop}`);
        
        // Fetch template configuration from DB or fallback to env
        // The service will query Shops table to get the shop's configured templateId
        const rawConfig = await getTemplateConfig(shop);
        const templateConfig = formatConfigForPDF(rawConfig);
        
        console.log(`Using config from: ${templateConfig.source}`);
        
        // Transform Shopify order to invoice format
        const invoiceData = transformShopifyOrderToInvoice(shopifyOrder);
        
        // Generate PDF using PDFKit with template config
        const pdfBuffer = await generateInvoicePDF(invoiceData, templateConfig);
        
        // Upload to S3
        const { fileName, s3Url } = await uploadInvoiceToS3(pdfBuffer, invoiceData.order.name);
        
        // Update DynamoDB with S3 key
        try {
            await dynamodb.send(new UpdateCommand({
                TableName: process.env.TABLE_NAME || 'ShopifyOrders',
                Key: {
                    name: invoiceData.order.name // Using order name as partition key
                },
                UpdateExpression: 'SET s3Key = :s3Key, invoiceGenerated = :generated, invoiceGeneratedAt = :timestamp',
                ExpressionAttributeValues: {
                    ':s3Key': fileName,
                    ':generated': true,
                    ':timestamp': new Date().toISOString()
                }
            }));
            console.log(`DynamoDB updated with S3 key: ${fileName}`);
        } catch (dbError) {
            console.error('Error updating DynamoDB:', dbError);
            // Continue even if DB update fails
        }
        
        // Send email notification via SNS
        await sendInvoiceNotification(invoiceData, s3Url);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Invoice generated and uploaded to S3 successfully',
                fileName: fileName,
                s3Url: s3Url,
                orderNumber: invoiceData.order.name,
                pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};