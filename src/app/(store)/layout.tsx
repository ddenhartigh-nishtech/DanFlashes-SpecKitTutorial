import { StoreChrome } from "@/components/StoreChrome";

/** Every shopper page, inside the loud store (008 R1). URLs are unchanged: (store) is a group. */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return <StoreChrome>{children}</StoreChrome>;
}
