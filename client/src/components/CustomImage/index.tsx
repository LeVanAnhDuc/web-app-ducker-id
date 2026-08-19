// types
import type { ComponentProps } from "react";
// libs
import Image from "next/image";

const CustomImage = ({
  // WHY: remote/avatar URLs typically lack configured next.config remotePatterns;
  // default true prevents runtime errors, but callers can pass unoptimized={false}
  // when serving from a known-safe, pattern-configured origin.
  unoptimized = true,
  alt,
  ...props
}: ComponentProps<typeof Image>) => (
  <Image alt={alt} unoptimized={unoptimized} {...props} />
);

export default CustomImage;
