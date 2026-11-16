import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
// Police auto-hébergée (OFL 1.1), variable de 200 à 800, avec tous les accents français.
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import './index.css';
import { App } from './App';
import { installAudioUnlock } from './ui/sound';

installAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter : fonctionne tel quel dans un sous-dossier GitHub Pages. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
