import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/awsClients.mjs';

/**
 * Uploads a PDF buffer to S3
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} orderName - Order name/number for filename
 * @param {string} shop - Shop domain for organizing files
 * @returns {Promise<Object>} Object with fileName and s3Url (pre-signed URL valid for 24 hours)
 */
export async function uploadInvoiceToS3(pdfBuffer, orderName, shop = 'default') {
    // Sanitize shop domain for file path (replace dots with dashes)
    const sanitizedShop = shop.replace(/\./g, '-');
    const fileName = `shops/${sanitizedShop}/invoices/invoice-${orderName.replace('#', '')}-${Date.now()}.pdf`;
    const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf'
    };
    
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log(`PDF uploaded to S3: ${fileName}`);
    
    // Generate pre-signed URL valid for 24 hours
    const getObjectParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName
    };
    
    const s3Url = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), {
           expiresIn: 172800 // 48 hours in seconds
    });
    
    return { fileName, s3Url };
}

/**
 * Downloads an image from S3 (for logos, signatures, etc.)
 * @param {string} s3Key - The S3 key/path of the image
 * @returns {Promise<Buffer>} Image buffer
 */
export async function downloadImageFromS3(s3Key) {
    try {
        const getObjectParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key
        };
        
        const response = await s3Client.send(new GetObjectCommand(getObjectParams));
        const stream = response.Body;
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        console.log(`Image downloaded from S3: ${s3Key}`);
        return buffer;
    } catch (error) {
        console.error(`Error downloading image from S3: ${s3Key}`, error);
        throw error;
    }
}
