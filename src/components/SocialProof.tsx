import { copy } from "@/lib/copy";
import type { SocialProof as Proof } from "@/lib/urgency/social-proof";

const u = copy.urgency;

/** Fabricated social proof on the shirt page (004 US3): who's looking, and who just bought it. */
export function SocialProof({ proof }: { proof: Proof | null }) {
  if (!proof) return null;
  return (
    <div data-testid="social-proof" className="flex flex-col items-start gap-2">
      <p className="font-display bg-electric-cyan text-ink border-ink border-2 px-2 py-1 text-sm">
        <span aria-hidden>👀 </span>
        <span data-testid="looking">
          {proof.looking === 0 ? u.nobodyLooking : u.looking(proof.looking)}
        </span>
      </p>
      {proof.buyer ? (
        <p data-testid="buyer" className="bg-highlighter text-ink px-2 py-1 font-bold">
          {u.boughtThis(proof.buyer.name, proof.buyer.department)}
        </p>
      ) : null}
    </div>
  );
}
