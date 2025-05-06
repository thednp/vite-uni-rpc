import type { ViteDevServer, Connect } from 'vite';
import * as v from 'valibot';

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
              res.end(JSON.stringify({ error: (error as Error).message }));
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

async function parseRequestBody(req: Connect.IncomingMessage): Promise<any> {
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

const ActionSchema = v.object({
  example: v.pipe(v.string(), v.minLength(3, "What's that?")),
});

async function handleAction(action: string, body: string) {
  // Define a schema for body validation using valibot
  const actionSchemas: { [key: string]: any } = {
    echo: ActionSchema,
    // Add schemas for other actions here
  };
  // console.log(body)

  // Define your server functions here
  const actions: { [key: string]: (body: any) => any } = {
    echo: async (body) => {
      // Validate input
      const validatedBody = v.parse(actionSchemas['echo'], body);
      console.log('handleAction.body', body, validatedBody)
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
    const validatedBody = v.parse(schema, body);
    return actions[action](validatedBody);
  } else {
    throw new Error('Unknown action');
  }
}