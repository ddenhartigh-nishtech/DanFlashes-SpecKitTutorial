"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { makeItMine } from "@/actions/dial";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { copy } from "@/lib/copy";
import { BEYOND } from "@/lib/pattern/dial";
import type { DialView } from "@/lib/pattern/dial-view";

const d = copy.dial;
const SETTLE_MS = 150;

/**
 * How complicated can it get? (007 US1). Every step's code, badge and price came from the server,
 * so the browser never holds a score (FR-008). The badge and price follow the slider at once; the
 * art and the address bar follow when it settles, so the URL is always the share link (FR-011).
 */
export function Dial({ view }: { view: DialView }) {
  const router = useRouter();
  const [step, setStep] = useState(view.current);
  const [settled, setSettled] = useState(view.current);
  const [state, action, pending] = useActionState(makeItMine, null);

  // A shuffle or a new style brings a fresh dial from the server, at the same level.
  const [shown, setShown] = useState(view);
  if (shown !== view) {
    setShown(view);
    setStep(view.current);
    setSettled(view.current);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(step);
      const code = view.steps[step].code;
      if (code) window.history.replaceState(null, "", `/how-complicated?r=${code}`);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [step, view]);

  const here = view.steps[step];
  const beyond = step === BEYOND;
  const codeHere = here.code ?? view.steps[BEYOND - 1].code!;
  const artCode = view.steps[settled === BEYOND ? BEYOND - 1 : settled].code!;
  const priceUsd = here.made?.priceUsd ?? here.priceUsd;

  const shuffle = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    router.replace(`/how-complicated?r=${codeHere}&seed=${seed}`, { scroll: false });
  };
  const restyle = (style: "polo" | "button-down") =>
    router.replace(`/how-complicated?r=${codeHere}&style=${style}`, { scroll: false });

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <div className="border-ink bg-ink border-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG art (007) */}
        <img
          data-testid="dial-art"
          src={`/how-complicated/art/${artCode}`}
          alt={d.artAlt}
          width={800}
          height={800}
          className="h-auto w-full"
        />
      </div>

      <div className="flex flex-col gap-5">
        <div className="solid-backing flex flex-col gap-3 p-4">
          <label htmlFor="dial" className="font-display text-lg uppercase">
            {d.label}
          </label>
          <input
            id="dial"
            type="range"
            min={0}
            max={BEYOND}
            step={1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            aria-valuetext={beyond ? d.beyondLabel : here.tier.name}
            className="accent-hot-pink h-11 w-full"
          />
        </div>

        <div data-steady data-testid="dial-tier" className="w-fit">
          <ShirtBadge tier={here.tier} showTagline />
        </div>
        {here.tier.isBland && !beyond ? (
          <p className="field-backing w-fit font-semibold">{d.blandLine}</p>
        ) : null}

        <div data-steady data-testid="dial-price" className="max-w-full">
          {beyond || priceUsd === null ? (
            <span className="font-display solid-backing inline-block px-3 py-1 text-xl">
              {d.beyond}
            </span>
          ) : (
            <PriceTag priceUsd={priceUsd} size="lg" />
          )}
        </div>

        {here.made && !beyond ? (
          <Link href={`/shirts/${here.made.slug}`} className="field-backing w-fit underline">
            {d.made(here.made.name)}
          </Link>
        ) : null}

        <div className="flex flex-wrap gap-2" role="group" aria-label={d.styleLabel}>
          {(["polo", "button-down"] as const).map((style) => (
            <button
              key={style}
              type="button"
              aria-pressed={view.style === style}
              onClick={() => restyle(style)}
              className={`font-display border-ink min-h-11 border-4 px-3 uppercase ${view.style === style ? "bg-ink text-highlighter" : "bg-paper"}`}
            >
              {d.styles[style]}
            </button>
          ))}
          <button
            type="button"
            onClick={shuffle}
            className="font-display border-ink bg-electric-cyan min-h-11 border-4 px-3 uppercase"
          >
            {d.shuffle}
          </button>
        </div>

        <form action={action}>
          <input type="hidden" name="code" value={here.code ?? ""} />
          <button
            data-steady
            data-testid="dial-make"
            type="submit"
            disabled={beyond || pending}
            className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
          >
            {pending ? d.making : d.makeItMine}
          </button>
        </form>
        {state?.ok === false ? (
          <p role="status" className="solid-backing p-2">
            {state.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
