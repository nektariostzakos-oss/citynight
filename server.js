// Custom Next.js entry — used by Hostinger Node hosting when the form has
// no "startup arguments" field, so `node server.js` substitutes for
// `next start`. Same runtime, same App Router, same ISR cache.
//
// Locally and in CI we keep using `pnpm start` (= `next start`); this file
// only matters on Hostinger.

const next = require('next');
const http = require('http');

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => handle(req, res))
    .listen(port, hostname, () => {
      console.log(`citynight ready on http://${hostname}:${port}`);
    });
}).catch((err) => {
  console.error('Next.js failed to start:', err);
  process.exit(1);
});
