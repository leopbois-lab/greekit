# How much fart

Web app installable (PWA, responsive PC + mobile) qui calcule l'empreinte carbone (kg CO2e) des achats de l'utilisateur et la rend fun avec une ambiance jeu vidéo pixel art. Interface en français. Pas de backend, pas de compte.

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
  ui/         design system pixel : cadres, boutons, barre de vie, sprites, sons
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

Chaque total s'affiche en cartes animées avec sprite : km en voiture thermique, km en TGV, vols Paris–New York, pets de vache (info-bulle : en vrai ce sont surtout des rots), steaks de bœuf, heures de streaming, recharges de smartphone, smartphones fabriqués, jeans, douches chaudes, jours de chauffage, litres d'essence, arbres pour absorber ça en un an, m² de banquise fondue, ballons remplis de CO2, % du budget annuel de 2 t CO2e, comparaison à la moyenne française.

Chaque conversion est sourcée comme un facteur. « Pets de vache », « arbres » et « banquise » sont les plus fragiles : ne pas forcer un chiffre. Pour les ballons, expliciter l'hypothèse de volume.

## Direction artistique

Pixel art rétro 8/16 bits. La planète-mascotte et sa barre de vie sont l'élément fort ; le reste de l'interface reste sobre autour.

- Palette limitée et très colorée sur fond de ciel spatial ; les teintes de l'interface suivent l'état de la planète (verdoyante → enfumée).
- Titres en police pixel auto-hébergée avec tous les accents français ; texte courant dans une police lisible. Vérifier et lister les licences.
- Sprites faits maison en grilles de pixels (SVG ou canvas), `image-rendering: pixelated`, agrandissement par multiples entiers. Tout asset externe doit être CC0 et listé.
- Boutons et cadres façon console rétro. Animations : pièces, particules, transitions d'écran, « LEVEL UP ».
- Sons chiptune courts générés en Web Audio (pas de fichiers), bouton muet mémorisé.

## Gamification

- **Budget mensuel de la planète** : moyenne française ÷ 12. Dernière valeur trouvée : 8,3 t CO2e par personne en 2025 (Insee/SDES, publiée en 2026), soit environ 692 kg par mois. Ce chiffre est révisé chaque année : stocker l'année et la source, le re-vérifier à l'étape 2. Réglable dans les réglages.
- La barre de vie reflète le budget restant du mois ; la planète change d'état avec elle.
- XP et niveaux, quêtes hebdomadaires (ex. « 3 jours sans bœuf »), succès, combos de jours sobres, boss de fin de mois battu en restant sous le budget.
- Un jour ne compte (sobre ou sans bœuf) que s'il contient un achat saisi ou un « rien acheté aujourd'hui » validé.
- Règles de jeu écrites en fonctions pures dans `engine/`, testées.

## Écrans

Accueil (planète, barre de vie, bouton « Ajouter »), ajout (3 modes), fiche résultat + équivalences, historique filtrable, statistiques (graphiques par catégorie et période), quêtes et succès, réglages (budget, son, export/import JSON). Mobile : barre d'onglets avec « Ajouter » au centre. PC : menu latéral.

## Étapes

- [ ] 1. Squelette + design system pixel : navigation, palette, polices, galerie de composants, sons et bouton muet.
- [ ] 2. Saisie manuelle, `build-factors.ts`, moteur + tests, fiche résultat, équivalences, historique. Livrer la liste des facteurs « à compléter ».
- [ ] 3. Code-barres.
- [ ] 4. Ticket de caisse.
- [ ] 5. Gamification, alternatives, statistiques.
- [ ] 6. PWA (manifest, service worker, hors-ligne), export/import, passe accessibilité, README (installation, sources de données, limites).

## Points d'attention iPhone (à vérifier sur appareil réel)

- Ne pas supposer que `BarcodeDetector` existe : détection de fonctionnalité, repli sur une bibliothèque ZXing testée tôt.
- Installation via le menu Partager de Safari : prévoir un écran d'aide dans l'app.
- Débloquer l'`AudioContext` au premier geste de l'utilisateur.
- Demander `navigator.storage.persist()` et rappeler l'export JSON régulièrement.
- Tester la caméra dans Safari et dans la PWA installée.
