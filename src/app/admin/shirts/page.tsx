import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { ShirtTable } from "@/components/admin/ShirtTable";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import {
  listAdminShirts,
  type AdminOriginFilter,
  type AdminShirtSort,
} from "@/lib/data/admin-shirts";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";

const s = copy.console.shirts;
const g = copy.console.generator;
const ORIGINS: AdminOriginFilter[] = ["catalog", "owner", "dial", "generated"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function ShirtsPage({ searchParams }: PageProps<"/admin/shirts">) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Shirts searchParams={searchParams} />
    </Suspense>
  );
}

async function Shirts({ searchParams }: Pick<PageProps<"/admin/shirts">, "searchParams">) {
  await requireAdmin();
  const params = await searchParams;
  const status = one(params.status);
  const sort = one(params.sort);
  const tierId = Number(one(params.tier)) || null;
  const origin = one(params.origin);
  const db = getDb();
  const tiers = listTiers(db);
  const shirts = listAdminShirts(db, {
    status: status === "active" || status === "inactive" ? status : null,
    tierId,
    origin: ORIGINS.includes(origin as AdminOriginFilter) ? (origin as AdminOriginFilter) : null,
    sort: (["score", "price", "name"] as const).includes(sort as AdminShirtSort)
      ? (sort as AdminShirtSort)
      : "score",
  });

  return (
    <ConsolePage title={s.title} intro={s.intro}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Form action="/admin/shirts" className="flex flex-wrap items-end gap-2">
          <label className={ui.label}>
            {s.filters.status}
            <select name="status" defaultValue={status} className={ui.input}>
              <option value="">{s.filters.all}</option>
              <option value="active">{s.filters.active}</option>
              <option value="inactive">{s.filters.inactive}</option>
            </select>
          </label>
          <label className={ui.label}>
            {s.filters.tier}
            <select name="tier" defaultValue={tierId ?? ""} className={ui.input}>
              <option value="">{s.filters.allTiers}</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            {g.filter}
            <select name="origin" defaultValue={origin} className={ui.input}>
              <option value="">{g.anywhere}</option>
              <option value="catalog">{g.origins.catalog}</option>
              <option value="generated">{g.generated}</option>
              <option value="owner">{g.origins.owner}</option>
              <option value="dial">{g.origins.dial}</option>
            </select>
          </label>
          <label className={ui.label}>
            {s.filters.sort}
            <select name="sort" defaultValue={sort || "score"} className={ui.input}>
              <option value="score">{s.filters.score}</option>
              <option value="price">{s.filters.price}</option>
              <option value="name">{s.filters.name}</option>
            </select>
          </label>
          <button type="submit" className={ui.button}>
            {s.filters.apply}
          </button>
        </Form>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/shirts?origin=dial" className={ui.button}>
            {g.review}
          </Link>
          <Link href="/admin/shirts/generate" className={ui.button}>
            {g.generateOne}
          </Link>
          <Link href="/admin/shirts/new" className={ui.primary}>
            {s.newShirt}
          </Link>
        </div>
      </div>
      <ShirtTable shirts={shirts} />
    </ConsolePage>
  );
}
