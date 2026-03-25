const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const OWNER_TOKEN = process.env.OWNER_TOKEN || 'km2026admin';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Owner-Token,X-Session-Id');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const isOwner = req.headers['x-owner-token'] === OWNER_TOKEN;
  const id = parseInt(req.query.id);

  if (req.method === 'DELETE') {
    const body = req.body || {};
    const items = (await redis.get('media')) || [];
    const item = items.find(m => m.id === id);
    if (!item) { res.status(404).json({}); return; }
    if (!isOwner && item.ownerId !== (body.ownerId || '')) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const updated = items.filter(m => m.id !== id);
    await redis.set('media', updated);
    res.status(200).json({});
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
