import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data.db');
// Resolve schema.sql whether running from src/ or dist/
let schemaPath = path.join(__dirname, 'schema.sql');
if (!fs.existsSync(schemaPath)) {
    schemaPath = path.join(__dirname, '../../src/db/schema.sql');
}
if (!fs.existsSync(schemaPath)) {
    schemaPath = path.join(__dirname, '../src/db/schema.sql');
}
// Initialize SQLite database
export const db = new Database(dbPath);
// Enable WAL mode & Foreign Keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
export function initDatabase() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    seedDefaultCategoriesAndInstitutions();
}
export function seedDefaultCategoriesAndInstitutions() {
    const institutions = [
        { id: 'inst-hdfc', name: 'HDFC Bank', identifier: 'HDFC', logo: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=128&auto=format&fit=crop&q=60' },
        { id: 'inst-icici', name: 'ICICI Bank', identifier: 'ICICI', logo: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&auto=format&fit=crop&q=60' },
        { id: 'inst-sbi', name: 'State Bank of India', identifier: 'SBI', logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128&auto=format&fit=crop&q=60' },
        { id: 'inst-axis', name: 'Axis Bank', identifier: 'AXIS', logo: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=128&auto=format&fit=crop&q=60' },
        { id: 'inst-zerodha', name: 'Zerodha Broking', identifier: 'ZERODHA', logo: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=128&auto=format&fit=crop&q=60' },
        { id: 'inst-cred', name: 'CRED Financial', identifier: 'CRED', logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=60' },
        { id: 'inst-paytm', name: 'Paytm Payments Bank', identifier: 'PAYTM', logo: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=128&auto=format&fit=crop&q=60' },
    ];
    const insertInst = db.prepare(`
    INSERT OR IGNORE INTO financial_institutions (id, name, identifier, logo)
    VALUES (@id, @name, @identifier, @logo)
  `);
    institutions.forEach(inst => insertInst.run(inst));
    const defaultCategories = [
        { id: 'cat-food', name: 'Food & Dining', slug: 'food', icon: 'Utensils', color: '#f97316', type: 'expense' },
        { id: 'cat-groceries', name: 'Groceries & Mart', slug: 'groceries', icon: 'ShoppingCart', color: '#84cc16', type: 'expense' },
        { id: 'cat-shopping', name: 'Shopping & E-Commerce', slug: 'shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense' },
        { id: 'cat-transport', name: 'Transportation & Fuel', slug: 'transport', icon: 'Car', color: '#06b6d4', type: 'expense' },
        { id: 'cat-bills', name: 'Bills & Utilities', slug: 'bills', icon: 'Zap', color: '#eab308', type: 'expense' },
        { id: 'cat-entertainment', name: 'Entertainment & Media', slug: 'entertainment', icon: 'Film', color: '#a855f7', type: 'expense' },
        { id: 'cat-health', name: 'Health & Medical', slug: 'health', icon: 'HeartPulse', color: '#ef4444', type: 'expense' },
        { id: 'cat-education', name: 'Education & Learning', slug: 'education', icon: 'GraduationCap', color: '#3b82f6', type: 'expense' },
        { id: 'cat-finance', name: 'Finance & Bank Charges', slug: 'finance', icon: 'Landmark', color: '#64748b', type: 'expense' },
        { id: 'cat-personal', name: 'Personal & Gifts', slug: 'personal', icon: 'Gift', color: '#14b8a6', type: 'expense' },
        { id: 'cat-income-salary', name: 'Salary & Professional', slug: 'salary', icon: 'Briefcase', color: '#10b981', type: 'income' },
        { id: 'cat-income-invest', name: 'Investment Returns', slug: 'investment-returns', icon: 'TrendingUp', color: '#22c55e', type: 'income' },
        { id: 'cat-income-refund', name: 'Refunds & Reversals', slug: 'refunds', icon: 'RotateCcw', color: '#3b82f6', type: 'income' },
        { id: 'cat-transfer', name: 'Internal Transfer', slug: 'transfer', icon: 'ArrowRightLeft', color: '#8b5cf6', type: 'transfer' },
        { id: 'cat-atm', name: 'ATM & Cash Withdrawal', slug: 'atm', icon: 'Banknote', color: '#71717a', type: 'expense' },
        { id: 'cat-other', name: 'Other Expenses', slug: 'other', icon: 'HelpCircle', color: '#94a3b8', type: 'expense' },
    ];
    const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, slug, icon, color, type, parent_id)
    VALUES (@id, @name, @slug, @icon, @color, @type, @parent_id)
  `);
    defaultCategories.forEach(cat => insertCat.run({ ...cat, parent_id: null }));
}
