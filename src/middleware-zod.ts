import { ViteDevServer } from 'vite';
import { z } from 'zod'; // Assuming you have zod installed for schema validation

export function serverMiddleware() {
  return {
    name: 'server-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/rpc')) {
          const [_, action] = req.url.split('/rpc/');
          if (action) {
            try {
              const body = await parseRequestBody(req);
              const result = await handleAction(action, body);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
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

async function parseRequestBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: string) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function handleAction(action: string, body: any) {
  // Define a schema for body validation
  const actionSchemas: { [key: string]: z.ZodSchema<any> } = {
    echo: z.object({
      message: z.string(),
    }),
    // Add schemas for other actions here
  };

  // Define your server functions here
  const actions: { [key: string]: (body: any) => any } = {
    echo: async (body) => {
      // Validate input
      const validatedBody = actionSchemas['echo'].parse(body);
      return validatedBody;
    },
    // Add more actions here
  };

  if (actions[action]) {
    const schema = actionSchemas[action];
    if (!schema) {
      throw new Error('Schema not defined for action');
    }

    // Validate the request body
    const validatedBody = schema.parse(body);
    return actions[action](validatedBody);
  } else {
    throw new Error('Unknown action');
  }
}