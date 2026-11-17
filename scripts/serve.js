import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  let path;
  try {
    path = resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (path === root) path = resolve(root, 'index.html');
  if (!path.startsWith(`${root}${sep}`) || (!path.endsWith('index.html') && !path.startsWith(`${root}${sep}src${sep}`))) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content);
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR') console.error(error);
    res.writeHead(404).end('Not found');
  }
});
server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => console.log(`OnePlanning: http://127.0.0.1:${server.address().port}`));
