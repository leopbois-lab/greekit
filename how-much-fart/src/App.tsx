import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { planetStateFromHealth } from './engine/planet';
import { HistoryScreen } from './screens/HistoryScreen';
import { ManualScreen } from './screens/ManualScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ScanScreen } from './screens/ScanScreen';
import { AddScreen } from './screens/AddScreen';
import { GalleryScreen } from './screens/GalleryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ComingSoon } from './screens/ComingSoon';
import { SettingsScreen } from './screens/SettingsScreen';
import { MuteButton } from './ui/components';
import { playSfx } from './ui/sound';
import { Sprite } from './ui/Sprite';
import { ICONS, type IconName } from './ui/sprites';
import { usePurchases } from './ui/store';
import { useBudget } from './ui/useBudget';

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
    <Link to="/" className="app__logo">
      HOW MUCH <span>FART</span>
    </Link>
  );
}

export function App() {
  const location = useLocation();
  const { health } = useBudget();
  const load = usePurchases((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  // Les teintes de l'interface suivent l'état de la planète.
  useEffect(() => {
    document.documentElement.dataset.planet = planetStateFromHealth(health);
  }, [health]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Menu principal">
        <Logo />
        {SIDE.map((item) => (
          <NavLink key={item.to} to={item.to} end={item === HOME} className="side-link" onClick={() => playSfx('click')}>
            <Sprite sprite={ICONS[item.icon]} scale={2} />
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
            className="px-btn px-btn--secondary px-btn--icon only-mobile"
            aria-label="Réglages"
            onClick={() => playSfx('click')}
          >
            <Sprite sprite={ICONS.gear} scale={3} />
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
            <Route path="/resultat/:id" element={<ResultScreen />} />
            <Route path="/historique" element={<HistoryScreen />} />
            <Route
              path="/stats"
              element={
                <ComingSoon title="Statistiques" step={5}>
                  Des graphiques par catégorie et par période pour voir où ça se joue.
                </ComingSoon>
              }
            />
            <Route
              path="/quetes"
              element={
                <ComingSoon title="Quêtes et succès" step={5}>
                  Quêtes hebdomadaires, succès, combos de jours sobres et boss de fin de mois.
                </ComingSoon>
              }
            />
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

      <nav className="tabbar" aria-label="Navigation">
        {TABS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item === HOME}
            className={`tab ${item === ADD ? 'tab--add' : ''}`}
            onClick={() => playSfx('click')}
          >
            <Sprite sprite={ICONS[item.icon]} scale={item === ADD ? 4 : 3} />
            <span className={item === ADD ? 'sr-only' : ''}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
