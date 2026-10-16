/**
 * The nosy sign-up (009 R6): the first press of Sign up with any nosy field blank gets one line
 * from Dan instead of an account. He says it once per visit, then lets him through. It never
 * blocks: nobody has to type anything real to join.
 */
export function shouldNudge({ anyBlank, nudged }: { anyBlank: boolean; nudged: boolean }) {
  return anyBlank && !nudged;
}
