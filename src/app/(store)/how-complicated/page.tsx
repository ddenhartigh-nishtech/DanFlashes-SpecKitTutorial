import type { Metadata } from "next";
import { Suspense } from "react";
import { loadDial } from "@/app/_data/dial";
import { Dial } from "@/components/Dial";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.dial.title };

/** How complicated can it get? (007 US1): the pattern generator's dial, behind its own switch. */
export default function DialPage({ searchParams }: PageProps<"/how-complicated">) {
  return (
    <Suspense fallback={<div className="loud-dots border-ink h-96 border-4 opacity-60" />}>
      <DialSection searchParams={searchParams} />
    </Suspense>
  );
}

async function DialSection({ searchParams }: Pick<PageProps<"/how-complicated">, "searchParams">) {
  const { view } = await loadDial(searchParams);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display field-backing w-fit text-3xl leading-tight md:text-5xl">
          {copy.dial.title}
        </h1>
        <p className="field-backing w-fit text-lg">{copy.dial.intro}</p>
      </div>
      <Dial view={view} />
    </div>
  );
}
