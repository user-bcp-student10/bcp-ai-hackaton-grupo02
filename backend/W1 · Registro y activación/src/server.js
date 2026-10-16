import { createServer } from 'node:http';
import { createApp } from './app.js';

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3001);
const server = createServer(createApp());

server.listen(port, host, () => {
  console.log(`W1 API proxy listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}