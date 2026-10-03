import { db } from './database.js';
console.log('ALL_USERS:', JSON.stringify(db.prepare('SELECT id, email, name, api_key FROM users').all(), null, 2));
