import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';

const MORPHEUS = 'http://morpheus.test';

function fixture(name: string): string {
  return readFileSync(new URL(`../../shared/test/fixtures/${name}.txt`, import.meta.url), 'utf8');
}

/**
 * A fetch mock that serves canned morpheus bodies keyed by full URL.
 * `log` records every requested URL so tests can assert caching behavior.
 */
function mockFetch(
  responses: Record<string, string>,
  log: string[] = [],
): typeof fetch {
  return (async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    log.push(url);
    const body = responses[url];
    if (body === undefined) {
      return new Response('not found in mock', { status: 404 });
    }
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  }) as typeof fetch;
}

function throwingFetch(log: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL): Promise<Response> => {
    log.push(String(input));
    throw new Error('connect ECONNREFUSED 127.0.0.1:1315');
  }) as typeof fetch;
}

describe('GET /latin/:word', () => {
  it('returns parsed analyses for a known word', async () => {
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: mockFetch({ [`${MORPHEUS}/latin/feminam?opts=S`]: fixture('feminam') }),
    });
    const res = await app.inject({ method: 'GET', url: '/latin/feminam' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      form: 'feminam',
      analyses: [
        {
          pos: 'noun',
          lemma: 'femina',
          cases: ['acc'],
          numbers: ['sg'],
          genders: ['fem'],
          features: [],
          stem: 'a_ae',
        },
      ],
    });
  });

  it('percent-encodes the word and passes opts=S by default', async () => {
    const log: string[] = [];
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: mockFetch({ [`${MORPHEUS}/latin/Aeneas?opts=S`]: fixture('Aeneas') }, log),
    });
    const res = await app.inject({ method: 'GET', url: '/latin/Aeneas' });
    expect(res.statusCode).toBe(200);
    expect(log).toEqual([`${MORPHEUS}/latin/Aeneas?opts=S`]);
    const body = res.json();
    expect(body.form).toBe('Aeneas');
    expect(body.analyses).toHaveLength(4); // name Aenea, name Aeneas ×2, adjective aeneus
  });

  it('allows overriding opts via query param', async () => {
    const log: string[] = [];
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: mockFetch({ [`${MORPHEUS}/latin/arma?opts=n`]: fixture('arma') }, log),
    });
    const res = await app.inject({ method: 'GET', url: '/latin/arma?opts=n' });
    expect(res.statusCode).toBe(200);
    expect(log).toEqual([`${MORPHEUS}/latin/arma?opts=n`]);
  });

  it('returns 200 with empty analyses for unknown words', async () => {
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: mockFetch({ [`${MORPHEUS}/latin/zzzzz?opts=S`]: '' }),
    });
    const res = await app.inject({ method: 'GET', url: '/latin/zzzzz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ form: 'zzzzz', analyses: [] });
  });

  it('serves repeat lookups from the cache without calling morpheus again', async () => {
    const log: string[] = [];
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: mockFetch({ [`${MORPHEUS}/latin/feminam?opts=S`]: fixture('feminam') }, log),
    });
    const first = await app.inject({ method: 'GET', url: '/latin/feminam' });
    const second = await app.inject({ method: 'GET', url: '/latin/feminam' });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(log).toEqual([`${MORPHEUS}/latin/feminam?opts=S`]); // fetched once
  });

  it('caches per exact form: Aeneas and aeneas hit morpheus separately under opts=S', async () => {
    const log: string[] = [];
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: mockFetch({
        [`${MORPHEUS}/latin/Aeneas?opts=S`]: fixture('Aeneas'),
        [`${MORPHEUS}/latin/aeneas?opts=S`]: '',
      }, log),
    });
    await app.inject({ method: 'GET', url: '/latin/Aeneas' });
    await app.inject({ method: 'GET', url: '/latin/aeneas' });
    expect(log).toEqual([
      `${MORPHEUS}/latin/Aeneas?opts=S`,
      `${MORPHEUS}/latin/aeneas?opts=S`,
    ]);
  });

  it('responds 502 with a clear message when morpheus is unreachable', async () => {
    const app = createApp({ morpheusUrl: MORPHEUS, fetchImpl: throwingFetch() });
    const res = await app.inject({ method: 'GET', url: '/latin/feminam' });
    expect(res.statusCode).toBe(502);
    const body = res.json();
    expect(body.error).toBe('morpheus is unreachable');
    expect(body.detail).toContain('ECONNREFUSED');
    expect(body.morpheus).toBe(`${MORPHEUS}/latin/feminam?opts=S`);
  });

  it('responds 502 when morpheus returns an HTTP error', async () => {
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: (async () => new Response('boom', { status: 500 })) as typeof fetch,
    });
    const res = await app.inject({ method: 'GET', url: '/latin/feminam' });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe('morpheus returned HTTP 500');
  });

  it('rejects non-alphabetic words with 400', async () => {
    const log: string[] = [];
    const app = createApp({ morpheusUrl: MORPHEUS, fetchImpl: mockFetch({}, log) });
    for (const bad of ['feminam1', 'virum-que', 'a%20b']) {
      const res = await app.inject({ method: 'GET', url: `/latin/${encodeURIComponent(bad)}` });
      expect(res.statusCode, `word "${bad}"`).toBe(400);
    }
    expect(log).toEqual([]); // morpheus never contacted
  });

  it('rejects a bogus opts value with 400', async () => {
    const log: string[] = [];
    const app = createApp({ morpheusUrl: MORPHEUS, fetchImpl: mockFetch({}, log) });
    const res = await app.inject({ method: 'GET', url: '/latin/arma?opts=%24%24%24%24%24' });
    expect(res.statusCode).toBe(400);
    expect(log).toEqual([]);
  });
});

describe('GET /health', () => {
  it('reports ok when morpheus answers (any status, even 404)', async () => {
    const app = createApp({
      morpheusUrl: MORPHEUS,
      fetchImpl: (async () => new Response('<h1>Not Found</h1>', { status: 404 })) as typeof fetch,
    });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', morpheus: MORPHEUS, morpheusStatus: 404 });
  });

  it('reports 502 when morpheus is unreachable', async () => {
    const app = createApp({ morpheusUrl: MORPHEUS, fetchImpl: throwingFetch() });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(502);
    const body = res.json();
    expect(body.status).toBe('unreachable');
    expect(body.detail).toContain('ECONNREFUSED');
  });
});
