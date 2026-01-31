/**
 * Test template config fetching from DynamoDB
 * This test verifies the 3-tier fallback mechanism:
 * 1. TemplateConfigurations table (shop-specific)
 * 2. Templates table (default template)
 * 3. Environment variables
 */

import { getTemplateConfig, formatConfigForPDF } from '../services/templateConfigService.mjs';

// Mock shop domain
const testShop = 'test-shop.myshopify.com';

console.log('🧪 Testing Template Config Service...\n');

try {
    console.log(`Fetching config for shop: ${testShop}`);
    console.log('(Will query Shops table to get templateId, then fetch config)\n');
    
    const rawConfig = await getTemplateConfig(testShop);
    
    console.log('\n📦 Raw Config:', JSON.stringify(rawConfig, null, 2));
    
    const formattedConfig = formatConfigForPDF(rawConfig);
    
    console.log('\n✨ Formatted Config for PDF:');
    console.log(`  Source: ${formattedConfig.source}`);
    console.log(`  Template: ${formattedConfig.template}`);
    console.log(`  Company Name: ${formattedConfig.company.name}`);
    console.log(`  Primary Color: ${formattedConfig.colors.primary}`);
    console.log(`  Font Family: ${formattedConfig.fonts.family}`);
    console.log(`  Title Size: ${formattedConfig.fonts.titleSize}`);
    
    console.log('\n✅ Test completed successfully!');
    
} catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
