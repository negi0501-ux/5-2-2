// 실험 결과 공유하기 - 의존성 없는 Node 서버 (데이터는 메모리에만 저장)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TTL = 40 * 60 * 1000; // 한 차시 40분: 마지막 입력 후 40분이 지나면 삭제
const rooms = new Map(); // room -> {groups:{1..7}, touched}
const streams = new Map(); // room -> Set(res)
const ROOM_RE = /^[1-6]-\d{1,2}$/; // 예: 3-2 (3학년 2반)

function getRoom(r) {
  if (!rooms.has(r)) rooms.set(r, { groups: {}, touched: Date.now() });
  return rooms.get(r);
}
function push(r) {
  const data = JSON.stringify(rooms.get(r)?.groups || {});
  (streams.get(r) || []).forEach((res) => res.write(`data: ${data}\n\n`));
}
setInterval(() => {
  for (const [r, v] of rooms) if (Date.now() - v.touched > TTL) { rooms.delete(r); push(r); }
}, 30000);

const clean = (s, n) => String(s ?? '').slice(0, n);
const num = (v) => (v === '' || v === null || !isFinite(Number(v)) ? null : Number(v));

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const room = url.searchParams.get('room') || '';

  if (url.pathname === '/api/data' && req.method === 'GET') {
    if (!ROOM_RE.test(room)) return res.writeHead(400).end();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(rooms.get(room)?.groups || {}));
  }
  if (url.pathname === '/api/stream') {
    if (!ROOM_RE.test(room)) return res.writeHead(400).end();
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    if (!streams.has(room)) streams.set(room, new Set());
    streams.get(room).add(res);
    res.write(`data: ${JSON.stringify(rooms.get(room)?.groups || {})}\n\n`);
    req.on('close', () => streams.get(room).delete(res));
    return;
  }
  if (url.pathname === '/api/data' && req.method === 'PUT') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        const g = Number(d.group);
        if (!ROOM_RE.test(d.room) || !(g >= 1 && g <= 7) || !Array.isArray(d.rows)) throw 0;
        getRoom(d.room).groups[g] = {
          nickname: clean(d.nickname, 12), // 번호/별명만 (이름 저장 안 함)
          names: [clean(d.names?.[0], 10) || '값 A', clean(d.names?.[1], 10) || '값 B'],
          rows: d.rows.slice(0, 7).map((r) => ({ label: clean(r.label, 10), a: num(r.a), b: num(r.b) })),
        };
        rooms.get(d.room).touched = Date.now();
        push(d.room);
        res.writeHead(204).end();
      } catch { res.writeHead(400).end(); }
    });
    return;
  }

  // 정적 파일
  let f = url.pathname === '/' ? '/index.html' : url.pathname;
  const full = path.join(__dirname, 'public', path.normalize(f).replace(/^(\.\.[\/\\])+/, ''));
  if (!full.startsWith(path.join(__dirname, 'public'))) return res.writeHead(403).end();
  fs.readFile(full, (e, buf) => {
    if (e) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': (TYPES[path.extname(full)] || 'text/plain') + '; charset=utf-8' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}  (교사 화면: /teacher.html)`));
