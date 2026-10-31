import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev, serve as funções de /api (formato Web Request/Response da Vercel) pelo próprio Vite.
function vercelApi() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url.match(/^\/api\/([\w-]+)/);
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`);
          const handler = mod[req.method];
          if (!handler) return res.writeHead(405).end();
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
          });
          const response = await handler(request);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error(err);
          res.writeHead(500).end(String(err));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), vercelApi()] };
});
