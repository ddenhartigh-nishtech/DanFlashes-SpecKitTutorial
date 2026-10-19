"use client";

import { useState } from "react";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";

const g = copy.console.generator;

/** The step whose score is closest to a typed one (ties go to the lower step). */
function nearestStep(scores: readonly number[], score: number): number {
  let best = 0;
  scores.forEach((s, i) => {
    if (Math.abs(s - score) < Math.abs(scores[best] - score)) best = i;
  });
  return best;
}

/**
 * The generator's level (007 FR-019, R17): a score box with a slider beside it, spaced like the
 * dial (fine steps up to 200, then faster). Each follows the other; only the box is submitted.
 */
export function ScoreField({
  defaultScore,
  maxScore,
  scores,
}: {
  defaultScore: string;
  maxScore: number;
  /** The score at each slider step, 0 to the top, worked out on the server. */
  scores: number[];
}) {
  const [score, setScore] = useState(defaultScore);
  const typed = /^\d+$/.test(score.trim()) ? Number(score.trim()) : 0;
  return (
    <div className="flex min-w-56 flex-1 flex-col gap-1">
      <label className={ui.label}>
        {g.score}
        <input
          name="score"
          inputMode="numeric"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          aria-describedby="score-help"
          className={ui.input}
        />
      </label>
      <input
        type="range"
        min={0}
        max={scores.length - 1}
        step={1}
        value={nearestStep(scores, typed)}
        onChange={(e) => setScore(String(scores[Number(e.target.value)]))}
        aria-label={g.slider}
        className="accent-office-sage h-10 w-full"
      />
      <span id="score-help" className="text-office-muted text-xs">
        {g.scoreRange(maxScore)}
      </span>
    </div>
  );
}
