import { describe, expect, it } from 'vitest';
import { OctahedronGeometry } from 'three';
import { createPlanetMorphTargets } from '@/lib/planet-shapes';
import { heroPhase, heroTimeline } from '@/lib/hero-timeline';

describe('planet morphs', () => {
  const geometry = new OctahedronGeometry(1.58, 6);
  const sphere = new Float32Array(geometry.getAttribute('position').array);
  geometry.dispose();
  const { crystal, crystalNormals, diamond } = createPlanetMorphTargets(sphere);

  it('keeps the first morph full in all three dimensions', () => {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const extents = [0, 0, 0];
      for (let index = 0; index < sphere.length; index += 1) {
        const value = sphere[index] + (crystal[index] - sphere[index]) * progress;
        extents[index % 3] = Math.max(extents[index % 3], Math.abs(value));
      }
      expect(Math.min(...extents)).toBeGreaterThan(1.35);
      expect(Math.max(...extents) / Math.min(...extents)).toBeLessThan(1.01);
    }
  });

  it('retains a distinct final diamond and finite, normalized crystal lighting', () => {
    for (let index = 0; index < sphere.length; index += 3) {
      const crystalRadius = Math.pow(
        crystal[index] ** 4 + crystal[index + 1] ** 4 + crystal[index + 2] ** 4,
        0.25,
      );
      expect(crystalRadius).toBeCloseTo(1.38, 5);
      expect(Math.hypot(...crystalNormals.slice(index, index + 3))).toBeCloseTo(1, 5);
      expect(
        Math.abs(diamond[index] / 1.08) +
          Math.abs(diamond[index + 1] / 1.2) +
          Math.abs(diamond[index + 2]),
      ).toBeCloseTo(1.82, 5);
    }
    expect(crystal).not.toEqual(diamond);
  });

  it('eases into and out of the rounded morph without a sudden deformation', () => {
    const phase = heroTimeline.planetMorph;
    expect(heroPhase(phase[0], phase)).toBe(0);
    expect(heroPhase(phase[1], phase)).toBe(1);
    expect(heroPhase(phase[0] + 0.001, phase)).toBeLessThan(0.0001);
    expect(1 - heroPhase(phase[1] - 0.001, phase)).toBeLessThan(0.0001);
  });

  it('keeps the final diamond faces convex between vertices', () => {
    for (let index = 0; index < diamond.length; index += 9) {
      for (const [a, b] of [
        [0, 3],
        [3, 6],
        [6, 0],
      ]) {
        const x = (diamond[index + a] + diamond[index + b]) / 2;
        const y = (diamond[index + a + 1] + diamond[index + b + 1]) / 2;
        const z = (diamond[index + a + 2] + diamond[index + b + 2]) / 2;
        expect(Math.abs(x / 1.08) + Math.abs(y / 1.2) + Math.abs(z)).toBeCloseTo(1.82, 5);
      }
    }
  });
});
