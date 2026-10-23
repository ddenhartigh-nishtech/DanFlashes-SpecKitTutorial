import { copy } from "@/lib/copy";

/** Dan's support email under an order and above order history, only while he's set one (012 FR-020). */
export function SupportLine({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <p data-testid="support-line" className="solid-backing w-fit px-3 py-2 font-bold">
      {copy.pssb.supportLead}{" "}
      <a href={`mailto:${email}`} className="underline decoration-4 underline-offset-2">
        {email}
      </a>
      . {copy.pssb.supportTail}
    </p>
  );
}
