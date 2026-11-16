import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { normalizeBarcode } from '../engine/barcode';
import { parseQuantity } from '../engine/compute';
import { formatKg, toDateKey } from '../engine/format';
import { computeScannedPurchase, productLabel, type ScannedProduct, type WeightBasis } from '../engine/openFoodFacts';
import { CONFIDENCE_LABELS } from '../engine/types';
import { getBarcodeReader } from '../services/barcode';
import { createProductLookup } from '../services/openFoodFacts';
import { productCache } from '../services/storage';
import { PixelButton, PixelFrame, PixelLink } from '../ui/components';
import { playSfx } from '../ui/sound';
import { usePurchases } from '../ui/store';
import type { ManualPrefill } from './ManualScreen';

const lookupProduct = createProductLookup({ cache: productCache });

type Phase =
  | { name: 'idle' }
  | { name: 'starting' }
  | { name: 'scanning' }
  | { name: 'looking-up'; barcode: string }
  | { name: 'found'; product: ScannedProduct; fromCache: boolean }
  | { name: 'fallback'; message: string; prefill: ManualPrefill };

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'La caméra est bloquée pour ce site. Tu peux l’autoriser dans les réglages du navigateur, ou utiliser un des autres moyens ci-dessous.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Pas de caméra trouvée sur cet appareil. Utilise un des autres moyens ci-dessous.';
  }
  return 'La caméra n’a pas pu démarrer. Utilise un des autres moyens ci-dessous.';
}

export function ScanScreen() {
  const navigate = useNavigate();
  const add = usePurchases((s) => s.add);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef(0);
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);
  const [grams, setGrams] = useState('');
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stopCamera = useCallback(() => {
    loopRef.current++; // invalide la boucle de lecture en cours
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const lookup = useCallback(
    async (barcode: string) => {
      stopCamera();
      setPhase({ name: 'looking-up', barcode });
      const result = await lookupProduct(barcode);
      if (result.status === 'found' && result.product.co2PerKg !== null) {
        const pack = result.product.packWeight;
        setGrams(pack ? String(Math.round(pack.kg * 1000)) : '');
        setSaveError(null);
        setPhase({ name: 'found', product: result.product, fromCache: result.fromCache });
        return;
      }
      if (result.status === 'found') {
        setPhase({
          name: 'fallback',
          message: `« ${productLabel(result.product)} » est connu d’Open Food Facts, mais sans donnée carbone. On passe par la saisie manuelle : cherche l’article le plus proche.`,
          prefill: {
            category: result.product.isBeverage ? 'boissons' : 'alimentation',
            notice: `Produit scanné : ${productLabel(result.product)}. Choisis l’article le plus proche.`,
          },
        });
      } else if (result.status === 'not-found') {
        setPhase({
          name: 'fallback',
          message: `Le code ${barcode} n’est pas dans Open Food Facts (produit non alimentaire ou pas encore référencé). On passe par la saisie manuelle.`,
          prefill: { notice: `Code ${barcode} inconnu d’Open Food Facts : choisis une catégorie.` },
        });
      } else {
        setPhase({
          name: 'fallback',
          message: 'Impossible de joindre Open Food Facts pour l’instant, et ce produit n’a pas encore été scanné sur cet appareil. Tu peux passer par la saisie manuelle.',
          prefill: { category: 'alimentation', notice: `Code ${barcode} : pas de réseau, saisie manuelle.` },
        });
      }
    },
    [stopCamera],
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('La caméra n’est pas disponible ici (elle demande une connexion sécurisée HTTPS). Utilise un des autres moyens ci-dessous.');
      return;
    }
    setPhase({ name: 'starting' });
    try {
      // La demande d'accès part directement du geste de l'utilisateur (exigé par iOS).
      const pendingStream = navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const pendingReader = getBarcodeReader();
      // Le flux est mémorisé dès qu'il existe : si le lecteur échoue ensuite, la caméra est bien coupée.
      const stream = await pendingStream;
      streamRef.current = stream;
      const reader = await pendingReader;
      setPhase({ name: 'scanning' });
      const video = videoRef.current;
      if (!video) return stopCamera();
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      const run = ++loopRef.current;
      const tick = async () => {
        if (run !== loopRef.current) return;
        let code: string | null = null;
        try {
          code = await reader.readFrame(video);
        } catch {
          /* image illisible : on réessaie */
        }
        if (run !== loopRef.current) return;
        if (code) {
          playSfx('coin');
          void lookup(code);
        } else {
          window.setTimeout(tick, 150);
        }
      };
      void tick();
    } catch (err) {
      stopCamera();
      setCameraError(cameraErrorMessage(err));
      setPhase({ name: 'idle' });
    }
  }, [lookup, stopCamera]);

  // On coupe toujours la caméra en quittant l'écran ou quand l'app passe en arrière-plan.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && streamRef.current) {
        stopCamera();
        setPhase({ name: 'idle' });
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      stopCamera();
    };
  }, [stopCamera]);

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    setCameraError(null);
    setPhase({ name: 'starting' });
    try {
      const code = await (await getBarcodeReader()).readImage(file);
      if (code) {
        playSfx('coin');
        await lookup(code);
        return;
      }
      setCameraError('Pas de code-barres lisible sur cette photo. Essaie de plus près, bien à plat et bien éclairé.');
    } catch {
      setCameraError('Cette photo n’a pas pu être lue. Essaie une autre photo ou saisis le code.');
    }
    setPhase({ name: 'idle' });
  }

  const reset = () => {
    stopCamera();
    setTyped('');
    setTypedError(null);
    setPhase({ name: 'idle' });
  };

  /* ---------- Produit trouvé : poids, date, enregistrement ---------- */
  if (phase.name === 'found') {
    const { product } = phase;
    const parsedGrams = parseQuantity(grams);
    const packGrams = product.packWeight ? Math.round(product.packWeight.kg * 1000) : null;
    // Une boisson se compte en volume (converti à 1 kg par litre) : le résultat reste « estimé ».
    const byVolume = product.packWeight ? product.packWeight.basis === 'volume' : product.isBeverage;
    const basis: WeightBasis = byVolume ? 'volume' : product.packWeight && parsedGrams === packGrams ? 'poids' : 'saisi';
    const preview = parsedGrams !== null ? computeScannedPurchase(product, parsedGrams / 1000, basis, date) : null;

    const save = async () => {
      if (!preview || !preview.ok) {
        setSaveError(byVolume ? 'Indique le volume acheté en millilitres (ex. 330).' : 'Indique le poids acheté en grammes (ex. 400).');
        playSfx('error');
        return;
      }
      setSaving(true);
      try {
        const saved = await add(preview.purchase);
        playSfx('coin');
        navigate(`/resultat/${saved.id}`);
      } catch {
        setSaveError('Impossible d’enregistrer sur cet appareil. Réessaie dans un instant.');
        playSfx('error');
        setSaving(false);
      }
    };

    return (
      <div className="flex flex-col gap-7">
        <h1>{productLabel(product)}</h1>
        <PixelFrame title="Produit trouvé" accent>
          <p className="mt-2">
            <strong>{formatKg(product.co2PerKg ?? 0)}</strong> par kg de produit
          </p>
          <p className="mt-1 text-sm text-ink-dim">
            Source : Open Food Facts — Agribalyse {product.agribalyseVersion ?? ''}
            {product.agribalyseName ? `, référence « ${product.agribalyseName} »` : ''}. Code {product.barcode}
            {phase.fromCache ? ' (fiche gardée en mémoire sur cet appareil)' : ''}.
          </p>
          <form
            className="mt-4 flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div>
              <label className="field-label" htmlFor="grams">
                {byVolume ? 'Volume acheté (ml)' : 'Poids acheté (g)'}
              </label>
              <input
                id="grams"
                className="px-input"
                inputMode="decimal"
                autoComplete="off"
                value={grams}
                aria-invalid={saveError ? true : undefined}
                aria-describedby="grams-help"
                onChange={(e) => {
                  setGrams(e.target.value);
                  setSaveError(null);
                }}
              />
              <p id="grams-help" className="mt-1 text-sm text-ink-dim">
                {product.packWeight
                  ? `Pré-rempli avec le contenu indiqué sur la fiche (${product.quantityText ?? packGrams}). Modifie-le si tu en as acheté plusieurs.`
                  : 'La fiche n’indique pas la quantité : regarde sur l’emballage.'}
              </p>
            </div>
            <div>
              <label className="field-label" htmlFor="scan-date">Date de l’achat</label>
              <input
                id="scan-date"
                type="date"
                className="px-input"
                value={date}
                max={toDateKey(new Date())}
                onChange={(e) => setDate(e.target.value || toDateKey(new Date()))}
              />
            </div>
            <p aria-live="polite" className="min-h-6">
              {preview?.ok && (
                <>
                  ≈ <strong>{formatKg(preview.purchase.kgCO2e)}</strong> ·{' '}
                  {CONFIDENCE_LABELS[preview.purchase.confidence].name.toLowerCase()}
                </>
              )}
            </p>
            {saveError && <p role="alert" className="text-[var(--yellow)]">{saveError}</p>}
            <div className="flex flex-wrap gap-2">
              <PixelButton type="submit" big sfx={null} disabled={saving}>Enregistrer</PixelButton>
              <PixelButton variant="secondary" onClick={reset}>Scanner un autre</PixelButton>
            </div>
          </form>
        </PixelFrame>
      </div>
    );
  }

  /* ---------- Pas de donnée : bascule vers la saisie manuelle ---------- */
  if (phase.name === 'fallback') {
    return (
      <div className="flex flex-col gap-7">
        <h1>Code-barres</h1>
        <PixelFrame title="Plan B">
          <p className="mt-2" role="status">{phase.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PixelLink to="/ajouter/manuel" state={phase.prefill}>Saisie manuelle</PixelLink>
            <PixelButton variant="secondary" onClick={reset}>Scanner un autre</PixelButton>
          </div>
        </PixelFrame>
      </div>
    );
  }

  /* ---------- Scan ---------- */
  const busy = phase.name === 'starting' || phase.name === 'looking-up';
  const cameraOn = phase.name === 'scanning';
  return (
    <div className="flex flex-col gap-7">
      <h1>Code-barres</h1>
      <PixelFrame title="Caméra" accent>
        {/* La vidéo reste montée pour pouvoir y brancher le flux ; muette et « inline » pour iOS. */}
        <div className="scan-view mt-3" hidden={!cameraOn}>
          <video ref={videoRef} playsInline muted aria-label="Aperçu de la caméra" />
          <span className="scan-view__line" aria-hidden="true" />
        </div>
        <p className="mt-3" role="status">
          {phase.name === 'idle' && 'Vise le code-barres d’un produit alimentaire : on s’occupe du reste.'}
          {phase.name === 'starting' && 'Démarrage…'}
          {phase.name === 'scanning' && 'Place le code-barres dans le cadre, bien à plat.'}
          {phase.name === 'looking-up' && `Code ${phase.barcode} lu ! Recherche du produit…`}
        </p>
        {cameraError && <p role="alert" className="mt-2 text-[var(--yellow)]">{cameraError}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {cameraOn ? (
            <PixelButton variant="secondary" onClick={reset}>Arrêter la caméra</PixelButton>
          ) : (
            <PixelButton big disabled={busy} onClick={() => void startCamera()}>Activer la caméra</PixelButton>
          )}
        </div>
      </PixelFrame>

      <PixelFrame title="Autres moyens">
        <form
          className="mt-2 flex flex-col gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const code = normalizeBarcode(typed);
            if (!code) {
              setTypedError('Ce code ne semble pas complet : il faut les 8 ou 13 chiffres imprimés sous les barres.');
              playSfx('error');
              return;
            }
            void lookup(code);
          }}
        >
          <div>
            <label className="field-label" htmlFor="barcode">Saisir les chiffres du code</label>
            <input
              id="barcode"
              className="px-input"
              inputMode="numeric"
              autoComplete="off"
              placeholder="ex. 3017620422003"
              value={typed}
              aria-invalid={typedError ? true : undefined}
              aria-describedby={typedError ? 'barcode-error' : undefined}
              onChange={(e) => {
                setTyped(e.target.value);
                setTypedError(null);
              }}
            />
          </div>
          {typedError && <p id="barcode-error" role="alert" className="text-[var(--yellow)]">{typedError}</p>}
          <div>
            <PixelButton type="submit" variant="secondary" disabled={busy}>Chercher</PixelButton>
          </div>
        </form>
        <div className="mt-4">
          <label className="field-label" htmlFor="barcode-photo">Ou prendre le code en photo</label>
          <input
            id="barcode-photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="px-input"
            disabled={busy}
            onChange={(e) => {
              void readPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </PixelFrame>
    </div>
  );
}
