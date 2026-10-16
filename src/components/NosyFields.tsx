import type { Ref } from "react";
import { copy } from "@/lib/copy";

const n = copy.nosy;
const input = "border-ink bg-paper mt-1 block min-h-11 w-full border-4 px-3 font-semibold";

/**
 * The nosy sign-up's questions (009 US1, research R2–R4). They're props: the inputs have no name and
 * sit outside every form, so nothing typed here can be part of what sign-up sends. Autofill,
 * spellcheck and password managers are all told to stay away. The two classic security answers are
 * masked without being password fields. AuthForm clears them when he leaves.
 */
export function NosyFields({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="flex flex-col gap-4">
      <h2 className="font-display solid-backing px-3 py-2 text-lg leading-tight">{n.heading}</h2>
      {n.fields.map((field) => (
        <label
          key={field.label}
          data-testid="nosy-field"
          className="font-display text-sm uppercase"
        >
          {field.label} <span className="bg-hot-pink text-paper px-1.5 text-xs">{n.required}</span>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            data-1p-ignore=""
            data-lpignore="true"
            data-bwignore=""
            data-form-type="other"
            className={field.masked ? `${input} nosy-masked` : input}
          />
        </label>
      ))}
    </div>
  );
}

/** Whether any nosy field is blank. It only ever asks "is it empty?", in his browser (FR-010). */
export function anyNosyBlank(root: HTMLElement | null): boolean {
  return [...(root?.querySelectorAll("input") ?? [])].some((el) => el.value.trim() === "");
}

/** Empty every nosy field: what he typed is gone once he leaves (FR-007). */
export function clearNosy(root: HTMLElement | null): void {
  root?.querySelectorAll("input").forEach((el) => {
    el.value = "";
  });
}
