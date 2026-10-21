// Every hero layer uses these phases and the same scroll MotionValue.
export const heroTimeline = {
  entrance: [0, 0.36],
  details: [0.08, 0.36],
  exit: [0.5, 0.76],
  cards: [0.64, 1],
} as const;

export function heroPhase(progress: number, [start, end]: readonly [number, number]) {
  const value = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return value * value * (3 - 2 * value);
}
