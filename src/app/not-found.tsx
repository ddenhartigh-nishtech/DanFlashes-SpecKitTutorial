import { NotFoundPanel } from "@/components/NotFoundPanel";
import { StoreChrome } from "@/components/StoreChrome";

/**
 * The store's ordinary 404, in the store's chrome (008 R1): for unknown URLs and every console
 * address a non-admin opens (R2). It sits above the (store) layout, so it brings the chrome itself;
 * a missing shirt or order is caught by (store)/not-found.tsx, already inside the chrome.
 */
export default function NotFound() {
  return (
    <StoreChrome>
      <NotFoundPanel />
    </StoreChrome>
  );
}
