"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/** Keep stale or missing catalog media from leaving an empty shopping panel. */
export function ProductImage({ src, onError, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(
    null,
  );
  return (
    <Image
      {...props}
      src={failedSource === src ? "/gaming-component.jpg" : src}
      onError={(event) => {
        setFailedSource(src);
        onError?.(event);
      }}
    />
  );
}
