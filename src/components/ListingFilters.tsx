import Link from "next/link";
import { SORT_KEYS, type ListingQuery } from "@/lib/catalog/listing";
import { SHIRT_STYLES, type Tier } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";

const fieldClass =
  "mt-1 min-h-11 w-full border-4 border-ink bg-paper px-2 font-semibold focus:border-hot-pink";

/**
 * A plain GET form: works without JavaScript and keeps every filter in a shareable URL. Keyed on
 * the query so its uncontrolled inputs start over whenever the URL changes (Reset, back, forward).
 */
export function ListingFilters({ tiers, query }: { tiers: Tier[]; query: ListingQuery }) {
  return (
    <form
      key={JSON.stringify(query)}
      action="/shirts"
      method="get"
      className="flex flex-col gap-5"
      aria-label={copy.listing.filters}
    >
      <fieldset>
        <legend className="font-display text-sm uppercase">{copy.listing.tier}</legend>
        <ul className="mt-2 flex flex-col gap-1">
          {tiers.map((tier) => (
            <li key={tier.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="tier"
                  value={tier.id}
                  defaultChecked={query.tierIds.includes(tier.id)}
                  className="accent-hot-pink size-5"
                />
                <span
                  className="font-display border-ink border-2 px-2 py-0.5 text-xs uppercase"
                  style={{ backgroundColor: tier.badgeBgColor, color: tier.badgeTextColor }}
                >
                  {tier.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="font-display col-span-2 text-sm uppercase">{copy.listing.price}</legend>
        <label className="text-sm font-semibold">
          {copy.listing.minPrice}
          <input
            name="minPrice"
            inputMode="decimal"
            defaultValue={query.minPriceUsd ?? ""}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-semibold">
          {copy.listing.maxPrice}
          <input
            name="maxPrice"
            inputMode="decimal"
            defaultValue={query.maxPriceUsd ?? ""}
            className={fieldClass}
          />
        </label>
      </fieldset>

      <label className="font-display text-sm uppercase">
        {copy.listing.style}
        <select name="style" defaultValue={query.style ?? ""} className={fieldClass}>
          <option value="">{copy.listing.anyStyle}</option>
          {SHIRT_STYLES.map((style) => (
            <option key={style} value={style}>
              {copy.styles[style]}
            </option>
          ))}
        </select>
      </label>

      <label className="font-display text-sm uppercase">
        {copy.listing.sort}
        <select name="sort" defaultValue={query.sort} className={fieldClass}>
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {copy.listing.sorts[key]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          className="font-display bg-hot-pink text-paper min-h-11 flex-1 px-4 uppercase shadow-[4px_4px_0_var(--color-ink)]"
        >
          {copy.listing.apply}
        </button>
        <Link
          href="/shirts"
          className="font-display border-ink flex min-h-11 items-center border-4 px-4 uppercase"
        >
          {copy.listing.reset}
        </Link>
      </div>
    </form>
  );
}
