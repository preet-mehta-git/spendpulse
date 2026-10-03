import { db } from '../db/database.js';
export class ReconciliationService {
    static logReconciliation(connectionId, userId, summary) {
        const id = `recon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const detailsJson = JSON.stringify(summary.discrepancyDetails);
        db.prepare(`
      INSERT INTO reconciliation_logs (
        id, connection_id, user_id, checked_count, missing_count, duplicate_count, updated_count, discrepancy_details, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, connectionId, userId, summary.checkedCount, summary.missingCount, summary.duplicateCount, summary.updatedCount, detailsJson, now);
        return {
            id,
            connection_id: connectionId,
            user_id: userId,
            checked_count: summary.checkedCount,
            missing_count: summary.missingCount,
            duplicate_count: summary.duplicateCount,
            updated_count: summary.updatedCount,
            discrepancy_details: detailsJson,
            synced_at: now
        };
    }
    static getLogs(userId, limit = 20) {
        return db.prepare(`
      SELECT * FROM reconciliation_logs 
      WHERE user_id = ? 
      ORDER BY synced_at DESC 
      LIMIT ?
    `).all(userId, limit);
    }
}
