import type { ReaderOptions } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { normalizeBarcode } from '../engine/barcode';

/**
 * Lecture de codes-barres. Safari (iPhone) n'a pas `BarcodeDetector` : on teste sa présence,
 * et sinon on charge à la demande ZXing compilé en WebAssembly, servi par l'app elle-même (pas de CDN).
 */
export interface BarcodeReader {
  engine: 'natif' | 'zxing';
  /** Renvoie un code valide (clé de contrôle vérifiée) ou `null`. */
  readFrame(video: HTMLVideoElement): Promise<string | null>;
  readImage(file: Blob): Promise<string | null>;
}

interface NativeDetector {
  detect(source: CanvasImageSource | Blob | ImageData): Promise<Array<{ rawValue: string }>>;
}
interface NativeDetectorCtor {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a'];
const ZXING_OPTIONS: ReaderOptions = { formats: ['EAN13', 'EAN8', 'UPCA'], tryHarder: true, maxNumberOfSymbols: 1 };

const firstValid = (values: string[]) => {
  for (const v of values) {
    const code = normalizeBarcode(v);
    if (code) return code;
  }
  return null;
};

async function nativeReader(): Promise<BarcodeReader | null> {
  const Ctor = (globalThis as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = await Ctor.getSupportedFormats();
    if (!supported.includes('ean_13')) return null;
    const detector = new Ctor({ formats: NATIVE_FORMATS.filter((f) => supported.includes(f)) });
    return {
      engine: 'natif',
      readFrame: async (video) => firstValid((await detector.detect(video)).map((r) => r.rawValue)),
      readImage: async (file) => {
        const bitmap = await createImageBitmap(file);
        try {
          return firstValid((await detector.detect(bitmap)).map((r) => r.rawValue));
        } finally {
          bitmap.close();
        }
      },
    };
  } catch {
    return null;
  }
}

async function zxingReader(): Promise<BarcodeReader> {
  const { prepareZXingModule, readBarcodes } = await import('zxing-wasm/reader');
  prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
  });
  const options = ZXING_OPTIONS;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return {
    engine: 'zxing',
    readFrame: async (video) => {
      const { videoWidth: w, videoHeight: h } = video;
      if (!ctx || !w || !h) return null;
      // On limite la taille analysée : largement assez pour un code-barres, et plus fluide sur mobile.
      const scale = Math.min(1, 1280 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const results = await readBarcodes(ctx.getImageData(0, 0, canvas.width, canvas.height), options);
      return firstValid(results.map((r) => r.text));
    },
    readImage: async (file) => firstValid((await readBarcodes(file, options)).map((r) => r.text)),
  };
}

let readerPromise: Promise<BarcodeReader> | null = null;

/** Lecteur partagé : détecteur natif si disponible, sinon ZXing (chargé une seule fois). */
export function getBarcodeReader(): Promise<BarcodeReader> {
  readerPromise ??= (async () => (await nativeReader()) ?? (await zxingReader()))();
  readerPromise.catch(() => {
    readerPromise = null; // on pourra réessayer (ex. chargement du module interrompu)
  });
  return readerPromise;
}
