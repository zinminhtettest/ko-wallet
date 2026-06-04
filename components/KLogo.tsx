type Props = {
  className?: string;
  /** Outer square color. Defaults to the brand blue. */
  bg?: string;
  /** Letter color. Defaults to the brand blue (matches bg). */
  fg?: string;
  /** Inner panel color. Defaults to white. */
  panel?: string;
  /** Accessibility label. */
  title?: string;
};

/**
 * Ko Wallet "K" logo, rendered inline as SVG so it scales cleanly at any size
 * and inherits its dimensions from the parent (`w-*` / `h-*` Tailwind classes).
 */
export function KLogo({
  className,
  bg = "#1E48B5",
  fg = "#1E48B5",
  panel = "#ffffff",
  title = "Ko Wallet",
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label={title}
    >
      <rect width="512" height="512" rx="96" fill={bg} />
      <rect x="76" y="76" width="360" height="360" rx="56" fill={panel} />
      <text
        x="256"
        y="368"
        fontFamily="Georgia, 'Times New Roman', Times, serif"
        fontSize="280"
        fontWeight="500"
        textAnchor="middle"
        fill={fg}
      >
        K
      </text>
    </svg>
  );
}
