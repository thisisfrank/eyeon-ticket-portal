import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Runs the Vercel functions in /api inside the Vite dev server, so
 * `npm run dev` works locally without the Vercel CLI. On Vercel itself
 * the same files are deployed as serverless functions.
 */
function localApi(): Plugin {
  const root = process.cwd();
  const apiDir = path.join(root, 'api');
  const maxBody = 4.5 * 1024 * 1024;

  const resolve = (pathname: string) => {
    const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    if (segments.length === 0 || segments.some((part) => part.startsWith('_') || part.includes('..'))) return null;
    const direct = path.join(apiDir, ...segments) + '.js';
    if (fs.existsSync(direct)) return { file: direct, params: {} };
    const index = path.join(apiDir, ...segments, 'index.js');
    if (fs.existsSync(index)) return { file: index, params: {} };
    const dir = path.join(apiDir, ...segments.slice(0, -1));
    if (!fs.existsSync(dir)) return null;
    const dynamic = fs.readdirSync(dir).find((name) => /^\[\w+\]\.js$/.test(name));
    if (!dynamic) return null;
    const key = dynamic.slice(1, -4);
    return { file: path.join(dir, dynamic), params: { [key]: decodeURIComponent(segments[segments.length - 1]) } };
  };

  const readBody = (req: IncomingMessage) =>
    new Promise<Buffer>((done, fail) => {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBody) {
          fail(Object.assign(new Error('Request body too large.'), { status: 413 }));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => done(Buffer.concat(chunks)));
      req.on('error', fail);
    });

  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const match = resolve(url.pathname);
        const send = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        if (!match) return send(404, { message: 'Not found.' });

        try {
          const raw = await readBody(req);
          let body: unknown = raw.length ? raw.toString('utf8') : undefined;
          if (typeof body === 'string' && (req.headers['content-type'] || '').includes('application/json')) {
            try {
              body = JSON.parse(body);
            } catch {
              return send(400, { message: 'Invalid JSON body.' });
            }
          }
          const query = { ...Object.fromEntries(url.searchParams), ...match.params };
          const vercelRes = Object.assign(res, {
            status(code: number) {
              res.statusCode = code;
              return vercelRes;
            },
            json(data: unknown) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return vercelRes;
            },
            send(data: unknown) {
              res.end(data as Buffer);
              return vercelRes;
            },
          });
          const mod = await server.ssrLoadModule(match.file);
          await mod.default(Object.assign(req, { query, body }), vercelRes);
        } catch (error) {
          const status = (error as { status?: number }).status || 500;
          if (status === 500) console.error(error);
          if (!res.headersSent) send(status, { message: (error as Error).message || 'Server error.' });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env values visible to the /api handlers during local development.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), localApi()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
