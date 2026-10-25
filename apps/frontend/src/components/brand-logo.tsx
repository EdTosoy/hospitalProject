import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  variant = "wordmark",
  className,
}: {
  variant?: "wordmark" | "symbol";
  className?: string;
}) {
  const symbol = variant === "symbol";

  return (
    <Image
      src={symbol ? "/brand/abox-symbol.png" : "/brand/abox-wordmark.png"}
      alt="abox"
      width={symbol ? 256 : 1898}
      height={symbol ? 256 : 661}
      loading="eager"
      className={cn(
        "shrink-0 object-contain",
        symbol ? "size-8" : "h-auto w-32 rounded-sm dark:bg-white",
        className,
      )}
    />
  );
}
