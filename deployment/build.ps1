# Lambda Deployment Package Builder
# Run this script to create a deployment zip for AWS Lambda

Write-Host "Building Lambda deployment package..." -ForegroundColor Cyan

# Navigate to lambda directory
$lambdaDir = Split-Path -Parent $PSScriptRoot
Set-Location $lambdaDir

# Install/update dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install --production

if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed!" -ForegroundColor Red
    exit 1
}

# Create deployment package
Write-Host "`nCreating deployment zip..." -ForegroundColor Yellow
$deploymentPath = Join-Path $PSScriptRoot "lambda-generate-invoice-deployment.zip"

Compress-Archive -Path *.mjs,*.json,assets,config,generators,services,transformers,utils,node_modules -DestinationPath $deploymentPath -Force

if (Test-Path $deploymentPath) {
    $fileSize = [math]::Round((Get-Item $deploymentPath).Length/1MB, 2)
    Write-Host "`nDeployment package created successfully!" -ForegroundColor Green
    Write-Host "  Location: $deploymentPath" -ForegroundColor Cyan
    Write-Host "  Size: $fileSize MB" -ForegroundColor Cyan
    Write-Host "`nTo deploy to AWS Lambda:" -ForegroundColor Yellow
    Write-Host "  aws lambda update-function-code --function-name your-function-name --zip-file fileb://$deploymentPath" -ForegroundColor Gray
} else {
    Write-Host "Failed to create deployment package!" -ForegroundColor Red
    exit 1
}
