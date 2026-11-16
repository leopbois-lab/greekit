# How much fart

Web app installable (PWA, responsive PC + mobile) qui calcule l'empreinte carbone (kg CO2e) des achats de l'utilisateur et la rend fun avec une planète-mascotte à garder en forme, dans une interface moderne et épurée. Interface en français. Pas de backend, pas de compte.

## Règles permanentes

- Avancer étape par étape (voir « Étapes »). À la fin de chaque étape : lancer tests et build, me montrer le résultat, puis attendre ma validation avant de continuer.
- Ne jamais inventer un facteur d'émission ou de conversion. Sans source vérifiable : statut « à compléter », et me lister ces entrées en fin d'étape.
- Vérifier la doc actuelle de chaque API (endpoints, noms de champs, licence) avant de l'utiliser. Les notes ci-dessous datent du 16/11/2026.
- Aucune clé API dans le code front. L'app fonctionne hors ligne et sans clé.
- `src/engine/` ne dépend ni de React ni du DOM et reste couvert par des tests unitaires.
- Chaque résultat affiche sa source et son niveau de confiance.
- Ton encourageant, jamais culpabilisant.
- Accessibilité : `prefers-reduced-motion`, contrastes suffisants, focus clavier visible.
- Appareil de test prioritaire : iPhone (Safari, puis PWA installée).

## Stack

React + TypeScript + Vite + Tailwind. Ajouts : Dexie (IndexedDB), Zustand (état), Zod (validation des JSON et de l'import), Vitest, vite-plugin-pwa. Vérifier les versions actuelles avant d'installer. Hébergement : GitHub Pages (HTTPS obligatoire pour la caméra).

## Architecture

```
src/
  engine/     calcul, confiance, équivalences, règles de jeu (TS pur, testé)
  data/       factors.v1.json, equivalences.v1.json
  services/   openFoodFacts, barcode, ocr (interface OcrProvider), storage, exportImport
  ui/         design system : cartes, boutons, barre de vie, icônes, illustrations SVG, sons
  screens/    les 7 écrans
scripts/
  build-factors.ts   génère les JSON depuis les sources (lancé en dev, jamais par l'app)
```

## Données et calcul

Chaque entrée des JSON : id, libellé, valeur, unité, source (nom + URL), année de la donnée, date de récupération, statut (`ok` / `à compléter`).

Sources :
- **Impact CO2 (ADEME)** : API gratuite mais avec clé sur demande. Utilisable uniquement dans `build-factors.ts`, jamais à l'exécution.
- **Open Food Facts** : sans clé. Depuis l'API v3.1 (déc. 2024), les champs `ecoscore_*` s'appellent `environmental_score_*`. Le bloc Agribalyse expose `co2_total` (kg CO2e/kg) et son détail par étape. Lire le nouveau nom avec repli sur l'ancien ; confirmer l'endpoint et les champs sur de vrais produits.
- **Agribalyse** : open data, licence Etalab. Épingler la version utilisée.
- **Base Empreinte** (intègre la Base Carbone, V23.6 de juillet 2025, jeu `base-carboner` sur data.ademe.fr) : licence ouverte à confirmer sur la page officielle. Source des ratios monétaires kg CO2e/€.

Niveaux de confiance :
- **précis** : donnée produit (Agribalyse via Open Food Facts) × poids connu ;
- **estimé** : facteur générique de catégorie × quantité ou poids ;
- **très approximatif** : ratio monétaire ou quantité par défaut.

Empreinte eau (litres) : indicateur distinct, jamais dérivé du CO2, affiché à part et seulement si une donnée fiable existe.

## Ajout des achats

- **Code-barres** : scan caméra → Open Food Facts → `co2_total` × poids. Produit inconnu, non alimentaire ou sans donnée : bascule vers la saisie manuelle pré-remplie. Mettre en cache les produits scannés pour le hors-ligne.
- **Ticket de caisse** : photo → OCR dans le navigateur (Tesseract.js chargé à la demande) derrière l'interface `OcrProvider`, pour brancher une API de vision plus tard → lignes (libellé + prix) associées à une catégorie → écran de vérification où je corrige avant d'enregistrer. Sans poids saisi, la ligne reste « très approximatif ».
- **Saisie manuelle** : catégories (alimentation, vêtements, électronique, électroménager, mobilier, transport, énergie, numérique, loisirs…), recherche d'article, quantité ou poids. En dernier recours, estimation par prix, signalée comme approximative.

Chaque achat propose une alternative moins émettrice (facteur sourcé plus bas dans la même famille).

## Équivalences

Chaque total s'affiche en cartes animées avec une illustration : km en voiture thermique, km en TGV, vols Paris–New York, pets de vache (info-bulle : en vrai ce sont surtout des rots), steaks de bœuf, heures de streaming, recharges de smartphone, smartphones fabriqués, jeans, douches chaudes, jours de chauffage, litres d'essence, arbres pour absorber ça en un an, m² de banquise fondue, ballons remplis de CO2, % du budget annuel de 2 t CO2e, comparaison à la moyenne française.

Chaque conversion est sourcée comme un facteur. « Pets de vache », « arbres » et « banquise » sont les plus fragiles : ne pas forcer un chiffre. Pour les ballons, expliciter l'hypothèse de volume.

## Direction artistique

Interface moderne et épurée (refonte du 16/11/2026 : le pixel art rétro est abandonné). La planète-mascotte et sa barre de vie restent l'élément fort ; tout le reste est sobre autour.

- Beaucoup d'espace, fond neutre clair et mode sombre (automatique selon le système, forçable dans les réglages), coins et ombres discrets.
- Une seule famille de police sans-serif très lisible, auto-hébergée, avec tous les accents français ; la hiérarchie passe par la taille et la graisse. Vérifier et lister les licences.
- La couleur est réservée à ce qui compte : bouton principal, barre de vie (elle suit l'état de la planète, verdoyante → enfumée), illustrations, graphiques. Tout le reste est neutre.
- Graphiques très colorés : une couleur fixe par catégorie, la même dans toute l'app (jetons `--cat-*` de `src/index.css`), contrastes vérifiés, légende lisible et libellés directs : la couleur ne porte jamais seule l'information.
- Illustrations vectorielles (SVG) faites maison, en aplats de couleurs vives, pour la planète-mascotte, les cartes d'équivalences, les succès et les écrans vides. Tout asset externe doit être CC0 et listé.
- Animations fluides et discrètes (transitions d'écran, apparition des cartes, passage de niveau), coupées avec `prefers-reduced-motion`.
- Sons courts et doux générés en Web Audio (pas de fichiers), bouton muet mémorisé.

## Gamification

- **Budget mensuel de la planète** : moyenne française ÷ 12. Dernière valeur trouvée : 8,3 t CO2e par personne en 2025 (Insee/SDES, publiée en 2026), soit environ 692 kg par mois. Ce chiffre est révisé chaque année : stocker l'année et la source, le re-vérifier à l'étape 2. Réglable dans les réglages.
- La barre de vie reflète le budget restant du mois ; la planète change d'état avec elle.
- XP et niveaux, quêtes hebdomadaires (ex. « 3 jours sans bœuf »), succès, combos de jours sobres, boss de fin de mois battu en restant sous le budget.
- Un jour ne compte (sobre ou sans bœuf) que s'il contient un achat saisi ou un « rien acheté aujourd'hui » validé.
- Règles de jeu écrites en fonctions pures dans `engine/`, testées.

## Écrans

Accueil (planète, barre de vie, bouton « Ajouter »), ajout (3 modes), fiche résultat + équivalences, historique filtrable, statistiques (graphiques par catégorie et période), quêtes et succès, réglages (budget, son, export/import JSON). Mobile : barre d'onglets avec « Ajouter » au centre. PC : menu latéral.

## Étapes

- [x] 1. Squelette + design system : navigation, palette, polices, galerie de composants, sons et bouton muet.
- [x] 2. Saisie manuelle, `build-factors.ts`, moteur + tests, fiche résultat, équivalences, historique. Livrer la liste des facteurs « à compléter ».
- [x] 3. Code-barres.
- [x] 4. Ticket de caisse.
- [ ] 5. Gamification, alternatives, statistiques.
- [ ] 6. PWA (manifest, service worker, hors-ligne), export/import, passe accessibilité, README (installation, sources de données, limites).

## Points d'attention iPhone (à vérifier sur appareil réel)

- Ne pas supposer que `BarcodeDetector` existe : détection de fonctionnalité, repli sur une bibliothèque ZXing testée tôt.
- Installation via le menu Partager de Safari : prévoir un écran d'aide dans l'app.
- Débloquer l'`AudioContext` au premier geste de l'utilisateur.
- Demander `navigator.storage.persist()` et rappeler l'export JSON régulièrement.
- Tester la caméra dans Safari et dans la PWA installée.

## Constats de l'étape 2 (16/11/2026)

- Commandes : `npm test`, `npm run build`, `npm run build:factors` (régénère les JSON ; réseau requis).
- Impact CO2 : l'API répond sans clé (avec un avertissement) ; clé facultative via `IMPACTCO2_API_KEY`. Réutilisation « non commerciale et pédagogique » avec mention de l'ADEME (mentions légales du site). Les unités ne sont pas dans l'API : le script les vérifie sur les fiches du site.
- Agribalyse : la version servie par Impact CO2 et data.ademe.fr est la 3.2 (Licence Ouverte). Agribalyse 4 existe sur data.ademe.fr mais sans licence déclarée : non utilisée.
- Base Carbone V23.6 : Licence Ouverte confirmée sur data.ademe.fr. Ratios monétaires 2023 en kg CO2e/k€ hors taxes, incertitude 80 %. Pas de ratio pour l'électroménager ni pour l'énergie.
- Budget : 8,3 t CO2e par personne en 2025 confirmé (Insee Première n° 2130, octobre 2026).
- Achats d'équipements et de vêtements : phase d'usage retirée du facteur Impact CO2 (fabrication + fin de vie seulement).

## Constats de l'étape 3 (16/11/2026)

- Open Food Facts : `GET https://world.openfoodfacts.org/api/v3.1/product/{code}?fields=…`, sans clé, CORS ouvert (`access-control-allow-origin: *`). Produit inconnu : HTTP 404 avec un corps JSON `product_not_found`. Base sous licence ODbL (contenus : DbCL).
- Champs confirmés sur de vrais produits : `environmental_score_data.agribalyse.co2_total` (kg CO2e/kg), `name_fr`, `version` (« 3.2 »), `is_beverage` ; `product_quantity` + `product_quantity_unit` (g ou ml). `ecoscore_data` n'est plus renvoyé : le repli reste en place.
- Tous les produits n'ont pas de bloc Agribalyse (ex. Coca-Cola 5449000000996) : bascule vers la saisie manuelle.
- `BarcodeDetector` est absent de Safari et de Chromium sous Linux : le repli ZXing (`zxing-wasm`, fichier .wasm servi par l'app) est le chemin réellement utilisé sur iPhone. Testé ici avec une caméra simulée ; à confirmer sur appareil réel.
- Boissons : `co2_total` est par kg ; un volume est converti à 1 kg par litre et le résultat reste « estimé ».

## Constats de l'étape 4 (16/11/2026)

- OCR : Tesseract.js 7 derrière l'interface `OcrProvider` (`src/services/ocr.ts`). Le worker, le moteur WebAssembly (variantes « LSTM seul ») et le modèle français (`@tesseract.js-data/fra`, version `4.0.0_best_int`) sont copiés dans `public/ocr/` par `scripts/copy-ocr-assets.mjs` (lancé avant `dev` et `build`, dossier non versionné) : aucun appel à un CDN.
- Mode de segmentation « bloc unique » (PSM 6) pour garder libellé et prix sur la même ligne.
- La lecture du texte (`src/engine/receipt.ts`) est heuristique : lignes « libellé + prix », libellé seul suivi d'une ligne de quantité, exclusion des totaux, paiements, TVA et remises. Vérifiée sur une image de ticket générée ; à confirmer sur de vraies photos de tickets.
- `public/ocr/` pèse environ 12 Mo (trois variantes du moteur, une seule est téléchargée par appareil) : à l'étape 6, ne pas tout mettre en pré-cache du service worker.

## Constats de la refonte graphique (16/11/2026)

- Police : Atkinson Hyperlegible Next (variable, graisses 200 à 800, OFL 1.1), auto-hébergée via `@fontsource-variable/atkinson-hyperlegible-next`. Accents français complets ; « ₂ » et « ≈ » absents (repli sur la police système).
- Couleurs des catégories, dans l'ordre d'affichage des graphiques : vêtements, alimentation, transport, électronique, énergie, numérique, mobilier, électroménager, boissons, loisirs. Cet ordre passe le validateur (voisins distinguables en vision normale et simulée daltonienne, en clair et en sombre). Avec dix catégories, deux paires voisines restent proches pour un daltonien et trois couleurs sont peu contrastées sur fond clair : chaque graphique doit donc porter des libellés directs ou une légende.
- Les couleurs d'état de la planète (`--state-*`) et de confiance (`--conf-*`) sont réservées à ces usages et toujours accompagnées d'un libellé.

## Constats de l'étape 5 (16/11/2026)

- Tout l'état du jeu se déduit de l'historique (`computeGame` dans `src/engine/game.ts`) : rien n'est stocké à part, sauf les journées « rien acheté » (table `days`) et le dernier niveau fêté (réglages).
- Jour sobre : jour saisi dont le total reste sous le budget du jour (budget du mois ÷ nombre de jours du mois). Combo : jours sobres consécutifs ; un jour non saisi le casse.
- XP : 10 par achat, 5 par journée sans achat validée, 15 par jour sobre, 50 par quête, 30 par succès, 200 par boss. Niveaux à 0, 100, 300, 600, 1000… XP.
- Quêtes : trois par semaine (lundi → dimanche), « 3 jours sans bœuf » toujours présente, les deux autres tournent.
- Boss du mois (« le Gros Nuage ») : battu si le mois se termine sous le budget avec au moins 8 jours saisis.
- Alternatives : seulement dans les familles où les articles sont interchangeables (pas pour les appareils, les meubles, les fruits et légumes, ni les estimations par le prix ou les produits scannés). Transport : modes longue distance pour l'avion et les trajets de plus de 80 km, modes du quotidien sinon.
- Graphiques : barres classées par catégorie avec libellés directs ; colonnes empilées dans le temps limitées aux 5 plus grosses catégories de la période + « Autres », avec légende, infobulle au survol, au toucher et au clavier, et tableau des valeurs.
