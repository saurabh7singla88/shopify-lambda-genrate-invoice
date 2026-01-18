# Lambda Deployment Guide - Modular Invoice Generator

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed (optional for CLI deployment)
- Node.js 18.x or 20.x installed locally
- S3 bucket for storing invoices
- SNS topic for email notifications

---

## Step 1: Install Dependencies

```powershell
# Navigate to the project directory
cd invoice-generation-from-code

# Install dependencies
npm install
```

**Required packages:**
- `pdfkit` - PDF generation
- `@aws-sdk/client-s3` - S3 file uploads
- `@aws-sdk/client-sns` - Email notifications

---

## Step 2: Create Deployment Package

### Option A: PowerShell (Windows)
```powershell
# Create zip file with all required files
Compress-Archive -Path index.mjs,package.json,node_modules,config,transformers,generators,services -DestinationPath lambda-deployment.zip -Force
```

### Option B: Bash (Linux/Mac)
```bash
# Create zip file with all required files
zip -r lambda-deployment.zip index.mjs package.json node_modules/ config/ transformers/ generators/ services/
```

**Files included:**
- `index.mjs` - Main Lambda handler
- `package.json` - Dependencies manifest
- `node_modules/` - All npm dependencies
- `config/` - AWS client configuration
- `transformers/` - Data transformation logic
- `generators/` - PDF generation
- `services/` - S3 and SNS services

---

## Step 3: Deploy via AWS Console (Recommended)

### Step 3.1: Create Lambda Function
1. Go to AWS Lambda Console: https://console.aws.amazon.com/lambda
2. Click **"Create function"**
3. Choose **"Author from scratch"**
4. Configure:
   - **Function name**: `shopify-invoice-generator`
   - **Runtime**: Node.js 20.x
   - **Architecture**: x86_64
   - **Permissions**: Create a new role with basic Lambda permissions
5. Click **"Create function"**

### Step 3.2: Upload Deployment Package
1. In the **"Code"** tab, click **"Upload from"** → **".zip file"**
2. Upload `lambda-deployment.zip`
3. Click **"Save"**
4. Wait for the upload to complete (may take 1-2 minutes)

### Step 3.3: Configure Handler
1. Scroll to **"Runtime settings"**
2. Click **"Edit"**
3. Set **Handler** to: `index.handler`
4. Click **"Save"**

### Step 3.4: Configure Function Settings
1. Go to **"Configuration"** → **"General configuration"**
2. Click **"Edit"**
3. Set:
   - **Memory**: 512 MB (recommended for PDF generation)
   - **Timeout**: 30 seconds
   - **Ephemeral storage**: 512 MB (default)
4. Click **"Save"**

### Step 3.5: Configure Environment Variables
1. Go to **"Configuration"** → **"Environment variables"**
2. Click **"Edit"** → **"Add environment variable"**
3. Add the following:
   - `S3_BUCKET_NAME` = `your-invoice-bucket-name`
   - `SNS_TOPIC_ARN` = `arn:aws:sns:region:account-id:topic-name`
   - `AWS_REGION` = `us-east-1` (or your preferred region)
4. Click **"Save"**

### Step 3.6: Configure IAM Permissions
1. Go to **"Configuration"** → **"Permissions"**
2. Click on the **Role name** (opens IAM console)
3. Click **"Add permissions"** → **"Create inline policy"**
4. Use JSON policy editor and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::your-invoice-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

5. Name the policy `InvoiceGeneratorPolicy`
6. Click **"Create policy"**

### Step 3.7: Create Function URL (for Shopify Webhook)
1. Go to **"Configuration"** → **"Function URL"**
2. Click **"Create function URL"**
3. Configure:
   - **Auth type**: NONE (Shopify webhooks don't use AWS IAM auth)
   - **Invoke mode**: BUFFERED
   - **CORS**: Configure if needed (optional)
4. Click **"Save"**
5. **Copy the Function URL** - you'll need this for Shopify webhook setup

---

## Step 4: Set Up AWS Resources

### Create S3 Bucket
```powershell
# Via AWS CLI
aws s3api create-bucket `
  --bucket your-invoice-bucket-name `
  --region us-east-1

# Enable versioning (optional)
aws s3api put-bucket-versioning `
  --bucket your-invoice-bucket-name `
  --versioning-configuration Status=Enabled

# Set bucket lifecycle policy (optional - auto-delete old invoices after 90 days)
aws s3api put-bucket-lifecycle-configuration `
  --bucket your-invoice-bucket-name `
  --lifecycle-configuration file://bucket-lifecycle.json
```

**bucket-lifecycle.json:**
```json
{
  "Rules": [
    {
      "Id": "DeleteOldInvoices",
      "Status": "Enabled",
      "Prefix": "invoices/",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

### Create SNS Topic
```powershell
# Via AWS CLI
aws sns create-topic --name invoice-notifications

# Subscribe email to topic
aws sns subscribe `
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:invoice-notifications `
  --protocol email `
  --notification-endpoint billing@pistagreen.com

# Confirm subscription via email
```

---

## Step 5: Test the Lambda Function
1. Go to **"Test"** tab in Lambda console
2. Click **"Create new event"**
3. Configure:
   - **Event name**: `ShopifyOrderTest`
   - **Template**: hello-world
   - Replace the event JSON with:

```json
{
  "body": "{\"id\":6220099027004,\"name\":\"1183\",\"order_number\":1183,\"created_at\":\"2025-12-07T16:29:36+05:30\",\"currency\":\"INR\",\"current_subtotal_price\":\"790.00\",\"current_total_tax\":\"37.62\",\"current_total_price\":\"827.62\",\"email\":\"customer@example.com\",\"phone\":\"+919501201259\",\"customer\":{\"first_name\":\"John\",\"last_name\":\"Doe\",\"email\":\"customer@example.com\"},\"line_items\":[{\"title\":\"Sample Product\",\"variant_title\":\"Medium\",\"sku\":\"SKU-001\",\"price\":\"790.00\",\"quantity\":1}],\"shipping_address\":{\"name\":\"John Doe\",\"address1\":\"123 Main Street\",\"address2\":\"Apt 4B\",\"city\":\"San Francisco\",\"province\":\"California\",\"zip\":\"94103\",\"country\":\"United States\"},\"billing_address\":{\"name\":\"John Doe\",\"company\":\"ACME Corp\"},\"total_shipping_price_set\":{\"shop_money\":{\"amount\":\"0.00\"}},\"note\":\"Thank you for your order!\"}"
}
```

4. Click **"Test"**
5. Check the response:
   - **Status Code**: Should be `200`
   - **Response body**: Should contain `s3Url` and `fileName`
6. Verify in CloudWatch Logs for detailed execution logs
7. Check S3 bucket for generated PDF
8. Check email for SNS notification

---

## Step 6: Deploy via AWS CLI (Alternative)

### Prerequisites
```powershell
# Configure AWS CLI
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region
```

### Create IAM Role
```powershell
# Create trust policy file
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@ | Out-File -FilePath trust-policy.json -Encoding UTF8

# Create role
aws iam create-role `
  --role-name InvoiceGeneratorLambdaRole `
  --assume-role-policy-document file://trust-policy.json

# Attach basic execution policy
aws iam attach-role-policy `
  --role-name InvoiceGeneratorLambdaRole `
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create and attach custom policy
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::your-invoice-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "*"
    }
  ]
}
"@ | Out-File -FilePath invoice-policy.json -Encoding UTF8

aws iam put-role-policy `
  --role-name InvoiceGeneratorLambdaRole `
  --policy-name InvoiceGeneratorPolicy `
  --policy-document file://invoice-policy.json
```

### Deploy Lambda Function
```powershell
# Get account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text

# Create Lambda function
aws lambda create-function `
  --function-name shopify-invoice-generator `
  --runtime nodejs20.x `
  --role arn:aws:iam::${ACCOUNT_ID}:role/InvoiceGeneratorLambdaRole `
  --handler index.handler `
  --zip-file fileb://lambda-deployment.zip `
  --timeout 30 `
  --memory-size 512 `
  --environment "Variables={S3_BUCKET_NAME=your-invoice-bucket-name,SNS_TOPIC_ARN=arn:aws:sns:us-east-1:${ACCOUNT_ID}:invoice-notifications,AWS_REGION=us-east-1}"

# Create Function URL
aws lambda create-function-url-config `
  --function-name shopify-invoice-generator `
  --auth-type NONE `
  --cors '{"AllowOrigins":["*"],"AllowMethods":["POST"],"AllowHeaders":["*"],"MaxAge":86400}'

# Add public access permission
aws lambda add-permission `
  --function-name shopify-invoice-generator `
  --statement-id FunctionURLAllowPublicAccess `
  --action lambda:InvokeFunctionUrl `
  --principal "*" `
  --function-url-auth-type NONE

# Get Function URL
aws lambda get-function-url-config --function-name shopify-invoice-generator
```

### Update Existing Function
```powershell
# Update function code
aws lambda update-function-code `
  --function-name shopify-invoice-generator `
  --zip-file fileb://lambda-deployment.zip

# Update environment variables
aws lambda update-function-configuration `
  --function-name shopify-invoice-generator `
  --environment "Variables={S3_BUCKET_NAME=your-invoice-bucket-name,SNS_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:invoice-notifications,AWS_REGION=us-east-1}"
```

---

## Step 7: Shopify Webhook Configuration

1. **Log in to Shopify Admin**
2. Go to **Settings** → **Notifications**
3. Scroll down to **Webhooks** section
4. Click **"Create webhook"**
5. Configure webhook:
   - **Event**: `Order creation`
   - **Format**: `JSON`
   - **URL**: Paste your Lambda Function URL
   - **Webhook API version**: `2024-10` (or latest stable)
6. Click **"Save webhook"**

### Test Webhook
1. Create a test order in Shopify
2. Check CloudWatch Logs in AWS Console
3. Verify PDF was uploaded to S3
4. Check email for invoice notification

---

## Monitoring & Troubleshooting

### CloudWatch Logs
```powershell
# View recent logs via CLI
aws logs tail /aws/lambda/shopify-invoice-generator --follow

# View specific log stream
aws logs get-log-events `
  --log-group-name /aws/lambda/shopify-invoice-generator `
  --log-stream-name 'LATEST_STREAM_NAME'
```

### Common Issues

#### "Module not found" Error
**Cause**: Missing dependencies or incorrect handler path
**Solution**:
- Verify `node_modules/` is included in zip
- Check handler is set to `index.handler`
- Ensure all module paths use `.mjs` extension

#### "Task timed out after 30.00 seconds"
**Cause**: PDF generation taking too long or S3/SNS calls hanging
**Solution**:
- Increase timeout to 60 seconds
- Check S3 bucket permissions
- Verify SNS topic ARN is correct
- Check network connectivity to AWS services

#### "Access Denied" on S3 Upload
**Cause**: Lambda role lacks S3 permissions
**Solution**:
```powershell
# Add S3 permissions to role
aws iam attach-role-policy `
  --role-name InvoiceGeneratorLambdaRole `
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

#### "Invalid parameter: TopicArn" on SNS
**Cause**: Incorrect or missing SNS_TOPIC_ARN environment variable
**Solution**:
- Verify SNS topic exists: `aws sns list-topics`
- Update environment variable with correct ARN
- Ensure topic is in the same region

#### Cold Start Performance
**Cause**: Lambda takes longer on first invocation
**Solution**:
- Use Provisioned Concurrency (costs money)
- Accept 1-2 second cold start for cost savings
- Warm up function with scheduled ping every 5 minutes

### Performance Metrics
- **Cold Start**: ~800ms - 1.5s
- **Warm Execution**: ~200ms - 500ms
- **PDF Generation**: ~100-300ms
- **S3 Upload**: ~50-150ms (depends on PDF size)
- **Total**: ~400ms - 2s per invoice

---

## Cost Estimation

### AWS Lambda
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **Example**: 1,000 orders/month with 512MB, 2s avg
  - Compute: 1,000 × 2s × 0.5GB × $0.0000166667 = $0.017
  - Requests: 1,000 × $0.20/1M = $0.0002
  - **Total Lambda**: ~$0.02/month

### S3 Storage
- **Storage**: $0.023 per GB/month
- **Example**: 1,000 PDFs × 50KB = 50MB
  - **Total S3**: ~$0.001/month

### SNS
- **Email**: $2 per 100,000 notifications
- **Example**: 1,000 emails/month
  - **Total SNS**: ~$0.02/month

**Grand Total**: ~$0.05/month for 1,000 orders

---

## Production Checklist

- [ ] Install all dependencies with `npm install`
- [ ] Create deployment package with all modules
- [ ] Create S3 bucket for invoice storage
- [ ] Create SNS topic and subscribe email
- [ ] Create Lambda function with Node.js 20.x
- [ ] Upload deployment package
- [ ] Configure handler to `index.handler`
- [ ] Set memory to 512MB and timeout to 30s
- [ ] Add environment variables (S3_BUCKET_NAME, SNS_TOPIC_ARN, AWS_REGION)
- [ ] Configure IAM role with S3 and SNS permissions
- [ ] Create Function URL with NONE auth type
- [ ] Test with sample order payload
- [ ] Configure Shopify webhook with Function URL
- [ ] Test with real Shopify order
- [ ] Monitor CloudWatch Logs
- [ ] Verify S3 uploads and email notifications
- [ ] Set up CloudWatch alarms for errors (optional)
- [ ] Configure S3 lifecycle policy for old invoices (optional)

---

## Updates & Maintenance

### Update Lambda Code
```powershell
# After making changes, rebuild and redeploy
npm install  # If dependencies changed

# Create new deployment package
Compress-Archive -Path index.mjs,package.json,node_modules,config,transformers,generators,services -DestinationPath lambda-deployment.zip -Force

# Update via CLI
aws lambda update-function-code `
  --function-name shopify-invoice-generator `
  --zip-file fileb://lambda-deployment.zip

# Or upload manually via AWS Console
```

### Monitor Function Health
```powershell
# Get function metrics
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Invocations `
  --dimensions Name=FunctionName,Value=shopify-invoice-generator `
  --start-time 2025-12-27T00:00:00Z `
  --end-time 2025-12-27T23:59:59Z `
  --period 3600 `
  --statistics Sum

# Check error rate
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Errors `
  --dimensions Name=FunctionName,Value=shopify-invoice-generator `
  --start-time 2025-12-27T00:00:00Z `
  --end-time 2025-12-27T23:59:59Z `
  --period 3600 `
  --statistics Sum
```

---

## Security Best Practices

1. **Webhook Validation**: Add HMAC signature verification for Shopify webhooks
2. **Least Privilege**: Grant minimal IAM permissions needed
3. **Environment Variables**: Use AWS Secrets Manager for sensitive data
4. **S3 Bucket**: Enable encryption at rest and versioning
5. **VPC**: Deploy Lambda in VPC for enhanced security (optional)
6. **Logging**: Enable CloudWatch Logs with appropriate retention
7. **Rate Limiting**: Implement throttling to prevent abuse

---

## Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Shopify Webhooks Guide](https://shopify.dev/docs/api/admin-rest/2024-10/resources/webhook)
- [PDFKit Documentation](https://pdfkit.org/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)

---

## Support

For issues or questions:
1. Check CloudWatch Logs for error details
2. Review this deployment guide
3. Verify all environment variables are set correctly
4. Test with the provided sample payload
5. Check IAM permissions for Lambda role
