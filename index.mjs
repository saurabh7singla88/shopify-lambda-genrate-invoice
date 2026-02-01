import { parseShopifyWebhook, transformShopifyOrderToInvoice } from './transformers/shopifyOrderTransformer.mjs';
import { generateInvoicePDF } from './generators/pdfGenerator.mjs';
import { uploadInvoiceToS3 } from './services/s3Service.mjs';
import { sendInvoiceNotification } from './services/snsService.mjs';
import { getTemplateConfig, formatConfigForPDF } from './services/templateConfigService.mjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        console.log('Invoked with event:', JSON.stringify(event, null, 2));
        // Parse Shopify webhook payload
        const shopifyOrder = parseShopifyWebhook(event);
        
        // Extract shop domain from order
        const shop = shopifyOrder.shop || shopifyOrder.domain;
        const orderId = shopifyOrder.id?.toString() || shopifyOrder.name;
        console.log(`Processing order for shop: ${shop}, orderId: ${orderId}`);
        
        // IDEMPOTENCY CHECK: Check if invoice already exists for this order
        console.log(`[Lambda Idempotency] Checking for existing invoice with orderId: ${orderId}`);
        
        try {
            const existingInvoice = await dynamodb.send(new QueryCommand({
                TableName: process.env.INVOICES_TABLE_NAME || 'Invoices',
                IndexName: 'orderId-index',
                KeyConditionExpression: 'orderId = :orderId',
                ExpressionAttributeValues: {
                    ':orderId': orderId
                },
                Limit: 1
            }));
            
            if (existingInvoice.Items && existingInvoice.Items.length > 0) {
                console.log(`[Lambda Idempotency] Invoice already exists for order ${orderId} (ID: ${existingInvoice.Items[0].invoiceId}), skipping duplicate processing`);
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Invoice already exists (duplicate invocation)',
                        invoiceId: existingInvoice.Items[0].invoiceId,
                        orderId: orderId,
                        isDuplicate: true
                    })
                };
            }
            
            console.log(`[Lambda Idempotency] No existing invoice found for order ${orderId}, proceeding with generation`);
        } catch (checkError) {
            console.error('[Lambda Idempotency] Error checking for existing invoice:', checkError);
            // Continue processing if check fails (better to have duplicate than miss an invoice)
        }
        
        // Fetch template configuration from DB or fallback to env
        // The service will query Shops table to get the shop's configured templateId
        const rawConfig = await getTemplateConfig(shop);
        const templateConfig = formatConfigForPDF(rawConfig);
        
        console.log(`Using config from: ${templateConfig.source}`);
        
        // Transform Shopify order to invoice format
        const invoiceData = transformShopifyOrderToInvoice(shopifyOrder);
        
        // Generate PDF using PDFKit with template config
        const pdfBuffer = await generateInvoicePDF(invoiceData, templateConfig);
        
        // Upload to S3 with shop-specific path
        const { fileName, s3Url } = await uploadInvoiceToS3(pdfBuffer, invoiceData.order.name, shop);
        
        // Send email notification via SNS (returns recipient email or null)
        const emailSentTo = await sendInvoiceNotification(invoiceData, s3Url, templateConfig);
        
        // Save invoice record to Invoices table
        const invoiceId = randomUUID();
        const now = Date.now();
        
        try {
            await dynamodb.send(new PutCommand({
                TableName: process.env.INVOICES_TABLE_NAME || 'Invoices',
                Item: {
                    invoiceId,
                    shop,
                    orderId: shopifyOrder.id?.toString() || invoiceData.order.name,
                    orderName: invoiceData.order.name,
                    customerName: invoiceData.customer.name || '',
                    customerEmail: invoiceData.customer.email || '',
                    s3Key: fileName,
                    s3Url,
                    emailSentTo: emailSentTo || '',
                    emailSentAt: emailSentTo ? now : null,
                    total: invoiceData.totals.total,
                    status: emailSentTo ? 'sent' : 'generated',
                    createdAt: now,
                    updatedAt: now
                },
                ConditionExpression: 'attribute_not_exists(invoiceId)' // Prevent duplicate writes
            }));
            console.log(`Invoice record saved: ${invoiceId} for customer: ${invoiceData.customer.name}`);
        } catch (dbError) {
            console.error('Error saving invoice record:', dbError);
            // Continue even if DB save fails
        }
        
        // Update ShopifyOrders table with S3 key (legacy)
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