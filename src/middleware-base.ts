import { ViteDevServer } from 'vite';
import { IncomingMessage } from 'connect';
import { ServerResponse } from 'http';

export function serverMiddleware() {
  return {
    name: 'server-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url?.startsWith('/rpc')) {
          // Handle RPC calls here
          const [_, action] = req.url.split('/rpc/');
          if (action) {
            console.log(action)
            try {
              const body = await new Promise<unknown>((resolve, reject) => {
                let data = '';
                req.on('data', chunk => data += chunk);
                req.on('end', () => resolve(JSON.parse(data)));
                req.on('error', reject);
              });

              const result = await handleAction(action, body);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              res.statusCode = 500;
              res.end(JSON.stringify({ error: errorMessage }));
            }
          } else {
            res.statusCode = 404;
            res.end('Not Found');
          }
        } else {
          next();
        }
      });
    },
  };
}

type ActionHandler = (body: Request['body']) => Promise<any>;

async function handleAction(action: string, body: unknown) {
  // Define your server functions here
  const actions: { [key: string]: ActionHandler } = {
    echo: async (body: any) => {

      console.log('handleAction.body', body)
      return body
    },
    // Add more actions here
  };

  if (actions[action]) {
    return actions[action](body);
  } else {
    throw new Error('Unknown action');
  }
}
