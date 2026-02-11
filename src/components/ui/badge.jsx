import { cn } from "@/lib/utils";

/**
 * Badge - Unified badge component with variants
 */
const variantClasses = {
  default: "bg-primary/10 text-primary",
  secondary: "bg-muted text-muted-foreground",
  success: "bg-green-500/10 text-green-600 dark:text-green-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
};

const Badge = ({ children, variant = "default", size = "md", className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
