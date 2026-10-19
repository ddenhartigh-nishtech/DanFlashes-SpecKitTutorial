import Form from "next/form";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { GeneratorForm } from "@/components/admin/GeneratorForm";
import { ScoreField } from "@/components/admin/ScoreField";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import { getDb } from "@/lib/db/client";
import { formatUsd } from "@/lib/money";
import { BEYOND, scoreAtStep } from "@/lib/pattern/dial";
import { generatorPreview } from "@/lib/pattern/generator-view";

const g = copy.console.generator;
const p = copy.console.shirts.preview;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function GeneratePage({ searchParams }: PageProps<"/admin/shirts/generate">) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Generate searchParams={searchParams} />
    </Suspense>
  );
}

/** Dan's generator (007 FR-019, FR-020): a level and a style in, a pattern and its numbers out. */
async function Generate({
  searchParams,
}: Pick<PageProps<"/admin/shirts/generate">, "searchParams">) {
  await requireAdmin();
  const params = await searchParams;
  const input = { score: one(params.score), style: one(params.style), seed: one(params.seed) };
  const view = generatorPreview(getDb(), input);

  return (
    <ConsolePage title={g.title} intro={g.intro}>
      <Form action="/admin/shirts/generate" className={`${ui.card} flex flex-wrap items-end gap-3`}>
        <ScoreField
          defaultScore={input.score}
          maxScore={view.maxScore}
          scores={Array.from({ length: BEYOND }, (_, step) => scoreAtStep(step, view.maxScore)!)}
        />
        <label className={`${ui.label} self-start`}>
          {g.style}
          <select
            name="style"
            defaultValue={view.ok ? view.recipe.style : "polo"}
            className={ui.input}
          >
            <option value="polo">{copy.styles.polo}</option>
            <option value="button-down">{copy.styles["button-down"]}</option>
          </select>
        </label>
        {view.ok ? <input type="hidden" name="seed" value={view.recipe.seed} /> : null}
        <button type="submit" className={`${ui.button} self-start md:mt-6`}>
          {g.preview}
        </button>
      </Form>

      {view.ok ? (
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div className={ui.card}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG art (007) */}
            <img
              data-testid="generator-art"
              src={`/admin/generator/art/${view.code}`}
              alt={g.artAlt}
              width={800}
              height={800}
              className="h-auto w-full"
            />
          </div>
          <div className="flex flex-col gap-4">
            <dl className="border-office-line bg-office grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-md border p-3 text-sm [overflow-wrap:anywhere]">
              <dt className="text-office-muted">{g.count}</dt>
              <dd data-testid="generator-count">{view.count}</dd>
              <dt className="text-office-muted">{p.tier}</dt>
              <dd>
                <span
                  data-testid="tier-name"
                  className="inline-block rounded px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: view.tier.badgeBgColor,
                    color: view.tier.badgeTextColor,
                  }}
                >
                  {view.tier.name}
                </span>
              </dd>
              <dt className="text-office-muted">{p.msrp}</dt>
              <dd data-testid="generator-msrp">{formatUsd(view.msrpUsd)}</dd>
            </dl>
            <GeneratorForm recipe={view.recipe} name={view.name} made={view.made} />
          </div>
        </div>
      ) : (
        <p className={ui.card}>{view.message}</p>
      )}
    </ConsolePage>
  );
}
