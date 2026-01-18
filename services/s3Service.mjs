import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/awsClients.mjs';

/**
 * Uploads a PDF buffer to S3
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} orderName - Order name/number for filename
 * @returns {Promise<Object>} Object with fileName and s3Url (pre-signed URL valid for 24 hours)
 */
export async function uploadInvoiceToS3(pdfBuffer, orderName) {
    const fileName = `invoices/invoice-${orderName.replace('#', '')}-${Date.now()}.pdf`;
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
