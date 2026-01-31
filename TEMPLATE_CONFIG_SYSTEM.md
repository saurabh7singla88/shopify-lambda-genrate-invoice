# Template Configuration System

## Overview

The invoice generation Lambda now supports dynamic template configuration with a **4-tier fallback mechanism**:

1. **Shop's configured template** from DynamoDB `Shops` table
2. **Shop-specific configuration** from DynamoDB `TemplateConfigurations` table
3. **Default template configuration** from DynamoDB `Templates` table
4. **Environment variables** (backward compatibility)

## Architecture

```
┌──────────────────────┐
│  Shopify Webhook     │
│  (Order Created)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Lambda Handler      │
│  (index.mjs)         │
└──────────┬───────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────┐
│  Template Config Service     │    │  PDF Generator       │
│  (templateConfigService.mjs) │    │  (pdfGenerator.mjs)  │
└──────────┬───────────────────┘    └──────────────────────┘
           │                                     │
           │ ┌───────────────┐                 │
           ├─► DynamoDB      │                 │
           │ │ (Config)      │                 │
           │ └───────────────┘                 │
           │                                     │
           │ ┌───────────────┐                 │
           ├─► DynamoDB      │                 │
           │ │ (Templates)   │                 │
           │ └───────────────┘                 │
           │                                     │
           │ ┌───────────────┐                 │
           └─► Environment   │                 │
             │ Variables     │                 │
             └───────────────┘                 │
                                                │
                                                ▼
                                    ┌──────────────────────┐
                                    │  Minimalist Template │
                                    │  (uses config)       │
                                    └──────────────────────┘
```

## Configuration Flow

### 1. Shop's Template Selection (Priority 1)

```javascript
// Query: Shops table
{
  shop: "my-store.myshopify.com"
}

// Returns:
{
  shop: "my-store.myshopify.com",
  templateId: "minimalist",  // ← Shop's configured template
  accessToken: "...",
  isActive: true
}
```

### 2. Shop-Specific Configuration (Priority 2)

```javascript
// Query: TemplateConfigurations table
{
  shop: "my-store.myshopify.com",
  templateId: "minimalist"
}

// Returns:
{
  shop: "my-store.myshopify.com",
  templateId: "minimalist",
  config: {
    fonts: {
      family: "Helvetica",
      titleSize: 28,
      headingSize: 16,
      bodySize: 11
    },
    colors: {
      primary: "#2563eb",
      secondary: "#6b7280",
      accent: "#2563eb"
    },
    company: {
      name: "My Store",
      legalName: "My Store Pvt Ltd",
      address: { ... },
      gstin: "29XXXXX...",
      logo: "logo.jpg"
    }
  }
}
```

### 3. Default Template Configuration (Priority 3)

```javascript
// Query: Templates table
{
  templateId: "minimalist"  // ← From shop's templateId or default to 'minimalist'
}

// Returns:
{
  templateId: "minimalist",
  templateName: "Minimalist",
  defaultConfig: {
    fonts: { ... },
    colors: { ... },
    company: { ... }
  }
}
```

### 4. Environment Variables (Priority 4 - Fallback)

```bash
# Fonts
INVOICE_FONT_FAMILY="Helvetica"
INVOICE_TITLE_FONT_SIZE="28"
INVOICE_HEADING_FONT_SIZE="16"
INVOICE_BODY_FONT_SIZE="11"

# Colors
INVOICE_PRIMARY_COLOR="#333333"

# Company Info
COMPANY_NAME="Your Company Name"
COMPANY_LEGAL_NAME="Legal Entity Name"
COMPANY_ADDRESS_LINE1="Address Line 1"
COMPANY_ADDRESS_LINE2="Address Line 2"
COMPANY_GSTIN="GSTIN Number"
COMPANY_LOGO_FILENAME="logo.jpg"
```

## Database Schema

### TemplateConfigurations Table

```
Partition Key: shop (String)
Sort Key: templateId (String)

Attributes:
- config (Map)
  - fonts (Map)
    - family (String)
    - titleSize (Number)
    - headingSize (Number)
    - bodySize (Number)
  - colors (Map)
    - primary (String)
    - secondary (String)
    - accent (String)
    - border (String)
    - background (String)
    - error (String)
  - company (Map)
    - name (String)
    - legalName (String)
    - address (Map)
      - line1 (String)
      - line2 (String)
      - state (String)
    - gstin (String)
    - logo (String)
    - signature (String, optional)
- updatedAt (String, ISO timestamp)
- createdAt (String, ISO timestamp)
```

### Templates Table

```
Partition Key: templateId (String)

Attributes:
- templateName (String)
- defaultConfig (Map) - same structure as config above
- createdAt (String, ISO timestamp)
```

## Code Components

### 1. templateConfigService.mjs

**Location:** `lambda-generate-invoice/services/templateConfigService.mjs`

**Functions:**

#### `getTemplateConfig(shop)`

Fetches template configuration with 4-tier fallback.

```javascript
const config = await getTemplateConfig('my-store.myshopify.com');
// Returns: { fonts, colors, company, source: 'database' | 'template_default' | 'env' }
```

**Flow:**
1. Query `Shops` table to get shop's configured `templateId`
2. Query `TemplateConfigurations` table with shop + templateId
3. If not found, query `Templates` table with templateId
4. If not found, return environment variable config

#### `formatConfigForPDF(rawConfig)`

Converts database config to PDF generator format.

```javascript
const formattedConfig = formatConfigForPDF(rawConfig);
// Returns: Flattened config ready for PDF rendering
```

#### `getEnvConfig()`

Fallback function that reads from environment variables.

```javascript
const config = getEnvConfig();
// Returns: Config object from process.env
```

### 2. index.mjs (Lambda Handler)

**Updates:**

```javascript
// Extract shop domain
const shop = shopifyOrder.shop || shopifyOrder.domain;

// Fetch config (automatically gets shop's templateId from Shops table)
const rawConfig = await getTemplateConfig(shop);
const templateConfig = formatConfigForPDF(rawConfig);

// Generate PDF with config
const pdfBuffer = await generateInvoicePDF(invoiceData, templateConfig);
```

### 3. pdfGenerator.mjs

**Updates:**

```javascript
export function generateInvoicePDF(data, templateConfig = null) {
  // Use templateConfig if provided, otherwise fallback to env
  const colorScheme = templateConfig ? 
    template.getColorScheme(templateConfig.colors.primary, templateConfig.colors) :
    template.getColorScheme(process.env.INVOICE_PRIMARY_COLOR);
    
  // Pass config to all template render functions
  template.renderHeader(doc, data, colorScheme, templateConfig);
  template.renderOrderInfo(doc, data, yPos, colorScheme, templateConfig);
  // ... etc
}
```

### 4. minimalistTemplate.mjs

**Updates:**

All render functions now accept `templateConfig` parameter:

```javascript
renderHeader(doc, data, colorScheme, templateConfig = null) {
  // Use config with fallback
  const companyName = templateConfig?.company?.name || process.env.COMPANY_NAME;
  const fontFamily = templateConfig?.fonts?.family || process.env.INVOICE_FONT_FAMILY;
  // ...
}
```

## Usage Examples

### Example 1: Create Shop-Specific Configuration

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

await client.send(new PutCommand({
  TableName: 'TemplateConfigurations',
  Item: {
    shop: 'my-store.myshopify.com',
    templateId: 'minimalist',
    config: {
      fonts: {
        family: 'Helvetica',
        titleSize: 32,
        headingSize: 18,
        bodySize: 12
      },
      colors: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        accent: '#3b82f6',
        border: '#e5e7eb',
        background: '#ffffff',
        error: '#dc2626'
      },
      company: {
        name: 'My Awesome Store',
        legalName: 'My Awesome Store Pvt Ltd',
        address: {
          line1: '123 Main Street',
          line2: 'Mumbai, Maharashtra 400001',
          state: 'Maharashtra'
        },
        gstin: '27XXXXXXXXXXXXX',
        logo: 'my-logo.jpg'
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}));
```

### Example 2: Test Config Fetching

```bash
cd lambda-generate-invoice
node test/test-template-config.mjs
```

### Example 3: Test PDF Generation Locally

```bash
cd lambda-generate-invoice
node test/test-pdf-local.mjs
```

## Environment Variables Required

```bash
# DynamoDB Table Names
SHOPS_TABLE_NAME="Shops"
TEMPLATES_TABLE_NAME="Templates"
TEMPLATE_CONFIG_TABLE_NAME="TemplateConfigurations"

# Fallback Config (used if DB is unavailable)
COMPANY_NAME="Your Company Name"
COMPANY_LEGAL_NAME="Legal Entity Name"
COMPANY_ADDRESS_LINE1="Address Line 1"
COMPANY_ADDRESS_LINE2="Address Line 2"
COMPANY_GSTIN="GSTIN Number"
COMPANY_LOGO_FILENAME="logo.jpg"
INVOICE_FONT_FAMILY="Helvetica"
INVOICE_TITLE_FONT_SIZE="28"
INVOICE_HEADING_FONT_SIZE="16"
INVOICE_BODY_FONT_SIZE="11"
INVOICE_PRIMARY_COLOR="#333333"
```

## Deployment Considerations

### Lambda Function Updates

1. **Add DynamoDB table ARNs** to Lambda execution role:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "dynamodb:GetItem",
       "dynamodb:Query"
     ],
     "Resource": [
       "arn:aws:dynamodb:region:account:table/Shops",
       "arn:aws:dynamodb:region:account:table/Templates",
       "arn:aws:dynamodb:region:account:table/TemplateConfigurations"
     ]
   }
   ```

2. **Add environment variables** to Lambda:
   ```bash
   SHOPS_TABLE_NAME=Shops
   TEMPLATES_TABLE_NAME=Templates
   TEMPLATE_CONFIG_TABLE_NAME=TemplateConfigurations
   ```

3. **Update deployment script** to include new service file

### CloudFormation Template

The CloudFormation template already includes:
- ✅ Shops table
- ✅ Templates table
- ✅ TemplateConfigurations table
- ✅ Environment variables passed to Lambda
- ✅ IAM permissions for Lambda to access tables

## Testing

### Unit Tests

```bash
# Test config service
cd lambda-generate-invoice
node test/test-template-config.mjs

# Test PDF generation with config
node test/test-pdf-local.mjs
```

### Integration Tests

1. Create a test configuration in DynamoDB
2. Trigger order webhook from Shopify
3. Check CloudWatch logs for config source
4. Verify PDF uses correct configuration

### Logs to Monitor

```
Processing order for shop: my-store.myshopify.com
✅ Shop my-store.myshopify.com is using template: modern
✅ Using DB config for shop: my-store.myshopify.com, template: modern
Using config from: database
```

Or:

```
Processing order for shop: new-store.myshopify.com
✅ Shop new-store.myshopify.com is using template: minimalist
⚠️ Shop config not found, fetching default template: minimalist
✅ Using default template config from Templates table
Using config from: template_default
```

Or:

```
Processing order for shop: test-store.myshopify.com
⚠️ Shop not found or no templateId set for test-store.myshopify.com, using default: minimalist
⚠️ Shop config not found, fetching default template: minimalist
✅ Using default template config from Templates table
Using config from: template_default
```

Or:

```
Processing order for shop: old-store.myshopify.com
❌ Error fetching shop: ResourceNotFoundException, using default template: minimalist
⚠️ Template not found in DB, falling back to env variables
Using config from: env
```

## Benefits

1. **Template selection per shop**: Each store can choose their preferred template (minimalist, modern, classic, etc.)
2. **Per-shop customization**: Each store can have unique branding within their chosen template
3. **Graceful degradation**: Falls back to env variables if DB is unavailable
4. **Backward compatible**: Existing deployments continue to work
5. **Template defaults**: New shops automatically get template defaults
6. **Easy updates**: Change configs without redeploying Lambda
7. **Flexible template switching**: Shops can switch templates from the admin UI
8. **Audit trail**: Track config changes through updatedAt timestamps

## Future Enhancements

- [x] Support multiple templates via Shops.templateId field
- [ ] Template preview API endpoint
- [ ] Version history for configurations
- [ ] A/B testing different template configurations
- [ ] Template marketplace for third-party templates
- [ ] Custom CSS/HTML overrides per shop
- [ ] Multi-language support per shop
- [ ] Template inheritance (shop config extends template defaults)
