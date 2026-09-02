import { createApp } from './app.js';
import { config } from './config.js';

(async () => {
  const app = await createApp({ serveStatic: true, warmSheet: true });

  const server = app.listen(config.port, () => {
    console.log(`🚀 [Server] Backend running at http://localhost:${config.port}`);
    console.log(`📡 [Health] http://localhost:${config.port}/api/health`);
    console.log(`🎙️  [Sarvam] http://localhost:${config.port}/api/sarvam/config`);
    console.log(`🏥 [Pulse]  http://localhost:${config.port}/api/pulse/meta`);
    console.log(`📊 [Comm]   http://localhost:${config.port}/api/commercial/meta`);
  });

  // Graceful Shutdown
  function handleShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, closing HTTP server gracefully...`);
    server.close(() => {
      console.log('✅ HTTP server closed. Process exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('⚠️ Forcefully terminating server after timeout.');
      process.exit(1);
    }, 5000);
  }

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
})();
