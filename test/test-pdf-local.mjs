import { generateInvoicePDF } from '../generators/pdfGenerator.mjs';
import { parseShopifyWebhook, transformShopifyOrderToInvoice } from '../transformers/shopifyOrderTransformer.mjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env'), override: true });

const shopifyOrder = {
    "id": 6268524396604,
    "admin_graphql_api_id": "gid://shopify/Order/6268524396604",
    "app_id": 580111,
    "browser_ip": "112.79.67.24",
    "buyer_accepts_marketing": false,
    "cancel_reason": null,
    "cancelled_at": null,
    "cart_token": "hWN6cNZXZemrDJSUALGolqcM",
    "checkout_id": 26813178937404,
    "checkout_token": "d557465093879d4e81327567115561d8",
    "client_details": {
        "accept_language": "en-IN",
        "browser_height": null,
        "browser_ip": "112.79.67.24",
        "browser_width": null,
        "session_hash": null,
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/23C55 Instagram 410.0.0.29.70 (iPhone14,5; iOS 26_2; en_GB; en-GB; scale=3.00; 1170x2532; IABMV/1; 843189213) Safari/604.1"
    },
    "closed_at": null,
    "confirmation_number": "VCHX1Z0QC",
    "confirmed": true,
    "contact_email": "ritikamishra570@gmail.com",
    "created_at": "2025-12-29T09:54:05+05:30",
    "currency": "INR",
    "current_shipping_price_set": {
        "shop_money": {
            "amount": "0.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "0.00",
            "currency_code": "INR"
        }
    },
    "current_subtotal_price": "2190.00",
    "current_subtotal_price_set": {
        "shop_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        }
    },
    "current_total_additional_fees_set": null,
    "current_total_discounts": "400.00",
    "current_total_discounts_set": {
        "shop_money": {
            "amount": "400.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "400.00",
            "currency_code": "INR"
        }
    },
    "current_total_duties_set": null,
    "current_total_price": "2190.00",
    "current_total_price_set": {
        "shop_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        }
    },
    "current_total_tax": "104.29",
    "current_total_tax_set": {
        "shop_money": {
            "amount": "104.29",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "104.29",
            "currency_code": "INR"
        }
    },
    "customer_locale": "en-IN",
    "device_id": null,
    "discount_codes": [
        {
            "code": "WELCOME400",
            "amount": "400.00",
            "type": "fixed_amount"
        }
    ],
    "duties_included": false,
    "email": "ritikamishra570@gmail.com",
    "estimated_taxes": false,
    "financial_status": "paid",
    "fulfillment_status": null,
    "landing_site": "/products/work-to-weekend-smart-trousers-2?utm_medium=paid&utm_id=120238505458210315&utm_content=120239269625290315&utm_term=120238505458220315&utm_campaign=120238505458210315&fbclid=PAZXh0bgNhZW0BMABhZGlkAass-qEa4-tzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAa",
    "landing_site_ref": null,
    "location_id": null,
    "merchant_business_entity_id": "MTY0Njg4NTU0MDQ0",
    "merchant_of_record_app_id": null,
    "name": "PG1229",
    "note": null,
    "note_attributes": [],
    "number": 229,
    "order_number": 1229,
    "order_status_url": "https://pistagreen.com/64688554044/orders/7f68df802166bb539174790b4b701c8c/authenticate?key=95ce5716f1b80025467dff0d061c6ebf",
    "original_total_additional_fees_set": null,
    "original_total_duties_set": null,
    "payment_gateway_names": [
        "1 Razorpay"
    ],
    "phone": null,
    "po_number": null,
    "presentment_currency": "INR",
    "processed_at": "2025-12-29T09:54:04+05:30",
    "reference": null,
    "referring_site": null,
    "source_identifier": null,
    "source_name": "web",
    "source_url": null,
    "subtotal_price": "2190.00",
    "subtotal_price_set": {
        "shop_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        }
    },
    "tags": "",
    "tax_exempt": false,
    "tax_lines": [
        {
            "price": "104.29",
            "rate": 0.05,
            "title": "IGST",
            "price_set": {
                "shop_money": {
                    "amount": "104.29",
                    "currency_code": "INR"
                },
                "presentment_money": {
                    "amount": "104.29",
                    "currency_code": "INR"
                }
            },
            "channel_liable": false
        }
    ],
    "taxes_included": true,
    "test": false,
    "token": "7f68df802166bb539174790b4b701c8c",
    "total_cash_rounding_payment_adjustment_set": {
        "shop_money": {
            "amount": "0.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "0.00",
            "currency_code": "INR"
        }
    },
    "total_cash_rounding_refund_adjustment_set": {
        "shop_money": {
            "amount": "0.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "0.00",
            "currency_code": "INR"
        }
    },
    "total_discounts": "400.00",
    "total_discounts_set": {
        "shop_money": {
            "amount": "400.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "400.00",
            "currency_code": "INR"
        }
    },
    "total_line_items_price": "2590.00",
    "total_line_items_price_set": {
        "shop_money": {
            "amount": "2590.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "2590.00",
            "currency_code": "INR"
        }
    },
    "total_outstanding": "0.00",
    "total_price": "2190.00",
    "total_price_set": {
        "shop_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "2190.00",
            "currency_code": "INR"
        }
    },
    "total_shipping_price_set": {
        "shop_money": {
            "amount": "0.00",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "0.00",
            "currency_code": "INR"
        }
    },
    "total_tax": "104.29",
    "total_tax_set": {
        "shop_money": {
            "amount": "104.29",
            "currency_code": "INR"
        },
        "presentment_money": {
            "amount": "104.29",
            "currency_code": "INR"
        }
    },
    "total_tip_received": "0.00",
    "total_weight": 460,
    "updated_at": "2025-12-29T09:54:07+05:30",
    "user_id": null,
    "billing_address": {
        "first_name": "Ritika",
        "address1": "Sant Dnyaneshwar Road Nensey Colony Borivali East",
        "phone": "9769003006",
        "city": "Mumbai",
        "zip": "400066",
        "province": "Maharashtra",
        "country": "India",
        "last_name": "Mishra",
        "address2": "C-102 - Adinath Tower",
        "company": null,
        "latitude": 19.2361493,
        "longitude": 72.8640329,
        "name": "Ritika Mishra",
        "country_code": "IN",
        "province_code": "MH"
    },
    "customer": {
        "id": 8146247614524,
        "created_at": "2025-12-29T09:53:13+05:30",
        "updated_at": "2025-12-29T09:54:06+05:30",
        "first_name": "Ritika",
        "last_name": "Mishra",
        "state": "disabled",
        "note": null,
        "verified_email": true,
        "multipass_identifier": null,
        "tax_exempt": false,
        "email": "ritikamishra570@gmail.com",
        "phone": null,
        "currency": "INR",
        "tax_exemptions": [],
        "admin_graphql_api_id": "gid://shopify/Customer/8146247614524",
        "default_address": {
            "id": 9256218165308,
            "customer_id": 8146247614524,
            "first_name": "Ritika",
            "last_name": "Mishra",
            "company": null,
            "address1": "Sant Dnyaneshwar Road Nensey Colony Borivali East",
            "address2": "C-102 - Adinath Tower",
            "city": "Mumbai",
            "province": "Maharashtra",
            "country": "India",
            "zip": "400066",
            "phone": "9769003006",
            "name": "Ritika Mishra",
            "province_code": "MH",
            "country_code": "IN",
            "country_name": "India",
            "default": true
        }
    },
    "discount_applications": [
        {
            "target_type": "shipping_line",
            "type": "automatic",
            "value": "100.0",
            "value_type": "percentage",
            "allocation_method": "each",
            "target_selection": "entitled",
            "title": "FREE Shipping"
        },
        {
            "target_type": "line_item",
            "type": "discount_code",
            "value": "400.0",
            "value_type": "fixed_amount",
            "allocation_method": "across",
            "target_selection": "all",
            "code": "WELCOME400"
        }
    ],
    "fulfillments": [],
    "line_items": [
        {
            "id": 15652522950716,
            "admin_graphql_api_id": "gid://shopify/LineItem/15652522950716",
            "attributed_staffs": [],
            "current_quantity": 1,
            "fulfillable_quantity": 1,
            "fulfillment_service": "manual",
            "fulfillment_status": null,
            "gift_card": false,
            "grams": 460,
            "name": "Japanese Crepe Tailored Pleated Trousers | Latte Cream - XS",
            "price": "2590.00",
            "price_set": {
                "shop_money": {
                    "amount": "2590.00",
                    "currency_code": "INR"
                },
                "presentment_money": {
                    "amount": "2590.00",
                    "currency_code": "INR"
                }
            },
            "product_exists": true,
            "product_id": 8642806218812,
            "properties": [
                {
                    "name": "HSN Code",
                    "value": "6204"
                }
            ],
            "quantity": 1,
            "requires_shipping": true,
            "sales_line_item_group_id": null,
            "sku": null,
            "taxable": true,
            "title": "Japanese Crepe Tailored Pleated Trousers | Latte Cream",
            "total_discount": "0.00",
            "total_discount_set": {
                "shop_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                },
                "presentment_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                }
            },
            "variant_id": 43448250368060,
            "variant_inventory_management": "shopify",
            "variant_title": "XS",
            "vendor": "PistaGreen",
            "tax_lines": [
                {
                    "channel_liable": false,
                    "price": "104.29",
                    "price_set": {
                        "shop_money": {
                            "amount": "104.29",
                            "currency_code": "INR"
                        },
                        "presentment_money": {
                            "amount": "104.29",
                            "currency_code": "INR"
                        }
                    },
                    "rate": 0.05,
                    "title": "IGST"
                }
            ],
            "duties": [],
            "discount_allocations": [
                {
                    "amount": "400.00",
                    "amount_set": {
                        "shop_money": {
                            "amount": "400.00",
                            "currency_code": "INR"
                        },
                        "presentment_money": {
                            "amount": "400.00",
                            "currency_code": "INR"
                        }
                    },
                    "discount_application_index": 1
                }
            ]
        }
    ],
    "payment_terms": null,
    "refunds": [],
    "shipping_address": {
        "first_name": "Ritika",
        "address1": "Sant Dnyaneshwar Road Nensey Colony Borivali East",
        "phone": "9769003006",
        "city": "Mumbai",
        "zip": "400066",
        "province": "Maharashtra",
        "country": "India",
        "last_name": "Mishra",
        "address2": "C-102 - Adinath Tower",
        "company": null,
        "latitude": 19.2361493,
        "longitude": 72.8640329,
        "name": "Ritika Mishra",
        "country_code": "IN",
        "province_code": "MH"
    },
    "shipping_lines": [
        {
            "id": 5310755799100,
            "carrier_identifier": null,
            "code": "Standard",
            "current_discounted_price_set": {
                "shop_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                },
                "presentment_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                }
            },
            "discounted_price": "0.00",
            "discounted_price_set": {
                "shop_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                },
                "presentment_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                }
            },
            "is_removed": false,
            "phone": null,
            "price": "0.00",
            "price_set": {
                "shop_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                },
                "presentment_money": {
                    "amount": "0.00",
                    "currency_code": "INR"
                }
            },
            "requested_fulfillment_service_id": null,
            "source": "shopify",
            "title": "Standard",
            "tax_lines": [],
            "discount_allocations": [
                {
                    "amount": "0.00",
                    "amount_set": {
                        "shop_money": {
                            "amount": "0.00",
                            "currency_code": "INR"
                        },
                        "presentment_money": {
                            "amount": "0.00",
                            "currency_code": "INR"
                        }
                    },
                    "discount_application_index": 0
                }
            ]
        }
    ],
    "returns": [],
    "line_item_groups": []
};

console.log('🔧 Testing PDF generation locally...\n');

try {
    // Transform order data
    console.log('📋 Transforming Shopify order data...');
    const invoiceData = transformShopifyOrderToInvoice(shopifyOrder);
    
    // Generate PDF
    console.log('📄 Generating PDF invoice...');
    const pdfBuffer = await generateInvoicePDF(invoiceData);
    
    // Save to file in test folder
    const fileName = `test-invoice-${invoiceData.order.name.replace('#', '')}.pdf`;
    const filePath = join(__dirname, fileName);
    await fs.promises.writeFile(filePath, pdfBuffer);
    
    console.log(`\n✅ Success!`);
    console.log(`📁 PDF saved: ${fileName}`);
    console.log(`📊 Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`\n👀 Open the file to view the updated layout!`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
