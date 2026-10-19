import { cookies } from "next/headers";
import { RememberPoster } from "@/components/admin/RememberPoster";
import { POSTER_COOKIE, pickPoster } from "@/lib/admin/posters";
import { copy } from "@/lib/copy";

/**
 * Today's thought (008 FR-005a): one framed motivational poster, picked on the server so it's in
 * the page from the first paint (nothing pops in), and never the one this browser saw last.
 */
export async function Poster() {
  const raw = (await cookies()).get(POSTER_COOKIE)?.value;
  const last = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : null;
  const posters = copy.console.posters;
  const index = pickPoster(posters.length, last, Math.random);
  const { word, line } = posters[index];
  return (
    <figure
      data-testid="poster"
      data-poster={index}
      aria-label={copy.console.poster}
      className="border-office-ink/80 border-8 bg-[linear-gradient(180deg,#d9e2dc_0%,#efe9dc_70%)] p-1"
    >
      <div className="border border-white/70 px-4 py-5 text-center">
        <p className="text-office-ink text-xl font-light tracking-[0.35em] md:text-2xl">{word}</p>
        <figcaption className="text-office-muted mt-2 text-sm italic">{line}</figcaption>
      </div>
      <RememberPoster index={index} />
    </figure>
  );
}
