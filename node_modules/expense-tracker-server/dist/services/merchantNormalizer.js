export class MerchantNormalizer {
    static KNOWN_MERCHANT_PATTERNS = [
        // Food & Dining
        { pattern: /SWIGGY/i, name: 'Swiggy' },
        { pattern: /ZOMATO/i, name: 'Zomato' },
        { pattern: /MCDONALDS|HARDCASTLE/i, name: "McDonald's" },
        { pattern: /DOMINOS|JUBILANT/i, name: "Domino's Pizza" },
        { pattern: /STARBUCKS|TATA STARBUCKS/i, name: 'Starbucks' },
        { pattern: /BURGER KING/i, name: 'Burger King' },
        { pattern: /KFC|DEVYANI|SAPPHIRE/i, name: 'KFC' },
        { pattern: /SUBWAY/i, name: 'Subway' },
        { pattern: /CHAAYOS/i, name: 'Chaayos' },
        { pattern: /CHAI POINT/i, name: 'Chai Point' },
        { pattern: /BLUE TOKAI/i, name: 'Blue Tokai Coffee' },
        { pattern: /THIRD WAVE/i, name: 'Third Wave Coffee' },
        // Groceries & Quick Commerce
        { pattern: /BLINKIT|GROFERS/i, name: 'Blinkit' },
        { pattern: /ZEPTO/i, name: 'Zepto' },
        { pattern: /INSTAMART/i, name: 'Swiggy Instamart' },
        { pattern: /BIGBASKET|INNOVATIVE RETAIL/i, name: 'BigBasket' },
        { pattern: /DMART|AVENUE SUPERMARTS/i, name: 'DMart' },
        { pattern: /NATURES BASKET/i, name: "Nature's Basket" },
        { pattern: /RELIANCE FRESH|RELIANCE RETAIL|SMART BAZAAR/i, name: 'Reliance Retail' },
        { pattern: /MORE RETAIL|MORE SUPERMARKET/i, name: 'More Retail' },
        // Shopping & E-Commerce
        { pattern: /AMAZON|AMZN/i, name: 'Amazon' },
        { pattern: /FLIPKART/i, name: 'Flipkart' },
        { pattern: /MYNTRA/i, name: 'Myntra' },
        { pattern: /AJIO/i, name: 'Ajio' },
        { pattern: /NYKAA/i, name: 'Nykaa' },
        { pattern: /MEESHO/i, name: 'Meesho' },
        { pattern: /TATA CLiQ|TATACLIQ/i, name: 'Tata CLiQ' },
        { pattern: /ZARA/i, name: 'Zara' },
        { pattern: /H&M|HENNES & MAURITZ/i, name: 'H&M' },
        { pattern: /UNIQLO/i, name: 'Uniqlo' },
        { pattern: /DECATHLON/i, name: 'Decathlon' },
        { pattern: /IKEA/i, name: 'IKEA' },
        { pattern: /APPLE STORE|APPLE INDIA/i, name: 'Apple' },
        { pattern: /CROMA|INFINITI RETAIL/i, name: 'Croma' },
        { pattern: /RELIANCE DIGITAL/i, name: 'Reliance Digital' },
        // Transportation & Fuel
        { pattern: /UBER/i, name: 'Uber' },
        { pattern: /OLA CABS|ANI TECHNOLOGIES/i, name: 'Ola Cabs' },
        { pattern: /RAPIDO/i, name: 'Rapido' },
        { pattern: /NANDI TOLL|FASTAG|NETC/i, name: 'FASTag Toll' },
        { pattern: /HPCL|HINDUSTAN PETROLEUM/i, name: 'HPCL Fuel' },
        { pattern: /BPCL|BHARAT PETROLEUM/i, name: 'BPCL Fuel' },
        { pattern: /IOCL|INDIAN OIL/i, name: 'Indian Oil Fuel' },
        { pattern: /SHELL/i, name: 'Shell Fuel' },
        { pattern: /METRO|DMRC|BMRCL|MAHA METRO/i, name: 'Metro Rail' },
        { pattern: /IRCTC|INDIAN RAILWAYS/i, name: 'IRCTC' },
        { pattern: /INDIGO|INTERGLOBE/i, name: 'IndiGo Airlines' },
        { pattern: /AIR INDIA/i, name: 'Air India' },
        { pattern: /MAKE MY TRIP|MAKEMYTRIP/i, name: 'MakeMyTrip' },
        // Entertainment & Subscriptions
        { pattern: /NETFLIX/i, name: 'Netflix' },
        { pattern: /SPOTIFY/i, name: 'Spotify' },
        { pattern: /PRIME VIDEO/i, name: 'Amazon Prime' },
        { pattern: /DISNEY|HOTSTAR|NOVI DIGITAL/i, name: 'Disney+ Hotstar' },
        { pattern: /YOUTUBE|GOOGLE YOUTUBE/i, name: 'YouTube Premium' },
        { pattern: /SONY LIV|SONYLIV/i, name: 'SonyLIV' },
        { pattern: /ZEE5/i, name: 'ZEE5' },
        { pattern: /BOOKMYSHOW|BIGTREE/i, name: 'BookMyShow' },
        { pattern: /PVR|INOX|PVR INOX/i, name: 'PVR INOX' },
        { pattern: /PLAYSTATION|SONY INTERACTIVE/i, name: 'PlayStation Store' },
        { pattern: /STEAM GAMES/i, name: 'Steam' },
        { pattern: /APPLE\.COM\/BILL/i, name: 'Apple Services' },
        { pattern: /GOOGLE CLOUD|GOOGLE PLAY/i, name: 'Google Play / Cloud' },
        { pattern: /OPENAI|CHATGPT/i, name: 'OpenAI ChatGPT' },
        { pattern: /GITHUB/i, name: 'GitHub' },
        // Bills, Telecom & Utilities
        { pattern: /JIO|RELIANCE JIO/i, name: 'Reliance Jio' },
        { pattern: /AIRTEL|BHARTI AIRTEL/i, name: 'Airtel' },
        { pattern: /VI BILL|VODAFONE IDEA/i, name: 'Vodafone Idea' },
        { pattern: /ACT FIBERNET|ACT BROADBAND|ATRIA/i, name: 'ACT Fibernet' },
        { pattern: /TATA PLAY|TATA SKY/i, name: 'Tata Play' },
        { pattern: /BESCOM|TNEB|MSEDCL|BSES/i, name: 'Electricity Utility' },
        { pattern: /IGL|MAHANAGAR GAS|ADANI GAS/i, name: 'Piped Gas Utility' },
        { pattern: /BWSSB|DELHI JAL BOARD/i, name: 'Water Utility' },
        // Health & Pharmacy
        { pattern: /APOLLO PHARMACY|APOLLO 247/i, name: 'Apollo Pharmacy' },
        { pattern: /PHARMEASY|THYROCARE/i, name: 'PharmEasy' },
        { pattern: /1MG|TATA 1MG/i, name: 'Tata 1mg' },
        { pattern: /MEDPLUS/i, name: 'MedPlus' },
        { pattern: /CULT\.FIT|CUREFIT/i, name: 'Cult.fit' },
        // Fintech & Finance
        { pattern: /ZERODHA/i, name: 'Zerodha' },
        { pattern: /GROWW|NEXTBILLION/i, name: 'Groww' },
        { pattern: /CRED CLUB|CRED/i, name: 'CRED' },
        { pattern: /PAYTM/i, name: 'Paytm' },
        { pattern: /PHONEPE/i, name: 'PhonePe' },
        { pattern: /GIFT CITY|INDMONEY/i, name: 'INDmoney' },
        { pattern: /HDFC LIFE|ICICI PRU|SBI LIFE|LIC/i, name: 'Life Insurance' },
    ];
    static normalize(rawDescription, rawMode) {
        let mode = rawMode ? rawMode.toUpperCase() : 'UNKNOWN';
        let merchantName = '';
        let referenceNo;
        const desc = (rawDescription || '').trim();
        // 1. Detect Payment Mode if not provided
        if (mode === 'UNKNOWN' || !mode) {
            if (/^UPI/i.test(desc) || desc.includes('@') || /UPI-/.test(desc)) {
                mode = 'UPI';
            }
            else if (/^POS /i.test(desc) || desc.includes('CARD') || desc.includes('SWIPE')) {
                mode = 'CARD';
            }
            else if (/^ATM /i.test(desc) || desc.includes('ATM CASH') || desc.includes('NFS/')) {
                mode = 'ATM';
            }
            else if (/NEFT/i.test(desc)) {
                mode = 'NEFT';
            }
            else if (/IMPS/i.test(desc)) {
                mode = 'IMPS';
            }
            else if (/ACH|NACH|AUTO[- ]?DEBIT|ECS/i.test(desc)) {
                mode = 'AUTO_DEBIT';
            }
            else if (/BBPS/i.test(desc)) {
                mode = 'BBPS';
            }
            else if (/SALARY/i.test(desc)) {
                mode = 'NEFT';
            }
        }
        // 2. Check for matching curated Indian merchants
        for (const item of this.KNOWN_MERCHANT_PATTERNS) {
            if (item.pattern.test(desc)) {
                merchantName = item.name;
                break;
            }
        }
        // 3. Fallback extraction logic from bank syntax
        if (!merchantName) {
            if (/^UPI\/([^\/]+)\//i.test(desc)) {
                // e.g. "UPI/RAMESHKUMAR/48910293/Payment" -> "Rameshkumar"
                const match = desc.match(/^UPI\/([^\/]+)\//i);
                if (match && match[1]) {
                    merchantName = this.formatName(match[1]);
                }
            }
            else if (/^POS\s+\d+\s+([^\d]+)/i.test(desc)) {
                // e.g. "POS 4912 CORNER HOUSE BANGALORE" -> "Corner House"
                const match = desc.match(/^POS\s+\d+\s+([^\d]+)/i);
                if (match && match[1]) {
                    merchantName = this.formatName(match[1].split(/ MUMBAI| BANGALORE| DELHI| HYD/i)[0]);
                }
            }
            else if (/ATM\s+(?:WDL|CASH)/i.test(desc)) {
                merchantName = 'Cash Withdrawal (ATM)';
            }
            else if (/SALARY|INFOSYS|TCS|WIPRO|GOOGLE|MICROSOFT|AMAZON DEV/i.test(desc)) {
                merchantName = 'Monthly Salary';
            }
            else if (/TRANSFER TO|TRF TO|TO A\/C/i.test(desc)) {
                merchantName = 'Account Transfer';
            }
            else if (/INTEREST PAID|INT\.PD/i.test(desc)) {
                merchantName = 'Bank Interest';
            }
            else if (/ANNUAL FEE|MAINTENANCE CHARGE|SMS CHRG/i.test(desc)) {
                merchantName = 'Bank Fee / Charges';
            }
            else {
                // Clean up common bank noise prefixes
                let cleaned = desc
                    .replace(/^(?:UPI|POS|NEFT|IMPS|RTGS|ACH|NACH|BBPS|NFS|ECOM)[\/:\- ]+/i, '')
                    .replace(/\b(?:PVT|LTD|SERVICES|INDIA|PAYMENTS|BILLDESK|RAZORPAY|TECHNO)\b/gi, '')
                    .replace(/[\d\/_\-]+/g, ' ')
                    .trim();
                merchantName = this.formatName(cleaned || 'Direct Transaction');
            }
        }
        // Extract reference number if present
        const refMatch = desc.match(/(?:REF|RRN|UTR|TXNID|ID)[:\/ \-]*([A-Z0-9]{8,20})/i);
        if (refMatch) {
            referenceNo = refMatch[1];
        }
        const normalizedDescription = `${merchantName} • ${mode}`;
        return {
            merchantName,
            normalizedDescription,
            paymentMode: mode,
            referenceNo
        };
    }
    static formatName(str) {
        return str
            .toLowerCase()
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .trim();
    }
}
