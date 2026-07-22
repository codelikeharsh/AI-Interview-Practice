import { MotionButton, MotionDiv, MotionLink, Link } from "./motion";

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

const VARIANTS = {
  primary:
    "bg-accent text-bg hover:bg-accent-hover hover:shadow-[0_0_24px_rgba(255,97,82,0.35)]",
  secondary: "border border-border bg-surface text-text-primary hover:bg-surface-hover hover:border-border-hover",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface",
  danger: "bg-red-500 text-white hover:bg-red-400",
};

export default function Button({
  as = "button",
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const MotionComponent = as === Link ? MotionLink : as === "button" ? MotionButton : MotionDiv;

  return (
    <MotionComponent
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
        ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
