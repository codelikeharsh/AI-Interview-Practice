import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Pre-created at module scope (not inside a component render) so
// polymorphic `as` props on Button/Card never construct a new component
// identity on render - that would remount the DOM node and drop state.
export const MotionButton = motion.button;
export const MotionDiv = motion.div;
export const MotionLink = motion.create(Link);
export { Link };
