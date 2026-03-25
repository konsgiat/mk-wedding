/**
 * 💜 Wedding HTTPS Server + REST API
 * ──────────────────────────────────────────────────────
 * HOW TO RUN:
 *   node server.js
 *
 * CONFIG:
 *   Change OWNER_TOKEN below to something secret before the wedding.
 *   The admin panel is at /admin.html — enter the token there.
 * ──────────────────────────────────────────────────────
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const PORT       = 443;
const ALT_PORT   = 8443;
const DATA_FILE  = path.join(__dirname, 'data.json');

// ── ⚙️  CHANGE THIS before the wedding! ──
const OWNER_TOKEN = 'km2026admin';

// ── MIME types ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

// ── Data helpers ──
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { media: [], wishes: [], rsvps: [] }; }
}
function saveData(d) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8'); return true; }
  catch(e) { console.error('saveData error:', e.message); return false; }
}
function readBody(req) {
  return new Promise((res, rej) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => { try { res(JSON.parse(body)); } catch { res(null); } });
    req.on('error', rej);
  });
}
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Owner-Token,X-Session-Id');
}
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── API handler ──
async function handleAPI(req, res, urlPath) {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const isOwner  = req.headers['x-owner-token'] === OWNER_TOKEN;
  const sessionId = req.headers['x-session-id'] || new URL('http://x'+req.url).searchParams.get('session') || '';

  // ══ MEDIA ══
  if (urlPath === '/api/media') {
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body || !body.url) { json(res, 400, {error:'Bad request'}); return; }
      const d = loadData();
      const item = { id: Date.now(), url: body.url, publicId: body.publicId || null,
        type: body.type || 'image', name: body.name, ownerId: body.ownerId,
        ownerName: body.ownerName, filename: body.filename || '', time: body.time };
      d.media.push(item);
      saveData(d);
      json(res, 200, item); return;
    }
    if (req.method === 'GET') {
      const d = loadData();
      const items = isOwner ? d.media : d.media.filter(m => m.ownerId === sessionId);
      json(res, 200, items); return;
    }
  }
  if (urlPath.startsWith('/api/media/')) {
    const id = parseInt(urlPath.split('/').pop());
    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const d = loadData();
      const item = d.media.find(m => m.id === id);
      if (!item) { json(res, 404, {}); return; }
      if (!isOwner && item.ownerId !== (body?.ownerId || '')) { json(res, 403, {error:'Forbidden'}); return; }
      d.media = d.media.filter(m => m.id !== id);
      saveData(d);
      json(res, 200, {}); return;
    }
  }

  // ══ WISHES ══
  if (urlPath === '/api/wishes') {
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body) { json(res, 400, {}); return; }
      const d = loadData();
      const wish = { id: Date.now(), type: body.type, name: body.name,
        ownerId: body.ownerId, msg: body.msg || null,
        url: body.url || null, publicId: body.publicId || null, time: body.time };
      d.wishes.push(wish);
      saveData(d);
      json(res, 200, wish); return;
    }
    if (req.method === 'GET') {
      const d = loadData();
      const items = isOwner ? d.wishes : d.wishes.filter(w => w.ownerId === sessionId);
      json(res, 200, items); return;
    }
  }
  if (urlPath.startsWith('/api/wishes/')) {
    const id = parseInt(urlPath.split('/').pop());
    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const d = loadData();
      const wish = d.wishes.find(w => w.id === id);
      if (!wish) { json(res, 404, {}); return; }
      if (!isOwner && wish.ownerId !== (body?.ownerId || '')) { json(res, 403, {}); return; }
      d.wishes = d.wishes.filter(w => w.id !== id);
      saveData(d);
      json(res, 200, {}); return;
    }
  }

  // ══ RSVP ══
  if (urlPath === '/api/rsvp') {
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body || !body.name) { json(res, 400, {}); return; }
      const d = loadData();
      const rsvp = { id: Date.now(), name: body.name, attending: body.attending,
        guests: body.guests || 1, dietary: body.dietary || '',
        message: body.message || '',
        time: new Date().toLocaleString('el-GR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) };
      d.rsvps.push(rsvp);
      saveData(d);
      json(res, 200, rsvp); return;
    }
    if (req.method === 'GET') {
      if (!isOwner) { json(res, 403, []); return; }
      const d = loadData();
      json(res, 200, d.rsvps); return;
    }
  }

  json(res, 404, {error:'Not found'});
}

// ── Local IP ──
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces))
    for (const iface of interfaces[name])
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  return '127.0.0.1';
}

// ── Request handler ──
async function handleRequest(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/api/')) { await handleAPI(req, res, urlPath); return; }
  if (urlPath === '/' || urlPath === '') urlPath = '/wedding-invitation-KM.html';

  const filePath = path.join(__dirname, urlPath);
  if (!path.resolve(filePath).startsWith(path.resolve(__dirname))) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  const ext      = path.extname(filePath).toLowerCase();
  const mimeType = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type':'text/html'});
      res.end(`<h2 style="font-family:sans-serif;color:#7c4fa0;padding:40px">404 — File not found: <code>${urlPath}</code></h2>`);
      return;
    }
    res.writeHead(200, {'Content-Type': mimeType, 'Cache-Control':'no-cache'});
    res.end(data);
  });
}

// ── SSL ──
let sslOptions;
try {
  sslOptions = { key: fs.readFileSync(path.join(__dirname,'key.pem')), cert: fs.readFileSync(path.join(__dirname,'cert.pem')) };
} catch(e) {
  console.error('\n  ❌  Could not load cert.pem / key.pem\n');
  process.exit(1);
}

// ── Start ──
function startServer(port) {
  const server = https.createServer(sslOptions, (req, res) => {
    handleRequest(req, res).catch(err => {
      console.error('Request error:', err);
      if (!res.headersSent) { res.writeHead(500); res.end('Server error'); }
    });
  });
  server.listen(port, '0.0.0.0', () => {
    const ip = getLocalIP();
    const p  = port === 443 ? '' : `:${port}`;
    console.log('\n');
    console.log('  💜 ══════════════════════════════════════════ 💜');
    console.log('        Κωνσταντίνος & Μαρία — Wedding Server     ');
    console.log('  💜 ══════════════════════════════════════════ 💜');
    console.log('');
    console.log('  ✅  HTTPS Server + API running');
    console.log('');
    console.log('  📱  Open on PHONE (same Wi-Fi):');
    console.log(`       https://${ip}${p}`);
    console.log('');
    console.log('  Pages:');
    console.log(`       Invitation  →  https://${ip}${p}/`);
    console.log(`       WishWall    →  https://${ip}${p}/wishwall.html`);
    console.log(`       Admin Panel →  https://${ip}${p}/admin.html`);
    console.log('');
    console.log(`  🔑  Owner token: ${OWNER_TOKEN}`);
    console.log('       Enter this on the Admin Panel to see all content.');
    console.log('');
    console.log('  ⚠️   First time on phone: accept the security warning.');
    console.log('  ⏹   Press Ctrl+C to stop.');
    console.log('');
  });
  server.on('error', err => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && port === 443) {
      console.log(`\n  ⚠️   Port 443 unavailable — trying :${ALT_PORT}...`);
      startServer(ALT_PORT);
    } else {
      console.error('Server error:', err); process.exit(1);
    }
  });
}

http.createServer((req, res) => {
  res.writeHead(301, {Location:`https://${req.headers.host}${req.url}`}); res.end();
}).listen(80, '0.0.0.0').on('error', ()=>{});

startServer(PORT);
