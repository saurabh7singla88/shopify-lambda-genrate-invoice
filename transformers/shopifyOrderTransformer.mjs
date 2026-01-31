import { isIntrastate, calculateGSTBreakdown } from '../utils/gstUtils.mjs';

/**
 * Transforms a Shopify order webhook payload into invoice data format
 * @param {Object} shopifyOrder - The Shopify order object
 * @returns {Object} Formatted invoice data
 */
export function transformShopifyOrderToInvoice(shopifyOrder) {
    // Convert INR to Rs. prefix for better PDF compatibility
    const currencySymbol = shopifyOrder.currency === 'INR' ? 'Rs.' : shopifyOrder.currency;
    
    // Extract seller and buyer states for GST calculation
    const sellerState = process.env.COMPANY_STATE || 'Punjab'; // Default from env or config
    const buyerState = shopifyOrder.shipping_address?.province || shopifyOrder.billing_address?.province || '';
    const isIntrastateTxn = isIntrastate(sellerState, buyerState);
    
    // Get total discount from order level
    const totalOrderDiscount = parseFloat(shopifyOrder.current_total_discounts || 0);
    let remainingOrderDiscount = totalOrderDiscount; // Track remaining discount to distribute
    let discountAppliedInLineItems = false; // Track if discount was applied in line items
    
    // Calculate line items with tax - expand items with quantity > 1 into separate rows
    const lineItems = shopifyOrder.line_items?.flatMap(item => {
        const sellingPriceWithTax = parseFloat(item.price); // Selling price includes tax
        const itemQuantity = item.quantity;
        const itemDiscount = item.total_discount ? parseFloat(item.total_discount) : 0;
        const mrp = item.compare_at_price ? parseFloat(item.compare_at_price) : sellingPriceWithTax;
        
        // Extract HSN code using multiple methods (priority order)
        let hsnCode = '';
        
        // Method 1: Check product metafields (custom.hsn_code)
        if (item.product?.metafields) {
            const hsnMetafield = item.product.metafields.find(
                m => m.namespace === 'custom' && m.key === 'hsn_code'
            );
            if (hsnMetafield) hsnCode = hsnMetafield.value;
        }
        
        // Method 2: Check line item properties
        if (!hsnCode && item.properties) {
            const hsnProperty = item.properties.find(
                p => p.name && p.name.toLowerCase().includes('hsn')
            );
            if (hsnProperty) hsnCode = hsnProperty.value;
        }
        
        // Method 3: Extract from SKU (format: HSN[code]-[product-id])
        if (!hsnCode && item.sku) {
            const hsnMatch = item.sku.match(/HSN(\d{4,8})/i);
            if (hsnMatch) hsnCode = hsnMatch[1];
        }
        
        // Use total order discount if line item price is more than discount value, otherwise use line item discount
        // Ensure discount per line item doesn't exceed remaining total discount
        const initialApproximateBasePrice = sellingPriceWithTax / 1.05;
        let discountToUse = (totalOrderDiscount > 0 && initialApproximateBasePrice > totalOrderDiscount) 
            ? Math.min(totalOrderDiscount, remainingOrderDiscount)
            : itemDiscount;
        
        // Deduct used discount from remaining
        if (discountToUse > 0 && totalOrderDiscount > 0) {
            remainingOrderDiscount -= discountToUse;
            discountAppliedInLineItems = true; // Mark that discount was applied
        }
        
        // Create separate rows for each quantity - calculate tax individually per row
        return Array.from({ length: itemQuantity }, (_, index) => {
            const hasDiscount = (index === 0 && discountToUse > 0);
            
            // Calculate base price assuming 5% tax initially
            let taxRate = 0.05;
            let taxDivisor = 1.05;
            let sellingPriceBase = sellingPriceWithTax / taxDivisor;
            
            // Calculate price after discount for this specific row
            const sellingPriceAfterDiscount = hasDiscount ? sellingPriceBase - discountToUse : sellingPriceBase;
            
            // Determine actual tax rate based on price after discount: 5% if < 2500, else 18%
            if (sellingPriceAfterDiscount >= 2500) {
                taxRate = 0.18;
                taxDivisor = 1.18;
                sellingPriceBase = sellingPriceWithTax / taxDivisor;
            }
            
            const perUnitTax = sellingPriceWithTax - sellingPriceBase;
            const finalSellingPriceAfterDiscount = hasDiscount ? sellingPriceBase - discountToUse : sellingPriceBase;
            const finalSellingPriceAfterTax = finalSellingPriceAfterDiscount + perUnitTax;
            
            // Calculate GST breakdown (CGST/SGST or IGST)
            const gstBreakdown = calculateGSTBreakdown(perUnitTax, isIntrastateTxn);
            
            // Build item name with HSN code if available
            const itemName = item.title || item.name;
            const itemNameWithHSN = hsnCode ? `${itemName} (HSN: ${hsnCode})` : itemName;
            
            return {
                name: itemNameWithHSN,
                description: item.variant_title ? `Variant: ${item.variant_title}` : null,
                sku: item.sku || null,
                quantity: 1, // Always 1 per row
                mrp: `${currencySymbol} ${mrp.toFixed(2)}`,
                discount: hasDiscount ? `${currencySymbol} ${discountToUse.toFixed(2)}` : `${currencySymbol} 0.00`,
                sellingPrice: `${currencySymbol} ${finalSellingPriceAfterDiscount.toFixed(2)}`,
                tax: `${currencySymbol} ${perUnitTax.toFixed(2)}`,
                sellingPriceAfterTax: `${currencySymbol} ${finalSellingPriceAfterTax.toFixed(2)}`,
                _totalItemTax: perUnitTax, // Tax per individual unit
                _cgst: gstBreakdown.cgst,
                _sgst: gstBreakdown.sgst,
                _igst: gstBreakdown.igst
            };
        });
    }) || [];
    
    // Calculate total tax by summing all item taxes
    const calculatedTotalTax = lineItems.reduce((sum, item) => sum + (item._totalItemTax || 0), 0);
    
    // Calculate GST breakdown for totals
    const totalCGST = lineItems.reduce((sum, item) => sum + (item._cgst || 0), 0);
    const totalSGST = lineItems.reduce((sum, item) => sum + (item._sgst || 0), 0);
    const totalIGST = lineItems.reduce((sum, item) => sum + (item._igst || 0), 0);
    
    // Calculate subtotal before tax by summing all line item selling prices (after discount)
    const calculatedSubtotalBeforeTax = lineItems.reduce((sum, item) => {
        const itemPrice = parseFloat(item.sellingPrice.replace('Rs. ', '').replace(/,/g, ''));
        return sum + itemPrice;
    }, 0);
    
    return {
        order: {
            name: shopifyOrder.name,
            date: new Date(shopifyOrder.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
            dueDate: null,
            notes: shopifyOrder.note || "Thank you for your purchase!"
        },
        customer: {
            name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || shopifyOrder.billing_address?.name || '',
            company: shopifyOrder.customer?.company || shopifyOrder.billing_address?.company || null,
            email: shopifyOrder.email || shopifyOrder.customer?.email || '',
            phone: shopifyOrder.phone || shopifyOrder.customer?.phone || shopifyOrder.billing_address?.phone || null
        },
        shippingAddress: {
            name: shopifyOrder.shipping_address?.name || shopifyOrder.billing_address?.name || '',
            address: `${shopifyOrder.shipping_address?.address1 || ''} ${shopifyOrder.shipping_address?.address2 || ''}`.trim(),
            city: shopifyOrder.shipping_address?.city || '',
            state: shopifyOrder.shipping_address?.province || '',
            zip: shopifyOrder.shipping_address?.zip || ''
        },
        lineItems: lineItems,
        totals: {
            // Subtotal is sum of all line items before tax (already includes discount adjustment if applied)
            subtotal: `${currencySymbol} ${calculatedSubtotalBeforeTax.toFixed(2)}`,
            // Show discount in totals only if it wasn't applied in line items
            discount: (!discountAppliedInLineItems && totalOrderDiscount > 0)
                ? `-${currencySymbol} ${totalOrderDiscount.toFixed(2)}`
                : null,
            shipping: `${currencySymbol} ${parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || 0).toFixed(2)}`,
            tax: `${currencySymbol} ${calculatedTotalTax.toFixed(2)}`,
            cgst: totalCGST > 0 ? `${currencySymbol} ${totalCGST.toFixed(2)}` : null,
            sgst: totalSGST > 0 ? `${currencySymbol} ${totalSGST.toFixed(2)}` : null,
            igst: totalIGST > 0 ? `${currencySymbol} ${totalIGST.toFixed(2)}` : null,
            total: `${currencySymbol} ${parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_price).toFixed(2)}`
        }
    };
}

/**
 * Parses the Shopify webhook event body
 * @param {Object} event - Lambda event object
 * @returns {Object} Parsed Shopify order
 */
export function parseShopifyWebhook(event) {
    // Log the event for debugging
    console.log('Event structure:', JSON.stringify({
        hasHeaders: !!event.headers,
        headerKeys: event.headers ? Object.keys(event.headers) : [],
        hasBody: !!event.body,
        bodyType: typeof event.body,
        hasOrderId: !!event.id,
        hasOrderName: !!event.name
    }));
    
    // Handle two cases:
    // Case 1: API Gateway event (has headers and body)
    // Case 2: Direct Lambda invocation (event IS the order object)
    let body;
    if (event.body) {
        // API Gateway format
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (event.id && event.name) {
        // Direct invocation - event is the order itself
        body = event;
    } else {
        // Fallback
        body = event;
    }
    
    // Extract shop domain from multiple sources with priority
    const shopDomain = 
        // Priority 1: Headers (for API Gateway events)
        event.headers?.['X-Shopify-Shop-Domain'] 
        || event.headers?.['x-shopify-shop-domain']
        // Priority 2: Order body fields
        || body.shop_domain
        || body.myshopify_domain
        || body.domain
        // Priority 3: Extract from order source_name or other fields
        || (body.source_name === 'shopify' && body.checkout_id ? extractShopFromCheckout(body) : null)
        // Priority 4: Use environment variable as last resort
        || process.env.DEFAULT_SHOP_DOMAIN;
    
    console.log('Extracted shop domain:', shopDomain);
    
    if (!shopDomain) {
        console.warn('⚠️ Could not determine shop domain. Order fields:', Object.keys(body));
    }
    
    // Add shop domain to the order object for easier access
    return {
        ...body,
        shop: shopDomain
    };
}

// Helper function to extract shop from checkout or other order metadata
function extractShopFromCheckout(order) {
    // Try to extract from admin_graphql_api_id or other fields
    if (order.admin_graphql_api_id) {
        // Format: gid://shopify/Order/123456789
        return null; // Can't extract shop from this
    }
    return null;
}
