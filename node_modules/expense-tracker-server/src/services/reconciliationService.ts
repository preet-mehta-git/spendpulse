import { db } from '../db/database.js';
import { RawExternalTransaction, ReconciliationLog } from '../types/index.js';

export interface ReconciliationSummary {
  checkedCount: number;
  missingCount: number;
  duplicateCount: number;
  updatedCount: number;
  discrepancyDetails: Array<{
    type: 'missing' | 'duplicate' | 'modified' | 'balance_mismatch';
    message: string;
    externalId?: string;
    amount?: number;
  }>;
}

export class ReconciliationService {
  public static logReconciliation(
    connectionId: string,
    userId: string,
    summary: ReconciliationSummary
  ): ReconciliationLog {
    const id = `recon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const detailsJson = JSON.stringify(summary.discrepancyDetails);

    db.prepare(`
      INSERT INTO reconciliation_logs (
        id, connection_id, user_id, checked_count, missing_count, duplicate_count, updated_count, discrepancy_details, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      connectionId,
      userId,
      summary.checkedCount,
      summary.missingCount,
      summary.duplicateCount,
      summary.updatedCount,
      detailsJson,
      now
    );

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

  public static getLogs(userId: string, limit: number = 20): ReconciliationLog[] {
    return db.prepare(`
      SELECT * FROM reconciliation_logs 
      WHERE user_id = ? 
      ORDER BY synced_at DESC 
      LIMIT ?
    `).all(userId, limit) as ReconciliationLog[];
  }
}
