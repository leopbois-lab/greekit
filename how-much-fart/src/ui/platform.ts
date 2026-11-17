/** Détection de la plateforme, pour l'aide à l'installation et le partage de fichiers. */

export function isIos(): boolean {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme un Mac : on les reconnaît à l'écran tactile.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Safari sur iPhone (Chrome et Firefox iOS ont « CriOS »/« FxiOS » dans leur signature). */
export function isIosSafari(): boolean {
  return isIos() && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
}
