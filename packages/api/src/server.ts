import Fastify, { type FastifyInstance } from 'fastify';
import { parseMorpheus } from '@lego/shared';
import type { FormAnalysis } from '@lego/shared';

/**
 * Create the lego API app.
 *
 * Routes:
 * - `GET /latin/:word` — analyze a word form via the morpheus container and
 *   return `{ form, analyses }` (parsed with the shared parser). The morpheus
 *   `opts` parameter defaults to `S` (morpheus `-S`: allow capitalized input)
 *   and can be overridden with `?opts=…`. Unknown words return
 *   `{ form, analyses: [] }` with 200. If morpheus is unreachable or errors,
 *   responds 502 with a clear message.
 * - `GET /health` — ping the morpheus container (any HTTP response, even a
 *   404 on the container root, proves it is up).
 *
 * Results are cached in memory. The cache key includes the exact requested
 * form (not just its lowercase): with `opts=S`, morpheus is case-sensitive
 * for proper names — `Aeneas` and `aeneas` genuinely analyze differently —
 * so a purely lowercased key could serve wrong results. Case-insensitive
 * common words (`Arma`/`arma`/`ARMA` all parse identically) simply produce
 * a few equivalent entries.
 */
export function createApp(options: CreateAppOptions = {}): FastifyInstance {
  const morpheusUrl = (options.morpheusUrl ?? process.env.MORPHEUS_URL ?? DEFAULT_MORPHEUS_URL)
    .replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const cache = new Map<string, FormAnalysis>();

  const app = Fastify({ logger: false });

  app.get<{ Params: { word: string }; Querystring: { opts?: string } }>(
    '/latin/:word',
    async (request, reply) => {
      const { word } = request.params;
      const opts = request.query.opts ?? DEFAULT_OPTS;

      if (!/^[A-Za-z]+$/.test(word)) {
        return reply.code(400).send({
          error: 'invalid word: must consist of Latin letters only',
          form: word,
        });
      }
      if (!/^[A-Za-z]{0,4}$/.test(opts)) {
        return reply.code(400).send({
          error: 'invalid opts: must be 0-4 morpheus option letters',
          opts,
        });
      }

      const cacheKey = `${opts}:${word}`;
      const cached = cache.get(cacheKey);
      if (cached !== undefined) return cached;

      const url = `${morpheusUrl}/latin/${encodeURIComponent(word)}?opts=${encodeURIComponent(opts)}`;
      let body: string;
      try {
        const response = await fetchImpl(url);
        if (!response.ok) {
          return reply.code(502).send({
            error: `morpheus returned HTTP ${response.status}`,
            morpheus: url,
          });
        }
        body = await response.text();
      } catch (err) {
        return reply.code(502).send({
          error: 'morpheus is unreachable',
          morpheus: url,
          detail: err instanceof Error ? err.message : String(err),
        });
      }

      const result: FormAnalysis = { form: word, analyses: parseMorpheus(body) };
      cache.set(cacheKey, result);
      return result;
    },
  );

  app.get('/health', async (_request, reply) => {
    try {
      const response = await fetchImpl(`${morpheusUrl}/`);
      // The container root answers 404 "Not Found" — any response means up.
      return { status: 'ok', morpheus: morpheusUrl, morpheusStatus: response.status };
    } catch (err) {
      return reply.code(502).send({
        status: 'unreachable',
        morpheus: morpheusUrl,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return app;
}

export interface CreateAppOptions {
  /** Base URL of the morpheus-api container (default http://localhost:1315, or $MORPHEUS_URL). */
  morpheusUrl?: string;
  /** Fetch implementation — injectable for tests (defaults to global fetch). */
  fetchImpl?: typeof fetch;
}

const DEFAULT_MORPHEUS_URL = 'http://localhost:1315';
const DEFAULT_OPTS = 'S';

// Only listen when run directly (tsx src/server.ts), not under vitest.
if (process.env.VITEST == null) {
  const port = Number(process.env.PORT ?? 8787);
  const app = createApp();
  app
    .listen({ port, host: '0.0.0.0' })
    .then(() => {
      console.log(`lego api listening on http://localhost:${port} (morpheus: ${process.env.MORPHEUS_URL ?? DEFAULT_MORPHEUS_URL})`);
    })
    .catch((err) => {
      console.error('lego api failed to start:', err);
      process.exit(1);
    });
}
