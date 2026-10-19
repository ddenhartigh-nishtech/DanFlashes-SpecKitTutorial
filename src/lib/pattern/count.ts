/**
 * How complicated a pattern is (007 FR-003, R1), counted from the pattern itself: every point its
 * shapes are drawn with, plus 5 for each shape color beyond the first, plus 10 for each layer beyond
 * the first. Adding a shape, a color or a layer never lowers it.
 */
export interface Countable {
  shapes: readonly { points: number; color: string }[];
  layers: number;
}

export function countPattern({ shapes, layers }: Countable): number {
  const points = shapes.reduce((total, shape) => total + shape.points, 0);
  const colors = new Set(shapes.map((shape) => shape.color)).size;
  return points + 5 * Math.max(0, colors - 1) + 10 * Math.max(0, layers - 1);
}
