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

  if (req.method === 'POST') {
    const body = req.body;
    if (!body || !body.name) { res.status(400).json({}); return; }
    const rsvp = {
      id: Date.now(),
      name: body.name,
      attending: body.attending,
      guests: body.guests || 1,
      dietary: body.dietary || '',
      message: body.message || '',
      time: new Date().toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    };
    const items = (await redis.get('rsvps')) || [];
    items.push(rsvp);
    await redis.set('rsvps', items);
    res.status(200).json(rsvp);
    return;
  }

  if (req.method === 'GET') {
    if (!isOwner) { res.status(403).json([]); return; }
    const items = (await redis.get('rsvps')) || [];
    res.status(200).json(items);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
