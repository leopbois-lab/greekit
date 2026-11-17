import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { planetStateFromHealth } from './engine/planet';
import { AddScreen } from './screens/AddScreen';
import { ComingSoon } from './screens/ComingSoon';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ManualScreen } from './screens/ManualScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PwaStatus } from './ui/PwaStatus';
import { LevelUp, MuteButton } from './ui/components';
import { playSfx } from './ui/sound';
import { Icon, type IconName } from './ui/icons';
import { usePurchases, useSettings } from './ui/store';
import { useBudget } from './ui/useBudget';
import { useGame } from './ui/useGame';

// Écrans plus lourds ou moins fréquents : chargés à la demande (ils restent disponibles hors ligne via le pré-cache).
const ScanScreen = lazy(() => import('./screens/ScanScreen').then((m) => ({ default: m.ScanScreen })));
const ReceiptScreen = lazy(() => import('./screens/ReceiptScreen').then((m) => ({ default: m.ReceiptScreen })));
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));
const QuestsScreen = lazy(() => import('./screens/QuestsScreen').then((m) => ({ default: m.QuestsScreen })));
const GalleryScreen = lazy(() => import('./screens/GalleryScreen').then((m) => ({ default: m.GalleryScreen })));
const InstallScreen = lazy(() => import('./screens/InstallScreen').then((m) => ({ default: m.InstallScreen })));

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const HOME: NavItem = { to: '/', label: 'Accueil', icon: 'home' };
const HISTORY: NavItem = { to: '/historique', label: 'Historique', icon: 'list' };
const ADD: NavItem = { to: '/ajouter', label: 'Ajouter', icon: 'plus' };
const STATS: NavItem = { to: '/stats', label: 'Stats', icon: 'chart' };
const QUESTS: NavItem = { to: '/quetes', label: 'Quêtes', icon: 'trophy' };
const SETTINGS: NavItem = { to: '/reglages', label: 'Réglages', icon: 'gear' };

const TABS = [HOME, HISTORY, ADD, STATS, QUESTS];
const SIDE = [HOME, ADD, HISTORY, STATS, QUESTS, SETTINGS];

function Logo() {
  return (
    <Link to="/" className="app__logo">The carbon quest</Link>
  );
}

export function App() {
  const location = useLocation();
  const { health } = useBudget();
  const load = usePurchases((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  const theme = useSettings((s) => s.theme);

  // Mode clair ou sombre forcé ; sinon on suit le réglage du système.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme === 'sombre' ? 'dark' : 'light';
  }, [theme]);

  // L'état de la planète colore la barre de vie et le halo de la mascotte.
  useEffect(() => {
    document.documentElement.dataset.planet = planetStateFromHealth(health);
  }, [health]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const titles: Record<string, string> = {
      '/': 'Accueil', '/ajouter': 'Ajouter un achat', '/ajouter/manuel': 'Saisie manuelle', '/ajouter/scan': 'Code-barres',
      '/ajouter/ticket': 'Ticket de caisse', '/historique': 'Historique', '/stats': 'Statistiques', '/quetes': 'Quêtes et succès',
      '/reglages': 'Réglages', '/galerie': 'Galerie', '/installer': 'Installer l’app',
    };
    const page = location.pathname.startsWith('/resultat') ? 'Résultat' : titles[location.pathname];
    document.title = page ? `${page} · The carbon quest` : 'The carbon quest';
  }, [location.pathname]);

  // Passage de niveau : fêté une seule fois, jamais au premier chargement.
  const game = useGame();
  const loaded = usePurchases((s) => s.loaded);
  const lastSeenLevel = useSettings((s) => s.lastSeenLevel);
  const setLastSeenLevel = useSettings((s) => s.setLastSeenLevel);
  const [celebration, setCelebration] = useState(0);
  useEffect(() => {
    if (!loaded) return;
    if (lastSeenLevel !== null && game.level > lastSeenLevel) {
      setCelebration((n) => n + 1);
      playSfx('levelUp');
    }
    if (lastSeenLevel !== game.level) setLastSeenLevel(game.level);
  }, [loaded, game.level, lastSeenLevel, setLastSeenLevel]);

  return (
    <div className="app">
      <a href="#contenu" className="skip-link" onClick={(e) => {
        e.preventDefault();
        document.getElementById('contenu')?.focus();
      }}>
        Aller au contenu
      </a>
      <nav className="sidebar" aria-label="Menu principal">
        <Logo />
        {SIDE.map((item) => (
          <NavLink key={item.to} to={item.to} end={item === HOME} className="side-link" onClick={() => playSfx('click')}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <header className="app__header">
        <Logo />
        <div className="flex items-center gap-1">
          <MuteButton />
          <Link
            to="/reglages"
            className="btn btn--secondary btn--icon only-mobile"
            aria-label="Réglages"
            onClick={() => playSfx('click')}
          >
            <Icon name="gear" />
          </Link>
        </div>
      </header>

      <main className="app__main" id="contenu" tabIndex={-1}>
        <PwaStatus />
        <div key={location.pathname} className="screen">
          <Suspense fallback={<p className="muted" role="status">Chargement…</p>}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/ajouter" element={<AddScreen />} />
            <Route path="/ajouter/manuel" element={<ManualScreen />} />
            <Route path="/ajouter/scan" element={<ScanScreen />} />
            <Route path="/ajouter/ticket" element={<ReceiptScreen />} />
            <Route path="/resultat/:id" element={<ResultScreen />} />
            <Route path="/historique" element={<HistoryScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/quetes" element={<QuestsScreen />} />
            <Route path="/reglages" element={<SettingsScreen />} />
            <Route path="/galerie" element={<GalleryScreen />} />
            <Route path="/installer" element={<InstallScreen />} />
            <Route
              path="*"
              element={
                <ComingSoon title="Zone inexplorée">Cette page n’existe pas (encore).</ComingSoon>
              }
            />
          </Routes>
          </Suspense>
        </div>
      </main>

      <LevelUp trigger={celebration} level={game.level} />

      <nav className="tabbar" aria-label="Navigation">
        {TABS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item === HOME}
            className={`tab ${item === ADD ? 'tab--add' : ''}`}
            onClick={() => playSfx('click')}
          >
            <Icon name={item.icon} size={item === ADD ? 28 : 24} />
            <span className={item === ADD ? 'sr-only' : ''}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
