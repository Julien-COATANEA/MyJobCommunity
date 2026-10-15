import { afterEach, describe, expect, it, vi } from 'vitest';
import { lireTous, memoiser } from './strapi';

const reponse = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status });

afterEach(() => vi.unstubAllGlobals());

describe('lireTous', () => {
  it("lit toutes les pages dans l'ordre, la première donnant le nombre de pages", async () => {
    const appels: number[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      const page = Number(new URL(url).searchParams.get('pagination[page]'));
      appels.push(page);
      return reponse({ data: [{ n: page * 2 }, { n: page * 2 + 1 }], meta: { pagination: { page, pageCount: 20, total: 40 } } });
    });
    const tous = await lireTous<{ n: number }>('test-ordre');
    expect(tous.map((d) => d.n)).toEqual(Array.from({ length: 40 }, (_, i) => i + 2));
    expect(appels[0]).toBe(1);
    expect(appels).toHaveLength(20);
  });

  it("garde la population profonde par défaut mais pas avec une projection légère", async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return reponse({ data: [], meta: { pagination: { pageCount: 1 } } });
    });
    await lireTous('test-populate-1');
    await lireTous('test-populate-2', { 'fields[0]': 'slug', 'populate[entreprise][fields][0]': 'slug' });
    expect(new URL(urls[0]).searchParams.get('populate')).toBe('deep');
    expect(new URL(urls[1]).searchParams.has('populate')).toBe(false);
    expect(new URL(urls[1]).searchParams.get('pagination[pageSize]')).toBe('100');
  });

  it('réessaie après une erreur passagère de Strapi', async () => {
    let n = 0;
    vi.stubGlobal('fetch', async () => (++n === 1 ? reponse({}, 503) : reponse({ data: [{ ok: true }], meta: { pagination: { pageCount: 1 } } })));
    expect(await lireTous('test-retry')).toEqual([{ ok: true }]);
    expect(n).toBe(2);
  });

  it("n'insiste pas sur une erreur définitive (403)", async () => {
    let n = 0;
    vi.stubGlobal('fetch', async () => {
      n++;
      return reponse({}, 403);
    });
    await expect(lireTous('test-403')).rejects.toThrow(/403/);
    expect(n).toBe(1);
  });
});

describe('memoiser', () => {
  it('ne calcule qu une fois, et recalcule après un échec', async () => {
    let n = 0;
    const lire = memoiser(async () => {
      if (++n === 1) throw new Error('échec');
      return n;
    }, 60_000);
    await expect(lire()).rejects.toThrow('échec');
    expect(await lire()).toBe(2);
    expect(await lire()).toBe(2);
    expect(n).toBe(2);
  });
});
