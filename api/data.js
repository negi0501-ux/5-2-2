// Vercel 함수: 반(room)별 7모둠 데이터를 Upstash Redis(REST)에 저장. 40분 뒤 자동 삭제.
// 접속 정보는 환경변수로만 사용 (코드/화면에 넣지 않음).
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const TTL = 40 * 60;
const ROOM_RE = /^[1-6]-\d{1,2}$/;

async function redis(commands) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis');
  return r.json();
}
const clean = (s, n) => String(s ?? '').slice(0, n);
const num = (v) => (v === '' || v === null || !isFinite(Number(v)) ? null : Number(v));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'storage not configured' });
  try {
    if (req.method === 'GET') {
      const room = String(req.query.room || '');
      if (!ROOM_RE.test(room)) return res.status(400).end();
      const [{ result }] = await redis([['HGETALL', 'room:' + room]]);
      const groups = {};
      for (let i = 0; i < (result || []).length; i += 2) groups[result[i]] = JSON.parse(result[i + 1]);
      return res.status(200).json(groups);
    }
    if (req.method === 'PUT') {
      const d = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const g = Number(d.group);
      if (!ROOM_RE.test(d.room) || !(g >= 1 && g <= 7) || !Array.isArray(d.rows)) return res.status(400).end();
      const value = {
        nickname: clean(d.nickname, 12), // 번호/별명만 (이름 저장 안 함)
        names: [clean(d.names?.[0], 10) || '값 A', clean(d.names?.[1], 10) || '값 B'],
        rows: d.rows.slice(0, 7).map((r) => ({ label: clean(r.label, 10), a: num(r.a), b: num(r.b) })),
      };
      const key = 'room:' + d.room;
      await redis([['HSET', key, String(g), JSON.stringify(value)], ['EXPIRE', key, TTL]]);
      return res.status(204).end();
    }
    res.status(405).end();
  } catch {
    res.status(500).json({ error: 'server error' });
  }
};
