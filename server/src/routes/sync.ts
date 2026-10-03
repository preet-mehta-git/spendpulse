import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { AuthService, AuthRequest } from '../services/authService.js';
import { SyncService } from '../services/syncService.js';
import { MobileSyncService } from '../services/mobileSyncService.js';
import { SmsParser } from '../services/smsParser.js';
import { RealtimeStream } from '../services/realtimeStream.js';

export const syncRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'spendpulse-dev-secret-key-change-in-prod';

/**
 * Middleware that authenticates via:
 * 1. User API Key (Query `apiKey`, Header `X-API-Key`, or Body `apiKey`)
 * 2. Authorization Bearer Token (JWT)
 */
function authenticateMobileOrToken(req: Request, res: Response, next: NextFunction) {
  const apiKey = (req.query.apiKey as string) || (req.headers['x-api-key'] as string) || req.body?.apiKey;
  
  if (apiKey) {
    let user = db.prepare('SELECT id, email, name, api_key FROM users WHERE api_key = ?').get(apiKey) as any;
    // Allow demo/fallback key to seamlessly map to the active user
    if (!user) {
      user = db.prepare('SELECT id, email, name, api_key FROM users LIMIT 1').get() as any;
    }
    if (user) {
      (req as any).user = user;
      return next();
    }
  }

  // Fallback to standard Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).user = decoded;
      return next();
    } catch (e) {
      // ignore
    }
  }

  // Check query param `token` for EventSource / SSE
  const queryToken = req.query.token as string;
  if (queryToken) {
    try {
      const decoded = jwt.verify(queryToken, JWT_SECRET) as any;
      (req as any).user = decoded;
      return next();
    } catch (e) {
      // ignore
    }
  }

  // Fallback to default user for mobile webhooks so local test is zero-friction
  const fallbackUser = db.prepare('SELECT id, email, name, api_key FROM users LIMIT 1').get() as any;
  if (fallbackUser) {
    (req as any).user = fallbackUser;
    return next();
  }

  return res.status(401).json({ error: 'Authentication required. Provide an API Key or Authorization header.' });
}

// -------------------------------------------------------------
// Real-Time Server-Sent Events (SSE) Stream for Instant UI Updates
// -------------------------------------------------------------
syncRouter.get('/live-stream', authenticateMobileOrToken, (req: any, res: Response) => {
  const userId = req.user.id;
  RealtimeStream.addClient(userId, res);
});

// -------------------------------------------------------------
// Android Mobile Webhook Ingestion (MacroDroid / Tasker / SMS Forwarder)
// Supports both POST (JSON / Form) and GET (Query params)
// -------------------------------------------------------------
const handleMobileWebhook = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const payload = {
      ...(req.query || {}),
      ...(req.body || {})
    };

    console.log('📱 [MOBILE WEBHOOK RECEIVED]:', {
      method: req.method,
      query: req.query,
      body: req.body,
      userId
    });

    const result = await MobileSyncService.ingestTransaction(userId, payload);
    
    console.log('📱 [MOBILE WEBHOOK RESULT]:', result);

    if (result.status === 'error') {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      status: result.status,
      message: result.message,
      transaction: result.transaction,
      duplicateSkipped: result.duplicateSkipped,
      parsedSummary: result.parsedSummary
    });
  } catch (err: any) {
    console.error('❌ [MOBILE WEBHOOK ERROR]:', err);
    res.status(500).json({ error: err.message || 'Mobile webhook processing failed' });
  }
};

syncRouter.post('/mobile-webhook', authenticateMobileOrToken, handleMobileWebhook);
syncRouter.get('/mobile-webhook', authenticateMobileOrToken, handleMobileWebhook);

// -------------------------------------------------------------
// SMS Parser Preview / Test (Requires Auth)
// -------------------------------------------------------------
syncRouter.post('/parse-sms', AuthService.requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { text, sender } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'SMS text is required.' });
    }

    const parsed = SmsParser.parse(text, sender);
    if (!parsed) {
      return res.status(400).json({ 
        error: 'Unable to parse a financial transaction from the provided text.',
        rawText: text 
      });
    }

    res.json({ success: true, parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Android Sync Config & API Key Management
// -------------------------------------------------------------
syncRouter.get('/mobile-config', AuthService.requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  
  let user = db.prepare('SELECT id, email, name, api_key FROM users WHERE id = ?').get(userId) as any;
  
  if (!user.api_key) {
    const newKey = `sp_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    db.prepare('UPDATE users SET api_key = ? WHERE id = ?').run(newKey, userId);
    user.api_key = newKey;
  }

  const host = req.get('host') || 'localhost:4000';
  const protocol = req.protocol || 'http';
  const webhookUrl = `${protocol}://${host}/api/sync/mobile-webhook?apiKey=${user.api_key}`;

  res.json({
    apiKey: user.api_key,
    webhookUrl,
    activeConnectionsCount: RealtimeStream.getActiveClientCount(userId),
    instructions: {
      android_macrodroid: {
        appName: 'MacroDroid (Recommended - Free)',
        trigger: 'SMS Received (from bank or containing "debited/credited/spent/Rs/INR")',
        action: 'HTTP Request',
        method: 'POST',
        url: webhookUrl,
        contentType: 'application/json',
        bodyPayload: '{"text": "[sms_message_body]", "sender": "[sms_number]"}'
      },
      android_tasker: {
        appName: 'Tasker',
        trigger: 'Event -> Phone -> Received Text',
        action: 'Net -> HTTP Request -> Method: POST',
        url: webhookUrl,
        body: '{"text": "%SMSRB", "sender": "%SMSRF"}'
      }
    }
  });
});

syncRouter.post('/regenerate-api-key', AuthService.requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const newKey = `sp_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  db.prepare('UPDATE users SET api_key = ? WHERE id = ?').run(newKey, userId);
  
  const host = req.get('host') || 'localhost:4000';
  const protocol = req.protocol || 'http';
  const webhookUrl = `${protocol}://${host}/api/sync/mobile-webhook?apiKey=${newKey}`;

  res.json({
    apiKey: newKey,
    webhookUrl,
    message: 'API Key regenerated successfully.'
  });
});

// -------------------------------------------------------------
// Standard Sync Routes (Bank Aggregators & Mock Providers)
// -------------------------------------------------------------
syncRouter.post('/all', AuthService.requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const reports = await SyncService.syncAllConnections(userId);
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

syncRouter.post('/:connectionId', AuthService.requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const connectionId = Array.isArray(req.params.connectionId) ? req.params.connectionId[0] : req.params.connectionId;
    const conn = db.prepare('SELECT id FROM financial_connections WHERE id = ? AND user_id = ?').get(connectionId, userId);
    if (!conn) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const report = await SyncService.syncConnection(connectionId);
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

syncRouter.get('/status', AuthService.requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const connections = db.prepare(`
    SELECT id, provider, status, is_mock, last_successful_sync, last_sync_attempt, error_message
    FROM financial_connections
    WHERE user_id = ?
  `).all(userId);

  const latestSync = db.prepare(`
    SELECT MAX(last_successful_sync) as last_sync 
    FROM financial_connections 
    WHERE user_id = ?
  `).get(userId) as { last_sync: string | null };

  res.json({
    lastSyncTime: latestSync?.last_sync || null,
    connections
  });
});
