import Link from "next/link";
import { dialIsOn } from "@/app/_data/dial";
import { copy } from "@/lib/copy";

/** The way to the dial (007 FR-009), on the shirts page and the home page while it's on. */
export async function DialCta() {
  if (!(await dialIsOn())) return null;
  return (
    <Link
      href="/how-complicated"
      className="font-display loud-stripes border-ink inline-flex w-fit flex-col border-4 p-1"
    >
      <span className="bg-ink text-highlighter px-4 py-2 text-xl uppercase">{copy.dial.cta}</span>
      <span className="solid-backing px-4 py-1 text-sm">{copy.dial.ctaLine}</span>
    </Link>
  );
}
