import { Response } from 'express';

interface Client {
  id: string;
  userId: string;
  res: Response;
}

export class RealtimeStream {
  private static clients: Map<string, Client> = new Map();

  public static addClient(userId: string, res: Response): string {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send initial handshake event
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() })}\n\n`);

    this.clients.set(clientId, { id: clientId, userId, res });

    // Handle client disconnect
    res.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  public static broadcastToUser(userId: string, eventType: string, payload: any) {
    const message = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        try {
          client.res.write(`data: ${message}\n\n`);
        } catch (err) {
          this.clients.delete(clientId);
        }
      }
    }
  }

  public static getActiveClientCount(userId?: string): number {
    if (!userId) return this.clients.size;
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.userId === userId) count++;
    }
    return count;
  }
}
