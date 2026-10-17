import type { ConsoleState } from "@/lib/admin/state";

/** A console action's answer: calm when it saved, gentle and specific when it didn't. */
export function ConsoleMessage({ state }: { state: ConsoleState | null }) {
  if (!state) return null;
  return (
    <div
      role="status"
      data-testid="console-message"
      data-ok={state.ok}
      className={`rounded-md border px-3 py-2 text-sm ${state.ok ? "border-office-sage/40 bg-[#eef3f0]" : "border-beige bg-[#f7f1e6]"}`}
    >
      <p>{state.message}</p>
      {!state.ok && state.issues?.length ? (
        <ul className="mt-1 list-disc pl-5">
          {state.issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
