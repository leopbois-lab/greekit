/**
 * Reconnaissance de texte (OCR) derrière une interface, pour pouvoir brancher plus tard
 * une API de vision sans toucher aux écrans. Aujourd'hui : Tesseract.js, dans le navigateur,
 * chargé à la demande et servi par l'app (voir scripts/copy-ocr-assets.mjs).
 */
export interface OcrResult {
  text: string;
}

export interface OcrProvider {
  readonly name: string;
  /** `onProgress` reçoit un avancement entre 0 et 1. */
  recognize(image: Blob, onProgress?: (ratio: number) => void): Promise<OcrResult>;
}

const MAX_SIDE = 2000;

/** Réduit les grandes photos : plus rapide et moins gourmand en mémoire sur mobile. */
export async function prepareImage(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    return blob ?? file;
  } catch {
    return file; // format non décodable ici : on laisse Tesseract essayer
  }
}

export const tesseractProvider: OcrProvider = {
  name: 'Tesseract.js (dans le navigateur)',
  async recognize(image, onProgress) {
    const { createWorker, PSM } = await import('tesseract.js');
    const base = new URL('ocr/', document.baseURI).href;
    const worker = await createWorker('fra', 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base.replace(/\/$/, ''),
      langPath: `${base}lang`,
      gzip: true,
      logger: (m) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress);
      },
    });
    try {
      // Un ticket se lit ligne par ligne : on garde libellé et prix sur la même ligne.
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
      });
      const { data } = await worker.recognize(await prepareImage(image));
      return { text: data.text };
    } finally {
      await worker.terminate();
    }
  },
};

/** Fournisseur actif. Point unique à modifier pour brancher un autre moteur. */
export function getOcrProvider(): OcrProvider {
  return tesseractProvider;
}
