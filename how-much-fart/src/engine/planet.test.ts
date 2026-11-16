import { describe, expect, it } from 'vitest';
import {
  clampHealth,
  filledSegments,
  healthFromBudget,
  PLANET_LABELS,
  PLANET_STATES,
  planetStateFromHealth,
} from './planet';

describe('clampHealth', () => {
  it('borne entre 0 et 1', () => {
    expect(clampHealth(-3)).toBe(0);
    expect(clampHealth(0.4)).toBe(0.4);
    expect(clampHealth(7)).toBe(1);
    expect(clampHealth(Number.NaN)).toBe(0);
  });
});

describe('healthFromBudget', () => {
  it('calcule la part de budget restante', () => {
    expect(healthFromBudget(0, 692)).toBe(1);
    expect(healthFromBudget(346, 692)).toBe(0.5);
    expect(healthFromBudget(1000, 692)).toBe(0);
  });
  it('gère les budgets invalides et les émissions négatives', () => {
    expect(healthFromBudget(10, 0)).toBe(0);
    expect(healthFromBudget(10, -5)).toBe(0);
    expect(healthFromBudget(-10, 100)).toBe(1);
  });
});

describe('planetStateFromHealth', () => {
  it('suit les seuils', () => {
    expect(planetStateFromHealth(1)).toBe('verdoyante');
    expect(planetStateFromHealth(0.75)).toBe('verdoyante');
    expect(planetStateFromHealth(0.74)).toBe('fraiche');
    expect(planetStateFromHealth(0.5)).toBe('fraiche');
    expect(planetStateFromHealth(0.49)).toBe('tiede');
    expect(planetStateFromHealth(0.25)).toBe('tiede');
    expect(planetStateFromHealth(0.01)).toBe('enfumee');
    expect(planetStateFromHealth(0)).toBe('suffocante');
    expect(planetStateFromHealth(-1)).toBe('suffocante');
  });
  it('a un libellé pour chaque état', () => {
    for (const s of PLANET_STATES) {
      expect(PLANET_LABELS[s].name.length).toBeGreaterThan(0);
      expect(PLANET_LABELS[s].message.length).toBeGreaterThan(0);
    }
  });
});

describe('filledSegments', () => {
  it('arrondit au segment le plus proche', () => {
    expect(filledSegments(1, 10)).toBe(10);
    expect(filledSegments(0.5, 10)).toBe(5);
    expect(filledSegments(0.34, 10)).toBe(3);
  });
  it('garde une case allumée tant qu’il reste de la vie', () => {
    expect(filledSegments(0.01, 10)).toBe(1);
    expect(filledSegments(0, 10)).toBe(0);
  });
  it('gère un nombre de segments nul', () => {
    expect(filledSegments(1, 0)).toBe(0);
  });
});
