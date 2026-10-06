import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const MARK = {
  sm: 28,
  md: 36,
  lg: 56,
} as const;

const TEXT = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl md:text-5xl",
} as const;

export function LogoMark({
  size = "md",
  variant = "default",
  className,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
  className?: string;
}) {
  const px = MARK[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === "light" ? "/logo-mark-light.svg" : "/logo-mark.svg"}
      alt=""
      width={px}
      height={px}
      className={cn("shrink-0", className)}
      decoding="async"
    />
  );
}

export function Logo({
  className,
  href = "/",
  size = "md",
  variant = "default",
  showWordmark = true,
}: {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
  showWordmark?: boolean;
}) {
  const content = (
    <>
      <LogoMark size={size} variant={variant} />
      {showWordmark ? (
        <span
          className={cn(
            "font-extrabold tracking-tight",
            TEXT[size],
            variant === "light" ? "text-white" : "text-ink"
          )}
        >
          Master
          <span
            className={
              variant === "light" ? "text-[#F4B829]" : "text-primary"
            }
          >
            cota
          </span>
        </span>
      ) : null}
      <span className="sr-only">{APP_NAME}</span>
    </>
  );

  const classes = cn("inline-flex items-center gap-2", className);

  if (!href) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
