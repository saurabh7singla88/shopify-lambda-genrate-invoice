/**
 * GST Utility Functions for Tax Breakdown
 */

// State codes for GST (as per Indian GST portal)
export const STATE_CODES = {
    'Andaman and Nicobar Islands': '35',
    'Andhra Pradesh': '37',
    'Arunachal Pradesh': '12',
    'Assam': '18',
    'Bihar': '10',
    'Chandigarh': '04',
    'Chhattisgarh': '22',
    'Dadra and Nagar Haveli and Daman and Diu': '26',
    'Delhi': '07',
    'Goa': '30',
    'Gujarat': '24',
    'Haryana': '06',
    'Himachal Pradesh': '02',
    'Jammu and Kashmir': '01',
    'Jharkhand': '20',
    'Karnataka': '29',
    'Kerala': '32',
    'Ladakh': '38',
    'Lakshadweep': '31',
    'Madhya Pradesh': '23',
    'Maharashtra': '27',
    'Manipur': '14',
    'Meghalaya': '17',
    'Mizoram': '15',
    'Nagaland': '13',
    'Odisha': '21',
    'Puducherry': '34',
    'Punjab': '03',
    'Rajasthan': '08',
    'Sikkim': '11',
    'Tamil Nadu': '33',
    'Telangana': '36',
    'Tripura': '16',
    'Uttar Pradesh': '09',
    'Uttarakhand': '05',
    'West Bengal': '19'
};

/**
 * Get state code from state name
 * @param {string} stateName - State name
 * @returns {string} State code or '00' if not found
 */
export function getStateCode(stateName) {
    if (!stateName) return '00';
    
    // Try exact match first
    if (STATE_CODES[stateName]) {
        return STATE_CODES[stateName];
    }
    
    // Try case-insensitive match
    const normalizedName = stateName.trim();
    for (const [state, code] of Object.entries(STATE_CODES)) {
        if (state.toLowerCase() === normalizedName.toLowerCase()) {
            return code;
        }
    }
    
    return '00';
}

/**
 * Determine if transaction is intrastate (same state) or interstate
 * @param {string} sellerState - Seller's state
 * @param {string} buyerState - Buyer's state
 * @returns {boolean} True if intrastate, false if interstate
 */
export function isIntrastate(sellerState, buyerState) {
    if (!sellerState || !buyerState) return false;
    
    const sellerCode = getStateCode(sellerState);
    const buyerCode = getStateCode(buyerState);
    
    return sellerCode === buyerCode && sellerCode !== '00';
}

/**
 * Calculate CGST/SGST for intrastate or IGST for interstate
 * @param {number} taxAmount - Total tax amount
 * @param {boolean} isIntrastateTxn - Whether transaction is intrastate
 * @returns {Object} Tax breakdown
 */
export function calculateGSTBreakdown(taxAmount, isIntrastateTxn) {
    if (isIntrastateTxn) {
        // For intrastate: CGST + SGST (split equally)
        const cgst = taxAmount / 2;
        const sgst = taxAmount / 2;
        return {
            cgst: cgst,
            sgst: sgst,
            igst: 0,
            type: 'intrastate'
        };
    } else {
        // For interstate: IGST only
        return {
            cgst: 0,
            sgst: 0,
            igst: taxAmount,
            type: 'interstate'
        };
    }
}
