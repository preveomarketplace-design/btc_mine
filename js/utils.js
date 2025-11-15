// utils.js - Shared Constants and Utility Functions (Refactored)

// ============================================================================
// CONSTANTS
// ============================================================================
const CONSTANTS = {
    // Bitcoin Network
    BLOCKS_PER_DAY: 144,
    DAYS_PER_YEAR: 365,
    BLOCKS_PER_YEAR: 52596,
    CURRENT_BLOCK_REWARD: 3.125,
    HALVING_YEAR: 2028,
    
    // Financial
    DEFAULT_OPEX_INFLATION: 0.03,
    EQUIPMENT_RESIDUAL_PERCENT: 0.20,
    DEPRECIATION_YEARS: 5,
    
    // Calculation Parameters
    IRR_MAX_ITERATIONS: 100,
    IRR_TOLERANCE: 0.0001,
    IRR_INITIAL_GUESS: 0.15,
    
    // Equipment Depreciation Schedule
    DEPRECIATION_SCHEDULE: [0.80, 0.60, 0.40, 0.25, 0.20]
};

// ============================================================================
// IRR CALCULATION
// ============================================================================

function calculateIRR(initialInvestment, cashFlows) {
    if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
        console.error('Invalid cash flows array');
        return -100;
    }
    
    const maxCF = Math.max(...cashFlows);
    if (maxCF <= 0) return -100;
    
    let irr = CONSTANTS.IRR_INITIAL_GUESS;
    
    for(let i = 0; i < CONSTANTS.IRR_MAX_ITERATIONS; i++) {
        let npv = -initialInvestment;
        let derivative = 0;
        
        for(let year = 1; year <= cashFlows.length; year++) {
            const discountFactor = Math.pow(1 + irr, year);
            npv += cashFlows[year - 1] / discountFactor;
            derivative -= year * cashFlows[year - 1] / Math.pow(1 + irr, year + 1);
        }
        
        if(Math.abs(npv) < CONSTANTS.IRR_TOLERANCE) {
            return irr * 100;
        }
        
        if (Math.abs(derivative) < 1e-10) break;
        
        irr -= npv / derivative;
        
        if(irr < -0.99) irr = -0.99;
        if(irr > 10) irr = CONSTANTS.IRR_INITIAL_GUESS;
    }
    
    return irr * 100;
}

function calculateIRRSimplified(capex, totalRevenue, totalOpex, equipmentResidual = 0, annualDepreciation = 0) {
    if (capex <= 0 || totalRevenue < 0 || totalOpex < 0) {
        console.error('Invalid inputs for IRR calculation');
        return -100;
    }
    
    const annualRevenue = totalRevenue / 5;
    const annualOpex = totalOpex / 5;
    const annualCashFlow = annualRevenue - annualOpex + annualDepreciation;
    const year5CashFlow = annualCashFlow + equipmentResidual;
    const cashFlows = [annualCashFlow, annualCashFlow, annualCashFlow, annualCashFlow, year5CashFlow];
    
    return calculateIRR(capex, cashFlows);
}

// ============================================================================
// FINANCIAL UTILITIES
// ============================================================================

function calculateOpexWithInflation(annualOpex) {
    let total = 0;
    for(let year = 1; year <= 5; year++) {
        total += annualOpex * Math.pow(1 + CONSTANTS.DEFAULT_OPEX_INFLATION, year - 1);
    }
    return total;
}

function getEquipmentValue(capex, year) {
    if (year < 1 || year > 5) return 0;
    return capex * CONSTANTS.DEPRECIATION_SCHEDULE[year - 1];
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function formatCurrency(value, options = {}) {
    const opts = {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        ...options
    };
    return value.toLocaleString('en-US', opts);
}

function formatBTC(btc, decimals = 4) {
    return btc.toFixed(decimals) + ' BTC';
}

function formatPercent(value, decimals = 1) {
    return (value * 100).toFixed(decimals) + '%';
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateNumeric(value, min, max, fieldName) {
    const num = parseFloat(value);
    if(isNaN(num)) {
        alert(`${fieldName} must be a valid number.`);
        return false;
    }
    if(num < min) {
        alert(`${fieldName} must be at least ${min}.`);
        return false;
    }
    if(max && num > max) {
        alert(`${fieldName} cannot exceed ${max}.`);
        return false;
    }
    return true;
}

function validateInputRange(value, min, max, defaultValue) {
    const num = parseFloat(value);
    if(isNaN(num) || num < min || num > max) {
        return defaultValue;
    }
    return num;
}

// ============================================================================
// BITCOIN NETWORK CALCULATIONS
// ============================================================================

function getBlockReward(year) {
    return year < CONSTANTS.HALVING_YEAR ? CONSTANTS.CURRENT_BLOCK_REWARD : CONSTANTS.CURRENT_BLOCK_REWARD / 2;
}

function calculateNetworkShare(minerHashratePH, networkHashrateEH, difficultyGrowth, year) {
    const networkHashratePH = networkHashrateEH * 1000;
    const difficultyFactor = Math.pow(1 + difficultyGrowth, year - 1);
    const effectiveHashrate = minerHashratePH / difficultyFactor;
    return effectiveHashrate / networkHashratePH;
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

function safeLocalStorageSave(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch(e) {
        if (e.name === 'QuotaExceededError') {
            console.error('LocalStorage quota exceeded');
            return false;
        }
        console.error('Error saving to localStorage:', e);
        return false;
    }
}

function safeLocalStorageLoad(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch(e) {
        console.error('Error loading from localStorage:', e);
        localStorage.removeItem(key);
        return defaultValue;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONSTANTS,
        calculateIRR,
        calculateIRRSimplified,
        calculateOpexWithInflation,
        getEquipmentValue,
        formatCurrency,
        formatBTC,
        formatPercent,
        validateNumeric,
        validateInputRange,
        getBlockReward,
        calculateNetworkShare,
        safeLocalStorageSave,
        safeLocalStorageLoad
    };
}
