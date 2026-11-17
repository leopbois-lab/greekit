/**
 * Génère src/data/factors.v1.json et src/data/equivalences.v1.json depuis les sources publiques.
 * Lancé à la main en développement (`npm run build:factors`), jamais par l'app.
 *
 * Les facteurs viennent des API ci-dessous, jamais d'une valeur écrite en dur. Seules exceptions,
 * saisies à la main depuis une publication et signalées dans le code : le budget annuel moyen
 * (Insee/SDES), la sensibilité de la banquise (Notz & Stroeve 2016), l'absorption d'un arbre
 * (Agence européenne pour l'environnement, 2011) et les constantes physiques
 * du calcul des ballons. Ce qui n'a pas de source vérifiable sort « à compléter », valeur nulle.
 *
 * Sources (vérifiées le 16/11/2026) :
 *  - Impact CO2 (ADEME) — https://impactco2.fr/doc/api — clé facultative : IMPACTCO2_API_KEY.
 *    Réutilisation non commerciale et pédagogique autorisée avec mention de l'ADEME
 *    (https://impactco2.fr/mentions-legales).
 *  - Base Carbone V23.6 — jeu `base-carboner` sur data.ademe.fr — Licence Ouverte Etalab.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  equivalencesFileSchema,
  factorsFileSchema,
  type CategoryId,
  type Equivalence,
  type Factor,
  type Source,
} from '../src/data/schema.ts';

const TODAY = new Date().toISOString().slice(0, 10);
const ICO2 = 'https://impactco2.fr';
const BASE_CARBONE = 'https://data.ademe.fr/data-fair/api/v1/datasets/base-carboner';
const BASE_CARBONE_PAGE = 'https://data.ademe.fr/datasets/base-carboner';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, as: 'json' | 'text' = 'json'): Promise<any> {
  const headers: Record<string, string> = {};
  const key = process.env.IMPACTCO2_API_KEY;
  if (key && url.startsWith(`${ICO2}/api/`)) headers.Authorization = `Bearer ${key}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await sleep(250); // on reste poli avec les API publiques
      return as === 'json' ? await res.json() : await res.text();
    } catch (err) {
      if (attempt >= 4) throw new Error(`Échec sur ${url} : ${String(err)}`);
      await sleep(1000 * 2 ** attempt);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Impact CO2                                                          */
/* ------------------------------------------------------------------ */

interface IcoItem {
  name: string;
  slug: string;
  ecv: number;
  footprint?: number;
  usage?: { peryear: number; defaultyears: number };
  endOfLife?: number;
}

async function thematique(slug: string): Promise<IcoItem[]> {
  const json = await get(`${ICO2}/api/v1/thematiques/ecv/${slug}?detail=1&language=fr`);
  return json.data as IcoItem[];
}

/** Lit l'« étiquette » d'une fiche du site (« 64 g CO₂e 1 heure de streaming vidéo ») pour vérifier l'unité. */
async function etiquette(thematiqueSlug: string, slug: string): Promise<string | null> {
  const html: string = await get(`${ICO2}/outils/${thematiqueSlug}/${slug}`, 'text');
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  const m = text.match(/Étiquette .*?CO₂e (.*?) Partager/);
  return m ? m[1].trim() : null;
}

const round = (n: number) => Number(n.toPrecision(4));

interface ThemeConfig {
  theme: string;
  category: CategoryId;
  unit: string;
  /** Fiche servant à vérifier l'unité sur le site, et motif attendu dans son étiquette. */
  probe: [slug: string, expected: RegExp];
  sourceName: string;
  dataYear: number | null;
  /** Retire la phase d'usage : on compte l'achat (fabrication + fin de vie), pas l'électricité consommée ensuite. */
  purchaseOnly?: boolean;
  keep?: (item: IcoItem) => boolean;
  family?: (item: IcoItem) => string;
  note?: string;
}

const AGRIBALYSE = 'Impact CO2 (ADEME) — données Agribalyse 3.2';
const EMPREINTE = 'Impact CO2 (ADEME) — données Base Empreinte';

const THEMES: ThemeConfig[] = [
  { theme: 'alimentation', category: 'alimentation', unit: 'kg', probe: ['boeuf', /kg|kilo/i], sourceName: AGRIBALYSE, dataYear: 2025, keep: (i) => !i.slug.startsWith('repas') },
  { theme: 'fruitsetlegumes', category: 'alimentation', unit: 'kg', probe: ['pomme', /kg|kilo/i], sourceName: AGRIBALYSE, dataYear: 2025, family: () => 'fruits et légumes' },
  { theme: 'boisson', category: 'boissons', unit: 'L', probe: ['soda', /litre/i], sourceName: AGRIBALYSE, dataYear: 2025, family: () => 'boissons' },
  { theme: 'habillement', category: 'vetements', unit: 'unité', probe: ['jeans', /jean/i], sourceName: EMPREINTE, dataYear: null, purchaseOnly: true },
  { theme: 'numerique', category: 'electronique', unit: 'unité', probe: ['smartphone', /smartphone/i], sourceName: EMPREINTE, dataYear: null, purchaseOnly: true, family: () => 'appareils' },
  { theme: 'electromenager', category: 'electromenager', unit: 'unité', probe: ['lavelinge', /lave-linge/i], sourceName: EMPREINTE, dataYear: null, purchaseOnly: true, family: () => 'appareils' },
  { theme: 'mobilier', category: 'mobilier', unit: 'unité', probe: ['lit', /lit/i], sourceName: EMPREINTE, dataYear: null, family: () => 'meubles' },
  {
    theme: 'transport', category: 'transport', unit: 'km', probe: ['tgv', /km/i], sourceName: EMPREINTE, dataYear: null,
    // On garde les modes génériques ; les variantes de gabarit de voiture alourdiraient la liste.
    keep: (i) => !/^voiture-|^moto-petite$|^marche$/.test(i.slug),
    family: () => 'déplacements',
    note: 'Par personne et par km, construction du véhicule incluse.',
  },
  { theme: 'chauffage', category: 'energie', unit: 'm² chauffé pendant 1 an', probe: ['chauffagegaz', /m²|m2/i], sourceName: EMPREINTE, dataYear: null, family: () => 'chauffage' },
];

const FAMILY_HABILLEMENT = (slug: string) =>
  /chaussure/.test(slug) ? 'chaussures' : /manteau|veste/.test(slug) ? 'vestes et manteaux' : /pull|sweat/.test(slug) ? 'pulls' : /robe/.test(slug) ? 'robes' : 'hauts et bas';

async function impactCo2Factors(): Promise<{ factors: Factor[]; raw: Map<string, IcoItem> }> {
  const factors: Factor[] = [];
  const raw = new Map<string, IcoItem>();

  // Groupes d'aliments (viandes, poissons…) : servent de familles pour les alternatives.
  const groups = new Map<string, string>();
  const grouped = await get(`${ICO2}/api/v1/alimentation?category=group&language=fr`);
  for (const g of grouped.data) for (const item of g.items) groups.set(item.slug, String(g.name ?? (g.slug === 'vegetariens' ? 'alternatives végétariennes' : g.slug)).toLowerCase());

  for (const cfg of THEMES) {
    const label = await etiquette(cfg.theme, cfg.probe[0]);
    const unitVerified = label !== null && cfg.probe[1].test(label);
    if (!unitVerified) console.warn(`⚠ unité non vérifiée pour ${cfg.theme} (étiquette : ${label})`);
    for (const item of await thematique(cfg.theme)) {
      raw.set(item.slug, item);
      if (cfg.keep && !cfg.keep(item)) continue;
      let value = item.ecv;
      const notes: string[] = [];
      if (cfg.note) notes.push(cfg.note);
      if (cfg.purchaseOnly && item.usage) {
        value = item.ecv - item.usage.peryear * item.usage.defaultyears;
        notes.push('Fabrication, distribution et fin de vie ; phase d’usage retirée.');
      }
      if (cfg.dataYear === null) notes.push('Année de la donnée non précisée par la source.');
      if (!unitVerified) notes.push('Unité non confirmée sur le site Impact CO2.');
      const family =
        cfg.theme === 'alimentation' ? (groups.get(item.slug) ?? 'autres')
        : cfg.theme === 'habillement' ? FAMILY_HABILLEMENT(item.slug)
        : cfg.family!(item);
      factors.push({
        id: `ico2-${item.slug}`,
        label: item.name.trim(),
        category: cfg.category,
        family,
        kind: 'article',
        value: unitVerified ? round(value) : null,
        unit: cfg.unit,
        source: { name: cfg.sourceName, url: `${ICO2}/outils/${cfg.theme}/${item.slug}` },
        dataYear: cfg.dataYear,
        retrievedAt: TODAY,
        status: unitVerified ? 'ok' : 'à compléter',
        ...(notes.length ? { note: notes.join(' ') } : {}),
      });
    }
  }

  // Usages numériques : unités hétérogènes, chaque fiche est vérifiée une à une.
  const USAGE_UNITS: Array<[RegExp, string]> = [
    [/^1 heure/i, 'h'],
    [/^1 Go/i, 'Go'],
    [/^1 (e-?mail|spam|recherche)/i, 'unité'],
  ];
  for (const item of await thematique('usagenumerique')) {
    raw.set(item.slug, item);
    const label = await etiquette('usagenumerique', item.slug);
    const unit = label ? USAGE_UNITS.find(([re]) => re.test(label))?.[1] : undefined;
    if (!unit) console.warn(`⚠ unité non vérifiée pour ${item.slug} (étiquette : ${label})`);
    factors.push({
      id: `ico2-${item.slug}`,
      label: item.name.trim(),
      category: 'numerique',
      family: 'usages',
      kind: 'article',
      value: unit ? round(item.ecv) : null,
      unit: unit ?? 'unité',
      source: { name: EMPREINTE, url: `${ICO2}/outils/usagenumerique/${item.slug}` },
      dataYear: null,
      retrievedAt: TODAY,
      status: unit ? 'ok' : 'à compléter',
      note: unit
        ? 'Année de la donnée non précisée par la source.'
        : `Unité non confirmée sur le site Impact CO2 (étiquette lue : ${label ?? 'aucune'}).`,
    });
  }

  // Loisirs : quelques « cas pratiques » dont l'unité est dans le libellé.
  const LOISIRS: Record<string, string> = { ski: 'journée', hotel: 'nuit', camping: 'nuit', location: 'nuit' };
  for (const item of await thematique('caspratiques')) {
    raw.set(item.slug, item);
    const unit = LOISIRS[item.slug];
    if (!unit) continue;
    factors.push({
      id: `ico2-${item.slug}`,
      label: item.name.trim(),
      category: 'loisirs',
      family: item.slug === 'ski' ? 'sorties' : 'hébergement',
      kind: 'article',
      value: round(item.ecv),
      unit,
      source: { name: 'Impact CO2 (ADEME)', url: `${ICO2}/outils/caspratiques/${item.slug}` },
      dataYear: null,
      retrievedAt: TODAY,
      status: 'ok',
      note: 'Année de la donnée non précisée par la source.',
    });
  }
  return { factors, raw };
}

/* ------------------------------------------------------------------ */
/* Base Carbone                                                        */
/* ------------------------------------------------------------------ */

interface BcRow {
  "Identifiant_de_l'élément": string;
  Type_Ligne: string;
  "Statut_de_l'élément": string;
  Nom_base_français: string;
  Nom_attribut_français?: string;
  Unité_français: string;
  Total_poste_non_décomposé: number;
  Date_de_modification?: string;
}

async function baseCarbone(id: string, expectedUnit: RegExp): Promise<BcRow> {
  const qs = encodeURIComponent(`Identifiant_de_l'élément:"${id}"`);
  const json = await get(`${BASE_CARBONE}/lines?qs=${qs}&size=20`);
  const row = (json.results as BcRow[]).find(
    (r) => r["Identifiant_de_l'élément"] === id && r.Type_Ligne === 'Elément',
  );
  if (!row) throw new Error(`Base Carbone : élément ${id} introuvable`);
  if (row["Statut_de_l'élément"] === 'Archivé') throw new Error(`Base Carbone : élément ${id} archivé`);
  if (!expectedUnit.test(row.Unité_français)) {
    throw new Error(`Base Carbone : unité inattendue pour ${id} (${row.Unité_français})`);
  }
  return row;
}

const bcSource = (id: string): Source => ({
  name: `Base Carbone V23.6 (ADEME), élément ${id}`,
  url: BASE_CARBONE_PAGE,
});
const bcYear = (row: BcRow) => (row.Date_de_modification ? Number(row.Date_de_modification.slice(0, 4)) : null);

const ENERGY: Array<{ id: string; bc: string; label: string; unit: string; expect: RegExp; family: string; year?: number }> = [
  { id: 'essence', bc: '25763', label: 'Essence (SP95, SP95-E10, SP98)', unit: 'L', expect: /kgCO2e\/litre/i, family: 'carburants' },
  { id: 'gazole', bc: '25775', label: 'Gazole routier (B7)', unit: 'L', expect: /kgCO2e\/litre/i, family: 'carburants' },
  { id: 'electricite', bc: '43642', label: 'Électricité (mix moyen France 2024)', unit: 'kWh', expect: /kgCO2e\/kWh/i, family: 'électricité et gaz', year: 2024 },
  { id: 'gaz-naturel', bc: '37133', label: 'Gaz naturel (kWh PCS, comme sur la facture)', unit: 'kWh', expect: /kgCO2e\/kWh PCS/i, family: 'électricité et gaz', year: 2022 },
];

/** Ratios monétaires 2023 (SDES/Insee) proposés pour l'estimation par le prix, par catégorie de l'app. */
const RATIOS: Array<{ bc: string; category: CategoryId; label: string }> = [
  { bc: '43410', category: 'alimentation', label: 'Produits alimentaires (estimation par le prix)' },
  { bc: '43410', category: 'boissons', label: 'Boissons (estimation par le prix)' },
  { bc: '43405', category: 'vetements', label: 'Vêtements, chaussures, cuir (estimation par le prix)' },
  { bc: '43420', category: 'electronique', label: 'Produits électroniques et informatiques (estimation par le prix)' },
  { bc: '43360', category: 'mobilier', label: 'Meubles (estimation par le prix)' },
  { bc: '43570', category: 'transport', label: 'Transport terrestre : train, bus, taxi… (estimation par le prix)' },
  { bc: '43565', category: 'transport', label: 'Transport aérien (estimation par le prix)' },
  { bc: '43510', category: 'numerique', label: 'Abonnements télécom : mobile, box (estimation par le prix)' },
  { bc: '43375', category: 'numerique', label: 'Cinéma, TV, musique, streaming (estimation par le prix)' },
  { bc: '43555', category: 'loisirs', label: 'Sport et loisirs (estimation par le prix)' },
  { bc: '43460', category: 'loisirs', label: 'Spectacles, musées, culture (estimation par le prix)' },
  { bc: '43345', category: 'loisirs', label: 'Livres, presse, édition (estimation par le prix)' },
  { bc: '43525', category: 'loisirs', label: 'Hôtels et restaurants (estimation par le prix)' },
];

/** Entrées voulues par le projet mais sans source vérifiée à ce jour. */
const TODO_FACTORS: Array<{ id: string; label: string; category: CategoryId; family: string; kind: Factor['kind']; unit: string; note: string }> = [
  { id: 'todo-ratio-electromenager', label: 'Électroménager (estimation par le prix)', category: 'electromenager', family: 'ratios monétaires', kind: 'monetaire', unit: '€', note: 'Aucun ratio monétaire 2023 « équipements électriques » dans la Base Carbone V23.6.' },
  { id: 'todo-ratio-energie', label: 'Énergie (estimation par le prix)', category: 'energie', family: 'ratios monétaires', kind: 'monetaire', unit: '€', note: 'Aucun ratio monétaire 2023 « électricité, gaz » dans la Base Carbone V23.6.' },
  { id: 'todo-livre', label: 'Livre', category: 'loisirs', family: 'culture', kind: 'article', unit: 'unité', note: 'Facteur par unité à sourcer.' },
  { id: 'todo-console', label: 'Console de jeux', category: 'electronique', family: 'appareils', kind: 'article', unit: 'unité', note: 'Absent de l’API Impact CO2 ; à sourcer.' },
  { id: 'todo-velo', label: 'Vélo neuf', category: 'transport', family: 'véhicules', kind: 'article', unit: 'unité', note: 'Fabrication d’un vélo : facteur à sourcer.' },
  { id: 'todo-cinema', label: 'Place de cinéma', category: 'loisirs', family: 'sorties', kind: 'article', unit: 'unité', note: 'Facteur par séance à sourcer.' },
];

async function baseCarboneFactors(): Promise<{ factors: Factor[]; essence: BcRow }> {
  const factors: Factor[] = [];
  let essence: BcRow | undefined;
  for (const e of ENERGY) {
    const row = await baseCarbone(e.bc, e.expect);
    if (e.id === 'essence') essence = row;
    factors.push({
      id: `bc-${e.id}`,
      label: e.label,
      category: 'energie',
      family: e.family,
      kind: 'article',
      value: row.Total_poste_non_décomposé,
      unit: e.unit,
      source: bcSource(e.bc),
      dataYear: e.year ?? bcYear(row),
      retrievedAt: TODAY,
      status: 'ok',
    });
  }
  const cache = new Map<string, BcRow>();
  for (const r of RATIOS) {
    const row = cache.get(r.bc) ?? (await baseCarbone(r.bc, /kgCO2e\/keuro \(2023\) HT/));
    cache.set(r.bc, row);
    factors.push({
      id: `bc-ratio-${r.category}-${r.bc}`,
      label: r.label,
      category: r.category,
      family: 'ratios monétaires',
      kind: 'monetaire',
      // La source donne des kg CO2e par millier d'euros : on ramène à l'euro.
      value: row.Total_poste_non_décomposé / 1000,
      unit: '€',
      source: bcSource(r.bc),
      dataYear: 2023,
      retrievedAt: TODAY,
      status: 'ok',
      note: `Ratio monétaire « ${row.Nom_base_français.trim()} » : ${row.Total_poste_non_décomposé} kg CO2e par millier d’euros 2023 hors taxes, appliqué ici au prix payé (TTC). Incertitude annoncée par la source : 80 %.`,
    });
  }
  for (const t of TODO_FACTORS) {
    factors.push({ ...t, value: null, source: null, dataYear: null, retrievedAt: TODAY, status: 'à compléter' });
  }
  return { factors, essence: essence! };
}

/* ------------------------------------------------------------------ */
/* Équivalences                                                        */
/* ------------------------------------------------------------------ */

function buildEquivalences(raw: Map<string, IcoItem>, essence: BcRow): Equivalence[] {
  const item = (slug: string) => {
    const i = raw.get(slug);
    if (!i) throw new Error(`Impact CO2 : ${slug} introuvable`);
    return i;
  };
  const ico = (theme: string, slug: string, name = 'Impact CO2 (ADEME)'): Source => ({ name, url: `${ICO2}/outils/${theme}/${slug}` });
  const ok = { retrievedAt: TODAY, status: 'ok' as const, mode: 'ratio' as const };
  const todo = (id: string, label: string, sprite: string, note: string, tooltip?: string): Equivalence => ({
    id, label, sprite, value: null, unit: 'kg CO2e', source: null, dataYear: null, retrievedAt: TODAY,
    status: 'à compléter', mode: 'ratio', note, ...(tooltip ? { tooltip } : {}),
  });

  // Ballon : volume d'une sphère de 28 cm de diamètre rempli de CO2 pur (gaz parfait, 20 °C, 1 atm).
  const R = 8.314462618; // J/(mol·K), valeur exacte du SI 2019
  const molarVolume = (R * 293.15) / 101325; // m³/mol
  const co2Density = 0.04401 / molarVolume; // kg/m³ (masse molaire du CO2 : 44,01 g/mol)
  const balloonVolume = (4 / 3) * Math.PI * 0.14 ** 3; // m³

  const smartphone = item('smartphone');
  const jeans = item('jeans');
  const gas = item('chauffagegaz');

  return [
    { ...ok, id: 'km-voiture', label: 'km en voiture thermique', sprite: 'car', value: round(item('voiturethermique').ecv), unit: 'kg CO2e par km', source: ico('transport', 'voiturethermique', EMPREINTE), dataYear: null, hypothesis: 'Une personne seule à bord, construction du véhicule incluse.' },
    { ...ok, id: 'km-tgv', label: 'km en TGV', sprite: 'train', value: round(item('tgv').ecv), unit: 'kg CO2e par km', source: ico('transport', 'tgv', EMPREINTE), dataYear: null, hypothesis: 'Par passager.' },
    { ...ok, id: 'vol-paris-new-york', label: 'aller-retour Paris – New York en avion', sprite: 'plane', value: round(item('avion-pny').ecv), unit: 'kg CO2e par aller-retour', source: ico('caspratiques', 'avion-pny'), dataYear: null, hypothesis: '11 600 km au total, par passager, traînées de condensation incluses.' },
    todo('pets-de-vache', 'pets de vache', 'cow', 'Pas de source fiable pour le méthane émis par « pet » : chiffre non forcé.', 'En vrai, les vaches émettent leur méthane surtout par des rots !'),
    { ...ok, id: 'steaks', label: 'steaks de bœuf de 100 g', sprite: 'steak', value: round(item('boeuf').ecv * 0.1), unit: 'kg CO2e par steak', source: ico('alimentation', 'boeuf', AGRIBALYSE), dataYear: 2025, hypothesis: 'Facteur du bœuf (par kg) appliqué à un steak de 100 g.' },
    { ...ok, id: 'streaming', label: 'heures de streaming vidéo', sprite: 'screen', value: round(item('streamingvideo').ecv), unit: 'kg CO2e par heure', source: ico('usagenumerique', 'streamingvideo', EMPREINTE), dataYear: null },
    todo('recharges-smartphone', 'recharges de smartphone', 'battery', 'Énergie d’une recharge complète : pas de source vérifiée.'),
    { ...ok, id: 'smartphones', label: 'smartphones fabriqués', sprite: 'phone', value: round(smartphone.footprint ?? smartphone.ecv), unit: 'kg CO2e par smartphone', source: ico('numerique', 'smartphone', EMPREINTE), dataYear: 2025, hypothesis: 'Fabrication et distribution seules, sans l’usage.' },
    { ...ok, id: 'jeans', label: 'jeans', sprite: 'jeans', value: round(jeans.ecv - (jeans.usage ? jeans.usage.peryear * jeans.usage.defaultyears : 0)), unit: 'kg CO2e par jean', source: ico('habillement', 'jeans', EMPREINTE), dataYear: null, hypothesis: 'Fabrication et fin de vie, sans les lavages.' },
    todo('douches', 'douches chaudes', 'shower', 'Dépend du volume d’eau, de la température et du chauffe-eau : pas de source vérifiée.'),
    { ...ok, id: 'jours-chauffage', label: 'jours de chauffage au gaz', sprite: 'flame', value: round((gas.ecv * 63) / 365), unit: 'kg CO2e par jour', source: ico('chauffage', 'chauffagegaz', EMPREINTE), dataYear: null, hypothesis: 'Logement de 63 m² (surface moyenne retenue par Impact CO2), émissions annuelles réparties sur 365 jours.' },
    { ...ok, id: 'litres-essence', label: 'litres d’essence', sprite: 'fuel', value: essence.Total_poste_non_décomposé, unit: 'kg CO2e par litre', source: bcSource('25763'), dataYear: bcYear(essence), hypothesis: 'Combustion et production du carburant.' },
    {
      // Durée : total ÷ 22 kg CO2 par an = nombre d'années pour un arbre adulte.
      ...ok, mode: 'duree', id: 'temps-arbre', label: 'pour qu’un arbre adulte absorbe ce CO2', sprite: 'tree',
      // Chiffre saisi à la main depuis le rapport, vérifié dans le PDF le 17/11/2026 :
      // « over one year a mature tree will take up about 22 kilograms of carbon dioxide from the atmosphere ».
      value: 22, unit: 'kg CO2 absorbés par arbre et par an',
      source: { name: 'Agence européenne pour l’environnement, « Forests, health and climate change » (2011)', url: 'https://www.eea.europa.eu/en/analysis/publications/forests-health-and-climate-change' },
      dataYear: 2011,
      hypothesis: 'Un arbre adulte absorbe environ 22 kg de CO2 par an. Ordre de grandeur : cela varie beaucoup selon l’espèce, l’âge et le climat, et ce chiffre porte sur le CO2 seul.',
    },
    { ...ok, id: 'banquise', label: 'm² de banquise arctique fondue', sprite: 'ice', value: round(1000 / 3), unit: 'kg CO2 par m²', source: { name: 'Notz & Stroeve, Science 354 (2016)', url: 'https://doi.org/10.1126/science.aag2345' }, dataYear: 2016, hypothesis: 'Relation observée entre 1953 et 2015 : 3 m² (± 0,3) de banquise de septembre perdus par tonne de CO2. Ordre de grandeur, établi pour le CO2 seul.' },
    { ...ok, id: 'ballons', label: 'ballons de baudruche remplis de CO2', sprite: 'balloon', value: round(co2Density * balloonVolume), unit: 'kg CO2 par ballon', source: { name: 'Calcul : loi des gaz parfaits (constantes CODATA/NIST)', url: 'https://physics.nist.gov/cgi-bin/cuu/Value?r' }, dataYear: null, hypothesis: 'Ballon sphérique de 28 cm de diamètre (11,5 litres) rempli de CO2 pur à 20 °C et à pression atmosphérique.' },
    { ...ok, mode: 'pourcentage', id: 'budget-2t', label: '% du budget annuel de 2 t CO2e', sprite: 'target', value: item('2050').ecv, unit: 'kg CO2e par an', source: ico('caspratiques', '2050'), dataYear: null, hypothesis: 'Objectif par personne pour 2050.' },
  ];
}

/* ------------------------------------------------------------------ */

const { factors: icoFactors, raw } = await impactCo2Factors();
const { factors: bcFactors, essence } = await baseCarboneFactors();

const BUDGET = {
  // 8,3 t CO2e par personne (571 Mt). Saisi à la main depuis la publication, vérifié le 16/11/2026
  // par recherche web (insee.fr non joignable depuis l'environnement de dev) : à re-vérifier chaque année.
  annualKgPerPerson: 8300,
  dataYear: 2025,
  publishedYear: 2026,
  source: { name: 'Insee Première n° 2130 (Insee / SDES, octobre 2026)', url: 'https://www.insee.fr/fr/statistiques/9074153' },
  retrievedAt: TODAY,
  note: 'Estimation provisoire, révisée chaque année.',
};

const equivalences: Equivalence[] = [
  ...buildEquivalences(raw, essence),
  {
    id: 'moyenne-francaise', label: '% de l’empreinte annuelle moyenne en France', sprite: 'flag', mode: 'pourcentage',
    value: BUDGET.annualKgPerPerson, unit: 'kg CO2e par an', source: BUDGET.source, dataYear: BUDGET.dataYear,
    retrievedAt: TODAY, status: 'ok', hypothesis: '8,3 t CO2e par personne en 2025 (estimation provisoire).',
  },
];

const factorsFile = factorsFileSchema.parse({
  version: 1,
  generatedAt: TODAY,
  licences: [
    { name: 'Impact CO2 (ADEME)', licence: 'Réutilisation non commerciale et pédagogique autorisée, avec mention de l’ADEME', url: 'https://impactco2.fr/mentions-legales' },
    { name: 'Base Carbone V23.6 (ADEME)', licence: 'Licence Ouverte / Open Licence (Etalab)', url: BASE_CARBONE_PAGE },
    { name: 'Agribalyse 3.2 (ADEME, INRAE)', licence: 'Licence Ouverte / Open Licence (Etalab)', url: 'https://data.ademe.fr/datasets/agribalyse-31-synthese' },
  ],
  factors: [...icoFactors, ...bcFactors],
});
const ids = new Set<string>();
for (const f of factorsFile.factors) {
  if (ids.has(f.id)) throw new Error(`Identifiant en double : ${f.id}`);
  ids.add(f.id);
}
const equivalencesFile = equivalencesFileSchema.parse({ version: 1, generatedAt: TODAY, budget: BUDGET, equivalences });

const out = (name: string) => fileURLToPath(new URL(`../src/data/${name}`, import.meta.url));
writeFileSync(out('factors.v1.json'), JSON.stringify(factorsFile, null, 2) + '\n');
writeFileSync(out('equivalences.v1.json'), JSON.stringify(equivalencesFile, null, 2) + '\n');

const todoF = factorsFile.factors.filter((f) => f.status !== 'ok');
const todoE = equivalencesFile.equivalences.filter((e) => e.status !== 'ok');
console.log(`${factorsFile.factors.length} facteurs (${todoF.length} à compléter), ${equivalencesFile.equivalences.length} équivalences (${todoE.length} à compléter).`);
for (const e of [...todoF, ...todoE]) console.log(`  à compléter : ${e.id} — ${e.label} — ${e.note ?? ''}`);
