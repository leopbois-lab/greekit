/**
 * Copie dans public/ocr/ les fichiers dont Tesseract.js a besoin à l'exécution
 * (script du worker, moteur WebAssembly, modèle de langue français).
 * L'app les sert elle-même : pas de CDN, donc utilisable hors ligne une fois en cache.
 * Lancé automatiquement avant `npm run dev` et `npm run build`.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const out = fileURLToPath(new URL('../public/ocr/', import.meta.url));
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));

const tesseract = pkgDir('tesseract.js');
// Le cœur doit être celui dont dépend tesseract.js (résolu depuis son dossier).
const core = dirname(createRequire(join(tesseract, 'package.json')).resolve('tesseract.js-core/package.json'));
const fra = pkgDir('@tesseract.js-data/fra');

const files = [
  [join(tesseract, 'dist/worker.min.js'), 'worker.min.js'],
  // Variantes « LSTM seul » : Tesseract.js choisit selon ce que le navigateur sait faire.
  [join(core, 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(core, 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [join(core, 'tesseract-core-relaxedsimd-lstm.wasm.js'), 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  [join(fra, '4.0.0_best_int/fra.traineddata.gz'), 'lang/fra.traineddata.gz'],
];

for (const [from, to] of files) {
  mkdirSync(dirname(join(out, to)), { recursive: true });
  copyFileSync(from, join(out, to));
}
console.log(`OCR : ${files.length} fichiers copiés dans public/ocr/`);
