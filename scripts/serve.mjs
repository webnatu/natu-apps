import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.jpg': 'image/jpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = requested === '/' ? 'index.html' : requested.slice(1);
    // Expose only application assets, never Git metadata or test/dependency files.
    if (!(relative === 'index.html' || /^src\/[\w./-]+$/.test(relative)) || relative.split('/').includes('..')) { res.writeHead(404).end('Introuvable'); return; }
    const file = path.join(root, relative);
    const body = await readFile(file);
    const range = req.headers.range;
    if (range && path.extname(file) === '.mp4') {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match || Number(match[1]) >= body.length) { res.writeHead(416, { 'Content-Range': `bytes */${body.length}` }).end(); return; }
      const start = Number(match[1]), end = Math.min(match[2] ? Number(match[2]) : body.length - 1, body.length - 1);
      if (end < start) { res.writeHead(416).end(); return; }
      res.writeHead(206, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': end - start + 1 }); res.end(body.subarray(start, end + 1)); return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); res.end(body);
  } catch { res.writeHead(404).end('Introuvable'); }
});
server.listen(Number(process.env.PORT || 5173), process.env.HOST || '127.0.0.1', () => console.log(`Mission Lecture: port ${server.address().port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
