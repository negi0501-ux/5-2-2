// 공통: 표 + 꺾은선 그래프(SVG) 그리기
const COLORS = ['#e53935', '#1e88e5'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function lineChart(data) {
  const W = 300, H = 180, L = 34, R = 10, T = 12, B = 28;
  const rows = data.rows || [];
  const vals = rows.flatMap((r) => [r.a, r.b]).filter((v) => v !== null);
  if (!rows.length || !vals.length) return '<div class="empty">값을 입력하면 그래프가 나타나요</div>';
  let min = Math.min(0, ...vals), max = Math.max(...vals);
  if (max === min) max = min + 1;
  const x = (i) => L + (rows.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (rows.length - 1));
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="꺾은선 그래프">`;
  for (let k = 0; k <= 4; k++) {
    const v = min + ((max - min) * k) / 4;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ddd"/><text x="${L - 4}" y="${y(v) + 4}" text-anchor="end" font-size="10">${+v.toFixed(1)}</text>`;
  }
  rows.forEach((r, i) => (s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="10">${esc(r.label)}</text>`));
  ['a', 'b'].forEach((k, n) => {
    const pts = rows.map((r, i) => (r[k] === null ? null : [x(i), y(r[k])]));
    let d = '', pen = false;
    pts.forEach((p) => { if (!p) pen = false; else { d += (pen ? 'L' : 'M') + p[0] + ' ' + p[1]; pen = true; } });
    s += `<path d="${d}" fill="none" stroke="${COLORS[n]}" stroke-width="2.5"/>`;
    pts.forEach((p) => p && (s += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${COLORS[n]}"/>`));
  });
  return s + '</svg>';
}

function legend(data) {
  const n = data.names || ['값 A', '값 B'];
  return `<div class="legend"><span style="color:${COLORS[0]}">● ${esc(n[0])}</span> <span style="color:${COLORS[1]}">● ${esc(n[1])}</span></div>`;
}

function tableHtml(data) {
  const n = data.names || ['값 A', '값 B'];
  const v = (x) => (x === null ? '' : x);
  return `<table><tr><th>항목</th><th>${esc(n[0])}</th><th>${esc(n[1])}</th></tr>${(data.rows || [])
    .map((r) => `<tr><td>${esc(r.label)}</td><td>${v(r.a)}</td><td>${v(r.b)}</td></tr>`).join('')}</table>`;
}

function roomValue() {
  return `${document.getElementById('grade').value}-${document.getElementById('cls').value}`;
}
function fillRoomSelects() {
  const g = document.getElementById('grade'), c = document.getElementById('cls');
  for (let i = 1; i <= 6; i++) g.add(new Option(i + '학년', i));
  for (let i = 1; i <= 15; i++) c.add(new Option(i + '반', i));
  const saved = localStorage.getItem('room');
  if (saved) [g.value, c.value] = saved.split('-');
}
