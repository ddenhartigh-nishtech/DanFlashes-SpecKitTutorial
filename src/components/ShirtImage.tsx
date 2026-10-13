"use client";

import { useEffect, useRef, useState } from "react";

interface ShirtImageProps {
  src: string | null;
  alt: string;
  /** The owner-configured placeholder (store_settings.placeholder_media_id), already resolved. */
  placeholderSrc: string | null;
  className?: string;
  /** Above-the-fold images load eagerly with high priority (LCP); the rest lazy-load. */
  priority?: boolean;
}

/**
 * Plain <img> on purpose: shirt art is SVG and may be served from any configurable media base
 * URL (research R18), neither of which next/image handles without extra configuration.
 */
export function ShirtImage({ src, alt, placeholderSrc, className, priority }: ShirtImageProps) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const resolved = !src || failed ? placeholderSrc : src;

  // The server-rendered <img> starts loading before hydration, so a 404 can fire before React
  // attaches onError. Catch that case on mount: a finished image with no width has failed.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0 && src) setFailed(true);
  }, [src]);
  if (!resolved)
    return <div role="img" aria-label={alt} className={`loud-stripes ${className ?? ""}`} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see component doc comment
    <img
      ref={img}
      src={resolved}
      alt={alt}
      width={800}
      height={800}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => {
        if (!failed) setFailed(true);
      }}
      className={className}
    />
  );
}
