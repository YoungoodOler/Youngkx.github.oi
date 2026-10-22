export function createPlanetMorphTargets(sphere: Float32Array) {
  const crystal = new Float32Array(sphere.length);
  const crystalNormals = new Float32Array(sphere.length);
  const diamond = new Float32Array(sphere.length);

  for (let index = 0; index < sphere.length; index += 3) {
    const length = Math.hypot(sphere[index], sphere[index + 1], sphere[index + 2]);
    const x = sphere[index] / length;
    const y = sphere[index + 1] / length;
    const z = sphere[index + 2] / length;
    // A symmetric, rounded crystal keeps its depth throughout the first morph.
    const crystalRadius = 1.38 / Math.pow(x ** 4 + y ** 4 + z ** 4, 0.25);
    crystal.set([x * crystalRadius, y * crystalRadius, z * crystalRadius], index);
    const normalLength = Math.hypot(x ** 3, y ** 3, z ** 3);
    crystalNormals.set(
      [x ** 3 / normalLength, y ** 3 / normalLength, z ** 3 / normalLength],
      index,
    );

    const diamondRadius = 1.82 / (Math.abs(x) + Math.abs(y) + Math.abs(z));
    diamond.set([x * diamondRadius * 1.08, y * diamondRadius * 1.2, z * diamondRadius], index);
  }

  return { crystal, crystalNormals, diamond };
}
