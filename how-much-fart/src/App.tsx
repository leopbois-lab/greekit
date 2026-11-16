import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { planetStateFromHealth } from './engine/planet';
import { HistoryScreen } from './screens/HistoryScreen';
import { ManualScreen } from './screens/ManualScreen';
import { ReceiptScreen } from './screens/ReceiptScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ScanScreen } from './screens/ScanScreen';
import { AddScreen } from './screens/AddScreen';
import { GalleryScreen } from './screens/GalleryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ComingSoon } from './screens/ComingSoon';
import { QuestsScreen } from './screens/QuestsScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LevelUp, MuteButton } from './ui/components';
import { playSfx } from './ui/sound';
import { Icon, type IconName } from './ui/icons';
import { usePurchases, useSettings } from './ui/store';
import { useBudget } from './ui/useBudget';
import { useGame } from './ui/useGame';

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
    <Link to="/" className="app__logo">How much fart</Link>
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

      <main className="app__main">
        <div key={location.pathname} className="screen">
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
            <Route
              path="*"
              element={
                <ComingSoon title="Zone inexplorée">Cette page n’existe pas (encore).</ComingSoon>
              }
            />
          </Routes>
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
