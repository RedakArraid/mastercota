import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function Logo({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl md:text-5xl",
  };

  return (
    <Link
      href={href}
      className={cn(
        "font-extrabold tracking-tight text-ink",
        sizes[size],
        className
      )}
    >
      Master<span className="text-primary">cota</span>
      <span className="sr-only">{APP_NAME}</span>
    </Link>
  );
}
