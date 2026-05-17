const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT || 8096);
const root = path.join(process.cwd(), 'dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function resolveRoute(pathname) {
  if (pathname === '/') return path.join(root, 'index.html');
  if (path.extname(pathname)) return path.join(root, pathname);
  return path.join(root, `${pathname.slice(1)}.html`);
}

http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const filePath = resolveRoute(decodeURIComponent(url.pathname));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
    });
    res.end(data);
  });
}).listen(port, '127.0.0.1');
