/**
 * The back office's few, quiet building blocks (008 R4). Class strings live here so every console
 * page looks like the same calm room.
 */
export const ui = {
  // [overflow-wrap:anywhere]: a price with no ceiling (hundreds of digits) wraps instead of
  // pushing a 360px page sideways (008 FR-037, converge T068).
  card: "rounded-lg border border-office-line bg-office-card p-4 [overflow-wrap:anywhere] md:p-5",
  h1: "text-2xl font-semibold tracking-tight md:text-3xl",
  h2: "text-lg font-semibold",
  muted: "text-sm text-office-muted",
  label: "flex flex-col gap-1 text-sm font-medium",
  input:
    "min-h-10 w-full rounded-md border border-office-line bg-white px-3 py-2 text-sm text-office-ink",
  button:
    "inline-flex min-h-10 items-center justify-center rounded-md border border-office-line bg-office-card px-3 text-sm font-medium text-office-ink hover:bg-office disabled:opacity-60",
  primary:
    "inline-flex min-h-10 items-center justify-center rounded-md bg-office-sage px-4 text-sm font-medium text-white hover:bg-office-sage/90 disabled:opacity-60",
  link: "underline decoration-office-line underline-offset-4 hover:decoration-office-sage",
  table: "w-full border-collapse text-left text-sm",
  th: "border-b border-office-line px-2 py-2 font-medium text-office-muted",
  td: "border-b border-office-line px-2 py-2 align-top",
} as const;
