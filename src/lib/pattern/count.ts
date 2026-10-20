/**
 * How complicated a pattern is (007 FR-003, R1 as amended), counted from the pattern itself: one
 * point for every 10 points its shapes are drawn with (rounded down), plus 5 for each shape color
 * beyond the first, plus 10 for each layer beyond the first. Ten drawn points to a score point
 * makes a generated shirt as busy as the hand-drawn seed shirts at the same score (owner review,
 * Q8). Adding a shape, a color or a layer never lowers it.
 */
export const POINTS_PER_SCORE = 10;

export interface Countable {
  shapes: readonly { points: number; color: string }[];
  layers: number;
}

export function countPattern({ shapes, layers }: Countable): number {
  const points = shapes.reduce((total, shape) => total + shape.points, 0);
  const colors = new Set(shapes.map((shape) => shape.color)).size;
  return (
    Math.floor(points / POINTS_PER_SCORE) +
    5 * Math.max(0, colors - 1) +
    10 * Math.max(0, layers - 1)
  );
}
