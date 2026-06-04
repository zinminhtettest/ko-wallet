type Props = {
  className?: string;
  /** Accessibility label. */
  title?: string;
};

/**
 * Ko Wallet "K" brand mark. Renders the source PNG at /k-logo.png so the
 * exact artwork the user uploaded is used everywhere — sidebar, login,
 * landing, etc. Size with Tailwind `w-* h-*` on `className`.
 */
export function KLogo({ className, title = "Ko Wallet" }: Props) {
  return (
    <img
      src="/k-logo.png"
      alt={title}
      className={className}
      draggable={false}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
