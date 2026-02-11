import { useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Modal - Reusable modal dialog component
 */
const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  size = "md",
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal: max height from viewport, content scrolls */}
      <Card
        className={cn(
          "relative flex w-full max-h-[90vh] flex-col",
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <CardHeader className="shrink-0">
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent
          className={cn(
            "min-h-0 shrink overflow-y-auto",
            !title && "pt-6"
          )}
        >
          <div className="[&>*>*:last-child]:mt-6">
            {children}
          </div>
        </CardContent>
        {footer && (
          <CardFooter className="shrink-0 border-t border-border pt-4">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default Modal;
