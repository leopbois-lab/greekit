import { describe, expect, it } from 'vitest';
import type { ProductCache } from '../services/openFoodFacts';
import { createProductLookup } from '../services/openFoodFacts';
import coca from './__fixtures__/off-coca.json';
import notFound from './__fixtures__/off-not-found.json';
import nutella from './__fixtures__/off-nutella.json';
import oasis from './__fixtures__/off-oasis.json';
import { hasValidCheckDigit, normalizeBarcode } from './barcode';
import {
  computeScannedPurchase,
  offProductUrl,
  parseOffResponse,
  parsePackWeight,
  parseQuantityText,
  productLabel,
  type ScannedProduct,
} from './openFoodFacts';

describe('codes-barres', () => {
  it('vérifie la clé de contrôle', () => {
    expect(hasValidCheckDigit('3017620422003')).toBe(true);
    expect(hasValidCheckDigit('3017620422004')).toBe(false);
    expect(hasValidCheckDigit('96385074')).toBe(true);
    expect(hasValidCheckDigit('036000291452')).toBe(true);
    expect(hasValidCheckDigit('30176x0422003')).toBe(false);
  });
  it('normalise EAN-13, EAN-8 et UPC-A', () => {
    expect(normalizeBarcode(' 3017620422003 ')).toBe('3017620422003');
    expect(normalizeBarcode('3 017620 422003')).toBe('3017620422003');
    expect(normalizeBarcode('96385074')).toBe('96385074');
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
  });
  it('rejette les codes faux, trop courts ou non numériques', () => {
    for (const bad of ['', '123', '3017620422004', 'abcdefghijklm', '30176204220031']) {
      expect(normalizeBarcode(bad), bad).toBeNull();
    }
  });
});

describe('parseOffResponse (réponses réelles de l’API v3.1)', () => {
  it('lit co2_total, le poids et la référence Agribalyse', () => {
    const r = parseOffResponse('3017620422003', nutella);
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expect(r.product).toMatchObject({
      name: 'Nutella',
      brand: 'Ferrero',
      co2PerKg: 9.11,
      agribalyseName: 'Pâte à tartiner chocolat et noisette',
      agribalyseVersion: '3.2',
      packWeight: { kg: 0.4, basis: 'poids' },
      quantityText: '400 g',
      isBeverage: false,
    });
  });
  it('reconnaît une boisson vendue au volume', () => {
    const r = parseOffResponse('3124480191182', oasis);
    expect(r.status === 'found' && r.product.isBeverage).toBe(true);
    expect(r.status === 'found' && r.product.packWeight).toEqual({ kg: 2, basis: 'volume' });
    expect(r.status === 'found' && r.product.co2PerKg).toBe(0.566);
  });
  it('signale un produit connu mais sans donnée carbone', () => {
    const r = parseOffResponse('5449000000996', coca);
    expect(r.status === 'found' && r.product.co2PerKg).toBeNull();
    // Le nom français est préféré au nom générique.
    expect(r.status === 'found' && r.product.name).toBe('Coca-Cola');
    expect(r.status === 'found' && r.product.isBeverage).toBe(true);
  });
  it('signale un produit inconnu', () => {
    expect(parseOffResponse('2999999999990', notFound)).toEqual({ status: 'not-found' });
    expect(parseOffResponse('1', null)).toEqual({ status: 'not-found' });
    expect(parseOffResponse('1', 'du texte')).toEqual({ status: 'not-found' });
  });
  it('se replie sur l’ancien nom ecoscore_data', () => {
    const { environmental_score_data, ...rest } = nutella.product;
    const legacy = { ...nutella, product: { ...rest, ecoscore_data: environmental_score_data } };
    const r = parseOffResponse('3017620422003', legacy);
    expect(r.status === 'found' && r.product.co2PerKg).toBe(9.11);
  });
  it('tolère des champs mal typés sans planter', () => {
    const odd = { product: { product_name: 42, product_quantity: '250', product_quantity_unit: 'g', environmental_score_data: { agribalyse: { co2_total: '1,5' } } } };
    const r = parseOffResponse('1', odd);
    expect(r.status === 'found' && r.product).toMatchObject({ name: null, co2PerKg: 1.5, packWeight: { kg: 0.25, basis: 'poids' } });
  });
  it('demande les nouveaux et les anciens champs', () => {
    const url = offProductUrl('3017620422003');
    expect(url).toContain('/api/v3.1/product/3017620422003');
    expect(url).toContain('environmental_score_data');
    expect(url).toContain('ecoscore_data');
  });
});

describe('poids du paquet', () => {
  it('lit les textes de quantité courants', () => {
    expect(parseQuantityText('400 g')).toEqual({ kg: 0.4, basis: 'poids' });
    expect(parseQuantityText('1,5 L')).toEqual({ kg: 1.5, basis: 'volume' });
    expect(parseQuantityText('1 kg')).toEqual({ kg: 1, basis: 'poids' });
    expect(parseQuantityText('33cl')).toEqual({ kg: 0.33, basis: 'volume' });
    expect(parseQuantityText('6 x 33 cl')?.kg).toBeCloseTo(1.98);
    expect(parseQuantityText('300 g ℮')).toEqual({ kg: 0.3, basis: 'poids' });
  });
  it('renvoie null quand rien n’est exploitable', () => {
    for (const t of ['', 'une boîte', '12 œufs', null, undefined]) expect(parseQuantityText(t)).toBeNull();
  });
  it('préfère les champs normalisés au texte libre', () => {
    expect(parsePackWeight(400, 'g', '1 kg')).toEqual({ kg: 0.4, basis: 'poids' });
    expect(parsePackWeight(undefined, undefined, '1 kg')).toEqual({ kg: 1, basis: 'poids' });
    expect(parsePackWeight(400, undefined, undefined)).toBeNull();
  });
});

const product = (over: Partial<ScannedProduct> = {}): ScannedProduct => ({
  barcode: '3017620422003', name: 'Nutella', brand: 'Ferrero', co2PerKg: 9.11,
  agribalyseName: 'Pâte à tartiner chocolat et noisette', agribalyseVersion: '3.2',
  quantityText: '400 g', packWeight: { kg: 0.4, basis: 'poids' }, isBeverage: false, ...over,
});

describe('computeScannedPurchase', () => {
  it('multiplie co2_total par le poids : résultat « précis »', () => {
    const r = computeScannedPurchase(product(), 0.4, 'poids', '2026-11-16');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purchase.kgCO2e).toBeCloseTo(3.644);
    expect(r.purchase).toMatchObject({
      confidence: 'precis', mode: 'code-barres', category: 'alimentation', unit: 'kg', quantity: 0.4,
      factorId: 'off-3017620422003', label: 'Nutella (Ferrero)',
    });
    expect(r.purchase.source.url).toBe('https://world.openfoodfacts.org/product/3017620422003');
    expect(r.purchase.source.name).toContain('Agribalyse 3.2');
    expect(r.purchase.note).toContain('Pâte à tartiner');
  });
  it('reste « précis » avec un poids saisi, passe à « estimé » pour un volume', () => {
    const typed = computeScannedPurchase(product(), 0.2, 'saisi', '2026-11-16');
    expect(typed.ok && typed.purchase.confidence).toBe('precis');
    const drink = computeScannedPurchase(product({ isBeverage: true }), 2, 'volume', '2026-11-16');
    expect(drink.ok && drink.purchase.confidence).toBe('estime');
    expect(drink.ok && drink.purchase.category).toBe('boissons');
    expect(drink.ok && drink.purchase.note).toContain('1 kg par litre');
  });
  it('refuse un produit sans donnée ou un poids invalide', () => {
    expect(computeScannedPurchase(product({ co2PerKg: null }), 1, 'poids', '2026-11-16')).toEqual({ ok: false, error: 'facteur-a-completer' });
    expect(computeScannedPurchase(product(), 0, 'poids', '2026-11-16')).toEqual({ ok: false, error: 'quantite-invalide' });
  });
  it('compose un libellé lisible', () => {
    expect(productLabel(product({ name: 'Nutella Ferrero' }))).toBe('Nutella Ferrero');
    expect(productLabel(product({ name: 'Coca-Cola', brand: 'COCA-COLA SERVICES SA/NV' }))).toBe('Coca-Cola');
    expect(productLabel(product({ name: null, brand: null }))).toBe('Produit 3017620422003');
  });
});

describe('recherche d’un produit (réseau + cache)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const memoryCache = (): ProductCache & { store: Map<string, { product: ScannedProduct; fetchedAt: number }> } => {
    const store = new Map<string, { product: ScannedProduct; fetchedAt: number }>();
    return {
      store,
      get: async (b) => store.get(b) ?? null,
      put: async (p, fetchedAt) => void store.set(p.barcode, { product: p, fetchedAt }),
    };
  };
  const respond = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });
  const offline = async () => {
    throw new TypeError('Failed to fetch');
  };

  it('interroge l’API puis met le produit en cache', async () => {
    const cache = memoryCache();
    const lookup = createProductLookup({ cache, fetchImpl: respond(nutella), now: () => 1000 });
    const r = await lookup('3017620422003');
    expect(r).toMatchObject({ status: 'found', fromCache: false });
    expect(cache.store.get('3017620422003')?.fetchedAt).toBe(1000);
  });
  it('répond depuis un cache récent sans toucher au réseau', async () => {
    const cache = memoryCache();
    await cache.put(product(), 0);
    let calls = 0;
    const lookup = createProductLookup({ cache, fetchImpl: async () => (calls++, new Response('{}')), now: () => 29 * DAY });
    expect(await lookup('3017620422003')).toMatchObject({ status: 'found', fromCache: true });
    expect(calls).toBe(0);
  });
  it('rafraîchit un cache trop vieux, mais s’en sert si le réseau tombe', async () => {
    const cache = memoryCache();
    await cache.put(product({ name: 'Ancien' }), 0);
    const fresh = await createProductLookup({ cache, fetchImpl: respond(nutella), now: () => 31 * DAY })('3017620422003');
    expect(fresh.status === 'found' && fresh.product.name).toBe('Nutella');

    const cache2 = memoryCache();
    await cache2.put(product({ name: 'Ancien' }), 0);
    const stale = await createProductLookup({ cache: cache2, fetchImpl: offline, now: () => 31 * DAY })('3017620422003');
    expect(stale).toMatchObject({ status: 'found', fromCache: true });
  });
  it('signale le hors-ligne quand le produit n’a jamais été scanné', async () => {
    const lookup = createProductLookup({ cache: memoryCache(), fetchImpl: offline });
    expect(await lookup('3017620422003')).toEqual({ status: 'offline' });
    const down = createProductLookup({ cache: memoryCache(), fetchImpl: respond({}, 503) });
    expect(await down('3017620422003')).toEqual({ status: 'offline' });
  });
  it('ne met pas en cache un produit inconnu (404)', async () => {
    const cache = memoryCache();
    const lookup = createProductLookup({ cache, fetchImpl: respond(notFound, 404) });
    expect(await lookup('2999999999990')).toEqual({ status: 'not-found', fromCache: false });
    expect(cache.store.size).toBe(0);
  });
});
