import { MerchantNormalizer } from './merchantNormalizer.js';

export interface ParsedSmsTransaction {
  amount: number;
  currency: string;
  transactionType: 'expense' | 'income' | 'transfer';
  merchantName: string;
  rawNarration: string;
  normalizedDescription: string;
  paymentMode: string;
  maskedAccount?: string;
  bankIdentifier?: string;
  bankName?: string;
  referenceNo?: string;
  remainingBalance?: number;
  transactionDate: string;
  isConfidenceHigh: boolean;
}

export class SmsParser {
  private static KNOWN_BANKS: Array<{ id: string; name: string; pattern: RegExp }> = [
    { id: 'HDFC', name: 'HDFC Bank', pattern: /HDFC|HDFCBK/i },
    { id: 'ICICI', name: 'ICICI Bank', pattern: /ICICI|ICICIB/i },
    { id: 'SBI', name: 'State Bank of India', pattern: /SBI|SBIN|STATE BANK/i },
    { id: 'AXIS', name: 'Axis Bank', pattern: /AXIS|AXISBK/i },
    { id: 'KOTAK', name: 'Kotak Mahindra Bank', pattern: /KOTAK|KMB/i },
    { id: 'IDFC_FIRST', name: 'IDFC First Bank', pattern: /IDFC|IDFCFIRST/i },
    { id: 'INDUSIND', name: 'IndusInd Bank', pattern: /INDUSIND|INDUSB/i },
    { id: 'FEDERAL', name: 'Federal Bank', pattern: /FEDERAL/i },
    { id: 'BOB', name: 'Bank of Baroda', pattern: /BOB|BARODA/i },
    { id: 'PNB', name: 'Punjab National Bank', pattern: /PNB|PUNJAB/i },
    { id: 'CANARA', name: 'Canara Bank', pattern: /CANARA/i },
    { id: 'YES', name: 'Yes Bank', pattern: /YES BANK|YESB/i },
    { id: 'RBL', name: 'RBL Bank', pattern: /RBL/i },
    { id: 'PAYTM', name: 'Paytm Payments Bank', pattern: /PAYTM|PPBL/i },
    { id: 'CRED', name: 'CRED Financial', pattern: /CRED/i },
    { id: 'ZERODHA', name: 'Zerodha Broking', pattern: /ZERODHA/i }
  ];

  public static parse(rawText: string, senderHeader?: string): ParsedSmsTransaction | null {
    if (!rawText || typeof rawText !== 'string') return null;
    const text = rawText.trim();
    if (text.length < 8) return null;

    // 1. Identify Bank from sender or body
    let bankIdentifier: string | undefined;
    let bankName: string | undefined;
    const combinedHeaderAndBody = `${senderHeader || ''} ${text}`;

    for (const bank of this.KNOWN_BANKS) {
      if (bank.pattern.test(combinedHeaderAndBody)) {
        bankIdentifier = bank.id;
        bankName = bank.name;
        break;
      }
    }

    // 2. Determine Transaction Type (Debit / Credit / Transfer / Refund)
    const isCredit = /(?:credited|received|refund(?:ed)?|cashback|deposited|salary credited|added to)/i.test(text) &&
                     !/(?:debited|spent|paid|charged|withdrawn|sent)/i.test(text);

    const isTransfer = /(?:transferred to your own|to own a\/c|self transfer|transfer to a\/c|trf to a\/c)/i.test(text);

    const transactionType: 'expense' | 'income' | 'transfer' = isTransfer 
      ? 'transfer' 
      : isCredit 
        ? 'income' 
        : 'expense';

    // 3. Extract Amount
    // Matches: Rs. 450.00, Rs 450, INR 1,299.50, ₹350, Rs.180, debited for Rs 10, debited by 10.00, etc.
    let amount: number | null = null;

    const amountPatterns = [
      /(?:(?:Rs\.?|INR|₹)\s*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i,
      /(?:debited|credited|withdrawn|spent|paid|sent|transfer of|trf of|amount(?: of| is|:)?)\s*(?:by|with|for|of)?\s*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i,
      /(?:VPA\s+[\w\.\@\-]+\s+debited\s+(?:by|for)?\s*(?:Rs\.?|INR|₹)?\s*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i,
      /([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:Rs\.?|INR|₹)/i
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cleanStr = match[1].replace(/,/g, '');
        const val = parseFloat(cleanStr);
        if (!isNaN(val) && val > 0) {
          amount = val;
          break;
        }
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return null; // Not a valid financial transaction SMS
    }

    // 4. Extract Account / Card Mask (e.g. A/c **1234, card ending 5678, A/C XX9876, A/c ...1234)
    let maskedAccount: string | undefined;
    const accMatch = text.match(/(?:a\/c|acct|account|card|card ending|a\/c ending|ending with|ending in|ending)\s*(?:no\.?|number)?[: ]*(?:[*xX\.]*)*([0-9]{3,6})/i);
    if (accMatch && accMatch[1]) {
      maskedAccount = `**${accMatch[1]}`;
    }

    // 5. Extract Reference No / UPI UTR / RRN
    let referenceNo: string | undefined;
    const refMatch = text.match(/(?:UPI\s*(?:Ref|Ref No|Reference|UTR)|Ref\s*(?:No)?|RRN|Txn\s*ID|Txn\s*No)[: \-\/]*([A-Z0-9]{6,22})/i);
    if (refMatch && refMatch[1]) {
      referenceNo = refMatch[1];
    }

    // 6. Extract Balance if available
    let remainingBalance: number | undefined;
    const balMatch = text.match(/(?:Avail(?:able)?\s*(?:Bal|Balance|Lim(?:it)?)|Bal(?:ance)?|Total Bal)[: \-\/]*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i);
    if (balMatch && balMatch[1]) {
      const parsedBal = parseFloat(balMatch[1].replace(/,/g, ''));
      if (!isNaN(parsedBal)) {
        remainingBalance = parsedBal;
      }
    }

    // 7. Extract Merchant / Payee
    let rawMerchant = '';

    if (isCredit) {
      // e.g. "by INFOSYS TECH SALARY" or "from SWIGGY" or "from RAHUL SHARMA"
      const fromMatch = text.match(/(?:from|by|for refund on|refund from)\s+([A-Za-z0-9\s&.\-_]+?)(?:\s+(?:on|via|ref|bal|available|\.|\n|$))/i);
      if (fromMatch && fromMatch[1]) {
        rawMerchant = fromMatch[1].trim();
      } else {
        rawMerchant = 'Credit / Refund';
      }
    } else {
      // e.g. "to ZOMATO", "at BLINKIT", "info: BIL*NETFLIX", "towards AMAZON", "transfer to SWIGGY"
      const toMatch = text.match(/(?:to|at|towards|info:\s*|info\s*|for|transfer to|trf to)\s+([A-Za-z0-9\s&.\-_*@]+?)(?:\s+(?:on|using|via|with|ref|upi|avl|bal|avail|\.|\n|$))/i);
      if (toMatch && toMatch[1]) {
        rawMerchant = toMatch[1].trim();
      }
    }

    // Fallback: look for known merchants directly in the SMS text
    const normRes = MerchantNormalizer.normalize(rawMerchant || text);
    let merchantName = normRes.merchantName;

    if (!merchantName || merchantName === 'Direct Transaction') {
      if (rawMerchant) {
        merchantName = MerchantNormalizer.normalize(rawMerchant).merchantName;
      } else if (text.includes('ATM')) {
        merchantName = 'Cash Withdrawal (ATM)';
      } else {
        merchantName = isCredit ? 'Direct Deposit / Credit' : 'Direct Transaction';
      }
    }

    // 8. Detect Payment Mode
    let paymentMode = normRes.paymentMode || 'UNKNOWN';
    if (paymentMode === 'UNKNOWN') {
      if (/UPI|GPay|PhonePe|Paytm|BHIM/i.test(text)) {
        paymentMode = 'UPI';
      } else if (/Card|POS|Swipe|Credit Card|Debit Card/i.test(text)) {
        paymentMode = 'CARD';
      } else if (/ATM|Cash/i.test(text)) {
        paymentMode = 'ATM';
      } else if (/NEFT/i.test(text)) {
        paymentMode = 'NEFT';
      } else if (/IMPS/i.test(text)) {
        paymentMode = 'IMPS';
      } else if (/ACH|NACH|Mandate|Auto[- ]?Debit/i.test(text)) {
        paymentMode = 'AUTO_DEBIT';
      }
    }

    // 9. Extract Date or use current time
    let transactionDate = new Date().toISOString();
    // Matches formats like "29-AUG-26", "29-08-2026", "29/08/26"
    const dateMatch = text.match(/(?:on\s+)?([0-9]{1,2})[\/\-]([0-9]{1,2}|[A-Za-z]{3})[\/\-]([0-9]{2,4})/i);
    if (dateMatch) {
      try {
        const day = parseInt(dateMatch[1]);
        const monthStr = dateMatch[2];
        const yearStr = dateMatch[3];
        const fullYear = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
        
        let month = 0;
        if (/^\d+$/.test(monthStr)) {
          month = parseInt(monthStr) - 1;
        } else {
          const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
          };
          month = months[monthStr.toLowerCase().slice(0, 3)] ?? new Date().getMonth();
        }
        
        const d = new Date(Date.UTC(fullYear, month, day, 12, 0, 0));
        if (!isNaN(d.getTime())) {
          transactionDate = d.toISOString();
        }
      } catch (e) {
        // Fallback to now
      }
    }

    return {
      amount,
      currency: 'INR',
      transactionType,
      merchantName,
      rawNarration: text,
      normalizedDescription: `${merchantName} • ${paymentMode}`,
      paymentMode,
      maskedAccount,
      bankIdentifier,
      bankName,
      referenceNo,
      remainingBalance,
      transactionDate,
      isConfidenceHigh: Boolean(merchantName && amount && (bankIdentifier || maskedAccount || referenceNo))
    };
  }
}
