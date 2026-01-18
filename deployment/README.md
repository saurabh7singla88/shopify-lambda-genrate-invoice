# Deployment Package

This folder contains the Lambda deployment package for `lambda-generate-invoice`.

## Quick Build

```powershell
.\build.ps1
```

This will:
1. Install production dependencies
2. Create `lambda-generate-invoice-deployment.zip` with all code and node_modules
3. Display file size and AWS CLI deployment command

## Manual Build

```powershell
cd ..
npm install --production
Compress-Archive -Path *.mjs,*.json,assets,config,generators,services,transformers,utils,node_modules -DestinationPath deployment\lambda-generate-invoice-deployment.zip -Force
```

## Deploy to AWS

```bash
aws lambda update-function-code \
  --function-name shopify-invoice-generator \
  --zip-file fileb://deployment/lambda-generate-invoice-deployment.zip
```

Or upload via AWS Console → Lambda → Upload from → .zip file
