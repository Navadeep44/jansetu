import { createServer } from 'vite';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function start() {
  const server = await createServer({
    configFile: './vite.config.js'
  });
  await server.listen();
  server.printUrls();

  // Keep event loop alive
  setInterval(() => {}, 1000 * 60 * 60);
}

start().catch(err => {
  console.error('Failed to start Vite server:', err);
});

