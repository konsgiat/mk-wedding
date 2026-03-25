const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const OWNER_TOKEN = process.env.OWNER_TOKEN || 'km2026admin';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Owner-Token,X-Session-Id');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const isOwner = req.headers['x-owner-token'] === OWNER_TOKEN;
  const sessionId = req.headers['x-session-id'] || '';

  if (req.method === 'POST') {
    const body = req.body;
    if (!body) { res.status(400).json({}); return; }
    const wish = {
      id: Date.now(),
      type: body.type,
      name: body.name,
      ownerId: body.ownerId,
      msg: body.msg || null,
      url: body.url || null,
      publicId: body.publicId || null,
      time: body.time,
    };
    const items = (await redis.get('wishes')) || [];
    items.push(wish);
    await redis.set('wishes', items);
    res.status(200).json(wish);
    return;
  }

  if (req.method === 'GET') {
    const items = (await redis.get('wishes')) || [];
    const filtered = isOwner ? items : items.filter(w => w.ownerId === sessionId);
    res.status(200).json(filtered);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
