import { Router } from 'express';
import { db } from '../db/database.js';
import { AuthService, AuthRequest } from '../services/authService.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const password_hash = await AuthService.hashPassword(password);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase(), name, password_hash, now, now);

    const user = { id, email: email.toLowerCase(), name };
    const token = AuthService.generateToken(user);

    res.status(201).json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await AuthService.comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = { id: user.id, email: user.email, name: user.name };
    const token = AuthService.generateToken(userData);

    res.json({ user: userData, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get('/me', AuthService.requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});
