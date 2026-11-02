import { NotFoundPanel } from "@/components/NotFoundPanel";

/**
 * notFound() from a store page (a missing shirt or order) lands here, inside the (store) layout's
 * chrome, so it must not bring its own (the root 404 does, and nesting it doubled the header).
 */
export default function StoreNotFound() {
  return <NotFoundPanel />;
}
