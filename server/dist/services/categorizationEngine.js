import { db } from '../db/database.js';
export class CategorizationEngine {
    // Layer 1: Merchant Rule Dictionary (Curated high-precision mapping for Indian Market)
    static MERCHANT_RULES = {
        // Food & Dining
        'Swiggy': { categoryId: 'cat-food', type: 'expense' },
        'Zomato': { categoryId: 'cat-food', type: 'expense' },
        "McDonald's": { categoryId: 'cat-food', type: 'expense' },
        "Domino's Pizza": { categoryId: 'cat-food', type: 'expense' },
        'Starbucks': { categoryId: 'cat-food', type: 'expense' },
        'Burger King': { categoryId: 'cat-food', type: 'expense' },
        'KFC': { categoryId: 'cat-food', type: 'expense' },
        'Subway': { categoryId: 'cat-food', type: 'expense' },
        'Chaayos': { categoryId: 'cat-food', type: 'expense' },
        'Chai Point': { categoryId: 'cat-food', type: 'expense' },
        'Blue Tokai Coffee': { categoryId: 'cat-food', type: 'expense' },
        'Third Wave Coffee': { categoryId: 'cat-food', type: 'expense' },
        // Groceries
        'Blinkit': { categoryId: 'cat-groceries', type: 'expense' },
        'Zepto': { categoryId: 'cat-groceries', type: 'expense' },
        'Swiggy Instamart': { categoryId: 'cat-groceries', type: 'expense' },
        'BigBasket': { categoryId: 'cat-groceries', type: 'expense' },
        'DMart': { categoryId: 'cat-groceries', type: 'expense' },
        "Nature's Basket": { categoryId: 'cat-groceries', type: 'expense' },
        'Reliance Retail': { categoryId: 'cat-groceries', type: 'expense' },
        'More Retail': { categoryId: 'cat-groceries', type: 'expense' },
        // Shopping
        'Amazon': { categoryId: 'cat-shopping', type: 'expense' },
        'Flipkart': { categoryId: 'cat-shopping', type: 'expense' },
        'Myntra': { categoryId: 'cat-shopping', type: 'expense' },
        'Ajio': { categoryId: 'cat-shopping', type: 'expense' },
        'Nykaa': { categoryId: 'cat-shopping', type: 'expense' },
        'Meesho': { categoryId: 'cat-shopping', type: 'expense' },
        'Tata CLiQ': { categoryId: 'cat-shopping', type: 'expense' },
        'Zara': { categoryId: 'cat-shopping', type: 'expense' },
        'H&M': { categoryId: 'cat-shopping', type: 'expense' },
        'Uniqlo': { categoryId: 'cat-shopping', type: 'expense' },
        'Decathlon': { categoryId: 'cat-shopping', type: 'expense' },
        'IKEA': { categoryId: 'cat-shopping', type: 'expense' },
        'Apple': { categoryId: 'cat-shopping', type: 'expense' },
        'Croma': { categoryId: 'cat-shopping', type: 'expense' },
        'Reliance Digital': { categoryId: 'cat-shopping', type: 'expense' },
        // Transport
        'Uber': { categoryId: 'cat-transport', type: 'expense' },
        'Ola Cabs': { categoryId: 'cat-transport', type: 'expense' },
        'Rapido': { categoryId: 'cat-transport', type: 'expense' },
        'FASTag Toll': { categoryId: 'cat-transport', type: 'expense' },
        'HPCL Fuel': { categoryId: 'cat-transport', type: 'expense' },
        'BPCL Fuel': { categoryId: 'cat-transport', type: 'expense' },
        'Indian Oil Fuel': { categoryId: 'cat-transport', type: 'expense' },
        'Shell Fuel': { categoryId: 'cat-transport', type: 'expense' },
        'Metro Rail': { categoryId: 'cat-transport', type: 'expense' },
        'IRCTC': { categoryId: 'cat-transport', type: 'expense' },
        'IndiGo Airlines': { categoryId: 'cat-transport', type: 'expense' },
        'Air India': { categoryId: 'cat-transport', type: 'expense' },
        'MakeMyTrip': { categoryId: 'cat-transport', type: 'expense' },
        // Subscriptions & Entertainment
        'Netflix': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'Spotify': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'Amazon Prime': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'Disney+ Hotstar': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'YouTube Premium': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'SonyLIV': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'ZEE5': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'BookMyShow': { categoryId: 'cat-entertainment', type: 'expense' },
        'PVR INOX': { categoryId: 'cat-entertainment', type: 'expense' },
        'PlayStation Store': { categoryId: 'cat-entertainment', type: 'expense' },
        'Steam': { categoryId: 'cat-entertainment', type: 'expense' },
        'Apple Services': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'Google Play / Cloud': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'OpenAI ChatGPT': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        'GitHub': { categoryId: 'cat-entertainment', type: 'expense', isRecurring: true },
        // Utilities & Bills
        'Reliance Jio': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        'Airtel': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        'Vodafone Idea': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        'ACT Fibernet': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        'Tata Play': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        'Electricity Utility': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        'Piped Gas Utility': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        'Water Utility': { categoryId: 'cat-bills', type: 'expense', isRecurring: true },
        // Health
        'Apollo Pharmacy': { categoryId: 'cat-health', type: 'expense' },
        'PharmEasy': { categoryId: 'cat-health', type: 'expense' },
        'Tata 1mg': { categoryId: 'cat-health', type: 'expense' },
        'MedPlus': { categoryId: 'cat-health', type: 'expense' },
        'Cult.fit': { categoryId: 'cat-health', type: 'expense', isRecurring: true },
        // Income & Finance
        'Monthly Salary': { categoryId: 'cat-income-salary', type: 'income', isRecurring: true },
        'Bank Interest': { categoryId: 'cat-income-invest', type: 'interest' },
        'Bank Fee / Charges': { categoryId: 'cat-finance', type: 'fee' },
        'Cash Withdrawal (ATM)': { categoryId: 'cat-atm', type: 'cash_withdrawal' },
        'Account Transfer': { categoryId: 'cat-transfer', type: 'transfer' },
        'Life Insurance': { categoryId: 'cat-finance', type: 'expense', isRecurring: true },
        'Zerodha': { categoryId: 'cat-income-invest', type: 'transfer' },
        'Groww': { categoryId: 'cat-income-invest', type: 'transfer' },
        'CRED': { categoryId: 'cat-finance', type: 'transfer' }
    };
    static categorize(userId, merchantName, rawDescription, amount, rawType) {
        // 0. Base direction
        const isCredit = rawType === 'CREDIT';
        // Layer 2: Check User-defined custom rules
        const userRules = db.prepare(`
      SELECT pattern, field, category_id 
      FROM user_rules 
      WHERE user_id = ? 
      ORDER BY priority DESC, created_at ASC
    `).all(userId);
        for (const rule of userRules) {
            let textToMatch = '';
            if (rule.field === 'merchant')
                textToMatch = merchantName;
            else if (rule.field === 'description')
                textToMatch = rawDescription;
            else if (rule.field === 'amount')
                textToMatch = amount.toString();
            try {
                const regex = new RegExp(rule.pattern, 'i');
                if (regex.test(textToMatch)) {
                    return {
                        categoryId: rule.category_id,
                        transactionType: isCredit ? 'income' : 'expense',
                        confidenceScore: 0.99,
                        categorizationMethod: 'user_rule',
                        isRecurring: false
                    };
                }
            }
            catch (e) {
                // In case pattern is not valid regex, fallback to substring
                if (textToMatch.toLowerCase().includes(rule.pattern.toLowerCase())) {
                    return {
                        categoryId: rule.category_id,
                        transactionType: isCredit ? 'income' : 'expense',
                        confidenceScore: 0.98,
                        categorizationMethod: 'user_rule',
                        isRecurring: false
                    };
                }
            }
        }
        // Layer 3: Check Learned Preferences (User past manual overrides for this merchant)
        const learned = db.prepare(`
      SELECT category_id FROM learned_preferences 
      WHERE user_id = ? AND merchant_normalized = ?
    `).get(userId, merchantName.toLowerCase());
        if (learned) {
            return {
                categoryId: learned.category_id,
                transactionType: isCredit ? 'income' : 'expense',
                confidenceScore: 0.95,
                categorizationMethod: 'learned',
                isRecurring: false
            };
        }
        // Layer 1: Check Predefined Merchant Dictionary
        const predefined = this.MERCHANT_RULES[merchantName];
        if (predefined) {
            let finalType = predefined.type;
            if (isCredit) {
                if (/REFUND|REVERSAL|REV/i.test(rawDescription)) {
                    finalType = 'refund';
                }
                else if (finalType !== 'transfer') {
                    finalType = 'income';
                }
            }
            return {
                categoryId: predefined.categoryId,
                transactionType: finalType,
                confidenceScore: 0.96,
                categorizationMethod: 'rule',
                isRecurring: !!predefined.isRecurring
            };
        }
        // Layer 4: Heuristic / Pattern Matching Rules
        if (isCredit) {
            if (/SALARY|PAYROLL|STIPEND/i.test(rawDescription)) {
                return {
                    categoryId: 'cat-income-salary',
                    transactionType: 'income',
                    confidenceScore: 0.90,
                    categorizationMethod: 'ai',
                    isRecurring: true
                };
            }
            if (/DIVIDEND|INTEREST|INT\.PD|GROWW|ZERODHA|INDMONEY/i.test(rawDescription)) {
                return {
                    categoryId: 'cat-income-invest',
                    transactionType: 'income',
                    confidenceScore: 0.88,
                    categorizationMethod: 'ai',
                    isRecurring: false
                };
            }
            if (/REFUND|REV|CASHBACK|REVERSAL/i.test(rawDescription)) {
                return {
                    categoryId: 'cat-income-refund',
                    transactionType: 'refund',
                    confidenceScore: 0.92,
                    categorizationMethod: 'ai',
                    isRecurring: false
                };
            }
            return {
                categoryId: 'cat-income-salary',
                transactionType: 'income',
                confidenceScore: 0.70,
                categorizationMethod: 'ai',
                isRecurring: false
            };
        }
        // Expense Heuristics
        if (/ATM|CASH WDL|NFS/i.test(rawDescription)) {
            return {
                categoryId: 'cat-atm',
                transactionType: 'cash_withdrawal',
                confidenceScore: 0.95,
                categorizationMethod: 'ai',
                isRecurring: false
            };
        }
        if (/BILL|ELECTRICITY|POWER|BROADBAND|FIBER|DTH|WATER|GAS/i.test(rawDescription)) {
            return {
                categoryId: 'cat-bills',
                transactionType: 'expense',
                confidenceScore: 0.85,
                categorizationMethod: 'ai',
                isRecurring: true
            };
        }
        if (/HOSPITAL|PHARMA|MEDICINE|CLINIC|HEALTH|CARE/i.test(rawDescription)) {
            return {
                categoryId: 'cat-health',
                transactionType: 'expense',
                confidenceScore: 0.82,
                categorizationMethod: 'ai',
                isRecurring: false
            };
        }
        if (/FEE|CHARGE|GST|TAX|CHRG/i.test(rawDescription)) {
            return {
                categoryId: 'cat-finance',
                transactionType: 'fee',
                confidenceScore: 0.88,
                categorizationMethod: 'ai',
                isRecurring: false
            };
        }
        // Default fallback
        return {
            categoryId: 'cat-other',
            transactionType: 'expense',
            confidenceScore: 0.50,
            categorizationMethod: 'ai',
            isRecurring: false
        };
    }
    static recordUserOverride(userId, merchantName, categoryId) {
        const norm = merchantName.toLowerCase().trim();
        const existing = db.prepare(`
      SELECT id, count FROM learned_preferences 
      WHERE user_id = ? AND merchant_normalized = ?
    `).get(userId, norm);
        const now = new Date().toISOString();
        if (existing) {
            db.prepare(`
        UPDATE learned_preferences 
        SET category_id = ?, count = count + 1, updated_at = ? 
        WHERE id = ?
      `).run(categoryId, now, existing.id);
        }
        else {
            const id = `learn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            db.prepare(`
        INSERT INTO learned_preferences (id, user_id, merchant_normalized, category_id, count, updated_at) 
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(id, userId, norm, categoryId, now);
        }
    }
}
