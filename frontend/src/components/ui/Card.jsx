import { MotionButton, MotionDiv, MotionLink, Link } from "./motion";

export default function Card({
  as = "div",
  interactive = false,
  children,
  className = "",
  ...props
}) {
  const MotionComponent = as === Link ? MotionLink : as === "button" ? MotionButton : MotionDiv;

  return (
    <MotionComponent
      whileHover={
        interactive
          ? { y: -2, borderColor: "rgba(255,97,82,0.4)" }
          : undefined
      }
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`block rounded-xl border border-border bg-surface ${
        interactive ? "cursor-pointer transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
