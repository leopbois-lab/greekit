# The carbon quest

Application web installable (PWA) qui estime l’empreinte carbone de tes achats, en kg CO2e, avec une planète-mascotte à garder en forme. Interface en français, sans compte et sans serveur : toutes les données restent sur ton appareil.

**En ligne :** https://leopbois-lab.github.io/greekit/

## Ce que fait l’app

- **Trois façons d’ajouter un achat** : scanner un code-barres (produits alimentaires, via Open Food Facts), photographier un ticket de caisse (lecture dans le navigateur, la photo n’est envoyée nulle part), ou choisir un article à la main.
- **Une fiche par achat** : l’empreinte, sa source, son niveau de confiance, le temps qu’il faudrait à un arbre pour absorber ce CO2, des équivalences parlantes (km en voiture, heures de streaming…) et, quand c’est pertinent, une alternative plus légère.
- **Un budget mensuel** (la moyenne française divisée par 12, réglable) qui fait vivre la barre de vie de la planète.
- **Un jeu** : niveaux, combos de jours sobres, trois quêtes par semaine, un boss de fin de mois, dix succès.
- **Des statistiques** par catégorie et dans le temps, un historique filtrable.
- **Hors ligne**, **mode sombre**, **sauvegarde et import en JSON**.

## Installer l’app sur son téléphone

- **iPhone ou iPad** : ouvrir l’adresse dans **Safari**, toucher **Partager**, puis **Sur l’écran d’accueil** et **Ajouter**.
- **Android** : dans Chrome, menu **⋮** puis **Installer l’application**.
- **Ordinateur** : dans Chrome ou Edge, icône d’installation à droite de la barre d’adresse.

L’écran « Installer l’app » (dans les réglages) reprend ces étapes. Une fois installée, l’app s’ouvre en plein écran, fonctionne hors ligne, et le navigateur protège mieux ses données.

**Sauvegarde :** les données sont stockées dans le navigateur de l’appareil. Pense à exporter une sauvegarde de temps en temps (Réglages → Mes données) : l’app te le rappelle une fois par mois. L’import ajoute les achats manquants sans rien effacer ni compter deux fois.

## Développement

Prérequis : Node.js 22.

```bash
npm ci
npm run dev            # serveur de développement
npm test               # tests unitaires (Vitest)
npm run build          # vérification TypeScript + build de production dans dist/
npm run preview        # sert le build (service worker compris)
npm run build:factors  # régénère src/data/*.json depuis les sources (réseau requis)
```

`npm run dev` et `npm run build` copient d’abord le moteur de lecture des tickets (Tesseract) dans `public/ocr/` (dossier non versionné).

Le code est dans le dossier `how-much-fart/` (ancien nom de l’app, gardé pour ne pas casser les données ni le déploiement). Le déploiement est automatique : chaque fusion dans `main` qui touche `how-much-fart/` construit l’app et la publie sur GitHub Pages (`.github/workflows/deploy-how-much-fart.yml`). Les pull requests sont testées par `.github/workflows/how-much-fart-ci.yml`.

### Architecture

```
src/
  engine/     calcul, confiance, équivalences, règles du jeu, statistiques (TypeScript pur, testé)
  data/       factors.v1.json, equivalences.v1.json et leur schéma Zod
  services/   Open Food Facts, codes-barres, OCR (interface OcrProvider), stockage IndexedDB, export/import
  ui/         design system : cartes, boutons, barre de vie, icônes, illustrations SVG, graphiques, sons
  screens/    les écrans
scripts/
  build-factors.ts     génère les JSON de données depuis les sources (lancé en développement, jamais par l’app)
  copy-ocr-assets.mjs  copie le moteur OCR dans public/ocr/
```

Stack : React 19, TypeScript, Vite 8, Tailwind 4, Dexie (IndexedDB), Zustand, Zod, Vitest, vite-plugin-pwa, zxing-wasm, Tesseract.js.

## Sources des données

Chaque facteur et chaque équivalence porte sa source, l’année de la donnée quand elle est connue, et sa date de récupération (16/11/2026).

| Source | Utilisée pour | Licence |
| --- | --- | --- |
| [Impact CO2](https://impactco2.fr) (ADEME) | Facteurs par article : alimentation, boissons, vêtements, électronique, électroménager, mobilier, transport, chauffage, usages numériques, loisirs ; plusieurs équivalences | Réutilisation non commerciale et pédagogique autorisée avec mention de l’ADEME ([mentions légales](https://impactco2.fr/mentions-legales)) |
| [Agribalyse 3.2](https://data.ademe.fr/datasets/agribalyse-31-synthese) (ADEME, INRAE), via Impact CO2 et Open Food Facts | Alimentation et boissons | Licence Ouverte (Etalab) |
| [Base Carbone V23.6](https://data.ademe.fr/datasets/base-carboner) (ADEME) | Carburants, électricité, gaz, ratios monétaires 2023 (estimation par le prix) | Licence Ouverte (Etalab) |
| [Open Food Facts](https://world.openfoodfacts.org) | Fiches produit lues au scan : nom, poids, `co2_total` Agribalyse | Open Database License (base), Database Contents License (contenus) |
| [Insee Première n° 2130](https://www.insee.fr/fr/statistiques/9074153) (Insee, SDES, octobre 2026) | Empreinte moyenne : 8,3 t CO2e par personne en 2025, base du budget mensuel | Réutilisation libre avec mention de la source |
| Notz & Stroeve, *Science* 354 (2016) | Équivalence « banquise » (3 m² par tonne de CO2) | Citation d’un résultat publié |
| [Agence européenne pour l’environnement](https://www.eea.europa.eu/en/analysis/publications/forests-health-and-climate-change), *Forests, health and climate change* (2011) | Temps pour qu’un arbre adulte absorbe le CO2 d’un achat (environ 22 kg par an) | Citation d’un chiffre publié |

Polices, bibliothèques et illustrations : voir [CREDITS.md](CREDITS.md).

### Niveaux de confiance

- **Précis** : donnée du produit (Agribalyse via Open Food Facts) × poids connu.
- **Estimé** : facteur générique de l’article × quantité ou poids.
- **Très approximatif** : estimation à partir du prix (ratio monétaire), faute de mieux.

## Limites connues

- **Ce sont des estimations.** Un produit scanné est rattaché à une moyenne Agribalyse de sa catégorie (« Pâte à tartiner chocolat et noisette »), pas à une mesure de ce produit précis. Les ratios monétaires ont une incertitude annoncée de 80 %.
- **Entrées sans source fiable**, laissées « à compléter » plutôt que d’inventer un chiffre : estimation par le prix pour l’électroménager et l’énergie ; livre, console de jeux, vélo neuf, place de cinéma ; équivalences « pets de vache », « recharges de smartphone », « douches chaudes ». Elles ne sont pas affichées dans l’app.
- **Achats d’équipements et de vêtements** : seule la fabrication (et la fin de vie) est comptée ; l’électricité consommée ensuite se saisit à part, dans « Énergie ».
- **Boissons scannées** : le volume est converti à 1 kg par litre, le résultat est donc « estimé ».
- **Scan** : produits alimentaires seulement (Open Food Facts) ; tous n’ont pas de donnée carbone, l’app bascule alors vers la saisie manuelle. Codes EAN-13, EAN-8 et UPC-A (pas UPC-E).
- **Tickets de caisse** : la lecture est heuristique et dépend de la photo ; l’écran de vérification sert à corriger chaque ligne.
- **Empreinte eau** : non affichée, faute de donnée fiable intégrée.
- **Licence Impact CO2** : la réutilisation est autorisée pour un usage non commercial et pédagogique. Un usage commercial demanderait l’accord de l’ADEME ou de repartir des jeux en Licence Ouverte.
- **Données locales** : effacer les données du site dans le navigateur efface l’historique. Seule une sauvegarde exportée permet de le retrouver.
- **Temps de l’arbre** : basé sur environ 22 kg de CO2 absorbés par an par un arbre adulte (Agence européenne pour l’environnement, 2011). C’est un ordre de grandeur : cela varie beaucoup selon l’espèce, l’âge et le climat.
- **Tests** : vérifiée dans Chromium (émulation iPhone, PC, clair et sombre, hors ligne, audit d’accessibilité axe-core). Pas encore testée sur un vrai iPhone : caméra, sons et installation restent à confirmer sur appareil.
