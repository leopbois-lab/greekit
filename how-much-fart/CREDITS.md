# Crédits et licences

## Polices (auto-hébergées via les paquets npm Fontsource)

| Police | Usage | Licence | Vérifié |
| --- | --- | --- | --- |
| Press Start 2P (The Press Start 2P Project Authors) | Titres, boutons | SIL Open Font License 1.1 | Accents français complets (à â ç é è ê ë î ï ô ù û ü ÿ œ æ, majuscules, « » €) avec les sous-ensembles latin + latin-ext |
| Atkinson Hyperlegible (Braille Institute of America) | Texte courant | SIL Open Font License 1.1 | Idem |

Textes de licence : `node_modules/@fontsource/*/LICENSE`.

## Sprites et sons

Tous les sprites sont faits maison (grilles de pixels dans `src/ui/sprites.ts`). Les sons sont générés en Web Audio (`src/ui/sound.ts`). Aucun asset externe.

## Données

| Source | Usage | Licence |
| --- | --- | --- |
| Impact CO2 (ADEME) — https://impactco2.fr | Facteurs par article (alimentation, boissons, vêtements, électronique, électroménager, mobilier, transport, chauffage, usages numériques, loisirs) et plusieurs équivalences | Réutilisation non commerciale et pédagogique autorisée avec mention de l'ADEME (https://impactco2.fr/mentions-legales) |
| Agribalyse 3.2 (ADEME, INRAE), via Impact CO2 | Alimentation et boissons | Licence Ouverte / Open Licence (Etalab) |
| Base Carbone V23.6 (ADEME) — https://data.ademe.fr/datasets/base-carboner | Carburants, électricité, gaz, ratios monétaires 2023 | Licence Ouverte / Open Licence (Etalab) |
| Insee Première n° 2130 (Insee / SDES, octobre 2026) | Empreinte moyenne par personne (budget) | Réutilisation libre avec mention de la source |
| Notz & Stroeve, Science 354 (2016) | Équivalence « banquise » | Citation d'un résultat publié |
| Open Food Facts — https://world.openfoodfacts.org | Fiches produit lues au scan (nom, poids, `co2_total` Agribalyse) | Open Database License (ODbL) pour la base, Database Contents License pour les contenus |

## Bibliothèques notables

| Bibliothèque | Usage | Licence |
| --- | --- | --- |
| zxing-wasm (zxing-cpp compilé en WebAssembly) | Lecture des codes-barres quand le navigateur n'a pas `BarcodeDetector` (Safari) | MIT (zxing-cpp : Apache-2.0) |

Chaque entrée de `src/data/*.json` porte sa source, son année et sa date de récupération.
