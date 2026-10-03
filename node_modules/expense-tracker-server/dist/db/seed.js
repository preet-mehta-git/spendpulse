import { initDatabase, db } from './database.js';
import { AuthService } from '../services/authService.js';
import { SyncService } from '../services/syncService.js';
import { BudgetService } from '../services/budgetService.js';
async function seed() {
    console.log('⚡ Initializing database schema...');
    initDatabase();
    const userEmail = 'demo@spendpulse.local';
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);
    if (!user) {
        console.log('👤 Creating demo user...');
        const userId = 'usr-demo-001';
        const passwordHash = await AuthService.hashPassword('password123');
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, userEmail, 'Aditya Sharma', passwordHash, now, now);
        user = { id: userId, email: userEmail, name: 'Aditya Sharma' };
    }
    // Check if mock connection exists
    let connection = db.prepare('SELECT * FROM financial_connections WHERE user_id = ? AND is_mock = 1').get(user.id);
    if (!connection) {
        console.log('🏦 Connecting Mock Indian Financial Institution...');
        const connId = 'conn-mock-001';
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare(`
      INSERT INTO financial_connections (
        id, user_id, provider, provider_connection_id, status, consent_status, consent_created_at, consent_expires_at, is_mock, created_at, updated_at
      ) VALUES (?, ?, 'mock_bank_provider', 'mock-conn-001', 'connected', 'ACTIVE', ?, ?, 1, ?, ?)
    `).run(connId, user.id, now, expiresAt, now, now);
        connection = { id: connId };
    }
    console.log('🔄 Executing initial sync and financial categorization pipeline...');
    const report = await SyncService.syncConnection(connection.id);
    console.log(`✅ Synced: ${report.transactionsAdded} transactions added, ${report.accountsProcessed} accounts discovered.`);
    // Seed default category budgets
    console.log('📊 Setting default monthly budgets...');
    BudgetService.setBudget(user.id, 'cat-food', 12000);
    BudgetService.setBudget(user.id, 'cat-shopping', 8000);
    BudgetService.setBudget(user.id, 'cat-transport', 4000);
    BudgetService.setBudget(user.id, 'cat-bills', 5000);
    BudgetService.setBudget(user.id, 'cat-entertainment', 3000);
    BudgetService.setBudget(user.id, 'cat-groceries', 6000);
    console.log('🎉 Database seeding completed successfully!');
}
seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
