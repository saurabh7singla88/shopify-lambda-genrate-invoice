import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';

const region = process.env.AWS_REGION || 'us-east-1';

export const s3Client = new S3Client({ region });
export const snsClient = new SNSClient({ region });
