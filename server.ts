import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const vite = await createViteServer({
    server: { middlewareMode: true },
  });

  app.use(vite.middlewares);

  app.listen(5173, () => {
    console.log('Server listening at http://localhost:5173');
  });
}

startServer();
