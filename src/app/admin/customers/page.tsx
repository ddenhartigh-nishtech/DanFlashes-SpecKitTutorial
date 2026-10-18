import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { LocalTime } from "@/components/LocalTime";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import { listCustomers } from "@/lib/data/admin-customers";
import { getDb } from "@/lib/db/client";
import { formatUsd } from "@/lib/money";

const c = copy.console.customers;

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: Pick<PageProps<"/admin/customers">, "searchParams">) {
  await requireAdmin();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const customers = listCustomers(getDb(), { q });
  return (
    <ConsolePage title={c.title} intro={c.intro}>
      <Form action="/admin/customers" className="flex flex-wrap items-end gap-2">
        <label className={`${ui.label} min-w-0 flex-1 basis-64`}>
          {c.search}
          <input name="q" type="search" defaultValue={q} className={ui.input} />
        </label>
        <button type="submit" className={ui.button}>
          {c.find}
        </button>
      </Form>
      {customers.length === 0 ? (
        <p className={ui.card}>{c.none}</p>
      ) : (
        <ul className={`${ui.card} divide-office-line divide-y`}>
          {customers.map((customer) => (
            <li
              key={customer.id}
              data-testid="customer"
              className="grid gap-1 py-3 text-sm md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center md:gap-3"
            >
              <span className="flex min-w-0 flex-col">
                <Link href={`/admin/customers/${customer.id}`} className={`${ui.link} font-medium`}>
                  {customer.displayName ?? c.unnamed}
                </Link>
                <span className={`${ui.muted} break-all`}>{customer.email}</span>
                <span className={ui.muted}>
                  {c.joined} <LocalTime iso={customer.joinedAt} />
                  {customer.isAdmin ? ` · ${c.admin}` : ""}
                </span>
              </span>
              <span>
                <span className="text-office-muted">{c.orders}: </span>
                {customer.orderCount}
              </span>
              <span>
                <span className="text-office-muted">{c.spend}: </span>
                {formatUsd(customer.lifetimeSpendUsd)}
              </span>
              <span>
                <span className="text-office-muted">{c.balance}: </span>
                {formatUsd(customer.balanceUsd)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ConsolePage>
  );
}
