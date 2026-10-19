"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveGeneratedShirt } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";
import type { Recipe } from "@/lib/pattern/recipe";

const g = copy.console.generator;

/**
 * Shuffle for another pattern at the same level, or keep this one: name it and save it, resting
 * (007 FR-019, FR-020). A recipe that's already a shirt says so and links to it instead.
 */
export function GeneratorForm({
  recipe,
  name,
  made,
}: {
  recipe: Recipe;
  name: string;
  made: { id: number; name: string } | null;
}) {
  const router = useRouter();
  const { state, onSubmit, pending } = useConsoleAction(saveGeneratedShirt);
  const shuffle = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    router.replace(
      `/admin/shirts/generate?score=${recipe.score}&style=${recipe.style}&seed=${seed}`,
      { scroll: false },
    );
  };

  return (
    <div className={`${ui.card} flex flex-col gap-3`}>
      <button type="button" onClick={shuffle} disabled={pending} className={`${ui.button} w-fit`}>
        {g.shuffle}
      </button>
      {made ? (
        <p className="text-sm">
          {g.alreadyMade(made.name)}{" "}
          <Link href={`/admin/shirts/${made.id}`} className={ui.link}>
            {g.openIt}
          </Link>
        </p>
      ) : (
        // A new pattern brings a new suggested name.
        <form
          key={`${recipe.style}:${recipe.score}:${recipe.seed}`}
          onSubmit={onSubmit}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="score" value={recipe.score} />
          <input type="hidden" name="style" value={recipe.style} />
          <input type="hidden" name="seed" value={recipe.seed} />
          <label className={ui.label}>
            {g.name}
            <input name="name" defaultValue={name} required maxLength={80} className={ui.input} />
          </label>
          <p className={ui.muted}>{g.saveHelp}</p>
          <button type="submit" disabled={pending} className={`${ui.primary} w-fit`}>
            {g.save}
          </button>
        </form>
      )}
      <ConsoleMessage state={state} />
    </div>
  );
}
