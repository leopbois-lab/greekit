import { useState } from 'react';
import { BUDGET } from '../data';
import { parseQuantity } from '../engine/compute';
import { formatKg } from '../engine/format';
import { MuteButton, Button, Card, ButtonLink } from '../ui/components';
import { useSettings, type Theme } from '../ui/store';
import { useBudget } from '../ui/useBudget';

export function SettingsScreen() {
  const muted = useSettings((s) => s.muted);
  const setCustom = useSettings((s) => s.setCustomMonthlyBudgetKg);
  const { budgetKg, defaultBudgetKg, isCustom } = useBudget();
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const [value, setValue] = useState(String(Math.round(budgetKg)));
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-7">
      <h1>Réglages</h1>
      <Card title="Son">
        <div className="mt-2 flex items-center gap-3">
          <MuteButton />
          <p>{muted ? 'Son coupé.' : 'Son activé.'} Ce choix est mémorisé sur cet appareil.</p>
        </div>
      </Card>

      <Card title="Apparence">
        <div className="chips mt-3" role="group" aria-label="Apparence">
          {([['auto', 'Automatique'], ['clair', 'Clair'], ['sombre', 'Sombre']] as Array<[Theme, string]>).map(([t, label]) => (
            <button key={t} type="button" className="chip" aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {label}
            </button>
          ))}
        </div>
        <p className="small muted mt-2">« Automatique » suit le réglage clair ou sombre de ton appareil.</p>
      </Card>

      <Card title="Budget mensuel">
        <p className="mt-2">
          Par défaut : {formatKg(defaultBudgetKg)} par mois, soit la moyenne française de{' '}
          {formatKg(BUDGET.annualKgPerPerson)} par personne en {BUDGET.dataYear}, divisée par 12.
        </p>
        <p className="mt-1 small muted">
          Source : <a href={BUDGET.source.url} target="_blank" rel="noreferrer">{BUDGET.source.name}</a>{' '}
          (publiée en {BUDGET.publishedYear}). {BUDGET.note}
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseQuantity(value);
            if (n === null || n <= 0) {
              setMessage('Indique un budget supérieur à zéro, en kg CO2e.');
              return;
            }
            setCustom(n);
            setMessage(`Budget réglé sur ${formatKg(n)} par mois.`);
          }}
        >
          <div>
            <label className="field-label" htmlFor="budget">Mon budget (kg CO2e par mois)</label>
            <input
              id="budget"
              className="input"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Valider</Button>
            {isCustom && (
              <Button
                variant="secondary"
                onClick={() => {
                  setCustom(null);
                  setValue(String(Math.round(defaultBudgetKg)));
                  setMessage('Budget par défaut rétabli.');
                }}
              >
                Valeur par défaut
              </Button>
            )}
          </div>
          <p aria-live="polite" className="min-h-6 small">{message}</p>
        </form>
      </Card>

      <Card title="Données">
        <p className="mt-2 muted">Export et import JSON : étape 6.</p>
      </Card>
      <Card title="Design system">
        <p className="mt-2">Tous les composants pixel, la palette, les polices et les sons.</p>
        <div className="mt-3">
          <ButtonLink to="/galerie" variant="secondary">Ouvrir la galerie</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
