import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
// Polices auto-hébergées (OFL 1.1), sous-ensembles latin + latin étendu (œ, Œ, Ÿ…).
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/press-start-2p/latin-ext-400.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-700.css';
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
